import './style.css';

const SNAPSHOT_URL = '/meetings.json';
const CALENDAR_NAME = 'Meetings';
const DAY_MS = 24 * 60 * 60 * 1000;

/** A date-only value is held as UTC midnight so it never shifts with the viewer's timezone. */
interface Moment {
  kind: 'date' | 'timed';
  date: Date;
}

interface MeetingEvent {
  title: string;
  start: Moment;
  end: Moment;
}

interface Snapshot {
  calendar: string;
  fetchedAt: Moment;
  windowFrom: Moment;
  windowTo: Moment;
  events: MeetingEvent[];
}

class SnapshotError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing page element ${selector}`);
  return element;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMED = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-](\d{2}):(\d{2}))$/;

function parseMoment(value: unknown, allowDateOnly: boolean, label: string): Moment {
  if (typeof value !== 'string') throw new SnapshotError(`${label} is missing`);

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly !== null) {
    const [year, month, day] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])];
    if (!allowDateOnly || !isRealDate(year, month, day)) {
      throw new SnapshotError(`${label} is not a valid date`);
    }
    return { kind: 'date', date: new Date(Date.UTC(year, month - 1, day)) };
  }

  const timed = TIMED.exec(value);
  if (timed !== null) {
    const [year, month, day] = [Number(timed[1]), Number(timed[2]), Number(timed[3])];
    const [hour, minute, second] = [Number(timed[4]), Number(timed[5]), Number(timed[6] ?? 0)];
    const [offsetHour, offsetMinute] = [Number(timed[8] ?? 0), Number(timed[9] ?? 0)];
    const date = new Date(value);
    if (
      !isRealDate(year, month, day) ||
      hour > 23 ||
      minute > 59 ||
      second > 59 ||
      offsetHour > 23 ||
      offsetMinute > 59 ||
      Number.isNaN(date.getTime())
    ) {
      throw new SnapshotError(`${label} is not a valid time`);
    }
    return { kind: 'timed', date };
  }

  throw new SnapshotError(`${label} is not a date or a time with a UTC offset`);
}

function parseEvent(value: unknown, index: number): MeetingEvent {
  const label = `Event ${index + 1}`;
  if (!isRecord(value)) throw new SnapshotError(`${label} is malformed`);
  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new SnapshotError(`${label} has no id`);
  }
  if (value.title !== undefined && value.title !== null && typeof value.title !== 'string') {
    throw new SnapshotError(`${label} has a malformed title`);
  }
  const start = parseMoment(value.start, true, `${label} start`);
  const end = parseMoment(value.end, true, `${label} end`);
  if (start.kind !== end.kind) throw new SnapshotError(`${label} mixes dates and times`);
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  return { title: title === '' ? 'Untitled meeting' : title, start, end };
}

function parseSnapshot(value: unknown): Snapshot {
  if (!isRecord(value)) throw new SnapshotError('The snapshot is malformed');

  const { calendar, window: queried, events } = value;
  if (!isRecord(calendar) || typeof calendar.id !== 'string' || calendar.id.trim() === '') {
    throw new SnapshotError('The snapshot names no calendar id');
  }
  if (calendar.name !== CALENDAR_NAME) {
    throw new SnapshotError(`The snapshot is not from the ${CALENDAR_NAME} calendar`);
  }
  if (!isRecord(queried)) throw new SnapshotError('The snapshot has no query window');
  if (!Array.isArray(events)) throw new SnapshotError('The snapshot has no event list');

  return {
    calendar: CALENDAR_NAME,
    fetchedAt: parseMoment(value.fetchedAt, false, 'The fetched time'),
    windowFrom: parseMoment(queried.from, true, 'The window start'),
    windowTo: parseMoment(queried.to, true, 'The window end'),
    events: events.map(parseEvent),
  };
}

async function loadSnapshot(): Promise<Snapshot> {
  const response = await fetch(SNAPSHOT_URL);
  if (!response.ok) throw new SnapshotError(`The snapshot request returned ${response.status}`);
  return parseSnapshot(await response.json());
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const dateOnlyFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

function formatDay(moment: Moment): string {
  return (moment.kind === 'date' ? dateOnlyFormat : dayFormat).format(moment.date);
}

function formatDateTime(moment: Moment): string {
  if (moment.kind === 'date') return formatDay(moment);
  return `${formatDay(moment)}, ${timeFormat.format(moment.date)}`;
}

/** An all-day event's end date is exclusive, so its last day is the day before. */
function lastDay(event: MeetingEvent): Moment {
  const last = new Date(event.end.date.getTime() - DAY_MS);
  return { kind: 'date', date: last < event.start.date ? event.start.date : last };
}

function describeWhen(event: MeetingEvent): string {
  const { start, end } = event;
  if (start.kind === 'date') {
    const last = lastDay(event);
    return formatDay(start) === formatDay(last)
      ? `All day, ${formatDay(start)}`
      : `All day, ${formatDay(start)} to ${formatDay(last)}`;
  }
  const endText =
    formatDay(start) === formatDay(end) ? timeFormat.format(end.date) : formatDateTime(end);
  return `${formatDateTime(start)} to ${endText}`;
}

function textElement(tag: 'h1' | 'p' | 'span', className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

const app = requiredElement<HTMLElement>('#app');
const details = requiredElement<HTMLDialogElement>('#details');
const detailsTitle = requiredElement<HTMLElement>('#details-title');
const detailsFields = requiredElement<HTMLElement>('#details-fields');
const detailsClose = requiredElement<HTMLButtonElement>('#details-close');

let opener: HTMLElement | null = null;

function addField(label: string, value: string): void {
  const term = document.createElement('dt');
  term.className = 'field-label';
  term.textContent = label;
  const definition = document.createElement('dd');
  definition.className = 'field-value';
  definition.textContent = value;
  detailsFields.append(term, definition);
}

function openDetails(snapshot: Snapshot, event: MeetingEvent, button: HTMLElement): void {
  const allDay = event.start.kind === 'date';
  const end = allDay ? lastDay(event) : event.end;
  opener = button;
  detailsTitle.textContent = event.title;
  detailsFields.replaceChildren();
  addField('Calendar', snapshot.calendar);
  addField('Start', allDay ? `${formatDay(event.start)} (all day)` : formatDateTime(event.start));
  addField('End', allDay ? `${formatDay(end)} (all day)` : formatDateTime(end));
  details.showModal();
}

function renderSnapshot(snapshot: Snapshot): void {
  const children: HTMLElement[] = [
    textElement('h1', 'heading', CALENDAR_NAME),
    textElement('p', 'meta', `Source: ${snapshot.calendar} calendar`),
    textElement('p', 'meta', `Fetched: ${formatDateTime(snapshot.fetchedAt)}`),
    textElement(
      'p',
      'meta',
      `Queried window: ${formatDateTime(snapshot.windowFrom)} to ${formatDateTime(snapshot.windowTo)}`,
    ),
  ];

  if (snapshot.events.length === 0) {
    children.push(textElement('p', 'empty', 'No upcoming meetings.'));
  } else {
    const list = document.createElement('ul');
    list.className = 'meetings';
    for (const event of snapshot.events) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'meeting';
      button.append(
        textElement('span', 'meeting-title', event.title),
        ' ',
        textElement('span', 'meeting-when', describeWhen(event)),
      );
      button.addEventListener('click', () => openDetails(snapshot, event, button));
      const item = document.createElement('li');
      item.append(button);
      list.append(item);
    }
    children.push(list);
  }
  app.replaceChildren(...children);
}

function renderUnavailable(reason: string): void {
  const notice = textElement('p', 'notice', `Meetings are unavailable: ${reason}.`);
  notice.setAttribute('role', 'alert');
  app.replaceChildren(textElement('h1', 'heading', CALENDAR_NAME), notice);
}

detailsClose.addEventListener('click', () => details.close());
details.addEventListener('close', () => {
  opener?.focus();
  opener = null;
});

loadSnapshot().then(renderSnapshot, (error: unknown) =>
  renderUnavailable(
    error instanceof SnapshotError ? error.message : 'the snapshot could not be read',
  ),
);
