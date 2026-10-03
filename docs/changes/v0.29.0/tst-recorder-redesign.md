# Test Protocol: recorder-redesign

- **Change Document:** [recorder-redesign](recorder-redesign.md)
- **Branch:** `feature/recorder-redesign`
- **Date prepared:** 2026-10-02
- **Result**: NOT RUN

## Scope and Execution

This protocol covers acceptance behavior that needs the VS Code Extension
Development Host (EDH), real audio devices, the user's network, or a user
decision. Deterministic behavior already exercised by
`src/tests/recorder-session.test.ts`, `recorder-io.test.ts`,
`recorder-components.test.ts`, and `actor-mark.test.ts` is not repeated as a
unit test. Module integration, compilation, packaging, and CI remain
Engineering checks and are outside this manual protocol, except for the
isolated installed-VSIX smoke case T-17. T-17 does not replace the automated
package-content gate.

QM executes the QM cases in a Windows EDH using the implementation on this
branch. The User executes the real-machine cases. Record `PASS`, `FAIL`,
`BLOCKED`, or `NOT RUN` for each case, with tester, date, environment, and
sanitized evidence. A missing prerequisite is `BLOCKED`, never an assumed pass.
Use original, non-sensitive speech; do not paste transcript content into this
protocol.

### Preconditions

- QM has a disposable workspace with two uniquely named test Actors, a writable
  Actor folder, and the core and recorder extensions loaded from this branch.
- QM uses a Windows EDH with a working microphone and speaker output for live
  cases. The local VS Code dictation model must be installed in the EDH profile,
  except in T-11, which uses a separate profile without that model.
- Use separate disposable EDH profiles for cold-download and missing-model
  cases. Do not delete or move the user's existing VS Code model or extension
  storage to create these conditions.
- User cases use the user's Windows machine, local dictation model, and real
  microphone/speakers. U-1 additionally needs the user's configured VS Code
  proxy and a profile where recorder components are not already cached.
- Check `.jarvis/messages` and the selected Actor's `transcripts` folder in the
  disposable workspace when a case asks for a message or transcript.

## Test Results

