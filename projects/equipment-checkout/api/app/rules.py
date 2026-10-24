"""The rules of the Shared Equipment Checkout trial: types, typed errors, decisions.

Blueprint section 12.5 is the authority for every name below; section 5.1 for
the identity pattern, 5.3 for the order of checks and section 8 for the lock the
operations take.

Two halves, and the line between them matters.

**The decisions** (``parse_user_id`` to ``check_restore``) are pure: they take
values and return None or raise. They read no database, open no connection and
import nothing outside the standard library, which is why the unit tree runs
with no database setting in its environment at all (eval plan C3) and why
importing this module pulls in neither SQLAlchemy nor a driver.

**The operations** (``resolve_actor`` to ``delete_equipment``) do use the store.
They import ``app.db`` inside their own bodies rather than at module level. That
is not style: ``app.db`` is the layer below, and a module-level import here
would make every importer of the decisions -- the unit tree included -- import
SQLAlchemy as well. The deferred import keeps the pure half pure while leaving
the operations at the names section 12.5 pins for them.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:  # pragma: no cover - typing only; never imported at runtime
    from sqlalchemy.orm import Session

#: REQ-009.10, REQ-009.12, D-06. Blueprint section 6 fixes the limit as this
#: constant and not a setting. Counted in Unicode code points (DD-21), which is
#: what ``len`` of a ``str`` counts.
NAME_MAX_LENGTH = 100

#: Blueprint section 5.1: one to nine ASCII digits, no sign, no leading zero, no
#: space, no other character, not empty. Applied with ``re.fullmatch`` to the raw
#: value with no trimming, so a trailing line break does not pass.
USER_ID_PATTERN = re.compile(r"^[1-9][0-9]{0,8}$")

Role = Literal["admin", "member"]
Status = Literal["available", "on_loan", "out_of_service"]

ADMIN: Role = "admin"
AVAILABLE: Status = "available"
ON_LOAN: Status = "on_loan"
OUT_OF_SERVICE: Status = "out_of_service"


@dataclass(frozen=True)
class Actor:
    """A user acting on the system: the identity the request carried, resolved."""

    id: int
    name: str
    role: Role


@dataclass(frozen=True)
class Item:
    """An equipment item as the API shows it.

    ``borrower_id`` and ``borrower_name`` are set when ``status`` is ``on_loan``
    and are None otherwise -- the biconditional the store itself enforces
    (REQ-008.1, blueprint section 7).
    """

    id: int
    name: str
    status: Status
    borrower_id: int | None
    borrower_name: str | None


class RuleError(Exception):
    """A refusal the rules can state. Routes map each subclass to one status."""


class IdentityError(RuleError):
    """No usable acting identity: missing, malformed, or not a seeded user (403)."""


class Forbidden(RuleError):
    """A valid identity that may not do this (403)."""


class NotFound(RuleError):
    """No such item (404)."""


class Conflict(RuleError):
    """The item is not in a state this action can be taken from (409)."""


class Invalid(RuleError):
    """The request is malformed or names something it may not (422)."""


# --------------------------------------------------------------------------- #
# The decisions: pure, no database, mechanism U
# --------------------------------------------------------------------------- #


def parse_user_id(raw_values: Sequence[str]) -> int:
    """The acting user's id from the raw ``X-User-Id`` header values (REQ-001.7).

    ``IdentityError`` when the header is missing (no values), carried more than
    once (more than one value), or its one value does not fully match
    ``USER_ID_PATTERN``. The value is never trimmed: a surrounding space makes it
    malformed, which is observable in process even where the wire cannot deliver
    it (blueprint 5.1.1).
    """
    if len(raw_values) != 1:
        raise IdentityError("exactly one X-User-Id value is required")
    raw = raw_values[0]
    if not isinstance(raw, str) or USER_ID_PATTERN.fullmatch(raw) is None:
        raise IdentityError("X-User-Id is not a user number")
    return int(raw)


def normalise_name(raw: object) -> str:
    """An equipment name, trimmed (REQ-009.6, REQ-009.10, REQ-009.12).

    ``Invalid`` when ``raw`` is not a ``str`` -- None, a number, anything that is
    not text -- or when the trimmed name is empty or longer than
    ``NAME_MAX_LENGTH`` code points. Whitespace around a name is not part of it,
    so it neither makes a name nor counts towards the limit.
    """
    if not isinstance(raw, str):
        raise Invalid("Name must be text.")
    name = raw.strip()
    if not name:
        raise Invalid("Name is required.")
    if len(name) > NAME_MAX_LENGTH:
        raise Invalid(f"Name must be {NAME_MAX_LENGTH} characters or fewer.")
    return name


def require_admin(actor: Actor) -> None:
    """The admin-only gate (REQ-007.1 to REQ-007.5).

    ``Forbidden`` unless the actor is an admin. It takes no operation, so delete,
    add, mark out of service and restore are one decision here; the four are told
    apart by the route rows of S2.
    """
    if actor.role != ADMIN:
        raise Forbidden("this action is for an admin")


def resolve_borrower(
    actor: Actor,
    named_borrower_id: int | None,
    find_user: Callable[[int], Actor | None],
) -> Actor:
    """Who the borrower of a Borrow is (REQ-003 to REQ-005).

    A member borrows for themselves. Naming anybody else is ``Forbidden``, and
    that is decided before the named user is looked up (the order of blueprint
    5.3), so an id naming nobody is refused exactly as another member's id is:
    a member cannot learn from the answer whether a user exists.

    An admin borrows on behalf of a named member, and the three ways that can
    fail are all bad requests, not refusals: naming nobody (REQ-004.11), naming
    an id that is no user (REQ-004.12), and naming an admin, their own id
    included (REQ-005.3, REQ-005.4). The admin is allowed to borrow on behalf of
    a member, just never for themselves.
    """
    if actor.role != ADMIN:
        if named_borrower_id is not None and named_borrower_id != actor.id:
            raise Forbidden("a member may borrow only for themselves")
        return actor

    if named_borrower_id is None:
        raise Invalid("borrowerId is required when an admin borrows")
    borrower = find_user(named_borrower_id)
    if borrower is None:
        raise Invalid("borrowerId names no user")
    if borrower.role == ADMIN:
        raise Invalid("the borrower must be a member")
    return borrower


def check_borrowable(item: Item) -> None:
    """Only an available item can be borrowed (REQ-008.2, .3, .6, .7).

    ``Conflict`` for on loan and for out of service alike. Who is asking does not
    come into it, which is why no actor is taken: this is a wrong-state refusal,
    never a permission one.
    """
    if item.status != AVAILABLE:
        raise Conflict("the item is not available")


def check_return(actor: Actor, item: Item) -> None:
    """Who may return a loan (REQ-006, REQ-007.5).

    The state is judged first: an item that is not on loan cannot be returned by
    anybody, ``Conflict``. Then ownership: a member may return only their own
    loan, ``Forbidden`` otherwise. An admin may return any loan.
    """
    if item.status != ON_LOAN:
        raise Conflict("the item is not on loan")
    if actor.role != ADMIN and actor.id != item.borrower_id:
        raise Forbidden("a member may return only their own loan")


def check_delete(item: Item) -> None:
    """An item on loan cannot be deleted (REQ-011.8, D-11).

    Wrong state, not permission: the admin may delete, but not while somebody has
    it. Available and out of service are both deletable.
    """
    if item.status == ON_LOAN:
        raise Conflict("the item is on loan")


def check_mark_out_of_service(item: Item) -> None:
    """Only an available item goes out of service (REQ-010). ``Conflict`` otherwise."""
    if item.status != AVAILABLE:
        raise Conflict("the item is not available")


def check_restore(item: Item) -> None:
    """Only an out-of-service item is restored (REQ-010). ``Conflict`` otherwise."""
    if item.status != OUT_OF_SERVICE:
        raise Conflict("the item is not out of service")


# --------------------------------------------------------------------------- #
# The operations: one transaction each, the lock of blueprint section 8,
# mechanisms D and I. ``app.db`` is imported inside each body; see the module
# docstring for why.
# --------------------------------------------------------------------------- #


def _actor_of(row: object) -> Actor:
    """An ``Actor`` from a ``users`` row."""
    return Actor(id=row.id, name=row.name, role=row.role)  # type: ignore[attr-defined]


def _item_of(row: object) -> Item:
    """An ``Item`` from an ``equipment`` row that carries its borrower's name."""
    return Item(  # type: ignore[attr-defined]
        id=row.id,
        name=row.name,
        status=row.status,
        borrower_id=row.borrower_id,
        borrower_name=row.borrower_name,
    )


