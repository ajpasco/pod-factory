"""REQ-008: only an available item can be borrowed. Frozen at the S1 freeze."""

import pytest

from app.rules import Conflict, Item, check_borrowable

AVAILABLE = Item(id=10, name="Tripod", status="available", borrower_id=None, borrower_name=None)
ON_LOAN = Item(id=11, name="Camera", status="on_loan", borrower_id=2, borrower_name="Mia Member")
OUT_OF_SERVICE = Item(
    id=12, name="Lens", status="out_of_service", borrower_id=None, borrower_name=None
)


def test_T_008_N4_REQ_008_2_REQ_008_3_REQ_008_6_REQ_008_7_an_on_loan_or_out_of_service_item_cannot_be_borrowed() -> None:
    # First: an available item can be borrowed.
    assert check_borrowable(AVAILABLE) is None

    # Both refusals are wrong-state, not permission: who is asking does not
    # come into it, which is why this check takes no actor.
    for item in (ON_LOAN, OUT_OF_SERVICE):
        with pytest.raises(Conflict):
            check_borrowable(item)
