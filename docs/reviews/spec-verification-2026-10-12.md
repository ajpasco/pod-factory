# Spec verification before gate 2, 2026-10-12

Artifact set, at commit `34006a0` on branch `pull-stablyai-orca-repo`: `docs/TECH-SPEC.md` 0.1, ADR-001 to ADR-011, `docs/spec/interfaces-and-non-goals.md`, `docs/spec/threat-review-and-production-readiness.md`, `docs/eval-plan.md`, `docs/spec/criterion-to-control-mapping.md` and `docs/spec-drafts/prd-amendment-0.9.2-proposal.md`. Governing document: `docs/PRD.md` 0.9.1, under records 0001 to 0003. Context: `docs/PRD-reference.md` (decisions 1 to 28 and the REQ-04 and REQ-05 bullets) and `docs/reviews/prd-red-team-2026-10-12.md`.

Reviewer: one fresh-context verification agent. It changed no existing file. Line numbers refer to the commit above.

**Result: not ready for the approver's gate-2 read.**

- Part B found 25 consistency problems: one blocker, eleven major and thirteen minor.
- Part C found seven places where an approved decision is changed or narrowed without the spec saying so.
- Most findings are text fixes or questions for the approver. Finding 7 needs a design answer before the approver relies on ADR-011 item 1: how a command-line start verb puts a builder subagent in its own worktree.

## Checks run by script or listing (all pass)

| Check | Result |
|---|---|
| `docs/PRD.md` hash | `dbd72a26…`, equal to record 0002's "after" hash |
| Per-requirement hashes | 24 of 24 equal record 0001, with REQ-09 taken from record 0002. They match under both rules: T-03-P5's line rule and ADR-011 item 30's block rule |
| `docs/PRD-reference.md` hash | `e48520d5…`, equal to record 0003's "after" hash |
| Eval-plan counts | 207 tests: 98 positive and 109 negative. Counts by kind, package, class and requirement all equal section 10. No duplicate or skipped IDs |
| Eval-plan pairing | Each of the 109 negative tests names a positive test that exists and has the matching class: PN with NB, PR with PR+ |
| Mapping counts | 157 criteria: Enforced 46, Measured 108, Reviewed 2, Unmapped 1. Authoritative-layer counts and CI sub-counts are as stated. IDs are contiguous |
| Mapping coverage | Read PRD section 4 sentence by sentence: every checkable statement has a row |
| Open-item resolution tables | Interfaces OPEN-1 to OPEN-23 and threat-review OPEN-1 to OPEN-13: every item the body text cites has a row. Mapping O1 to O35 each map to an ADR-011 item |
| Spike code | None. The repository tracks only `docs/`, `.factory/records/` and `.gitignore`, so it holds no test code or skeleton either |

## Part A: gate-2 readiness against REQ-04 and REQ-05

