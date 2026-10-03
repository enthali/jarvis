# Validation Report: recorder-redesign

**Date**: 2026-10-02
**Change Document**: docs/changes/recorder-redesign.md
**Test Protocol**: docs/changes/tst-recorder-redesign.md
**Status**: PARTIAL

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 8 | 8 | 0 |
| Designs | 17 | 17 | 0 |
| Implementations | 17 | 17 | 1 |
| Tests | 19 | 19 | 0 |
| Traceability | 5 | 5 | 0 |

** Why PARTIAL**: All automated checks pass (build, unit tests, Sphinx, artefact-removal). The Test Protocol's 19 manual cases are honestly marked NOT RUN, which is correct at this stage. Acceptance criteria that require the Extension Development Host or the user's machine are covered by the Test Protocol, not verified here. One low-severity finding (I-1) is a pre-existing spec inconsistency, not a regression.

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_REC_ENABLE | Recording Enabled Setting | SPEC_REC_SETTINGS | extension.ts, package.json | T-1, T-2 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_BUTTON | Start Recording and Recording Indicator | SPEC_REC_BUTTON | extension.ts, session.ts | T-2, T-3, T-4, T-14 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_STATUSBAR | Recording StatusBar Timer | SPEC_REC_STATUSBAR | extension.ts | T-4 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_DISPATCH | Transcript Dispatch | SPEC_REC_DISPATCH | session.ts | T-6, T-12, T-14 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_TRANSCRIPTFILE | Transcript File | SPEC_REC_TRANSCRIPTFILE | transcriptFile.ts | T-6, T-8, T-11 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_SPEECH | Local Speech Recognition | SPEC_REC_CAPTURE, SPEC_REC_ENGINE, SPEC_REC_COMPONENTS | capture.ts, engine.ts, engineWorker.ts, components.ts | T-8, T-9, T-10, U-1–U-5 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_FAILURE | Transcription Failure Notice | SPEC_REC_SESSION | session.ts | T-9, T-11, T-12, U-3 | ✅ (code verified; manual: NOT RUN) |
| REQ_REC_LIVEVIEW | Transcript View | SPEC_REC_LIVEVIEW | liveView.ts | T-4, T-5, T-6, T-7, T-14 | ✅ (code verified; manual: NOT RUN) |
| REQ_ENG_ACTORMARK | Actor Node Mark API | SPEC_ENG_ACTORMARK | coreApi.ts, types.ts, actorTreeProvider.ts, extension.ts | actor-mark.test.ts, T-3 | ✅ (code + unit verified; manual: NOT RUN) |

## Design Verification

### SPEC_REC_SETTINGS
- AC-1: Manifest contributes exactly `jarvis.recording.enabled` (boolean, default false) — `package.json` L69–76. ✅
- AC-2: No Whisper-pipeline setting, command, menu or job contributed — manifest clean; legacy job unregistered at `extension.ts` L24. ✅
- AC-3: Setting gates only `when` clauses and the session start guard — `session.ts` L113 (`p.isEnabled()` checked in `start()` only). ✅

### SPEC_REC_BUTTON
- AC-1: Two commands (`startRecording`, `showRecording`), no stop command — `package.json` L37–46. ✅
- AC-2: Inline start action gated on `enabled == true && recordingRunning != true` — `package.json` menus. ✅
- AC-3: Inline show action gated on `recordingRunning == true`, no config condition — `package.json` menus. ✅
- AC-4: Palette offers `startRecording` when enabled; `showRecording` hidden (`when: false`) — `package.json` commandPalette. ✅
- AC-5: Target Actor looked up by `id` in `api.listActors()` — `extension.ts` L104. ✅
- AC-6: Red circle via `markActor` while running/finishing, removed afterwards — `session.ts` L158 (set), L247 (cleanup). ✅

### SPEC_REC_STATUSBAR
- AC-1: Item visible only while `running` or `finishing` — `extension.ts` L99–102 (`rec.isActive`). ✅
- AC-2: Shows red circle, Actor name, elapsed time; time frozen at finishing — `extension.ts` L100–101. ✅
- AC-3: Refreshed on every tick — wired via `rec.onDidChange(refreshStatusBar)` L98. ✅
- AC-4: Click executes `jarvis.showRecording` — `extension.ts` L97. ✅

### SPEC_REC_SESSION
- AC-1: Four states; `start` accepted only in `idle`; `end` only in `running` — `session.ts` L112–114, L167. ✅
- AC-2: Start steps in order; failed start discards transcript file — `session.ts` L134 (`fail`), L211–218 (`fail()` cleans up). ✅
- AC-3: `jarvis.recordingRunning` true from `running` until `idle` — `session.ts` L159 (set true), L249 (set false in cleanup). ✅
- AC-4: End runs one sequence for all reasons; Actor notified once — `session.ts` L167–195 (`end`). ✅
- AC-5: Breakdown shows error and keeps text — `session.ts` L206–210 (`breakdown`). ✅
- AC-6: First-start shows progress — `extension.ts` L57–75 (`withProgress`). ✅
- AC-7: Log holds word count, never text — `session.ts` L161 (`log([Recording] words=…)`). ✅
- AC-8: `formatElapsed` is the only elapsed-time formatter — `session.ts` L39–46; `liveView.ts` and `extension.ts` both use it. ✅
- AC-9: Session owns the one-second tick timer — `session.ts` L162. ✅
- AC-10: `end` always reaches `idle` via `finally` — `session.ts` L191–195. ✅

### SPEC_REC_CAPTURE
- AC-1–4: `capture.ts` implements the PowerShell helper parent: stdout PCM, stderr JSON events, stdin close to stop, 2 s kill timeout, breakdown on unexpected exit. ✅

### SPEC_REC_ENGINE
- AC-1: Engine runs in child process (`fork`) — `engine.ts` L47–53. ✅
- AC-2: One worker, one session — `WorkerEngine` manages one child. ✅
- AC-3: Audio through IPC only — `push` sends `{ t: 'audio', data }`. ✅
- AC-4: No network for recognition — `engineWorker.ts` uses only local catalog. ✅
- AC-5: `finish()` resolves after `final`, failure, or timeout — `engine.ts` L97–103. ✅
- AC-6: Language is `auto` — `engine.ts` L67, `engineWorker.ts` L55. ✅
- AC-7: No buffering; blocks of 4096 samples — `capture.ts` (stream); `session.ts` wires `capture.onData → engine.push`. ✅
- AC-8: Telemetry off via `disableNonessentialTelemetry` and `ORT_TELEMETRY_DISABLED` — `engine.ts` L49. ✅
- AC-9: Text passed through unchanged — `engineWorker.ts` forwards `speechSegment.text` as-is. ✅

