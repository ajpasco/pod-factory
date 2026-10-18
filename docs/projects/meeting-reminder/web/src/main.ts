import './style.css';

/**
 * Story MODAL-1: list the read-only Meetings snapshot and show one event's details in the
 * native dialog (TECH-SPEC sections 2-4). Calendar text is only ever set as text.
 */

const CALENDAR_NAME = 'Meetings';
const UNTITLED = 'Untitled meeting';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMED = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-](\d{2}):(\d{2}))$/;

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const TIME_PARTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};

interface MeetingEvent {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface Snapshot {
  fetchedAt: string;
  from: string;
  to: string;
  events: MeetingEvent[];
}

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (found === null) throw new Error(`Missing ${selector}`);
  return found;
}

const app = element<HTMLElement>('#app');
const dialog = element<HTMLDialogElement>('#details');
const detailsTitle = element<HTMLHeadingElement>('#details-title');
const detailsFields = element<HTMLDListElement>('#details-fields');
const closeButton = element<HTMLButtonElement>('#details-close');

// --- Snapshot validation -------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRealDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  return match !== null && isRealDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** A real moment with an explicit offset or Z; a local time with no offset is refused. */
function isTimed(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = TIMED.exec(value);
  if (match === null) return false;
  const [, year, month, day, hour, minute, second = '0', offsetHour = '0', offsetMinute = '0'] =
    match;
  return (
    isRealDate(Number(year), Number(month), Number(day)) &&
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59 &&
    Number(offsetHour) <= 23 &&
    Number(offsetMinute) <= 59 &&
    !Number.isNaN(Date.parse(value))
  );
}

function parseEvent(value: unknown): MeetingEvent {
  if (!isRecord(value)) throw new Error('an event is not in the expected format');
  const { id, title, start, end } = value;
  if (typeof id !== 'string' || id.trim() === '') throw new Error('an event has no id');
  if (title !== undefined && title !== null && typeof title !== 'string') {
    throw new Error('an event title is not text');
  }
  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error('an event has no start or end');
  }
  const allDay = isDateOnly(start) && isDateOnly(end);
  if (!allDay && !(isTimed(start) && isTimed(end))) {
    throw new Error('an event has an invalid start or end');
  }
  return {
    title: typeof title === 'string' && title.trim() !== '' ? title : UNTITLED,
    start,
    end,
    allDay,
  };
}

function parseSnapshot(data: unknown): Snapshot {
  if (!isRecord(data)) throw new Error('the snapshot is not in the expected format');
  const { calendar, fetchedAt, window: range, events } = data;
  if (!isRecord(calendar) || typeof calendar.id !== 'string' || calendar.id.trim() === '') {
    throw new Error('the snapshot does not identify its calendar');
  }
  if (calendar.name !== CALENDAR_NAME) {
    throw new Error(`the snapshot is not from the ${CALENDAR_NAME} calendar`);
  }
  if (!isTimed(fetchedAt)) throw new Error('the snapshot has no valid fetched time');
  if (!isRecord(range) || !isTimed(range.from) || !isTimed(range.to)) {
    throw new Error('the snapshot has no valid time window');
  }
  if (!Array.isArray(events)) throw new Error('the snapshot has no event list');
  return { fetchedAt, from: range.from, to: range.to, events: events.map(parseEvent) };
}

// --- Display -------------------------------------------------------------------------

function formatInstant(value: string): string {
  return new Date(value).toLocaleString(undefined, { ...DATE_PARTS, ...TIME_PARTS });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, TIME_PARTS);
}

/** A date-only value is shown as its own calendar date, never shifted by a timezone. */
function formatDay(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    ...DATE_PARTS,
    timeZone: 'UTC',
  });
}

/** All-day end dates are exclusive; show the last day the event actually covers. */
function lastDay(event: MeetingEvent): string {
  const last = new Date(Date.parse(`${event.end}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  return last > event.start ? last : event.start;
}

function when(event: MeetingEvent): string {
  if (event.allDay) {
    const last = lastDay(event);
    return last === event.start
      ? `All day, ${formatDay(event.start)}`
      : `All day, ${formatDay(event.start)} – ${formatDay(last)}`;
  }
  const sameDay = new Date(event.start).toDateString() === new Date(event.end).toDateString();
  return `${formatInstant(event.start)} – ${sameDay ? formatTime(event.end) : formatInstant(event.end)}`;
}

function paragraph(className: string, text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

function field(label: string, value: string): HTMLElement[] {
  const term = document.createElement('dt');
  term.className = 'field-label';
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.className = 'field-value';
  detail.textContent = value;
  return [term, detail];
}

// --- Modal ---------------------------------------------------------------------------

let opener: HTMLButtonElement | null = null;

function openDetails(event: MeetingEvent, button: HTMLButtonElement): void {
  opener = button;
  detailsTitle.textContent = event.title;
  detailsFields.replaceChildren(
    ...field('Starts', event.allDay ? `${formatDay(event.start)} (all day)` : formatInstant(event.start)),
    ...field('Ends', event.allDay ? `${formatDay(lastDay(event))} (all day)` : formatInstant(event.end)),
    ...field('Calendar', CALENDAR_NAME),
  );
  dialog.showModal();
}

closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener?.focus());

// --- Page ----------------------------------------------------------------------------

function meetingItem(event: MeetingEvent): HTMLLIElement {
  const title = document.createElement('span');
  title.className = 'meeting-title';
  title.textContent = event.title;
  const time = document.createElement('span');
  time.className = 'meeting-when';
  time.textContent = when(event);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'meeting';
  button.append(title, ' ', time);
  button.addEventListener('click', () => openDetails(event, button));

  const item = document.createElement('li');
  item.append(button);
  return item;
}

async function readSnapshot(): Promise<Snapshot> {
  const response = await fetch('/meetings.json');
  if (!response.ok) throw new Error(`the snapshot could not be loaded (HTTP ${response.status})`);
  const data: unknown = await response.json().catch(() => {
    throw new Error('the snapshot is not valid JSON');
  });
  return parseSnapshot(data);
}

async function load(): Promise<void> {
  const heading = document.createElement('h1');
  heading.className = 'heading';
  heading.textContent = CALENDAR_NAME;

  let snapshot: Snapshot;
  try {
    snapshot = await readSnapshot();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const notice = paragraph('notice', `Meetings snapshot unavailable: ${reason}.`);
    notice.setAttribute('role', 'alert');
    app.replaceChildren(heading, notice);
    return;
  }

  const content: HTMLElement[] = [
    heading,
    paragraph('meta', `Source: ${CALENDAR_NAME} calendar`),
    paragraph('meta', `Fetched ${formatInstant(snapshot.fetchedAt)}`),
    paragraph('meta', `Window: ${formatInstant(snapshot.from)} to ${formatInstant(snapshot.to)}`),
  ];
  if (snapshot.events.length === 0) {
    content.push(paragraph('empty', 'No upcoming meetings.'));
  } else {
    const list = document.createElement('ul');
    list.className = 'meetings';
    list.append(...snapshot.events.map(meetingItem));
    content.push(list);
  }
  app.replaceChildren(...content);
}

void load();