| Criterion | Verdict | Where | Gap |
|---|---|---|---|
| Required section: phases | MET | TECH-SPEC §2 | None |
| Required section: interfaces | MET | TECH-SPEC §4; interfaces §4 | The command and job surface is split across ADR-010 and ADR-011, and parts of the interfaces file are stale (B8, B11) |
| Required section: non-goals | MET | interfaces §5 | None |
| Required section: budgets | MET | TECH-SPEC §6; ADR-007 | Budgets are set per story. Reference REQ-04 flow 2 says per phase |
| Threat review with its five contents (reference REQ-04 b3) | PARTIAL | threat review 7.2 to 7.6 | All five contents are present: a 14-component trust map that treats agents as untrusted, 10 entry points, credentials and network access per role, the pinned supply chain, and 46 abuse cases. However, 7 abuse cases have no test and 2 lack their CI half (B12). Per-phase test writing also means most abuse-case tests are not locked at gate 2 (C3) |
| Production readiness: runbook, retry rule, reversibility (reference REQ-04 b4) | MET | threat review 8.1 to 8.4 | Migrations and rollback, logging, monitoring, a ten-step runbook with reconcile and reversibility columns, the retry rule and the rollback plan are all present. The runbook text assumes several packages (B15). The bound runbook and rollback-plan files do not exist yet (B24) |
| Required section: criterion-to-control mapping | MET | mapping file | Present. Coverage is a separate row below |
| Plain-language summary by a fresh-context agent (reference REQ-04 b11) | NOT MET | TECH-SPEC §12 | Listed as pending. An uncommitted draft, `docs/spec/plain-language-summary.md`, appeared in the worktree during this review and was not reviewed. It must be written from the final design hash, so it needs regenerating after Parts B and C are fixed |
| Every requirement appears in a phase | MET | TECH-SPEC §2 | All 24 IDs appear. REQ-20 is listed only for "schema version", although `migrate` is needed when phase 0 creates the records branch. Phase 1b delivers `explain` without listing REQ-19 (B23) |
| Every significant decision records who decided | MET | the "Decided by" line in each ADR | Recorded as prose, not the fixed field that T-04-N3 checks (mapping C-04-6). Technical defaults are used on a project with an engineer (C4) |
| ...and the alternatives rejected (reference REQ-04 b6) | PARTIAL | ADR-001 to ADR-008 include them | ADR-009, ADR-010 (42 entries) and ADR-011 (33 items, the pull-request class table, the verification register) record no alternatives |
| No spike code | MET | repository | No code of any kind |
| No design question about something the PRD settles | NOT MET | TECH-SPEC §12 question 3 and ADR-003; ADR-010 A5 | Question 3 offered a parallel inline option, which reopened PRD §2 ("without Orca, they run one at a time in a single session") and decision 2. A5 reopened REQ-05 ("Before approval each test is classified"). Both answers changed settled text, with no rejection and no amendment (C1, C3). Question 5 is borderline, because REQ-16 already says the plugin adds the hooks |
| Technical review when no engineer is on the project | MET (not applicable) | TECH-SPEC §1 | An engineer is on the project |
| Mapping covers every criterion | PARTIAL | mapping file, list 1 | All 157 statements have a row. C-08-3 stays Unmapped until amendment 0004 (row 4) is approved, and the reference requires an unmappable criterion to be reworded or dropped before gate 2 |
| REQ-05: tests tagged with requirement IDs | MET | eval plan §2, §3, §6 | Every requirement has at least two positive and two negative tests; each test ID carries its requirement tag |
| REQ-05: regenerated renderings | PARTIAL | eval plan §1 | The author's renderings exist for all 207 tests. Regenerated renderings and their acknowledgments cannot exist until the tests exist as code |
| REQ-05: classification plan | PARTIAL | eval plan §1, §10 | Every test has a planned class, and the rules are sound. No test is tagged with its phase, so the set ADR-010 item 5 requires before gate 2 (phase zero and milestone zero) is defined only for the ten milestone-zero tests. The skeleton, the test code and the classification run do not exist yet. Per-phase classification also narrows REQ-05 (C3) |
| REQ-05: negative tests paired with positives | MET | eval plan, all sections | 109 of 109 verified |
| REQ-05: AI safety thresholds | MET | eval plan §6 | 100 percent safety over the defined scenario set for both reviewers |
| REQ-05: existing tests keep their baseline | MET | T-03-P5, T-20-P2 | Both pass today (hashes verified). Record 0003 has no baseline test (B14) |

## Part B: consistency

1. **Blocker.**
   - Where: ADR-010 item 2 (line 10); ADR-011 table C (line 23) and item 26 (line 48); eval plan §5 (lines 396, 402); T-06-N3 (line 130); T-20-N4 (line 325).
   - Contradiction: work-only pull requests auto-merge any change under `docs/**` and `.factory/work/**` with no lock comparison. A change to the locked `docs/eval-plan.md`, or to an adopter's locked profile pin, therefore reaches main without an amendment, which REQ-06 and C-06-6 forbid and which T-06-N3 and T-20-N4 expect CI to fail.
   - Fix: the work-only check must fail any change to a path in the lock record, using the explicit comparison from ADR-011 item 4, before a pull request may auto-merge.

