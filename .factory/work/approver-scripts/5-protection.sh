#!/usr/bin/env bash
# Step 5, the last before story one's pull request: make lock-guard, verify and gate-check the
# required checks on main, each bound to the GitHub Actions app, and protect the records branch.
# Read-only until you type the confirmation word.
#
# Read this before you run it: after this change, verify is a required check and main's verify is
# red, because the three T-19 tests fail until status exists. Administrators are bound, so nothing
# can merge into main until a head makes verify green. That head is story one. Everything else you
# want on main must already be there.
set -euo pipefail

REPO="${1:-/Users/jay/orca/projects/orca-software-factory}"
RECORDS_BRANCH=pod-factory/records
APP_ID=15368

cd "$REPO"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# die() is for refusals before anything has been changed, and says so.
die() { echo "REFUSED: $*"; echo "Nothing was changed."; exit 1; }
# stop() is for a failure after something has been changed. It never claims nothing happened.
DONE=""
LEFT="main's required checks and protection
the records branch's protection"
stop() {
  echo
  echo "STOPPED: $*"
  echo
  echo "Changed:"
  if [ -n "$DONE" ]; then printf '%s\n' "$DONE" | sed 's/^/  - /'; else echo "  - nothing"; fi
  echo "Not changed:"
  if [ -n "$LEFT" ]; then printf '%s\n' "$LEFT" | sed 's/^/  - /'; else echo "  - nothing"; fi
  echo
  echo "This script applies the same settings whether it has run before or not, so re-running it is safe."
  exit 1
}

SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner) || die "gh cannot read this repository."
git fetch --quiet --force origin 'refs/heads/main:refs/remotes/origin/main' "refs/heads/${RECORDS_BRANCH}:refs/remotes/origin/${RECORDS_BRANCH}" || die "cannot read main and $RECORDS_BRANCH from origin: git fetch failed, or the records branch does not exist yet. It must exist before it can be protected, and git's own message above says which it is."
MAIN=$(git rev-parse refs/remotes/origin/main)

# The app id is checked live, so protection can never be bound to a guessed id.
gh api "repos/${SLUG}/commits/${MAIN}/check-runs" > "$TMP/runs.json" 2>/dev/null || die "cannot read the check runs on main."
FOUND=$(python3 - "$TMP/runs.json" "$APP_ID" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
want = int(sys.argv[2])
rows = {(r.get('app') or {}).get('id'): ((r.get('app') or {}).get('slug'), r.get('name')) for r in d.get('check_runs', [])}
print('YES' if want in rows else 'NO')
for app_id, (slug, name) in rows.items():
    print(f'  app {app_id} ({slug}) posted "{name}"')
PY
)
printf '%s\n' "$FOUND" | tail -n +2
case "$FOUND" in
  YES*) ;;
  *) die "no check run on main was posted by app $APP_ID, so this script will not bind the required checks to it. Check the app id with \"gh api repos/${SLUG}/commits/${MAIN}/check-runs\" first.";;
esac

gh api "repos/${SLUG}/branches/main/protection" > "$TMP/main-now.json" || die "cannot read main's protection."
STRICT=$(python3 -c "import json,sys;print(str((json.load(open(sys.argv[1])).get('required_status_checks') or {}).get('strict', False)).lower())" "$TMP/main-now.json")

python3 - "$TMP/main-now.json" "$APP_ID" "$STRICT" "$TMP/main.json" "$TMP/records.json" <<'PY'
import json, sys
now = json.load(open(sys.argv[1]))
app = int(sys.argv[2]); strict = sys.argv[3] == 'true'
main_payload = {
    'required_status_checks': {
        'strict': strict,
        'checks': [{'context': c, 'app_id': app} for c in ('lock-guard', 'verify', 'gate-check')],
    },
    'enforce_admins': True,
    'required_pull_request_reviews': None,
    'restrictions': None,
    'allow_force_pushes': False,
    'allow_deletions': False,
    'required_linear_history': bool((now.get('required_linear_history') or {}).get('enabled', False)),
    'required_conversation_resolution': bool((now.get('required_conversation_resolution') or {}).get('enabled', False)),
    'block_creations': bool((now.get('block_creations') or {}).get('enabled', False)),
    'lock_branch': False,
    'allow_fork_syncing': bool((now.get('allow_fork_syncing') or {}).get('enabled', False)),
}
records_payload = {
    'required_status_checks': None,
    # Administrators are bound here as they are on main. Nobody, the approver included, can then
    # force-push or delete the record history. Ordinary fast-forward pushes are untouched, which is
    # all that verify-record's relay and a hand-written record ever need.
    'enforce_admins': True,
    'required_pull_request_reviews': None,
    'restrictions': None,
    'allow_force_pushes': False,
    'allow_deletions': False,
}
json.dump(main_payload, open(sys.argv[4], 'w'), indent=2)
json.dump(records_payload, open(sys.argv[5], 'w'), indent=2)

