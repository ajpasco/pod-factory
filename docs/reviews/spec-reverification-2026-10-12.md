# Spec re-verification after the correction pass, 2026-10-12

Artifact set, at commit `ae723e5` on branch `pull-stablyai-orca-repo`:

- `docs/adr/ADR-012-verification-resolutions.md`
- `docs/TECH-SPEC.md`
- ADR-001 to ADR-011, with their amendment notes
- `docs/spec/interfaces-and-non-goals.md`
- `docs/spec/threat-review-and-production-readiness.md`
- `docs/eval-plan.md`
- `docs/spec/criterion-to-control-mapping.md`
- `docs/spec-drafts/prd-amendment-0.9.2-proposal.md`
- `docs/spec/plain-language-summary.md`
- `docs/HANDOFF-2026-10-12.md`

Governing document: `docs/PRD.md` 0.9.1, under records 0001 to 0003. Previous pass: `docs/reviews/spec-verification-2026-10-12.md`, written at `34006a0`.

Reviewer: one fresh-context verification agent. It changed no existing file. Line numbers refer to `ae723e5`.

Standard: a finding is closed only if every passage the previous pass named now agrees with ADR-012's canonical rule. Agreement in ADR-012 alone does not close it.

**Result: not ready for the approver's gate-2 read.**

- **Part A.**
  - Of the 25 findings, 7 are closed and 18 are only partly closed.
  - Of the 7 decision-integrity items, 1 is closed, 4 are partly closed, and 2 are open with the approver, which is what ADR-012 section D intends.
  - The pattern: ADR-012 states the right rule, but the named passages were edited in some files and not others.
- **Part B.**
  - The correction pass introduced 1 blocker, 6 majors and 7 minors.
  - The blocker brings back the previous blocker's failure mode. Under ADR-012's own pull-request classes, a `locked/*` branch, a `release/*` branch or a branch matching no class can still reach main with no lock comparison.
- **Part C.** Both scripted facts hold. The pairing fact has two caveats.

## Part A: the previous pass, re-checked

Findings 1 to 25 are the previous pass's Part B. C1 to C7 are its Part C.