2. **Major.**
   - Where: ADR-006 job 2 (line 14); interfaces job table (line 200); TECH-SPEC §4.5 (line 55); threat review 7.2 (line 54); against ADR-011 table C (lines 20 to 26).
   - Contradiction: story-verify runs "on every pull request to main" and fails any diff that touches `.factory/`, and gate-check is "required for merge". Yet `work/*` pull requests always touch `.factory/work/` and must auto-merge on the work-only check alone, and `rules/*`, `enforcement/*` and `release/*` merge on other records.
   - Fix: in ADR-006, the interfaces job table and TECH-SPEC §4.5, scope story-verify to `story/*` (its lock comparison also to `enforcement/*`), and state for each class which required checks run and how gate-check passes for classes that are not stories.

3. **Major.**
   - Where: ADR-011 item 3 (line 12) and table C (line 23); against ADR-010 item 2 (line 10) and eval plan §5 (line 394).
   - Contradiction: `classify` runs "on the work-only pull request that adds a phase's tests". But the work-only path rule admits only `.factory/work/**` and `docs/**`, while the locked tests live in `packages/*/test/**` and `templates/test/**`.
   - Fix: route a phase's tests through a class whose merge requires the lock-amendment record (for example `enforcement/*`, or a new `tests/*` class), and run `classify` there.

4. **Major.**
   - Where: ADR-010 items 2 and 24 (lines 10, 41); mapping line 9 and C-01-6 (line 34); against ADR-006 (lines 11 to 17), the interfaces job table (lines 197 to 204), ADR-011 section B and the eval plan.
   - Contradiction: the work-only check is the authoritative layer for C-01-6 and the only gate on every auto-merge. Yet it appears in no job list, has no enumerated checks and has no locked test; the CI half of AB-01-1 is untested.
   - Fix: define `ci work-only` next to the other jobs, covering the path rule, the lock comparison, the rule against application source before gate 1 and the rules-path rule, and add CI-job tests for it.

5. **Major.**
   - Where: threat review 7.2 (line 47) and 8.3 (line 246); against ADR-010 item 2 (line 10) and ADR-011 V10 (line 76).
   - Contradiction: putting all of `.factory/` under CODEOWNERS, with code-owner review required, blocks the approver's "auto-merge with no human review" of `.factory/work/**`. On a single-maintainer repository the author cannot approve their own pull request (V10).
   - Fix: scope CODEOWNERS to `.claude/`, `.github/` and the enforcement code, as reference §5's "protected zone" does, and leave `.factory/work/` and `docs/` out.

6. **Major.**
   - Where:
     - TECH-SPEC §2 (line 26), §4.1 (line 39) and §9 (line 81).
     - Interfaces backend table (line 172) and its OPEN-8 resolution row (line 350).
     - ADR-010 consequences (line 71).
     - Mapping: cross-cutting finding 5 (line 19), C-13-1 (line 185), list 1 (line 306), V3 (line 351).
     - Eval plan §2 (lines 34 to 49) and T-13-N1 (line 231).
     - All of these against ADR-011 item 1 (line 7).
   - Contradiction: every builder now runs in its own worktree with a dispatch file. These passages still give worktrees only to parallel builders, or still describe the sequential-inline gap. No locked test checks that the start verb creates a worktree and a dispatch file, or that hook 4 denies a sequential inline builder, which is milestone zero's mode and the mode the change was made for.
   - Fix: update the passages to cite ADR-011 item 1, and add milestone-zero tests for worktree and dispatch-file creation and for the hook-4 denial in sequential inline mode.

