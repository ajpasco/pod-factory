"""REQ-003 at the API: a member borrows for themselves, and only for themselves.

Frozen at the S2 freeze; read-only to every builder.

The three rows here are the outcome of the request, never the row the page
draws: "On loan to Mia Member" is asserted as the status and the borrower the
list holds, which is the data the page renders (eval plan 1.1, the bracket
rule). What the row reads is checked by the C rows of S3.
"""


def test_T_003_P4_REQ_003_4_a_member_borrows_for_herself(api) -> None:
    """Mia's own identity, naming nobody: the member form of the request."""
    item = api.available("Camera")

    answer = api.borrow(api.MIA, item["id"])

    assert answer.carried_out, "Mia's Borrow for herself was not carried out"
    listed = api.read(item["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_003_P7_REQ_003_8_no_limit_applies_to_what_one_member_holds(api) -> None:
    """Five in a row, for herself. D-05: there is no limit, so none appears here."""
    items = [api.available(f"Tripod {number}") for number in range(1, 6)]

    for item in items:
        answer = api.borrow(api.MIA, item["id"])
        assert answer.carried_out, f"the Borrow of item {item['id']} was not carried out"

    listed = api.listing(api.ADA)
    assert len(listed) == 5
    for entry in listed:
        assert entry["status"] == "on_loan"
        assert (entry["borrowerId"], entry["borrowerName"]) == (api.MIA, "Mia Member")


def test_T_003_N2_REQ_003_6_a_member_may_name_nobody_but_herself(api) -> None:
    """Sam, Ada and an id that is nobody: each named by Mia, each not carried out.

    An unknown id is in the list on purpose. Blueprint 5.3 fixes the order of
    checks, so a build that looks the named user up before it asks whether a
    member may name anyone at all would answer this one differently -- and the
    PRD does not: whoever is named, a member naming somebody else is refused
    (REQ-003.6, D-07).
    """
    contested = api.available("Microphone")
    other = api.available("Boom pole")

    # First: Mia naming her own id is carried out, so a build that refused
    # every Borrow could not pass this case.
    anchor = api.borrow(api.MIA, other["id"], borrower=api.MIA)
    assert anchor.carried_out, "Mia's Borrow naming her own id was not carried out"
    held = api.read(other["id"])
    assert held is not None
    assert held["status"] == "on_loan"
    assert (held["borrowerId"], held["borrowerName"]) == (api.MIA, "Mia Member")

    for named in (api.SAM, api.ADA, 999):
        answer = api.borrow(api.MIA, contested["id"], borrower=named)
        assert not answer.carried_out, f"Mia's Borrow naming {named} was carried out"
        listed = api.read(contested["id"])
        assert listed is not None
        assert listed["status"] == "available"
        assert (listed["borrowerId"], listed["borrowerName"]) == (None, None)