| Finding | Verdict | Where | Gap |
|---|---|---|---|
| 1. Blocker: work-only merges could carry locked paths | PARTIAL | ADR-012 items 1 and 2; interfaces work-only row (line 207); eval plan §5 (line 404); T-06-P9, T-06-N8 | The `work/*` route is closed. ADR-010 item 2 (line 12), which the previous pass named, still auto-merges all of `docs/**` and has no note pointing to the locked-path exception. Mapping C-06-6 (line 103) still names story-verify as the only authority. The same failure mode returns through other classes and through pod-factory's own scaffold (Part B 1 and 3). |
| 2. Major: story-verify ran on every pull request; gate-check unscoped | PARTIAL | ADR-006 job 2 (line 14); TECH-SPEC §4.5 (line 55); interfaces story-verify and gate-check rows (lines 202 and 203); ADR-012 items 1 and 4 | ADR-006 job 3 (line 15) still reads "gate-check, required for merge". Threat review 7.2 (line 54) still says only pull requests that pass gate-check reach main. The per-class statement now exists but contradicts itself (Part B 1). |
| 3. Major: classify on a work-only pull request | PARTIAL | ADR-012 items 1 and 3; TECH-SPEC §4.5; interfaces classify row (line 209); T-05-P4 | ADR-011 item 3 (line 14), named by the previous pass, still runs classify "on the work-only pull request that adds a phase's tests". ADR-011's new note supersedes only its section C. |
| 4. Major: `ci work-only` undefined and untested | PARTIAL | ADR-012 item 2; interfaces line 207; TECH-SPEC §4.5; T-06-P9, T-06-N8 | Not added to ADR-006's job list. Tests cover only a passing allowed path and a failing locked path. No test for an unlocked path outside the class, for application source before gate 1 (the CI half of AB-01-1, and C-01-6's authoritative layer), or for a `rules/*` path. No phase delivers the job (Part B 3). |
| 5. Major: CODEOWNERS over `.factory/` blocked work-only merges | CLOSED | ADR-012 item 5; threat review 7.2 (line 47) and 8.3 (line 246) | None. |
| 6. Major: worktree-per-builder not carried through, and no tests | PARTIAL | TECH-SPEC §4.1 (line 39); interfaces backend row (line 174) and hook 4 (line 248); ADR-010 consequences (line 73); mapping C-13-1 (line 185); T-13-N4 | Still stale: TECH-SPEC phase 2 "REQ-07 (worktree per story)" (line 26) and §9's ADR-003 line (line 81). The interfaces OPEN-8 resolution (line 355) still points to ADR-010 item 23, which ADR-011 withdrew. Mapping cross-cutting finding 5 (line 19), list 1 (line 306, which now contradicts line 308) and V3 (line 351) are unchanged. No test checks that `story start` or `story attach` creates the worktree and the dispatch file. |
| 7. Major: start-verb mechanism, hook-input check, scaffold, hooks 3 and 4 | PARTIAL | ADR-012 items 10 and 11; ADR-009 note (line 3); TECH-SPEC phase 0 (line 23) | V18 exists only in ADR-012. ADR-011's register (lines 67 to 85), mapping list 3 and TECH-SPEC §11a still stop at seventeen. ADR-011 item 1 (line 9) still describes the old mechanism. The interfaces non-goal (line 280) still forbids a scaffold "beyond its six pieces". When hooks 3 and 4 arrive is still unstated, although T-13-N4 now makes hook 4 a milestone-zero test. The new mechanism fails open (Part B 4). |
| 8. Major: ADR-011's CI additions missing from tables and tests | PARTIAL | TECH-SPEC §4.5; interfaces gate-check, artifact-check and classify rows (lines 203, 208, 209); T-03-P6, T-03-N7, T-05-P4, T-07-N8 | Interfaces release-gate (line 204) still triggers on "a release request", with no build and verify triggers. The doctor row (line 205) is not marked required, and records-validate (line 201) lacks the precondition re-check. TECH-SPEC §9 (line 84) and T-06-P8 (line 138) still say five jobs. No CI-job test covers gate-check's explicit lock comparison, doctor as a required check, release-gate's two triggers, or records-validate's precondition re-check. |
| 9. Major: push-triggered validation and "rejected push" | PARTIAL | ADR-004 line 7; ADR-006 job 1 (line 13, inline supersession); interfaces records-validate row and validation paragraph (lines 201, 213); T-20-N1 (line 317) | ADR-004 line 12 still reads "CI rejects a push that violates the writer rule", and threat review 8.1 rule 1 (line 201) reads "CI rejects any change to an existing record". Both break ADR-012 item 6's own sentence, "No file may describe a rejected push". Neither ADR-004 nor ADR-006 got the requested amendment note. TECH-SPEC §4.3 (line 47) still says "CI validates every push". |
| 10. Major: doctor's layer lists not the canonical seven | PARTIAL | threat review 8.3 (line 246); TECH-SPEC phase-0 exit (line 23) | Unchanged: ADR-006 doctor (line 17), the interfaces doctor row (line 205) and mapping C-19-4 (line 252). T-19-N3 (line 307) still iterates six layers and leaves out required checks. |
| 11. Major: stale untagged passages in the interfaces file | PARTIAL | interfaces lines 25 (thirteen commands), 69, 73 and 110 (`story set-status`), 90 (fourteen types) | Still stale in the interfaces file: the header (lines 3 and 5: ADR-010 only, "records 0001 and 0002", "ADR-001 to ADR-009"); the "Resolutions (ADR-010)" heading (line 344); the `revoke` row (line 35), which still makes reverting a story `revoke`; amendment kinds (line 108) without `profile`; the gate-2 row (line 47) without the PRD and mapping hashes; no table rows for `revert`, `incident`, `secret set` (line 79 still says "credential entry"), `story start`, `wait`, `fix`, `ask` and `attach`, `artifact submit`, `mockup serve` or `doctor --preflight`. The threat review trust map (line 35) still lists nine approval-path commands. |
| 12. Major: abuse cases without tests | PARTIAL | eval plan §12: T-09-N11, T-09-N12, T-12-N3, T-16-N3, T-19-N6, T-20-N5, T-07-N7, T-07-N8 | Six of the seven named cases are covered. AB-07-2's reopen count, the part named before, is still not asserted: T-07-N7 checks only the refusal and the reopening. AB-01-1's CI half has no test. AB-07-1's CI half names story-verify, but T-07-N8 tests gate-check's backstop instead. Threat review 7.6 (line 129) still says every case is locked at gate 2. |
| 13. Minor: `rules` approval undefined | PARTIAL | ADR-012 item 23; interfaces line 39 | ADR-012's own table (item 1) still says "approval record of kind `rules`" and lists only work-only. The `approve` arguments (interfaces line 29) and the approval record's `gate` field (line 101) still omit `rules`, and the per-gate table has no `rules` row. No job table runs gate-check on `rules/*` (Part B 2). |
| 14. Minor: two bootstrap records named instead of three | CLOSED | interfaces lines 37, 89, 117; threat review 8.1 (line 209); eval plan rule 5 (line 32), T-20-P2, T-20-P3; new baseline T-03-P7 | Re-issuing record 0003 is the approver's call (C6). Not named before but also stale: ADR-004's note (line 25) and mapping C-20-2 (line 261) mention record 0001 only. |
| 15. Minor: runbook file name; one tarball | PARTIAL | eval plan §5 (lines 401, 404); threat review lines 281, 283, 287, 293 | ADR-012 item 16 now keeps two runbook files, and the eval plan follows it. The threat review still says "tarballs" (lines 276, 304), "each tarball's" (line 291), "each npm tarball's" (line 124) and "the new versions" (lines 314 and 315). |
| 16. Minor: lock set missed the shrinkwrap and checklists | PARTIAL | eval plan §5 (lines 399, 402) | Threat review 7.5 (line 99), named before, still says "One committed `package-lock.json`". |
| 17. Minor: amendment scope and numbering | PARTIAL | proposal rows 1 to 14 now in order; eval plan §9 items 11 and 12; mapping line 308; HANDOFF line 23 puts C-04-6 and C-13-2 on the read list | The new title is miscounted: the rows touch twelve requirements plus section 2, not eleven. Line 3's "the other fourteen" should be twelve. Mapping list 1 (line 306) still calls C-13-1 bounded. Eval plan §9 is numbered 1 to 9, 11, 12, 10, and §10 (line 466) and §11 (line 472) still say ten criteria. |
| 18. Minor: four stop points where the catalog has nine | CLOSED | proposal row 9; T-22-P3 | None. |
| 19. Minor: release build before the merge | CLOSED | ADR-011 item 6; ADR-012 item 25; threat review 8.4 (line 276); interfaces release-gate row ("from the merged revision") | ADR-012's own item 1 still lists `release-gate build` as the check on `release/*` pull requests (Part B 1). |
| 20. Minor: validated and evidence refs unprotected | PARTIAL | ADR-012 item 24 only | No doctor list (ADR-006 line 17, interfaces line 205, threat review 8.3), no trust-map row (7.2) and no branch-rule row (8.4, lines 324 to 330) names `pod-factory/records-validated` or `pod-factory/evidence`. records-validate's allowed paths (interfaces line 201) omit `.factory/evidence-manifests/`, so as written it would flag every manifest commit. |
| 21. Minor: hook 5 logs reads, logging table says it does not | CLOSED | threat review 8.2 (line 228) | None. |
| 22. Minor: T-08-P2 recorded done too early | CLOSED | T-08-P2 (line 162) | Its paired negative, T-08-N2 (line 163), still tests "marked done" (Part B 10). |
| 23. Minor: phase placement | PARTIAL | TECH-SPEC §2, phases 0, 1b and 2 | ADR-009's scaffold list (lines 13 to 18 and the note) omits the minimal `migrate`. ADR-011 V14 (line 82) still verifies the Orca label in phase 3, after phase 2 now ships it. ADR-012 item 17 still puts `migrate` in phase 1b (Part B 9). |
| 24. Minor: pending list incomplete | CLOSED | TECH-SPEC §12 (line 126) | None. |
| 25. Minor: twelve stale references | PARTIAL | Ten fixed: TECH-SPEC line 3; threat review line 265; eval plan line 9; mapping lines 3, 18, 69, 70 and 98; ADR-011 lines 5, 9 and 61; ADR-010 item order | TECH-SPEC §1 still has no approver list, although ADR-010 item 29a checks human records against one. ADR-002 and TECH-SPEC §3 (line 33) still lack `release/`. |
| C1. Decision 2: parallel inline builders | PARTIAL | ADR-003 note (line 3); ADR-012 D1; proposal row 13 | The change is now stated. But row 13 quotes `docs/PRD-reference.md` line 30, not the governing PRD.md §2 line 30, which reads "without Orca, they run one at a time in a single session". Applied as written, the row changes nothing in the governing text (Part B 5). |
| C2. Decisions 4 and 24: phase 1b before the Orca backend | OPEN, with the approver | ADR-012 D2; TECH-SPEC phase 1b (line 25); HANDOFF item 1 | Correctly escalated. Both options need a PRD §3 amendment, and neither has a drafted row (Part B 12). Keeping 1b means milestone zero is no longer "the exit of phase one"; moving it puts gates 1 to 4 after Orca. ADR-009's basis line (line 7) has no note. |
| C3. REQ-05, REQ-06 and PRD §2: classification per phase | PARTIAL | ADR-010 note (line 3); ADR-012 D3; proposal row 14 | Row 14 quotes PRD §2's "Tests are run and classified before approval" under the label REQ-05. It omits REQ-05's own sentence, "Before approval each test is classified" (line 64), and §2's sentence that the tests are locked. Threat review 7.6 (line 129) still locks every abuse case at gate 2. The gate-2 test set is undefined (Part B 5 and 6). |
| C4. Decision 20: defaults only on founder-only projects | PARTIAL | ADR-010 note (line 3); ADR-012 D4 | REQ-04 does list "a recorded default" as a decider. Three gaps remain. D4 does not reconcile PRD §2 (line 26): "one question per significant decision the PRD left open". The approver's authorization "on 2026-10-12" cites no record or quote. The dependency-adding defaults named before (ADR-010 item 37; ADR-011 items 24 and 25) are still not asked, against threat review 7.5 (line 100). |
| C5. Answer A2: work-only auto-merge widened | PARTIAL | ADR-012 items 1 to 5; threat review lines 47 and 246 | ADR-011 item 3 (line 14) still sends tests through work-only. ADR-010 item 2 (line 12) has no note. |
| C6. Answer A6 cited by record 0003 | OPEN, with the approver | ADR-012 D6; TECH-SPEC §12; HANDOFF item 2 | Correctly escalated. Threat review 8.1 (line 211) and its closing line (line 368) still plan a re-issue for record 0002 only. |
| C7. Decision 8: pre-commit never sees record writes | CLOSED | ADR-012 item 9 and D7 | None. |
| C, addendum: changes labelled "no change" | CLOSED | proposal line 3 now names narrowing rows 4, 6, 8, 9 and 12; ADR-012 D, closing paragraph | ADR-011 line 5 still says "nothing here changes an approver decision", now qualified by ADR-012. |