### SPEC_REC_COMPONENTS
- AC-1: Components from manifest, https only, allowed hosts, SHA-512 checked — `components.ts` `isAllowedUrl`, `download`, `sha512Base64`. ✅
- AC-2: Extraction never writes outside target — `resolveInside` guard, tested. ✅
- AC-3: `.complete` marker skips download — `isComplete`. ✅
- AC-4: First start shows progress — `extension.ts` L57–75. ✅
- AC-5: Model from VS Code dictation cache, never downloaded — `extension.ts` L63 (checks `MODEL_MARKER`), `engineWorker.ts` L18 (imports SDK from local dir). ✅

### SPEC_REC_TRANSCRIPTFILE
- AC-1: Path `<actor.folder>/transcripts/YYYY-MM-DD_HHmmss.txt` — `transcriptFile.ts` L38–39. ✅
- AC-2: Never overwritten (`wx` flag, suffix increment) — `transcriptFile.ts` L41–47. ✅
- AC-3: Created late in start; failed start discards — `session.ts` L132 (create), L213 (discard). ✅
- AC-4: Write error raises breakdown — `transcriptFile.ts` L86 (`raise`), `session.ts` L150 (`file.onError → breakdown`). ✅
- AC-5: Time marks `[HH:MM]` before first text and after each minute — `transcriptFile.ts` L67–74. ✅

### SPEC_REC_LIVEVIEW
- AC-1: Opens at `secondaryColumn`, focus preserved — `liveView.ts` L120 (`preserveFocus: true` in `openAtStart`). ✅
- AC-2: Shows end button, Actor, elapsed, words, text — `liveView.ts` `buildHtml`. ✅
- AC-3: Button ends recording, disabled from finishing — `liveView.ts` `setState`. ✅
- AC-4: Close while running asks question; "no" reopens — `liveView.ts` L139–145. ✅
- AC-5: `show()` reveals/focuses existing panel or creates — `liveView.ts` L105–108. ✅
- AC-6: Text enters via `textContent` — `liveView.ts` `add()` uses `createTextNode`. ✅

### SPEC_REC_DISPATCH
- One message via `api.sendMessage(actorName, 'Recorder', path)` — `session.ts` L195, `extension.ts` L84. ✅

### SPEC_ENG_ACTORMARK
- AC-1: `markActor` returns `Disposable`; disposing removes mark and refreshes — `actorTreeProvider.ts` L55–62. ✅ (unit-tested)
- AC-2: Second mark replaces first; disposing first leaves second — `actorTreeProvider.ts` L57 (entry identity check). ✅ (unit-tested)
- AC-3: Mark takes precedence over activity indicator — `actorTreeProvider.ts` L137–140. ✅ (unit-tested)
- AC-4: Mark does not touch activity state — `actorTreeProvider.ts` L137–140 (only sets `iconPath`). ✅ (unit-tested)
- AC-5: Additive; version stays 2 — `types.ts` L57, `coreApi.ts` L76. ✅

### SPEC_ENG_API AC-10
- `markActor` on interface, returns `Disposable`, not a decorator — `types.ts` L69, `coreApi.ts` L80–83. ✅

### SPEC_ACTOR_TREE (modified)
- Mark held by `ActorTreeProvider`, takes precedence — `actorTreeProvider.ts` L42, L137–140. ✅

### SPEC_ACTOR_ACTIVITY AC-4 (modified)
- AC-4 names the mark as the one other influence on the icon — `spec_actor.rst` L717. ✅

### SPEC_MOD_REC_PKG (modified)
- AC-1: `extensionDependencies: ["enthali.jarvis-core"]` — `package.json` L13. ✅
- AC-3: Functions with core alone — no other dependencies. ✅
- AC-4: Not installed → no contributions — standard VS Code behavior. ✅
- AC-5: Components not in VSIX — `.vscodeignore` does not exclude `resources/` but `components.json` + `capture.ps1` are small; the SDK/DLLs are downloaded at runtime. ✅
- AC-2: Recorder tools use `jarvis_rec_` infix — **see Issue I-1** (pre-existing, not a regression).

## D-51 Deviation Verification

All five D-51 corrections verified against code:

1. **Dynamic `import()`**: `engineWorker.ts` L18: `await import(pathToFileURL(path.join(msg.sdkDir, 'dist', 'index.js')).href)` — ✅ not `require`.
2. **Model checked before download**: `extension.ts` L63: `if (!fs.existsSync(path.join(modelDir, MODEL_MARKER))) { throw new Error(MODEL_MISSING_MESSAGE); }` — before `isComplete` and any download. ✅
3. **No extraction library**: `components.ts` has own `extractTgz` (zlib + tar parser) and `extractZip` (central directory reader). No external dependency. ✅
4. **Worker derives cache folder**: `engineWorker.ts` L21: `const cacheDir = path.join(path.dirname(msg.sdkDir), 'cache')`. ✅
5. **Legacy job error logged**: `extension.ts` L24: `void Promise.resolve(api.unregisterJob(LEGACY_JOB)).catch(err => log.warn(…))` — does not stop activation. ✅

## Artefact-Removal Check

Searched for: `whisperPath`, `recorder.py`, `checkTranscripts`, `Check Transcripts`, `stopRecording`, `recordingActive`, `RecordingManager`, `internalAppendMessage`, `jarvisProject`, `jarvisEvent`, `.recording.json`, `.stop`.

| Class | Where | What | Status |
|-------|-------|------|--------|
| (a) code | `packages/recorder/src/extension.ts` L15 | `'Jarvis: Check Transcripts'` constant — intentional legacy job cleanup (SPEC_REC_SETTINGS). | ✅ expected |
| (a) stale build | `packages/recorder/out/recording.js` | Old `RecordingManager` with `whisperPath`, `.recording.json`, `.stop`. Untracked (gitignored `out/`). Not shipped. | ✅ not a finding |
| (a) test | `src/tests/recorder-io.test.ts` | Assertions that the source does NOT contain `whisper`, `stopRecording`, etc. | ✅ expected |
| (b) docs | `docs/design/spec_rec.rst` L19, L37–42 | Migration text of `SPEC_REC_SETTINGS` documenting the removed setting and legacy job. | ✅ intentional |
| (b) docs | `packages/recorder/README.md` | Fully rewritten; no Whisper references. | ✅ clean |
| (b) docs | `README.md`, `packages/core/README.md`, `packages/suite/README.md` | No Whisper references. | ✅ clean |
| (c) historic | `docs/changes/v0.5.1/**`, `v0.8.0/**`, `v0.28.0/retire-legacy-actor-kinds.md` | Earlier changes that built/touched the pipeline. | ✅ acceptable stranding |
| — | `testdata/.jarvis/actors/archiv/Actor 1/kanban.yaml` | "whispering forest" — false positive. | ✅ |
| — | `testdata/recording/recorder.py` | Stale fixture; CD notes it, no test references it. | ✅ disclosed in CD |

**Result**: No active code or active doc references to removed artefacts outside the intentional migration text and legacy cleanup constant.

## Test Protocol

**File**: docs/changes/tst-recorder-redesign.md
**Result**: NOT RUN (correct — QM has not executed manual cases yet)

