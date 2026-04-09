# Change Document: send-to-chat

**Status**: approved
**Branch**: feature/send-to-chat
**Created**: 2026-04-08
**Author**: Jarvis Developer

---

## Summary

Add a "Send to Chat" feature to Jarvis: messages from Heartbeat jobs (or any source)
are queued in `context.storageUri/messages.json` and displayed in a new "Messages"
group in the Jarvis Explorer tree. The user reviews and manually releases messages
to a named VS Code chat session. Session targeting resolves the session name to a
UUID via `state.vscdb` (`chat.ChatSessionStore.index`), then focuses the session
via `vscode-chat-session://local/<b64uuid>` and submits using
`workbench.action.chat.open({ query })` — no HTTP server, no tab label search,
no keyboard automation hack.

---

## API Research Results

### Research Goal
Find the cleanest VS Code API (1.114+) for sending a message into a named chat session.

### Finding 1: `workbench.action.chat.open` — the clean submit API

`workbench.action.chat.open` accepts `IChatViewOpenOptions`:

```typescript
interface IChatViewOpenOptions {
  query: string;
  isPartialQuery?: boolean;
  mode?: 'agent' | 'ask' | 'edit' | string;
  blockOnResponse?: boolean;
  // ... attach files, models, tools ...
}
```

Calling `executeCommand('workbench.action.chat.open', { query, mode: 'agent' })` sets
the input of the **currently focused** chat widget and submits it — without any
`type` + `submit` keyboard hack. This replaces the old approach entirely.

**Verdict**: ✅ Use this instead of `type` + `submit`.

### Finding 2: Session targeting — no "send to named session" API exists

Investigated these commands (from `chat.ap.md` list, VS Code 1.114+):

| Command | Purpose | Useful? |
|---------|---------|--------|
| `workbench.action.chat.queueMessage` | Queues message to currently focused widget | ❌ No session targeting |
| `workbench.action.chat.steerWithMessage` | Steers current session | ❌ No session targeting |
| `workbench.action.chat.openSessionWithPrompt.*` | Opens cloud agent session with prompt | ❌ For cloud agents, not user sessions |
| `workbench.action.chat.pickAgentSession` | QuickPick of open sessions | ❌ No param to skip picker |
| `workbench.action.chat.focusAgentSessionsViewer` | Agent sessions panel (screenshot) | ❌ Informational only |

**Verdict**: No public API targets a session by name. Session identification uses
`state.vscdb` (`chat.ChatSessionStore.index`) to resolve a session title to a UUID,
then `vscode-chat-session://local/<b64uuid>` to focus the session.

### Finding 3: `vscode-chat-session://local/<base64-uuid>` URI scheme

