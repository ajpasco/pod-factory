import { git } from './git.js';
import type { Actor, ActorKind } from './format.js';

/**
 * Environment variables that mark an agent session. Claude Code sets CLAUDECODE=1 in every
 * shell it starts; AI_AGENT is the cross-tool convention it also sets. Orca's ORCA_* variables
 * are deliberately not markers: Orca sets them in human terminal panes too.
 */
export const AGENT_MARKERS = ['CLAUDECODE', 'AI_AGENT'] as const;

export const CHECK_RUNNER_IDENTITY = {
  name: 'github-actions[bot]',
  email: '41898282+github-actions[bot]@users.noreply.github.com',
} as const;

export interface InvocationContext {
  env: Record<string, string | undefined>;
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
}

export type ActorKindResult = { kind: ActorKind; reason: string } | { kind: null; reason: string };

export function currentContext(): InvocationContext {
  return {
    env: process.env,
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
  };
}

/** The first agent marker set in this environment, e.g. "CLAUDECODE=1", or null. */
export function agentMarker(env: InvocationContext['env']): string | null {
  for (const name of AGENT_MARKERS) {
    const value = env[name];
    if (value !== undefined && value !== '') return `${name}=${value}`;
  }
  return null;
}

/**
 * Derives the actor kind from how pod-factory was invoked, never from a flag. An agent marker
 * wins over everything else, so an agent running inside GitHub Actions is still an agent.
 */
export function detectActorKind(ctx: InvocationContext): ActorKindResult {
  const marker = agentMarker(ctx.env);
  if (marker !== null) return { kind: 'agent', reason: `agent session marker ${marker} is set` };
  if (ctx.env.GITHUB_ACTIONS === 'true') {
    return { kind: 'check-runner', reason: 'running under GitHub Actions' };
  }
  if (ctx.stdinIsTTY && ctx.stdoutIsTTY) {
    return { kind: 'human', reason: 'interactive terminal with no agent session marker' };
  }
  return {
    kind: null,
    reason:
      'not an interactive terminal, not GitHub Actions and no agent session marker, so who is running this cannot be told',
  };
}

/** The actor for a record written from this invocation, or the reason none can be named. */
export function resolveActor(
  cwd: string,
  ctx: InvocationContext = currentContext(),
): { actor: Actor } | { actor: null; reason: string } {
  const detected = detectActorKind(ctx);
  if (detected.kind === null) return { actor: null, reason: detected.reason };
  if (detected.kind === 'check-runner') {
    return { actor: { ...CHECK_RUNNER_IDENTITY, kind: 'check-runner' } };
  }
  const name = git(cwd, ['config', 'user.name'], { allowFail: true }).stdout.toString().trim();
  const email = git(cwd, ['config', 'user.email'], { allowFail: true }).stdout.toString().trim();
  if (name === '' || email === '') {
    return {
      actor: null,
      reason: 'git user.name and user.email must both be set so the record can name its writer',
    };
  }
  return { actor: { name, email, kind: detected.kind } };
}
