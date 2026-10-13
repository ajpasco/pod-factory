import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AGENT_MARKERS,
  CHECK_RUNNER_IDENTITY,
  detectActorKind,
  resolveActor,
  type InvocationContext,
} from '../src/index.js';
import { fixture, sh } from './support/repo.js';

const packageDir = fileURLToPath(new URL('../', import.meta.url));
const child = fileURLToPath(new URL('./support/actor-child.ts', import.meta.url));

/** The environment of this test process with every marker and CI variable removed. */
function cleanEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (
      value !== undefined &&
      !(AGENT_MARKERS as readonly string[]).includes(key) &&
      key !== 'GITHUB_ACTIONS'
    ) {
      env[key] = value;
    }
  }
  return { ...env, ...extra };
}

function detectInChild(env: Record<string, string>, terminal: boolean): unknown {
  const node = [process.execPath, '--import', 'tsx', child];
  const quoted = node.map((a) => `'${a}'`).join(' ');
  const [cmd, args] = !terminal
    ? [node[0] as string, node.slice(1)]
    : process.platform === 'darwin'
      ? ['script', ['-q', '/dev/null', ...node]]
      : ['script', ['-qec', quoted, '/dev/null']];
  const result = spawnSync(cmd, args, {
    cwd: packageDir,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = /ACTOR (\{.*\})/.exec(result.stdout)?.[1];
  if (line === undefined)
    throw new Error(`no answer from child: ${result.stdout} ${result.stderr}`);
  return JSON.parse(line);
}

const tty = (env: InvocationContext['env']): InvocationContext => ({
  env,
  stdinIsTTY: true,
  stdoutIsTTY: true,
});
const pipe = (env: InvocationContext['env']): InvocationContext => ({
  env,
  stdinIsTTY: false,
  stdoutIsTTY: false,
});

describe('actor kind from the invocation context', () => {
  it('is agent when an agent session marker is set, naming the marker', () => {
    expect(detectActorKind(tty({ CLAUDECODE: '1' }))).toEqual({
      kind: 'agent',
      reason: 'agent session marker CLAUDECODE=1 is set',
    });
    expect(detectActorKind(pipe({ AI_AGENT: 'claude-code_2-1-296_agent' }))).toMatchObject({
      kind: 'agent',
    });
    expect(detectActorKind(tty({ CLAUDECODE: '1', GITHUB_ACTIONS: 'true' }))).toMatchObject({
      kind: 'agent',
    });
  });

  it('is check-runner under GitHub Actions with no marker', () => {
    expect(detectActorKind(pipe({ GITHUB_ACTIONS: 'true' }))).toEqual({
      kind: 'check-runner',
      reason: 'running under GitHub Actions',
    });
  });

  it('is human only on an interactive terminal with no marker', () => {
    expect(detectActorKind(tty({}))).toMatchObject({ kind: 'human' });
    expect(detectActorKind(tty({ ORCA_AGENT_PANE: 'pane-1', CLAUDECODE: '' }))).toMatchObject({
      kind: 'human',
    });
    expect(detectActorKind({ env: {}, stdinIsTTY: true, stdoutIsTTY: false })).toMatchObject({
      kind: null,
    });
    expect(detectActorKind({ env: {}, stdinIsTTY: false, stdoutIsTTY: true })).toMatchObject({
      kind: null,
    });
  });

  it('names no actor when it cannot tell', () => {
    expect(detectActorKind(pipe({}))).toEqual({
      kind: null,
      reason: expect.stringMatching(/cannot be told/),
    });
  });

  it('detects agent, check-runner and human in real processes', () => {
    expect(detectInChild(cleanEnv({ CLAUDECODE: '1' }), true)).toMatchObject({ kind: 'agent' });
    expect(detectInChild(cleanEnv({ GITHUB_ACTIONS: 'true' }), false)).toMatchObject({
      kind: 'check-runner',
    });
    expect(detectInChild(cleanEnv(), true)).toMatchObject({ kind: 'human' });
    expect(detectInChild(cleanEnv(), false)).toMatchObject({ kind: null });
  });

  it('takes the human or agent identity from git and the check-runner identity from CI', () => {
    const f = fixture();
    expect(resolveActor(f.work, tty({}))).toEqual({
      actor: { name: 'Test Human', email: 'human@example.test', kind: 'human' },
    });
    expect(resolveActor(f.work, pipe({ CLAUDECODE: '1' }))).toMatchObject({
      actor: { kind: 'agent' },
    });
    expect(resolveActor(f.work, pipe({ GITHUB_ACTIONS: 'true' }))).toEqual({
      actor: { ...CHECK_RUNNER_IDENTITY, kind: 'check-runner' },
    });
    sh(f.work, ['config', 'user.name', '']);
    expect(resolveActor(f.work, tty({}))).toMatchObject({
      actor: null,
      reason: expect.stringMatching(/user.name/),
    });
  });
});
