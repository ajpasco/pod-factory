# Gate-6 planning review R1: Shared Equipment Checkout (trial)

Reviewer: a `prep-checker` session started for this task, 20 October 2026, against
`docs/orchestrator/rubrics/review.md` with the verdict sections of `prd.md`, `blueprint.md` and
`eval-plan.md`. Inputs: `PRD.md`, `eval-plan.md`, `inputs/technical-rev41.md`,
`inputs/mockup-rev14.html`, `inputs/prd-rev14.md`, and the four rubrics.

**How this file came to be written by the orchestrator.** The checker could not write it: the
harness refused the subagent's file write ("Subagents should return findings as text, not write
report files"). The text below is the checker's report as delivered, with wording preserved and
only the layout normalised. The orchestrator wrote no finding of its own into this file; its own
verification and its reclassification of the resolution classes are recorded separately in
`PREPARATION-STATE.md`.

## Verdict

**16 blockers, 12 advisories (28 findings).**

- Blockers: R1-001, 004, 005, 006, 008, 009, 010, 017, 018, 019, 020, 021, 022, 023, 024, 028.
- Advisories: R1-002, 003, 007, 011, 012, 013, 014, 015, 016, 025, 026, 027.
- Blockers by resolution class, as the checker assigned them: `user-decision` 6 (R1-001, 004, 005,
  006, 010, 024); `blueprint-change` 8 (R1-017, 018, 019, 020, 021, 022, 023, 028);
  `plan-correction` 2 (R1-008, 009).

**Blockers including `user-decision` and `blueprint-change`. Stop. The user decides. No automatic
correction is permitted for a mixed set.**

Sound, so a correction pass need not reopen it: the PRD numbering (17 requirements, 111 criteria,
no holes); every requirement has a positive and a negative test; every labelled criterion is in a
test or a stated gap; story sequencing and file disjointness; test ownership; and the fact that the
Apple-look and state-demo gaps are recorded rather than guessed.

## Inputs, and one disclosure

Read in full: the five artifacts and the four rubrics. One `grep` for the word "bundl" was pointed
at the whole `prep/` folder and printed one line each from `PREPARATION-STATE.md` and from a file
under `reference/`; neither file was opened and nothing from them was used. Every finding rests on
the five artifacts and the four rubrics.

Checked directly: the PRD numbering, summed by hand to 111 criteria; all 144 test sentences in
section 3 against their bracketed criteria; the 26 blocked rows in section 4; the S1 and S2 story
lists and the section-4 totals; the mockup's markup and script against the eight journey steps.
The mechanical count in the plan's section 5.1 was not re-run.

## 1. The PRD against `rubrics/prd.md`

**Numbering: pass.** REQ-001 to REQ-017 appear once each in one width; the criteria sum to
5+5+5+6+3+5+8+5+8+7+9+8+5+5+8+3+16 = 111, each under its own requirement; no criterion sits
outside the requirements; "Retired: none" is stated.

Per requirement, with "traced" judged against `prd-rev14.md`:

| Req | Traced | Criteria observable | Role prohibitions | Input-failure cases |
|---|---|---|---|---|
| 001 | yes | yes | n/a | no criterion for a missing or unrecognised identity (G1, disclosed) |
| 002 | yes | yes | yes | n/a |
| 003 | yes | yes | yes (.5); a forced borrow naming another member is G3 | G3 open |
| 004 | yes | yes | yes | n/a |
| 005 | yes | yes | yes | yes |
| 006 | yes | yes | yes | n/a |
| 007 | partly: .3 to .5 and the code 403 are not in rev14 (R1-005) | yes | yes | yes |
| 008 | yes (.4 is a derived reading, R1-007) | yes | n/a | yes |
| 009 | yes (.6 is a derived reading, R1-007) | yes | yes | empty and whitespace yes; other malformed names are G2 |
| 010 | yes (.6 rests on G9, R1-007) | yes | yes | failure handling is G5 |
| 011 | partly: the code 409 in .8 is not in rev14 (R1-004) | yes | yes | yes |
| 012 | yes | yes | n/a | yes |
| 013 | yes | **no: .5** (R1-001) | n/a | n/a |
| 014 | partly: .4 and .5 are not in rev14 (R1-007) | yes | n/a | n/a |
| 015 | yes | **no: .2, .4, .5, .6** (R1-001) | n/a | n/a |
| 016 | yes (.3 is a derived reading, R1-007) | yes | n/a | n/a |
| 017 | yes; the second sentence of .4 goes beyond the non-goal (R1-006) | yes | n/a | n/a |

