# PRD: Shared Equipment Checkout (Trial)

Status: draft for user review before any build. Nothing is implemented. Amended 2026-10-20 to carry
the user's twenty-three decisions of that date (D-01 to D-23), then to state every acceptance
criterion as a business outcome, as the product owner ruled (section 9), and then to carry the four
decisions of the third round (D-24 to D-27). No question is open (section 8).

Sources: the PRD rev 14 (confirmed scope, journey, acceptance criteria, screen states, non-goals,
unresolved questions); the 17 requirements of requirements rev 41 (REQ-001 to REQ-017); the user's
twenty-seven decisions of 20 October 2026, nineteen in the first round, four in the second and four
in the third (`decisions-20261020.md`), cited as "User decision 2026-10-20 D-nn"; the product
owner's ruling that acceptance criteria state business outcomes (section 9); and the mockup
`mockup-rev14.html`, which is a cited source under D-17 as the look reference (section 2.5). Scope
citations such as `[Idea]`, `[Answer]` and `[Feedback n]` are carried over unchanged from the first
two sources.

---

## 1. Problem statement

A small team shares equipment. The members of the team need to see who currently has each item and
to borrow and return items. One administrator needs to keep the list of equipment up to date, give
an item to a member who wants it, and take an item back when its borrower cannot return it.

This is a trial: it is reviewed by the user before any build, and its scope is kept deliberately
small.

## 2. The product

Shared Equipment Checkout is a web application, built with React, FastAPI and PostgreSQL
(`[Idea]`), in which a small team sees a single list of shared equipment. The front end is a plain
React single-page application built with Vite; Next.js is not used (D-18). Each item shows its name
and whether it is available, on loan to a named member, or out of service. Members borrow available
items and return their own loans. The administrator adds equipment, marks available equipment out
of service, restores it, deletes equipment, borrows on behalf of a member, and returns any loan.

Nobody signs in. The person using the app picks one of three seeded users from a switcher
(`[Answer]`). Until a user is picked, the page shows the switcher, with the placeholder "Choose a
user" (D-22), and no equipment list (D-01) and no state demos (D-21). The look and feel is
professional and follows Mac/Apple conventions (`[Feedback 1, 5]`); the mockup is the look
reference (D-17).

### 2.1 Confirmed scope (citations)

- `[Idea]` React, FastAPI, PostgreSQL; PRD and design reviewed before build.
- `[Idea]` Members borrow and return available equipment; exactly one active loan per item.
- `[Idea]` Admins add equipment, mark available equipment out of service, restore it.
- `[Idea]` Seed one admin and two members; committed data persists across restart.
- `[Idea]` States: loading, empty, validation, API failure, access denied. Trial stays bounded.
- `[Answer]` Identity: pick one of three seeded users from a switcher, no password.
- `[Feedback 1, 5]` Professional, Mac/Apple look and feel.
- `[Feedback 2]` No Details buttons. Available shows Borrow; item on loan to the current user shows
  Return.
- `[Feedback 3]` No green "Borrowed" header. Borrow/Return show a loader until the back-end returns
  200, then On loan / Available. State demos at the top.
- `[Feedback 4]` All rows are the same size.
- `[Feedback 5, 7]` API failure and access denied are modal popups.
- `[Feedback 6]` Delete x icon removes equipment. All buttons are icons. Rows are thinner.
- `[Feedback 8]` Add equipment sits above the list; Enter adds.
- `[Feedback 9]` Admin can return an item when the borrower cannot, and can set a loan for a person
  who wants the item.
- `[Feedback 11, 12]` Admin Borrow opens a modal to choose a member; the admin is never selectable
  and cannot borrow. Members borrow only for themselves, with no borrower selection. (Supersedes
  Feedback 10.)
- `[Feedback 13]` Admin delete shows a confirm modal; confirming deletes, cancelling does nothing.

### 2.2 Journey (the mockup demonstrates this, except where a decision of 2026-10-20 changes it)

1. Open the app. Until a user is picked, the page shows the switcher and no equipment list (D-01)
   and no state demos (D-21). Choose a seeded user (Ada Admin, Mia Member, Sam Member).
2. As Ada, click Borrow on an Available item. A modal lists Mia Member and Sam Member only. Choose
   Mia.
3. A row loader shows until 200; then the row shows "On loan – Mia Member". Nothing in the interface
   shows that Ada set the loan (D-09).
4. Ada clicks Return on that loan; loader until 200; row is Available. Nothing in the interface
   shows who returned it (D-09).
5. Ada types a name in Add equipment and presses Enter; a loader shows until 200 (D-02), a spinner
   in the Add panel in place of the Add icon (D-20); it then appears as Available. No success
   message is shown (D-14).
6. Ada marks an Available item out of service and restores it. Each is a server call: a row loader
   shows until 200 (D-02); the row then reads Out of service, and after Restore reads Available
   (D-04). No success message is shown (D-14).
7. Ada clicks x on an item. A confirm modal appears; confirming shows a row loader until 200, then
   the item is gone. (Cancelling leaves it unchanged.)
8. Switch to Mia: she clicks Borrow on an Available item; no modal, loader, then On loan – Mia
   Member. A member may hold several items at once (D-05). She returns it. If a request fails, the
   loader is removed and a modal appears (Close / Retry) and nothing changes (D-08).

### 2.3 Screen states

- Before a user is picked: the switcher, with the placeholder "Choose a user" (D-22), and no
  equipment list (D-01) and no state demos (D-21).
- Loading: list indicator; per-row loader during Borrow, Return, Delete, Mark out of service and
  Restore; a loader during Add (D-02), which is a spinner in the Add panel in place of the Add icon
  (D-20).
- Empty: "No equipment yet" (admins see Add field above).
- Validation: inline message inside the Add panel, below the Add field, for an empty name, a
  whitespace-only name and a name longer than 100 characters after trimming (D-06, D-13). The
  over-length message reads "Name must be 100 characters or fewer." (D-22).
- State demos: shown only once a user is picked; each is a view state that never changes stored
  data (D-21). An Add made from the Show empty list view performs the Add and ends the view,
  showing the real list with the new item in it (D-26).
- API failure: modal with Close and Retry; no change; the loader is removed before the modal
  appears (D-08). The same modal appears when the fetch of the equipment list fails, and its Retry
  repeats the fetch (D-25).
- Access denied: modal "You do not have permission"; nothing changes.
- Confirm delete: modal with Cancel and Confirm icons.

### 2.4 User decisions of 20 October 2026

Allan Pasco, as product owner, accepted all nineteen recommendations put to him on 20 October 2026
with the single answer "accept all". The same day, in a second round, he accepted four further
decisions, D-20 to D-23, put to him with the blueprint's design defaults as the recommendation, with
the answer "accept". In a third round, after review R3, he answered four further decisions, D-24 to
D-27, put to him with the orchestrator's recommendations; D-27 is in his own words. The decisions
are a source of scope on the same footing as the confirmed scope.
The text below is a short form of each; the full text is in `decisions-20261020.md`. Section 10.2
shows where each landed. The response codes in these decisions and in the user's own scope words
(403, 409, 422 and 200: D-01, D-02, D-03, D-06, D-07, D-11, D-12, D-23 and `[Feedback 3]`) remain the
user's decisions and belong in the blueprint's decision list; this PRD keeps them only where it
quotes the user (the confirmed scope, the journey, these decisions, the authority lines, the change
list and the traceability tables), and no acceptance criterion states them.

- **D-01 [G1]** The API refuses any request whose acting identity is missing, malformed, or not one
  of the seeded users, with 403 and no body. Before a user is picked, the page shows the switcher
  and no equipment list.
- **D-02 [G5]** Add, Mark out of service and Restore are server calls with the same treatment as
  Borrow, Return and Delete: a loader until the response arrives, the list changes only after a
  200, and a non-200 shows the failure modal with Close and Retry.
- **D-03 [G8]** Rejecting an admin as borrower is 422. A Borrow on an item that is not Available is
  409.
- **D-04 [G9]** After Restore the item's status is Available.
- **D-05 [Q2]** A member may hold several items at once, with no limit.
- **D-06 [G2]** An equipment name longer than 100 characters, after trimming, is rejected with 422
  and the inline validation message.
- **D-07 [G3]** A member request that names anyone but the acting member as borrower is refused
  with 403 and shows the Access denied modal.
- **D-08 [G6]** The row loader is removed when a non-200 response arrives, and then the failure
  modal appears.
- **D-09 [Q1]** Neither an admin's return nor an admin-set loan is attributed anywhere; nothing
  records or shows who performed it. D-23 settles that this governs the product (the data and the
  interface), not the server's operational log.
- **D-10 [Q3]** Duplicate equipment names are allowed.
- **D-11 [R1-004]** The 409 on deleting a loaned item is accepted as scope, although no HTTP code
  appears in the PRD rev 14.
- **D-12 [R1-005]** A member's forced Add, Mark out of service or Restore is refused with 403 and
  shows the Access denied modal.
- **D-13 [R1-007]** Five inferred readings are accepted as scope: the modals carry a dialog role;
  modals and icon buttons are operable by keyboard; a whitespace-only name is rejected; the seed is
  idempotent; the server, not the client, rejects the loser of two simultaneous borrows.
- **D-14 [R1-006]** The success notes the mockup shows after Add, Mark out of service and Restore
  are not built. The specified modals and row states are the only messages.
- **D-15 [R1-013]** Each switcher entry shows its role. The "every button is an icon" rule covers
  the eleven row and form controls; the borrower modal's member buttons may show a name beside the
  icon.
- **D-16 [G4, R1-010]** The four state demos ship in the built application: Show loading, Show empty
  list, Show API failure, Show access denied. They are exempt, by name, from the "no other control
  exists" inventory.
- **D-17 [G7, R1-001]** The mockup is the look reference: row height 48px, the mockup's corner radii
  and its top-bar blur. "Card", "top bar", "badge" and "system font" are defined from the mockup.
  Translucency, corner rounding and shadows are judged by a named comparison review against the
  mockup, not by numeric thresholds.
- **D-18 [B1]** A plain React single-page application built with Vite. Next.js is not used.
- **D-19 [R1-027]** The trial's security posture is accepted as unproven by automated tests, and no
  "trial-only" label appears in the interface.

The second round, D-20 to D-23, closes the three points this PRD had open (N1, N2 and N3, section
8.2), one blueprint default, and the question of what the server's log may carry:

- **D-20 [N1]** The Add loader: a spinner in the Add panel replaces the Add icon, and while it
  shows, Enter and the Add icon do nothing.
- **D-21 [N3]** The state demos appear only once a user is picked. They are client-only view states
  that never call the API and never change stored data. Show loading shows the list indicator for
  900ms, the mockup's value, and returns to the real list. Show empty list holds until the acting
  user changes or Show loading is activated. Show API failure and Show access denied open their
  modals, and Retry in the demo failure modal only closes it. The orchestrator had recommended
  dropping the 900ms timer; the user kept it, so a test waits for the indicator to appear and then
  disappear rather than sleeping. D-26 adds a third way for the Show empty list view to end: an
  Add made from it that is performed.
- **D-22 [DD-13]** Three strings no source gave, accepted as written: the switcher placeholder
  "Choose a user"; the switcher entry format `<name> (<role>)`, for example "Ada Admin (admin)";
  and the over-length inline message "Name must be 100 characters or fewer."
- **D-23** The access log records the acting user id. This overturns the blueprint's reading of D-09
  as covering the server's access log. D-09 governs the product: no attribution is stored in the
  data or shown in the interface. The access log is operational: it carries method, path, status
  and the acting user id, and no request body and no configuration value. Former question N2 needed
  no decision: D-03 and D-07 both key the answer to the requester, so an admin naming an admin is
  422 and a member naming anyone but themselves is 403, which is what this PRD already said.

The third round, D-24 to D-27, closes the last open question (N4), accepts three behaviours as
scope, adds the failed list fetch, and settles how the two human reviews are verified:

- **D-24 [R3-007]** Three behaviours are accepted as scope, and each stands as this PRD states it:
  an admin's Borrow that names no borrower or names someone who is not a seeded member (REQ-004.11,
  REQ-004.12); an action on an item that is no longer there (REQ-012.16); and the Access denied
  modal for a missing, malformed or unknown acting identity (REQ-001.6 to REQ-001.8).
- **D-25 [R3-008]** A failed fetch of the equipment list shows the API failure modal, and Retry
  repeats the fetch. The alternative was a silently blank page.
- **D-26 [N4]** An Add made from the Show empty list view performs the Add and ends the view,
  showing the real list with the new item in it.
- **D-27 [R3-009]** Each human-review criterion is verified in two steps. First an agent pre-review:
  an agent in a session started for that task, never the agent that built the build, examines the
  build with the whole conversation trail as input (the confirmed scope with its citations, every
  question and its answer, every decision with its decider, and the change rounds) and reports the
  gaps it found, each traced to the criterion and to the place in the trail the expectation came
  from. Second the human review: the user reads that report alongside the build and records the
  verdict. The approval is the user's, and only the user's. The report is evidence for the user,
  never an approval, and can neither pass nor fail a criterion. "Found none" is not clearance: the
  user may find what the agent missed, and the report must say plainly what it could not judge. The
  user's words are quoted in section 9.

### 2.5 The mockup as a source

`mockup-rev14.html` is a cited source of this PRD under D-17, as the look reference. Several
authority lines and criteria cite it by element (for example the `.row` height and the `header`
blur). The mockup is not a source for behaviour that a decision settles differently. Where the
mockup differs from a decision, or from the screen states of the PRD rev 14, the decision or the
screen state governs. The differences found are:

- The mockup starts with Ada Admin already picked, the state demos shown and the list loading. The
  build shows the switcher, with the placeholder "Choose a user" (D-22), and no list and no state
  demos until a user is picked (D-01, D-21).
- The mockup shows a note after Add, Mark out of service and Restore. These are not built (D-14).
- The mockup shows a banner, "Mockup only – sample data, nothing is saved." It is not built (D-19).
- The mockup changes an item's status at once on Mark out of service and Restore, validates the
  Add field without a server call, and shows the Access denied modal without a server call. The
  build treats Add, Mark out of service and Restore as server calls with a loader (D-02), and the
  server refuses a forced action (D-07, D-12).
