# Rubric: the PRD

Standard to match: `docs/PRD.md` (observable acceptance criteria) and `docs/PRD-reference.md`
(requirement shape). A drafter receives this file, the confirmed scope, the recorded answers and
the open questions. It receives no other agent's reasoning.

## Required sections

1. **Problem statement.** Who has the problem, in one or two paragraphs. No solution language.
2. **The product.** What it is, in the user's terms.
3. **Users and roles.** Each role, what it may do, and what it may not do.
4. **Definitions.** Any term the acceptance criteria rely on, defined once. A criterion that uses
   an undefined term fails this rubric.
5. **Functional requirements.** `REQ-01…REQ-nn`, each with **User**, **Flow** (numbered steps) and
   **Acceptance** (a list of observable criteria).
6. **Non-functional requirements.** Only those the user stated or accepted as a default.
7. **Non-goals.** What version one deliberately does not do.
8. **Open questions.** Every deferred question, with who it is waiting on.

## Requirement rules

- **This drafter assigns the requirement IDs.** No other artifact may create one. Leaving the PRD
  without IDs so that the blueprint or the eval plan numbers the requirements instead is the
  defect this rule exists to prevent: it inverts traceability and leaves the contract pointing at
  the design.
- IDs are stable and never reused or renumbered. Any fixed width is fine (`REQ-01` or `REQ-001`)
  as long as one width is used throughout.
- **One requirement is one capability**, judged when the IDs are first assigned. Where IDs were
  adopted from an earlier artifact and a requirement bundles several capabilities, do not split or
  renumber it: the citations that carry the traceability would break. Record the bundling, and rely
  on criterion-level coverage in the eval plan to keep the protection the rule exists to give. Adding a requirement appends; removing one leaves
  the number retired with a line saying so.
- When assigning IDs for the first time: "and" in a requirement title usually means two
  requirements.
- Every requirement traces to something the user said. A drafter that cannot cite the scope,
  an answer or a feedback round for a requirement must list it under open questions instead.
- Every role's prohibitions are stated as acceptance criteria, not implied by the absence of a
  permission. "Admins cannot borrow" is a criterion; silence is not.

## Acceptance criterion rules

**A criterion states a business outcome, never a technical choice.** No HTTP status code, no table
or column shape, no module, function or file name, no library, framework or build tool, no log
format. Those are the blueprint's, and the acceptance tests do not verify them. Where the user has
decided a technical fact, it stays the user's decision and is recorded in the blueprint's decision
list; the criterion says what a person would see, be shown or be refused. "The request is refused,
nothing changes and the Access denied modal appears" is a criterion; "the server answers 403" is a
blueprint entry.

A criterion is acceptable only if someone other than its author can tell whether it holds:

- It names what is visible, recorded or refused — not how it is implemented.
- Bad: "the UI is professional and clean." Good: "every row has identical height regardless of
  status, icons or loader."
- Bad: "handles errors." Good: "a failed request shows the failure modal with Close and Retry, and
  no row changes state."
- Each criterion covers one case. Where behaviour differs by role or state, there is a criterion
  per role or state.
- Missing, malformed and unauthorized input each get a criterion wherever the requirement accepts
  input or identity.

## Change rounds

Each round of user feedback appends to the PRD's own change list with the user's words, and
updates the requirements it touches. A mockup change that alters behaviour with no PRD change is a
gate-3 failure, not a cosmetic difference.

## Checker's verdict

First, the numbering: every `REQ-nn` appears exactly once, the sequence has no holes, every
acceptance criterion sits under exactly one requirement, and no criterion is left outside the
requirements. A failure in any of those is a blocker.

Then, per requirement: traced to a user statement (yes/no), criteria all observable (yes/no),
role prohibitions present (yes/no), input-failure cases present (yes/no, or not applicable). Then
list every criterion you judged unobservable, quoting it. A blocker is any requirement with no
trace, any unobservable criterion, or any undefined term.
