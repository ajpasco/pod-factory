#!/usr/bin/env bash
# Step 3 of finishing milestone zero: write bootstrap record 0005, the gate-2 classification, and
# then run approve 2 and lock back to back. The record's numbers and approved failures are read
# out of the classification report on main, never typed, so the record cannot describe another run.
# Run this in a terminal, not through a pipe: approve and lock ask you to type a hash.
set -euo pipefail

REPO="${1:-/Users/jay/orca/projects/orca-software-factory}"
RECORDS_BRANCH=pod-factory/records
NAME=0005-classification-gate-2.json
TARGET=.factory/work/classification/gate-2.json
VALIDATOR=/Users/jay/.local/lib/node_modules/pod-factory/dist/index.js
DIR=$(cd "$(dirname "$0")" && pwd)
CHECK="$DIR/classification-check.py"

cd "$REPO"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# die() is for refusals before anything has been written, and says so.
die() { echo "REFUSED: $*"; echo "Nothing was written."; exit 1; }
# stop() is for a failure after something has been written. It never claims nothing happened:
# DONE and LEFT carry the truth, one line each, and the exit code is non-zero.
DONE=""
LEFT="publish record 0005
pod-factory approve 2 --classification $NAME
pod-factory lock"
stop() {
  echo
  echo "STOPPED: $*"
  echo
  echo "Completed:"
  if [ -n "$DONE" ]; then printf '%s\n' "$DONE" | sed 's/^/  - /'; else echo "  - nothing"; fi
  echo "Not completed:"
  if [ -n "$LEFT" ]; then printf '%s\n' "$LEFT" | sed 's/^/  - /'; else echo "  - nothing"; fi
  exit 1
}

[ -f "$CHECK" ] || die "$CHECK is missing. It holds the one definition of the approved classification result, and record 0005 is not written without it."

git fetch --quiet --force origin 'refs/heads/main:refs/remotes/origin/main' "refs/heads/${RECORDS_BRANCH}:refs/remotes/origin/${RECORDS_BRANCH}" \
  || die "cannot read main and $RECORDS_BRANCH from origin: git fetch failed. Nothing here knows what is on the remote until it succeeds."
MAIN=$(git rev-parse refs/remotes/origin/main)
RC=$(git rev-parse "refs/remotes/origin/${RECORDS_BRANCH}")

git cat-file -e "${MAIN}:${TARGET}" 2>/dev/null || die "main has no $TARGET yet. Run step 2 and merge its pull request first."
ON_RECORDS=$(git ls-tree -r --name-only "$RC" -- records/bootstrap)
case "$ON_RECORDS" in *"/0005-"*)
  echo "REFUSED: $RECORDS_BRANCH already holds a 0005 record:"; printf '%s\n' "$ON_RECORDS" | grep '/0005-'
  echo "Nothing was written."; exit 1;; esac
WHO_NAME=$(git config user.name || true); WHO_MAIL=$(git config user.email || true)
if [ -z "$WHO_NAME" ] || [ -z "$WHO_MAIL" ]; then die "this repository has no git user.name or user.email."; fi

# The record describes a run, so the run is judged before the record exists. The same definition
# step 2 used, applied again here to the bytes that are actually on main.
git show "${MAIN}:${TARGET}" > "$TMP/on-main.json"
echo "=== The classification report on main, judged against the approved result ==="
echo "file  $TARGET at main ${MAIN%${MAIN#???????}}"
set +e
python3 "$CHECK" "$TMP/on-main.json"
CHECKED=$?
set -e
if [ "$CHECKED" -ne 0 ]; then
  echo
  die "the report on main is not the approved classification result, so record 0005 cannot certify it."
fi
echo

MAIN="$MAIN" TARGET="$TARGET" NAME="$NAME" OUT="$TMP/$NAME" WHO_NAME="$WHO_NAME" WHO_MAIL="$WHO_MAIL" python3 - <<'PY'
import collections, datetime, hashlib, json, os, re, subprocess, sys

main, target, out = os.environ['MAIN'], os.environ['TARGET'], os.environ['OUT']
def die(msg):
    sys.exit('REFUSED: ' + msg + ' Nothing was written.')
