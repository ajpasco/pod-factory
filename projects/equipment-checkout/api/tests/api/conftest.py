"""Fixtures for the I rows: the HTTP API driven against a real PostgreSQL 16.

Frozen at the S2 freeze; read-only to every builder, S2's own included.

Nothing outside the standard library is imported at module level. ``app.main``
is imported inside the fixture, as its first statement, and the test client,
``app.db`` and SQLAlchemy after it. That placement is required, not stylistic,
and it is the same rule ``api/tests/db/conftest.py`` states for its own tree:
on the baseline the application is absent, and the freeze expects this tree to
report one case per row, each erroring at setup. A module-level import of the
application would instead raise a collection error, the fifty-five rows would
disappear from ``integration.xml`` altogether, and the report could no longer
be read row by row -- nor tell this mechanism's failure apart from the unit
tree's, which fails at collection by design.

What this file holds, and nothing else (eval plan 7.4): a fixture that sets
``DATABASE_URL`` from ``TEST_DATABASE_URL`` and drops the tables; a way to
enter ``with TestClient(app)``, once or repeatedly on the same database, for
the rows that stop and start the application; the seeded ids 1 to 3; the
barrier that releases two requests together; the direct call into the
application that delivers the identity values no HTTP parser would deliver
(blueprint 5.1.1); and the dump reader, which discovers every table and column
from the database's own catalogue. **It captures and reads no log**: the access
log is operational and is not a record (blueprint 5.4, D-23), and no row here
may read it.

**How an I row knows whether an action was carried out.** Eval plan 1.1 forbids
every row here to assert a status code or to recognise an outcome by one. Two
instruments are used instead, and neither is a code:

1. *The read-back.* The equipment list, read again after the action: every
   item's id, name, status and borrower. This is what "it was carried out" and
   "nothing changed" are actually asserted against, in every row.
2. *Whether the answer delivered the item.* The contract (blueprint 12.2) has
   every carried-out action answer with the item it acted on. ``Answer`` reports
   that as ``carried_out``: it looks only at whether the payload is an item,
   never at a code, and it accepts an item carrying further fields so that no
   row here freezes the shape of a JSON body. This instrument exists for one
   reason the read-back cannot cover: when two requests meet on one item, the
   final state often cannot say *which* of the two was the one carried out --
   two marks out of service leave the same item either way. Every row that uses
   it also reads the list back, so no row rests on the answer alone.
"""

import asyncio
import os
import threading
import warnings
from contextlib import contextmanager

import pytest

#: The seeded users of blueprint 12.2, fixed (DD-03). Written here as literals,
#: never read from the application: a build that seeds the wrong people must
#: fail the rows that name them, not agree with itself.
ADA, MIA, SAM = 1, 2, 3
SEEDED_USERS = (
    (ADA, "Ada Admin", "admin"),
    (MIA, "Mia Member", "member"),
    (SAM, "Sam Member", "member"),
)

#: An id in range (blueprint 12.3) that no item ever has, because ids are never
#: reused and no row creates nearly so many items.
MISSING_ITEM_ID = 999999

#: The fields the contract gives an item (blueprint 12.2). Used only to
#: recognise that an answer delivered the item, never asserted as a shape.
_ITEM_FIELDS = ("id", "name", "status", "borrowerId", "borrowerName")

#: Sentinel: this request carries no body at all, as against a body that is an
#: empty object. The two are different requests and some rows send both.
NO_BODY = object()

_OMIT = object()

#: Long enough that a build which deadlocks instead of serialising two requests
#: fails the round rather than hanging the suite for ever. It is not a wait for
#: anything to happen: the two requests are released by the barrier itself, and
#: no row sleeps.
_BARRIER_TIMEOUT_SECONDS = 60.0


