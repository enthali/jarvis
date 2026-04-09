# Change Document: session-tools

**Status**: approved
**Branch**: feature/session-tools
**Created**: 2026-04-08
**Author**: Jarvis Developer

---

## Summary

Add three session management capabilities to Jarvis:

1. **Open Session (QuickPick)** — formalize the existing `jarvis.openSession` debug
   command as a proper Jarvis feature with its own US/REQ/SPEC
2. **List Sessions (LM Tool)** — expose `getAllSessions()` as a Language Model Tool
   so LLMs can discover available chat sessions by name
3. **Open Agent Session from Tree** — add an inline action on project/event leaf
   nodes that opens the agent chat session matching the entity name (no new
   YAML field — uses existing ``name`` for session lookup)

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | check only | AC-4 "label does nothing" still holds — agent session is inline action, not label click |
| US_EXP_OPENYAML | Open YAML from Tree Item | check only | Coexists: YAML button (go-to-file), Agent button (comment-discussion) |
| US_MSG_CHATQUEUE | Chat Message Queue | check only | Shared infrastructure (getAllSessions, lookupSessionUUID) |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_OPENSESSION | Open Chat Session by Name | optional |
| US_MSG_LISTSESSIONS | List Available Chat Sessions (LM Tool) | optional |
| US_EXP_AGENTSESSION | Open Agent Session from Explorer | optional |
| US_UAT_OPENSESSION | Open Session Acceptance Tests | optional |
| US_UAT_LISTSESSIONS | List Sessions Acceptance Tests | optional |
| US_UAT_AGENTSESSION | Agent Session Acceptance Tests | optional |

### Decisions

- D-0-1: `US_MSG_OPENSESSION` under MSG theme (session navigation, not explorer UI)
- D-0-2: ~~`agentSession` field~~ → Revised: use the entity `name` from YAML to look up a matching session
- D-0-3: Agent session button appears on **all** project and event leaf nodes (always visible)
- D-0-4: Agent session button uses `$(comment-discussion)` icon to distinguish from `$(go-to-file)` YAML button
- D-0-5: No modification needed to existing US — new stories only
- D-0-6: No new YAML field needed — session lookup uses the existing `name` field; user names sessions to match

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| REQ_MSG_SESSIONLOOKUP | Session UUID Lookup via state.vscdb | check only | Shared infrastructure — no change needed |
| REQ_EXP_OPENYAML | Open YAML from Tree Item | check only | Coexists in inline area — different icon |
| REQ_EXP_TREEVIEW | Project and Event Tree Views | check only | Tree structure unchanged |

### New Requirements

| ID | Title | Links To |
|----|-------|----------|
| REQ_MSG_SESSIONFILTER | Named Session Filter | US_MSG_OPENSESSION; US_MSG_LISTSESSIONS |
| REQ_MSG_OPENSESSION | Open Chat Session Command | US_MSG_OPENSESSION |
| REQ_MSG_LISTSESSIONS | List Sessions LM Tool | US_MSG_LISTSESSIONS |
| REQ_EXP_AGENTSESSION | Open Agent Session from Tree | US_EXP_AGENTSESSION |
| REQ_UAT_OPENSESSION_TESTDATA | Open Session Test Data | US_UAT_OPENSESSION |
| REQ_UAT_LISTSESSIONS_TESTDATA | List Sessions Test Data | US_UAT_LISTSESSIONS |
| REQ_UAT_AGENTSESSION_TESTDATA | Agent Session Test Data | US_UAT_AGENTSESSION |

### Modified Requirements

- (none — REQ_EXP_YAMLDATA AC-6 reverted after D-0-6 design revision)

### Decisions

- D-1-1: Named session = non-empty title (simplest filtering rule)
- D-1-2: ~~`agentSession` YAML field~~ → Removed (D-0-6): session lookup uses entity `name` directly
- D-1-3: ~~REQ_EXP_YAMLDATA AC-6~~ → Reverted: no scanner/schema changes needed
- D-1-4: REQ_MSG_SESSIONFILTER introduced as shared filtering rule (MECE advisory O-1)
- D-1-5: REQ_MSG_OPENSESSION AC-5 covers stale session edge case (MECE advisory G-2)
- D-1-6: REQ_EXP_AGENTSESSION: button always visible, no conditional contextValue needed
- D-1-7: New session fallback sends an initialization prompt with the entity name + asks user to rename session

---

## Level 2: Design Specifications

**Status**: ✅ completed

### Impacted Specifications

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| SPEC_MSG_SESSIONLOOKUP | Session UUID Resolver | check only | Reused as-is by all three features |
| SPEC_MSG_SENDCOMMAND | Send Messages Command | modified | Removed openSession mention (now separate spec) |
| SPEC_EXP_PROVIDER | Tree Data Providers | check only | contextValue unchanged — button uses existing `project`/`event` values |
| SPEC_EXP_SCANNER | YAML Scanner Service | check only | No changes — uses existing `entity.name` |

### New Specifications

| ID | Title | Links To |
|----|-------|----------|
| SPEC_MSG_OPENSESSION | Open Session Command | REQ_MSG_OPENSESSION; REQ_MSG_SESSIONFILTER |
| SPEC_MSG_LISTSESSIONS | List Sessions LM Tool | REQ_MSG_LISTSESSIONS; REQ_MSG_SESSIONFILTER |
| SPEC_EXP_AGENTSESSION | Open Agent Session Command | REQ_EXP_AGENTSESSION |
| SPEC_UAT_OPENSESSION_FILES | Open Session Test Data | REQ_UAT_OPENSESSION_TESTDATA |
| SPEC_UAT_LISTSESSIONS_FILES | List Sessions Test Data | REQ_UAT_LISTSESSIONS_TESTDATA |
| SPEC_UAT_AGENTSESSION_FILES | Agent Session Test Data | REQ_UAT_AGENTSESSION_TESTDATA |

### Modified Specifications

- SPEC_MSG_SENDCOMMAND: Removed `jarvis.openSession` reference → now in SPEC_MSG_OPENSESSION

### Decisions

- D-2-1: SPEC_MSG_OPENSESSION describes existing code as-is (including `!== 'New Chat'` filter)
- D-2-2: SPEC_MSG_LISTSESSIONS uses same filter as SPEC_MSG_OPENSESSION — returns JSON array of title strings
- D-2-3: SPEC_EXP_AGENTSESSION: new command `jarvis.openAgentSession`, uses `entity.name` for lookup
- D-2-4: Initialization prompt submitted directly via `workbench.action.chat.open` (not via queue)
- D-2-5: No changes to yamlScanner, sessionLookup, contextValue, or JSON schemas