def resolve_actor(session: Session, raw_values: Sequence[str]) -> Actor:
    """The acting identity, read from the store on every request (blueprint 5.1).

    ``parse_user_id`` first, then the ``users`` row. A well-formed id that is no
    seeded user is an ``IdentityError`` like a malformed one: all three failures
    answer alike, and the role is never taken from the client.
    """
    from app import db

    user_id = parse_user_id(raw_values)
    row = db.read_user(session, user_id)
    if row is None:
        raise IdentityError("X-User-Id names no user")
    return _actor_of(row)


def list_users(session: Session) -> list[Actor]:
    """Every user, by id ascending."""
    from app import db

    return [_actor_of(row) for row in db.read_users(session)]


def list_equipment(session: Session) -> list[Item]:
    """Every item, by id ascending (DD-18)."""
    from app import db

    return [_item_of(row) for row in db.read_items(session)]


def add_equipment(session: Session, actor: Actor, raw_name: object) -> Item:
    """Add an available item (REQ-009). Admin only; the name is trimmed first."""
    from app import db

    try:
        require_admin(actor)
        name = normalise_name(raw_name)
        item_id = db.insert_item(session, name)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return Item(
        id=item_id, name=name, status=AVAILABLE, borrower_id=None, borrower_name=None
    )


def _locked(session: Session, item_id: int) -> Item:
    """The item, locked for this transaction. ``NotFound`` if it is gone."""
    from app import db

    row = db.lock_item(session, item_id)
    if row is None:
        raise NotFound("no such item")
    return Item(
        id=row.id,
        name=row.name,
        status=row.status,
        borrower_id=row.borrower_id,
        borrower_name=db.borrower_name_of(session, row.borrower_id),
    )


