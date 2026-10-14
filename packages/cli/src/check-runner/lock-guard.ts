import { short, type CommandIO } from '../commands/common.js';
import { fetchTrunk, filesAt, hashesAt, treeOf } from '../git-tree.js';
import { effectiveLock, isLockedBy } from '../lock-state.js';
import { gitText } from '../records/git.js';
import { loadRecords } from '../records/store.js';
import { enforcingCopy, fetchHead, jobArgs, pullRequestNumber, reportFlagged } from './job.js';

/**
 * `pod-factory ci lock-guard --pr <n> --head <sha>`. Fails when the pull request changes a locked
 * path without a valid amendment approval bound to its head tree, or when main itself holds
 * locked content the lock and its amendments never approved. Returns the exit code.
 */
export function lockGuard(argv: string[], io: CommandIO): number {
  const args = jobArgs('lock-guard', argv, ['pr', 'head'], ['pr', 'head']);
  const pr = pullRequestNumber(args.pr as string);
  enforcingCopy(io);
  const set = loadRecords(io.cwd, io.remote);
  const head = fetchHead(io, pr, args.head as string);
  const locked = effectiveLock(set);
  reportFlagged(io, set);
  if (locked === null) {
    io.out(
      `lock-guard passes: nothing is locked yet (${set.head === null ? 'the records branch does not exist' : 'no valid lock on the records branch'}).`,
    );
    return 0;
  }
  io.out(
    `Lock ${locked.lock.record.recordId} with ${locked.amendments.length} amendment${locked.amendments.length === 1 ? '' : 's'} applied.`,
  );

  const failures: string[] = [];
  const main = fetchTrunk(io.cwd, io.remote);
  const mainFiles = filesAt(io.cwd, main);
  const onMain = [...mainFiles.keys()].filter((p) => isLockedBy(locked, p));
  const mainHashes = hashesAt(io.cwd, mainFiles, onMain);
  for (const path of [...new Set([...locked.hashes.keys(), ...onMain])].sort()) {
    const now = mainHashes[path] ?? null;
    if (!(locked.held.get(path) ?? [null]).includes(now)) {
      failures.push(
        `${path} on main ${now === null ? 'is missing, which' : 'holds content that'} neither the lock nor any amendment approved. Main has drifted from the lock, so no pull request passes until that is restored or amended.`,
      );
    }
  }

  const base = gitText(io.cwd, ['merge-base', main, head]);
  const changed = gitText(io.cwd, ['diff', '--name-only', '--no-renames', '-z', base, head])
    .split('\0')
    .filter((p) => p !== '' && isLockedBy(locked, p));
  const headFiles = filesAt(io.cwd, head);
  const headTree = treeOf(io.cwd, head);
  const headHashes = hashesAt(
    io.cwd,
    headFiles,
    changed.filter((p) => headFiles.has(p)),
  );
  for (const path of changed) {
    const after = headHashes[path] ?? null;
    const covered = locked.amendments.some((a) => {
      const binding = a.record.binds.files[path];
      return (
        a.record.approval.pullRequest === pr &&
        a.record.binds.tree === headTree &&
        typeof binding === 'object' &&
        binding.after === after
      );
    });
    if (covered) {
      io.out(`${path}: changed under an amendment approval bound to this head.`);
      continue;
    }
    const stale = locked.stale.find(
      (s) => s.path === path && s.amendment.record.approval.pullRequest === pr,
    );
    failures.push(
      stale !== undefined
        ? `${path} is locked, and amendment ${stale.amendment.record.recordId} for it no longer matches what is locked now (another amendment changed it first). The approver runs "pod-factory approve amendment --pr ${pr} ${path}" again, in a terminal outside any agent session.`
        : `${path} is locked, and pull request ${pr} changes it without an amendment approval bound to its head tree ${short(headTree)}. To change it, the approver runs "pod-factory approve amendment --pr ${pr} ${path}" in a terminal outside any agent session.`,
    );
  }

  if (failures.length === 0) {
    io.out(
      `lock-guard passes: pull request ${pr} at ${short(head)} changes ${changed.length === 0 ? 'no locked path' : 'locked paths only under amendments'}.`,
    );
    return 0;
  }
  io.out(`lock-guard fails for pull request ${pr} at ${short(head)}:`);
  for (const failure of failures) io.out(`  ${failure}`);
  return 1;
}