## Part B: problems the correction pass introduced

1. **Blocker.**
   - Where: ADR-012 item 1 (class table), against items 4 and 25; TECH-SPEC §4.5 (line 55); interfaces job table (lines 201 to 209); ADR-011 item 6; T-05-N8.
   - Problem: story-verify was confined to `story/*`, but only `work/*` and `rules/*` got a replacement lock comparison (work-only). Three routes to main now have no pre-merge check:
     - `locked/*` relies on "story-verify's lock comparison", which item 4 no longer runs there. The job tables give this class only `classify`, and only when tests change. No job checks the amendment record its merge needs, so T-05-N8's "when merge is checked" has no job behind it.
     - `release/*` lists `release-gate build` as its check, but item 25 runs that build after the merge. No job checks its gate-4 record.
     - A branch that matches no class has no rule at all.

     So a change to `docs/eval-plan.md`, a locked test or a lockfile can reach main without an amendment through any of the three. That is finding 1's failure mode, against REQ-06, C-06-6 and NFR-01.

     A platform gap compounds it. GitHub attaches required checks to the target branch, not the head branch, so "required checks per class by branch pattern" has to be emulated inside the jobs. No verification item covers that.
   - Fix:
     - Add one required job on every pull request into main, for example work-only grown into a class gate. It maps the head branch to a class and fails unknown branches. It enforces each class's allowed paths and runs the explicit lock comparison for every class. It verifies each class's merge record: gate 4 for `story/*` and `release/*`, the amendment for `locked/*`, and `approve rules` for `rules/*`.
     - Take `release-gate build` out of the pre-merge column.
     - Add a V-item for the emulation.
     - Add CI-job tests for a `locked/*` change without an amendment, a `release/*` branch touching a locked path, and an unclassified branch.
