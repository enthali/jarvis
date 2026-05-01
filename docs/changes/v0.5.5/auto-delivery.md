# Change Document: auto-delivery

**Branch:** `feature/auto-delivery`
**Status:** Implemented
**Date:** 2026-05-01

---

## Summary

Add "Direct Delivery" mode for message sessions.  Sessions listed in
`autodelivery.json` receive notifications automatically every 5 seconds
without requiring a manual Play-button click.

---

## Motivation

The existing message queue requires the user to manually click the Play button
on each session group to trigger delivery.  For long-running background agents
(e.g. heartbeat jobs, research sessions) this is inconvenient.  Auto-delivery
lets the user designate sessions that should be notified automatically, while
keeping the opt-in nature of the feature (manual sessions are unchanged).

---

## Scope

### Affected specification elements

| Level | Element | Action |
|-------|---------|--------|
| US | `US_MSG_AUTODELIVERY` | NEW |
| REQ | `REQ_MSG_AUTODELIVER_CONFIG` | NEW |
| REQ | `REQ_MSG_AUTODELIVER_POLL` | NEW |
| REQ | `REQ_MSG_AUTODELIVER_TAG` | NEW |
| REQ | `REQ_MSG_AUTODELIVER_TREE` | NEW |
| REQ | `REQ_MSG_AUTODELIVER_CMDS` | NEW |
| SPEC | `SPEC_MSG_AUTODELIVER_STORE` | NEW |
| SPEC | `SPEC_MSG_AUTODELIVER_TAG` | NEW |
| SPEC | `SPEC_MSG_AUTODELIVER_POLL` | NEW |
| SPEC | `SPEC_MSG_AUTODELIVER_TREE` | NEW |
| SPEC | `SPEC_MSG_AUTODELIVER_CMDS` | NEW |

### Files to modify (implementation phase)

| File | Change |
|------|--------|
| `src/messageQueue.ts` | Add `notified?: boolean` to `QueuedMessage`; add `writeQueue()`, `readAutoDelivery()`, `addAutoDelivery()`, `removeAutoDelivery()` helpers |
| `src/messageTreeProvider.ts` | Add `AutoDeliveryGroupNode` type; restructure `getChildren`/`getTreeItem`; new contextValues |
| `src/extension.ts` | Register poll loop timer; register `jarvis.enableAutoDelivery` and `jarvis.disableAutoDelivery` commands; update `sendMessages` when-clause |
| `package.json` | Add two new commands; update `view/item/context` menu entries with new contextValues |

### Out of scope

- No changes to `readMessage` / `popMessage` semantics
- No changes to `sendToSession` message format (only adding optional `notified` field)
- No File Watcher on `autodelivery.json`

---

## Design Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-1 | Config in `autodelivery.json` (not VS Code settings) | Dynamic; co-located with message data; no VS Code API needed for edits |
| D-2 | `notified` flag on `QueuedMessage` | Prevents re-notification on every tick; flag is ignored by manual delivery |
| D-3 | Max 1 notification per 5 s tick | Avoids flooding VS Code chat with simultaneous notifications |
| D-4 | Manual Play button always works regardless of `notified` flag | User override is always available |
| D-5 | `messageSession` contextValue replaced by `jarvisSessionManual` / `jarvisSessionAutoDeliver` | Required to show different context menu actions per group |

---

## Traceability

```
US_MSG_AUTODELIVERY
  ├── REQ_MSG_AUTODELIVER_CONFIG  →  SPEC_MSG_AUTODELIVER_STORE
  ├── REQ_MSG_AUTODELIVER_TAG     →  SPEC_MSG_AUTODELIVER_TAG
  ├── REQ_MSG_AUTODELIVER_POLL    →  SPEC_MSG_AUTODELIVER_POLL
  ├── REQ_MSG_AUTODELIVER_TREE    →  SPEC_MSG_AUTODELIVER_TREE
  └── REQ_MSG_AUTODELIVER_CMDS   →  SPEC_MSG_AUTODELIVER_CMDS
```
