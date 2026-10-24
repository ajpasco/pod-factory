"""REQ-011 at the API: deleting equipment, and the one item that cannot be deleted.

Frozen at the S2 freeze; read-only to every builder.

The confirm modal of REQ-011.3 to REQ-011.6 is the client's, and no row here
carries it: the API has one delete and knows nothing of a confirmation. These
rows assert what the delete does and what it refuses to do.

T-011-N7 holds two pairs of blueprint section 8, borrow / delete and
return / delete, which the blueprint ties to REQ-011.8, so its title carries
that label. T-011-N8 is delete / delete, which is tied to nothing, so its title
carries `CONC` and the pair and no label (eval plan 5.3).
"""

#: Blueprint section 8 asks for twenty rounds released together, per pair.
ROUNDS = 20


def test_T_011_P5_REQ_011_7_an_available_or_out_of_service_item_is_deleted(api) -> None:
    """Both of the states a delete may meet, because the rule is about state."""
    spare = api.available("Spare cable")
    broken = api.out_of_service("Broken cable")

    for item in (spare, broken):
        answer = api.delete(api.ADA, item["id"])
        assert answer.carried_out, f"the delete of item {item['id']} was not carried out"

    listed = api.listing(api.ADA)
    assert [entry["id"] for entry in listed] == []


def test_T_011_N4_REQ_011_8_an_item_on_loan_is_not_deleted(api) -> None:
    loaned = api.on_loan("Rented lens", borrower=api.MIA, by=api.MIA)
    spare = api.available("Shelf lens")

    # First: the delete of the Available item is carried out and it is gone, so
    # a build with no working delete could not pass this case.
    assert api.delete(api.ADA, spare["id"]).carried_out
    assert api.read(spare["id"]) is None

    answer = api.delete(api.ADA, loaned["id"])

    assert not answer.carried_out, "the delete of the loaned item was carried out"
    listed = api.read(loaned["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_011_N7_REQ_011_8_a_delete_meets_a_borrow_and_a_return(api) -> None:
    """Blueprint section 8: borrow / delete from Available, return / delete from On loan.

    From Available, exactly one of the borrow and the delete is carried out: the
    loser meets either an item on loan, which may not be deleted, or an item
    that is no longer there. From On loan, the return is carried out either way
    and the delete only after it. In every round, an item that is on loan is
    still in the list: a loaned item is never deleted.
    """
    # borrow / delete, from Available.
    for order, (first, second) in enumerate([("borrow", "delete"), ("delete", "borrow")]):
        item = api.available(f"Borrow or delete serial {order}")
        sent = {
            "borrow": lambda: api.borrow(api.MIA, item["id"]),
            "delete": lambda: api.delete(api.ADA, item["id"]),
        }
        answers = {first: sent[first](), second: sent[second]()}
        assert answers[first].carried_out, f"the {first}, sent first, was not carried out"
        assert not answers[second].carried_out, f"the {second}, sent second, was carried out"
        if first == "borrow":
            listed = api.read(item["id"])
            assert listed is not None, "the loaned item was deleted"
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
        else:
            assert api.read(item["id"]) is None

    for round_number in range(ROUNDS):
        item = api.available(f"Borrow or delete together {round_number}")
        borrow_answer, delete_answer = api.release_together(
            lambda: api.borrow(api.MIA, item["id"]),
            lambda: api.delete(api.ADA, item["id"]),
        )
        carried = [borrow_answer.carried_out, delete_answer.carried_out]
        assert carried.count(True) == 1, (
            f"round {round_number}: {carried.count(True)} of the two were carried out"
        )
        if borrow_answer.carried_out:
            listed = api.read(item["id"])
            assert listed is not None, f"round {round_number}: the loaned item was deleted"
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
        else:
            assert api.read(item["id"]) is None

    # return / delete, from On loan.
    for order, (first, second) in enumerate([("return", "delete"), ("delete", "return")]):
        item = api.on_loan(f"Return or delete serial {order}", borrower=api.MIA, by=api.MIA)
        sent = {
            "return": lambda: api.return_item(api.MIA, item["id"]),
            "delete": lambda: api.delete(api.ADA, item["id"]),
        }
        answers = {first: sent[first](), second: sent[second]()}
        assert answers["return"].carried_out, f"{first} first: the return was not carried out"
        assert answers["delete"].carried_out is (first == "return"), (
            f"{first} first: the delete was not answered as the table says"
        )
        if answers["delete"].carried_out:
            assert api.read(item["id"]) is None
        else:
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "available"

    for round_number in range(ROUNDS):
        item = api.on_loan(
            f"Return or delete together {round_number}", borrower=api.MIA, by=api.MIA
        )
        return_answer, delete_answer = api.release_together(
            lambda: api.return_item(api.MIA, item["id"]),
            lambda: api.delete(api.ADA, item["id"]),
        )
        assert return_answer.carried_out, f"round {round_number}: the return failed"
        if delete_answer.carried_out:
            assert api.read(item["id"]) is None
        else:
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "available"
            assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_011_N8_CONC_delete_delete_two_deletes_of_one_item(api) -> None:
    """Blueprint section 8, delete / delete: one is carried out, the item is gone."""
    for order in (0, 1):
        item = api.available(f"Serial {order}")
        first_answer = api.delete(api.ADA, item["id"])
        second_answer = api.delete(api.ADA, item["id"])
        assert first_answer.carried_out, "the first delete was not carried out"
        assert not second_answer.carried_out, "the second delete was carried out as well"
        assert api.read(item["id"]) is None

    for round_number in range(ROUNDS):
        item = api.available(f"Together {round_number}")
        first_answer, second_answer = api.release_together(
            lambda: api.delete(api.ADA, item["id"]),
            lambda: api.delete(api.ADA, item["id"]),
        )
        carried = [first_answer.carried_out, second_answer.carried_out]
        assert carried.count(True) == 1, (
            f"round {round_number}: {carried.count(True)} of the two deletes were carried out"
        )
        assert api.read(item["id"]) is None