| ID | REQ ID | AC | Owner | Description | Result |
|----|--------|----|-------|-------------|--------|
| T-1 | REQ_REC_ENABLE | AC-1..4 | QM (EDH) | Default-off setting and start-action gating | NOT RUN |
| T-2 | REQ_REC_ENABLE; REQ_REC_BUTTON | AC-5; AC-1,2,5 | QM (EDH) | Start routes, picker cancellation, and one-session guard | NOT RUN |
| T-3 | REQ_REC_BUTTON; REQ_ENG_ACTORMARK | AC-3; AC-2,4 | QM (EDH) | Actor mark while recording and removal afterward | NOT RUN |
| T-4 | REQ_REC_STATUSBAR; REQ_REC_BUTTON; REQ_REC_LIVEVIEW | AC-1..4; AC-4; AC-6 | QM (EDH) | StatusBar timer and restoring the running view | NOT RUN |
| T-5 | REQ_REC_LIVEVIEW | AC-1..3 | QM (EDH) | View placement, focus, live text, and word count | NOT RUN |
| T-6 | REQ_REC_LIVEVIEW; REQ_REC_TRANSCRIPTFILE; REQ_REC_DISPATCH | AC-4,7; AC-2,3; AC-1,2 | QM (EDH) | End, flush, completed view, and Actor message | NOT RUN |
| T-7 | REQ_REC_LIVEVIEW | AC-5,7 | QM (EDH) | Close question while running and after completion | NOT RUN |
| T-8 | REQ_REC_TRANSCRIPTFILE; REQ_REC_SPEECH | AC-1,4; AC-4 | QM (EDH) | Transcript path, append timing, and local-time marks | NOT RUN |
| T-9 | REQ_REC_SPEECH; REQ_REC_FAILURE; SPEC_REC_ENGINE | AC-8; AC-1; AC-10 | QM (EDH) | First-start progress, real SDK worker startup, and repeat start | NOT RUN |
| T-10 | SPEC_REC_COMPONENTS | AC-1 | QM (EDH) | Registry hash and non-ANSI path check | NOT RUN |
| T-11 | REQ_REC_FAILURE; REQ_REC_TRANSCRIPTFILE; REQ_REC_DISPATCH | AC-1,3,4; AC-2; AC-1,2 | QM (EDH) | Missing-model start failure leaves no artifacts | NOT RUN |
| T-12 | REQ_REC_FAILURE; REQ_REC_DISPATCH | AC-2..4; AC-1,2 | QM (EDH) | Killed recognition worker is a breakdown | NOT RUN |
| T-13 | SPEC_REC_SETTINGS | AC-2 | QM (EDH) | Legacy heartbeat job is removed on activation | NOT RUN |
| T-14 | REQ_REC_BUTTON; REQ_REC_LIVEVIEW; REQ_REC_DISPATCH; SPEC_REC_TRANSCRIPTFILE Writing | AC-6; AC-5; AC-1; queued append semantics | QM (EDH) | Shutdown/reload while running; best-effort transcript persistence | NOT RUN |
| T-15 | REQ_REC_BUTTON; REQ_REC_DISPATCH; SPEC_REC_SESSION | AC-6; AC-1; AC-4,11 | QM (EDH) | Shutdown/reload while finishing; stop waiting for recognition | NOT RUN |
| T-16 | SPEC_REC_SESSION | AC-1,13 | QM (EDH) | Shutdown while starting cancels silently | NOT RUN |
| T-17 | SPEC_MOD_REC_PKG; SPEC_REC_ENGINE | AC-6; AC-10 | QM (isolated VS Code profile) | Installed built-VSIX recording smoke test | NOT RUN |
| U-1 | REQ_REC_SPEECH; SPEC_REC_COMPONENTS | AC-8; AC-1,4 | User | First component download through the configured proxy | NOT RUN |
| U-2 | REQ_REC_SPEECH | AC-1,4,5 | User | Real microphone/speaker speech, German/English, and echo | NOT RUN |
| U-3 | REQ_REC_SPEECH; REQ_REC_FAILURE | AC-1; AC-2..4 | User | Missing and subsequently lost audio sources | NOT RUN |
| U-4 | REQ_REC_SPEECH; SPEC_REC_ENGINE | AC-4; Verify first 1 | User | One-hour session, recognition delay, and worker memory | NOT RUN |
| U-5 | REQ_REC_SPEECH; SPEC_REC_ENGINE | AC-2,3,6; AC-3,4,8 | User | Offline recognition and transcript-log privacy | NOT RUN |

## Execution Procedures

### QM: Extension Development Host

#### T-1: Default-Off Setting and Start Gating

1. In a fresh EDH profile, open Settings and find the Jarvis Recorder group and
   `jarvis.recording.enabled`.
2. Confirm the setting is Boolean and defaults to `false`. In the ACTORS view,
   confirm no start action appears on hover; in the Command Palette, confirm
   **Jarvis: Start Recording** is absent.
3. Set the setting to `true`. Confirm the hover action and
   **Jarvis: Start Recording** command become available.

**Expected:** The setting is in the Jarvis Recorder group, defaults off, and gates
starting as specified. Do not start a recording in this case.

#### T-2: Start Routes, Picker Cancellation, and Single-Session Guard

1. With recording enabled, invoke **Jarvis: Start Recording** from the Command
   Palette and press Escape in the Actor picker.
2. Confirm no transcript file, open transcript view, red Actor mark, StatusBar
   item, or Actor message is created.
3. Invoke **Jarvis: Start Recording** again, select Actor A, and confirm the
   recording starts for Actor A. While it runs, invoke the command again and
   select Actor B.
4. Confirm a warning says a recording is already running and Actor B does not
   get a second recording. Set the setting to `false` while Actor A is still
   recording; confirm the current recording and StatusBar remain active and the
   Actor hover action still offers to show the running view.
