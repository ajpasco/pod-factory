# Gate-6 planning review R2: Shared Equipment Checkout (trial)

Reviewer: a `prep-checker` session started for this task, 20 October 2026, deliberately **not**
given review R1, and told not to re-count what the orchestrator had already verified mechanically.
Inputs: `PRD.md`, `TECH-SPEC.md`, `eval-plan.md`, `inputs/decisions-20261020.md`,
`inputs/prd-rev14.md`, `inputs/mockup-rev14.html`, and the four rubrics.

Transcribed by the orchestrator because the harness refuses subagent file writes; the checker's
wording is preserved and only the layout is normalised. The orchestrator's own verification and its
reclassifications are in `PREPARATION-STATE.md`, not here.

## Verdict

**19 findings: 6 blockers (5 `plan-correction`, 1 `user-decision`), 13 advisories.** By resolution
class over all nineteen: `plan-correction` 12, `user-decision` 4, `blueprint-change` 3.

**Blockers including a `user-decision`. Stop; the user decides.** The five `plan-correction`
blockers can be fixed in one pass, which review.md does not permit while the set is mixed. Next
step: the user rules on R2-006, then one correction pass, then a new review in a new session.

Main theme: D-20 to D-23 were taken in late and patched in. The PRD never carries them. The
behaviours they decide have no criterion, no register row and no test. All three artifacts still
contradict each other on whether the PRD's N1 to N3 are open. D-23 is in tension with REQ-004.10
and REQ-006.7. Otherwise the plan is strong: story shape, concurrency answers and the contract's
routes, locators and strings agree across artifacts, and no requirement ID originates outside the
PRD.

## Blockers

**R2-001 | blocker | plan-correction. The artifacts contradict each other on whether N1 to N3 are
open, and the PRD never ingested D-20 to D-23.** The PRD closes them in section 8.2 and still
defines two terms by pointing at them; its header, section 2.4 and change list stop at D-19.
*Basis:* PRD header "to carry the user's nineteen decisions of that date (D-01 to D-19)";
definitions "Add loader" ("Where it is shown is Open question N1") and "State demos" ("...is Open
question N3"); trailing bullets on REQ-003 ("Open question N2 asks the user to confirm it"),
REQ-005, REQ-009 and REQ-013; against section 8.2's "**None.** The three points ... closed the same
day"; sections 2.4, 9 and 10.2 carry no D-20 to D-23 row. Blueprint line 7 cites "D-01 to D-19"
while 5.4 cites D-23; section 11 says "Three questions are open in the PRD itself"; DD-09, DD-11
and DD-13 sit under "Design defaults (decided here; the user may overturn any)" although D-20 to
D-22 are the user's decisions; section 10.1 cites REQ-003.6 as the decider for "403, not 422" while
section 11 calls the same point open, which is the pattern the blueprint rubric rejects. Eval plan
line 5 "three points N1 to N3 still open in the PRD", section 4 "Three points stay open in the
PRD", section 9.3 titled "PRD points still open", and section 10 rows calling N1 and N3 open —
against section 13's "Nothing in this plan now waits on an answer." Rubric consequence: a defined
term whose definition is an open question is an undefined term.

**R2-002 | blocker | plan-correction. The behaviours D-20 to D-23 decide have no criterion, no
register row and no test.** The user accepted them as scope, so this is a coverage hole even with
the 158-criterion count intact. *Basis, each unverified behaviour:* D-20's guard (while the Add
loader shows, Enter does nothing) — T-009-P6 asserts only that the loader is shown and then gone,
and plan 9.4 lists the guard under "Design defaults not asserted"; D-21's demos appearing only once
a user is picked — T-001-N5 lists no `state-demos` absence; D-21's "never call the API" — T-017-N5
asserts only "no write call (POST or DELETE)", so a GET from a demo would pass; D-21's 900ms
loading demo, where the decision says "the test must wait for the indicator to appear and then
disappear rather than sleeping" while T-013-P8 reads "(read at once, without waiting for any time
to pass)" and plan 13 says "no row asserts when a demo's state ends"; D-21's Show empty list
holding until the acting user changes — no row; D-21's demo Retry only closing the modal — no row;
D-22's placeholder "Choose a user" — plan 13 "asserted nowhere"; D-23's `user=-` form for refused
requests and "no configuration value" in the log — no row. REQ-013.7 to .10 say only what
activation shows, so the criterion-to-register-to-test chain never sees any of it.

