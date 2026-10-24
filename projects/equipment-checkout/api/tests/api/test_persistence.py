"""REQ-016 at the API: the seed, and what survives a stop and a start.

Frozen at the S2 freeze; read-only to every builder.

These rows own the seed's tests although S1 delivers ``db.seed`` and
``db.initialise``: the seed is observable only once start-up wires it, which is
S2's work (blueprint 9.2). "The application is stopped and started again" is
done here by leaving ``with TestClient(app)`` and entering it again on the same
database, which runs the application's whole lifespan each time; the tables are
not dropped in between. A restart of the database itself is T-016-P4, in the
journey rows, where a stack can really be taken down.

REQ-016.1 and REQ-016.3 speak of the switcher. The switcher's entries are a
constant of the client (DD-07), because the list cannot be fetched before an
identity exists, so what these rows observe is the users the application really
holds; that the client's constant equals them is checked on the real stack by
T-016-P3 and T-016-N3.
"""

SEEDED = [
    {"id": 1, "name": "Ada Admin", "role": "admin"},
    {"id": 2, "name": "Mia Member", "role": "member"},
    {"id": 3, "name": "Sam Member", "role": "member"},
]


def _without_ids(listing) -> list[tuple]:
    """A listing as name, status and borrower, which is what persists."""
    return [
        (entry["name"], entry["status"], entry["borrowerId"], entry["borrowerName"])
        for entry in listing
    ]


def test_T_016_P1_REQ_016_1_the_first_start_seeds_three_people(api) -> None:
    """An empty database, one start: exactly one admin and two members.

    The three are written out as literals, so a build that seeds somebody else,
    or seeds four, cannot agree with itself.
    """
    assert api.user_list(api.ADA) == SEEDED
    roles = [entry["role"] for entry in api.user_list(api.ADA)]
    assert roles.count("admin") == 1
    assert roles.count("member") == 2


def test_T_016_P2_REQ_016_2_committed_changes_survive_a_restart(application) -> None:
    """Five items in five different states, then a stop and a start.

    The states are chosen so that each kind of committed change is represented:
    an add that stands, an add that was deleted, a status change, a loan that is
    still out, and a loan that came back. A build that rebuilt its state from
    nothing on each start would pass none of them.
    """
    with application.running() as api:
        kept = api.available("A")
        removed = api.available("B")
        marked = api.available("C")
        lent = api.available("D")
        returned = api.available("E")
        assert api.delete(api.ADA, removed["id"]).carried_out
        assert api.mark_out_of_service(api.ADA, marked["id"]).carried_out
        assert api.borrow(api.ADA, lent["id"], borrower=api.MIA).carried_out
        assert api.borrow(api.ADA, returned["id"], borrower=api.SAM).carried_out
        assert api.return_item(api.ADA, returned["id"]).carried_out
        before = api.listing(api.ADA)

    with application.running() as api:
        after = api.listing(api.ADA)
        assert after == before

        names = {entry["name"]: entry for entry in after}
        assert "A" in names
        assert "B" not in names
        assert names["C"]["status"] == "out_of_service"
        assert names["D"]["status"] == "on_loan"
        assert (names["D"]["borrowerId"], names["D"]["borrowerName"]) == (2, "Mia Member")
        assert names["E"]["status"] == "available"
        assert (names["E"]["borrowerId"], names["E"]["borrowerName"]) == (None, None)
        assert kept["id"] == names["A"]["id"]


def test_T_016_N1_REQ_016_3_the_seed_may_run_again_and_again(application) -> None:
    """The committed changes of T-016-P2, then two more starts.

    Three start-ups on one database. A seed that inserted unconditionally would
    fail on the second, and one that inserted by name or without fixed ids would
    leave duplicates for this row to find.
    """
    with application.running() as api:
        api.available("A")
        removed = api.available("B")
        marked = api.available("C")
        lent = api.available("D")
        returned = api.available("E")
        assert api.delete(api.ADA, removed["id"]).carried_out
        assert api.mark_out_of_service(api.ADA, marked["id"]).carried_out
        assert api.borrow(api.ADA, lent["id"], borrower=api.MIA).carried_out
        assert api.borrow(api.ADA, returned["id"], borrower=api.SAM).carried_out
        assert api.return_item(api.ADA, returned["id"]).carried_out
        before = api.listing(api.ADA)
        assert api.user_list(api.ADA) == SEEDED

    for start in (2, 3):
        with application.running() as api:
            users = api.user_list(api.ADA)
            assert users == SEEDED, f"start {start} left the wrong users"
            assert len({entry["id"] for entry in users}) == 3, f"start {start}: a duplicate"
            assert len({entry["name"] for entry in users}) == 3
            assert api.listing(api.ADA) == before, f"start {start} lost the equipment"


def test_T_016_N2_REQ_016_2_what_was_not_carried_out_leaves_nothing_behind(
    application,
) -> None:
    """A delete and a borrow that were not carried out, then a restart.

    Both were refused for the state they met, and both are the kind of request a
    build might begin before it checks: a transaction left half open, or a write
    rolled back in the application and not in the database, would show up after
    a restart as a loan that moved or an item that went missing.
    """
    with application.running() as api:
        loaned = api.on_loan("Held item", borrower=api.MIA, by=api.MIA)
        api.available("Untouched item")
        before = api.listing(api.ADA)

        assert not api.delete(api.ADA, loaned["id"]).carried_out
        assert not api.borrow(api.SAM, loaned["id"]).carried_out
        assert api.listing(api.ADA) == before

    with application.running() as api:
        # First: the item is found, and found on loan to the person who had it.
        listed = api.read(loaned["id"])
        assert listed is not None, "the item is gone after the restart"
        assert listed["status"] == "on_loan"
        assert (listed["borrowerId"], listed["borrowerName"]) == (2, "Mia Member")
        assert api.listing(api.ADA) == before
        assert _without_ids(api.listing(api.ADA)) == _without_ids(before)
