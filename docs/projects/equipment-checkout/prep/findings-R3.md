# Gate-6 planning review R3: Shared Equipment Checkout (trial)

Reviewer: a `prep-checker` session started for this task, 20 October 2026, given neither R1 nor R2,
and told not to re-count what the orchestrator had verified mechanically. Transcribed by the
orchestrator because the harness refuses subagent writes; the checker's wording is preserved and
only the layout normalised.

## Verdict

**0 blockers, 10 advisories** — seven `plan-correction` (R3-001 to R3-006, R3-010), three
`user-decision` (R3-007, R3-008, R3-009), no `blueprint-change`.

**No blockers. The plan may go to the user for acceptance, with the advisories listed.**

## Rulings on the three close calls the plan flagged against itself

1. **The off-origin check in `T-017-N4`: permitted.** The eval rubric's own restraint list requires
   "no network request to an origin the blueprint does not name"; the row asserts the set of
   destinations, not whether a particular call was made, and its write half is a read-back. One nit,
   raised as no finding: it brackets REQ-017.13, whose wording is "offered in the interface", which
   `T-017-N5` is the row that observes.
2. **"Refused" and "rejected" in the rules-level rows: permitted, with a document conflict to
   repair (R3-002).** The PRD defines both words and ties each to a different modal. At the rules
   level a modal cannot be observed, so the distinction can only be expressed as the class of
   decision, and dropping it would leave one case unchecked — REQ-003.6's unknown user, which only
   `T-003-N3` distinguishes. It must stay in the rules rows, and it is in no integration row, which
   is correct. Blueprint 4.1.1 says the opposite and is the document to amend.
3. **"Confirmed" meaning the caller is handed the changed item: permitted.** It is the observable
   form of the PRD's "the back-end has carried it out and reports success", it names no code, and
   every "not confirmed" row also reads the list back, so a false success cannot pass. Its cost is
   by design: an integration row cannot tell a refusal from a rejection or from a crash, and the
   journey rows carry that.

## The directed questions

**Did the business-versus-technical split hide verification? No.** The rewritten integration rows —
`T-001-N3/N4/N7`, `T-005-N3/N6`, `T-007-N1` to `N5`, `T-008-N1/N2/N6`, `T-009-N7`, `T-011-N4` — can
still fail for the right reason: each has a positive anchor and reads the list back. One row became
weaker: `T-007-N9` no longer shows that the permission check comes first, which the plan records in
9.4 and which is technical. The refusal-versus-rejection difference moved to the real stack, where
`T-007-P4`, `T-001-N8`, `T-003-N5`, `T-004-N9`, `T-005-N7`, `T-008-N11`, `T-008-N12`, `T-011-N9`,
`T-012-N10` and `T-012-P5` assert the modal. Residuals, as observations: REQ-003.6's unknown-id case
rests on the rules row alone; REQ-012.16 on the real stack is shown only for Mark out of service;
and the real-stack failure modal for a failing Return, Restore or Add is shown at class level only,
which blueprint 12.3.1 states as its intent.

**Do the sentences check their brackets, and are the states true?** About 70 rows sampled across all
four stories, including all 31 newest. No bracket mismatches; the rule holds that no interface-only
criterion is bracketed on an API row alone. State cells are true under the plan's baseline and
commands: unit rows give a collection error, database and integration rows a case that errors at
setup, component and browser rows no case, journey rows connection refused, and the four review
rows cannot run. One inexactness, not a finding: journey rows beginning "an Available item created
by Ada" fail on the API call before any page load, both being connection refused on port 8080.

**Are the four strengthened anchors real? Yes** — each cannot hold unless the feature exists.
Three rows of the same shape were not strengthened: R3-003.

**Are the fifteen newest criteria genuinely tested? Yes**, at the level each register row names,
including fake-clock boundaries at 899 and 900ms, ten minutes of the page's clock, a reload on the
real stack, and Enter pressed twice for the Add guard.

**Does N4 independence hold? Nearly.** Every row that activates Show empty list leaves it by
picking a user or by Show loading, and `T-017-P1` says "never by an Add". The exception is
`T-014-P6` (R3-006). No other row performs an Add from that view or asserts what one would do.

