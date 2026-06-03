# Test Protocol: entity-parity

**Change Document:** [entity-parity.md](entity-parity.md)
**Verification Report:** [val-entity-parity.md](val-entity-parity.md)
**Branch:** `feature/entity-parity`
**UAT Specs:** `SPEC_UAT_ENTITY_PARITY`, `SPEC_UAT_LISTEVENTS`, `SPEC_UAT_CREATEPROJECT`,
`SPEC_UAT_CREATEEVENT`, `SPEC_UAT_LISTSESSIONS_SWAP`, `SPEC_UAT_SAFE_SEND_UNION`,
`SPEC_UAT_NEWENTITY_PICKER`, `SPEC_UAT_HEARTBEAT_DEST_VALID`
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/entity-parity`.
3. Open workspace: `testdata/test.code-workspace`
   (File → Open Workspace from File…). This sets `testdata/` as the workspace root.
4. Verify that `jarvis.projects.enabled`, `jarvis.events.enabled`, and
   `jarvis.sessions.enabled` are all `true` (defaults).
5. Ensure the following test-data files are present (part of the branch
   `testdata/` fixtures):

   **Sessions:**
   - `testdata/.jarvis/sessions/copilot-cm/session.yaml` — `agent: syspilot.cm`
   - `testdata/.jarvis/sessions/dev-feature-x/session.yaml` — no `agent` field

   **Projects (with agent):**
   - `testdata/projects/alpha/project.yaml` — `agent: syspilot.cm`
   - `testdata/projects/beta/project.yaml` — `agent: syspilot.uat`

   **Projects (unbound):**
   - `testdata/projects/legacy-no-agent/project.yaml` — no `agent` field (legacy YAML)

   **Events (with agent):**
   - `testdata/events/2026-06-15_DevCon 2026/event.yaml` — `agent: syspilot.cm`

   **Events (unbound):**
   - `testdata/events/2025-03-15_Conference/event.yaml` — no `agent` field

6. Open the **Jarvis** Output Channel (View → Output → Jarvis).
7. Expand all sections (Sessions, Projects, Events) in the Jarvis sidebar.
8. **Between scenarios that create or delete files:** restore the original
   test-data state before proceeding to the next scenario (delete created
   folders, restore deleted files).

---

## Group A — Tool Surface Swap + listEvents

### T-1 — `jarvis_listSessions` returns YAML session entities

*UAT ref: US_UAT_LISTSESSIONS_SWAP AC-1 / SPEC_UAT_LISTSESSIONS_SWAP*

**Setup:** Extension activated. Two sessions exist
(`copilot-cm`, `dev-feature-x`). Chat panel open.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Chat panel, open the tool picker (`#`) and select `jarvis_listSessions`. | Tool invoked. | |
| 2 | Observe the tool response. | Response is a JSON array of **YAML session entities** each with `name`, `summary`, `folder` fields. Chat session tab titles are **not** included. | |
| 3 | Verify the two known sessions appear: `copilot-cm` and `dev-feature-x`. | Both entries present with correct `name` and `folder` values. | |
| 4 | Check Output Channel. | No `[ERROR]` entries. | |

---

### T-2 — `jarvis_listChatSessions` returns VS Code chat tab titles

*UAT ref: US_UAT_LISTSESSIONS_SWAP AC-2 / SPEC_UAT_LISTSESSIONS_SWAP*

**Setup:** At least one named VS Code Chat session tab exists (e.g. rename a tab
to "Test Tab Alpha").

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open tool picker (`#`) and verify **`jarvis_listChatSessions`** appears in the list (new tool name). | Tool visible. | |
| 2 | Invoke `jarvis_listChatSessions`. | Response is a JSON array of **chat tab title strings** (not YAML entity objects). | |
| 3 | Verify "Test Tab Alpha" appears in the response. | Present in list. | |
| 4 | Verify the tool is **NOT** named `jarvis_listSessions` in the chat-tab-titles context — that name now means YAML entities (T-1). | Correct names. | |

---

### T-3 — `jarvis_listChatSessions` filters unnamed / empty sessions

*UAT ref: US_UAT_LISTSESSIONS_SWAP AC-3 / SPEC_UAT_LISTSESSIONS_SWAP*

**Setup:** One named session "Test Tab Alpha", one untitled chat, one session
titled "New Chat".

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_listChatSessions`. | Response array contains only `["Test Tab Alpha"]` — untitled and "New Chat" sessions are excluded. | |

---

### T-4 — `jarvis_listEvents` returns event list with all required fields

*UAT ref: US_UAT_LISTEVENTS AC-1, AC-2, AC-3 / SPEC_UAT_LISTEVENTS*

**Setup:** At least one event exists:
`testdata/events/2026-06-15_DevCon 2026/event.yaml` with `name`, `summary`,
`agent`, `dates.start`, `dates.end`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open tool picker (`#`) and verify **`jarvis_listEvents`** appears. | Tool visible, no input parameters required. | |
| 2 | Invoke `jarvis_listEvents`. | Response is a JSON array. | |
| 3 | Inspect the entry for "DevCon 2026". | Entry has: `name`, `summary`, `agent`, `datesStart`, `datesEnd`, `folder`. All fields present. | |
| 4 | Invoke the tool via MCP (if `jarvis.mcp.enabled=true`). | Same response returned via MCP channel. | |

