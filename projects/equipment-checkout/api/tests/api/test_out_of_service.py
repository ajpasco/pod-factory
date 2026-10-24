"""REQ-010 at the API: taking an item out of service and bringing it back.

Frozen at the S2 freeze; read-only to every builder.

Three rows are ordinary requests and four are pairs of blueprint section 8. The
four pair rows cover seven of the pairs that table names, grouped as eval plan
5.3 groups them, and none of them is tied to a criterion: each title carries
`CONC` and the pairs it holds, and no label.

Each pair row does what the blueprint asks: both serial orders once, then twenty
rounds released together by a barrier. No row claims to know which request took
the row lock first; what each round asserts is that the outcomes are one of the
two the table allows, and that the item is left in the state that outcome gives.
"""

#: Blueprint section 8 asks for twenty rounds released together, per pair.
ROUNDS = 20


def _borrower_of(entry) -> tuple:
    return entry["borrowerId"], entry["borrowerName"]


def test_T_010_P5_REQ_010_3_an_admin_marks_an_item_out_of_service(api) -> None:
    item = api.available("Cracked lens")

    answer = api.mark_out_of_service(api.ADA, item["id"])

    assert answer.carried_out, "the mark out of service was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "out_of_service"


def test_T_010_P6_REQ_010_6_an_admin_restores_an_item(api) -> None:
    item = api.out_of_service("Repaired lens")

    answer = api.restore(api.ADA, item["id"])

    assert answer.carried_out, "the restore was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "available"
    assert _borrower_of(listed) == (None, None)


def test_T_010_P11_REQ_010_6_a_restored_item_is_really_available(api) -> None:
    """D-04 again, proved by use: the item can be borrowed straight afterwards.

    A build that showed the restored item as Available while keeping it
    unborrowable would pass T-010-P6 and fail here.
    """
    item = api.out_of_service("Serviced monitor")

    answer = api.restore(api.ADA, item["id"])

    assert answer.carried_out, "the restore was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "available"

    borrowed = api.borrow(api.MIA, item["id"])
    assert borrowed.carried_out, "the restored item could not be borrowed"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert _borrower_of(listed) == (api.MIA, "Mia Member")


