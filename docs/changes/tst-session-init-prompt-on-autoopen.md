# Test Protocol: session-init-prompt-on-autoopen

**Change Document:** [session-init-prompt-on-autoopen.md](session-init-prompt-on-autoopen.md)
**Verification Report:** [val-session-init-prompt-on-autoopen.md](val-session-init-prompt-on-autoopen.md)
**Branch:** `feature/session-init-prompt-on-autoopen`
**UAT Spec:** `docs/design/spec_uat_sessioninitprompt.rst` (`SPEC_UAT_SESSIONINITPROMPT`)
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from
   `feature/session-init-prompt-on-autoopen`.
3. Open workspace: `testdata/test.code-workspace`
   (File → Open Workspace from File…).  This sets `testdata/` as the
   workspace root.
4. Verify `jarvis.sessions.enabled` is `true` (default).
5. Create the following test-data files (create folders as needed):

   - `testdata/.jarvis/sessions/copilot-cm/session.yaml`:
     ```yaml
     name: copilot-cm
     summary: "Test session with agent binding"
     agent: syspilot.cm
     ```
   - `testdata/.jarvis/sessions/copilot-cm/context.md`:
     ```markdown
     # copilot-cm context
     Test context file.
     ```
   - `testdata/.jarvis/sessions/dev-feature-x/session.yaml`:
     ```yaml
     name: dev-feature-x
     summary: "Test session without agent binding"
     ```
   - `testdata/.jarvis/sessions/dev-feature-x/context.md`:
     ```markdown
     # dev-feature-x context
     Test context file.
     ```

6. Expand the **Sessions** section in the Jarvis sidebar — both leaf nodes
   (`copilot-cm`, `dev-feature-x`) must be visible.
7. Open the **Jarvis** Output Channel (View → Output → Jarvis) so that
   `[MSG]` and `[ERROR]` log entries can be inspected during each test.
8. **Before each scenario that requires a new session:** delete all named VS
   Code Chat sessions in the EDH so that no `copilot-cm` or `dev-feature-x`
   chat exists yet (ensures the new-session path is taken).
9. **Restore** any test-data files modified or created during a scenario
   before running the next one.

---

## Test Cases

### T-1 — New session via tree-click — agent field present

*CR AC-1*

**Setup:** `copilot-cm/session.yaml` has `agent: syspilot.cm`. No VS Code Chat
session named `copilot-cm` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `copilot-cm` label in the Sessions Tree (not the inline icon — click the name text). | — | |
| 2 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 3 | Observe the chat session title. | Title is renamed to `copilot-cm`. | |
| 4 | Observe the Chat mode selector. | Shows `syspilot.cm` (the value from `agent`). Mode was applied at creation time, before `openNewChatEditor()` was called. | |
| 5 | Observe the chat transcript. | An init-prompt message appears immediately after the rename. Text matches the rendered `jarvis.agentSession.initPromptTemplate` (or default template), with `{kind}`, `{name}`, `{contextPath}` placeholders substituted. | |
| 6 | Confirm no `context.md` editor tab opens. | No editor tab for `context.md` is visible. | |
| 7 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-2 — New session via tree-click — no agent field

*CR AC-1 (no-agent variant)*

**Setup:** `dev-feature-x/session.yaml` has **no** `agent` field. No VS Code Chat
session named `dev-feature-x` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `dev-feature-x` label in the Sessions Tree. | — | |
| 2 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 3 | Observe the chat session title. | Title is renamed to `dev-feature-x`. | |
| 4 | Observe the Chat mode selector. | The chat opens in the user's currently active VS Code Chat mode (no mode-prime step executed). | |
| 5 | Observe the chat transcript. | An init-prompt message appears (entity match found via `scanner.entities`; init-prompt does not require an `agent` field). | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-3 — Existing session via tree-click — no re-apply

*CR AC-2*

**Setup:** A VS Code Chat session named `copilot-cm` already exists (e.g. from T-1
or manually renamed). A different editor tab is focused so the chat is in the
background.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `copilot-cm` label in the Sessions Tree. | — | |
| 2 | Observe the VS Code editor area. | The `copilot-cm` chat tab gains focus. No new chat editor is created. | |
| 3 | Observe the chat session title. | The `/rename` sequence did NOT fire. Title remains `copilot-cm` without a transient generic title. | |
| 4 | Observe the chat transcript. | No init-prompt text was added to the transcript. | |
| 5 | Observe the Chat mode selector. | Mode retains whatever the session had before the click — no mode change occurred. | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-4 — Auto-delivery to deleted session — agent mode + init-prompt