2. **Major.**
   - Where: ADR-012 item 1 (`rules/*` row), against item 23; TECH-SPEC §4.5; interfaces work-only and gate-check rows (lines 207, 203); T-15-N2; AB-15-1.
   - Problem: the table requires only work-only for `rules/*`, and the interfaces work-only row auto-merges `work/*` and `rules/*` alike "on green". Item 23's "gate-check in its rules form" appears in no job table, since gate-check is scoped to `story/*` everywhere. A retrospective rules change therefore merges with no approval. That contradicts REQ-15 ("applied only on approval"), AB-15-1 and T-15-N2.
   - Fix: list gate-check in its rules form as required for `rules/*`, drop auto-merge for that class, and correct the wording and enumerations listed in Part A row 13.
3. **Major.**
   - Where: TECH-SPEC §2 phase 0 (line 23); ADR-009 scaffold (lines 13 to 18); ADR-012 item 2; eval plan §5 (line 404).
   - Problem: no phase names work-only or artifact-check, and the hand-built scaffold has neither. Yet the scaffold is what enforces pod-factory's own repository until 0.1 ships at the end of 1b (eval plan §5; decision 23). So the blocker fix is missing exactly while pod-factory's eval plan is first locked: from the gate-2 lock to release 0.1, nothing checks a `work/*` merge that changes the locked eval plan.
   - Fix: add work-only, with its lock comparison, to the phase-0 scaffold and to ADR-009. If that is not done, state that work-zone merges stay manual and checked until it ships. Name the phase that delivers artifact-check.
