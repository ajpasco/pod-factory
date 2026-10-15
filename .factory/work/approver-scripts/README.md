# The approver's scripts for the rest of milestone zero

Written by the design session on 2026-10-14, at the approver's direction: "Keep my involvement to
product decisions and the required approvals. Prepare the mechanics for me." They are the mechanics
for steps 2 to 6 of the approver's sequence in
`.factory/work/bootstrap-10-revocation-fixes/handoff.md`, which stays the authority for the order.

Run them in a terminal, one at a time, from anywhere:

```sh
bash .factory/work/approver-scripts/1-relay-workflow.sh
```

Each takes an optional first argument, the path to the repository, and defaults to
`/Users/jay/orca/projects/orca-software-factory`.

| Script | What it does | What it leaves for the approver |
|---|---|---|
| `1-relay-workflow.sh` | Opens the pull request that puts the revocation relay on main | `approve bootstrap <n>`, then the design session merges |
| `2-gate2-classification.sh` | Runs the locked command list against a clean export of main and opens the pull request that adds its report as the gate-2 classification | `approve bootstrap <n>`, then the design session merges |
| `3-record-0005-and-gate-2.sh` | Writes bootstrap record 0005 from the report on main, then runs `approve 2` and `lock` back to back | typing two hash prefixes |
| `4-approve-3.sh` | Checks what gate 3 depends on and runs `approve 3` | typing one hash prefix |
| `5-protection.sh` | Makes `lock-guard`, `verify` and `gate-check` the required checks, bound to the Actions app, and protects main and the records branch with administrators bound | typing `protect` |
| `classification-check.py` | Not run on its own: the one definition of the approved classification result, which scripts 2 and 3 both apply | nothing |

Every one of them holds to the same shape, which is the point of them:

- They read only until the single prompt that asks for a hash prefix or a word. Before that prompt
  nothing has been written, pushed or changed, and they say so.
- They work from `origin` refs and build their commits with git plumbing, so the approver's working
  tree and whatever branch is checked out are never touched.
- They refuse rather than improvise: on a record that already exists, a branch that already exists,
  a hash that does not match, a missing git identity, a test failure outside the approved set, or a
  commit that would carry more than the one file it is supposed to carry. Every refusal ends by
  saying that nothing was written.
- They derive, never assume. Record 0005's numbers and its approved failures are read out of the
  classification report it binds; step 5's app id is read from a live check run before anything is
  bound to it.
- **The classification result is enforced exactly, in one place, and the whole report is judged.**
  `classification-check.py` holds the approved result: 167 tests in 17 files, 164 passed, exactly
  T-19-P1, T-19-N1 and T-19-N2 failing, all three in `packages/cli/test/status.test.ts`, and the
  reporter's own counters — tests, suites, pending, todo, success — each at their approved value and
  each agreeing with a recount of the report's body. Script 2 applies it to the run it just made and
  pushes nothing if the run differs; script 3 applies it again to the bytes on main and writes no
  record if they differ. Refused by name: a different total or pass count, a fourth failure, an
  approved failure that passed, a skipped test, a failing test with no test ID, a file that failed
  while none of its tests did, a file that produced no test at all, a file carrying an error message
  no test produced, a failing file that is not the approved one, a header that contradicts the body,
  and an unreadable or empty report. Counting assertions alone was not enough: in the installed
  reporter's format a module that throws while being collected leaves the test counts untouched, so
  a report could carry the three approved failures and a runner error and still look right. The
  record is the only written trace of which failures were approved, so it is never written for a run
  that was not the approved one. If a run legitimately differs, that is a new classification for the
  design session to review and the constants change by that deliberate act; they are not relaxed to
  make a run pass.
- **They never claim nothing happened when something did.** A refusal before any write says
  "Nothing was written." A failure after a write reports `Completed:` and `Not completed:` line by
  line and exits non-zero — script 3 when `approve 2` or `lock` fails after record 0005 is
  published, script 5 when main is protected and the records branch is not. Step 5 does not swallow
  `doctor` either: a non-zero `doctor` is printed as a real gap and the script exits with its code.
- **A failed `git fetch` speaks.** Every fetch is forced and guarded, so a network failure or a
  rewritten remote ref produces a refusal rather than a silent exit. A sandbox rehearsal of script 3
  found that one: the script died with no output at all, which is exactly the kind of quiet failure
  these scripts exist to prevent.

They are an agent's work, so they are evidence of nothing by themselves. What they produce — the
records, the pull requests, the protection — is what counts, and each one prints what it produced.