*CR AC-3*

**Setup:** `copilot-cm/session.yaml` has `agent: syspilot.cm`. All named VS Code
Chat sessions are deleted. Queue a message for `"copilot-cm"` using the
`jarvis_sendToSession` MCP/LM tool (or by adding a row to
`testdata/.jarvis/messages.json`).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Confirm the queued message is present in `messages.json`. | Row for `copilot-cm` visible. | |
| 2 | Wait up to 10 s for the auto-delivery poll cycle (default interval: 5 s). | — | |
| 3 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 4 | Observe the chat session title. | Title is renamed to `copilot-cm`. | |
| 5 | Observe the Chat mode selector. | Shows `syspilot.cm`. | |
| 6 | Observe the chat transcript — first message. | The init-prompt message appears before the queued message. | |
| 7 | Observe the chat transcript — second message. | The queued message text appears after the init-prompt. | |
| 8 | Check the Jarvis Output Channel. | A `[MSG]` info entry confirms delivery; no `[ERROR]` entries. | |

---

### T-5 — Cross-path equivalence — tree-click vs auto-delivery

*CR AC-4*

**Setup:** T-1 and T-4 have been executed independently and results recorded.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Compare the Chat mode selector label from T-1 and T-4. | Both show `syspilot.cm`. | |
| 2 | Compare the init-prompt message text from T-1 and T-4. | Text is identical (same template rendered for the same entity). | |
| 3 | Overall assessment. | No user-visible difference exists between the two open paths for the same entity. | |

---

### T-E1 — Edge: no `agent` field — init-prompt still sent

*Edge case 1*

**Setup:** `dev-feature-x/session.yaml` has no `agent` field. No chat named
`dev-feature-x` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `dev-feature-x` label in the Sessions Tree. | — | |
| 2 | Observe the chat transcript. | Init-prompt message is present. The absence of `agent` suppresses only the mode-prime step — it does NOT suppress the init-prompt. | |
| 3 | Check the Jarvis Output Channel. | No `[ERROR]` entries related to a missing agent. | |

---

### T-E2 — Edge: entity lookup miss — graceful skip

*Edge case 2*

**Setup:** No session, project, or event YAML exists with the name
`"unknown-entity"`. Queue a message for `"unknown-entity"` via
`jarvis_sendToSession`. All named chat sessions are deleted.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Wait up to 10 s for the auto-delivery poll. | — | |
| 2 | Observe the VS Code editor area. | A new VS Code Chat session opens and is renamed to `"unknown-entity"`. | |
| 3 | Observe the Chat mode selector. | Reflects the user's current mode — no mode-prime `workbench.action.chat.open { mode }` call was made. | |
| 4 | Observe the chat transcript. | No init-prompt text appears. The queued message is delivered as the first entry. | |
| 5 | Check the Jarvis Output Channel. | A `[MSG]` info or warn entry confirms delivery; no `[ERROR]` entries. | |

---

### T-E3 — Edge: typo in `agent` field — no crash; spec gap noted

*Edge case 3*

**Setup:** Create `testdata/.jarvis/sessions/bad-agent/session.yaml`:
```yaml
name: bad-agent
summary: "Edge-case entity with invalid agent name"
agent: totally.unknown.mode
```
and a matching `context.md`. Reload (or rescan) so the new entity appears in
the Sessions Tree. No chat named `bad-agent` exists.

**Teardown:** Delete `testdata/.jarvis/sessions/bad-agent/` after the test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `bad-agent` label in the Sessions Tree. | — | |
| 2 | Observe VS Code — no crash, no error notification. | Extension does not throw an unhandled exception; no VS Code error dialog appears. | |
| 3 | Observe the chat. | A new chat opens and is renamed to `bad-agent`. | |
| 4 | **Record** the observed Chat mode selector label. | VS Code may silently ignore the unknown mode and open in the current user mode. Record the observed value: ________________ | |
| 5 | Observe the chat transcript. | Init-prompt message is present (entity match found; init-prompt does not validate agent). | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |
| 7 | Note spec gap. | Flag to CM: `SPEC_MSG_AGENTSESSION` does not normatively define behaviour for an invalid `entity.agent` name. Deferred to follow-on CR. | |

---

### T-E4 — Edge: multiple messages queued — init-prompt sent once

*Edge case 4*

**Setup:** `copilot-cm/session.yaml` has `agent: syspilot.cm`. All named chat
sessions are deleted. Queue three distinct messages to `"copilot-cm"`:
1. `"First message"`
2. `"Second message"`
3. `"Third message"`

