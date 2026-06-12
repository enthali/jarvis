# Change Document: listprojects-shape-parity

**Status**: in-progress
**Branch**: feature/listprojects-shape-parity
**Created**: 2026-06-12
**Author**: PM (via CR)
**Closes**: F-18 (deferred from v0.7.0 entity-parity UAT)

---

## Summary

Align `jarvis_listProjects` tool output shape with sibling list-tools so all three entity list tools return consistent objects. `jarvis_listProjects` currently returns `{name, folder}` while `jarvis_listSessions` returns `{name, summary, agent, folder}` and `jarvis_listEvents` returns `{name, summary, agent, datesStart, datesEnd, folder}`. The fix adds `summary` and `agent` to the projects output, matching the session shape (not the event shape — date fields are event-specific). Change is additive/backward-compatible; consumers of `name`/`folder` are unaffected. Full traceability applies as this is a tool-output contract change.

---

## Level 0: User Stories

**Status**: ✅ done

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_LISTPROJECTS | List Projects (LM Tool) | Modified AC-2, added AC-5 | Shape expanded from `{name, folder}` to `{name, summary, agent, folder}` |

### New User Stories

_None._

### Decisions

- No new US created; the existing `US_EXP_LISTPROJECTS` already covers tool output shape — only ACs updated.
- `US_EXP_ENTITYPARITY` is not modified; its scope is UI/tree-click/icons, not tool output shape.
- Shape alignment is backward-compatible; no migration US needed.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ done

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_LISTPROJECTS | US_EXP_LISTPROJECTS | Modified AC-3, added AC-6 | Output shape expanded; added `summary` and `agent` fields with fallback semantics |

### New Requirements

_None._

### Decisions

- AC-3 expanded to specify `summary` and `agent` fields with empty-string fallback (matching `jarvis_listEvents` fallback pattern).
- AC-6 added to explicitly mandate shape parity with `jarvis_listSessions`.
- No new REQ needed; scope is entirely covered by existing REQ_EXP_LISTPROJECTS.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ done

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_LISTPROJECTS | REQ_EXP_LISTPROJECTS | Modified return type, core logic, MCP description, package.json description | Added `summary` and `agent` to return type and mapping logic |

### New Design Elements

_None._

### Decisions

- `getProjectList()` return type expanded to `{name, summary, agent, folder}`.
- Fallback pattern: `entity?.summary ?? ''` and `entity?.agent ?? ''` (same as `SPEC_EXP_LISTEVENTS`).
- MCP description string updated to mention all four fields.
- `package.json` `modelDescription` updated to mention summary, agent.
- `SPEC_EXP_LISTEVENTS` not modified — its `:links:` to `SPEC_EXP_LISTPROJECTS` and "mirrors" wording remain correct.
- No UAT spec asserts the old `{name, folder}` shape explicitly, so no UAT spec change required.

### Horizontal Check (MECE)

- [x] No contradictions with existing Design Specs
- [x] No redundancies
- [x] All modified SPECs link to Requirements

---

## Test Protocol

See [tst-listprojects-shape-parity.md](tst-listprojects-shape-parity.md).

**7 test cases across 4 groups:**

| Group | TCs | Scope |
|-------|-----|-------|
| A — Full Shape (LM) | TC-1, TC-2 | All four fields present; field order matches `jarvis_listSessions` |
| B — Fallback Semantics | TC-3, TC-4 | Missing `agent`; missing `summary` + `agent` → empty string (not null/missing) |
| C — MCP Variant | TC-5 | Same updated shape via MCP registration |
| D — Non-Regression | TC-6, TC-7 | `jarvis_listSessions` and `jarvis_listEvents` unaffected |

---

## Verification Log

**MECE Final Check (2026-06-12) — PASS**

| Check | Result | Notes |
|-------|--------|-------|
| Redundancy | ✅ PASS | US AC-2/AC-5 and REQ AC-3/AC-6 are distinct constraints |
| Gaps | ✅ PASS | All 7 TCs cover updated ACs; no uncovered code paths |
| Contradictions | ✅ PASS | `SPEC_EXP_LISTPROJECTS`, `package.json`, `src/extension.ts` all align on `{name, summary, agent, folder}` |
| Dual Mapping | ✅ PASS | LM handler (lines 1578–1604) and MCP handler (1606–1625) return identical fields — no single-copy miss |
| Active code | ✅ PASS | No old `{name, folder}` pattern; new fields confirmed in both mapping copies and description strings |
| Active docs | ✅ PASS | US/REQ/SPEC all document new shape; no stale "name and folder path only" text |
| Historical | ✅ DISCLOSED | `docs/changes/v0.4.0/list-projects.md` references old shape — acceptable historic stranding |
| Test coverage | ✅ PASS | TC-1..TC-7 fully cover AC-2, AC-3, AC-5, AC-6 plus fallback semantics and non-regression |

**Artefakt-Removal Classification:**
- **(a) Active code:** CLEAN — no old `{name, folder}` shape in `src/extension.ts` or `package.json`
- **(b) Active docs:** CLEAN — all updated US/REQ/SPEC carry the new shape
- **(c) Acceptable historic stranding:** `docs/changes/v0.4.0/list-projects.md` (historical v0.4.0 release artifact, immutable archive)

**Verdict:** ✅ PASS — ready for Docu and PM notification.


---

*Generated by syspilot Change Manager*
