# QM Review Matrix

Definitions only. All runtime status and logs live in `scan-state.md`.

---

## Standing Checks

To add a new check: append a row and set Status to `active`. It runs on the next Friday cycle.

| ID | Check | Scope | Pass Criterion | Status |
|---|---|---|---|---|
| SC-001 | **US Persona compliance** | `docs/userstories/**/*.rst` | Every "As a" actor matches an allowed persona (currently: Jarvis User, Jarvis Developer, Jarvis Test Engineer; non-conforming personas tracked under GH #33 "Streamline persona roles in User Stories") | active |
| SC-002 | **Spec-in-US disguise** | `docs/userstories/**/*.rst` | No US acceptance criterion contains implementation detail (data structures, function names, file paths, API signatures) — those belong at REQ/SPEC level | active |
| SC-003 | **Orphaned SPEC elements** | `docs/design/spec_*.rst` | Every SPEC element has `:links:` to at least one REQ | active |
| SC-004 | **UAT story without val-report** | `docs/userstories/us_uat_*.rst` + `docs/changes/` | Every UAT story whose linked change has `tst-<name>.md` also has `val-<name>.md` | active |
| SC-005 | **Stale root-level Change Documents** | `docs/changes/*.md` (root only) | No root-level CR has `Status: in-progress` without an active feature branch | active |

---

## Revision History

| Date | Change |
|---|---|
| 2026-06-19 | Redesigned from German US-list format to two-track engine. Logs moved to scan-state.md. |