def borrow(
    session: Session, actor: Actor, item_id: int, named_borrower_id: int | None
) -> Item:
    """Borrow an item (REQ-003 to REQ-005, REQ-008).

    The borrower is resolved before the item is touched (blueprint 5.3: role and
    the member's ``borrowerId`` rule, then validation, then the item, then its
    state under the lock).
    """
    from app import db

    try:
        borrower = resolve_borrower(
            actor, named_borrower_id, lambda user_id: _find_user(session, user_id)
        )
        item = _locked(session, item_id)
        check_borrowable(item)
        db.write_loan_state(session, item.id, ON_LOAN, borrower.id)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return Item(
        id=item.id,
        name=item.name,
        status=ON_LOAN,
        borrower_id=borrower.id,
        borrower_name=borrower.name,
    )


def _find_user(session: Session, user_id: int) -> Actor | None:
    from app import db

    row = db.read_user(session, user_id)
    return None if row is None else _actor_of(row)


def return_item(session: Session, actor: Actor, item_id: int) -> Item:
    """Return a loaned item (REQ-006): available again, with no borrower."""
    from app import db

    try:
        item = _locked(session, item_id)
        check_return(actor, item)
        db.write_loan_state(session, item.id, AVAILABLE, None)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return Item(
        id=item.id,
        name=item.name,
        status=AVAILABLE,
        borrower_id=None,
        borrower_name=None,
    )


def mark_out_of_service(session: Session, actor: Actor, item_id: int) -> Item:
    """Take an available item out of service (REQ-010). Admin only."""
    from app import db

    try:
        require_admin(actor)
        item = _locked(session, item_id)
        check_mark_out_of_service(item)
        db.write_loan_state(session, item.id, OUT_OF_SERVICE, None)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return Item(
        id=item.id,
        name=item.name,
        status=OUT_OF_SERVICE,
        borrower_id=None,
        borrower_name=None,
    )


def restore_item(session: Session, actor: Actor, item_id: int) -> Item:
    """Restore an out-of-service item to available (REQ-010). Admin only."""
    from app import db

    try:
        require_admin(actor)
        item = _locked(session, item_id)
        check_restore(item)
        db.write_loan_state(session, item.id, AVAILABLE, None)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return Item(
        id=item.id,
        name=item.name,
        status=AVAILABLE,
        borrower_id=None,
        borrower_name=None,
    )


def delete_equipment(session: Session, actor: Actor, item_id: int) -> Item:
    """Delete an item (REQ-011). Admin only; never while it is on loan.

    Returns the item as it was just before it was removed. Its id is never
    reused.
    """
    from app import db

    try:
        require_admin(actor)
        item = _locked(session, item_id)
        check_delete(item)
        db.remove_item(session, item.id)
        session.commit()
    except RuleError:
        session.rollback()
        raise
    return item
