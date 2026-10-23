"""The data store: the two tables of blueprint section 7, the engine and the seed.

Blueprint section 7 is the authority for the tables, their constraints and the
one-active-loan biconditional; section 12.6 for the callables ``make_engine``,
``make_session_factory``, ``create_schema``, ``seed``, ``initialise`` and
``SEED_USERS``. Everything else here is a helper, which section 12.6 leaves to
the builder and no test names.

**The dependency runs one way.** This module imports nothing from ``app.rules``.
The reads below return SQLAlchemy rows and ``app.rules`` turns them into
``Actor`` and ``Item``, so that importing the rules layer pulls in neither
SQLAlchemy nor a driver: the unit tree is a pure-Python tree and stays one.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Identity,
    Integer,
    MetaData,
    Table,
    Text,
    create_engine,
    delete,
    insert,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.engine import Engine, Row
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.schema import CreateTable

#: The three users of blueprint 12.2, with their fixed ids (DD-03).
SEED_USERS: tuple[tuple[int, str, str], ...] = (
    (1, "Ada Admin", "admin"),
    (2, "Mia Member", "member"),
    (3, "Sam Member", "member"),
)

# The name bound is written here as a literal rather than imported from
# ``app.rules``, because importing it would reverse the one-way dependency this
# module's docstring describes. REQ-009.10, REQ-009.12 and D-06 fix the number
# at 100; ``rules.NAME_MAX_LENGTH`` carries the same number for the same reason.
_NAME_LENGTH_CHECK = "char_length(name) BETWEEN 1 AND 100"

metadata = MetaData()

users = Table(
    "users",
    metadata,
    # Not autoincrementing: the seed supplies 1, 2 and 3 (blueprint section 7).
    Column("id", Integer, primary_key=True, autoincrement=False),
    Column("name", Text, nullable=False, unique=True),
    Column("role", Text, nullable=False),
    CheckConstraint("role IN ('admin', 'member')", name="users_role_check"),
)

equipment = Table(
    "equipment",
    metadata,
    # GENERATED ALWAYS AS IDENTITY: ids are never reused (blueprint section 7).
    Column("id", Integer, Identity(always=True), primary_key=True),
    Column("name", Text, nullable=False),
    Column("status", Text, nullable=False),
    Column(
        "borrower_id",
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    ),
    CheckConstraint(_NAME_LENGTH_CHECK, name="equipment_name_length_check"),
    CheckConstraint(
        "status IN ('available', 'on_loan', 'out_of_service')",
        name="equipment_status_check",
    ),
    # REQ-008.1, blueprint section 7. A biconditional, not an implication: on
    # loan if and only if somebody holds it. A constraint that forbade only the
    # borrower-less loan would still let a phantom loan be recorded as a
    # borrower on an available or out-of-service row, which is what T-008-N7
    # writes directly at the store to check.
    CheckConstraint(
        "(status = 'on_loan') = (borrower_id IS NOT NULL)",
        name="equipment_one_active_loan_check",
    ),
)

_borrower = users.alias("borrower")

_ITEM_COLUMNS = (
    equipment.c.id,
    equipment.c.name,
    equipment.c.status,
    equipment.c.borrower_id,
    _borrower.c.name.label("borrower_name"),
)


# --------------------------------------------------------------------------- #
# Engine, session factory, schema and seed (blueprint 12.6)
# --------------------------------------------------------------------------- #


def make_engine(database_url: str) -> Engine:
    """A SQLAlchemy 2 engine for a ``postgresql+psycopg://`` URL.

    No isolation level is set, so a connection runs in the driver's default
    read-committed transaction and ``Connection.begin_nested`` yields a real
    SAVEPOINT. The lock of blueprint section 8 needs both.
    """
    return create_engine(database_url, pool_pre_ping=True)


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    """A session factory bound to ``engine``."""
    return sessionmaker(bind=engine, expire_on_commit=False)


def create_schema(engine: Engine) -> None:
    """Create the two tables of blueprint section 7 if absent.

    Emitted as literal ``CREATE TABLE IF NOT EXISTS``, which is what section 7
    names, rather than as ``MetaData.create_all``: ``create_all`` asks the
    catalogue first and then creates, so two processes starting together can
    both see nothing and the second fails on a duplicate table. The server
    decides instead, and start-up may be run any number of times from any
    number of processes. There is no migration tool.

    ``sorted_tables`` puts ``users`` before ``equipment``, so the foreign key
    has its target when it is declared.
    """
    with engine.begin() as connection:
        for table in metadata.sorted_tables:
            connection.execute(CreateTable(table, if_not_exists=True))


def seed(session: Session) -> None:
    """Insert the three seeded users, idempotently, and commit (REQ-016.3).

    ``ON CONFLICT (id) DO NOTHING``, so any number of runs -- including two at
    once from two processes -- leaves exactly three users. No equipment is
    seeded: the list is empty on first start.
    """
    statement = postgresql_insert(users).values(
        [{"id": id_, "name": name, "role": role} for id_, name, role in SEED_USERS]
    )
    session.execute(statement.on_conflict_do_nothing(index_elements=[users.c.id]))
    session.commit()


def initialise(engine: Engine) -> None:
    """Create the schema, then run the seed in its own session."""
    create_schema(engine)
    factory = make_session_factory(engine)
    with factory() as session:
        seed(session)


# --------------------------------------------------------------------------- #
# Reads and writes. Helpers, named by no section of the blueprint; ``app.rules``
# composes them with its decisions.
# --------------------------------------------------------------------------- #


def read_user(session: Session, user_id: int) -> Row | None:
    """The ``users`` row with that id, or None."""
    statement = select(users.c.id, users.c.name, users.c.role).where(users.c.id == user_id)
    return session.execute(statement).one_or_none()


def read_users(session: Session) -> Sequence[Row]:
    """Every ``users`` row, by id ascending."""
    statement = select(users.c.id, users.c.name, users.c.role).order_by(users.c.id)
    return session.execute(statement).all()


def read_items(session: Session) -> Sequence[Row]:
    """Every ``equipment`` row with its borrower's name, by id ascending (DD-18)."""
    statement = (
        select(*_ITEM_COLUMNS)
        .select_from(
            equipment.outerjoin(_borrower, equipment.c.borrower_id == _borrower.c.id)
        )
        .order_by(equipment.c.id)
    )
    return session.execute(statement).all()


