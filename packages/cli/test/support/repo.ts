import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vitest';

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

export function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pod-factory-test-'));
  created.push(dir);
  return dir;
}

export function sh(cwd: string, args: string[], input?: string): string {
  const result = spawnSync('git', args, { cwd, input, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  }
  return result.stdout.trim();
}

export const BRANCH = 'pod-factory/records';

export interface Fixture {
  root: string;
  /** The bare repository every clone pushes to. */
  remote: string;
  /** A clone with main checked out, as a project working copy would be. */
  work: string;
  /** Another clone of the same remote. */
  clone(name: string): string;
  /** Commits raw file changes to the records branch, bypassing pod-factory (null deletes). */
  plant(files: Record<string, string | null>, message?: string): string;
  /** Every file on the remote records branch. */
  filesOnBranch(): string[];
  /** Number of commits on the remote records branch. */
  commitCount(): number;
}

/** A bare remote with a main branch and, unless told otherwise, an empty records branch. */
export function fixture(options: { recordsBranch?: boolean } = {}): Fixture {
  const root = tempDir();
  const remote = join(root, 'remote.git');
  sh(root, ['init', '--quiet', '--bare', remote]);

  const seed = join(root, 'seed');
  sh(root, ['init', '--quiet', seed]);
  writeFileSync(join(seed, 'README.md'), 'fixture project\n');
  sh(seed, ['add', 'README.md']);
  sh(seed, ['commit', '--quiet', '-m', 'project start']);
  sh(seed, ['remote', 'add', 'origin', remote]);
  sh(seed, ['push', '--quiet', 'origin', 'main']);
  if (options.recordsBranch !== false) {
    const empty = sh(seed, ['hash-object', '-t', 'tree', '-w', '--stdin'], '');
    const first = sh(seed, ['commit-tree', empty, '-m', 'records branch created']);
    sh(seed, ['push', '--quiet', 'origin', `${first}:refs/heads/${BRANCH}`]);
  }

  const clone = (name: string): string => {
    const dir = join(root, name);
    sh(root, ['clone', '--quiet', remote, dir]);
    return dir;
  };
  const work = clone('work');

  let planter: string | null = null;
  const plant = (files: Record<string, string | null>, message = 'planted change'): string => {
    if (planter === null) planter = clone('planter');
    sh(planter, ['fetch', '--quiet', 'origin']);
    sh(planter, ['checkout', '--quiet', '-B', 'records', `origin/${BRANCH}`]);
    for (const [path, content] of Object.entries(files)) {
      const full = join(planter, path);
      if (content === null) {
        unlinkSync(full);
      } else {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content);
      }
    }
    sh(planter, ['add', '--all']);
    sh(planter, ['commit', '--quiet', '-m', message]);
    sh(planter, ['push', '--quiet', 'origin', `HEAD:refs/heads/${BRANCH}`]);
    return sh(planter, ['rev-parse', 'HEAD']);
  };

  return {
    root,
    remote,
    work,
    clone,
    plant,
    filesOnBranch: () =>
      sh(remote, ['ls-tree', '-r', '--name-only', BRANCH])
        .split('\n')
        .filter((line) => line !== ''),
    commitCount: () => Number(sh(remote, ['rev-list', '--count', BRANCH])),
  };
}

/** Installs a pre-push hook in `clone` that runs `script` once, on the first push only. */
export function prePushOnce(clone: string, script: string): void {
  const hook = join(clone, '.git', 'hooks', 'pre-push');
  const marker = join(clone, '.git', 'pre-push-ran');
  writeFileSync(
    hook,
    [
      '#!/bin/sh',
      `if [ ! -f '${marker}' ]; then`,
      `  touch '${marker}'`,
      '  unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE',
      `  ${script}`,
      'fi',
      '',
    ].join('\n'),
  );
  chmodSync(hook, 0o755);
}
