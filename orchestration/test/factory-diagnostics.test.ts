import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureFactoryDiagnostics, factoryDiagnosticsConfigFromEnv, RealFactoryRoute, sha256Lf } from '../src/factory.js';

const harnessRoot = 'docs/projects/equipment-checkout';

test('diagnostics require explicit repo and harness config; absent, partial and unsafe values select nothing', () => {
  assert.equal(configureFactoryDiagnostics(factoryDiagnosticsConfigFromEnv({})).configuration.status, 'unconfigured');
  for (const config of [{ repoPath: '/tmp/repo' }, { harnessRoot }, { repoPath: '', harnessRoot },
    { repoPath: '/tmp/repo', harnessRoot: '../other' }, { repoPath: '/tmp/repo', harnessRoot: '/absolute' },
    { repoPath: '/tmp/repo', harnessRoot, remote: '--help' }, { remote: 'origin' }]) {
    const result = configureFactoryDiagnostics(config);
    assert.equal(result.configuration.status, 'invalid');
    assert.equal(result.route, undefined);
  }
  const explicit = configureFactoryDiagnostics(factoryDiagnosticsConfigFromEnv({ ORCH_FACTORY_REPO: '/tmp/repo', ORCH_FACTORY_HARNESS_ROOT: harnessRoot }));
  assert.equal(explicit.configuration.status, 'configured');
  assert.ok(explicit.route instanceof RealFactoryRoute);
});

test('missing local refs are uncertain and remain explicitly non-authoritative', async t => {
  const repoPath = await mkdtemp(join(tmpdir(), 'factory-missing-'));
  t.after(() => rm(repoPath, { recursive: true, force: true }));
  const result = await new RealFactoryRoute({ repoPath, harnessRoot }).inspect('story-2');
  assert.equal(result.outcome, 'uncertain');
  assert.equal(result.source, 'locally-cached-factory-records');
  assert.equal(result.authority, 'non-authoritative');
  assert.equal(result.packageBinding, 'unverified');
  assert.equal(result.recordsCommit, null);
  assert.match(result.summary, /No fetch/);
});

test('even all matching cached indicators cannot authorize an unrelated exported application or dispatch', async t => {
  const repoPath = await mkdtemp(join(tmpdir(), 'factory-cached-'));
  t.after(() => rm(repoPath, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repoPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  async function file(path: string, content: string) {
    const target = join(repoPath, path); await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, content);
  }
  const storyPath = '.factory/work/story-2/story.md';
  const story = '# Meetings snapshot list and modal\nScope: docs/projects/meeting-reminder/web/src/main.ts\n';
  await file(storyPath, story);
  await file(`${harnessRoot}/test/acceptance.test.ts`, '// presence alone is not an executable reviewed harness\n');
  const record = (recordId: string, recordType: string, extra: object) => JSON.stringify({ schemaVersion: 1, recordId, recordType, createdAt: '2026-10-18T00:00:00Z', actor: { kind: 'human' }, ...extra });
  await file('records/gate2.json', record('candidate-2', 'approval', { approval: { kind: 'gate', gate: 2 } }));
  await file('records/gate3.json', record('candidate-3', 'approval', { approval: { kind: 'gate', gate: 3 }, binds: { tree: null, files: { [storyPath]: sha256Lf(story) } } }));
  await file('records/lock.json', record('candidate-lock', 'lock', { lock: { patterns: [`${harnessRoot}/**`], testCommands: [`echo ${harnessRoot}`] } }));
  await file('records/malformed.json', 'null');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Disposable cached diagnostics fixture');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  git('update-ref', 'refs/remotes/origin/pod-factory/records', 'HEAD');
  git('config', 'remote.origin.url', 'https://example.invalid/never-fetch');
  const before = { status: git('status', '--porcelain'), refs: git('show-ref'), head: git('rev-parse', 'HEAD'), config: git('config', '--local', '--list') };
  const route = new RealFactoryRoute({ repoPath, harnessRoot });
  const result = await route.inspect('story-2');
  assert.equal(result.observations!.length, 8);
  assert.ok(result.observations!.every(p => p.satisfied), 'fixture intentionally supplies every heuristic indicator');
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.authority, 'non-authoritative');
  assert.equal(result.packageBinding, 'unverified');
  assert.deepEqual(result.prerequisites.filter(p => !p.satisfied).map(p => p.id), ['exact-package-authority', 'dispatch-supported']);
  assert.match(result.summary, /Locally cached/);
  assert.ok(result.prerequisites.every(p => p.humanAction === undefined), 'no unvalidated approval instructions are supplied');
  assert.deepEqual({ status: git('status', '--porcelain'), refs: git('show-ref'), head: git('rev-parse', 'HEAD'), config: git('config', '--local', '--list') }, before);
});
