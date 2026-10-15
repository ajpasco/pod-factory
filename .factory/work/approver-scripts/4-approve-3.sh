#!/usr/bin/env bash
# Step 4 of finishing milestone zero: gate 3, the build plan and its one story.
# Read-only until you say yes. It checks the state gate 3 depends on, shows you what approve 3
# will bind, and then runs the ceremony, which asks you to type a hash prefix itself.
set -euo pipefail

REPO="${1:-/Users/jay/orca/projects/orca-software-factory}"
RECORDS_BRANCH=pod-factory/records
PLAN=.factory/work/plan/build-plan.md
STORY=.factory/work/story-1/story.md

cd "$REPO"
die() { echo "REFUSED: $*"; echo "Nothing was written."; exit 1; }

git fetch --quiet --force origin 'refs/heads/main:refs/remotes/origin/main' "refs/heads/${RECORDS_BRANCH}:refs/remotes/origin/${RECORDS_BRANCH}" \
  || die "cannot read main and $RECORDS_BRANCH from origin: git fetch failed. Nothing here knows what is on the remote until it succeeds."
MAIN=$(git rev-parse refs/remotes/origin/main)
RC=$(git rev-parse "refs/remotes/origin/${RECORDS_BRANCH}")

for p in "$PLAN" "$STORY"; do
  git cat-file -e "${MAIN}:${p}" 2>/dev/null || die "main has no $p, which gate 3 binds."
done
NAMES=$(git ls-tree -r --name-only "$RC" -- records)
GATE2=$(printf '%s\n' "$NAMES" | grep -- '-approval-gate-2-' | tail -1 || true)
LOCK=$(printf '%s\n' "$NAMES" | grep -- '-lock-' | tail -1 || true)
[ -n "$GATE2" ] || die "there is no gate-2 approval on $RECORDS_BRANCH. Run step 3 first: gate 3 approves the plan for a contract that gate 2 has approved."
[ -n "$LOCK" ] || die "there is no lock record on $RECORDS_BRANCH. Gate 2 was approved but \"pod-factory lock\" did not run; run it before gate 3, because story start refuses while the story's tests are unlocked."

hash_of() { git show "${MAIN}:$1" | python3 -c "import hashlib,sys;print(hashlib.sha256(sys.stdin.buffer.read().replace(b'\r\n',b'\n')).hexdigest())"; }

echo "=== Step 4: gate 3, authorizing the build plan ==="
echo "main            $MAIN"
echo "gate 2          ${GATE2#records/}"
echo "lock            ${LOCK#records/}"
echo
echo "What approve 3 binds, as main has it now:"
echo "  $PLAN"
echo "    $(hash_of "$PLAN")"
echo "  $STORY"
echo "    $(hash_of "$STORY")"
echo
echo "The plan names one story, story-1: pod-factory status. Its tests are"
echo "packages/cli/test/status.test.ts (T-19-P1, T-19-N1, T-19-N2), which the lock covers and the"
echo "classification approved as the failures milestone zero expects. After this approval, story"
echo "start refuses if either file above changes on main, and the design session dispatches the"
echo "builder; it does not need you again until the story's own pull request."
echo
printf 'Run "pod-factory approve 3" now? [y/N] '
read -r GO
case "$GO" in
  y|Y|yes|YES) ;;
  *) echo "Stopped. Nothing was written. When you are ready: pod-factory approve 3"; exit 0 ;;
esac
echo
pod-factory approve 3 || die "approve 3 did not complete."
echo
echo "Gate 3 is approved. Next:"
echo "  - the design session runs \"pod-factory story start story-1 --holder <builder>\" (the plan"
echo "    makes that the orchestrator's act, not yours) and briefs the builder;"
echo "  - you run 5-protection.sh, which must be the last thing before story one's pull request opens."
