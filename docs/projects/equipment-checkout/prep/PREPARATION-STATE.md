# Preparation state: Shared Equipment Checkout (trial)

- **Project:** equipment-checkout
- **Runtime:** claude-code (orchestrator in this session; drafters and checkers as subagents)
- **Current step:** 6 of 6, **accepted**
- **Status:** **gate 6 accepted by the user on 20 October 2026.** The preparation is complete and is the
  plan to build against. Nothing is frozen and nothing has been executed. The earlier status note
  about amending the PRD, then the blueprint, then the eval plan after the user's decisions is
  superseded: those amendments were made, reviewed twice more in fresh sessions and re-checked once,
  and every finding is closed.
- **Updated:** 20 October 2026, America/New_York
- **Upstream source:** preparation `prep-6d5b5ff8b0fc9079f93b50d7` revision 62, phase planning-complete.
  Nothing in that service was changed by this run; the inputs were copied and hashed.

## Gate log

| Gate | Passed | By what evidence | Notes |
|---|---|---|---|
| 1 Your idea | yes | `inputs/prd-rev14.md` "Confirmed scope (citations)": every line cites an idea, answer or feedback round | Scope restated and confirmed by the user through 13 feedback rounds |
| 2 Clarify the scope | with findings | one material question asked and answered (identity switcher); 13 feedback rounds recorded | F-G2-1 below: three product questions carry model-written assumptions the user never answered |
| 3 PRD and mockup | amended, verified | `inputs/prd-rev14.md` has 20 acceptance criteria but no numbered requirements; mockup source read by the orchestrator | Requirement IDs exist in the blueprint instead of the PRD — inverted traceability. Being corrected now (drafter, `PRD.md`). The mockup does demonstrate journey steps 1-8, the members-only borrower picker, both modals, the row loaders, the confirm-delete and the inline validation, and every button carries a title and an accessible label — checked in the mockup source, not taken from a summary. One conflict found: F-G3-1 |
| 4 Technical blueprint | rewritten, verified | `inputs/technical-rev41.md` reviewed against `rubrics/blueprint.md` | F-G4-1 and F-G4-2 below are blockers; F-G4-3 is an advisory |
| 5 Evals and stories | revision 5, verified | 144 runnable tests (79 P, 65 N) + 26 blocked; verified by the orchestrator: no duplicate or malformed IDs, every REQ has a P and an N among runnable rows, every row carries a state (114 fails, 30 cannot run, 0 passes), all 111 criteria in a test or the gaps, 4 stories with disjoint scope and no row needing a later story's files | Acceptance waits on gate 3's remaining answers |
| 6 Planning review | **accepted by the user, 20 October 2026** | `findings-R1.md` 16 blockers and 12 advisories → `findings-R2.md` 6 blockers → `findings-R3.md` 0 blockers and 10 advisories → `findings-RC1.md` 0 blockers and 6 advisories, all closed and verified | Three reviews and one focused re-check, each in a session blind to the one before it. Acceptance is the user taking this plan as the thing to build against. It is **not** a freeze, **not** a factory approval and **not** a builder dispatch |

## Artifacts

| Artifact | Path | SHA-256 | Revision | Valid |
|---|---|---|---|---|
| PRD (input) | `inputs/prd-rev14.md` | `dfb6aabb4008c508b047374164b28515985577aac47524bb6dd1f66fa73e28b6` | 14 | yes |
| Mockup (input) | `inputs/mockup-rev14.html` | `56ff8d50660cf6bbf649a801953bf24589a3cee47dd971321d1ca702c1ab4b31` | 14 | yes |
| Blueprint | `TECH-SPEC.md` | `79d440ee8ad777965dd9af0ab03dd68a4eb190fe6559286f7357a34eef5ee6cd` | 7 | yes |
| Blueprint (earlier, input) | `inputs/technical-rev41.md` | `1eabe4839ad844f2234d0d3402e2cb1cc69874a95470f05fa7e75e217a1fd5ee` | 41 | yes |
| Requirements extract | `inputs/requirements-rev41.json` | `4f56f5092ec511c7eb73c6a2ade99e74af61a6c99100c0052a5232e536a8b434` | from rev 41 | yes |
| PRD | `PRD.md` | `df48931e09ca1762cccb0c437cd1b5a12a99bdd6bd6e01889bf6ceac727c63c6` | 6 | yes |
| Eval plan and stories | `eval-plan.md` | `2ae73498b21e8cf7703b4fa2908a38244f18610256112b97f13e1e49ed8d99cc` | 5 | amended after acceptance, see below |
| Review findings R3 | `findings-R3.md` | `185bfe420ac7ca410ec351756d615228fadfcabfd3ae8371485b06d2d7148383` | R3 | yes |
| Review findings R2 | `findings-R2.md` | `1af3e072b39de72cca348edfa57d9eb45b3bcdfa779b2b1de308656882869e8d` | R2 | yes |
| Review findings R1 | `findings-R1.md` | `0ae1db89f985aaa912bca0087f48c4463e785773299b477b550b0e2fc9257862` | R1 | yes |

