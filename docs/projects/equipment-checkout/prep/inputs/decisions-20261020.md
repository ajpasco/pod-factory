# User decisions, 20 October 2026

Allan Pasco, as product owner, accepted all nineteen recommendations the orchestrator put to him
on 20 October 2026 with the single answer "accept all". Each decision below is his, not the
orchestrator's and not any agent's. These are a source of scope for the PRD, on the same footing as
the confirmed scope and the recorded answers in `prd-rev14.md`. Cite them as "User decision
2026-10-20 D-nn".

Each decision closes the gap, question or finding named in brackets.

- **D-01 [G1] Missing or unknown acting identity.** The API refuses any request whose acting
  identity is missing, malformed, or not one of the seeded users, with 403 and no body. Before a
  user is picked, the page shows the switcher and no equipment list.
- **D-02 [G5] Add, Mark out of service and Restore are server calls**, and they get the same
  treatment as Borrow, Return and Delete: a loader until the response arrives, the list changes
  only after a 200, and a non-200 shows the failure modal with Close and Retry.
- **D-03 [G8] Two rejection codes.** Rejecting an admin as borrower is 422. A Borrow on an item
  that is not Available is 409.
- **D-04 [G9] After Restore** the item's status is Available.
- **D-05 [Q2] A member may hold several items at once.** There is no limit.
- **D-06 [G2] Over-long names.** An equipment name longer than 100 characters, after trimming, is
  rejected with 422 and the inline validation message.
- **D-07 [G3] A member naming another borrower.** A member request that names anyone but the
  acting member as borrower is refused with 403 and shows the Access denied modal.
- **D-08 [G6] The loader on a non-200.** The row loader is removed when the response arrives, and
  then the failure modal appears.
- **D-09 [Q1] No attribution.** Neither an admin's return nor an admin-set loan is attributed
  anywhere; nothing records or shows who performed it.
- **D-10 [Q3] Duplicate equipment names are allowed.**
- **D-11 [R1-004] The 409 on deleting a loaned item is accepted as scope**, although no HTTP code
  appears in `prd-rev14.md`.
- **D-12 [R1-005] Forced non-loader actions.** A member's forced Add, Mark out of service or
  Restore is refused with 403 and shows the Access denied modal. This follows from D-02.
- **D-13 [R1-007] Five inferred readings accepted as scope:** the modals carry a dialog role;
  modals and icon buttons are operable by keyboard; a whitespace-only name is rejected; the seed is
  idempotent; and the server, not the client, rejects the loser of two simultaneous borrows.
- **D-14 [R1-006] The success notes are struck.** The notes the mockup shows after Add, Mark out of
  service and Restore are not built. The specified modals and row states are the only messages.
- **D-15 [R1-013] Two mockup readings settled.** Each switcher entry shows its role. The "every
  button is an icon" rule covers the eleven row and form controls; the borrower modal's member
  buttons may show a name beside the icon.
- **D-16 [G4, R1-010] The four state demos ship** in the built application — Show loading, Show
  empty list, Show API failure, Show access denied — and they are exempt, by name, from the "no
  other control exists" inventory.
- **D-17 [G7, R1-001] The mockup is the look reference.** Row height 48px; the mockup's corner
  radii and its top-bar blur. "Card", "top bar", "badge" and "system font" are defined from the
  mockup. Translucency, corner rounding and shadows are judged by a named comparison review against
  the mockup, not by numeric thresholds.
- **D-18 [B1] A plain React single-page application built with Vite.** Next.js is not used.
- **D-19 [R1-027] The trial's security posture is accepted as unproven** by automated tests, and no
  "trial-only" label appears in the interface.

## Second round, same day

Put to the user with the blueprint's design defaults as the recommendation; accepted with "accept"
on 20 October 2026.

- **D-20 [former PRD question N1] The Add loader.** As the blueprint's DD-11: a spinner in the Add
  panel replaces the Add icon, and while it shows, Enter and the Add icon do nothing.
- **D-21 [former PRD question N3] The state demos.** As the blueprint's DD-09: they appear only
  once a user is picked; they are client-only view states that never call the API and never change
  stored data; Show loading shows the list indicator for 900ms, the mockup's value, and returns to
  the real list; Show empty list holds until the acting user changes or Show loading is activated;
  Show API failure and Show access denied open their modals, and Retry in the demo failure modal
  only closes it. The orchestrator recommended dropping the 900ms timer because a timed state makes
  a browser test depend on wall-clock timing; the user accepted the blueprint's default instead, so
  the timer stays and the test must wait for the indicator to appear and then disappear rather than
  sleeping.
- **D-22 [former blueprint default DD-13] The three strings no source gave**, accepted as written:
  the switcher placeholder "Choose a user"; the switcher entry format `<name> (<role>)`, for example
  "Ada Admin (admin)"; and the over-length inline message "Name must be 100 characters or fewer."
- **D-23 The access log records the acting user id.** This overturns the blueprint, which had read
  D-09 ("nothing records or shows who performed it") as covering the server's access log. D-09
  governs the product: no attribution is stored in the data or shown in the interface. The access
  log is operational, and it carries method, path, status and the acting user id, and no request
  body and no configuration value. Former PRD question N2 needed no decision: D-03 and D-07 both
  key the answer to the requester, so an admin naming an admin is 422 and a member naming anyone
  but themselves is 403, which is what the PRD already says.

## Third round, after review R3

Put to the user with the orchestrator's recommendations; answered on 20 October 2026.

- **D-24 [R3-007] The inferred input-failure behaviours are accepted as scope.** An admin's Borrow
  naming no borrower or naming someone who is not a seeded member, an action on an item that is no
  longer there, and the Access denied modal for a missing, malformed or unknown identity: each
  stands as the PRD now states it, although the behaviour was the drafter's reading rather than the
  user's own words. Eight tests rest on it.
- **D-25 [R3-008] A failed list fetch shows the API failure modal, and Retry repeats the fetch.**
  Accepted. The alternative was a silently blank page.
- **D-26 [former PRD question N4] An Add made from the Show empty list demo view** performs the Add
  and ends the demo view, showing the real list with the new item in it.
- **D-27 [R3-009] How the two human reviews are prepared and approved.** The user's own direction,
  which replaces the orchestrator's recommendation that he simply be named as reviewer:

  > "we need an agent to review the two human reviews along with the conversation they had with the
  > agent on each step. To find gaps for the human. After that the human reviews that and approves."

  So each human-review criterion is verified in two steps. First an **agent pre-review**: an agent
  in a session started for that task examines the candidate against the review's own rubric, with
  the whole conversation trail as input — the confirmed scope with its citations, every question and
  its answer, every decision with its decider, and the change rounds — and reports the gaps it
  found, each traced to the criterion and to the place in the trail the expectation came from.
  Second the **human review**: the user reads that report alongside the candidate and records the
  verdict. The approval is the user's, and only the user's.

  Three limits are part of the decision. The pre-review report is evidence for the user, never an
  approval, and it can neither pass nor fail a criterion. "Found none" is not clearance: the user
  may find what the agent missed, and the report must say plainly what it could not judge. And the
  pre-reviewing agent may not be the agent that built the candidate.

  **Orchestrator's refinement, recorded rather than folded into the user's words.** D-27 as the user
  gave it has every gap traced to a criterion and to a place in the trail. A gap the agent cannot
  trace may be the most valuable thing it finds, and dropping it would defeat the decision's stated
  purpose, so the rubrics also allow such a gap to be reported as the agent's own observation,
  labelled as such, and never given an invented trace. This is a refinement in service of D-27, not
  part of it; the user may strike it.