Confirm all three are present in `messages.json` before proceeding.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Wait up to 30 s for auto-delivery to process all messages (may span multiple poll cycles). | — | |
| 2 | Count init-prompt occurrences in the chat transcript. | Init-prompt appears exactly **once** at the top. | |
| 3 | Verify all three messages are delivered in order. | `"First message"`, `"Second message"`, `"Third message"` appear in order, after the init-prompt. | |
| 4 | Verify the existing-session path for messages 2 and 3. | No second rename fires; no second init-prompt added for messages 2 and 3. | |
| 5 | Check the Jarvis Output Channel. | Three `[MSG]` delivery entries; no `[ERROR]` entries. | |

---

### T-E5 — Edge: tree-click to session in background tab

*Edge case 5*

**Setup:** A VS Code Chat session named `copilot-cm` exists and contains prior
messages. A different editor tab is active so the chat is in the background.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `copilot-cm` label in the Sessions Tree. | — | |
| 2 | Observe the VS Code editor area. | The `copilot-cm` chat gains focus; the previously active editor moves to the background. | |
| 3 | Observe the chat transcript. | Existing transcript is intact. No new init-prompt message was appended. | |
| 4 | Observe the chat session title. | Remains `copilot-cm` — no rename fired. | |
| 5 | Verify no second chat tab created. | Only one `copilot-cm` chat tab exists. | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-E6 — Edge: agent file without `user-invocable` key — appears in picker

*CR AC-5; SPEC_SES_AGENT_DISCOVERY (revised); REQ_SES_AGENT_DISCOVERY AC-2 (revised)*

**Setup:** Create two test agent files in the workspace's `.github/agents/` folder:

1. `.github/agents/no-uikey-agent.agent.md`:
   ```markdown
   ---
   name: no-uikey-agent
   description: "Test agent without user-invocable key"
   ---
   ```
   *(No `user-invocable` line at all.)*

2. `.github/agents/optout-agent.agent.md`:
   ```markdown
   ---
   name: optout-agent
   description: "Test agent explicitly opted out"
   user-invocable: false
   ---
   ```

Reload the Extension Host (**Ctrl+Shift+P → Developer: Reload Window** in the EDH) so frontmatter is freshly scanned.

**Teardown:** Delete both test agent files after the scenario.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Verify the two test files exist in `.github/agents/`. | `no-uikey-agent.agent.md` and `optout-agent.agent.md` are present with the frontmatter above. | |
| 2 | Invoke `jarvis.newSession` ("+ " button at top of Sessions Tree). Enter a session name and summary. | The QuickPick "Select the agent for this session" appears. | |
| 3 | Inspect the QuickPick items — look for `no-uikey-agent`. | `no-uikey-agent` IS visible in the picker. A file that lacks the `user-invocable` key entirely MUST be included by default. | |
| 4 | Inspect the QuickPick items — look for `optout-agent`. | `optout-agent` is NOT visible in the picker. Explicit `user-invocable: false` is the only exclusion signal. | |
| 5 | Observe the sort order of the items. | Items are sorted alphabetically ("No agent" first, then agents A–Z). | |
| 6 | Verify no regression — other previously visible agents are still present. | All agents shown in prior T-E1/T-E2 executions remain visible. | |
| 7 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

---

### T-F1-1 — Agent with `name: Change Manager` in frontmatter appears in picker as "Change Manager"

*REQ_SES_AGENT_DISCOVERY AC-7; REQ_SES_AGENT_PICKER AC-1*

**Setup:** `testdata/.github/agents/change-agent.agent.md` exists with
`name: Change Manager` in its frontmatter. EDH open on
`testdata/test.code-workspace`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession` (`+` button at top of Sessions Tree). Enter any session name and summary. | The QuickPick "Select the agent for this session" appears. | |
| 2 | Inspect the picker items — look for the entry corresponding to `change-agent.agent.md`. | The entry is labelled `Change Manager` (frontmatter `name:` value), not `change-agent` (filename stem). | |
| 3 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-F1-2 — Agent without `name:` key appears as filename stem

*REQ_SES_AGENT_DISCOVERY AC-3/AC-7*

**Setup:** Create `testdata/.github/agents/noname-agent.agent.md` with the
following frontmatter (no `name:` key):
```markdown
---
description: "Agent with no name key"
user-invocable: true
---
```
Reload the Extension Host (Ctrl+Shift+P → Developer: Reload Window in the EDH)
so the new file is scanned.

**Teardown:** Delete `testdata/.github/agents/noname-agent.agent.md` after
the test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession`. Enter any session name and summary. | QuickPick agent picker appears. | |
| 2 | Inspect the picker — look for the entry for `noname-agent.agent.md`. | The entry is labelled `noname-agent` (filename stem, `.agent.md` suffix stripped), because no frontmatter `name:` was found. | |
| 3 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-F1-3 — Session created with identity "Change Manager" stores `agent: Change Manager` in session.yaml

