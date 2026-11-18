"""Black-box tests for check_contract_needs.py from REQ_REL_NEEDSCHECK AC-2..AC-6 (Tester).

Run: python -m unittest discover scripts
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check_contract_needs as check  # noqa: E402

TEMPLATE_VALIDATION = (
    "## User Validation\n\n**Owner:** User<br>\n**Recorded by:** Project Manager<br>\n"
    "**Status:** {status}\n\n| Validation | Observation | Date |\n|---|---|---|\n{rows}\n\n"
    "**Decision:** {decision}\n\n## Closure\n"
)


def validation(status, decision, named=("AC_X",)):
    rows = "\n".join(f"| {n} | seen | 2026-11-18 |" for n in named)
    return TEMPLATE_VALIDATION.format(status=status, decision=decision, rows=rows)


def violations(contract_text, head=None):
    head = head or {"AC_X": {"type": "ac", "status": "verified", "content": "c"}}
    return check.evaluate({}, head, contract_text)


class UserValidationDecision(unittest.TestCase):
    """AC-5: accepted, or the User's explicit delegation. Anything else must be reported."""

    def test_accepted_with_the_status_line_ending_in_br(self):
        self.assertEqual(violations(validation("accepted<br>", "accepted")), [])

    def test_unfilled_template_is_not_a_decision(self):
        template = validation(
            "pending | accepted | changes requested | not applicable",
            "{accepted | changes requested | explicit User delegation from the artifact row}",
        )
        self.assertEqual(len(violations(template)), 1)

    def test_changes_requested_is_not_accepted_even_when_the_decision_mentions_delegation(self):
        for decision in (
            "changes requested: the User did not delegate",
            "no delegation was given",
            "not delegated",
        ):
            with self.subTest(decision=decision):
                self.assertEqual(
                    len(violations(validation("changes requested", decision))), 1, decision
                )

    def test_not_accepted_is_not_accepted(self):
        self.assertEqual(len(violations(validation("pending", "not accepted"))), 1)

    def test_a_filled_delegation_is_accepted(self):
        self.assertEqual(
            violations(validation("not applicable", "explicit User delegation recorded in the artifact row")),
            [],
        )


class NamedInValidation(unittest.TestCase):
    def test_a_prefix_of_a_named_id_does_not_name_the_need(self):
        head = {"AC_X": {"type": "ac", "status": "verified", "content": "c"}}
        self.assertEqual(len(violations(validation("accepted", "accepted", named=("AC_X_LONGER",)), head)), 1)

    def test_no_user_validation_section_reports_every_story_and_ac(self):
        head = {
            "AC_X": {"type": "ac", "status": "verified", "content": "c"},
            "US_Y": {"type": "story", "status": "verified", "content": "c"},
        }
        out = check.evaluate({}, head, "# Contract\n\n## Closure\n")
        self.assertEqual([line.split(":")[0] for line in out], ["AC_X", "US_Y"])

    def test_every_violation_names_the_need_and_the_criterion(self):
        head = {"US_Y": {"type": "story", "status": "draft", "content": "c"}}
        out = check.evaluate({}, head, validation("pending", "x", named=()))
        self.assertTrue(all(line.startswith("US_Y: REQ_REL_NEEDSCHECK AC-") for line in out))
        self.assertEqual({line.split(": ")[1][:24] for line in out}, {"REQ_REL_NEEDSCHECK AC-3", "REQ_REL_NEEDSCHECK AC-4"})


if __name__ == "__main__":
    unittest.main()