- The mockup's switcher entries show the name only, with the acting user's role in a badge beside
  the switcher. The build shows the role in each entry, as `<name> (<role>)` (D-15, D-22).
- The mockup shows its validation message ("Name is required.") in a note above the list, outside
  the Add panel. The build shows the inline validation message inside the Add panel, below the Add
  field (REQ-009.4, REQ-009.5, REQ-009.8).
- The mockup's Show empty list empties its data permanently: nothing in the mockup brings the items
  back. The build's Show empty list changes the view only; the real data is unchanged and returns
  when the acting user changes or Show loading is activated (D-21, REQ-013.12, REQ-013.14 to
  REQ-013.16), or when an Add made from the view is confirmed, which ends the view and shows the
  real list with the new item in it (D-26, REQ-013.18, REQ-013.19).
- The mockup's list never fails to load. The build shows the API failure modal when the fetch of
  the equipment list fails, and Retry repeats the fetch (D-25, REQ-013.23 to REQ-013.26).
- The mockup's empty text is "No equipment yet." with a full stop and, for an admin, the hint "Add
  the first item above." The build shows the text as the PRD rev 14 gives it, "No equipment yet"
  (REQ-013.2).
- The mockup's Access denied text is "You do not have permission to do that." The build shows the
  text as the PRD rev 14 gives it, "You do not have permission" (REQ-007.6).

## 3. Users and roles

There are three seeded users and two roles. There are no other users and no way to create one
(see Non-goals).

| Seeded user | Role   |
|-------------|--------|
| Ada Admin   | admin  |
| Mia Member  | member |
| Sam Member  | member |

### 3.1 Admin

May:
- pick any seeded user in the switcher, including themselves (REQ-001);
- see every item with its name and status (REQ-002);
- borrow an Available item on behalf of a member, by choosing the member in the borrower modal
  (REQ-004);
- return any On loan item, including a loan that belongs to a member (REQ-006);
- add equipment (REQ-009);
- mark an Available item out of service and restore an Out of service item (REQ-010);
- delete an item that is not On loan, after confirming (REQ-011).

May not (each is a criterion, not an omission):
- borrow for themselves, or be chosen as a borrower (REQ-004.3, REQ-005.1 to REQ-005.4);
- delete an item that is On loan (REQ-011.2, REQ-011.8);
- mark out of service an item that is not Available, or restore an item that is not Out of service
  (REQ-010.2, REQ-010.5).

### 3.2 Member

May:
- pick any seeded user in the switcher (REQ-001);
- see every item with its name and status (REQ-002);
- borrow an Available item for themselves, with no borrower selection, and hold several items at
  once (REQ-003);
- return an item that is On loan to themselves (REQ-006).

May not (each is a criterion, not an omission):
- name any borrower other than themselves when borrowing (REQ-003.5), and a forced request that
  does is refused and shows the Access denied modal (REQ-003.6);
- see any action on an item that is On loan to another member (REQ-006.3);
- see the Add field, Mark out of service, Restore or Delete (REQ-009.7, REQ-010.7, REQ-011.9);
- return another member's loan, delete, add, mark out of service or restore by a forced attempt:
  the server refuses it and the Access denied modal appears (REQ-007).

### 3.3 No usable acting identity

A request with no acting identity, a malformed one, or one that is not a seeded user may do
nothing: the API refuses it and returns nothing to the caller, and when the request was made
through the interface the Access denied modal appears (REQ-001.6 to REQ-001.8, D-24).

## 4. Definitions

Each term the acceptance criteria rely on is defined here once. A definition states only what the
sources state: the confirmed scope, the user's decisions of 20 October 2026 and the mockup (under
D-17). Where a criterion depends on a point the sources do not settle, the point is an open question
in section 8. At this amendment none is open.

- **Equipment item (item).** One piece of shared equipment in the list. It has a name and exactly
  one status.
- **Row.** The single line of the list that shows one item: its name, its status and the icon
  buttons offered to the acting identity. In the mockup a row is a card (`.card.row`).
- **Status.** One of Available, On loan, Out of service (REQ-002).
- **Available.** The status of an item that can be borrowed. Borrow is offered on an Available item
  (`[Feedback 2]`) and an admin can mark an Available item out of service (`[Idea]`). A newly added
  item is Available (Journey step 5). A returned item is Available (Journey step 4). A restored item
  is Available (D-04).
- **On loan.** The status of an item that has an active loan. The row reads "On loan – <member
  name>", naming the borrower. Return is offered on it (REQ-006); Delete is not offered on it
  (REQ-011).
- **Out of service.** The status an admin gives to an Available item. An item that is Out of
  service is not Available, so borrowing it is rejected (REQ-008). Only an admin can end this
  status, with Restore (REQ-010).
- **Restore.** The admin action that ends the Out of service status of an item (`[Idea]`). The
  item's status afterwards is Available (D-04). Restore is not an undo of Delete; restoring a
  deleted item is a non-goal.
- **Delete.** The admin action, shown as an x icon, that removes an item from the list
  (`[Feedback 6]`). A deleted item cannot be brought back (Non-goals).
- **Active loan.** The current lending of an item to one borrower. An On loan item has exactly one
  active loan. It ends when the item is returned.
- **Admin.** A seeded user with the admin role. In the seeded data, Ada Admin. An admin maintains
  the list, can set a loan for a member and can return any loan. An admin is never a borrower.
- **Member.** A seeded user with the member role. In the seeded data, Mia Member and Sam Member.
- **Borrower.** The member to whom an item is On loan. For a member's Borrow it is the acting
  member. For an admin's Borrow it is the member the admin chose in the borrower modal. It is never
  an admin.
- **Hold.** A member holds an item when the item is On loan to that member. A member may hold
  several items at once (D-05).
- **Seeded user.** One of the three users created on first start (see the table in section 3).
- **Switcher.** The control that lists the seeded users, each entry showing its role (D-15) and
  reading `<name> (<role>)` (D-22), and lets the person using the app pick one. There is no
  password. Before a user is picked it shows a placeholder, the text it shows before a choice is
  made, which reads "Choose a user" (D-22).
- **Acting identity.** The seeded user currently picked in the switcher. Every request is made as
  that user (REQ-001), and "an admin sees" or "a member sees" in this PRD means "the acting identity
  is an admin or a member". The acting identity is picked with no password. Before a user is picked
  there is no acting identity (D-01).
- **Missing, malformed and not-a-seeded-user acting identity.** These three are the cases D-01
  names. A request has a missing acting identity when none accompanies it. It has a malformed one
  when an acting identity accompanies it but not in the form the app uses to name a seeded user. It
  has one that is not a seeded user when the form is right but the identity names none of the three
  seeded users. How the app carries the acting identity is a design matter, not set by this PRD.
- **Forced attempt.** A request for an action that the interface does not offer to the acting
  identity, made anyway. Examples: a member's request to return another member's loan, to delete,
  to add, to mark out of service or to restore (REQ-007), and a member's Borrow request that names
  another borrower (REQ-003.6). The sources use "forced" for this and do not say how it is made.
- **Confirmed.** A server-call action is confirmed when the back-end has carried it out and
  reports success. The user's scope words for this are "the back-end returns 200" (`[Feedback 3]`,
  D-02). The criteria say "confirmed" because the response code is a technical choice that belongs
  to the blueprint (section 2.4).
- **Refused.** A request is refused when the back-end does not carry it out because the acting
  identity may not make it: there is no usable acting identity (D-01), or the action is one that the
  acting user's role does not allow, which is a forced attempt (D-07, D-12). A refused request
  changes nothing. When a person made it through the interface, the Access denied modal appears
  (REQ-007; for an unusable acting identity, REQ-001.6 to REQ-001.8).
- **Rejected, fails.** A request is rejected when the back-end does not carry it out for a reason
  other than lack of permission: for example a Borrow on an item that is On loan or Out of service
  (REQ-008), a delete of an On loan item (REQ-011.8), a Borrow that names an admin (REQ-005.4), a
  Borrow that names no borrower or a borrower who is not a seeded member (REQ-004.11, REQ-004.12),
  an action on an item that is no longer there (REQ-012.16), or a name longer than 100 characters
  after trimming (REQ-009.10). A server-call action fails when its request is rejected, or is not
  carried out for any other reason, except that an Add rejected for an over-long name shows the
  inline validation message and is not a failure (REQ-009.11). When a server-call action fails, the
  API failure modal appears (REQ-012.6). The user's scope words for this are "non-200"
  (`[Feedback 3]`, D-02).
- **Nothing changes.** The list contents, and each item's name, status and borrower, are as they
  were before the action.
- **Server-call action.** One of the six actions that the page sends to the back-end and for which
  it shows a loader: Borrow, Return, Delete, Add, Mark out of service and Restore (D-02).
- **Loader.** The in-progress indicator shown from the moment a server-call action is requested
  until the back-end's response arrives. There are two kinds, the row loader and the Add loader.
  "Until the back-end confirms the action" in this PRD describes the successful path. When the
  action fails or is refused, the loader ends when that response arrives (D-08, REQ-012.14).
- **Row loader.** The loader shown on the one row affected by a Borrow, Return, Delete, Mark out of
  service or Restore (`[Feedback 3]`, D-02). In the mockup it replaces the row's icon buttons with a
  spinner. It does not change the row's height (REQ-015.1).
- **Add loader.** The loader shown while an Add is in progress. An Add has no row until the
  response arrives, so it is not a row loader. It is a spinner in the Add panel that replaces the
  Add icon, and while it shows, Enter and the Add icon do nothing (D-20, REQ-009.13, REQ-009.14).
- **List indicator.** The in-progress indicator for the whole list while the equipment is being
  fetched (Loading state). In the mockup it is a card holding a spinner and "Loading equipment…".
- **List fetch.** The request by which the page obtains the equipment list for the acting identity.
  The page makes it when a user is picked (REQ-013 flow, step 1), and shows the list indicator while
  it is in progress (REQ-013.1). The state demos never make one (D-21). A list fetch fails when the
  back-end does not return the list for a reason other than lack of permission; a list fetch that
  is refused (see Refused) is not a failure and is handled as REQ-001.6 to REQ-001.8 describe. When
  a list fetch fails, the API failure modal appears (REQ-013.23) and its Retry repeats the fetch
  (REQ-013.25). A list fetch is not one of the six server-call actions (D-25).
- **Empty state.** What the page shows when there are no items: the text "No equipment yet", with
  the Add field above it for an admin (REQ-013.2 to REQ-013.4).
- **Real list.** The list of equipment as it is kept: the items, with their names, statuses and
  borrowers, as no state demo affects them.
- **Modal.** A popup over the page. This PRD has four: the borrower modal, the confirm-delete
  modal, the API failure modal and the Access denied modal.
- **Borrower modal.** The modal opened by an admin's Borrow. It lists members.
- **Member button.** One of the buttons in the borrower modal, one per member, that starts the
  borrow for that member. In the mockup it shows an icon with the member's name beside it, and its
  tooltip and accessible label read "Borrow for <member name>". D-15 allows the name beside the
  icon.
- **Confirm-delete modal.** The modal opened by an admin's Delete x. It names the item and has
  Cancel and Confirm icons.
- **API failure modal.** The modal shown when a server-call action fails (see Rejected, fails) and
  when a list fetch fails (see List fetch, D-25). It is not shown when a request is refused, nor
  when an Add is rejected for an over-long name (REQ-009.11). It has Close and Retry icons.
- **Access denied modal.** The modal shown when a request made through the interface is refused
  (see Refused). It reads "You do not have permission" and has a single OK icon.
- **Control.** Anything a person can operate in the interface: a button, the switcher or the Add
  field.
- **Eleven icon controls.** The eleven row and form controls that D-15 names for the "every button
  is an icon" rule: Borrow, Return, Mark out of service, Restore, Delete (x), Add, Close, Retry,
  OK, Cancel and Confirm.
- **Icon button.** A button whose face is an icon and nothing else. The eleven icon controls and
  the four state-demo controls are icon buttons. The member buttons are described separately
  (Member button).
- **Tooltip.** The text that names a button's action when the pointer rests on the button.
- **Accessible label.** A text name for a button that assistive technology can read.
- **Operable by keyboard alone.** Can be reached and activated using the keyboard, with no
  pointer.
- **Alertdialog role.** The accessibility role named `alertdialog`, which tells assistive
  technology that a popup is a dialog that needs the person's attention. The mockup sets it on its
  modal. D-13 accepts that the modals carry a dialog role.
- **Add field.** The text input above the list in which an admin types the name of new equipment.
  It has an Add icon.
- **Add panel.** The panel above the list that holds the Add field and the Add icon. In the mockup
  it is a card (`.card.add`).
- **Whitespace, trimmed name, length of a name.** Whitespace is a character that shows as blank
  space, such as a space or a tab. A trimmed name is the typed name with whitespace removed from its
  start and its end. The length of a name is the number of characters in the trimmed name (D-06).
- **Inline validation message.** A message shown on the page, inside the Add panel and below the Add
  field, and not in a modal. Below the Add field means lower on the page than the field: the top of
  the message is not above the lower edge of the field, and the message does not overlap the field.
  Inside the Add panel means within the bounds of the Add panel. The message is shown for an empty
  name, a whitespace-only name and a name longer than 100 characters after trimming (REQ-009.4,
  REQ-009.5, REQ-009.11).
- **Committed change.** A change to the equipment (an item added or deleted), to an item's status
  or to an item's borrower that the back-end has accepted. A request that is refused, or that fails,
  produces no committed change.
- **Record.** Stored product data: what the application keeps about the equipment, the loans and
  the users, and can show. A criterion about a record is observable by looking at what the
  application shows and at what it has stored. An operational server log is not product data and
  is not a record: what it carries is governed by the blueprint, not by this PRD (D-23).
