import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = fileURLToPath(new URL('../../', import.meta.url));

/** Builds the package once, so e2e and integration tests run the CLI as it ships. */
export default function setup(): void {
  execFileSync('npm', ['run', 'build'], { cwd: packageDir, stdio: 'pipe' });
}
