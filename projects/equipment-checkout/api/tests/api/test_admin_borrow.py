"""REQ-004 at the API: an admin lends to a member, and nothing says it was the admin.

Frozen at the S2 freeze; read-only to every builder.

T-004-N5 is the loan half of the attribution check NA (blueprint 4.1.2). It is
the one row here that reads the dump, and it reads it the way eval plan 1.1
requires: about values, never about the names of tables or columns. The dump
reader in ``conftest.py`` discovers both from the database's own catalogue, so
a build that keeps the admin's id in a third table is read by this row as
surely as one that keeps it in a column of the two.
"""


def _values_of(payload) -> list:
    """Every value anywhere in an answer, with no field name attached.

    REQ-004.10 is about what the application can show, not about what it calls
    its fields, so the check flattens an answer to its values and asks what is
    among them (eval plan 1.1).
    """
    if isinstance(payload, dict):
        return [value for held in payload.values() for value in _values_of(held)]
    if isinstance(payload, list):
        return [value for held in payload for value in _values_of(held)]
    return [payload]


def test_T_004_P5_REQ_004_6_an_admin_lends_to_a_member(api) -> None:
    """Ada names Mia, and the item is on loan to Mia: id and name both."""
    item = api.available("Projector")

    answer = api.borrow(api.ADA, item["id"], borrower=api.MIA)

    assert answer.carried_out, "Ada's Borrow naming Mia was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_004_P10_REQ_004_8_a_member_who_already_holds_one_may_be_lent_another(api) -> None:
    """D-05 again, from the admin's side: holding one is not a reason to refuse."""
    held = api.on_loan("Light stand", borrower=api.MIA, by=api.MIA)
    second = api.available("Reflector")

    answer = api.borrow(api.ADA, second["id"], borrower=api.MIA)

    assert answer.carried_out, "Ada's Borrow of the second item was not carried out"
    for item_id in (held["id"], second["id"]):
        listed = api.read(item_id)
        assert listed is not None
        assert listed["status"] == "on_loan"
        assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_004_N5_REQ_004_10_nothing_says_who_set_a_loan(api) -> None:
    """Two items of one name reach one state by two routes, and must be alike.

    P is borrowed by Mia for herself; Q is given to Mia by Ada. Any trace of who
    acted -- a column, a third table, a field of an answer -- shows as a
    difference between the two, because nothing else about them differs. The
    name is shared deliberately (D-10 allows it), so the item id is the only
    value that may differ.
    """
    name = "Attribution probe"
    mine = api.available(name)
    given = api.available(name)
    assert api.borrow(api.MIA, mine["id"]).carried_out
    assert api.borrow(api.ADA, given["id"], borrower=api.MIA).carried_out

    # First: both are found on loan to Mia Member, so the comparison below is
    # between two loans that really happened and not between two empty rows.
    for item_id in (mine["id"], given["id"]):
        listed = api.read(item_id)
        assert listed is not None
        assert listed["status"] == "on_loan"
        assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")

    # (a) In the dump, the two records differ in the item id and nothing else.
    dump = api.dump()
    records = dump.records_holding(name)
    assert len(records) == 2, "the dump does not hold exactly the two items"
    first, second = records
    differences = first.differences(second)
    assert len(differences) == 1, f"the two loans differ in more than one value: {differences}"
    assert set(differences[0]) == {mine["id"], given["id"]}

    # (b) In every answer, read as each of the three, the two entries differ in
    # the item id and nothing else.
    for identity in (api.ADA, api.MIA, api.SAM):
        listed = api.listing(identity)
        entries = {entry["id"]: entry for entry in listed}
        mine_entry = dict(entries[mine["id"]])
        given_entry = dict(entries[given["id"]])
        del mine_entry["id"]
        del given_entry["id"]
        assert mine_entry == given_entry, (
            f"the answers to {identity} tell the two loans apart"
        )

    # (c) "Ada Admin" is in the dump once, as the name of the user Ada Admin,
    # and in no answer about the equipment.
    assert dump.occurrences_of("Ada Admin") == 1
    holder = dump.records_holding("Ada Admin")[0]
    assert api.ADA in holder.values and "admin" in holder.values
    for identity in (api.ADA, api.MIA, api.SAM):
        assert "Ada Admin" not in _values_of(api.listing(identity))
        assert _values_of(api.user_list(identity)).count("Ada Admin") == 1


def test_T_004_N7_REQ_004_11_REQ_004_12_an_admin_must_name_a_seeded_member(api) -> None:
    """No borrower named at all, and a borrower who is nobody.

    "Names no borrower" is sent in the three shapes a client can send it: no
    body, an empty object, and a borrower that is null. A build that reads a
    missing body as an empty object, or an empty object as a member's own
    Borrow, would lend the item to the admin, which REQ-005 forbids outright.
    """
    first = api.available("Gimbal")
    second = api.available("Slider")

    # First: Ada's Borrow of the second item naming Mia is carried out.
    anchor = api.borrow(api.ADA, second["id"], borrower=api.MIA)
    assert anchor.carried_out, "Ada's Borrow naming Mia was not carried out"
    lent = api.read(second["id"])
    assert lent is not None
    assert lent["status"] == "on_loan"
    assert (lent["borrowerId"], lent["borrowerName"]) == (api.MIA, "Mia Member")

    attempts = [
        ("no body", {"body": api.NO_BODY}),
        ("an empty object", {"body": {}}),
        ("a null borrower", {"body": {"borrowerId": None}}),
        ("the id 4", {"borrower": 4}),
        ("the id 999999999", {"borrower": 999999999}),
    ]
    for description, keywords in attempts:
        answer = api.borrow(api.ADA, first["id"], **keywords)
        assert not answer.carried_out, f"Ada's Borrow with {description} was carried out"
        listed = api.read(first["id"])
        assert listed is not None
        assert listed["status"] == "available"
        assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)