The old code (ProjectManager/jarvis) discovered that chat editor tabs are addressable via:
```typescript
const uri = vscode.Uri.parse(`vscode-chat-session://local/${Buffer.from(uuid).toString('base64')}`);
await vscode.commands.executeCommand('vscode.open', uri);
```
But the UUID is not exposed in the public Tab API without storing it externally.

### Finding 4: `TabInputCustom` — potential URI extraction

`vscode.Tab.input` may be `vscode.TabInputCustom` with `viewType: 'vscode.chatEditor'`
and a URI containing the session UUID. If accessible, this enables precise navigation
via `vscode.open(input.uri)` without group/index keyboard navigation.

### Design Decision: state.vscdb UUID lookup

1. Look up session UUID from `state.vscdb` (`chat.ChatSessionStore.index`) via `better-sqlite3` — live read, no caching
2. Focus session via `vscode.commands.executeCommand('vscode.open', Uri.parse('vscode-chat-session://local/<b64uuid>'))`
3. If session not found → open a new chat (`workbench.action.chat.open`)
4. If duplicate session names → use first match, warn user
5. Submit message: `workbench.action.chat.open({ query, mode: 'agent' })`
6. No HTTP server, no mutex, no `type` + `submit`, no `tabGroups.all` tab label search

---

---

## Level 0: User Stories

**Status**: ✅ completed

### Modified User Stories

| ID | Title | Change |
|----|-------|--------|
| US_EXP_SIDEBAR | Project & Event Explorer | AC-3: "two sections" → "three sections"; added link to US_MSG_CHATQUEUE |
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | AC-2: extended step types list to include agent and queue |
| US_UAT_HEARTBEAT | Heartbeat Scheduler Acceptance Tests | AC-1: "four" → "five step types"; added link to US_MSG_CHATQUEUE |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_CHATQUEUE | Chat Message Queue | mandatory |
| US_CFG_MSG | Message Queue Storage Location | optional |
| US_UAT_MSG | Message Queue and Send-to-Chat Acceptance Tests | optional |

### Decisions

- D-0-1: `queue` step type needed — Heartbeat is the only message source (no HTTP server)
- D-0-2: Session not found → open new chat (not error); duplicates → first match + warning
- D-0-3: Default storage in `context.storageUri/messages.json`, configurable via `jarvis.messagesFile`
- D-0-4: Session UUID lookup via `state.vscdb` (`chat.ChatSessionStore.index`)
- D-0-5: No UUID caching — always live DB read (caching caused stale state in old system)
- D-0-6: Submission via `workbench.action.chat.open({ query, mode: 'agent' })` — replaces type+submit hack
- D-0-7: Session focus via `vscode-chat-session://local/<b64uuid>` URI (UUID from state.vscdb); fallback: open new chat
- D-0-8: Messages group always visible; shows "nothing to deliver" when empty (not hidden)
- D-0-9: No US_CFG for message queue path → MECE G-1 resolved: added US_CFG_MSG with `jarvis.messagesFile`

### MECE Advisory (post-write)

Findings from syspilot.mece agent — resolved:

- C-1: US_EXP_SIDEBAR AC-3 vs US_MSG_CHATQUEUE AC-7 → resolved: Messages always shown, AC-7 updated
- C-2: US_UAT_HEARTBEAT AC-1 stale count → fixed: "four" → "five step types"
- G-1: No config US for queue path → resolved: US_CFG_MSG added
- G-2: US_UAT_MSG missing link to US_AUT_HEARTBEAT → fixed
- L-1: US_EXP_SIDEBAR → US_MSG_CHATQUEUE link → added
- L-2: US_UAT_HEARTBEAT → US_MSG_CHATQUEUE link → added

---

## Level 1: Requirements

**Status**: ✅ completed

### Modified Requirements

- **REQ_AUT_JOBCONFIG**: AC-2 extended (`| queue`), added AC-5 (queue step fields: `session` + `text`); status → `draft`
- **REQ_AUT_JOBEXEC**: Added AC-6 (queue step execution: append to messages.json); added link to `REQ_MSG_QUEUE`; status → `draft`
- **REQ_EXP_TREEVIEW**: Description updated (three tree views), added AC-7 (Messages tree view), AC-8 (empty-state placeholder); status → `draft`
- **REQ_UAT_HEARTBEAT_TESTDATA**: Fixed duplicate block, description updated (five step types), added AC-5 (queue step test job); status → `draft`

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_QUEUE | Message Queue Storage | US_MSG_CHATQUEUE; REQ_AUT_JOBEXEC; REQ_CFG_MSGPATH | optional |
| REQ_MSG_EXPLORER | Message Tree Display | US_MSG_CHATQUEUE; REQ_EXP_TREEVIEW | optional |
| REQ_MSG_SEND | Send Messages to Chat Session | US_MSG_CHATQUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_QUEUE | optional |
| REQ_MSG_DELETE | Delete Individual Message | US_MSG_CHATQUEUE; REQ_MSG_QUEUE | optional |
| REQ_MSG_SESSIONLOOKUP | Session UUID Lookup via state.vscdb | US_MSG_CHATQUEUE | optional |
| REQ_CFG_MSGPATH | Message Queue File Path | US_CFG_MSG; REQ_MSG_QUEUE | optional |
| REQ_UAT_MSG_TESTDATA | Message Queue Test Data | US_UAT_MSG; REQ_MSG_QUEUE | optional |