5. End Actor A's recording in the transcript view. Re-enable the setting and
   start Actor B from its hover action; confirm the transcript is created under
   Actor B, then end it.

**Expected:** Cancelling starts nothing; the palette picker targets the chosen
Actor; only one session runs; disabling the setting does not stop a running
session; both start routes work.

#### T-3: Actor Mark

1. Start a recording for Actor A and inspect the ACTORS tree without hovering
   over that row.
2. Confirm a red filled circle appears before Actor A's name, not on Actor B.
   If Actor A has an activity indicator, confirm the red mark takes its place.
3. Expand and click the marked Actor and inspect its available menus. End the
   recording and inspect the row again.

**Expected:** The mark is visible while the session runs and is removed after
completion. The Actor label, children, click behavior, and menus are unchanged;
an applicable activity indicator returns afterward.

#### T-4: StatusBar and View Restoration

1. Start a recording and confirm the StatusBar shows the red mark, target Actor
   name, and elapsed time. Observe that the time advances once per second.
2. Hide the transcript panel behind another editor tab, then click the
   StatusBar item.
3. Confirm the existing transcript panel is revealed and focused with all text
   retained; the recording continues. End the recording and confirm the
   StatusBar item disappears after completion.

**Expected:** Clicking the StatusBar restores the view and never stops the
recording. Its item exists only while the session is running or finishing; its
elapsed time stops when finishing begins.

#### T-5: Placement, Focus, and Live View

1. Open three editor groups and focus an ordinary work editor. Start recording
   for a test Actor.
2. Confirm the transcript view opens in the last existing editor column and
   focus stays in the work editor.
3. Speak a short original phrase. Confirm the view shows the correct Actor,
   elapsed time, word count, and arriving text; confirm the newest text remains
   visible without scrolling.

**Expected:** The view uses the last existing column (at least column 2),
preserves focus on automatic open, and updates its status and transcript.

#### T-6: End, Flush, and Dispatch

1. During a recording, speak a unique phrase and wait for it to appear in the
   view. Press **End recording** once.
2. While the engine flushes, confirm the control changes to a disabled
   finishing state and the StatusBar elapsed time is frozen. After completion,
   confirm the button says **Recording ended** and the final text remains open.
3. Open the transcript at the path shown by the Actor's message. Confirm the
   file is readable and contains the final phrase. Confirm exactly one queued
   message is addressed to the target Actor, says a new transcript is available,
   and contains the full path but not the transcript contents.
4. Press the ended button and close the completed view.

**Expected:** The file is complete before the Actor is notified; one message is
sent; the completed view remains open until closed; the ended button has no
effect. If finishing is too brief to observe, record that observation and do
not infer the UI state from the final state alone.

#### T-7: Closing the View

1. While a recording is running, close its transcript tab.
2. In the modal question, choose **Keep recording**. Confirm the view reopens
   with all text so far and the session continues.
3. Close the view again and choose **End recording**. Wait for the final text
   and message. Close the completed view once more.

**Expected:** The first close asks whether to end; keeping the recording
reopens the view; ending it completes normally; closing after completion asks
nothing.

#### T-8: Transcript Path, Appends, and Time Marks

1. Start a recording and note the local start time. Confirm a file appears under
   `<Actor folder>/transcripts/` with the name
   `YYYY-MM-DD_HHmmss.txt` for that start time.
2. Speak a unique phrase. Confirm it is appended to the file within 20 seconds.
3. Leave at least one full minute of silence, then speak a second unique
   phrase. Inspect the file: the first text has a local `[HH:MM]` mark on its
   own line; the second phrase is preceded by a mark for its local time; no
   mark was appended during silence.
4. End the recording and confirm the final text is in the same file.

**Expected:** One timestamp-named plain-text transcript is created for the
Actor, text is appended within the specified delay, and marks are inserted only
before text when due.

#### T-9: First-Start and Repeat-Start Progress