The protocol is well-structured:
- 14 QM (EDH) cases + 5 user cases, all honestly marked NOT RUN.
- Every case traces to specific REQ ACs — verified via the Acceptance Criteria Mapping table.
- Owners named (QM or User) for each case.
- Publication gate (licence/telemetry) documented as a separate non-test item blocking publication, not testing.

Automated tests (428 passed, 0 failed):
- `src/tests/recorder-session.test.ts` — session lifecycle, states, formatElapsed, word counter, dispatch.
- `src/tests/recorder-io.test.ts` — manifest content, capture parent, engine parent, liveView HTML, markActor guard.
- `src/tests/recorder-components.test.ts` — allow-list, zip-slip guard, integrity check, extraction, marker.
- `src/tests/actor-mark.test.ts` — SPEC_ENG_ACTORMARK AC-1..AC-4.

## Build & Test Results

- **Full monorepo build** (`compile all`): ✅ clean — all 7 packages compile (core, pim, recorder, mcp, flow, kanban, syspilot).
- **Test suite** (`npx vitest run`): ✅ 428 passed, 0 failed (49 test files).
- **Sphinx build** (`-W --keep-going`): ✅ clean — "build succeeded."

## Traceability Matrix

| User Story | Requirement | Design | Implementation | Test | Complete |
|------------|-------------|--------|----------------|------|----------|
| US_REC_CAPTURE | REQ_REC_BUTTON, REQ_REC_STATUSBAR, REQ_ENG_ACTORMARK | SPEC_REC_BUTTON, SPEC_REC_STATUSBAR, SPEC_REC_SESSION, SPEC_ENG_ACTORMARK | extension.ts, session.ts, coreApi.ts, actorTreeProvider.ts | actor-mark.test.ts, T-2–T-4, T-14 | ✅ |
| US_REC_ENABLE | REQ_REC_ENABLE | SPEC_REC_SETTINGS, SPEC_REC_BUTTON | extension.ts, package.json | T-1, T-2 | ✅ |
| US_REC_TRANSCRIPT | REQ_REC_TRANSCRIPTFILE, REQ_REC_SPEECH, REQ_REC_FAILURE | SPEC_REC_TRANSCRIPTFILE, SPEC_REC_CAPTURE, SPEC_REC_ENGINE, SPEC_REC_COMPONENTS, SPEC_REC_SESSION | transcriptFile.ts, capture.ts, engine.ts, engineWorker.ts, components.ts | recorder-components.test.ts, T-8–T-12, U-1–U-5 | ✅ |
| US_REC_LIVEVIEW | REQ_REC_LIVEVIEW | SPEC_REC_LIVEVIEW, SPEC_REC_SESSION | liveView.ts | recorder-io.test.ts, T-4–T-7, T-14 | ✅ |
| US_REC_DISPATCH | REQ_REC_DISPATCH | SPEC_REC_DISPATCH, SPEC_REC_SESSION | session.ts, extension.ts | recorder-session.test.ts, T-6, T-12, T-14 | ✅ |

Removed with no replacement: US_REC_CONFIG, REQ_REC_CONFIG, REQ_REC_SUBPROCESS, REQ_REC_SIDECAR, REQ_REC_WATCHERJOB, SPEC_REC_SUBPROCESS, SPEC_REC_SIDECAR, SPEC_REC_WATCHER, SPEC_REC_WATCHERJOB.

## Issues Found

### Issue 1: SPEC_MOD_REC_PKG AC-2 claims `jarvis_rec_` tool infix, but recorder registers no tools

- **Severity**: Low
- **Category**: Spec consistency (pre-existing, CD I-2)
- **Description**: `SPEC_MOD_REC_PKG` AC-2 says "Recorder tools use the `jarvis_rec_` infix." The recorder package registers no LM tools — its `package.json` contributes only commands and a setting; `extension.ts` calls no `api.registerTool`.
- **Expected**: Either AC-2 should state "Recorder registers no tools; the `jarvis_rec_` infix does not apply" or be removed.
- **Actual**: AC-2 still prescribes a non-existent tool namespace.
- **Recommendation**: Report to PM for spec correction. This is a documentation gap, not a code defect. The CD already discloses this as I-2 and reports it to PM.

## Conclusion

**PARTIAL.** The recorder-redesign is a major rework: the entire Whisper/Python/sidecar pipeline was replaced with a local Foundry Local SDK child process, a PowerShell audio capture helper, a component download system, a live transcript view, and a core API extension for Actor node marks.

**Verified by automated checks:**

1. **Build**: Full monorepo compile is clean across all 7 packages.
2. **Tests**: 428/428 pass — session lifecycle, capture parent, engine parent, components (zip-slip, integrity, extraction), transcript file (marks, no-overwrite), liveView HTML/CSP, Actor mark API (all 5 ACs), manifest content.
3. **Sphinx**: Build succeeds with `-W --keep-going`, no warnings.
4. **Artefact-removal**: No active code or doc references to the removed Whisper pipeline. ~~The only old-pipeline code lives in the untracked `out/recording.js` (stale build, gitignored).~~ **Corrected in Round 2** (below): VSCE inclusion is independent of Git tracking; the stale `out/recording.js` was shipped. Fixed by F-4 (clean.js + build gate).
5. **D-51 deviations**: All five corrections (dynamic import, model-before-download, no extraction library, cache derivation, legacy job error handling) verified against code.
6. **Spec-to-code traceability**: Every SPEC_REC_*, SPEC_ENG_ACTORMARK, SPEC_ENG_API AC-10, SPEC_ACTOR_TREE, and SPEC_ACTOR_ACTIVITY AC-4 implementation verified against its acceptance criteria.

**Not yet verified (honestly NOT RUN):**

- 19 manual Test Protocol cases (14 QM/EDH + 5 user) — all correctly marked NOT RUN.
- Publication gate (licence/telemetry, D-28) — blocks publication, not testing.
- Verify-first items: one-hour run, real-speech quality, proxy download on the real machine, `deactivate()` budget.

**One low-severity issue**: SPEC_MOD_REC_PKG AC-2 claims `jarvis_rec_` tool infix, but the recorder registers no tools. Pre-existing, disclosed in the CD as I-2, reported to PM.

Ready for QM Test Protocol execution. Not ready for publication (licence gate open).

---

## Round 2: Verification after QM Round 1 Fixes (F-1..F-4)

**Date**: 2026-10-03
**Commits reviewed**: `8facde5..76eb7bd` (specs: `324e264`, `c1bf220`; code: `9484f9d`)
**Status**: PARTIAL

### Correction to Round 1