*REQ_SES_AGENT_PICKER AC-4*

**Setup:** No folder `testdata/.jarvis/sessions/cm-identity-test/` exists.

**Teardown:** Delete `testdata/.jarvis/sessions/cm-identity-test/` after the
test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession`. Enter name `cm-identity-test` and a summary. | QuickPick agent picker appears. | |
| 2 | Select `Change Manager` from the agent picker. | Wizard completes; new session entry appears in the Sessions Tree. | |
| 3 | Open `testdata/.jarvis/sessions/cm-identity-test/session.yaml` in a text editor. | File exists. | |
| 4 | Inspect the `agent` field in `session.yaml`. | Value is `agent: Change Manager` (the frontmatter display name, not the filename stem). | |
| 5 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-F1-4 — Opening session with `agent: Change Manager` invokes mode "Change Manager"

*REQ_SES_AGENT_OPEN AC-1; backward-compat*

**Setup:** `cm-identity-test/session.yaml` created in T-F1-3 contains
`agent: Change Manager`. No VS Code Chat session named `cm-identity-test`
exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `cm-identity-test` label in the Sessions Tree. | — | |
| 2 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 3 | Observe the chat session title. | Title is `cm-identity-test`. | |
| 4 | Observe the Chat mode selector. | Shows `Change Manager` — the stored agent identity string is passed verbatim as the `mode` parameter to `workbench.action.chat.open`. | |
| 5 | Observe the chat transcript. | Init-prompt message appears. | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-F1-5 — Existing session.yaml `agent: syspilot.cm` (filename stem) still resolves — backward compat

*REQ_SES_AGENT_DISCOVERY AC-7; backward-compat*

**Setup:** If not already present, create
`testdata/.github/agents/syspilot.cm.agent.md` with the following
frontmatter (no `name:` key):
```markdown
---
description: "syspilot.cm (no name key)"
user-invocable: true
---
```
Ensure `testdata/.jarvis/sessions/copilot-cm/session.yaml` contains
`agent: syspilot.cm`. No VS Code Chat session named `copilot-cm` exists.
Reload the Extension Host so the new agent file is scanned.

**Teardown:** Delete `testdata/.github/agents/syspilot.cm.agent.md` after
the test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Click the `copilot-cm` label in the Sessions Tree. | — | |
| 2 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 3 | Observe the chat session title. | Title is `copilot-cm`. | |
| 4 | Observe the Chat mode selector. | Shows `syspilot.cm` — the filename stem is used directly as the mode identifier (no frontmatter `name:` required). | |
| 5 | Observe the chat transcript. | Init-prompt message appears. | |
| 6 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-S1 — Create session "Change" — folder `Change` created verbatim

*REQ_SES_NEWENTITY AC-2*

**Setup:** No folder `testdata/.jarvis/sessions/Change/` exists.

**Teardown:** Delete `testdata/.jarvis/sessions/Change/` after the test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession`. Enter name `Change` and a summary. Complete the wizard (select any agent or "No agent"). | Wizard completes. | |
| 2 | Inspect the filesystem: check `testdata/.jarvis/sessions/`. | Folder `Change/` exists (capital C, verbatim — no lowercase or slug transformation). | |
| 3 | Open `testdata/.jarvis/sessions/Change/session.yaml`. | `name` field equals `Change`. | |
| 4 | Observe the Sessions Tree. | Entry labelled `Change` is visible. | |
| 5 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-S2 — Create session "Change Manager" (with space) — folder `Change Manager` created verbatim

*REQ_SES_NEWENTITY AC-2*

**Setup:** No folder `testdata/.jarvis/sessions/Change Manager/` exists.

