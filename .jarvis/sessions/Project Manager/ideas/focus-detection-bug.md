# Idea: Fix Stale "Active Tab" Focus Detection in Auto-Delivery

**Status:** Idea / unscoped (user not yet decided whether to implement)

## Problem

`isSessionActiveTab()` and `snapshotFocus()` (both in `packages/core/src/extension.ts`)
determine "is an editor currently focused" by reading
`vscode.window.tabGroups.activeTabGroup.activeTab`. This reflects the
**last-shown tab of an editor group**, not whether the editor area currently
has real focus. Once the user moves focus away from an editor tab to
something that isn't a *different editor tab* (terminal, sidebar, panel,
or even outside the VS Code window), `activeTab` keeps pointing at the old
session tab indefinitely.

**Two observed symptoms, same root cause:**

1. **Auto-Delivery active-use opt-out (`isSessionActiveTab`, `REQ_MSG_AUTODELIVERY_OPTOUT`)**
   never clears — a message queued for a session stays undelivered forever
   if the user last had that session's tab open and then moved focus to a
   terminal/sidebar instead of another editor tab.
2. **Focus-Snapshot/Restore (`snapshotFocus`/`restoreFocus`, `SPEC_MSG_FOCUSRESTORE`)**
   incorrectly snapshots a stale editor tab as "the prior focus" even when the
   user's real focus was on a terminal/sidebar at delivery time — so after
   delivery, focus is disruptively restored to an editor tab the user was not
   actually using.

## Idea

Replace the "last-known active tab" check with a lightweight focus tracker
that listens to available focus-adjacent events (`onDidChangeActiveTerminal`,
sidebar/panel visibility changes, `vscode.window.state.focused` for
whole-window OS focus) to approximate "which area most recently received a
focus event." Use this same tracked state consistently in all three call
sites (`isSessionActiveTab`, `snapshotFocus`, `restoreFocus`).

**Important caveat surfaced during discussion:** VS Code exposes no true
"is the editor area focused right now" API — any fix is a heuristic
improvement (fewer false positives), not a 100%-correct real-time signal.

## Why parked

User is not sure yet whether this is worth implementing — noted as a real,
reproducible bug (confirmed by reading the current implementation), but
scope/priority not yet decided. Revisit when prioritizing message-queue /
auto-delivery reliability work.
