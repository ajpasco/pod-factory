import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  watchRequests,
  offOriginRequests,
  writeRequests,
  snapshotRequests,
  storageState,
  controlInventory,
  classifyControls,
  describeControls,
  scriptsFromCalendarText,
} from './observers.js';

/**
 * Acceptance tests for story MODAL-1, authored before the implementation and protected
 * from it (PRD TR-01 to TR-07; EVAL-PLAN MOD-01 to MOD-04, CAL-02, CAL-03, RST-02, RST-03).
 *
 * THE DISPLAY CONTRACT THESE TESTS HOLD THE PAGE TO
 *
 * On load the page fetches /meetings.json once and renders:
 *   - the source calendar name, "Meetings", as visible text;
 *   - when Claude fetched the snapshot, in a line matching /fetched/i that shows the
 *     snapshot's own fetch time (9:30 AM for the fixture) with a timezone marker;
 *   - the queried window, in a line matching /window/i showing both its dates;
 *   - one button per event. Its accessible name contains the event title, or
 *     "Untitled meeting" when the title is empty, and the event's time. A timed event
 *     shows a clock time and a timezone marker (EDT, EST, GMT-4 or UTC-4, as
 *     `toLocaleTimeString` with `timeZoneName: 'short'` produces); an all-day event
 *     shows /all day/i, its own calendar date, and no clock time;
 *   - no visible role=dialog.
 *
 * Keyboard reach matters: every meeting item and the Close control must be reachable by
 * Tab and activatable by Enter. Nothing may be focusable only programmatically.
 *
 * Activating an item opens exactly one visible role=dialog whose accessible name contains
 * that event's title, containing the event's start AND end, the calendar name, and a button
 * matching /close/i. Closing hides it and returns focus to the item that opened it.
 * Nothing reopens on its own.
 *
 * A valid snapshot with no events shows exactly "No upcoming meetings.".
 * A missing, malformed, wrongly shaped or wrong-calendar snapshot shows a visible error
 * matching /unavailable|cannot|can't|could not|couldn't|error|problem/i and never the empty state.
 *
 * Calendar text is rendered as text, never as HTML, in the list and in the dialog.
 *
 * THE SNAPSHOT CONTRACT (TECH-SPEC section 4)
 *
 * A snapshot is valid only when it carries `calendar: {id, name}` with a non-empty id and
 * the name "Meetings", `fetchedAt`, `window: {from, to}` and `events: [{id, title, start,
 * end}]` with a non-empty id on every event. Every timed value carries an explicit UTC
 * offset or Z; a value with no offset is not a timed value this page may interpret. Every
 * value names a real moment: 30 February, a 13th month and a 25th hour are refused. Each
 * refusal shows the error state and never the empty state or a rendered item.
 *
 * Controls are authorized by structure, not by name. Exactly one control per event inside
 * the meeting list, and exactly one Close inside the modal; no control outside those two
 * places and no control without an accessible name, modal open or closed. A meeting title
 * that happens to read like a feature ("Sync with legal") is calendar data, not a control.
 */

const ORIGIN = 'http://127.0.0.1:4187';
const ERROR_TEXT = /unavailable|cannot|can't|could not|couldn't|error|problem/i;
const TIMEZONE_MARKER = /\bEDT\b|\bEST\b|GMT[+-]\d|UTC[+-]\d/;
const CLOCK_TIME = /\d{1,2}:\d{2}/;

const VALID_SNAPSHOT = {
  calendar: { id: 'synthetic-meetings@example.invalid', name: 'Meetings' },
  fetchedAt: '2026-10-17T09:30:00-04:00',
  window: {
    from: '2026-10-17T00:00:00-04:00',
    to: '2026-10-24T00:00:00-04:00',
  },
  events: [
    {
      id: 'ev-1',
      title: 'Design review',
      start: '2026-10-19T10:00:00-04:00',
      end: '2026-10-19T11:00:00-04:00',
    },
    {
      id: 'ev-2',
      title: 'Quarterly planning <script>window.__xss = true</script>',
      start: '2026-10-20T14:30:00-04:00',
      end: '2026-10-20T15:00:00-04:00',
    },
    { id: 'ev-3', title: '', start: '2026-10-21', end: '2026-10-22' },
  ],
};