1. Use a disposable EDH profile with the local dictation model already
   installed and recorder component storage empty (no
   `foundry-local/2.1.0/.complete` marker). Do not clear the user's normal
   profile to create this condition.
2. Start a recording. Observe the notification progress for the one-time
   component download and its reported progress. After it completes, observe
   the separate **starting speech recognition** progress and wait for the
   recording to start.
3. End the recording. Start and end a second recording in the same profile.
   Confirm the package download does not run again, model registration does not
   fail as a duplicate, and the second transcript and Actor message are
   produced.

**Expected:** The first start shows component and engine progress in sequence;
the model registration persists for the second start; cached components are
reused without another download.

#### T-10: Published Hashes and Non-ANSI Path

1. Compare the SHA-512 values in
   `packages/recorder/resources/components.json` with the official registry
   integrity values for the pinned npm and NuGet package versions. Record each
   official source and value; do not treat a hash supplied by the download
   response as the independent source.
2. If practical, use a disposable VS Code data/profile path containing a
   character not representable in the Windows system ANSI code page. With the
   local dictation model available, download the components and start a
   recording to exercise native DLL loading from that path.

**Expected:** Every pinned digest matches official package metadata and the
worker loads successfully from the test path. The non-ANSI path check is a
low-risk verification item, not an acceptance gate; record it as `BLOCKED` if
no suitable isolated profile is available.

#### T-11: Missing-Model Start Failure

1. Use a separate disposable EDH profile with no local dictation model. Do not
   move or rename a model from another profile.
2. Enable recording and start it for a test Actor.
3. Confirm the error explains that the speech model was not found, tells the
   user how to obtain/import the local model, and says the cloud model is not
   supported. Inspect the Actor folder and UI state.

**Expected:** The start fails before component download; no transcript file,
view, red mark, StatusBar item, running context, or Actor message is left
behind.

#### T-12: Killed Worker Breakdown

1. Start a recording and speak a unique phrase. Confirm it is visible in the
   transcript before continuing.
2. In PowerShell, locate the worker process and verify its command line belongs
   to this EDH run:

   ```powershell
   Get-CimInstance Win32_Process |
       Where-Object { $_.CommandLine -match 'engineWorker\.js' } |
       Select-Object ProcessId, CommandLine
   ```

3. Kill only the verified worker PID:

   ```powershell
   Stop-Process -Id <verified-worker-PID> -Force
   ```

4. Confirm the user is notified without waiting for the end button. Inspect the
   transcript, view, StatusBar, Actor mark, and message queue. Start another
   recording for the Actor and end it normally.

**Expected:** The first session ends as a breakdown; recognized text remains
saved, indicators clear, and exactly one message points to the closed file. A
new session produces a distinct transcript and a second message.

#### T-13: Legacy Heartbeat Job Removal

1. Create a disposable workspace with a test Actor and a `.jarvis/heartbeat.yaml`
   containing this manual job plus one unrelated manual sentinel job:

   ```yaml
   jobs:
     - name: 'Jarvis: Check Transcripts'
       schedule: manual
       steps:
         - type: command
           run: jarvis.checkTranscripts
     - name: recorder-test-sentinel
       schedule: manual
       steps:
         - type: command
           run: workbench.action.output.toggleOutput
   ```

2. Open that workspace in the EDH and wait for extension activation. Reopen
   `.jarvis/heartbeat.yaml`.

**Expected:** `Jarvis: Check Transcripts` is removed; the unrelated sentinel
remains; activation succeeds. Do not use the user's real workspace for this
fixture.

#### T-14: Shutdown and Reload

1. Start a recording, speak a unique phrase, and confirm it has reached the
   transcript.
2. Use **Developer: Reload Window** while the recording is running. Confirm
   no close question appears and reload proceeds without waiting for more speech
   to be recognized.
