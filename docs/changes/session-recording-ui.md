# Change Document: session-recording-ui

**Status**: approved
**Branch**: feature/session-recording-ui
**Created**: 2026-04-15
**Author**: Project Manager

---

## Summary

Adds session recording capability to Jarvis: a new `RecordingManager` class manages
`recorder.py` subprocess lifecycle, a Record button appears as an inline-action on
project and event tree nodes (grey/red state), a StatusBar item shows a running timer
during active recording, and two new settings (`jarvis.recording.enabled`,
`jarvis.recording.whisperPath`) configure the feature.
The design reference is `projects/project-manager/recording-design.md`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | related | Heartbeat watcher for output/ polling is a separate future change; not in scope here |
| US_CFG_SETTINGSGROUPS | Settings Groups | related | Recording settings group added under PIM section |
| US_EXP_SIDEBAR | Jarvis Sidebar Explorer | related | Tree inline-action for record button |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_AUT_RECORDING | As a Jarvis user, I want to record meetings directly from VS Code so that I can capture audio for later transcription with project context. | mandatory |

### Decisions

- D-0-1: Theme `REC` chosen for all new IDs to distinguish recording from general AUT/EXP concerns.
- D-0-2: Heartbeat-based output/ watcher (transcript dispatch) is explicitly **out of scope** for this change — it is a separate future change.
- D-0-3: `US_AUT_RECORDING` is placed in `us_aut.rst` (automation theme) because recording is an automated pipeline trigger, not a pure UI feature.

### Horizontal Check (MECE)

- ✅ No contradiction with `US_AUT_HEARTBEAT` — heartbeat handles scheduling/dispatch; recording handles capture.
- ✅ No redundancy with `US_EXP_SIDEBAR` — sidebar tree is infrastructure; recording extends it with a specific action.
- ✅ No gap: settings, UI button, status bar, subprocess, and guards are all covered at L1.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_CFG_SETTINGSGROUPS | US_CFG_SETTINGSGROUPS | modified | Add Recording group |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REC_SETTINGS | Recording settings: enabled toggle and whisperPath | US_AUT_RECORDING; REQ_CFG_SETTINGSGROUPS | mandatory |
| REQ_REC_BUTTON | Inline record/stop button on project and event tree nodes | US_AUT_RECORDING; US_EXP_SIDEBAR | mandatory |
| REQ_REC_STATUSBAR | Status bar item showing active recording state and timer | US_AUT_RECORDING | mandatory |
| REQ_REC_SUBPROCESS | Start/stop recorder.py subprocess management | US_AUT_RECORDING | mandatory |
| REQ_REC_GUARD | Guard: feature inactive when disabled or whisperPath missing/invalid | US_AUT_RECORDING | mandatory |

### Decisions

- D-1-1: `REQ_REC_SETTINGS` links to `REQ_CFG_SETTINGSGROUPS` to ensure recording settings appear in the correct settings group.
- D-1-2: `REQ_REC_BUTTON` covers both project nodes and event nodes — same requirement, implemented in two tree providers.
- D-1-3: `REQ_REC_GUARD` is a separate requirement (not folded into `REQ_REC_SUBPROCESS`) to ensure guard behavior is explicitly testable.
- D-1-4: `REQ_CFG_SETTINGSGROUPS` is marked modified (not new) — it already governs settings grouping; recording simply adds a new group entry.

### Horizontal Check (MECE)

- ✅ No overlap between `REQ_REC_BUTTON` and `REQ_REC_STATUSBAR` — button is tree UI; status bar is global indicator.
- ✅ No overlap between `REQ_REC_SUBPROCESS` and `REQ_AUT_JOBEXEC` — subprocess is ad-hoc (user-triggered), not heartbeat-scheduled.
- ✅ `REQ_REC_GUARD` covers both the "disabled" and "path missing" cases without redundancy.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_CFG_SETTINGSGROUPS (if exists) | REQ_CFG_SETTINGSGROUPS | related | Recording group added; handled via package.json change |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REC_SETTINGS | `package.json` contributions: `jarvis.recording.enabled` (bool, default false), `jarvis.recording.whisperPath` (string, default ""); group label "Recording" under PIM section | REQ_REC_SETTINGS |
| SPEC_REC_BUTTON | `projectTreeProvider.ts` + `eventTreeProvider.ts`: inline-action menu contribution `jarvis.startRecording`/`jarvis.stopRecording` on `jarvisProject`/`jarvisEvent` context values; icon grey (`circle-outline`) when idle, red (`circle-filled` + `charts.red`) when `.recording.json` matches this node; visibility when-clause `jarvis.recording.enabled == true` | REQ_REC_BUTTON; REQ_REC_GUARD |
| SPEC_REC_STATUSBAR | `StatusBarItem` (alignment right, priority 10): text `🔴 $(project) <name> — MM:SS`; visible only during active recording; `setInterval` (1 s) updates elapsed time; click command `jarvis.stopRecording`; hidden on stop/deactivate | REQ_REC_STATUSBAR |
| SPEC_REC_SUBPROCESS | `src/recording.ts` — `RecordingManager` class: `start(name, kind)` checks `.recording.json` + PID; spawns `child_process.spawn("python", [whisperPath/recorder.py, "--project", name, "--output", whisperPath/input/])`; writes `.recording.json: { project, pid, startTime }`; `stop()` creates `whisperPath/.stop`, waits 500 ms, removes `.recording.json`; `isRecording()` returns current state; `deactivate()` calls `stop()` if active; registered in `extension.ts` deactivate hook | REQ_REC_SUBPROCESS; REQ_REC_GUARD |

