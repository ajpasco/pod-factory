"""REQ-007 at the API: the five actions a member may not take.

Frozen at the S2 freeze; read-only to every builder.

These are the "forced attempts" of the PRD: at this mechanism, a request made
straight to the API carrying a member's identity (eval plan 1.3). Five rows
take the five actions one at a time, which is the whole reason they exist: at
the rules layer four of them pass through one admin-only gate and cannot be
told apart (see the note in `tests/unit/test_permissions.py`), so only a row
that drives each route separately can catch a build that wires the gate into
three routes and forgets the fourth.

T-007-N9 adds the case the five do not cover. Each of its requests would fail
for a second reason even if a member were allowed to make it -- an empty name,
an item on loan, an item that is not there, an item in the wrong state -- so a
build that checks the reason before it checks who is asking still refuses them;
what the row asserts is that nothing happens, which is what the PRD says.

Which modal a person sees for each of these is REQ-007.6, and no row here
carries it: it is asserted where it can be seen, in the C, B and J rows.
"""


def test_T_007_N1_REQ_007_1_a_member_may_not_return_another_members_loan(api) -> None:
    first = api.on_loan("Zoom lens", borrower=api.MIA, by=api.MIA)
    second = api.on_loan("Wide lens", borrower=api.MIA, by=api.MIA)

    # First: Mia's own return of the second item is carried out.
    assert api.return_item(api.MIA, second["id"]).carried_out
    listed = api.read(second["id"])
    assert listed is not None and listed["status"] == "available"

    answer = api.return_item(api.SAM, first["id"])

    assert not answer.carried_out, "Sam's return of Mia's loan was carried out"
    listed = api.read(first["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_007_N2_REQ_007_2_a_member_may_not_delete_an_item(api) -> None:
    first = api.available("Charger")
    second = api.available("Cable")

    # First: Ada's delete of the second item is carried out and it is gone.
    assert api.delete(api.ADA, second["id"]).carried_out
    assert api.read(second["id"]) is None

    answer = api.delete(api.MIA, first["id"])

    assert not answer.carried_out, "Mia's delete was carried out"
    assert api.read(first["id"]) is not None


def test_T_007_N3_REQ_007_3_a_member_may_not_add_equipment(api) -> None:
    name = "Member's addition"
    # First: an Add by Ada is carried out and the list is of a known size, so a
    # build with no working Add at all could not pass this case.
    already = api.available("Something already here")
    before = api.listing(api.ADA)
    assert [entry["id"] for entry in before] == [already["id"]]

    answer = api.add(api.MIA, name)

    assert not answer.carried_out, "Mia's add was carried out"
    after = api.listing(api.ADA)
    assert [entry["name"] for entry in after].count(name) == 0
    assert len(after) == len(before)

    # The row's own anchor: the same name, added by Ada, appears Available. It
    # comes after the refusal because it is the same name, and adding it first
    # would leave "no item with that name exists" nothing to say.
    assert api.add(api.ADA, name).carried_out
    added = [entry for entry in api.listing(api.ADA) if entry["name"] == name]
    assert len(added) == 1
    assert added[0]["status"] == "available"
    assert (added[0]["borrowerId"], added[0]["borrowerName"]) == (None, None)


def test_T_007_N4_REQ_007_4_a_member_may_not_mark_an_item_out_of_service(api) -> None:
    first = api.available("Stand")
    second = api.available("Sandbag")

    # First: Ada's request for the second item is carried out.
    assert api.mark_out_of_service(api.ADA, second["id"]).carried_out
    listed = api.read(second["id"])
    assert listed is not None and listed["status"] == "out_of_service"

    answer = api.mark_out_of_service(api.MIA, first["id"])

    assert not answer.carried_out, "Mia's mark out of service was carried out"
    listed = api.read(first["id"])
    assert listed is not None
    assert listed["status"] == "available"


def test_T_007_N5_REQ_007_5_a_member_may_not_restore_an_item(api) -> None:
    first = api.out_of_service("Broken tripod")
    second = api.out_of_service("Broken clamp")

    # First: Ada's request for the second item is carried out.
    assert api.restore(api.ADA, second["id"]).carried_out
    listed = api.read(second["id"])
    assert listed is not None and listed["status"] == "available"

    answer = api.restore(api.MIA, first["id"])

    assert not answer.carried_out, "Mia's restore was carried out"
    listed = api.read(first["id"])
    assert listed is not None
    assert listed["status"] == "out_of_service"


def test_T_007_N9_REQ_007_2_REQ_007_3_REQ_007_4_REQ_007_5_a_member_is_refused_whatever_else_is_wrong(
    api,
) -> None:
    """Four admin-only requests by a member, each also wrong for a second reason.

    An empty name, a delete of an item on loan, a mark of an item that is not
    there, a restore of an item that is Available. Whichever reason a build
    checks first, none of the four may happen and nothing may change.
    """
    loaned = api.on_loan("Battery plate", borrower=api.MIA, by=api.MIA)
    spare = api.available("Follow focus")
    marked = api.out_of_service("Matte box")
    before = api.listing(api.ADA)
    assert len(before) == 3

    for description, request in [
        ("an add with an empty name", lambda: api.add(api.MIA, "")),
        ("a delete of the loaned item", lambda: api.delete(api.MIA, loaned["id"])),
        (
            "a mark of an item that is not there",
            lambda: api.mark_out_of_service(api.MIA, api.MISSING_ITEM_ID),
        ),
        ("a restore of an Available item", lambda: api.restore(api.MIA, spare["id"])),
    ]:
        answer = request()
        assert not answer.carried_out, f"Mia's {description} was carried out"

    # Nothing was created and the three items are as they were.
    assert api.listing(api.ADA) == before
    assert {entry["id"] for entry in before} == {loaned["id"], spare["id"], marked["id"]}

    # The anchor: Ada's add of a valid name is carried out and appears Available.
    name = "Admin's addition"
    assert api.add(api.ADA, name).carried_out
    added = [entry for entry in api.listing(api.ADA) if entry["name"] == name]
    assert len(added) == 1
    assert added[0]["status"] == "available"
