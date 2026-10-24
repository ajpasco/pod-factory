"""REQ-006 at the API: a loan comes back, and nothing says who brought it back.

Frozen at the S2 freeze; read-only to every builder.

T-006-N4 is the return half of the attribution check NA (blueprint 4.1.2), and
reads the dump as T-004-N5 does: about values only. T-006-N7 is the
return / return pair of blueprint section 8, which ties no criterion to it, so
its title carries `CONC` and the pair and no label (eval plan 1.1, 5.3).
"""

#: Blueprint section 8 asks for twenty rounds released together, per pair.
ROUNDS = 20


def _values_of(payload) -> list:
    if isinstance(payload, dict):
        return [value for held in payload.values() for value in _values_of(held)]
    if isinstance(payload, list):
        return [value for held in payload for value in _values_of(held)]
    return [payload]


def test_T_006_P4_REQ_006_5_the_borrower_returns_her_own_loan(api) -> None:
    item = api.on_loan("Headphones", borrower=api.MIA, by=api.MIA)

    answer = api.return_item(api.MIA, item["id"])

    assert answer.carried_out, "Mia's return of her own loan was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "available"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_006_P5_REQ_006_5_an_admin_returns_a_loan_the_admin_set(api) -> None:
    """The Return icon of REQ-006.2 is checked by T-006-P2, at the component level."""
    item = api.on_loan("Shotgun mic", borrower=api.MIA, by=api.ADA)

    answer = api.return_item(api.ADA, item["id"])

    assert answer.carried_out, "Ada's return was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "available"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_006_N4_REQ_006_7_nothing_says_who_performed_a_return(api) -> None:
    """Two items of one name, lent the same way, returned by two different people.

    Both loans are set by the same route -- Mia borrowing for herself -- so the
    only difference between the two histories is who returned the item. If
    anything the application keeps or can show recorded that, the two would not
    be alike afterwards.
    """
    name = "Return probe"
    by_borrower = api.on_loan(name, borrower=api.MIA, by=api.MIA)
    by_admin = api.on_loan(name, borrower=api.MIA, by=api.MIA)
    assert api.return_item(api.MIA, by_borrower["id"]).carried_out
    assert api.return_item(api.ADA, by_admin["id"]).carried_out

    # First: both are found Available with no borrower, so the comparison is
    # between two returns that really happened.
    for item_id in (by_borrower["id"], by_admin["id"]):
        listed = api.read(item_id)
        assert listed is not None
        assert listed["status"] == "available"
        assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)

    # (a) The dump tells them apart by the item id and by nothing else.
    dump = api.dump()
    records = dump.records_holding(name)
    assert len(records) == 2, "the dump does not hold exactly the two items"
    differences = records[0].differences(records[1])
    assert len(differences) == 1, f"the two returns differ in more than one value: {differences}"
    assert set(differences[0]) == {by_borrower["id"], by_admin["id"]}

    # (b) Every answer tells them apart by the item id and by nothing else.
    for identity in (api.ADA, api.MIA, api.SAM):
        entries = {entry["id"]: dict(entry) for entry in api.listing(identity)}
        mine = entries[by_borrower["id"]]
        theirs = entries[by_admin["id"]]
        del mine["id"]
        del theirs["id"]
        assert mine == theirs, f"the answers to {identity} tell the two returns apart"

    # (c) "Ada Admin" is the name of a user and nothing else.
    assert dump.occurrences_of("Ada Admin") == 1
    holder = dump.records_holding("Ada Admin")[0]
    assert api.ADA in holder.values and "admin" in holder.values
    for identity in (api.ADA, api.MIA, api.SAM):
        assert "Ada Admin" not in _values_of(api.listing(identity))
        assert _values_of(api.user_list(identity)).count("Ada Admin") == 1


def test_T_006_N7_CONC_return_return_two_returns_of_one_loan(api) -> None:
    """Blueprint section 8, return / return: one is carried out, one is not.

    No criterion is tied to this pair, so the title carries the pair and no
    label. The row also carries the case the table's last column names: a late
    return that arrives after somebody else has borrowed the item. A member's
    late return is not carried out and an admin's is, and in neither case may
    the item come back to the person who no longer holds it.
    """
    def fresh_loan(name: str) -> dict:
        return api.on_loan(name, borrower=api.MIA, by=api.MIA)

    # The two serial orders, each on its own loan.
    for order, (first, second) in enumerate(
        [((api.ADA, "Ada"), (api.MIA, "Mia")), ((api.MIA, "Mia"), (api.ADA, "Ada"))]
    ):
        item = fresh_loan(f"Serial {order}")
        first_answer = api.return_item(first[0], item["id"])
        second_answer = api.return_item(second[0], item["id"])
        assert first_answer.carried_out, f"{first[1]}'s return, sent first, was not carried out"
        assert not second_answer.carried_out, (
            f"{second[1]}'s return, sent second, was carried out as well"
        )
        listed = api.read(item["id"])
        assert listed is not None
        assert listed["status"] == "available"
        assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)

    # Twenty rounds released together, a fresh loan each time.
    for round_number in range(ROUNDS):
        item = fresh_loan(f"Together {round_number}")
        by_admin, by_borrower = api.release_together(
            lambda: api.return_item(api.ADA, item["id"]),
            lambda: api.return_item(api.MIA, item["id"]),
        )
        carried = [answer.carried_out for answer in (by_admin, by_borrower)]
        assert carried.count(True) == 1, (
            f"round {round_number}: {carried.count(True)} of the two returns were carried out"
        )
        listed = api.read(item["id"])
        assert listed is not None
        assert listed["status"] == "available"
        assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)

    # A late return, after the item has gone to somebody else.
    item = fresh_loan("Late return")
    assert api.return_item(api.ADA, item["id"]).carried_out
    assert api.borrow(api.SAM, item["id"]).carried_out

    late_by_member = api.return_item(api.MIA, item["id"])
    assert not late_by_member.carried_out, "Mia's late return was carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.SAM, "Sam Member")

    late_by_admin = api.return_item(api.ADA, item["id"])
    assert late_by_admin.carried_out, "Ada's late return was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "available"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)
