# Spec verification, third pass, 2026-10-12

Artifact set, at commit `a8e8dc2` on branch `pull-stablyai-orca-repo`:

- `docs/adr/ADR-013-lock-guard-and-class-rules.md`
- `docs/TECH-SPEC.md`
- ADR-001 to ADR-012, with their notes
- `docs/spec/interfaces-and-non-goals.md`
- `docs/spec/threat-review-and-production-readiness.md`
- `docs/eval-plan.md`
- `docs/spec/criterion-to-control-mapping.md`
- `docs/spec-drafts/prd-amendment-0.9.2-proposal.md`
- `docs/HANDOFF-2026-10-12.md`

Governing document: `docs/PRD.md` 0.9.1, under records 0001 to 0003. Previous pass: `docs/reviews/spec-reverification-2026-10-12.md`, written at `ae723e5`. Not reviewed: `docs/spec/plain-language-summary.md`, which is being regenerated in parallel.

Reviewer: one fresh-context verification agent. It changed no existing file. Line numbers refer to `a8e8dc2`.

Standard: an item is closed only if every passage an earlier pass named now agrees with ADR-013 and ADR-012. Agreement in an ADR alone does not close it. Nor does the interfaces file's blanket sentence that "the ADR wins" (line 7).

**Result: not ready for the approver's gate-2 read.**

- **Part A.**
  - Of the 25 findings, 10 are closed and 15 are partly closed.
  - Of the 7 decision-integrity items, 3 are closed and 2 are partly closed. The other 2 are open with the approver, as intended.
  - Of the second pass's own Part B, the blocker and five majors are partly closed and the HANDOFF major is open. Of its 27 minor rows, 7 are closed, 12 are partly closed and 8 are open.
  - Commit `a8e8dc2` changed three lines of the threat review and none of the HANDOFF, so most passages named in those two files are unchanged.
- **Part B.**
  - ADR-013 closes the pull-request routes around the lock: lock-guard runs on every pull request, and class-check denies branches that match no class.
  - Six majors and four minors remain or are new:
    - The bootstrap class is unbounded, and its record is unchecked.
    - The first lock relies on a gate-2 tree binding that no document defines.
    - Direct pushes and per-class required checks sit outside the guard.
    - `release/*` cannot meet its own merge rule.
    - The builder mechanism is still described in more than one way, and its dispatch file has no home CI can read.
    - Amendment row 14, as drafted, would strip REQ-05's classification rules.
- **Part C.** Every scripted hash fact holds.

## Part A: the second pass, re-checked

Findings 1 to 25 are the first pass's Part B, as the second pass re-verdicted them. C1 to C7 are the decision-integrity items. B1 to B14 are the second pass's own Part B: one blocker (B1), six majors (B2 to B7) and seven minors (B8 to B14). Every minor's sub-bullets are separate rows.

