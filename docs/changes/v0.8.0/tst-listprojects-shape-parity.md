# Test Protocol: listprojects-shape-parity

**Change Document:** [listprojects-shape-parity.md](listprojects-shape-parity.md)
**Verification Report:** [val-listprojects-shape-parity.md](val-listprojects-shape-parity.md)
**Branch:** `feature/listprojects-shape-parity`
**UAT Specs:** `SPEC_EXP_LISTPROJECTS`, `US_EXP_LISTPROJECTS` (AC-2, AC-5), `REQ_EXP_LISTPROJECTS` (AC-3, AC-6)
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/listprojects-shape-parity`.
3. Open workspace: `testdata/test.code-workspace`
   (File → Open Workspace from File…). This sets `testdata/` as the workspace root.
4. Confirm that `jarvis.projectsFolder` resolves to `testdata/projects/`
   (open VS Code Settings UI, search `jarvis projects folder`).
5. Verify the following test-data projects are present in `testdata/projects/`:

   | Folder | YAML fields present |
   |--------|---------------------|
   | `alpha/` | `name`, `summary`, `agent` all set (non-empty) |
   | `legacy-no-agent/` | `name` and `summary` set; **no `agent` key** |

6. Create a temporary minimal project for the no-summary fallback test:
   - Create folder `testdata/projects/minimal-test/`.
   - Create `testdata/projects/minimal-test/project.yaml` with content:
     ```yaml
     name: "Minimal Test Project"
     ```
   - No `summary` key, no `agent` key.

7. Open the **Jarvis** Output Channel (View → Output → Jarvis) and keep it visible.
8. Open a Copilot agent chat panel (e.g. `Ctrl+Alt+I`) — this is used to invoke LM tools directly.
9. The MCP server must be reachable: confirm the Jarvis MCP server appears in the
   VS Code MCP servers list (Settings → MCP) or is configured in `mcp.json`.

---

## Group A — Full Shape (Happy Path, LM variant)

### TC-1 — All four fields present and non-null for a fully populated project

*UAT ref: US_EXP_LISTPROJECTS AC-2, AC-5 / REQ_EXP_LISTPROJECTS AC-3, AC-6 / SPEC_EXP_LISTPROJECTS*

**Pre-condition:** `testdata/projects/alpha/project.yaml` contains `name`, `summary`, and `agent`.

**Test data:**
- Project folder: `alpha`
- `name` in YAML: `"Project: Alpha Initiative"`
- `summary` in YAML: `"Strategic initiative for expanding platform capabilities in Q2."`
- `agent` in YAML: `"syspilot.cm"`

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Copilot agent chat, type `#listProjects` to invoke the `jarvis_listProjects` LM tool and send the message. | Tool is invoked; a JSON array appears in the tool result. | |
| 2 | Locate the entry for `alpha` in the returned JSON array. | An object with four keys is present for the `alpha` project. | |
| 3 | Verify `name` equals `"Project: Alpha Initiative"`. | `"name": "Project: Alpha Initiative"` | |
| 4 | Verify `summary` equals `"Strategic initiative for expanding platform capabilities in Q2."`. | `"summary": "Strategic initiative for expanding platform capabilities in Q2."` | |
| 5 | Verify `agent` equals `"syspilot.cm"`. | `"agent": "syspilot.cm"` | |
| 6 | Verify `folder` is a non-empty string containing the relative path to `alpha` (e.g. `"alpha"`). | `"folder": "alpha"` (forward slashes, no leading slash) | |
| 7 | Verify no additional unexpected keys (e.g. `externalStatus`, `lastUpdated`) appear in the `alpha` object. | Object has exactly four keys: `name`, `summary`, `agent`, `folder`. | |
| 8 | Check Output Channel. | No `[ERROR]` entries. | |

---

### TC-2 — Field order matches `jarvis_listSessions` shape (`{name, summary, agent, folder}`)

