/**
 * The on-screen strings a J row may assert exactly, and only those.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Eval plan 1.1, the string rule: text is asserted exactly only where the
 * blueprint pins it in section 12.9. Every string below is a row of that table.
 * No row asserts text that no source pins, so there is deliberately nothing
 * here for the page title, the Add placeholder, the modal titles or the bodies
 * that no S4 row quotes.
 *
 * The two characters the blueprint names by code point are written as escapes
 * rather than as literals. "–" is U+2013 (an en dash, not a hyphen-minus) and
 * "…" is U+2026 (one character, not three full stops). Written as a literal,
 * either can be replaced by an editor, a copy through a terminal or a file
 * re-encoding without anything looking wrong; written as an escape it cannot.
 */

/** PRD REQ-002.2, blueprint 12.9: the three row statuses. */
export const AVAILABLE = 'Available';
export const OUT_OF_SERVICE = 'Out of service';

/** "On loan – <member name>". The dash is U+2013. */
export function onLoanTo(memberName) {
  return `On loan \u2013 ${memberName}`;
}

/** PRD REQ-013.2, blueprint 12.9. The mockup's full stop is not built. */
export const NO_EQUIPMENT_YET = 'No equipment yet';

/**
 * PRD REQ-007.6, blueprint 12.9: the body of the Access denied modal. The
 * mockup adds " to do that."; the PRD's text is what is pinned, so the rows
 * assert that the body contains this and never that it equals the mockup's
 * longer sentence.
 */
export const ACCESS_DENIED_BODY = 'You do not have permission';

/** The seeded users (blueprint 12.2, DD-03), fixed. */
export const ADA = { id: 1, name: 'Ada Admin', role: 'admin' };
export const MIA = { id: 2, name: 'Mia Member', role: 'member' };
export const SAM = { id: 3, name: 'Sam Member', role: 'member' };
export const SEEDED_USERS = [ADA, MIA, SAM];

/** PRD REQ-001.11, D-22, blueprint 12.9: a switcher entry reads "<name> (<role>)". */
export function switcherEntry(user) {
  return `${user.name} (${user.role})`;
}