4. **Major.**
   - Where: ADR-012 item 10; ADR-011 item 1 (line 9); ADR-009 note (line 5); interfaces backend row (line 174) and hook 4 (line 248); mapping C-08-4 (line 126); T-13-N4.
   - Problem: hooks recognize a builder only by a live dispatch file in its working directory. That file is now written by `story attach`, which the builder itself, an untrusted agent, runs as its "first instructed action". A builder that skips it has no dispatch file, and hook 4, the only layer for C-13-1, then lets it open the question tool. That contradicts the threat review's premise that agents are untrusted (7.2) and its rule that no control depends on how an agent responds to instructions (7.3). Four more problems:
     - Item 10 creates two worktrees: `story start` makes one under the worktree root, and Claude Code's isolation makes another. It does not say which one holds the `story/*` branch.
     - ADR-011 item 1, ADR-009's note and the interfaces row each describe a different version of the mechanism.
     - The mapping has `story start` writing the dispatch record (C-08-4).
     - No test covers a builder that never attaches.
   - Fix:
     - Fail closed: treat any project worktree other than the orchestrator's checkout as a builder unless a dispatch file says otherwise, or have the orchestrator verify attachment before the builder's first tool call.
     - Name one worktree and align the four descriptions.
     - Add a negative test for an unattached builder.