**Stale `out/recording.js` statement (F-4)**: Round 1 claimed the file was "untracked (gitignored), therefore not shipped." QM F-4 showed this was wrong: VSCE inclusion is independent of Git tracking. `npx --no-install vsce ls --no-dependencies` listed `out/recording.js` with `RecordingManager`, `whisperPath`, `.recording.json` and `.stop`. The fix (9484f9d) adds `clean.js` (removes `out/` before any build), wires it into `build.js` and the `compile all` task, and adds `SPEC_MOD_REC_PKG` AC-6 as the package-content gate. The `recorder-build.test.ts` test is now the gate: it runs `vsce ls` and asserts no `recording.js`/`whisper`/`recorder.py` in the file list.

### Build & Test Results (Round 2)

- **Full monorepo build** (`compile all` task): ✅ clean — now includes `node packages/recorder/clean.js && npx tsc -p packages/recorder` in the recorder step. All 7 packages compile.
- **Test suite** (`npx vitest run`): ✅ 453/453 pass (50 test files). Up from 428 — 25 new tests added (F-1: 8, F-2: 6, F-3: 4, F-4: 4, plus build-content test file). No flaky failures.
- **Sphinx build** (`-W --keep-going`): ✅ clean — "build succeeded", 0 warnings.
- **`vsce ls --no-dependencies`** (after `node build.js`): ✅ Package contains exactly `README.md`, `package.json`, `out/extension.js`, `out/extension.js.map`, `out/engineWorker.js`, `out/engineWorker.js.map`, `resources/jarvis-128.png`, `resources/components.json`, `resources/capture.ps1`. No `recording.js`, `whisper`, `recorder.py`. (SPEC_MOD_REC_PKG AC-6 ✅)

### F-1 Verification: End and shutdown by state (SPEC_REC_SESSION AC-1, AC-11, AC-13, D-54)

**Spec**: `end` acts by state — `idle`: nothing; `starting`: only shutdown acts (silent cancel); `running`: starts the end sequence; `finishing`: returns the in-progress promise, and a shutdown shortens the deadline. `deactivate()` awaits the completion.

**Code** (`session.ts`):
- `end()` now switches on state (L117–130): `idle` → `Promise.resolve()`; `starting` + `shutdown` → `cancelStart('shutdown', true)`, returns `startPromise`; `finishing` + `shutdown` → `deadline.shorten()`, returns `endPromise`; `running` → `runEnd(reason)`.
- `runEnd` creates a `deadline` object with `shorten()` that moves the remaining wait to `min(remaining, SHUTDOWN_TIMEOUT_MS)`.
- `shutdown()` awaits `end('shutdown')`.

**Test** (`recorder-session.test.ts` "QM F-1", 8 tests):
- Unresolved user end + shutdown: file closed, one message, idle, deactivate waits. ✅
- Second end while finishing returns the same promise. ✅
- Shutdown never lengthens a wait already shorter. ✅
- Shutdown while starting (engine not ready): silent cancel, no file, no message, no error. ✅
- Shutdown while starting (capture not ready): engine and capture stopped, no file. ✅
- Shutdown during component preparation: silent cancel after. ✅
- User end while starting is ignored. ✅
- End on idle does nothing. ✅

**Old-code verification**: Replaced `session.ts` with `8facde5` version and ran the test suite → 10 tests failed (including all 8 F-1 tests). All 42 pass on the current code. ✅ Tests are genuine regression checks, not tautologies.

### F-2 Verification: Failures during the start (SPEC_REC_SESSION AC-12, SPEC_REC_CAPTURE AC-5, SPEC_REC_ENGINE AC-11, D-55)

**Spec**: The session subscribes to each component's failure events at creation, before awaiting its start. The first failure while `starting` cancels the start. A component that finishes starting after cancellation is stopped. Engine failure is kept in `failure` property for late subscribers. Capture ready timeout is 15 s.

**Code** (`session.ts`, `engine.ts`, `capture.ts`):
- `runStart` subscribes to `engine.onFailure` immediately after `createEngine()` (L149). Subscribes to `capture.onFailure` and `capture.onSourceLost` immediately after `createCapture()` (L154–157). Subscribes to `file.onError` after creating the file (L166).
- `onComponentFailure(reason)` checks `this._state === 'starting'` → `cancelStart`, or `'running'` → `breakdown`.
- `checkCancelled(engine?)` after each await; if cancelled, throws with the cancel reason and (if engine) disposes it.
- `engine.ts`: `failure` getter returns `failureReason`; `dispose()` now rejects the pending `readyReject`. `capture.ts`: `stop()` now clears the start timer and rejects `startReject`; `CAPTURE_READY_TIMEOUT_MS = 15000`.

**Test** (`recorder-session.test.ts` "QM F-2", 6 tests):
- Worker failure during `capture.start()`: idle, error shown, no file, nothing running. ✅
- Capture finishes starting after cancellation: stopped, no file. ✅
- Failure noticed only through `engine.failure` after the await: cancels. ✅ (This tests the new `failure` property — AC-11.)
- Worker failure while engine is still starting: fails the start. ✅
- Capture failure event during the start: cancels. ✅
- After a cancelled start, a new start works. ✅

### F-3 Verification: Emitted worker loads ESM SDK (SPEC_REC_ENGINE AC-10, D-53)

**Spec**: The emitted `out/engineWorker.js` loads the SDK with a native dynamic `import()` in every supported build path. A compile that turns it into `require` is a defect.

**Code** (`engineWorker.ts` L21–22): `const nativeImport = new Function('specifier', 'return import(specifier)')` — prevents tsc (CommonJS) from rewriting `import()` to `require()`. The source calls `nativeImport(pathToFileURL(...).href)` at L39.

**Emitted output** (esbuild bundle): Line 41: `var nativeImport = new Function("specifier", "return import(specifier)")`, line 58: `const sdk = await nativeImport((0, import_url.pathToFileURL)(...).href)`. ✅ Native dynamic import preserved.

**Test** (`recorder-build.test.ts` "QM F-3", 5 tests):
- Plain tsc output: loads ESM SDK, reaches `ready`, forwards `text`, ends with `final`. ✅
- esbuild bundle: same. ✅ (F-3 test starts the EMITTED worker from both a tsc compile and an esbuild bundle.)
- Both outputs contain no `require()` of the SDK. ✅
- Missing SDK directory: worker reports a clear `error`, exit code 1. ✅ (not a hang)

### F-4 Verification: Package content (SPEC_MOD_REC_PKG AC-6, D-53)

**Spec**: The package holds only what the recorder needs now. Output of removed sources does not ship. The output folder is cleaned before a build. Inclusion in the package does not depend on Git tracking.

**Code** (`clean.js`, `build.js`, `.vscodeignore`, `package.json`):
- `clean.js`: `fs.rmSync(path.join(__dirname, 'out'), { recursive: true, force: true })`.
- `build.js`: `require('./clean.js')` at the top, before esbuild.
- `package.json` scripts: `"compile": "node clean.js && tsc -p ./"`.
- `.vscode/tasks.json`: recorder step is now `node packages/recorder/clean.js && npx tsc -p packages/recorder`.