class Answer:
    """What the application answered, read without looking at any status code.

    Eval plan 1.1: an I row never recognises an outcome by a code. So this
    object is given the body only, and offers two readings of it -- whether
    anything came back at all, and whether what came back is the item the
    action was asked for.
    """

    def __init__(self, body: bytes) -> None:
        self._body = body

    @property
    def answered_nothing(self) -> bool:
        """Nothing was returned to the caller: the answer carries no content."""
        return self._body == b""

    @property
    def payload(self):
        """The answer read as JSON, or None when it is not JSON."""
        import json

        if not self._body:
            return None
        try:
            return json.loads(self._body)
        except ValueError:
            return None

    @property
    def carried_out(self) -> bool:
        """The application answered with the item, so it carried the action out.

        A superset test, not an equality: a build that adds a field to the item
        would be answering a question no row here asks, and freezing the field
        list would make every row fail for the wrong reason.
        """
        payload = self.payload
        return isinstance(payload, dict) and all(field in payload for field in _ITEM_FIELDS)

    @property
    def item(self) -> dict | None:
        """The item the answer delivered, or None when it delivered none."""
        return self.payload if self.carried_out else None

    @property
    def entries(self) -> list | None:
        """The list the answer delivered, or None when it delivered none."""
        payload = self.payload
        return payload if isinstance(payload, list) else None


class Record:
    """One row of one table of the dump, as its values and nothing else.

    A row asserts about the values in the dump, never about the names of the
    tables or the columns they came from (eval plan 1.1), so a record carries
    no name at all. Position is kept, because "equal except for the item id"
    is a statement about which values differ.
    """

    def __init__(self, values: tuple) -> None:
        self.values = values

    def differences(self, other: "Record") -> list[tuple]:
        """The pairs of values at the positions where the two records differ."""
        if len(self.values) != len(other.values):
            return [(self.values, other.values)]
        return [
            (mine, theirs)
            for mine, theirs in zip(self.values, other.values)
            if mine != theirs
        ]


class Dump:
    """Everything the application's database holds, read without naming a table.

    Built by asking the catalogue which ordinary tables exist and then reading
    every row of each. A row that asserts about what is kept reads values from
    here; nothing here tells a row what anything is called.
    """

    def __init__(self, records: tuple[Record, ...]) -> None:
        self.records = records

    @property
    def values(self) -> list:
        """Every value the database holds, flattened, with no name attached."""
        return [value for record in self.records for value in record.values]

    def occurrences_of(self, value) -> int:
        """How many values in the whole dump are equal to this one."""
        return sum(1 for held in self.values if held == value)

    def records_holding(self, value) -> list[Record]:
        """Every record one of whose values is this one."""
        return [record for record in self.records if value in record.values]

    def as_compared(self) -> list:
        """A form two dumps can be compared by, independent of row order.

        Row order is not guaranteed by anything, and a row that says the dump
        is unchanged means the values, not their order on disk.
        """
        return sorted((repr(record.values) for record in self.records))


