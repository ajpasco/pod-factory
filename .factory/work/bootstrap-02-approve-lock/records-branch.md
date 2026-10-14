# Creating the records branch

For the approver, by hand, once: after slice 2 lands on main, and before slice 3 makes gate-check required (TECH-SPEC section 4, "Branch creation"). The CLI never creates the branch. Protection on the branch comes in slice 3.

Both steps were run as written against a scratch copy of this repository on 2026-10-13. `loadRecords` read all five bootstrap records with nothing flagged, a second run of step 1 refused, and the report hash in 0005 matched the check `approve 2` makes.

## Step 1: create the branch with records 0001 to 0004

Save this as `create-records-branch.sh` outside the repository and run `sh create-records-branch.sh` from the root of a full checkout. It stops on the first error and refuses if the branch already exists. Nothing is checked out or changed in your working tree: the blobs come straight from main's tree, so the bytes are exactly the committed ones.

```sh
set -eu
git fetch origin
if git ls-remote --exit-code --heads origin pod-factory/records >/dev/null; then
  echo "pod-factory/records already exists; stop"; exit 1
fi
export GIT_INDEX_FILE="$(mktemp -d)/index"
git read-tree --empty
git ls-tree origin/main .factory/records/ | grep -E '/000[1-4]-[^/]+\.json$' |
  while read -r mode type blob path; do
    git update-index --add --cacheinfo "100644,$blob,records/bootstrap/${path##*/}"
  done
tree=$(git write-tree)
unset GIT_INDEX_FILE
root=$(git commit-tree "$tree" -m "records branch created with bootstrap records 0001 to 0004")
git push origin "$root:refs/heads/pod-factory/records"
```

Check it:

```sh
git fetch origin pod-factory/records:refs/remotes/origin/pod-factory/records
git ls-tree -r --name-only origin/pod-factory/records      # exactly the four records/bootstrap/000[1-4] files
git diff --stat origin/main:.factory/records origin/pod-factory/records:records/bootstrap && echo identical
git rev-list --count origin/pod-factory/records            # 1
```

The copies under `.factory/records/` on main stay for now.

## Step 2: add record 0005 before `approve 2`

No command writes 0005 in milestone zero. Once the classification report of the single run at the approval commit is on main at `.factory/work/classification/gate-2.json`, add 0005 by hand. It binds the report's hash, states the count per class and names the command that produced the report; the report itself carries each test's outcome, so 0005 does not restate the tests. Check the command it names.

**Corrected on 2026-10-14.** The template's `command` first read `npm exec --workspace packages/cli -- vitest run --config vitest.config.ts --reporter=json --outputFile=.factory/work/classification/gate-2.json`. That is not the locked command. The JSON reporter moved into the locked `vitest.config.ts`, so the locked command alone writes `.factory/work/reports/cli.json`, and the approver copies that file to `gate-2.json`. The template below now names the locked command. The sequence to follow is in `.factory/work/bootstrap-10-revocation-fixes/handoff.md`.

```sh
git fetch origin
report_hash=$(git show origin/main:.factory/work/classification/gate-2.json | perl -pe 's/\r\n/\n/' | shasum -a 256 | cut -d' ' -f1)
dir=$(mktemp -d)
git worktree add --detach "$dir" origin/pod-factory/records
cat > "$dir/records/bootstrap/0005-classification-gate-2.json" <<JSON
{
  "schemaVersion": "bootstrap-0",
  "recordType": "classification",
  "gate": 2,
  "project": "pod-factory",
  "factoryVersion": "bootstrap (decision 23)",
  "hashAlgorithm": "sha256 over LF-normalized UTF-8",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "actor": {
    "name": "Allan Pasco",
    "email": "ajpasco@gmail.com",
    "kind": "human"
  },
  "command": "npm exec --workspace packages/cli -- vitest run --config vitest.config.ts",
  "binds": {
    ".factory/work/classification/gate-2.json": {
      "sha256": "$report_hash"
    }
  },
  "counts": {
    "RB": 0,
    "NB": 0
  },
  "outcome": "approved"
}
JSON
echo "edit the counts in $dir/records/bootstrap/0005-classification-gate-2.json"
```

Replace the two zero counts with the real ones from the report, then, in the same shell:

```sh
git -C "$dir" add records/bootstrap/0005-classification-gate-2.json
git -C "$dir" commit -q -m "bootstrap record 0005: gate-2 classification"
git -C "$dir" push origin HEAD:refs/heads/pod-factory/records
git worktree remove "$dir"
```

Then approve gate 2 from a terminal outside any agent session:

```sh
pod-factory approve 2 --classification 0005-classification-gate-2.json
```

`approve 2` refuses unless 0005 is on the records branch, validates, has record type `classification`, and binds the hash of the report on main at the tree being approved.