5. **Major.**
   - Where: proposal rows 13 and 14 (lines 19, 20) and header (line 3); ADR-012 D1 and D3.
   - Problem: two rows quote the wrong text.
     - Row 13's "current wording" ("Without Orca, layers one and two run in one Claude Code session...") comes from `docs/PRD-reference.md` line 30. The governing sentence is PRD.md §2 line 30: "In Orca, stories run in parallel under supervision; without Orca, they run one at a time in a single session."
     - Row 14 is labelled REQ-05 and REQ-06 but quotes §2 line 26. It misses REQ-05's "Before approval each test is classified" (line 64) and §2's "You approve. The tests, the eval plan and everything the tests depend on are locked."

     The header still says every row quotes PRD §4. As drafted, record 0004 would leave both the one-at-a-time sentence and REQ-05's text and hash unchanged, so C1 and C3 would survive the amendment.
   - Fix: requote both rows from PRD.md, add REQ-05's sentence and §2's lock sentence, and say in the header that rows 13 and 14 change section 2 as well.
6. **Major.**
   - Where: eval plan §12 (line 476); ADR-012 items 12 and 18; eval plan §2 (line 36); TECH-SPEC §10 (line 94).
   - Problem: item 18 promises a list of the phase-0 and milestone-zero tests. Section 12 gives a rule instead: tag each test "by the phase that delivers its requirement". The rule fails in both directions:
     - It cannot tag REQ-07, REQ-08, REQ-16, REQ-19 and REQ-20, which span phases.
     - It makes all 31 REQ-03 and REQ-06 tests phase-0 tests, including T-03-P6, T-03-N7, T-06-P9 and T-06-N8, whose jobs no phase-0 piece delivers.

     Section 2 and TECH-SPEC §10 still speak of ten milestone-zero tests, although item 12 adds T-13-N4. So the set that must be written as code and classified before gate 2 is undefined: between 15 and 92 tests, depending on the reading.
   - Fix: add a phase column to every test table, list the phase-0 and milestone-zero set with its count, and update §2 and TECH-SPEC §10.
7. **Major.**
   - Where: plain-language summary lines 3, 9, 19, 26, 60, 94, 140, 143, 147 and 149; HANDOFF lines 10, 14, 16, 23, 24 and 37.
   - Problem: the summary predates ADR-012, and the corrections made these statements untrue:
     - "eleven decision records" (lines 3, 147) and "Two more hold ..." (line 26). There are now twelve ADRs.
     - The hand-built kit (line 9) omits `story start`, `story attach` and the minimal `migrate`.
     - The coordinating agent "may settle one only under a decision category you granted" (line 19), and makes "no decision of its own without a category" (line 94). ADR-012 item 13 now lets citation answers be recorded with no policy.
     - "207 tests: 98 ... and 109" (lines 60, 147). The plan now holds 223: 102 positive and 121 negative.
     - The amendment is "twelve rewordings across ten of the twenty-four requirements", "neither widens nor narrows scope", and "the other fourteen stay approved" (line 140). It now has fourteen rows covering twelve requirements plus section 2. Five rows narrow a guarantee, and two carry approver changes.
     - The design "changes one approved decision" (line 147). ADR-012 section D now lists seven.
     - "Nothing else is listed as pending" (line 143). TECH-SPEC §12 now lists the approver's two decisions, record 0004, the regenerated mapping, the skeletons, the tests as code, the classification, the renderings, the runbook files and the rollback plan.
     - "seventeen assumptions" (line 149). ADR-012 makes it eighteen.

     The HANDOFF makes it worse:
     - It sends the approver to the summary first, as written "from the final documents" (line 14).
     - It says every finding is resolved except two (line 10), which Part A contradicts.
     - It repeats "eleven requirements" (line 16) and "ten criteria" (line 23).
     - It drops milestone zero's tests from the gate-2 precondition (line 24).
     - It says eighteen assumptions await phase zero (line 37). The register lists seventeen and pins nine of them to phases 1b to 3.
   - Fix: regenerate the summary from the final hash after Parts A and B are closed, as TECH-SPEC §11c already requires. Until then, mark it pre-correction in the HANDOFF, and correct the HANDOFF's claims and counts.