**Test** (`recorder-build.test.ts` "QM F-4", 3 tests):
- `vsce ls` file list: no `recording.js`/`whisper`/`recorder.py`; all `out/` files have a source in `src/`. ✅
- Build removes stale output: writes a fake `recording.js`, runs `build.js`, asserts it is removed; only `engineWorker.js` and `extension.js` remain. ✅
- `compile all` task includes `clean.js` before tsc. ✅

### Artefact-Removal Re-check (Round 2)

- `packages/recorder/src/`: only `LEGACY_JOB = 'Jarvis: Check Transcripts'` (intentional cleanup, SPEC_REC_SETTINGS). ✅
- `packages/recorder/out/`: no `recording.js`, no `whisperPath`, no `RecordingManager`, no `.recording.json`. ✅ (stale output removed by clean.js)
- `docs/` (design, requirements, userstories): only intentional migration text in `spec_rec.rst`. ✅
- `README.md`, `packages/core/README.md`, `packages/suite/README.md`: clean. ✅
- `packages/recorder/README.md`: fully rewritten. ✅

### Test Protocol Check (T-14 / D-54)

**Finding R2-1 (Medium)**: T-14 covers shutdown while **running** (reload and window close) but does **not** cover shutdown while **finishing** or shutdown while **starting**, both of which are new behaviors introduced by D-54/QM F-1. SPEC_REC_SESSION AC-13 (shutdown during starting: silent cancel) and AC-11 (shutdown during finishing: shortened wait, deactivate awaits) are new acceptance criteria with no corresponding manual test case.

**Recommendation**: T-14 should be expanded (or T-15 added) to cover:
1. Shutdown/reload while the session is in the `finishing` state (user pressed End, flush in progress) — verify deactivate awaits, file is closed, message sent, state reaches `idle`.
2. Shutdown/reload while the session is in the `starting` state (engine or capture not yet ready) — verify silent cancel, no file, no message, no error notification.

Reported to CM; protocol not edited by VE.

### D-51 Deviation Re-verification (Round 2)

All five D-51 corrections still hold after the F-1..F-4 changes:
1. Dynamic `import()` — preserved via `new Function` trick (now also tested by F-3). ✅
2. Model checked before download — `extension.ts` L63, before `isComplete`. ✅
3. No extraction library — own tar/zip readers. ✅
4. Worker derives cache folder — `engineWorker.ts` L21 (`path.dirname(msg.sdkDir)` + `/cache`). ✅
5. Legacy job error logged — `extension.ts` L24, `.catch(err => log.warn(…))`. ✅

### Issues (Round 2)

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| R2-1 | Medium | T-14 does not cover shutdown while `finishing` or `starting` (D-54 new behaviors) | Reported to CM; protocol update needed |
| I-1 | Low | SPEC_MOD_REC_PKG AC-2 claims `jarvis_rec_` tool infix, recorder registers no tools | Pre-existing (CD I-2), reported to PM |

### Round 2 Conclusion

**PARTIAL.** All four QM Round 1 findings (F-1..F-4) are correctly fixed and verified:

- F-1 (High): End-by-state implemented and tested. 8 regression tests, confirmed to fail on old code.
- F-2 (High): Startup failure subscription implemented and tested. 6 regression tests, including the `failure` property (AC-11) late-subscriber check.
- F-3 (High): ESM import preserved in emitted worker. 5 smoke tests covering both tsc and esbuild outputs.
- F-4 (Medium): Stale output removed, build cleaned, package file list verified. 3 package-content tests. VE's Round 1 error corrected.

Build: 453/453 tests pass. Sphinx: clean. vsce ls: clean. Artefact-removal: clean.

**Remaining**: Manual Test Protocol (T-1..T-14) still NOT RUN. T-14 needs expansion for shutdown-during-finishing/starting (R2-1). Publication gate (licence/telemetry) still open.

---

## Round 3: Verification after D-56 "Close Means Exit" (F-5 simplification)

**Date**: 2026-10-03
**Commits reviewed**: `76eb7bd..f04378a` (spec: `a00c29f`; code: `f19c065`; test protocol: `8540970`)
**Worktree**: `C:\workspace\jarvis-verify` (detached, `f04378a`) — shared tree had foreign uncommitted `packages/recorder/package.json` reverting to pre-redesign content
**Status**: PASSED

### What changed (D-56, F-5)

D-56 removes the shutdown deadline machinery entirely: `SHUTDOWN_TIMEOUT_MS`, the `deadline` object, `shorten()`, and all deadline arithmetic are gone from `session.ts`. On VS Code close/reload:

- **`running`**: the end sequence runs without the `waitForFinal` wait; `engine.dispose()` is called, the file is closed with text received so far, and the message is attempted (AC-14).
- **`finishing`**: a shutdown leaves the `waitForFinal` wait at once via `leaveWait()`, then disposes the engine; a repeated shutdown changes nothing because the wait is already left and there is no clock to move (AC-11).
- **`starting`**: unchanged from D-54/D-55 — silent cancel, no file, no message (AC-13).
- Engine `dispose()` raises no failure and resolves a pending `finish()` (SPEC_REC_ENGINE AC-5).

### Traceability verification

| Element | Spec | Code | Test | Verdict |
|---------|------|------|------|---------|
| US_REC_CAPTURE AC-5 (shutdown ends at once, no wait, text may be missing) | `docs/userstories/us_rec.rst:20` | `session.ts:247-257` (`waitForFinal`: shutdown skips wait, disposes) | T-14 (manual) | ✅ |
| REQ_REC_BUTTON AC-6 (shutdown: end at once, keep text, attempt notification) | `docs/requirements/req_rec.rst:55-60` | `session.ts:214-217` (`end` by state), `247-257` (`waitForFinal`) | `recorder-session.test.ts:487` (AC-14: shutdown from running) | ✅ |
| REQ_REC_DISPATCH AC-1 (shutdown: no wait, message only attempted) | `docs/requirements/req_rec.rst:95-99` | `session.ts:231-236` (dispatch in `finally`), `503-507` (`shutdown`) | `recorder-session.test.ts:508` (AC-14: message is only attempted) | ✅ |
| SPEC_REC_SESSION AC-4 (shutdown end sequence: file close before dispatch) | `docs/design/spec_rec.rst:175`, step 4-5 at L269-273 | `session.ts:228-236` (`runEnd` step order: capture→finish→close→dispatch) | `recorder-session.test.ts:487` (close before send asserted) | ✅ |
| SPEC_REC_SESSION AC-11 (second end while finishing joins sequence; shutdown leaves wait once; repeated shutdown idempotent) | `docs/design/spec_rec.rst:337-340` | `session.ts:156-157` (finishing: `leaveWait?.()`, returns `endPromise`), `97` (`leaveWait` field) | `recorder-session.test.ts:454` (AC-11), `512` (F-5 regression: two shutdowns) | ✅ |
| SPEC_REC_SESSION AC-13 (shutdown during starting cancels silently) | `docs/design/spec_rec.rst:344-345` | `session.ts:153-154` (starting: `cancelStart('shutdown', true)`) | `recorder-session.test.ts:538` (engine not ready), `552` (capture not ready) | ✅ |
| SPEC_REC_SESSION AC-14 (shutdown during running skips recognition wait) | `docs/design/spec_rec.rst:346-348` | `session.ts:248-256` (shutdown skips `waitForFinal` wait body, disposes) | `recorder-session.test.ts:487` (AC-14), `508` (message attempted) | ✅ |
| SPEC_REC_ENGINE AC-5 (`dispose()` resolves pending `finish()` without failure) | `docs/design/spec_rec.rst:509-511` | `engine.ts:93-100` (`dispose` sets `finished`, rejects `readyReject`, `releaseFinal()`), `141-145` (`releaseFinal` resolves waiters) | `recorder-io.test.ts:195` (AC-5 / D-56: dispose resolves pending finish, no failure) | ✅ |

