import type { Page, Request } from '@playwright/test';

/**
 * Restraint observers (EVAL-PLAN RST-02, RST-03). Protected test input: the builder
 * may not change this file. test/observer-probe.spec.ts proves each observer catches
 * the violation it claims to catch, so a passing restraint check is not vacuous.
 */

export interface RequestRecord {
  method: string;
  url: string;
}

export interface RequestLog {
  entries: RequestRecord[];
}

/** Attach before navigation so the document request itself is recorded. */
export function watchRequests(page: Page): RequestLog {
  const log: RequestLog = { entries: [] };
  page.on('request', (request: Request) =>
    log.entries.push({ method: request.method(), url: request.url() }),
  );
  return log;
}

function sameOrigin(url: string, origin: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

export function offOriginRequests(log: RequestLog, origin: string): string[] {
  return log.entries.filter((entry) => !sameOrigin(entry.url, origin)).map((entry) => entry.url);
}

/** Anything that is not a plain read, same-origin or not (EVAL-PLAN RST-02: "no write request"). */
export function writeRequests(log: RequestLog): RequestRecord[] {
  return log.entries.filter((entry) => entry.method !== 'GET' && entry.method !== 'HEAD');
}

export function snapshotRequests(log: RequestLog): string[] {
  return log.entries.filter((entry) => entry.url.includes('meetings.json')).map((e) => e.url);
}

export interface StorageState {
  localStorage: number;
  sessionStorage: number;
  cookies: string;
  indexedDb: number;
  serviceWorkers: number;
}

export async function storageState(page: Page): Promise<StorageState> {
  return page.evaluate(async () => {
    const factory = indexedDB as IDBFactory & {
      databases?: () => Promise<unknown[]>;
    };
    const databases = typeof factory.databases === 'function' ? await factory.databases() : [];
    const registrations =
      'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    return {
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length,
      cookies: document.cookie,
      indexedDb: databases.length,
      serviceWorkers: registrations.length,
    };
  });
}

export interface ControlRecord {
  /** Accessible name, or '' when the control exposes none. Unnamed controls are kept. */
  name: string;
  tag: string;
  /** Where the control sits: inside the modal, inside the meeting list, or neither. */
  zone: 'dialog' | 'list' | 'other';
}

/**
 * Every interactive control the user can reach right now, placed by structure rather than
 * by name. This trial authorizes exactly two kinds: one control per meeting inside the
 * list, and the modal's own Close. Anything in the `other` zone, any surplus control in a
 * zone, and any control without an accessible name is therefore a finding.
 *
 * Deliberately NOT a keyword check on names: a list control's name is calendar text, so a
 * meeting called "Sync with legal" or "Join the board" is data, not an unauthorized
 * feature. Structure tells the two apart; a word list cannot.
 */
export async function controlInventory(page: Page): Promise<ControlRecord[]> {
  return page.evaluate(() => {
    const selector = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="switch"]',
      '[role="menuitem"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return element.getClientRects().length > 0;
      })
      .map((element) => {
        const inDialog = element.closest('dialog, [role="dialog"]') !== null;
        const inList = element.closest('ul, ol, [role="list"]') !== null;
        return {
          name: (element.getAttribute('aria-label') ?? element.textContent ?? '')
            .trim()
            .replace(/\s+/g, ' '),
          tag: element.tagName.toLowerCase(),
          zone: inDialog ? 'dialog' : inList ? 'list' : 'other',
        } as ControlRecord;
      });
  });
}

export interface ControlVerdict {
  list: ControlRecord[];
  dialog: ControlRecord[];
  /** Controls belonging to neither authorized zone: always a finding. */
  other: ControlRecord[];
  /** Controls with no accessible name, wherever they sit: always a finding. */
  unnamed: ControlRecord[];
}

export function classifyControls(controls: readonly ControlRecord[]): ControlVerdict {
  return {
    list: controls.filter((control) => control.zone === 'list'),
    dialog: controls.filter((control) => control.zone === 'dialog'),
    other: controls.filter((control) => control.zone === 'other'),
    unnamed: controls.filter((control) => control.name === ''),
  };
}

/** Readable form for a failure message, so a finding names what it found. */
export function describeControls(controls: readonly ControlRecord[]): string {
  return controls.map((control) => `${control.tag}[${control.zone}]="${control.name}"`).join(', ');
}

/** Script elements the page built from calendar text: always a defect (TECH-SPEC section 2). */
export async function scriptsFromCalendarText(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      Array.from(document.querySelectorAll('script')).filter((script) =>
        (script.textContent ?? '').includes('__xss'),
      ).length,
  );
}
