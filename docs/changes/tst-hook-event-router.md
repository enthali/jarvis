# Test Protocol: hook-event-router

**Change Document:** docs/changes/hook-event-router.md
**Branch:** feature/hook-event-router
**Status:** ready for execution

---

## Test Groups

### Group A: Event Routing Registry (SPEC_HOOK_ROUTE)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| A-1 | HookEngine.on('UserPromptSubmit', handler) registers handler | Handler stored in registry for 'UserPromptSubmit' |
| A-2 | HookEngine.off('UserPromptSubmit', handler) removes handler | Handler removed from registry |
| A-3 | Multiple handlers for same event called in registration order | All handlers called sequentially |
| A-4 | Exception in one handler does not stop others | All handlers execute, error logged |
| A-5 | Handlers for different event names are independent | 'PreToolUse' handlers don't receive 'PostToolUse' events |
| A-6 | off() with non-existent handler is no-op | No error, registry unchanged |
| A-7 | Registry is empty initially | No handlers registered on new HookEngine |

### Group B: HookEvent Interface & Dispatch (SPEC_HOOK_INTAKE)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| B-1 | HookEvent has eventName, sessionId?, timestamp?, payload | Interface matches spec |
| B-2 | receive(event) calls _dispatch then _sink | Both dispatch and logging occur |
| B-3 | _dispatch calls handlers for event.eventName | Handlers receive correct event |
| B-4 | _sink logs with [Hook] tag and eventName | Log output matches format |
| B-5 | Event without sessionId logs without session field | Log format handles optional field |

### Group C: HTTP Intake Listener (SPEC_HOOK_INTAKE)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| C-1 | POST /hooks with hook_event_name in payload extracts eventName | eventName = payload.hook_event_name |
| C-2 | POST /hooks without hook_event_name falls back to eventName | eventName = payload.eventName |
| C-3 | POST /hooks without eventName falls back to event | eventName = payload.event |
| C-4 | POST /hooks with no event identifiers uses 'Unknown' | eventName = 'Unknown' |
| C-5 | Listener responds 200 with {"continue": true} | Response matches spec |
| C-6 | Invalid JSON returns 400 with error | Error response format correct |
| C-7 | Listener binds ephemeral port and writes to port file | Port file created with port number |

### Group D: Bridge Script (SPEC_HOOK_BRIDGE)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| D-1 | bridge.mjs parses --event argument | eventName extracted from argv |
| D-2 | bridge.mjs includes hook_event_name in POST payload | POST body contains hook_event_name |
| D-3 | bridge.mjs reads port from .github/hooks/port | Port file read correctly |
| D-4 | bridge.mjs always outputs {"continue": true} | Stdout always valid continue response |
| D-5 | bridge.mjs exits 0 on missing port file | Graceful degradation |
| D-6 | bridge.mjs exits 0 on POST failure | Transport errors swallowed |
| D-7 | bridge.mjs uses only Node stdlib | No external dependencies |

### Group E: Hook Configuration (SPEC_HOOK_CONFIG)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| E-1 | installHookConfig creates .github/hooks/jarvis-hooks.json | Config file exists with all 8 events |
| E-2 | Each event command includes --event <EventName> | Commands match spec format |
| E-3 | installHookConfig creates .github/hooks/bridge.mjs | Bridge file exists with --event parsing |
| E-4 | installHookConfig writes port file after listener starts | Port file created with correct port |
| E-5 | uninstallHookConfig removes jarvis-hooks.json, bridge.mjs, port | All three files removed |
| E-6 | uninstallHookConfig does not remove .github/hooks/ directory | Directory preserved |
| E-7 | uninstallHookConfig removes chat.hookFilesLocations entry | Settings cleaned up |

### Group F: Auto-Install Setting (SPEC_HOOK_AUTOINST)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| F-1 | jarvis.hooks.autoInstall = true → install + start listener | Files created, listener running |
| F-2 | jarvis.hooks.autoInstall = false → teardown + no listener | Files removed, listener stopped |
| F-3 | Runtime change true → false triggers teardown | Listener stopped, files removed |
| F-4 | Runtime change false → true triggers install | Files created, listener started |
| F-5 | Setting is workspace-scoped | Different workspaces can have different values |

### Group G: End-to-End Logging (SPEC_HOOK_LOG)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| G-1 | UserPromptSubmit event logs as "[Hook] UserPromptSubmit — {...}" | Event name in log, not "Unknown" |
| G-2 | PreToolUse event logs as "[Hook] PreToolUse — {...}" | Event name in log |
| G-3 | PostToolUse event logs as "[Hook] PostToolUse — {...}" | Event name in log |
| G-4 | All 8 event types log with correct names | No "Unknown" in logs for known events |
| G-5 | Session ID included when present | Log format: "[Hook] EventName session=xxx — {...}" |
| G-6 | Full payload logged for observability | JSON payload in log |

