"""REQ-012.16 at the API: an action on an item that is no longer there.

Frozen at the S2 freeze; read-only to every builder.

The modal the person sees is REQ-012.6 and is not carried here; what an I row
can say is that the action does not happen and that nothing changes, including
that the deleted item does not come back (eval plan 1.1).
"""


def test_T_012_N8_REQ_012_16_an_action_on_an_item_that_is_not_there(api) -> None:
    """Five actions, each against a deleted item and against an id that never was.

    The two cases are kept apart on purpose: an id that never existed catches a
    build that looks nothing up, and an id that did exist catches one that keeps
    a deleted item somewhere and can still act on it.
    """
    deleted = api.available("Gone")
    spare = api.available("Still here")
    assert api.delete(api.ADA, deleted["id"]).carried_out
    assert api.read(deleted["id"]) is None

    # First: Mia's Borrow of the Available item is carried out, so a build that
    # refused every request could not pass this case.
    assert api.borrow(api.MIA, spare["id"]).carried_out
    listed = api.read(spare["id"])
    assert listed is not None
    assert listed["status"] == "on_loan"
    assert (listed["borrowerId"], listed["borrowerName"]) == (api.MIA, "Mia Member")

    before = api.listing(api.ADA)

    for item_id, description in (
        (deleted["id"], "the deleted item"),
        (api.MISSING_ITEM_ID, "an id that never existed"),
    ):
        requests = [
            ("a Borrow by Mia", lambda: api.borrow(api.MIA, item_id)),
            ("a Return by Ada", lambda: api.return_item(api.ADA, item_id)),
            ("a Delete by Ada", lambda: api.delete(api.ADA, item_id)),
            (
                "a Mark out of service by Ada",
                lambda: api.mark_out_of_service(api.ADA, item_id),
            ),
            ("a Restore by Ada", lambda: api.restore(api.ADA, item_id)),
        ]
        for what, request in requests:
            answer = request()
            assert not answer.carried_out, f"{what} for {description} was carried out"

    # Nothing was created or changed, and the deleted item has not reappeared.
    assert api.listing(api.ADA) == before
    assert api.read(deleted["id"]) is None