- **Restart.** Stopping and starting the API and the database.
- **State demos.** The area at the top of the page (`[Feedback 3]`) that holds four controls
  (D-16): Show loading, Show empty list, Show API failure and Show access denied. It appears only
  once a user is picked (D-21). In the mockup the area is a white panel with a 12px corner radius,
  headed "State demos:", with the four buttons each preceded by a text label ("Loading", "Empty",
  "API failure", "Access denied"). The four ship in the built application and are exempt, by name,
  from the "no other control exists" inventory (REQ-017.18). What each shows is in REQ-013.7 to
  REQ-013.10. What they do to the data and how long the state each shows lasts is in REQ-013.11 to
  REQ-013.17 (D-21): each is a view state of the page that never changes stored data (section 2.4
  gives the decision's own wording). The Empty state that Show empty list makes the page show is
  called the Show empty list view. An Add made from the Show empty list view is an ordinary Add,
  not a state demo: when the back-end confirms it, the view ends and the page shows the real list
  with the new item in it (D-26, REQ-013.18 to REQ-013.22).
- **Mockup.** `mockup-rev14.html`, a cited source of this PRD under D-17 as the look reference
  (section 2.5).
- **System font.** The font stack the mockup sets on its page and that every element inherits:
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif`
  (`body` in the mockup; fields and buttons use `font: inherit`). The mockup sets the base text at
  15px with a line height of 1.4.
- **Card.** A white panel with a corner radius of 12px, a subtle shadow and a 6px margin above and
  below, as the mockup's `.card`. The shadow in the mockup is
  `0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)`. In the mockup four things are cards:
  each row of the list, the panel of the Add field, the list indicator and the "No equipment yet"
  text. The modals and the state demos' panel are not cards; they have their own radii
  (REQ-015.11, REQ-015.14).
- **Top bar.** The bar at the top of the page, above the list, as the mockup's `header`. It holds the
  page title and the switcher with its "Acting as" label and the role badge. In the mockup it
  stays at the top of the window while the page scrolls, its background is white at 75% opacity
  (`rgba(255,255,255,.75)`), it blurs what is behind it by 20px (`backdrop-filter: blur(20px)`),
  and it has a 1px line along its lower edge (`rgba(0,0,0,.1)`).
- **Badge.** A small label whose ends are fully rounded, a pill; the mockup gives it a corner
  radius of 99px. The mockup has two kinds. The status badge (`.tag`) carries a row's status text:
  "Available", "On loan – <member name>" or "Out of service". The role badge (`.role`) shows the
  acting user's role next to the switcher.
- **Human review.** The way a criterion that a test cannot decide is verified (D-27). This PRD has
  two human reviews: the mockup comparison review (REQ-015.4 to REQ-015.6) and the non-goal
  walk-through (the criteria of REQ-017 that say the interface shows nothing for a non-goal). Each
  has two steps, in this order. Step one is the agent pre-review. Step two is the user's review: the
  user reads the pre-review report alongside the build and records the verdict, which is, for each
  criterion under review, that it holds or that it does not hold. The approval is the user's, and
  only the user's. Three limits hold for both reviews:
  1. The pre-review report is evidence for the user and never an approval.
  2. The pre-review report can neither pass nor fail a criterion.
  3. "Found none" is not clearance. The user may find what the agent missed, and the report must
     say plainly what the agent could not judge rather than imply that it checked everything.
- **Agent pre-review.** Step one of a human review. An agent examines the build against the criteria
  that the review judges, with the whole conversation trail as input, and reports the gaps it found.
  It runs in a session started for that task, and it is never the agent that built the build.
- **Conversation trail.** The conversation that produced the product, which is the input of the
  agent pre-review: the confirmed scope with its citations, every question put to the user and its
  answer, every decision and who decided it, and every change round.
- **Gap.** A place where the build differs from what a criterion under review, read together with
  the conversation trail, calls for.
- **Pre-review report.** What the agent pre-review produces. It lists each gap found. Each gap is
  traced to the criterion it bears on and to the place in the conversation trail that the
  expectation came from. The report also says plainly what the agent could not judge.
- **Mockup comparison review.** The human review by which D-17 judges translucency, corner rounding
  and shadows. Step one is the agent pre-review, which compares the build with the mockup and
  reports the gaps it found. Step two is the user's review: the user, who is a person other than
  the author of the build, opens the build and the mockup side by side, in the same screen state,
  reads the pre-review report alongside them, and records for each quality named in a criterion
  whether the build matches the mockup or does not. It applies no numeric threshold. In REQ-015.4
  to REQ-015.6, "the reviewer" is the user in step two.
- **Non-goal walk-through.** The human review by which the criteria of REQ-017 that say the
  interface shows nothing for a non-goal are judged. Step one is the agent pre-review, which
  examines the build against those criteria and reports the gaps it found. Step two is the user's
  review: the user reads the pre-review report alongside the build, goes through the interface once
  for each non-goal, and records for each whether any screen, control or message for it exists. The
  half of REQ-017.3 and REQ-017.4 that says no record is kept is about stored data, not about the
  interface, and the walk-through does not judge it.

## 5. Functional requirements

Requirement IDs are stable. They are never reused or renumbered. Sub-numbers such as REQ-003.2
label individual criteria for reference; they are not separate requirements. Each requirement's
authority line is carried over unchanged from requirements rev 41. The decisions of 2026-10-20
appended new criteria after the existing ones, so no existing criterion number moved. Two sets of
existing criteria were reworded in place and kept their numbers: REQ-014.1 (scoped to the eleven
icon controls by D-15) and REQ-015.2 to REQ-015.8 (made measurable or review-judged by D-17). The
title and flow of REQ-012 were widened to the six server-call actions (D-02). A criterion followed
by a bracketed **Authority** takes that authority; a criterion with no bracket takes the authority
line of its requirement. Where a bracketed authority cites a decision for a criterion that the PRD
had held as an inference, the decision has confirmed the criterion and no hedge remains: D-24 did
this for REQ-001.6 to REQ-001.8 (the Access denied modal), REQ-004.11, REQ-004.12 and REQ-012.16.
A criterion that no decision states, and that follows only from two decisions read together, does
not carry a bracketed **Authority**, because that would claim a confirmation the user has not given.
It carries a bracketed **Deduced from** instead, which names the decisions it follows from, points
to the reasoning in section 10.3 and takes no authority of its own. REQ-013.20 to REQ-013.22 are the
criteria of this kind: their tags were relabelled from Authority to Deduced from, and their numbers
and wording were kept.
The amendment for D-24 to D-27 reworded in place, with every number kept: REQ-001.6 to REQ-001.8
(the Access denied modal added), REQ-004.11, REQ-004.12 and REQ-012.16 (authority), REQ-009.4,
REQ-009.5, REQ-009.8 and REQ-009.11 (where the inline validation message is shown, section 4) and
REQ-013.12 (so that it still holds when an Add is made after a state demo). The definition of the
mockup comparison review was rewritten as a two-step human review (D-27); the wording of REQ-015.4
to REQ-015.6 was not changed.

The product owner ruled that technical work belongs to the blueprint and that the acceptance tests
verify business outcomes (section 9). Every acceptance criterion therefore states what a person
sees, is shown or is refused, and names no response code, table or column, module or file, library
or build tool, or log format. Criteria that named a response code, a record kept, or a sent message
were reworded in place and kept their numbers; section 9 lists them. The flows follow the same
wording. The sections that quote the user (2.1, 2.2, 2.4 and 9) keep the user's own words. Appended
criteria carry the decisions D-20 to D-22, D-25 and D-26, and the input-failure cases for missing,
malformed and unauthorized input (section 10.3).

Retired requirements: none.

### 5.1 Requirements that bundle several capabilities

The requirement IDs were adopted from requirements rev 41, and eight of them each carry more than
one capability. They are recorded here and are not split or renumbered, because other artifacts
cite the adopted IDs and a renumbering would break that traceability.

| Requirement | Capabilities it bundles |
|-------------|-------------------------|
| REQ-007 | The server's refusal of five forced member actions; the content and operation of the Access denied modal |
| REQ-010 | Mark out of service; Restore |
| REQ-012 | The loader; the list changing only after the back-end confirms the action; the failure modal with Close and Retry; the retry; the loader's removal when an action fails; the absence of a success note; the action on an item that is no longer there. Six server-call actions |
| REQ-013 | The Loading state; the Empty state; the failure of the list fetch and its Retry; the state demos; an Add made from the Show empty list view |
| REQ-014 | Icon-only buttons; tooltips; accessible labels; the dialog role of modals; operation by keyboard |
| REQ-015 | Uniform row height; the Apple-style elements (system font, top bar, cards, shadows, badges, round icon buttons) |
| REQ-016 | Seeding of the three users; persistence across restart; idempotence of the seed |
| REQ-017 | Sixteen non-goals; no success notes; the "no other control" inventory; no trial-only label |

The protection that the one-capability rule gives is carried instead by criterion-level coverage in
the eval plan: every criterion, by its REQ-nnn.m number, is to be covered by its own check, so that
no capability inside a bundled requirement goes untested.

### REQ-001: Switch the acting user

**Authority:** PRD Acceptance 'Switcher lists exactly three seeded users with role; no password'; Scope [Answer] identity; PRD Journey step 1

**User:** Any seeded user (admin or member).

**Flow:**
1. The person opens the app. The page shows the switcher, with the placeholder "Choose a user", and
   no equipment list until a user is picked.
2. The switcher lists the three seeded users, each with its role.
3. The person picks one of them. No password is asked for.
4. The picked user becomes the acting identity, and every later request is made as that user.
5. The person can pick a different seeded user (Journey step 8: "Switch to Mia").
6. The API refuses any request that has no usable acting identity. When the request was made
   through the interface, the Access denied modal appears.

**Acceptance:**
- REQ-001.1: The switcher lists exactly three users: Ada Admin, Mia Member and Sam Member.
- REQ-001.2: Each entry in the switcher shows its role (admin or member). [Authority: User
  decision 2026-10-20 D-15]
- REQ-001.3: No password field, sign-in screen or sign-up screen exists anywhere in the app.
- REQ-001.4: After the person picks Mia Member, a Borrow that Mia performs makes the row read "On
  loan – Mia Member".
- REQ-001.5: After the person switches from one seeded user to another, the next action is
  performed as the newly picked user, not the previous one. After switching from Ada Admin to Mia
  Member, the Add field is no longer shown (REQ-009.7).
- REQ-001.6: A request with no acting identity is refused by the API: nothing is returned to the
  caller and nothing changes. This holds for any request, including the request that fetches the
  equipment list. When the request was made through the interface, the Access denied modal appears,
  as REQ-007.6 and REQ-007.7 describe, and the API failure modal does not. [Authority: User decision
  2026-10-20 D-01 for the refusal; D-24 for the Access denied modal]
- REQ-001.7: A request whose acting identity is malformed is refused by the API: nothing is
  returned to the caller and nothing changes. When the request was made through the interface, the
  Access denied modal appears, as REQ-007.6 and REQ-007.7 describe, and the API failure modal does
  not. [Authority: User decision 2026-10-20 D-01 for the refusal; D-24 for the Access denied modal]
- REQ-001.8: A request whose acting identity is not one of the seeded users is refused by the API:
  nothing is returned to the caller and nothing changes. When the request was made through the
  interface, the Access denied modal appears, as REQ-007.6 and REQ-007.7 describe, and the API
  failure modal does not. [Authority: User decision 2026-10-20 D-01 for the refusal; D-24 for the
  Access denied modal]
- REQ-001.9: Before a user is picked, the page shows the switcher and shows no equipment list.
  [Authority: User decision 2026-10-20 D-01]
- REQ-001.10: Before a user is picked, the switcher shows the placeholder "Choose a user".
  [Authority: User decision 2026-10-20 D-22]
- REQ-001.11: Each entry in the switcher reads the user's name followed by the role in parentheses:
  "Ada Admin (admin)", "Mia Member (member)" and "Sam Member (member)". [Authority: User decision
  2026-10-20 D-22; REQ-001.2 states that the role is shown]

### REQ-002: Show name and status on every row

**Authority:** PRD Acceptance 'Every row shows name and status; no Details button or screen'; Feedback 2; Non-goals 'detail screens'

**User:** Any seeded user (admin or member).

**Flow:**
1. The person opens the list.
2. Each item is shown as one row with its name and its status.
3. The person cannot open a detail screen for any item.

**Acceptance:**
- REQ-002.1: Every row shows the item's name.
- REQ-002.2: Every row shows exactly one status: "Available", "On loan – <member name>" or "Out of
  service".
- REQ-002.3: A row for an On loan item names its borrower in the status, for example "On loan –
  Mia Member".
- REQ-002.4: No row has a Details button, and no detail screen can be opened from any row.
- REQ-002.5: No green "Borrowed" header is shown (`[Feedback 3]`).

### REQ-003: Member borrows for themselves

**Authority:** PRD Acceptance 'Member Borrow sends the request immediately'; Journey step 8; Feedback 3, 12

**User:** Member (Mia Member, Sam Member).

**Flow:**
1. A member sees an Available item with a Borrow icon.
2. The member activates Borrow. No modal opens and no borrower selection is shown.
3. The request is sent immediately, for that member.
4. The row shows its row loader until the back-end confirms the Borrow.
5. Once confirmed, the row reads "On loan – <that member's name>".
6. A member who already holds items can do the same again, with no limit.

**Acceptance:**
- REQ-003.1: A member sees a Borrow icon on every Available row.
- REQ-003.2: When a member activates Borrow, no modal opens and no borrower selection is shown.
- REQ-003.3: When a member activates Borrow, the request is sent without a further step, and the
  row shows its row loader.
- REQ-003.4: Once the back-end confirms the Borrow, the row reads "On loan – " followed by the name
  of the acting member (Mia Member acting gives "On loan – Mia Member").
- REQ-003.5: A member has no way in the interface to name a borrower other than themselves.
- REQ-003.6: A forced Borrow request by a member that names anyone other than the acting member as
  the borrower is refused; the item's status and borrower are unchanged and the Access denied
  modal appears, as REQ-007.6 and REQ-007.7 describe. [Authority: User decision 2026-10-20 D-07]
- REQ-003.7: A member who already holds one or more items sees a Borrow icon on every Available
  row. [Authority: User decision 2026-10-20 D-05]
- REQ-003.8: A member who already holds one or more items can borrow another Available item, and
  the borrow completes as REQ-003.4 describes. No limit applies to the number of items one member
  holds: a member can go on borrowing until every item that was Available is On loan to that
  member. [Authority: User decision 2026-10-20 D-05]
- A Borrow on an item that is not Available is covered by REQ-008. Loader and failure behaviour is
  covered by REQ-012.
- A member's forced Borrow that names the admin as the borrower is covered by REQ-003.6 as written:
  it is a member's request that names someone other than the acting member. D-03 and D-07 both key
  the answer to the requester, so no further decision was needed (D-23).

### REQ-004: Admin borrows on behalf of a member

**Authority:** PRD Acceptance 'Admin Borrow opens a borrower modal…', 'Choosing a member starts the borrow'; Journey steps 2–3; Feedback 11

**User:** Admin (Ada Admin).

**Flow:**
1. An admin activates Borrow on an Available item.
2. The borrower modal opens. No request has been sent.
3. The modal lists the members and does not list the admin.
4. Either the admin closes the modal, which cancels, or the admin chooses a member.
5. On a choice, the borrow starts for that member and the row shows its row loader until the
   back-end confirms the Borrow.
6. Once confirmed, the row reads "On loan – <chosen member's name>". Nothing shows or records that
   the admin set the loan.

**Acceptance:**
- REQ-004.1: When an admin activates Borrow on an Available row, the borrower modal opens before
  any request is sent.
- REQ-004.2: The borrower modal lists the members only. In the seeded data it lists exactly Mia
  Member and Sam Member.
- REQ-004.3: The admin (Ada Admin) is never listed in the borrower modal and cannot be chosen.
- REQ-004.4: Closing the borrower modal sends no request and changes nothing.
- REQ-004.5: Choosing a member starts the borrow for that member, and the row shows its row loader
  until the back-end confirms the Borrow.
- REQ-004.6: Once the back-end confirms the Borrow, the row reads "On loan – " followed by the name
  of the chosen member (choosing Mia Member gives "On loan – Mia Member").
- REQ-004.7: The borrower modal lists a member who already holds one or more items, in the same way
  as a member who holds none. [Authority: User decision 2026-10-20 D-05]
- REQ-004.8: Choosing a member who already holds one or more items starts the borrow as REQ-004.5
  and REQ-004.6 describe. [Authority: User decision 2026-10-20 D-05]
- REQ-004.9: After an admin sets a loan for a member, nothing in the interface shows that an admin
  set it: the row reads "On loan – <member name>", and no text, tooltip or message names the admin
  as having set the loan. [Authority: User decision 2026-10-20 D-09]
- REQ-004.10: No record of a loan set by an admin names the admin as the person who set it: nothing
  that the application keeps or can show about that loan (a record, section 4) names the admin as
  its setter. [Authority: User decision 2026-10-20 D-09; the operational server log is not a
  record and D-23 governs it]
- REQ-004.11: An admin's Borrow request that names no borrower does not happen: nothing changes
  (the item keeps the status and borrower it had), and the API failure modal appears, as REQ-012.6
  describes. [Authority: User decision 2026-10-20 D-24]
- REQ-004.12: An admin's Borrow request that names a borrower who is not a seeded member does not
  happen: nothing changes (the item keeps the status and borrower it had), and the API failure
  modal appears, as REQ-012.6 describes. Naming the admin is also REQ-005.4. [Authority: User
  decision 2026-10-20 D-24]
- Loader and failure behaviour is covered by REQ-012.

### REQ-005: Admins cannot borrow for themselves

**Authority:** PRD Acceptance 'Admins cannot borrow for themselves'; Feedback 11, 12

**User:** Admin (Ada Admin).

**Flow:**
1. An admin activates Borrow on an Available item.
2. The borrower modal opens; the admin is not listed.
3. If a borrow request made by an admin that names the admin as the borrower reaches the API
   anyway, the API rejects it.

**Acceptance:**
- REQ-005.1: The borrower modal never offers the admin as a borrower (same observation as
  REQ-004.3).
- REQ-005.2: After any sequence of actions by an admin in the interface, no row reads "On loan –
  Ada Admin".
- REQ-005.3: A borrow request that names an admin as the borrower is rejected by the API: the
  Borrow does not happen and the item's status and borrower are unchanged.
- REQ-005.4: A borrow request made by an admin that names an admin as the borrower is rejected, the
  item's status and borrower are unchanged, and the API failure modal appears, as REQ-012.6
  describes. [Authority: User decision 2026-10-20 D-03]
- A borrow request made by a member that names the admin as the borrower is covered by REQ-003.6
  (refused, with the Access denied modal). The answer is keyed to the requester: an admin's request
  is REQ-005.4 and a member's is REQ-003.6 (D-03, D-07; D-23).

### REQ-006: Return a loaned item

**Authority:** PRD Acceptance 'On loan: Return icon for the borrower and for any admin'; Journey step 4; Feedback 9

**User:** The borrower (a member) and any admin.

**Flow:**
1. A person looks at an On loan row.
2. If the person is the borrower, or is an admin, the row shows a Return icon.
3. The person activates Return and the row shows its row loader until the back-end confirms the
   Return.
4. Once confirmed, the row reads Available. Nothing shows or records who performed the return.

**Acceptance:**
- REQ-006.1: A member sees a Return icon on every row that is On loan to that member.
- REQ-006.2: An admin sees a Return icon on every On loan row, including a row whose loan was set
  by an admin for a member.
- REQ-006.3: A member who is not the borrower sees no action on an On loan row.
- REQ-006.4: When Return is activated, the row shows its row loader until the back-end confirms the
  Return.
- REQ-006.5: Once the back-end confirms the Return, the row's status reads Available.
- REQ-006.6: After an admin returns a loan, nothing in the interface shows who returned it: the row
  reads Available, and no text, tooltip or message names the admin as having returned it.
  [Authority: User decision 2026-10-20 D-09]
- REQ-006.7: No record of a return names the person who performed it: nothing that the application
  keeps or can show about the return (a record, section 4) names the person who performed it.
  [Authority: User decision 2026-10-20 D-09; the operational server log is not a record and D-23
  governs it]
- A forced return of another member's loan by a member is covered by REQ-007.1.

### REQ-007: Refuse unauthorized actions with the Access denied modal

**Authority:** PRD Acceptance 'A forced member attempt…shows the Access denied modal', 'Access denied is a modal with a single OK icon'; Screen states

**Source note:** The PRD criterion names two forced actions, returning another's loan and delete.
REQ-007 in requirements rev 41 extends the same treatment to add, mark out of service and restore.
The user's decision D-12 (2026-10-20) accepts that extension as scope, because Add, Mark out of
service and Restore are server calls (D-02): REQ-007.3 to REQ-007.5 and the modal in REQ-007.6
carry that authority.

**User:** Member (the person who is refused).

**Flow:**
1. A member makes a forced attempt: return another member's loan, delete, add, mark out of
   service, or restore.
2. The server refuses the request.
3. The Access denied modal appears, reading "You do not have permission", with a single OK icon.
4. The member activates OK and the modal closes. Nothing has changed.

**Acceptance:**
- REQ-007.1: A forced attempt by a member to return another member's loan is refused: the item is
  still On loan to its original borrower, and the Access denied modal appears (REQ-007.6).
- REQ-007.2: A forced attempt by a member to delete an item is refused: the item is still in the
  list, and the Access denied modal appears (REQ-007.6).
- REQ-007.3: A forced attempt by a member to add equipment is refused: no item is created, and the
  Access denied modal appears (REQ-007.6). [Authority: User decision 2026-10-20 D-12]
- REQ-007.4: A forced attempt by a member to mark an item out of service is refused: the item's
  status is unchanged, and the Access denied modal appears (REQ-007.6). [Authority: User decision
  2026-10-20 D-12]
- REQ-007.5: A forced attempt by a member to restore an item is refused: the item's status is
  unchanged, and the Access denied modal appears (REQ-007.6). [Authority: User decision 2026-10-20
  D-12]
- REQ-007.6: For each refusal in REQ-007.1 to REQ-007.5 the Access denied modal appears, with the
  text "You do not have permission". [Authority for its application to REQ-007.3 to REQ-007.5: User
  decision 2026-10-20 D-12]
- REQ-007.7: The Access denied modal has a single OK icon. It has no Close icon and no Retry icon.
- REQ-007.8: Activating OK closes the Access denied modal, and nothing changes.
- A forced Borrow by a member that names another borrower is covered by REQ-003.6. A request with
  no usable acting identity, and the Access denied modal it shows when made through the interface,
  are covered by REQ-001.6 to REQ-001.8.

### REQ-008: One active loan per item

**Authority:** PRD Acceptance 'An item never has more than one active loan'; Scope [Idea] exactly one active loan per item

**User:** Any acting user who borrows (admin or member).

**Flow:**
1. A Borrow request arrives for an item.
2. If the item is Available, the borrow is accepted and the item has one active loan.
3. If the item is not Available, the request is rejected and nothing changes.
4. If two Borrow requests for the same Available item arrive at the same time, the server accepts
   one and rejects the other.

**Acceptance:**
- REQ-008.1: At no time does any item have more than one active loan or show more than one
  borrower.
- REQ-008.2: A Borrow request for an item that is On loan is rejected: the Borrow does not happen
  and the item's borrower is unchanged.
- REQ-008.3: A Borrow request for an item that is Out of service is rejected: the Borrow does not
  happen and the item's status is unchanged.
- REQ-008.4: When two Borrow requests for the same Available item are sent at the same time, one is
  confirmed and the other is rejected, and the item has exactly one borrower afterwards. The
  server, not the client, rejects the loser. [Authority: User decision 2026-10-20 D-13]
- REQ-008.5: A rejected Borrow fails (section 4) and is shown as REQ-012.5 and REQ-012.6
  describe.
- REQ-008.6: A Borrow request for an item that is On loan is rejected: the item's borrower is
  unchanged and the API failure modal appears, as REQ-012.6 describes. [Authority: User decision
  2026-10-20 D-03]
- REQ-008.7: A Borrow request for an item that is Out of service is rejected: the item's status is
  unchanged and the API failure modal appears, as REQ-012.6 describes. [Authority: User decision
  2026-10-20 D-03]
- REQ-008.8: In REQ-008.4 the person whose request is rejected is shown the API failure modal, as
  REQ-012.6 describes, and the item is On loan to the borrower named in the confirmed request.
  [Authority: User decision 2026-10-20 D-03 and D-13]

### REQ-009: Add equipment

**Authority:** PRD Acceptance 'Enter in the Add field…', 'Admins see Add equipment (above the list)'; Journey step 5; Feedback 8

**User:** Admin (Ada Admin).

**Flow:**
1. An admin sees the Add field above the list.
2. The admin types a name.
3. The admin presses Enter or activates the Add icon.
4. The new item appears in the list as Available, once the back-end confirms the Add (REQ-012.9 to
   REQ-012.11). Until then a spinner in the Add panel replaces the Add icon, and Enter and the Add
   icon do nothing (REQ-009.13, REQ-009.14).
5. If the name is empty or only whitespace, or longer than 100 characters after trimming, an
   inline validation message appears inside the Add panel, below the Add field, and no item is
   created.

**Acceptance:**
- REQ-009.1: An admin sees the Add field above the equipment list.
- REQ-009.2: With a name typed, pressing Enter adds an item with that name, and it appears in the
  list as Available.
- REQ-009.3: With a name typed, activating the Add icon has the same result as pressing Enter.
- REQ-009.4: With the Add field empty, pressing Enter shows an inline validation message inside
  the Add panel, below the Add field, and no item is created.
- REQ-009.5: With the Add field empty, activating the Add icon shows an inline validation message
  inside the Add panel, below the Add field, and no item is created.
- REQ-009.6: A name made only of whitespace is treated as an empty name (REQ-009.4 and
  REQ-009.5). [Authority: User decision 2026-10-20 D-13]
- REQ-009.7: A member sees no Add field.
- REQ-009.8: The inline validation message is on the page, inside the Add panel and below the Add
  field (section 4), and is not a modal: no modal opens when it appears.
- REQ-009.9: When an admin adds a name that an item in the list already has, the add is accepted
  and the list then shows two items with that name, the new one Available. [Authority: User
  decision 2026-10-20 D-10]
- REQ-009.10: A request to add a name longer than 100 characters after trimming is rejected by the
  server, and no item is created. [Authority: User decision 2026-10-20 D-06]
- REQ-009.11: When an admin submits a name longer than 100 characters after trimming in the Add
  field, the inline validation message appears inside the Add panel, below the Add field, no item
  is created, and the API failure modal does not appear. [Authority: User decision 2026-10-20 D-06]
- REQ-009.12: A name of 100 characters or fewer after trimming is not rejected for its length; it
  is added as REQ-009.2 describes. [Authority: User decision 2026-10-20 D-06]
- REQ-009.13: While an Add is in progress, the Add loader is shown in the Add panel, in place of the
  Add icon. [Authority: User decision 2026-10-20 D-20]
- REQ-009.14: While the Add loader is shown, pressing Enter in the Add field does nothing and
  activating the Add icon does nothing: no second Add is made, no second item is created and no
  message appears. [Authority: User decision 2026-10-20 D-20]
- REQ-009.15: The inline validation message for a name longer than 100 characters after trimming
  reads "Name must be 100 characters or fewer." [Authority: User decision 2026-10-20 D-22]
- A forced add by a member is covered by REQ-007.3. The loader, the confirmation, the failure modal
  and the absence of a success note for Add are covered by REQ-012.9 to REQ-012.15. Where the Add
  loader is shown, and what Enter and the Add icon do while it shows, are REQ-009.13 and REQ-009.14
  (D-20). An Add made from the Show empty list view is carried out and ends the view; what it does
  and what the page shows are REQ-013.18 and REQ-013.19 (D-26). The Adds made from that view that
  are not carried out are REQ-013.20 to REQ-013.22 (deduced from D-21 and D-26, section 10.3).

### REQ-010: Out-of-service status of equipment

**Authority:** PRD Acceptance 'Admins see…Mark out of service (Available only), Restore (out of service only)'; Journey step 6; Scope [Idea] admins mark out of service, restore

**User:** Admin (Ada Admin).

**Flow:**
1. An admin sees a Mark out of service icon on an Available row.
2. The admin activates it and, once the back-end confirms the action, the row's status reads Out of
   service.
3. The admin sees a Restore icon on an Out of service row.
4. The admin activates it and, once the back-end confirms the action, the row's status reads
   Available.

**Acceptance:**
- REQ-010.1: An admin sees the Mark out of service icon on every Available row.
- REQ-010.2: An admin sees no Mark out of service icon on an On loan row or an Out of service row.
- REQ-010.3: After an admin activates Mark out of service on an Available row, the row's status
  reads Out of service.
- REQ-010.4: An admin sees the Restore icon on every Out of service row.
- REQ-010.5: An admin sees no Restore icon on an Available row or an On loan row.
- REQ-010.6: After an admin activates Restore on an Out of service row, the row's status reads
  Available. [Authority: User decision 2026-10-20 D-04]
- REQ-010.7: A member sees neither the Mark out of service icon nor the Restore icon.
- Forced attempts by a member are covered by REQ-007.4 and REQ-007.5. The loader, the confirmation,
  the failure modal and the absence of a success note for Mark out of service and Restore are
  covered by REQ-012.9 to REQ-012.15.

### REQ-011: Delete equipment with confirmation

**Authority:** PRD Acceptance 'Admin Delete x opens a confirm modal…', 'Delete x (not on loaned items)'; Journey step 7; Feedback 6, 13

**User:** Admin (Ada Admin).

**Flow:**
1. An admin sees a Delete x icon on a row that is not On loan.
2. The admin activates it. The confirm-delete modal opens, naming the item. No request has been
   sent.
3. Either the admin activates Cancel, which closes the modal, or the admin activates Confirm.
4. On Confirm the delete is requested and the row shows its row loader until the back-end confirms
   the delete.
5. Once confirmed, the item is gone from the list.

**Acceptance:**
- REQ-011.1: An admin sees the Delete x icon on every Available row and every Out of service row.
- REQ-011.2: An admin sees no Delete x icon on an On loan row.
- REQ-011.3: Activating Delete x opens the confirm-delete modal, and the modal names the item,
  before any request is sent.
- REQ-011.4: The confirm-delete modal has a Cancel icon and a Confirm icon.
- REQ-011.5: Activating Cancel closes the modal, sends no request and changes nothing.
- REQ-011.6: Activating Confirm sends the delete, and the row shows its row loader until the
  back-end confirms the delete.
- REQ-011.7: Once the back-end confirms the delete, the item is no longer in the list.
- REQ-011.8: A delete request for an On loan item is rejected by the server: the item is still in
  the list and still On loan to its borrower, and the API failure modal appears, as REQ-012.6
  describes. [Authority: User decision 2026-10-20 D-11, which accepts this server-side rejection as
  scope although the PRD rev 14 does not state it]
- REQ-011.9: A member sees no Delete x icon.
- A forced delete by a member is covered by REQ-007.2. A delete that fails is shown as REQ-012.5
  and REQ-012.6 describe.

### REQ-012: Outcome of a server-call action

**Authority:** PRD Acceptance 'Borrow/Return/Delete show a row loader; the list changes only after a 200; no success banner', 'On a non-200 response nothing changes'; Journey step 8; Feedback 3, 5, 7

**Source note:** The PRD criterion 'On a non-200 response nothing changes; modal with Close and
Retry icons' is not limited to Borrow, Return and Delete, and REQ-012 in requirements rev 41 is.
User decision 2026-10-20 D-02 settles the others: Add, Mark out of service and Restore are server
calls with the same treatment. REQ-012.1 to REQ-012.8 state the criteria for Borrow, Return and
Delete; REQ-012.9 to REQ-012.13 state them for Add, Mark out of service and Restore; REQ-012.14
(D-08) applies to all six; REQ-012.15 (D-14) states that no success note is built; REQ-012.16
states the case of an action on an item that is no longer there (section 10.3). The title of this
requirement names the six as "server-call actions" (section 4).

**User:** Any acting user who performs a server-call action (admin or member).

**Flow:**
1. The person activates Borrow, Return, Delete, Add, Mark out of service or Restore (after any
   modal step the action has).
2. A loader shows: the row loader on the affected row, or the Add loader for an Add.
3. Once the back-end confirms the action, the list changes to the new state. No success banner or
   note appears.
4. If the action fails (section 4), the loader is removed, the API failure modal appears, and
   nothing changes. A refusal is handled as REQ-007 describes, and an Add rejected for an over-long
   name as REQ-009.11 describes.
5. The person activates Close, which closes the modal, or Retry, which repeats the same request.

**Acceptance:**
- REQ-012.1: After a Borrow, Return or Delete is requested, the affected row shows its row loader
  until the back-end confirms the action.
- REQ-012.2: Until the action is confirmed, the row's status and the list contents are as they were
  before the request.
- REQ-012.3: When the back-end confirms the action, the list shows the new state: "On loan –
  <member name>" after a Borrow, Available after a Return, the item gone after a Delete.
- REQ-012.4: No success banner is shown when an action is confirmed.
- REQ-012.5: When a Borrow, Return, Delete, Add, Mark out of service or Restore fails (section 4),
  the action does not happen and nothing changes.
- REQ-012.6: When a Borrow, Return, Delete, Add, Mark out of service or Restore fails (section 4),
  the API failure modal appears, with a Close icon and a Retry icon.
- REQ-012.7: Activating Close closes the API failure modal, and nothing changes.
- REQ-012.8: Activating Retry repeats the same request (same item, same action, same chosen
  member for an admin's Borrow). If the repeat is confirmed, REQ-012.3 applies.
- REQ-012.9: After an Add, a Mark out of service or a Restore is requested, a loader is shown until
  the back-end's response arrives: the row loader on the affected row for Mark out of service and
  Restore, and the Add loader for Add. [Authority: User decision 2026-10-20 D-02]
- REQ-012.10: Until the action is confirmed, the list is as it was before the request: the new item
  is not yet in the list after an Add, the row still reads Available after a Mark out of service,
  and the row still reads Out of service after a Restore. [Authority: User decision 2026-10-20 D-02]
- REQ-012.11: When the back-end confirms the action, the list shows the new state: the added item
  as Available after an Add, Out of service after a Mark out of service, and Available after a
  Restore. [Authority: User decision 2026-10-20 D-02 and D-04]
- REQ-012.12: When an Add, a Mark out of service or a Restore fails (section 4: it is not refused,
  and an Add is not rejected for an over-long name, REQ-009.10), the action does not happen, nothing
  changes, and the API failure modal appears, with a Close icon and a Retry icon. [Authority: User
  decision 2026-10-20 D-02]
- REQ-012.13: Activating Retry in the API failure modal after a failed Add repeats the add with the
  same name; after a failed Mark out of service or Restore it repeats the same action on the same
  item. If the repeat is confirmed, REQ-012.11 applies. [Authority: User decision 2026-10-20 D-02]
- REQ-012.14: When any of the six server-call actions fails (section 4), the loader is removed when
  the response arrives, and the API failure modal appears after that: while the modal is shown, no
  loader is shown for the action. [Authority: User decision 2026-10-20 D-08]
- REQ-012.15: No success note or message appears when an Add, a Mark out of service or a Restore is
  confirmed. The notes that the mockup shows ("Added <name>", "<name> marked out of service",
  "<name> restored") are not built. [Authority: User decision 2026-10-20 D-14]
- REQ-012.16: When a Borrow, Return, Delete, Mark out of service or Restore is requested for an item
  that is no longer there (for example because another person has deleted it), the action does not
  happen, nothing changes, and the API failure modal appears, as REQ-012.6 describes. [Authority:
  User decision 2026-10-20 D-24]
- A refusal is handled as REQ-007 describes, not as above.
- A failed fetch of the equipment list is not one of the six server-call actions. It shows the same
  API failure modal and is covered by REQ-013.23 to REQ-013.26 (D-25).

### REQ-013: List page states

**Authority:** PRD Screen states; Acceptance 'State demos appear at the top'; Feedback 3

**Source note:** REQ-013.5 to REQ-013.17 carry D-16 and D-21. REQ-013.18 and REQ-013.19 carry D-26,
which settles what an Add made from the Show empty list view does: they state the Add that is
carried out. REQ-013.20 to REQ-013.22 state the Adds that are not carried out. No decision states
them: they are deduced from D-21 and D-26 together and carry a **Deduced from** tag, not an
**Authority** tag (section 10.3). REQ-013.23 to REQ-013.26 carry D-25, which
adds the failed fetch of the equipment list. The terms list fetch, Show empty list view and real
list are defined in section 4.

**User:** Any seeded user (admin or member). The Add made from the Show empty list view is made by
an admin, because a member has no Add field.

**Flow:**
1. The person picks a user and the equipment is fetched; the list indicator shows meanwhile. If the
   fetch fails, the API failure modal appears, with Close and Retry, and Retry repeats the fetch
   (D-25).
2. If there is no equipment, the page shows "No equipment yet".
3. Once a user is picked, the state demos appear at the top of the page. Before then they are not
   shown.
4. A person activates a state demo and the page shows the state it names. A state demo changes the
   view only and never changes stored data.
5. While the Show empty list view is showing, an admin adds a name. This is an ordinary Add. Once
   the back-end confirms it, the Show empty list view ends and the page shows the real list with the
   new item in it (D-26).

**Acceptance:**
- REQ-013.1: While the equipment is being fetched, the page shows the list indicator.
- REQ-013.2: When there are no items, the page shows the text "No equipment yet".
- REQ-013.3: In the Empty state, an admin sees the Add field above the text "No equipment yet".
- REQ-013.4: In the Empty state, a member sees the text "No equipment yet" and no Add field.
- REQ-013.5: Once a user is picked (REQ-013.11), the state demos appear at the top of the page.
- REQ-013.6: For each seeded user, the state demos contain exactly four controls, named Show
  loading, Show empty list, Show API failure and Show access denied, and ship in the built
  application. [Authority: User decision 2026-10-20 D-16]
- REQ-013.7: Activating Show loading makes the page show the list indicator (REQ-013.1).
  [Authority: User decision 2026-10-20 D-16]
- REQ-013.8: Activating Show empty list makes the page show the text "No equipment yet", with the
  Add field above it for an admin and no Add field for a member (REQ-013.2 to REQ-013.4).
  [Authority: User decision 2026-10-20 D-16]
- REQ-013.9: Activating Show API failure opens the API failure modal with a Close icon and a Retry
  icon (REQ-012.6). [Authority: User decision 2026-10-20 D-16]
- REQ-013.10: Activating Show access denied opens the Access denied modal with the text "You do not
  have permission" and a single OK icon (REQ-007.6 and REQ-007.7). [Authority: User decision
  2026-10-20 D-16]
- REQ-013.11: Before a user is picked, the state demos are not shown: the page shows the switcher
  and no equipment list (REQ-001.9). Once a user is picked, the four state demos are shown
  (REQ-013.5, REQ-013.6). [Authority: User decision 2026-10-20 D-21]
- REQ-013.12: Activating a state demo changes nothing that is kept. After any of the four state
  demos has been activated, with no other action made since, and the page is reloaded, the page
  shows, once a user is picked, the same items with the same names, statuses and borrowers as before
  the demo was activated. [Authority: User decision 2026-10-20 D-21]
- REQ-013.13: Activating Show loading shows the list indicator for 900ms (the mockup's value) and
  then, with no further action by the person, shows the real list again. [Authority: User decision
  2026-10-20 D-21]
- REQ-013.14: Activating Show empty list shows the Show empty list view (REQ-013.8), and the page
  stays in it: the view does not end by itself, however long the person waits. [Authority: User
  decision 2026-10-20 D-21]
- REQ-013.15: While the Show empty list view is showing, when the person picks another seeded user
  in the switcher, the page shows the real list for that user. [Authority: User decision
  2026-10-20 D-21]
- REQ-013.16: While the Show empty list view is showing, activating Show loading shows the list
  indicator for 900ms and then the real list: the Show empty list view does not return. [Authority:
  User decision 2026-10-20 D-21]
- REQ-013.17: In the API failure modal opened by Show API failure, activating Retry closes the modal
  and does nothing else: no loader is shown and nothing changes. [Authority: User decision
  2026-10-20 D-21]
- REQ-013.18: While the Show empty list view is showing, an admin who types a name of 100
  characters or fewer after trimming and presses Enter, or activates the Add icon, makes the Add:
  the new item is created as REQ-009.2 and REQ-009.3 describe, and it is kept, so that when the page
  is reloaded and a user is picked, the real list holds the new item as Available. [Authority: User
  decision 2026-10-20 D-26]
- REQ-013.19: When the back-end confirms an Add made from the Show empty list view, the Show empty
  list view ends: the page shows the real list, which holds the new item as Available together
  with every item it held before the Add, and the text "No equipment yet" is not shown. Until the
  back-end confirms the Add, the page still shows the Show empty list view, because the list does
  not change before the action is confirmed (REQ-012.10). [Authority: User decision 2026-10-20
  D-26; D-02 for the timing]
- REQ-013.20: While the Show empty list view is showing, an Add of an empty name or a name made
  only of whitespace is not carried out: the inline validation message appears as REQ-009.4 to
  REQ-009.6 describe, no item is created, and the page stays in the Show empty list view.
  [Deduced from User decision 2026-10-20 D-21 and D-26 together; no decision states it; the
  reasoning is in section 10.3]
- REQ-013.21: While the Show empty list view is showing, an Add of a name longer than 100 characters
  after trimming is not carried out: the inline validation message appears as REQ-009.11 and
  REQ-009.15 describe, no item is created, the API failure modal does not appear, and the page stays
  in the Show empty list view. [Deduced from User decision 2026-10-20 D-21 and D-26 together; no
  decision states it; the reasoning is in section 10.3]
- REQ-013.22: While the Show empty list view is showing, when an Add fails (section 4), the Add does
  not happen, no item is created, the API failure modal appears as REQ-012.12 describes, and the
  page stays in the Show empty list view. Activating Retry repeats the add with the same name, and
  if the repeat is confirmed REQ-013.18 and REQ-013.19 apply. [Deduced from User decision
  2026-10-20 D-21 and D-26 together; no decision states it; the reasoning is in section 10.3]
- REQ-013.23: When the fetch of the equipment list fails (section 4, List fetch), the API failure
  modal appears, with a Close icon and a Retry icon, as REQ-012.6 describes. [Authority: User
  decision 2026-10-20 D-25]
- REQ-013.24: Activating Close in the API failure modal of a failed list fetch closes the modal and
  does not repeat the fetch: the list indicator is not shown again. [Authority: User decision
  2026-10-20 D-25]
- REQ-013.25: Activating Retry in the API failure modal of a failed list fetch repeats the fetch
  for the same acting identity. While the repeat is in progress the page shows the list indicator
  (REQ-013.1), and when it succeeds the page shows the list, or the text "No equipment yet" when
  there are no items (REQ-013.2). [Authority: User decision 2026-10-20 D-25]
- REQ-013.26: When the repeated fetch fails too, the API failure modal appears again, with a Close
  icon and a Retry icon. [Authority: User decision 2026-10-20 D-25]
- The per-row loader is covered by REQ-012.1 and REQ-012.9. What the state demos do to the data,
  and how long the state each shows lasts, are REQ-013.11 to REQ-013.17 (D-21). What an Add made
  from the Show empty list view does, and when it ends the view, are REQ-013.18 and REQ-013.19
  (D-26); the Adds made from that view that are not carried out are REQ-013.20 to REQ-013.22
  (deduced from D-21 and D-26, section 10.3). The failed list fetch is REQ-013.23 to REQ-013.26 (D-25); a list fetch that is refused
  because there is no usable acting identity is REQ-001.6 to REQ-001.8. The state demos' tooltips
  and accessible labels are REQ-014.10; their exemption from the "no other control" inventory is
  REQ-017.18.

### REQ-014: Labelled icon buttons and operable modals

**Authority:** PRD Acceptance 'Every button is an icon with tooltip and accessible label'; Feedback 6; mockup button title/aria-label attributes

**Source note:** The PRD criterion covers icon, tooltip and accessible label (REQ-014.1 to
REQ-014.3). The modal sentence (REQ-014.4 and REQ-014.5) appears only in the description of REQ-014
in requirements rev 41; the authority line cited above does not name it. User decision 2026-10-20
D-13 accepts the dialog role and keyboard operation as scope (REQ-014.4 to REQ-014.7). D-15 settles
that the "every button is an icon" rule covers the eleven icon controls (REQ-014.1, REQ-014.8). The
mockup is a cited source (section 2.5), so the authority line is correct.

**User:** Any seeded user (admin or member).

**Flow:**
1. A person looks at any button in the app.
2. Each of the eleven icon controls is an icon, and resting the pointer on any button shows its
   tooltip.
3. A person using assistive technology hears the button's accessible label.
4. A modal opens and the person operates it by keyboard.

**Acceptance:**
- REQ-014.1: Each of the eleven icon controls, which are Borrow, Return, Mark out of service,
  Restore, Delete (x), Add, Close, Retry, OK, Cancel and Confirm, is displayed as an icon wherever
  it appears, including inside modals. This criterion covers these eleven controls only
  (REQ-014.8). [Authority: User decision 2026-10-20 D-15]
- REQ-014.2: Every icon button shows a tooltip naming its action when the pointer rests on it.
- REQ-014.3: Every icon button has an accessible label naming its action.
- REQ-014.4: Every modal uses the role alertdialog. [Authority: User decision 2026-10-20 D-13; the
  mockup sets `role="alertdialog"` on its modal]
- REQ-014.5: Every icon button in a modal can be reached and activated with the keyboard alone.
  [Authority: User decision 2026-10-20 D-13]
- REQ-014.6: Every icon button outside the modals (the buttons on rows, the Add icon and the four
  state-demo controls) can be reached and activated with the keyboard alone. [Authority: User
  decision 2026-10-20 D-13]
- REQ-014.7: Every member button in the borrower modal can be reached and activated with the
  keyboard alone. [Authority: User decision 2026-10-20 D-13]
- REQ-014.8: The rule of REQ-014.1 covers the eleven icon controls only. A member button in the
  borrower modal may show the member's name beside its icon. [Authority: User decision 2026-10-20
  D-15]
- REQ-014.9: Every member button in the borrower modal shows a tooltip and has an accessible label
  that name the action and the member, for example "Borrow for Mia Member". [Authority: PRD
  Acceptance 'Every button is an icon with tooltip and accessible label', which D-15 relaxes only
  for the icon rule; the example text is the mockup's `title` and `aria-label`]
- REQ-014.10: Each of the four state-demo controls shows a tooltip naming its action and has an
  accessible label, and the accessible labels are "Show loading", "Show empty list", "Show API
  failure" and "Show access denied". [Authority: User decision 2026-10-20 D-16; the labels are the
  names D-16 gives and the mockup's `aria-label` values]

### REQ-015: Apple-style look with uniform rows

**Authority:** PRD Acceptance 'All rows have identical, reduced height', 'Apple-style look'; Feedback 1, 4, 5; mockup .row height:48px

**Source note:** The mockup is a cited source under User decision 2026-10-20 D-17, which makes it
the look reference. The decision gives the measured values: row height 48px, the mockup's corner
radii and its top-bar blur. Translucency, corner rounding and shadows are judged by the mockup
comparison review (section 4) against the mockup, not by numeric thresholds. That review is a human
review of two steps: an agent pre-review reports the gaps it found, and then the user reads the
report alongside the build and records the verdict (D-27, section 4). The report is evidence, not an
approval, and the wording of REQ-015.4 to REQ-015.6 about what is judged is unchanged. The terms "card", "top
bar", "badge" and "system font" are defined from the mockup in section 4. Each criterion below is
either a value that can be measured or a criterion judged by the mockup comparison review.

**User:** Any seeded user (admin or member).

**Flow:**
1. A person views the list with rows in each status, as an admin and as a member.
2. Every row has the same height.
3. The page shows the Apple-style elements.

**Acceptance:**
- REQ-015.1: Every row has the same height as every other row, whatever its status (Available, On
  loan, Out of service), whatever icons it shows (an admin's row has more icons than a member's,
  and some rows have none), and while its row loader is shown.
- REQ-015.2: Every row is 48px high, measured as the height of the row's card without the 6px
  margin between cards. Measured. [Authority: User decision 2026-10-20 D-17; mockup `.row`
  `height: 48px`; `[Feedback 6]` "Rows are thinner"]
- REQ-015.3: All text on the page, including the text in fields, the switcher, buttons and modals,
  is set in the system font: the font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text",
  "Helvetica Neue", system-ui, sans-serif`. Measured, by reading the font family set on each kind
  of element. [Authority: User decision 2026-10-20 D-17; mockup `body`]
