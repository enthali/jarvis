# Project Manager — Jarvis

## Working Principles

- **CR Queuing**: while one CR is in the pipeline, draft the next small CR's
  Change Document locally (commit ok, never push/dispatch) to avoid idle gaps.
  Unrelated small feature ideas surfacing mid-flight → collect in Backlog
  below, don't fold into the running CR (avoids scope-churn, see
  `editor-group-placement`).
- **Branch + CD before dispatch**: CM cannot start a CR without an existing
  branch + template-copied CD — create both before/with the CR message, not
  just mention them.
- **Bugs are (almost always) spec problems**: check traceability/links first
  when debugging, not just the code diff — missing spec cross-links are a
  common root cause (see `pim-treenode-filenode-fix`).
- **No-Blame, Verify-Before-Send**: confirm shared understanding of a finding
  with the user before dispatching it into any process.
- **context.md discipline**: keep this file short/scannable, stick-note style.
  Commit every change immediately (survives branch switches/corruption). Only
  keep what's relevant within ~2 weeks; larger topics → separate file with a
  one-line pointer here. Current release/version info lives in
  `docs/changes/` (revision history), not here.

## Backlog: Entity Tree Context Menu — Follow-ups (queued for next CR)

1. Right-click on a category node (Projects/Events/Actors headers) → "Copy"
   (category name).
2. Right-click on a file-child node → add "Copy File Name" (bare filename,
   no path) alongside existing Copy Path/Copy Full Path.
3. `context.md` should open in rendered Markdown preview, not raw editor.
   Our own code (`jarvis.openContext` in extension.ts uses
   `showTextDocument`) — needs `vscode.commands.executeCommand('markdown.showPreview', uri)`
   instead/in addition. Note: existing `{ preview: false }` param is the
   unrelated editor-tab-preview concept, not Markdown rendering.
4. Collapse All across all tree views (Projects/Events/Actors/Messages/
   Reminders). Trivial — native VS Code feature via `showCollapseAll: true`
   on `createTreeView()`, currently unset on all our views (one-line fix
   each). Expand All dropped from scope (no native API, not important
   enough to justify custom recursive reveal() logic).
5. No visible indicator when Auto-Delivery messages queue up during
   active-use opt-out (`SPEC_MSG_AUTODELIVERY_OPTOUT`). Confirmed live: a
   long continuous chat session with PM had 3 messages sit unnotified for
   ~1h — working as designed (poll skips the active tab), but there's no
   "N messages waiting" indicator anywhere while it happens. Needs design
   thought (badge on the Messages tree view? statusbar item?), not scoped.
   Confirmed opt-out is tied to VS Code's literal active *tab* (`isSessionActiveTab`
   checks `tabGroups.activeTabGroup.activeTab.label`), not "user is chatting" —
   switching focus to any other editor tab (e.g. viewing a spec file) while
   the chat conversation continues in the background is enough for the next
   poll tick to treat the session as inactive and deliver.

## Known Issue: Custom Agents Disappear (since 2026-06-30, unresolved)

Custom agents (`.github/agents/*.agent.md`) vanish mid-session or after
window reload, not reliably reproducible. Data collection phase — log
occurrences with context when seen.

## Backlog / Debt (see GitHub Issues for full tracking)

- Single source of truth for feature backlog: [open GitHub Issues](https://github.com/enthali/jarvis/issues).
- `.jarvis/sessions/` → `.jarvis/actors/` folder rename: additive-only,
  queued after housekeeping (#3). Not yet scoped.
- Release agent: verify change-doc archival doesn't leave duplicates at
  `docs/changes/` root (happened once, v0.14.0 — cleaned up manually).

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

