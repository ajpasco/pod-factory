import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyReport } from './report-contract.mjs';
function green() {
  return { suites: [{ specs: Array.from({ length: 38 }, () => ({ ok: true, tests: [{ status: 'expected', expectedStatus: 'passed', results: [{ status: 'passed', retry: 0 }] }] })) }], errors: [], stats: { expected: 38, unexpected: 0, skipped: 0, flaky: 0 } };
}
test('accepts 38 passing tests', () => assert.equal(verifyReport(green()), 38));
for (const [name, change] of Object.entries({
  zero: r => r.suites = [], incomplete: r => r.suites[0].specs.pop(),
  skip: r => r.suites[0].specs[0].tests[0].results[0].status = 'skipped',
  retry: r => r.suites[0].specs[0].tests[0].results.push({ status: 'passed', retry: 1 }),
  failure: r => r.suites[0].specs[0].ok = false,
  errors: r => r.errors.push({ message: 'broken discovery' }),
})) test(`rejects ${name}`, () => { const r = green(); change(r); assert.throws(() => verifyReport(r)); });
