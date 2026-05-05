# Change Document: stable-session-open

**Date:** 2026-05-05
**Status:** Approved
**Branch:** feature/stable-session-open

---

## Summary

Refactors the VS Code Chat session opening mechanism used by Jarvis to fix
editor-reuse bugs (ghost editors) and introduce stable, recognizable session
names. Three private helpers are extracted in `extension.ts`:
`openPinnedResource`, `openNewChatEditor`, and `sendPromptToFocusedAgentChat`.
The `jarvis.openAgentSession` command is updated to use these helpers, adding
a `/rename` step and a context-path-based initialization prompt.

---

## Design Decisions

| ID  | Decision |
|-----|----------|
| D-1 | `workbench.action.openChat` replaces `vscode-chat-session://local/new` for new session creation — avoids editor-reuse ("ghost editor") bugs caused by the URI scheme. URI fallback retained for older VS Code builds. |
| D-2 | `{ preview: false }` is passed to every `vscode.open` call for chat session URIs — prevents VS Code from silently reusing a transient editor slot. |
| D-3 | The context initialization prompt derives the `context.md` path from the entity name (lower-case, spaces → hyphens, prefixed with `projects/`), not from a display name or hardcoded path. |
| D-4 | `/rename <entity name>` is submitted immediately after session creation so the session gets a stable, recognizable name that matches the Projects/Events tree label and enables subsequent UUID lookup. |

---

## Impacted Elements

### New specifications (all in MSG theme)

| Level | ID | Description |
|-------|----|-------------|
| US | `US_MSG_STABLESESSION` | Stable agent session open user story |
| REQ | `REQ_MSG_PINNED` | `openPinnedResource` — `vscode.open` with `{ preview: false }` |
| REQ | `REQ_MSG_OPENCHAT` | `openNewChatEditor` — `workbench.action.openChat` + fallback |
| REQ | `REQ_MSG_SENDPROMPT` | `sendPromptToFocusedAgentChat` — `openAgent` + fallback |
| SPEC | `SPEC_MSG_PINNED` | `openPinnedResource` implementation |
| SPEC | `SPEC_MSG_OPENCHAT` | `openNewChatEditor` implementation |
| SPEC | `SPEC_MSG_SENDPROMPT` | `sendPromptToFocusedAgentChat` implementation + init sequence |

### Stale specifications (require future update)

| ID | File | What changed |
|----|------|--------------|
| `REQ_EXP_AGENTSESSION` | `docs/requirements/req_exp.rst` | AC-2 references `vscode.open` without `{ preview: false }`; AC-3 describes old init mechanism (no `/rename`, no `workbench.action.openChat`) |
| `SPEC_EXP_AGENTSESSION` | `docs/design/spec_exp.rst` | Code block shows old implementation — no helpers, old init prompt format, missing `/rename` step |
| `REQ_MSG_SEND` | `docs/requirements/req_msg.rst` | AC-7 still references `vscode-chat-session://local/new` directly (now routed through `openNewChatEditor`) |
| `SPEC_MSG_SENDCOMMAND` | `docs/design/spec_msg.rst` | Code block shows old `vscode.open` calls without `{ preview: false }` |

> **Note:** Updating the stale EXP specs is deferred. The new MSG specs are the
> authoritative source for the shared helper implementation. Until `SPEC_EXP_AGENTSESSION`
> is updated, it should be read as describing the _intent_ (what the command does)
> rather than the exact _implementation_ (which is now in `SPEC_MSG_OPENCHAT` and
> `SPEC_MSG_SENDPROMPT`).

---

## Open Edges

| Topic | Status |
|-------|--------|
| **Title normalization in session lookup** | `lookupSessionUUID` uses exact string match (`s.title === sessionName`). No trimming, prefix handling, or fuzzy matching. If VS Code modifies the session title after `/rename`, the next open will create a duplicate session. Tracked as a design note in `SPEC_MSG_SENDPROMPT`. |
| **API stability** | `workbench.action.openChat`, `workbench.action.chat.openAgent`, `workbench.action.chat.open`, and `workbench.action.chat.focusInput` are VS Code internal commands with no public stability guarantee. The try/catch fallback pattern in `openNewChatEditor` and `sendPromptToFocusedAgentChat` is the mitigation. |
| **800 ms settle delay** | The `setTimeout(resolve, 800)` heuristics between session creation, rename, and init prompt are not event-driven. If VS Code becomes slower to render the tab, the prompt may land in an unfocused input. No public API for synchronization is available. |

---

## Files Changed

- `src/extension.ts` — extracted `openPinnedResource`, `openNewChatEditor`,
  `sendPromptToFocusedAgentChat`; updated `jarvis.openAgentSession` to use them
- `docs/userstories/us_msg.rst` — appended `US_MSG_STABLESESSION`
- `docs/requirements/req_msg.rst` — appended `REQ_MSG_PINNED`, `REQ_MSG_OPENCHAT`,
  `REQ_MSG_SENDPROMPT`
- `docs/design/spec_msg.rst` — appended `SPEC_MSG_PINNED`, `SPEC_MSG_OPENCHAT`,
  `SPEC_MSG_SENDPROMPT`
