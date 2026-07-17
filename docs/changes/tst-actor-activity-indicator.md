# Test Protocol: actor-activity-indicator

**Change Document:** docs/changes/actor-activity-indicator.md (GH #28)  
**Branch:** feature/actor-activity-indicator  
**Design commit:** 5d95e79 (amended after F5 finding — icon mechanism changed from label-prefix codicons to `item.iconPath`)  
**Status:** ready for execution  
**Scope:** Two-state hook-driven activity indicator on entity tree nodes + session_id bug fix

---

## Preconditions and Test Data

1. Launch the Extension Development Host (F5) from `feature/actor-activity-indicator`.
2. Open `testdata/test.code-workspace` with `jarvis.sessions.enabled=true` and
   the hook engine active (`jarvis.hooks.autoInstall=true` or hooks manually installed).
3. Ensure `.github/hooks/` contains the Jarvis hook bridge files so VS Code
   agent lifecycle events flow through to the extension.
4. Prepare at least one Actor bound to a VS Code chat session with the same name
   (e.g. `testdata/.jarvis/actors/copilot-cm/actor.yaml` bound to the
   `syspilot.cm` agent), and one Project/Event with an active agent session.
5. Keep the Jarvis Output Channel open (View → Output → Jarvis) throughout;
   the session-id bug fix (Group A) requires observing session-id values in
   log lines.
6. For groups B–C: open an agent chat session for the test entity and observe
   the entity tree. Sending any chat message generates a `UserPromptSubmit`
   hook event; finishing an agent turn generates a `Stop` event.
7. Restore all entities to a known state before each new group.

---

## Test Cases

### Group A: Session-ID Bug Fix (REQ_HOOK_INTAKE AC-8)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | session_id field is extracted (snake_case) | Set log level to `trace`. Open an agent chat and send a prompt. Inspect the Jarvis Output Channel for the `[Hook]` entry for the `UserPromptSubmit` event. | The log line includes a non-empty session identifier alongside the event name — e.g. `[Hook] UserPromptSubmit session_id=<uuid>`. The session-id field is NOT `undefined` or absent. | **PASS** if the session id appears populated in the hook log; **FAIL** if it is `undefined` or missing (which would indicate the old camelCase bug is still present). |
| A-2 | Log entry at info level shows session id | With the default `info` log level, trigger a hook event. Check the Output Channel. | The info-level log line includes the event name and session id (but not the full payload). No regression from `REQ_HOOK_LOG` AC-2 behavior. | **PASS** if session id is visible at default verbosity; otherwise **FAIL**. |

### Group B: Default Inactive State

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | All entity nodes show inactive (default) icon at startup | Open the Extension Development Host with a workspace containing Actors, Projects, and Events. Inspect the Jarvis Entities tree immediately, before triggering any hook events. | Every entity leaf node (Actor, Project, Event) shows its normal default icon — the activity indicator does NOT set `iconPath` when inactive, so the default entity icon or any existing task badge icon is displayed. No green filled-circle icon appears on any node. The label text is unmodified (no codicon prefix). | **PASS** if all nodes show their default icons with unmodified labels; otherwise **FAIL**. |
| B-2 | Inactive entities retain default icon while others become active | An entity that has never had a hook event fires for it still shows its default icon after other entities have become active. | The inactive entity's icon remains unchanged. Its label, click-to-chat, context menu, and file children are unaffected. | **PASS** if the inactive entity's icon and label are unchanged; otherwise **FAIL**. |

### Group C: Active State Transitions

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | Actor node transitions to active on hook event | Open an agent chat session whose name matches an Actor entity. Send a chat message (triggers `UserPromptSubmit`). Observe the Jarvis Entities tree. | The matching Actor node's icon changes to a green filled-circle (`ThemeIcon('circle-filled')` with green color) without any manual rescan. The label text is NOT modified (no codicon prefix added). | **PASS** if the Actor node shows the green filled-circle icon within a few seconds of the event; otherwise **FAIL**. |
| C-2 | Project node transitions to active on hook event | Repeat C-1 with a Project entity whose name matches the open chat session. | The Project node shows the green filled-circle icon (`iconPath = ThemeIcon('circle-filled', ThemeColor('charts.green'))`). | **PASS** if the Project node updates to the active icon; otherwise **FAIL**. |
| C-3 | Event node transitions to active on hook event | Repeat C-1 with an Event entity. | The Event node shows the green filled-circle icon. | **PASS** if the Event node updates to the active icon; otherwise **FAIL**. |
| C-4 | Entity reverts to default icon on Stop event | After an entity is active (C-1/C-2/C-3), wait for the agent turn to complete (triggers `Stop` event). Observe the tree. | The entity node's `iconPath` is cleared (reverts to the default entity icon or task badge icon if set by `TaskBadgeDecorator`). The green filled-circle disappears without any manual rescan. The label is unchanged. | **PASS** if the green icon disappears after `Stop`; otherwise **FAIL**. |
| C-5 | No third state or timeout-based transitions | Leave an active entity idle (no `Stop` event fired) for at least 30 seconds. Observe whether the icon changes. | The entity retains the green filled-circle icon — no timeout causes it to revert. Only a `Stop` event clears the active icon. | **PASS** if the green icon persists without a `Stop` event; otherwise **FAIL**. |
| C-6 | Burst of events does not cause repeated tree refreshes | Send a sequence of tool-use prompts that generate multiple `PreToolUse`/`PostToolUse` events in rapid succession while an entity is already active. Observe that the tree does not visibly flicker or reload repeatedly. | The entity retains the green filled-circle icon throughout. The tree refreshes at most once per state flip — burst events within an already-active session do not cause redundant refreshes. | **PASS** if no observable tree flicker/reload storm occurs; otherwise **FAIL**. |

### Group D: Graceful Degradation

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | Unmapped session_id produces no error | Trigger a hook event from a chat session whose name does NOT match any Actor/Project/Event entity (e.g. a generic "New Chat" window). Inspect the Output Channel and observe the tree. | No error or exception appears in the Output Channel. All existing entity nodes remain at their current state (no spurious active/inactive flip). | **PASS** if the unmapped event is silently ignored and no entity state changes; otherwise **FAIL**. |
| D-2 | Hook event with missing session_id is ignored | If a malformed hook payload arrives with no `session_id` field (simulate by temporarily editing a hook bridge script to omit the field, then restore), trigger a hook event. | No error or exception appears. No entity state changes. The tree is unaffected. | **PASS** if the missing-field event is silently ignored; otherwise **FAIL**. |
| D-3 | Correlation failure degrades silently | If the session-id → entity-name lookup yields no matches for all received events (simulate: open a chat session whose UUID does not appear in getAllSessions), observe the tree over several events. | No entity node shows the green filled-circle icon (all remain at their default icon). No exceptions thrown. No label modifications or garbled text appears. | **PASS** if the feature degrades to all-default-icon without error or visual corruption; otherwise **FAIL**. |

### Group E: No Conflict with TaskBadgeDecorator

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| E-1 | Active green icon overrides task badge on Project node | On a Project that has an overdue or due-soon task (so `TaskBadgeDecorator` sets `iconPath` to a task icon), trigger a hook event to make it active. Observe the node icon. | The Project node shows the green filled-circle icon — the `ActivityDecorator` sets `iconPath` to `ThemeIcon('circle-filled', ThemeColor('charts.green'))` when active, which takes precedence over the task badge icon during the active period. The label text is unchanged. | **PASS** if the green icon is visible while the entity is active; otherwise **FAIL**. |
| E-2 | Inactive entity restores task badge icon | After the entity in E-1 receives a `Stop` event and becomes inactive, observe the node icon. | The green filled-circle icon disappears. The task badge icon (set by `TaskBadgeDecorator`) becomes visible again — `ActivityDecorator` does NOT set `iconPath` when inactive, so `TaskBadgeDecorator`'s `iconPath` is the last writer and controls the icon at rest. | **PASS** if the task badge icon is restored on the inactive entity; otherwise **FAIL**. |
| E-3 | Inactive entity with no task badge shows default icon | On a Project or Actor with NO task badge (no overdue/due-soon tasks), confirm the entity remains inactive. Verify the node icon. | The entity shows its default entity icon (no green circle, no task badge). `ActivityDecorator` does not modify `iconPath` for inactive entities. The label text is unchanged. | **PASS** if the default entity icon is shown with no modification; otherwise **FAIL**. |

### Group F: Existing Behavior Regression

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| F-1 | Click-to-chat unaffected on active node | Click the label of an entity node that currently shows the green filled-circle icon (active state). | The agent chat opens for that entity, identical to pre-CR behavior. The icon change does not interfere with click-to-chat behavior. | **PASS** if click-to-chat works normally on an active node; otherwise **FAIL**. |
| F-2 | Context menu unaffected | Right-click an active entity node. | The context menu shows the same entries as before this CR (Open, Copy Path, Copy Full Path, Reveal, etc.). No activity-indicator-specific entries appear. | **PASS** if the context menu is unchanged; otherwise **FAIL**. |
| F-3 | File children unaffected | Expand an active entity node (one showing the green filled-circle icon) to reveal its Agent and Files category children. | The Agent and Files categories expand and their children are listed normally, identical to the actor-owned-files-tree behavior. The `iconPath` change is only on the entity leaf node itself — category and file child nodes are unaffected. | **PASS** if file children expand correctly and are unaffected; otherwise **FAIL**. |
| F-4 | Inactive nodes still usable | Verify that an entity node in the default inactive state (green icon absent) retains full interactive behavior. | Click-to-chat, context menu, expand/collapse, copy-path operations all work identically to before this CR. | **PASS** if all interactions work on inactive nodes; otherwise **FAIL**. |

---

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Test Cases |
|-------------|---------------------|------------|
| REQ_HOOK_INTAKE | AC-8 (session_id snake_case extraction bug fix) | A-1, A-2 |
| REQ_HOOK_ACTIVITY | AC-1 (Active on 7 lifecycle events) | C-1, C-2, C-3 |
| REQ_HOOK_ACTIVITY | AC-2 (Inactive on Stop event) | C-4 |
| REQ_HOOK_ACTIVITY | AC-3 (default Inactive, no observed event) | B-1, B-2 |
| REQ_HOOK_ACTIVITY | AC-4 (no third state, no timeout) | C-5 |
| REQ_HOOK_ACTIVITY | AC-5 (session_id → title → entity-name mapping) | C-1, C-2, C-3, A-1 |
| REQ_HOOK_ACTIVITY | AC-6 (missing session_id → silent ignore) | D-2 |
| REQ_HOOK_ACTIVITY | AC-7 (unmatched title → silent ignore) | D-1 |
| REQ_HOOK_ACTIVITY | AC-8a (iconPath = ThemeIcon(circle-filled, charts.green) when active; iconPath untouched when inactive — TaskBadgeDecorator coexistence via time-sharing) | E-1, E-2, E-3 |
| REQ_HOOK_ACTIVITY | AC-9 (graceful degradation if correlation never resolves) | D-3 |
| REQ_HOOK_ACTIVITY | AC-10 (no change to existing entity-node behavior) | F-1, F-2, F-3, F-4 |
| SPEC_HOOK_ACTIVITY | AC-7 (state flip triggers exactly one refreshKind, not a storm) | C-6 |
| US_HOOK_ACTIVITY | All ACs | A-1..A-2, B-1..B-2, C-1..C-6, D-1..D-3, E-1..E-3, F-1..F-4 |

---

## Execution Notes

1. All cases are manual UAT cases requiring an Extension Development Host with
   a functioning hook bridge installed in the workspace.
2. Group A (bug fix verification) requires trace-level logging enabled in
   the Jarvis Output Channel. The session-id field should appear in hook log
   lines; its presence (and non-`undefined` value) is the primary pass criterion.
3. Groups C and D require an agent chat session to be active and capable of
   generating hook events. Use the built-in VS Code Copilot agent chat.
4. D-2 (malformed payload) may require temporarily modifying a hook bridge
   script to omit `session_id` — restore the file after the test.
5. E-1 requires a Project entity with at least one overdue or due-soon task
   visible in the PIM extension for the TaskBadgeDecorator to be active.
6. If the session-id → entity-name correlation (REQ_HOOK_ACTIVITY AC-5) cannot
   be verified empirically (the unresolved empirical assumption flagged in the
   design), groups C-1..C-4 will show all-inactive behavior — this is the
   documented fallback (D-3), not a failure. Record the observation for PM
   follow-up per the design note.
7. Any failed case outside the documented graceful-degradation path blocks
   acceptance until fixed or explicitly waived.

## Sign-off

- [ ] All UAT cases pass (A-1 through F-4) or graceful-degradation fallback documented
- [ ] session_id extraction confirmed (A-1, A-2)
- [ ] Activity transitions verified for all three entity kinds (C-1, C-2, C-3)
- [ ] TaskBadgeDecorator coexistence verified: green icon when active (E-1), task badge restored on inactive (E-2), default icon when no badge (E-3)
- [ ] No regression to existing entity node behavior (F-1..F-4)
- [ ] Ready for verification phase