3. After the EDH returns, locate the transcript file. Close any editor tab that
   opened it, then check that no process still holds it open and that it can be
   read:

   ```powershell
   $transcriptPath = "<path-to-transcript>"
   $stream = [System.IO.File]::Open($transcriptPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None)
   $stream.Dispose()
   Get-Content -Raw -Encoding utf8 $transcriptPath
   ```

   Record which text persisted compared with the transcript view before
   shutdown. If an Actor message is present, confirm it names this file; a
   missing message is not a failure.
4. Start another recording, speak a different phrase, and close the EDH window
   while it is running. Reopen the EDH and repeat the file check. A message may
   or may not have reached the queue.

**Expected:** Neither shutdown nor reload raises the view-close question or
hangs while waiting for recognition. The transcript file exists, is closed,
and is readable. It contains text whose writes completed before host exit; it
may lack the last text shown in the view if that text was still queued. A lost
tail or missing Actor message is not a failure. A missing, still-open, or
unreadable/corrupt transcript is a failure. Notification is attempted, but
whether it reaches the Actor is not part of this manual verdict.

#### T-15: Shutdown While Finishing

1. In the EDH, assign a temporary keyboard shortcut to
   `workbench.action.reloadWindow` before starting the recording. Start a
   recording, speak a short phrase, and wait until it appears in the transcript.
2. Press **End recording**. While the button visibly says **Finishing…**,
   immediately invoke the reload shortcut. Repeat with a fresh test Actor if
   the normal flush completes before the shortcut can be invoked.
3. After the EDH reloads, locate the transcript file and run the exclusive-open
   and read check from T-14. Record how much of the transcript-view text
   persisted. If an Actor message is present, confirm it names this file; a
   missing message is not a failure.

**Expected:** Reload raises no close question and does not hang waiting for the
recognition flush. The transcript file exists, is closed, and is readable; it
contains writes completed before host exit and may lack text still in the
write queue. A lost tail or missing Actor message is not a failure. A missing,
still-open, or unreadable/corrupt transcript is a failure. A repeated shutdown
does not start another sequence (covered by the automated regression test).
The real SDK normally flushes in under a second; if `Finishing…` cannot be
reached reliably, record `BLOCKED` for this host-level race rather than
treating T-14 or unit tests alone as a manual PASS.

#### T-16: Shutdown While Starting

1. Use an EDH profile with the local dictation model and recorder components
   already available, and a fresh test Actor with no `transcripts` folder.
2. Start a recording for that Actor. When the window progress title
   **Jarvis Recorder: starting speech recognition** appears, immediately run
   **Developer: Reload Window** before the recording starts.
3. After the EDH reloads, inspect the Actor folder and message queue. Confirm
   there is no transcript file or Actor message; before reload, confirm no
   recording-start error or close-confirmation question appeared.

**Expected:** Shutdown during `starting` cancels silently: no transcript file,
Actor message, or start-failure error is produced. No close-confirmation
question appears. This EDH case complements the deterministic startup-stage
regression tests listed below.

### QM: Installed VSIX Smoke Test

#### T-17: Run the Built VSIX in an Isolated Profile

**Preconditions:** Dev Engineer supplies core and recorder VSIX files built
from the same branch revision. Have a disposable workspace with a test Actor,
a local dictation model package for the isolated profile, and network access
for first-start components if they are not cached. The `code` CLI is
available. Do not install these artifacts over the user's normal profile.

1. In PowerShell, create isolated VS Code data and extension directories:

   ```powershell
   $testRoot = Join-Path $env:TEMP ("jarvis-recorder-vsix-" + [guid]::NewGuid().ToString("N"))
   $dataDir = Join-Path $testRoot "data"
   $extensionsDir = Join-Path $testRoot "extensions"
   New-Item -ItemType Directory -Force -Path $dataDir, $extensionsDir | Out-Null
   ```

2. Install the supplied core and recorder VSIX files into those directories:

   ```powershell
   code --user-data-dir $dataDir --extensions-dir $extensionsDir --install-extension "<core-vsix-path>" --force
   code --user-data-dir $dataDir --extensions-dir $extensionsDir --install-extension "<recorder-vsix-path>" --force
   ```

