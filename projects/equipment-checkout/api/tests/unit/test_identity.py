"""REQ-001, the acting identity. Frozen at the S1 freeze; read-only to every builder.

The rules module is imported at module level. Before the application exists this
raises ModuleNotFoundError and pytest reports a collection error for this module,
which is how every row here reads `fails` on the baseline.
"""

import pytest

from app.rules import IdentityError, parse_user_id

ACCEPTED = ["1", "2", "3", "999999999"]

REFUSED = [
    [],                     # missing altogether
    ["1", "2"],             # carried twice
    [""],
    ["0"],
    ["01"],                 # a leading zero is not a user number
    ["-1"],
    ["+2"],
    ["1.0"],
    [" 1"],                 # a surrounding space is not trimmed away
    ["1 "],
    ["1\t"],
    ["1\n"],
    ["1,2"],                # two values folded into one
    ["abc"],
    ["1a"],
    ["1234567890"],         # ten digits: longer than the form allows
]


def test_T_001_N6_REQ_001_7_only_a_plain_user_number_is_an_acting_identity() -> None:
    # First: the values that must be accepted, so a refusal of everything
    # cannot make this case pass.
    for raw in ACCEPTED:
        assert parse_user_id([raw]) == int(raw), f"{raw!r} should be an acting identity"

    for raw_values in REFUSED:
        with pytest.raises(IdentityError):
            parse_user_id(raw_values)