def git(*a):
    r = subprocess.run(('git',) + a, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        die('git ' + ' '.join(a) + ' failed: ' + r.stderr.decode().strip())
    return r.stdout

raw = git('show', f'{main}:{target}')
report_hash = hashlib.sha256(raw.replace(b'\r\n', b'\n')).hexdigest()
tree = git('rev-parse', f'{main}^{{tree}}').decode().strip()
try:
    d = json.loads(raw)
except Exception as e:
    die(f'{target} on main is not readable JSON ({e}).')

total = passed = 0
failing = []
for t in d.get('testResults', []):
    for a in t.get('assertionResults', []):
        total += 1
        if a['status'] == 'passed':
            passed += 1
        else:
            name = a.get('fullName') or a.get('title') or ''
            m = re.search(r'T-\d+-[PN]\d+', name)
            failing.append({'id': m.group(0) if m else None, 'status': a['status'], 'test': name})
if total == 0:
    die(f'{target} records no tests at all, so it classifies nothing.')
if any(f['id'] is None for f in failing):
    die('a failing test in the report has no T-nn test ID, so the record cannot name it.')

record = collections.OrderedDict([
    ('schemaVersion', 'bootstrap-0'),
    ('recordType', 'classification'),
    ('gate', 2),
    ('project', 'pod-factory'),
    ('factoryVersion', 'bootstrap (decision 23)'),
    ('hashAlgorithm', 'sha256 over LF-normalized UTF-8'),
    ('createdAt', datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()),
    ('actor', collections.OrderedDict([
        ('name', os.environ['WHO_NAME']),
        ('email', os.environ['WHO_MAIL']),
        ('kind', 'human'),
        ('source', 'the approver ran the locked command list against a clean export of main at '
                   + main[:12] + ' in their own terminal, read the result, and wrote this record. '
                   'Direction of 2026-10-14: "Prepare the remaining human-action scripts and finish '
                   'milestone zero first." The script derived every number and every failing test ID '
                   'below from the report it binds; none was typed.'),
    ])),
    ('subject', f'The gate-2 classification: the locked command list run against main at {main[:12]}, '
                f'{total} tests, {passed} passed, {len(failing)} failed. The failures are approved as '
                'known and expected, each one a test of the status command, which milestone zero’s '
                'story one builds.'),
    ('binds', collections.OrderedDict([
        ('tree', tree),
        (target, {'sha256': report_hash}),
    ])),
    ('run', collections.OrderedDict([
        ('commit', main),
        ('commands', ['npm ci',
                      'npm exec --workspace packages/cli -- vitest run --config vitest.config.ts']),
        ('tests', total), ('passed', passed), ('failed', len(failing)),
    ])),
    ('approvedFailures', [collections.OrderedDict([('id', f['id']), ('test', f['test'])]) for f in failing]),
    ('scope', 'Only the failures listed in approvedFailures are approved, and only because the status '
              'command is deliberately not built in milestone zero: story one builds it and these tests '
              'are its acceptance tests. Any other failing test, or a different count, invalidates this '
              'classification; it needs a fresh run and a new record, not an amendment.'),
    ('bootstrapExceptions', [
        'prepared by a script the design session wrote; it is a record only once the approver runs it',
        'the run was the approver’s own, in a clean export of main, outside any agent session',
        'the records branch only: .factory/records/ holds 0001 to 0004 and 0006, and a locked test '
        'asserts that list, so this record is not added there',
    ]),
    ('outcome', 'approved'),
])
open(out, 'w', encoding='utf-8').write(json.dumps(record, indent=2, ensure_ascii=False) + '\n')

print('=== Bootstrap record 0005, the gate-2 classification ===')
print(f"File:       records/bootstrap/{os.environ['NAME']}   (records branch only)")
print(f"Binds:      {target}")
print(f"            sha256 {report_hash}")
print(f"            main's tree {tree}")
print(f"Run:        main {main[:12]}, {total} tests, {passed} passed, {len(failing)} failed")
for f in failing:
    print(f"  approved failure: {f['id']}  {f['test'][:96]}")
print(f"Created:    {record['createdAt']}")
print(f"Actor:      {record['actor']['name']} <{record['actor']['email']}>, kind human")
print()
print('Subject:    ' + record['subject'])
print()
print('Scope:      ' + record['scope'])
PY

if [ -f "$VALIDATOR" ]; then
  node --input-type=module -e "
import { validateBootstrapRecord } from '$VALIDATOR';
import { readFileSync } from 'node:fs';
const r = validateBootstrapRecord('records/bootstrap/$NAME', readFileSync('$TMP/$NAME'));
if (!r.ok) { console.error('REFUSED by validateBootstrapRecord: ' + r.reason); process.exit(1); }
console.log('Validator:  valid as records/bootstrap/$NAME');
" || die "the finished record does not pass the shipped validator."
else
  echo "Validator:  SKIPPED, $VALIDATOR not found"
fi

BLOB=$(git hash-object --path="records/bootstrap/$NAME" "$TMP/$NAME")
echo "Publishes:  $RECORDS_BRANCH  records/bootstrap/$NAME  (parent ${RC%${RC#???????}}, blob ${BLOB%${BLOB#????????????}})"
echo "Record:     $TMP/$NAME   (SHOW_FULL=1 prints it here)"
if [ "${SHOW_FULL:-}" = "1" ]; then echo "--- the record as it will be published ---"; cat "$TMP/$NAME"; echo "--- end ---"; fi
echo
echo "Nothing has been written. The next prompt is the only thing that changes anything."
echo
HASH=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['binds']['$TARGET']['sha256'])" "$TMP/$NAME")
printf 'Type the first eight characters of the bound report hash to publish record 0005: '
read -r TYPED
if [ ${#TYPED} -lt 8 ]; then die "type at least the first eight characters, as the approve ceremony does."; fi
if [ "${HASH#"$TYPED"}" = "$HASH" ]; then die "'$TYPED' is not a prefix of $HASH."; fi

WROTE=$(git hash-object -w --path="records/bootstrap/$NAME" "$TMP/$NAME")
if [ "$WROTE" != "$BLOB" ]; then echo "REFUSED: the record changed under us."; exit 1; fi
GIT_INDEX_FILE="$TMP/index" git read-tree "$RC"
GIT_INDEX_FILE="$TMP/index" git update-index --add --cacheinfo "100644,$WROTE,records/bootstrap/$NAME"
TREE=$(GIT_INDEX_FILE="$TMP/index" git write-tree)
rm -f "$TMP/index"
COMMIT=$(git commit-tree "$TREE" -p "$RC" -m "record: $NAME")
DIFF=$(git diff --name-status "$RC" "$COMMIT")
if [ "$(printf '%s\n' "$DIFF" | wc -l | tr -d ' ')" != "1" ] || [ "${DIFF%%	*}" != "A" ]; then
  echo "REFUSED: the commit changes more than the record:"; printf '%s\n' "$DIFF"; exit 1
fi
git push origin "$COMMIT:refs/heads/$RECORDS_BRANCH"
echo "Published record 0005 as ${COMMIT%${COMMIT#???????}} on $RECORDS_BRANCH."
DONE="record 0005 published as ${COMMIT%${COMMIT#???????}} on $RECORDS_BRANCH"
LEFT="pod-factory approve 2 --classification $NAME
pod-factory lock"
echo

echo "=== Gate 2 and the lock ==="
echo "These two run back to back on purpose: between the approval and the lock, the locked paths are"
echo "approved but not yet guarded. Each one shows you a hash and waits for you to type its prefix."
echo
printf 'Run "pod-factory approve 2 --classification %s" and then "pod-factory lock" now? [y/N] ' "$NAME"
read -r GO
case "$GO" in
  y|Y|yes|YES) ;;
  *) echo
     echo "Stopped at your word, after publishing the record."
     echo
     echo "Completed:"
     printf '%s\n' "$DONE" | sed 's/^/  - /'
     echo "Not completed, in this directory when you are ready:"
     printf '%s\n' "$LEFT" | sed 's/^/  - /'
     echo
     echo "Record 0005 stays valid while the report it binds is the one on main, so this script does"
     echo "not need to run again: the two commands above are all that is left."
     exit 0 ;;
esac
echo
if ! pod-factory approve 2 --classification "$NAME"; then
  stop "approve 2 did not complete, so gate 2 is not approved and nothing is locked. Record 0005 is published and stays valid; fix what approve 2 reported, then run the two commands above."
fi
DONE="$DONE
gate 2 approved by approve 2 --classification $NAME"
LEFT="pod-factory lock"
echo
if ! pod-factory lock; then
  stop "lock did not complete. Gate 2 is approved, so the locked paths are approved but not guarded: a change to one of them would pass lock-guard until lock runs. Run \"pod-factory lock\" before anything else merges."
fi
DONE="$DONE
locked paths guarded by lock"
LEFT=""
echo
echo "Completed:"
printf '%s\n' "$DONE" | sed 's/^/  - /'
echo
echo "Gate 2 is approved and the locked paths are guarded."
echo "Next: 4-approve-3.sh, then 5-protection.sh."
