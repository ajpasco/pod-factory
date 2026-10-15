#!/usr/bin/env bash
# Step 1 of finishing milestone zero: open the pull request that puts the revocation relay on main.
# Reads only until you type the confirmation. The commit is built with git plumbing, so your
# working tree and whatever branch you have checked out are never touched.
set -euo pipefail

REPO="${1:-/Users/jay/orca/projects/orca-software-factory}"
BRANCH=bootstrap-14-revoke-relay
STAGED=.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml
TARGET=.github/workflows/records-validate.yml

cd "$REPO"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
die() { echo "REFUSED: $*"; echo "Nothing was pushed."; exit 1; }

git fetch --quiet --force origin 'refs/heads/main:refs/remotes/origin/main' \
  || die "cannot read main from origin: git fetch failed. Nothing here knows what is on the remote until it succeeds."
MAIN=$(git rev-parse refs/remotes/origin/main)

git cat-file -e "${MAIN}:${STAGED}" 2>/dev/null || die "main has no staged relay workflow at $STAGED."
git cat-file -e "${MAIN}:${TARGET}" 2>/dev/null || die "main has no $TARGET to replace."
git show "${MAIN}:${STAGED}" > "$TMP/staged.yml"
git show "${MAIN}:${TARGET}" > "$TMP/current.yml"
cmp -s "$TMP/staged.yml" "$TMP/current.yml" && die "the staged workflow and $TARGET on main are already identical."
grep -q -- '--relay' "$TMP/staged.yml" || die "the staged workflow does not invoke the relay; it is not the file this step means to install."
grep -q '^\s*schedule:' "$TMP/staged.yml" || die "the staged workflow has no schedule, which doctor requires."

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  die "origin already has a branch named $BRANCH. Delete it or finish that pull request first."
fi
WHO_NAME=$(git config user.name || true); WHO_MAIL=$(git config user.email || true)
if [ -z "$WHO_NAME" ] || [ -z "$WHO_MAIL" ]; then die "this repository has no git user.name or user.email, so the commit would be authored by nobody."; fi

HASH=$(python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read().replace(b'\r\n',b'\n')).hexdigest())" "$TMP/staged.yml")

echo "=== Step 1: the revocation relay onto main ==="
echo "main is at     $MAIN"
echo "one file       $TARGET"
echo "replaced by    $STAGED, as it is on main"
echo "its sha256     $HASH"
echo "new branch     $BRANCH, from main"
echo "commits as     $WHO_NAME <$WHO_MAIL>"
echo
echo "--- $TARGET on main, then as this pull request leaves it ---"
diff -u "$TMP/current.yml" "$TMP/staged.yml" || true
echo "--- end of diff ---"
echo
echo "What it turns on: the scheduled records-validate job keeps validating every record, and now"
echo "also relays revocations. A revoked approval or verify result posts a failing gate-check on"
echo "every open pull request that relies on it, recorded on the records branch so \"revoke\" can"
echo "report the block as enforced. It needs contents: write, checks: write and pull-requests:"
echo "read, and a schedule runs only from the default branch, so it always runs main's code."
echo
echo "Nothing has been written. The next prompt is the only thing that changes anything."
echo

printf 'Type the first eight characters of the sha256 above to open the pull request: '
read -r TYPED
if [ ${#TYPED} -lt 8 ]; then die "type at least the first eight characters, as the approve ceremony does."; fi
if [ "${HASH#"$TYPED"}" = "$HASH" ]; then die "'$TYPED' is not a prefix of $HASH."; fi

BLOB=$(git hash-object -w --path="$TARGET" "$TMP/staged.yml")
GIT_INDEX_FILE="$TMP/index" git read-tree "$MAIN"
GIT_INDEX_FILE="$TMP/index" git update-index --add --cacheinfo "100644,$BLOB,$TARGET"
TREE=$(GIT_INDEX_FILE="$TMP/index" git write-tree)
rm -f "$TMP/index"

MSG="$TMP/msg"
cat > "$MSG" <<'MSGEOF'
Put the revocation relay on main

Replaces .github/workflows/records-validate.yml with the version staged in
.factory/work/bootstrap-05-revoke-relay/, which validates every record as before
and then relays revocations: a failing gate-check on every open pull request
whose approval or verify result was revoked, recorded on the records branch so
"revoke" can report the block as enforced.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSGEOF
COMMIT=$(git commit-tree "$TREE" -p "$MAIN" -F "$MSG")

DIFF=$(git diff --name-status "$MAIN" "$COMMIT")
if [ "$(printf '%s\n' "$DIFF" | wc -l | tr -d ' ')" != "1" ]; then
  echo "REFUSED: the commit changes more than one file:"; printf '%s\n' "$DIFF"; exit 1
fi
case "$DIFF" in
  "M	$TARGET") echo "commit ${COMMIT%${COMMIT#???????}} changes exactly one file: M $TARGET" ;;
  *) echo "REFUSED: the commit's one change is not a modification of $TARGET:"; printf '%s\n' "$DIFF"; exit 1 ;;
esac

git push origin "$COMMIT:refs/heads/$BRANCH"
URL=$(gh pr create --base main --head "$BRANCH" \
  --title "Put the revocation relay on main" \
  --body "Replaces \`.github/workflows/records-validate.yml\` with the version staged in \`.factory/work/bootstrap-05-revoke-relay/\`. The scheduled job validates every record as before and then relays revocations: a failing \`gate-check\` on every open pull request whose approval or verify result was revoked, recorded on the records branch so \`revoke\` can report the block as enforced. One file changes; the permissions it needs are \`contents: write\`, \`checks: write\` and \`pull-requests: read\`.

Verify is red at this head, as it is on every pull request until story one lands: main carries the three deliberately failing T-19 tests until \`status\` exists.

🤖 Generated with [Claude Code](https://claude.com/claude-code)")
PR="${URL##*/}"
echo
echo "Opened pull request $PR: $URL"
echo
echo "Next, in this order:"
echo "  1. pod-factory approve bootstrap $PR     (in this terminal, after the checks finish)"
echo "  2. tell the design session; it verifies the record and merges."
echo "Expect verify to be red. gate-check should name no other reason once the approval exists."