3. Launch the disposable workspace in that isolated profile:

   ```powershell
   code --user-data-dir $dataDir --extensions-dir $extensionsDir --new-window "<disposable-workspace-path>"
   ```

4. In that window, import the local dictation model if needed, enable
   `jarvis.recording.enabled`, and confirm both installed extensions are
   enabled. Start a recording for the test Actor, wait for a short original
   phrase to appear, end the recording, and inspect the transcript and queued
   Actor message.

**Expected:** The installed recorder activates against the installed core;
the worker and capture helper load from the VSIX, the real SDK starts, and a
recording produces a transcript and one Actor message. If the local model or
first-start component download cannot be prepared in the isolated profile,
record `BLOCKED`. The automated F-4 package-list test remains the authoritative
check that no stale output is packaged.

### User: Real Machine

#### U-1: First Download Through the VS Code Proxy

1. On the user's real Windows machine, use an isolated profile with the local
   dictation model present and recorder components absent. Keep the user's
   normal profile and cache untouched.
2. Use the configured VS Code proxy on a network where direct access to the
   npm/NuGet registries is unavailable, or obtain proxy access-log evidence
   that those registry requests used the proxy.
3. Start a recording and observe the component progress to completion, then
   the engine-start progress. Confirm the recording starts and the components
   are cached for the next run.

**Expected:** Downloads complete through VS Code's configured proxy, integrity
checks pass, and the recording starts. If direct and proxy routes cannot be
distinguished, record `BLOCKED` rather than claiming proxy coverage.

#### U-2: Real Speech, Both Sources, Languages, and Echo

1. With speakers open (not headphones), record in one session. Speak one
   original phrase into the microphone and play or receive a different original
   phrase through the computer speakers.
2. In the same session, alternate short German and English passages without
   changing a language setting. Note when each phrase is spoken and when it
   appears in the file/view.
3. End the recording and inspect the final transcript for microphone and
   speaker speech, both languages, and any echo or duplicated words.

**Expected:** Speech from both sources appears in the same transcript, German
and English are recognized without a language choice, and each spoken phrase
is written within 20 seconds. Record representative outcomes and let the User
judge whether the quality is acceptable; occasional misrecognitions are
allowed by the requirement.

#### U-3: Missing and Lost Audio Sources

1. If the Windows audio devices can be changed safely, disable speaker output
   while leaving the microphone available. Start a recording, speak a test
   phrase, and confirm it continues. End the session and restore the device.
2. Repeat with the microphone unavailable and speaker output available; play a
   test phrase through the speakers, confirm the recording continues, then
   restore the microphone.
3. Start with both sources available. During the session, remove one source
   and confirm a warning names it and capture continues. Remove the second
   source and confirm the breakdown notification, partial transcript, and
   Actor message.

**Expected:** A single missing/lost source is named and the other source keeps
the recording alive; losing both sources ends the session, preserves text, and
notifies the Actor. If the device/driver cannot expose these conditions safely,
record `BLOCKED` with the device limitation.

#### U-4: One-Hour Session

1. Record for one hour using the real audio path. At the start and every ten
   minutes, speak a short original phrase and note its appearance time.
2. Record the worker's Working Set at the same intervals. Identify the worker
   by its `engineWorker.js` command line:

   ```powershell
   Get-CimInstance Win32_Process |
       Where-Object { $_.CommandLine -match 'engineWorker\.js' } |
       Select-Object ProcessId, @{Name='WorkingSetMB'; Expression={[math]::Round($_.WorkingSetSize / 1MB, 1)}}
   ```

   Do not stop the session unless it breaks down.
3. At one hour, end normally and confirm the final transcript is readable.

**Expected:** The session completes without breakdown and every phrase appears
within the 20-second requirement; at one hour, the StatusBar and view display
`H:MM:SS`. Record the memory readings and any trend.
The design's phrase “memory ... must stay flat” has no numeric tolerance, so
memory measurements are characterization for the User's judgment, not a
pass/fail threshold invented by this protocol.