**R2-003 | blocker | plan-correction. D-23 is not reconciled with REQ-004.10 and REQ-006.7, and
two tests bracket those criteria while requiring the opposite.** *Basis:* REQ-004.10 "No record
kept of a loan set by an admin names the admin as the person who set it" and REQ-006.7 similarly,
with no definition of "record" in section 4; the register row for REQ-004.10 requires log lines
with "the form of section 5.4", whose example `POST /api/equipment/4/borrow 200 user=1` names Ada,
who is user 1; blueprint 5.4 contradicts itself in one paragraph, saying "The acting user id is
logged under D-23" and then "The earlier blueprint logged the user id; this one does not";
T-004-N5 and T-006-N4 bracket [REQ-004.10] and [REQ-006.7] while requiring the `user=<acting user
id>` form; plan section 10 proposes the testable wording "no `app.access` log line, names the
person who performed it", which contradicts D-23.

**R2-004 | blocker | plan-correction. The review rows cannot fail as written.** Every outcome
satisfies the row's Then, and REQ-015.4 to .6 are verified by these rows alone. *Basis:* T-015-P5,
P6 and P7 "the reviewer records ... 'matches' or 'does not match'"; T-017-N9 "each reading 'found
none' or the finding"; plan 9.1 "covered by review rows only ... No automated check backs them";
the blueprint says only that the candidate "is judged on those results"; nothing states what a
mismatch does. The reviewer is also still the design default DD-12, and plan 7.1 says "the plan
cannot provision him".

**R2-005 | blocker | plan-correction. REQ-015.8 is under-measured: the Add icon and the four demo
controls are never checked for roundness.** *Basis:* REQ-015.8 "Every icon button is round...",
with the definition "The eleven icon controls and the four state-demo controls are icon buttons";
the register row says "every icon button, in rows and in modals"; T-015-P9 says "when every icon
button in rows and in modals is measured"; `btn-add` lives in `add-card` and the demos in
`state-demos`, so five of fifteen icon buttons are never measured. No other criterion is narrowed
this way.

**R2-006 | blocker | user-decision. D-18's manifest check is unresolved: the blueprint commits S3
to a case the plan will not number.** *Basis:* blueprint 4.4 "S3's `web/tests/component/` holds one
case, titled `NFR-4 manifest`"; plan 9.4 "It is not a criterion and has no row here; the freeze
either includes it unnumbered, outside the counts, or omits it", and "The orchestrator decides
whether to amend the PRD or leave these unproven"; the eval-plan rubric forbids the plan numbering
it. The only compliant routes are a PRD change that numbers it, or an accepted exception.

## Advisories

**R2-007 | advisory | plan-correction.** Most anchors are real; some are only "the page rendered".
*Basis:* T-012-N2, the only test of REQ-012.5, anchors on "with the rows found first" and never
asserts the request was seen or the modal opened; T-011-N2 (only test of REQ-011.9), T-009-N4 (only
test of REQ-009.7) and T-012-N1 (only test of REQ-012.4) have the same generic anchor. Contrast
T-010-N3, anchored on "the Available row showing the Borrow icon". Everything else checked is a
strong anchor, including the 200-answering counterparts in T-001-N3, N4, N7, T-007-N1 to N5 and
T-008-N1/N2, "tables first found" in T-004-N4, and "row first reads ..." in T-004-N3 and T-006-N6.

