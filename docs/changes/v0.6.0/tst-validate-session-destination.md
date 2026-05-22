# Test Protocol: validate-session-destination

**Change Document:** [validate-session-destination.md](validate-session-destination.md)
**Branch:** `feature/validate-session-destination`
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/validate-session-destination`.
3. Open workspace: `testdata/test.code-workspace`.
4. Create at least two named VS Code chat sessions:
   - Open a new chat tab (`Ctrl+Alt+I`) and `/rename` it to **"Project Manager"**
   - Open a second chat tab and `/rename` it to **"Research"**
   - Confirm both appear in `jarvis.openSession` QuickPick (or via `#listSessions` tool).
5. Confirm `messages.json` does not already contain pending messages for the test destinations (delete the file or queue if needed: `.jarvis/messages/messages.json` inside the workspace storage folder).
6. Have a second chat tab open for issuing tool calls (or use MCP client). The active tab label will be used as the `sender` when `senderSession` is omitted.

> **T-3 only:** Close all named chat sessions (leave only "New Chat" or unnamed tabs) before running T-3. Restore after.
>
> **T-5 only:** Requires a `heartbeat.yaml` in `.jarvis/heartbeat/heartbeat.yaml` — use `testdata/heartbeat/heartbeat.yaml` as a reference. See T-5 setup note.

---

## Test Cases

| ID | Scenario | ACs covered | Action | Expected result | Result |
|----|----------|-------------|--------|-----------------|--------|
| T-1 | Valid destination — happy path | US_MSG_SAFE_SEND AC-4; REQ_MSG_SENDTOSESSION AC-6; SPEC_MSG_SENDTOSESSION | Call `jarvis_sendToSession` with `session="Project Manager"`, `text="Hello from T-1"` | Tool returns success; `messages.json` contains one new entry with `destination="Project Manager"` and `text="Hello from T-1"`; no error raised | |
| T-2 | Invalid destination — typo of existing session | US_MSG_SAFE_SEND AC-1, AC-2, AC-3; REQ_MSG_SENDTOSESSION AC-3, AC-4; REQ_MSG_DEST_ERROR AC-1, AC-2, AC-4; SPEC_MSG_SENDTOSESSION | Call `jarvis_sendToSession` with `session="Projet Manager"` (intentional typo), `text="Should not land"` | Tool call **ends in error** (not success); error text contains: (a) `"Projet Manager"` verbatim; (b) alphabetically sorted list of valid sessions e.g. `"Project Manager, Research"`; `messages.json` has **no** new entry for `"Projet Manager"` | |
| T-3 | Invalid destination — no named sessions open | US_MSG_SAFE_SEND AC-1, AC-2, AC-3; REQ_MSG_DEST_ERROR AC-3, AC-4; SPEC_MSG_SENDTOSESSION | Close all named chat sessions (leave only unnamed / "New Chat" tabs); call `jarvis_sendToSession` with `session="Project Manager"`, `text="Should not land"` | Tool call ends in error; error text contains `"Project Manager"` verbatim; valid-session list shows `"(none)"`; `messages.json` has **no** new entry | |
| T-4 | Case-sensitivity — wrong case | US_MSG_SAFE_SEND AC-1; REQ_MSG_SENDTOSESSION AC-3; SPEC_MSG_SENDTOSESSION | With "Project Manager" session open, call `jarvis_sendToSession` with `session="project manager"` (all lowercase) | Tool call ends in error (exact match enforced; lowercase ≠ mixed-case title); error text lists `"Project Manager"` as a valid destination; no message written to queue. **Rationale:** `SPEC_MSG_SENDTOSESSION` uses `filterNamedSessions(getAllSessions())` which performs exact-string comparison (`s.title === sessionName`); case folding is out of scope (see Change Document "Out of Scope") | |
| T-5 | Heartbeat `queue` step — current behavior preserved (no regression) | US_MSG_SAFE_SEND AC-5 | **Setup:** add a heartbeat job with a `queue` step targeting `"Project Manager"` and another targeting `"NoSuchSession"`. Trigger both jobs (manually or via `jarvis.executeHeartbeatJob`). **Valid path:** observe job result for `"Project Manager"`. **Invalid path:** observe job result for `"NoSuchSession"` | **Valid-session step:** job succeeds; message appears in `messages.json` for `"Project Manager"`. **Invalid-session step:** job succeeds (current behavior preserved); message is silently appended to `messages.json` for `"NoSuchSession"`. **Rationale:** `heartbeat.ts::executeQueueStep` calls `appendMessage()` directly and bypasses the `jarvis_sendToSession` LM/MCP tool — therefore destination validation does NOT apply. This CR explicitly scoped validation to the LM/MCP tool only; heartbeat queue-step validation is a possible follow-up (see CR `validate-session-destination` "Not in Scope") | |
| T-6 | Empty / whitespace destination string | REQ_MSG_SENDTOSESSION AC-3, AC-4; REQ_MSG_DEST_ERROR AC-1, AC-4 | Call `jarvis_sendToSession` with `session=""` (empty string) or `session="   "` (whitespace only) | Tool call ends in error; error text shows the empty/whitespace value as the bad destination; valid-session list shown; no message written. Note: `filterNamedSessions` filters out entries where `s.title` is falsy, so an empty string cannot be a valid destination | |