def test_T_010_N6_CONC_mark_restore_mark_mark_restore_restore(api) -> None:
    """Blueprint section 8: mark / restore from both states, and each with itself.

    From Available the mark is carried out either way and the restore only after
    it; from Out of service the restore is carried out either way and the mark
    only after it. Two marks, or two restores, give exactly one carried out --
    the second meets a state its own rule forbids.
    """
    starts = {
        "available": (lambda name: api.available(name), "available", "out_of_service"),
        "out of service": (
            lambda name: api.out_of_service(name),
            "out_of_service",
            "available",
        ),
    }
    for starting_state, (make, unchanged, changed) in starts.items():
        # The request that meets the starting state it needs, and the other one.
        def requests(item_id):
            return {
                "mark": lambda: api.mark_out_of_service(api.ADA, item_id),
                "restore": lambda: api.restore(api.ADA, item_id),
            }

        allowed = "mark" if starting_state == "available" else "restore"
        other = "restore" if allowed == "mark" else "mark"

        for order, (first, second) in enumerate([(allowed, other), (other, allowed)]):
            item = make(f"{starting_state} serial {order}")
            sent = requests(item["id"])
            answers = {first: sent[first](), second: sent[second]()}
            assert answers[allowed].carried_out, (
                f"{starting_state}: the {allowed} was not carried out"
            )
            assert answers[other].carried_out is (first == allowed), (
                f"{starting_state}, {first} first: the {other} was not answered as the "
                "table says"
            )
            # Both were carried out, so the item came back to the state it
            # started in; only one was, so the item is in the other state.
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == (unchanged if first == allowed else changed)
            assert _borrower_of(listed) == (None, None)

        for round_number in range(ROUNDS):
            item = make(f"{starting_state} together {round_number}")
            sent = requests(item["id"])
            mark_answer, restore_answer = api.release_together(sent["mark"], sent["restore"])
            answers = {"mark": mark_answer, "restore": restore_answer}
            assert answers[allowed].carried_out, (
                f"{starting_state} round {round_number}: the {allowed} failed"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == (
                unchanged if answers[other].carried_out else changed
            ), f"{starting_state} round {round_number}: the end state is a third one"
            assert _borrower_of(listed) == (None, None)

        # The same action twice, from the state in which that action is the one
        # the item's own rule allows: one of the two is carried out, one is not.
        for round_number in range(ROUNDS):
            item = make(f"{starting_state} {allowed} twice {round_number}")
            sent = requests(item["id"])
            first_answer, second_answer = api.release_together(sent[allowed], sent[allowed])
            carried = [first_answer.carried_out, second_answer.carried_out]
            assert carried.count(True) == 1, (
                f"{starting_state}, two {allowed}s, round {round_number}: "
                f"{carried.count(True)} were carried out"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == changed


def test_T_010_N7_CONC_delete_mark_delete_restore(api) -> None:
    """Blueprint section 8: delete against mark, and delete against restore.

    An item that is Available or Out of service can be deleted, so the delete is
    carried out whichever way round the two arrive; the status change is carried
    out only if it took the lock first. Either way the item ends gone, and no
    status is ever written to a deleted item -- which is what "a deleted item
    never reappears with a status" is read as: it is not in the list afterwards,
    and no later read brings it back.
    """
    cases = {
        "available": (lambda name: api.available(name), "mark"),
        "out of service": (lambda name: api.out_of_service(name), "restore"),
    }
    for starting_state, (make, change) in cases.items():
        def requests(item_id):
            return {
                "delete": lambda: api.delete(api.ADA, item_id),
                "mark": lambda: api.mark_out_of_service(api.ADA, item_id),
                "restore": lambda: api.restore(api.ADA, item_id),
            }

        for order, (first, second) in enumerate([("delete", change), (change, "delete")]):
            item = make(f"{starting_state} serial {order}")
            sent = requests(item["id"])
            answers = {first: sent[first](), second: sent[second]()}
            assert answers["delete"].carried_out, (
                f"{starting_state}, {first} first: the delete was not carried out"
            )
            assert answers[change].carried_out is (first == change), (
                f"{starting_state}, {first} first: the {change} was not answered as the "
                "table says"
            )
            assert api.read(item["id"]) is None
            assert api.read(item["id"]) is None   # it does not come back on a second read

        for round_number in range(ROUNDS):
            item = make(f"{starting_state} together {round_number}")
            sent = requests(item["id"])
            delete_answer, change_answer = api.release_together(
                sent["delete"], sent[change]
            )
            assert delete_answer.carried_out, (
                f"{starting_state} round {round_number}: the delete was not carried out"
            )
            assert api.read(item["id"]) is None, (
                f"{starting_state} round {round_number}: the deleted item is still listed"
            )
            # Whether the status change got in first or not, nothing of the item
            # is left to carry a status: a second read does not bring it back.
            if change_answer.carried_out:
                assert api.read(item["id"]) is None, (
                    f"{starting_state} round {round_number}: the {change} that was "
                    "carried out brought the deleted item back"
                )
            assert api.read(item["id"]) is None


def test_T_010_N8_CONC_return_mark_on_a_loaned_item(api) -> None:
    """Blueprint section 8, return / mark, from On loan.

    The return meets an item on loan whichever way round they arrive, so it is
    carried out every time; the mark only after it, because an item on loan is
    not Available. So an item on loan is never marked out of service, and the
    item ends Out of service when both happened and Available when only the
    return did.
    """
    def loan(name: str) -> dict:
        return api.on_loan(name, borrower=api.MIA, by=api.MIA)

    for order, (first, second) in enumerate([("return", "mark"), ("mark", "return")]):
        item = loan(f"Serial {order}")
        sent = {
            "return": lambda: api.return_item(api.ADA, item["id"]),
            "mark": lambda: api.mark_out_of_service(api.ADA, item["id"]),
        }
        answers = {first: sent[first](), second: sent[second]()}
        assert answers["return"].carried_out, f"{first} first: the return was not carried out"
        assert answers["mark"].carried_out is (first == "return"), (
            f"{first} first: the mark was not answered as the table says"
        )
        listed = api.read(item["id"])
        assert listed is not None
        assert listed["status"] == ("out_of_service" if first == "return" else "available")
        assert _borrower_of(listed) == (None, None)

    for round_number in range(ROUNDS):
        item = loan(f"Together {round_number}")
        return_answer, mark_answer = api.release_together(
            lambda: api.return_item(api.ADA, item["id"]),
            lambda: api.mark_out_of_service(api.ADA, item["id"]),
        )
        assert return_answer.carried_out, f"round {round_number}: the return failed"
        listed = api.read(item["id"])
        assert listed is not None
        assert listed["status"] == (
            "out_of_service" if mark_answer.carried_out else "available"
        )
        assert _borrower_of(listed) == (None, None)


def test_T_010_N9_CONC_return_restore_from_both_starting_states(api) -> None:
    """Blueprint section 8, return / restore, from On loan and from Out of service.

    This pair has the same end whichever way round it arrives, and the row says
    so: from On loan the return is carried out and the restore is not -- the
    item is on loan when the restore meets it, or Available when it meets it
    after the return, and neither is Out of service. From Out of service the
    restore is carried out and the return is not. Both states end Available.
    """
    starts = {
        "on loan": (
            lambda name: api.on_loan(name, borrower=api.MIA, by=api.MIA),
            "return",
        ),
        "out of service": (lambda name: api.out_of_service(name), "restore"),
    }
    for starting_state, (make, carried) in starts.items():
        other = "restore" if carried == "return" else "return"

        for order, (first, second) in enumerate([(carried, other), (other, carried)]):
            item = make(f"{starting_state} serial {order}")
            sent = {
                "return": lambda: api.return_item(api.ADA, item["id"]),
                "restore": lambda: api.restore(api.ADA, item["id"]),
            }
            answers = {first: sent[first](), second: sent[second]()}
            assert answers[carried].carried_out, (
                f"{starting_state}, {first} first: the {carried} was not carried out"
            )
            assert not answers[other].carried_out, (
                f"{starting_state}, {first} first: the {other} was carried out"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "available"
            assert _borrower_of(listed) == (None, None)

        for round_number in range(ROUNDS):
            item = make(f"{starting_state} together {round_number}")
            return_answer, restore_answer = api.release_together(
                lambda: api.return_item(api.ADA, item["id"]),
                lambda: api.restore(api.ADA, item["id"]),
            )
            answers = {"return": return_answer, "restore": restore_answer}
            assert answers[carried].carried_out, (
                f"{starting_state} round {round_number}: the {carried} failed"
            )
            assert not answers[other].carried_out, (
                f"{starting_state} round {round_number}: the {other} was carried out"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "available"
            assert _borrower_of(listed) == (None, None)
