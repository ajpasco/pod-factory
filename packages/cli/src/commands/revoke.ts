import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { fetchPullRequest, treeOf } from '../git-tree.js';
import { gh, pullRequestState } from '../github.js';
import { effectiveLock } from '../lock-state.js';
import { resolveActor } from '../records/actor.js';
import {
  BOOTSTRAP_FILE_PATTERN,
  recordBase,
  type FactoryRecord,
  type RevocationRecord,
} from '../records/format.js';
import { git } from '../records/git.js';
import { hashText } from '../records/hash.js';
import { loadRecords, type RecordSet } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import {
  pullRequestOf,
  relayRecord,
  reliedOn,
  revocationTarget,
  type RevocationTarget,
} from '../revocation.js';
import {
  Refusal,
  finishPendingWrites,
  requireHuman,
  short,
  writeOptions,
  type CommandIO,
} from './common.js';

export const REVOKE_USAGE = `Usage:
  pod-factory revoke <record ID | bootstrap record file> --reason "<why>" [--wait <seconds>]
  Running it again for a revoked record reports whether CI has enforced the revocation.`;

const POLL_SECONDS = 10;

function describe(target: RevocationTarget): string {
  if (target.kind === 'bootstrap') return `bootstrap record ${target.stored.path}`;
  const r = target.stored.record;
  if (r.recordType === 'approval') {
    const a = r.approval;
    if (a.kind === 'gate') return `the gate-${a.gate} approval ${r.recordId}`;
    if (a.kind === 'story')
      return `the ${a.story} approval ${r.recordId} for pull request ${a.pullRequest}`;
    return `the ${a.kind} approval ${r.recordId} for pull request ${a.pullRequest}`;
  }
  if (r.recordType === 'check-result') {
    return `the ${r.checkResult.check} result ${r.recordId} for pull request ${r.checkResult.pullRequest}`;
  }
  if (r.recordType === 'transition')
    return `the ${r.transition.story} transition ${r.recordId} to ${r.transition.to}`;
  return `the ${r.recordType} ${r.recordId}`;
}

/** For a lock, the paths that stop being locked if it is revoked; the one revocation that loosens. */
function unlockedBy(set: RecordSet, target: RevocationTarget): string[] {
  if (target.kind !== 'record' || target.stored.record.recordType !== 'lock') return [];
  const id = target.stored.record.recordId;
  const now = effectiveLock(set);
  const after = effectiveLock({
    ...set,
    records: set.records.filter((s) => s.record.recordId !== id),
  });
  const locked = (state: typeof now) =>
    new Set(
      [...(state?.hashes ?? new Map<string, string | null>())]
        .filter(([, h]) => h !== null)
        .map(([p]) => p),
    );
  const stays = locked(after);
  return [...locked(now)].filter((p) => !stays.has(p)).sort();
}

function effect(target: RevocationTarget, unlocked: string[]): string {
  if (target.kind === 'bootstrap') return `${target.stored.path} no longer counts.`;
  const r: FactoryRecord = target.stored.record;
  if (r.recordType === 'approval') {
    const a = r.approval;
    if (a.kind === 'gate' && a.gate === 2) {
      return 'Gate 2 is open again. The lock stays in force until a new gate-2 approval and lock.';
    }
    if (a.kind === 'gate') return `Gate ${a.gate} is open again.`;
    if (a.kind === 'amendment') {
      return `The amendment for pull request ${a.pullRequest} no longer counts; gate-check and lock-guard fail that change. If it has already merged, every pull request that leaves those paths alone fails until a pull request restores them to what is locked now, or an amendment approves what main holds.`;
    }
    return `Pull request ${a.pullRequest} has no valid approval for that content now; gate-check fails it.`;
  }
  if (r.recordType === 'lock')
    return `${unlocked.length} ${unlocked.length === 1 ? 'path is' : 'paths are'} no longer locked.`;
  if (r.recordType === 'check-result') {
    return `Pull request ${r.checkResult.pullRequest} has no passing ${r.checkResult.check} result for that content now.`;
  }
  return 'That record no longer counts.';
}

