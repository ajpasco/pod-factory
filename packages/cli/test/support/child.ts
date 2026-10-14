import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = fileURLToPath(new URL('../../', import.meta.url));
const script = fileURLToPath(new URL('./write-child.ts', import.meta.url));

/** Runs write-child.ts under tsx with extra environment variables. */
export function runChild(
  args: string[],
  env: Record<string, string> = {},
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: packageDir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

const flowScript = fileURLToPath(new URL('./flow-child.ts', import.meta.url));

/**
 * Runs one pod-factory command in flow-child.ts, killed at `killAt` when given. `ctxEnv` joins
 * the command's own invocation environment, for example to put a fake gh on its PATH.
 */
export function runFlowChild(
  cwd: string,
  who: 'human' | 'agent',
  token: string,
  args: string[],
  killAt?: string,
  ctxEnv: Record<string, string> = {},
): SpawnSyncReturns<string> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.POD_FACTORY_TEST_KILL_AT;
  if (killAt !== undefined) env.POD_FACTORY_TEST_KILL_AT = killAt;
  env.POD_FACTORY_TEST_CTX_ENV = JSON.stringify(ctxEnv);
  return spawnSync(process.execPath, ['--import', 'tsx', flowScript, cwd, who, token, ...args], {
    cwd: packageDir,
    env,
    encoding: 'utf8',
  });
}