### Decisions

- D-2-1: `RecordingManager` lives in new `src/recording.ts` to isolate subprocess logic from `extension.ts`.
- D-2-2: State persisted to `.recording.json` (not in-memory only) so a VS Code restart can detect a leftover recording and clean up.
- D-2-3: Stop mechanism uses a `.stop` sentinel file (not `process.kill`) to allow `recorder.py` to flush audio buffers gracefully.
- D-2-4: Icons: `circle-outline` (grey, idle) and `circle-filled` with `charts.red` color (active) — both standard ThemeIcon names available in VS Code.
- D-2-5: `whisperPath/.stop` location (not `whisperPath/input/.stop`) avoids polluting the input audio directory.
- D-2-6: Python missing → `vscode.window.showErrorMessage` before spawn; no crash, no partial state written.
- D-2-7: New files needed: `src/recording.ts`. Modified: `src/extension.ts`, `src/projectTreeProvider.ts`, `src/eventTreeProvider.ts`, `package.json`, `docs/userstories/us_aut.rst`, `docs/requirements/req_aut.rst` (new REQ_REC_* file or added section), `docs/design/spec_exp.rst` or new `spec_rec.rst`.

### Horizontal Check (MECE)

- ✅ `SPEC_REC_BUTTON` references both `projectTreeProvider.ts` and `eventTreeProvider.ts` — no gap.
- ✅ `SPEC_REC_SUBPROCESS` covers start, stop, PID-check, state file, and deactivate hook — no gap.
- ✅ `SPEC_REC_GUARD` behavior (disabled/missing path) is addressed inside `SPEC_REC_SUBPROCESS` (guard in `start()`) and `SPEC_REC_BUTTON` (when-clause) — no standalone SPEC needed; guard logic is embedded in the implementing specs.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|-------------|--------|-----------|
| US_AUT_RECORDING | REQ_REC_SETTINGS, REQ_REC_BUTTON, REQ_REC_STATUSBAR, REQ_REC_SUBPROCESS, REQ_REC_GUARD | SPEC_REC_SETTINGS, SPEC_REC_BUTTON, SPEC_REC_STATUSBAR, SPEC_REC_SUBPROCESS | ✅ |
| US_CFG_SETTINGSGROUPS (modified) | REQ_CFG_SETTINGSGROUPS (modified) | SPEC_REC_SETTINGS | ✅ |

### Cross-Level Consistency

- US intent (record meetings from VS Code) → REQ behavior (settings, button, statusbar, subprocess, guard) → SPEC implementation (RecordingManager, tree inline-actions, StatusBarItem, package.json contributions) ✅
- No semantic drift between levels ✅

### MECE Across Levels

- All aspects of `US_AUT_RECORDING` covered by five REQs ✅
- All five REQs addressed by four SPECs (guard folded into SPEC_REC_SUBPROCESS and SPEC_REC_BUTTON per D-2-6 / D-2-4) ✅
- Out-of-scope item (heartbeat watcher) explicitly noted at L0 ✅

### Document Completeness

- All sections filled ✅
- All decisions documented ✅
- Out-of-scope boundary documented ✅

---

## UAT

*(To be generated by syspilot.uat subagent after approval)*

| Level | ID | Title |
|-------|----|-------|
| L0 | — | — |
| L1 | — | — |
| L2 | — | — |

---

## Implementation Notes

Files to create/modify:

| File | Change |
|------|--------|
| `src/recording.ts` | New — `RecordingManager` class |
| `src/extension.ts` | Register `jarvis.startRecording`, `jarvis.stopRecording`, create `RecordingManager`, deactivate hook |
| `src/projectTreeProvider.ts` | Add inline-action; pass recording state to node |
| `src/eventTreeProvider.ts` | Add inline-action; pass recording state to node |
| `package.json` | Settings, commands, when-clauses, menu contributions |
| `docs/userstories/us_aut.rst` | Add `US_AUT_RECORDING` |
| `docs/requirements/req_aut.rst` | Add `REQ_REC_SETTINGS`, `REQ_REC_BUTTON`, `REQ_REC_STATUSBAR`, `REQ_REC_SUBPROCESS`, `REQ_REC_GUARD` |
| `docs/design/spec_aut.rst` | Add `SPEC_REC_SETTINGS`, `SPEC_REC_BUTTON`, `SPEC_REC_STATUSBAR`, `SPEC_REC_SUBPROCESS` |