type Enforcement = { done: true; message: string } | { done: false; message: string };

/** Whether CI has blocked every open pull request that relied on the revoked record. */
function enforcement(
  io: CommandIO,
  set: RecordSet,
  revocation: RevocationRecord,
  target: RevocationTarget,
): Enforcement {
  if (target.kind === 'bootstrap') {
    return {
      done: true,
      message: 'No pull request merges on a bootstrap record, so there is nothing for CI to block.',
    };
  }
  const pr = pullRequestOf(target.stored.record);
  if (pr === null) {
    return {
      done: true,
      message: 'No pull request merges on this record, so there is nothing for CI to block.',
    };
  }
  const state = pullRequestState(io.cwd, io.ctx, pr);
  if ('reason' in state) {
    return {
      done: false,
      message: `Pending: pod-factory cannot ask GitHub whether pull request ${pr} is blocked (${state.reason}).`,
    };
  }
  if (!state.open) {
    return {
      done: true,
      message: `Pull request ${pr} is not open. A merge completed before the revocation stands as history and is undone by a revert pull request under its own approval.`,
    };
  }
  let tree: string;
  try {
    fetchPullRequest(io.cwd, pr, io.remote);
    git(io.cwd, ['fetch', '--quiet', '--no-tags', io.remote, state.headSha], { allowFail: true });
    tree = treeOf(io.cwd, state.headSha);
  } catch {
    return {
      done: false,
      message: `Pending: pull request ${pr}'s head ${short(state.headSha)} cannot be fetched to check it.`,
    };
  }
  if (!reliedOn(target.stored.record, pr, tree)) {
    return {
      done: true,
      message: `Pull request ${pr} has moved on to tree ${short(tree)}, so gate-check no longer counts the revoked record for it; there is nothing to block.`,
    };
  }
  const relayed = relayRecord(set, revocation, pr, tree);
  if (relayed !== undefined) {
    return {
      done: true,
      message: `Enforced: CI posted a failing gate-check on pull request ${pr} at ${short(state.headSha)} (${relayed.record.checkResult.runUrl}).`,
    };
  }
  return {
    done: false,
    message: `Pending: CI has not yet confirmed that pull request ${pr} is blocked. Run the same revoke command again to check.`,
  };
}

/** Starts records-validate on main, whose relay blocks the pull requests that relied on it. */
function dispatchRelay(io: CommandIO): void {
  const dispatched = gh(io.cwd, io.ctx, [
    'workflow',
    'run',
    'records-validate.yml',
    '--ref',
    'main',
  ]);
  io.out(
    dispatched.ok
      ? 'records-validate was started so CI blocks any open pull request that relied on it.'
      : `records-validate could not be started (${dispatched.reason}); run the same revoke command again to retry. Its schedule also picks the revocation up.`,
  );
}

async function report(
  io: CommandIO,
  revocation: RevocationRecord,
  target: RevocationTarget,
  waitSeconds: number,
): Promise<void> {
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    const set = loadRecords(io.cwd, io.remote);
    const result = enforcement(io, set, revocation, target);
    if (result.done || Date.now() + POLL_SECONDS * 1000 > deadline) {
      io.out(result.message);
      return;
    }
    await sleep(POLL_SECONDS * 1000);
  }
}

