# Test Protocol: session-recording-ui

**Date**: 2026-04-15
**Tester**: Project Manager (manual UAT in Extension Development Host)
**Branch**: feature/session-recording-ui
**Result**: **PASSED** *(T-12 deferred — see note)*

---

## Setup

- Extension Development Host launched via F5
- `jarvis.recording.whisperPath` set to absolute path of `testdata/recording/`
  (contains `recorder.py` mock + `input/` subfolder)
- `testdata/projects/` reused as recording targets (no extra YAML files needed)
- Python 3 available in PATH

---

## Test Results

| # | REQ ID | Scenario | Action | Expected | Result | Note |
|---|--------|----------|--------|----------|--------|------|
| T-1 | REQ_REC_ENABLE | Buttons hidden when disabled (default) | Open Jarvis sidebar; `recording.enabled = false` | No record button on any node | ✅ PASS | |
| T-2 | REQ_REC_ENABLE | Buttons appear after enabling | Set `recording.enabled = true`, refresh | `$(circle-outline)` visible on all project & event nodes | ✅ PASS | |
| T-3 | REQ_REC_ENABLE | Buttons hidden after disabling | Set `recording.enabled = false`, refresh | Record buttons disappear | ✅ PASS | |
| T-4 | REQ_REC_CONFIG, REQ_REC_SUBPROCESS | Valid whisperPath starts recording | Click record on project node with valid path | StatusBar appears; `.recording.json` created | ✅ PASS | Tested with real `recorder.py`; `.wav` in `input/` confirmed |
| T-5 | REQ_REC_CONFIG | Missing whisperPath shows error | Click record with non-existent path | Error notification; no `.recording.json`; no StatusBar | ✅ PASS | |
| T-6 | REQ_REC_SUBPROCESS | Python unavailable shows error | Click record with Python absent from PATH | Error mentions Python; no state written | N/A | Python was available; omitted per user note; assumed OK from T-4 |
| T-7 | REQ_REC_STATUSBAR, REQ_REC_BUTTON | StatusBar shows recording info | Click `$(circle-outline)` on project node `alpha` | StatusBar: `🔴 alpha — 00:00`; `.recording.json` created; active node red icon | ✅ PASS | |
| T-8 | REQ_REC_STATUSBAR | Timer increments | Wait 3–5 s | StatusBar advances to ~`00:03`–`00:05` | ✅ PASS | |
| T-9 | REQ_REC_STATUSBAR | Stop via StatusBar click | Click StatusBar item | StatusBar hides; `.recording.json` deleted; node reverts to grey | ✅ PASS | |
| T-10 | REQ_REC_BUTTON | Stop via inline tree button | Click red `$(circle-filled)` on active node | Same as T-9 | ✅ PASS | |
| T-11 | REQ_REC_BUTTON | Second recording attempt blocked | Click start on a different node while one is active | Warning shown; original recording continues | ✅ PASS | See note below |
| T-12 | REQ_REC_SUBPROCESS | Deactivate hook stops recording | Reload window while recording active | `.stop` written; `.recording.json` deleted | ⏳ PENDING | Requires active recording during reload; deferred |

---

### T-11 Note

`us_uat_rec.rst` T-11 was updated post-implementation to describe aspirational "switch"
behavior (stop current + start new in one click). The actual implementation and
`spec_uat_rec.rst` T-11 correctly describe **block** behavior: when a recording is active,
the `$(circle-outline)` start button is hidden on all nodes (via `jarvis.recordingActive != true`
when-clause), and attempting to call `startRecording` while `_currentProject` is set shows a
warning message. The user validated that clicking the stop button on a non-active node followed
by clicking start on the desired node achieves the switch effect (two clicks). This matches the
implemented and specified behavior. No code defect.

### T-12 Note

T-12 requires reloading the VS Code window while a recording subprocess is actively running.
This scenario was not completed during this UAT cycle. The `deactivate()` hook is implemented
in `extension.ts` (line 1273–1277) and verified by code review. Deferred to next release cycle.

---

## UAT Observations

- Spawn args changed from design (`--project`/`--output`) to implementation
  (`--name`/`--no-timestamp`/`--output-dir`) to match the real `recorder.py` API.
  `testdata/recording/recorder.py` and doc references updated to match.
- `RecordingManager.recordingName` getter added (not in original spec) — harmless enhancement
  for a future watcher change (`session-recording-watcher`).
