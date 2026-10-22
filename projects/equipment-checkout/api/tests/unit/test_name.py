"""REQ-009: what counts as an equipment name. Frozen at the S1 freeze.

Length is counted in Unicode code points, so a name built from characters
outside the Basic Multilingual Plane is measured the same way as an ASCII one.

The limit is written here as a literal, not read from the application. The
number *is* the requirement: REQ-009.10 and REQ-009.12 say 100, D-06 fixes it,
and D-22 pins the message "Name must be 100 characters or fewer." A test that
took the boundary from the build's own constant would pass whatever limit the
build chose, and so would certify a build that refuses names the requirement
says it must accept.
"""

import pytest

from app.rules import Invalid, normalise_name

LIMIT = 100  # REQ-009.10, REQ-009.12, D-06.
OVER = LIMIT + 1

ASTRAL = "\U0001D538"  # a single code point outside the Basic Multilingual Plane


def test_T_009_P7_REQ_009_12_a_name_at_the_limit_is_accepted_and_trimmed() -> None:
    # First: a short name is accepted.
    assert normalise_name("Tripod") == "Tripod"

    at_limit = "x" * LIMIT
    assert normalise_name(at_limit) == at_limit

    # A name shorter than the limit but longer than any plausible smaller limit
    # a build might choose: the requirement accepts it, so this test requires it.
    well_under = "x" * (LIMIT - 20)
    assert normalise_name(well_under) == well_under

    # The same name with whitespace around it is accepted and comes back trimmed,
    # so the surrounding space does not count towards the limit.
    assert normalise_name(f"  \t{at_limit} \t ") == at_limit

    # 100 code points outside the Basic Multilingual Plane is also at the limit.
    astral_at_limit = ASTRAL * LIMIT
    assert normalise_name(astral_at_limit) == astral_at_limit


def test_T_009_N10_REQ_009_6_REQ_009_10_an_empty_overlong_or_non_text_name_is_rejected() -> None:
    # First: a name of exactly the limit is accepted.
    at_limit = "x" * LIMIT
    assert normalise_name(at_limit) == at_limit

    rejected: list[object] = [
        "",                            # empty
        "   ",                         # only spaces
        "\t",                          # only a tab
        None,                          # not text at all
        42,                            # not text
        "x" * OVER,                    # one code point too long
        f"  {'x' * OVER}  ",           # still too long once trimmed
        ASTRAL * OVER,                 # too long, counted in code points
    ]
    for raw in rejected:
        with pytest.raises(Invalid):
            normalise_name(raw)