7. **Major.**
   - Where: ADR-011 item 1 (line 7) and section F (lines 65 to 83); ADR-009 amendment note (line 3) and scaffold list (lines 9 to 16); interfaces non-goals (line 275).
   - Contradiction: the item depends on two things nobody has checked or scheduled:
     - A command-line start verb would have to create a worktree "through Claude Code's worktree isolation", which is an option of the subagent tool call, not of a command-line program. Hook input would then have to report that worktree as the subagent's working directory, but V3 was downgraded and nothing replaced it in the verification register.
     - The "scaffold's start verb" is not one of ADR-009's six pieces, and the non-goals forbid adding to them.
   - Fix: specify how the start verb places a builder subagent in its worktree, add a phase-0 verification item for the working directory reported in hook input, and add the start verb to ADR-009's scaffold and to that non-goal. Also add hooks 3 and 4, or state when they arrive.

8. **Major.**
   - Where: interfaces job table (lines 197 to 204); TECH-SPEC §4.5 and §9 (lines 55, 84); T-06-P8 (line 138) and the CI-job tests in eval plan §3; against ADR-011 items 2 to 7 (lines 11 to 16).
   - Contradiction: none of these includes ADR-011's additions:
     - the artifact-check and classify jobs;
     - gate-check's explicit lock comparison and its dispatch-record backstop;
     - doctor as a required check;
     - release-gate's build and verify triggers;
     - records-validate re-checking preconditions.

     T-06-P8 still pins "the five jobs", and no CI-job test covers any of the additions.
   - Fix: add the jobs and conditions to the interfaces table and TECH-SPEC §4.5, make T-06-P8 list every job, and add one CI-job test per addition.

9. **Major.**
   - Where: ADR-004 (lines 7, 12); ADR-006 job 1 (line 13); TECH-SPEC §4.3 and §4.5 (lines 47, 55); interfaces job table (line 199); threat review (lines 46, 246); T-20-N1 (line 317); against ADR-010 item 11 (line 22).
   - Contradiction: these passages describe validation triggered by each push, in which "a failing push is rejected". ADR-010 item 11 instead runs validation from main on a schedule: an invalid record lands, is flagged, and never counts. ADR-006's amendment note does not mention this change.
   - Fix: add an amendment note citing ADR-010 item 11 to ADR-004 and ADR-006, update the triggers in each table, and reword T-20-N1 to "flagged invalid and kept off the validated ref".

10. **Major.**
    - Where: ADR-006 doctor job (line 17); interfaces doctor job (line 203); threat review 8.3 (line 246); mapping C-19-4 (line 252); T-19-N3 (line 307); TECH-SPEC phase 0 exit (line 23); against ADR-011 item 8 (line 30).
    - Contradiction: none of the doctor lists matches the canonical seven layers: plugin hooks with managed hook settings, pre-commit, CI workflows defined on main, branch protection on main, records-branch protection, CODEOWNERS, and required checks.
      - ADR-006 and the interfaces file omit the hooks, pre-commit and the workflows.
      - The threat review lists managed hook settings separately and folds required checks into main's protection.
      - T-19-N3 tests six layers and leaves out required checks.
      - TECH-SPEC still says "five layers".
    - Fix: replace every list with the seven layers by name, and make T-19-N3 iterate over them.

11. **Major.**
    - Where: interfaces lines 5, 25, 29, 35, 45, 69 to 77, 88, 106 and 108, and the threat review trust map (line 35); against ADR-010 items 14, 17, 19 and 29b, and ADR-011 items 11, 12 and 21.
    - Contradiction: the header's "read the resolution" rule redirects only passages tagged OPEN-n. These untagged passages are stale:
      - Hook 2 is said to deny "all nine" commands; item 29b lists thirteen.
      - Records are said to be "one of the eleven types"; there are now fourteen, plus the amendment kind `profile`.
      - Reverting a story is said to be `revoke`; item 19 adds `revert`.
      - Status changes are said to use `transition`; item 17 names it `story set-status`.
      - The gate-2 binding omits the mapping hash and the PRD hash.
      - The command tables lack `story start|wait|fix|ask`, `revert`, `incident`, `secret set`, `artifact submit`, `mockup serve` and `doctor --preflight`.

      So the file that TECH-SPEC §4.6 calls the full interfaces is not complete.
    - Fix: edit these passages in place, and cite ADR-011 in the file's header and resolutions table.

