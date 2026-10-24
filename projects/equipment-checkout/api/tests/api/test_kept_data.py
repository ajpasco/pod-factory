"""REQ-017 at the API: nothing is kept or shown that the PRD does not describe.

Frozen at the S2 freeze; read-only to every builder.

This is the kept-data check KD of blueprint 4.1.2, and it is the restraint row
of two surfaces at once (eval plan section 6): the HTTP API, read as each of the
three users, and the data store, read as a dump. Both are read without naming a
table or a column -- the reader in ``conftest.py`` asks the database's own
catalogue what exists -- so a build that keeps a due date in a third table is
caught as surely as one that keeps it in a sixth column.

The check is stated as a closed set of values rather than as a list of things
that must not be there: every value the application keeps or shows must be an
item's id, name, status or borrower, or a user's id, name or role. A date, a
time, an address, a note, a reminder's next-due stamp -- anything at all that is
none of those -- fails it, including a kind of value nobody thought to forbid.

The last part is the history check. A Borrow followed by its Return, and a Mark
followed by its Restore, must leave the dump exactly as it was: a build keeping
any trace of a finished loan has a dump that grew.
"""


def _values_of(payload) -> list:
    """Every value anywhere in an answer, with no field name attached."""
    if isinstance(payload, dict):
        return [value for held in payload.values() for value in _values_of(held)]
    if isinstance(payload, list):
        return [value for held in payload for value in _values_of(held)]
    return [payload]


def test_T_017_N7_REQ_017_3_REQ_017_4_REQ_017_5_REQ_017_6_nothing_else_is_kept_or_shown(
    api,
) -> None:
    # Every write operation, each as the role allowed to make it.
    kept = api.available("Kept item")
    loaned = api.available("Loaned item")
    marked = api.available("Marked item")
    deleted = api.available("Deleted item")
    assert api.borrow(api.ADA, loaned["id"], borrower=api.MIA).carried_out
    assert api.mark_out_of_service(api.ADA, marked["id"]).carried_out
    assert api.restore(api.ADA, marked["id"]).carried_out
    assert api.mark_out_of_service(api.ADA, marked["id"]).carried_out
    assert api.delete(api.ADA, deleted["id"]).carried_out
    returned = api.available("Returned item")
    assert api.borrow(api.MIA, returned["id"]).carried_out
    assert api.return_item(api.MIA, returned["id"]).carried_out

    # First: the dump holds the three seeded users and the items that were
    # exercised, so a build with an empty store could not pass what follows.
    dump = api.dump()
    for user_id, name, role in api.SEEDED_USERS:
        holders = dump.records_holding(name)
        assert len(holders) == 1, f"the dump does not hold {name} exactly once"
        assert user_id in holders[0].values
        assert role in holders[0].values
    listing = api.listing(api.ADA)
    assert {entry["name"] for entry in listing} == {
        "Kept item",
        "Loaned item",
        "Marked item",
        "Returned item",
    }
    for entry in listing:
        assert dump.records_holding(entry["name"]), f"{entry['name']} is not in the dump"

    # (a) Every value in the dump, and in every answer, is one of the values the
    # PRD describes.
    allowed = {None}
    for entry in listing:
        allowed |= {
            entry["id"],
            entry["name"],
            entry["status"],
            entry["borrowerId"],
            entry["borrowerName"],
        }
    for user_id, name, role in api.SEEDED_USERS:
        allowed |= {user_id, name, role}

    for value in dump.values:
        assert value in allowed, f"the store keeps {value!r}, which the PRD does not describe"

    for identity in (api.ADA, api.MIA, api.SAM):
        for shown in _values_of(api.listing(identity)) + _values_of(api.user_list(identity)):
            assert shown in allowed, (
                f"the answers to {identity} show {shown!r}, which the PRD does not describe"
            )

    # (b) A finished loan, and a finished spell out of service, leave no trace.
    before_loan = api.dump().as_compared()
    assert api.borrow(api.SAM, kept["id"]).carried_out
    assert api.return_item(api.SAM, kept["id"]).carried_out
    assert api.dump().as_compared() == before_loan, "a finished loan left something behind"

    before_mark = api.dump().as_compared()
    assert api.mark_out_of_service(api.ADA, kept["id"]).carried_out
    assert api.restore(api.ADA, kept["id"]).carried_out
    assert api.dump().as_compared() == before_mark, (
        "a finished spell out of service left something behind"
    )