**R2-008 | advisory | plan-correction.** The stated baseline report shape for the D and I rows is
wrong by the plan's own harness design. *Basis:* plan 1.2 "The frozen conftest files import the
application only inside fixtures" and 7.4's per-mechanism wording; if test modules do not import
`app` at top level, pytest collects every case and each errors at setup, so a case per row appears
in `db.xml` and `integration.xml` rather than a module collection error. The U rows do give
collection errors. Every row stays `fails` either way; the cells should say "no passing case".

**R2-009 | advisory | plan-correction.** Three same-item pairs are missing from the concurrency
table and therefore from the tests: borrow/restore from Out of service, return/mark from On loan,
and return/restore. *Basis:* the blueprint rubric's "Every place two users can act on the same
object at once"; plan 5.3 mirrors the table. Either say the table is illustrative and the lock rule
governs, or list the three. No new product scope is involved.

**R2-010 | advisory | plan-correction.** The frozen harness has no owning story. *Basis:* plan 7.4
lists `harness/api/requirements-eval.txt` and `harness/api/pytest.ini`, gating all pytest steps,
which is S1 and S2; no `harness/` path appears under any story's "Owns" in 8.1.

**R2-011 | advisory | blueprint-change.** The pinned malformed-identity set includes values no real
HTTP server can deliver. *Basis:* blueprint 5.1 tests "the raw value with no trimming" and includes
`" 1"` and `"1 "`; T-001-N7 tests a leading and a trailing space; through uvicorn or nginx those
arrive as `1` (RFC 9110 5.5), so the two cases are observable in-process only, although 5.1 says
the rule holds for every method and path.

**R2-012 | advisory | blueprint-change.** The client's trimming and length counting are not pinned
although the server's are, so a client measuring UTF-16 units would reject a valid 100-code-point
name. *Basis:* blueprint 7 and DD-18 count Unicode code points server side; DD-06 has the client
check "over 100 characters after trimming"; 12.7 pins only `{"name": "<trimmed name>"}`; REQ-009.12
forbids rejecting a name of 100 characters or fewer; non-BMP is tested only at the server.

**R2-013 | advisory | user-decision.** Show empty list "holds", yet REQ-013.8 shows an admin the
Add field in that view, and an Add there is a real server call. *Basis:* D-21's "holds until the
acting user changes or Show loading is activated"; REQ-013.8; REQ-009.2 and REQ-012.11's "the added
item appears". This is a gap in the user's own decisions, not a drafting slip.

**R2-014 | advisory | blueprint-change.** Client-side Add validation: PRD 2.5 and the blueprint
disagree, and the rule four frozen tests depend on sits outside section 12. *Basis:* PRD 2.5 lists
the mockup validating the Add field without a server call as a mockup-versus-build difference,
while DD-06 has the client check the name and send nothing when it fails; T-009-N1, N2, N3 and N11
assert "no add call was recorded"; section 12.1 says everything not pinned there is the builder's
choice.

**R2-015 | advisory | user-decision.** The PRD has no failure criteria for an admin Borrow's
borrower field or an unknown item, and the design defaults the frozen tests rest on have no user
decider. *Basis:* the PRD rubric's rule on missing, malformed and unauthorized input; REQ-004 has
none for an absent or unknown `borrowerId` and no requirement has one for an unknown item; the
blueprint covers them in DD-02 and DD-05; plan 9.4 "They appear only as anchors or in the
concurrency rows"; DD-01 to DD-08, DD-10 and DD-12 to DD-20 are "decided by this blueprint's
drafter", and frozen tests depend on DD-02, DD-05, DD-06, DD-07, DD-08, DD-10, DD-17, DD-18 and
DD-19. User acceptance at gate 6 would settle all of them. Several section 10.1 rows cite
`technical-rev41.md` as the recorded default, which the checker could not verify because it was not
an input.

