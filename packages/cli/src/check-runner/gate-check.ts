import { active, isLock, short, type CommandIO } from '../commands/common.js';
import { treeOf } from '../git-tree.js';
import type { ApprovalRecord, CheckResultRecord, FactoryRecord } from '../records/format.js';
import { loadRecords, type RecordSet } from '../records/store.js';
import {
  enforcingCopy,
  fetchHead,
  jobArgs,
  pullRequestNumber,
  reportFlagged,
  requireRecordsBranch,
} from './job.js';

/** The optional hook a test uses to land a record between gate-check's two reads. */
export interface GateCheckHooks {
  afterRead?: (attempt: number) => void;
}

const isMergeApproval = (r: FactoryRecord): r is ApprovalRecord =>
  r.recordType === 'approval' && (r.approval.kind === 'story' || r.approval.kind === 'bootstrap');

const isVerifyResult = (r: FactoryRecord): r is CheckResultRecord =>
  r.recordType === 'check-result' && r.checkResult.check === 'verify';

interface Verdict {
  pass: boolean;
  lines: string[];
}

function evaluate(set: RecordSet, pr: number, tree: string): Verdict {
  const locked = active(set, isLock).length > 0;
  const forThisPr = active(set, isMergeApproval).filter(
    (a) => a.record.approval.pullRequest === pr,
  );
  const counted = forThisPr.filter((a) => !locked || a.record.approval.kind === 'story');
  const approval = counted.filter((a) => a.record.binds.tree === tree).at(-1);
  const results = active(set, isVerifyResult).filter(
    (r) => r.record.checkResult.pullRequest === pr && r.record.binds.tree === tree,
  );
  const result = results.filter((r) => r.record.outcome === 'pass').at(-1);

  const lines: string[] = [];
  if (approval === undefined) {
    const older = counted.at(-1);
    const bootstrapOnly = forThisPr.length > 0 && counted.length === 0;
    lines.push(
      older !== undefined
        ? `Approval ${older.record.recordId} binds tree ${short(older.record.binds.tree ?? '')}, but the head is at tree ${short(tree)}: the pull request changed after it was approved, so it needs a new review and approval.`
        : bootstrapOnly
          ? `The approvals for pull request ${pr} are bootstrap approvals, which stop counting once the lock exists; it needs "pod-factory approve story-<n> --pr ${pr}".`
          : `There is no approval for pull request ${pr} at tree ${short(tree)}. The approver runs "pod-factory approve story-<n> --pr ${pr}"${locked ? '' : ` (or "pod-factory approve bootstrap ${pr}" before the first lock)`} in a terminal outside any agent session, then re-runs gate-check.`,
    );
  }
  if (result === undefined) {
    lines.push(
      results.length > 0
        ? `verify failed for tree ${short(tree)} (check result ${results.at(-1)?.record.recordId}).`
        : `There is no verify result for tree ${short(tree)}. "Tests passed" counts only with the verify run's own evidence bundle for this exact tree.`,
    );
  }
  if (approval !== undefined && result !== undefined) {
    lines.push(
      `Approval ${approval.record.recordId} by ${approval.record.actor.name} and verify result ${result.record.recordId} (run ${result.record.checkResult.runUrl}, bundle manifest ${short(result.record.checkResult.bundleManifestSha256 ?? '')}) bind tree ${short(tree)}, and neither is revoked.`,
    );
  }
  return { pass: approval !== undefined && result !== undefined, lines };
}

/**
 * `pod-factory ci gate-check --pr <n> --head <sha>`. Passes only with a valid, unrevoked approval
 * and a passing verify result, both bound to this exact head tree, as the records branch stands
 * when the run reads it. It reads the branch again before reporting and re-evaluates if it moved,
 * so a run that started before a revocation landed cannot pass after it. Returns the exit code.
 */
export function gateCheck(argv: string[], io: CommandIO, hooks: GateCheckHooks = {}): number {
  const args = jobArgs('gate-check', argv, ['pr', 'head'], ['pr', 'head']);
  const pr = pullRequestNumber(args.pr as string);
  enforcingCopy(io);
  const head = fetchHead(io, pr, args.head as string);
  const tree = treeOf(io.cwd, head);
  let set = loadRecords(io.cwd, io.remote);
  for (let attempt = 0; attempt < 5; attempt++) {
    requireRecordsBranch(set, 'gate-check');
    const verdict = evaluate(set, pr, tree);
    hooks.afterRead?.(attempt);
    const again = loadRecords(io.cwd, io.remote);
    if (again.head === set.head) {
      reportFlagged(io, set);
      io.out(
        `gate-check ${verdict.pass ? 'passes' : 'fails'} for pull request ${pr} at ${short(head)}, records branch at ${short(set.head ?? '')}:`,
      );
      for (const line of verdict.lines) io.out(`  ${line}`);
      return verdict.pass ? 0 : 1;
    }
    io.out(
      `The records branch moved from ${short(set.head ?? '')} to ${short(again.head ?? '')} during this run; evaluating again.`,
    );
    set = again;
  }
  io.out('gate-check fails: the records branch kept moving during the run. Re-run gate-check.');
  return 1;
}