Reference only, **not** a drafter input: `reference/build-plan-rev59.md`
(`3e53f200549e6669de862a902f353bf71361595af8cad4cd79d1514edebdec37`). It is the service's own
rev-59 plan, kept so the new eval plan can be compared against it afterwards for coverage.

## Open questions

**All closed on 20 October 2026** by the user's "accept all", recorded verbatim in
`inputs/decisions-20261020.md`
as D-01 to D-19. That round hashed
`5af9aff1530a0966657f0ea641e6ceff321dcae0e6a10c4bd9c09542ea1ba386`; the file was extended twice
afterwards and now holds D-01 to D-27 at
`59460dc71ecfb62e71ba521d709e9deb6fb3f1ede410ef8576e1a1de93345210`.

| Closed | Was | Closed by |
|---|---|---|
| Q1 | Attribution of an admin return or admin-set loan | D-09: none |
| Q2 | May a member hold several items | D-05: yes, no limit |
| Q3 | Duplicate equipment names | D-10: allowed |
| G1 | Missing or unknown acting identity | D-01: 403, no body; switcher and no list before a user is picked |
| G2 | Over-long names | D-06: 100-character cap, 422, inline message |
| G3 | A member naming another borrower | D-07: 403 and the Access denied modal |
| G4 | The state demos | D-16: they ship, exempt by name from the control inventory |
| G5 | Failure and loader for Add, Mark, Restore | D-02: server calls, same treatment as the other three |
| G6 | The loader on a non-200 | D-08: removed, then the modal |
| G7 | Reference values for the look | D-17: the mockup is the reference; comparison review, not thresholds |
| G8 | Two rejection codes | D-03: 422 and 409 |
| G9 | Status after Restore | D-04: Available |
| B1 | Next.js or a plain SPA | D-18: plain React SPA with Vite |
| B2 | Name cap and the delete code | D-06 and D-11 |

## Findings carried into gate 6

| ID | Severity | Resolution class | What it is |
|---|---|---|---|
| F-G2-1 | blocker | user-decision | Q1 to Q3 carry assumptions written by the model ("Assumed yes", "Assumed no history"), not answers from the user. An assumption may not become a requirement or a test. |
| F-G3-1 | blocker | user-decision | The PRD says the list changes only after a 200 with no success banner, but the mockup changes out-of-service and restore immediately and shows a transient note. Either the two actions are excepted, or the mockup is wrong. Blueprint F-003 raises the same point and leaves it open. |
| F-G4-1 | closed | — | Closed by the rewrite: `TECH-SPEC.md` section 4 has 158 rows, one per criterion, each naming its mechanism and the report it writes. Verified by the orchestrator. |
| F-G4-2 | closed | — | Closed by D-18: a plain React single-page application built with Vite. |
| F-G4-3 | closed | — | Closed by the rewrite: section 8 answers twelve concurrent pairs, each with the HTTP answer the loser gets, verified two ways plus a threaded test. |

## Orchestrator errors, recorded

- **E1 (19 October 2026).** I gave the gate-3 PRD drafter only `prd-rev14.md` and
  `requirements-rev41.json`, and withheld `mockup-rev14.html`, although the mockup is an approved
  upstream artifact and a legitimate source. Two of the drafter's nine gaps follow from that
  choice rather than from silence in the sources:
  - **G7 reference values.** The mockup sets `.row { height: 48px; overflow: hidden }`, and carries
    the look values the PRD calls unthresholded: `backdrop-filter: blur(20px)` for the top bar and
    radii of 8 to 16px for cards and 50% / 99px for round buttons and pill badges. The drafter was
    right to refuse the 48px figure it could not see; the fix is mine, not a question for the user.
  - **G4 state demos.** The mockup contains exactly four demo controls, labelled Show loading, Show
    empty list, Show API failure and Show access denied. That settles what they contain. Whether
    they ship in the built application is still the user's call.
  - Correction: the mockup becomes a cited source of the PRD, G7 and the content half of G4 are
    resolved from it by a bounded amendment at gate 3, and the remaining gaps go to the user.

- **E2 (19 October 2026).** I listed the blueprint's two open points as "Q4" and "Q5" among the
  PRD's open questions in this file, and repeated it in the gate-5 brief. The eval-plan drafter
  reported that the PRD has no Q4 or Q5. Corrected above: they are B1 and B2.

## What the orchestrator verified of review R1

Checked against the artifacts rather than taken from the checker's report:

- **R1-004 holds.** `inputs/prd-rev14.md` contains neither "403" nor "409" anywhere, so REQ-011.8's
  409 is inferred and `T-011-N4` freezes it.