---

### T-5 — `jarvis_listEvents` returns `[]` on empty events folder

*UAT ref: US_UAT_LISTEVENTS AC-2 (edge) / SPEC_UAT_LISTEVENTS*

**Setup:** Temporarily move all event folders out of `testdata/events/`, or set
`jarvis.eventsFolder` to an empty directory.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_listEvents`. | Response is `[]` — empty array, no error. | |
| 2 | Check Output Channel. | No `[ERROR]` entries. | |

---

## Group B — `jarvis_createProject` Tool

### T-6 — `jarvis_createProject` happy path

*UAT ref: US_UAT_CREATEPROJECT AC-1, AC-2, AC-3 / SPEC_UAT_CREATEPROJECT*

**Setup:** `jarvis.projectsFolder` = `testdata/projects/`. No folder named
`New Automated Project` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createProject` with `{"name": "New Automated Project", "summary": "Created by test", "agent": "syspilot.uat"}`. | Tool returns success, `created: true`. | |
| 2 | Check `testdata/projects/New Automated Project/` on disk. | Folder exists containing `project.yaml` and `context.md`. | |
| 3 | Open `project.yaml`. | Contains `name: "New Automated Project"`, `summary: "Created by test"`, `agent: "syspilot.uat"`. | |
| 4 | Observe the Projects Tree within 2 seconds. | "New Automated Project" appears as a leaf node without manual rescan. | |
| 5 | Cleanup: delete the created folder. | Restored. | |

---

### T-7 — `jarvis_createProject` duplicate name returns `created: false`

*UAT ref: US_UAT_CREATEPROJECT AC-4 / SPEC_UAT_CREATEPROJECT*

**Setup:** `testdata/projects/alpha/` already exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createProject` with `{"name": "alpha"}`. | Tool returns `created: false` with a reason string. No error thrown. | |
| 2 | Verify `testdata/projects/alpha/project.yaml` is unmodified. | Original YAML unchanged. | |

---

### T-8 — `jarvis_createProject` invalid agent value → error, no folder

*UAT ref: US_UAT_CREATEPROJECT AC-6 / SPEC_UAT_CREATEPROJECT*

**Setup:** `testdata/projects/` writable. No folder named `Ghost Project` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createProject` with `{"name": "Ghost Project", "agent": "nonexistent.agent"}`. | Tool returns an error. Error message lists available agents. | |
| 2 | Verify `testdata/projects/Ghost Project/` does NOT exist. | Folder not created (no side effect). | |

---

### T-9 — `jarvis_createProject` empty name → error

*UAT ref: US_UAT_CREATEPROJECT AC-5 / SPEC_UAT_CREATEPROJECT*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createProject` with `{"name": ""}`. | Tool returns an error: "invalid project name". | |
| 2 | Invoke `jarvis_createProject` with `{"name": "NUL"}` (Windows reserved name). | Tool returns an error: "invalid project name: reserved name". | |

---

## Group C — `jarvis_createEvent` Tool

### T-10 — `jarvis_createEvent` happy path (date_name folder)

*UAT ref: US_UAT_CREATEEVENT AC-1, AC-2, AC-3, AC-4 / SPEC_UAT_CREATEEVENT*

**Setup:** `jarvis.eventsFolder` = `testdata/events/`. No folder
`2026-09-01_Kickoff Meeting` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createEvent` with `{"name": "Kickoff Meeting", "startDate": "2026-09-01", "summary": "Q4 kickoff", "agent": "syspilot.cm"}`. | Tool returns `created: true`. | |
| 2 | Check `testdata/events/2026-09-01_Kickoff Meeting/` on disk. | Folder exists with `event.yaml` and `context.md`. | |
| 3 | Open `event.yaml`. | Contains `name`, `summary`, `dates.start: "2026-09-01"`, `dates.end: "2026-09-01"` (defaulted), `agent: "syspilot.cm"`. | |
| 4 | Observe the Events Tree within 2 seconds. | "Kickoff Meeting" appears without manual rescan. | |
| 5 | Cleanup: delete the created folder. | Restored. | |

---

### T-11 — `jarvis_createEvent` duplicate returns `created: false`

*UAT ref: US_UAT_CREATEEVENT AC-5 / SPEC_UAT_CREATEEVENT*

