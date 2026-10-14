import { parseArgs } from 'node:util';
import { fetchPullRequest, fetchTrunk, filesAt, hashesAt, treeOf, TRUNK } from '../git-tree.js';
import { effectiveLock } from '../lock-state.js';
import { resolveActor } from '../records/actor.js';
import {
  recordBase,
  type ApprovalRecord,
  type FactoryRecord,
  type TransitionRecord,
} from '../records/format.js';
import { git, readBlobs } from '../records/git.js';
import { loadRecords, type RecordSet } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import {
  STORY_ID,
  gate3Approval,
  handoffNote,
  parseStory,
  storyFile,
  storyStage,
} from '../story.js';
import {
  Refusal,
  active,
  finishPendingWrites,
  short,
  writeOptions,
  type CommandIO,
} from './common.js';

export const STORY_USAGE = `Usage:
  pod-factory story start story-<n> --holder <builder> [--lease <minutes>]
  pod-factory story finish story-<n> --pr <pull request>
  finish moves an in-progress story to verifying once its handoff note is on the pull request,
  and a verifying story to done once its story approval's head is merged into main.`;

function actorFor(io: CommandIO, command: string) {
  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor === null)
    throw new Refusal(`${command} refused: ${who.reason}. Nothing was written.`);
  if (who.actor.kind === 'check-runner') {
    throw new Refusal(
      `${command} refused: status transitions are written by the orchestrator or a human, not by CI. Nothing was written.`,
    );
  }
  return who.actor;
}

function storyId(value: string | undefined): string {
  if (value === undefined || !STORY_ID.test(value)) {
    throw new Refusal(`"${value ?? ''}" is not a story like story-1.\n${STORY_USAGE}`);
  }
  return value;
}

/** The story's lists as main holds them, with main matching the gate-3 approval file for file. */
function approvedStory(io: CommandIO, set: RecordSet, story: string) {
  const approval = gate3Approval(set);
  if (approval === undefined) {
    const invalid = set.flagged.filter((f) => f.path.includes('-approval-gate-3-'));
    throw new Refusal(
      invalid.length > 0
        ? `story start refused: the only gate-3 approvals are invalid and ignored (${invalid.map((f) => f.reason).join('; ')}). Nothing was written.`
        : 'story start refused: there is no valid, unrevoked gate-3 approval. The approver runs "pod-factory approve 3" first. Nothing was written.',
    );
  }
  const commit = fetchTrunk(io.cwd, io.remote);
  const files = filesAt(io.cwd, commit);
  const bound = Object.keys(approval.record.binds.files);
  const present = bound.filter((p) => files.has(p));
  const hashes = hashesAt(io.cwd, files, present);
  for (const path of bound) {
    if (hashes[path] !== approval.record.binds.files[path]) {
      throw new Refusal(
        `story start refused: ${path} on ${TRUNK} no longer matches gate-3 approval ${approval.record.recordId}, so the plan it approved is not the plan on ${TRUNK}. Gate 3 is open again; the approver runs "pod-factory approve 3" for the current plan. Nothing was written.`,
      );
    }
  }
  const path = storyFile(story);
  if (!bound.includes(path)) {
    throw new Refusal(
      `story start refused: ${story} is not in the build plan gate-3 approval ${approval.record.recordId} approved. Nothing was written.`,
    );
  }
  const oid = files.get(path) as string;
  const parsed = parseStory((readBlobs(io.cwd, [oid]).get(oid) as Buffer).toString('utf8'));
  if ('missing' in parsed) {
    throw new Refusal(
      `story start refused: ${path} has no ${parsed.missing.map((m) => `"${m}:" list`).join(', ')}. Nothing was written.`,
    );
  }
  return { approval, commit, files, lists: parsed };
}

function brief(io: CommandIO, story: string, files: Record<string, string>): void {
  io.out(`Builder inputs for ${story}, with their hashes:`);
  for (const [path, hash] of Object.entries(files)) io.out(`  ${hash}  ${path}`);
}