#### U-5: Offline Recognition and Log Privacy

1. With the model and components already cached, disconnect the machine from
   the network. Start a recording and speak a unique original phrase.
2. Confirm the phrase is recognized and written within 20 seconds while the
   machine remains offline. End the session.
3. Open the **Jarvis Recorder** output channel. Confirm periodic entries carry
   the word count, not the unique phrase. Inspect the Actor's transcript folder
   for the transcript and confirm no audio artifact was created there.

**Expected:** Recognition works offline with cached components; logs do not
contain recognized text; only the transcript is retained in the Actor's
transcripts folder. This verifies offline operation, not the separate
telemetry publication decision below.

## Publication Gate (Not a Test Result)

- **Owner:** User
- **Status:** OPEN; blocks publication

Before publication, the User must review the licence for
`Microsoft.Windows.AI.MachineLearning.dll`, the npm and NuGet terms, and the
Foundry Local telemetry/privacy statement. Confirm whether telemetry is
disabled as intended, what minimal process-information event may still be
sent, whether it can leave the machine through the proxy, and whether the
remaining licensing and telemetry terms are acceptable. Do not mark this gate
passed based only on `disableNonessentialTelemetry` and
`ORT_TELEMETRY_DISABLED` being configured.

## Testability Notes

- `REQ_REC_SPEECH AC-5` allows occasional misrecognition but defines no accuracy
  threshold. U-2 is executable as a real-speech check, but an objective
  pass/fail cannot be derived from the current wording; the User must record an
  explicit acceptability judgment. No acceptance criterion is changed here.
- The one-hour `SPEC_REC_ENGINE` verify-first item asks that memory stay flat
  without specifying a tolerance. U-4 records measurements and can judge the
  20-second delay against `REQ_REC_SPEECH AC-4`, but cannot apply an objective
  memory pass/fail threshold. This remains open for the User/Change Manager.
- The unsupported-platform branch is covered by the automated session test;
  it is not a manual EDH case because the recorder is Windows-only.

## Acceptance Criteria Mapping

| Requirement | Manual cases |
|-------------|--------------|
| REQ_REC_ENABLE | T-1, T-2 |
| REQ_REC_BUTTON | T-2, T-3, T-4, T-14, T-15 |
| REQ_REC_STATUSBAR | T-4 |
| REQ_REC_DISPATCH | T-6, T-12, T-14, T-15 |
| REQ_REC_TRANSCRIPTFILE | T-6, T-8, T-11 |
| REQ_REC_SPEECH | T-8, T-9, T-10, U-1, U-2, U-3, U-4, U-5 |
| REQ_REC_FAILURE | T-9, T-11, T-12, U-3 |
| REQ_REC_LIVEVIEW | T-4, T-5, T-6, T-7, T-14 |
| REQ_ENG_ACTORMARK | T-3 |

## QM Round 1 and Round 2 AC Coverage