*UAT ref: US_EXP_LISTPROJECTS AC-5 / REQ_EXP_LISTPROJECTS AC-6*

**Pre-condition:** TC-1 completed successfully; tool result from TC-1 is visible.

**Test data:** Same `alpha` entry from TC-1.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the JSON result from TC-1, read the keys of the `alpha` object in the order they appear. | Keys appear in the order: `name`, `summary`, `agent`, `folder`. | |
| 2 | Invoke `#listSessions` (`jarvis_listSessions`) in the same chat. | A JSON array of session objects is returned. | |
| 3 | Locate any entry in the `jarvis_listSessions` result. Read its keys in order. | Keys appear in the same order: `name`, `summary`, `agent`, `folder`. | |
| 4 | Confirm both tools return the same four-key shape with the same key order. | `jarvis_listProjects` shape identical to `jarvis_listSessions` shape. | |

---

## Group B — Fallback Semantics (Missing Fields)

### TC-3 — Project with `summary` but no `agent` key returns `agent: ''`

*UAT ref: US_EXP_LISTPROJECTS AC-2 / REQ_EXP_LISTPROJECTS AC-3 / SPEC_EXP_LISTPROJECTS (fallback logic)*

**Pre-condition:** `testdata/projects/legacy-no-agent/project.yaml` contains `name` and `summary`
but **no `agent` key**.

**Test data:**
- Project folder: `legacy-no-agent`
- `name` in YAML: `"Project: Legacy No Agent"`
- `summary` in YAML: present (non-empty string)
- `agent` key: **absent** from YAML

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `#listProjects` in the agent chat. | JSON array returned. | |
| 2 | Locate the entry for `legacy-no-agent` in the result. | Object with four keys is present. | |
| 3 | Verify `agent` is the empty string `""` (not `null`, not `undefined`, not a missing key). | `"agent": ""` | |
| 4 | Verify `name` and `summary` are correctly populated from YAML (non-empty). | Both fields reflect YAML values. | |
| 5 | Verify `folder` is `"legacy-no-agent"`. | `"folder": "legacy-no-agent"` | |
| 6 | Check Output Channel. | No `[ERROR]` entries. | |

---

### TC-4 — Project with neither `summary` nor `agent` returns `''` for both fields

*UAT ref: US_EXP_LISTPROJECTS AC-2 / REQ_EXP_LISTPROJECTS AC-3 / SPEC_EXP_LISTPROJECTS (fallback logic)*

**Pre-condition:** `testdata/projects/minimal-test/project.yaml` was created in Setup step 6,
containing only `name: "Minimal Test Project"` — no `summary` key, no `agent` key.

**Test data:**
- Project folder: `minimal-test`
- `name` in YAML: `"Minimal Test Project"`
- `summary` key: **absent**
- `agent` key: **absent**

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `#listProjects` in the agent chat. | JSON array returned. | |
| 2 | Locate the entry for `minimal-test` in the result. | Object with four keys is present. | |
| 3 | Verify `summary` is the empty string `""` (not `null`, not `undefined`, not a missing key). | `"summary": ""` | |
| 4 | Verify `agent` is the empty string `""` (not `null`, not `undefined`, not a missing key). | `"agent": ""` | |
| 5 | Verify `name` equals `"Minimal Test Project"`. | `"name": "Minimal Test Project"` | |
| 6 | Verify `folder` equals `"minimal-test"`. | `"folder": "minimal-test"` | |
| 7 | Check Output Channel. | No `[ERROR]` entries. | |
| 8 | **Teardown:** Delete `testdata/projects/minimal-test/` folder. | Folder removed. | |

---

## Group C — MCP Variant

### TC-5 — MCP variant returns the same updated shape as the LM variant

*UAT ref: US_EXP_LISTPROJECTS AC-4 / REQ_EXP_LISTPROJECTS AC-5 / SPEC_EXP_LISTPROJECTS (dual-tool registration)*