- **R1-008 holds, and it is the most consequential finding.** `T-009-N4` ("no Add field and no Add
  icon exists") and `T-010-N1` ("no On loan row and no Out of service row shows a Mark out of
  service icon") carry no positive anchor: a stub application that renders nothing satisfies both.
  The gate-5 drafter's claim that "no honest vacuous pass was found" is wrong.
- **R1-009 holds.** `T-017-N7` asserts the schema holds only two tables with exactly those columns
  and that a returned item keeps no borrower, which answers Q1, while the plan says Q1 is open.
- **R1-010 holds.** `T-017-P1` enumerates every interactive element, modals included, and requires
  that no other control exists; the mockup's four state demos are controls.
- **R1-020 holds.** The blueprint's register has six rows covering 001-016 and 015; REQ-017 appears
  in none of them.
- Not re-verified: the plan's mechanical coverage count, which the orchestrator had already checked
  independently before the review, and the per-sentence reading of all 144 rows.

## Resolution classes, as the orchestrator reclassified them

The checker marked eight blockers `blueprint-change`. Six of those do not change the chosen
technical approach at all — they are the blueprint document failing its rubric — so they are
`plan-correction` work the orchestrator absorbs rather than user decisions:

- `plan-correction` (orchestrator, one pass after the user answers): R1-008, R1-009, R1-011,
  R1-012, R1-014, R1-015, R1-016, R1-002, R1-003, and the blueprint rewrite covering R1-018,
  R1-019, R1-020, R1-021, R1-022, R1-023, R1-025, R1-026, R1-028 and the interface pinning in
  R1-017. The stack, the layers, the data model and the commands are untouched by all of it.
- `user-decision` (escalated): R1-001, R1-004, R1-005, R1-006, R1-007, R1-010, R1-013, R1-024,
  R1-027, together with the gaps G1 to G9, the questions Q1 to Q3 and the blueprint points B1 and
  B2 already recorded above.

## Gate 3, amendment 2: what the orchestrator verified

Checked against the file, not taken from the drafter's report: 17 requirement headings in order
with no duplicates; **no existing criterion renumbered** (every old number 1..n still present and
the numbering contiguous); 111 criteria grown to 158; all nineteen decisions D-01 to D-19 cited;
NFR-1 to NFR-5 present; section 8 lists the twelve closed items; no "cannot be checked" and no
"working assumption" anywhere in the file; `PRD.md` the only file changed.

Dispositions of the drafter's judgement calls, by the orchestrator:

- **Absorbed, no user decision needed.** N2, the apparent overlap between D-03 and D-07, is not an
  overlap: both decisions key the answer to the requester, which is what the drafter already
  encoded (422 when an admin names an admin, 403 when a member names anyone but themselves). N2 is
  struck. The mockup's "Mockup only - sample data, nothing is saved." banner is a trial-only label,
  so D-19 excludes it; the drafter's reading stands. The Access denied wording stays as the PRD
  gives it, and the eval plan will match on "contains" rather than equality.
- **Escalated, small.** N1, where the Add loader is shown, since an Add has no row until the
  response arrives. N3, whether a state demo may change stored data and whether its state ends by
  itself; the mockup's loading demo ends after 900ms and its empty demo clears the list until
  reload, and D-16 is silent.

## Gate 4, the rewrite: what the orchestrator verified

- 158 register rows against the PRD's 158 criteria: one row each, none duplicated, none missing,
  every row naming a mechanism and the report or review record it produces.
- All seventeen requirements placed exactly once (four in the API layer, twelve in the web layer,
  REQ-017 in the integration phase). The two apparent second mentions are a prose note and the
  document's own arithmetic check, not a second placement.
- The interface contract exists and is specific: eight routes with every status code, the identity
  header with "malformed" defined by a regex, the JSON shapes, the Python module and callable
  names with signatures, the ASGI import path, about thirty `data-testid` locators, the exact
  on-screen strings, and version lines — with the statement that a builder may not change them.
- Twenty design defaults, each with its reason and what changes if it is overturned.

Consequences of the user's own decisions, recorded for awareness rather than as questions:

- **DD-07.** D-01 forbids answering any request without an identity, so the switcher cannot be
  filled from `GET /api/users` before a user is picked. The three entries are a client constant,
  and the journey test for REQ-001.1 checks that constant equals what the API returns.
- **DD-04.** For the same reason there is no CORS pre-flight, no documentation route and no health
  route; the Compose health check calls `GET /api/users` as user 1. The earlier blueprint's CORS
  control is dropped because nginx makes the API same-origin.

## Review R2, and the orchestrator's own failure

R2 returned 19 findings: 6 blockers (five `plan-correction`, one `user-decision`) and 13
advisories. Verified against the artifacts by the orchestrator, not taken from the report:

- **R2-001 holds.** Fourteen stale references to the closed questions survive: seven in `PRD.md`,
  five in `eval-plan.md`, two in `TECH-SPEC.md`, including two PRD definitions that define a term
  by pointing at a question that is closed.
- **R2-003 holds.** `TECH-SPEC.md` line 472 still reads "the earlier blueprint logged the user id;
  this one does not", four lines below the amendment that says the opposite.
- **R2-005 holds.** The register row for REQ-015.8 and `T-015-P9` both say "in rows and in modals",
  while the PRD's definition counts fifteen icon buttons; the Add icon and the four demo controls
  are never measured.
- **R2-004 holds.** The review rows record "matches" or "does not match" with no stated pass
  condition, and REQ-015.4 to .6 rest on them alone.

**Three of these are the orchestrator's own doing, and they are recorded as errors, not as
drafter defects:**

- **E3.** The mechanical amendments of D-20 to D-23 were applied to the sections the decisions
  named and nowhere else. The sweep that followed searched for "waiting on the user", "still with
  the user" and "the blueprint omits", and so missed "Open question N1", "open (PRD N1)" and "PRD
  points still open". A mechanical amendment must be followed by a sweep for every phrasing of the
  thing it closed, not for the phrases the orchestrator happened to think of.
- **E4.** The orchestrator told the user that three of the four decisions "confirm the blueprint's
  defaults, so nothing in the running pass changes". That was wrong. An accepted decision is scope:
  it needs a criterion, a register row and a test, whether or not it matches a default. Eight
  decided behaviours therefore have no test at all (R2-002).
- **E5.** The orchestrator's own edit created the contradiction in R2-003: it put the acting user id
  into the log form asserted by two tests that are bracketed to criteria saying no record names the
  admin, and it did not define "record" or exclude the access log from it.

Lesson for the definition: a mechanical amendment is only mechanical in the sentences it changes.
Everything downstream of it — the definitions, the change list, the register, the tests — is
drafting work, and the orchestrator must dispatch it rather than assume a decision that matches a
default costs nothing.

## The product owner's ruling of 20 October 2026, and what it changed

> "The tech related work should be part of the Tech Spec, so the eval or test cases shouldn't verify
> those. We really care more about the business requirements and the feature is 100% delivered."

Measured before acting: 22 of 210 test rows asserted only a technical fact, another 22 asserted a
code alongside a visible outcome, and 16 PRD criteria named an HTTP code. A bounded correction, not
a rewrite.

Written into the rubrics so it holds for every project: a criterion states a business outcome and
never a technical choice (`rubrics/prd.md`); the technical work is recorded in the blueprint and no
acceptance test verifies it (`rubrics/blueprint.md`); a test may use any surface to observe an
outcome but its assertion must be something a business requirement claims, with an explicit
never-assert list — status codes, schemas, log formats, names, whether a call was made, library or
build-tool presence (`rubrics/eval-plan.md`); and matching exit conditions at gates 4 and 5
(`ORCHESTRATOR.md`).

**Gate 3, revision 4, verified by the orchestrator:** 17 requirements in order, no existing
criterion renumbered, 158 criteria grown to 173, and **no criterion line names a status code**.
"Record" is defined as stored product data with the operational log outside it, which dissolves the
contradiction the orchestrator had created (E5). Fifteen new criteria carry the behaviours D-20 to
D-23 decided, which previously had no criterion and therefore no test (R2-002). The drafter listed
roughly thirty phrasings it swept for, which is the discipline the orchestrator failed at in E3.

**Gate 4, revision 3, verified by the orchestrator:** 173 register rows, one per criterion, none
naming a code; a status-code ledger SC-01 to SC-15 tracing every code from the user's decision to
the route that answers it, so none is orphaned; the self-contradiction in 5.4 gone; pass conditions
for both review rows, so a review can now fail; 19 concurrency rows plus an explicit statement that
the table is illustrative and the row-lock rule governs every pair; the stack-manifest case removed
and recorded as removed; section 11 holding one open question, N4.

**One override by the orchestrator, to be carried into the next blueprint touch.** The blueprint's
section 4.1.1 lets an API-level test recognise a refusal by its status code, calling the code an
instrument rather than the thing verified. That is not the ruling: an API row asserts that the
action did not happen and nothing changed, and the difference a person sees between a refusal and a
rejection is the Access denied modal against the API failure modal, verified where it is
observable. The eval pass is drafting to the strict reading; the blueprint's sentence still needs
correcting.

**Still open: N4** — whether an Add made from the Show-empty-list demo view performs the Add and
ends the demo. The orchestrator's recommendation is that it does. No test may depend on it.

## Gate 5, revision 3: what the orchestrator verified

Against section 3 of the file: **237 rows**, every ID distinct, 123 positive and 114 negative; 233
expected to fail and 4 unable to run, **none claiming to pass**; stories S1 17, S2 55, S3 135, S4
30, summing to 237; all seventeen requirements carrying a runnable positive **and** a runnable
negative test; all 173 criteria cited in a test row with none left to the gaps; no bracket citing
another requirement's criterion; the frozen harness owned (`harness/api` to S1, `harness/web` to
S3, `harness/e2e` to S4); and **no Then clause naming a status code**.

