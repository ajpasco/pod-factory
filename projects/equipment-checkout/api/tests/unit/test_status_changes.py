"""REQ-010: taking an item out of service and restoring it. Frozen at the S1 freeze."""

import pytest

from app.rules import Conflict, Item, check_mark_out_of_service, check_restore

AVAILABLE = Item(id=10, name="Tripod", status="available", borrower_id=None, borrower_name=None)
ON_LOAN = Item(id=11, name="Camera", status="on_loan", borrower_id=2, borrower_name="Mia Member")
OUT_OF_SERVICE = Item(
    id=12, name="Lens", status="out_of_service", borrower_id=None, borrower_name=None
)


def test_T_010_P8_available_goes_out_of_service_and_out_of_service_is_restored() -> None:
    assert check_mark_out_of_service(AVAILABLE) is None
    assert check_restore(OUT_OF_SERVICE) is None


def test_T_010_N4_neither_change_is_allowed_from_the_wrong_status() -> None:
    # First: the two changes that are allowed.
    assert check_mark_out_of_service(AVAILABLE) is None
    assert check_restore(OUT_OF_SERVICE) is None

    # All four are wrong-state refusals, not permission refusals: the acting
    # user is an admin throughout, which is why neither check takes an actor.
    with pytest.raises(Conflict):
        check_mark_out_of_service(ON_LOAN)
    with pytest.raises(Conflict):
        check_mark_out_of_service(OUT_OF_SERVICE)
    with pytest.raises(Conflict):
        check_restore(AVAILABLE)
    with pytest.raises(Conflict):
        check_restore(ON_LOAN)