8. **Minor.**
   - Where: counts and ordering across the set.
   - Problem: counts and numbering that no longer agree.
     - **Tests.** TECH-SPEC §10 (line 94) still says 207 (98 positive, 109 negative) and ten milestone-zero tests.
     - **Assumptions.** Seventeen appear in ADR-011 line 5, its register, TECH-SPEC §11a (line 102) and mapping list 3 (lines 412, 418). ADR-012 item 11 adds V18, which mapping C-13-1 cites, but no register defines it.
     - **Jobs.** TECH-SPEC §9 (line 84) and T-06-P8 (line 138) say five; §4.5 lists eight, plus precommit.
     - **Human-only commands.** ADR-012 item 8 says thirteen, but the threat review trust map (line 35) lists nine. The interfaces tables name only ten: `secret set` appears only as an unnamed "credential entry" row, and `revert` and `incident` have none.
     - **Layers.** ADR-012 item 7 says seven, but ADR-006 line 17, interfaces line 205, mapping C-19-4 and T-19-N3 (six) differ.
     - **Record types.** Fourteen holds only if the "dispatch record" and the `citation` decision fit existing types (item 12 below).
     - **Amendment.** "Eleven requirements" (proposal line 1, ADR-012 item 21, HANDOFF line 16) should be twelve plus section 2. "The other fourteen" (proposal line 3) should be twelve. Eval plan §9 is numbered 1 to 9, 11, 12, 10, and §10 and §11 still say ten criteria.
     - **Ordering.** TECH-SPEC sections run 11, 11a, 11c, 11b. ADR-012 item 22 sits after item 27.
   - Fix: correct every count in one pass, and add V18 to ADR-011's register and to mapping list 3.
9. **Minor.**
   - Where: TECH-SPEC §2, against ADR-012 item 26.
   - Problem: the phase table itself agrees with item 26 on all four points: minimal `migrate` in phase 0, `explain` in 1b, the Orca entry in phase 2, and 0.1 at the end of 1b. The disagreements are around it:
     - ADR-009's scaffold omits `migrate`.
     - ADR-011 V14 still verifies the Orca label in phase 3.
     - ADR-012 item 17 places `migrate` in 1b.
     - Phase 2 still delivers "REQ-07 (worktree per story)" (line 26), although worktrees now start in phase 0 (item 10).
     - Phase 0 lists no REQ-07, although it delivers `story start`.
   - Fix: align these five places with item 26 and item 10.
10. **Minor.**
    - Where: eval plan §12 (lines 481 to 487); T-08-N2 (line 163).
    - Problem: pairing defects in the new tests.
      - T-07-N7 is coded PN but pairs with T-07-P3, a PR+ test, so it should be PR (T-07-P3). It largely repeats T-07-N5's "older plan" case and still omits AB-07-2's reopen count.
      - T-07-N8, T-09-N12, T-16-N3 and T-19-N6 pair with positives under other requirements, which the base plan never does. T-16-N3 guards an edit but pairs with a read-only shell command (T-03-P2).
      - T-09-N12 is phase 1b by the tag rule and is PN against T-06-P2, a milestone-zero test. At its own classification run the positive already passes, so the PN rule "Pn fails for its stated reason" cannot hold, and classification would block the test.
      - T-08-P2 now tests the move to in-review, but its pair T-08-N2 still tests "marked done".
    - Fix: re-pair within each requirement and phase, correct the codes, add the reopen-count assertion, and align T-08-N2 with T-08-P2.
11. **Minor.**
    - Where: OPEN or pending wording left beside resolution tables that claim closure.
    - Problem:
      - **Interfaces.** OPEN-8's resolution (line 355) is "item 23", which was withdrawn. Line 7 still says 4.6 is "Still pending". The table header (line 71) still says "Proposed name". The text tagged OPEN-13 (line 35) contradicts its own resolution.
      - **Mapping.** C-05-5, C-05-6, C-05-8 and C-05-9 (lines 86 to 90), and the count line (line 412), still say "no job yet", though classify exists. List 1 (line 306) and V3 (line 351) still carry the withdrawn sequential-inline gap.
      - **Eval plan.** §6 (line 421) still calls the AI-eval model credential "open for the threat review", though §11 resolves it by ADR-010 item 39.
      - **TECH-SPEC and threat review.** TECH-SPEC §4.6 (line 59) and the threat review header (line 3) credit only ADR-010 with resolving their open items. Threat review lines 5 and 6 still read "amendment 0002" and "Consistent with ADR-001 to ADR-009".
    - Fix: edit each passage in place.
