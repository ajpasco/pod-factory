"""Frozen at the S1 freeze. Read-only to every builder.

This file is imported for every pytest tree, so it holds only what is safe
everywhere: the convention that ties a case to its eval-plan row.

It imports nothing from ``app`` and defines no fixture that touches a database.
That is deliberate. The unit tree must fail on the baseline with a collection
error raised by the test modules themselves, and the db tree must fail with a
setup error raised inside its own fixtures. If this file reached for ``app`` or
a database, every tree would fail for the same reason and the reports could no
longer tell the three mechanisms apart.
"""

import re

import pytest

#: A case's name carries its eval-plan row and then the labels of the criteria
#: that row checks (DD-24), in the underscore spelling a Python identifier
#: allows: ``test_T_008_N4_REQ_008_2_REQ_008_3_an_on_loan_item``. The hyphenated
#: forms the eval plan and the verification register use are recovered below and
#: written into the JUnit report as properties, so the report can be read by row
#: and by criterion without anyone having to transliterate a function name.
TITLE = re.compile(
    r"^test_T_(?P<req>\d{3})_(?P<sense>[PN])(?P<index>\d+)"
    r"(?P<labels>(?:_REQ_\d{3}_\d+)*)"
    r"(?:_|$)"
)
LABEL = re.compile(r"_REQ_(\d{3})_(\d+)")


def row_id_of(test_name: str) -> str | None:
    """Return the canonical row id a test function name carries, or None."""
    found = TITLE.match(test_name)
    if found is None:
        return None
    return f"T-{found['req']}-{found['sense']}{found['index']}"


def criteria_of(test_name: str) -> list[str]:
    """Return the canonical criterion labels a test function name carries."""
    found = TITLE.match(test_name)
    if found is None:
        return []
    return [f"REQ-{req}.{m}" for req, m in LABEL.findall(found["labels"])]


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Refuse a suite holding a case that names no eval-plan row.

    The freeze requires a passing case titled with each row's id. A case whose
    name carries no row id can never satisfy a row, and would be invisible when
    the report is read, so its presence is a fault in the suite itself. The row
    id must open the name: an id buried later in it is not a title.

    Each case's row and criteria are also recorded as JUnit properties, in the
    eval plan's own spelling, because that is what the verification register
    reads as a criterion's evidence.
    """
    untitled = [item.nodeid for item in items if row_id_of(item.name) is None]
    if untitled:
        listed = "\n  ".join(untitled)
        raise pytest.UsageError(
            "every case must be titled with its eval-plan row id, which must "
            f"open the name (test_T_000_P0_...). These are not:\n  {listed}"
        )
    for item in items:
        item.user_properties.append(("row", row_id_of(item.name)))
        for label in criteria_of(item.name):
            item.user_properties.append(("criterion", label))
