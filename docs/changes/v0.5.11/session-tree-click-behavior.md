# Change: session-tree-click-behavior

**Status:** spec approved — awaiting implementation
**Origin:** PM CR 2026-05-19 13:04 UTC (follow-up from create-session-tool UAT)
**Mode:** autonomous (default until PM specifies otherwise)
**Branch:** (none yet — will be `feature/session-tree-click-behavior` from `develop` after approval)

---

## Summary

Invert the default click semantics of the Sessions Tree:

- **Today:** Click on a session item opens its `context.md` in the editor.
- **After CR:** Click on a session item opens / activates the agent-chat editor for that session (same logic as the existing `jarvis.openAgentSession` command). A dedicated inline icon on the tree item exposes the `context.md` open action.

## Why

The primary purpose of a Jarvis session is the agent chat, not the memory file. The current default contradicts user expectation, which was directly surfaced during the `create-session-tool` UAT walk-through. With `jarvis_createSession` now in the catalogue, programmatic session creation puts additional pressure on smooth session entry — the user reflex is to click the name, not a hidden icon, to enter the session.

## Acceptance Criteria (verbatim from CR)

1. Clicking a session name in the Sessions Tree opens/activates the corresponding agent-chat editor — identical to the existing `jarvis.openAgentSession` / "Open Agent Session" context menu action.
2. The Sessions Tree item shows an **inline icon** whose click opens the session's `context.md` in the editor (preview:false).
3. The inline icon has a tooltip such as `"Open context.md"`.
4. Behaviour is consistent: double-click is treated as single click (tree items have no separate double-click handler).
5. Existing context-menu entries (rename, delete, open context, etc.) remain unchanged.

## Out of Scope (per CR)

- Analogous change to Projects Tree / Events Tree (separate decision, later).
- Fix of the known chat-editor-reuse bug (separate CR `chat-editor-reuse-on-session-open`, later — pre-existing bug surfaced during create-session-tool UAT).

## Verified Impact Analysis (System Designer — 2026-05-19)

Impact analysis executed via `syspilot.impact-python` from `SPEC_SES_TREE`,
`REQ_SES_TREE`, `REQ_SES_OPENCONTEXT`, `REQ_SES_CONTEXTMENU`, and
`REQ_SES_AGENTPROMPT`.

| Element | Status | Verdict |
|---|---|---|
| `SPEC_SES_TREE` | implemented | **Affected** — `item.command` binding changes |
| `REQ_SES_TREE` | implemented | **Affected** — covered by new `REQ_SES_TREECLICK` |
| `REQ_SES_OPENCONTEXT` | implemented | Referenced in new SPEC; command itself unchanged |
| `SPEC_SES_CONTEXTMENU` | implemented | **Not affected** — context-menu entries preserved |
| `REQ_SES_CONTEXTMENU` | implemented | **Not affected** — AC-5 preservation confirmed |
| `SPEC_SES_MANIFEST` | implemented | Reference only — inline menu pattern documented |
| `REQ_SES_AGENTPROMPT` | implemented | **Not affected** — agent open logic unchanged |
| `SPEC_SES_SCANNER` | implemented | **Not affected** — no scanning changes |

**New elements created:**
- `US_SES_TREECLICK` in `docs/userstories/us_ses.rst`
- `REQ_SES_TREECLICK` in `docs/requirements/req_ses.rst`
- `SPEC_SES_TREECLICK` in `docs/design/spec_ses.rst`

**Source files to change (Dev Engineer):**
- `src/sessionTreeProvider.ts` — `item.command` binding
- `src/extension.ts` — new `jarvis.openSessionContext` command
- `package.json` — command + `view/item/title` inline entry + commandPalette hide
- No new SVG resources required

## Suspected affected files (superseded — see Verified Impact Analysis above)

Working hypothesis only — the Impact Skill MUST run during the System Designer phase and define the actual scope.