- REQ-015.4: The top bar is translucent. Judged by the mockup comparison review: the reviewer
  finds that the build's top bar, with the list scrolled beneath it, matches the mockup's top bar,
  which is white at 75% opacity over the page. Review-judged against the mockup. [Authority: User
  decision 2026-10-20 D-17; mockup `header`]
- REQ-015.5: Cards have rounded corners. Judged by the mockup comparison review: the reviewer finds
  that the build's cards match the mockup's cards in the rounding of their corners. The measured
  radius is REQ-015.10. Review-judged against the mockup. [Authority: User decision 2026-10-20
  D-17; mockup `.card`]
- REQ-015.6: Cards have subtle shadows. Judged by the mockup comparison review: the reviewer finds
  that the build's card shadows match the mockup's card shadows
  (`0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)`). Review-judged against the mockup. [Authority: User decision 2026-10-20
  D-17; mockup `.card`]
- REQ-015.7: The status text of every row is shown in a badge, and every badge is pill-shaped: its
  corner radius is at least half its height, so that both ends are semicircles (the mockup uses
  99px). Measured. [Authority: User decision 2026-10-20 D-17; mockup `.tag`, `.role`]
- REQ-015.8: All fifteen icon buttons are round, wherever each appears (on rows, in the Add panel,
  in modals and in the state demos): the eleven icon controls (Borrow, Return, Mark out of service,
  Restore, Delete (x), Add, Close, Retry, OK, Cancel and Confirm) and the four state-demo controls
  (Show loading, Show empty list, Show API failure and Show access denied). Each is as wide as it is
  tall and its corner radius is 50% (the mockup's icon buttons are 30px across, and 40px in modals).
  Measured. The member buttons of the borrower modal are not icon buttons and are covered by
  REQ-015.13. [Authority: User decision 2026-10-20 D-17; mockup `button`, `.modal button`]
- REQ-015.9: The top bar blurs what is behind it by 20px. Measured. [Authority: User decision
  2026-10-20 D-17; mockup `header` `backdrop-filter: blur(20px)`]
- REQ-015.10: Every card has a corner radius of 12px. Measured. [Authority: User decision
  2026-10-20 D-17; mockup `.card`]
- REQ-015.11: Every modal has a corner radius of 16px. Measured. [Authority: User decision
  2026-10-20 D-17; mockup `.modal`]
- REQ-015.12: The switcher and the Add field each have a corner radius of 8px. Measured.
  [Authority: User decision 2026-10-20 D-17; mockup `select, input`]
- REQ-015.13: Each member button in the borrower modal has a corner radius of 10px. Measured.
  [Authority: User decision 2026-10-20 D-17; mockup `.modal .bt button.pk`]
- REQ-015.14: The state demos' panel has a corner radius of 12px. Measured. [Authority: User
  decision 2026-10-20 D-17; mockup `.demo`]

