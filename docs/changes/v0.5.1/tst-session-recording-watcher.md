# Test Protocol: session-recording-watcher

**Change Document**: docs/changes/session-recording-watcher.md  
**Date**: 2026-04-15  
**Tester**: Project Manager (manual UAT)  
**Result**: PASSED

---

## Test Environment

- VS Code Extension Development Host (F5)
- `jarvis.recording.enabled = true`
- `jarvis.recording.whisperPath` = `<whisperPath>` (local Whisper project folder)
- Whisper project folder contains `recorder.py`, `input/`, `output/` subfolders
- Python available in PATH

---

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| T-1 | REQ_REC_SIDECAR | AC-1 | Sidecar JSON written to `input/<recordingName>.json` on recording start with `{ "project": "<name>" }` | PASS |
| T-2 | REQ_REC_WATCHERJOB | AC-1 | `"Jarvis: Check Transcripts"` job appears in `heartbeat.yaml` after enabling recording + setting whisperPath | PASS |
| T-3 | REQ_REC_WATCHERJOB | AC-2, AC-3 | Job removed from `heartbeat.yaml` immediately after setting `recording.enabled = false` (no reload needed) | PASS |
| T-4 | REQ_REC_DISPATCH | AC-1, AC-2 | Manual `jarvis.checkTranscripts` with matching sidecar: notification message dispatched to correct project session in Message Queue | PASS |
| T-5 | REQ_REC_SIDECAR | AC-2 | Sidecar `input/<stem>.json` deleted after successful dispatch | PASS |
| T-6 | REQ_REC_DISPATCH | AC-3 | Second run of `jarvis.checkTranscripts` with no sidecar: `output/*.txt` skipped, no duplicate message | PASS |
| T-7 | REQ_REC_DISPATCH | AC-1, AC-4 | Full end-to-end: real recording → Whisper transcribes → `output/*.txt` appears → heartbeat watcher fires → notification message in Message Queue tree | PASS |

---

## Test Case Details

### T-1 — Sidecar JSON Written on Recording Start

**Steps:**
1. Set `jarvis.recording.enabled = true`, `jarvis.recording.whisperPath = <path>`
2. Right-click a project node → Start Recording

**Expected:** `<whisperPath>/input/<YYYY-MM-DD_HHmm_<name>>.json` created with content `{ "project": "<name>" }`  
**Actual:** File created as expected ✅

---

### T-2 — Heartbeat Job Registered When Enabled

**Steps:**
1. Set `jarvis.recording.enabled = true`, `jarvis.recording.whisperPath = <path>`
2. Inspect Heartbeat view or `<workspaceFolder>/heartbeat.yaml`

**Expected:** `"Jarvis: Check Transcripts"` entry visible with cron schedule  
**Actual:** Job appears in heartbeat.yaml ✅

---

### T-3 — Heartbeat Job Unregistered When Disabled

**Steps:**
1. Set `jarvis.recording.enabled = false`
2. Inspect heartbeat.yaml

**Expected:** `"Jarvis: Check Transcripts"` entry removed  
**Actual:** Job removed without reloading window ✅

---

### T-4 — Message Dispatched to Project Session

**Steps:**
1. Place a `.txt` file in `<whisperPath>/output/<stem>.txt`
2. Place matching `<whisperPath>/input/<stem>.json` with `{ "project": "<session-name>" }`
3. Run command `jarvis.checkTranscripts`

**Expected:** Message Queue contains entry from "Whisper Watcher" for `<session-name>` with notification text including the `.txt` path  
**Actual:** Message dispatched correctly; visible in Message Queue tree ✅

---

### T-5 — Sidecar Deleted After Dispatch

**Steps:** (continues from T-4)

**Expected:** `<whisperPath>/input/<stem>.json` no longer exists  
**Actual:** Sidecar deleted ✅

---

### T-6 — No Duplicate on Second Run

**Steps:**
1. Run `jarvis.checkTranscripts` again (sidecar already deleted from T-5)

**Expected:** No new message dispatched for the same `.txt` file  
**Actual:** File skipped; no duplicate message ✅

---

### T-7 — Full End-to-End

**Steps:**
1. Start a recording for a project
2. Stop recording — `recorder.py` creates `.wav` in `input/`
3. Whisper processes `.wav` → `output/<stem>.txt` created
4. Wait for heartbeat job to fire (or run `jarvis.checkTranscripts` manually)

**Expected:** Notification message appears in Message Queue tree for the project session  
**Actual:** Full pipeline works; message visible in tree ✅
