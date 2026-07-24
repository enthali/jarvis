# Test Protocol: prompt-injection-tool

**Change Request**: prompt-injection-tool (#43)  
**Branch**: feature/prompt-injection-tool  
**UAT Spec**: [SPEC_UAT_INJECTPROMPT](../design/spec_uat_injectprompt.rst)  
**Date**: 2026-07-24

---

## Test Scope

This protocol covers User Acceptance Testing for the prompt-injection-tool
change, which consolidates session-targeted text injection into a single,
reusable primitive. The tests verify:

1. **Tool API** (`jarvis_injectPrompt`) — programmatic injection into named
   entity sessions
2. **Injection into live sessions** — text delivery to existing chat sessions
3. **Session spawn path** — automatic session creation with agent-mode binding
   and init-prompt delivery
4. **Slash-command execution** — verification that `/compact` can be injected and
   executes correctly (end-to-end)
5. **Command Palette UX** — entity quick-pick and text input-box flow
6. **Error handling** — user-visible errors for unknown entities (not throws)
7. **Consolidation** — verification that three former injection sites
   (message notification, auto-delivery, tree-click session open) now route
   through the single primitive

---

## Test Environment Setup

### Prerequisites

- **VS Code Extension Development Host (EDH)** with Jarvis extension from
  `feature/prompt-injection-tool` branch, launched via F5
- **Workspace**: `testdata/test.code-workspace` (File → Open Workspace from File…)
- **Settings**:
  - `jarvis.sessions.enabled: true` (default)
  - Jarvis Output Channel open (View → Output → Jarvis)
- **Test data** under `testdata/.jarvis/`:
  - Actor `Change Manager` with `agent: syspilot.cm`
  - Actor `Test Designer` with no `agent` field (or agent field is null)
  - Project `delivery-automation` with no `agent` field
  - Each entity has a `session.yaml` (or `project.yaml` / `event.yaml`) and
    `context.md`

### Cleanup Between Tests

- Delete all live chat sessions (via VS Code Chat pane) before each scenario
  that requires a new session spawn (T-3, T-4, T-6, T-11, T-14)
- Restore `testdata/.jarvis/actors/*/session.yaml` and `context.md` if modified
  during testing

---

## Test Scenarios

### Scenario T-1: Inject text into existing live session

**Acceptance Criteria**: REQ_INJ_TOOL, SPEC_INJ_INJECT AC-1

**Precondition**:
- `Change Manager` session exists and is open in the chat pane
- Chat input is empty

**Procedure**:
1. Execute (via dev agent or terminal tool call):
   ```
   jarvis_injectPrompt(actor="Change Manager", text="read your context.md")
   ```
2. Observe the chat input and tab focus

**Expected Result**:
- ✅ Text `"read your context.md"` appears in the `Change Manager` chat input
- ✅ Session is focused (tab is active)
- ✅ No init prompt is re-sent (session was already live)
- ✅ Tool returns success message with entity name and text preview

**Pass Criteria**: All three ✅ items verified

---

### Scenario T-2: Inject slash-command into existing session

**Acceptance Criteria**: REQ_INJ_TOOL, SPEC_INJ_INJECT AC-1

**Precondition**:
- `Change Manager` session exists and is open
- Chat input is empty

**Procedure**:
1. Execute:
   ```
   jarvis_injectPrompt(actor="Change Manager", text="/compact")
   ```
2. Observe the chat input

**Expected Result**:
- ✅ Text `/compact` appears in the `Change Manager` chat input
- ✅ Slash-command is recognized by VS Code (may show command hint/autocomplete)
- ✅ Session is focused

**Pass Criteria**: Slash-command visible in input

---

### Scenario T-3: Spawn new session for actor with agent-mode

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-4, REQ_INJ_TOOL, SPEC_INJ_INJECT AC-2

**Precondition**:
- No `Change Manager` chat session exists in VS Code
- `Change Manager` actor has `agent: syspilot.cm` in `session.yaml`

**Procedure**:
1. Delete the `Change Manager` chat session if it exists
2. Execute:
   ```
   jarvis_injectPrompt(actor="Change Manager", text="Hello from injection")
   ```
3. Observe:
   - Chat pane for new session
   - Mode selector in chat interface
   - Chat history (init prompt + injected text)
   - Jarvis Output Channel for `[MSG]` logs

**Expected Result**:
- ✅ New chat editor opens with title `Change Manager`
- ✅ Chat mode selector shows `syspilot.cm` (from actor `agent` field)
- ✅ Init prompt appears in chat history (placed before injected text)
- ✅ Text `"Hello from injection"` appears in chat input
- ✅ New session UUID is registered and lookup succeeds

**Pass Criteria**: All five ✅ items verified; agent-mode persists across session
focus/refocus

---

### Scenario T-4: Spawn new session for actor without agent-mode

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-4, SPEC_INJ_INJECT AC-2

**Precondition**:
- No `Test Designer` chat session exists
- `Test Designer` actor does NOT have an `agent` field (or it is null)

**Procedure**:
1. Delete the `Test Designer` chat session if it exists
2. Execute:
   ```
   jarvis_injectPrompt(actor="Test Designer", text="manual instruction")
   ```
3. Observe mode selector and init prompt

**Expected Result**:
- ✅ New chat editor opens with title `Test Designer`
- ✅ Chat mode selector shows default `vscode.lm` (no agent-specific mode)
- ✅ Init prompt (if any) appears in chat history
- ✅ Text `"manual instruction"` appears in chat input
- ✅ Session is registered with a UUID

**Pass Criteria**: New session spawned without agent-mode override

---

### Scenario T-5: Inject `/compact` and verify compaction (end-to-end)

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-5, AC-6, US_INJ_INJECT AC-6

**Precondition**:
- `Change Manager` session exists and contains 10+ messages in chat history
- Chat input is empty

**Procedure**:
1. Count the messages in the `Change Manager` chat history (record the number,
   e.g., 15 messages)
2. Execute:
   ```
   jarvis_injectPrompt(actor="Change Manager", text="/compact")
   ```
3. Observe:
   - Chat history as `/compact` executes
   - Message count after compaction completes
   - Confirmation message (if present)

**Expected Result**:
- ✅ `/compact` is added to chat history and submitted (not left in input)
- ✅ Chat compaction is triggered (visible in history, e.g., "Compacting…"
  message)
- ✅ Message count is reduced after compaction (e.g., from 15 to 5 messages)
- ✅ Recent messages remain; older messages are summarized or removed
- ✅ Completion message appears (e.g., "Session compacted from 15 to 5")

**Pass Criteria**: Message count visibly reduced; `/compact` successfully
executed end-to-end

---

### Scenario T-6: Command Palette: inject via quick-pick and input box

**Acceptance Criteria**: REQ_INJ_COMMAND AC-1, AC-2, AC-3, AC-4

**Precondition**:
- No sessions are open
- Multiple entities exist: `Change Manager`, `Test Designer`, `delivery-automation`

**Procedure**:
1. Press Ctrl+Shift+P to open the Command Palette
2. Search for "Inject Prompt" and select `Jarvis: Inject Prompt` command
3. In the quick-pick menu, select `Change Manager`
4. In the input box, type `/compact` and press Enter
5. Observe session creation and injection

**Expected Result**:
- ✅ Command `Jarvis: Inject Prompt` appears in the palette
- ✅ Quick-pick displays all entities with kind descriptions (actor, project,
  event)
- ✅ After selecting `Change Manager`, quick-pick closes
- ✅ Input box appears with placeholder "Text or slash-command to inject"
- ✅ After entering `/compact`, new `Change Manager` session is created/opened
- ✅ `/compact` is injected and submitted
- ✅ Chat shows agent mode, init prompt, and execution of `/compact`

**Pass Criteria**: Full flow from Command Palette to injection works end-to-end

---

### Scenario T-7: Command Palette: cancel at quick-pick

**Acceptance Criteria**: REQ_INJ_COMMAND AC-4

**Precondition**:
- No entity session open

**Procedure**:
1. Press Ctrl+Shift+P, search "Inject Prompt", select the command
2. In the quick-pick menu, press Escape

**Expected Result**:
- ✅ Quick-pick closes
- ✅ No further prompts appear
- ✅ No session is opened or modified
- ✅ Command execution completes gracefully

**Pass Criteria**: Cancel flow handled cleanly

---

### Scenario T-8: Command Palette: cancel at input box

**Acceptance Criteria**: REQ_INJ_COMMAND AC-4

**Precondition**:
- No entity session open

**Procedure**:
1. Press Ctrl+Shift+P, search "Inject Prompt", select the command
2. Select an entity (e.g., `Change Manager`) in the quick-pick
3. In the input box that appears, press Escape

**Expected Result**:
- ✅ Input box closes
- ✅ No session is opened for that entity
- ✅ No text is injected
- ✅ Command completes gracefully

**Pass Criteria**: Cancel after entity selection handled cleanly

---

### Scenario T-9: Unknown entity — tool error path

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-2, REQ_INJ_TOOL AC-5,
US_INJ_INJECT AC-5

**Precondition**:
- No entity named `NonExistent` exists

**Procedure**:
1. Execute:
   ```
   jarvis_injectPrompt(actor="NonExistent", text="test")
   ```
2. Observe error handling and tool return value

**Expected Result**:
- ✅ Tool returns an error message (does not throw or crash)
- ✅ Error message contains "Entity not found: NonExistent" or similar
- ✅ No new chat session is created
- ✅ Tool result is `{ 'text/plain': 'Error: Jarvis: Entity not found: NonExistent' }`
  or equivalent

**Pass Criteria**: Error handled gracefully; user-visible message provided

---

### Scenario T-10: Unknown entity — command error

**Acceptance Criteria**: REQ_INJ_COMMAND AC-5, US_INJ_INJECT AC-5

**Precondition**:
- No entity named `BadName` exists

**Procedure**:
1. Press Ctrl+Shift+P, search "Inject Prompt", select the command
2. In the quick-pick, search for "BadName" (no match found)
3. If quick-pick allows free-form input or user attempts selection anyway,
   proceed; otherwise manually invoke tool with invalid name (see T-9)

**Expected Result**:
- ✅ Quick-pick shows "No matching results" or similar (if filtering)
- ✅ If user attempts to submit/proceed with invalid name, a warning
  notification appears: "Jarvis: Entity not found" or similar
- ✅ No injection occurs
- ✅ Error is user-visible (warning notification, not a crash or silent fail)

**Pass Criteria**: Error handled gracefully in command UX

---

### Scenario T-11: Inject into project (non-agent entity)

**Acceptance Criteria**: REQ_INJ_PRIMITIVE (entity resolution for projects),
SPEC_INJ_INJECT

**Precondition**:
- No `delivery-automation` project session exists
- `delivery-automation` project has no `agent` field

**Procedure**:
1. Execute:
   ```
   jarvis_injectPrompt(actor="delivery-automation", text="Deploy now")
   ```
2. Observe session creation, mode selector, and injection

**Expected Result**:
- ✅ New chat session is created with title `delivery-automation`
- ✅ Mode selector shows default `vscode.lm` (no agent override)
- ✅ Text `"Deploy now"` appears in chat input
- ✅ Session UUID is registered and lookup succeeds

**Pass Criteria**: Projects (non-agent entities) are supported by injection
primitive

---

### Scenario T-12: Refactoring checkpoint — message-notification uses primitive

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller
migration)

