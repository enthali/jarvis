#!/usr/bin/env python3
"""Compare the Needs a feature branch changed with its Change Contract.

Implements SPEC_REL_NEEDSCHECK / REQ_REL_NEEDSCHECK. The check reads only the
repository: the Needs data of two commits and the Contract file. It starts no
network access and writes only into a temporary directory.

Usage (from anywhere inside the repository):
    python scripts/check_contract_needs.py [--contract PATH] [--base REF]

Exit code 0 when no Need violates the rules, 1 when at least one does, 2 when
the check itself could not run.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_BASE = "development"
DOCS_DIR = "docs"
ONTOLOGY = "docs/Jarvis Ontology/ontology.toml"

SPEC_STATUSES = {"implemented", "verified"}
AC_STATUSES = {"approved", "verified"}
ID_PATTERN = re.compile(r"\b(?:US|AC)_[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*")


class CheckError(Exception):
    """The check could not run; distinct from a Need violating a rule."""


def load_needs(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    versions = data.get("versions", {})
    if not versions:
        raise CheckError(f"{path}: no 'versions' entry in needs.json")
    # The needs builder writes one version; take the current one when several exist.
    key = data.get("current_version", "")
    version = versions.get(key) or next(iter(versions.values()))
    return version.get("needs", {})


def changed_needs(base: dict[str, dict], head: dict[str, dict]) -> dict[str, dict]:
    """Needs whose ID is new or whose status or content differs; links are ignored."""
    changed = {}
    for need_id, need in head.items():
        old = base.get(need_id)
        if (
            old is None
            or old.get("status") != need.get("status")
            or old.get("content") != need.get("content")
        ):
            changed[need_id] = need
    return changed


def parse_user_validation(contract: str) -> tuple[str, str, set[str]]:
    """Return (status line value, Decision line value, IDs named in the Validation table)."""
    section = re.search(
        r"^## User Validation\s*$(.*?)(?=^## |\Z)", contract, re.MULTILINE | re.DOTALL
    )
    if not section:
        return "", "", set()
    body = section.group(1)
    status = re.search(r"^\*\*Status:\*\*\s*(.*?)\s*(?:<br>)?\s*$", body, re.MULTILINE)
    decision = re.search(r"^\*\*Decision:\*\*\s*(.*?)\s*$", body, re.MULTILINE)
    named: set[str] = set()
    for line in body.splitlines():
        if line.lstrip().startswith("|"):
            named.update(ID_PATTERN.findall(line))
    return (
        status.group(1) if status else "",
        decision.group(1) if decision else "",
        named,
    )


def validation_is_settled(status: str, decision: str) -> bool:
    """The section is accepted, or records the User's explicit delegation.

    Only an affirmative opening counts (`accepted...`, `explicit User delegation...`,
    optionally after `not applicable:`), so "did not delegate" is not a delegation. A
    value that still lists alternatives (`a | b`) or a placeholder (`{...}`) is the
    unfilled template, not a decision.
    """
    for value in (status, decision):
        if "|" in value or "{" in value:
            continue
        if re.match(
            r"(accepted|(not applicable:\s*)?explicit user delegation)\b", value.strip(), re.I
        ):
            return True
    return False


def parse_test_execution(contract: str) -> set[str]:
    """IDs named in the Test Execution subsection of the Quality Review."""
    section = re.search(
        r"^### Test Execution\s*$(.*?)(?=^#{1,3} |\Z)", contract, re.MULTILINE | re.DOTALL
    )
    if not section:
        return set()
    return {
        found
        for line in section.group(1).splitlines()
        if line.lstrip().startswith("|")
        for found in ID_PATTERN.findall(line)
    }


def evaluate(base: dict[str, dict], head: dict[str, dict], contract: str) -> list[str]:
    """Return one `<ID>: <rule>` line per violation, ordered by Need ID."""
    status_line, decision_line, user_named = parse_user_validation(contract)
    settled = validation_is_settled(status_line, decision_line)
    executed = user_named | parse_test_execution(contract)
    violations: list[str] = []

    for need_id, need in sorted(changed_needs(base, head).items()):
        need_type = need.get("type")
        status = need.get("status")
        if need_type in ("story", "req", "spec") and status not in SPEC_STATUSES:
            violations.append(
                f"{need_id}: REQ_REL_NEEDSCHECK AC-3: status '{status}' is not "
                "implemented or verified"
            )
        if need_type == "ac" and status not in AC_STATUSES:
            violations.append(
                f"{need_id}: REQ_REL_NEEDSCHECK AC-3: status '{status}' is not "
                "approved or verified"
            )
        if need_type == "story" and need_id not in user_named:
            violations.append(
                f"{need_id}: REQ_REL_NEEDSCHECK AC-4: not named in the User validation section"
            )
        if need_type == "ac" and status in AC_STATUSES:
            expected = "verified" if need_id in executed else "approved"
            if status != expected:
                where = (
                    "names it in User validation or Test Execution"
                    if need_id in executed
                    else "does not name it in User validation or Test Execution"
                )
                violations.append(
                    f"{need_id}: REQ_REL_NEEDSCHECK AC-5: status is '{status}' but the "
                    f"Contract {where}, so '{expected}' is required"
                )
        if need_type in ("story", "ac") and need_id in user_named and not settled:
            violations.append(
                f"{need_id}: REQ_REL_NEEDSCHECK AC-6: User validation names it but its "
                "status is neither accepted nor an explicit User delegation"
            )
    return violations


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        raise CheckError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def build_needs(worktree: Path, outdir: Path, ontology: Path) -> Path:
    """Build needs.json of a worktree with the given ontology (SPEC_REL_NEEDSCHECK AC-2)."""
    outdir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            sys.executable, "-m", "sphinx", "-b", "needs", "-q",
            "-d", str(outdir / ".doctrees"),
            "-D", f"needs_from_toml={ontology}",
            str(worktree / DOCS_DIR), str(outdir),
        ],
        capture_output=True, text=True, encoding="utf-8",
    )
    produced = outdir / "needs.json"
    if not produced.exists():
        raise CheckError(f"needs build of {worktree} produced no needs.json:\n{result.stderr}")
    return produced


def run_with_builds(repo: Path, base_ref: str, contract_arg: str | None) -> list[str]:
    head_sha = git(repo, "rev-parse", "HEAD")
    merge_base = git(repo, "merge-base", base_ref, head_sha)

    if contract_arg:
        contract_rel = contract_arg
    else:
        branch = git(repo, "rev-parse", "--abbrev-ref", "HEAD")
        if not branch.startswith("feature/"):
            raise CheckError(
                f"branch '{branch}' is not feature/<name>; pass --contract explicitly"
            )
        contract_rel = f"docs/changes/{branch[len('feature/'):]}.md"

    tmp = Path(tempfile.mkdtemp(prefix="needscheck-"))
    worktrees: list[Path] = []
    try:
        for name, sha in (("base", merge_base), ("head", head_sha)):
            path = tmp / name
            git(repo, "worktree", "add", "--detach", str(path), sha)
            worktrees.append(path)
        head_tree = tmp / "head"
        contract_file = Path(contract_rel)
        if not contract_file.is_absolute():
            contract_file = head_tree / contract_rel
        if not contract_file.exists():
            raise CheckError(f"Contract not found at the branch head: {contract_rel}")

        ontology = head_tree / ONTOLOGY
        base_needs = load_needs(build_needs(tmp / "base", tmp / "out-base", ontology))
        head_needs = load_needs(build_needs(head_tree, tmp / "out-head", ontology))
        return evaluate(base_needs, head_needs, contract_file.read_text(encoding="utf-8"))
    finally:
        for path in worktrees:
            subprocess.run(
                ["git", "-C", str(repo), "worktree", "remove", "--force", str(path)],
                capture_output=True,
            )
        subprocess.run(["git", "-C", str(repo), "worktree", "prune"], capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--contract", help="Change Contract path (default docs/changes/<name>.md)")
    parser.add_argument("--base", default=DEFAULT_BASE, help=f"base ref (default {DEFAULT_BASE})")
    # The two options below feed prebuilt needs.json files and skip git and Sphinx.
    parser.add_argument("--base-needs", help="needs.json of the base (skips the builds)")
    parser.add_argument("--head-needs", help="needs.json of the head (skips the builds)")
    args = parser.parse_args(argv)

    try:
        if args.base_needs or args.head_needs:
            if not (args.base_needs and args.head_needs and args.contract):
                raise CheckError("--base-needs, --head-needs and --contract go together")
            violations = evaluate(
                load_needs(Path(args.base_needs)),
                load_needs(Path(args.head_needs)),
                Path(args.contract).read_text(encoding="utf-8"),
            )
        else:
            repo = Path(git(Path.cwd(), "rev-parse", "--show-toplevel"))
            violations = run_with_builds(repo, args.base, args.contract)
    except CheckError as error:
        print(f"check_contract_needs: {error}", file=sys.stderr)
        return 2

    for line in violations:
        print(line)
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