/** `pod-factory story start`. Returns the exit code. */
export function storyStart(argv: string[], io: CommandIO): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { holder: { type: 'string' }, lease: { type: 'string' } },
    });
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${STORY_USAGE}`);
  }
  if (parsed.positionals.length !== 1) throw new Refusal(STORY_USAGE);
  const story = storyId(parsed.positionals[0]);
  const holder = parsed.values.holder?.trim();
  if (holder === undefined || holder === '')
    throw new Refusal(`story start needs --holder.\n${STORY_USAGE}`);
  const minutes = parsed.values.lease === undefined ? 240 : Number(parsed.values.lease);
  if (!Number.isInteger(minutes) || minutes <= 0)
    throw new Refusal(`--lease takes a whole number of minutes.\n${STORY_USAGE}`);
  const actor = actorFor(io, 'story start');
  finishPendingWrites(io);

  const set = loadRecords(io.cwd, io.remote);
  const { approval, commit, files, lists } = approvedStory(io, set, story);
  const { stage, last } = storyStage(set, story);
  if (stage === 'in-progress' && last !== undefined) {
    const lease = last.record.transition.lease;
    io.out(
      `${story} is already in progress (${last.path}), held by ${lease?.holder} until ${lease?.expiresAt}. Nothing was written.`,
    );
    brief(io, story, last.record.binds.files as Record<string, string>);
    return 0;
  }
  if (stage !== 'ready') {
    throw new Refusal(`story start refused: ${story} is ${stage}, not ready. Nothing was written.`);
  }
  const locked = effectiveLock(set);
  const testHashes = hashesAt(
    io.cwd,
    files,
    lists.tests.filter((p) => files.has(p)),
  );
  for (const test of lists.tests) {
    const now = testHashes[test];
    if (locked === null || now === undefined || locked.hashes.get(test) !== now) {
      throw new Refusal(
        `story start refused: ${story} is not ready, because its test ${test} is not locked${locked === null ? ' (there is no lock yet)' : ` by lock ${locked.lock.record.recordId} at its content on ${TRUNK}`}. The tests that define done must be locked before a builder starts. Nothing was written.`,
      );
    }
  }
  const missingInputs = lists.inputs.filter((p) => !files.has(p));
  if (missingInputs.length > 0) {
    throw new Refusal(
      `story start refused: ${storyFile(story)} lists inputs ${TRUNK} does not have: ${missingInputs.join(', ')}. Nothing was written.`,
    );
  }
  const inputs = hashesAt(io.cwd, files, [storyFile(story), ...lists.inputs]);
  const record: TransitionRecord = {
    ...recordBase(actor),
    recordType: 'transition',
    binds: { tree: treeOf(io.cwd, commit), files: inputs },
    outcome: 'in-progress',
    refs: [approval.record.recordId],
    transition: {
      story,
      from: 'ready',
      to: 'in-progress',
      lease: {
        holder,
        expiresAt: new Date(Date.now() + minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      },
      handoffNote: null,
    },
  };
  const landed = writeRecord(io.cwd, record, `${story}-in-progress`, writeOptions(io));
  io.out(
    `${story} is in progress, held by ${holder} until ${record.transition.lease?.expiresAt}. Record ${landed.path}.`,
  );
  brief(io, story, inputs);
  return 0;
}

const isStoryApproval =
  (story: string, pr: number) =>
  (r: FactoryRecord): r is ApprovalRecord =>
    r.recordType === 'approval' &&
    r.approval.kind === 'story' &&
    r.approval.story === story &&
    r.approval.pullRequest === pr;

/** `pod-factory story finish`. Returns the exit code. */
export function storyFinish(argv: string[], io: CommandIO): number {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { pr: { type: 'string' } } });
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${STORY_USAGE}`);
  }
  if (parsed.positionals.length !== 1) throw new Refusal(STORY_USAGE);
  const story = storyId(parsed.positionals[0]);
  if (parsed.values.pr === undefined || !/^[1-9][0-9]*$/.test(parsed.values.pr)) {
    throw new Refusal(`story finish needs --pr with the pull request number.\n${STORY_USAGE}`);
  }
  const pr = Number(parsed.values.pr);
  const actor = actorFor(io, 'story finish');
  finishPendingWrites(io);

  const set = loadRecords(io.cwd, io.remote);
  const { stage, last } = storyStage(set, story);
  const head = fetchPullRequest(io.cwd, pr, io.remote);

  if (stage === 'in-progress' && last !== undefined) {
    const files = filesAt(io.cwd, head);
    const note = handoffNote(story);
    if (!files.has(note)) {
      throw new Refusal(
        `story finish refused: the builder session for ${story} (held by ${last.record.transition.lease?.holder}) ended without a handoff note. Pull request ${pr} at ${short(head)} has no ${note}; the orchestrator writes one on the branch, then runs story finish again. Nothing was written.`,
      );
    }
    const hash = hashesAt(io.cwd, files, [note])[note] as string;
    const record: TransitionRecord = {
      ...recordBase(actor),
      recordType: 'transition',
      binds: { tree: treeOf(io.cwd, head), files: { [note]: hash } },
      outcome: 'verifying',
      refs: [last.record.recordId],
      transition: {
        story,
        from: 'in-progress',
        to: 'verifying',
        lease: null,
        handoffNote: { path: note, sha256: hash },
      },
    };
    const landed = writeRecord(io.cwd, record, `${story}-verifying`, writeOptions(io));
    io.out(
      `${story} is verifying. Handoff note ${note} (${short(hash)}) at pull request ${pr} ${short(head)} is kept in record ${landed.path}.`,
    );
    return 0;
  }

  if (stage === 'verifying' && last !== undefined) {
    const approval = active(set, isStoryApproval(story, pr)).at(-1);
    if (approval === undefined) {
      // Not an error: the story is where finish left it, so a restart after a kill lands here.
      io.out(
        `${story} is verifying (${last.path}). It cannot be done yet, because there is no valid, unrevoked story approval for it on pull request ${pr}. Nothing was written.`,
      );
      return 0;
    }
    if (treeOf(io.cwd, head) !== approval.record.binds.tree) {
      throw new Refusal(
        `story finish refused: pull request ${pr} changed after approval ${approval.record.recordId}, so the approved content is not what would merge. Nothing was written.`,
      );
    }
    const main = fetchTrunk(io.cwd, io.remote);
    // Either proves the approved content merged: the approved head is in main's history (a merge
    // commit), or main holds exactly the approved tree (a squash, or nothing merged since).
    const ancestor =
      git(io.cwd, ['merge-base', '--is-ancestor', head, main], { allowFail: true }).status === 0;
    const sameTree = treeOf(io.cwd, main) === approval.record.binds.tree;
    if (!ancestor && !sameTree) {
      // A wait, not an error: the approved content is waiting to be merged.
      io.out(
        `${story} is verifying and approved, and cannot be done until pull request ${pr} at ${short(head)} is merged into ${TRUNK}: that head is not in ${TRUNK}'s history, and ${TRUNK} does not hold the approved tree ${short(approval.record.binds.tree ?? '')}. Nothing was written.`,
      );
      return 0;
    }
    const proof = ancestor
      ? `the approved head ${short(head)} is in ${TRUNK}'s history`
      : `${TRUNK} at ${short(main)} holds exactly the approved tree`;
    const record: TransitionRecord = {
      ...recordBase(actor),
      recordType: 'transition',
      binds: { tree: approval.record.binds.tree, files: {} },
      outcome: 'done',
      refs: [approval.record.recordId],
      transition: { story, from: 'verifying', to: 'done', lease: null, handoffNote: null },
    };
    const landed = writeRecord(io.cwd, record, `${story}-done`, writeOptions(io));
    io.out(
      `${story} is done: approval ${approval.record.recordId} binds the content merged into ${TRUNK} (${proof}). Record ${landed.path}.`,
    );
    return 0;
  }

  if (stage === 'done' && last !== undefined) {
    io.out(`${story} is already done (${last.path}). Nothing was written.`);
    return 0;
  }

  throw new Refusal(
    `story finish refused: ${story} is ${stage}; finish moves an in-progress story to verifying and a verifying one to done. Nothing was written.`,
  );
}