The 22 technical-only rows are resolved: eight API rows and four rules rows now assert confirmed or
not-confirmed with nothing changed; the three data-store rows assert that no stored value names the
actor, under the PRD's definition of Record, without reading the log or naming a table; the five
"no call was made" rows assert that no item was created, or that no link, frame or form reaches
another address. Four rows are retired rather than reworded — two schema assertions whose outcome
the attribution rows now carry, the route-inventory test, and the Compose service list — and their
IDs are not reused. Thirty-six API rows and twelve component rows kept their outcome and lost the
code.

Still to settle, carried into review R3: the plan's drafter reports three close calls under the
never-assert rule — the off-origin check in `T-017-N4`, the words "refused" and "rejected" in the
rules rows (which are the PRD's own words, with no code named), and "confirmed" meaning the caller
is given the changed item. It also reports that the blueprint's permission-before-state order of
checks is observable only through the modal and has no scenario of its own, and that REQ-009.14's
"the Add icon is activated while the loader replaces it" is in the untestable section with only the
Enter case tested.

## The orchestrator's override, propagated in two passes

The blueprint had let an API-level or rules-level test recognise a refusal or a rejection by its
status code, calling the code an instrument rather than the thing verified. That is not the
product owner's ruling, so the orchestrator overruled it.

- **E6, an orchestrator error.** The first correction pass was briefed on the six places the eval
  plan's drafter had happened to notice. The drafter did them and then reported, correctly, that
  eighteen register cells and two decision rows carried the same fault — places the brief had
  scoped it out of touching. A brief should name the rule and ask for every place it reaches, not a
  list of places someone else noticed.
- A second pass finished the set, under a distinction the orchestrator decided: an **integration**
  row drives the HTTP API, where the only signal separating a refusal from a rejection is the code,
  so it asserts that the action was not carried out and nothing changed, and points at the
  component or journey row for the modal; a **unit** row drives the rules layer, whose output *is*
  the decision, so "the rules decision refuses this" is a business fact at the layer that makes it
  and stays; and the **design tables** state what the design guarantees rather than what a test
  asserts, so the codes stay printed there.
- Verified after both passes: 173 register rows, none naming a code; no integration, browser or
  journey clause claiming a refusal or rejection class; the five rules-level clauses intact; the
  design tables intact; and the only two remaining mentions of recognising an outcome by its code
  are the two sentences that prohibit it.

## Review R3: gate 6 has no blockers

R3 returned **0 blockers and 10 advisories** — seven `plan-correction`, three `user-decision`, no
`blueprint-change` — and the verdict review.md gives for that set is that **the plan may go to the
user for acceptance with the advisories listed**. Three runs: 16 blockers, then 6, then 0.

It ruled on the three close calls the plan had raised against itself: the off-origin check is
permitted by the restraint rule; "confirmed" is permitted as the observable form of the PRD's own
wording; and the decision words in the rules rows are permitted and the blueprint's blanket
prohibition is what must change. It also confirmed what the ruling risked — that the
business-versus-technical rewrite might have hidden verification — and found only one row made
weaker, `T-007-N9`, whose loss is the technical order of checks.

Verified by the orchestrator against the files rather than taken from the report:

- **R3-001 holds.** The eval plan quotes two blueprint sentences that no longer exist on disk.
- **R3-002 holds.** Blueprint line 144 forbids a rules-level row from naming the decision class,
  while the plan does it eight times. This conflict is the orchestrator's own: the override was
  scoped to leave the rules cells alone without amending the blanket prohibition above them (see
  E6). R3's ruling is that the plan is right and the blueprint is the document to amend.
- **R3-003 holds.** `T-010-N3` asserts that no row shows a Mark out of service or Restore icon for
  a member, anchored only on the Available row's Borrow icon, so a build with neither feature would
  pass it. The same shape appears in `T-013-N2` and `T-003-N1`.
- **R3-004 holds.** `T-016-P3` and `T-016-N3` assert that the switcher lists the three users, and
  the switcher is a client constant, so neither can fail on a server that failed to seed. The seed
  is really verified by `T-016-P1`, `T-016-N1` and `T-001-P5`.

## Remaining work after R3

**The orchestrator's, as one correction pass:** the stale blueprint quotations in the plan
(R3-001); the blanket prohibition in blueprint 4.1.1 against the rules rows naming a class
(R3-002); three anchors of a shape already corrected elsewhere (R3-003); the two nominal seed
assertions in the journey rows (R3-004); the unoperationalised "by the Add field" placement
(R3-005); `T-014-P6`'s unstated activation order, which brushes against the open N4 (R3-006); and
the blueprint-versus-plan wording list (R3-010).

**The user's, four items**, each with the orchestrator's recommendation: R3-007 (the inferred
input-failure behaviours), R3-008 (the failed list fetch showing the failure modal), R3-009 (naming
the reviewer, which four tests cannot pass without) and N4 (an Add from the Show-empty-list view).

## The user's third round, and the two-step human review

Answered 20 October 2026, recorded as D-24 to D-27 in `inputs/decisions-20261020.md`.

D-24, D-25 and D-26 were accepted as recommended. **D-27 replaced the orchestrator's
recommendation** — which had been simply to name the user as reviewer — with the user's own
direction:

> "we need an agent to review the two human reviews along with the conversation they had with the
> agent on each step. To find gaps for the human. After that the human reviews that and approves."

That is now part of the flow, not of this project: `ORCHESTRATOR.md` section 4.1 ("Where a
criterion is verified by a human"), plus matching rules in all three artifact rubrics. Wherever a
person judges a criterion, an agent pre-review runs first — a session started for that task, never
the builder — with the whole conversation trail among its inputs, reporting gaps traced both to the
criterion and to the place in the trail the expectation came from. Then the person reads that
report beside the candidate and records the verdict. Three limits are part of the rule: the report
is evidence and never an approval; it cannot pass or fail a criterion; and "found none" is not
clearance, so the report must state what it could not judge.

**Gate 3, revision 5, verified:** 182 criteria (173 plus nine), nothing renumbered, **no open
question anywhere in the PRD** for the first time, no criterion naming a code, and the two-step
review defined with its three limits. D-25 — a failed list fetch showing the failure modal — now
has criteria, which is the lesson of E4 applied: an accepted decision is scope and needs a
criterion, a register row and a test.

**Gate 4, revision 6, verified:** 182 register rows, one per criterion, none naming a code; the
two-step review in the mechanism table and in all seventeen review rows, with a mandatory "what I
could not judge" section and a record that names the build it read; section 4.1.1 now split by what
a row drives, which resolves the conflict the orchestrator's own override had created (E6); the
call-was-not-made condition removed from both the register and the rules contract; section 11 with
no open question.

**Two orchestrator rulings, absorbed rather than escalated.** That an Add from the demo view which
fails or is rejected leaves the view standing follows from D-21 and D-26 together — a rejected Add
was not performed — so the three criteria for it are a deduction, cited as such, not new scope. And
the blueprint's silence on whether the list indicator clears when the failed-fetch modal appears is
recorded as GAP-1 rather than settled by analogy with D-08.

## Gate 5, revision 4: what the orchestrator verified

Against section 3: **257 rows** (237 plus 20, none retired, no ID changed), every ID distinct; 134
positive and 123 negative; 253 expected to fail and 4 unable to run, **none claiming to pass**;
stories S1 17, S2 55, S3 151, S4 34, summing to 257; every requirement carrying a runnable positive
and negative test; all 182 criteria cited in a test row with none in the gaps; no cross-requirement
bracket; no Then clause naming a status code; and all four review rows naming the agent pre-review.

The nine new criteria have 17 new rows between them. The two journey rows that could not fail were
rewritten to read the real user list through the stack, so a failed or duplicated seed now fails
them. The three weak anchors were re-anchored on the feature itself. The validation message's four
pinned checks are split between the component rows, which have no layout in jsdom and apply the
first two, and the browser rows, which apply all four. `T-014-P6` was split so neither half
activates an Add from a demo view. The stale blueprint quotations are gone, and the reviewer is the
user under D-27 rather than a drafter's default.

One consequence of the blueprint's new title rule, flagged by the drafter and worth watching: two
concurrency pair tests lost their criterion labels, so REQ-008.1 and REQ-008.3 now rest on other
rows for their evidence. The focused re-check is asked to confirm those rows genuinely verify them.

## The focused re-check, and the six advisories

`findings-RC1.md` (`5482d3cb62fe1539b88480b0bc98ff660b4efdae161466ea497a4a4cdd473dba`):
**0 blockers, 6 advisories, every one `plan-correction`.** Two runs in a row with no blockers.

It confirmed what the ruling risked. The person's record can still fail, on nine distinct grounds;
the pre-review report cannot pass or fail anything and is forbidden a verdict token; and it cannot
substitute for the person, because the record needs build and mockup screenshots in the same state
that no builder writes. It also confirmed the orchestrator's deduction about a failed Add from the
demo view is sound — no reading other than "the view stays" is consistent with both D-21 and D-26 —
and that REQ-008.1 and REQ-008.3 keep genuine evidence after losing their labels on two pair tests.

Verified against the files, then closed:

- **RC-004, the one worth catching.** The PRD tagged the three deduced criteria "Authority: User
  decision" while section 10.3 said "No decision states them in these words" — the orchestrator's
  own deduction wearing the user's approval. The tags now read "Deduced from User decision
  2026-10-20 D-21 and D-26 together; no decision states it", section 5 carries the convention, and
  10.3 sets the reasoning out in four steps.
- **RC-001.** Nothing in any artifact let the pre-review report a gap it *cannot* trace to the
  trail, which may be the most valuable thing it finds. Both documents now say such a gap is
  reported as the agent's own observation, labelled as such, and never given an invented trace.
- **RC-002.** The register's journey clauses for REQ-016.1 and REQ-016.3 still described the
  switcher check that cannot fail; they now read the real user list through the stack.
- **RC-003.** The REQ-008.1 clause claimed a check "after every concurrency test and after a mixed
  sequence of actions"; it now claims what the labelled tests do.
- **RC-005.** Blueprint 4.4 said no test verifies the records' layout while 4.1.3 made parts of it a
  pass condition; 4.4 is narrowed to the paths and the fields the pass conditions do not name.
- **RC-006.** The two documents named different trail inputs, so a pre-reviewer got different
  material depending on which it read. The blueprint now gives the single list, covering each item
  the orchestrator definition enumerates with both the file that holds it and the PRD section that
  restates it, and says plainly that these are the preparation's own record and not a verbatim
  transcript. The plan is being pointed at it.

## Two orchestrator rulings on the margin, recorded

**D-27's refinement, annotated rather than folded into the user's words.** D-27 as given has every
gap traced. The rubrics also allow an untraceable gap to be reported as the agent's own observation,
because dropping it would defeat the decision's stated purpose. That is recorded in the decisions
file as a refinement in service of D-27, explicitly not part of it, and the user may strike it.

**The near-case tags stay as they are.** The PRD drafter raised three sets it had left alone:
REQ-013.19's timing clause (tagged D-26 with D-02 named for the timing), REQ-013.24 to .26 under
D-25, and REQ-005.4, REQ-008.6 and REQ-008.7 under D-03 with the failure modal coming from the
user's own non-200 rule. These differ in kind from the three relabelled criteria: each is a
decision applied together with a criterion or definition the PRD already carries, nothing new
enters, and the PRD nowhere says a decision fails to state them. They stand. If the stricter
standard is wanted, naming the second source in each tag is a one-pass change.

## Where the preparation stands

All six advisories of the focused re-check are closed and verified. Two reviews and a re-check in
succession returned no blockers.

| | Count |
|---|---|
| Requirements | 17, REQ-001 to REQ-017 |
| Acceptance criteria | 182, each labelled, each business-observable |
| Register rows | 182, one per criterion, each naming its mechanism and the evidence it produces |
| Tests | 257: 134 positive, 123 negative |
| Expected before the build | 253 fail, 4 cannot run, **0 pass** |
| Stories | 4, disjoint file ownership: S1 17 tests, S2 55, S3 151, S4 34 |
| Open questions | none |

Verified by the orchestrator at the final revision: every requirement carries a runnable positive
and a runnable negative test; all 182 criteria appear in a test row and none is left to the gaps; no
bracket cites another requirement's criterion; no criterion, register row or test assertion names a
status code; no row claims to pass against an empty application; and no row needs a file a later
story creates.

**What is not done, and must not be mistaken for done.** Nothing has been executed: the commands
and the version lines are written, not run. The frozen harness does not exist. Four environment and
scope points stay open and are recorded in both the blueprint and the plan — OP-1, whether the
build environment has Docker, PostgreSQL and Chromium; OP-2, version lines chosen without checking
registries; OP-3, how a pre-review session is started and whether that agent can drive a running
build; and GAP-1, the PRD's silence on what shows behind the failed-fetch modal. The four
human-review rows cannot run until a candidate exists.

**What acceptance means, now that it is given.** The user accepted gate 6 on 20 October 2026. This
plan is the thing to build against: the 17 requirements, the 182 criteria, the 182 register rows and
the 257 tests are the agreed target, and a later change to any of them is an upstream change that
re-opens the gate it belongs to. Acceptance binds nothing by hash. The freeze is a separate act and
has not happened — see the Freeze section for why it cannot yet be the factory's protection.

## Decisions

| # | Decision | Who decided | Where it is recorded |
|---|---|---|---|
| D1 | Identity is a switcher over three seeded users, no password | user | `inputs/prd-rev14.md` scope line `[Answer]` |
| D2 | Requirement IDs move into the PRD, keeping REQ-001..REQ-017 exactly | orchestrator (process rule, not product) | `rubrics/prd.md`; no requirement text changes |
| D3 | Stack: React SPA + FastAPI + PostgreSQL + Compose | user (idea), with F-001 unresolved | `inputs/technical-rev41.md` section 1 |
| D4 | Requirement IDs are created at gate 3 by the PRD drafter, and by no other artifact. A downstream artifact that needs an ID the PRD lacks is a gate-3 failure, returned to gate 3. | user, 19 October 2026 | `ORCHESTRATOR.md` gate 3; `rubrics/prd.md`, `rubrics/blueprint.md`, `rubrics/eval-plan.md` |
| D28 to D31 | The four decisions D-20 to D-23: the Add loader, the state demos including the 900ms timer the orchestrator had advised against, the three strings, and the access log recording the acting user id | **user, 20 October 2026, "accept"** | `inputs/decisions-20261020.md`, second round |
| D9 to D27 | The nineteen product decisions D-01 to D-19, closing Q1 to Q3, G1 to G9, B1, B2 and the user-decision findings R1-001, R1-004, R1-005, R1-006, R1-007, R1-010, R1-013, R1-024 and R1-027 | **user, 20 October 2026, "accept all"** | `inputs/decisions-20261020.md` |
| D7 | Requirement bundling is accepted for this run rather than split: 8 of 17 requirements carry several capabilities each, inherited with the IDs under D5. Splitting would break the authority citations; criterion-level coverage in the eval plan carries the protection instead. | orchestrator (absorbed, not escalated) | `rubrics/prd.md`; the gate-3 drafter's report |
| D8 | The stack (React, FastAPI, PostgreSQL) is kept as a non-functional requirement: it is in the confirmed scope, so it is traceable. | orchestrator (absorbed) | `PRD.md` NFR-4 |
| D6 | The orchestrator works for the user: it is the manager of every agent at every gate and the user's advocate, not a neutral referee. Standing orders in `ORCHESTRATOR.md` section 3.1. | user, 19 October 2026 | `ORCHESTRATOR.md` section 3 and 3.1; `.claude/agents/prep-orchestrator.md`; `README.md` |
| D5 | One-time adoption: `REQ-001..REQ-017` as the blueprint already numbered them are taken into the PRD unchanged, to preserve the existing citations. From here the PRD owns them. | orchestrator (process, not product) | this file; the gate-3 drafter's brief |

## Gate 5, the revision: what the orchestrator verified

Checked against section 3 of the file, not taken from the drafter's report: 210 rows, every ID
distinct and well formed; 115 positive and 95 negative; 206 expected to fail and 4 unable to run,
none claiming to pass; stories S1 18, S2 51, S3 120, S4 21, summing to 210 and matching the
blueprint's ownership; every requirement carrying a runnable positive **and** a runnable negative
test; all 158 criteria cited in a test row and none left to the gaps; no bracket citing another
requirement's criterion; all ten formerly vacuous rows now carrying their anchor; and 11 retired
IDs, none of them reused. The 26 rows that were blocked are runnable or are review rows, and the
blocked section is empty.

## Mechanical amendments the orchestrator applied

Under the narrow exception in `ORCHESTRATOR.md` section 3, each implementing a numbered decision
verbatim:

1. **`PRD.md` section 8.2** closed: N1 by D-20, N3 by D-21, and N2 recorded as needing no decision
   because D-03 and D-07 already key the answer to the requester. No open question remains in the
   PRD.
2. **`TECH-SPEC.md` sections 5.4, 10 and 12** amended for D-23: the access log line becomes
   `{METHOD} {PATH} {STATUS} user={ACTING_USER_ID}`, with `user=-` when no usable identity was
   carried; the "never logged" list keeps user names, bodies, the database URL and passwords; and
   the decisions table now states that D-09 governs stored data while the access log is
   operational.
3. **`eval-plan.md`** amended for D-23: T-004-N5 and T-006-N4 assert the new log form while keeping
   their data-level assertions, the coverage row for T-006-N4 cites D-09 and D-23, section 4's
   title no longer says anything is blocked, and section 13 records all three former open items as
   closed by D-20 to D-23.

A sweep for stale wording found no "waiting on the user", no "still with the user" and no "the
blueprint omits" anywhere in the three artifacts.



Both are held back only to avoid editing a file the running drafter is reading.

1. **`PRD.md` section 8.2.** Close N1, N2 and N3: N1 by D-20, N3 by D-21, and N2 as needing no
   decision, since D-03 and D-07 already key the answer to the requester. Section 8 then holds no
   open question.
2. **`TECH-SPEC.md` section 5 and section 12.** D-23 overturns the omission of the acting user id
   from the access log: the log line carries method, path, status and the acting user id, and no
   request body and no configuration value. No test changes, because no acceptance criterion covers
   logging and D-19 accepts the trial's security posture as unproven.

## Corrections

| Review | Correction used | What changed | Re-review session |
|---|---|---|---|
| R1 | none yet | — | — |

## Freeze

- **Frozen:** no
- **What would be frozen:** `PRD.md`, the blueprint, `eval-plan.md`, the acceptance test files, and the
  exact test commands
- Nothing may be frozen before gate 6 passes, and only the user may freeze.
- Gate 6 is now accepted, so a freeze is permitted for the first time. It has **not** been requested
  and has **not** happened.
- **Why it has not happened.** A freeze binds the documents, the test files and the exact commands by
  hash. In the factory that binding is the `lock` command, and `lock` reads the files from main. These
  files sit on a docs-only branch that cannot reach main under the current rules, and the acceptance
  test files do not exist yet. A freeze run today could therefore only be a local record of hashes,
  not the factory's protection. The two must not be described as the same thing.

## Amendments to the accepted plan, after gate 6

Gate 6 was accepted on 20 October. The eval plan has been amended twice since, both times to close
a defect that would otherwise have been frozen, and both times recorded here rather than applied
quietly. Its hash is now `2ae73498b21e8cf7703b4fa2908a38244f18610256112b97f13e1e49ed8d99cc`.

1. **C2 installed the frozen test tools with `--require-hashes` alone**, after the builder's own
   `api/requirements.txt` and into the same environment. pip skips verification of anything already
   satisfied at the pinned version, so a builder naming a pinned test package supplied the runner of
   its own exam. Demonstrated, then closed with `--force-reinstall`.

2. **That fix was necessary and insufficient.** It reaches substitution of a pinned package and not
   a package the builder *adds*. A new distribution with a `pytest11` entry point is loaded by
   plugin autoload regardless, and one hook in it swallows every failure: against a stub build that
   applies no rule, the frozen unit tree went from `13 failed, 3 passed` to `16 passed`, every row
   carrying its `row` and `criterion` properties. Closed by `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` on
   every pytest command, with `-p` naming any plugin a command needs; the same stub build then
   returns `13 failed, 3 passed`. Found by the gate-7 orchestrator session, not by the three
   checkers that reviewed the tests before it.

3. **1.1's title rule** now records that in Python a title is a function name, that the id and the
   criterion labels are therefore spelled with underscores, and that `api/tests/conftest.py`
   recovers the canonical forms into the JUnit properties the register reads.

**By section 7 of `ORCHESTRATOR.md` a changed eval plan invalidates the planning review**, so gate
6's acceptance no longer covers the current plan. What it covered is unchanged in substance — no
requirement, criterion or test id was created, changed or renumbered, and the coverage tables are
untouched — but the acceptance is for the earlier text and the difference is these three entries. A
fresh checker reading the amended plan against `rubrics/eval-plan.md`, and the user's re-acceptance,
are outstanding. Gate 7 cannot close over an invalidated gate 6.
