// REQ-014: labelled icon buttons and operable modals. The eight C rows of S3
// (T-014-P5, T-014-P6, T-014-P8 and T-014-P12 are keyboard B rows).
// Frozen with the S3 tests; read-only to every builder.
//
// Four rows sweep "the page in each state for Ada and for Mia". The sweep of `_states.js`
// also visits the list being fetched and the page after each of the four demos, which is
// more than those rows name and asserts nothing different: an icon control found in one of
// those states is held to the same rule as in any other.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, SAM, available, onLoan } from './_fake-server.js';
import {
  ELEVEN_ICON_CONTROLS,
  FIFTEEN_ICON_BUTTONS,
  FOUR_DEMOS,
  S,
  iconButtons,
  memberButtons,
  rowOf,
  screen,
  showList,
  testidOf,
  textOf,
  within,
} from './_harness.js';
import { eachState } from './_states.js';

/** The text nodes of an element, whitespace-only ones left out. */
const textNodesOf = (element) =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3 && node.textContent.trim() !== '')
    .map((node) => node.textContent);

const isInlineGraphic = (node) => node.nodeType === 1 && node.tagName.toLowerCase() === 'svg';

/** Every element of the control, wherever it appears in the page right now. */
const everyInstanceOf = (testid) =>
  Array.from(globalThis.document.querySelectorAll(`[data-testid="${testid}"]`));

it('T-014-P1 REQ-014.1 each of the eleven icon controls is a button holding one inline graphic', async () => {
  const everFound = new Set();

  for (const actingUser of [ADA, MIA]) {
    await eachState(
      actingUser,
      ({ label }) => {
        for (const control of ELEVEN_ICON_CONTROLS) {
          for (const element of everyInstanceOf(control.testid)) {
            const where = `${control.testid} in: ${label}`;
            everFound.add(control.testid);
            expect(element.tagName.toLowerCase(), where).toBe('button');
            const children = Array.from(element.childNodes);
            expect(children.filter(isInlineGraphic), where).toHaveLength(1);
            expect(children, where).toHaveLength(1);
          }
        }
      },
      { includeUnpicked: false },
    );
  }

  // The anchor: every one of the eleven really was found somewhere in the sweep, so the
  // rule above was applied to each of them and not to an empty set.
  expect(Array.from(everFound).sort()).toEqual(
    ELEVEN_ICON_CONTROLS.map((each) => each.testid).sort(),
  );
});

it('T-014-P2 REQ-014.2 every icon button carries the pinned tooltip of its control', async () => {
  const pinned = new Map(FIFTEEN_ICON_BUTTONS.map((each) => [each.testid, each.label]));
  for (const demo of FOUR_DEMOS) pinned.set(demo.testid, demo.tooltip);
  const everFound = new Set();

  for (const actingUser of [ADA, MIA]) {
    await eachState(
      actingUser,
      ({ label }) => {
        for (const button of iconButtons()) {
          const testid = testidOf(button);
          const where = `${testid} in: ${label}`;
          expect(pinned.has(testid), where).toBe(true);
          everFound.add(testid);
          expect(button.getAttribute('title'), where).toBe(pinned.get(testid));
        }
      },
      { includeUnpicked: false },
    );
  }

  expect(Array.from(everFound).sort()).toEqual(Array.from(pinned.keys()).sort());
});

it('T-014-P3 REQ-014.3 every icon button is found by its accessible name, which equals its pinned label', async () => {
  const everFound = new Set();

  for (const actingUser of [ADA, MIA]) {
    await eachState(
      actingUser,
      ({ label }) => {
        for (const control of FIFTEEN_ICON_BUTTONS) {
          const instances = everyInstanceOf(control.testid);
          if (instances.length === 0) continue;
          everFound.add(control.testid);
          const where = `${control.testid} in: ${label}`;
          // Looked up the way a person using assistive technology reaches it.
          const byName = screen.getAllByRole('button', {
            name: control.label,
            exact: true,
          });
          for (const element of instances) {
            expect(byName, where).toContain(element);
            expect(element.getAttribute('aria-label'), where).toBe(control.label);
          }
        }
      },
      { includeUnpicked: false },
    );
  }

  expect(Array.from(everFound).sort()).toEqual(
    FIFTEEN_ICON_BUTTONS.map((each) => each.testid).sort(),
  );
});

