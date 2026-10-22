# Findings: S1 frozen acceptance tests against the eval plan's S1 rows

Checker: prep-checker. Inputs read: the frozen files on branch `equipment-s1-harness` (worktree `equipment-s1`, HEAD 64f6ad4), eval plan rev 4 (section 3 rows whose owner is S1, 1.1 rules, section 5 register-coverage lines), PRD, TECH-SPEC 4.2, 5.1, 5.3, 7, 12.5, 12.6, the eval-plan rubric, and gate 7 of the orchestrator as described in the task.

Scope: 17 S1 rows (16 unit, 1 db): T-001-N6, T-003-P6, T-003-N3, T-004-P6, T-004-N6, T-005-N4, T-006-P6, T-006-N2, T-007-N6, T-008-N4, T-008-N7, T-009-P7, T-009-N10, T-010-P8, T-010-N4, T-011-P6, T-011-N5.

Verdict: 3 blockers, 4 advisories. Do not freeze as is. Fourteen of the 17 rows are clean.

## Findings

### F-01 (blocker, plan-correction) T-007-N6 asserts one of the five actions and labels all five
- Row: "when the application decides on returning another member's loan, deleting, adding, marking out of service and restoring, then each is refused, and first an admin is allowed each of the five ... [REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5]".
- Case `test_T_007_N6_REQ_007_1_REQ_007_2_REQ_007_3_REQ_007_4_REQ_007_5_...` makes three allowed calls (`check_return(ADMIN,...)`, `require_admin(ADMIN)`, `check_return(MIA,...)`) and two refusal assertions (`check_return(SAM, ON_LOAN_TO_MIA)` and `require_admin(SAM)`).
- Basis, from the module docstring: "at mechanism U four of them are one decision ... one assertion is the honest U evidence for all four". The pinned `check_delete(item)` takes no actor (12.5), so delete, add, mark and restore cannot be told apart at this level.
- Effect: the case does not assert "each is refused" for five actions. Only REQ-007.1 (a member's return of another's loan) is actually asserted. REQ-007.2 to REQ-007.5 are asserted only through the shared gate `require_admin`. A build whose delete, add, mark or restore operation never calls `require_admin` passes this case unchanged. The DD-24 title properties (`criterion`) will nevertheless report REQ-007.2 to REQ-007.5 as evidenced by a passing U case, and eval-plan section 5 lists T-007-N6 as the U evidence for all five. That fails check 3 (every cited criterion actually asserted) and misstates the evidence. The I rows (T-007-N2 to T-007-N5) do carry the real evidence, so the harm is a false U claim, not a missing check.
- Resolution: plan-correction. Reword the row and its brackets to what the pinned interface lets U observe (REQ-007.1 and the admin gate), and remove REQ-007.2 to REQ-007.5 from the case's labels and from the U entries of section 5; the S2 rows already carry them. The alternative is a blueprint-change giving delete, add, mark and restore their own actor-taking decisions in 12.5, which the plan should not assume.

### F-02 (blocker, user-decision) T-009-N10 freezes rejection of a non-text name (a number) that the PRD does not require
- Row: "a value that is not text (nothing, a number) ... then each is rejected (not refused) as an equipment name. [REQ-009.6, REQ-009.10]". Case: `rejected` includes `None` and `42`, each under `pytest.raises(Invalid)`.
- Basis: REQ-009.6 covers "a name made only of whitespace" and REQ-009.10 covers "longer than 100 characters after trimming". Neither mentions a value that is not text. The blueprint's source for it is SC-13, "Drafter, DD-02, by analogy to D-06" (TECH-SPEC 12.3.1). It is a drafter's default, not a PRD requirement or a user decision. `None` can be read as an empty name (REQ-009.4, REQ-009.6), but `42` cannot.
- Effect: a build that treats the number 42 as a name (for example by converting it to "42") satisfies the PRD and fails a frozen test that no builder may amend. This is a row freezing something the PRD does not require.
- Resolution: user-decision. Either the user records the rejection of non-text names as scope (a decision the PRD then cites), or the row drops "a number" (and keeps "nothing" as an empty name) and the case drops `42`.