async function serveSnapshot(page: Page, body: unknown | string, status = 200): Promise<void> {
  await page.route('**/meetings.json', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

function itemButton(page: Page, name: string | RegExp) {
  return page.getByRole('button', { name });
}

/** Tab from the document start until `target` holds focus. Fails if it is unreachable. */
async function tabTo(page: Page, target: Locator, limit = 12): Promise<void> {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('target was not reachable by Tab within the limit');
}

async function accessibleText(control: Locator): Promise<string> {
  return (await control.getAttribute('aria-label')) ?? (await control.innerText());
}

test.describe('MOD-01 initial state and opening', () => {
  test('lists the snapshot with no modal, then opens exactly one modal with the event’s start and end', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    await expect(itemButton(page, /Design review/)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await itemButton(page, /Design review/).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/Design review/);
    await expect(dialog).toContainText(/Design review/);
    await expect(dialog).toContainText('Meetings');
    await expect(dialog, 'the modal shows the start time').toContainText(/10:00/);
    await expect(dialog, 'the modal shows the end time').toContainText(/11:00/);
    await expect(dialog.getByRole('button', { name: /close/i })).toBeVisible();
  });
});

test.describe('MOD-02 closing', () => {
  test('close hides the modal, leaves the list usable and nothing reopens within five seconds', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');
    const url = page.url();

    await itemButton(page, /Design review/).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /close/i }).click();
    await expect(dialog).toBeHidden();
    expect(page.url()).toBe(url);
    await expect(itemButton(page, /Design review/)).toBeEnabled();

    const start = Date.now();
    while (Date.now() - start < 5_000) {
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.waitForTimeout(250);
    }
    await expect(itemButton(page, /Design review/)).toBeEnabled();
  });
});

test.describe('MOD-03 reopening and switching items', () => {
  test('reopens once and shows the other item’s own details', async ({ page }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    const first = itemButton(page, /Design review/);
    await first.click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await first.click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByRole('dialog')).toHaveAccessibleName(/Design review/);
    await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();

    await itemButton(page, /Quarterly planning/).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toHaveAccessibleName(/Quarterly planning/);
    await expect(dialog, 'the second event’s own start').toContainText(/2:30|14:30/);
    await expect(dialog, 'the second event’s own end').toContainText(/3:00|15:00/);
    await expect(dialog).not.toContainText('Design review');
    await expect(dialog).not.toContainText(/10:00/);
  });
});

test.describe('MOD-04 keyboard and accessible names', () => {
  test('the keyboard alone opens the dialog, keeps focus inside, closes it and returns focus', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    const first = itemButton(page, /Design review/);
    await tabTo(page, first);
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/Design review/);

    // A native modal dialog makes the rest of the page inert, and Chromium's Tab cycle
    // visits the document body between the dialog's own controls. TR-04 requires that no
    // background control becomes reachable; it does not require focus to sit on an element
    // inside the dialog at every step, so asserting containment would force a custom Tab
    // handler that TECH-SPEC section 2 tells the builder not to write.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (active === null) return 'none';
        if (active === document.body || active === document.documentElement) return 'document';
        return active.closest('dialog') !== null ? 'dialog' : 'background';
      });
      expect(where, 'no background control may be reachable while the dialog is open').not.toBe(
        'background',
      );
    }

    const close = dialog.getByRole('button', { name: /close/i });
    await expect(close).toHaveAccessibleName(/close/i);
    await tabTo(page, close, 8);
    await page.keyboard.press('Enter');

    await expect(dialog).toBeHidden();
    await expect(first, 'focus returns to the item that opened the dialog').toBeFocused();
  });

  test('the item button carries the event title, its time and a timezone in its accessible name', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    const timed = itemButton(page, /Design review/);
    await expect(timed).toHaveAccessibleName(CLOCK_TIME);
    await expect(timed).toHaveAccessibleName(TIMEZONE_MARKER);
  });
});