Criteria judged unobservable, quoted: REQ-013.5 "The state demos appear at the top of the page.";
REQ-015.2 "…this criterion cannot be checked until one is given (Open question G7)."; REQ-015.4
"The top bar is translucent."; REQ-015.5 "Cards have rounded corners."; REQ-015.6 "Cards have
subtle shadows."

Undefined terms used by criteria and absent from section 4: "card", "top bar", "badge", "system
font". "State demos" is defined by position only. (R1-001)

Other points: all eight required sections are present; the problem statement has no solution
language; open questions name who each waits on; bundling is not recorded (R1-002); authority lines
cite the mockup although the PRD says the mockup is not a source (R1-003); the change list is in
summary wording because rev14 holds only summaries, which the PRD discloses.

## 2. The blueprint against `rubrics/blueprint.md`

**First question: does any requirement ID originate in the blueprint? Yes.** Section 3 of
`technical-rev41.md` says "The PRD has no numbered acceptance IDs, so each REQ points to the PRD
acceptance clause it comes from", and the 17 IDs are defined in its `requirements` field. `PRD.md`
adopted them, which the PRD rubric permits, so the PRD can stand; the blueprint rubric still calls
an ID originating there a blocker. (R1-018)

| Verdict item | Result | Entry |
|---|---|---|
| Requirements placed exactly once | Exception: all 17. Each appears once in the JSON list; none is placed in a layer or phase | R1-019 |
| Criteria with no register row | All 111. The register has six rows keyed by level and REQ ranges. **REQ-017 is in none of them** | R1-020 |
| Register rows whose evidence is an agent's claim | The manual walk and the Apple-look review name no reviewer or record. No row has an evidence column | R1-020 |
| Requirements accepting input with no failure behaviour | Identity on every request: a missing or unknown `X-User-Id` has no behaviour. Section 5 is not per requirement | R1-021 |
| Shared objects with no concurrency answer | The equipment item: only borrow against borrow is answered | R1-022 |
| Decisions with no decider | All six. F-001 and F-003 cite a clause and also ask the user | R1-023 |
| Open point that blocks frozen work | F-001, Next.js or a Vite SPA | R1-024 |

Layers and one-way direction are present and sound. The data section is a real answer for "exactly
one active loan": one table, a CHECK constraint, a conditional UPDATE. Production exclusions are
listed. Thin sections: R1-026. The trial-only label obligation: R1-027. Story shape: R1-028.

## 3. The eval plan against `rubrics/eval-plan.md`

| Item | Result |
|---|---|
| Requirements missing a P or an N test | none found |
| Tests with no or an unknown requirement | none found (144 of 144 resolve) |
| Criteria absent from both tests and gaps | none found. REQ-010.6, REQ-013.5 and REQ-015.2 are in 9.1; REQ-015.3 to .8 are in the review row T-015-P2 only |
| Register rows with no test | none found against the six rows the blueprint has (see R1-020) |
| Tests with no owner | none found (S1 11, S2 29, S3 74, S4 30 = 144) |
| Tests with no state value | none found; the quality of the values is R1-008 and R1-015 |
| Overlapping story scope | none found |
| Tests depending on a later story's files | none found as files; the contract dependency is R1-017, the shared harness file R1-016 |
| Gaps and untestable sections exist | yes, sections 9 and 10 |
| Restraint tests per surface | present for eight surfaces; quality issues are R1-008, 009, 010 |

## 4. The test-level sample

All 144 sentences were read against their brackets. The large majority check what they claim,
including the REQ-004 modal rows, the REQ-012 loader and failure rows, the REQ-016 restart rows and
the e2e journey rows. Defective rows: vacuous absence assertions (R1-008); an assertion that
settles an open question (R1-009); an inventory that conflicts with the state demos (R1-010);
brackets pointing at UI criteria a rules or API test cannot check, and refusals no criterion states
(R1-011); a sentence the switcher contradicts (R1-012); exact text against the mockup (R1-014). No
row is declared `passes:`, and none that was read would pass against the plan's own baseline.

Behaviour the plan asserts that no PRD criterion states: no attribution table or column, and
exactly two tables with exactly those columns (T-017-N7, R1-009); a server refusal of Mark out of
service or Restore in the wrong state (T-010-N4, R1-011); a server rejection of an empty or
whitespace name (T-009-N5, R1-011); exactly 409 on delete of a loaned item (T-011-N4, R1-004); an
exact control inventory including Borrow on Available rows for admins (T-017-P1 and P2, R1-010 and
R1-011); and that a client-sent role header is ignored (T-007-N7, resting on REQ-007.3, R1-005).

## 5. Across the artifacts

