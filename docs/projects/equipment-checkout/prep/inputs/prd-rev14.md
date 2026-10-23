# PRD: Shared Equipment Checkout (Trial)

## Purpose
Let a small team see who has shared equipment and borrow and return it. An administrator maintains the list, assigns a loan to a member, and can return an item when the borrower cannot. For user review before any build. Nothing is implemented.

## Confirmed scope (citations)
- [Idea] React, FastAPI, PostgreSQL; PRD and design reviewed before build.
- [Idea] Members borrow and return available equipment; exactly one active loan per item.
- [Idea] Admins add equipment, mark available equipment out of service, restore it.
- [Idea] Seed one admin and two members; committed data persists across restart.
- [Idea] States: loading, empty, validation, API failure, access denied. Trial stays bounded.
- [Answer] Identity: pick one of three seeded users from a switcher, no password.
- [Feedback 1, 5] Professional, Mac/Apple look and feel.
- [Feedback 2] No Details buttons. Available shows Borrow; item on loan to the current user shows Return.
- [Feedback 3] No green "Borrowed" header. Borrow/Return show a loader until the back-end returns 200, then On loan / Available. State demos at the top.
- [Feedback 4] All rows are the same size.
- [Feedback 5, 7] API failure and access denied are modal popups.
- [Feedback 6] Delete x icon removes equipment. All buttons are icons. Rows are thinner.
- [Feedback 8] Add equipment sits above the list; Enter adds.
- [Feedback 9] Admin can return an item when the borrower cannot, and can set a loan for a person who wants the item.
- [Feedback 11, 12] Admin Borrow opens a modal to choose a member; the admin is never selectable and cannot borrow. Members borrow only for themselves, with no borrower selection. (Supersedes Feedback 10.)
- [Feedback 13] Admin delete shows a confirm modal; confirming deletes, cancelling does nothing.

## Journey (mockup demonstrates this)
1. Open the app and choose a seeded user (Ada Admin, Mia Member, Sam Member).
2. As Ada, click Borrow on an Available item. A modal lists Mia Member and Sam Member only. Choose Mia.
3. A row loader shows until 200; then the row shows "On loan – Mia Member".
4. Ada clicks Return on that loan; loader until 200; row is Available.
5. Ada types a name in Add equipment and presses Enter; it appears as Available.
6. Ada marks an Available item out of service and restores it.
7. Ada clicks x on an item. A confirm modal appears; confirming shows a row loader until 200, then the item is gone. (Cancelling leaves it unchanged.)
8. Switch to Mia: she clicks Borrow on an Available item; no modal, loader, then On loan – Mia Member. She returns it. If a request fails, a modal appears (Close / Retry) and nothing changes.

## Acceptance criteria
- Switcher lists exactly three seeded users with role; no password.
- Every row shows name and status; no Details button or screen.
- Admin Borrow opens a borrower modal before any request; it lists members only, never the admin. Close cancels with no change.
- Choosing a member starts the borrow; row loader until 200, then On loan – that member.
- Member Borrow sends the request immediately for themselves; no borrower selection.
- Admins cannot borrow for themselves.
- On loan: Return icon for the borrower and for any admin. Other members see no action.
- A forced member attempt to return another's loan, or to delete, shows the Access denied modal.
- Every button is an icon with tooltip and accessible label.
- All rows have identical, reduced height regardless of status, icons or loader.
- Admin Delete x opens a confirm modal naming the item, before any request. Confirm sends the delete; Cancel closes the modal with no request and no change.
- Borrow/Return/Delete show a row loader; the list changes only after a 200; no success banner.
- On a non-200 response nothing changes; modal with Close and Retry icons.
- Access denied is a modal with a single OK icon; nothing changes.
- An item never has more than one active loan.
- Admins see Add equipment (above the list), Mark out of service (Available only), Restore (out of service only) and Delete x (not on loaned items); members see none.
- Enter in the Add field submits like the Add icon. Empty name shows an inline validation message and creates nothing.
- Committed changes remain after restart.
- State demos appear at the top.
- Apple-style look: system font, translucent top bar, rounded cards, subtle shadows, pill badges, round icon buttons.

## Screen states
- Loading: list indicator; per-row loader during borrow, return, delete.
- Empty: "No equipment yet" (admins see Add field above).
- Validation: inline message by the Add field.
- API failure: modal with Close and Retry; no change.
- Access denied: modal "You do not have permission"; nothing changes.
- Confirm delete: modal with Cancel and Confirm icons.

## Non-goals
Passwords or real sign-in, account management, reminders, notifications, due dates, loan history, detail screens, editing equipment, restoring deleted equipment, reservations, member requests to admins, members borrowing for others, integrations, settings, search/filtering, themes.

## Unresolved product questions
- Is an admin return or admin-set loan attributed anywhere? (Assumed no history.)
- Can a member hold multiple items? (Assumed yes.)
- Duplicate equipment names allowed? (Assumed yes.)