### REQ-016: Committed data persists across restart

**Authority:** PRD Acceptance 'Committed changes remain after restart'; Scope [Idea] seed one admin and two members, persistence

**User:** Any seeded user (admin or member).

**Flow:**
1. On first start, the app seeds one admin and two members.
2. People make committed changes: they add or delete equipment, change an item's status or change
   an item's borrower.
3. The API and the database are restarted.
4. The same state is shown afterwards.

**Acceptance:**
- REQ-016.1: After first start, the switcher lists exactly one admin and two members: Ada Admin,
  Mia Member and Sam Member.
- REQ-016.2: After a restart of the API and the database, every committed change made before the
  restart is still present: added equipment is still listed, deleted equipment is still absent,
  each item has the same status, and each On loan item still shows the same borrower.
- REQ-016.3: The seed is idempotent: after a restart, the switcher still lists exactly three
  users, with no duplicates, and the committed changes of REQ-016.2 are still present. [Authority:
  User decision 2026-10-20 D-13]

### REQ-017: Restraint on non-goals

**Authority:** PRD Non-goals; PRD Unresolved product questions (assumptions)

**Source note:** The description of REQ-017 in requirements rev 41 also says "Duplicate names are
allowed and a member may hold multiple items, as assumed in the PRD." Those two statements were
attached to the PRD's questions Q2 and Q3, which the user has since answered: a member may hold
several items (D-05, REQ-003.7, REQ-003.8, REQ-004.7, REQ-004.8) and duplicate names are allowed
(D-10, REQ-009.9). They are carried by those criteria and not by REQ-017. This requirement covers the non-goals and the restraints the decisions add. The
list below of REQ-017.1 to REQ-017.16 is the full non-goals list of the PRD; requirements rev 41
abbreviates it with "and so on". REQ-017.17 to REQ-017.19 are added by the decisions of 2026-10-20.
The criteria of this requirement that say the interface shows nothing for a non-goal are judged by
the non-goal walk-through, a human review of two steps (D-27, section 4). The report of its first
step is evidence, not an approval, and the wording of the criteria about what is judged is
unchanged.