### Removed machinery grep

`grep -r 'SHUTDOWN_TIMEOUT_MS\|shorten\|deadline' packages/recorder/src/` → **0 matches**.

`spec_rec.rst:270` contains `deadline` in the **normal-end** description ("The wait has a deadline of `FINISH_TIMEOUT_MS = 20000`"), which is correct: the normal user end keeps the 20 s timeout. The shutdown path is described separately and contains no deadline.

### Build & Test Results (Round 3)

- **Full monorepo build** (`compile all` task): ✅ clean. All packages compile.
- **Unit tests**: 457/457 pass (50 files).
  - `recorder-session.test.ts`: 45/45 pass — includes 8 D-56 state/shutdown tests (AC-11, AC-13, AC-14, F-5 regression) + 2 finishing/idempotency tests.
  - `recorder-io.test.ts`: SPEC_REC_ENGINE AC-5 / D-56 test passes — `dispose()` resolves a pending `finish()` with no failure.
- **Old-code regression**: Replaced `session.ts` with the pre-D-56 version (`f19c065~1`) and ran `recorder-session.test.ts` → 3 tests fail:
  - AC-11: shutdown from finishing with unresolved `finish()` — fails (old code had `deadline.shorten()`, not `leaveWait`)
  - AC-14: shutdown from running — fails (old code waited with `deadline` arithmetic)
  - F-5: two shutdowns in a row — fails (old code extended a `deadline`)
  All 45 pass on the current code. ✅ Tests are genuine regression checks.
- **vsce ls**: 9 files, no `recording.js`/`whisper`/`recorder.py`. ✅
- **Sphinx build** (`-W --keep-going`): ✅ clean — 9499 needs validated, 0 warnings, 0 errors. Run from main workspace `.venv` (not in worktree).

### Test Protocol T-14/T-15/T-16 check

| Test | ACs | Covers D-56? | Verdict |
|------|-----|-------------|---------|
| T-14 (shutdown/reload while running) | REQ_REC_BUTTON AC-6; REQ_REC_LIVEVIEW AC-5; REQ_REC_DISPATCH AC-1 | Yes: no wait for recognition, text received before close kept in file, message attempted (may be missing). Explicitly documents that a missing message is **not** a failure. | ✅ Consistent |
| T-15 (shutdown while finishing) | REQ_REC_BUTTON AC-6; REQ_REC_DISPATCH AC-1; SPEC_REC_SESSION AC-4, AC-11 | Yes: wait ends at once, file closed with text received, message attempted. Documents that a repeated shutdown changes nothing (regression test is automated). Records `BLOCKED` guidance if the race window can't be hit. | ✅ Consistent |
| T-16 (shutdown while starting) | SPEC_REC_SESSION AC-1, AC-13 | Yes: silent cancel, no file, no message, no error. Unchanged from D-54. | ✅ Consistent |

AC mapping table at `tst-recorder-redesign.md:534-543` maps all D-56 ACs to the correct test cases and test functions. SPEC_REC_ENGINE AC-5 is mapped to both the io test and T-14/T-15. ✅

### Findings

No issues found. All declared changes in D-56 are implemented, tested, and traced.

### Round 3 verdict: PASSED ✅

All D-56 spec changes are correctly implemented:

- `waitForFinal` skips the wait on shutdown and disposes the engine (AC-14)
- `leaveWait` replaces `deadline.shorten()` for the finishing path (AC-11)
- Repeated shutdowns change nothing (F-5 regression test)
- Engine `dispose()` resolves pending `finish()` without failure (SPEC_REC_ENGINE AC-5)
- `end()` switches by state: idle/starting/finishing/running (AC-1)
- No `SHUTDOWN_TIMEOUT_MS`, `deadline`, or `shorten` in source code
- Sphinx: clean. Build: clean. Tests: 457/457. vsce ls: clean.
- Test Protocol T-14/T-15/T-16 consistent with D-56 spec and AC mapping.

**Remaining**: Manual Test Protocol (T-1..T-17) still NOT RUN. Publication gate (licence/telemetry) still open.

---

## Round 4: Verification after QM Round 3 findings (F-6, F-7, D-57)

**Date**: 2026-10-03
**Commits reviewed**: `04040e4..dac67c3` (spec: `cdde174` D-57 wording; test protocol: `137ea87` T-14/T-15)
**Overall status**: PARTIAL

### Correction to Round 3 (F-6)

Round 3 set `:status: implemented` on all recorder-redesign elements. QM found that the VE's own rule ties `implemented` to verification and forbids promotion on PARTIAL outcomes. Several elements have ACs whose acceptance depends on evidence that remains open: real-source latency (U-2/U-4), German/English recognition (U-2), real SDK through the native-import worker under Electron (T-9/T-17), and deactivate/reload behavior in the EDH (T-14/T-15/T-16). Per PM decision, elements whose acceptance depends on open evidence go back to `approved` individually; proven elements stay `implemented`.

### Per-element status decisions

