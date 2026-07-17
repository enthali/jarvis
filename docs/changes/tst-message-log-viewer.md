# Test Protocol: message-log-viewer

**Change Document:** docs/changes/v0.18.0/message-log-viewer.md  
**Branch:** feature/message-log-viewer  
**Design commit:** 67eb12b  
**Status:** ready for execution  
**Scope:** Message Log Viewer panel and Requeue action (jarvis-flow extension)

---

## Preconditions and Test Data

1. Launch the jarvis-flow extension in an Extension Development Host (F5).
2. Open a workspace that has `jarvis.messages.enabled=true` and an existing
   `.jarvis/message-log.json` containing at least 6 entries with different
   senders, recipients, and timestamps (one of which is the most recent).
3. Confirm the `jarvisMessages` tree view is visible in the sidebar.
4. Confirm `.jarvis/messages.json` may or may not exist before individual
   test cases — create or delete it as needed per-case.
5. For auto-refresh scenarios: use a helper script or manual file append to
   add a new log entry while the panel is open.
6. Record confirmation notifications, panel behavior, and file contents
   after each destructive case.
7. Restore `message-log.json` and `messages.json` to their pre-test state
   before each new group.

---

## Test Cases

### Group A: Panel Lifecycle

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | Panel opens via command | Open Command Palette and run `Jarvis: Open Message Log` with the session feature enabled. | Panel opens in the Docs column (column 2) titled "Message Log". | **PASS** if panel opens at the correct column on first invocation; otherwise **FAIL**. |
| A-2 | Panel opens via icon button | Click the `$(list-unordered)` icon button on the `jarvisMessages` tree view's title bar. | Same panel opens in the Docs column; the button is distinct from the chord-diagram button already present. | **PASS** if the title-bar icon opens the same panel without launching a second instance of the chord diagram; otherwise **FAIL**. |
| A-3 | Singleton: second open reveals existing panel | With the panel already open (possibly hidden behind another tab), run the command or click the icon a second time. | The existing panel is revealed (brought to front in column 2). No second panel is created. | **PASS** if exactly one panel instance exists after the second invocation; otherwise **FAIL**. |
| A-4 | Panel opens at correct column | Open the panel with a text editor already occupying column 1. | The panel appears in column 2, not column 1, and does not displace the text editor. | **PASS** if the Docs column (column 2) is used consistently; otherwise **FAIL**. |

### Group B: Entry Display

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | Entries displayed newest first | Open the panel with a log containing at least 3 entries with distinct timestamps. | Entries appear in reverse-chronological order — the most recent entry is at the top, the oldest at the bottom. | **PASS** if the top entry matches the highest timestamp in the log; otherwise **FAIL**. |
| B-2 | Each entry shows all required fields | Inspect a visible entry. | Each entry block shows: sender, recipient (destination), date/time formatted from the ISO 8601 timestamp in human-readable form, and message content. | **PASS** if all four fields are present and readable for every visible entry; otherwise **FAIL**. |
| B-3 | Content is word-wrapped, not truncated | Use an entry with a long message body (at least 200 characters). | The entire message is visible in the panel; text wraps to multiple lines within the entry block without a horizontal scrollbar or an ellipsis cut-off. | **PASS** if the complete text is visible and word-wrapped; otherwise **FAIL**. |
| B-4 | Empty state when log file absent | Delete or rename `message-log.json` and open the panel. | Panel shows an informative empty-state message (e.g. "No message history yet" or equivalent). No error dialog or unhandled exception appears. | **PASS** if the panel renders gracefully without log data; otherwise **FAIL**. |

### Group C: Theme and Styling

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | Panel matches VS Code theme in Light mode | Switch VS Code to a Light theme (e.g. Light+) and open the panel. | Panel background, foreground text, and buttons all match the Light theme's colors. No hardcoded dark colors appear. | **PASS** if the panel is visually consistent with the active Light theme; otherwise **FAIL**. |
| C-2 | Panel matches VS Code theme in Dark mode | Switch VS Code to a Dark theme (e.g. Dark+) and open the panel. | Panel background, foreground text, and buttons all match the Dark theme's colors. No hardcoded light colors appear. | **PASS** if the panel is visually consistent with the active Dark theme; otherwise **FAIL**. |

### Group D: Auto-Refresh and Scroll Behavior

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | Auto-refresh active at top | Ensure the panel is open and scrolled to the top (scrollTop === 0). Wait up to 6 seconds, then append a new entry to `message-log.json` externally and wait another 6 seconds. | The new entry appears at the top of the list without any user action. The panel's scroll position does not change noticeably. | **PASS** if the new entry appears within ~10 seconds without a user-triggered refresh; otherwise **FAIL**. |
| D-2 | Scrolling down pauses auto-refresh | Scroll the panel list down so the top is no longer visible (scrollTop > 0). Append a new entry to `message-log.json` externally and wait 12 seconds. | The new entry does NOT appear in the list while the panel is scrolled down. The list remains frozen. | **PASS** if no new entries appear while scrolled down; otherwise **FAIL**. |
| D-3 | Scroll back to top reactivates auto-refresh | After D-2, manually scroll back to the top (scrollTop === 0). | The new entry that was appended during D-2 now appears at the top immediately (not waiting for the next 5 s tick). | **PASS** if the panel shows the new entry promptly upon returning to the top; otherwise **FAIL**. |
| D-4 | Auto-refresh paused when panel not visible | With the panel open, switch to a different editor tab so the panel is backgrounded. Append a new entry to `message-log.json` externally. Switch back to the panel. | The new entry appears only after the panel regains visibility (either via the next 5 s tick or an `atTop`-triggered immediate refresh). No polling overhead should occur while backgrounded. | **PASS** if the panel correctly skips polling while not visible and recovers on focus; otherwise **FAIL**. |

### Group E: Jump-to-Top Button

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| E-1 | Jump-to-Top hidden at top | Open the panel and confirm the list is at the top. | The "Jump to Top" button is NOT visible. | **PASS** if the button is absent when `scrollTop === 0`; otherwise **FAIL**. |
| E-2 | Jump-to-Top visible when scrolled | Scroll the list down so the first entry is no longer visible. | The "Jump to Top" button becomes visible. | **PASS** if the button appears when `scrollTop > 0`; otherwise **FAIL**. |
| E-3 | Jump-to-Top scrolls to top and reactivates refresh | With the panel scrolled down and a pending new entry in `message-log.json`, click "Jump to Top". | The list scrolls to the top immediately. The new entry appears without waiting for the 5 s tick (immediate refresh triggered). The "Jump to Top" button disappears. | **PASS** if all three outcomes occur; otherwise **FAIL**. |

### Group F: Requeue

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| F-1 | Requeue delivers message to original recipient | Find an entry addressed to a known recipient. Note the sender, timestamp, and text. Click "Requeue" on that entry. Open `.jarvis/messages.json`. | A new entry appears in `messages.json` with the same `destination`, `sender`, `text`, and `timestamp` as the original log entry. | **PASS** if all four fields in `messages.json` match the original log entry exactly; otherwise **FAIL**. |
| F-2 | Original timestamp preserved | Inspect the `messages.json` entry created in F-1. Compare its `timestamp` field to the original `message-log.json` entry's `timestamp`. | The timestamps are identical. The requeued entry does NOT carry a new current-time timestamp. | **PASS** if timestamps match exactly; otherwise **FAIL**. |
| F-3 | Requeue does not add to message-log.json | Note the number of entries in `message-log.json` before clicking "Requeue". Click "Requeue" on an entry. Wait 10 seconds. Count entries in `message-log.json` again. | The entry count in `message-log.json` is unchanged — no new entry was appended to the audit log by the requeue action. | **PASS** if the audit log is not modified by requeue; otherwise **FAIL**. |
| F-4 | Requeue shows confirmation notification | Click "Requeue" on any entry. | A brief, non-blocking confirmation (status message, inline indicator, or toast) appears. No modal dialog is shown. The panel does not reload or scroll. | **PASS** if a confirmation is visible and no modal or panel reload occurs; otherwise **FAIL**. |
| F-5 | Requeue fails gracefully when workspace missing | Close all workspace folders (or work without a workspace). Open the panel from a log entry (simulate via a known-good log file opened directly). Click "Requeue". | An error notification appears. No unhandled exception or panel crash occurs. | **PASS** if the failure is surfaced as a user-visible notification without crashing; otherwise **FAIL**. |
| F-6 | Repeated requeue appends independently | Click "Requeue" on the same entry three times. Inspect `messages.json`. | Three separate entries are present in `messages.json` for the same original message — each requeue added one independently. No deduplication or idempotency guard removed any of them. | **PASS** if all three appended entries are present; otherwise **FAIL**. |

---

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Test Cases |
|-------------|---------------------|------------|
| REQ_FLOW_LOGVIEWER | AC-1 (singleton panel, reveal on second open) | A-1, A-2, A-3 |
| REQ_FLOW_LOGVIEWER | AC-2 (Docs column, column 2) | A-1, A-4 |
| REQ_FLOW_LOGVIEWER | AC-3 (icon button on jarvisMessages title bar) | A-2 |
| REQ_FLOW_LOGVIEWER | AC-4 (empty state, tolerant empty file) | B-4 |
| REQ_FLOW_LOGVIEWER | AC-5 (newest-first order) | B-1 |
| REQ_FLOW_LOGVIEWER | AC-6 (per-entry fields: sender, recipient, datetime, content word-wrapped) | B-2, B-3 |
| REQ_FLOW_LOGVIEWER | AC-7a (auto-refresh at top, 5 s poll, prepend silently) | D-1 |
| REQ_FLOW_LOGVIEWER | AC-7b (pause when scrolled down) | D-2 |
| REQ_FLOW_LOGVIEWER | AC-7c (reactivate on return to top or Jump-to-Top, immediate refresh) | D-3, E-3 |
| REQ_FLOW_LOGVIEWER | AC-8 (Jump-to-Top button visibility and behavior) | E-1, E-2, E-3 |
| REQ_FLOW_LOGVIEWER | AC-9 (skip polling when panel not visible) | D-4 |
| REQ_FLOW_LOGVIEWER | AC-10 (VS Code theme CSS variables, no hardcoded colors) | C-1, C-2 |
| REQ_FLOW_REQUEUE | AC-1 (appends to messages.json with same destination, text, timestamp) | F-1, F-2 |
| REQ_FLOW_REQUEUE | AC-2 (original sender preserved verbatim) | F-1 |
| REQ_FLOW_REQUEUE | AC-3 (no audit-log side effect, messages.json only) | F-3 |
| REQ_FLOW_REQUEUE | AC-4 (non-blocking confirmation after successful requeue) | F-4 |
| REQ_FLOW_REQUEUE | AC-5 (fail-open when workspace/directory missing) | F-5 |
| REQ_FLOW_REQUEUE | AC-6 (repeated requeues each append independently, no dedup) | F-6 |
| US_FLOW_LOGVIEWER | All ACs | A-1..A-4, B-1..B-4, C-1..C-2, D-1..D-4, E-1..E-3, F-1..F-6 |

---

## Execution Notes

1. All cases are manual UAT cases requiring an Extension Development Host with
   jarvis-flow loaded.
2. Auto-refresh cases (D-1..D-4) require an external mechanism to append to
   `message-log.json` while the panel is open. Use a terminal command or
   a test script — do NOT use the panel itself to trigger this.
3. Theme cases (C-1, C-2) should be run sequentially without reopening the
   panel between theme switches; VS Code hot-reloads theme CSS variables
   in live webviews.
4. Requeue cases (F-1..F-6) require inspecting `.jarvis/messages.json`
   directly after each button click; compare timestamps at the byte level
   (copy both to a diff tool) to verify F-2.
5. Any failed case blocks acceptance until fixed or explicitly waived by PM.
6. The singleton check (A-3) can be verified by counting the "Message Log"
   panels in VS Code's open editors list — exactly one should be present.

## Sign-off

- [ ] All UAT cases pass (A-1 through F-6)
- [ ] Auto-refresh scenarios verified (D-1..D-4, E-3)
- [ ] Requeue field integrity verified (F-1, F-2)
- [ ] No audit-log side effect (F-3)
- [ ] Theme consistency verified in both Light and Dark modes (C-1, C-2)
- [ ] Ready for verification phase
