#!/usr/bin/env python3
"""The one definition of the gate-2 classification result, shared by scripts 2 and 3.

Usage: python3 classification-check.py <report.json>
Exit 0 only when the report is exactly the approved result. Exit 1 with reasons otherwise.

The numbers below are the approved baseline for milestone zero's classification: the locked
command list over main produces 167 tests, of which 164 pass, and the three that fail are the
status tests story one builds. They are not a convenience default. If a run legitimately produces
a different suite -- a test added, a test renamed, status built -- that is a new classification
for the design session to review and the approver to approve, and these constants change by that
deliberate act. Nothing here may be relaxed to make a run pass.
"""

import json
import re
import sys

EXPECTED_TOTAL = 167
EXPECTED_PASSED = 164
EXPECTED_FAILURES = ('T-19-P1', 'T-19-N1', 'T-19-N2')
TEST_ID = re.compile(r'T-\d+-[PN]\d+')


def read(path):
    with open(path, 'rb') as handle:
        return json.loads(handle.read())


def check(path):
    """Returns (lines to print, list of reasons). An empty reason list means it matches."""
    reasons = []
    try:
        report = read(path)
    except FileNotFoundError:
        return [], [f'there is no report at {path}']
    except Exception as error:
        return [], [f'{path} is not readable JSON ({error})']

    results = report.get('testResults')
    if not isinstance(results, list) or len(results) == 0:
        return [], [f'{path} has no testResults, so it reports no run at all']

    total = 0
    passed = []
    failed = []
    other = []
    for suite in results:
        for assertion in suite.get('assertionResults') or []:
            total += 1
            name = assertion.get('fullName') or assertion.get('title') or ''
            status = assertion.get('status')
            match = TEST_ID.search(name)
            entry = (match.group(0) if match else None, status, name)
            if status == 'passed':
                passed.append(entry)
            elif status == 'failed':
                failed.append(entry)
            else:
                other.append(entry)

    lines = [f'tests: total={total} passed={len(passed)} failed={len(failed)}'
             + (f' other={len(other)}' if other else '')]
    for test_id, status, name in failed + other:
        lines.append(f'  {status}: {test_id or "(no test ID)"}  {name[:96]}')

    if total != EXPECTED_TOTAL:
        reasons.append(f'the run has {total} tests where the approved classification has {EXPECTED_TOTAL}')
    if len(passed) != EXPECTED_PASSED:
        reasons.append(f'{len(passed)} tests passed where the approved classification has {EXPECTED_PASSED}')
    if len(failed) != len(EXPECTED_FAILURES):
        reasons.append(f'{len(failed)} tests failed where the approved classification has {len(EXPECTED_FAILURES)}')
    for test_id, status, name in other:
        reasons.append(f'{test_id or name[:60]} is {status}, which is neither passed nor failed; '
                       'a test that did not run cannot be classified')

    without_id = [name for test_id, _, name in failed if test_id is None]
    for name in without_id:
        reasons.append(f'a failing test has no T-nn test ID, so no record can name it: {name[:80]}')

    ids = [test_id for test_id, _, _ in failed if test_id is not None]
    duplicates = sorted({i for i in ids if ids.count(i) > 1})
    for test_id in duplicates:
        reasons.append(f'{test_id} appears as a failure more than once')
    unexpected = sorted(set(ids) - set(EXPECTED_FAILURES))
    for test_id in unexpected:
        reasons.append(f'{test_id} failed and is not one of the approved failures '
                       f'({", ".join(EXPECTED_FAILURES)})')
    absent = [test_id for test_id in EXPECTED_FAILURES if test_id not in ids]
    for test_id in absent:
        reasons.append(f'{test_id} is an approved failure and did not fail in this run')

    return lines, reasons


def main(argv):
    if len(argv) != 2:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
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
        print(f'The approved result is {EXPECTED_TOTAL} tests, {EXPECTED_PASSED} passed, and exactly '
              f'{", ".join(EXPECTED_FAILURES)} failing.')
        print('A classification record is the only written trace of which failures were approved, so it')
        print('is not written for a run that differs. If the difference is legitimate, the design session')
        print('reviews it and the constants in this file change deliberately; they are never relaxed to')
        print('make a run pass.')
        return 1
    print(f'This run is exactly the approved classification result: {EXPECTED_TOTAL} tests, '
          f'{EXPECTED_PASSED} passed, {", ".join(EXPECTED_FAILURES)} failing.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