| Element | Round 3 status | Round 4 status | Reason |
|---------|----------------|----------------|--------|
| US_REC_ENABLE | implemented | **implemented** | AC-1..4: setting, when clauses, start gating — statically verifiable + unit tested |
| US_REC_CAPTURE | implemented | **approved** | AC-1..4 (hover action, red circle, statusbar visibility in ACTORS tree) need EDH (T-1, T-2); AC-5 (shutdown) → T-14 |
| US_REC_TRANSCRIPT | implemented | **approved** | AC-2 (mic+speaker capture), AC-3 (20 s latency), AC-5 (German/English), AC-7 (download) need real SDK/EDH (U-2, U-4, T-9, T-17) |
| US_REC_LIVEVIEW | implemented | **approved** | All ACs (view opens, scroll, button, close question, bring-back) need EDH (T-5, T-6, T-7) |
| US_REC_DISPATCH | implemented | **implemented** | AC-1: one message with path — unit tested |
| REQ_REC_ENABLE | implemented | **implemented** | AC-1..4: setting, when clauses, start gating — statically verifiable + unit tested |
| REQ_REC_BUTTON | implemented | **approved** | AC-1..5 (hover, palette pick, mark visible, one recording) need EDH (T-1); AC-6 (shutdown) → T-14 |
| REQ_REC_STATUSBAR | implemented | **approved** | AC-1 (visible while running), AC-4 (click shows view) need EDH (T-3, T-5) |
| REQ_REC_DISPATCH | implemented | **implemented** | AC-1 (message after close, only attempted at shutdown), AC-2 (path not content) — unit tested |
| REQ_REC_TRANSCRIPTFILE | implemented | **implemented** | AC-1..4 (path, no-overwrite, create/append, time marks) — unit tested |
| REQ_REC_SPEECH | implemented | **approved** | AC-1..8 (audio capture, local recognition, latency, German/English, platform) need real SDK/EDH (T-1, T-2, T-9, T-17) |
| REQ_REC_FAILURE | implemented | **approved** | AC-1/2 (error notification shown to user in VS Code) need EDH (T-12, T-13) |
| REQ_REC_LIVEVIEW | implemented | **approved** | All ACs (view placement, button, scroll, close question, bring-back) need EDH (T-5, T-6, T-7) |
| REQ_ENG_ACTORMARK | implemented | **implemented** | markActor API — unit tested in core |
| SPEC_REC_SETTINGS | implemented | **implemented** | AC-1..3 (package.json content, legacy job, start gating) — statically verifiable + tested |
| SPEC_REC_BUTTON | implemented | **implemented** | AC-1..6 (commands, when clauses, markActor call) — statically verifiable |
| SPEC_REC_STATUSBAR | implemented | **implemented** | formatElapsed, visibility logic — unit tested |
| SPEC_REC_SESSION | implemented | **implemented** | AC-1..14 (state machine, end by state, shutdown, breakdown) — all unit tested (45 tests). Verify-first: deactivate() timing is a T-14 concern, not an AC |
| SPEC_REC_CAPTURE | implemented | **approved** | Verify-first: mixing/resampling, pwsh vs powershell, AppLocker (T-1, T-2). AC-2 (missing source) needs real audio |
| SPEC_REC_ENGINE | implemented | **approved** | AC-1 (child process with real SDK), AC-4 (no network), AC-7 (latency < 20 s), AC-8 (telemetry off) need T-9/T-17. AC-5 (dispose), AC-10 (ESM import), AC-11 (failure) ARE tested |
| SPEC_REC_COMPONENTS | implemented | **approved** | Verify-first: DLL search with non-ANSI path, modelDir derivation, licence (D-28) — T-8, T-9, T-17 |
| SPEC_REC_TRANSCRIPTFILE | implemented | **implemented** | AC-1..5 (path, no-overwrite, append/close chain, time marks) — unit tested |
| SPEC_REC_LIVEVIEW | implemented | **approved** | AC-1..6 (view placement, scroll, CSP rendering, button, close question) need EDH (T-5, T-6, T-7, T-14) |
| SPEC_REC_DISPATCH | implemented | **implemented** | sendMessage call — unit tested |
| SPEC_MOD_REC_PKG | implemented | **implemented** | Package file list — tested (recorder-build.test.ts) |

**Summary**: 13 elements stay `implemented`; 12 go back to `approved` pending manual/EDH evidence.

### D-57 consistency check (F-7)

D-57 aligns the spec with the actual write-queue behavior of `TranscriptFile`:

- `transcriptFile.ts:47-65`: `append()` queues `fs.write` on `this.chain` and returns without waiting. `close()` (L68-70) awaits `this.chain` before closing the handle. Matches SPEC_REC_TRANSCRIPTFILE Writing. ✅
- `REQ_REC_BUTTON` AC-6 (L55-60): now says "save the text received so far... both on a best-effort basis without a guarantee: the transcript may lack its last words and more, for example when writing fails or the host ends first". Matches D-57. ✅
- `SPEC_REC_SESSION` Shutdown paragraph (L351-360): "The text the engine has delivered is handed to the write queue of the transcript file as it arrives and step 4 waits for that queue, as it does after a normal end; no extra wait is added." Matches D-57 and `session.ts` step 4. ✅
- `SPEC_REC_SESSION` AC-14 (L346-348): "the file is closed after the queued writes (the text received so far, best effort)". Matches D-57. ✅
- T-14 Expected (L314-316): "The transcript file exists, is closed, and is readable. It contains text whose writes completed before host exit; it may lack the last text shown in the view if that text was still queued." Matches D-57. ✅
- T-15 Expected (L342-344): "contains writes completed before host exit and may lack text still in the write queue." Matches D-57. ✅

No code changes were made for D-57 — the code already uses the promise-chain write queue. Only wording changed in spec, requirement and test protocol.

### Build & Test Results (Round 4)

All results at HEAD `dac67c3`, shared tree (clean, foreign `package.json` restored by PM).

- **Full monorepo build** (`compile all` equivalent): ✅ clean — all 7 packages compile.
- **Unit tests**: 457/457 pass (50 files).
- **Sphinx** (`-W --keep-going`): ✅ clean — 3384 needs validated, 0 warnings, 0 errors.
- **vsce ls**: 9 files, no `recording.js`/`whisper`/`recorder.py`. ✅

No code changes since Round 3 (`f19c065` was the last code commit). D-57 is spec/protocol wording only.

### Findings

None. D-57 wording is consistent across spec, requirement, code, and test protocol. F-6 status corrections applied per PM decision.

### Round 4 verdict: PARTIAL ⚠️

F-6 (status metadata) corrected: 12 elements reverted to `approved` pending manual/EDH evidence; 13 remain `implemented` with full automated evidence. F-7 (D-57 wording) verified consistent across all layers.

**Overall CR status remains PARTIAL**: Manual Test Protocol T-1..T-17 NOT RUN. Publication gate (licence/telemetry) still open.

---

## Round 5: Status promotion after user validation (U-1..U-5) and backlog 49 verification (D-58, D-59)

**Date**: 2026-10-03
**Commits reviewed**: `20702be..766846d` (spec: `15ba935` D-58, `1eda339` D-59; code: `97e508f`; protocol: `af2e633`)
**Overall status**: PARTIAL

### User validation results (as reported by PM; user-reported, not VE evidence)

- **U-1 PASS**: First start failed once with TLS error, second succeeded. Components downloaded through the proxy. Download works (retry needed on this laptop).
- **U-2 PASS**: Both audio sources captured. German/English recognised without language setting. Spanish not recognised (accepted). Delay 3-6 s. Time marks about every minute. No echo.
- **U-3 BLOCKED** (laptop mic/speakers cannot be disabled). User decision: not a release blocker.
- **U-4 NOT RUN** by user decision (5 min at 30-40% CPU, no memory readings, no one-hour run).
- **U-5 PASS**: Log carries only word counts. Transcript files only. No audio artefact.
- **T-1..T-17**: NOT RUN. D-28 (licence/telemetry) blocks publication, not merge.

