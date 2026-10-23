// Explicit local diagnostics only: no fetch, writes, approvals or builders. JSON goes to stdout.
// npm run build && node test/factory-real-route.mjs REPO_PATH HARNESS_ROOT story-N [REMOTE]
import { resolve } from 'node:path';
import { configureFactoryDiagnostics } from '../dist/src/factory.js';

const [repo, harnessRoot, story, remote] = process.argv.slice(2);
if (!repo || !harnessRoot || !/^story-[1-9][0-9]*$/.test(story ?? '')) {
  console.error('Supply explicit REPO_PATH HARNESS_ROOT story-N [REMOTE]. Cached diagnostics do not authorize an application package.');
  process.exitCode = 1;
} else {
  const { configuration, route } = configureFactoryDiagnostics({ repoPath: resolve(repo), harnessRoot, remote });
  const state = route ? await route.inspect(story) : null;
  console.log(JSON.stringify({ configuration, story, route: state, dispatch: { implemented: false } }, null, 2));
  process.exitCode = state && state.outcome !== 'uncertain' ? 0 : 1;
}