**Does everything trace? Almost.** Strings come from the PRD, D-22 or the mockup; look values from
D-17. The exceptions rest on the drafter's inference: R3-007 and R3-008.

**Is the contract complete enough to write the 237 tests? Yes**, with one gap: the placement of
`add-validation` (R3-005).

**Can each story turn its own tests green? Yes.** Frozen-file ownership is disjoint, and the
per-story lists match the owner column.

**Can the two human-review rows fail? Yes** — on a "does not match", on a finding line, or on a
missing or incomplete record. Two limits remain: the reviewer is the drafter's default rather than
the user's choice (R3-009), and no record can prove the reviewer is not the author.

## Per-artifact verdicts

**PRD.** Numbering sound; no unobservable criterion; no undefined term; no criterion line names a
status code, which appears only where the PRD quotes the user. Every requirement traces, carries
observable criteria, states its role prohibitions where applicable, and has input-failure criteria
where it accepts input, REQ-004.11, REQ-004.12 and REQ-012.16 tracing by inference (R3-007). "By the
Add field" in REQ-009.4, .5 and .8 is observable by a person but not operationalised for automation
(R3-005). The change list carries confirmed-scope summaries rather than verbatim words, which the
PRD discloses.

**Blueprint.** No requirement ID originates here. Requirements placed exactly once. No criterion
without a register row. No row whose evidence is an agent's claim. No requirement accepting input
without failure behaviour. No shared object without a concurrency answer. No decision without a
decider, though section 10.4 uses "Drafter", which is not one of the rubric's three deciders
(R3-008, R3-009).

**Eval plan.** None found against every item of its rubric's verdict list: no requirement missing a
positive or negative test, no test with an unknown requirement, no criterion absent from both tests
and gaps, no register row without a test, no test without an owner or a state value, no overlapping
story scope, no test depending on a later story's files, and both the gaps and untestable sections
present.

## Findings

**R3-001 | advisory | plan-correction.** The eval plan's 9.5 and a bullet in 1.1 list blueprint
sentences as needing correction; the blueprint on disk no longer contains them. *Basis:* the plan
quotes "A test that must tell them apart recognises them by the answer that section 12.3.1 assigns
to the class ... The recognition is the instrument", and "A test may recognise a Confirmed, Refused
or Rejected outcome by the ledger's answer", against the blueprint's current "Such a row never
recognises an outcome by its status code, as an instrument or otherwise" and 12.3.1's "as the thing
verified or as an instrument to recognise an outcome class".

**R3-002 | advisory | plan-correction.** Blueprint 4.1.1 forbids a rules-level row from stating the
kind of refusal or rejection; the plan's rules rows state it in the PRD's words. *Basis:* blueprint
4.1.1 "... and never says which kind of refusal or rejection it was"; plan `T-004-N6` "each is
rejected (not refused)", the same in `T-005-N4`, `T-008-N4`, `T-009-N10`, `T-010-N4` and `T-011-N5`;
plan `T-003-N3` "each is refused, the unknown id in the same way as the other member". Also
blueprint register REQ-004.11 says the borrower decision "refuses an admin's request that names
nobody", which the PRD calls rejected, and register REQ-003.6 says "without looking the named user
up", a call-was-not-made condition the eval rubric forbids as an assertion and which the plan
correctly does not assert. Per the ruling above, amend the blueprint.

**R3-003 | advisory | plan-correction.** The plan's own anchor rule was applied to two rows and not
to three of the same shape. *Basis:* plan 1.1 "Where a build that renders rows and implements
nothing could still satisfy the anchor, the anchor is the feature itself, shown working in the same
row"; `T-010-N3` anchors on the Available row's Borrow icon while asserting that no row shows Mark
out of service or Restore for a member, so a build with neither feature passes; `T-013-N2` anchors
on the empty text while asserting a member sees no Add field, so a build with no Add passes;
`T-003-N1` anchors on the row loader. Compare `T-011-N2`, which finds the Delete icon first.

