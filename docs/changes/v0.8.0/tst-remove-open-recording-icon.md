# Test Protocol: remove-open-recording-icon

**Change Document:** [remove-open-recording-icon.md](remove-open-recording-icon.md)
**Verification Report:** [val-remove-open-recording-icon.md](val-remove-open-recording-icon.md)
**Branch:** `feature/remove-open-recording-icon`
**UAT Specs:** `SPEC_EXP_ENTITY_ICONS`, `SPEC_UAT_ENTITY_PARITY`
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/remove-open-recording-icon`.
3. Open workspace: `testdata/test.code-workspace`
   (File → Open Workspace from File…). This sets `testdata/` as the workspace root.
4. Verify that `jarvis.projects.enabled`, `jarvis.events.enabled`, and
   `jarvis.sessions.enabled` are all `true` (defaults).
5. Ensure the following test-data entities are present (part of the branch
   `testdata/` fixtures):

   **Projects:**
   - `testdata/projects/alpha/` — `project.yaml` + `context.md`; **no** `recording/` subfolder

   **Events:**
   - `testdata/events/2026-06-15_DevCon 2026/` — `event.yaml` + `context.md`; **no** `recording/` subfolder

   **Sessions:**
   - `testdata/.jarvis/sessions/copilot-cm/` — `session.yaml` + `context.md`

6. Open the **Jarvis** Output Channel (View → Output → Jarvis).
7. Expand all sections (Sessions, Projects, Events) in the Jarvis sidebar.
8. **Between scenarios that create or delete files:** restore the original
   test-data state before proceeding to the next scenario.

---

## Group A — Icon Absence (positive cases)

### T-1 — Project node shows exactly 2 inline icons; `$(record)` absent

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-1, AC-2, AC-4 / SPEC_UAT_ENTITY_PARITY T-33*

**Pre-condition:** `testdata/projects/alpha/` has no `recording/` subfolder.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Jarvis sidebar, hover over the `alpha` project node. | Inline icon area appears. | |
| 2 | Count the visible inline icons. | Exactly **2** icons are visible. | |
| 3 | Verify the two icons: `$(go-to-file)` (open YAML) and `$(notebook)` (open context.md). | Both icons present with correct tooltips. | |
| 4 | Verify icon order (left to right): `$(notebook)` → `$(go-to-file)`. | Order is correct. | |
| 5 | Verify no `$(record)` / circular record icon appears. | `$(record)` icon is **absent**. | |
| 6 | Check Output Channel. | No `[ERROR]` entries. | |

---

### T-2 — Event node shows exactly 2 inline icons; `$(record)` absent

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-1, AC-2, AC-4 / SPEC_UAT_ENTITY_PARITY T-37*

**Pre-condition:** `testdata/events/2026-06-15_DevCon 2026/` has no `recording/` subfolder.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Jarvis sidebar, hover over the `DevCon 2026` event node. | Inline icon area appears. | |
| 2 | Count the visible inline icons. | Exactly **2** icons are visible. | |
| 3 | Verify the two icons: `$(go-to-file)` and `$(notebook)`. | Both icons present with correct tooltips. | |
| 4 | Verify icon order (left to right): `$(notebook)` → `$(go-to-file)`. | Order is correct. | |
| 5 | Verify no `$(record)` icon appears. | `$(record)` icon is **absent**. | |
| 6 | Check Output Channel. | No `[ERROR]` entries. | |

---

### T-3 — Session node shows exactly 2 inline icons; `$(record)` absent

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-1, AC-2, AC-4 / SPEC_UAT_ENTITY_PARITY T-37*

**Pre-condition:** `testdata/.jarvis/sessions/copilot-cm/` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Jarvis sidebar, hover over the `copilot-cm` session node. | Inline icon area appears. | |
| 2 | Count the visible inline icons. | Exactly **2** icons are visible. | |
| 3 | Verify the two icons: `$(go-to-file)` and `$(notebook)`. | Both icons present with correct tooltips. | |
| 4 | Verify icon order (left to right): `$(notebook)` → `$(go-to-file)`. | Order is correct. | |
| 5 | Verify no `$(record)` icon appears. | `$(record)` icon is **absent**. | |
| 6 | Check Output Channel. | No `[ERROR]` entries. | |

---

### T-4 — `$(record)` absent when `recording/` subfolder does NOT exist (project)

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-4 / SPEC_UAT_ENTITY_PARITY T-36 step 1*

**Pre-condition:** `testdata/projects/alpha/recording/` does **not** exist.
Verify with File Explorer before starting.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Confirm in the OS file explorer that `testdata/projects/alpha/recording/` is absent. | Folder does not exist. | |
| 2 | Hover over the `alpha` node in the Jarvis sidebar. | Inline icons visible. | |
| 3 | Verify no `$(record)` icon is shown. | `$(record)` icon **absent**. | |

---

### T-5 — `$(record)` absent even when `recording/` subfolder EXISTS (project)

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-4 / SPEC_UAT_ENTITY_PARITY T-36 step 2*

**Pre-condition:** Starting from the `alpha` project (no `recording/` folder).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Create the folder `testdata/projects/alpha/recording/` (e.g. via terminal: `mkdir testdata/projects/alpha/recording`). | Folder created on disk. | |
| 2 | In the Jarvis sidebar, click the **Rescan** button (↺) on the Projects view title bar to trigger a rescan. | Sidebar refreshes. | |
| 3 | Hover over the `alpha` node. | Inline icons visible. | |
| 4 | Verify no `$(record)` icon appears — still exactly 2 icons. | `$(record)` icon **absent**; icon count is still 2. | |
| 5 | Verify the `recording/` folder still exists on disk (not deleted by the extension). | `testdata/projects/alpha/recording/` present. | |
| 6 | **Teardown:** delete `testdata/projects/alpha/recording/`. | Folder removed. | |

---

## Group B — Non-regression (start/stop icons, highlight, folder preservation, workflow)

### T-6 — Start/Stop recording inline icons remain present (when recording enabled)

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-9 / SPEC_REC_BUTTON*

**Pre-condition:** `jarvis.recording.enabled` is set to `true` in VS Code
settings for the test workspace. Whisper path configured or left blank
(the icon presence does not depend on it).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open VS Code Settings (`Ctrl+,`), search for `jarvis.recording.enabled`, and set it to `true`. | Setting saved. | |
| 2 | Hover over the `alpha` project node. | Inline icons visible. | |
| 3 | Verify the `$(circle-outline)` Start Recording icon is present. | `$(circle-outline)` visible. | |
| 4 | Click the `$(circle-outline)` Start Recording icon to start recording. | Recording starts; icon changes to `$(circle-filled)` Stop Recording. | |
| 5 | Hover over the `alpha` node while recording is active. | `$(circle-filled)` Stop Recording icon visible. | |
| 6 | Click `$(circle-filled)` to stop recording. | Recording stops; icon reverts to `$(circle-outline)`. | |
| 7 | Verify no `$(record)` / "Open Recording" icon appeared at any point. | `$(record)` icon **absent** throughout. | |
| 8 | **Teardown:** reset `jarvis.recording.enabled` to `false`. | Setting restored. | |

---

### T-7 — Active-recording highlight on the current entity remains

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-9 / SPEC_REC_BUTTON*

**Pre-condition:** `jarvis.recording.enabled = true`. `alpha` project exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over `alpha` node and click the `$(circle-outline)` Start Recording icon. | Recording starts. | |
| 2 | Observe the `alpha` node in the Projects Tree. | The node displays the active-recording visual indicator (red/highlighted icon on the node label area as implemented by `SPEC_REC_BUTTON`). | |
| 3 | Verify that the active-recording indicator is **not** the `$(record)` inline icon — it is the node-level highlight/icon mutation applied by the tree provider. | Node highlight present; no separate `$(record)` inline icon. | |
| 4 | Click `$(circle-filled)` to stop recording. | Recording stops; highlight removed from the `alpha` node. | |
| 5 | **Teardown:** reset `jarvis.recording.enabled` to `false`. | Setting restored. | |

---

### T-8 — Existing `recording/` subfolder untouched (no migration, no deletion)

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-4 (folder preservation per CR acceptance criterion)*

**Pre-condition:** Starting from clean state (no `recording/` subfolder under `alpha`).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Create `testdata/projects/alpha/recording/` and add a dummy file inside it: `testdata/projects/alpha/recording/dummy.txt` (content: `test`). | Folder and file created. | |
| 2 | Trigger a Jarvis rescan (click ↺). | Sidebar refreshes. | |
| 3 | Verify `testdata/projects/alpha/recording/dummy.txt` still exists on disk. | File **untouched** — not deleted, not moved. | |
| 4 | Restart the Extension Development Host (Close → F5). | EDH relaunches. | |
| 5 | Verify `testdata/projects/alpha/recording/dummy.txt` still exists on disk. | File **untouched** after restart. | |
| 6 | **Teardown:** delete `testdata/projects/alpha/recording/`. | Folder removed. | |

---

### T-9 — Recording start → whisper input → transcript → session notification workflow unaffected

*UAT ref: SPEC_EXP_ENTITY_ICONS AC-9 (recording workflow non-regression)*

**Pre-condition:** `jarvis.recording.enabled = true`. `jarvis.recording.whisperPath`
set to a valid Whisper project folder. Recording infrastructure (recorder.py,
Whisper) functional in the test environment.

> **Note:** If the full Whisper pipeline is not available in the test environment,
> document this as a **testability limitation** and mark T-9 as "environment not
> available — skip with justification" in the Verification Report.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Hover over the `alpha` project node and click `$(circle-outline)` to start recording. | Recording starts. Whisper input prompt appears or recording begins in the background. | |
| 2 | Provide a short spoken input (or inject a test audio file per the whisper setup). | Input accepted. | |
| 3 | Wait for transcription to complete. | Transcript is generated in the configured output location. | |
| 4 | Observe the Jarvis Sessions tree and Output Channel. | A session notification referencing the transcript appears (per `SPEC_REC_BUTTON` / `SPEC_SES_*` notification behaviour). | |
| 5 | Verify the workflow completed without errors. | Output Channel shows no `[ERROR]` entries. | |
| 6 | Verify no "Open Recording" icon appeared anywhere during the workflow. | `$(record)` icon **absent** throughout. | |
| 7 | **Teardown:** reset `jarvis.recording.enabled` to `false`. Remove any generated transcript files if desired. | Environment restored. | |