checks = (now.get('required_status_checks') or {}).get('checks') or []
print('=== Step 5: the required checks and the records branch ===')
print('main now requires:')
for c in checks:
    print(f"  {c['context']}  from app {c['app_id'] if c['app_id'] is not None else 'any (unbound)'}")
if not checks:
    print('  nothing')
print(f"  administrators bound: {(now.get('enforce_admins') or {}).get('enabled')}")
print(f"  force pushes: {(now.get('allow_force_pushes') or {}).get('enabled')}   deletion: {(now.get('allow_deletions') or {}).get('enabled')}")
print()
print('main will require:')
for c in main_payload['required_status_checks']['checks']:
    print(f"  {c['context']}  from app {c['app_id']} only")
print(f"  strict (branches up to date before merge): {strict}   — unchanged; that is your call")
print('  administrators bound: True;  force pushes: off;  deletion: off')
print('  bootstrap-check is dropped from the required list. Its workflow file stays, so it keeps')
print('  reporting; it is a placeholder that always passes and would prove nothing as a gate.')
PY

echo
echo "The records branch will be protected as: no force pushes, no deletion, no required checks and"
echo "no required reviews. The last two matter: a required check or review there would stop"
echo "verify-record pushing, and every pull request would then wait for a record that never arrives."
echo
echo "After this, verify is required and main's verify is red, so nothing merges into main until a"
echo "head makes it green. That head is story one. This is the designed condition, not a mistake."
echo
echo "Nothing has been changed. The next prompt is the only thing that changes anything."
echo
printf 'Type "protect" to apply both: '
read -r TYPED
[ "$TYPED" = "protect" ] || die "you typed \"$TYPED\"."

echo
echo "--- main ---"
if ! gh api -X PUT "repos/${SLUG}/branches/main/protection" --input "$TMP/main.json" > "$TMP/main-after.json"; then
  stop "GitHub refused the change to main. Read what is in force now with: gh api repos/${SLUG}/branches/main/protection"
fi
python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
for c in (d.get('required_status_checks') or {}).get('checks') or []: print(f\"  required: {c['context']} from app {c['app_id']}\")
print('  administrators bound:', (d.get('enforce_admins') or {}).get('enabled'))
" "$TMP/main-after.json"
DONE="main's required checks bound to app $APP_ID, administrators bound, no force pushes or deletion"
LEFT="the records branch's protection"

echo "--- $RECORDS_BRANCH ---"
if ! gh api -X PUT "repos/${SLUG}/branches/$(printf '%s' "$RECORDS_BRANCH" | sed 's|/|%2F|g')/protection" --input "$TMP/records.json" > "$TMP/records-after.json"; then
  stop "main is protected but GitHub refused the records branch, so the record history is not yet protected from a force push or a deletion."
fi
python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print('  administrators bound:', (d.get('enforce_admins') or {}).get('enabled'), ' force pushes:', (d.get('allow_force_pushes') or {}).get('enabled'), ' deletion:', (d.get('allow_deletions') or {}).get('enabled'))
print('  required checks:', d.get('required_status_checks'), ' required reviews:', d.get('required_pull_request_reviews'))
" "$TMP/records-after.json"
DONE="$DONE
the records branch protected: administrators bound, no force pushes, no deletion, no required checks or reviews"
LEFT=""

echo
echo "Changed:"
printf '%s\n' "$DONE" | sed 's/^/  - /'

echo
echo "--- pod-factory doctor ---"
set +e
pod-factory doctor
DOCTOR=$?
set -e
echo
if [ "$DOCTOR" -ne 0 ]; then
  echo "Both protections were applied, and doctor exits $DOCTOR: it reports at least one layer MISSING"
  echo "above. That is a real gap, not noise, and this script exits non-zero so it is not read as done."
  echo "Read the MISSING lines, fix what they name, and run doctor again. Milestone zero's enforcement"
  echo "is not complete until it reads every layer present."
  exit "$DOCTOR"
fi
echo "doctor reads every layer present. Milestone zero's enforcement is in place, and story one is"
echo "now the only pull request that can merge. Tell the design session; it dispatches the builder."
