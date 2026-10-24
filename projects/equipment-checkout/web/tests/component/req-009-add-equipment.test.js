// REQ-009: add equipment. The fifteen C rows of S3 (T-009-N14 and T-009-N15 are B rows).
// Frozen with the S3 tests; read-only to every builder.

import { fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, REJECT_ERROR, REJECT_NAME, SAM, available } from './_fake-server.js';
import {
  S,
  anyModal,
  expectPlacementInDocument,
  nameOfLength,
  pick,
  rowsShown,
  screen,
  settle,
  showEmpty,
  showList,
  textOf,
  waitFor,
} from './_harness.js';

/** A row's name and status, for the rows the Add should or should not have changed. */
const listedAs = (name) => rowsShown().filter((row) => row.name === name);

it('T-009-P1 REQ-009.1 the Add field comes before the list', async () => {
  const server = new FakeServer([available(1, 'Projector'), available(2, 'Tripod')]);
  await showList(server, ADA);
  expect(rowsShown()).toHaveLength(2);

  const field = screen.getByTestId('add-input');
  const list = screen.getByTestId('equipment-list');
  // DOCUMENT_POSITION_FOLLOWING (4): the list comes after the field.
  expect(field.compareDocumentPosition(list) & 4).toBe(4);
});

it('T-009-P2 REQ-009.2 Enter in the Add field adds the item', async () => {
  const server = new FakeServer([]);
  const { user } = await showEmpty(server, ADA);

  await user.type(screen.getByTestId('add-input'), 'Projector');
  await user.keyboard('{Enter}');
  await settle(server);

  expect(listedAs('Projector')).toEqual([
    { id: expect.any(Number), name: 'Projector', status: S.available },
  ]);
});

it('T-009-P3 REQ-009.3 the Add icon adds the item just as Enter does', async () => {
  const server = new FakeServer([]);
  const { user } = await showEmpty(server, ADA);

  await user.type(screen.getByTestId('add-input'), 'Projector');
  await user.click(screen.getByTestId('btn-add'));
  await settle(server);

  expect(listedAs('Projector')).toEqual([
    { id: expect.any(Number), name: 'Projector', status: S.available },
  ]);
});

it('T-009-P6 REQ-009.2 the Add loader shows until the Add is confirmed', async () => {
  const server = new FakeServer([available(1, 'Projector')]).hold('add');
  const { user } = await showList(server, ADA);

  await user.type(screen.getByTestId('add-input'), 'Tripod');
  await user.keyboard('{Enter}');

  expect(screen.getByTestId('add-loader')).toBeInTheDocument();
  expect(listedAs('Tripod')).toHaveLength(0);

  await settle(server);
  expect(screen.queryByTestId('add-loader')).toBeNull();
  expect(listedAs('Tripod')).toEqual([
    { id: expect.any(Number), name: 'Tripod', status: S.available },
  ]);
});

it('T-009-P9 REQ-009.12 a padded name of exactly 100 characters is added, trimmed and with no message', async () => {
  const hundred = nameOfLength(100);
  const server = new FakeServer([]);
  const { user } = await showEmpty(server, ADA);

  await user.type(screen.getByTestId('add-input'), `  ${hundred}  `);
  await user.keyboard('{Enter}');
  await settle(server);

  expect(listedAs(hundred)).toEqual([
    { id: expect.any(Number), name: hundred, status: S.available },
  ]);
  expect(screen.queryByTestId('add-validation')).toBeNull();
});

it('T-009-P10 REQ-009.9 a second item of the same name is added as well', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);

  await user.type(screen.getByTestId('add-input'), 'Projector');
  await user.keyboard('{Enter}');
  await settle(server);

  const both = listedAs('Projector');
  expect(both).toHaveLength(2);
  expect(both[1].status).toBe(S.available);
});

it('T-009-P11 REQ-009.15 an over-long name reads the pinned over-length message, by Enter and by the icon', async () => {
  const tooLong = nameOfLength(101);

  for (const activate of ['Enter', 'the Add icon']) {
    const server = new FakeServer([available(1, 'Projector')]);
    const { user, unmount } = await showList(server, ADA);
    await user.type(screen.getByTestId('add-input'), tooLong);
    if (activate === 'Enter') await user.keyboard('{Enter}');
    else await user.click(screen.getByTestId('btn-add'));

    expect(textOf(await screen.findByTestId('add-validation')), activate).toBe(S.nameTooLong);
    unmount();
  }
});

it('T-009-P12 REQ-009.13 the Add loader takes the place of the Add icon while an Add runs', async () => {
  const server = new FakeServer([available(1, 'Projector')]).hold('add');
  const { user } = await showList(server, ADA);

  await user.type(screen.getByTestId('add-input'), 'Tripod');
  await user.keyboard('{Enter}');

  const card = screen.getByTestId('add-card');
  expect(screen.getByTestId('add-loader')).toBeInTheDocument();
  expect(card.contains(screen.getByTestId('add-loader'))).toBe(true);
  expect(screen.queryByTestId('btn-add')).toBeNull();

  await settle(server);
  expect(screen.queryByTestId('add-loader')).toBeNull();
});

it('T-009-N1 REQ-009.4 REQ-009.8 Enter with an empty field shows the required message and adds nothing', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  // Found first: the Add card and the Add field exist, and a server that would accept
  // any Add is waiting, so "nothing was created" is not "nothing could be created".
  expect(screen.getByTestId('add-card')).toBeInTheDocument();
  expect(screen.getByTestId('add-input')).toBeInTheDocument();
  const dataBefore = server.data();
  const rowsBefore = rowsShown();
  server.hold();

  await user.click(screen.getByTestId('add-input'));
  await user.keyboard('{Enter}');

  expectPlacementInDocument(S.nameRequired);

  server.release();
  await settle(server);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});

