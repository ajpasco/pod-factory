"""REQ-009 at the API: adding equipment, and the names the server will not take.

Frozen at the S2 freeze; read-only to every builder.

The hundred-character bound is written here as the literal 100, never read from
the application: a build with the wrong bound must fail these rows rather than
agree with itself. The PRD says "characters" and DD-21 reads that as Unicode
code points; the counting of characters outside the basic plane is checked at
the rules layer, by T-009-P7 and T-009-N10, which can put a name in front of
the bound without an HTTP request in the way.

What the person sees when a name is refused -- the inline validation message,
and that no modal opens -- is REQ-009.11 and REQ-009.8, and no row here carries
them: they are asserted in the C and B rows, where they can be seen. These rows
assert the outcome: the Add was not carried out and no item was created.
"""

#: Blueprint section 8 asks for twenty rounds released together, per pair.
ROUNDS = 20

#: The bound, as a literal (REQ-009.10, REQ-009.12, D-06).
NAME_LIMIT = 100


def test_T_009_P4_REQ_009_2_an_admin_adds_an_item(api) -> None:
    answer = api.add(api.ADA, "Projector")

    assert answer.carried_out, "the Add was not carried out"
    listed = [entry for entry in api.listing(api.ADA) if entry["name"] == "Projector"]
    assert len(listed) == 1
    assert listed[0]["status"] == "available"
    assert (listed[0]["borrowerId"], listed[0]["borrowerName"]) == (None, None)


def test_T_009_P8_REQ_009_12_a_name_of_exactly_a_hundred_characters_is_taken(api) -> None:
    """The boundary from the inside. A build with an off-by-one bound fails here."""
    name = "N" * NAME_LIMIT
    assert len(name) == 100

    answer = api.add(api.ADA, name)

    assert answer.carried_out, "the Add of a hundred-character name was not carried out"
    listed = [entry for entry in api.listing(api.ADA) if entry["name"] == name]
    assert len(listed) == 1
    assert listed[0]["status"] == "available"


def test_T_009_N5_REQ_009_6_an_empty_or_whitespace_name_is_not_a_name(api) -> None:
    """D-13: whitespace only is an empty name, so neither is added."""
    # First: a valid name is carried out and appears, so a build that refused
    # every Add could not pass this case.
    assert api.add(api.ADA, "A real name").carried_out
    before = api.listing(api.ADA)
    assert [entry["name"] for entry in before] == ["A real name"]

    for name in ("", "   \t "):
        answer = api.add(api.ADA, name)
        assert not answer.carried_out, f"the Add of {name!r} was carried out"
        assert api.listing(api.ADA) == before, f"the Add of {name!r} changed the list"


def test_T_009_N7_REQ_009_10_a_name_over_the_bound_is_not_taken(api) -> None:
    """One character over, plain and padded. Trimming happens before counting.

    The padded one is the one that catches a build which counts before it trims:
    it would see far more than 101 either way, so the version that matters is
    the plain one at exactly 101. Both are sent, because a build that trims
    after counting refuses a padded name that should have been accepted, and
    T-009-P8's padded counterpart lives at the rules layer (T-009-P7).
    """
    # First: the anchor, a name of exactly a hundred characters, is carried out.
    allowed = "A" * NAME_LIMIT
    assert api.add(api.ADA, allowed).carried_out
    before = api.listing(api.ADA)
    assert [entry["name"] for entry in before] == [allowed]

    too_long = "B" * (NAME_LIMIT + 1)
    assert len(too_long) == 101
    for name in (too_long, f"   {too_long}   "):
        answer = api.add(api.ADA, name)
        assert not answer.carried_out, f"the Add of a {len(name)}-character name was carried out"
        assert api.listing(api.ADA) == before, "an over-long name created an item"


def test_T_009_N9_REQ_009_9_a_name_an_item_already_has_is_taken_again(api) -> None:
    """D-10: duplicate names are allowed, and the second item is its own item."""
    first = api.available("Projector")

    answer = api.add(api.ADA, "Projector")

    assert answer.carried_out, "the second Add of the same name was not carried out"
    listed = [entry for entry in api.listing(api.ADA) if entry["name"] == "Projector"]
    assert len(listed) == 2
    assert len({entry["id"] for entry in listed}) == 2
    newcomer = next(entry for entry in listed if entry["id"] != first["id"])
    assert newcomer["status"] == "available"
    assert (newcomer["borrowerId"], newcomer["borrowerName"]) == (None, None)


def test_T_009_N12_CONC_add_add_two_adds_of_one_name(api) -> None:
    """Blueprint section 8, add / add: two adds make two items.

    The pair the blueprint ties to no criterion, so the title carries the pair
    and no label. Unlike every other pair, both requests are carried out: an Add
    contends for no existing item, and D-10 allows the duplicate name.
    """
    for order in (0, 1):
        name = f"Serial {order}"
        first_answer = api.add(api.ADA, name)
        second_answer = api.add(api.ADA, name)
        assert first_answer.carried_out and second_answer.carried_out
        listed = [entry for entry in api.listing(api.ADA) if entry["name"] == name]
        assert len(listed) == 2
        assert len({entry["id"] for entry in listed}) == 2

    for round_number in range(ROUNDS):
        name = f"Together {round_number}"
        first_answer, second_answer = api.release_together(
            lambda: api.add(api.ADA, name),
            lambda: api.add(api.ADA, name),
        )
        assert first_answer.carried_out, f"round {round_number}: the first Add failed"
        assert second_answer.carried_out, f"round {round_number}: the second Add failed"
        listed = [entry for entry in api.listing(api.ADA) if entry["name"] == name]
        assert len(listed) == 2, f"round {round_number}: {len(listed)} items carry the name"
        assert len({entry["id"] for entry in listed}) == 2