**Setup:** `testdata/events/2026-06-15_DevCon 2026/` already exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createEvent` with `{"name": "DevCon 2026", "startDate": "2026-06-15"}`. | Tool returns `created: false` with reason. No file overwritten. | |

---

### T-12 — `jarvis_createEvent` invalid date format → error

*UAT ref: US_UAT_CREATEEVENT AC-6 / SPEC_UAT_CREATEEVENT*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createEvent` with `{"name": "Bad Date Event", "startDate": "15-06-2026"}` (wrong format). | Tool returns an error: invalid date format. No folder created. | |
| 2 | Invoke `jarvis_createEvent` with `{"name": "Bad Calendar", "startDate": "2026-02-30"}` (invalid calendar date). | Tool returns an error. No folder created. | |

---

### T-13 — `jarvis_createEvent` missing required `startDate` → error

*UAT ref: US_UAT_CREATEEVENT AC-4 / SPEC_UAT_CREATEEVENT*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_createEvent` with `{"name": "No Date Event"}` (no `startDate`). | Tool returns an error: `startDate` is required. No folder created. | |

---

## Group D — Schema Strictness (Option C)

### T-14 — Editor-time validation: `project.yaml` without `agent` field

*UAT ref: US_UAT_NEWENTITY_PICKER AC-1 / SPEC_UAT_NEWENTITY_PICKER*

**Setup:** Open `testdata/projects/legacy-no-agent/project.yaml` in VS Code editor.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Observe the VS Code Problems panel (View → Problems) with the file open. | A JSON Schema validation warning (not error) is reported for the missing `agent` field. | |
| 2 | Verify the file is **not** blocked from opening or saving by the warning. | File remains editable. | |

---

### T-15 — Scanner fail-open: existing project.yaml without `agent` → unbound + warn-log

*UAT ref: US_UAT_ENTITY_PARITY AC-1 / SPEC_UAT_ENTITY_PARITY*

**Setup:** `testdata/projects/legacy-no-agent/project.yaml` has no `agent` field.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Reload the extension (or restart EDH). Observe the Projects Tree. | `legacy-no-agent` appears as a leaf node — it is **not** skipped. | |
| 2 | Open the Jarvis Output Channel. | A `[WARN]` log line containing the folder name and "unbound" (or similar phrasing) is present. | |
| 3 | Invoke `jarvis_listSessions` (or check entity inspector). | The `legacy-no-agent` project is in the entity list with `agent: undefined`. | |

---

### T-16 — `agent: ""` (empty string) is treated as unbound

*UAT ref: US_UAT_ENTITY_PARITY AC-1 / SPEC_UAT_ENTITY_PARITY*

**Setup:** Edit `testdata/projects/alpha/project.yaml` — temporarily set `agent: ""`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | After saving, reload scanner (trigger a rescan or restart EDH). | `alpha` project appears as **unbound** (same treatment as missing field). | |
| 2 | Click `alpha` in the Projects Tree. | **No picker fires.** A default chat editor opens (no mode), is renamed to `alpha`, and the init-prompt is submitted. YAML is **not** mutated. | |
| 3 | Restore `agent: syspilot.cm` in project.yaml. | Entity becomes bound again on next rescan. | |

---

### T-17 — `event.yaml` without `summary` field: loads at runtime, editor warns

*UAT ref: US_UAT_NEWENTITY_PICKER AC-2 / SPEC_UAT_NEWENTITY_PICKER*

**Setup:** `testdata/events/2025-03-15_Conference/event.yaml` has no `summary` field.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open the Events Tree. | `Conference` (or folder name) appears as a leaf node — not skipped at runtime. | |
| 2 | Open the event.yaml file in the editor. | VS Code Problems panel shows a JSON Schema warning for missing `summary`. | |

---

## Group E — Agent Picker Semantics: Interactive New Commands

### T-18 — `jarvis.newProject` — cancel at name prompt → no folder

*UAT ref: US_UAT_NEWENTITY_PICKER AC-3 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in the Projects title bar. | Name InputBox appears. | |
| 2 | Press Escape in the name InputBox. | InputBox closes. No folder created. Projects Tree unchanged. | |

---

### T-19 — `jarvis.newProject` — cancel at agent picker → no folder

*UAT ref: US_UAT_NEWENTITY_PICKER AC-3 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in the Projects title bar. Enter `Picker Cancel Test` in name InputBox. | Agent-picker QuickPick appears. | |
| 2 | Press Escape in the agent picker. | Picker closes. **No folder created**. Projects Tree unchanged. No error notification. | |

---

### T-20 — `jarvis.newProject` — pick "No agent" → `agent: ""`, default chat opens

*UAT ref: US_UAT_NEWENTITY_PICKER AC-4 / SPEC_UAT_NEWENTITY_PICKER*

> **Updated v11 (29 May 2026):** Picker label renamed from "default agent" to
> **"No agent"** (detail: "Opens a default chat — pick mode via the chat
> dropdown"). The non-cancel path opens the chat without a `mode` parameter,
> renames the chat to the entity name, and submits the init-prompt.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Projects title bar. Enter `No Agent Project`. | — | |
| 2 | In the agent picker, select **"No agent"**. | — | |
| 3 | Inspect `testdata/projects/No Agent Project/project.yaml`. | `agent: ""` is written (empty string). Folder and YAML created. | |
| 4 | Observe VS Code Chat. | A new chat editor opens (no specific mode set — VS Code default). Chat is renamed to `No Agent Project`. Init-prompt is submitted referencing `${kind}=project`. | |
| 5 | Cleanup: delete the created folder. | Restored. | |

---

### T-21 — `jarvis.newProject` — pick concrete agent → agent written, chat opens with mode

*UAT ref: US_UAT_NEWENTITY_PICKER AC-4 / SPEC_UAT_NEWENTITY_PICKER*

> **Updated in fix-pass v6+v7 (29 May 2026):** PM-matrix correction —
> chat opens with `{ mode: agentInput }`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Projects title bar. Enter `Bound Project`. | — | |
| 2 | In the agent picker, select a concrete agent (e.g. `syspilot.uat`). | — | |
| 3 | Inspect `testdata/projects/Bound Project/project.yaml`. | `agent: "syspilot.uat"` written. | |
| 4 | Observe VS Code Chat. | A new chat editor opens in `syspilot.uat` mode. | |
| 5 | Cleanup: delete the created folder. | Restored. | |

---

### T-22 — `jarvis.newEvent` — cancel at picker → no folder

*UAT ref: US_UAT_NEWENTITY_PICKER AC-3 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Events title bar. Enter `Cancel Event`. Enter date `2026-08-01`. | Agent picker appears. | |
| 2 | Press Escape in the agent picker. | No folder created. Events Tree unchanged. | |

---

### T-23 — `jarvis.newEvent` — pick "No agent" → `agent: ""`, default chat opens

*UAT ref: US_UAT_NEWENTITY_PICKER AC-4 / SPEC_UAT_NEWENTITY_PICKER*

> **Updated v11 (29 May 2026):** Picker label "default agent" → "No agent".
> Chat opens in VS Code default mode, is renamed, and init-prompt fires.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Events title bar. Enter name `No Agent Event`, date `2026-08-02`. | — | |
| 2 | Select **"No agent"** in picker. | — | |
| 3 | Inspect `testdata/events/2026-08-02_No Agent Event/event.yaml`. | `agent: ""` written. | |
| 4 | Observe VS Code Chat. | Chat opens (no mode). Renamed to `No Agent Event`. Init-prompt submitted referencing `${kind}=event`. | |
| 5 | Cleanup: delete created folder. | Restored. | |

---

### T-24 — `jarvis.newEvent` — pick concrete agent → agent written, chat opens with mode

*UAT ref: US_UAT_NEWENTITY_PICKER AC-4 / SPEC_UAT_NEWENTITY_PICKER*

> **Updated in fix-pass v6+v7 (29 May 2026):** PM-matrix correction —
> chat opens with `{ mode: agentInput }`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Events title bar. Enter name `Bound Event`, date `2026-08-03`. | — | |
| 2 | Select `syspilot.cm` in picker. | — | |
| 3 | Inspect `testdata/events/2026-08-03_Bound Event/event.yaml`. | `agent: "syspilot.cm"` written. | |
| 4 | Observe VS Code Chat. | A new chat editor opens in `syspilot.cm` mode. | |
| 5 | Cleanup: delete created folder. | Restored. | |

---

### T-25 — `jarvis.newSession` — cancel at picker → no folder

*UAT ref: US_UAT_NEWENTITY_PICKER AC-3 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run `jarvis.newEntity` (or click `+` in Sessions title bar). Enter `Cancel Session`. | Agent picker appears. | |
| 2 | Press Escape in the picker. | No folder created. Sessions Tree unchanged. | |

---

### T-25b — `jarvis.newSession` — pick "No agent" → `agent: ""`, default chat (single picker)

*UAT ref: US_UAT_NEWENTITY_PICKER AC-5 / SPEC_UAT_NEWENTITY_PICKER*

> **Updated v11 (29 May 2026):** Picker label "default agent" → "No agent".
> The agent field is written unconditionally (`agent: ""` persisted) and
> the chat opens via the unified `openChatForEntity` helper — renamed +
> init-prompt submitted. No re-prompt on second click (lazy-bind picker
> was removed in v11; tree-click on `agent: ""` opens default chat directly).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run `jarvis.newEntity` (or click `+` in Sessions title bar). Enter session name `No Agent Session Test`. | Agent picker appears (the **first and only** time). | |
| 2 | Select **"No agent"** in the picker. | — | |
| 3 | Confirm: the picker does NOT fire a second time. | No re-prompt. | |
| 4 | Inspect the created `session.yaml`. | `agent: ""` is written explicitly (empty string, not omitted). | |
| 5 | Observe VS Code Chat. | Chat opens (no mode). Renamed to `No Agent Session Test`. Init-prompt submitted referencing `${kind}=session`. | |
| 6 | Cleanup: delete created session folder. | Restored. | |

---

### T-26 — `jarvis.newSession` — pick concrete agent → agent written, chat opened

*UAT ref: US_UAT_NEWENTITY_PICKER AC-5 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run `jarvis.newEntity`. Enter session name `Bound Session Test`. | Agent picker appears. | |
| 2 | Select `syspilot.uat` from picker. | — | |
| 3 | Inspect the created `session.yaml`. | `agent: "syspilot.uat"` written. | |
| 4 | Observe VS Code Chat panel. | A new chat session opens for `Bound Session Test` in `syspilot.uat` mode. | |
| 5 | Cleanup: delete created session folder. | Restored. | |

---

## Group F — Tree-Click Default-Chat Behavior (v11)

> **v11 reinterpretation (29 May 2026):** The lazy-bind picker was removed.
> Tree-click on an entity whose YAML has `agent: ""` or no `agent` field
> opens a default chat directly (no picker, no YAML writeback) followed by
> rename + init-prompt via the unified `openChatForEntity` helper. Previous
> lazy-bind 3-way flow (cancel / "default agent" / concrete agent) has been
> migrated to the New-Entity creation picker — see T-19 (cancel), T-20
> ("No agent"), T-21 (concrete) and their event/session counterparts.

### T-27 — Tree-click on `agent: ""` project → default chat (no picker)

*UAT ref: US_UAT_ENTITY_PARITY AC-10 / SPEC_UAT_ENTITY_PARITY T-30*

**Setup:** Edit `testdata/projects/alpha/project.yaml` → set `agent: ""`.
Close any open VS Code chat tab named `alpha`. Trigger a rescan.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `alpha` in Projects Tree. | **No picker.** A default chat editor opens (no `mode` set). | |
| 2 | Observe the chat tab title. | Renamed to `alpha`. | |
| 3 | Observe the chat transcript. | Init-prompt submitted referencing `${kind}=project`, `${name}=alpha`, `${contextPath}=testdata/projects/alpha/context.md`. | |
| 4 | Inspect `alpha/project.yaml`. | File **unchanged** — `agent: ""` still present, no mutation. | |
| 5 | Restore `agent: syspilot.cm` in `alpha/project.yaml`. | Restored. | |

---

### T-28 — Tree-click on project with **no** `agent` field → default chat + warn-log

*UAT ref: US_UAT_ENTITY_PARITY AC-1 / SPEC_UAT_ENTITY_PARITY T-15*

**Setup:** `testdata/projects/legacy-no-agent/project.yaml` has no `agent`
field. Close any open chat tab named `legacy-no-agent`. Output Channel open.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `legacy-no-agent` in Projects Tree. | **No picker.** A default chat editor opens (no mode). Output Channel: `[WARN]` for the missing `agent` field (emitted at scan time — already present from T-15). | |
| 2 | Observe the chat tab. | Renamed to `legacy-no-agent`. Init-prompt submitted. | |
| 3 | Inspect `legacy-no-agent/project.yaml`. | File **unchanged** — no `agent` field written. | |

---

### T-29 — Tree-click on bound session → mode-prime + rename + init-prompt

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY T-31, T-32*

**Setup:** `testdata/.jarvis/sessions/copilot-cm/session.yaml` has
`agent: syspilot.cm`. Close any open chat tab named `copilot-cm`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `copilot-cm` in the Sessions Tree. | Chat opens in `syspilot.cm` mode (mode-prime fires). Renamed to `copilot-cm`. Init-prompt submitted referencing `${kind}=session`. | |
| 2 | Check Output Channel. | No errors. | |

---

### T-30 — Settings UI: "Prompt Templates" section consolidates both templates

*UAT ref: SPEC_UAT_AGENT_PROMPT_TUNING T-12, T-13*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open VS Code Settings UI (Ctrl+,). Search `jarvis prompt template`. | Setting `jarvis.agentSession.initPromptTemplate` is displayed under a group labelled **Prompt Templates**. Description references `${kind}`, `${name}`, `${contextPath}`. | |
| 2 | In the same Settings page, search `jarvis notification template`. | Setting `jarvis.messages.notificationTemplate` is displayed under the same **Prompt Templates** group. | |
| 3 | Reset `jarvis.agentSession.initPromptTemplate` to default. | Default text begins with "You are the agent session for the ${kind} \"${name}\".". | |

---

### T-31 — Tree-click on bound project → no picker, immediate chat open

*UAT ref: US_UAT_ENTITY_PARITY AC-3, AC-5 / SPEC_UAT_ENTITY_PARITY*

**Setup:** `testdata/projects/alpha/project.yaml` has `agent: syspilot.cm`. No open
chat session named `alpha` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `alpha` in the Projects Tree. | Agent-picker does **not** appear. | |
| 2 | Observe VS Code Chat. | New chat session opens for `alpha` in `syspilot.cm` mode. | |
| 3 | Check Output Channel. | No `[ERROR]` entries. | |

---

### T-32 — Tree-click on bound event → no picker, immediate chat open

*UAT ref: US_UAT_ENTITY_PARITY AC-3 (events) / SPEC_UAT_ENTITY_PARITY*

**Setup:** `testdata/events/2026-06-15_DevCon 2026/event.yaml` has
`agent: syspilot.cm`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `DevCon 2026` in the Events Tree. | No picker. Chat opens for the event in `syspilot.cm` mode. | |
| 2 | Check Output Channel. | No errors. | |

---

## Group G — Inline Icons

### T-33 — Project node shows three inline icons

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY*

**Setup:** `testdata/projects/alpha/` exists. Open `testdata/` as workspace root in EDH.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over the `alpha` leaf node in the Projects Tree. | Three inline icons appear to the right of the label text. | |
| 2 | Identify the icons by tooltip. | Tooltips are: **"Open YAML"** (or similar, `$(go-to-file)`), **"Open context.md"** (`$(notebook)`), **"Open recording"** (`$(record)`). | |
| 3 | Verify all three icons are the same as those on Session nodes. | Icon set is uniform across entity types. | |

---

### T-34 — `$(go-to-file)` opens project YAML in editor

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over `alpha` node; click the `$(go-to-file)` icon. | `testdata/projects/alpha/project.yaml` opens in a non-preview editor tab. | |
| 2 | Verify no chat is opened as a side effect. | Chat unchanged. | |

---

### T-35 — `$(notebook)` opens `context.md` in non-preview editor

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over `alpha` node; click the `$(notebook)` icon. | `testdata/projects/alpha/context.md` opens. Tab is **not** in preview mode (tab title not in italics). | |
| 2 | Verify no chat opened. | Chat unchanged. | |

---

### T-36 — `$(record)` icon hidden without recording folder; visible with it

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Verify `testdata/projects/alpha/recording/` does **not** exist. | — | |
| 2 | Hover over `alpha` node. | The `$(record)` icon is **not** visible (context key `jarvis.hasRecording` is false for this node). | |
| 3 | Create folder `testdata/projects/alpha/recording/`. Trigger a rescan. | — | |
| 4 | Hover over `alpha` node again. | The `$(record)` icon is **now visible**. | |
| 5 | Cleanup: delete `recording/` folder. | Restored. | |

---

### T-37 — Event and Session nodes have same three inline icons (parity)

*UAT ref: US_UAT_ENTITY_PARITY AC-4 / SPEC_UAT_ENTITY_PARITY*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over `DevCon 2026` in the Events Tree. | Same three icons as project nodes (`$(go-to-file)`, `$(notebook)`, `$(record)`). | |
| 2 | Hover over `copilot-cm` in the Sessions Tree. | Same three icons. | |
| 3 | Verify icon tooltips are identical in wording across all three entity types. | Uniform. | |

---

### T-37b — Messages tree items do NOT show entity inline icons (regression v11.4)

*UAT ref: F-16 regression / package.json `view/item/context` anchored regex*

> **v11.4 fix (F-16):** Previously the inline `Open context.md` and `Open YAML File`
> icons appeared on every Message-Session item because the `when` regex
> `/^jarvis(Project|Event|Session)/` was a prefix-match without end-anchor and
> matched `jarvisSessionAutoDeliver` / `jarvisSessionManual`. The regex is now
> anchored: `/^jarvis(Project|Event|Session)(\+recording)?$/`.

**Setup:** At least one queued message exists in the Messages tree (use
`jarvis_sendToSession` to queue one if empty). Auto-delivery for at least one
target session enabled (so both `jarvisSessionManual` and
`jarvisSessionAutoDeliver` contextValues are exercised).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Expand the Messages tree and hover over a session-item (auto-deliver or manual). | No `$(go-to-file)` or `$(notebook)` icon visible. Only message-related icons (send/enable/disable auto-delivery, delete) are shown. | |
| 2 | Right-click the same item → context menu. | No `Reveal in Explorer`, `Reveal in OS`, or `Open in Terminal` entries. Only message-related actions. | |
| 3 | Verify Projects/Events/Sessions trees still show all three inline icons on their entity nodes. | Unchanged — icons still present on real entities. | |

---

## Group H — Tree-Click Parity and Init-Prompt

### T-38 — Tree-click on bound project opens chat in correct agent mode

*UAT ref: US_UAT_ENTITY_PARITY AC-3, AC-5 / SPEC_UAT_ENTITY_PARITY*

**Setup:** `alpha` project has `agent: syspilot.cm`. No open chat named `alpha`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `alpha` node. | VS Code Chat opens for `alpha`. | |
| 2 | Check the Chat mode selector. | Mode is `syspilot.cm`. | |

---

### T-39 — Tree-click on bound event opens chat in correct agent mode

*UAT ref: US_UAT_ENTITY_PARITY AC-3 (events) / SPEC_UAT_ENTITY_PARITY*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `DevCon 2026` in Events Tree. No open chat session for this event. | Chat opens for `DevCon 2026` in `syspilot.cm` mode. | |

---

### T-40 — Init-prompt fires for project entity on tree-click open

*UAT ref: US_UAT_ENTITY_PARITY AC-3 / SPEC_UAT_ENTITY_PARITY (US_SES_SESSIONS AC-9)*

**Setup:** `alpha` project bound to `syspilot.cm`. No open chat named `alpha`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `alpha` in Projects Tree. | Chat opens in `syspilot.cm` mode. | |
| 2 | Observe the chat transcript. | A kind-aware init-prompt is submitted automatically, referencing the project kind, name (`alpha`), and `context.md` path. | |
| 3 | Click `alpha` again (chat already open). | Chat gains focus. **No second init-prompt submitted.** | |

---

### T-41 — Init-prompt fires for event entity on tree-click open

*UAT ref: US_UAT_ENTITY_PARITY AC-3 / SPEC_UAT_ENTITY_PARITY (US_SES_SESSIONS AC-9)*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `DevCon 2026` in Events Tree. No open chat. | Chat opens with kind-aware init-prompt for event kind. | |
| 2 | Re-click (existing chat). | Focus only; no re-prompt. | |

---

## Group I — Folder Naming KISS

### T-42 — `jarvis.newProject` KISS: verbatim raw name as folder

*UAT ref: US_UAT_NEWENTITY_PICKER AC-6 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Projects title bar. Enter `My Test Project` (with spaces). Select any agent in picker. | — | |
| 2 | Check `testdata/projects/` on disk. | Folder is named `My Test Project` (verbatim, spaces preserved — **no kebab-case conversion**). | |
| 3 | Open `project.yaml`. | `name: "My Test Project"`. | |
| 4 | Cleanup: delete created folder. | Restored. | |

---

### T-43 — `jarvis.newEvent` KISS: `<date>_<rawName>` folder (underscore separator)

*UAT ref: US_UAT_NEWENTITY_PICKER AC-6 / SPEC_UAT_NEWENTITY_PICKER*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click `+` in Events title bar. Enter name `Sprint Review Q3`. Enter date `2026-07-01`. Select any agent. | — | |
| 2 | Check `testdata/events/` on disk. | Folder named `2026-07-01_Sprint Review Q3` (underscore between date and name, name verbatim). | |
| 3 | Cleanup: delete created folder. | Restored. | |

---

## Group J — Destination Validation Union (sendToSession)

### T-44 — `jarvis_sendToSession` accepts YAML session entity name

*UAT ref: US_UAT_SAFE_SEND_UNION AC-4 / SPEC_UAT_SAFE_SEND_UNION*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "copilot-cm", "message": "Hello from T-44"}`. | Tool returns success. Message queued. No error. | |

