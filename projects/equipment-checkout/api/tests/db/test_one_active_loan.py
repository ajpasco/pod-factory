"""REQ-008.1: the store itself cannot hold a loan that means nothing.

Frozen at the S1 freeze; read-only to every builder.

This row does not test the application's rules. It writes to the table directly,
around them, and asks whether the store would hold the row at all. An item has
one borrower column and there is no loans table, so a second active loan cannot
be written; what remains to show is that the contradictory shapes are refused by
the store rather than merely avoided by the code above it.

The guarantee is a biconditional: on loan if and only if somebody holds it. Both
halves are checked in both directions, and every status that is not ``on_loan``
is tried with a borrower, because a store that forbids only one of them can
still record a phantom loan.

After each refusal the same name is written in a legal shape and must be
accepted. Without that control, a refusal for an unrelated reason -- a name
constraint, a lost connection -- would read as the loan rule holding.
"""

import pytest


def test_T_008_N7_REQ_008_1_a_loan_is_a_status_and_a_borrower_together(equipment_store) -> None:
    # First: the shapes the store must accept, so a store that refused every
    # write could not make this case pass.
    equipment_store.write(name="Camera", status="on_loan", borrower_id=2)
    equipment_store.write(name="Tripod", status="available", borrower_id=None)
    equipment_store.write(name="Lens", status="out_of_service", borrower_id=None)
    assert equipment_store.count() == 3

    # On loan with nobody holding it.
    with pytest.raises(equipment_store.Refused):
        equipment_store.write(name="Loaned to nobody", status="on_loan", borrower_id=None)
    equipment_store.write(name="Loaned to nobody", status="on_loan", borrower_id=2)

    # Held by somebody while available.
    with pytest.raises(equipment_store.Refused):
        equipment_store.write(name="Held while available", status="available", borrower_id=2)
    equipment_store.write(name="Held while available", status="available", borrower_id=None)

    # Held by somebody while out of service: the other half of "not on loan",
    # and the one a one-sided constraint lets through.
    with pytest.raises(equipment_store.Refused):
        equipment_store.write(name="Held while out of service", status="out_of_service", borrower_id=2)
    equipment_store.write(name="Held while out of service", status="out_of_service", borrower_id=None)

    # Three refusals left nothing behind; three controls were accepted.
    assert equipment_store.count() == 6