---

## Auto-Delivery Regression Sub-Check (part of T-1)

After T-1 succeeds (message queued for "Project Manager"):

1. Enable auto-delivery for "Project Manager" via the Messages tree (click the zap icon on the `Project Manager` session group).
2. Wait up to 10 seconds (poll interval is 5 s).
3. Confirm: notification stub appears in the "Project Manager" chat tab; `messages.json` entry has `notified: true`.

This sub-check covers `US_MSG_SAFE_SEND AC-4` (existing auto-delivery unaffected) and `REQ_MSG_SENDTOSESSION AC-6`.

---

## MCP Path Cross-Check (optional)

If an MCP client (e.g. Claude Desktop configured for `localhost:31415`) is available:

- Repeat T-1 and T-2 via MCP instead of the VS Code LM tool.
- Expected: identical behaviour — success for T-1, structured error for T-2.
- Covers `SPEC_MSG_DUALREGISTRATION` (same handler, both surfaces).

---

## Error Message Format Verification

For any test case that triggers an error (T-2, T-3, T-4, T-6), confirm the error text matches the template from `REQ_MSG_DEST_ERROR AC-4`:

```
Destination session "${session}" does not exist.
Valid destinations: ${names}
```

- `${session}` = the exact value supplied in the call
- `${names}` = alphabetically sorted titles joined by `", "`, or `"(none)"` when empty

---

## Result Summary

| ID | Result | Notes |
|----|--------|-------|
| T-1 | SKIPPED | review-only approval (PM 2026-05-21) |
| T-1 auto-delivery sub-check | SKIPPED | review-only approval (PM 2026-05-21) |
| T-2 | SKIPPED | review-only approval (PM 2026-05-21) |
| T-3 | SKIPPED | review-only approval (PM 2026-05-21) |
| T-4 | SKIPPED | review-only approval (PM 2026-05-21) |
| T-5 valid path | SKIPPED | review-only approval (PM 2026-05-21) |
| T-5 invalid path | SKIPPED | review-only approval (PM 2026-05-21) |
| T-6 | SKIPPED | review-only approval (PM 2026-05-21) |
| MCP cross-check (optional) | SKIPPED | review-only approval (PM 2026-05-21) |

**Overall:** SKIPPED — PM granted review-only approval (MECE PASS + QM PASS deemed sufficient; no new concepts, known code path). UAT cases retained for future re-execution if regressions are suspected.

---

## Build State at Execution

- `npm run compile`: 
- `python -m sphinx -b html docs docs/_build/html -W --keep-going`: 

## Recommendation

(fill in after execution)
