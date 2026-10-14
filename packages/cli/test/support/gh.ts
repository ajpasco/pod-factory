import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir } from './repo.js';

export interface FakePull {
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  head: string;
}

export interface FakeState {
  /** Every call fails, as gh does when it is logged out or GitHub is unreachable. */
  fail?: boolean;
  pulls: Record<string, FakePull>;
  /** Branch protection by branch name, as the API returns it; absent means not protected. */
  protection?: Record<string, unknown>;
}

export interface FakeGitHub {
  /** Environment for a process that should find this fake as `gh`. */
  env: Record<string, string>;
  set(state: FakeState): void;
  /** Every call so far, as its argument list. */
  calls(): string[][];
}

const SCRIPT = `
const { appendFileSync, readFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + '\\n');
const state = JSON.parse(readFileSync(process.env.FAKE_GH_STATE, 'utf8'));
if (state.fail) { process.stderr.write('fake gh: not logged in'); process.exit(1); }
if (args[0] === 'workflow' && args[1] === 'run') process.exit(0);
if (args[0] === 'pr' && args[1] === 'view') {
  const pull = state.pulls[args[2]];
  if (!pull) { process.stderr.write('no pull request found'); process.exit(1); }
  process.stdout.write(JSON.stringify({ state: pull.state, headRefOid: pull.head }));
  process.exit(0);
}
if (args[0] === 'api' && args.includes('POST')) { process.stdout.write('{}'); process.exit(0); }
const protectedBranch = args[0] === 'api' && new RegExp('branches/(.+)/protection$').exec(args[args.length - 1]);
if (protectedBranch) {
  const found = (state.protection || {})[decodeURIComponent(protectedBranch[1])];
  if (!found) { process.stderr.write('Branch not protected (HTTP 404)'); process.exit(1); }
  process.stdout.write(JSON.stringify(found));
  process.exit(0);
}
if (args[0] === 'api') {
  for (const [n, p] of Object.entries(state.pulls)) if (p.state === 'OPEN') process.stdout.write(n + '\\t' + p.head + '\\n');
  process.exit(0);
}
process.stderr.write('fake gh: unexpected call ' + args.join(' '));
process.exit(1);
`;

/** A fake GitHub CLI on PATH, answering from a state file and logging its calls. */
export function fakeGitHub(initial: FakeState = { pulls: {} }): FakeGitHub {
  const dir = tempDir();
  const bin = join(dir, 'bin');
  const state = join(dir, 'state.json');
  const log = join(dir, 'calls.jsonl');
  writeFileSync(join(dir, 'gh.cjs'), SCRIPT);
  mkdirSync(bin);
  writeFileSync(
    join(bin, 'gh'),
    `#!/bin/sh\nexec '${process.execPath}' '${join(dir, 'gh.cjs')}' "$@"\n`,
  );
  chmodSync(join(bin, 'gh'), 0o755);
  const set = (next: FakeState) => writeFileSync(state, JSON.stringify(next));
  set(initial);
  return {
    env: { PATH: `${bin}:${process.env.PATH ?? ''}`, FAKE_GH_STATE: state, FAKE_GH_LOG: log },
    set,
    calls: () =>
      existsSync(log)
        ? readFileSync(log, 'utf8')
            .split('\n')
            .filter((l) => l !== '')
            .map((l) => JSON.parse(l) as string[])
        : [],
  };
}