**R3-004 | advisory | plan-correction.** Two journey rows assert that the switcher lists the three
users, but the switcher is a client constant, so they cannot fail on a server that failed to seed or
that duplicated users. *Basis:* DD-07 "The switcher entries ... are a constant of the client";
`T-016-P3` "then the switcher lists exactly Ada Admin, Mia Member and Sam Member"; `T-016-N3` "the
switcher first lists exactly three users without duplicates"; blueprint register REQ-016.1 and
REQ-016.3 share the property. Coverage is not lost — `T-016-P1`, `T-016-N1` and `T-001-P5` read the
real list — but the journey halves are nominal for the seed.

**R3-005 | advisory | plan-correction.** "By the Add field" is not operationalised, and the PRD
deliberately differs from the mockup here. *Basis:* 12.8.1's `add-validation` "The inline validation
message by the Add field. It is not a modal", with no containment or adjacency rule; `T-009-N1` and
`T-009-N2` "appears by the Add field on the page"; the plan's untestable section does not list it. A
test author must either skip the "by" half or invent a rule that could fail a conforming build.

**R3-006 | advisory | plan-correction.** `T-014-P6` activates the Add icon and all four state-demo
controls on one page with no order stated, so if the Add icon is activated while the Show empty list
view shows, the row depends on the open question N4. *Basis:* `T-014-P6` "Enter or Space activates
it with its normal effect"; plan 9.3 lists the rows that leave each demo and `T-014-P6` is not among
them.

**R3-007 | advisory | user-decision.** Some PRD behaviour rests on the drafter's inference rather
than a user statement. *Basis:* REQ-004.11, REQ-004.12 and REQ-012.16 cite "the authority line of
this requirement; section 10.3", and that authority line says nothing about naming no borrower, a
non-member, or an item already gone; blueprint DD-05 says the code "follows D-03 by analogy"; and
the Access denied modal for a missing, malformed or unknown identity rests on the PRD's definition
of Refused rather than on D-01, which says only 403, no body, and no list before a pick. The user
accepts them by accepting the PRD.

**R3-008 | advisory | user-decision.** DD-10 adds user-visible behaviour with no source: a failed
list fetch shows the API failure modal and Retry repeats the fetch. *Basis:* DD-10's own wording
("No criterion covers it") against the blueprint rubric's "A need discovered here becomes an open
point or a PRD change request, never a new capability".

**R3-009 | advisory | user-decision.** Nobody the user chose is named as the reviewer for the two
human reviews, and section 11 does not list this as an open point. *Basis:* DD-12 "the drafter's
default, not a choice the user has stated"; blueprint 4.1.3 "If Allan Pasco is also the author of
the build, that condition fails and another reviewer must be named."

**R3-010 | advisory | plan-correction.** Blueprint wording the plan departs from is not listed in
its 9.5, which ends "Nothing else needs correcting". *Basis:* blueprint 8 wants the other pairs'
tests titled `CONC` plus the pair rather than a requirement label, while the plan gives them IDs
such as `T-010-N6`; blueprint 4.1 wants a title to begin with the criterion label, while the plan
puts the ID first and reconciles it in 1.1; and blueprint register REQ-005.3 names a member naming
the admin, which the plan covers under `T-003-N2` and REQ-003.6.

## Cost of each user-decision finding

- **R3-007.** Blocks no test from being written; affects eight — `T-004-N6`, `T-004-N7`, `T-004-N8`,
  `T-004-N9`, `T-012-N8`, `T-012-N9`, `T-012-N10` and `T-001-N8` — and the criteria REQ-004.11,
  REQ-004.12, REQ-012.16 and the modal half of REQ-001.6 to .8. If the reading is rejected, those
  rows change or go.
- **R3-008.** Blocks no test; no frozen test depends on it, and no criterion is left unobservable
  because none exists for it.
- **R3-009.** Blocks four tests from ever passing if no valid reviewer is named: `T-015-P5`,
  `T-015-P6`, `T-015-P7` and `T-017-N9`, all in S4. REQ-015.4 to .6 are verified by review alone,
  and the review halves of fourteen REQ-017 criteria would be unobservable. Those four rows are
  already "cannot run" before the build.