**Precondition**:
- A message is queued for an actor (e.g., `Change Manager`)
- Auto-delivery is enabled
- Jarvis Output Channel is open

**Procedure**:
1. Trigger message delivery (e.g., via heartbeat poll or manual invocation)
2. Observe logs in Jarvis Output Channel and chat history

**Expected Result**:
- ✅ Message appears in the target session's chat input
- ✅ Logs indicate injection routed through the primitive
  (e.g., "injectPrompt called" or code inspection shows no duplicate
  session-resolve logic)
- ✅ If session did not exist, it was spawned with agent-mode and init prompt
- ✅ If session existed, it was focused (no re-init)
- ✅ No inline session-resolve + inject duplication in message handler

**Pass Criteria**: Message-notification refactored to use primitive

---

### Scenario T-13: Refactoring checkpoint — auto-delivery poll uses primitive

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller
migration, focus-restore responsibility)

**Precondition**:
- Auto-delivery poll loop is running (e.g., heartbeat job with queue steps)
- Target sessions exist for the queued destinations

**Procedure**:
1. Observe poll loop execution via Jarvis Output Channel and chat sessions
2. Verify focus management and logs

**Expected Result**:
- ✅ Injected text appears in target sessions
- ✅ Logs show injection routed through primitive
- ✅ No inline duplication of session-resolve + inject logic in poll loop
- ✅ Focus is managed by poll loop's own snapshot/restore (not by primitive)
- ✅ Previous focus is restored after auto-delivery completes

