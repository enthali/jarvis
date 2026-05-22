# Test Protocol: session-agent-binding

**Change Document:** [session-agent-binding.md](session-agent-binding.md)
**Branch:** `feature/session-agent-binding`
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/session-agent-binding`.
3. Open workspace: `testdata/test.code-workspace`.
4. Confirm the `.github/agents/` directory is present and contains the four
   user-invocable agents of this workspace:
   `syspilot.cm`, `syspilot.pm`, `syspilot.qm`, `syspilot.setup`.
5. Confirm the sessions folder configured in `jarvis.sessions.folder` (typically
   `.jarvis/sessions/` inside the open workspace) is writable.  Delete or
   archive any pre-existing test sessions that could interfere with name
   uniqueness.
6. Open a chat tab (`Ctrl+Alt+I`) for issuing `jarvis_createSession` tool calls.

> **T-4 / T-8 only:** Session `jarvis.sessions.enabled` must be `true` (default).
> Verify the **Sessions** sidebar tree is visible before running these cases.
>
> **T-6 only:** Manually create a `session.yaml` file in the sessions folder
> that contains only `name` and `summary` (no `agent` field) prior to
> executing the test.  See T-6 setup note.
>
> **T-7 only:** Create a session with `agent: syspilot.pm` (use T-2 or T-3),
> then delete `syspilot.pm.agent.md` from `.github/agents/` before opening the
> session in T-7.  Restore the file after the test.

---

## Test Cases

| ID | Scenario | ACs covered | Action | Expected result | Result |
|----|----------|-------------|--------|-----------------|--------|
| T-1 | Create session via UI — no agent selected | US_SES_AGENTBIND AC-2, AC-6; REQ_SES_AGENT_PICKER AC-1, AC-3; SPEC_SES_AGENT_PICKER | Run `jarvis.newSession` (or `jarvis.newEntity` → Session). Enter a name and summary. When the agent picker appears, choose **"No agent"**. | Session folder and `session.yaml` are created. The `session.yaml` does **not** contain an `agent:` key at all. Rescan completes without error. | |
| T-2 | Create session via UI — agent selected | US_SES_AGENTBIND AC-1, AC-2, AC-3; REQ_SES_AGENT_PICKER AC-1, AC-4, AC-5; REQ_SES_AGENT_OPEN; SPEC_SES_AGENT_PICKER; SPEC_SES_AGENT_OPEN | Run `jarvis.newSession`. Enter a name and summary. When the agent picker appears, choose **`syspilot.pm`**. After creation, click the new session in the Sessions tree. | `session.yaml` contains `agent: syspilot.pm`. The chat editor opens pre-configured in `syspilot.pm` agent mode (VS Code chat header / mode indicator shows PM agent, not the generic "Copilot" mode). | |
| T-3 | `jarvis_createSession` tool — valid agent | US_SES_AGENTBIND AC-4; REQ_SES_AGENT_CREATETOOL AC-1, AC-3, AC-4, AC-5; SPEC_SES_AGENT_CREATETOOL | Call `jarvis_createSession` with `name="T3 Session"`, `summary="Tool test"`, `agent="syspilot.cm"`. | Tool returns success. The session folder is created. `session.yaml` contains `agent: syspilot.cm`. No error is raised. | |
| T-4 | `jarvis_createSession` tool — invalid agent | US_SES_AGENTBIND AC-5; REQ_SES_AGENT_CREATETOOL AC-3; REQ_SES_AGENT_VALIDATION AC-1, AC-2, AC-4, AC-5; SPEC_SES_AGENT_CREATETOOL | Call `jarvis_createSession` with `name="T4 Session"`, `agent="syspilot.pmm"` (intentional typo). | Tool call **ends in error**. Error text contains: (a) `"syspilot.pmm"` verbatim; (b) sorted agent list `"syspilot.cm, syspilot.pm, syspilot.qm, syspilot.setup"`. The session folder is **not** created (verify no `T4 Session` folder exists in the sessions directory). | |
| T-5 | `jarvis_createSession` tool — no agent parameter | US_SES_AGENTBIND AC-4; REQ_SES_AGENT_CREATETOOL AC-2; SPEC_SES_AGENT_CREATETOOL | Call `jarvis_createSession` with `name="T5 Session"`, `summary="No agent"` (no `agent` field at all). | Tool returns success. `session.yaml` contains no `agent:` key. Behavior is identical to pre-CR behavior (no error, no validation). | |
| T-6 | Open pre-existing session.yaml without agent field | US_SES_AGENTBIND AC-6; REQ_SES_AGENT_COMPAT AC-1, AC-2; SPEC_SES_AGENT_OPEN | **Setup:** place a `session.yaml` with only `name: "Legacy Session"` and `summary: "Created before this CR"` in a new session subfolder under the sessions folder. Rescan (run `jarvis.rescan`). Click the "Legacy Session" entry in the Sessions tree. | Session opens in the default VS Code chat mode (no specific agent indicator). No Jarvis error message appears. No console warning is logged. The `jarvis_listSessionEntities` tool returns `agent: ""` for this entry. | |
| T-7 | Open session whose agent no longer exists | REQ_SES_AGENT_OPEN AC-4; REQ_SES_AGENT_COMPAT; SPEC_SES_AGENT_OPEN (unrecognised mode section) | **Setup (see Pre-conditions T-7):** use a session with `agent: syspilot.pm` in `session.yaml`, then delete `syspilot.pm.agent.md` from `.github/agents/`. Rescan. Click the session in the Sessions tree. | VS Code opens the chat editor in its default chat mode (graceful fallback). No Jarvis error dialog or notification appears. No console error is logged by Jarvis. **Note:** VS Code's own UI may or may not indicate the unrecognised mode; that is VS Code behaviour, not Jarvis behaviour. | |
| T-8 | Agent picker shows correct entries only | US_SES_AGENTBIND AC-1; REQ_SES_AGENT_PICKER AC-1, AC-5; REQ_SES_AGENT_DISCOVERY AC-2, AC-3, AC-5; SPEC_SES_AGENT_PICKER; SPEC_SES_AGENT_DISCOVERY | Run `jarvis.newSession`. Enter name and summary. Inspect the agent picker QuickPick that appears. | Picker contains exactly **5 items**: "No agent" (first, always), then `syspilot.cm`, `syspilot.pm`, `syspilot.qm`, `syspilot.setup` (alphabetical). Internal agents `syspilot.design`, `syspilot.docu`, `syspilot.implement`, `syspilot.mece`, `syspilot.release`, `syspilot.trace`, `syspilot.uat`, `syspilot.verify` are **not** shown. | |
| T-9 | Schema validation — wrong agent type and extra field | US_SES_AGENTBIND AC-7; REQ_SES_AGENT_FIELD AC-1; SPEC_SES_AGENT_SCHEMA | (a) Create a `session.yaml` with `agent: 123` (integer, not string). Open the file in the editor. (b) Create a `session.yaml` with an unknown field (e.g. `foo: bar`). Open the file. | (a) The VS Code JSON Schema validator (YAML language server) underlines `agent: 123` as a type error (expected string). (b) `foo: bar` is underlined as an additional property error (schema has `additionalProperties: false`). The extension itself does not crash in either case: `entity.agent` is `undefined` for case (a); case (b) is harmless. | |
| T-10 | Agent picker dismissed via Escape — creation aborted | REQ_SES_AGENT_PICKER AC-2; SPEC_SES_AGENT_PICKER (return-semantics: `undefined`) | Run `jarvis.newSession`. Enter name and summary. When the agent picker appears, press **Escape**. | No session folder is created. No `session.yaml` is written. No `context.md` is created. No error notification appears (silent abort). | |

---

## `jarvis_listSessionEntities` Agent Field Sub-check (part of T-3 / T-5)

After T-3 (agent bound) and T-5 (no agent) have created their sessions:

1. Call `jarvis_listSessionEntities` (via LM tool or MCP).
2. Locate the T-3 entry (`T3 Session`): verify `agent` field equals `"syspilot.cm"`.
3. Locate the T-5 entry (`T5 Session`): verify `agent` field equals `""` (empty string — `REQ_SES_AGENT_COMPAT AC-3`).

This sub-check covers `REQ_SES_AGENT_FIELD AC-3` and `SPEC_SES_AGENT_SCHEMA` (tool output section).

---

## Error Message Format Verification

For T-4 (and any other case that triggers the agent-not-available error), confirm
the error text matches the template from `REQ_SES_AGENT_VALIDATION AC-4`:

```
Agent "${agent}" is not available.
Available agents: ${names}
```

- `${agent}` = the exact value supplied in the call
- `${names}` = alphabetically sorted agent identifiers joined by `", "`, or
  `"(none)"` when the workspace has no user-invocable agents

Verify via both the VS Code LM tool path and the MCP path (if an MCP client is
available) — same handler, same error text (`REQ_SES_AGENT_CREATETOOL AC-5`).

---

## MCP Path Cross-Check (optional)

If an MCP client (e.g. Claude Desktop configured for `localhost:31415`) is available:

- Repeat T-3 and T-4 via MCP instead of the VS Code LM tool.
- Expected: identical behavior — success for T-3, structured error for T-4.
- Covers `REQ_SES_AGENT_CREATETOOL AC-5` (both LM and MCP paths enforce
  validation identically).

---

## Result Summary

| ID | Result | Notes |
|----|--------|-------|
| T-1 | | |
| T-2 | | |
| T-3 | | |
| T-3 listSessionEntities sub-check | | |
| T-4 | | |
| T-5 | | |
| T-5 listSessionEntities sub-check | | |
| T-6 | | |
| T-7 | | |
| T-8 | | |
| T-9a (wrong type) | | |
| T-9b (extra field) | | |
| T-10 | | |
| MCP cross-check (optional) | | |

**Overall:** (fill in after execution)

---

## Build State at Execution

- `npm run compile`:
- `python -m sphinx -b html docs docs/_build/html -W --keep-going`:

## Recommendation

(fill in after execution)
