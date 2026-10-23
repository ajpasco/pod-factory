import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { invokeStructuredClaude } from '../src/claude-provider.js';
import { WorkflowError } from '../src/types.js';

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'preparation-provider-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'fake-claude.mjs');
  await writeFile(executable, `#!/usr/bin/env node
let text = '';
process.stdin.on('data', chunk => text += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(text);
  if (input.mode === 'delayed') { setTimeout(() => console.log('{}'), 10000); return; }
  if (input.mode === 'invalid') { console.log('not JSON'); return; }
  if (input.mode === 'error') { console.log(JSON.stringify({ is_error: true, subtype: 'error', result: 'fixture failure' })); return; }
  console.log(JSON.stringify({ subtype: 'success', structured_output: { args: process.argv.slice(2), input } }));
});
`, { mode: 0o700 });
  return { executable, workingRoot: join(root, 'work') };
}

test('provider-owned timeout is an unresolved workflow interruption, not a retryable failure', async t => {
  const options = await fixture(t);
  const signal = new AbortController().signal;
  const input = { executionLimitMs: 100, mode: 'delayed' };
  await assert.rejects(invokeStructuredClaude(options, {}, 'fixture', input, signal), error => {
    assert.ok(error instanceof WorkflowError);
    assert.equal(error.code, 'DRAFT_TIMEOUT');
    assert.match(error.message, /outcome unresolved/);
    return true;
  });
  assert.equal(signal.aborted, false, 'the provider owns this timeout, not the enclosing workflow');
  assert.deepEqual(await readdir(options.workingRoot), []);
});

test('structured transport disables tools, passes schema and rejects unsuccessful or malformed output', async t => {
  const options = await fixture(t);
  const signal = new AbortController().signal;
  const schema = { type: 'object', properties: { sample: { type: 'string' } } };
  const input = { executionLimitMs: 2000, mode: 'success' };
  const output = await invokeStructuredClaude<{ args: string[]; input: typeof input }>(options, schema, 'fixture instructions', input, signal);
  const value = (flag: string) => output.args[output.args.indexOf(flag) + 1];
  assert.deepEqual(output.input, input);
  assert.equal(value('--tools'), '');
  assert.equal(value('--mcp-config'), '{"mcpServers":{}}');
  assert.equal(value('--max-budget-usd'), '2');
  assert.equal(value('--json-schema'), JSON.stringify(schema));
  assert.equal(value('--system-prompt'), 'fixture instructions');
  for (const flag of ['--restricted', '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence']) assert.ok(output.args.includes(flag));
  const invalid = { ...input, mode: 'invalid' }, failed = { ...input, mode: 'error' };
  await assert.rejects(invokeStructuredClaude(options, schema, 'fixture', invalid, signal), /invalid JSON/);
  await assert.rejects(invokeStructuredClaude(options, schema, 'fixture', failed, signal), /did not complete.*fixture failure/);
  assert.deepEqual(await readdir(options.workingRoot), []);
});
