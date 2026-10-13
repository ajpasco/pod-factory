import { spawnSync } from 'node:child_process';

export interface GitResult {
  status: number;
  stdout: Buffer;
  stderr: string;
}

export interface GitOptions {
  input?: string | Buffer;
  env?: Record<string, string>;
  /** Return a non-zero exit instead of throwing. */
  allowFail?: boolean;
}

export class GitError extends Error {
  constructor(
    readonly args: string[],
    readonly status: number,
    readonly stderr: string,
  ) {
    super(`git ${args.join(' ')} failed (exit ${status}): ${stderr.trim()}`);
  }
}

export function git(cwd: string, args: string[], options: GitOptions = {}): GitResult {
  const result = spawnSync('git', args, {
    cwd,
    input: options.input,
    env: { ...process.env, ...options.env },
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const out: GitResult = {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr.toString(),
  };
  if (out.status !== 0 && options.allowFail !== true) {
    throw new GitError(args, out.status, out.stderr);
  }
  return out;
}

export function gitText(cwd: string, args: string[], options: GitOptions = {}): string {
  return git(cwd, args, options).stdout.toString().trim();
}

/** Reads many blobs in one process; returns their contents by object ID. */
export function readBlobs(cwd: string, oids: string[]): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();
  if (oids.length === 0) return blobs;
  const out = git(cwd, ['cat-file', '--batch'], { input: `${oids.join('\n')}\n` }).stdout;
  let at = 0;
  while (at < out.length) {
    const headerEnd = out.indexOf(0x0a, at);
    const header = out.subarray(at, headerEnd).toString();
    const [oid, type, size] = header.split(' ');
    if (type !== 'blob' || oid === undefined || size === undefined) {
      throw new Error(`git cat-file returned "${header}" where a blob was expected`);
    }
    const start = headerEnd + 1;
    const end = start + Number(size);
    blobs.set(oid, out.subarray(start, end));
    at = end + 1;
  }
  return blobs;
}
