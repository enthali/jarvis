# Validation Report: Auto-Delivery

**Date**: 2026-05-01
**Change Document**: docs/changes/auto-delivery.md
**Status**: PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 5 | 5 | 1 (Low) |
| Designs | 5 | 5 | 1 (Low) |
| Implementations | 4 | 4 | 0 |
| Tests | 9 | 9 | 0 |
| Traceability | 5 | 5 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_MSG_AUTODELIVER_CONFIG | Auto-delivery config store | SPEC_MSG_AUTODELIVER_STORE | messageQueue.ts L33-60 | T-4 | PASS |
| REQ_MSG_AUTODELIVER_POLL | Background poll loop | SPEC_MSG_AUTODELIVER_POLL | extension.ts L1398-1445 | T-7, T-8 | PASS |
| REQ_MSG_AUTODELIVER_TAG | Notified flag on QueuedMessage | SPEC_MSG_AUTODELIVER_TAG | messageQueue.ts L7-14, L25-28 | T-8 | PASS |
| REQ_MSG_AUTODELIVER_TREE | Message tree layout | SPEC_MSG_AUTODELIVER_TREE | messageTreeProvider.ts L1-168 | T-1, T-3, T-6 | PASS |
| REQ_MSG_AUTODELIVER_CMDS | Enable/disable commands | SPEC_MSG_AUTODELIVER_CMDS | extension.ts L1379-1395 | T-2, T-5 | PASS |

## Acceptance Criteria Verification

### REQ_MSG_AUTODELIVER_CONFIG

- [x] AC-1: File is JSON array of strings — `readAutoDelivery` parses as `string[]` (messageQueue.ts L38)
- [x] AC-2: Located in same directory as messages.json — `resolveAutoDeliveryPath` uses `path.dirname(messagesPath)` (messageQueue.ts L31)
- [x] AC-3: Missing file returns empty array — `!fs.existsSync` guard (messageQueue.ts L35)
- [x] AC-4: Adding appends and persists — `addAutoDelivery` pushes + writes (messageQueue.ts L44-50)
- [x] AC-5: Removing filters and persists — `removeAutoDelivery` filters + writes (messageQueue.ts L52-56)
- [ ] AC-6: Malformed file logs warning — **LOW**: Implementation returns `[]` on parse error but does NOT call `log.warn()` (messageQueue.ts L39-40). Functionally correct; cosmetic gap only.

### REQ_MSG_AUTODELIVER_POLL

- [x] AC-1: `setInterval` with 5000 ms period started at activation — extension.ts L1398, L1445
- [x] AC-2: Each tick reads messages.json and autodelivery.json — extension.ts L1399-1401
- [x] AC-3: Sends notification for sessions with `notified !== true` messages — extension.ts L1404-1425
- [x] AC-4: Sets `notified: true` on delivered messages and persists — extension.ts L1430-1438
- [x] AC-5: Max one session per tick (`break` after first delivery) — extension.ts L1441
- [x] AC-6: Timer cleared on deactivation via `context.subscriptions` — extension.ts L1502
- [x] AC-7: Errors caught, logged as warnings, loop continues — try/catch with `log.warn` (extension.ts L1439-1440)

### REQ_MSG_AUTODELIVER_TAG

- [x] AC-1: `QueuedMessage` has `notified?: boolean` — messageQueue.ts L13
- [x] AC-2: `appendMessage` does not set `notified` — messageQueue.ts L62-67
- [x] AC-3: Only poll loop reads/writes `notified` — confirmed no usage in popMessage/appendMessage
- [x] AC-4: Manual `sendMessages` ignores `notified` — extension.ts sendMessages delivers all regardless
- [x] AC-5: `popMessage` behaviour unchanged — messageQueue.ts L80-89

### REQ_MSG_AUTODELIVER_TREE