test.describe('CAL-02 snapshot rendering', () => {
  test('renders source, the snapshot’s own fetched time, the window and all three items', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    await expect(page.getByText('Meetings').first()).toBeVisible();

    const fetched = page.getByText(/fetched/i).first();
    await expect(fetched).toBeVisible();
    await expect(fetched, 'the fetched line shows the snapshot’s fetch time').toContainText(
      /9:30|09:30/,
    );
    await expect(fetched).toContainText(TIMEZONE_MARKER);

    const window_ = page.getByText(/window/i).first();
    await expect(window_).toBeVisible();
    await expect(window_, 'the window line shows its start date').toContainText(/\b17\b/);
    await expect(window_, 'the window line shows its end date').toContainText(/\b24\b/);

    await expect(itemButton(page, /Design review/)).toBeVisible();
    await expect(itemButton(page, /Quarterly planning/)).toBeVisible();

    const allDay = itemButton(page, /Untitled meeting/);
    await expect(allDay, 'an empty title falls back to "Untitled meeting"').toBeVisible();
    await expect(allDay).toHaveAccessibleName(/all day/i);
    const allDayName = await accessibleText(allDay);
    expect(allDayName, 'a date-only event shows no clock time').not.toMatch(CLOCK_TIME);
    expect(allDayName, 'a date-only event keeps its own date, with no timezone shift').toMatch(
      /\b21\b/,
    );
    expect(allDayName).not.toMatch(/\b20\b/);
  });

  test('calendar text is rendered as text in the list and in the dialog, never as HTML', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    await expect(itemButton(page, /Quarterly planning/)).toContainText('<script>');
    expect(await scriptsFromCalendarText(page), 'no script element built from event text').toBe(0);

    await itemButton(page, /Quarterly planning/).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('<script>');
    expect(await scriptsFromCalendarText(page), 'none inside the dialog either').toBe(0);
    expect(await page.evaluate(() => '__xss' in window)).toBe(false);
  });

  test('a snapshot naming a different calendar is refused, not displayed', async ({ page }) => {
    await serveSnapshot(page, {
      ...VALID_SNAPSHOT,
      calendar: { id: 'other@example.invalid', name: 'Another Calendar' },
    });
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
    await expect(itemButton(page, /Design review/)).toHaveCount(0);
  });
});

