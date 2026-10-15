#!/usr/bin/env bash
# Step 2 of finishing milestone zero: the gate-2 classification run, and the pull request that
# puts its report on main. The run happens in a clean export of main, never in your working tree,
# so nothing you have locally can change the evidence. Nothing is pushed until you type the hash.
set -euo pipefail

REPO="${1:-/Users/jay/orca/projects/orca-software-factory}"
BRANCH=bootstrap-15-gate2-classification
TARGET=.factory/work/classification/gate-2.json
REPORT=.factory/work/reports/cli.json
DIR=$(cd "$(dirname "$0")" && pwd)
CHECK="$DIR/classification-check.py"

cd "$REPO"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
die() { echo "REFUSED: $*"; echo "Nothing was pushed."; exit 1; }

[ -f "$CHECK" ] || die "$CHECK is missing. It holds the one definition of the approved classification result, and this script will not judge a run without it."

git fetch --quiet --force origin 'refs/heads/main:refs/remotes/origin/main' \
  || die "cannot read main from origin: git fetch failed. Nothing here knows what is on the remote until it succeeds."
MAIN=$(git rev-parse refs/remotes/origin/main)
SHORT=$(git rev-parse --short "$MAIN")

if git cat-file -e "${MAIN}:${TARGET}" 2>/dev/null; then
  die "main already has $TARGET. Gate 2's classification is already on main; go to step 3."
fi
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  die "origin already has a branch named $BRANCH. Finish or delete that pull request first."
fi
WHO_NAME=$(git config user.name || true); WHO_MAIL=$(git config user.email || true)
if [ -z "$WHO_NAME" ] || [ -z "$WHO_MAIL" ]; then die "this repository has no git user.name or user.email."; fi
command -v npm >/dev/null 2>&1 || die "npm is not on the PATH."

RUNDIR="$HOME/pod-factory-gate2-run/$SHORT"
if [ -e "$RUNDIR" ]; then
  die "$RUNDIR already exists, from an earlier attempt. Delete it and run this again, so the run is from main's bytes alone."
fi
mkdir -p "$RUNDIR"
git archive "$MAIN" | tar -x -C "$RUNDIR"
echo "=== Step 2: the gate-2 classification run ==="
echo "main             $MAIN"
echo "clean export at  $RUNDIR   (kept, so you can inspect the run afterwards)"
echo
echo "--- npm ci ---"
( cd "$RUNDIR" && npm ci ) || die "npm ci failed in the export. The locked command list starts with it, so the classification cannot be recorded."
echo
echo "--- npm exec --workspace packages/cli -- vitest run --config vitest.config.ts ---"
set +e
( cd "$RUNDIR" && npm exec --workspace packages/cli -- vitest run --config vitest.config.ts ) 2>&1 | tail -25
TEST_STATUS=${PIPESTATUS[0]}
set -e
echo "(the locked test command exited $TEST_STATUS; a non-zero exit is expected while the T-19 tests fail)"
echo

[ -f "$RUNDIR/$REPORT" ] || die "the run produced no $REPORT, so there is nothing to classify."
cp "$RUNDIR/$REPORT" "$TMP/gate-2.json"

echo "--- the classification result, judged against the approved one ---"
set +e
python3 "$CHECK" "$TMP/gate-2.json"
CHECKED=$?
set -e
if [ "$CHECKED" -ne 0 ]; then
  echo
  echo "REFUSED: this run is not the classification that may be recorded. Nothing was pushed."
  echo "The run itself is kept at $RUNDIR if you want to look at it."
  exit 1
fi

HASH=$(python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read().replace(b'\r\n',b'\n')).hexdigest())" "$TMP/gate-2.json")
BYTES=$(wc -c < "$TMP/gate-2.json" | tr -d ' ')

echo
echo "=== What this pull request adds ==="
echo "one file       $TARGET   ($BYTES bytes, the run's own report, copied verbatim)"
echo "its sha256     $HASH"
echo "new branch     $BRANCH, from main at $SHORT"
echo "commits as     $WHO_NAME <$WHO_MAIL>"
echo "approved       the three failures above, which record 0005 will name"
echo
echo "Nothing has been written. The next prompt is the only thing that changes anything."
echo
printf 'Type the first eight characters of the sha256 above to open the pull request: '
read -r TYPED
if [ ${#TYPED} -lt 8 ]; then die "type at least the first eight characters, as the approve ceremony does."; fi
if [ "${HASH#"$TYPED"}" = "$HASH" ]; then die "'$TYPED' is not a prefix of $HASH."; fi

BLOB=$(git hash-object -w --path="$TARGET" "$TMP/gate-2.json")
GIT_INDEX_FILE="$TMP/index" git read-tree "$MAIN"
GIT_INDEX_FILE="$TMP/index" git update-index --add --cacheinfo "100644,$BLOB,$TARGET"
TREE=$(GIT_INDEX_FILE="$TMP/index" git write-tree)
rm -f "$TMP/index"

MSG="$TMP/msg"
cat > "$MSG" <<MSGEOF
Record the gate-2 classification run

The locked command list run against a clean export of main at $SHORT: its own
JSON report, copied verbatim to $TARGET. Bootstrap record
0005 binds this file's hash and names the failures it approves.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSGEOF
COMMIT=$(git commit-tree "$TREE" -p "$MAIN" -F "$MSG")

DIFF=$(git diff --name-status "$MAIN" "$COMMIT")
if [ "$(printf '%s\n' "$DIFF" | wc -l | tr -d ' ')" != "1" ]; then
  echo "REFUSED: the commit changes more than one file:"; printf '%s\n' "$DIFF"; exit 1
fi
case "$DIFF" in
  "A	$TARGET") echo "commit ${COMMIT%${COMMIT#???????}} adds exactly one file: $TARGET" ;;
  *) echo "REFUSED: the commit's one change is not the addition of $TARGET:"; printf '%s\n' "$DIFF"; exit 1 ;;
esac

git push origin "$COMMIT:refs/heads/$BRANCH"
URL=$(gh pr create --base main --head "$BRANCH" \
  --title "Record the gate-2 classification run" \
  --body "The locked command list — \`npm ci\`, then \`npm exec --workspace packages/cli -- vitest run --config vitest.config.ts\` — run against a clean export of main at \`$SHORT\`, with its own JSON report copied verbatim to \`$TARGET\`. One file is added.

The run's result is the classification: three failures, T-19-P1, T-19-N1 and T-19-N2, all of them \`status\`, which story one builds. Bootstrap record 0005 binds this file's hash and names those three as the approved failures.

Verify is red at this head for the same reason, as on every pull request until story one lands.

🤖 Generated with [Claude Code](https://claude.com/claude-code)")
PR="${URL##*/}"
echo
echo "Opened pull request $PR: $URL"
echo
echo "Next, in this order:"
echo "  1. pod-factory approve bootstrap $PR"
echo "  2. tell the design session; it verifies the record and merges."
echo "  3. then run 3-record-0005-and-gate-2.sh, which writes record 0005 against the file on main"
echo "     and runs approve 2 and lock back to back."