12. **Minor.**
    - Where: ADR-012 items 13 and 14 and D2; interfaces `delegated-decision` row (line 106) and gate-check row (line 203); ADR-011 item 4; mapping C-08-4; T-07-N8, T-17-N3, T-17-N4.
    - Problem: four new rules are underspecified.
      - **Citation decisions.** Item 13 records a citation as "a decision of kind `citation`". The only matching type, `delegated-decision`, has no `kind` field and requires a `category`, and T-17-N4 rejects a decision record without one. T-17-N3 also folds the citation's positive assertion into a negative test.
      - **Alternatives.** Item 14's alternatives are met in ADR-010 and ADR-011 by one generic sentence ("the inverse choice named in its item"), although most items name no alternative.
      - **Dispatch record.** The "dispatch record" that gate-check reads "on the story branch" is not among the fourteen record types. A story branch may not carry `.factory/` paths, so it has no home there either.
      - **D2 options.** D2 offers two options, both of which need a PRD §3 amendment, and no row is drafted for either.
    - Fix:
      - Add `kind` (`citation` or `delegated`) to the decision schema, with `category` required only for `delegated`.
      - Write real alternatives, or drop the claim.
      - Define the dispatch record's type and home.
      - Draft the §3 amendment row for whichever D2 option the approver picks.
13. **Minor.**
    - Where: interfaces gate-2 row (line 47); T-06-P3 (line 129), a phase-0 test that is locked at gate 2. Both against ADR-011 item 11 and ADR-012 items 16 and 22.
    - Problem: both omit the PRD and mapping hashes, and both name one runbook where item 16 binds two. Once locked, T-06-P3 would pin the wrong gate-2 binding.
    - Fix: update both.
14. **Minor.**
    - Where: ADR-012 items 1 and 3.
    - Problem: before any lock exists, the first tests and the not-implemented skeleton fit no class:
      - `locked/*` needs an amendment that cannot exist yet.
      - `work/*` excludes `packages/`.
      - `story/*` needs gate 3.

      Bootstrap commits may cover pod-factory itself, but adopters have no route.
    - Fix: add the gate-2 lock pull request as a class, or as a `locked/*` variant whose merge record is the gate-2 approval plus the lock record.

## Part C: scripted facts

- **PRD and per-requirement hashes: confirmed.**
  - `docs/PRD.md` hashes to `dbd72a26…`. That equals record 0002's "after" hash and record 0003's "unchanged" hash.
  - All 24 per-requirement hashes equal record 0001's, with REQ-09 taken from record 0002. They match under both T-03-P5's line rule and ADR-011 item 30's block rule.
  - `docs/PRD-reference.md` hashes to `e48520d5…`, equal to record 0003's "after" hash.
  - Commit `ae723e5` touched none of these files.
- **Eval-plan IDs and pairing: confirmed, with two caveats.**
  - There are 223 IDs: 10 in section 2, 193 in section 3, 4 in section 6 and 16 in section 12. None is duplicated, and no number is skipped.
  - Each of the 121 negative tests names a positive that exists.
  - Caveat 1: T-07-N7 is coded PN against a PR+ positive, T-07-P3.
  - Caveat 2: T-07-N8, T-09-N12, T-16-N3 and T-19-N6 pair with positives under other requirements (Part B 10).

Ready for the approver's gate-2 read: no. ADR-012 closes the `work/*` route, but its own class table reopens the same lock bypass through `locked/*`, `release/*` and unclassified branches; 18 of the 25 findings are only partly carried into the files that were named; and the amendment rows meant to carry decision 2 and answer A5 quote text that is not in the governing PRD.