def read_item(session: Session, item_id: int) -> Row | None:
    """One ``equipment`` row with its borrower's name, or None. Takes no lock."""
    statement = (
        select(*_ITEM_COLUMNS)
        .select_from(
            equipment.outerjoin(_borrower, equipment.c.borrower_id == _borrower.c.id)
        )
        .where(equipment.c.id == item_id)
    )
    return session.execute(statement).one_or_none()


def lock_item(session: Session, item_id: int) -> Row | None:
    """The ``equipment`` row with that id, locked with ``SELECT ... FOR UPDATE``.

    Blueprint section 8: every operation on an existing item decides on a row it
    has locked, so two operations on one item are serialised and the second sees
    what the first left. One row is locked per operation, so no deadlock between
    operations is possible. The borrower's name is read afterwards with
    ``borrower_name_of``: joining it here would widen the lock to ``users``.
    """
    statement = (
        select(
            equipment.c.id,
            equipment.c.name,
            equipment.c.status,
            equipment.c.borrower_id,
        )
        .where(equipment.c.id == item_id)
        .with_for_update()
    )
    return session.execute(statement).one_or_none()


def borrower_name_of(session: Session, borrower_id: int | None) -> str | None:
    """The name of the user holding an item, or None when nobody holds it."""
    if borrower_id is None:
        return None
    statement = select(users.c.name).where(users.c.id == borrower_id)
    return session.execute(statement).scalar_one_or_none()


def insert_item(session: Session, name: str) -> int:
    """Insert an available item with no borrower and return its generated id."""
    statement = (
        insert(equipment)
        .values(name=name, status="available", borrower_id=None)
        .returning(equipment.c.id)
    )
    return session.execute(statement).scalar_one()


def write_loan_state(
    session: Session, item_id: int, status: str, borrower_id: int | None
) -> None:
    """Set an item's status and borrower together.

    The two columns are written in one statement because the table check of
    blueprint section 7 constrains them jointly: writing either alone would
    breach it.
    """
    statement = (
        update(equipment)
        .where(equipment.c.id == item_id)
        .values(status=status, borrower_id=borrower_id)
    )
    session.execute(statement)


def remove_item(session: Session, item_id: int) -> None:
    """Delete an item. Its id is never reused (``GENERATED ALWAYS AS IDENTITY``)."""
    session.execute(delete(equipment).where(equipment.c.id == item_id))
