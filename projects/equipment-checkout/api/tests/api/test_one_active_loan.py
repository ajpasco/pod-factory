"""REQ-008 at the API: one loan at a time, including when two requests race.

Frozen at the S2 freeze; read-only to every builder.

Five rows here are ordinary requests and three are pairs of blueprint section 8.
Each pair row does what that section asks for: both serial orders once, then
twenty rounds in which the two requests are released together by a barrier.
Which of the two takes the row lock first is the database's to decide and no row
claims to know it; what every round asserts is that the pair of outcomes is one
of the two the table allows and that the state the item is left in is the one
that outcome gives.

T-008-N8 (borrow / return) and T-008-N10 (borrow / restore) are pairs the
blueprint ties to no criterion, so their titles carry `CONC` and the pair and no
label (eval plan 1.1, 5.3). T-008-N3 carries REQ-008.1, REQ-008.4 and
REQ-008.8, and T-008-N9 carries REQ-008.7, because the blueprint ties those.

None of these rows reads a status code, so none says which kind of failure the
loser met. "Not carried out" plus a read-back showing the state unchanged is the
whole of what an I row may say (eval plan 1.1); which modal the loser sees is
asserted in the C, B and J rows.
"""

#: Blueprint section 8 asks for twenty rounds released together, per pair.
ROUNDS = 20


def _one_borrower_at_most(listing) -> None:
    """Every item shows one borrower while on loan and none otherwise.

    REQ-008.1 reads "at no time does any item have more than one active loan or
    show more than one borrower". What an answer can show is one borrower or
    none, so the check is that an item on loan shows exactly one and an item in
    any other state shows nobody -- a phantom loan would show as a borrower on
    an item that is not on loan.
    """
    for entry in listing:
        if entry["status"] == "on_loan":
            assert entry["borrowerId"] is not None, entry
            assert entry["borrowerName"] is not None, entry
        else:
            assert (entry["borrowerId"], entry["borrowerName"]) == (None, None), entry