| Design AC | Automated evidence | Manual evidence |
|------------|--------------------|-----------------|
| SPEC_REC_SESSION AC-1 (state-driven `end`) | `src/tests/recorder-session.test.ts`, QM F-1 state and duplicate-end tests | T-14, T-15, T-16 (QM, EDH) |
| REQ_REC_BUTTON AC-6 (shutdown stops waiting; transcript persistence is best effort; notification not guaranteed) | `src/tests/recorder-session.test.ts`:<br>`AC-14: shutdown from running does not wait: finish() is never called, engine disposed, file closed with the text so far, message attempted`<br>`AC-11: shutdown from finishing with an unresolved finish() leaves the wait once: closed, one message attempted, no 20 s timer` | T-14 (running), T-15 (finishing), QM (EDH); message absence and lost queued tail are not failures |
| REQ_REC_DISPATCH AC-1 (shutdown notification only attempted) | `src/tests/recorder-session.test.ts`:<br>`AC-14: shutdown from running does not wait: finish() is never called, engine disposed, file closed with the text so far, message attempted`<br>`AC-14: the message is only attempted: a failing send is logged and the session is still idle` | T-14, T-15 (QM, EDH); inspect queue only as an observation |
| SPEC_REC_SESSION AC-4 (shutdown end sequence, file close before dispatch attempt) | `src/tests/recorder-session.test.ts`:<br>`AC-14: shutdown from running does not wait: finish() is never called, engine disposed, file closed with the text so far, message attempted`<br>`AC-11: shutdown from finishing with an unresolved finish() leaves the wait once: closed, one message attempted, no 20 s timer`<br>`AC-14: the message is only attempted: a failing send is logged and the session is still idle` | T-14, T-15 (QM, EDH); do not require a delivered message |
| SPEC_REC_SESSION AC-11 (join finishing sequence; shutdown ends wait at once; repeated shutdown is idempotent) | `src/tests/recorder-session.test.ts`:<br>`AC-11: shutdown from finishing with an unresolved finish() leaves the wait once: closed, one message attempted, no 20 s timer`<br>`F-5 regression: two shutdowns in a row change nothing (no deadline to extend, one close, one message)`<br>`a shutdown during the normal end that already waits at the close step does not repeat anything` | T-15 (QM, EDH); the repeat-call guarantee is verified by automation |
| SPEC_REC_SESSION AC-12 (failure during start cancels and cleans up) | `src/tests/recorder-session.test.ts`, QM F-2 startup failure, late-start cleanup, and retry tests | T-11 checks the real missing-model start-failure notice; timing races are deterministic automated checks |
| SPEC_REC_SESSION AC-13 (shutdown during start cancels silently) | `src/tests/recorder-session.test.ts`, QM F-1 engine, capture, and component-preparation shutdown tests | T-16 (QM, EDH) |
| SPEC_REC_SESSION AC-14 (shutdown while running skips recognition wait) | `src/tests/recorder-session.test.ts`:<br>`AC-14: shutdown from running does not wait: finish() is never called, engine disposed, file closed with the text so far, message attempted`<br>`AC-14: the message is only attempted: a failing send is logged and the session is still idle` | T-14 (QM, EDH) |
| SPEC_REC_CAPTURE AC-5 (helper never reports `ready`) | `src/tests/recorder-io.test.ts`, QM F-2 / AC-5 15-second timeout and kill test | Deterministically covered by automation; no separate manual timeout case |
| SPEC_REC_ENGINE AC-5 (`dispose()` resolves pending `finish()` without failure) | `src/tests/recorder-io.test.ts`: `SPEC_REC_ENGINE AC-5 / D-56: dispose() is an expected end (no failure) and resolves a pending finish()` | T-14, T-15 (QM, EDH) exercise disposal through shutdown |
| SPEC_REC_ENGINE AC-10 (native dynamic import in each emitted build) | `src/tests/recorder-build.test.ts`, QM F-3 plain `tsc` and bundle workers load an ESM-only fixture and reach `ready` | T-9 (QM, EDH) exercises the real SDK in the compiled worker; T-17 (QM, isolated profile) exercises it from the installed VSIX |
| SPEC_REC_ENGINE AC-11 (late subscriber sees worker failure) | `src/tests/recorder-session.test.ts`, QM F-2 late `engine.failure` check after await | Deterministically covered by automation; T-11 covers the separate user-facing missing-model path |
| SPEC_MOD_REC_PKG AC-6 (package content and stale-output exclusion) | `src/tests/recorder-build.test.ts`, QM F-4 `vsce ls`, source correspondence, and stale-output cleanup tests | T-17 (QM, isolated profile) is an installed-artifact smoke check, not the package-list gate |

## Sign-off

- [ ] QM Development Host cases executed and results recorded
- [ ] User real-machine cases executed and results recorded
- [ ] Testability notes resolved or accepted by the Change Manager/User
- [ ] Publication gate resolved by the User