| Item | Verdict | Where | Gap |
|---|---|---|---|
| 1. Blocker: work-only merges could carry locked paths | PARTIAL | ADR-013 items 1 to 3; ADR-010 item 2 (line 12) now names the lock guard; ADR-006 jobs 6 to 8; interfaces lines 219 to 221; T-06-P9, T-06-N8, T-06-P10, T-06-N9, T-06-N10 | Mapping C-06-6 (line 103), named in both earlier passes, still makes story-verify the only authority, and still says ADR-006 "does not list the lock comparison" (O30). C-20-4 (line 263) does the same. The routes the guard does not cover are Part B 2 and 3. |
| 2. Major: story-verify on every pull request; gate-check unscoped | CLOSED | ADR-006 jobs 2 and 3 (lines 14, 15); TECH-SPEC §4.5 (line 55); threat review 7.2 (line 54); ADR-013 items 2, 3 and 5 | None for the named passages. How class-specific checks become mandatory on the host is Part B 3. |
| 3. Major: classify on a work-only pull request | CLOSED | ADR-011 item 3 (line 14); ADR-012 item 3; interfaces classify row (line 223); T-05-P4 | None. |
| 4. Major: `ci work-only` undefined and untested | PARTIAL | ADR-006 job 8 (line 20); delivered in phase 0 (TECH-SPEC line 23, ADR-009 item 7); T-06-P9, T-06-N8 | Three tests are still missing: an unlocked path outside the class, a `rules/*` path, and application source before gate 1 (AB-01-1's CI half). Mapping C-01-6 (line 34) still names work-only as the authoritative layer, although work-only runs only on `work/*` and `rules/*`. |
| 5. Major: CODEOWNERS over `.factory/` blocked work-only merges | CLOSED | ADR-012 item 5; threat review lines 47 and 246 | None. |
| 6. Major: worktree per builder not carried through, and no tests | PARTIAL | ADR-011 item 1 (line 9); mapping cross-cutting finding 5 (line 19) and V3 (line 351) | Unchanged: TECH-SPEC phase 2, "REQ-07 (worktree per story)" (line 26), and §9's ADR-003 line, "parallel ... in their own worktrees" (line 81). The interfaces resolution for OPEN-8 is still "item 23" (line 369). Mapping list 1 (line 306) still calls C-13-1 bounded, against lines 308 and 417. No test checks that `story attach` writes the dispatch file. |
| 7. Major: start-verb mechanism, V18, scaffold, hooks 3 and 4 | PARTIAL | V18 in ADR-011's register (line 86), mapping list 3 (line 352) and TECH-SPEC §11a (line 103); ADR-011 item 1; ADR-013 item 6 | The interfaces non-goal still forbids a scaffold "beyond its six pieces" (line 294), though ADR-009 now lists seven. No phase names hooks 3 and 4; phase 0 lists hooks 1 and 2 only. The mechanism still fails open for C-13-1 (Part B 5). |
| 8. Major: ADR-011's CI additions missing from tables and tests | PARTIAL | TECH-SPEC §4.5 and §9 (lines 55, 84); T-06-P8 (line 140); ADR-006 jobs 1, 3 and 5 | Three interfaces rows are unchanged. release-gate still triggers on "a release request" (line 216), as do ADR-006 job 4 (line 16) and T-11-P1 (line 212). The doctor row (line 217) is not marked required. The records-validate row (line 213) lacks the precondition re-check. Still no test covers doctor as a required check, release-gate's two triggers or the precondition re-check. |
| 9. Major: push-triggered validation and "rejected push" | PARTIAL | ADR-004 lines 7 and 12; ADR-006 job 1 (line 13) | Threat review 8.1 rule 1 (line 201) still reads "CI rejects any change to an existing record". TECH-SPEC §4.3 (line 47) still says "CI validates every push". Interfaces line 25 says "CI rejects a human record type that a human did not write". |
| 10. Major: doctor's layer lists not the canonical seven | PARTIAL | ADR-006 job 5 (line 17); threat review 8.3 (line 246); T-19-N3 (line 309); mapping C-19-4's notes | The interfaces doctor row (line 217) is unchanged. C-19-4's mechanism column (line 252) still lists the old set. |
| 11. Major: stale untagged passages in the interfaces file | PARTIAL | revoke row (line 35); gate-2 row (line 47); line 7 no longer says "Still pending"; new command table (lines 83 to 93); threat review trust map (line 35) | Unchanged: the header (lines 3 and 5: ADR-010 only, "records 0001 and 0002", "ADR-001 to ADR-009"); the "Resolutions (ADR-010)" heading (line 358); amendment kinds without `profile` (line 120); the unnamed "credential entry" row (line 79); no row for `doctor --preflight`. Line 7's blanket precedence sentence leaves the contradictions in the text. |
| 12. Major: abuse cases without tests | PARTIAL | eval plan section 12 (lines 482 to 503) | Unchanged: T-07-N7 (line 483) does not assert AB-07-2's reopen count. AB-01-1's CI half has no test. AB-07-1 (threat review line 145) still names story-verify, while T-07-N8 tests gate-check. Threat review 7.6 (line 129) still locks every case at gate 2. |
| 13. Minor: `rules` approval undefined | PARTIAL | ADR-013 item 3 (`rules/*` row); ADR-006 job 3; interfaces line 39 | The `approve` arguments (line 29) and the approval record's `gate` field (line 113) still omit `rules`. The per-gate table (lines 43 to 50) has no `rules` row. The interfaces gate-check row (line 215) has no rules form. |
| 14. Minor: two bootstrap records named instead of three | PARTIAL (was CLOSED) | interfaces lines 37, 101 and 129; threat review line 209; T-20-P2, T-20-P3, T-03-P7 | The two passages the second pass flagged as also stale are unchanged: ADR-004's note (line 25) and mapping C-20-2 (line 261) still migrate record 0001 only. |
| 15. Minor: runbook file name; one tarball | PARTIAL | eval plan section 5 (lines 401, 403); threat review lines 281, 287 and 293 | No change since the second pass. "Tarballs" remains (lines 276, 304), as do "each npm tarball's" (line 124), "each tarball's" (line 291) and "the new versions" (lines 314, 315). |
| 16. Minor: lock set missed the shrinkwrap and checklists | CLOSED | threat review 7.5 (line 99); eval plan section 5 (lines 401, 404) | None. |
| 17. Minor: amendment scope and numbering | PARTIAL | proposal title (line 1) | The count is now wrong the other way (Part B 6). Row 14 no longer names REQ-06, so the rows change eleven requirements plus section 2. The title, line 3 ("the other twelve") and line 24, which still lists REQ-06, say twelve. Mapping list 1 (line 306) is unchanged. Eval plan section 9 is still numbered 1 to 9, 11, 12, 10 (lines 448 to 459). Section 10 (line 468) and section 11 (line 474) still say ten criteria. |
| 18. Minor: four stop points where the catalog has nine | CLOSED | proposal row 9; T-22-P3 | None. |
| 19. Minor: release build before the merge | CLOSED | ADR-013 item 3 (`release/*` row); ADR-011 item 6; threat review line 276; interfaces line 216 ("from the merged revision") | None for the build revision. The trigger wording belongs to row 8. |
| 20. Minor: validated and evidence refs unprotected | PARTIAL | ADR-006 job 5 (line 17); ADR-012 item 24 | Four places still name only the records branch: the interfaces doctor row (line 217), threat review 8.3 (line 246), the trust map (line 46) and the branch-rule table (lines 324 to 330). records-validate's allowed paths (line 213) still omit `.factory/evidence-manifests/`. |
| 21. Minor: hook 5 logs reads, logging table said it does not | CLOSED | threat review 8.2 (line 228) | None. |
| 22. Minor: T-08-P2 recorded done too early | CLOSED | T-08-P2 and T-08-N2 (lines 164, 165) | None. |
| 23. Minor: phase placement | CLOSED | ADR-009 item 7 (line 19); ADR-011 V14 (line 82); ADR-012 note (line 3); ADR-013 item 11 | None for the three named passages. The other phase-table defects are B9. |
| 24. Minor: pending list incomplete | CLOSED | TECH-SPEC §12 (line 127) | None. Line 127 does not mention the second pass or ADR-013 (Part B 9). |
| 25. Minor: twelve stale references | PARTIAL | none since the second pass | Unchanged: TECH-SPEC §1 has no approver list, although ADR-010 item 29a checks human records against one. ADR-002 and TECH-SPEC §3 (line 33) still lack `release/`. |
| C1. Decision 2: parallel inline builders | CLOSED | proposal row 13 (line 19) quotes `docs/PRD.md` §2 line 30 verbatim; ADR-003 note; ADR-012 D1 | None. |
| C2. Decisions 4 and 24: phase 1b before the Orca backend | OPEN, with the approver | ADR-012 D2; TECH-SPEC line 25; HANDOFF item 1 | Correctly escalated. There is still no drafted §3 row for either option, and still no note on ADR-009's basis line (line 7). |
| C3. REQ-05, REQ-06 and PRD §2: classification per phase | PARTIAL | proposal row 14 (line 20) now quotes §2 line 26 and REQ-05 line 64 verbatim; ADR-013 item 7; eval plan line 15 | §2's lock sentence, which the second pass asked to add, is not quoted. One replacement sentence serves both quoted passages and would drop REQ-05's classification rules (Part B 6). Threat review 7.6 (line 129) still locks every abuse case at gate 2. The gate-2 set still conflicts with section 12's tag rule (Part B 7). |
| C4. Decision 20: defaults only on founder-only projects | PARTIAL | ADR-010 note (line 3); ADR-012 D4 | Unchanged. PRD §2 line 26 ("one question per significant decision the PRD left open") is not reconciled. The authorization "on 2026-10-12" cites no record or quote. The defaults that add dependencies (ADR-010 item 37; ADR-011 items 24 and 25) are still not asked, against threat review line 100. |
| C5. Answer A2: work-only auto-merge widened | CLOSED | ADR-011 item 3 (line 14); ADR-010 item 2 (line 12); ADR-013 item 3 | None for the named passages. The interfaces row that still auto-merges `rules/*` is B2. |
| C6. Answer A6 cited by record 0003 | OPEN, with the approver | ADR-012 D6; TECH-SPEC §12; HANDOFF item 2 | Correctly escalated. Threat review lines 211 and 368 still plan a re-issue of record 0002 only. |
| C7. Decision 8: pre-commit never sees record writes | CLOSED | ADR-012 item 9 and D7 | None. |
| C, addendum: changes labelled "no change" | CLOSED | proposal line 3; ADR-012 section D | None. |
| B1. Blocker: `locked/*`, `release/*` and unclassified branches reach main with no lock comparison | PARTIAL | ADR-013 items 1 to 3; ADR-006 jobs 6 and 7; interfaces lines 219 and 220; `release-gate build` moved after the merge; T-06-N9, T-06-N10, T-05-N8 | The three named routes are closed for pull requests. Two parts of the fix are missing. There is no V-item for emulating per-class required checks on a host that attaches checks to the target branch. No job verifies each class's merge record, and none at all for `bootstrap/*`. See Part B 1 to 3. |
| B2. Major: `rules/*` merges with no approval | PARTIAL | ADR-013 item 3; ADR-006 job 3 and job 8 (auto-merge for `work/*` only); TECH-SPEC §4.5 | The interfaces work-only row (line 221) still auto-merges `work/*` and `rules/*` "on green". The gate-check row (line 215) still covers `story/*` only. ADR-006 job 8, TECH-SPEC §4.5 and line 221 run work-only on `rules/*`, which ADR-013's table does not. The enumerations in row 13 are still open. |
| B3. Major: no phase delivers work-only; the scaffold lacks it | PARTIAL | TECH-SPEC phase 0 (line 23); ADR-009 item 7; ADR-013 item 4 | No phase names artifact-check or classify. ADR-013 item 4 says the lock is guarded "from the moment gate 2 closes", but no pod-factory code exists at the gate-2 commit (eval plan line 34). The gap until CI runs the pinned scaffold is neither covered nor stated (Part B 2). |
| B4. Major: builder mechanism fails open; four descriptions | PARTIAL | ADR-013 item 6; ADR-011 item 1; interfaces lines 186 and 262; mapping lines 19, 351 and 352 | Hook 4 still recognizes a builder only after the builder's own `story attach`. ADR-013 answers this with `story wait` rejecting the completion, which does not stop the question prompt. ADR-010 item 23 (line 42), ADR-009's note (line 5) and mapping C-08-4 (line 126) still describe the old mechanism. Nothing says which branch the isolated worktree uses, or how it becomes `story/<REQ-ID>-<slug>`. No test covers a builder that never attaches (Part B 5). |
| B5. Major: amendment rows 13 and 14 quote the wrong text | PARTIAL | proposal rows 13 and 14 (lines 19, 20), checked verbatim against `docs/PRD.md` | Line 3 still says every row quotes section 4. §2's lock sentence is not quoted. New defects in row 14 and the counts are in Part B 6. |
| B6. Major: the gate-2 test set is undefined | PARTIAL | ADR-013 item 7; eval plan line 15 | No count is given, and no phase column was added. Section 12's tag rule (line 478) still contradicts the list. TECH-SPEC §10 (line 95) is not updated. See Part B 7. |
| B7. Major: summary and HANDOFF untrue | OPEN | none (`a8e8dc2` did not touch the HANDOFF) | Line 8: 223 tests and "ADR-001 to ADR-012". Line 10: "all are resolved ... except the two". Line 16: "eleven requirements". Line 23: "ten criteria". Line 24 drops milestone zero from the gate-2 precondition. Line 30: 17 assumptions. Line 36: "Twelve ADRs". Line 37: eighteen assumptions "until phase zero runs them". Lines 32 and 38 omit the second pass's open findings and ADR-013. The summary is not assessed here. |
| B8. Counts: tests | OPEN | eval plan line 506 and ADR-013 item 10 say 230 | TECH-SPEC §10 (line 95) still says 207 (98 positive, 109 negative). |
| B8. Counts: assumptions | PARTIAL | ADR-011 register (line 86); TECH-SPEC §11a; mapping line 352 | Unchanged: ADR-011 line 5 ("17 platform assumptions"), mapping line 413 ("17 capabilities") and line 419 ("V1 to V17"). |
| B8. Counts: jobs | CLOSED | TECH-SPEC §9 (line 84); T-06-P8 (line 140) | None for the named passages. The stale job list at mapping line 9 is new (Part B 9). |
| B8. Counts: human-only commands | PARTIAL | threat review line 35; interfaces lines 25 and 88 to 90 | Line 79's unnamed "credential entry" row remains beside `secret set`. `setup` (line 65) is "human only" and writes a waiver, but it is outside the thirteen (Part B 9). |
| B8. Counts: layers | PARTIAL | ADR-006 job 5; T-19-N3 | Interfaces doctor row (line 217) and C-19-4's mechanism column (line 252). |
| B8. Counts: record types | PARTIAL | ADR-013 item 9; interfaces line 118 | "Dispatch record" survives in four places: ADR-006's note (line 3), the interfaces gate-check row (line 215), mapping C-08-4 (line 126) and O31 (line 402). The bootstrap record and the `rules` gate value map to no type or field. |
| B8. Counts: amendment | PARTIAL | proposal title | ADR-012 item 21 (line 63) still says "eleven requirements". Proposal lines 3 and 24 now disagree with the rows (Part B 6). Eval plan section 9's numbering and "ten criteria" (lines 468, 474) are unchanged. |
| B8. Counts: ordering | OPEN | none | TECH-SPEC still runs 11, 11a, 11c, 11b (lines 97 to 109). ADR-012 item 22 (line 73) still follows item 27. |
| B9. ADR-009's scaffold omits `migrate` | CLOSED | ADR-009 item 7 (line 19) | None. |
| B9. ADR-011 V14 in phase 3 | CLOSED | ADR-011 line 82 | None. |
| B9. ADR-012 item 17 puts `migrate` in 1b | CLOSED | ADR-012 note (line 3); ADR-013 item 11 | None. |
| B9. Phase 2 delivers "REQ-07 (worktree per story)" | OPEN | none | TECH-SPEC line 26 is unchanged. |
| B9. Phase 0 lists no REQ-07 | OPEN | none | Phase 0 (line 23) now delivers `story start`, `story attach` and `story wait`, but still lists only REQ-03, REQ-06, REQ-19 and REQ-20. |
| B10. T-07-N7's code and reopen count | PARTIAL | T-07-N7 is now coded PR (T-07-P3) (line 483) | The reopen count is still not asserted. |
| B10. Pairs across requirements | CLOSED | T-07-N8 with T-07-P5, T-09-N12 with T-09-P9, T-16-N3 with T-16-P5, T-19-N6 with T-19-P5 (lines 484 to 493) | None. The pairing of T-06-N10 and the premise of T-16-P5 are new problems (Part B 8). |
| B10. T-09-N12 cannot classify | PARTIAL | re-paired with T-09-P9 (line 487) | The problem has moved. T-09-P9 tests the record-writing job that milestone zero already needs, so at its own phase-1b classification the NB positive passes and blocks approval (Part B 7). |
| B10. T-08-N2 tests "done" | CLOSED | T-08-N2 (line 165) | None. |
| B11. Interfaces: open wording | PARTIAL | line 7; revoke row (line 35) | The resolution for OPEN-8 is still "item 23" (line 369). The table header still says "Proposed name" (line 71). |
| B11. Mapping: open wording | PARTIAL | C-05-5, C-05-6, C-05-8 and C-05-9 (lines 86 to 90); V3 (line 351) | The count line (line 412) still has "4 with no CI job yet". List 1 (line 306) is unchanged. |
| B11. Eval plan section 6: model credential | OPEN | none | Line 423 still says "open for the threat review", although section 11 (line 472) resolves it by ADR-010 item 39. |
| B11. TECH-SPEC §4.6 and threat-review header | OPEN | none | TECH-SPEC line 59 and threat review line 3 still credit only ADR-010. Threat review lines 5 and 6 still read "amendment 0002" and "Consistent with ADR-001 to ADR-009". |
| B12. Citation decisions | PARTIAL | interfaces line 118 (`kind`, and `category` for delegated decisions only); ADR-013 item 9; T-17-N4 (line 278) | T-17-N3 (line 277) still folds the citation's positive assertion into a negative test. |
| B12. Alternatives rejected | OPEN | none | ADR-010 (line 3) and ADR-011 (line 3) still cover every default with one generic sentence. |
| B12. Dispatch record | PARTIAL | ADR-013 item 9: a work-zone file, not a record type | A work-zone file sits under `.factory/work/`, which a story branch may never carry. Yet gate-check reads "the story branch's dispatch file" (Part B 5). |
| B12. D2's options | OPEN, with the approver | ADR-012 D2 | No §3 row is drafted for either option. |
| B13. Gate-2 row and T-06-P3 omit hashes and the second runbook | CLOSED | interfaces line 47; T-06-P3 (line 131); ADR-013 item 8 | None for the named defect. Neither binds a tree, which Part B 2 needs. |
| B14. First tests and skeleton fit no class | PARTIAL | ADR-013 items 1 and 3 (the gate-2 record for the first lock; `bootstrap/*`) | `locked/*` admits only locked paths. The skeleton is unlocked (ADR-010 item 29c; eval plan rule 4), so for adopters it still fits no class once `bootstrap/*` retires at 0.1. The gate-2 "tree" binding is undefined (Part B 2). |

## Part B: what is new or still wrong

1. **Major: the bootstrap class is not bounded.**
   - Where: ADR-013 item 3 (`bootstrap/*` row) and item 2; the interfaces job table (lines 213 to 223) and the approval `gate` field (line 113); TECH-SPEC phase 1b exit (line 25); ADR-009 line 21.
   - Problem:
     - **Time.** The class has two end points. "Phase 0 only" and "retired at release 0.1" disagree, because 0.1 ships at the end of phase 1b. Nothing a job can read marks the end of phase 0, so in practice the class stays open through milestone zero and phase 1b. ADR-009 says those are "built through the loop".
     - **Authority.** The merge needs "a bootstrap record bound to the tree, written by the approver", but that record is no record type, gate value or command. The approval `gate` field allows only 1 to 5 or `discovery`. No job checks the record either: the class's only checks are lock-guard and class-check, and class-check tests only branch names and paths. So any `bootstrap/*` branch that changes no locked path can merge with no human record. That includes a merge by an agent using the approver's ambient credentials.
     - **Scope.** Nothing says whether the class ships in the adopters' template.
   - Fix:
     - Define the record: an approval with gate `bootstrap`, written by `approve bootstrap <pull request>` and binding the tree.
     - Name the job that requires it: class-check, or a bootstrap form of gate-check.
     - Give the class one end point a job can read: the pinned version reaching 0.1.
     - State that adopters' templates omit the class.
     - Add a test pair.

2. **Major: the first lock rests on a binding no document defines, and pod-factory's own lock has an unstated gap.**
   - Where: ADR-013 items 1, 3, 4 and 8; the interfaces gate-2 row (line 47) and `lock` row (line 56); T-06-P3; ADR-010 items 14 and 29c; eval plan rules 4 and 5 (lines 33, 34).
   - Problem:
     - **No tree binding.** Lock-guard admits the first lock on "the gate-2 approval record bound to the tree". But the gate-2 record binds documents only (item 8, line 47, T-06-P3): no tree, no test code and no classification summary. Before any lock record exists, there are also no locked paths to compare. As written, the first `locked/*` pull request either passes with any test content, with nothing tying the merged tests to the classified ones, or never passes.
     - **Order.** ADR-010 item 14 writes the lock "right after `approve 2`". Nothing says whether the first `locked/*` pull request merges before or after that record. If after, lock-guard asks for an amendment, which cannot exist for the initial lock.
     - **Skeleton.** Item 1 says the skeleton lands this way. But `locked/*` admits only locked paths and the skeleton is unlocked, so class-check fails it. Once `bootstrap/*` retires, adopters have no other class for it.
     - **Gap.** Item 4 says pod-factory's own lock is guarded "from the moment gate 2 closes". But no pod-factory code exists at the gate-2 commit (rule 5), and the scaffold that carries lock-guard is built afterwards, in phase 0. Until CI runs the pinned scaffold, the lock depends on the approver merging by hand. No document says so.
   - Fix:
     - Bind `tree` and the classification summary in the gate-2 record (item 8, line 47, T-06-P3).
     - Fix the order: `approve 2`, then `lock` taken from the first `locked/*` head, then the merge. Lock-guard then compares locked paths with the lock record.
     - Let that first pull request carry the skeleton.
     - Replace item 4's sentence with the manual rule for the gap.
     - Add a test of the first lock.

3. **Major: two routes to main sit outside the pull-request checks.**
   - Where: ADR-013 items 1 and 2; ADR-006 job 5; threat review 7.2 (line 47), 7.4 (line 84) and 8.3 (line 246); T-19-N3; ADR-011 V8 and V10.
   - Problem:
     - **Direct push.** Lock-guard and class-check judge pull requests only. No document requires main's protection to bind administrators, or to have an empty bypass list. Agents hold the approver's ambient git credentials (line 84). V10's single-maintainer case also pushes owners toward keeping admin bypass. If bypass is on, a drifting agent's `git push origin main` skips both checks. Doctor's "protection on main" layer and T-19-N3 do not test for this.
     - **Per-class checks.** GitHub attaches required checks to the target branch. So "required checks configured per pull-request class" (ADR-006 job 5, line 246, T-19-N3) is not a setting the host offers. Nothing says how story-verify and gate-check become mandatory for `story/*` without blocking `work/*`. One option is for each job to run on every pull request and pass outside its class. Another is for class-check to verify the class's merge record. The second pass asked for a V-item, and there is still none.
   - Fix:
     - Have doctor require pull-request-only merges with no bypass actors, with lock-guard and class-check as required checks, and add the negative test.
     - State the emulation, have doctor check it, and add a V-item for it alongside V10.

4. **Major: `release/*` cannot satisfy its own merge rule.**
   - Where: ADR-013 item 3 (`release/*` row) and item 5; ADR-006 job 3; the interfaces `approve` arguments (line 29), gate-4 row (line 49) and gate-check row (line 215); eval plan section 5 (line 401); threat review line 276.
   - Problem:
     - **Merge rule.** The class needs "gate-check in its story form" and a gate-4 record. The story form requires a passing story-verify for the tree and a dispatch file that matches the plan. But story-verify runs only on `story/*`, and a release has no dispatch file. `approve 4` takes a story ID and refuses without a passing story-verify. As specified, a release pull request can never merge.
     - **Lockfiles.** A version bump normally rewrites the version fields in `package-lock.json` and `npm-shrinkwrap.json`, both of which are locked. So lock-guard fails every release pull request unless each release carries an `amend`. The class's allowed paths, "versions and changelog", do not name the lockfiles. Nothing addresses either point.
     - **Other forms.** The amendment and rules forms of gate-check have no stated conditions in any job table.
   - Fix:
     - Define a release form of gate-check: a gate-4 approval for the release, bound to the tree, with no story-verify or dispatch condition. Give `approve 4` a release subject.
     - Either declare a rule for version-only lockfile changes, or state that each release carries an amendment. List the lockfiles in the class's allowed paths.
     - Write the amendment and rules forms into the gate-check row, and add tests.

5. **Major: the builder mechanism is still not described one way, and its fallback is untested.**
   - Where: ADR-013 items 6 and 9; ADR-010 item 23 (line 42) and its note (line 5); ADR-009 note (line 5); ADR-011 V3 (line 71); interfaces lines 186, 215, 261, 262 and 369; mapping C-07-5, C-08-4 and C-13-1 (lines 116, 126, 185); ADR-006's note and job 3; T-07-P5, T-07-N8, T-08-N5; TECH-SPEC line 39.
   - Problem:
     - **Agreement.** These agree with item 6: ADR-003, ADR-011 item 1, ADR-012 item 10 (through its note), the interfaces backend and hook-4 rows, mapping V3 and V18, eval plan section 2 and T-13-N4.
     - **Disagreement.** These do not:
       - ADR-010 item 23 still has "the start verb" writing the dispatch file. Its note withdraws only the sequential-mode gap, and item 6 does not list it among the passages to read as item 6.
       - ADR-009's note has the start verb creating the worktree.
       - Mapping C-08-4 has `story start` writing a "dispatch record".
       - C-13-1 cites ADR-010 item 23 and the superseded ADR-012 item 10, and claims hook 4 applies "in every mode", with no attach condition.
       - The interfaces resolution for OPEN-8 still points to item 23.
       - ADR-011 calls V3 "no longer required", while item 6 makes it the fallback.
     - **`story start` and hook 3.** Item 6 never says what `story start` now does. So it is unspecified who writes REQ-08's builder-context record (C-08-4, T-08-P4). It is also unspecified what hook 3 intercepts for an inline start, the shell or the subagent tool (line 261 still says "OPEN-8").
     - **Dispatch file.** Under item 9 it is a work-zone file, so it lives under `.factory/work/`. A story branch may never carry `.factory/` (story-verify; T-08-N5). Yet gate-check reads "the story branch's dispatch file" (ADR-006 job 3, ADR-011 item 4, line 215). So T-07-P5 and T-07-N8 contradict T-08-N5, and all three are in the gate-2 list.
     - **Fallback.** Item 6 claims a builder that skips `story attach` "gains nothing", but no test covers it. An unattached builder can still open the question prompt, against REQ-13 and threat review 7.3. Item 6 also does not say how the branch of Claude Code's isolated worktree becomes `story/<REQ-ID>-<slug>`, which class-check's default deny now requires.
   - Fix:
     - Make hook 4 deny the question tool in any isolated worktree. The dispatch file then only adds identity.
     - State what `story start` does and which event hook 3 intercepts.
     - Give the dispatch file a home CI can read, for example an input that `story attach` records on the records branch. Change the gate-check row, T-07-P5 and T-07-N8 to match.
     - Name the branch rule.
     - Align ADR-010 item 23, the ADR-009 note, C-08-4, C-13-1, OPEN-8 and V3.
     - Add tests for an unattached builder and for `story wait` rejecting its completion.

6. **Major: amendment row 14 would remove REQ-05's classification rules, and the requirement count is off again.**
   - Where: proposal title, line 3, rows 13 and 14 (lines 19, 20) and line 24; ADR-013 item 10.
   - Problem:
     - **Quotes.** Rows 13 and 14 now quote `docs/PRD.md` verbatim: §2 lines 26 and 30, and REQ-05 line 64.
     - **One replacement for two passages.** Row 14 gives one replacement sentence for two quoted passages. Applied to REQ-05's "Before approval each test is classified: ...", it would replace the clause that holds the classification rules. Those rules are that new-behavior tests fail for the expected reason, the pairing rule, the baselines, and "anything else blocks approval by name" (C-05-5 to C-05-10). In §2 the same sentence drops "to demonstrate missing behavior while preserving existing regression baselines".
     - **Count.** Row 14 no longer names REQ-06, so the rows change eleven requirements plus section 2. Four places still count twelve: the title, ADR-013 item 10, line 3's "the other twelve", and line 24, which still binds REQ-06 in record 0004.
     - **Header.** Line 3 still says every row quotes section 4.
   - Fix:
     - Give each passage its own replacement, and keep REQ-05's list ("Before the approval that locks them ... each test is classified: ...").
     - Keep §2's purpose clause.
     - Make the counts agree: eleven requirements plus section 2, "the other thirteen", and REQ-06 dropped from line 24. Alternatively, add a REQ-06 row if one is meant.
     - Correct line 3.

7. **Minor: the gate-2 test list exists, but its extent is ambiguous and it misses tests of phase-0 pieces.**
   - Where: eval plan line 15 and line 478; ADR-013 item 7; TECH-SPEC §10 (line 95).
   - Problem:
     - **Existence.** Every ID and range endpoint the list names exists.
     - **Ranges.** The ranges are read two ways.
       - T-03 follows table order, since T-03-P4 is listed separately.
       - T-06 needs numeric order. In table order, the work-only tests T-06-P9 and T-06-N8 fall out, because section 12 places them after T-06-N10.
       - So the set is 70 to 74 tests, and no count is given.
     - **Tag rule.** Section 12's rule ("tagged by the phase that delivers its requirement") still tags about 25 tests outside the list as phase 0 or M0. Examples are T-03-P3, T-07-P1 to T-07-N4, T-08-P4, T-08-P6, T-10-P4 to T-10-N6, T-13-P2 to T-13-N3 and T-19-P4.
     - **Missing tests.** The list omits T-19-P5 and T-19-N6, which test records-validate advancing the validated ref, a phase-0 piece. It also omits T-09-P9 and T-09-N12, which test the record-writing job that milestone zero needs. When those are classified later, their NB positives will already pass, and classification will block them by name. Nothing tests `story attach` or `story wait`.
     - **Later deliverables.** Several listed tests exercise later deliverables: T-19-P2 (`explain`), T-19-N4 (waivers) and T-06-P8 (the full template). That is harmless for classification but deserves one sentence.
     - **TECH-SPEC.** §10 still says 207 tests.
   - Fix:
     - Spell the IDs out, with a count.
     - Delete line 478 or align it with the list.
     - Add the four omitted tests, or recode them as RB, and add tests for `story attach` and `story wait`.
     - Update TECH-SPEC §10 to 230.

8. **Minor: the IDs are clean; four test defects remain.**
   - Where: eval plan lines 277, 483, 490, 491 and 494 to 496.
   - Problem:
     - **IDs.** There are 230 IDs: 10 in section 2, 193 in section 3, 4 in section 6 and 23 in section 12. That is 107 positive and 123 negative, with no duplicates and no skipped numbers. Every negative names an existing positive of its own requirement, with a consistent code. Section 10's breakdown of 207 is exact for sections 2, 3 and 6.
     - **Defects remaining:**
       - T-06-N10 (class-check) pairs with T-06-P10, which is a lock-guard positive. So class-check has no positive test, and no test covers a classified branch that leaves its allowed paths.
       - T-16-P5's "human editing ... in a human-owned session" is not a hook event. In a Claude Code session, hook 1 must deny that edit (ADR-010 item 26), so the PR+ positive cannot pass after implementation.
       - T-07-N7 still lacks the reopen count.
       - T-17-N3 still folds in the citation positive.
   - Fix:
     - Add a class-check positive and an out-of-path negative.
     - Rewrite T-16-P5 as a nearby agent edit that is allowed, for example to the project's own source.
     - Split T-17-N3.

9. **Minor: counts and references are not yet in step.**
   - Where: across the set.
   - Problem:
     - **Tests.** TECH-SPEC line 95 says 207, and HANDOFF line 8 says 223.
     - **Assumptions.** ADR-011 line 5, mapping lines 413 and 419, and HANDOFF line 30 say 17.
     - **Jobs.**
       - Mapping line 9 lists the job set from before ADR-011.
       - ADR-006's note says "dispatch record".
       - ADR-006 job 8, TECH-SPEC §4.5 and interfaces line 221 run work-only on `rules/*`, which ADR-013's table does not list.
     - **Commands.**
       - Thirteen holds in every list. But `setup` (interfaces line 65) is "human only" and writes a waiver, which is a human record type. It has neither the agent-session refusal nor hook 2's denial.
       - Line 79 still has an unnamed "credential entry" row.
     - **Record types.** Fourteen holds, but the approval `gate` field (line 113) has no `rules` value and no bootstrap value.
     - **Layers.** Interfaces line 217 and mapping line 252 (the mechanism column) are stale.
     - **Amendment.** See item 6. ADR-012 item 21 and HANDOFF line 16 also say "eleven".
     - **Headers and citations.**
       - Stale headers: interfaces lines 3 and 5, threat review lines 3, 5 and 6, and eval plan line 3 cite ADR-001 to ADR-009 or record 0002 only. Mapping line 3 stops at ADR-012. TECH-SPEC line 59 credits only ADR-010.
       - Citations of superseded ADR-012 items 1 and 10: TECH-SPEC line 39, interfaces lines 186, 214 and 262, and threat review line 47.
       - TECH-SPEC line 127 and the HANDOFF omit the second pass and ADR-013.
     - **Ordering.** Unchanged (B8).
   - Fix:
     - Make one mechanical pass over every passage listed above.
     - Decide `setup`: either route its waiver through `waive`, or make it the fourteenth human-only command.

10. **Minor: the phase table matches ADR-012 item 26 and ADR-013 item 11, but not the passages around it.**
    - Where: TECH-SPEC §2 (lines 23 to 26); ADR-013 item 3.
    - Problem:
      - **Matches.** The table agrees on all six points:
        - minimal `migrate` in phase 0 for the bootstrap migration;
        - `migrate` in 1b for upgrades;
        - `explain` in 1b;
        - the Orca entry in phase 2;
        - V14 in phase 2;
        - release 0.1 at the end of 1b.
      - **Still wrong.**
        - Phase 2 still delivers "REQ-07 (worktree per story)".
        - Phase 0 delivers `story start`, `story attach` and `story wait`, but lists no REQ-07 or REQ-08.
        - Hooks 3 and 4, artifact-check and classify appear in no phase.
        - "Phase 0 only" for `bootstrap/*` contradicts the table's bootstrap exception, which ends with 0.1 at the end of 1b.
    - Fix:
      - Edit the four cells.
      - Give the bootstrap class the 0.1 end point (item 1).

## Part C: scripted facts

Confirmed:

- `docs/PRD.md` hashes to `dbd72a26…`, which equals record 0002's "after" hash and record 0003's "unchanged" hash.
- All 24 per-requirement hashes equal record 0001's, with REQ-09 taken from record 0002. They match under both T-03-P5's line rule and ADR-011 item 30's block rule.
- `docs/PRD-reference.md` hashes to `e48520d5…`, record 0003's "after" hash.
- Commit `a8e8dc2` touched none of these files.

Ready for the approver's gate-2 read: no, because the new bootstrap class merges unchecked, the first lock rests on a gate-2 tree binding no document defines, `release/*` cannot merge, amendment row 14 would strip REQ-05's classification rules, and the handoff is unchanged and wrong.

Smallest set of edits that would make it yes: one new ADR covering Part B items 1 to 5 (the bootstrap record, its check and one end point; a tree-bound gate-2 record with a fixed lock order; no-bypass protection on main and the per-class check emulation with a V-item; gate-check's release, amendment and rules forms; a dispatch-file home CI can read and a fail-closed hook 4), plus a per-passage rewrite of amendment row 14 with consistent counts, a counted gate-2 test list that adds T-19-P5, T-19-N6, T-09-P9 and T-09-N12, a corrected HANDOFF, and one mechanical pass over the Part A rows still PARTIAL or OPEN.