### Group H: Manual E2E Verification (Dev Host)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| H-1 | Open Dev Host (F5), trigger UserPromptSubmit | Jarvis Output Channel shows "[Hook] UserPromptSubmit — {...}" |
| H-2 | Trigger PreToolUse (use a tool) | Jarvis Output Channel shows "[Hook] PreToolUse — {...}" |
| H-3 | Trigger PostToolUse (tool completes) | Jarvis Output Channel shows "[Hook] PostToolUse — {...}" |
| H-4 | Trigger Stop (end chat) | Jarvis Output Channel shows "[Hook] Stop — {...}" |
| H-5 | Set jarvis.hooks.autoInstall=false, reload window | Hook files removed, no hook logs |
| H-6 | Set jarvis.hooks.autoInstall=true, reload window | Hook files recreated, hook logs resume |
| H-7 | Verify .github/hooks/jarvis-hooks.json has --event params | Each command includes --event <EventName> |
| H-8 | Verify bridge.mjs has --event parsing logic | Source contains argv parsing for --event |

---

## Acceptance Criteria Mapping

| AC | Test Groups |
|----|-------------|
| SPEC_HOOK_ROUTE AC-1 | A-1, A-2 |
| SPEC_HOOK_ROUTE AC-2 | A-3, A-5 |
| SPEC_HOOK_ROUTE AC-3 | A-4 |
| SPEC_HOOK_ROUTE AC-4 | G-1 through G-6 |
| SPEC_HOOK_ROUTE AC-5 | B-1, C-1 through C-4 |
| SPEC_HOOK_INTAKE AC-2 | C-1 through C-4 |
| SPEC_HOOK_INTAKE AC-3 | C-5, C-6 |
| SPEC_HOOK_INTAKE AC-1 | C-7 |
| SPEC_HOOK_BRIDGE AC-5 | D-1, D-2 |
| SPEC_HOOK_BRIDGE AC-1 | D-3 |
| SPEC_HOOK_BRIDGE AC-3 | D-4, D-5, D-6 |
| SPEC_HOOK_BRIDGE AC-4 | D-7 |
| SPEC_HOOK_CONFIG AC-1 | E-1, E-2 |
| SPEC_HOOK_CONFIG AC-2 | E-3 |
| SPEC_HOOK_CONFIG AC-3 | E-4 |
| SPEC_HOOK_CONFIG AC-5 | E-5, E-6, E-7 |
| SPEC_HOOK_AUTOINST AC-2 | F-1 |
| SPEC_HOOK_AUTOINST AC-3 | F-2 |
| SPEC_HOOK_AUTOINST AC-5 | F-3, F-4 |
| SPEC_HOOK_AUTOINST AC-7 | F-5 |
| SPEC_HOOK_LOG AC-1 | G-1 through G-6 |
| SPEC_HOOK_LOG AC-2 | G-1 through G-6 |
| SPEC_HOOK_LOG AC-5 | G-5 |

---

## Execution Notes

1. **Unit Tests (A-G):** Run via `npx vitest run` — automated
2. **Manual E2E (H):** Requires VS Code Extension Development Host (F5)
3. **Preconditions:** Clean workspace, no existing .github/hooks/
4. **Cleanup:** Remove .github/hooks/ and .vscode/settings.json entries between test runs

---

## Sign-off

- [ ] All unit tests pass (A-G)
- [ ] Manual E2E verification complete (H)
- [ ] No regressions in existing test suite
- [ ] Build succeeds (`npx tsc -p packages/core`)
|----|-------------|
| SPEC_HOOK_ROUTE AC-1 | A-1, A-2 |
| SPEC_HOOK_ROUTE AC-2 | B-1, B-2 |
| SPEC_HOOK_ROUTE AC-3 | B-4, B-5 |
| SPEC_HOOK_ROUTE AC-4 | B-3, D-4 |
| SPEC_HOOK_ROUTE AC-5 | F-3 |
| SPEC_HOOK_INTAKE AC-2 | C-1, C-2, C-3, C-4 |
| SPEC_HOOK_INTAKE AC-4 | B-1, B-2, B-3 |
| SPEC_HOOK_LOG AC-1 | D-1, D-2, D-3 |
| SPEC_HOOK_LOG AC-2 | D-1, D-2, D-3 |
| SPEC_HOOK_LOG AC-3 | D-4 |
| SPEC_HOOK_CONFIG AC-1 | F-1 |
| SPEC_HOOK_BRIDGE AC-5 | C-5, C-6 |

---

## Sign-off

- [ ] All automated tests pass
- [ ] Manual E2E tests pass
- [ ] No regressions in existing hook functionality
- [ ] Ready for verification phase