**Pass Criteria**: Auto-delivery poll refactored to use primitive; focus
responsibility correct

---

### Scenario T-14: Refactoring checkpoint — tree-click session-open uses primitive

**Acceptance Criteria**: REQ_INJ_PRIMITIVE AC-6, SPEC_INJ_INJECT (caller
migration)

**Precondition**:
- No `Change Manager` chat session exists

**Procedure**:
1. In the Jarvis sidebar, expand **Sessions** section
2. Click the `Change Manager` node to open the session
3. Observe session creation, agent-mode, init prompt, and logs

**Expected Result**:
- ✅ New chat session opens with title `Change Manager`
- ✅ Agent mode is set (if `agent` field is present in session.yaml)
- ✅ Init prompt appears in chat history
- ✅ Logs and code inspection show tree-click handler uses the primitive
- ✅ No duplicate session-resolve + inject logic in tree-click handler
- ✅ All three former injection sites (T-12, T-13, T-14) now route through
  the single primitive

**Pass Criteria**: Tree-click session-open refactored to use primitive;
consolidation complete

---

## Test Data Artifacts

### Required Test Files

Create or ensure the following files exist under `testdata/.jarvis/`:

**Actor: Change Manager**
- `testdata/.jarvis/actors/Change Manager/session.yaml`:
  ```yaml
  name: Change Manager
  agent: syspilot.cm
  kind: actor
  ```
