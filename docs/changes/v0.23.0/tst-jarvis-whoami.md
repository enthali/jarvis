# Test Protocol: jarvis-whoami

**Change Request**: jarvis-whoami (#44)  
**Branch**: feature/jarvis-whoami  
**UAT Spec**: [SPEC_UAT_WHOAMI](../design/spec_uat_whoami.rst)  
**Date**: 2026-07-24

---

## Test Scope

This protocol covers User Acceptance Testing for the `jarvis_whoAmI` tool, which
allows Jarvis actors to reliably recover their identity (name and `context.md`
path) after `/compact` or context loss. The tests verify:

1. **Registered actor path** — correct name and absolute `contextPath` returned
   for known actors (T-1, T-2)
2. **Non-actor session path** — user-visible error message returned, no crash
   (T-3)
3. **No-active-tab guard** — graceful error handling (T-4, code inspection
   acceptable)
4. **No-input contract** — tool requires zero parameters (T-5)
5. **Tool availability gating** — present when `sessions.enabled = true`; absent
   when `false` (T-6, T-7)
6. **Identity recovery end-to-end** — works correctly after `/compact` (T-8)

---

## Test Environment Setup

### Prerequisites

- **VS Code Extension Development Host (EDH)** with Jarvis extension from
  `feature/jarvis-whoami` branch, launched via F5
- **Workspace**: `testdata/test.code-workspace` (File → Open Workspace from
  File…)
- **Settings**: `jarvis.sessions.enabled: true` (default)
- **Jarvis Output Channel** open (View → Output → Jarvis)
- **Test data** under `testdata/.jarvis/actors/`:

  | Actor | File | Required content |
  |-------|------|-----------------|
  | `Change Manager` | `session.yaml` | `name: Change Manager` |
  | `Change Manager` | `context.md` | any content |
  | `Test Designer` | `session.yaml` | `name: Test Designer` |
  | `Test Designer` | `context.md` | any content |

### Cleanup Between Tests

- Before scenarios requiring a specific session as active tab, switch focus
  to that session's chat tab (click its tab in the chat pane)
- Restore `jarvis.sessions.enabled` to `true` and restart EDH after T-7

---

## Test Scenarios

### Scenario T-1: Registered actor — name and contextPath returned

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-1, AC-2; US_ACT_WHOAMI AC-1, AC-3

**Precondition**:
- `Change Manager` actor registered in `testdata/.jarvis/actors/`
- VS Code chat session named `Change Manager` is open and is the **active tab**

**Procedure**:
1. In the `Change Manager` chat session, open the tool picker (type `#`)
2. Select `whoAmI` from the tool list (or type `#whoAmI`)
3. Submit without providing any parameters
4. Observe the tool result in chat
5. Check the Jarvis Output Channel for the log entry

**Expected Result**:
- ✅ Tool returns JSON:
  ```json
  {
    "name": "Change Manager",
    "contextPath": "<workspace>/testdata/.jarvis/actors/Change Manager/context.md"
  }
  ```
- ✅ `name` field equals `"Change Manager"` exactly
- ✅ `contextPath` is an absolute path ending with `actors/Change Manager/context.md`
- ✅ The file at `contextPath` actually exists on disk (verify by opening it)
- ✅ Output Channel shows: `[SES] whoAmI: "Change Manager" → <contextPath>`
- ✅ No input parameters were requested or required

**Pass Criteria**: All six ✅ items verified

---

### Scenario T-2: Second registered actor — identity isolation

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-1, AC-2

**Precondition**:
- `Test Designer` actor registered in `testdata/.jarvis/actors/`
- VS Code chat session named `Test Designer` is open and is the **active tab**
  (switch tab focus away from `Change Manager`)

**Procedure**:
1. Click the `Test Designer` chat tab to make it active
2. In the `Test Designer` chat session, invoke `#whoAmI`
3. Submit without parameters
4. Observe the tool result

**Expected Result**:
- ✅ Tool returns JSON:
  ```json
  {
    "name": "Test Designer",
    "contextPath": "<workspace>/testdata/.jarvis/actors/Test Designer/context.md"
  }
  ```
- ✅ `name` equals `"Test Designer"` — NOT `"Change Manager"` (identity isolation)
- ✅ `contextPath` points to `actors/Test Designer/context.md`
- ✅ Output Channel shows the correct actor name in the log

**Pass Criteria**: Correct actor identity returned; no cross-contamination between sessions

---

### Scenario T-3: Non-actor session — error returned

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-3; US_ACT_WHOAMI AC-2

**Precondition**:
- A VS Code chat session is open whose title does **not** match any registered
  actor (e.g., a plain VS Code Chat session titled `Copilot` or `(untitled)`)
- This non-actor session is the **active tab**

**Procedure**:
1. Open a new VS Code Chat session (Command Palette → "Chat: New Chat") without
   Jarvis renaming it
2. Make this unnamed/generic session the active tab
3. In this session, invoke `#whoAmI`
4. Observe the tool result

**Expected Result**:
- ✅ Tool returns an error (JSON or plain text):
  ```json
  {
    "error": "You are not a registered actor. Please ask the user which actor you are."
  }
  ```
- ✅ No `name` or `contextPath` fields in the result
- ✅ No crash, no VS Code error notification, no extension error in Output Channel
- ✅ Tool completes normally (result is returned, not thrown)

**Pass Criteria**: Error delivered gracefully; user-actionable message provided

---

### Scenario T-4: No active tab — graceful error (code inspection)

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-3; SPEC_ACT_WHOAMI algorithm step 1

**Note**: This scenario is difficult to trigger manually in VS Code (there is
almost always an active tab). Code inspection is the primary verification method.

**Procedure** (code inspection):
1. Open `packages/core/src/extension.ts` (or the file registering
   `jarvis_whoAmI`)
2. Locate the `whoAmI` tool handler
3. Verify that the handler contains a guard:
   ```typescript
   const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
   if (!activeTab) {
     return new vscode.LanguageModelToolResult([...error message...]);
   }
   ```

**Expected Result**:
- ✅ The `!activeTab` guard is present in the source code
- ✅ The error message in the guard reads: `"No active tab. Please ask the
  user which actor you are."` or equivalent
- ✅ The guard uses `return` (not `throw`) to return the error

**Pass Criteria**: Guard verified by code inspection; no manual trigger required

---

### Scenario T-5: Tool requires no input parameters

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-1; US_ACT_WHOAMI AC-3

**Precondition**:
- `Change Manager` session is open and active

**Procedure**:
1. In the `Change Manager` chat, type `#` to open the tool picker
2. Find and select `whoAmI`
3. Observe whether the tool prompts for any parameters before submitting

**Expected Result**:
- ✅ No parameter input box or prompt appears after selecting `whoAmI`
- ✅ The tool submits immediately (or on confirmation) without requiring input
- ✅ Tool result is returned as in T-1

**Pass Criteria**: Tool invokable with zero parameters

---

### Scenario T-6: Tool visible in tool picker (sessions.enabled = true)

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-4, AC-5

**Precondition**:
- `jarvis.sessions.enabled = true` (default)
- EDH running

**Procedure**:
1. Open any VS Code Chat session
2. Type `#` to open the tool picker
3. Search/scroll for `whoAmI`
4. Observe the tool name as displayed in the picker

**Expected Result**:
- ✅ `whoAmI` appears in the tool picker list
- ✅ The tool reference name displayed is `whoAmI` (short name, not
  `jarvis_whoAmI`)
- ✅ Tool has a description in the picker mentioning identity recovery or
  `context.md`

**Pass Criteria**: Tool discoverable with correct name

---

### Scenario T-7: Tool NOT available (sessions.enabled = false)

**Acceptance Criteria**: REQ_ACT_WHOAMI AC-4

**Precondition**:
- `jarvis.sessions.enabled` set to `false` in settings

**Procedure**:
1. Open VS Code Settings (`Ctrl+,`), search for `jarvis.sessions.enabled`,
   set to `false`
2. Restart the Extension Development Host (F5 reload)
3. Open VS Code Chat, type `#`, search for `whoAmI`

**Expected Result**:
- ✅ `whoAmI` does **not** appear in the tool picker
- ✅ No error notification about missing tool
- ✅ Extension loads without crash

**Teardown**: Reset `jarvis.sessions.enabled` to `true`, restart EDH

**Pass Criteria**: Tool absent when gating setting is off

---

### Scenario T-8: Identity recovery after /compact — end-to-end

**Acceptance Criteria**: US_ACT_WHOAMI AC-1; REQ_ACT_WHOAMI AC-2

**Precondition**:
- `Change Manager` session is open with 10+ messages in history

**Procedure**:
1. In the `Change Manager` session, type `/compact` and submit
2. Wait for compaction to complete (message count decreases)
3. In the same `Change Manager` session (post-compact), invoke `#whoAmI`
4. Note the returned `contextPath`
5. Open the file at `contextPath` in VS Code to verify it is accessible

**Expected Result**:
- ✅ After `/compact`, the tool still returns the correct actor name and path
- ✅ `name` equals `"Change Manager"` (not affected by compaction)
- ✅ The `contextPath` file exists and can be opened
- ✅ End-to-end identity recovery demonstrated: actor can read its `context.md`
  to resume its role

**Pass Criteria**: Identity recovery works post-compact; `contextPath` readable

---

## Test Data

### Required Files

```
testdata/.jarvis/actors/
  Change Manager/
    session.yaml       # name: Change Manager
    context.md         # any content (actor's persistent memory)
  Test Designer/
    session.yaml       # name: Test Designer
    context.md         # any content
```

**Minimum `session.yaml` content:**
```yaml
name: Change Manager
```

---

## Pass/Fail Criteria

**Pass**: All 8 scenarios pass their defined criteria.

**Fail**: Any scenario fails a ✅ item.

**Conditional Pass** (with notes):
- T-4 may be verified by code inspection alone if the "no active tab" state
  cannot be triggered manually in the EDH.

---

## Notes for Tester

- Always confirm the **active tab** is the expected session before invoking
  `#whoAmI` — the tool uses the active tab label heuristic
- Keep the Jarvis Output Channel visible to verify `[SES] whoAmI` log entries
- T-7 requires a restart of the EDH — plan accordingly to do it after other
  scenarios that don't require restart
- The `contextPath` returned should be an absolute path; verify by checking
  whether it starts with the system drive letter (Windows) or `/` (Unix)