/** `pod-factory revoke`. Returns the exit code. */
export async function revoke(argv: string[], io: CommandIO): Promise<number> {
  requireHuman('revoke', io.ctx);
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { reason: { type: 'string' }, wait: { type: 'string' } },
    });
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${REVOKE_USAGE}`);
  }
  const [revokes, ...extra] = parsed.positionals;
  if (revokes === undefined || extra.length > 0) throw new Refusal(REVOKE_USAGE);
  if (!(/^[0-9a-f]{12}$/.test(revokes) || BOOTSTRAP_FILE_PATTERN.test(revokes))) {
    throw new Refusal(
      `"${revokes}" is not a record ID or a bootstrap record file name.\n${REVOKE_USAGE}`,
    );
  }
  const waitSeconds = parsed.values.wait === undefined ? 120 : Number(parsed.values.wait);
  if (!Number.isInteger(waitSeconds) || waitSeconds < 0) {
    throw new Refusal(`--wait takes a whole number of seconds.\n${REVOKE_USAGE}`);
  }
  finishPendingWrites(io);

  const set = loadRecords(io.cwd, io.remote);
  const target = revocationTarget(set, revokes);
  if (target === null) {
    const flagged = set.flagged.find((f) => f.path.includes(revokes));
    throw new Refusal(
      flagged !== undefined
        ? `There is nothing to revoke: ${flagged.reason}. Nothing was written.`
        : `There is no valid record ${revokes} on the records branch, so there is nothing to revoke. Nothing was written.`,
    );
  }
  const earlier = set.records.find(
    (s): s is typeof s & { record: RevocationRecord } =>
      s.record.recordType === 'revocation' && s.record.revocation.revokes === revokes,
  );
  if (earlier !== undefined) {
    io.out(
      `${describe(target)} was already revoked by ${earlier.record.recordId}. Nothing was written.`,
    );
    // A run stopped after the revocation landed but before the dispatch leaves nothing to start
    // the relay, so while enforcement is pending every re-run starts it again.
    if (!enforcement(io, set, earlier.record, target).done) dispatchRelay(io);
    await report(io, earlier.record, target, waitSeconds);
    return 0;
  }
  const reason = parsed.values.reason?.trim();
  if (reason === undefined || reason === '')
    throw new Refusal(`revoke needs --reason.\n${REVOKE_USAGE}`);

  const unlocked = unlockedBy(set, target);
  const lines = [`Revoke ${describe(target)}. Reason: ${reason}`];
  if (target.kind === 'record' && target.stored.record.recordType === 'lock') {
    lines.push(
      `This is the one revocation that loosens: ${unlocked.length} ${unlocked.length === 1 ? 'path stops' : 'paths stop'} being locked${unlocked.length === 0 ? '' : ':'}`,
      ...unlocked.slice(0, 20).map((p) => `  ${p}`),
      ...(unlocked.length > 20 ? [`  and ${unlocked.length - 20} more`] : []),
    );
  }
  const statement = lines.join('\n');
  const shown = hashText(JSON.stringify({ statement, revokes, reason }));
  io.out(statement);
  io.out(`Hash of everything above: ${shown}`);
  const typed = (
    await io.ask(
      'Type "revoke" and the first eight characters of the hash (for example: revoke 00000000): ',
    )
  )
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (typed !== `revoke ${shown.slice(0, 8)}`) {
    throw new Refusal(
      `Not revoked: you typed "${typed}", which does not match "revoke" and the first eight characters of the hash. Nothing was written.`,
    );
  }
  const now = loadRecords(io.cwd, io.remote);
  if (
    now.records.some(
      (s) => s.record.recordType === 'revocation' && s.record.revocation.revokes === revokes,
    )
  ) {
    throw new Refusal(
      `Not revoked: ${describe(target)} was revoked by someone else while you were confirming. Nothing was written.`,
    );
  }
  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor === null) throw new Refusal(`Not revoked: ${who.reason}. Nothing was written.`);
  const record: RevocationRecord = {
    ...recordBase(who.actor),
    recordType: 'revocation',
    binds: { tree: null, files: {} },
    outcome: 'revoked',
    refs: [revokes],
    revocation: { revokes, reason },
  };
  const landed = writeRecord(
    io.cwd,
    record,
    `revoke-${revokes
      .replace(/\.json$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-$/, '')}`,
    writeOptions(io),
  );
  io.out(`Revoked. Record ${landed.path} is on the records branch (record ID ${record.recordId}).`);
  io.out(effect(target, unlocked));
  dispatchRelay(io);
  await report(io, record, target, waitSeconds);
  return 0;
}
