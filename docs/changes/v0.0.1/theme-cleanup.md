# Change Document: theme-cleanup

**Status**: approved
**Branch**: feature/theme-cleanup
**Created**: 2026-04-01
**Author**: Change Agent

---

## Summary

Reorganize syspilot IDs: move Developer Tooling elements (manual testing, test protocols,
agent workflow specs) from theme `EXP` (Explorer UI) to the new theme `DEV` (Developer Tooling).
This separates user-facing explorer features from internal development workflow specs.
Historical change documents (`tst-*`, `val-*`) are kept as-is — they are historical snapshots.

---

## New Theme

| Theme | Scope |
|-------|-------|
| `EXP` | Explorer UI — user-facing features (sidebar, tree views) |
| `DEV` | Developer Tooling — testing workflow, agent specs, CI config |

---

## Level 0: User Stories

**Status**: ✅ approved

### Renamed

| Old ID | New ID | File change |
|--------|--------|-------------|
| `US_EXP_MANUALTEST` | `US_DEV_MANUALTEST` | `us_exp.rst` → `us_dev.rst` |

### Unchanged (stay in EXP)

- `US_EXP_SIDEBAR`

---

## Level 1: Requirements

**Status**: ✅ approved

### Renamed

| Old ID | New ID | File change |
|--------|--------|-------------|
| `REQ_EXP_LAUNCHCONFIG` | `REQ_DEV_LAUNCHCONFIG` | `req_exp.rst` → `req_dev.rst` |
| `REQ_EXP_TESTSUMMARY` | `REQ_DEV_TESTSUMMARY` | `req_exp.rst` → `req_dev.rst` |
| `REQ_EXP_TESTPROTOCOL` | `REQ_DEV_TESTPROTOCOL` | `req_exp.rst` → `req_dev.rst` |

### Unchanged (stay in EXP)

- `REQ_EXP_ACTIVITYBAR`, `REQ_EXP_TREEVIEW`, `REQ_EXP_DUMMYDATA`

---

## Level 2: Design

**Status**: ✅ approved

### Renamed

| Old ID | New ID | File change |
|--------|--------|-------------|
| `SPEC_EXP_LAUNCHCONFIG` | `SPEC_DEV_LAUNCHCONFIG` | `spec_exp.rst` → `spec_dev.rst` |
| `SPEC_EXP_IMPLTEST` | `SPEC_DEV_IMPLTEST` | `spec_exp.rst` → `spec_dev.rst` |
| `SPEC_EXP_TESTPROTOCOL` | `SPEC_DEV_TESTPROTOCOL` | `spec_exp.rst` → `spec_dev.rst` |
| `SPEC_EXP_VERIFYPROTOCOL` | `SPEC_DEV_VERIFYPROTOCOL` | `spec_exp.rst` → `spec_dev.rst` |

### Unchanged (stay in EXP)

- `SPEC_EXP_EXTENSION`, `SPEC_EXP_PROVIDER`

---

## Final Consistency Check

**Status**: ✅ approved

### Traceability (post-rename)

| US | REQ | SPEC |
|----|-----|------|
| US_DEV_MANUALTEST | REQ_DEV_LAUNCHCONFIG | SPEC_DEV_LAUNCHCONFIG |
| US_DEV_MANUALTEST | REQ_DEV_TESTSUMMARY | SPEC_DEV_IMPLTEST |
| US_DEV_MANUALTEST | REQ_DEV_TESTPROTOCOL | SPEC_DEV_TESTPROTOCOL |
| US_DEV_MANUALTEST | REQ_DEV_TESTPROTOCOL | SPEC_DEV_VERIFYPROTOCOL |

### Additional files to update

- `.github/agents/syspilot.implement.agent.md` — traceability comments
- `.github/agents/syspilot.verify.agent.md` — traceability comments
- `.vscode/launch.json` — traceability comment
- `.vscode/tasks.json` — traceability comment

### Decisions

- Historical documents (`tst-manual-test.md`, `val-manual-test.md`) kept as-is
- No functional changes — pure ID rename + file reorganization
