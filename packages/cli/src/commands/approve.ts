import { parseArgs } from 'node:util';
import {
  BUILD_PLAN,
  CLASSIFICATION_REPORT,
  GATE_2_FILES,
  MAPPING_FILE,
  SPEC_DIR,
  STORY_FILE,
} from '../lock-policy.js';
import {
  contentAt,
  fetchPullRequest,
  fetchTrunk,
  filesAt,
  hashesAt,
  treeOf,
  TRUNK,
} from '../git-tree.js';
import { resolveActor } from '../records/actor.js';
import {
  BOOTSTRAP_DIR,
  BOOTSTRAP_FILE_PATTERN,
  recordBase,
  shownHashOf,
  type ApprovalBlock,
  type ApprovalRecord,
  type Binds,
  type FactoryRecord,
  type FileBinding,
} from '../records/format.js';
import { loadRecords } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import { effectiveLock, isLockedBy } from '../lock-state.js';
import {
  Refusal,
  active,
  finishPendingWrites,
  requireHuman,
  revokedIds,
  short,
  writeOptions,
  type CommandIO,
} from './common.js';

const isApproval = (r: FactoryRecord): r is ApprovalRecord => r.recordType === 'approval';

export const APPROVE_USAGE = `Usage:
  pod-factory approve 2 --classification <bootstrap record file>
                                     gate 2: the design, eval plan and classification on main
  pod-factory approve 3              gate 3: the build plan and its story files on main
  pod-factory approve story-1 --pr 7 gate 4: story story-1, as pull request number 7 stands now
  pod-factory approve bootstrap 7    merge authority for bootstrap pull request number 7
  pod-factory approve amendment --pr 7 <locked path>...
                                     a change to locked paths, as pull request number 7 stands now`;

/** What one approval binds, where it was read from, and how to describe it. */
interface Plan {
  /** The token the human types before the hash: the gate number or the target word. */
  token: string;
  subject: string;
  statement: string;
  block: Omit<ApprovalBlock, 'shownHash' | 'typedPrefix' | 'statement'>;
  binds: Binds;
  refs: string[];
  /** Re-reads the source and returns its commit, to catch a move during confirmation. */
  refetch(): string;
  commit: string;
  sourceName: string;
}

function pullRequestNumber(value: string | undefined, target: string): number {
  if (value === undefined) {
    throw new Refusal(
      `approve ${target} needs the pull request number, for example --pr 7.\n${APPROVE_USAGE}`,
    );
  }
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Refusal(`"${value}" is not a pull request number.\n${APPROVE_USAGE}`);
  }
  return Number(value);
}

function gate2(io: CommandIO, classification: string | undefined): Plan {
  if (classification === undefined || !BOOTSTRAP_FILE_PATTERN.test(classification)) {
    throw new Refusal(
      `approve 2 needs --classification with the file name of the classification record under ${BOOTSTRAP_DIR}/, for example --classification 0005-classification-gate-2.json.`,
    );
  }
  const commit = fetchTrunk(io.cwd, io.remote);
  const files = filesAt(io.cwd, commit);
  const specs = [...files.keys()].filter(
    (p) => p.startsWith(SPEC_DIR) && p.endsWith('.md') && !p.slice(SPEC_DIR.length).includes('/'),
  );
  const bound = [...GATE_2_FILES, ...specs].sort();
  const missing = [...GATE_2_FILES, MAPPING_FILE].filter((p) => !files.has(p));
  if (missing.length > 0) {
    throw new Refusal(
      `Gate 2 cannot be approved: main at ${short(commit)} has no ${missing.join(', ')}. Nothing was written.`,
    );
  }
  const hashes = hashesAt(io.cwd, files, bound);

  const set = loadRecords(io.cwd, io.remote);
  const path = `${BOOTSTRAP_DIR}/${classification}`;
  const flagged = set.flagged.find((f) => f.path === path);
  if (flagged !== undefined) throw new Refusal(`Gate 2 cannot be approved: ${flagged.reason}.`);
  const record = set.bootstrap.find((b) => b.path === path)?.record;
  if (record === undefined) {
    throw new Refusal(
      `Gate 2 cannot be approved: there is no classification record ${path} on the records branch.`,
    );
  }
  if (revokedIds(set).has(classification)) {
    throw new Refusal(
      `Gate 2 cannot be approved: classification record ${path} has been revoked. A new classification run and record are needed.`,
    );
  }
  if (record.recordType !== 'classification') {
    throw new Refusal(
      `Gate 2 cannot be approved: ${path} is not a classification record (its type is ${record.recordType}).`,
    );
  }
  const reportBinding = record.binds[CLASSIFICATION_REPORT] as { sha256?: unknown } | undefined;
  if (reportBinding?.sha256 !== hashes[CLASSIFICATION_REPORT]) {
    throw new Refusal(
      `Gate 2 cannot be approved: ${path} does not bind the classification report on main (${CLASSIFICATION_REPORT} hashes to ${hashes[CLASSIFICATION_REPORT]}), so it describes a different run.`,
    );
  }
  return {
    token: '2',
    subject: 'gate-2',
    statement: `Gate 2: the PRD, the design, the eval plan and the classification as they are on ${TRUNK} at commit ${commit}.`,
    block: { kind: 'gate', gate: 2, story: null, pullRequest: null },
    binds: { tree: treeOf(io.cwd, commit), files: hashes },
    refs: [classification],
    refetch: () => fetchTrunk(io.cwd, io.remote),
    commit,
    sourceName: TRUNK,
  };
}