12. **Major.**
    - Where: threat review 7.6 (line 129) and TECH-SPEC §7 (line 71); against the eval plan.
    - Contradiction: the threat review says each abuse case becomes a locked negative test that also asserts the CI refusal. But AB-07-2 (the reopen count), AB-09-1, AB-09-2, AB-12-2, AB-16-1, AB-19-2 and AB-20-1 have no test, and the CI halves of AB-01-1 and AB-07-1 are untested.
    - Fix: add the missing negative tests, each paired with its positive.

13. **Minor.**
    - Where: ADR-011 table C (line 24); against ADR-011 item 13 (line 35), the interfaces approve row (line 29) and records table (line 99), and mapping C-15-2 (line 207).
    - Contradiction: `rules/*` merges on "a human approval record of kind `rules`". But approvals carry a gate, not a kind; `approve` accepts no `rules` gate; item 13 lists no such variant; and the mapping makes gate-check authoritative here while table C lists no gate-check for `rules/*`.
    - Fix: add `rules` as an approval gate value with its preconditions, and name the job that checks it.

14. **Minor.**
    - Where: interfaces (lines 37, 87, 115); threat review 8.1 (lines 209 to 211); eval plan rule 5 (line 32), T-20-P2 and T-20-P3 (lines 318, 319); against ADR-010 item 21 (line 35) and eval plan §11 (line 468).
    - Contradiction: three bootstrap records exist, but these passages name two. Record 0003 therefore has no baseline test and no migration step, and it is not re-issued with `amend` as record 0002 is.
    - Fix: list records 0001 to 0003 wherever the bootstrap records are listed.

15. **Minor.**
    - Where: eval plan §5 (line 404); threat review 8.4 (lines 281, 283, 291, 293, 304, 314, 315); against ADR-010 items 34 and 36.
    - Contradiction: two mismatches with the single-package release design:
      - The gate-2 binding names `release/runbook.md`, but item 36 defines `release/runbook.yaml`.
      - The runbook publishes "each tarball ... dependencies first", with versions "in every published package.json", but item 34 publishes one package.
    - Fix: use `release/runbook.yaml` and one tarball throughout.

16. **Minor.**
    - Where: eval plan §5 (lines 399, 404) and threat review 7.5 (line 99); against ADR-010 item 34 and ADR-011 item 10.
    - Contradiction: two gaps in the lock set:
      - It names only `package-lock.json`. Item 34 ships an `npm-shrinkwrap.json`, which, if committed at the root, npm uses in place of `package-lock.json`.
      - It leaves "the rest of `templates/`" unlocked, but item 10 puts `templates/checklists/*.yaml` under the enforcement-code lock.
    - Fix: lock the shrinkwrap (or the locked script that generates it), and add `templates/checklists/**` to the lock set.

17. **Minor.**
    - Where: amendment proposal (lines 1, 16 to 18); eval plan §9 to §11 (lines 442 to 470); mapping list 1 (lines 306, 308) and its resolutions (line 416).
    - Contradiction: the documents disagree about the amendment's scope:
      - The proposal has twelve rows, with row 10 printed after row 12, but its title says "ten criteria".
      - The eval plan's untestable list still has ten items and lacks C-13-4 and C-21-3.
      - List 1 still says the proposal does not cover C-13-4 and C-21-3, and still calls C-13-1 bounded.
      - List 1 says the approver must confirm the bounded forms C-04-6 and C-13-2, but no row covers them and only ADR-011 "accepts" them.
    - Fix: retitle and renumber the proposal, add the two items to eval plan §9, refresh list 1, and put C-04-6 and C-13-2 on the approver's read list.

18. **Minor.**
    - Where: amendment row 9 (line 15) and T-22-P3 (line 348); against ADR-011 item 27 (line 49).
    - Contradiction: the stop-point catalog has nine stop points, each with a tested message, but row 9 rewords REQ-22 to cover four and T-22-P3 tests four.
    - Fix: align row 9 and T-22-P3 with the nine-point catalog.