### Decisions

- D-1-1: Queue step fields (`session` + `text`) are part of `REQ_AUT_JOBCONFIG` AC-5; `timestamp` is generated at write time per `REQ_MSG_QUEUE` AC-1
- D-1-2: Session focus uses `vscode-chat-session://local/<b64uuid>` URI via `REQ_MSG_SEND` AC-6
- D-1-3: `better-sqlite3` dependency for state.vscdb reads per `REQ_MSG_SESSIONLOOKUP` AC-5
- D-1-4: No caching of session UUIDs — live DB read each time per `REQ_MSG_SESSIONLOOKUP` AC-2
- D-1-5: Session not found → open new chat (not error) per `REQ_MSG_SESSIONLOOKUP` AC-3

### MECE Advisory

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| O-1 | warn | `REQ_UAT_MSG_TESTDATA` AC-1 restated `REQ_UAT_HEARTBEAT_TESTDATA` AC-5 | Refactored to cross-reference |
| O-2 | info | Empty-state text in both `REQ_EXP_TREEVIEW` and `REQ_MSG_EXPLORER` | Accepted — explicit cross-ref |
| G-1 | warn | Session-focus mechanism missing from REQs | Added AC-6 to `REQ_MSG_SEND` |
| G-2 | info | Partial-send failure path unspecified | Accepted for v1 |
| G-3 | info | No concurrency guard on queue file | Accepted (single process) |
| L-1 | warn | `REQ_MSG_DELETE` missing link to `REQ_MSG_QUEUE` | Fixed |
| L-2 | warn | `REQ_MSG_SEND` missing link to `REQ_MSG_QUEUE` | Fixed |
| L-3 | info | `REQ_AUT_JOBEXEC` missing link to `REQ_MSG_QUEUE` | Fixed |

---

## Level 2: Design

**Status**: ✅ completed

### Modified Design Elements

- **SPEC_AUT_JOBSCHEMA**: Added `'queue'` to `HeartbeatStep` type union, added `session?` and `text?` fields; status → `draft`
- **SPEC_AUT_EXECUTOR**: Added `queue` dispatch branch to `runStep`; documented closure capture of `configDir`/`queuePath`/`messageTreeProvider`; status → `draft`
- **SPEC_EXP_EXTENSION**: Three views (added `jarvisMessages`), three new source files (`messageTreeProvider.ts`, `messageQueue.ts`, `sessionLookup.ts`); status → `draft`
- **SPEC_CFG_HEARTBEATSETTINGS**: Added `jarvis.messagesFile` setting, `resolveMessagesPath()` function, runtime change handler; status → `draft`
- **SPEC_UAT_HEARTBEAT_FILES**: Added T-8 queue step test job entry, fixed duplicate block; status → `draft`

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_QUEUESTORE | Message Queue File Store | REQ_MSG_QUEUE; REQ_CFG_MSGPATH |
| SPEC_MSG_TREEPROVIDER | Message Tree Data Provider | REQ_MSG_EXPLORER; REQ_MSG_DELETE; REQ_EXP_TREEVIEW; SPEC_MSG_QUEUESTORE |
| SPEC_MSG_SENDCOMMAND | Send Messages Command | REQ_MSG_SEND; REQ_MSG_DELETE; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE |
| SPEC_MSG_SESSIONLOOKUP | Session UUID Resolver | REQ_MSG_SESSIONLOOKUP |
| SPEC_AUT_QUEUEEXEC | Queue Step Executor | REQ_AUT_JOBEXEC; REQ_MSG_QUEUE; SPEC_AUT_EXECUTOR; SPEC_MSG_QUEUESTORE |
| SPEC_UAT_MSG_FILES | Message Queue Test Data Files | REQ_UAT_MSG_TESTDATA; SPEC_UAT_HEARTBEAT_FILES |