it('T-009-N2 REQ-009.5 REQ-009.8 the Add icon with an empty field shows the required message and adds nothing', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  expect(screen.getByTestId('add-card')).toBeInTheDocument();
  expect(screen.getByTestId('add-input')).toBeInTheDocument();
  const dataBefore = server.data();
  const rowsBefore = rowsShown();

  await user.click(screen.getByTestId('btn-add'));

  expectPlacementInDocument(S.nameRequired);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});

it('T-009-N3 REQ-009.6 a name of whitespace only is not a name', async () => {
  for (const [typed, activate] of [
    ['   ', 'Enter'],
    ['\t', 'the Add icon'],
  ]) {
    const server = new FakeServer([available(1, 'Projector')]);
    const { user, unmount } = await showList(server, ADA);
    const dataBefore = server.data();
    const rowsBefore = rowsShown();

    const field = screen.getByTestId('add-input');
    // A tab cannot be typed into a field by a person's keyboard without leaving it, so
    // the value is set on the field itself. The instrument differs; what the row
    // observes, the outcome of a whitespace-only name, does not.
    fireEvent.change(field, { target: { value: typed } });
    if (activate === 'Enter') {
      await user.click(field);
      await user.keyboard('{Enter}');
    } else {
      await user.click(screen.getByTestId('btn-add'));
    }

    expect(textOf(await screen.findByTestId('add-validation')), activate).toBe(S.nameRequired);
    expect(rowsShown(), activate).toEqual(rowsBefore);
    expect(server.data(), activate).toEqual(dataBefore);
    unmount();
  }
});

it('T-009-N4 REQ-009.7 a member never sees the Add, though the admin does', async () => {
  for (const items of [[available(1, 'Projector')], []]) {
    const server = new FakeServer(items);
    const { user, unmount } =
      items.length === 0 ? await showEmpty(server, ADA) : await showList(server, ADA);
    // Found first, for the user who has the feature.
    expect(screen.getByTestId('add-card')).toBeInTheDocument();
    expect(screen.getByTestId('add-input')).toBeInTheDocument();

    for (const member of [MIA, SAM]) {
      await pick(user, member);
      await waitFor(() => {
        const shown = screen.queryByTestId('equipment-list') ?? screen.queryByTestId('empty-state');
        expect(shown).not.toBeNull();
      });
      expect(screen.queryByTestId('add-input'), member.name).toBeNull();
      expect(screen.queryByTestId('btn-add'), member.name).toBeNull();
      expect(screen.queryByTestId('add-card'), member.name).toBeNull();
    }
    unmount();
  }
});

it('T-009-N8 REQ-009.11 an Add the server will not take for its name shows the inline message, not the failure modal', async () => {
  const server = new FakeServer([available(1, 'Projector')]).answer('add', REJECT_NAME);
  const { user } = await showList(server, ADA);
  const rowsBefore = rowsShown();

  await user.type(screen.getByTestId('add-input'), 'Tripod');
  await user.keyboard('{Enter}');
  await waitFor(() => {
    expect(screen.getByTestId('add-validation')).toBeInTheDocument();
  });

  expectPlacementInDocument();
  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(screen.queryByTestId('add-loader')).toBeNull();
  expect(rowsShown()).toEqual(rowsBefore);

  // The anchor: the same Add, rejected as a server error, does open the failure modal,
  // so the absence above is the inline message's doing and not a page that shows no
  // modal at all.
  server.answer('add', REJECT_ERROR);
  await user.click(screen.getByTestId('btn-add'));
  expect(await screen.findByTestId('modal-api-failure')).toBeInTheDocument();
});

it('T-009-N11 REQ-009.11 an over-long name is never sent, and a name of 100 is', async () => {
  const tooLong = nameOfLength(101);
  const hundred = nameOfLength(100);
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  const dataBefore = server.data();
  const rowsBefore = rowsShown();
  const field = screen.getByTestId('add-input');

  for (const activate of ['Enter', 'the Add icon']) {
    fireEvent.change(field, { target: { value: tooLong } });
    server.hold();
    if (activate === 'Enter') {
      await user.click(field);
      await user.keyboard('{Enter}');
    } else {
      await user.click(screen.getByTestId('btn-add'));
    }
    expectPlacementInDocument(S.nameTooLong);
    expect(screen.queryByTestId('modal-api-failure'), activate).toBeNull();
    server.release();
    await settle(server);
    expect(rowsShown(), activate).toEqual(rowsBefore);
    expect(server.data(), activate).toEqual(dataBefore);
  }

  // The anchor: the same field holding 100 characters is added.
  fireEvent.change(field, { target: { value: hundred } });
  await user.click(screen.getByTestId('btn-add'));
  await settle(server);
  expect(listedAs(hundred)).toEqual([
    { id: expect.any(Number), name: hundred, status: S.available },
  ]);
});

it('T-009-N13 REQ-009.14 an Add already running swallows every further activation', async () => {
  const server = new FakeServer([available(1, 'Projector')]).hold('add');
  const { user } = await showList(server, ADA);
  const field = screen.getByTestId('add-input');

  await user.type(field, 'Tripod');
  await user.keyboard('{Enter}');
  // Found first: the Add is running, so what follows is ignored rather than impossible.
  expect(screen.getByTestId('add-loader')).toBeInTheDocument();

  await user.click(field);
  await user.keyboard('{Enter}');
  await user.clear(field);
  await user.keyboard('{Enter}');

  expect(screen.queryByTestId('add-validation')).toBeNull();
  expect(anyModal()).toBeNull();

  await settle(server);
  expect(listedAs('Tripod')).toHaveLength(1);
  expect(rowsShown()).toHaveLength(2);
});