**User:** The user, who reviews the build in the non-goal walk-through (the requirement limits what
the build contains).

**Flow:**
1. An agent pre-review of the build reports the gaps it found (section 4, Human review).
2. The user reads that report alongside the build and goes through the interface once for each
   non-goal below.
3. The user finds no screen, control or message for it, and records the verdict.

**Acceptance:**
- REQ-017.1: No password or real sign-in exists (same observation as REQ-001.3).
- REQ-017.2: No account management screen or control exists.
- REQ-017.3: No reminder appears anywhere in the interface, and no record is kept to drive one
  (section 4, Record).
- REQ-017.4: No notification appears anywhere in the interface, and no record is kept to drive one
  (section 4, Record). The specified modals and row states are the only messages; the inline
  validation message of REQ-009.8 and the texts of the Loading and Empty states are specified
  screen states, not notifications. [Authority: User decision 2026-10-20 D-14]
- REQ-017.5: No due date is shown on, or set for, any item or loan.
- REQ-017.6: No loan history screen or list exists.
- REQ-017.7: No detail screen exists (same observation as REQ-002.4).
- REQ-017.8: No control to edit an item exists.
- REQ-017.9: No control to restore a deleted item exists.
- REQ-017.10: No reservation control exists.
- REQ-017.11: No control for a member to send a request to an admin exists.
- REQ-017.12: No control for a member to borrow for another person exists (same observation as
  REQ-003.5).
- REQ-017.13: No integration with another service is offered in the interface.
- REQ-017.14: No settings screen or control exists.
- REQ-017.15: No search control and no filter control exists.
- REQ-017.16: No control to change the theme exists.
- REQ-017.17: No success note appears after an Add, a Mark out of service or a Restore (same
  observation as REQ-012.15). [Authority: User decision 2026-10-20 D-14]
- REQ-017.18: The interface contains no control other than these: the switcher; the Add field with
  its Add icon; the eleven icon controls; the member buttons of the borrower modal; and the four
  state demos, Show loading, Show empty list, Show API failure and Show access denied. The four
  state demos are named in this list, so they are exempt, by name, from the rule that no other
  control exists; no other control is exempt. [Authority: User decision 2026-10-20 D-16]
- REQ-017.19: No banner, label or text in the interface says that the app is a trial, a mockup or
  sample data, or that nothing is saved. The mockup's banner "Mockup only – sample data, nothing is
  saved." is not built. [Authority: User decision 2026-10-20 D-19]

## 6. Non-functional requirements

Only what the sources state: the confirmed scope and the user's decisions of 20 October 2026.

- **NFR-1: Look and feel.** Professional, with a Mac/Apple look and feel (`[Feedback 1, 5]`). The
  mockup is the look reference (D-17). Observable criteria are REQ-015.1 to REQ-015.14; the
  qualities judged by comparison with the mockup are REQ-015.4 to REQ-015.6, which are verified by
  the two-step mockup comparison review (section 4, D-27).
