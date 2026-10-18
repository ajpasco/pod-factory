import { test, expect } from '@playwright/test';
import {
  watchRequests,
  offOriginRequests,
  writeRequests,
  storageState,
  controlInventory,
  classifyControls,
  scriptsFromCalendarText,
} from './observers.js';

/**
 * Harness validity probes (EVAL-PLAN: "use harmless synthetic probes to show the observer
 * catches a prohibited request or extra control"). These never touch the application code:
 * each serves a synthetic page that deliberately commits the violation, so a passing
 * RST-02 or RST-03 cannot be an artefact of an observer that sees nothing.
 *
 * The last probe is the opposite case: a list control whose name reads like a feature must
 * NOT be reported, or the restraint check would fail the page for its calendar's wording.
 */

const ORIGIN = 'http://127.0.0.1:4187';

const PROBE_PAGE = `<!doctype html><html lang="en"><body>
  <main>
    <ul>
      <li><button type="button">Sync with legal</button></li>
      <li><button type="button">Refresh the snapshot</button></li>
    </ul>
    <button type="button">Sign in with Google</button>
    <button type="button" style="width:20px;height:20px"></button>
    <dialog open>
      <button type="button">Close</button>
      <button type="button">Join</button>
    </dialog>
  </main>
  <img alt="" src="https://offsite.example.invalid/pixel.png" />
  <script>
    window.localStorage.setItem('probe', '1');
    window.sessionStorage.setItem('probe', '1');
    document.cookie = 'probe=1';
    fetch('/collect', { method: 'POST', body: '{}' }).catch(() => {});
    const injected = document.createElement('script');
    injected.textContent = 'window.__xss_probe = true; // __xss';
    document.body.appendChild(injected);
  </script>
</body></html>`;

async function openProbe(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/probe.html', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: PROBE_PAGE }),
  );
  await page.route('https://offsite.example.invalid/**', (route) => route.abort());
  await page.route('**/collect', (route) => route.fulfill({ status: 204, body: '' }));
}

test('the request observer catches an off-origin request', async ({ page }) => {
  await openProbe(page);
  const log = watchRequests(page);
  await page.goto('/probe.html');
  await expect(page.getByRole('button', { name: 'Sync with legal' })).toBeVisible();

  expect(
    offOriginRequests(log, ORIGIN).some((url) => url.includes('offsite.example.invalid')),
  ).toBe(true);
});

test('the request observer catches a same-origin write request', async ({ page }) => {
  await openProbe(page);
  const log = watchRequests(page);
  await page.goto('/probe.html');
  await expect(page.getByRole('button', { name: 'Sync with legal' })).toBeVisible();
  await expect.poll(() => writeRequests(log).length).toBeGreaterThan(0);

  const writes = writeRequests(log);
  expect(writes.some((entry) => entry.method === 'POST' && entry.url.endsWith('/collect'))).toBe(
    true,
  );
  expect(offOriginRequests(log, ORIGIN).every((url) => !url.endsWith('/collect'))).toBe(true);
});

test('the control inventory catches a control outside the authorized places', async ({ page }) => {
  await openProbe(page);
  await page.goto('/probe.html');

  const controls = classifyControls(await controlInventory(page));
  expect(controls.other.map((control) => control.name)).toContain('Sign in with Google');
});

test('the control inventory catches a surplus control inside the list and the modal', async ({
  page,
}) => {
  await openProbe(page);
  await page.goto('/probe.html');

  const controls = classifyControls(await controlInventory(page));
  expect(controls.list.length, 'two list controls where one event would allow one').toBe(2);
  expect(controls.dialog.map((control) => control.name)).toEqual(
    expect.arrayContaining(['Close', 'Join']),
  );
  expect(controls.dialog.length, 'a surplus modal control is visible to the observer').toBe(2);
});

test('the control inventory catches a control with no accessible name', async ({ page }) => {
  await openProbe(page);
  await page.goto('/probe.html');

  const controls = classifyControls(await controlInventory(page));
  expect(controls.unnamed.length, 'the unnamed button is reported').toBeGreaterThan(0);
  expect(controls.unnamed.every((control) => control.name === '')).toBe(true);
});

test('the control inventory does not report a list control for its calendar wording', async ({
  page,
}) => {
  await openProbe(page);
  await page.goto('/probe.html');

  const controls = classifyControls(await controlInventory(page));
  const named = controls.list.map((control) => control.name);
  expect(named, 'a meeting titled "Sync with legal" stays a list control').toContain(
    'Sync with legal',
  );
  expect(controls.other.map((control) => control.name)).not.toContain('Sync with legal');
  expect(controls.unnamed.map((control) => control.name)).not.toContain('Sync with legal');
});

test('the storage observer catches every storage write it claims to see', async ({ page }) => {
  await openProbe(page);
  await page.goto('/probe.html');

  const storage = await storageState(page);
  expect(storage.localStorage).toBeGreaterThan(0);
  expect(storage.sessionStorage).toBeGreaterThan(0);
  expect(storage.cookies).toContain('probe=1');
});

test('the script observer catches a script element built from event text', async ({ page }) => {
  await openProbe(page);
  await page.goto('/probe.html');

  expect(await scriptsFromCalendarText(page)).toBeGreaterThan(0);
});