- [x] AC-1: Manual sessions at root level — messageTreeProvider.ts L73-82
- [x] AC-2: "Auto Delivery" group always present — messageTreeProvider.ts L84-87 (unconditional push)
- [x] AC-3: One child per auto-delivery session with message count — messageTreeProvider.ts L106-113
- [x] AC-4: Lightning-bolt icon on group — `new vscode.ThemeIcon('zap')` (messageTreeProvider.ts L126)
- [x] AC-5: Auto-delivery sessions have contextValue `jarvisSessionAutoDeliver` — messageTreeProvider.ts L140
- [x] AC-6: Manual sessions have contextValue `jarvisSessionManual` — messageTreeProvider.ts L140
- [x] AC-7: Send button on both session types — package.json when-clause includes both contextValues (L383)

### REQ_MSG_AUTODELIVER_CMDS

- [x] AC-1: `jarvis.enableAutoDelivery` available on `jarvisSessionManual` nodes — package.json L387-389
- [x] AC-2: Enable adds to autodelivery.json and refreshes tree — extension.ts L1383-1385
- [x] AC-3: `jarvis.disableAutoDelivery` available on `jarvisSessionAutoDeliver` nodes — package.json L392-394
- [x] AC-4: Disable removes from autodelivery.json and refreshes tree — extension.ts L1392-1394
- [x] AC-5: Both commands in `contributes.commands` and `view/item/context` menus — package.json L110-116, L387-394

## Test Protocol

**File**: docs/changes/tst-auto-delivery.md
**Result**: PASSED

| # | Description | Result |
|---|-------------|--------|
| T-1 | "Auto Delivery" group node always visible | PASS |
| T-2 | Enable Direct Delivery trigger visible on session node | PASS |
| T-3 | Enable moves session into Auto Delivery group | PASS |
| T-4 | autodelivery.json created/updated on enable | PASS |
| T-5 | Disable Direct Delivery trigger on Auto Delivery node | PASS |
| T-6 | Disable moves session back to manual root | PASS |
| T-7 | Poll loop auto-delivers without manual Play | PASS |
| T-8 | Auto-delivered message not re-delivered on next tick | PASS |
| T-9 | Manual Play button works for Auto Delivery sessions | PASS |

## Traceability

`
US_MSG_AUTODELIVERY (userstories/us_msg.rst L83)
  ├── REQ_MSG_AUTODELIVER_CONFIG (req_msg.rst L238) → SPEC_MSG_AUTODELIVER_STORE (spec_msg.rst L780) → messageQueue.ts L31-56
  ├── REQ_MSG_AUTODELIVER_POLL (req_msg.rst L264) → SPEC_MSG_AUTODELIVER_POLL (spec_msg.rst L879) → extension.ts L1397-1445
  ├── REQ_MSG_AUTODELIVER_TAG (req_msg.rst L292) → SPEC_MSG_AUTODELIVER_TAG (spec_msg.rst L839) → messageQueue.ts L7-28
  ├── REQ_MSG_AUTODELIVER_TREE (req_msg.rst L315) → SPEC_MSG_AUTODELIVER_TREE (spec_msg.rst L949) → messageTreeProvider.ts
  └── REQ_MSG_AUTODELIVER_CMDS (req_msg.rst L344) → SPEC_MSG_AUTODELIVER_CMDS (spec_msg.rst L1051) → extension.ts L1379-1395, package.json L110-116+L387-394
`

All chains are complete: US → REQ → SPEC → Code. No orphans.

## Sphinx Build

**Result**: PASSED — `python -m sphinx -b html . _build/html -W --keep-going` completed with 0 warnings, 0 errors.

## Issues Found

| # | Severity | Element | Description |
|---|----------|---------|-------------|
| 1 | Low | REQ_MSG_AUTODELIVER_CONFIG AC-6 | `readAutoDelivery` does not log a warning on malformed JSON — silently returns `[]`. Functional fallback correct; logging missing. |
| 2 | Low | SPEC_MSG_AUTODELIVER_POLL | Spec prescribes calling `jarvis.sendMessages` via `executeCommand` in poll loop; implementation inlines the delivery logic directly in the timer callback. Functionally equivalent (same notification stub, same session-open logic) but deviates from spec's single-path design note. |

**Disposition**: Both issues are Low severity — cosmetic/style divergences that do not affect correctness or user experience. No blocking issues. Change is verified as implemented.