def test_T_008_P1_REQ_008_1_a_borrowed_item_shows_one_borrower(api) -> None:
    """The positive side of REQ-008.1, read again and again and by everybody."""
    item = api.available("Drone")

    answer = api.borrow(api.MIA, item["id"])

    assert answer.carried_out, "Mia's Borrow was not carried out"
    for identity in (api.ADA, api.MIA, api.SAM, api.ADA):
        listing = api.listing(identity)
        _one_borrower_at_most(listing)
        listed = next(entry for entry in listing if entry["id"] == item["id"])
        assert listed["status"] == "on_loan"
        assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_008_N1_REQ_008_2_REQ_008_6_an_item_on_loan_cannot_be_borrowed(api) -> None:
    loaned = api.on_loan("Tracking head", borrower=api.MIA, by=api.MIA)
    spare = api.available("Spare head")

    # First: the same request for the Available item is carried out, so a build
    # that refused every Borrow by Sam could not pass this case.
    assert api.borrow(api.SAM, spare["id"]).carried_out
    listed = api.read(spare["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.SAM, "Sam Member")

    answer = api.borrow(api.SAM, loaned["id"])

    assert not answer.carried_out, "Sam's Borrow of Mia's loan was carried out"
    listed = api.read(loaned["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
    _one_borrower_at_most(api.listing(api.ADA))


def test_T_008_N2_REQ_008_3_REQ_008_7_an_out_of_service_item_cannot_be_borrowed(api) -> None:
    marked = api.out_of_service("Cracked filter")
    spare = api.available("Clear filter")

    # First: the same request for the Available item is carried out.
    assert api.borrow(api.MIA, spare["id"]).carried_out
    listed = api.read(spare["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")

    answer = api.borrow(api.MIA, marked["id"])

    assert not answer.carried_out, "Mia's Borrow of the Out of service item was carried out"
    listed = api.read(marked["id"])
    assert listed is not None
    assert listed["status"] == "out_of_service"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_008_N3_REQ_008_1_REQ_008_4_REQ_008_8_two_borrows_at_the_same_moment(api) -> None:
    """Blueprint section 8, borrow / borrow: one winner, and the winner's borrower.

    Three pairings, because the pair may be two members or a member and an
    admin, and because an admin's Borrow names its borrower while a member's
    does not: a build that handled the race in one of the two shapes and not the
    other would pass a single pairing.

    Each pairing runs both serial orders once and then twenty rounds released
    together. The borrower the item ends with is checked against the request
    that was carried out, not against whichever of the two the test prefers.
    """
    pairings = [
        (
            "Mia against Sam",
            (api.MIA, lambda item_id: api.borrow(api.MIA, item_id)),
            (api.SAM, lambda item_id: api.borrow(api.SAM, item_id)),
        ),
        (
            "Ada for Mia against Sam",
            (api.MIA, lambda item_id: api.borrow(api.ADA, item_id, borrower=api.MIA)),
            (api.SAM, lambda item_id: api.borrow(api.SAM, item_id)),
        ),
        (
            "Ada for Sam against Mia",
            (api.SAM, lambda item_id: api.borrow(api.ADA, item_id, borrower=api.SAM)),
            (api.MIA, lambda item_id: api.borrow(api.MIA, item_id)),
        ),
    ]
    names = {api.MIA: "Mia Member", api.SAM: "Sam Member"}

    for pairing, (first_borrower, first_request), (second_borrower, second_request) in pairings:
        # Each serial order once.
        for order, ((lead, lead_request), (follower, follower_request)) in enumerate(
            [
                ((first_borrower, first_request), (second_borrower, second_request)),
                ((second_borrower, second_request), (first_borrower, first_request)),
            ]
        ):
            item = api.available(f"{pairing} serial {order}")
            lead_answer = lead_request(item["id"])
            follower_answer = follower_request(item["id"])
            assert lead_answer.carried_out, f"{pairing}: the first Borrow was not carried out"
            assert not follower_answer.carried_out, (
                f"{pairing}: the second Borrow was carried out as well"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (lead, names[lead])

        # Twenty rounds released together, a fresh Available item each time.
        for round_number in range(ROUNDS):
            item = api.available(f"{pairing} together {round_number}")
            first_answer, second_answer = api.release_together(
                lambda: first_request(item["id"]),
                lambda: second_request(item["id"]),
            )
            carried = [
                (first_borrower, first_answer.carried_out),
                (second_borrower, second_answer.carried_out),
            ]
            winners = [borrower for borrower, done in carried if done]
            assert len(winners) == 1, (
                f"{pairing} round {round_number}: {len(winners)} of the two were carried out"
            )
            listed = api.read(item["id"])
            assert listed is not None
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (
                winners[0],
                names[winners[0]],
            )
            # After every round, no item anywhere shows more than one borrower.
            _one_borrower_at_most(api.listing(api.ADA))


def test_T_008_N6_REQ_008_6_REQ_008_7_an_admin_cannot_lend_what_is_not_available(api) -> None:
    loaned = api.on_loan("Steadicam", borrower=api.MIA, by=api.MIA)
    marked = api.out_of_service("Bent rail")
    spare = api.available("Straight rail")

    # First: Ada's Borrow naming Sam for the Available item is carried out.
    assert api.borrow(api.ADA, spare["id"], borrower=api.SAM).carried_out
    listed = api.read(spare["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.SAM, "Sam Member")

    for item_id in (loaned["id"], marked["id"]):
        answer = api.borrow(api.ADA, item_id, borrower=api.SAM)
        assert not answer.carried_out, f"the Borrow of item {item_id} was carried out"

    listed = api.read(loaned["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
    listed = api.read(marked["id"])
    assert listed is not None
    assert listed["status"] == "out_of_service"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_008_N8_CONC_borrow_return_from_both_starting_states(api) -> None:
    """Blueprint section 8, borrow / return, from On loan and from Available.

    The return is Ada's in both, because an admin may return any loan: that way
    the only reason a return can fail is the state it meets, which is what the
    table is about. The borrow is Sam's.

    From On loan the return is carried out either way and the borrow only if it
    arrives after it. From Available the borrow is carried out either way and
    the return only if it arrives after it. Those are the two lines of the
    table, and the final state follows from which of them happened.
    """
    for starting_state in ("on loan", "available"):
        def make(name: str) -> dict:
            if starting_state == "on loan":
                return api.on_loan(name, borrower=api.MIA, by=api.MIA)
            return api.available(name)

        # Each serial order once.
        for order in (0, 1):
            item = make(f"{starting_state} serial {order}")
            if order == 0:
                first = ("return", lambda: api.return_item(api.ADA, item["id"]))
                second = ("borrow", lambda: api.borrow(api.SAM, item["id"]))
            else:
                first = ("borrow", lambda: api.borrow(api.SAM, item["id"]))
                second = ("return", lambda: api.return_item(api.ADA, item["id"]))
            answers = {first[0]: first[1](), second[0]: second[1]()}
            _assert_borrow_return(api, starting_state, item, answers, first[0])

        # Twenty rounds released together, per starting state.
        for round_number in range(ROUNDS):
            item = make(f"{starting_state} together {round_number}")
            borrow_answer, return_answer = api.release_together(
                lambda: api.borrow(api.SAM, item["id"]),
                lambda: api.return_item(api.ADA, item["id"]),
            )
            answers = {"borrow": borrow_answer, "return": return_answer}
            _assert_borrow_return(api, starting_state, item, answers, None)


def _assert_borrow_return(api, starting_state, item, answers, sent_first) -> None:
    """One round of T-008-N8, checked against the two lines the table allows."""
    borrowed = answers["borrow"].carried_out
    returned = answers["return"].carried_out
    where = f"{starting_state}, first {sent_first or 'together'}, item {item['id']}"

    if starting_state == "on loan":
        # The return meets an item on loan whichever way round they arrive, so
        # it is carried out every time; the borrow only if the return went first.
        assert returned, f"{where}: the return was not carried out"
        if sent_first == "borrow":
            assert not borrowed, f"{where}: the borrow was carried out before the return"
        elif sent_first == "return":
            assert borrowed, f"{where}: the borrow after the return was not carried out"
    else:
        # The borrow meets an Available item whichever way round, so it is
        # carried out every time; the return only if the borrow went first.
        assert borrowed, f"{where}: the borrow was not carried out"
        if sent_first == "return":
            assert not returned, f"{where}: the return of an Available item was carried out"
        elif sent_first == "borrow":
            assert returned, f"{where}: the return after the borrow was not carried out"

    on_loan_to_sam = ("on_loan", (api.SAM, "Sam Member"))
    nobody_holds_it = ("available", (None, None))
    listed = api.read(item["id"])
    assert listed is not None
    ends = (listed["status"], (listed["borrowerId"], listed["borrowerName"]))
    if borrowed and not returned:
        assert ends == on_loan_to_sam, where
    elif returned and not borrowed:
        assert ends == nobody_holds_it, where
    else:
        # Both were carried out, so which of them took the lock second decides.
        # The table allows exactly these two ends and no third.
        assert ends in (on_loan_to_sam, nobody_holds_it), where
    _one_borrower_at_most(api.listing(api.ADA))


def test_T_008_N9_REQ_008_7_a_borrow_and_a_mark_out_of_service_meet(api) -> None:
    """Blueprint section 8, borrow / mark, from Available.

    One of the two is carried out and one is not, whichever arrives first: an
    Available item can be lent or taken out of service and not both. The row
    also asserts REQ-008.7 directly -- once the item is Out of service, a Borrow
    of it is not carried out and its status does not change.
    """
    for order, (first, second) in enumerate([("borrow", "mark"), ("mark", "borrow")]):
        item = api.available(f"Serial {order}")
        requests = {
            "borrow": lambda: api.borrow(api.MIA, item["id"]),
            "mark": lambda: api.mark_out_of_service(api.ADA, item["id"]),
        }
        first_answer = requests[first]()
        second_answer = requests[second]()
        assert first_answer.carried_out, f"the {first}, sent first, was not carried out"
        assert not second_answer.carried_out, f"the {second}, sent second, was carried out"
        listed = api.read(item["id"])
        assert listed is not None
        assert listed["status"] == ("on_loan" if first == "borrow" else "out_of_service")

    for round_number in range(ROUNDS):
        item = api.available(f"Together {round_number}")
        borrow_answer, mark_answer = api.release_together(
            lambda: api.borrow(api.MIA, item["id"]),
            lambda: api.mark_out_of_service(api.ADA, item["id"]),
        )
        carried = [borrow_answer.carried_out, mark_answer.carried_out]
        assert carried.count(True) == 1, (
            f"round {round_number}: {carried.count(True)} of the two were carried out"
        )
        listed = api.read(item["id"])
        assert listed is not None
        if borrow_answer.carried_out:
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
        else:
            assert listed["status"] == "out_of_service"
            assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)
        _one_borrower_at_most(api.listing(api.ADA))

    # REQ-008.7 on its own: a Borrow of an item that is Out of service is not
    # carried out and the item's status is unchanged.
    marked = api.out_of_service("Marked for the borrow")
    assert not api.borrow(api.MIA, marked["id"]).carried_out
    listed = api.read(marked["id"])
    assert listed is not None
    assert listed["status"] == "out_of_service"
    assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)


def test_T_008_N10_CONC_borrow_restore_from_out_of_service(api) -> None:
    """Blueprint section 8, borrow / restore, from Out of service.

    The restore is carried out either way; the borrow only if it arrives after
    it. So the item ends On loan when both happened and Available when only the
    restore did -- and in neither case is a loan ever written to an item that is
    Out of service, which the invariant check asserts after every round.
    """
    for order, (first, second) in enumerate([("restore", "borrow"), ("borrow", "restore")]):
        item = api.out_of_service(f"Serial {order}")
        requests = {
            "borrow": lambda: api.borrow(api.MIA, item["id"]),
            "restore": lambda: api.restore(api.ADA, item["id"]),
        }
        answers = {first: requests[first](), second: requests[second]()}
        assert answers["restore"].carried_out, "the restore was not carried out"
        assert answers["borrow"].carried_out is (first == "restore"), (
            f"the borrow sent {'second' if first == 'restore' else 'first'} "
            "was not answered as the table says"
        )
        listed = api.read(item["id"])
        assert listed is not None
        if answers["borrow"].carried_out:
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
        else:
            assert listed["status"] == "available"
            assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)

    for round_number in range(ROUNDS):
        item = api.out_of_service(f"Together {round_number}")
        borrow_answer, restore_answer = api.release_together(
            lambda: api.borrow(api.MIA, item["id"]),
            lambda: api.restore(api.ADA, item["id"]),
        )
        assert restore_answer.carried_out, f"round {round_number}: the restore failed"
        listed = api.read(item["id"])
        assert listed is not None
        if borrow_answer.carried_out:
            assert listed["status"] == "on_loan"
            assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")
        else:
            assert listed["status"] == "available"
            assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)
        _one_borrower_at_most(api.listing(api.ADA))