**Criteria to the plan's tests:** 108 of 111 are in a section-3 test and 3 are in gaps; six of the
108 are review-only. Sound. **To the blueprint's register:** not met (R1-020).

**The blueprint's story shape against the plan's story table:** not met; five stories against four
(R1-028).

**The mockup against the PRD's journeys:** all eight steps are demonstrated. Behaviour the mockup
shows that the PRD lacks or contradicts: success notes after Add, Mark out of service and Restore
(R1-006); four state-demo buttons the plan's exact inventory does not allow (R1-010); switcher
options showing names only with the role in a separate pill, and member-choice buttons carrying a
name beside the icon (R1-013); text differing from the strings the plan treats as exact (R1-014). A
failed request cannot be triggered from the mockup's own controls; not raised, since the mockup is
a reference rather than a build.

## 6. Sequencing

S1 has no dependencies; S2 depends on S1; S3 depends on nothing; S4 depends on S1 to S3. All
journey, production and review rows belong to S4, the last story, so the order is sound. No story
asks for a file a later story creates, with one exception: S3's web tests are frozen against wire
shapes the blueprint says S2 publishes afterwards (R1-017). `tests/api/conftest.py` is one file
governing both S1's and S2's trees (R1-016).

## 7. Ownership

Every test has exactly one owner and every application file in the story table has exactly one
owner: none found. The frozen harness under `tests/` is owned by no story by design, which the plan
states and justifies, so it was not raised. The blueprint's own story section names no files
(R1-026).

## 8. Findings

### The PRD

**R1-001 | blocker | user-decision.** Criteria the PRD itself says cannot be checked, and criteria
relying on terms the definitions never define. The thresholds are the user's to give and none may
be invented. *Basis:* REQ-013.5 with the definitions entry "The sources give its position only;
they do not say what it contains or does"; REQ-015.2 "…cannot be checked until one is given (Open
question G7)"; REQ-015.4, .5 and .6; section 4 has no entry for card, top bar, badge or system
font; the plan's section 10 agrees ("System font is not defined").

**R1-002 | advisory | plan-correction.** The IDs were adopted from another artifact and several
requirements bundle more than one capability; the rubric says to record the bundling, and the PRD
does not. *Basis:* the rubric's wording; the PRD records the adoption and nothing about bundling;
titles REQ-012, REQ-014, REQ-015, plus REQ-010, REQ-013, REQ-016, REQ-007 and REQ-017.

**R1-003 | advisory | plan-correction.** Provenance statements disagree, and the change list is not
in the user's words. *Basis:* REQ-014's authority cites "mockup button title/aria-label
attributes" and REQ-015's cites "mockup .row height:48px", while G7 says "the mockup is not among
the sources of this PRD"; section 9 says "not the user's verbatim words"; the rubric asks for the
user's words.

### Scope that arrived by inference, traced against `prd-rev14.md`

**R1-004 | blocker | user-decision.** REQ-011.8 makes "rejected by the server with 409" a
criterion and the plan freezes exactly 409, although the blueprint's F-004 calls the code a builder
proposal "not promoted to scope" and rev14 has no HTTP code at all. The plan treats the
borrow-rejection codes as an open gap (G8) but freezes this one. *Basis:* REQ-011.8; the
definitions' "The sources name 403 … and 409"; rev14 contains neither string; F-004 and the
blueprint's section 11; T-011-N4 "then the answer is 409" and T-011-N5.

**R1-005 | blocker | user-decision.** REQ-007.3, .4 and .5 extend the user's criterion, which
names two forced actions, and presuppose that Add, Mark out of service and Restore are server calls
— which the blueprint (F-003) and the PRD (G5) leave open. Six tests and the API operation list are
frozen on it. *Basis:* the PRD's own source note; rev14's criterion; F-003; G5; tests T-007-N3, N4,
N5, N7, P4 and T-017-N6.

**R1-006 | blocker | user-decision.** REQ-017.4 turns the non-goal "notifications" into "the
specified modals and row states are the only messages", while the mockup shows success notes after
Add, Mark out of service and Restore and no change round records the user removing them. The frozen
restraint test T-017-N1 would fail a build that follows the mockup. *Basis:* REQ-017.4; rev14's
non-goals "reminders, notifications"; T-017-N1; the mockup's `note(...)` calls; F-003; rev14 forbids
a success banner for Borrow, Return and Delete only.

