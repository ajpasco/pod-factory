"""Fixtures for the D rows: the data store written to directly.

Frozen at the S1 freeze; read-only to every builder.

Nothing outside the standard library is imported at module level. ``app.db`` is
imported inside the fixture, as its first statement, and SQLAlchemy after it.
That placement is required, not stylistic: on the baseline the application is
absent and its dependencies are not installed, and the freeze expects this tree
to report one case per row, each erroring at setup. A module-level import of
either would instead raise a collection error and the rows would disappear from
the report.
"""

import os

import pytest


class StoreRefused(Exception):
    """The data store declined to hold a row it cannot meaningfully mean."""


class EquipmentStore:
    """Direct writes to the equipment table, bypassing the application's rules."""

    Refused = StoreRefused

    def __init__(self, connection, text, integrity_error):
        self._connection = connection
        self._text = text
        self._integrity_error = integrity_error

    def write(self, *, name: str, status: str, borrower_id: int | None) -> None:
        statement = self._text(
            "INSERT INTO equipment (name, status, borrower_id)"
            " VALUES (:name, :status, :borrower_id)"
        )
        values = {"name": name, "status": status, "borrower_id": borrower_id}
        transaction = self._connection.begin_nested()
        try:
            self._connection.execute(statement, values)
        except self._integrity_error as refusal:
            # Only a breach of the store's own integrity rules counts as a
            # refusal. A connection failure, a type error or any other fault is
            # re-raised as itself: if every exception became a StoreRefused, a
            # store with no loan-consistency rule at all could pass a row by
            # failing for some unrelated reason.
            transaction.rollback()
            raise StoreRefused(str(refusal)) from refusal
        transaction.commit()

    def count(self) -> int:
        return self._connection.execute(self._text("SELECT count(*) FROM equipment")).scalar_one()


@pytest.fixture()
def equipment_store():
    import app.db as app_db                   # first statement, by the freeze's rule
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    url = os.environ["TEST_DATABASE_URL"]
    engine = app_db.make_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS equipment"))
            connection.execute(text("DROP TABLE IF EXISTS users"))
        app_db.initialise(engine)
        with engine.connect() as connection:
            yield EquipmentStore(connection, text, IntegrityError)
    finally:
        engine.dispose()
