#!/usr/bin/env python3
"""The one definition of the gate-2 classification result, shared by scripts 2 and 3.

Usage: python3 classification-check.py <report.json>
Exit 0 only when the report is exactly the approved result. Exit 1 with reasons otherwise.

The constants below are the approved baseline for milestone zero's classification: the locked
command list over main produces 167 tests in 17 files, of which 164 pass, and the three that fail
are the status tests story one builds, all three in packages/cli/test/status.test.ts. They are not
convenience defaults. If a run legitimately produces a different suite -- a test added, a test
renamed, status built -- that is a new classification for the design session to review and the
approver to approve, and these constants change by that deliberate act. Nothing here may be
relaxed to make a run pass.

Counting assertions is not enough, and this file was wrong to stop there. In the installed
reporter's format (vitest 5.0.4, the JsonReporter in vitest/dist/chunks/cli-api.*.js) a module that
throws while being collected produces a testResults entry with status "failed", an empty
assertionResults list and the error in "message", while numTotalTests, numPassedTests and
numFailedTests stay exactly as they were. A report carrying the three approved failures plus such
an error therefore satisfied every earlier check. The approver reproduced that. So the whole
report is judged: the file-level entries, the reporter's own counters, and the assertions, each
against the approved baseline.

What the format can and cannot show, from that reporter's code:
- Every counter it emits is checked here, and each is also recounted from assertionResults, so a
  doctored header and a doctored body contradict each other.
- A file-level failure appears as testResults[].status "failed" with testResults[].message set
  from the file's first error. Both are checked, so a collection, import or setup error is named.
- The JSON has no field for unhandled errors as such. What it shows of them is the file-level
  status, the message and the counters, which are checked. An error that leaves no trace in any of
  those is not visible in this report at all, and this checker does not pretend otherwise.
"""

import json
import re
import sys

EXPECTED_TOTAL = 167
EXPECTED_PASSED = 164
EXPECTED_FAILURES = ('T-19-P1', 'T-19-N1', 'T-19-N2')
EXPECTED_FAILING_FILE = 'packages/cli/test/status.test.ts'
EXPECTED_FILES = 17
EXPECTED_SUITES = 48
EXPECTED_FAILED_SUITES = 2
EXPECTED_PASSED_SUITES = 46
TEST_ID = re.compile(r'T-\d+-[PN]\d+')


def short(path):
    """The repository-relative tail of a report's absolute file path."""
    for marker in ('/packages/', '/templates/'):
        if marker in path:
            return path[path.index(marker) + 1:]
    return path.rsplit('/', 1)[-1]