19. **Minor.**
    - Where: ADR-011 item 6 (line 15); against threat review 8.4 (lines 276, 280, 281).
    - Contradiction: `release-gate build` runs on the `release/*` pull request, before merge. The runbook instead builds the tarball from the merge commit R, which gate 5 binds as the revision.
    - Fix: build from R after the merge, or bind gate 5 to the pull request's tree.

20. **Minor.**
    - Where: ADR-010 items 11 and 30 (lines 22, 53); against ADR-011 item 8, the doctor lists, threat review 7.2, the branch rules in 8.4, and mapping V7 (line 355).
    - Contradiction: two refs ADR-010 adds are in no protection list or branch rule: `pod-factory/records-validated`, which every gate reads, and `pod-factory/evidence`. V7 assumes the validated ref is protected. records-validate's allowed paths also omit wherever the evidence manifests are committed.
    - Fix: add both refs to records-branch protection, the doctor checks and the branch rules, and name the manifest path.

21. **Minor.**
    - Where: ADR-011 item 28 (line 50); against threat review 8.2 (line 228).
    - Contradiction: hook 5 logs allowed builder reads, but the logging table says allowed calls are not logged.
    - Fix: add the read-logging exception to section 8.2.

22. **Minor.**
    - Where: T-08-P2 (line 162); against ADR-010 item 16 (line 30).
    - Contradiction: T-08-P2 records a story as done once its locked tests pass, but item 16 also requires a validated gate-4 record and the merge before in-review can move to done.
    - Fix: add both to T-08-P2's Given, or change its When to the move to in-review.

23. **Minor.**
    - Where: TECH-SPEC §2 (lines 23 to 29); ADR-004 note (line 25); ADR-011 V14 (line 80); ADR-010 item 7 (line 15).
    - Contradiction: four problems with phase placement:
      - Phase 0 creates the records branch, which is when ADR-004 migrates the bootstrap records, but `migrate` only arrives with phase 1b's "full approval path", and REQ-20 is listed only for "schema version".
      - Phase 1b delivers `explain` without listing REQ-19.
      - All of REQ-16 sits in phase 1b, but its Orca-entry criterion needs the phase-2 plugin, and V14 is pinned to phase 3.
      - No phase says when release 0.1 ships, which is when decision 23's bootstrap exception ends.
    - Fix: put `migrate` in phase 0 (or defer the migration), list REQ-19 in 1b, move REQ-16's Orca criterion to phase 2 or 3, and mark the 0.1 release in the table.

24. **Minor.**
    - Where: TECH-SPEC §12 (line 121); against ADR-010 items 5 and 29c, and eval plan §1 and §8 item 7.
    - Contradiction: the pending list omits gate-2 prerequisites that the plan itself requires:
      - phase-zero and milestone-zero tests written as code;
      - the not-implemented skeleton;
      - the classification run and its record;
      - regenerated renderings and their acknowledgments;
      - the runbook and rollback-plan files that the gate-2 record binds.
    - Fix: add them to the pending list.

25. **Minor.**
    - Where (stale or wrong references):
      - TECH-SPEC line 3 says the PRD is "0.9"; it is 0.9.1 under records 0002 and 0003.
      - Threat review line 265 says the notification channel is "to be decided"; ADR-010 item 32 decided it.
      - Eval plan line 9 says the "command family is still pending".
      - Mapping line 3 says "ten accepted ADRs".
      - Mapping lines 69, 70 and 98 say TECH-SPEC §7 or §8 is "pending".
      - Mapping finding 4 (line 18) says no hook denies the approval commands; ADR-010 item 29b does.
      - ADR-011 section E (line 59) cites "item 12's dispatch files"; dispatch files are item 1.
      - ADR-011 line 3 leaves ADR-003 out of the ADRs it amends.
      - ADR-011 item 1 quotes "same worktree" wording that ADR-003 does not contain.
      - ADR-010 numbers 29a to 29c before 29.
      - The TECH-SPEC §1 profile has no approver list, although item 29a checks human records against one.
      - ADR-002 and TECH-SPEC §3 lack the `release/` folder from item 8.
    - Contradiction: each passage has been overtaken by a later decision, or names the wrong source.
    - Fix: correct each one in place, in a single editing pass.