- **NFR-2: Persistence.** Committed data persists across restart (`[Idea]`). Observable criteria
  are REQ-016.1 to REQ-016.3.
- **NFR-3: Trial-only identity.** The acting identity is picked in the switcher with no password
  and no other proof (`[Answer]`), so anyone using the app can act as any of the three seeded users.
  It is for the trial only and is not authentication. Observable criteria are REQ-001.3 and
  REQ-017.1. The API still refuses a request with no usable acting identity (REQ-001.6 to
  REQ-001.8, D-01).
- **NFR-4: Technology.** React, FastAPI and PostgreSQL (`[Idea]`). The front end is a plain React
  single-page application built with Vite; Next.js is not used (D-18). These are the user's
  technical decisions: they are recorded in the blueprint's decision list, and no acceptance
  criterion of this PRD verifies them. [Authority: User decision 2026-10-20 D-18]
- **NFR-5: Security posture.** The user accepts that the trial's security posture is unproven by
  automated tests (D-19). This PRD sets no criterion that a test shows the app resists misuse, and
  no such claim is made for the app. The one observable consequence is that no label in the
  interface says the app is trial-only (REQ-017.19). [Authority: User decision 2026-10-20 D-19]

## 7. Non-goals

Version one deliberately does not do any of the following (PRD non-goals, in full):

Passwords or real sign-in, account management, reminders, notifications, due dates, loan history,
detail screens, editing equipment, restoring deleted equipment, reservations, member requests to
admins, members borrowing for others, integrations, settings, search/filtering, themes.

Each has an observable criterion in REQ-017. The criteria that say the interface shows nothing for a
non-goal are verified by the two-step non-goal walk-through (section 4, D-27).

### 7.1 Struck from the mockup by the user's decisions

The mockup shows two things that the build does not have:

