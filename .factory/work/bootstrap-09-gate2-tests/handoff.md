# Handoff: bootstrap-09-gate2-tests

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

The gate-2 test pull request, stacked on 8a (`bootstrap-08a-kill-resume`, PR #9). It is the last bootstrap pull request before gate 2.

## Done

- `packages/cli/test/status.test.ts`: story one's three tests, all new behaviour (NB). Each one's stated reason is in its comment, so record 0005 can state the same reasons:
  - **T-19-P1:** "status does not exist, so it prints no story line. The first assertion fails: expected the output to match /story-1.*in-progress.*builder-1/, received 'pod-factory has no command "status"'."
  - **T-19-N1:** "status does not exist, so nothing is flagged. The first assertion fails: expected the output to match /story-1.*claims done.*records.*in-progress/, received 'pod-factory has no command "status"'."
  - **T-19-N2:** "status does not exist, so no gate line and no invalid record is shown. The first assertion fails: expected the output to name the edited gate-3 approval as invalid, received 'pod-factory has no command "status"'."
- How the tests are built:
  - The Givens are records planted the way the commands write them: a two-story plan approved at gate 3, a lock, and story one in progress held by builder-1. N1's story file claims "Stage: done"; N2's gate-3 approval is edited in place.
  - In each test the content assertion comes first, so the failure names the missing content. The exit code is checked last.
  - In N2, the absence of "approved" is checked only after a gate-3 line is proven present (rule 2).
  - The Givens were checked once with a temporary test, not committed: P1 and N1 have nothing flagged, gate 3 approved, story-1 in progress and story-2 ready; N2's edited approval is the only flagged record, and no gate-3 approval counts.
- The full suite: 159 tests, 156 passing and these 3 failing on their first assertion. Lint is clean. No other file changed.
- No `status` entry point, per TECH-SPEC section 3.3 and the design session's ruling.

## Decisions made in session

- By the design session:
  - These are NB tests asserting displayed content. The rule that governs them is "fail on a real assertion for the stated reason, never a setup or import error". The unknown-command text as the received value is incidental.
  - Keep each test's reason in its comment.
  - This pull request's body says its verify is red by design, and that it is the single pull request where that is true.
- Lesson from 8a, from the design session: after any formatter runs, read the diff you are about to ask a human to approve. If it is bigger than the change you made, find out why before pushing.

## Expected on GitHub

**verify is red, and that is the designed outcome of classification, not a failure.** This is the single pull request where that is true. gate-check therefore cannot go green, and the pull request merges under the approver's `approve bootstrap` while `bootstrap-check` is still the only required check.

## Left, for the approver only

The sequence in `.factory/work/bootstrap-08a-kill-resume/handoff.md`, from step 3: merge this pull request; then at its merge commit run the locked command, commit `.factory/work/classification/gate-2.json`, write record 0005, and run `approve 2` and `lock`.

## Open questions

- Section 13's stated count does not match its table, and this needs settling before the eval plan is locked (asked of the design session). The table lists 52 distinct test IDs, but the text says "Sixty tests". On main it lists 55 against "Sixty-three", so the count was 8 too high before this stack.

## Next step

The design session reviews this pull request and the count; then the approver's gate-2 steps.
