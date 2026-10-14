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
export const RUNNER_NAME = 'github-actions[bot]';
export const RUNNER_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';

export interface Fixture {
  root: string;
  /** The bare repository every clone pushes to. */
  remote: string;
  /** A clone with main checked out, as a project working copy would be. */
  work: string;
  /** Another clone of the same remote. */
  clone(name: string): string;
  /**
   * Commits raw file changes to the records branch, bypassing pod-factory (null deletes). With
   * `by: 'runner'` the commit is made as the Actions bot, as CI's record-writing job makes it.
   */
  plant(
    files: Record<string, string | null>,
    message?: string,
    options?: { by?: 'runner' },
  ): string;
  /** Every file on the remote records branch. */
  filesOnBranch(): string[];
  /** Number of commits on the remote records branch. */
  commitCount(): number;
  /** Commits file changes to main on the remote (null deletes) and returns the commit. */
  commitToMain(files: Record<string, string | null>, message?: string): string;
  /** Publishes main plus `files` as refs/pull/<n>/head, as GitHub does, and returns the commit. */
  pullRequest(n: number, files: Record<string, string | null>): string;
}

function applyFiles(dir: string, files: Record<string, string | null>): void {
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    if (content === null) {
      unlinkSync(full);
    } else {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
  }
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
  const plant = (
    files: Record<string, string | null>,
    message = 'planted change',
    options: { by?: 'runner' } = {},
  ): string => {
    if (planter === null) planter = clone('planter');
    sh(planter, ['fetch', '--quiet', 'origin']);
    sh(planter, ['checkout', '--quiet', '-B', 'records', `origin/${BRANCH}`]);
    applyFiles(planter, files);
    sh(planter, ['add', '--all']);
    const identity =
      options.by === 'runner'
        ? ['-c', `user.name=${RUNNER_NAME}`, '-c', `user.email=${RUNNER_EMAIL}`]
        : [];
    sh(planter, [...identity, 'commit', '--quiet', '-m', message]);
    sh(planter, ['push', '--quiet', 'origin', `HEAD:refs/heads/${BRANCH}`]);
    return sh(planter, ['rev-parse', 'HEAD']);
  };

  let author: string | null = null;
  const onMain = (files: Record<string, string | null>, message: string, push: string): string => {
    if (author === null) author = clone('author');
    sh(author, ['fetch', '--quiet', 'origin']);
    sh(author, ['checkout', '--quiet', '-B', 'work', 'origin/main']);
    applyFiles(author, files);
    sh(author, ['add', '--all']);
    sh(author, ['commit', '--quiet', '--allow-empty', '-m', message]);
    sh(author, ['push', '--quiet', '--force', 'origin', `HEAD:${push}`]);
    return sh(author, ['rev-parse', 'HEAD']);
  };

  return {
    root,
    remote,
    work,
    clone,
    plant,
    commitToMain: (files, message = 'project change') => onMain(files, message, 'refs/heads/main'),
    pullRequest: (n, files) => onMain(files, `pull request ${n}`, `refs/pull/${n}/head`),
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