---

### T-45 — `jarvis_sendToSession` accepts YAML project entity name

*UAT ref: US_UAT_SAFE_SEND_UNION AC-4, AC-6 / SPEC_UAT_SAFE_SEND_UNION*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "alpha", "message": "Project ping"}`. | Tool returns success. Message queued for `alpha`. | |

---

### T-46 — `jarvis_sendToSession` accepts YAML event entity name

*UAT ref: US_UAT_SAFE_SEND_UNION AC-4, AC-6 / SPEC_UAT_SAFE_SEND_UNION*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "DevCon 2026", "message": "Event ping"}`. | Tool returns success. Message queued for `DevCon 2026`. | |

---

### T-47 — `jarvis_sendToSession` accepts active chat session title

*UAT ref: US_UAT_SAFE_SEND_UNION AC-4, AC-6 / SPEC_UAT_SAFE_SEND_UNION*

**Setup:** An open VS Code Chat session tab titled "My Agent Tab" exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "My Agent Tab", "message": "Chat ping"}`. | Tool returns success. | |

---

### T-48 — `jarvis_sendToSession` to unknown destination → typed error with valid-destination list

*UAT ref: US_UAT_SAFE_SEND_UNION AC-1, AC-2 / SPEC_UAT_SAFE_SEND_UNION*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "ghost-session-xyz", "message": "Lost"}`. | Tool returns an **error** (not success). | |
| 2 | Inspect the error message. | Names the supplied destination (`ghost-session-xyz`) and lists currently valid destinations. | |
| 3 | Verify the message queue. | No message was appended (no side effect on invalid destination). | |

