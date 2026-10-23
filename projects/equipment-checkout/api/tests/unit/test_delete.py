"""REQ-011: deleting equipment. Frozen at the S1 freeze."""

import pytest

from app.rules import Conflict, Item, check_delete

AVAILABLE = Item(id=10, name="Tripod", status="available", borrower_id=None, borrower_name=None)
ON_LOAN = Item(id=11, name="Camera", status="on_loan", borrower_id=2, borrower_name="Mia Member")
OUT_OF_SERVICE = Item(
    id=12, name="Lens", status="out_of_service", borrower_id=None, borrower_name=None
)


def test_T_011_P6_an_available_or_out_of_service_item_can_be_deleted() -> None:
    assert check_delete(AVAILABLE) is None
    assert check_delete(OUT_OF_SERVICE) is None


def test_T_011_N5_REQ_011_8_an_item_on_loan_cannot_be_deleted() -> None:
    # First: an available item is allowed.
    assert check_delete(AVAILABLE) is None

    # Wrong state, not permission. The admin may delete; this item may not be
    # deleted while someone has it.
    with pytest.raises(Conflict):
        check_delete(ON_LOAN)