### Status promotion (per PM rule: status follows verification, no blanket promotion)

Of the 12 `approved` elements from Round 4, **0** are promoted. All 12 remain `approved` with their open cases named. (REQ_REC_SPEECH was initially promoted in Round 5, but withdrawn after QM F-8 found the U results covered its ACs only partly — AC-1 missing-source behaviour, AC-2 no audio leaving the machine, AC-4 a felt delay in a short run with U-4 not run, AC-8 only the successful second start. User decision 2026-10-03.)

| Element | Round 4 status | Round 5 status | U case coverage | Decision |
|---------|----------------|----------------|-----------------|----------|
| US_REC_CAPTURE | approved | **approved** | U-2 exercised start action, but AC-1..4 (hover, red circle, statusbar, one recording) need T-1/T-2; AC-5 (shutdown) → T-14 | T-1/T-2/T-14 NOT RUN |
| US_REC_TRANSCRIPT | approved | **approved** | U-2: AC-2 (both sources) ✅, AC-3 (3-6s < 20s) ✅, AC-5 (German/English) ✅, AC-7 (download, U-1) ✅, AC-8 (time marks) ✅. AC-6 (failure notification) → T-12/T-13 NOT RUN | 1 of 8 ACs open |
| US_REC_LIVEVIEW | approved | **approved** | U-2 exercised a recording, but view placement, close question, scroll, bring-back need T-5/T-6/T-7 | T-5/T-6/T-7 NOT RUN |
| REQ_REC_BUTTON | approved | **approved** | U-2 exercised start, but AC-1..5 need T-1; AC-6 (shutdown) → T-14 | T-1/T-14 NOT RUN |
| REQ_REC_SPEECH | approved | **approved** | U-2: AC-1 (both sources, but missing-source path not tested) ⚠️, AC-5 (German/English) ✅, AC-4 (3-6s, but U-4 one-hour not run) ⚠️. U-5: AC-3 (no audio to disk) ✅, AC-6 (no text in log) ✅. U-1: AC-8 (download, but only second start) ⚠️. AC-2 (no network) not monitored. AC-7 (Windows) ✅ | Partial coverage — promotion withdrawn (QM F-8) |
| REQ_REC_STATUSBAR | approved | **approved** | U-2 saw recording, but visibility and click-to-show need T-3 | T-3 NOT RUN |
| REQ_REC_FAILURE | approved | **approved** | No failure triggered during U-1/U-2 (U-1 TLS error was download, not recognition start). Error notification needs T-12/T-13 | T-12/T-13 NOT RUN |
| REQ_REC_LIVEVIEW | approved | **approved** | All ACs need EDH (T-5/T-6/T-7) | T-5/T-6/T-7 NOT RUN |
| SPEC_REC_ENGINE | approved | **approved** | U-2: AC-1 (child process real SDK) ✅, AC-7 (3-6s < 20s) ✅. AC-4 (no network, not monitored) ⚠️, AC-8 (telemetry off, not checked) ❌ → D-28 | D-28 open, T-9/T-17 NOT RUN |
| SPEC_REC_CAPTURE | approved | **approved** | U-2 exercised real audio, but AppLocker/powershell 5.1/mixing need T-1/T-2 | T-1/T-2 NOT RUN |
| SPEC_REC_COMPONENTS | approved | **approved** | U-1: download and load worked. But non-ANSI path, modelDir derivation, licence (D-28) need T-8/T-9/T-17 | T-8/T-9/T-17 NOT RUN, D-28 open |
| SPEC_REC_LIVEVIEW | approved | **approved** | All ACs need EDH (T-5/T-6/T-7/T-14) | T-5/T-6/T-7/T-14 NOT RUN |

**Summary**: 0 promoted, all 12 remain `approved`. Total: 13 `implemented`, 12 `approved`.

### Backlog 49 verification (D-58, D-59)

**D-58** (settings group title "Jarvis Recorder"):

| Check | Location | Value | Verdict |
|-------|----------|-------|---------|
| REQ_REC_ENABLE AC-2 | `req_rec.rst:17` | "settings group titled 'Jarvis Recorder'" | ✅ |
| SPEC_REC_SETTINGS description | `spec_rec.rst:18` | "The 'Jarvis Recorder' settings group" | ✅ |
| SPEC_REC_SETTINGS AC-1 | `spec_rec.rst:46` | "The 'Jarvis Recorder' group contributes exactly..." | ✅ |
| Manifest | `package.json:72` | `"title": "Jarvis Recorder"` | ✅ |
| Test | `recorder-io.test.ts:276` | `expect(groups[0].title).toBe('Jarvis Recorder')` | ✅ |

**D-59** (command titles "Jarvis: Start Recording" / "Jarvis: Show Running Recording"):

| Check | Location | Value | Verdict |
|-------|----------|-------|---------|
| SPEC_REC_BUTTON | `spec_rec.rst:68-69` | "Jarvis: Start Recording", "Jarvis: Show Running Recording" | ✅ |
| Manifest | `package.json:37,42` | `"title": "Jarvis: Start Recording"`, `"title": "Jarvis: Show Running Recording"` | ✅ |
| README | `README.md:10,20` | "Jarvis: Start Recording" | ✅ |
| Test | `recorder-io.test.ts:287` | `expect(...).toEqual(['Jarvis: Start Recording', 'Jarvis: Show Running Recording'])` | ✅ |
| Test protocol | `tst-recorder-redesign.md:80,89` | "Jarvis: Start Recording" | ✅ |

**Stale title grep**: No occurrences of "Start Recording" or "Show Running Recording" without the "Jarvis:" prefix in `package.json`, `README.md`, or `tst-recorder-redesign.md` (L137 "Start recording" is a verb, not a title). ✅

### Build & Test Results (Round 5)

All results at HEAD `766846d`, shared tree (clean).

- **Full monorepo build** (`compile all` equivalent): ✅ clean — all 7 packages compile.
- **Unit tests**: 457/457 pass (50 files).
- **Sphinx** (`-W --keep-going`): ✅ clean — 2838 needs validated, 0 warnings, 0 errors.
- **vsce ls**: 9 files, no stale output. ✅

Code changes since Round 4: manifest title and README (`97e508f`), test assertion for group title and command titles (`97e508f`). No session/engine/capture code changes.

### Findings

None. D-58 and D-59 correctly implemented and tested. REQ_REC_SPEECH promotion withdrawn after QM F-8 (partial U coverage); all 12 elements remain `approved` with open T/U cases named.

### Round 5 verdict: PARTIAL ⚠️

- **13 elements** at `implemented` (from Round 3; no promotions after user validation).
- **12 elements** at `approved` (depend on T-1..T-17, U-3, U-4, or D-28).
- Manual Test Protocol T-1..T-17 NOT RUN. U-3 BLOCKED, U-4 NOT RUN. D-28 (licence/telemetry) blocks publication.
- **Overall CR status remains PARTIAL.**