function gate3(io: CommandIO): Plan {
  const commit = fetchTrunk(io.cwd, io.remote);
  const files = filesAt(io.cwd, commit);
  if (!files.has(BUILD_PLAN)) {
    throw new Refusal(
      `Gate 3 cannot be approved: main at ${short(commit)} has no build plan ${BUILD_PLAN}. Nothing was written.`,
    );
  }
  const plan = contentAt(io.cwd, files, BUILD_PLAN).toString('utf8');
  const stories = [...new Set(plan.match(STORY_FILE) ?? [])].sort();
  if (stories.length === 0) {
    throw new Refusal(
      `Gate 3 cannot be approved: ${BUILD_PLAN} names no story file (.factory/work/story-<n>/story.md).`,
    );
  }
  const missing = stories.filter((p) => !files.has(p));
  if (missing.length > 0) {
    throw new Refusal(
      `Gate 3 cannot be approved: the build plan names ${missing.join(', ')}, which main at ${short(commit)} does not have.`,
    );
  }
  return {
    token: '3',
    subject: 'gate-3',
    statement: `Gate 3: the build plan and its ${stories.length === 1 ? 'story' : `${stories.length} stories`} as they are on ${TRUNK} at commit ${commit}.`,
    block: { kind: 'gate', gate: 3, story: null, pullRequest: null },
    binds: {
      tree: treeOf(io.cwd, commit),
      files: hashesAt(io.cwd, files, [BUILD_PLAN, ...stories]),
    },
    refs: [],
    refetch: () => fetchTrunk(io.cwd, io.remote),
    commit,
    sourceName: TRUNK,
  };
}

function pullRequestPlan(
  io: CommandIO,
  pr: number,
  kind: 'story' | 'bootstrap',
  story: string | null,
): Plan {
  const commit = fetchPullRequest(io.cwd, pr, io.remote);
  const what =
    kind === 'story'
      ? `Gate 4: ${story} as pull request ${pr} stands`
      : `Bootstrap merge: pull request ${pr} as it stands`;
  return {
    token: kind === 'story' ? (story as string) : 'bootstrap',
    subject: kind === 'story' ? (story as string) : `bootstrap-pr-${pr}`,
    statement: `${what} at commit ${commit}.`,
    block: { kind, gate: null, story, pullRequest: pr },
    binds: { tree: treeOf(io.cwd, commit), files: {} },
    refs: [],
    refetch: () => fetchPullRequest(io.cwd, pr, io.remote),
    commit,
    sourceName: `pull request ${pr}`,
  };
}

function amendmentPlan(io: CommandIO, pr: number, paths: string[]): Plan {
  if (paths.length === 0)
    throw new Refusal(`approve amendment needs at least one locked path.\n${APPROVE_USAGE}`);
  const set = loadRecords(io.cwd, io.remote);
  const locked = effectiveLock(set);
  if (locked === null)
    throw new Refusal('There is no valid lock, so there is nothing to amend. Nothing was written.');
  const lock = locked.lock;
  const unlocked = paths.filter((p) => !isLockedBy(locked, p));
  if (unlocked.length > 0) {
    throw new Refusal(
      `${unlocked.join(', ')} ${unlocked.length === 1 ? 'is' : 'are'} not locked, so no amendment is needed. Nothing was written.`,
    );
  }
  const commit = fetchPullRequest(io.cwd, pr, io.remote);
  const files = filesAt(io.cwd, commit);
  const present = paths.filter((p) => files.has(p));
  const after = hashesAt(io.cwd, files, present);
  const bound: Record<string, FileBinding> = {};
  for (const path of paths) {
    const before = locked.hashes.get(path) ?? null;
    const now = after[path] ?? null;
    if (before === now) {
      throw new Refusal(
        `${path} is the same in pull request ${pr} as in the lock, so it needs no amendment. Nothing was written.`,
      );
    }
    bound[path] = { before, after: now };
  }
  return {
    token: 'amendment',
    subject: `amendment-pr-${pr}`,
    statement: `Amendment: ${paths.length === 1 ? 'a change' : `changes`} to locked ${paths.join(', ')} as pull request ${pr} stands at commit ${commit}, against lock ${lock.record.recordId}.`,
    block: { kind: 'amendment', gate: null, story: null, pullRequest: pr },
    binds: { tree: treeOf(io.cwd, commit), files: bound },
    refs: [lock.record.recordId],
    refetch: () => fetchPullRequest(io.cwd, pr, io.remote),
    commit,
    sourceName: `pull request ${pr}`,
  };
}