**R2-016 | advisory | plan-correction.** T-014-N1 has an undefinable Then: "none shows a visible
text caption beside or instead of its icon". The status badge and row name sit beside every row
icon and `btn-add` sits beside the "Add equipment" heading; "beside" is not operationalised, while
T-014-P1's "no text node" already carries the observable form.

**R2-017 | advisory | plan-correction.** PRD section 2.5's closed list of mockup differences is
incomplete: it omits the mockup's validation message rendering above the list rather than by the
Add field, Show empty list emptying the data permanently, the "No equipment yet." full stop and
admin hint, and "You do not have permission to do that." The blueprint records the last two in
12.9.

**R2-018 | advisory | plan-correction.** Commands C8 and C9 are unproven because the frozen tools
live outside `web/`. *Basis:* plan section 2 item 4 admits it; with `--root web`, tests importing
`@testing-library/react` or `@playwright/test` do not resolve to `harness/web/node_modules` by
default. Stays advisory until the harness is built.

**R2-019 | advisory | user-decision.** REQ-017.3 and REQ-017.4 are worded as "sent", which the plan
itself records as unobservable. *Basis:* the PRD's "No reminder is sent or shown" and "No
notification is sent or shown"; plan section 10 "'Sent' cannot be observed from the interface"; the
plan tests a structural reading in T-017-N1, N6 and N7 and the PRD was not reworded. The user
should confirm the structural reading.

## Per-artifact verdicts