def check(path):
    """Returns (lines to print, reasons). An empty reason list means it matches."""
    reasons = []
    try:
        with open(path, 'rb') as handle:
            report = json.loads(handle.read())
    except FileNotFoundError:
        return [], [f'there is no report at {path}']
    except Exception as error:
        return [], [f'{path} is not readable JSON ({error})']

    files = report.get('testResults')
    if not isinstance(files, list) or len(files) == 0:
        return [], [f'{path} has no testResults, so it reports no run at all']

    total = 0
    passed = []
    failed = []
    other = []
    for entry in files:
        for assertion in entry.get('assertionResults') or []:
            total += 1
            name = assertion.get('fullName') or assertion.get('title') or ''
            status = assertion.get('status')
            match = TEST_ID.search(name)
            row = (match.group(0) if match else None, status, name, short(entry.get('name') or ''))
            if status == 'passed':
                passed.append(row)
            elif status == 'failed':
                failed.append(row)
            else:
                other.append(row)

    empty_files = [entry for entry in files if not (entry.get('assertionResults') or [])]
    messaged = [entry for entry in files if (entry.get('message') or '').strip()]
    failed_files = [entry for entry in files if entry.get('status') == 'failed']
    failed_without_failures = [
        entry for entry in failed_files
        if not any(a.get('status') == 'failed' for a in entry.get('assertionResults') or [])
    ]
    counters = {key: report.get(key) for key in (
        'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests',
        'numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numPendingTestSuites')}

    lines = [f'tests: total={total} passed={len(passed)} failed={len(failed)}'
             + (f' other={len(other)}' if other else ''),
             f'files: {len(files)}, of which {len(failed_files)} failed'
             + (f'; {len(empty_files)} with no tests at all' if empty_files else ''),
             'reporter counters: ' + ' '.join(f'{k.replace("num", "")}={v}' for k, v in counters.items()),
             f'success: {report.get("success")}']
    for row in failed + other:
        lines.append(f'  {row[1]}: {row[0] or "(no test ID)"}  {row[2][:88]}')
    for entry in failed_files:
        if entry in empty_files or entry in messaged:
            lines.append(f'  failed file with no test result: {short(entry.get("name") or "")}'
                         f'  {(entry.get("message") or "").strip()[:88]}')

    # The run itself: a file-level failure is not a test failure, and never classifiable.
    for entry in empty_files:
        reasons.append(f'{short(entry.get("name") or "?")} produced no test at all, which is a runner, '
                       f'import or setup failure rather than a test result'
                       + (f': {(entry.get("message") or "").strip()[:120]}' if (entry.get('message') or '').strip() else ''))
    for entry in messaged:
        if entry not in empty_files:
            reasons.append(f'{short(entry.get("name") or "?")} carries a file-level error message, which '
                           f'no test produced: {(entry.get("message") or "").strip()[:120]}')
    for entry in failed_without_failures:
        if entry not in empty_files:
            reasons.append(f'{short(entry.get("name") or "?")} is marked failed while none of its tests '
                           'failed, so something outside the tests failed in it')
    unexpected_files = sorted({short(e.get('name') or '?') for e in failed_files} - {EXPECTED_FAILING_FILE})
    for name in unexpected_files:
        reasons.append(f'{name} failed, and the approved classification fails only {EXPECTED_FAILING_FILE}')
    if len(files) != EXPECTED_FILES:
        reasons.append(f'the run has {len(files)} test files where the approved classification has {EXPECTED_FILES}')

    # The reporter's own counters, each against the baseline and against a recount of the body.
    for key, expected in (('numTotalTests', EXPECTED_TOTAL), ('numPassedTests', EXPECTED_PASSED),
                          ('numFailedTests', len(EXPECTED_FAILURES)), ('numPendingTests', 0),
                          ('numTodoTests', 0), ('numTotalTestSuites', EXPECTED_SUITES),
                          ('numFailedTestSuites', EXPECTED_FAILED_SUITES),
                          ('numPassedTestSuites', EXPECTED_PASSED_SUITES),
                          ('numPendingTestSuites', 0)):
        value = counters.get(key)
        if value != expected:
            reasons.append(f'the reporter says {key}={value} where the approved classification has {expected}')
    for key, counted in (('numTotalTests', total), ('numPassedTests', len(passed)),
                         ('numFailedTests', len(failed))):
        value = counters.get(key)
        if isinstance(value, int) and value != counted:
            reasons.append(f'the reporter says {key}={value} while its own test results count {counted}, '
                           'so the report contradicts itself')
    if report.get('success') is not False:
        reasons.append(f'the reporter says success={report.get("success")}, which cannot be true of a run '
                       'with approved failures')

    # The assertions themselves.
    if total != EXPECTED_TOTAL:
        reasons.append(f'the run has {total} tests where the approved classification has {EXPECTED_TOTAL}')
    if len(passed) != EXPECTED_PASSED:
        reasons.append(f'{len(passed)} tests passed where the approved classification has {EXPECTED_PASSED}')
    if len(failed) != len(EXPECTED_FAILURES):
        reasons.append(f'{len(failed)} tests failed where the approved classification has {len(EXPECTED_FAILURES)}')
    for test_id, status, name, _ in other:
        reasons.append(f'{test_id or name[:60]} is {status}, which is neither passed nor failed; '
                       'a test that did not run cannot be classified')
    for test_id, _, name, _ in failed:
        if test_id is None:
            reasons.append(f'a failing test has no T-nn test ID, so no record can name it: {name[:80]}')
    ids = [row[0] for row in failed if row[0] is not None]
    for test_id in sorted({i for i in ids if ids.count(i) > 1}):
        reasons.append(f'{test_id} appears as a failure more than once')
    for test_id in sorted(set(ids) - set(EXPECTED_FAILURES)):
        reasons.append(f'{test_id} failed and is not one of the approved failures '
                       f'({", ".join(EXPECTED_FAILURES)})')
    for test_id in EXPECTED_FAILURES:
        if test_id not in ids:
            reasons.append(f'{test_id} is an approved failure and did not fail in this run')
    for test_id, _, _, where in failed:
        if test_id in EXPECTED_FAILURES and where != EXPECTED_FAILING_FILE:
            reasons.append(f'{test_id} failed in {where}, not in {EXPECTED_FAILING_FILE}')

    seen = set()
    ordered = [r for r in reasons if not (r in seen or seen.add(r))]
    return lines, ordered


def main(argv):
    if len(argv) != 2:
        print('Usage: python3 classification-check.py <report.json>', file=sys.stderr)
        return 2
    lines, reasons = check(argv[1])
    for line in lines:
        print(line)
    if reasons:
        print()
        print('This run is not the approved classification result:')
        for reason in reasons:
            print(f'  - {reason}')
        print()
        print(f'The approved result is {EXPECTED_TOTAL} tests in {EXPECTED_FILES} files, '
              f'{EXPECTED_PASSED} passed, exactly {", ".join(EXPECTED_FAILURES)} failing, all three in '
              f'{EXPECTED_FAILING_FILE}, and no failure that no test produced.')
        print('A classification record is the only written trace of which failures were approved, so it')
        print('is not written for a run that differs. If the difference is legitimate, the design session')
        print('reviews it and the constants in this file change deliberately; they are never relaxed to')
        print('make a run pass.')
        return 1
    print(f'This run is exactly the approved classification result: {EXPECTED_TOTAL} tests in '
          f'{EXPECTED_FILES} files, {EXPECTED_PASSED} passed, {", ".join(EXPECTED_FAILURES)} failing, '
          'and nothing failing that no test produced.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