---

### T-49 — `jarvis_sendToSession` to YAML entity with no open chat → triggers chat-open

*UAT ref: US_UAT_SAFE_SEND_UNION AC-4 / SPEC_UAT_SAFE_SEND_UNION*

**Setup:** `alpha` project entity exists in scanner. No VS Code Chat tab named `alpha` is open.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_sendToSession` with `{"destination": "alpha", "message": "Auto ping"}`. Message is queued. | — | |
| 2 | Wait for the auto-delivery poll cycle (up to 30 s). | A VS Code Chat session opens for `alpha` (same path as v0.6.1 auto-delivery). | |
| 3 | Verify the message appears in the chat. | "Auto ping" delivered. | |

---

### T-50 — Invalid `jarvis_sendToSession` leaves no side-effect

*UAT ref: US_UAT_SAFE_SEND_UNION AC-3 / SPEC_UAT_SAFE_SEND_UNION*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Note the current count of messages in the queue (inspect Messages tree). | Baseline count recorded. | |
| 2 | Invoke `jarvis_sendToSession` with `{"destination": "no-such-entity", "message": "Should not land"}`. | Tool returns error. | |
| 3 | Check Messages tree again. | Count unchanged — no message appended. | |

---

## Group K — Heartbeat Shared Validator

### T-51 — Heartbeat YAML with valid YAML entity destination loads without warning

*UAT ref: US_UAT_HEARTBEAT_DEST_VALID AC-5 / SPEC_UAT_HEARTBEAT_DEST_VALID*

**Setup:** A heartbeat job in `testdata/heartbeat/heartbeat.yaml` has a `queue`
step with `destination: "alpha"` (a known project entity).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Load the extension (or reload the EDH). Open Jarvis Output Channel. | No `[WARN]` entries about `destination: "alpha"`. | |
| 2 | Verify the job appears in the Heartbeat tree. | Job listed and scheduled normally. | |

---

### T-52 — Heartbeat YAML with invalid destination → warning notification at load

*UAT ref: US_UAT_HEARTBEAT_DEST_VALID AC-1, AC-2 / SPEC_UAT_HEARTBEAT_DEST_VALID*

**Setup:** Add a heartbeat job with a `queue` step using `destination: "nonexistent-entity"`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Reload the extension. | A VS Code **warning notification** appears referencing the invalid destination. | |
| 2 | Check Output Channel. | A `[WARN]` log entry contains: job name, step index, and `"nonexistent-entity"`. | |
| 3 | Verify the job still appears in the Heartbeat tree. | Job is loaded and scheduled (not dropped). | |
| 4 | Revert heartbeat YAML. | Restored. | |

---

### T-53 — `jarvis_registerJob` rejects job with invalid queue-step destination

*UAT ref: US_UAT_HEARTBEAT_DEST_VALID AC-4 / SPEC_UAT_HEARTBEAT_DEST_VALID*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis_registerJob` with a job definition containing a `queue` step with `destination: "ghost-dest"`. | Tool returns an **error**. Error message names the invalid destination. | |
| 2 | Verify the job is NOT persisted to `heartbeat.yaml`. | Job does not appear in heartbeat YAML or Heartbeat tree. | |

