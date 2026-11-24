"""Unit tests for check_contract_needs.py (SPEC_REL_NEEDSCHECK AC-4).

Run: python -m unittest discover scripts
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check_contract_needs as check  # noqa: E402


def need(type_, status, content="text"):
    return {"type": type_, "status": status, "content": content}


def contract(status="accepted", decision="accepted", named=(), executed=()):
    rows = "\n".join(f"| {n} | seen | 2026-11-18 |" for n in named)
    runs = "\n".join(f"| {n} | run | pass |" for n in executed)
    return (
        "## Quality Review\n\n**Status:** proceed\n\n"
        "### Applied Review Methods\n\n| Method | Scope |\n|---|---|\n| x | US_IGNORED |\n\n"
        f"### Test Execution\n\n| Test | Command | Result |\n|---|---|---|\n{runs}\n\n"
        "## User Validation\n\n"
        f"**Status:** {status}\n\n"
        "| Validation | Observation | Date |\n|---|---|---|\n"
        f"{rows}\n\n**Decision:** {decision}\n\n"
        "## Closure\n\n**Status:** pending\n"
    )


def run_cli(base, head, contract_text):
    with tempfile.TemporaryDirectory() as tmp:
        paths = {}
        for name, needs in (("base", base), ("head", head)):
            paths[name] = Path(tmp) / f"{name}.json"
            paths[name].write_text(
                json.dumps({"current_version": "", "versions": {"": {"needs": needs}}}),
                encoding="utf-8",
            )
        contract_path = Path(tmp) / "contract.md"
        contract_path.write_text(contract_text, encoding="utf-8")
        return check.main([
            "--base-needs", str(paths["base"]),
            "--head-needs", str(paths["head"]),
            "--contract", str(contract_path),
        ])


class ChangedNeeds(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-2"""

    def test_new_status_or_content_change_counts(self):
        base = {"A": need("req", "implemented"), "B": need("req", "implemented"),
                "C": need("req", "implemented")}
        head = {"A": need("req", "draft"), "B": need("req", "implemented", "other"),
                "C": need("req", "implemented"), "D": need("req", "draft")}
        self.assertEqual(sorted(check.changed_needs(base, head)), ["A", "B", "D"])

    def test_removed_need_and_links_only_change_do_not_count(self):
        base = {"A": {**need("req", "draft"), "links": ["X"]}, "GONE": need("req", "draft")}
        head = {"A": {**need("req", "draft"), "links": ["Y"]}}
        self.assertEqual(check.changed_needs(base, head), {})


class StatusRules(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-3"""

    def test_req_spec_story_need_implemented_or_verified(self):
        head = {"R": need("req", "approved"), "S": need("spec", "draft"),
                "R2": need("req", "implemented"), "S2": need("spec", "verified")}
        lines = check.evaluate({}, head, contract())
        self.assertEqual([l.split(":")[0] for l in lines], ["R", "S"])
        self.assertTrue(all("AC-3" in l for l in lines))

    def test_ac_needs_approved_or_verified(self):
        head = {"AC_X": need("ac", "implemented"), "AC_Y": need("ac", "verified"),
                "AC_Z": need("ac", "approved")}
        lines = check.evaluate({}, head, contract(executed=["AC_Y"]))
        self.assertEqual([l.split(":")[0] for l in lines], ["AC_X"])
        self.assertIn("AC-3", lines[0])

    def test_deprecated_is_no_longer_a_status(self):
        head = {"R": need("req", "deprecated"), "AC_D": need("ac", "deprecated")}
        lines = check.evaluate({}, head, contract())
        self.assertEqual([l.split(":")[0] for l in lines], ["AC_D", "R"])
        self.assertTrue(all("AC-3" in l and "deprecated" in l for l in lines))

    def test_other_types_are_not_checked(self):
        head = {"MOD_X": need("mod", "draft"), "ROOT_X": need("root", "draft")}
        self.assertEqual(check.evaluate({}, head, contract()), [])


class StoryNamedRule(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-4"""

    def test_story_must_be_named_in_user_validation(self):
        head = {"US_A": need("story", "implemented"), "US_B": need("story", "verified")}
        lines = check.evaluate({}, head, contract(named=["US_A"], executed=["US_B"]))
        self.assertEqual([l.split(":")[0] for l in lines], ["US_B"])
        self.assertIn("AC-4", lines[0])


class AcStatusRule(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-5"""

    def test_unnamed_ac_is_approved_and_named_ac_is_verified(self):
        head = {"AC_A": need("ac", "approved"), "AC_B": need("ac", "verified"),
                "AC_C": need("ac", "approved"), "AC_D": need("ac", "verified")}
        lines = check.evaluate({}, head, contract(named=["AC_C"], executed=["AC_D"]))
        self.assertEqual([l.split(":")[0] for l in lines], ["AC_B", "AC_C"])
        self.assertTrue(all("AC-5" in l for l in lines))

    def test_test_execution_names_an_ac_without_user_validation(self):
        head = {"AC_T": need("ac", "verified")}
        self.assertEqual(check.evaluate({}, head, contract(status="pending", executed=["AC_T"])), [])

    def test_ids_in_other_quality_subsections_do_not_count(self):
        head = {"US_IGNORED": need("story", "implemented")}
        lines = check.evaluate({}, head, contract())
        self.assertEqual(len(lines), 1)
        self.assertIn("AC-4", lines[0])


class UserValidationStatusRule(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-6"""

    head = {"US_A": need("story", "verified"), "AC_A": need("ac", "verified")}

    def test_named_and_accepted_passes(self):
        self.assertEqual(check.evaluate({}, self.head, contract(named=["US_A", "AC_A"])), [])

    def test_pending_or_template_status_is_not_accepted(self):
        for status in ("pending", "pending | accepted | changes requested | not applicable"):
            lines = check.evaluate(
                {}, self.head, contract(status=status, decision="{accepted | changes requested}",
                                        named=["US_A", "AC_A"]))
            self.assertEqual([l.split(":")[0] for l in lines], ["AC_A", "US_A"], status)
            self.assertTrue(all("AC-6" in l for l in lines))

    def test_explicit_delegation_is_accepted(self):
        text = contract(status="not applicable", decision="explicit User delegation, 2026-11-18",
                        named=["US_A", "AC_A"])
        self.assertEqual(check.evaluate({}, self.head, text), [])

    def test_unsettled_status_matters_only_when_a_changed_need_is_named(self):
        head = {"AC_A": need("ac", "verified")}
        self.assertEqual(check.evaluate({}, head, contract(status="pending", executed=["AC_A"])), [])
        self.assertEqual(
            check.evaluate({}, {"AC_B": need("ac", "approved")},
                           contract(status="pending", named=["AC_NOT_CHANGED"])), [])

    def test_ids_outside_the_validation_section_do_not_count(self):
        text = contract(named=[]).replace("## Closure", "## Closure\n\n| US_A | x |\n")
        lines = check.evaluate({}, {"US_A": need("story", "verified")}, text)
        self.assertEqual(len(lines), 1)
        self.assertIn("AC-4", lines[0])


class ExitCode(unittest.TestCase):
    """REQ_REL_NEEDSCHECK AC-6"""

    def test_zero_when_rules_hold_and_nonzero_naming_ids_otherwise(self):
        head = {"US_A": need("story", "verified")}
        self.assertEqual(run_cli({}, head, contract(named=["US_A"])), 0)
        self.assertEqual(run_cli({}, head, contract(named=[])), 1)


if __name__ == "__main__":
    unittest.main()