### Decisions

- D-2-1: Separate `SPEC_AUT_QUEUEEXEC` for consistency with `SPEC_AUT_AGENTEXEC` pattern
- D-2-2: `better-sqlite3` dependency explicitly specified in `SPEC_MSG_SESSIONLOOKUP` (package.json entry)
- D-2-3: Closure capture for step context (configDir, queuePath, messageTreeProvider) rather than widened function signatures
- D-2-4: `readQueue` wraps JSON.parse in try/catch for defensive consistency

### MECE Advisory

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| G-1 | warn | `executeJob`/`runStep` don't carry queue/agent context | Documented closure capture in `SPEC_AUT_EXECUTOR` |
| G-2 | info | No validation of queue-step fields in `loadJobs` | Accepted — deferred to step execution |
| G-3 | info | `readQueue` has no error handling for malformed JSON | Fixed — added try/catch |
| O-1 | info | `REQ_MSG_DELETE` split across two SPECs | Resolved via L-1 link addition |
| L-1 | warn | `SPEC_MSG_SENDCOMMAND` missing link to `REQ_MSG_DELETE` | Fixed |
| L-2 | info | `SPEC_MSG_TREEPROVIDER` missing link to `SPEC_MSG_QUEUESTORE` | Fixed |

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_CHATQUEUE | REQ_MSG_QUEUE, REQ_MSG_EXPLORER, REQ_MSG_SEND, REQ_MSG_DELETE, REQ_MSG_SESSIONLOOKUP | SPEC_MSG_QUEUESTORE, SPEC_MSG_TREEPROVIDER, SPEC_MSG_SENDCOMMAND, SPEC_MSG_SESSIONLOOKUP | ✅ |
| US_CFG_MSG | REQ_CFG_MSGPATH | SPEC_CFG_HEARTBEATSETTINGS | ✅ |
| US_UAT_MSG | REQ_UAT_MSG_TESTDATA | SPEC_UAT_MSG_FILES | ✅ |
| US_AUT_HEARTBEAT (mod) | REQ_AUT_JOBCONFIG (mod), REQ_AUT_JOBEXEC (mod) | SPEC_AUT_JOBSCHEMA (mod), SPEC_AUT_EXECUTOR (mod), SPEC_AUT_QUEUEEXEC (new) | ✅ |
| US_EXP_SIDEBAR (mod) | REQ_EXP_TREEVIEW (mod) | SPEC_EXP_EXTENSION (mod) | ✅ |
| US_UAT_HEARTBEAT (mod) | REQ_UAT_HEARTBEAT_TESTDATA (mod) | SPEC_UAT_HEARTBEAT_FILES (mod) | ✅ |

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] All :status: draft → approved
- [x] Ready for implementation

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

## Implementation Notes (post-approval)

- **`better-sqlite3` → `sql.js`**: The native C++ module `better-sqlite3` crashed
  in Electron due to ABI mismatch. Replaced with `sql.js` (pure JS/WASM) which
  works without native compilation. Decisions D-1-3 and D-2-2 are superseded.
- **Global → workspace-scoped `state.vscdb`**: The global `state.vscdb` lists
  sessions from all VS Code windows. Changed to workspace-scoped
  `workspaceStorage/<hash>/state.vscdb` (derived from `context.storageUri`).
- **`session` → `destination`**: Queue field renamed for clarity.
- **`sender` field added**: Each message carries its origin for routing preamble.
- **New session creation**: Unknown destinations open a new editor chat via
  `vscode-chat-session://local/new` instead of reusing the last session.

---

*Generated by syspilot Change Agent*
