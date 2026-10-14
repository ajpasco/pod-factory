import { active, isLock, short, type CommandIO } from '../commands/common.js';
import { fetchTrunk, treeOf } from '../git-tree.js';
import { gitText } from '../records/git.js';
import { boundStoryFile, gate3Approval, outsideScope, parseStory } from '../story.js';
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
import { checkLockedPaths } from './lock-guard.js';

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

function evaluate(io: CommandIO, set: RecordSet, pr: number, head: string, tree: string): Verdict {
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
  // The locked-path rule, applied here from this run's records rather than taken from lock-guard's
  // check run: a re-run can supersede a check run, so a green one proves nothing after a revocation.
  const lockRule = checkLockedPaths(io, set, pr, head);
  lines.push(
    ...(lockRule.locked === null
      ? ['Nothing is locked yet, so no locked path can change.']
      : lockRule.failures.length === 0
        ? [
            `Lock ${lockRule.locked.lock.record.recordId}: pull request ${pr} changes ${lockRule.changed.length === 0 ? 'no locked path' : 'locked paths only to what is locked now or under unrevoked amendments bound to this head'}, and every locked path it leaves alone holds approved content on main.`,
          ]
        : lockRule.failures),
  );
  let inScope = true;
  if (approval !== undefined && approval.record.approval.kind === 'story') {
    const scope = scopeCheck(io, set, approval.record.approval.story as string, head);
    lines.push(...scope.lines);
    inScope = scope.pass;
  }
  return {
    pass:
      approval !== undefined && result !== undefined && lockRule.failures.length === 0 && inScope,
    lines,
  };
}

/**
 * The story's file scope (TECH-SPEC section 3.2): the diff from the merge base with main to the
 * head stays inside the Scope globs of the story file as gate-3 approval bound it, plus the
 * story's own work folder. The story comes from the human's story approval, never the branch.
 */
function scopeCheck(io: CommandIO, set: RecordSet, story: string, head: string): Verdict {
  const gate3 = gate3Approval(set);
  if (gate3 === undefined) {
    return {
      pass: false,
      lines: [`There is no valid gate-3 approval, so ${story}'s file scope cannot be checked.`],
    };
  }
  // loadRecords fetched the records branch with full depth, which in a shallow clone also makes
  // main's history whole, so the tree gate 3 bound and the merge base are both readable here.
  const main = fetchTrunk(io.cwd, io.remote);
  const file = boundStoryFile(io.cwd, gate3.record, story);
  if ('reason' in file)
    return { pass: false, lines: [`${story}'s file scope cannot be checked: ${file.reason}.`] };
  const lists = parseStory(file.text);
  if ('missing' in lists) {
    return {
      pass: false,
      lines: [
        `${story}'s approved story file has no ${lists.missing.join(', ')} list, so its scope cannot be checked.`,
      ],
    };
  }
  const base = gitText(io.cwd, ['merge-base', main, head]);
  const changed = gitText(io.cwd, ['diff', '--name-only', '--no-renames', '-z', base, head])
    .split('\0')
    .filter((p) => p !== '');
  const outside = outsideScope(story, lists.scope, changed);
  if (outside.length === 0) {
    return {
      pass: true,
      lines: [`All ${changed.length} changed files are inside ${story}'s approved scope.`],
    };
  }
  return {
    pass: false,
    lines: outside.map((p) =>
      p.startsWith('.factory/')
        ? `${p} is in the factory's own folder, outside ${story}'s work folder; a story never changes it.`
        : `${p} is outside ${story}'s approved file scope (${lists.scope.join(', ')}).`,
    ),
  };
}

/**
 * `pod-factory ci gate-check --pr <n> --head <sha>`. Passes only with a valid, unrevoked approval
 * and a passing verify result, both bound to this exact head tree, and with the locked-path rule
 * holding, as the records branch stands when the run reads it. It reads the branch again before
 * reporting and re-evaluates if it moved, so a run that started before a revocation landed cannot
 * pass after it. Returns the exit code.
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
    const verdict = evaluate(io, set, pr, head, tree);
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
