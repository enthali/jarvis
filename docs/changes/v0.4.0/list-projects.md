# Change Document: list-projects

**Status**: approved
**Branch**: feature/list-projects
**Created**: 2026-04-12
**Author**: Change Agent

---

## Summary

New LM Tool `jarvis_listProjects` — registered via `registerDualTool()` to be available both as a VS Code Language Model Tool and via MCP. Takes no input parameters and returns an array of projects with `name` and `folder` (relative path). Follows the established `jarvis_listSessions` pattern.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | none | Context only — the sidebar already lists projects; this change adds programmatic access |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_EXP_LISTPROJECTS | List Projects LM Tool | optional |

### Decisions

- D-0.1: New user story `US_EXP_LISTPROJECTS` mirrors `US_MSG_LISTSESSIONS` but for projects. Placed in `us_exp.rst` under the EXP theme since projects are in the Explorer domain.
- D-0.2: No modification to existing user stories needed — this is purely additive.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — `US_MSG_LISTSESSIONS` covers sessions, this covers projects
- [x] No gaps identified

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| (none) | — | — | Purely additive; no existing REQs modified |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EXP_LISTPROJECTS | List Projects LM Tool | US_EXP_LISTPROJECTS | optional |

### Decisions

- D-1.1: Single new requirement `REQ_EXP_LISTPROJECTS` — mirrors `REQ_MSG_LISTSESSIONS` structure. Tool name: `jarvis_listProjects`, empty input, returns array of `{ name, folder }`.
- D-1.2: `folder` is relative to the configured projects folder — keeps output portable and concise.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — `REQ_MSG_LISTSESSIONS` covers sessions, this covers projects
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_SCANNER | — | none | Already provides `getProjectTree()` + `getEntity()` — no changes needed |
| SPEC_MSG_DUALREGISTRATION | — | none | Existing `registerDualTool()` wrapper used as-is |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_LISTPROJECTS | List Projects LM Tool | REQ_EXP_LISTPROJECTS; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION |

### Decisions

- D-2.1: `SPEC_EXP_LISTPROJECTS` describes the new `registerDualTool()` call in `extension.ts`. LM handler returns `LanguageModelToolResult` with JSON text; MCP handler returns plain object.
- D-2.2: Leaf-node extraction walks `scanner.getProjectTree()` recursively, collecting `LeafNode`s. For each leaf, `scanner.getEntity(id)` provides the `name`; the `folder` is derived as the relative path from the configured projects folder to the leaf's parent directory.
- D-2.3: `package.json` gets a new tool declaration with empty `inputSchema`, following the `jarvis_listSessions` pattern.

### Horizontal Check (MECE)

- [x] No contradictions with existing Design elements
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_LISTPROJECTS | REQ_EXP_LISTPROJECTS | SPEC_EXP_LISTPROJECTS | ✅ |

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation
