# Change Document: message-log-viewer

**Status**: in-progress
**Branch**: feature/message-log-viewer
**Created**: 2026-07-16
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Add a message-log viewer WebviewPanel to the `jarvis-flow` extension (`packages/flow`). The viewer displays all messages from `message-log.json` (the persistent audit log) as a scrollable list, newest first, with sender, recipient, date/time, and word-wrapped content per entry. A **Requeue** button on each entry copies the message back into the live queue for the original recipient (redelivery — no new log entry is written). The panel is opened via command `jarvis.openMessageLog` and an icon button in the jarvis-flow `view/title` contribution point. Auto-refresh is scroll-position-driven: when at `scrollTop === 0` the list polls every 5 s and prepends new messages; scrolling down freezes the list; a "Jump to Top" button (visible only when scrolled down) both scrolls to top and reactivates auto-refresh.

**GitHub Issue:** https://github.com/enthali/jarvis/issues/31  
**Package:** `packages/flow` (jarvis-flow extension)

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None modified.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_FLOW_LOGVIEWER | Message Log Viewer | optional |

### Decisions

- Decision 1 (confirmed with user before L0→L1): new story linked to `US_MSG_CHATQUEUE`, `US_EXP_SIDEBAR`, and sibling to `US_FLOW_CHORDVIEW` (same jarvis-flow add-on rationale, same `jarvisMessages` title-bar contribution point) rather than extending `US_FLOW_CHORDVIEW` itself — this is a distinct viewing/redelivery capability, not a diagram feature.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — no prior story covered browsing/redelivering individual log entries

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

None modified.

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_FLOW_LOGVIEWER | Message Log Viewer Panel | US_FLOW_LOGVIEWER; REQ_FLOW_PACKAGE; REQ_MSG_AUDITLOG; REQ_MSG_EDITORPLACEMENT | optional |
| REQ_FLOW_REQUEUE | Message Requeue (Redelivery) | US_FLOW_LOGVIEWER; REQ_FLOW_LOGVIEWER; REQ_MSG_QUEUE; REQ_MSG_AUDITLOG | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1 (user correction during L1 review — applied): the requeued entry preserves the **original** `timestamp` verbatim (not a fresh current-time stamp as I initially drafted) — a requeue is an exact redelivery of the logged entry, not a new event.
- Decision 2 (user clarification during L1 review — confirmed existing design, no change needed): the requeue write path is a direct, minimal local file append in `packages/flow` — no tool invocation, no cross-extension API call, no round-trip through `jarvis_sendMessage`. This matches what was already drafted (`REQ_FLOW_REQUEUE` AC-3); the user's note reaffirmed rather than changed the approach.
- Decision 3 (user request during L1 review — new AC added): the log viewer panel SHALL use VS Code theme CSS variables for all coloring (background, foreground, font, buttons), matching the existing chord-diagram webview's approach — added as `REQ_FLOW_LOGVIEWER` AC-10.
- Decision 4 (made without escalation, disclosed here): requeue writes only to `messages.json`, never to `message-log.json` — even though the live queue and the audit log share an identical `QueuedMessage` JSON shape, duplicating the entry into the audit log would double-count it there (once from the original send, once from the requeue) despite it being the same logical message, which would corrupt the chord diagram's message-count aggregation (`SPEC_FLOW_DATASERVICE`). This was the CD's explicit instruction ("does NOT add a new entry to message-log.json") and is preserved as-is.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

None modified.

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_FLOW_LOGVIEWER | Message Log Viewer Panel | REQ_FLOW_LOGVIEWER; SPEC_FLOW_WEBVIEW; SPEC_MSG_EDITORPLACEMENT |
| SPEC_FLOW_REQUEUE | Message Requeue (Redelivery) | REQ_FLOW_REQUEUE; SPEC_FLOW_LOGVIEWER; SPEC_MSG_QUEUESTORE |

### Conflicts Detected

None.

### Decisions

- Decision 1: the log viewer is a **second, independent** singleton webview panel (`jarvisMessageLog` viewtype), not a mode/tab within the existing chord-diagram panel — mirrors the existing pattern exactly (own panel variable, own poll handle, own manifest command/button) rather than introducing a multi-view/tabbed panel architecture, keeping the implementation a straightforward copy of an already-proven pattern.
- Decision 2: scroll-position awareness lives entirely in the webview script (`logviewer.ts`, new), which posts `atTop`/`scrolledDown` transition messages to the host — the extension host has no native visibility into a webview's DOM scroll state, so this split is required, not a stylistic choice.
- Decision 3: `requeueMessage()` is a small, local, dependency-free file-read-modify-write function in `packages/flow` — deliberately not importing anything from `packages/core`'s compiled output (not possible across separately-bundled VS Code extensions) and deliberately not calling `jarvis_sendMessage` (which would require a valid, existing `senderSession` per `REQ_MSG_SENDMESSAGE` AC-6 — the original sender may not be a currently-active session/entity, e.g. a since-renamed or deleted Actor, and forcing that validation would break redelivery for exactly the cases where it's most likely to be useful, like recovering a message to/from something that no longer resolves as a live entity).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_FLOW_LOGVIEWER | REQ_FLOW_LOGVIEWER | SPEC_FLOW_LOGVIEWER | ✅ |
| US_FLOW_LOGVIEWER | REQ_FLOW_REQUEUE | SPEC_FLOW_REQUEUE | ✅ |

Confirmed via `get_need_links.py REQ_FLOW_LOGVIEWER --direction both` and `get_need_links.py REQ_FLOW_REQUEUE --direction both` — clean bidirectional links, no dangling references.

### Artefakt-Removal-Check

Not applicable — this CR is purely additive (new story, two new requirements, two new design specs, new command, new manifest entries); nothing existing is removed, renamed, or deprecated.

### Issues Found

- [x] Issue 1: the CD's summary described the requeue mechanism generically as reusing "existing queue-writing internals... appendMessage()" — impact analysis found `packages/flow` is a separate, independently-bundled VS Code extension with no compile-time access to `packages/core`'s TypeScript modules, so `appendMessage()` itself cannot literally be called; the design instead has `packages/flow` implement its own minimal equivalent (same JSON shape, explicitly omitting the audit-log side effect). Not escalated as a product-level decision since the user-visible behavior is unchanged — flagged here for traceability since the CD's wording could otherwise be read as "import the function directly."

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-16

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Code-vs-spec:**
   - Singleton panel: `jarvisMessageLog` viewtype, fixed Docs column, reveal-if-open in `makeOpenMessageLog()` ✓
   - Scroll-driven auto-refresh: webview → host `scrollAtTop` message handling in extension.ts ✓
   - Requeue writes to `messages.json` only: `path.join(root, '.jarvis', 'messages.json')` (line 23), no `message-log.json` write ✓
   - Original timestamp preserved verbatim: `timestamp: original.timestamp` (line 64) ✓
   - Local append function: no cross-package import from core's `appendMessage()` ✓
   - `loadMessageLogEntries()`: exported from `dataService.ts` (line 99), returns newest-first ✓
   - Theme CSS variables: `renderLogViewerHtml()` uses VS Code CSS variables throughout ✓

2. **Build** (packages/core + packages/flow): clean (0 errors) ✓
   - Note: 2 pre-existing type errors in chord.ts (LensHandle.id) confirmed by Dev Engineer as pre-existing, outside this CR's scope ✓

3. **Tests** (`npx vitest run`): 213/213 passed ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_FLOW_LOGVIEWER: links = [US_FLOW_LOGVIEWER, REQ_FLOW_PACKAGE, REQ_MSG_AUDITLOG, REQ_MSG_EDITORPLACEMENT], linked_from = [REQ_FLOW_REQUEUE, SPEC_FLOW_LOGVIEWER] — 0 dangling ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
