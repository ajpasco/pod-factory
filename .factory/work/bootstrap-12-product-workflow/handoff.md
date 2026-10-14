# bootstrap-12: the product workflow in the PRD and tech spec

Written by the design session on 2026-10-14, on the approver's direction of the same day and his five corrections to the first draft. The direction authorizes **preparation of the changes, not the creation of human approval records**, not merging the contract change, not automatic merging, and not deployment. The approver has accepted the direction and authorized these revisions; he has not approved the contract.

## What is in this branch

Documents only: `docs/PRD.md` to 0.10, `docs/TECH-SPEC.md` to 1.1, and a new `docs/adr/ADR-016-authorized-execution.md`. No source file, no test file, no workflow. **Both documents state in their headers that the revision governs nothing until amendment record 0006 exists**, worded so that the sentence is true both before and after the approval, which is what keeps the hash below final rather than needing a second edit the moment he approves.

ADR-016 carries the numbered list of the ten approval rules this changes, the six-part implementation plan, what the change costs and the alternatives rejected. Read it before the diff.

## The five corrections, and what each changed

1. **The unlocked test location already exists**, so nothing needs inventing and `LOCKED_PATTERNS` does not change. The locked runner configuration collects `test/**/*.test.ts` and `src/**/*.test.ts`; the lock covers `packages/*/test/**` and not the source tree; and `packages/*/vitest.config.ts` is itself locked, so a builder may add a test beside the code it tests inside its story's approved scope while no agent can widen the set the runner collects. Story one's brief already grants exactly this for `*.test.ts` under `src/status/`. The first draft's claim that milestone zero had no unlocked location was wrong and ADR-016 item 10 now says so.
2. **A small reference application**, not the status page, carries the criteria a CLI cannot exercise. One database-backed journey through an approved mockup, sign-in, a list and a detail view one role may edit and another may only read, each screen's loading, empty and error states, and the production checks the contract names; one journey, two roles, one table, nothing further. It is the second project PRD section 3 named, which resolves open question 2, and the phase-1b exit now states which project exercises which gate 1 to 4 criterion.
3. **Review evidence lives outside the tree it reviews.** The first draft had the reviewer commit its review into the pull request, which changes the tree and so invalidates the exact-tree binding by the act of recording it — the same circularity as the gate-2 classification report, which this project had already written down once. It now reuses the evidence path `verify` uses: a review bundle outside the checkout whose manifest names the pull request, head commit and head tree, uploaded as an artifact, read as data by a job that runs no application code and writes a check result carrying the review's digest. Any application change is a new tree and needs a fresh review.
4. **The whole lifecycle, not one branch.** ADR-016 now holds "The smallest complete implementation": six changes covering the authorization binding its contract, merge eligibility, the review record, story completion with no human approval, revocation reaching every dependent pull request, and post-merge verification of the combined application with progression that stops on failure. The first draft's "essentially one new gate-check branch" was true only of merge eligibility, and the ADR says so by name.
5. **The revision is marked as taking effect with record 0006**, in the PRD header, the tech spec header and ADR-016's status line.

## What the approver owes: bootstrap record 0006

`docs/PRD.md` is bound by record 0004, and three milestone-zero tests enforce that binding. The PRD cannot change without a new amendment record, and an amendment binds an `after` hash that exists only once the change is made, so the change comes first and the record second, as records 0002 and 0004 were written.

A complete draft with the hashes computed is at `record-0006-draft.json` in this folder. `createdAt` and `actor.source` are deliberately unfilled. Verified while preparing it, after the corrections:

- main's `docs/PRD.md` hashes to `69ec90c4`, exactly what record 0004 binds as its `after`.
- All twenty-five requirement hashes on main match record 0001 as amended by 0002 and 0004. The chain is intact; this amendment continues it.
- The corrected PRD hashes to `8446de84`.
- Ten requirements changed (REQ-04 to REQ-10, REQ-13, REQ-17, REQ-23), two are new (REQ-26, REQ-27, whose `before` is `null`), fifteen are untouched.

It is numbered **0006**, not 0005: `0005-classification-gate-2.json` is a fixture name in six test files, and renumbering the classification would cost more than the gap in sequence is worth. 0005 remains the gate-2 classification, written on the records branch only. 0006 goes in the working tree under `.factory/records/` and on the records branch under `records/bootstrap/`, as 0001 to 0004 are.

## What the builder owes: four assertions

These bind the PRD's content and must chain through 0006 instead of stopping at 0004. Mechanical; no test title, test ID or behavior changes, so `docs/eval-plan.md` section 13 and its count of sixty stay as they are, and the gate-2 classification returns to 167 tests, 164 passed, 3 failed.

1. `packages/cli/test/bootstrap-records.test.ts`, T-20-P2: the file-name list becomes `['0001', '0002', '0003', '0004', '0006']`.
2. Same file, T-03-P5: read 0006, assert today's PRD against **0006**'s `after`, lay 0006's `requirementsChanged` over 0002's and 0004's, and change `toHaveLength(25)` to `27`.
3. Same file, T-03-P7: extend the chain, `r0004.after` to `r0006.before` to today's PRD.
4. `packages/cli/test/hash.test.ts`, T-06-P6: read `0006-amendment-prd-0.10-...json` instead of 0004 and assert against its `after`.

Do this only after record 0006 exists; before that there is nothing to chain to. `approvedRequirements` already handles a new requirement whose `before` is `null`, so REQ-26 and REQ-27 need no special case. These files are under `packages/*/test/**`, a locked pattern, but **nothing is locked yet** — no lock record exists. After `lock` the same four edits would need an amendment approval, which is one more reason this lands before gate 2.

## Why this lands before the classification run

`approve 2` binds `docs/PRD.md` and `docs/TECH-SPEC.md` along with the tree. After that approval and `lock`, every further word in either document is a locked-path change needing an amendment. So this belongs with the relay workflow in the approver's sequence: **after PR #12, before the gate-2 classification run**, in either order relative to the relay.

## What is not in this branch, on purpose

Nothing that enables automatic merging. `gate-check` still requires a human approval record bound to the head tree, exactly as on main. Authorized execution is phase-1b work, described in tech spec section 5 and ADR-016 as a design, not as shipped behavior. Milestone zero's own rules are unchanged: three required checks, a human approval for every pull request, one builder at a time, and story one's merge is the approver's.

The later-phase parts of `docs/spec/*.md` and `docs/eval-plan.md` still describe per-story approval and the pull-request classes. They are subordinate reference under tech spec section 13 and are revised by phase 1b's own classification amendment. Rewriting them now would cost an amendment against the lock for text no phase has reached.
