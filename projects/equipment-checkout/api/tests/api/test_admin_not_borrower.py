"""REQ-005 at the API: an admin may lend to anybody but an admin.

Frozen at the S2 freeze; read-only to every builder.

Every row here is an admin's own request. Eval plan 1.1 settles the reading of
REQ-005.3: a member's Borrow that names the admin is a refusal and belongs to
REQ-003.6, which T-003-N2 checks. Nothing here sends a member's request.
"""


def test_T_005_P1_REQ_005_2_lending_to_a_member_leaves_nothing_on_loan_to_the_admin(api) -> None:
    """Ada names Sam. REQ-005.2 is checked over the whole list, not one row."""
    item = api.available("Field recorder")

    answer = api.borrow(api.ADA, item["id"], borrower=api.SAM)

    assert answer.carried_out, "Ada's Borrow naming Sam was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.SAM, "Sam Member")
    for entry in api.listing(api.ADA):
        assert entry["borrowerId"] != api.ADA
        assert entry["borrowerName"] != "Ada Admin"


def test_T_005_N3_REQ_005_3_REQ_005_4_an_admin_may_not_name_an_admin(api) -> None:
    """Ada names Ada, which is the whole of REQ-005: the admin holds nothing."""
    first = api.available("Monitor")
    second = api.available("Battery")

    # First: Ada's Borrow naming Mia is carried out, so the refusal below is
    # not a build that refuses every Borrow an admin makes.
    anchor = api.borrow(api.ADA, second["id"], borrower=api.MIA)
    assert anchor.carried_out, "Ada's Borrow naming Mia was not carried out"
    lent = api.read(second["id"])
    assert lent is not None
    assert lent["status"] == "on_loan"
    assert (lent["borrowerId"], lent["borrowerName"]) == (api.MIA, "Mia Member")

    answer = api.borrow(api.ADA, first["id"], borrower=api.ADA)

    assert not answer.carried_out, "Ada's Borrow naming Ada was carried out"
    listed = api.read(first["id"])
    assert listed is not None
    assert listed["status"] == "available"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_005_N6_REQ_005_4_naming_the_admin_fails_whatever_the_item_is(api) -> None:
    """Ada names Ada for an item somebody holds, and for an item that is nobody's.

    Blueprint 5.3 puts the borrower rule before the item lookup, so neither of
    these two can be carried out for any reason; what matters to the PRD is that
    neither happens and nothing is created.
    """
    loaned = api.on_loan("Dolly", borrower=api.MIA, by=api.ADA)
    spare = api.available("Clapperboard")
    before = api.listing(api.ADA)

    # First: Ada's Borrow of the Available item naming Sam is carried out.
    anchor = api.borrow(api.ADA, spare["id"], borrower=api.SAM)
    assert anchor.carried_out, "Ada's Borrow naming Sam was not carried out"
    lent = api.read(spare["id"])
    assert lent is not None
    assert lent["status"] == "on_loan"
    assert (lent["borrowerId"], lent["borrowerName"]) == (api.SAM, "Sam Member")

    for item_id in (loaned["id"], api.MISSING_ITEM_ID):
        answer = api.borrow(api.ADA, item_id, borrower=api.ADA)
        assert not answer.carried_out, f"naming Ada for item {item_id} was carried out"

    listed = api.read(loaned["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
    # Nothing was created, and nothing but the anchor's own item changed.
    after = api.listing(api.ADA)
    assert [entry["id"] for entry in after] == [entry["id"] for entry in before]
    assert api.read(loaned["id"]) == next(
        entry for entry in before if entry["id"] == loaned["id"]
    )
