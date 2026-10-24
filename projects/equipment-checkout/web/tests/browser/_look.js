// What the B rows read: the strings blueprint 12.9 pins, the controls blueprint 12.8
// names, and the geometry helpers. Frozen with the B rows; read-only to every builder.
//
// The strings and the control tables are written out here rather than imported from the C
// rows' harness, because that file imports the client and the component-testing tools,
// which Playwright does not load.

export const S = {
  pageTitle: 'Shared Equipment',
  nameRequired: 'Name is required.',
  nameTooLong: 'Name must be 100 characters or fewer.',
  available: 'Available',
  onLoan: (name) => `On loan \u2013 ${name}`,
  outOfService: 'Out of service',
  empty: 'No equipment yet',
  fontStack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif',
};

export const ELEVEN_ICON_CONTROLS = [
  'btn-borrow',
  'btn-return',
  'btn-out-of-service',
  'btn-restore',
  'btn-delete',
  'btn-add',
  'btn-close',
  'btn-retry',
  'btn-ok',
  'btn-cancel',
  'btn-confirm',
];

export const FOUR_DEMOS = ['demo-loading', 'demo-empty', 'demo-api-failure', 'demo-access-denied'];

export const FIFTEEN_ICON_BUTTONS = [...ELEVEN_ICON_CONTROLS, ...FOUR_DEMOS];

export const ALLOWED_CONTROL_TESTIDS = [
  'switcher',
  'add-input',
  ...ELEVEN_ICON_CONTROLS,
  ...FOUR_DEMOS,
  'member-button-2',
  'member-button-3',
];

export const CONTROL_SELECTOR = 'button, input, select, a, textarea, [tabindex], [role="button"]';

/** One computed style value of an element. */
export const computedOf = (locator, property) =>
  locator.evaluate(
    (element, name) => globalThis.getComputedStyle(element).getPropertyValue(name),
    property,
  );

/** The corner radius in CSS pixels, resolving a percentage against the box. */
export async function cornerRadiusInPixels(locator) {
  return locator.evaluate((element) => {
    const raw = globalThis.getComputedStyle(element).borderTopLeftRadius;
    const box = element.getBoundingClientRect();
    if (raw.endsWith('%')) return (Number.parseFloat(raw) / 100) * box.height;
    return Number.parseFloat(raw);
  });
}

/** The corner radius exactly as the computed style reports it, percentage and all. */
export const cornerRadius = (locator) => computedOf(locator, 'border-top-left-radius');

/** Every data-testid of the controls on the page now, in document order. */
export const controlTestIds = (page) =>
  page.evaluate((selector) => {
    const described = (element) =>
      element.getAttribute('data-testid') ??
      `<${element.tagName.toLowerCase()}> with no data-testid: ${(element.textContent ?? '').trim()}`;
    return Array.from(globalThis.document.querySelectorAll(selector)).map(described);
  }, CONTROL_SELECTOR);

/**
 * The four checks of the inline-message placement (eval plan 1.1, blueprint 12.8.1), all
 * of them: a B row runs in Chromium, which has a layout engine, so checks (3) and (4) are
 * applied here and only here.
 *
 * Returns the facts; the caller asserts them, so that a failure names the check.
 */
export const placementFacts = (page) =>
  page.evaluate(() => {
    const card = globalThis.document.querySelector('[data-testid="add-card"]');
    const field = globalThis.document.querySelector('[data-testid="add-input"]');
    const message = globalThis.document.querySelector('[data-testid="add-validation"]');
    if (card === null || field === null || message === null) {
      return {
        found: false,
        card: card !== null,
        field: field !== null,
        message: message !== null,
      };
    }
    const cardBox = card.getBoundingClientRect();
    const fieldBox = field.getBoundingClientRect();
    const messageBox = message.getBoundingClientRect();
    const overlaps =
      messageBox.left < fieldBox.right &&
      messageBox.right > fieldBox.left &&
      messageBox.top < fieldBox.bottom &&
      messageBox.bottom > fieldBox.top;
    return {
      found: true,
      text: (message.textContent ?? '').replace(/\s+/g, ' ').trim(),
      // (1) a DOM descendant of the Add card.
      insideCardInDom: card.contains(message),
      // (2) after the Add field in document order.
      afterFieldInDom: (field.compareDocumentPosition(message) & 4) === 4,
      // (3) laid out: its top edge is not above the field's lower edge, and the boxes do
      // not overlap.
      topNotAboveFieldBottom: messageBox.top >= fieldBox.bottom - 0.5,
      overlapsField: overlaps,
      // (4) its whole box lies within the Add card's box.
      withinCardBox:
        messageBox.left >= cardBox.left - 0.5 &&
        messageBox.right <= cardBox.right + 0.5 &&
        messageBox.top >= cardBox.top - 0.5 &&
        messageBox.bottom <= cardBox.bottom + 0.5,
      alertdialogs: globalThis.document.querySelectorAll('[role="alertdialog"]').length,
    };
  });

/** A name of exactly `count` code points. */
export const nameOfLength = (count) => 'E'.repeat(count);

/**
 * The families of a font stack, as names to compare: quotes removed, case folded, and
 * `BlinkMacSystemFont` read as `system-ui`.
 *
 * That last step is required, not a loosening. Chromium does not report
 * `BlinkMacSystemFont` back in a computed value: it treats the name as an alias of the
 * system UI font and reports `"system-ui"` in its place. A build whose stylesheet holds
 * exactly the stack blueprint 12.9 pins therefore computes to
 * `-apple-system, "system-ui", "SF Pro Text", ...`. Comparing the computed value against
 * the pinned text one character at a time would fail every correct build, and the computed
 * value cannot tell the two spellings apart at all, so nothing is given up by reading them
 * as one name. Everything else about the stack — which families, how many and in what
 * order — is still compared exactly.
 */
export const fontFamilies = (value) =>
  value
    .split(',')
    .map((name) =>
      name
        .trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase(),
    )
    .map((name) => (name === 'blinkmacsystemfont' ? 'system-ui' : name));
