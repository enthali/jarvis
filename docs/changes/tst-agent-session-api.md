# Test Protocol: agent-session-api

**Change Document:** [agent-session-api.md](agent-session-api.md)
**Verification Report:** [val-agent-session-api.md](val-agent-session-api.md)
**Branch:** `feature/agent-session-api`
**UAT Specs:** `SPEC_ENG_API` (AC-4a), `SPEC_ENG_SESSIONLIST` (AC-1–AC-5), `SPEC_MSG_JARVISSESSIONS` (AC-1–AC-4)
**Tester:** Automated (vitest) + Manual (VS Code Chat tool picker)
**Date:** 2026-06-27

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core` — must be clean (0 errors).
2. Unit tests executable: `npx vitest run` — baseline green.
3. A test workspace with at least one `session`, one `project`, and one `event` entity (YAML files in their respective folders).
4. For manual tool tests: VS Code Extension Development Host (F5) with the core extension active.

---

## Group A — JarvisSession Type & Field Normalization (Unit Tests)

### TC-1 — `listJarvisSessions()` returns the correct JarvisSession shape

*UAT ref: SPEC_ENG_SESSIONLIST AC-1, AC-2 / REQ_ENG_SESSIONLIST AC-1*

**Pre-condition:** Mock scanner with entities of kinds `session`, `project`, `event`, each with full fields.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `engine.listJarvisSessions()`. | Returns an array of `JarvisSession`. | |
| 2 | Verify each entry has exactly `{name, summary, agent, kind, folder}`. | All five fields present, correct types (all strings). | |
| 3 | Verify `name`, `kind`, `folder` carry the entity's values. | Values match the scanner entries. | |

---

### TC-2 — Optional fields normalized to empty strings

*UAT ref: SPEC_ENG_SESSIONLIST AC-2 / REQ_ENG_SESSIONLIST AC-4*

**Pre-condition:** Mock scanner with an entity that has no `summary` and no `agent` field.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `engine.listJarvisSessions()` with an entity missing `summary`. | Entry's `summary` is `''` (empty string), not `undefined`. | |
| 2 | Verify an entity missing `agent`. | Entry's `agent` is `''`. | |
| 3 | Verify `name`, `kind`, `folder` are always populated. | No empty/undefined for required fields. | |

---

## Group B — Cross-Kind Enumeration (Unit Tests)

### TC-3 — `listJarvisSessions()` returns entities across all kinds

*UAT ref: SPEC_ENG_SESSIONLIST AC-1 / REQ_ENG_SESSIONLIST AC-2*

**Pre-condition:** Mock scanner with 2 sessions, 3 projects, 1 event.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `engine.listJarvisSessions()`. | Returns 6 entries total. | |
| 2 | Verify entries include `kind: 'session'`, `kind: 'project'`, `kind: 'event'`. | All three kinds represented. | |
| 3 | Verify counts per kind match the scanner (2/3/1). | Exact cross-kind union. | |

---

### TC-4 — `listJarvisSessions()` reflects scanner state without a new scan

*UAT ref: SPEC_ENG_SESSIONLIST AC-3 / REQ_ENG_SESSIONLIST AC-3*

**Pre-condition:** Spy on the scanner's `rescan()` / filesystem read methods.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `engine.listJarvisSessions()`. | No filesystem scan triggered (`rescan()` not called). | |
| 2 | Verify the result is derived from `scanner.entities` getter. | Reads the cache only. | |

---

### TC-5 — Empty scanner returns empty list

*UAT ref: SPEC_ENG_SESSIONLIST AC-4 / REQ_MSG_JARVISSESSIONS AC-4*

**Pre-condition:** Mock scanner with no entities.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `engine.listJarvisSessions()`. | Returns `[]`. | |

---

## Group C — Tool Registration & Invocation (Unit Tests)

### TC-6 — `jarvis_listJarvisSessions` tool is registered via engine.registerTool

*UAT ref: SPEC_MSG_JARVISSESSIONS AC-1 / REQ_MSG_JARVISSESSIONS AC-1*

**Pre-condition:** Extension activated with a mock engine.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Activate the extension. | `engine.registerTool('jarvis_listJarvisSessions', ...)` is called. | |
| 2 | Verify the tool is registered with a description. | Name and description passed. | |
| 3 | Verify dual registration (LM + MCP via registerTool wrapper). | Tool appears in both LM and MCP surfaces. | |

---

### TC-7 — Tool invocation returns listJarvisSessions() result as JSON

*UAT ref: SPEC_MSG_JARVISSESSIONS AC-2 / REQ_MSG_JARVISSESSIONS AC-2*

**Pre-condition:** Mock `engine.listJarvisSessions()` returns a known list.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke the `jarvis_listJarvisSessions` handler. | Calls `engine.listJarvisSessions()`. | |
| 2 | Verify the result is a `LanguageModelToolResult` with a JSON text part. | JSON-serialized `JarvisSession[]`. | |
| 3 | Parse the JSON and verify each entry has `{name, summary, agent, kind, folder}`. | Shape preserved through serialization. | |

---

### TC-8 — Tool requires no input parameters

*UAT ref: SPEC_MSG_JARVISSESSIONS AC-3 / REQ_MSG_JARVISSESSIONS AC-3*

**Pre-condition:** Tool registered.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Inspect the tool's `inputSchema` in package.json. | `{ type: 'object', properties: {} }` — no required params. | |
| 2 | Invoke with empty options. | Succeeds, returns the full list. | |

---

## Group D — Additive / Non-Breaking (Unit Tests)

### TC-9 — JarvisCoreApi.version stays 1

*UAT ref: SPEC_ENG_API AC-2 / SPEC_ENG_SESSIONLIST AC-5*

**Pre-condition:** Engine activated.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Read `engine.version`. | Equals `1`. | |
| 2 | Verify all pre-existing API methods still present and unchanged. | `registerEntityKind`, `registerTool`, `getTreeForKind`, `getEntity`, etc. intact. | |
| 3 | Verify `listJarvisSessions` is added without modifying any existing method signature. | Purely additive. | |

---

## Group E — End-to-End Manual (VS Code Chat Tool Picker)

### TC-10 — E2E: `jarvis_listJarvisSessions` available and returns cross-kind list

*UAT ref: SPEC_MSG_JARVISSESSIONS AC-1, AC-2*

**Pre-condition:** VS Code Dev Host (F5), workspace with sessions, projects, and events.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open a Chat session and check the tool picker for `jarvis_listJarvisSessions`. | Tool is listed ("List Jarvis Sessions"). | |
| 2 | Reference the tool and invoke it. | Returns a JSON list of all sessions/projects/events. | |
| 3 | Verify each entry has `{name, summary, agent, kind, folder}`. | Shape consistent with `jarvis_listSessions`/`jarvis_listProjects` + `kind`. | |
| 4 | Verify entities of all three kinds appear. | Cross-kind union confirmed. | |

---

### TC-11 — E2E: Output shape consistency with existing list tools

*UAT ref: SPEC_MSG_JARVISSESSIONS design note (shape parity)*

**Pre-condition:** Dev Host, both `jarvis_listProjects` and `jarvis_listJarvisSessions` available.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_listProjects` and note its output shape. | `{name, summary, agent, folder}`. | |
| 2 | Invoke `jarvis_listJarvisSessions`. | `{name, summary, agent, folder}` + `kind`. | |
| 3 | Verify project entries match between the two tools (plus `kind`). | Consistent fields for the same entities. | |

---

## Summary of Test Coverage

| Group | TCs | Method | Coverage |
|-------|-----|--------|----------|
| A — Type & Normalization | TC-1, TC-2 | Unit | SPEC_ENG_SESSIONLIST AC-1, AC-2 |
| B — Cross-Kind Enumeration | TC-3, TC-4, TC-5 | Unit | SPEC_ENG_SESSIONLIST AC-1–AC-4 |
| C — Tool Registration | TC-6, TC-7, TC-8 | Unit | SPEC_MSG_JARVISSESSIONS AC-1–AC-4 |
| D — Additive / Non-Breaking | TC-9 | Unit | SPEC_ENG_API AC-2, SPEC_ENG_SESSIONLIST AC-5 |
| E — E2E Manual | TC-10, TC-11 | Manual | Full tool flow + shape parity |