test.describe('CAL-03 empty and unavailable snapshots', () => {
  test('a valid empty snapshot shows the empty state', async ({ page }) => {
    await serveSnapshot(page, { ...VALID_SNAPSHOT, events: [] });
    await page.goto('/');

    await expect(page.getByText('No upcoming meetings.')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
  });

  test('a snapshot that is not valid JSON shows an error and never the empty state', async ({
    page,
  }) => {
    await serveSnapshot(page, '{ "calendar": { "name": "Meetings" }, "events": ');
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
    await expect(page.getByText('No upcoming meetings.')).toHaveCount(0);
  });

  test('valid JSON of the wrong shape shows an error and never the empty state', async ({
    page,
  }) => {
    await serveSnapshot(page, {
      calendar: { id: 'synthetic-meetings@example.invalid', name: 'Meetings' },
      fetchedAt: '2026-10-17T09:30:00-04:00',
      window: {
        from: '2026-10-17T00:00:00-04:00',
        to: '2026-10-24T00:00:00-04:00',
      },
      events: { 'ev-1': { title: 'Design review' } },
    });
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
    await expect(page.getByText('No upcoming meetings.')).toHaveCount(0);
    await expect(itemButton(page, /Design review/)).toHaveCount(0);
  });

  test('an event missing its times shows an error and never the empty state', async ({ page }) => {
    await serveSnapshot(page, {
      ...VALID_SNAPSHOT,
      events: [{ id: 'ev-1', title: 'Design review' }],
    });
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
    await expect(page.getByText('No upcoming meetings.')).toHaveCount(0);
  });

  test('an unavailable snapshot shows an error and never the empty state', async ({ page }) => {
    await serveSnapshot(page, { error: 'not found' }, 404);
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
    await expect(page.getByText('No upcoming meetings.')).toHaveCount(0);
  });
});

test.describe('RST-02 browser access and storage', () => {
  test('loads only same-origin assets, reads once, writes nothing and stores nothing', async ({
    page,
  }) => {
    const log = watchRequests(page);
    await page.goto('/');

    await expect(itemButton(page, /Design review/)).toBeVisible();
    await itemButton(page, /Design review/).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(offOriginRequests(log, ORIGIN), 'no off-origin request is authorized').toEqual([]);
    expect(writeRequests(log), 'the page issues no write request').toEqual([]);
    expect(snapshotRequests(log).length, 'one snapshot fetch per page load').toBe(1);

    const storage = await storageState(page);
    expect(storage).toEqual({
      localStorage: 0,
      sessionStorage: 0,
      cookies: '',
      indexedDb: 0,
      serviceWorkers: 0,
    });
  });
});

test.describe('RST-03 feature boundary', () => {
  test('the only controls are one per meeting and Close, with nothing extra or unnamed', async ({
    page,
  }) => {
    await serveSnapshot(page, VALID_SNAPSHOT);
    await page.goto('/');

    const closed = classifyControls(await controlInventory(page));
    expect(
      closed.list.length,
      `one control per fixture event: ${describeControls(closed.list)}`,
    ).toBe(VALID_SNAPSHOT.events.length);
    expect(closed.dialog, 'no modal control while the modal is closed').toEqual([]);
    expect(
      closed.other,
      `no control outside the meeting list: ${describeControls(closed.other)}`,
    ).toEqual([]);
    expect(
      closed.unnamed,
      `every control carries an accessible name: ${describeControls(closed.unnamed)}`,
    ).toEqual([]);

    await itemButton(page, /Design review/).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const open = classifyControls(await controlInventory(page));
    expect(
      open.dialog.length,
      `the modal offers Close and nothing else: ${describeControls(open.dialog)}`,
    ).toBe(1);
    expect(open.dialog[0]?.name).toMatch(/close/i);
    expect(
      open.list.length,
      `the list gains no control when the modal opens: ${describeControls(open.list)}`,
    ).toBe(VALID_SNAPSHOT.events.length);
    expect(
      open.other,
      `no control outside the list and the modal: ${describeControls(open.other)}`,
    ).toEqual([]);
    expect(
      open.unnamed,
      `no unnamed control appears with the modal: ${describeControls(open.unnamed)}`,
    ).toEqual([]);
  });
});

test.describe('CAL-02 and CAL-03 snapshot contract: required identifiers, offsets and real dates', () => {
  const TIMED = {
    start: '2026-10-19T10:00:00-04:00',
    end: '2026-10-19T11:00:00-04:00',
  };
  const event = (fields: Record<string, unknown>) => ({
    ...VALID_SNAPSHOT.events[0],
    ...fields,
  });

  const refused: ReadonlyArray<readonly [string, unknown]> = [
    ['the calendar carries no id', { ...VALID_SNAPSHOT, calendar: { name: 'Meetings' } }],
    ['the calendar id is blank', { ...VALID_SNAPSHOT, calendar: { id: '   ', name: 'Meetings' } }],
    [
      'the calendar id is not a string',
      { ...VALID_SNAPSHOT, calendar: { id: 12345, name: 'Meetings' } },
    ],
    [
      'an event carries no id',
      { ...VALID_SNAPSHOT, events: [{ title: 'Design review', ...TIMED }] },
    ],
    ['an event id is blank', { ...VALID_SNAPSHOT, events: [event({ id: '' })] }],
    [
      'a timed start carries no offset',
      { ...VALID_SNAPSHOT, events: [event({ start: '2026-10-19T10:00:00' })] },
    ],
    [
      'a timed end carries no offset',
      { ...VALID_SNAPSHOT, events: [event({ end: '2026-10-19T11:00:00' })] },
    ],
    ['the fetched time carries no offset', { ...VALID_SNAPSHOT, fetchedAt: '2026-10-17T09:30:00' }],
    [
      'the window carries no offset',
      {
        ...VALID_SNAPSHOT,
        window: { from: '2026-10-17T00:00:00', to: '2026-10-24T00:00:00' },
      },
    ],
    [
      'a date-only value names a day that does not exist',
      {
        ...VALID_SNAPSHOT,
        events: [event({ start: '2026-02-30', end: '2026-03-01' })],
      },
    ],
    [
      'a timed value names a day that does not exist',
      {
        ...VALID_SNAPSHOT,
        events: [
          event({
            start: '2026-02-30T10:00:00-04:00',
            end: '2026-03-01T10:00:00-04:00',
          }),
        ],
      },
    ],
    [
      'a timed value names a month that does not exist',
      {
        ...VALID_SNAPSHOT,
        events: [
          event({
            start: '2026-13-01T10:00:00-04:00',
            end: '2026-13-01T11:00:00-04:00',
          }),
        ],
      },
    ],
    [
      'a timed value names an hour that does not exist',
      {
        ...VALID_SNAPSHOT,
        events: [
          event({
            start: '2026-10-19T25:00:00-04:00',
            end: '2026-10-19T26:00:00-04:00',
          }),
        ],
      },
    ],
  ];

  for (const [because, snapshot] of refused) {
    test(`refuses a snapshot where ${because}`, async ({ page }) => {
      await serveSnapshot(page, snapshot);
      await page.goto('/');

      await expect(page.getByText(ERROR_TEXT).first()).toBeVisible();
      await expect(page.getByText('No upcoming meetings.')).toHaveCount(0);
      await expect(itemButton(page, /Design review/)).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  }

  test('accepts the offset forms the contract allows', async ({ page }) => {
    await serveSnapshot(page, {
      ...VALID_SNAPSHOT,
      events: [
        event({
          id: 'ev-z',
          title: 'UTC meeting',
          start: '2026-10-19T14:00:00Z',
          end: '2026-10-19T15:00:00Z',
        }),
        event({
          id: 'ev-plus',
          title: 'Offset meeting',
          start: '2026-10-20T10:00:00+05:30',
          end: '2026-10-20T11:00:00+05:30',
        }),
        event({
          id: 'ev-leap',
          title: 'Leap day',
          start: '2028-02-29',
          end: '2028-03-01',
        }),
      ],
    });
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
    await expect(itemButton(page, /UTC meeting/)).toBeVisible();
    await expect(itemButton(page, /Offset meeting/)).toBeVisible();
    await expect(itemButton(page, /Leap day/)).toBeVisible();
  });

  test('a meeting title that reads like a feature stays calendar data, not a control', async ({
    page,
  }) => {
    const titles = ['Sync with legal', 'Join the board review', 'Sign in rehearsal'];
    await serveSnapshot(page, {
      ...VALID_SNAPSHOT,
      events: titles.map((title, index) => event({ id: `ev-${index}`, title, ...TIMED })),
    });
    await page.goto('/');

    await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
    const controls = classifyControls(await controlInventory(page));
    expect(controls.list.map((control) => control.name).join(' | ')).toMatch(/Sync with legal/);
    expect(controls.list.length, 'one control per event, titles and all').toBe(titles.length);
    expect(controls.other, 'a title is not a feature').toEqual([]);

    await itemButton(page, /Join the board review/).click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName(/Join the board review/);
  });
});