**PRD.** Numbering: REQ-001 to REQ-017 once each, no holes, every labelled criterion under one
requirement, no numbering blocker. Unobservable criteria: REQ-004.10 and REQ-006.7 ("No record
kept ..."), plus advisory REQ-017.3 and REQ-017.4 ("sent"). Undefined terms: "record"; "Add loader"
and "State demos" partly defined by closed questions. The PRD carries all 20 acceptance criteria of
rev 14; bundling is recorded in 5.1; no criterion originates outside the confirmed scope, D-01 to
D-19 or the mockup; D-20 to D-23 are absent. Per requirement, every one traces to a user statement;
criteria are observable except REQ-004.10, REQ-006.7 and the two advisory "sent" criteria; role
prohibitions are present wherever applicable; input-failure criteria are present except REQ-004's
borrower field and the unknown item.

**Blueprint.** Requirement ID originating here: none found. Requirements placed exactly once: none
found missing or doubled. Criteria with no register row: none found. Rows whose evidence is an
agent's claim: none found, though the REQ-004.10 row is self-contradictory and the two review rows
have no pass condition. Requirements accepting input with no failure behaviour: none found in the
blueprint; the gap is in the PRD. Shared objects with no concurrency answer: none found, with three
pairs unenumerated. Decisions with no decider: none found, though DD-09, DD-11 and DD-13 name a
stale decider and seventeen others rest on the drafter. Configuration, data, security controls and
production exclusions are present and consistent; 5.4 has the internal contradiction above.

**Eval plan.** Requirements missing a P or an N: none found. Tests with no or an unknown
requirement: none found. Criteria absent from tests and gaps: none found among the 158, though
decided behaviours that are not criteria are unverified. Register rows with no test: none found,
except the `NFR-4 manifest` case. Tests with no owner: none found. Tests with no state value: none
found, with the D and I wording imprecise. Overlapping story scope: none found between stories; the
harness has no owner. Tests depending on a later story's files: none found. Gaps and untestable
sections: both present, with stale rows and one wording that contradicts D-23.

## Cost of each user-decision and blueprint-change finding

- **R2-006 (blocker).** Blocks one case, S3's `NFR-4 manifest`. No labelled criterion, none of the
  210 tests. Without a ruling, D-18's observable consequence has no automated check and no record.
  Options: amend the PRD to number it, drop the case and verify D-18 by a named review, or accept
  it as unproven.
- **R2-013.** Blocks no test today; if the D-21 tests R2-002 requires are added, one of them — an
  Add made from the Show-empty-list view — cannot be written. S3. REQ-009.2 and REQ-012.11 are
  undefined in that one state.
- **R2-015.** Blocks no test. The criteria for an absent or unknown borrower and an unknown item are
  only anchor-tested today (T-005-N6, T-007-N9, T-003-N2). If a design default is overturned, the
  tests under that default's "if overturned" cell change; the checker could not count them reliably.
- **R2-019.** Blocks no test. The "sent" half of REQ-017.3 and REQ-017.4 stays unobservable; the
  structural reading is tested by T-017-N1 (S3) and T-017-N6 and N7 (S2).
- **R2-011.** Blocks no test; affects two of thirteen cases in T-001-N7 and two inputs of T-001-N6.
  Testable in-process only.
- **R2-012.** Blocks no test; the client half of REQ-009.12 is untested for non-BMP names, and
  T-009-P9 would need an added case.
- **R2-014.** Blocks no test today. If the user meant server-side Add validation, T-009-N1, N2, N3
  and N11 change (4 tests, S3). If DD-06 stands, 12.7 gains one sentence.

## Cross-artifact, sequencing, ownership, mockup

Criteria to register to tests: consistent; spot checks of the blueprint's per-story table against
the plan's assignments matched for REQ-001, 003 to 011, 015, 016 and 017. One difference: the plan
puts REQ-017.5 at S2 as a supporting row, which the blueprint's table does not list. The blueprint
wants a title to begin with the criterion label; the plan puts the test ID first and says why.

Story shape: the blueprint's split and the plan's table are identical in four stories, files and
dependencies. S1, S2 and S3 can each turn their own tests green with their own files and
dependencies, subject to R2-018 for S3. S4 runs the journey, production and restraint rows after S2
and S3, and owns four review rows only a human can complete.

Sequencing: no row needs a later story's file; S3's tests need neither S1 nor S2 because the API is
mocked; the merged-candidate checks sit last in S4. Ownership: every test has one owner and files
are disjoint across stories, the exceptions being the `harness/` files and the generated `reports/`
folders.

Mockup: it demonstrates journey steps 1 to 8 and no others. Its extras are struck by D-14, D-15,
D-19 or D-21, or noted in blueprint 12.9; PRD 2.5 lists only some of them. The look values — 48px,
the 12/16/8/10px radii, blur 20px, pill 99px, the 30/40px round buttons and the font stack — match
the PRD and the tests.

## Answers to the orchestrator's specific questions

1. All 210 rows were read and about 70 checked closely across all four stories. Most check what
   they claim and the stated states are true except as noted. Misaligned: T-004-N5 and T-006-N4
   (R2-003), T-015-P9 (R2-005), T-013-P8 (R2-002), T-014-N1 (R2-016), with report-shape imprecision
   on the D and I rows (R2-008).
2. Anchors are mostly real; the weak ones are in R2-007.
3. Nothing user-visible fails to trace. Technical affordances rest on design defaults or on
   `technical-rev41.md`, which was not an input and could not be verified: `GET /api/users` (DD-07),
   the 404, 405 and 409 codes (DD-02), focus and Escape (DD-19), no polling (DD-17), id ordering
   (DD-18), and the Compose and nginx choices.
4. The contract's routes, locators and strings agree with the register and the tests. Gaps: tests
   derived from DD-06 and from DD-09/DD-11 depend on rules outside section 12, and the contract is
   silent on how a client counts characters. One inconsistency: the log wording.
5. The concurrency answers and their tests agree for the ten listed pairs; three pairs are missing.
6. The review rows cannot fail; all of them do name a record. REQ-015.4 to .6 depend on that review
   alone.
7. See the story-shape paragraph above.

## Not verified

Section 12's version lines and the commands, because nothing has been run; the harness, because it
does not exist; any claim in `technical-rev41.md`, which was not an input; the counts the
orchestrator had verified mechanically; and whether the frozen D and I modules import `app` at
module level, which decides the wording in R2-008.
