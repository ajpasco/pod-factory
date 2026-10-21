"""REQ-007: the five actions a member may not take. Frozen at the S1 freeze.

The row's sentence names five actions and the row brackets five criteria, but at
mechanism U four of them are one decision. The pinned interface routes delete,
add, mark out of service and restore through a single ``require_admin`` gate
that takes no operation, so nothing at this level can observe which operation
called it: one assertion is the honest U evidence for all four, and it is made
once here rather than four times with the same arguments. The four are told
apart by the S2 rows T-007-N2 to T-007-N5, which drive the API; the register
(eval plan 5.1) names both mechanisms for each criterion.
"""

import pytest

from app.rules import Actor, Forbidden, Item, check_return, require_admin

ADMIN = Actor(id=1, name="Ada Admin", role="admin")
MIA = Actor(id=2, name="Mia Member", role="member")
SAM = Actor(id=3, name="Sam Member", role="member")

ON_LOAN_TO_MIA = Item(
    id=10, name="Tripod", status="on_loan", borrower_id=MIA.id, borrower_name=MIA.name
)


def test_T_007_N6_REQ_007_1_REQ_007_2_REQ_007_3_REQ_007_4_REQ_007_5_a_member_is_refused_the_five_admin_actions() -> None:
    # First: an admin is allowed both the return of another's loan and the
    # admin-only gate, and a borrower may return their own loan. Without this
    # the case would pass if everything were refused.
    assert check_return(ADMIN, ON_LOAN_TO_MIA) is None     # return another's loan
    assert require_admin(ADMIN) is None                     # the admin-only gate
    assert check_return(MIA, ON_LOAN_TO_MIA) is None        # borrower returns own loan

    # Returning a loan that is not the member's own.
    with pytest.raises(Forbidden):
        check_return(SAM, ON_LOAN_TO_MIA)

    # Deleting, adding, marking out of service and restoring are all admin-only,
    # and at this level they are one gate, asserted once.
    with pytest.raises(Forbidden):
        require_admin(SAM)