### F-03 (blocker, user-decision) T-008-N7 freezes a two-way link between status and borrower that REQ-008.1 does not state
- Row and case: the store must refuse an item On loan with no borrower, and must refuse a borrower on an Available item and on an Out of service item. [REQ-008.1].
- Basis: REQ-008.1 reads "At no time does any item have more than one active loan or show more than one borrower." The case never writes two loans or two borrowers; it asserts the biconditional `(status = 'on_loan') = (borrower_id IS NOT NULL)`, which comes from TECH-SPEC section 7 ("The table check refuses an `on_loan` row with no borrower and a borrower on any other status"), not from the PRD. Nothing in the PRD says an Available item may not hold a borrower value.
- Effect: a build that keeps exactly one borrower per item (REQ-008.1 as written) but enforces "no borrower unless On loan" in the application, or by a trigger (see F-07), fails a frozen test. The `on_loan` with no borrower half is defensible, because a row reading "On loan – <name>" needs a name (REQ-003.4, REQ-008.8). The borrower on a non-loan item half has no PRD support.
- What the case does well (not a finding): the legal control writes before and after each refusal and the final count of 6 make it impossible to pass on an unrelated failure or a store that refuses everything.
- Resolution: user-decision. Confirm that the PRD's REQ-008.1 is read as "a loan is a status and a borrower together, in both directions" and record that reading where the PRD can cite it, or narrow the row to the half the PRD supports.

### F-04 (advisory, plan-correction) T-001-N6 also asserts the missing-identity case, which it does not label
- Row: "when it is given no value, two values, and each single value ...  [REQ-001.7]". Case: `REFUSED` opens with `[]`, "missing altogether".
- Basis: the PRD defines "missing" as a case apart from "malformed" (section 4, "Missing, malformed and not-a-seeded-user acting identity") and gives it its own criterion, REQ-001.6. The register (TECH-SPEC 4.2, REQ-001.6) lists only I and J for REQ-001.6, so no U case evidences it, and eval-plan section 5 lists T-001-N6 only under REQ-001.7. TECH-SPEC 5.1 itself separates the two ("Missing" and "Malformed"; doubled header is malformed).
- Effect: no wrong pass is possible. The case asserts a criterion it does not label, so the evidence record is slightly understated. Not a blocker.
- Resolution: plan-correction. Add REQ-001.6 to the bracket and the title, or state in the row that "no value" is only an extra probe.

### F-05 (advisory, plan-correction) Four rows state "an admin as the acting user" as a Given the case cannot express
- Rows T-010-P8, T-010-N4, T-011-P6, T-011-N5 each begin "Given an admin as the acting user". Cases call `check_mark_out_of_service(item)`, `check_restore(item)` and `check_delete(item)`, which take no actor (12.5), and the comments say so.
- Effect: the decisions do not depend on the actor, so every assertion the row makes is made. The Given is decoration, not an unasserted claim. A reader may think the case shows an admin is allowed.
- Resolution: plan-correction. Drop "an admin" from those Givens, or add the clause that the decision does not depend on who asks.

### F-06 (advisory, plan-correction) Comments in the frozen files call rejections "refusals"
- `unit/test_borrowable.py`: "Both refusals are wrong-state, not permission". `unit/test_status_changes.py`: "All four are wrong-state refusals, not permission refusals". `unit/test_delete.py`: "Wrong state, not permission."
- Basis: the PRD (section 4) and eval-plan 1.1 reserve "refused" for no usable identity or a role that may not act, and "rejected" for every other reason, "never the other way round". The assertions are correct (`Conflict` is a rejection); only the comments use the wrong word, in files that no builder may edit.
- Resolution: plan-correction (reword the comments before the freeze).

### F-07 (advisory, blueprint-change) A refusal is recognised only as a constraint violation
- `db/conftest.py` counts a write as refused only when SQLAlchemy raises `IntegrityError`; any other error is re-raised. The control is deliberate and good. Side effect: a store that enforces the same rule with a trigger raising its own exception would error, not pass.
- Basis: TECH-SPEC 7 pins a table check, so this follows the blueprint. It is a limitation, not a wrong test, and it ties to F-03.
- Resolution: blueprint-change only if the user wants the rule open to a trigger; otherwise none.

## Per-row results

Check 1 = one case, titled with the id, asserting the row. Check 2 = cannot be passed by a build that lacks the behaviour. Check 3 = every cited criterion asserted, no foreign criterion. Check 4 = positive anchor, not vacuous. Check 5 = business outcome, no forbidden assertion, no boundary taken from the application.

