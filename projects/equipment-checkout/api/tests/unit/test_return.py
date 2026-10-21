"""REQ-006: returning a loaned item. Frozen at the S1 freeze."""

import pytest

from app.rules import Actor, Forbidden, Item, check_return

ADMIN = Actor(id=1, name="Ada Admin", role="admin")
MIA = Actor(id=2, name="Mia Member", role="member")
SAM = Actor(id=3, name="Sam Member", role="member")

ON_LOAN_TO_MIA = Item(
    id=10, name="Tripod", status="on_loan", borrower_id=MIA.id, borrower_name=MIA.name
)


def test_T_006_P6_the_borrower_and_an_admin_may_both_return() -> None:
    assert check_return(MIA, ON_LOAN_TO_MIA) is None
    assert check_return(ADMIN, ON_LOAN_TO_MIA) is None


def test_T_006_N2_another_member_may_not_return_someone_elses_loan() -> None:
    # First: its borrower and an admin are allowed.
    assert check_return(MIA, ON_LOAN_TO_MIA) is None
    assert check_return(ADMIN, ON_LOAN_TO_MIA) is None

    with pytest.raises(Forbidden):
        check_return(SAM, ON_LOAN_TO_MIA)
