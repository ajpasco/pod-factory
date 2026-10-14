import { spawnSync } from 'node:child_process';
import type { InvocationContext } from './records/actor.js';

/** The GitHub CLI's answer, or why it could not be asked. */
export type GhResult = { ok: true; stdout: string } | { ok: false; reason: string };

/**
 * Runs `gh` in the invocation's own environment (a human's login, or GH_TOKEN in Actions). Every
 * GitHub call pod-factory makes in milestone zero goes through here: dispatching the validator,
 * reading a pull request, listing open ones, posting a check run.
 */
export function gh(cwd: string, ctx: InvocationContext, args: string[]): GhResult {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(ctx.env)) if (value !== undefined) env[key] = value;
  const result = spawnSync('gh', args, { cwd, env, encoding: 'utf8' });
  if (result.error)
    return { ok: false, reason: `the GitHub CLI "gh" could not be run (${result.error.message})` };
  if (result.status !== 0) {
    return {
      ok: false,
      reason: `gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr.trim() || `exit ${result.status}`}`,
    };
  }
  return { ok: true, stdout: result.stdout };
}

export interface PullRequestState {
  number: number;
  open: boolean;
  headSha: string;
}

export function pullRequestState(
  cwd: string,
  ctx: InvocationContext,
  pr: number,
): PullRequestState | { reason: string } {
  const result = gh(cwd, ctx, ['pr', 'view', String(pr), '--json', 'state,headRefOid']);
  if (!result.ok) return { reason: result.reason };
  try {
    const parsed = JSON.parse(result.stdout) as { state: string; headRefOid: string };
    return { number: pr, open: parsed.state === 'OPEN', headSha: parsed.headRefOid };
  } catch {
    return { reason: `gh pr view ${pr} answered something pod-factory cannot read` };
  }
}

export function openPullRequests(
  cwd: string,
  ctx: InvocationContext,
): PullRequestState[] | { reason: string } {
  const result = gh(cwd, ctx, [
    'api',
    '--paginate',
    '--jq',
    '.[] | [.number, .head.sha] | @tsv',
    'repos/{owner}/{repo}/pulls?state=open&per_page=100',
  ]);
  if (!result.ok) return { reason: result.reason };
  const pulls: PullRequestState[] = [];
  for (const line of result.stdout.split('\n')) {
    if (line.trim() === '') continue;
    const [number = '', sha = ''] = line.split('\t');
    if (!/^[1-9][0-9]*$/.test(number) || !/^[0-9a-f]{40}$/.test(sha.trim())) {
      return { reason: 'the list of open pull requests from gh could not be read' };
    }
    pulls.push({ number: Number(number), open: true, headSha: sha.trim() });
  }
  return pulls;
}