| File / Element | Expected change |
|---|---|
| `src/sessionTreeProvider.ts` | TreeItem `command` property: change from "open context.md" to `jarvis.openAgentSession`. Maybe also add a new `iconPath` for the inline-icon column if the implementation chooses that route. |
| `package.json` | `contributes.menus["view/item/context"]` and/or `view/item/title` for the inline icon button on `jarvisSession` items. Possibly a new command id `jarvis.openSessionContext` (or reuse the existing one) bound to the icon. |
| `src/extension.ts` | If a new command id is introduced for the icon action, register it. |
| `resources/` | (possibly) a new SVG icon for the context.md action. |
| `docs/userstories/us_ses.rst` | New or extended US (e.g. `US_SES_TREECLICK` or extension of existing `US_SES_SESSIONS`). |
| `docs/requirements/req_ses.rst` | New or extended REQ (e.g. `REQ_SES_TREECLICK`). |
| `docs/design/spec_ses.rst` | Extend `SPEC_SES_TREE` with the inverted click semantics and the inline icon binding. |
| `docs/changes/tst-session-tree-click-behavior.md` | New, after UAT. |

## Design Decisions / Open Questions (defaults proposed)

1. **Command id for the inline icon action.**
   *Default:* introduce `jarvis.openSessionContext` (or similar) that opens `context.md`. Keeps the icon binding stable and avoids reusing a command whose default semantics we're now reverting.
   *Alternative:* reuse `vscode.open` directly via `Uri.file(...)` in the menu binding — less explicit but no new command.

2. **Icon glyph.**
   *Default:* VS Code built-in `$(file)` or `$(book)` codicon. Avoid introducing a custom SVG unless QA explicitly wants brand alignment.

3. **AC-4 implementation detail.**
   *Default:* No explicit code change required. VS Code TreeView default behaviour already maps double-click to the single-click `command`. Verify in UAT; if VS Code surprises us, add a focused workaround.

4. **Empty/no-`context.md` case.**
   *Default:* If a session folder exists but `context.md` doesn't (e.g. legacy session created before context.md was added), the icon click MUST still open an editor — create the file on the fly with the standard template (`# <session-name>\n\n`). This matches the resilience pattern used elsewhere in `newSessionCommand`. Document explicitly in the SPEC.

## Process Log

- 2026-05-19 13:04 UTC: PM submitted CR via Jarvis message queue.
- 2026-05-19 13:xx UTC: CM Intent Gate passed — CR well-formed, ACs concrete, no rewording needed. Change Document drafted on `develop` working tree (uncommitted). **Awaiting PM approval before branching and invoking System Designer.**
- 2026-05-19 (branch): PM approved all 4 design defaults. Branch `feature/session-tree-click-behavior` created from `develop`.
- 2026-05-19 (spec): System Designer completed US/REQ/SPEC. Impact Analysis verified scope. Sphinx clean.
- 2026-05-19 (mece-r1): MECE Round 1 advisory: 2 Major + 1 Minor + 1 Nit findings, all 4 applied.
- 2026-05-19 (mece-final): MECE Final pass: 2 Major + 2 Minor + 2 Nit findings. F1/F2/F3 applied by Dev Engineer (commit `26b091e`). F4 applied by System Designer here. F5 (status bumps) deferred to pre-merge. F6 (T-6 label nit) intentionally not changed.
- 2026-05-19 (docu): Documentation Engineer updated copilot-instructions.md (sessionTreeProvider behaviour note). README has no Sessions tree section — no README change applicable.
- 2026-05-19 (uat-t6-fix-1): UAT T-6 FAIL: duplicate inline icons on jarvisSession (pre-existing `openContext` and `openAgentSession` inline bindings collided with new `openSessionContext`). Removed `group: inline` from the two pre-existing bindings — they remain in the right-click context menu. Commit `f0cd514`.
- 2026-05-19 (uat-t6-fix-2): UAT T-2 re-run revealed NO inline icon visible — `view/item/title` is not a valid per-item TreeView menu contribution point in VS Code (MECE Final F2 recommendation had been fachlich incorrect). Moved new `jarvis.openSessionContext` binding from `view/item/title` to `view/item/context` with `group: inline`. Commit `c2e5792`.
- 2026-05-19 (uat-complete): All 9 UAT scenarios PASS (T-1..T-9). Test protocol `tst-session-tree-click-behavior.md` written. **Status:** awaiting PM merge approval after PM evaluates QM findings.
- 2026-05-19 (pre-merge-fixes): Pre-merge fixes per PM (FIX NOW based on QM findings): (1) REQ_SES_TREECLICK AC-3 doc-drift `view/item/title` → `view/item/context`; (2) SPEC_SES_TREECLICK §3 same fix + VS Code rationale; (3) Gotcha bullet added to copilot-instructions.md; (4) Status bumps US/REQ/SPEC_SES_TREECLICK draft → implemented.

## Status

**Status:** completed pending merge to develop.