it('T-014-P4 REQ-014.4 each of the four modals carries the alertdialog role', async () => {
  const server = new FakeServer([available(1, 'Projector'), onLoan(2, 'Laptop', MIA)]);
  const { user } = await showList(server, ADA);

  const open = async (what, drive) => {
    await drive();
    const modal = await screen.findByTestId(what);
    expect(modal.getAttribute('role'), what).toBe('alertdialog');
  };

  await open('modal-borrower', async () => {
    await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  });
  await user.click(screen.getByTestId('btn-close'));

  await open('modal-confirm-delete', async () => {
    await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  });
  await user.click(screen.getByTestId('btn-cancel'));

  await open('modal-api-failure', async () => {
    await user.click(screen.getByTestId('demo-api-failure'));
  });
  await user.click(screen.getByTestId('btn-close'));

  await open('modal-access-denied', async () => {
    await user.click(screen.getByTestId('demo-access-denied'));
  });
});

it('T-014-P9 REQ-014.8 a member button holds a graphic and the member name, where the icon controls hold no text', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');

  const buttons = memberButtons();
  expect(buttons).toHaveLength(2);
  for (const [index, member] of [MIA, SAM].entries()) {
    const button = buttons[index];
    expect(Array.from(button.childNodes).filter(isInlineGraphic)).toHaveLength(1);
    expect(textOf(button)).toBe(member.name);
  }

  // The anchor: the eleven icon controls elsewhere on the same page hold no text, so the
  // text above is the member button's own exception and not the page's habit.
  for (const control of ELEVEN_ICON_CONTROLS) {
    for (const element of everyInstanceOf(control.testid)) {
      expect(textNodesOf(element), control.testid).toHaveLength(0);
    }
  }
});

it('T-014-P10 REQ-014.9 a member button names the member in its tooltip and its label', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');

  for (const member of [MIA, SAM]) {
    const button = screen.getByTestId(`member-button-${member.id}`);
    expect(button.getAttribute('title')).toBe(S.memberButtonLabel(member));
    expect(button.getAttribute('aria-label')).toBe(S.memberButtonLabel(member));
  }
  expect(S.memberButtonLabel(MIA)).toBe('Borrow for Mia Member');
  expect(S.memberButtonLabel(SAM)).toBe('Borrow for Sam Member');
});

it('T-014-P11 REQ-014.10 the four state demos carry their pinned tooltips and labels', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  await showList(server, ADA);

  const panel = screen.getByTestId('state-demos');
  expect(Array.from(panel.querySelectorAll('button')).map(testidOf)).toEqual(
    FOUR_DEMOS.map((each) => each.testid),
  );
  for (const demo of FOUR_DEMOS) {
    const button = screen.getByTestId(demo.testid);
    expect(button.getAttribute('title'), demo.testid).toBe(demo.tooltip);
    expect(button.getAttribute('aria-label'), demo.testid).toBe(demo.label);
  }
});

it('T-014-N1 REQ-014.1 no caption sits inside or in place of an icon', async () => {
  const everFound = new Set();

  for (const actingUser of [ADA, MIA]) {
    await eachState(
      actingUser,
      ({ label }) => {
        for (const control of ELEVEN_ICON_CONTROLS) {
          for (const element of everyInstanceOf(control.testid)) {
            const where = `${control.testid} in: ${label}`;
            // Found first: the control itself, so the absence below is of a caption and
            // not of the control.
            expect(element.tagName.toLowerCase(), where).toBe('button');
            everFound.add(control.testid);
            expect(textNodesOf(element), where).toHaveLength(0);
            expect(element.textContent.trim(), where).toBe('');
            expect(
              Array.from(element.childNodes).filter((node) => !isInlineGraphic(node)),
              where,
            ).toHaveLength(0);
          }
        }
        // The status badge and the row name sit beside a row's icons and are not part of
        // any button.
        for (const part of globalThis.document.querySelectorAll(
          '[data-testid="row-status"], [data-testid="row-name"]',
        )) {
          expect(part.closest('button'), `${testidOf(part)} in: ${label}`).toBeNull();
        }
      },
      { includeUnpicked: false },
    );
  }

  expect(Array.from(everFound).sort()).toEqual(
    ELEVEN_ICON_CONTROLS.map((each) => each.testid).sort(),
  );
});