**R1-007 | advisory | user-decision.** Further criteria with no source in rev14, each a reasonable
reading but none the user's statement; they should be accepted or struck before the tests resting
on them are frozen. *Basis:* REQ-014.4 "role alertdialog" and REQ-014.5 keyboard operation (the
source note says they appear only in the rev-41 description); REQ-009.6 whitespace; REQ-010.6
carried both as a criterion and as G9 "Confirm or correct", with T-010-P4 and T-010-P6 bracketed
"[no labelled criterion]"; REQ-016.3 idempotent seed; REQ-008.4 simultaneous borrows; the
server-level rejections in REQ-005.3, REQ-008.2 and REQ-008.3.

### The eval plan's tests

**R1-008 | blocker | plan-correction.** The plan claims no absence assertion can pass without the
feature; as worded, several can. Their sentences contain no positive anchor, so a stub `App` that
renders nothing passes them, and they fail at the baseline only because `web/src/App.jsx` is
missing. A frozen test that is green with nothing built protects nothing. Rows: T-001-N1, T-002-N1,
T-009-N4, T-010-N1, N2, N3, T-011-N1, N2, T-013-N1, T-017-N2. API rows T-005-N3, T-008-N1, T-008-N2
and T-009-N5 assert only "not 200", which a missing route (404) or a crash (500) also satisfies.
*Basis:* the plan's 1.2 claim; the rows' state values; the quoted sentences, none of which says the
rows, list or controls were found.

**R1-009 | blocker | plan-correction.** T-017-N7 settles open question Q1 while the plan says none
of the questions "is answered or guessed here", and it pins exactly two tables with exact columns,
which no criterion states. *Basis:* T-017-N7's sentence; T-006-N4 "…as the answer to Q1 says".

**R1-010 | blocker | user-decision.** T-017-P1 and T-017-P2 require that "no other control exists",
while REQ-013.5 requires state demos at the top and the mockup's demos are four buttons. If the
demos contain controls, the frozen inventory fails. G4 must be answered, or the demo area carved
out of the inventory, before a freeze. *Basis:* T-017-P1; the plan's section 2 row 5 "The state
demos have no locator at all (G4)"; G4; the mockup's `<div class="demo">` with four titled buttons.

**R1-011 | advisory | plan-correction.** Several rules-level and API-level tests are bracketed to UI
criteria they cannot check, so the coverage table counts them; each such criterion also has a real
covering test. T-010-N4 and T-009-N5 additionally assert refusals no criterion states. *Basis:*
T-003-P6, T-004-P6, T-006-P6, T-010-P8, T-011-P6, T-006-N2, T-010-N4, each a "when the rules
decide" sentence bracketed to an icon or row criterion; the plan's 9.5 concession.

**R1-012 | advisory | plan-correction.** T-003-N1 asserts that a member has "no control for
choosing a person"; the switcher is such a control. *Basis:* T-003-N1; REQ-001.1.

**R1-013 | advisory | user-decision.** The mockup and the plan read two criteria differently:
REQ-001.2 and T-001-P1 require each switcher entry to show its role, while the mockup's options
show names only; REQ-014.1 says every button is an icon, the plan limits it to eleven named
buttons, and the mockup's member-choice buttons show a name beside the icon. *Basis:* REQ-001.2;
the mockup's `o.textContent=x.n` with a separate role span; REQ-014.1; the plan's section 10; the
mockup's `e.innerHTML=ic("user")+x.n`.

**R1-014 | advisory | plan-correction.** The plan makes PRD strings exact while the mockup shows
longer text, so a build copying the mockup fails; the plan should say exact or contains. *Basis:*
the plan's 1.1; T-007-P1 against the mockup's "You do not have permission to do that."; T-013-P2
against "No equipment yet. Add the first item above."

**R1-015 | advisory | plan-correction.** The declared state before the build cannot be read per row
from the plan's own commands: a collection or import error yields one error per module rather than
a result per test, yet 114 rows are "fails: collection error" and 7.2 says each test's outcome is
read from the reports; and the 30 S4 rows are "cannot run" although 7.2 runs every step regardless
and C9 can start from the frozen harness. *Basis:* the plan's 7.2 and its 1.2 definition.

**R1-016 | advisory | plan-correction.** S1's unit tests and S2's integration tests share one
`conftest.py`; the plan does not say the unit tree is free of fixtures that import `app.main` or
need `DATABASE_URL`, and C4 runs before `DATABASE_URL` is exported. *Basis:* the plan's 7.4, the
command order, and its 8.3 claim.

### Freeze readiness

**R1-017 | blocker | blueprint-change.** Frozen tests need interfaces no approved artifact defines.
The blueprint says S2 publishes the contract, after the web tests must be frozen; the plan lists
nine such items and says it cannot satisfy them. Until they are pinned, the fake server, 11 S1
tests, 29 S2 tests and the locators cannot be coded, and whoever pins them overrides the
blueprint's allocation of the contract to S2 and of names to the builder. *Basis:* the plan's
section 2 rows 1, 2, 3 and 5; its section 12 "not satisfiable from the inputs"; its S3 dependency
line; the blueprint's sections 9 and 10.