**Pre-condition:** Jarvis MCP server is accessible. At least `alpha` and `legacy-no-agent`
projects are present.

**Test data:** Any MCP-capable client (e.g. VS Code agent chat with MCP enabled, or
`curl`/`http`-based MCP test call to the Jarvis MCP endpoint). Project used: `alpha`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In an agent chat session with the Jarvis MCP server enabled, ask the agent to call `jarvis_listProjects` via the MCP tool (e.g. prompt: `"Call the jarvis_listProjects MCP tool and show me the raw result."`). | The agent calls the MCP tool and returns a JSON result. | |
| 2 | Locate the `alpha` entry in the MCP result. | Object present for `alpha`. | |
| 3 | Verify the MCP result object contains `name`, `summary`, `agent`, and `folder` — all four fields. | All four fields present; no missing or extra fields. | |
| 4 | Verify `summary` equals `"Strategic initiative for expanding platform capabilities in Q2."`. | Value matches YAML. | |
| 5 | Verify `agent` equals `"syspilot.cm"`. | Value matches YAML. | |
| 6 | Locate the `legacy-no-agent` entry in the MCP result. Verify `agent` is `""`. | `"agent": ""` (fallback is consistent across variants). | |
| 7 | Check Output Channel. | No `[ERROR]` entries. | |

---

## Group D — Non-Regression

### TC-6 — `jarvis_listSessions` output is unaffected

*UAT ref: Non-regression — shape parity change must not alter session tool output*

**Pre-condition:** At least one session exists under `testdata/.jarvis/sessions/` (e.g. `copilot-cm`).

**Test data:**
- Session folder: `copilot-cm` (or any present session)
- Expected shape: `{name, summary, agent, folder}` (unchanged from before this change)

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `#listSessions` (`jarvis_listSessions`) in the agent chat. | JSON array of session objects returned without error. | |
| 2 | Verify each session object still contains `name`, `summary`, `agent`, and `folder`. | Shape is `{name, summary, agent, folder}` — unchanged. | |
| 3 | Verify no fields from the project shape (e.g. no date fields, no project-specific keys) leaked into session objects. | Session objects unchanged from pre-change shape. | |
| 4 | Check Output Channel. | No `[ERROR]` entries. | |

---

### TC-7 — `jarvis_listEvents` output is unaffected

*UAT ref: Non-regression — shape parity change must not alter event tool output*

**Pre-condition:** At least one event exists under `testdata/events/` (e.g. `2026-06-15_DevCon 2026`).

**Test data:**
- Event folder: `2026-06-15_DevCon 2026` (or any present event)
- Expected event shape: `{name, summary, agent, datesStart, datesEnd, folder}`

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `#listEvents` (`jarvis_listEvents`) in the agent chat. | JSON array of event objects returned without error. | |
| 2 | Verify each event object still contains `name`, `summary`, `agent`, `datesStart`, `datesEnd`, and `folder`. | Shape is `{name, summary, agent, datesStart, datesEnd, folder}` — unchanged. | |
| 3 | Verify the event shape has NOT been shortened to the project shape (date fields must still be present). | `datesStart` and `datesEnd` present in every event entry. | |
| 4 | Check Output Channel. | No `[ERROR]` entries. | |

---

## Testability Notes

| Concern | Verdict |
|---------|---------|
| TC-2 key order | JSON key order is implementation-defined in JavaScript; `JSON.stringify` preserves insertion order as of ES2015. The test is valid because `getProjectList()` builds the object literal in the spec-defined order. |
| TC-5 MCP variant | Requires an MCP-capable client; if no MCP client is available in the test environment, this TC is **untestable manually**. Unit-testable via direct handler invocation in `src/tests/`. |
| Empty-array case (REQ AC-4) | Not covered as a separate TC — covered implicitly by removing all valid projects; low-risk, straightforward code path. Can be covered by unit test. |
