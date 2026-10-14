import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AGENT_MARKERS } from '../../src/index.js';

const cli = fileURLToPath(new URL('../../dist/cli.js', import.meta.url));

/** This process's environment without agent markers or CI variables, plus `extra`. */
export function cleanEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key === 'GITHUB_ACTIONS') continue;
    if ((AGENT_MARKERS as readonly string[]).includes(key)) continue;
    env[key] = value;
  }
  return { ...env, ...extra };
}

/** Runs the built pod-factory CLI in `cwd` with no terminal attached. */
export function runCli(
  cwd: string,
  args: string[],
  env: Record<string, string>,
  input?: string,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  });
}
