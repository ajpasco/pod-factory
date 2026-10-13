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