| Row | 1 | 2 | 3 | 4 | 5 | Notes |
|---|---|---|---|---|---|---|
| T-001-N6 | ok | ok | see F-04 | ok | ok | Accepted values come first; refused set equals the row's list, one for one. A build using `isdigit` (accepts `01`), `$` in place of full match (accepts `1\n`), trimming, or a 9-digit cap on the wrong side is caught. Boundaries (`01`, ten digits) come from TECH-SPEC 5.1, not from the application; the PRD leaves the form to the design. |
| T-003-P6 | ok | ok | ok (no label) | ok | ok | Mia gives Mia with nobody named and with her own id. Extra `None` call in T-003-N3's anchor is harmless. |
| T-003-N3 | ok | ok | ok | ok | ok | Unknown id uses a lookup that returns nothing and must still be `Forbidden`, so a build that looks the user up first and rejects it is caught. A build that refuses everything fails the anchor. |
| T-004-P6 | ok | ok | ok (no label) | ok | ok | Asserts Mia and Sam where the row says "a member"; same thing, not more. |
| T-004-N6 | ok | ok | ok | ok | ok | `None`, `4`, `999999999` must be `Invalid`; `Forbidden` or an accepted value fails. Anchor first. |
| T-005-N4 | ok | ok | ok | ok | ok | Admin naming the admin must be `Invalid` (not `Forbidden`); anchor first. A build that rejects only unknown ids and not an admin is caught. |
| T-006-P6 | ok | ok | ok (no label) | ok | ok | Borrower and admin both allowed. |
| T-006-N2 | ok | ok | ok (no label) | ok | ok | Anchor (borrower, admin allowed) first, then Sam `Forbidden`. |
| T-007-N6 | ok | see F-01 | blocker F-01 | ok | ok | Anchor present and sound for what it asserts. |
| T-008-N4 | ok | ok | ok | ok | ok | Available first, then On loan and Out of service must each be `Conflict`. REQ-008.6 and .7 also name the API failure modal; the register routes that to J (T-008-N11, T-008-N12), so bracketing them here does not break the bracket rule. |
| T-008-N7 | ok | ok | see F-03 | ok | ok | Strong anchor and controls: accepted shapes first, the same name re-written legally after each refusal, counts 3 then 6. Table and column names are the instrument only (12.6 allows raw SQL). |
| T-009-P7 | ok | ok | ok | ok | ok | Limit written as the literal 100, not read from the application, and the file says why. Catches a limit other than 100 (well-under case plus N10), an untrimmed return, a length check taken before trimming (padded 100 must pass), a UTF-16 counting build (100 astral must pass). The extra 80-character name is within the row's meaning. |
| T-009-N10 | ok | ok | see F-02 | ok | ok | 101 plain, 101 padded, 101 astral, empty, spaces, tab all `Invalid` after the 100-character anchor. Only the non-text part is a finding. |
| T-010-P8 | ok | ok | ok (no label) | ok | ok | See F-05. |
| T-010-N4 | ok | ok | ok (no label) | ok | ok | Anchor first; all four wrong-state calls `Conflict`. See F-05, F-06. |
| T-011-P6 | ok | ok | ok (no label) | ok | ok | See F-05. |
| T-011-N5 | ok | ok | ok | ok | ok | Available allowed first, On loan `Conflict`. See F-05, F-06. |

## Section results

- One case per row and no stray cases: 17 test functions (16 in `tests/unit`, 1 in `tests/db`), each name opens with its row id in the DD-24 spelling and carries exactly the labels of the row's bracket in the same order (checked against the title pattern in `tests/conftest.py`); rows with no labelled criterion carry none. Nothing found.
- Baseline behaviour: every unit module imports `app.rules` at module level and the db fixture imports `app.db` as its first statement, so an empty build fails each case (unit by collection error, db by setup error), as section 1.2 states. No case can pass on an empty build. Nothing found.
- Absence assertions without a positive anchor: none found. Every refusal or rejection assertion is preceded by an allowed call of the same function.
- Forbidden assertions (HTTP status code, schema as the thing under test, log format, call made or not, library presence): none found. The unit cases use the pinned result types of 12.5 as the instrument that shows the class, as 4.1.1 allows, and never a status code. The db case uses raw SQL against the pinned table, as 12.6 allows.
- Boundary or expected value taken from the application: none found. The 100-character limit, the identity pattern and the seeded ids are literals in the tests.
- Coverage in the other direction (a PRD criterion asserted by a case that does not label it): only F-04.
