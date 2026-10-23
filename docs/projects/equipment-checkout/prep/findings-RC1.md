# Focused re-check after the third-round correction pass

Reviewer: a `prep-checker` session started for this task, 20 October 2026, given neither R1, R2 nor
R3, and scoped by the orchestrator to the nine areas the correction pass changed plus adjacent
breakage. Transcribed by the orchestrator because the harness refuses subagent writes; the
checker's wording is preserved and only the layout normalised.

## Verdict

**0 blockers, 6 advisories (RC-001 to RC-006), every one `plan-correction`.** No `user-decision`
and no `blueprint-change` finding, so there is no cost to state. RC-004 can optionally be closed by
one yes or no from the user instead of a relabel; it blocks nothing either way.

**No blockers. The plan may go to the user for acceptance, with the advisories listed.**

## Findings

**RC-001 | advisory | plan-correction. No artifact lets the pre-review report a gap it cannot
trace.** review.md says "A gap it cannot trace is reported as its own observation and labelled as
such", while every artifact says only that each gap is traced to a criterion and to a place in the
trail. *Basis:* blueprint 4.1.3 "Each gap is traced to the criterion it bears on … and to the place
in the trail the expectation came from"; eval-plan 1.5 and the four review rows the same; a search
of all three artifacts for "cannot trace", "own observation" and "labelled as such" finds nothing.
A pre-reviewer following the plan literally must drop an untraceable gap or invent a trace for it.
Touches only what the report may contain; no pass condition changes.

**RC-002 | advisory | plan-correction. The register's journey clauses for REQ-016.1 and REQ-016.3
still describe the check that could not fail.** *Basis:* blueprint 4.2 reads "J (S4): the switcher
shows the three on the Compose stack" and "after the restart the switcher still shows three", while
DD-07 makes the switcher "a constant of the client", so that check passes on an unseeded or
duplicating server. The plan's rewritten rows are the stronger ones, so nothing is unverified; the
register disagrees with the plan.

**RC-003 | advisory | plan-correction. The REQ-008.1 register clause relies on pair tests that no
longer carry the label.** *Basis:* blueprint 4.2 "after every concurrency test of section 8 and
after a mixed sequence of actions, each item read back shows at most one borrower"; after the title
rule change only T-008-P1, T-008-N3 and T-008-N7 carry the label, and no labelled test performs a
"mixed sequence of actions". Not a coverage hole — the criterion keeps genuine evidence — but the
claim is wider than what is labelled.

**RC-004 | advisory | plan-correction. The authority tag on REQ-013.20 to .22 reads as a user
confirmation.** The three criteria are labelled as deductions in the source note and in section
10.3, yet each tag opens "Authority: User decision". *Basis:* the tags read "[Authority: User
decision 2026-10-20 D-21 and D-26; section 10.3]"; PRD 10.3 says "No decision states them in these
words"; PRD section 5 gives the convention that a bracketed authority citing a decision means the
decision confirmed the criterion, as D-24 did for the earlier inferred criteria. Fix by relabelling
as deduced from D-21 and D-26, or by putting them to the user as D-24 was.

**RC-005 | advisory | plan-correction. Blueprint 4.4 contradicts the new record pass conditions.**
*Basis:* 4.4 says "The paths and layout of the pre-review reports and of the user's records
(DD-15). The review rows point at the user's verdict, not at its layout", while blueprint 4.1.3 and
eval-plan 1.5 make the opening line, the hash and the "What I could not judge" section pass
conditions. Narrow the 4.4 bullet to paths and to the fields the pass conditions do not name.

**RC-006 | advisory | plan-correction. The blueprint and the plan name different trail inputs for
the pre-review.** *Basis:* blueprint 4.1.3 gives PRD sections 2.1, 8, 2.4, 10 and 9 plus the
decision rounds; eval-plan 1.5 and C12 give `inputs/prd-rev14.md`, `inputs/decisions-20261020.md`
and the preparation state file. A pre-reviewer working from the plan is never handed the PRD's own
questions and change list, and the plan lists no verbatim conversation — PRD section 9 states the
inputs hold none. One trail list, used in both documents.

## Per check

**1. The nine new criteria and their chain: no blocker; RC-004 applies.** The criteria name
visible, kept or refused outcomes, with every term they rely on defined in section 4, and none
names a code or a mechanism. The register rows verify outcomes. All 17 new tests are bracketed to
the criterion they test, each carries the feature as a positive anchor, and the `fails:` text
matches the plan's own baseline definitions. REQ-013.19, .22 and .25 each bundle two or three
sub-cases, which the rubric discourages, but the rows cover each sub-case and the bundling is
already recorded. **The deduction behind REQ-013.20 to .22 is sound:** D-21 holds the view until the
user changes or Show loading is activated, D-26 ends it for an Add that is performed, and an Add
rejected by the name check or failed is not performed; no competing reading is consistent with both
decisions. Only the tag wording is weak.

**2. The two-step human review: no blocker; RC-001, RC-005 and RC-006 apply.** The person's record
can fail — on a "does not match", a described finding, a missing or incomplete entry, a wrong
token, a missing screenshot, name or date, a wrong hash, or an invalid opening line — and a row
never passes by default. The report cannot pass or fail anything: all four rows say it "is an input
and never a result this row asserts" and that "found none" closes nothing, and the report is
forbidden to use a verdict token. It cannot substitute for the person's judgement, because the
record needs build and mockup screenshots in the same state, or the screens visited as each user,
and the builder writes neither file. Independence is stated in all three artifacts and the report
records its session; whether sessions can be started that way is OP-3, recorded and open.

**3. The three strengthened anchors: none found.** Each finds the feature for the admin first and
only then asserts absence for a member, so a build that renders rows and implements nothing fails
at the anchor.

**4. The two journey rows: none found for the rows; RC-002 for the register.** They read the user
list as Ada through the stack; an unseeded stack refuses the identity and duplicates violate "each
once and no other user".

**5. Validation-message placement: none found.** The four checks restate the PRD definition; the
two DOM checks are applicable in jsdom and the two geometry checks sit in the browser rows; every
criterion stating the placement has both a component row and a browser row.

**6. The T-014-P6 split: none found.** Both rows work on freshly loaded pages, one with no demo
activated and one with no Add control touched, so neither can make an Add from the demo view.

**7. The two unlabelled pair tests: both criteria still have genuine evidence**, REQ-008.1 through
T-008-N3, T-008-P1 and T-008-N7, and REQ-008.3 through T-008-N4 and T-008-N2. Only the wording
over-claims (RC-003).

**8. The three self-flagged calls, all acceptable.** The "wrong state" kind for an Add is only a
stimulus and the row asserts the modal and that nothing changed, never the kind. T-013-N15 reads
only after Close and asserts nothing during the modal, so it does not touch what GAP-1 leaves open.
And the review rows failing on an invalid opening line is a precondition that fails closed, which
is what makes the two steps enforceable — only the report's form can block a pass, never its
content, so the agent can cause a redo and never a pass.

**9. Dangling material: none**, with RC-005 as the one adjacent inconsistency. The stale quotations
are gone and the surrounding text agrees; the named default reviewer appears only as superseded by
D-27; the title-order text is consistent across both documents.

## What the checker could not judge

Whether the preparation state file holds every question, answer and change round the plan says it
holds, having been told not to read it. Whether a pre-review agent can be started with the
conversation behind the trail documents (OP-3). Nothing was executed, and the mechanical counts
were taken as the orchestrator stated them.