## Part C: approver-decision integrity

1. **Decision 2 and PRD §2 (line 30).** The approved text says that without Orca, stories run one at a time in a single session.
   - ADR-003 (line 11), TECH-SPEC §4.1 (line 39) and the interfaces file (lines 172, 269) allow parallel inline builders.
   - ADR-003's PRD basis (line 5) paraphrases decision 2 without the word "sequentially".
   - ADR-011's note on ADR-003 says only that "'one at a time' is unchanged".
   - Nothing says the approved text changes. It needs an amendment like record 0002, or the parallel option should be removed.
2. **Decisions 4 and 24 and PRD §3 (lines 40, 44).** The approved text says milestone zero is the exit of phase one and that the Orca backend is the first work after it.
   - TECH-SPEC §2 (lines 24, 25) puts phase 1b ("complete gates 1 to 4") after milestone zero and before Orca, so phase one now ends on a different exit.
   - ADR-009 (line 5) still cites "milestone zero as phase one's exit".
3. **REQ-05 (line 64), REQ-06 (line 66) and PRD §2 gate 2 (line 26).** The approved text says every test is classified before gate-2 approval and is then locked.
   - ADR-010 item 5 (A5, an approver answer) classifies only phase zero's and milestone zero's tests before gate 2, and adds the rest later as lock amendments.
   - ADR-011 item 32 redefines "before approval" as each phase's gate-3 approval.
   - The approver chose A5, but no document identifies it as a change to REQ-05 or REQ-06, and the 0.9.2 proposal has no row for it.
4. **Decision 20.** The approved decision allows recorded defaults only "on a founder-only project"; otherwise it asks one question per significant decision.
   - ADR-010 (line 5) cites decision 20 without that condition.
   - ADR-010 settles 33 entries as technical defaults (items 10 to 39, and 29a to 29c), and ADR-011 settles 33 more, on a project that has an engineer (TECH-SPEC §1).
   - Some of these defaults add dependencies, which the threat review (line 100) says must be "asked, never assumed": a local registry in a container (ADR-010 item 37), a pinned container image per preset (ADR-011 item 24), and the 1Password CLI (ADR-011 item 25).
5. **ADR-010 answer A2 (line 10).** The approver allowed auto-merge only for `.factory/work/**` and `docs/**`, with no human review.
   - ADR-011 item 3 and table C send test additions through `work/*`, which widens that path set to locked test folders.
   - Threat review lines 47 and 246 put `.factory/` under CODEOWNERS, which requires a human review.
   - Neither change is identified.
6. **ADR-010 answer A6 (line 14).** The approver approved, in principle, rewording the ten untestable criteria.
   - Record 0003 cites A6 as approving "PRD amendments in principle", and uses it to rebind the gate-1 record's reference hash, which A6 did not cover.
   - The eval plan (line 468) relies on record 0003. The approver should re-issue it or confirm it.
7. **Decision 8.** The approved decision enforces the human-only write path through agent hooks, the pre-commit hook and CI.
   - Records are committed to the records branch without touching the working tree (interfaces line 20), so the pre-commit hook never sees them.
   - Only hook 2 and records-validate remain, and the spec does not say so.

Explicit changes that are labelled as no change:

- The 0.9.2 proposal's line 3 says "Nothing here widens or narrows scope". Rows 4, 6, 8, 9 and 12 do narrow what is guaranteed, and row 9 covers fewer stop points than ADR-011 item 27.
- ADR-011's line 3 says "nothing here changes an approver decision", yet it amends ADR-003, ADR-006 and ADR-009, all three decided by the approver.

Ready for the approver's gate-2 read: no. The spec changes several approved decisions without identifying them, and ADR-011's late changes were never carried into the interfaces, the tech spec and the eval plan, so the merge-path design contradicts itself and lets the locked eval plan reach main without an amendment.
