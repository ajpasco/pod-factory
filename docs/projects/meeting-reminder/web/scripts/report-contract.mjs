export function verifyReport(report) {
  const tests = [];
  function walk(suites = []) {
    for (const suite of suites) {
      for (const spec of suite.specs || []) {
        if (spec.ok !== true) throw new Error('A spec did not pass');
        for (const test of spec.tests || []) tests.push(test);
      }
      walk(suite.suites);
    }
  }
  walk(report.suites);
  if (report.errors?.length) throw new Error('Run contained errors');
  if (tests.length !== 38) throw new Error(`Expected 38 tests, received ${tests.length}`);
  for (const test of tests) {
    if (test.status !== 'expected' || test.expectedStatus !== 'passed' || test.results?.length !== 1 ||
        test.results[0].status !== 'passed' || test.results[0].retry !== 0)
      throw new Error('Every test must pass once without skips or retries');
  }
  if (report.stats?.expected !== 38 || report.stats?.unexpected !== 0 || report.stats?.skipped !== 0 || report.stats?.flaky !== 0)
    throw new Error('Run totals are incomplete or unsuccessful');
  return tests.length;
}
