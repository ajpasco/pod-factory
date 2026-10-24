/**
 * Unique equipment names.
 *
 * Frozen at the S4 freeze. Read-only to every builder.
 *
 * Eval plan 1.3: a J row runs against the real stack, creates the items it
 * needs and names them uniquely, and none assumes an empty list. The stack the
 * sequence starts (C10) carries whatever earlier rows left behind, and the
 * production rows restart it, so a row that looked for "Tripod" would find
 * another row's item.
 *
 * The suffix is digits only, deliberately. T-004-P7 and T-006-P7 assert that no
 * text, title or aria-label outside the top bar contains "Ada" or "Admin", and
 * those rows read every item name on the page. A base-36 or random-letter
 * suffix could spell either; digits cannot.
 */

const run = `${Date.now()}`;
let made = 0;

/**
 * A name no other row and no earlier run can hold. `tag` is a readable word
 * with no "Ada" and no "Admin" in it, so a failure's screenshot can be read.
 */
export function uniqueName(tag) {
  made += 1;
  return `${tag} ${run}-${made}`;
}