- `testdata/.jarvis/actors/Change Manager/context.md`:
  ```markdown
  # Session Context: Change Manager
  
  Testing actor for prompt injection scenarios.
  ```

**Actor: Test Designer**
- `testdata/.jarvis/actors/Test Designer/session.yaml`:
  ```yaml
  name: Test Designer
  kind: actor
  ```
- `testdata/.jarvis/actors/Test Designer/context.md`:
  ```markdown
  # Session Context: Test Designer
  
  Actor without agent-mode binding for injection testing.
  ```

**Project: delivery-automation**
- `testdata/.jarvis/projects/delivery-automation/project.yaml`:
  ```yaml
  name: delivery-automation
  kind: project
  ```
- `testdata/.jarvis/projects/delivery-automation/context.md`:
  ```markdown
  # Project Context: delivery-automation
  
  Test project for prompt injection scenarios.
  ```

---

## Pass/Fail Criteria

**Pass**: All 14 scenarios pass their defined criteria.

**Fail**: Any scenario fails its defined criteria, or any assertion is not ✅.

**Conditional Pass** (with notes):
- T-10: If quick-pick does not support free-form search that displays
  non-existent entity names, test may be modified to directly invoke tool with
  invalid name (reuse T-9 result).

---

## Notes for Tester

- Keep the Jarvis Output Channel visible throughout testing to catch `[ERROR]`
  and `[MSG]` logs
- Each scenario that spawns a session should clean up (delete session) before
  the next scenario unless otherwise noted
- Scenarios T-12, T-13, T-14 are refactoring checkpoints verifying that
  existing functionality has been consolidated into the new primitive; code
  inspection or log traces are acceptable evidence
- Slash-command execution (T-2, T-5) depends on VS Code's command palette
  recognizing the injected command; verify by observing chat history showing
  command execution
- Focus-restore testing (T-13) requires careful observation of which chat tab
  is active before and after auto-delivery completes