function plan(io: CommandIO, argv: string[]): Plan {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { pr: { type: 'string' }, classification: { type: 'string' } },
    });
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${APPROVE_USAGE}`);
  }
  const [target, ...rest] = parsed.positionals;
  const { pr, classification } = parsed.values;
  const noExtra = (allowed: boolean) => {
    if (!allowed && rest.length > 0)
      throw new Refusal(`Unexpected "${rest.join(' ')}".\n${APPROVE_USAGE}`);
  };
  if (target === '2') {
    noExtra(false);
    return gate2(io, classification);
  }
  if (target === '3') {
    noExtra(false);
    return gate3(io);
  }
  if (target !== undefined && /^story-[0-9]+$/.test(target)) {
    noExtra(false);
    return pullRequestPlan(io, pullRequestNumber(pr, target), 'story', target);
  }
  if (target === 'bootstrap') {
    if (rest.length !== 1)
      throw new Refusal(`approve bootstrap takes one pull request number.\n${APPROVE_USAGE}`);
    return pullRequestPlan(io, pullRequestNumber(rest[0], 'bootstrap'), 'bootstrap', null);
  }
  if (target === 'amendment') return amendmentPlan(io, pullRequestNumber(pr, 'amendment'), rest);
  if (target !== undefined && /^[0-9]+$/.test(target)) {
    throw new Refusal(
      `Gate ${target} is not approved with this command in milestone zero: approve 2, approve 3, or approve story-<n> for gate 4.`,
    );
  }
  throw new Refusal(APPROVE_USAGE);
}

function show(io: CommandIO, p: Plan, shown: string): void {
  io.out(p.statement);
  io.out(`  tree ${p.binds.tree}`);
  for (const [path, binding] of Object.entries(p.binds.files)) {
    io.out(
      typeof binding === 'string'
        ? `  ${binding}  ${path}`
        : `  ${binding.before ?? '(absent)'} -> ${binding.after ?? '(deleted)'}  ${path}`,
    );
  }
  for (const ref of p.refs) io.out(`  refers to ${ref}`);
  io.out(`Hash of everything above: ${shown}`);
}

/** `pod-factory approve`. Returns the exit code. */
export async function approve(argv: string[], io: CommandIO): Promise<number> {
  requireHuman('approve', io.ctx);
  finishPendingWrites(io);
  const p = plan(io, argv);
  const shown = shownHashOf(p);
  // Idempotent: a restart after a kill must not approve the same content twice.
  const same = active(loadRecords(io.cwd, io.remote), isApproval).find(
    (a) => a.record.approval.shownHash === shown,
  );
  if (same !== undefined) {
    io.out(
      `Already approved: ${same.path} approves exactly this (hash ${short(shown)}). Nothing was written.`,
    );
    return 0;
  }
  show(io, p, shown);
  const expected = `${p.token} ${shown.slice(0, 8)}`;
  const typed = (
    await io.ask(
      `Type ${p.token === '2' || p.token === '3' ? 'the gate' : `"${p.token}"`} and the first eight characters of the hash (for example: ${p.token} ${'0'.repeat(8)}): `,
    )
  )
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (typed !== expected) {
    throw new Refusal(
      `Not approved: you typed "${typed}", which does not match "${p.token}" and the first eight characters of the hash. Nothing was written.`,
    );
  }
  const now = p.refetch();
  if (now !== p.commit) {
    throw new Refusal(
      `Not approved: ${p.sourceName} moved from ${short(p.commit)} to ${short(now)} while you were confirming. Nothing was written; run the command again to review the new content.`,
    );
  }
  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor === null) throw new Refusal(`Not approved: ${who.reason}. Nothing was written.`);
  const record: ApprovalRecord = {
    ...recordBase(who.actor),
    recordType: 'approval',
    binds: p.binds,
    outcome: 'approved',
    refs: p.refs,
    approval: {
      ...p.block,
      shownHash: shown,
      typedPrefix: shown.slice(0, 8),
      statement: p.statement,
    },
  };
  const landed = writeRecord(io.cwd, record, p.subject, writeOptions(io));
  io.out(
    `Approved. Record ${landed.path} is on the records branch (record ID ${record.recordId}).`,
  );
  return 0;
}
