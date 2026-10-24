"""REQ-001 at the API: who the seeded users are, and what an unusable identity gets.

Frozen at the S2 freeze; read-only to every builder.

Three of the four rows here sweep every operation the API offers rather than
one of them, because the rule they check is not a rule of any route: blueprint
5.1 puts the identity check in one place, outermost, before routing, so a build
that applies it on seven routes and forgets the eighth is exactly the build
these rows exist to catch. The fourth row is their positive counterpart: the
three identities that are usable, and what they may read.

None of these rows reads a status code. "Nothing is returned to the caller" is
read as the answer carrying no content, and "nothing has changed" as the
equipment list and the user list read back exactly as before (eval plan 1.1).
"""


#: The malformed values an HTTP parser does deliver, so a row may claim them
#: over the wire. Blueprint 5.1: one to nine ASCII digits, nothing else; the
#: comparison is a full match, so a trailing character of any kind fails it.
WIRE_MALFORMED = [
    "",              # the header is there and carries no value
    "0",
    "01",            # a leading zero is not a user number
    "-1",
    "+2",
    "1.0",
    "1,2",           # two values folded into one, as a browser would fold them
    "abc",
    "1a",
    "1234567890",    # ten digits: longer than the form allows
]

#: The values no HTTP parser delivers (blueprint 5.1.1): a parser strips the
#: padding before the value is read, and a browser folds two headers into one.
#: They are delivered by the direct call into the application, and claimed
#: in-process only -- eval plan 9.2 records that no row claims them on the wire.
PADDED_MALFORMED = [" 1", "1 ", "1\t", "1\n"]

#: One identity carried twice. Malformed by blueprint 5.1(a), which reads the
#: raw header list, and likewise deliverable only in-process.
DOUBLED = ["1", "2"]


def test_T_001_P4_the_three_seeded_users_are_the_same_for_each_of_them(api) -> None:
    """The positive counterpart of T-001-N3, T-001-N4 and T-001-N7.

    It carries no labelled criterion: the seeded table is PRD section 3 and the
    usable identity is D-01, neither of which is a labelled criterion of
    REQ-001. Without it, a build that refused every identity would satisfy the
    three negative rows and nothing would notice.

    The expected users are written out here as literals, so a build that seeds
    somebody else cannot agree with itself.
    """
    expected = [
        {"id": 1, "name": "Ada Admin", "role": "admin"},
        {"id": 2, "name": "Mia Member", "role": "member"},
        {"id": 3, "name": "Sam Member", "role": "member"},
    ]
    for identity in (api.ADA, api.MIA, api.SAM):
        read = api.user_list(identity)
        assert read == expected, f"the user list read as {identity} is not the seeded one"


def test_T_001_N3_REQ_001_6_a_request_with_no_acting_identity_does_nothing(api) -> None:
    """Every operation, and a path the API does not define, with no identity.

    Five methods on each path, including the ones a route does not define: the
    check is outermost (blueprint 5.1), so a request with no identity is refused
    before anything else looks at it, whatever it asked for.
    """
    item = api.available("Switchboard")

    # First: the anchor. The list is readable and holds the item, so a build
    # that returns nothing to anybody could not pass the sweep below.
    before = api.listing(api.ADA)
    assert [entry["id"] for entry in before] == [item["id"]]
    users_before = api.user_list(api.ADA)

    paths = [path for _, path, _ in api.every_operation(item["id"])]
    paths.append(api.UNDEFINED_PATH)
    for path in paths:
        for method in ("GET", "POST", "PUT", "DELETE", "OPTIONS"):
            answer = api.send(method, path, identity=None)
            assert answer.answered_nothing, f"{method} {path} returned something"

    # Nothing changed: the item and the three users are as they were.
    assert api.listing(api.ADA) == before
    assert api.user_list(api.ADA) == users_before


def test_T_001_N4_REQ_001_8_an_identity_that_is_no_seeded_user_does_nothing(api) -> None:
    """Well-formed identities that belong to nobody: `4` and `999999999`.

    Both are of the form blueprint 5.1 accepts, so a build that only checks the
    shape of the value and never looks the user up passes every other row here
    and fails this one.
    """
    item = api.available("Ledger")

    # First: the anchor, as in T-001-N3.
    before = api.listing(api.ADA)
    assert [entry["id"] for entry in before] == [item["id"]]
    users_before = api.user_list(api.ADA)

    for identity in ("4", "999999999"):
        for method, path, body in api.every_operation(item["id"]):
            answer = api.send(method, path, identity=identity, body=body)
            assert answer.answered_nothing, (
                f"{method} {path} as {identity!r} returned something"
            )

    assert api.listing(api.ADA) == before
    assert api.user_list(api.ADA) == users_before


def test_T_001_N7_REQ_001_7_a_malformed_acting_identity_does_nothing(api) -> None:
    """Every malformed probe of blueprint 5.1.1, on every operation.

    The padded values and the doubled header go through the direct call into the
    application, because no HTTP parser delivers them (blueprint 5.1.1); the
    rest go over the wire. The anchor reads the list with the identity `1`,
    which is the same value the padded probes carry around their padding -- so
    a build that trims its header would pass the anchor and fail the probe,
    which is the point of asserting both in one case.
    """
    item = api.available("Caliper")

    # First: the anchor. The identity `1` reads the list and finds the item.
    before = api.listing("1")
    assert [entry["id"] for entry in before] == [item["id"]]
    users_before = api.user_list("1")

    operations = api.every_operation(item["id"])

    for raw in WIRE_MALFORMED:
        for method, path, body in operations:
            answer = api.send(method, path, identity=raw, body=body)
            assert answer.answered_nothing, (
                f"{method} {path} as {raw!r} returned something"
            )

    for values in [[padded] for padded in PADDED_MALFORMED] + [DOUBLED]:
        for method, path, body in operations:
            encoded = b"" if body is api.NO_BODY else _as_json(body)
            answer = api.direct(method, path, values, encoded)
            assert answer.answered_nothing, (
                f"{method} {path} with {values!r} returned something"
            )

    assert api.listing("1") == before
    assert api.user_list("1") == users_before


def _as_json(body) -> bytes:
    import json

    return json.dumps(body).encode()