- The success notes after Add, Mark out of service and Restore ("Added <name>", "<name> marked out
  of service", "<name> restored"). Struck by D-14. Observable criteria: REQ-012.15 and REQ-017.17.
- The banner "Mockup only – sample data, nothing is saved." Not built, because no trial-only label
  appears in the interface (D-19). Observable criterion: REQ-017.19.

## 8. Open questions

**No question is open.** Every question, gap and finding below is closed, by the user's answer of
2026-10-20 (N2 needed no decision). Nothing is waiting on anyone.

### 8.1 Questions closed by the decisions of 20 October 2026

Every question and gap in the table below was answered by the user on 2026-10-20 and is closed.
Each answer is carried by the criteria shown in section 10.2. The points found while amending are
in section 8.2, and they are closed too.

| Former item | Question | Closed by | Date |
|-------------|----------|-----------|------|
| Q1 | Is an admin return or admin-set loan attributed anywhere? | D-09: no | 2026-10-20 |
| Q2 | Can a member hold multiple items? | D-05: yes, no limit | 2026-10-20 |
| Q3 | Are duplicate equipment names allowed? | D-10: yes | 2026-10-20 |
| G1 | Missing or unrecognised acting identity | D-01 | 2026-10-20 |
| G2 | Malformed equipment names other than empty or whitespace | D-06 | 2026-10-20 |
| G3 | A forced member request that names another member as borrower | D-07 | 2026-10-20 |
| G4 | What the state demos contain and do | D-16 | 2026-10-20 |
| G5 | Failure handling and loader for Add, Mark out of service and Restore | D-02 (and D-12 for forced attempts) | 2026-10-20 |
| G6 | The row loader on a non-200 | D-08 | 2026-10-20 |
| G7 | Reference values for the look | D-17 | 2026-10-20 |
| G8 | Response codes of two rejections | D-03 | 2026-10-20 |
| G9 | Status after Restore | D-04 | 2026-10-20 |
| R3-007 | Whether the input-failure behaviours the PRD stated for an admin's Borrow with no or an unknown borrower, an action on an item that is no longer there, and a missing, malformed or unknown acting identity are scope | D-24: accepted as scope | 2026-10-20 |
| R3-008 | What the page does when the fetch of the equipment list fails | D-25: the API failure modal, and Retry repeats the fetch | 2026-10-20 |
| R3-009 | How the two human reviews are prepared and approved | D-27: an agent pre-review, then the user's review | 2026-10-20 |

### 8.2 Points found while amending

**None is open.** The four points found while amending were closed on 20 October 2026, three of
them by the user's answers and N2 without a decision:

| Closed | Was | Closed by |
|---|---|---|
| N1 | Where the Add loader is shown | **D-20**: a spinner in the Add panel replaces the Add icon, and while it shows, Enter and the Add icon do nothing (REQ-009.13, REQ-009.14) |
| N2 | A member's Borrow naming the admin as borrower | Needed no decision (recorded with D-23): D-03 and D-07 both key the answer to the requester, so REQ-005.4 (an admin's request) and REQ-003.6 (a member's request) already settle it |
| N3 | What the state demos do to the data, and how long their state lasts | **D-21**: client-only view states that never call the API and never change stored data, shown only once a user is picked; Show loading holds the list indicator for 900ms and returns to the real list; Show empty list holds until the acting user changes or Show loading is activated; Retry in the demo failure modal only closes it (REQ-013.11 to REQ-013.17) |
| N4 | When an admin makes an Add from the Show empty list view of the state demos, does the Add happen and does the page leave the demo? | **D-26**: the Add is performed and the view ends, showing the real list with the new item in it (REQ-013.18, REQ-013.19; the cases in which the Add is not carried out are REQ-013.20 to REQ-013.22) |

## 9. Change list

Each round of user feedback appends here and updates the requirements it touches. The inputs this
PRD was drafted from do not hold the user's verbatim words for any round. They hold only the
confirmed-scope summary of each round, and the Change column of each row below reproduces that
summary wording, not the user's own words. For the round of 2026-10-20 the decisions file records
the decision text and the user's single answer to the nineteen recommendations, "accept all"; for
the second round of the same day (D-20 to D-23) it records the answer "accept"; for the third round
(D-24 to D-27), put to the user with the orchestrator's recommendations and answered the same day,
it records the decision text and, for D-27, the user's own words, which the D-27 row quotes. The
Change column reproduces the decision text as recorded. Of the rows after D-23, the first two are
not decisions. The first is the product owner's ruling on acceptance criteria, quoted in his words
as the instruction to amend this PRD gave them; the inputs do not record its date. The second
records corrections made on review, which add no scope. The last row, after D-27, records the
corrections of the third round, which add no scope either.

| Round | Change (as recorded in the confirmed scope) | Requirements touched |
|-------|---------------------------------------------|----------------------|
| Feedback 1, 5 | Professional, Mac/Apple look and feel | REQ-015 |
| Feedback 2 | No Details buttons. Available shows Borrow; item on loan to the current user shows Return | REQ-002, REQ-003, REQ-006 |
| Feedback 3 | No green "Borrowed" header. Borrow/Return show a loader until the back-end returns 200, then On loan / Available. State demos at the top | REQ-002.5, REQ-003, REQ-006, REQ-012, REQ-013 |
| Feedback 4 | All rows are the same size | REQ-015.1 |
| Feedback 5, 7 | API failure and access denied are modal popups | REQ-007, REQ-012 |
| Feedback 6 | Delete x icon removes equipment. All buttons are icons. Rows are thinner | REQ-011, REQ-014, REQ-015 |
| Feedback 8 | Add equipment sits above the list; Enter adds | REQ-009 |
| Feedback 9 | Admin can return an item when the borrower cannot, and can set a loan for a person who wants the item | REQ-004, REQ-006 |
| Feedback 10 | Superseded by Feedback 11, 12. Its content is not in the sources | none |
| Feedback 11, 12 | Admin Borrow opens a modal to choose a member; the admin is never selectable and cannot borrow. Members borrow only for themselves, with no borrower selection | REQ-003, REQ-004, REQ-005 |
| Feedback 13 | Admin delete shows a confirm modal; confirming deletes, cancelling does nothing | REQ-011 |
| 2026-10-20 D-01 | The API refuses any request whose acting identity is missing, malformed, or not one of the seeded users, with 403 and no body. Before a user is picked, the page shows the switcher and no equipment list | REQ-001.6 to REQ-001.9, REQ-013 flow |
| 2026-10-20 D-02 | Add, Mark out of service and Restore are server calls, with the same treatment as Borrow, Return and Delete: a loader until the response arrives, the list changes only after a 200, a non-200 shows the failure modal with Close and Retry | REQ-012.9 to REQ-012.13, REQ-009 flow, REQ-010 flow |
| 2026-10-20 D-03 | Rejecting an admin as borrower is 422. A Borrow on an item that is not Available is 409 | REQ-005.4, REQ-008.6 to REQ-008.8 |
| 2026-10-20 D-04 | After Restore the item's status is Available | REQ-010.6, REQ-012.11 |
| 2026-10-20 D-05 | A member may hold several items at once. There is no limit | REQ-003.7, REQ-003.8, REQ-004.7, REQ-004.8 |
| 2026-10-20 D-06 | An equipment name longer than 100 characters, after trimming, is rejected with 422 and the inline validation message | REQ-009.10 to REQ-009.12 |
| 2026-10-20 D-07 | A member request that names anyone but the acting member as borrower is refused with 403 and shows the Access denied modal | REQ-003.6 |
| 2026-10-20 D-08 | The row loader is removed when the response arrives, and then the failure modal appears | REQ-012.14 |
| 2026-10-20 D-09 | Neither an admin's return nor an admin-set loan is attributed anywhere; nothing records or shows who performed it | REQ-004.9, REQ-004.10, REQ-006.6, REQ-006.7 |
| 2026-10-20 D-10 | Duplicate equipment names are allowed | REQ-009.9 |
| 2026-10-20 D-11 | The 409 on deleting a loaned item is accepted as scope, although no HTTP code appears in the PRD rev 14 | REQ-011.8 |
| 2026-10-20 D-12 | A member's forced Add, Mark out of service or Restore is refused with 403 and shows the Access denied modal | REQ-007.3 to REQ-007.6 |
| 2026-10-20 D-13 | Five inferred readings accepted as scope: the modals carry a dialog role; modals and icon buttons are operable by keyboard; a whitespace-only name is rejected; the seed is idempotent; the server, not the client, rejects the loser of two simultaneous borrows | REQ-014.4 to REQ-014.7, REQ-009.6, REQ-016.3, REQ-008.4 |
| 2026-10-20 D-14 | The success notes the mockup shows after Add, Mark out of service and Restore are not built. The specified modals and row states are the only messages | REQ-012.15, REQ-017.4, REQ-017.17 |
| 2026-10-20 D-15 | Each switcher entry shows its role. The "every button is an icon" rule covers the eleven row and form controls; the borrower modal's member buttons may show a name beside the icon | REQ-001.2, REQ-014.1, REQ-014.8, REQ-014.9 |
| 2026-10-20 D-16 | The four state demos ship in the built application (Show loading, Show empty list, Show API failure, Show access denied) and are exempt, by name, from the "no other control exists" inventory | REQ-013.6 to REQ-013.10, REQ-014.10, REQ-017.18 |
| 2026-10-20 D-17 | The mockup is the look reference. Row height 48px; the mockup's corner radii and its top-bar blur. "Card", "top bar", "badge" and "system font" are defined from the mockup. Translucency, corner rounding and shadows are judged by a named comparison review against the mockup, not by numeric thresholds | REQ-015.2 to REQ-015.14, section 4 definitions, section 2.5 |
| 2026-10-20 D-18 | A plain React single-page application built with Vite. Next.js is not used | NFR-4, section 2 |
| 2026-10-20 D-19 | The trial's security posture is accepted as unproven by automated tests, and no "trial-only" label appears in the interface | NFR-5, REQ-017.19 |
| 2026-10-20 D-20 | The Add loader: a spinner in the Add panel replaces the Add icon, and while it shows, Enter and the Add icon do nothing | REQ-009.13, REQ-009.14, REQ-009 flow, section 4 (Add loader, Add panel), section 8.2 (N1 closed) |
| 2026-10-20 D-21 | The state demos appear only once a user is picked; they are client-only view states that never call the API and never change stored data; Show loading shows the list indicator for 900ms, the mockup's value, and returns to the real list; Show empty list holds until the acting user changes or Show loading is activated; Show API failure and Show access denied open their modals, and Retry in the demo failure modal only closes it | REQ-013.5, REQ-013.11 to REQ-013.17, REQ-013 flow, section 4 (State demos), section 8.2 (N3 closed; N4, which D-21 left open, was closed by D-26) |
| 2026-10-20 D-22 | Three strings no source gave, accepted as written: the switcher placeholder "Choose a user"; the switcher entry format `<name> (<role>)`, for example "Ada Admin (admin)"; the over-length inline message "Name must be 100 characters or fewer." | REQ-001.10, REQ-001.11, REQ-009.15, section 4 (Switcher) |
| 2026-10-20 D-23 | The access log records the acting user id. This overturns the blueprint's reading of D-09 as covering the server's access log. D-09 governs the product: no attribution is stored in the data or shown in the interface. The access log is operational, and it carries method, path, status and the acting user id, and no request body and no configuration value. Former question N2 needed no decision | Section 4 (Record), REQ-004.10, REQ-006.7, the notes under REQ-003 and REQ-005 that settle N2 |
| Product owner's ruling on acceptance criteria | "The tech related work should be part of the Tech Spec, so the eval or test cases shouldn't verify those. We really care more about the business requirements and the feature is 100% delivered." | Section 4 (Confirmed, Refused, Rejected/fails and Record added; Loader, API failure modal, Access denied modal and Committed change reworded). Reworded in place, numbers kept, to remove response codes: REQ-001.6 to REQ-001.8, REQ-003.4, REQ-003.6, REQ-004.5, REQ-004.6, REQ-005.3, REQ-005.4, REQ-006.4, REQ-006.5, REQ-007.1 to REQ-007.5, REQ-008.2 to REQ-008.8, REQ-009.10, REQ-011.6 to REQ-011.8, REQ-012.1 to REQ-012.6, REQ-012.8, REQ-012.10 to REQ-012.15, and NFR-4 (the package-manifest check). Appended, as the input-failure cases the rubric requires: REQ-004.11, REQ-004.12, REQ-012.16 |
| Review corrections, no new scope | Criteria that could not be observed or could be misread were corrected: "record" defined (section 4) and REQ-004.10, REQ-006.7 reworded to match it; REQ-017.3 and REQ-017.4 reworded to the observable half (the interface shows nothing, and nothing is stored to drive one); REQ-015.8 says "all fifteen" icon buttons; section 2.5 completed with the four mockup differences it missed | REQ-004.10, REQ-006.7, REQ-017.3, REQ-017.4, REQ-015.8, section 2.5, section 4 (Record) |
| 2026-10-20 D-24 | The inferred input-failure behaviours are accepted as scope. An admin's Borrow naming no borrower or naming someone who is not a seeded member, an action on an item that is no longer there, and the Access denied modal for a missing, malformed or unknown identity: each stands as the PRD now states it | REQ-004.11, REQ-004.12, REQ-012.16 (authority changed to the decision); REQ-001.6 to REQ-001.8 (the Access denied modal written into the criteria; authority D-01 and D-24), REQ-001 flow, section 3.3, section 10.3 |
| 2026-10-20 D-25 | A failed list fetch shows the API failure modal, and Retry repeats the fetch. Accepted. The alternative was a silently blank page | REQ-013.23 to REQ-013.26, REQ-013 flow, section 4 (List fetch, API failure modal), section 2.3, section 2.5, note under REQ-012 |
| 2026-10-20 D-26 | An Add made from the Show empty list demo view performs the Add and ends the demo view, showing the real list with the new item in it | REQ-013.18 to REQ-013.22, REQ-013 flow, section 4 (State demos), section 2.3, section 2.5, section 8.2 (N4 closed) |
| 2026-10-20 D-27 | The user's own direction: "we need an agent to review the two human reviews along with the conversation they had with the agent on each step. To find gaps for the human. After that the human reviews that and approves." Each human-review criterion is verified in two steps. First an agent pre-review: an agent in a session started for that task examines the candidate against the review's own rubric, with the whole conversation trail as input (the confirmed scope with its citations, every question and its answer, every decision with its decider, and the change rounds), and reports the gaps it found, each traced to the criterion and to the place in the trail the expectation came from. Second the human review: the user reads that report alongside the candidate and records the verdict. The approval is the user's, and only the user's. Three limits: the report is evidence, never an approval, and can neither pass nor fail a criterion; "found none" is not clearance, because the user may find what the agent missed and the report must say plainly what it could not judge; and the pre-reviewing agent may not be the agent that built the candidate | Section 4 (Human review, Agent pre-review, Conversation trail, Gap, Pre-review report, Mockup comparison review, Non-goal walk-through), REQ-015 source note, REQ-017 source note, flow and User line, NFR-1, section 7, section 2.4 |
| Review corrections, third round, no new scope | The inline validation message was described only as "by the Add field", which a check cannot apply and which differs from the mockup, where the message sits above the list. It is now stated as a relationship a check can apply: inside the Add panel, below the Add field, and not a modal. REQ-013.12 was reworded so that it still holds when an Add is made after a state demo. REQ-013.20 to REQ-013.22 state the Adds made from the Show empty list view that are not carried out, which follow from D-21 and D-26 together | REQ-009 flow, REQ-009.4, REQ-009.5, REQ-009.8, REQ-009.11, REQ-013.12, REQ-013.20 to REQ-013.22, section 2.3, section 2.5, section 4 (Inline validation message) |

## 10. Traceability

### 10.1 Traceability of the acceptance criteria

The 20 acceptance criteria of the PRD, numbered in the order the PRD lists them. Criteria added by
the decisions of 2026-10-20 are traced in section 10.2.

| # | PRD acceptance criterion | Carried by |
|---|--------------------------|------------|
| 1 | Switcher lists exactly three seeded users with role; no password | REQ-001.1, REQ-001.2, REQ-001.3 |
| 2 | Every row shows name and status; no Details button or screen | REQ-002.1, REQ-002.2, REQ-002.3, REQ-002.4 |
| 3 | Admin Borrow opens a borrower modal before any request; lists members only, never the admin; Close cancels with no change | REQ-004.1, REQ-004.2, REQ-004.3, REQ-004.4 |
| 4 | Choosing a member starts the borrow; row loader until 200, then On loan – that member | REQ-004.5, REQ-004.6 |
| 5 | Member Borrow sends the request immediately for themselves; no borrower selection | REQ-003.2, REQ-003.3, REQ-003.4, REQ-003.5 |
| 6 | Admins cannot borrow for themselves | REQ-005.1, REQ-005.2, REQ-005.3 (REQ-005.4 states an admin's own request) |
| 7 | On loan: Return icon for the borrower and for any admin; other members see no action | REQ-006.1, REQ-006.2, REQ-006.3 |
| 8 | A forced member attempt to return another's loan, or to delete, shows the Access denied modal | REQ-007.1, REQ-007.2, REQ-007.6 (REQ-007.3 to REQ-007.5 extend it) |
| 9 | Every button is an icon with tooltip and accessible label | REQ-014.1, REQ-014.2, REQ-014.3 (REQ-014.8 to REQ-014.10 settle which buttons) |
| 10 | All rows have identical, reduced height regardless of status, icons or loader | REQ-015.1, REQ-015.2 |
| 11 | Admin Delete x opens a confirm modal naming the item, before any request; Confirm sends the delete; Cancel closes with no request and no change | REQ-011.3, REQ-011.4, REQ-011.5, REQ-011.6, REQ-011.7 |
| 12 | Borrow/Return/Delete show a row loader; the list changes only after a 200; no success banner | REQ-012.1, REQ-012.2, REQ-012.3, REQ-012.4 (also REQ-003.3, REQ-004.5, REQ-006.4, REQ-011.6; extended to Add, Mark out of service and Restore by REQ-012.9 to REQ-012.11) |
| 13 | On a non-200 response nothing changes; modal with Close and Retry icons | REQ-012.5, REQ-012.6, REQ-012.7, REQ-012.8 (extended by REQ-012.12 to REQ-012.14) |
| 14 | Access denied is a modal with a single OK icon; nothing changes | REQ-007.6, REQ-007.7, REQ-007.8 |
| 15 | An item never has more than one active loan | REQ-008.1 to REQ-008.4 (REQ-008.6 to REQ-008.8 state the rejections decided in D-03) |
| 16 | Admins see Add equipment (above the list), Mark out of service (Available only), Restore (out of service only) and Delete x (not on loaned items); members see none | REQ-009.1, REQ-009.7, REQ-010.1, REQ-010.2, REQ-010.4, REQ-010.5, REQ-010.7, REQ-011.1, REQ-011.2, REQ-011.9 |
| 17 | Enter in the Add field submits like the Add icon; empty name shows an inline validation message and creates nothing | REQ-009.2, REQ-009.3, REQ-009.4, REQ-009.5, REQ-009.6, REQ-009.8 |
| 18 | Committed changes remain after restart | REQ-016.2 (with REQ-016.1, REQ-016.3) |
| 19 | State demos appear at the top | REQ-013.5 (REQ-013.6 to REQ-013.22 give their content and behaviour) |
| 20 | Apple-style look: system font, translucent top bar, rounded cards, subtle shadows, pill badges, round icon buttons | REQ-015.3, REQ-015.4, REQ-015.5, REQ-015.6, REQ-015.7, REQ-015.8 (REQ-015.9 to REQ-015.14 give the measured values) |

### 10.2 Traceability of the decisions of 2026-10-20

| Decision | Closes | Carried by |
|----------|--------|------------|
| D-01 | G1 | REQ-001.6, REQ-001.7, REQ-001.8, REQ-001.9 |
| D-02 | G5 | REQ-012.9, REQ-012.10, REQ-012.11, REQ-012.12, REQ-012.13 (cross-referenced from REQ-009 and REQ-010) |
| D-03 | G8 | REQ-005.4, REQ-008.6, REQ-008.7, REQ-008.8 |
| D-04 | G9 | REQ-010.6, REQ-012.11 |
| D-05 | Q2 | REQ-003.7, REQ-003.8, REQ-004.7, REQ-004.8 |
| D-06 | G2 | REQ-009.10, REQ-009.11, REQ-009.12 |
| D-07 | G3 | REQ-003.6 |
| D-08 | G6 | REQ-012.14 |
| D-09 | Q1 | REQ-004.9, REQ-004.10, REQ-006.6, REQ-006.7 |
| D-10 | Q3 | REQ-009.9 |
| D-11 | R1-004 | REQ-011.8 (authority changed to the decision) |
| D-12 | R1-005 | REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6 (authority changed to the decision) |
| D-13 | R1-007 | REQ-014.4, REQ-014.5, REQ-014.6, REQ-014.7, REQ-009.6, REQ-016.3, REQ-008.4 |
| D-14 | R1-006 | REQ-012.15, REQ-017.4, REQ-017.17; section 7.1 |
| D-15 | R1-013 | REQ-001.2, REQ-014.1, REQ-014.8, REQ-014.9 |
| D-16 | G4, R1-010 | REQ-013.6, REQ-013.7, REQ-013.8, REQ-013.9, REQ-013.10, REQ-014.10, REQ-017.18 |
| D-17 | G7, R1-001 | REQ-015.2 to REQ-015.14; section 4 definitions of Mockup, Card, Top bar, Badge, System font and Mockup comparison review |
| D-18 | B1 | NFR-4; section 2 |
| D-19 | R1-027 | NFR-5; REQ-017.19; section 7.1 |
| D-20 | N1 | REQ-009.13, REQ-009.14 (the loader itself is REQ-012.9); section 4 definitions of Add loader and Add panel |
| D-21 | N3 | REQ-013.5, REQ-013.11, REQ-013.12, REQ-013.13, REQ-013.14, REQ-013.15, REQ-013.16, REQ-013.17; section 4 definition of State demos. D-21 left one point open, N4, which D-26 closed (section 8.2) |
| D-22 | DD-13 (a blueprint default) | REQ-001.10, REQ-001.11, REQ-009.15; section 4 definition of Switcher |
| D-23 | The blueprint's reading of D-09; N2, which needed no decision | Section 4 definition of Record; REQ-004.10, REQ-006.7; for N2, REQ-003.6 and REQ-005.4 with the notes under REQ-003 and REQ-005 |
| D-24 | R3-007 | REQ-004.11, REQ-004.12, REQ-012.16 (authority changed to the decision); REQ-001.6, REQ-001.7, REQ-001.8 (the Access denied modal written into the criteria; authority D-01 and D-24); section 3.3; section 10.3 |
| D-25 | R3-008 | REQ-013.23, REQ-013.24, REQ-013.25, REQ-013.26; section 4 definitions of List fetch and API failure modal |
| D-26 | N4 | REQ-013.18, REQ-013.19 (and REQ-013.20, REQ-013.21, REQ-013.22, the Adds from the Show empty list view that are not carried out, section 10.3); section 4 definition of State demos |
| D-27 | R3-009 | Section 4 definitions of Human review, Agent pre-review, Conversation trail, Gap, Pre-review report, Mockup comparison review and Non-goal walk-through; the judging of REQ-015.4 to REQ-015.6 and of the REQ-017 criteria that say the interface shows nothing (REQ-015 and REQ-017 source notes, REQ-017 flow) |

### 10.3 Criteria added to meet the input-failure rule

The PRD rubric (`docs/orchestrator/rubrics/prd.md`) requires a criterion for missing, malformed and
unauthorized input wherever a requirement accepts input or identity. Three criteria were appended
for cases the sources did not state as criteria: each says that a request outside what the
requirement allows does not happen, nothing changes, and the API failure modal that REQ-012.6
already defines appears. The user accepted all three as scope on 2026-10-20 (D-24), together with
the Access denied modal for a missing, malformed or unknown acting identity (REQ-001.6 to
REQ-001.8).

| Criterion | Case | The behaviour it relies on |
|-----------|------|----------------------------|
| REQ-004.11 | An admin's Borrow that names no borrower | REQ-012.5 and REQ-012.6; `[Feedback 11, 12]` (an admin chooses a member); D-24 |
| REQ-004.12 | An admin's Borrow that names a borrower who is not a seeded member | REQ-012.5 and REQ-012.6; `[Feedback 11, 12]`; D-03; D-24 |
| REQ-012.16 | A Borrow, Return, Delete, Mark out of service or Restore on an item that is no longer there | REQ-012.5 and REQ-012.6; D-24 |

Three further criteria state the cases of an Add made from the Show empty list view in which the Add
is not carried out. Unlike the three above, they are not scope the user accepted: no decision states
them in these words, and their tags read "Deduced from", not "Authority" (section 5). They are the
PRD's deduction from two decisions together, by this reasoning:

1. D-21 says the Show empty list view holds until the acting user changes or Show loading is
   activated.
2. D-26 says an Add that is performed ends it.
3. An Add rejected for its name (REQ-009.4 to REQ-009.6, REQ-009.11) or one that fails at the
   server (REQ-012.12) was not performed: no item is created and nothing changes.
4. So D-26's ending of the view does not apply to such an Add, and D-21's holding does: the view
   stays in place.

| Criterion | Case | The behaviour it relies on |
|-----------|------|----------------------------|
| REQ-013.20 | An Add of an empty or whitespace-only name from the Show empty list view | REQ-009.4 to REQ-009.6; D-21; D-26 |
| REQ-013.21 | An Add of a name longer than 100 characters after trimming from the Show empty list view | REQ-009.11, REQ-009.15; D-21; D-26 |
| REQ-013.22 | An Add that fails, made from the Show empty list view | REQ-012.12, REQ-012.13; D-21; D-26 |

## 11. Appended requirements

None. Every one of the 20 acceptance criteria fits an existing requirement, and so does every
behaviour that the 27 decisions of 2026-10-20 add, so no requirement was appended after REQ-017.
D-18 and D-19 are non-functional (NFR-4, NFR-5). D-27 adds no behaviour of the product: it governs
how REQ-015.4 to REQ-015.6 and the REQ-017 criteria about the interface are verified, and it lands
in the definitions of section 4.
