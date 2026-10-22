"""REQ-003, REQ-004 and REQ-005: who the borrower of a loan is.

Frozen at the S1 freeze; read-only to every builder.
"""

from typing import Callable

import pytest

from app.rules import Actor, Forbidden, Invalid, resolve_borrower

ADMIN = Actor(id=1, name="Ada Admin", role="admin")
MIA = Actor(id=2, name="Mia Member", role="member")
SAM = Actor(id=3, name="Sam Member", role="member")

SEEDED = {ADMIN.id: ADMIN, MIA.id: MIA, SAM.id: SAM}


def find_seeded(user_id: int) -> Actor | None:
    return SEEDED.get(user_id)


def finds_nobody(user_id: int) -> Actor | None:
    return None


def test_T_003_P6_a_member_borrowing_is_the_borrower() -> None:
    assert resolve_borrower(MIA, None, find_seeded) == MIA
    assert resolve_borrower(MIA, MIA.id, find_seeded) == MIA


def test_T_003_N3_REQ_003_6_a_member_may_not_name_another_borrower() -> None:
    # First: naming nobody, and naming herself, both give Mia.
    assert resolve_borrower(MIA, None, find_seeded) == MIA
    assert resolve_borrower(MIA, MIA.id, find_seeded) == MIA

    # The other member, the admin, and an id naming nobody are refused the same
    # way: a member's permission is judged before the named user is looked up,
    # so an unknown id cannot be told apart from a known one.
    for named in (SAM.id, ADMIN.id, 999999999):
        with pytest.raises(Forbidden):
            resolve_borrower(MIA, named, find_seeded)


def test_T_004_P6_an_admin_borrows_on_behalf_of_the_named_member() -> None:
    assert resolve_borrower(ADMIN, MIA.id, find_seeded) == MIA
    assert resolve_borrower(ADMIN, SAM.id, find_seeded) == SAM


def test_T_004_N6_REQ_004_11_REQ_004_12_an_admin_must_name_a_member_who_exists() -> None:
    # First: a named member is accepted and returned.
    assert resolve_borrower(ADMIN, MIA.id, find_seeded) == MIA

    # Naming nobody, and naming an id that is no seeded member, are rejected as
    # a bad request, not refused as a permission failure.
    with pytest.raises(Invalid):
        resolve_borrower(ADMIN, None, find_seeded)
    for named in (4, 999999999):
        with pytest.raises(Invalid):
            resolve_borrower(ADMIN, named, finds_nobody)


def test_T_005_N4_REQ_005_3_REQ_005_4_an_admin_is_never_the_borrower() -> None:
    # First: a named member is accepted and returned.
    assert resolve_borrower(ADMIN, MIA.id, find_seeded) == MIA

    # An admin named as the borrower is rejected as a bad request. It is not a
    # permission refusal: the admin is allowed to borrow on behalf of a member,
    # just not for themselves.
    with pytest.raises(Invalid):
        resolve_borrower(ADMIN, ADMIN.id, find_seeded)