### The blueprint

**R1-018 | blocker | blueprint-change.** The requirement IDs originate in the blueprint's
requirements list; the PRD adopted them, which its rubric permits, but the blueprint still says the
PRD has no IDs and cites no PRD-owned criterion ID. *Basis:* the blueprint's section 3; its JSON
IDs; the PRD's adoption notes.

**R1-019 | blocker | blueprint-change.** No requirement is placed in a layer or phase; all 17 are
exceptions. *Basis:* the blueprint's section 3 wording, its "Check | Level | REQs" table, and
section 2, which names the layers and maps no requirement to either.

**R1-020 | blocker | blueprint-change.** The register is not one row per acceptance criterion and
has no evidence column; none of the 111 criteria has a row, REQ-017 appears in no row, and the
manual rows name no reviewer or record. *Basis:* the six-row table; REQ-017's absence from all of
them and from the `testability` decision; "Apple-style look compared with the mockup | manual
review, with screenshots"; section 4's manual walk; the plan's 5.2, which maps only the six rows
and so cannot notice REQ-017 is missing.

**R1-021 | blocker | blueprint-change.** No behaviour is given for a missing or unknown identity
header although every acting requirement accepts identity; section 5 is not per requirement, and
the gap is not among the blueprint's open points even though the PRD lists it as G1 and two plan
tests are blocked on it. *Basis:* section 5's wording and error list; section 11's omission;
T-001-N3 and N4.

**R1-022 | blocker | blueprint-change.** No concurrency section; only borrow against borrow is
answered, and return against return, delete against borrow, mark against borrow and restore against
delete rest on the phrase "atomic conditional updates". *Basis:* section 2's `db.py` line and the
borrow rationale; the rubric's "Silence here is a blocker when the PRD has shared objects."

**R1-023 | blocker | blueprint-change.** No decision records who decided, and two decisions cite a
clause and also ask the user, which the rubric rejects. *Basis:* the six `decisions` entries carry
only topic, decision and rationale; F-001 and F-003 each cite a basis and say "The user should
confirm."

**R1-024 | blocker | user-decision.** F-001 (Next.js or a Vite SPA) is unanswered and the frozen
plan is built on one side of it: S3 owns `web/vite.config.js`, C7 calls Vitest, S4 owns the nginx
build. If the user's preference stands, those files and commands change after the freeze, and the
"preference text" F-001 cites is not in rev14, so what the user chose cannot be checked from the
inputs. *Basis:* F-001; section 11; the rubric's "Where the user chose, the choice is
authoritative"; the plan's 8.1.

**R1-025 | advisory | blueprint-change.** The blueprint's two statements of what each tool covers
disagree, one command it relies on is unpinned by the plan, and it does not say the build
environment has the tools its mechanisms need. *Basis:* the table row against the testability
decision for pytest and for Vitest; the docker decision's pytest command against the plan's 7.3
"Not pinned"; the plan's 7.1 "Must be installed; the plan does not install it".

**R1-026 | advisory | blueprint-change.** Three required sections are thin: fit, configuration
defaults and required-at-start flags, and file ownership in the stories section. *Basis:* section 1
has no sentence on why the stack suits this PRD; section 6 lists six settings with no default or
required flag; section 9 lists S1 to S5 by deliverable and names no files.

**R1-027 | advisory | user-decision.** The blueprint's security controls and its "planned review"
have no test or review row in the plan, and its "must be labelled as trial-only" adds a possible
interface obligation that conflicts with REQ-017.4. The user should accept them as unproven or ask
for a PRD change. *Basis:* section 5's "Currently enforced automatically: nothing yet."; the plan's
9.4, including "A label shown in the interface would conflict with REQ-017.4"; there is no 422 test
and no security review row.

### Across the artifacts

**R1-028 | blocker | blueprint-change.** The blueprint's story shape and the plan's story table do
not match. The plan says the blueprint's split fails the disjoint-scope rule and its reasoning may
be right, but the blueprint is the approved shape and changing it needs an amendment. The merged
web story carries 74 of 144 tests across REQ-001 to REQ-014 and REQ-017, which the rubric says to
justify against "If its test list spans unrelated requirements, split it", and the plan also moves
the seed tests from S1 to S2. *Basis:* the blueprint's section 9; the plan's 8.2, including
"Blueprint to this plan: S1 is S1; S2 is S2; S3 and S4 are S3; S5 is S4" and item 4; review.md's
cross-artifact check.