---

### T-54 — Correctly configured heartbeat job: behavior unchanged (no regression)

*UAT ref: US_UAT_HEARTBEAT_DEST_VALID AC-5 / SPEC_UAT_HEARTBEAT_DEST_VALID*

**Setup:** Pre-existing valid heartbeat job with a `queue` step pointing to `copilot-cm`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Trigger the job via `Jarvis: Run Heartbeat Job`. | Job executes without error. Queue step delivers as expected. | |
| 2 | Check Output Channel. | No new `[WARN]` or `[ERROR]` entries for this job. | |

---

## Group L — Auto-Delivery Regression

### T-55 — Auto-delivery to new YAML entity opens chat on poll

*UAT ref: US_UAT_SAFE_SEND_UNION AC-5 / SPEC_UAT_SAFE_SEND_UNION*

**Setup:** `beta` project entity exists. No open chat for `beta`. Auto-delivery enabled
for `beta` (via Messages tree context menu → "Enable Direct Delivery").

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Queue a message for `beta` via `jarvis_sendToSession`. | Message queued. | |
| 2 | Wait for auto-delivery poll cycle (≤30 s). | A VS Code Chat session opens for `beta` and the message is delivered. Same behaviour as v0.6.1 for session entities. | |
| 3 | Confirm no `[ERROR]` in Output Channel. | Clean. | |

---

## Testability Concerns

| # | Scenario | Concern |
|---|----------|---------|
| 1 | T-30 (YAML write fail) | Requires manually setting a file to read-only. Platform-dependent on Windows/macOS. May not behave identically in all environments. Flag for dev engineer to add unit test coverage. |
| 2 | T-52 step timing | Warning notification appears at extension load; tester must reload EDH with modified YAML in place. Timing-sensitive. |
| 3 | US_AUT_HEARTBEAT_VALIDATION AC-3 (at-fire-time skip) | Cannot easily be verified manually without waiting for a cron tick (up to 1 min) and then inspecting logs. Recommend dev engineer adds a targeted unit test. |
| 4 | T-51 (shared validator cross-verify) | Whether `jarvis_sendToSession` and heartbeat registration literally call the same code function cannot be verified from the outside; only behavioral equivalence is testable here. |

---

## Sign-Off

| Item | Value |
|------|-------|
| Branch compiled (0 errors) | |
| All T-N scenarios executed | |
| Failures documented | |
| Tester name | |
| Execution date | |