**Teardown:** Delete `testdata/.jarvis/sessions/Change Manager/` after the
test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession`. Enter name `Change Manager` (with a space) and a summary. Complete the wizard. | Wizard completes. | |
| 2 | Inspect the filesystem: check `testdata/.jarvis/sessions/`. | Folder `Change Manager/` exists with a literal embedded space. No kebab-case or slug transformation was applied. | |
| 3 | Open `testdata/.jarvis/sessions/Change Manager/session.yaml`. | `name` field equals `Change Manager`. | |
| 4 | Observe the Sessions Tree. | Entry labelled `Change Manager` is visible. | |
| 5 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

### T-S3 — Create session "a/b" — error shown, no folder created

*REQ_SES_NEWENTITY AC-9*

**Setup:** Confirm no folder `testdata/.jarvis/sessions/a/` exists before
the test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Invoke `jarvis.newSession`. When prompted for a session name, type `a/b` (forward-slash embedded in the name). | InputBox shows an inline red error message immediately (no separate notification). The OK button is disabled until the name is corrected. | |
| 2 | Without correcting the name, press Escape to cancel. | No separate error notification is shown. No log entry fires — `validateInput` is informational, not an error event. | |
| 3 | Inspect the filesystem: check `testdata/.jarvis/sessions/`. | No `a/` directory and no `a/b/` path were created. | |
| 4 | Observe the Sessions Tree. | No new entry for `a/b` or `a` appears. | |
| 5 | Check the Jarvis Output Channel. | No `[ERROR]` entries (inline validation does not log errors). | |

---

### T-S4 — Pre-staged folder `change-manager/` with `name: Change Manager` — identity resolves from name field

*REQ_SES_NEWENTITY AC-2 (storage-only note)*

**Setup:** Manually create the following files **before** launching the EDH
(or before reloading):

`testdata/.jarvis/sessions/change-manager/session.yaml`:
```yaml
name: Change Manager
summary: "Pre-staged backward-compat session"
```

`testdata/.jarvis/sessions/change-manager/context.md`:
```markdown
# Change Manager context
Pre-staged context for backward-compat test.
```

The folder name (`change-manager`) **intentionally differs** from the `name`
field (`Change Manager`). Reload or rescan so the entry appears in the
Sessions Tree.

**Teardown:** Delete `testdata/.jarvis/sessions/change-manager/` after the
test.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Observe the Sessions Tree. | Entry is labelled `Change Manager` (from the `name` field), NOT `change-manager` (the folder name). | |
| 2 | Click the `Change Manager` entry in the Sessions Tree. No VS Code Chat session named `Change Manager` should exist yet. | — | |
| 3 | Observe the VS Code editor area. | A VS Code Chat editor panel opens. | |
| 4 | Observe the chat session title. | Renamed to `Change Manager`. | |
| 5 | Observe the init-prompt. | Init-prompt message appears. | |
| 6 | Inspect the filesystem. | The backing folder is still `change-manager/` — no directory rename occurred. | |
| 7 | Check the Jarvis Output Channel. | No `[ERROR]` entries. | |

---

## Results Summary

| ID | Scenario | Result |
|----|----------|--------|
| T-1 | New session via tree-click — agent field present | |
| T-2 | New session via tree-click — no agent field | |
| T-3 | Existing session via tree-click — no re-apply | |
| T-4 | Auto-delivery to deleted session — agent mode + init-prompt | |
| T-5 | Cross-path equivalence — tree-click vs auto-delivery | |
| T-E1 | Edge: no `agent` field — init-prompt still sent | |
| T-E2 | Edge: entity lookup miss — graceful skip | |
| T-E3 | Edge: typo in `agent` field — no crash | |
| T-E4 | Edge: multiple messages queued — init-prompt sent once | |
| T-E5 | Edge: tree-click to session in background tab | |
| T-E6 | Edge: agent file without `user-invocable` key — appears in picker | |
| T-F1-1 | Agent with frontmatter `name:` appears in picker by display name | |
| T-F1-2 | Agent without `name:` key appears as filename stem | |
| T-F1-3 | Session created with "Change Manager" stores `agent: Change Manager` in session.yaml | |
| T-F1-4 | Opening session with `agent: Change Manager` invokes mode "Change Manager" | |
| T-F1-5 | Existing `agent: syspilot.cm` (filename stem) still resolves — backward compat | |
| T-S1 | Create session "Change" — folder `Change` created verbatim | |
| T-S2 | Create session "Change Manager" (with space) — folder created verbatim | |
| T-S3 | Create session "a/b" — error shown, no folder created | |
| T-S4 | Pre-staged folder `change-manager/` with `name: Change Manager` — identity from name field | |

**Overall:** PASS / FAIL / PASS-WITH-NOTES (fill in at execution)

**Tester signature:** _________________________ **Date:** _____________
