import { hashBytes } from './records/hash.js';
import { git, gitText, readBlobs } from './records/git.js';

export const TRUNK = 'main';

/** Fetches `ref` from `remote` into `local` and returns the commit it points at. */
export function fetchRef(cwd: string, remote: string, ref: string, local: string): string {
  git(cwd, ['fetch', '--quiet', '--no-tags', remote, `+${ref}:${local}`]);
  return gitText(cwd, ['rev-parse', `${local}^{commit}`]);
}

export function fetchTrunk(cwd: string, remote = 'origin'): string {
  return fetchRef(cwd, remote, `refs/heads/${TRUNK}`, `refs/remotes/${remote}/${TRUNK}`);
}

export function fetchPullRequest(cwd: string, pr: number, remote = 'origin'): string {
  return fetchRef(cwd, remote, `refs/pull/${pr}/head`, `refs/pod-factory/pull/${pr}`);
}

export function treeOf(cwd: string, commit: string): string {
  return gitText(cwd, ['rev-parse', `${commit}^{tree}`]);
}

/** Every file at `commit`, path to blob ID. */
export function filesAt(cwd: string, commit: string): Map<string, string> {
  const out = git(cwd, ['ls-tree', '-r', '-z', '--full-tree', commit]).stdout.toString();
  const files = new Map<string, string>();
  for (const entry of out.split('\0')) {
    if (entry === '') continue;
    const [meta = '', path = ''] = entry.split('\t');
    const [, type, oid] = meta.split(' ');
    if (type === 'blob' && oid !== undefined) files.set(path, oid);
  }
  return files;
}

/** The sha256-lf hash of each path's content at the commit whose files are `files`. */
export function hashesAt(
  cwd: string,
  files: Map<string, string>,
  paths: readonly string[],
): Record<string, string> {
  const blobs = readBlobs(
    cwd,
    paths.map((p) => files.get(p) as string),
  );
  const hashes: Record<string, string> = {};
  for (const path of paths)
    hashes[path] = hashBytes(blobs.get(files.get(path) as string) as Buffer);
  return hashes;
}

export function contentAt(cwd: string, files: Map<string, string>, path: string): Buffer {
  const oid = files.get(path);
  if (oid === undefined) throw new Error(`${path} is not in the tree`);
  return readBlobs(cwd, [oid]).get(oid) as Buffer;
}