class Api:
    """The HTTP API, driven as one of the seeded users.

    Every method answers with an ``Answer``. The read-back is ``listing``, and
    the setup helpers (``available``, ``on_loan``, ``out_of_service``) bring the
    store to a starting state through the API itself, as an admin, so that no
    row depends on a direct write.
    """

    ADA, MIA, SAM = ADA, MIA, SAM
    SEEDED_USERS = SEEDED_USERS
    MISSING_ITEM_ID = MISSING_ITEM_ID
    NO_BODY = NO_BODY

    def __init__(self, client, asgi_app, engine, text) -> None:
        self._client = client
        self._app = asgi_app
        self._engine = engine
        self._text = text

    # ----------------------------------------------------------------- #
    # Requests
    # ----------------------------------------------------------------- #

    def send(self, method: str, path: str, *, identity, body=NO_BODY) -> Answer:
        """One request. ``identity`` is an id, a raw header value, or None for none."""
        headers = {} if identity is None else {"X-User-Id": str(identity)}
        if body is NO_BODY:
            response = self._client.request(method, path, headers=headers)
        else:
            response = self._client.request(method, path, headers=headers, json=body)
        return Answer(response.content)

    def users(self, identity) -> Answer:
        return self.send("GET", "/api/users", identity=identity)

    def equipment(self, identity) -> Answer:
        return self.send("GET", "/api/equipment", identity=identity)

    def add(self, identity, name) -> Answer:
        return self.send("POST", "/api/equipment", identity=identity, body={"name": name})

    def add_body(self, identity, body) -> Answer:
        """An Add whose body is given verbatim, for the shapes ``add`` cannot send."""
        return self.send("POST", "/api/equipment", identity=identity, body=body)

    def borrow(self, identity, item_id, borrower=_OMIT, body=_OMIT) -> Answer:
        """A Borrow. With no ``borrower`` and no ``body`` it carries no body at all."""
        if body is _OMIT:
            body = NO_BODY if borrower is _OMIT else {"borrowerId": borrower}
        return self.send(
            "POST", f"/api/equipment/{item_id}/borrow", identity=identity, body=body
        )

    def return_item(self, identity, item_id) -> Answer:
        return self.send("POST", f"/api/equipment/{item_id}/return", identity=identity)

    def mark_out_of_service(self, identity, item_id) -> Answer:
        return self.send(
            "POST", f"/api/equipment/{item_id}/out-of-service", identity=identity
        )

    def restore(self, identity, item_id) -> Answer:
        return self.send("POST", f"/api/equipment/{item_id}/restore", identity=identity)

    def delete(self, identity, item_id) -> Answer:
        return self.send("DELETE", f"/api/equipment/{item_id}", identity=identity)

    # ----------------------------------------------------------------- #
    # The operations as data, for the rows that sweep all of them
    # ----------------------------------------------------------------- #

    def every_operation(self, item_id: int) -> list[tuple[str, str, object]]:
        """Every operation the API offers, as (method, path, body).

        The eight of blueprint 12.3, in its order: the two listings and the six
        actions. A row that refuses an identity sends all of them.
        """
        return [
            ("GET", "/api/users", NO_BODY),
            ("GET", "/api/equipment", NO_BODY),
            ("POST", "/api/equipment", {"name": "Swept probe"}),
            ("POST", f"/api/equipment/{item_id}/borrow", {"borrowerId": MIA}),
            ("POST", f"/api/equipment/{item_id}/return", NO_BODY),
            ("POST", f"/api/equipment/{item_id}/out-of-service", NO_BODY),
            ("POST", f"/api/equipment/{item_id}/restore", NO_BODY),
            ("DELETE", f"/api/equipment/{item_id}", NO_BODY),
        ]

    #: A path the application does not define (blueprint 12.3: the eight routes
    #: are the only ones).
    UNDEFINED_PATH = "/api/equipment/nowhere-the-api-defines"

    # ----------------------------------------------------------------- #
    # The direct call into the application (blueprint 5.1.1)
    # ----------------------------------------------------------------- #

    def direct(self, method: str, path: str, identity_values, body: bytes = b"") -> Answer:
        """One request made straight into the application, past every parser.

        ``identity_values`` is the list of raw ``X-User-Id`` values to put in the
        request, so a row can deliver a padded value or two headers at once.
        Blueprint 5.1.1 says plainly that no HTTP parser delivers those: a
        parser strips the padding before the value is read, and a browser folds
        two headers into one. They are therefore claimed in-process only, which
        is what this helper is, and no row claims them over the wire.
        """
        headers: list[tuple[bytes, bytes]] = [(b"host", b"testserver")]
        for value in identity_values:
            headers.append((b"x-user-id", value.encode("latin-1")))
        if body:
            headers.append((b"content-type", b"application/json"))
            headers.append((b"content-length", str(len(body)).encode()))

        messages: list[dict] = []

        async def drive() -> None:
            scope = {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": method,
                "scheme": "http",
                "path": path,
                "raw_path": path.encode(),
                "query_string": b"",
                "root_path": "",
                "headers": headers,
                "client": ("127.0.0.1", 50000),
                "server": ("testserver", 80),
            }
            delivered = False

            async def receive() -> dict:
                nonlocal delivered
                if delivered:
                    return {"type": "http.disconnect"}
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}

            async def send(message: dict) -> None:
                messages.append(message)

            await self._app(scope, receive, send)

        asyncio.run(drive())
        answered = b"".join(
            message.get("body", b"")
            for message in messages
            if message.get("type") == "http.response.body"
        )
        return Answer(answered)

    # ----------------------------------------------------------------- #
    # Read-back and starting states
    # ----------------------------------------------------------------- #

    def listing(self, identity=ADA) -> list[dict]:
        """The equipment list read back: every item's id, name, status, borrower."""
        answer = self.equipment(identity)
        entries = answer.entries
        assert entries is not None, "the equipment list could not be read back"
        return entries

    def read(self, item_id: int, identity=ADA) -> dict | None:
        """One item as the list shows it, or None when the list has no such item."""
        for entry in self.listing(identity):
            if entry["id"] == item_id:
                return entry
        return None

    def user_list(self, identity=ADA) -> list[dict]:
        """The user list read back."""
        answer = self.users(identity)
        entries = answer.entries
        assert entries is not None, "the user list could not be read back"
        return entries

    def available(self, name: str) -> dict:
        """An Available item, created through the API as the admin."""
        answer = self.add(ADA, name)
        item = answer.item
        assert item is not None, f"the setup Add of {name!r} was not carried out"
        return item

    def on_loan(self, name: str, borrower: int = MIA, *, by: int = ADA) -> dict:
        """An item On loan, lent through the API."""
        item = self.available(name)
        if by == borrower:
            answer = self.borrow(borrower, item["id"])
        else:
            answer = self.borrow(by, item["id"], borrower=borrower)
        lent = answer.item
        assert lent is not None, f"the setup Borrow of {name!r} was not carried out"
        return lent

    def out_of_service(self, name: str) -> dict:
        """An item Out of service, marked through the API as the admin."""
        item = self.available(name)
        answer = self.mark_out_of_service(ADA, item["id"])
        marked = answer.item
        assert marked is not None, f"the setup Mark of {name!r} was not carried out"
        return marked

    # ----------------------------------------------------------------- #
    # The dump
    # ----------------------------------------------------------------- #

    def dump(self) -> Dump:
        """Everything the database holds, discovered from its own catalogue.

        No table and no column is named here: the catalogue is asked which
        ordinary tables exist, and every row of each is read as values. A build
        that keeps something extra in a third table is read by this as surely as
        one that keeps it in a column of the two.
        """
        tables_query = self._text(
            "SELECT n.nspname, c.relname"
            " FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace"
            " WHERE c.relkind = 'r'"
            "   AND n.nspname NOT IN ('pg_catalog', 'information_schema')"
            " ORDER BY n.nspname, c.relname"
        )
        records: list[Record] = []
        with self._engine.connect() as connection:
            for schema, table in connection.execute(tables_query).all():
                rows = connection.execute(
                    self._text(f'SELECT * FROM "{schema}"."{table}"')
                ).all()
                records.extend(Record(tuple(row)) for row in rows)
        return Dump(tuple(records))

    # ----------------------------------------------------------------- #
    # Two requests released together
    # ----------------------------------------------------------------- #

    @staticmethod
    def release_together(first, second):
        """Run two requests in two threads, released at the same moment.

        A ``threading.Barrier`` is what releases them, so neither waits for a
        clock and no row sleeps: each thread is built, reaches the barrier, and
        both leave it together. Whichever then takes the row lock first decides
        the pair, which is exactly what blueprint section 8 guarantees about.
        """
        barrier = threading.Barrier(2, timeout=_BARRIER_TIMEOUT_SECONDS)
        outcomes: dict[int, object] = {}

        def run(slot: int, work) -> None:
            try:
                barrier.wait()
                outcomes[slot] = work()
            except BaseException as failure:  # re-raised in the calling thread
                outcomes[slot] = failure

        threads = [
            threading.Thread(target=run, args=(0, first), daemon=True),
            threading.Thread(target=run, args=(1, second), daemon=True),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        for slot in (0, 1):
            outcome = outcomes.get(slot)
            if isinstance(outcome, BaseException):
                raise outcome
        return outcomes[0], outcomes[1]


class Application:
    """A fresh database, and the application started on it as often as a row needs.

    Most rows want one running application and take the ``api`` fixture. The
    rows that stop and start it (T-016) enter ``running()`` more than once on
    the same database, which is what "the application is stopped and started
    again" means at this mechanism: the tables are not dropped in between.
    """

    def __init__(self, asgi_app, client_class, engine, text) -> None:
        self._app = asgi_app
        self._client_class = client_class
        self._engine = engine
        self._text = text

    @contextmanager
    def running(self):
        """Enter ``with TestClient(app)``, which runs the application's start-up."""
        with self._client_class(self._app) as client:
            yield Api(client, self._app, self._engine, self._text)


def _drop_every_table(engine, text) -> None:
    """Drop every ordinary table the database holds, whatever it is called.

    Discovered from the catalogue rather than named, for the same reason the
    dump is: a build that keeps a third table would otherwise leave it standing
    between rows, and a row would then read a state an earlier row left.
    """
    query = text(
        "SELECT n.nspname, c.relname"
        " FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace"
        " WHERE c.relkind = 'r'"
        "   AND n.nspname NOT IN ('pg_catalog', 'information_schema')"
    )
    with engine.begin() as connection:
        found = connection.execute(query).all()
        for schema, table in found:
            connection.execute(text(f'DROP TABLE IF EXISTS "{schema}"."{table}" CASCADE'))


@pytest.fixture()
def application(monkeypatch):
    """A fresh database and the means to start the application on it.

    ``app.main`` is the first statement, by the freeze's rule: see this file's
    docstring for why the placement is required rather than tidy.
    """
    import app.main                        # first statement, by the freeze's rule
    import app.db as app_db

    # The test client is imported inside a warning filter of its own, and this
    # is not tidiness. The frozen `harness/api/pytest.ini` sets
    # `filterwarnings = error`, and importing the client's module reaches a
    # deprecated alias inside the pinned anyio -- `anyio.abc.BlockingPortal` --
    # which starlette 0.46.2 still names at module level. The warning is raised
    # by the test tools about the test tools while this fixture is setting up,
    # so with `error` in force every row here errors at setup on a build that is
    # perfectly correct, and the suite would say nothing about the application.
    # Both files that could fix it properly are frozen and S1's: the pinned
    # versions in `harness/api/requirements-eval.txt` and the filter list in
    # `harness/api/pytest.ini`. Containing it here is all this file can do, and
    # it is contained as narrowly as it can be: one import, this warning class,
    # nothing else silenced for any row's own code. It is reported as a finding.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        from fastapi.testclient import TestClient
    from sqlalchemy import text

    url = os.environ["TEST_DATABASE_URL"]
    # The application reads its setting at start-up, never at import (blueprint
    # 12.4), so setting it after the import above is sound.
    monkeypatch.setenv("DATABASE_URL", url)

    engine = app_db.make_engine(url)
    try:
        _drop_every_table(engine, text)
        yield Application(app.main.app, TestClient, engine, text)
    finally:
        engine.dispose()


@pytest.fixture()
def api(application):
    """A fresh database with the application running on it: one start, one stop."""
    with application.running() as running_api:
        yield running_api
