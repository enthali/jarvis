# Change Document: recorder-redesign

**Status**: in-progress
**Branch**: feature/recorder-redesign
**Created**: 2026-09-30
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Rework the Jarvis Recorder to use a similar methodology to VS Code's
built-in voice input, replacing the current Docker/Whisper + Python
`recorder.py` + file-polling + sidecar-JSON stack. Research on VS
Code's internal dictation architecture is available as input (see
Research actor's `recorder-redesign-2026-09.md`), but the solution
design is for the System Designer to work out with the user — the CD
does not prescribe it. Acceptance criteria: (1) recording can be started
and stopped from the Actor tree; (2) transcript is dispatched to the target
Actor's session

**Design-phase exception**: Level 0/1/2 (System Designer) runs
**user-guided** — the user wants to work through the specs in detail
together before they're finalized. Every other step in this change runs
autonomous.

---

## Level 0: User Stories

**Status**: ✅ completed (user approved; MECE advisory findings addressed)

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REC_CAPTURE | Record a Meeting for an Actor | modified | Start from the Actor tree (hover action) or by command with Actor pick; red circle at the Actor and in the StatusBar; both bring the transcript view back; no stop here. Round 2: AC-5 (VS Code closed or reloaded) says the recording ends at once and the Actor may not be notified |
| US_REC_ENABLE | Enable / Disable Recording Feature | modified | Recording buttons on Actor nodes instead of Project/Event nodes |
| US_REC_CONFIG | Configure Whisper Project Path | removed | Prescribes the retired solution (Whisper) and the setting for it; no user-level need remains |
| US_REC_DISPATCH | Auto-Dispatch Transcripts to Session | modified | Actor is told when its transcript is complete; message only after completion |

### New User Stories

| ID | Title | Notes |
|----|-------|-------|
| US_REC_TRANSCRIPT | Meeting Transcript Right After the Meeting | What the user gets: a transcript file in the Actor's folder, available within 20 seconds of the speech, no audio kept, German/English without language choice, immediate warning when transcription fails, a local-time mark about every minute |
| US_REC_LIVEVIEW | Watch the Transcript While the Meeting Runs | The transcript view opens automatically in the Secondary editor column (`US_MSG_EDITORPLACEMENT`), shows the text as it grows plus Actor, elapsed time and word count, and has a Stop action; closing it asks whether to end the recording |

### Decisions

- D-1 (user): US_REC_CONFIG is removed. It prescribes the retired solution (Whisper); the user-level wants live in the other stories.
- D-2 (user): No audio is stored; only the transcript remains. A failure mid-meeting therefore cannot be re-transcribed.
- D-3 (user): Transcripts are not put under version control by Jarvis; no `.gitignore` handling is specified. Dropped to avoid the complexity.
- D-4 (user): The user stories name only that the transcript lies in the Actor's folder; its exact location and naming are decided at design level.
- D-5 (user): The Actor's message is tied to transcript completion, not to closing the live view: closing is a gesture with many meanings, so the message would arrive at an arbitrary time or never. Editing a transcript after the recording is ordinary file editing; the user tells the Actor to re-read.
- D-6 (user): Closing the live view during a recording asks whether to end it; answering no brings the view back. A reveal path still exists through D-7, and the view can also vanish through a window reload (open, see L1).
- D-7 (user): Clicking the StatusBar item or the hover action at the Actor during a recording brings the view back instead of ending the recording. Reason: an accidental click would end the meeting for good, since no audio exists to continue from. The recording is ended only in the view; closing the view with "yes" in the question is the fallback if the view itself misbehaves. No separate stop command.
- D-8 (user): The recording covers both the microphone and the computer's speaker output (the other participants of an online meeting). The old recorder wrote them as two channels only because of the PowerShell recording function; separate channels are not a requirement.
- D-9 (user): Speech recognition runs on the user's computer. No cloud, and no internal network service either, because a local model is wanted.
- D-10 (user): The StatusBar item shows the Actor name, as it does today.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed (approved by the user 2026-10-02; MECE advisory applied)

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_REC_ENABLE | US_REC_ENABLE | modified | No start action on Actor nodes and no recording command in the Command Palette when off |
| REQ_REC_CONFIG | US_REC_CONFIG | removed | Its story is removed |
| REQ_REC_BUTTON | US_REC_CAPTURE; US_REC_ENABLE | modified | Start action on hover at the Actor, command with Actor pick, red circle before the name, hover action brings the view back; stop action removed. Round 2: AC-6 shutdown ends at once, text kept, notification attempted |
| REQ_REC_STATUSBAR | US_REC_CAPTURE | modified | Red circle, Actor name, elapsed time; click brings the view back instead of stopping |
| REQ_REC_SUBPROCESS | US_REC_CAPTURE | removed | Described the `recorder.py` process, Python check, `.stop` and `.recording.json` |
| REQ_REC_DISPATCH | US_REC_DISPATCH | modified | Message to the Actor when the transcript is complete; polling and sidecar gone. Round 2: AC-1 at shutdown the message is only attempted |
| REQ_REC_SIDECAR | US_REC_DISPATCH | removed | The target Actor is no longer passed on through a file |
| REQ_REC_WATCHERJOB | US_REC_DISPATCH | removed | No polling job |

### New Requirements

| ID | Title | Links | Notes |
|----|-------|-------|-------|
| REQ_REC_TRANSCRIPTFILE | Transcript File | US_REC_TRANSCRIPT | File in the Actor's folder, created at start, appended while recording, complete after the end; exact path and naming left to L2 |
| REQ_REC_SPEECH | Local Speech Recognition | US_REC_TRANSCRIPT | Microphone and speaker output, on the user's computer, no audio persisted, 20 s delay, German/English without choice |
| REQ_REC_FAILURE | Transcription Failure Notice | US_REC_TRANSCRIPT | Immediate notice if recognition cannot start or breaks down |
| REQ_REC_LIVEVIEW | Transcript View | US_REC_LIVEVIEW; US_REC_CAPTURE; REQ_MSG_EDITORPLACEMENT | Secondary placement, end button, Actor, elapsed time, word count, text, close question |
| REQ_ENG_ACTORMARK | Actor Node Mark API | US_REC_CAPTURE; REQ_ACTOR_TREE; REQ_ACTOR_ACTIVITY; REQ_ENG_CONTRACT | Core API member `markActor` so that an add-on can put the red circle on an Actor node (D-29); lives in `req_eng.rst` |

### Conflicts Detected

_(none found so far)_

### Decisions

- D-11 (user, KISS): When the feature is off, the start action and the recording commands are not offered (`REQ_REC_ENABLE` AC-3). This is declarative (`when` clauses in the manifest), so it costs no handler code; showing the command and refusing would. The switch gates only the start: a running recording and its StatusBar item are not touched by it.
- D-12 (user): `REQ_REC_LIVEVIEW` takes over the Secondary rule of `REQ_MSG_EDITORPLACEMENT` AC-3 in its sense (last existing column), not literally. That requirement is scoped to chat and Actor-file tabs and its AC-8 limits placement logic to those; it is not changed here, widening its scope is backlog item 44 (PM). When only two editor groups are open, Secondary and Docs are the same column, which is wanted.
- D-13 (user, KISS): Logging of the transcript is limited to the word count at intervals, not the text. This removes the conflict between logging and the privacy wish (`US_REC_TRANSCRIPT` AC-4). The interval is set at L2.
- D-14 (user, KISS): An end is an end. A breakdown of recognition ends the recording like the end button, the partial transcript stays, the Actor gets the usual message. If the meeting goes on, the user starts a new recording and the Actor gets a second message.
- D-15 (SD, follows D-14): Closing or reloading VS Code ends a running recording like the end button, as the old `REQ_REC_SUBPROCESS` AC-5 did. Closing only the view is covered by D-6.
- D-16 (user): Both audio sources are opened. If only one can be captured (the speaker output may not be available on every platform, so on Linux or macOS the microphone alone may be all there is), the user gets a warning naming the missing source and the recording starts or continues with the other; otherwise nothing would ever start there. If neither can be captured, the existing failure notice applies and nothing starts. The user can end the recording if the warning is a problem. "Like VS Code" refers to the recognition engine only, not to the audio sources. Which platforms can capture the speaker output is a Research question for L2.
- D-17 (SD, follows D-14): A recording counts as running until its transcript is complete, up to 20 s after the end button. Red circle and StatusBar stay meanwhile, a second start is refused, the view stays open with the final text, the end button then does nothing, and closing the view asks nothing.
- D-18 (SD): At VS Code shutdown the extension writes what it recognised in the time VS Code gives and notifies the Actor; the transcript may be incomplete, so the 20 s promises do not apply there. Closing the view in the shutdown does not raise the question. Superseded in part by D-56: no time is given to recognition, and the notification is only attempted.
- D-19 (SD, follows D-14): Losing both audio sources, or being unable to write the transcript file, is a breakdown. A start that fails leaves no file; an empty file after an immediate breakdown is accepted. A file is never overwritten, also not after a quick restart.
- D-20 (SD): D-13 is a constraint, so it is an AC: the log never carries recognised text (`REQ_REC_SPEECH` AC-6).
- D-21 (SD): While a recording runs, the red circle takes the place of the activity indicator (`REQ_ACTOR_ACTIVITY` AC-7); afterwards the activity indicator applies again. `REQ_ACTOR_ACTIVITY` is not changed, the precedence is stated in `REQ_REC_BUTTON` AC-3.
- D-22 (accepted): Whether the Actor starts on the message at once depends on its delivery setting; the user regards that as transport-layer business, not part of this CR. Sender name and the behaviour for duplicate Actor names are left to L2 and the existing messaging rules.
- D-23 (user): The recorder works on Windows only. The recorder README says so and recommends PowerShell 7 or newer; PowerShell 5.1 is not verified. On other platforms a recording does not start and the notice names the platform (`REQ_REC_SPEECH` AC-7).
- D-24 (user): The speech model is taken from the cache of VS Code's own dictation (Research: works offline, no download of our own). Fragile dependency on VS Code internals, accepted for the first version. Limitation for the README: it does not work when the user has chosen a cloud model for dictation instead of the local one, or has never obtained the local model. Our own model download is not part of this CR. The notice for a missing model says how to get it (design level).
- D-25 (user): The recognition engine runs in a child process, not in the extension host (isolation, memory, crash detection by process exit). The design keeps the engine behind an interface, so running it in the host stays a fallback.
- D-26 (user, KISS): A breakdown is detected from errors of the engine and the end of its process only; there is no watchdog for a silent stall. The word count in the view shows a stall.
- D-27 (user): No separate Research spikes. The assumptions not yet proven become a "verify first" list in the design, worked through in the first implementation step; if one fails the design comes back to the System Designer. German/English quality with real speech is tested by the user once the solution is complete.
- D-28 (open, user): Superseded in part by D-32. The Foundry Local `LICENSE` (read 2026-10-01) has two parts: the SDK is MIT, the CLI is under the Microsoft Software License Terms; models carry their own licences. Still to check by the user or Research: the licences of the native components that the extension will download (core inside the npm package, ONNX Runtime, ONNX Runtime GenAI; believed MIT, not read) and that nothing forbids downloading them at run time.
- D-31 (open, user): The Foundry Local README says it may collect usage data and send it to Microsoft. Audio does not leave the machine, but this telemetry is separate from `US_REC_TRANSCRIPT` AC-4. Whether it can be switched off, and whether that matters for the user, is to be checked against the privacy statement.
- D-32 (user): The extension uses the current Foundry Local SDK (2.1.0 at the time of writing) from the official channel, not VS Code's CDN tarball and not VS Code's older SDK version. The extension itself fetches what is needed (npm package and the official native components) at run time, where VS Code's proxy handling applies; the failed `npm install` was an install-time proxy problem outside VS Code. The model is still taken from the cache of VS Code's dictation (D-24), registered through the local catalog (the bring-your-own-model feature of 2.1.0), so no model download of ours and no catalog call over the network. Research verifies this chain (see the "verify first" list at L2).
- D-29 (user): The core API is extended so that an add-on can mark an Actor in the ACTORS tree with an icon (for the red circle).
- D-30 (user): The transcript file is `<Actor folder>/transcripts/YYYY-MM-DD_HHmmss.txt`.
- Open for the user: none at L1. Remaining at L2: which platforms can capture the speaker output (Research).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed (approved by the user 2026-10-02; MECE advisory applied)

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REC_SETTINGS | REQ_REC_ENABLE | modified | One setting; `whisperPath` gone; the persistent legacy heartbeat job is unregistered on activation |
| SPEC_REC_BUTTON | REQ_REC_BUTTON; REQ_REC_ENABLE; REQ_ENG_ACTORMARK | modified | `startRecording` and `showRecording` on `jarvisActor` nodes, no stop command, context key `jarvis.recordingRunning`, red circle through `markActor` |
| SPEC_REC_STATUSBAR | REQ_REC_STATUSBAR | modified | Red circle, Actor, elapsed time, click shows the view; one `formatElapsed` |
| SPEC_REC_SUBPROCESS | REQ_REC_SUBPROCESS; REQ_REC_CONFIG | removed | Replaced by `SPEC_REC_SESSION` and the capture and engine specs |
| SPEC_REC_SIDECAR | REQ_REC_SIDECAR | removed | No sidecar |
| SPEC_REC_WATCHER | REQ_REC_DISPATCH; REQ_REC_SIDECAR | removed | Replaced by `SPEC_REC_DISPATCH` |
| SPEC_REC_WATCHERJOB | REQ_REC_WATCHERJOB | removed | No polling job |
| SPEC_ENG_API | REQ_ENG_CONTRACT | modified | `markActor` on the interface, AC-10 |
| SPEC_ACTOR_TREE | REQ_ACTOR_TREE | modified | Icon mark has precedence over the activity indicator |
| SPEC_ACTOR_ACTIVITY | REQ_ACTOR_ACTIVITY | modified | AC-4 names the mark as the one other influence on the icon |
| SPEC_MOD_REC_PKG | REQ_MOD_ADDONS | modified | Description, uses the core only through the API; AC-5 components not in the VSIX |

### New Design Elements

| ID | Title | Links | Notes |
|----|-------|-------|-------|
| SPEC_REC_SESSION | Recording Session | REQ_REC_BUTTON; REQ_REC_ENABLE; REQ_REC_FAILURE; REQ_REC_LIVEVIEW; REQ_REC_SPEECH; REQ_REC_DISPATCH | States, start and end sequences, breakdown, shutdown, word count, log |
| SPEC_REC_CAPTURE | Audio Capture Helper | REQ_REC_SPEECH; REQ_REC_FAILURE | PowerShell and C# helper, stream and event contract |
| SPEC_REC_ENGINE | Recognition Engine in a Child Process | REQ_REC_SPEECH; REQ_REC_FAILURE | Interface, worker, IPC, failure; Round 2: `dispose()` is no failure and resolves a pending `finish()` |
| SPEC_REC_COMPONENTS | Speech Components | REQ_REC_SPEECH; REQ_REC_FAILURE | Pinned manifest, integrity, extraction guard, model location |
| SPEC_REC_TRANSCRIPTFILE | Transcript File | REQ_REC_TRANSCRIPTFILE | Path, no overwrite, writing |
| SPEC_REC_LIVEVIEW | Transcript View | REQ_REC_LIVEVIEW; REQ_REC_BUTTON; REQ_REC_STATUSBAR | Webview, placement, messages, close question |
| SPEC_REC_DISPATCH | Transcript Dispatch | REQ_REC_DISPATCH | One message through `sendMessage` |
| SPEC_ENG_ACTORMARK | Actor Node Mark API | REQ_ENG_ACTORMARK | Marks held by `ActorTreeProvider` |

### Conflicts Detected

- C-1: `SPEC_ACTOR_ACTIVITY` AC-4 said no decorator API exists and the provider alone sets the icon. `markActor` is not a decorator (no callback into the add-on), and the AC now names the mark as the one other influence. Resolved in this CR.
- C-2: `SPEC_MOD_REC_PKG` said the recorder depends on no tree node of the core. It now uses the `jarvisActor` context value and `markActor`. Resolved in this CR.

### Decisions

- D-33 (SD): The core API gets one new member, `markActor`. The Secondary column rule is computed in the recorder instead of being exported (no second API member; D-12 asks for the rule in its sense). If the rule changes in the core, the recorder line follows.
- D-34 (SD): The helper mixes the two sources to one 16 kHz mono stream and fills silence, because Research found that the loopback delivers nothing during silence and that the engine takes one stream per model. The parent relays the stream to the worker over IPC.
- D-35 (SD): The file and the view get the text deltas; `final` only ends the flush. Whether `final` differs from the joined deltas is a verify-first item.
- D-36 (SD): Components come from a pinned manifest with SHA-512, over https from allowed hosts only, with an extraction guard against paths outside the target (supply chain, zip slip).
- D-37 (SD): The view is a webview with a short inline script; the host ticks the clock so that `formatElapsed` is the only formatter; text enters through `textContent`; the close question is modal.
- D-38 (SD): The persistent legacy heartbeat job `Jarvis: Check Transcripts` is unregistered on activation; otherwise upgraded installations would call a removed command every scan interval.
- D-39 (SD, correction): The title of the hover action is static, so it cannot name the Actor being recorded; I told the user earlier that a tooltip would. The red circle shows it.
- D-40 (user): The first-start download happens when the first recording is started, with progress.
- D-41 (SD, Research addendum): All measurements behind the 20-second promises (latency 0.2 to 0.9 s, flush about 0.5 s, deltas plus one final at stop, one live session per model, host stalls) come from SDK 1.2.3. On 2.1.0 only model loading and file streaming were run; the live path is not checked. In 2.1.0 `createLiveTranscriptionSession()` is deprecated (removal announced for the end of 2026) and `AudioSession` with `ItemQueue` is the successor. The API choice is superseded by D-46. If the live path on 2.1.0 does not behave as measured, the fallback is pinning 1.2.3.
- D-42 (SD): Telemetry of the SDK is switched off with `disableNonessentialTelemetry: true` and `ORT_TELEMETRY_DISABLED=1` (Research: on by default, no prompts, outputs or audio content per the documentation; a minimal process-info event may still be sent). The user cares about privacy and this is easy to reverse. Whether events get through the proxy is not checked.
- D-43 (SD): Components from the official channel, as Research listed them: npm `foundry-local-sdk@2.1.0` and the NuGet packages for ONNX Runtime 1.30.0 and ONNX Runtime GenAI 0.17.1; about 216 MB once for about 38 MB on disk, because whole packages are fetched. Licences read by Research: SDK and core DLL MIT, ONNX Runtime and GenAI MIT. Open: the licence of `Microsoft.Windows.AI.MachineLearning.dll` (inside the npm tarball, `license.txt` not read) and the terms of npm and NuGet. The model's licence differs between the Foundry catalog (MIT) and NVIDIA's card (openmdw-1.1); it matters only for redistribution, not for use from VS Code's cache.
- D-44 (SD): The SDK's `modelCacheDir` is our own folder in the extension's storage, while the registered model path points into VS Code's dictation cache; the model is loaded in place. So the extension writes nothing into VS Code's cache.
- D-45 (SD, from the L2 advisory): (Superseded by D-56: no flush at shutdown.) File close and message follow at once, because the message needs the closed file. Whether VS Code leaves time for that is a verify-first item (7).\n- D-46 (user, SD wording): The target for the live session is `AudioSession` with `ItemQueue`, not the deprecated `createLiveTranscriptionSession()`, so that a later SDK change does not force a rework. The deprecated call stays the fallback because only it was measured. The removal announced for the end of 2026 does not reach a pinned version; it matters at the next version change. Only the worker contains the choice. The Dev Engineer checks `AudioSession` first and updates the spec if it falls back. The call pattern in the spec is read from the SDK's README and its own tests (a Nemotron streaming PCM test with `ItemQueue`), not run by us; the open points are whether a `speechSegment` is an interim delta or a finished segment, and the option value for automatic language. Both points were settled by D-47.\n- D-47 (SD, Research 2026-10-02): With SDK 2.1.0 in a child process of the extension host (`ELECTRON_RUN_AS_NODE`), the model read in place from VS Code's cache, a 35-second WAV in real time: both live APIs work. `AudioSession`: 133 `speechSegment` items, all of kind `none` (text deltas), text 4 to 263 ms behind the audio, end 0.3 to 0.4 s; `language: 'auto'` accepted. New in 2.1.0: language tags such as `<de-DE>` appear as delta events of their own after pauses; the user decided to leave them in the text, the Actor may use or ignore them (`SPEC_REC_ENGINE` AC-9). The child holds about 770 MB. The component assembly from npm and NuGet works in the extension host (226 MB in 30 s). Sizes in the spec are now decimal MB (Research's earlier figures were MiB), and `package.json` is part of the extraction list.\n- D-48 (SD, Research 2026-10-02): Model source. SDK 2.1.0 cannot reach the Foundry catalog on this machine (0 models, transport failure after a few milliseconds, with the local Px proxy and with the company proxy, also after the WinHTTP system proxy was set; cause unknown), so the model comes from VS Code's cache (D-24). SDK 1.2.3 loads the model itself in the extension host (catalog 48 models, 793 MB in 54 to 68 s, bit-identical to VS Code's copy), and its official files are byte-identical to VS Code's runtime (no special build). The 407 of 2026-09-30 was not a fixed property of the company proxy. Against 1.2.3: its core `Microsoft.AI.Foundry.Local.Core` is not MIT but under Microsoft Software License Terms (use \"to develop and test\", distribution only as Distributable Code, no sharing otherwise), it has no way to switch telemetry off, and its file API fails with this model (irrelevant for the live session). Decided by the user on 2026-10-02: SDK 2.1.0 with the model from VS Code's cache (D-24 stays); SDK 1.2.3 with the SDK's own model download is not taken (core licence, no telemetry switch).\n- D-49 (SD): Because the catalog failure is a property of the 2.1.0 version, not of the network, it can be reported to the Foundry Local project; an own model download in Node is unchecked (source and protocol of the model package are unknown).\n- D-50 (user): Language tags and other engine output stay in the text unchanged (the Actor may use or ignore them). The extension adds its own time marks, because the engine gives no time stamps: `[HH:MM]` in local time (not UTC; nobody thinks in UTC in meetings), on a line of its own, before the first text and before the first text after each full minute since the previous mark; none during silence; a mark may fall inside a sentence (the LLM copes). Added as `US_REC_TRANSCRIPT` AC-8, `REQ_REC_TRANSCRIPTFILE` AC-4 and `SPEC_REC_TRANSCRIPTFILE` AC-5.
- D-51 (SD, reconciliation with the implementation, 2026-10-02; none of it is a design change): The specs were corrected where they were wrong or incomplete: `SPEC_REC_ENGINE` said the worker loads the SDK with `require`, but `foundry-local-sdk` 2.1.0 is ESM-only, so the worker uses a dynamic `import()` of `file://<sdkDir>/dist/index.js`; `SPEC_REC_COMPONENTS` now checks the model before any download (a missing model fails the start before 226 MB are fetched) and no longer prescribes a library for extraction (own minimal readers are fine, Zip64 is not needed, the zip-slip guard stays mandatory); the worker derives the model cache folder as `<dirname(sdkDir)>/cache`, which is the path the spec already named; an error from the legacy job cleanup is logged and does not stop the activation; the memory figure of the child is about 1 GB (0.8 GB resident set in Research's run, 1.06 GB working set in a 75-second run). Accepted without a spec change: the tiny own event type and the ports interface for editor access (testability, same behaviour).
- D-52 (SD): Acceptance-relevant open items. For QM in the Development Host: hover action and red circle (core `markActor`), StatusBar click, view placement and focus, end button states, close question and reopen, first-start download progress and the engine start progress, the message to the Actor, time marks and file name, no file after a failed start, the model-missing message, a killed child as a breakdown, the legacy job removal, and the shutdown and reload behaviour (verify-first 7). For the user: the one-hour run (1), the component download through VS Code's proxy on the real machine (2), German/English quality and echo (10), and the licence and telemetry question (9; blocks publication, not testing). Not acceptance-relevant: Insiders and portable model folder (8), the non-ANSI path (2, low).
- D-53 (SD, QM round 1, F-3 and F-4): The specs now state what the build must guarantee. `SPEC_REC_ENGINE` AC-10: the emitted worker keeps a native dynamic `import()` in every supported build path (a plain compile as well as the bundle), and a test starts the emitted file and checks that it loads an ESM package and reaches `ready`; the contract was missing, so a plain `tsc` run turned `import()` into `require` and the worker could not start. `SPEC_MOD_REC_PKG` AC-6: the package holds only what the recorder needs now, the output folder is cleaned before a build, the packaging tool's file list is checked before a release, and inclusion does not depend on Git tracking (the retired `out/recording.js` was in the list although untracked).
- D-54 (user, QM round 1, F-1): End and shutdown overlap. `end` acts by state: `idle` nothing; `starting` only shutdown acts and cancels the start silently (no error, no file, no message); `running` starts the sequence; `finishing` starts no second sequence and returns the one in progress, and a shutdown then shortens its remaining wait to the 2-second shutdown budget. `deactivate()` awaits the completion (file closed, message sent). The user chose shortening over waiting the full 20 seconds, because VS Code is likely to cut the host earlier. `SPEC_REC_SESSION` AC-1, AC-11, AC-13.
- D-56 (user, QM round 2, F-5): Close means exit. On VS Code close or reload nothing waits for recognition any more. `starting`: cancelled silently (D-54 unchanged). `running`: the end sequence runs without the wait of step 3, the engine is disposed, the file is closed with the text received so far, the message is attempted. `finishing`: the remaining wait ends at once, then the same; a repeated shutdown changes nothing, because the wait is left once and there is no clock to move. The 2-second budget (`SHUTDOWN_TIMEOUT_MS`), the deadline arithmetic and the shortening of D-45 and D-54 are gone; F-5 therefore has no counterpart left in the text. Accepted by the user: the last words may be missing and the Actor may not be notified if the host ends before the dispatch. `deactivate()` still awaits the local steps (file close, message), without a timer. L0 `US_REC_CAPTURE` AC-5 now says so (the user asked for it), `REQ_REC_BUTTON` AC-6, `REQ_REC_DISPATCH` AC-1, `SPEC_REC_SESSION` (`end` by state, step 3, Shutdown, AC-4, AC-11, new AC-14, verify first), `SPEC_REC_ENGINE` (`dispose()`, AC-5). The normal end by the user keeps `FINISH_TIMEOUT_MS = 20000`. Supersedes D-45, the shortening in D-54 and the shutdown clause of D-18.
- D-58 (user, backlog 49): The settings group of the recorder is titled "Jarvis Recorder" instead of "Recording", like the other add-ons ("Jarvis Kanban", "Jarvis MCP", "Jarvis Syspilot"). `REQ_CFG_GROUPS` already lists the recorder group as "Jarvis Recorder", so `REQ_REC_ENABLE` (Description, AC-2) and `SPEC_REC_SETTINGS` (Description, manifest example, AC-1) disagreed with it; they now follow it, and `REQ_CFG_GROUPS` is unchanged. Wording only: the setting key `jarvis.recording.enabled`, its default and description are unchanged; the command titles follow in D-59. L0 names no group title (`US_REC_ENABLE` AC-1 speaks of the setting only), the recorder README names none, and `SPEC_CFG_*` bare titles concern the core groups. Dev: manifest title in `packages/recorder/package.json` and the group-title assertion in `src/tests/recorder-io.test.ts` (`groups[0].title`, currently `'Recording'`). Test Designer: `docs/changes/tst-recorder-redesign.md` T-1 steps and expected result say "Recording group".
- D-59 (user, backlog 49, "ja wäre gut" 2026-10-03): The two command titles get the "Jarvis:" prefix, like the commands of the other packages ("Jarvis: Open Message Flow", "Jarvis: Open Kanban Board"): "Jarvis: Start Recording" and "Jarvis: Show Running Recording" (`SPEC_REC_BUTTON`, contribution block). No story or requirement names these titles (`REQ_REC_BUTTON` is titled "Start Recording and Recording Indicator at the Actor", which is the requirement's name, not a command title); the command IDs, icons and `when` clauses are unchanged. Dev: the two titles in `packages/recorder/package.json` and the mentions of **Start Recording** in `packages/recorder/README.md` (lines 10 and 20: the Command Palette now shows "Jarvis: Start Recording"); no automated check asserts the titles (`src/tests/recorder-io.test.ts` checks command IDs and `when` clauses only). Test Designer: `docs/changes/tst-recorder-redesign.md` T-1 and T-2 (lines 80, 81, 89, 94) say **Start Recording** for the palette entry and need "Jarvis: Start Recording".
- D-55 (user, QM round 1, F-2): Failures during the start. The session subscribes to the failure events of each component when it creates it, before awaiting its start; the engine also keeps its `failure` for a check after an await. The first failure while `starting` cancels the start: components stopped, a created file discarded, "Recording not started: <reason>" shown, state `idle`; a component that finishes starting after the cancellation is stopped at once. The capture helper gets a start timeout of 15 seconds (`CAPTURE_READY_TIMEOUT_MS`; measured start-up 1.2 to 3.3 s), the engine already has 60 seconds. This closes the gap between the start steps; there is still no watchdog while `running` (D-26). `SPEC_REC_SESSION` AC-12, `SPEC_REC_CAPTURE` AC-5, `SPEC_REC_ENGINE` AC-11.
- The log interval is 10 seconds (D-13); the elapsed-time format is `MM:SS`, and `H:MM:SS` from one hour.
- For L2 (from the L1 advisory): the transcript view is not excluded from the Secondary group count and may be hidden behind a delivered chat; the StatusBar item and the hover action bring it back. `REQ_MSG_FOCUSRESTORE` is to be checked with the first implementation.

### Verify first (Dev Engineer, first implementation step; if one fails, back to the System Designer)

1. **Partly closed.** Live path with the real source: the Dev Engineer ran 75 seconds with the capture helper and the live session (first text after 4.2 s, 198 words). Open: the one-hour run, memory of the child and delay must stay flat (owner: user; QM if time allows) (`SPEC_REC_ENGINE`, D-47).
2. **Open (QM in the Development Host, user).** Components: the assembly from npm and NuGet through the proxy was proven by Research in the extension host; the Dev Engineer's download through VS Code's proxy path is not verified in the Development Host. Also open: the DLL search with non-ANSI characters in the path, and the registry integrity value against the pinned hash (`SPEC_REC_COMPONENTS`).
3. **Closed (Dev Engineer).** Child process: a killed child shows as an immediate single failure; started with `ELECTRON_RUN_AS_NODE` and `process.execPath`, host stalls at most 0.09 s.
4. **Open, low risk (QM).** Registering the model of VS Code's cache with the local catalog was run on 2.1.0 without network; verify it again with the final flow, including a second start (registration persists, `getModelVariant` first).
5. **Closed (Dev Engineer).** The capture helper works under `pwsh` and Windows PowerShell 5.1; startup 1.2 to 3.3 s, a full session start about 7 s (`SPEC_REC_CAPTURE`).
6. **Closed (Dev Engineer).** `final` equals the joined deltas in the 75-second run; language tags stay in (D-47, D-50).
7. **Open (QM in the Development Host).** `deactivate()` returns in time for file close and dispatch (local operations, no wait), and no close question or blocked exit at window close or reload (`SPEC_REC_SESSION`, `SPEC_REC_LIVEVIEW`).
8. **Closed for normal VS Code, accepted for the rest.** The model folder derived from `globalStorageUri` was found in the live run with normal VS Code; Insiders and portable are not verified and stay a documented limitation, not acceptance-relevant.
9. **Open (user).** The licence of `Microsoft.Windows.AI.MachineLearning.dll` (a Microsoft-signed Windows App SDK component; the NuGet package has a `license.txt` that was not read and no `licenseExpression`), the terms of npm and NuGet, and whether telemetry events leave the machine; telemetry is switched off by config and environment variable (D-28, D-42).
10. **Open (user, at the end).** German/English quality with real speech, and the echo with open speakers.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

The Sphinx build with `-W` is clean (no unknown links). Re-checked after QM round 2 (D-56): the shutdown wording is the same in `US_REC_CAPTURE` AC-5, `REQ_REC_BUTTON` AC-6, `REQ_REC_DISPATCH` AC-1 and `SPEC_REC_SESSION`; no 2-second budget remains in any spec. Re-checked after QM round 3 (D-57): no text promises more than best effort at shutdown. Re-checked after D-58: the group title reads "Jarvis Recorder" in `REQ_CFG_GROUPS`, `REQ_REC_ENABLE` and `SPEC_REC_SETTINGS`; no other active spec names the old title. Re-checked after D-59: the command titles read "Jarvis: Start Recording" and "Jarvis: Show Running Recording" only in `SPEC_REC_BUTTON`; no other spec names them.

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REC_CAPTURE | REQ_REC_BUTTON; REQ_REC_STATUSBAR; REQ_ENG_ACTORMARK | SPEC_REC_BUTTON; SPEC_REC_STATUSBAR; SPEC_REC_SESSION; SPEC_ENG_ACTORMARK (SPEC_ENG_API, SPEC_ACTOR_TREE, SPEC_ACTOR_ACTIVITY modified) | ✅ |
| US_REC_ENABLE | REQ_REC_ENABLE | SPEC_REC_SETTINGS; SPEC_REC_BUTTON | ✅ |
| US_REC_TRANSCRIPT | REQ_REC_TRANSCRIPTFILE; REQ_REC_SPEECH; REQ_REC_FAILURE | SPEC_REC_TRANSCRIPTFILE; SPEC_REC_CAPTURE; SPEC_REC_ENGINE; SPEC_REC_COMPONENTS; SPEC_REC_SESSION | ✅ |
| US_REC_LIVEVIEW | REQ_REC_LIVEVIEW | SPEC_REC_LIVEVIEW; SPEC_REC_SESSION | ✅ |
| US_REC_DISPATCH | REQ_REC_DISPATCH | SPEC_REC_DISPATCH; SPEC_REC_SESSION | ✅ |

Removed with no replacement of their own: `US_REC_CONFIG`, `REQ_REC_CONFIG`, `REQ_REC_SUBPROCESS`, `REQ_REC_SIDECAR`, `REQ_REC_WATCHERJOB`, `SPEC_REC_SUBPROCESS`, `SPEC_REC_SIDECAR`, `SPEC_REC_WATCHER`, `SPEC_REC_WATCHERJOB`.

### Artefakt-Removal-Check

This change removes the Whisper pipeline: the `whisperPath` setting, `recorder.py` and its process handling (`.recording.json`, `.stop`, `input/`, `output/`), the sidecar JSON, the heartbeat job `Jarvis: Check Transcripts` with the command `jarvis.checkTranscripts`, the command `jarvis.stopRecording`, the context key `jarvis.recordingActive`, the `RecordingManager` class, and the `jarvisProject`/`jarvisEvent` menu patterns. Searched with `git grep` over all tracked files (Research's own notes excluded) for `whisper`, `whisperPath`, `recorder.py`, `checkTranscripts`, `Check Transcripts`, `stopRecording`, `recordingActive`, `Whisper Watcher`, `.recording.json`, `RecordingManager`, the removed `REQ_REC_*`, `SPEC_REC_*` and `US_REC_CONFIG` IDs, `jarvis(Project|Event)`, `internalAppendMessage`, `.stop` and `output`.

| Class | Where | What | Action |
|-------|-------|------|--------|
| (a) code, manifest, test | `packages/recorder/package.json` | description, `stopRecording` command and menu, `jarvis(Project\|Event)` patterns, `recordingActive`, `whisperPath` | Dev: rewrite per `SPEC_REC_SETTINGS` and `SPEC_REC_BUTTON` |
| (a) | `packages/recorder/src/extension.ts`, `packages/recorder/src/recording.ts` | whole old pipeline, watcher, heartbeat job, `RecordingManager` | Dev: replace per the new specs |
| (a) | `src/tests/characterization.test.ts` | asserts `recording.ts` exports `RecordingManager` with start and stop | Dev: replace or remove with the new tests |
| (a) | `testdata/test.code-workspace` | dev workspace sets `jarvis.recording.whisperPath` | Dev: remove the setting |
| (a, low) | `testdata/heartbeat/heartbeat.yaml`, `testdata/recording/recorder.py` | stale fixtures; no test references them (searched `src`, `packages`, `scripts`) | Dev: remove `recorder.py`; the job entry may stay as a generic job fixture or go |
| (b) docs | `README.md` (2 places), `packages/core/README.md`, `packages/suite/README.md` | one-line descriptions mention Whisper | Dev: reword; add the Windows-only note where useful |
| (b) | `packages/recorder/README.md` | settings table, prerequisites, whole description | Dev: rewrite: Windows only, PowerShell 7 or newer recommended (5.1 not verified), model from VS Code's dictation cache and why it fails with the cloud model (D-23, D-24) |
| (b) | `docs/design/spec_rec.rst` | names the removed setting, job and command | intentional: the migration text of `SPEC_REC_SETTINGS` |
| (c) historic | `docs/changes/v0.5.1/**`, `docs/changes/v0.8.0/**`, `docs/changes/v0.28.0/retire-legacy-actor-kinds.md` | earlier changes that built or touched the pipeline | accepted as historic stranding |
| (c) | `.jarvis/actors/Change Manager/context.md`, `.jarvis/actors/Project Manager/backlog.kanban.yaml` | describe this change and its motive | not touched, owned by CM and PM |
| report | `.jarvis/actors/Project Manager/ideas/recording-design.md` | PM's brainstorm of the old pipeline (20 hits); obsolete after this change | to PM for a decision |
| none | `testdata/.jarvis/actors/archiv/Actor 1/kanban.yaml` | the word "whispering" in a story text | false positive |

- [x] All class (a) references are listed with an owner and an action
- [x] All class (b) references are listed; the specs name the README content
- [x] Class (c) is disclosed above

### Issues Found

- I-1: The old recorder sent its message with `jarvis.internalAppendMessage`, which no extension defines (the core offers `api.sendMessage`, `SPEC_ENG_API` AC-8). The old dispatch could therefore never have delivered; the call was inside a `try` that only logged. Not reproduced; read from the code. The new design uses `api.sendMessage` (`SPEC_REC_DISPATCH`).
- I-2: `SPEC_MOD_REC_PKG` AC-2 still says recorder tools use the `jarvis_rec_` infix, but the recorder registers no tools. Not changed here; reported to PM.
- I-3 (resolved in part): The measurements were first from SDK 1.2.3; Research then ran 2.1.0 in a child process (D-47). Unchecked remains the live path with the real microphone and speaker source and a long recording, which is first on the verify-first list.
- I-4: Open licence items (D-28): the licence of `Microsoft.Windows.AI.MachineLearning.dll` and the terms of npm and NuGet.
- I-5 (resolved, D-51): the spec named `require` for the ESM-only SDK; found by the Dev Engineer and corrected.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation, with the verify-first list (L2) as the first implementation step and the open points: licence of `Microsoft.Windows.AI.MachineLearning.dll` and the terms of npm and NuGet (D-28), the real-speech and echo tests by the user (verify-first 10)

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Date:** 2026-10-02. **Reviewer:** Quality Manager (identity confirmed by the user
after `jarvis_whoAmI` was unavailable). **Addressee:** Project Manager.
**Verdict:** CHANGES REQUIRED. PM disposition is pending for each finding.

#### Per-Level Results

| Level | Result | Basis |
|-------|--------|-------|
| L0 | PASS | Scoped MECE review: the five REC stories separate capture, enablement, transcript, live view and notification intent without a discovered contradiction. |
| L1 | PASS | Scoped MECE and trace review: REC requirements and `REQ_ENG_ACTORMARK` preserve the declared story intent; shutdown explicitly includes recordings awaiting transcript completion. |
| L2 | FAIL | The session algorithm, emitted worker and package-content checks expose the findings below. These are specification/build/test gaps, not classified as implementation-only slips. |
| Schema / Trace | PASS | Strict Sphinx build completed with zero schema warnings; declared REC and core-mark links are present. Semantic gaps are recorded below despite valid links. |

#### L2 Findings

**F-1 (High): Shutdown during finishing returns before file close and dispatch.**
`packages/recorder/src/session.ts` ignores `end()` unless the state is `running`;
`shutdown()` only awaits `end('shutdown')`. With the actual compiled session and
fake ports, an unresolved user-end flush followed by `await shutdown()` returned
`{state: 'finishing', fileClosed: false, messages: 0}`. Releasing the original
flush later closed the file and sent one message. Deactivation can therefore
return while finalization is outstanding. **Spec cause:** `SPEC_REC_SESSION`
prescribes that guard without reconciling it with its definition that finishing
counts as running and `REQ_REC_BUTTON` AC-5/AC-6. T-14 covers shutdown from running,
not finishing. **Requested decision:** SD reconciliation of concurrent end and
shutdown semantics, followed by a behavioral regression check and EDH verification.

**F-2 (High): Worker failure during capture startup is lost.**
The session attaches `engine.onFailure` only after awaiting capture startup and
creating the transcript; `WorkerEngine` reports a failure once without replay.
With the actual session and fake ports, a worker failure emitted during
`capture.start()` left the session `running` with no error notification.
**Spec cause:** `SPEC_REC_SESSION` start step 7 delays failure wiring until after
steps 4-6, leaving an inter-step failure path uncovered despite `REQ_REC_FAILURE`
AC-1/AC-2 and the session's AC-2/AC-5. The approved absence of a watchdog (D-26)
makes this a silent stall. **Requested decision:** SD startup failure subscription
and cancellation semantics, plus a regression check for this interval.

**F-3 (High): Normal compilation breaks the worker's ESM loader.**
`packages/recorder/tsconfig.json` uses CommonJS. After `compile all`, the emitted
`out/engineWorker.js` uses `require(file://...)` instead of dynamic import.
Forking that worker with an existing ESM `dist/index.js` produced an IPC
`Cannot find module 'file:///.../dist/index.js'` error and exit code 1, before SDK
API use. The bundle/prepublish path may preserve import, but normal compilation
overwrites that output. **Spec cause:** `SPEC_REC_ENGINE` and D-51 require ESM
loading without an emitted-build contract; successful compilation and source
checks do not prove worker execution. **Requested decision:** preserve import in
the supported build/EDH path and verify the emitted worker with a smoke test.

**F-4 (Medium): Package rules include retired Whisper output.**
`npx --no-install vsce ls --no-dependencies` in the recorder lists
`out/recording.js` and its map. The ignore rules include `out/**`, and compilation
and bundling do not clean it. That stale file still contains `RecordingManager`,
`whisperPath`, `recorder.py`, `.recording.json` and `.stop`. It is not reachable
from the new entrypoint, but VE's claim that it is untracked and therefore not
shipped is incorrect: VSCE inclusion is independent of Git tracking.
**Spec/verification cause:** the CD removal scope and `SPEC_MOD_REC_PKG` packaging
contract lack a clean-output/package-content gate. **Requested decision:** remove
or exclude retired output, check the package list and correct the validation report.

The previously disclosed Low `SPEC_MOD_REC_PKG` AC-2 tool-infix issue remains
CD I-2 / VE I-1; it is not counted as a new finding.

#### Verification and Open Gates

- Independently executed: full monorepo compile passed; strict Sphinx build
	passed; recorder-session, recorder-io, recorder-components and actor-mark tests
	passed (74/74). Fake-port reproductions above are not manual acceptance passes.
- Removal check: no removed-identifier hits in `docs/releasenotes.md`; retired
	runtime output remains as F-4. Intentional migration references are retained.
- T-1 through T-14 remain NOT RUN: no controllable Windows EDH with disposable
	profiles, branch extensions and test audio devices was available through the
	tools. Setting/picker, mark, StatusBar, placement, end/dispatch, close question,
	transcript timing, download/restart, official hashes/non-ANSI path, missing-model,
	worker kill, legacy-job activation and shutdown/reload acceptance are unverified.
- U-1 through U-5 remain user-owned and unexecuted by QM. The licence/telemetry
	publication gate remains OPEN; automated checks do not settle it.
- Findings were sent to PM; this entry resolves the earlier durability blocker.
	No code or normative specification was changed by QM.

#### PM Decisions (Round 1)

User agreed to this disposition on 2026-10-02 and asked PM to wait for QM's
completed report before dispatching.

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | F-1 | fix-now — spec decision first | The cause is in `SPEC_REC_SESSION`, so Dev cannot repair the code until the specification settles concurrent end and shutdown. SD decides this with the user, who wanted to shape the recorder specs directly with SD. Dev then implements and adds the regression check QM requested. |
| 2 | F-2 | fix-now — spec decision first | Same reason: the startup failure path is unspecified in `SPEC_REC_SESSION`, and with no watchdog (D-26) the failure is a silent stall. SD decides with the user, then Dev implements and adds the regression check. |
| 3 | F-3 | fix-now | The normal compile path produces a worker that cannot start, and it is also the path the user would use for the manual tests. Dev preserves the import in the supported build path and adds a smoke test of the emitted worker. |
| 4 | F-4 | fix-now | Retired Whisper code would be packaged. Dev removes or excludes it and checks the package file list; VE corrects the validation report. |

The manual cases T-1..T-14 and the user cases U-1..U-5 run after these fixes,
because F-3 affects the normal route to the Development Host. The licence and
telemetry publication gate stays open with the user.

#### SD Response (Round 1)

All four findings were correct and have a spec cause; none is a larger design change. F-1 and F-2 were decided with the user (2026-10-03). The Dev Engineer implements the following and adds the checks QM asked for; QM then re-reviews and runs T-1..T-14.

| # | Finding | Spec element changed | Dev implements | Check to add |
|---|---------|----------------------|----------------|--------------|
| 1 | F-1 | `SPEC_REC_SESSION` (end by state, shutdown, AC-1, AC-11, AC-13), D-54 | `end` returns the in-progress sequence while `finishing`, never starts a second one; a shutdown shortens the remaining wait of step 3 to 2 s; `deactivate()` awaits until file closed and message sent; shutdown during `starting` cancels silently | Regression check: an unresolved user end, then `await shutdown()`: file closed, one message, state `idle`; and shutdown during `starting`: no file, no message |
| 2 | F-2 | `SPEC_REC_SESSION` (failures during the start, `fail`, AC-12), `SPEC_REC_CAPTURE` (ready timeout, AC-5), `SPEC_REC_ENGINE` (`failure`, AC-11), D-55 | Subscribe to each component's failure events at creation; cancel the start on the first failure and stop late-starting components; keep the engine's `failure`; 15 s timeout for the capture helper's `ready` | Regression check: a worker failure during `capture.start()` ends in `idle` with the error shown and no file; a helper that never reports `ready` fails after the timeout |
| 3 | F-3 | `SPEC_REC_ENGINE` AC-10, D-53 | Keep a native dynamic `import()` in the emitted worker in every supported build path | Smoke test of the emitted `out/engineWorker.js` against an ESM package |
| 4 | F-4 | `SPEC_MOD_REC_PKG` AC-6, D-53 | Remove retired output, clean the output folder before a build, check the package file list | Package file list check; VE corrects its validation report |

### Round 2

**Date:** 2026-10-03. **Reviewer:** Quality Manager. **Addressee:** Project Manager.
**Scope:** F-1 through F-4 fixes and D-53 through D-55, including the added session,
engine, capture and package acceptance criteria; protocol T-15 through T-17.
**Verdict:** CHANGES REQUIRED. F-5 below needs PM disposition; manual acceptance
and publication gates remain open. No code or normative specs changed by QM.

#### Per-Level Results

| Level | Result | Basis |
|-------|--------|-------|
| L0 | PASS (unchanged) | The fix slice changes no stories; the Round 1 scoped intent/MECE result remains applicable. |
| L1 | PASS (unchanged) | The fix slice changes no requirements; the amended L2 lifecycle still traces to the shutdown and failure requirements. |
| L2 | FAIL | State-based end/cancellation and emitted-worker/package contracts address Round 1; repeated shutdown still violates the specified deadline. |
| Schema / Trace | PASS | Strict Sphinx build in the project virtual environment passed with zero schema warnings; amended elements retain their requirement links. |

#### Round 1 Re-verification

| Finding | Result | Independently checked evidence |
|---------|--------|--------------------------------|
| F-1 | Original reproduction fixed; related F-5 remains | Regression checks join an unresolved user end, await close before one dispatch, shorten the flush, and silently cancel engine/capture startup. Repeated shutdown is not covered. |
| F-2 | Fixed for the reviewed startup failure paths | Early failure subscriptions, retained engine failure, cancellation and late-start cleanup are exercised; a helper without ready fails after 15 seconds. |
| F-3 | Fixed in Node compile/bundle paths; Electron gate open | Both emitted tsc and esbuild workers load the fake ESM-only SDK, reach ready, forward text and finish. This does not verify the real SDK under Electron. |
| F-4 | Fixed in reviewed build/package paths | Clean-before-build wiring and tests remove seeded retired output and validate the VSCE list. VE Round 2 explicitly corrects the earlier Git-tracking claim. |

#### L2 Finding F-5 (Medium): Repeated Shutdown Extends the Shortened Deadline

`packages/recorder/src/session.ts`, `waitForFinal().shorten()`, calculates the
remaining time from the original `initial` duration and `begun` time on every
call, not from the current shortened deadline. With the actual tsc-emitted
session, fake ports and simulated timers: a user flush starts at time 0; a
shutdown at 100 ms schedules expiry at 2100 ms; another shutdown at 1100 ms
reschedules expiry at 3100 ms. It must remain no later than 2100 ms. Repeated
calls can therefore keep extending the shortened wait towards the original
20-second deadline. The same end sequence still closes and dispatches once;
the defect is the timing bound, not duplicate dispatch.

**Spec-layer attribution:** `SPEC_REC_SESSION` end step 3 explicitly moves the
deadline to `now + SHUTDOWN_TIMEOUT_MS` only if earlier. AC-11 and D-54 bind
shutdown to that shortened wait. This contract is present and correctly linked;
the implementation recomputes against the wrong deadline, and the regression
coverage omits repeated shutdown. No contrary specification decision was found.
**Recommendation to PM:** preserve a monotonically non-increasing absolute
deadline and request a regression check with two shutdowns during one flush.
SD need not reverse the existing approved contract to accommodate the code.

#### Verification and Unexecuted Cases

- Independent full monorepo build: PASS. Scoped recorder-session, recorder-io,
	recorder-components, recorder-build and actor-mark tests: 99/99 PASS.
- Strict Sphinx schema/link build: PASS. No full 453-test suite rerun by QM in
	this round; that full-suite count remains VE evidence.
- T-1 through T-17: NOT RUN by QM; execution is blocked by the absence of a
	controllable Windows EDH/isolated VS Code profile and its test audio/model
	prerequisites. No static check or fake-SDK result is a manual PASS.
- Specifically unverified: T-1/T-2 settings, hover and picker; T-3 Actor mark;
	T-4 StatusBar; T-5 placement/live text; T-6 end/dispatch; T-7 close question;
	T-8 transcript timing; T-9 real SDK in Electron and repeat start; T-10 official
	hashes/non-ANSI profile; T-11 missing-model profile; T-12 actual worker kill;
	T-13 legacy-job activation; T-14 running close/reload; T-15 finishing reload;
	T-16 starting reload; T-17 isolated installed-VSIX recording.
- T-15's visible-finishing race was not attempted. It cannot be marked PASS
	based on unit tests; its host execution remains blocked like the other cases.
- The protocol now includes T-15/T-16 and T-17, addressing VE R2-1 coverage.
	U-1 through U-5 remain user-owned; licence/telemetry publication gate OPEN.
- Existing Low CD I-2 / VE I-1 tool-infix issue remains unchanged, not a new finding.

#### PM Decisions (Round 2)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | F-5 | superseded by a simplification of the shutdown requirement (user decision 2026-10-03), not repaired | The user chose KISS over strict spec adherence: on close or reload, "close means exit" outranks completeness of the final transcript words. F-5 stays valid against today's text and is not retroactive clearance; it falls away only because the deadline machinery it concerns is removed. |

**User decision, with benefits and losses stated:**

- On VS Code close or reload, the recording stops without waiting for further
  recognition results. Text already received is saved best effort, and the Actor
  notification is attempted without a guarantee.
- Gained: a simpler shutdown contract and code, and VS Code never appears to hang
  on close.
- Accepted losses: missing last words, and no guaranteed notification when the host
  exits before dispatch.
- Unchanged: the normal "End recording" path and the live-latency promise.

Route: System Designer revises, together with the user, `REQ_REC_BUTTON` AC-6 and
the related dispatch and completeness wording, then `SPEC_REC_SESSION` (shutdown,
AC-11, AC-13) and decision D-54. Dev and tests follow the approved text, then VE
and QM Round 3. The contract is changed openly here, not relaxed silently. The
manual cases and U-1..U-5 run after this, and the licence and telemetry gate stays
open with the user.

#### SD Response (Round 2)

User decision D-56, worked out openly through the levels (user-guided, 2026-10-03). L0 finding: `US_REC_CAPTURE` AC-5 said "ends as if I had ended it", which implied the full end with waiting; it now says "ends at once, without waiting for further speech to be recognised; the end of the transcript may then be missing and the Actor may not be notified". No other story promises completeness or notification on close (`US_REC_TRANSCRIPT` AC-3 and `US_REC_DISPATCH` AC-1 concern a normal end).

| # | Finding | Spec change | What Dev changes | Checks |
|---|---------|-------------|------------------|--------|
| 1 | F-5 | `SPEC_REC_SESSION` `end` by state, step 3, Shutdown, AC-4, AC-11, AC-14, verify first; `SPEC_REC_ENGINE` `dispose()` and AC-5; `REQ_REC_BUTTON` AC-6; `REQ_REC_DISPATCH` AC-1; `US_REC_CAPTURE` AC-5; D-56 | Remove `SHUTDOWN_TIMEOUT_MS`, the deadline arithmetic and `shorten()` in `waitForFinal`. Shutdown from `running`: skip the wait, dispose the engine, close, dispatch. Shutdown from `finishing`: leave the wait once (repeats have no effect), dispose, close, dispatch. `starting`: unchanged. Engine `dispose()` raises no failure and resolves a pending `finish()`. Normal end keeps 20 s. | Obsolete: the F-1 check that asserts the shortened 2 s wait, and any deadline assertion (F-5 regression with two shutdowns). Change: shutdown from `running` ends in `idle` with the file closed, one message attempted, no wait for `finish()` (check with an engine whose `finish()` never resolves); shutdown from `finishing` with an unresolved `finish()` returns without waiting for the 20 s timer; two shutdowns in a row change nothing; shutdown from `starting` as before (no file, no message); engine `dispose()` is no failure and resolves a pending `finish()`. |

For the Test Protocol (Test Designer): T-14 (shutdown while running) expects no wait for recognition, the text received before the close in the file and the message attempted (it may be missing after a real close; not a failure); T-15 (shutdown while finishing) expects that the wait ends at once and the sequence closes the file and attempts the message; a repeated close or reload changes nothing; T-16 (while starting) is unchanged. Expected results that mention the 2-second flush or a guaranteed message at close must be reworded; the AC mapping moves `REQ_REC_BUTTON` AC-6, `REQ_REC_DISPATCH` AC-1 and `SPEC_REC_SESSION` AC-4, AC-11, AC-14 (new) to these cases, and `SPEC_REC_ENGINE` AC-5 to the dispose check. `SPEC_REC_COMPONENTS` and `SPEC_REC_LIVEVIEW` carry no budget wording and are unchanged.

### Round 3

**Date:** 2026-10-03. **Reviewer:** Quality Manager. **Addressee:** Project Manager.
**Reviewed revision:** `04040e4`, in a disposable detached worktree, not against
the modified shared manifest. **Verdict:** FINDINGS; D-56 code checks pass,
overall acceptance remains PARTIAL. PM disposition requested for F-6 and F-7.

#### Per-Level Results

| Level | MECE / Trace Result | Remaining Findings |
|-------|---------------------|--------------------|
| L0 | PASS for D-56 intent: shutdown is distinct from normal end and accepts truncation/missing notification. | F-6-L0: acceptance status is not supported by the open real-speech cases. |
| L1 | D-56 links and normal-end/shutdown separation are intact. | F-6-L1: verification/status mismatch; F-7-L1: retained-text wording remains stronger than the accepted best-effort decision. |
| L2 | D-56 lifecycle matches code and deterministic tests; earlier fixes remain covered. | F-6-L2: open host evidence versus verified status; F-7-L2: queued writes are described as already persisted. |
| Schema | PASS | Fresh strict Sphinx build of the reviewed commit completed with zero schema warnings. |

#### L0 Findings

**F-6-L0 (Medium, verification metadata):** `US_REC_TRANSCRIPT` is marked
`implemented`, although its German/English acceptance criterion still needs
the user-owned U-2 judgment. Code presence and a fake SDK do not settle that
criterion. This is a status/evidence discrepancy, not evidence that the feature
does not work.

#### L1 Findings

**F-6-L1 (Medium, same status issue):** `REQ_REC_SPEECH` is marked `implemented`
while real-source latency and language behavior (AC-4/AC-5, U-2/U-4) remain open.
The Verify Engineer's current status rule ties that status to verification and
forbids promotion on PARTIAL outcomes. The D-56 automated slice can pass without
making the entire recorder acceptance pass. PM should resolve this distinction,
not infer manual coverage from the status sweep.

**F-7-L1 (Medium, decision alignment):** `REQ_REC_BUTTON` AC-6 still says text
already received SHALL be kept. PM Decisions (Round 2) and the user explicitly
accept saving best effort and losing final words even if that saving fails.
The requirement does not express this qualification. Recommendation: clarify
best-effort preservation and the accepted loss, rather than add guarantees or
shutdown waiting to satisfy the stronger wording.

#### L2 Findings

**F-6-L2 (Medium, same status issue):** recorder specs were broadly promoted to
`implemented`, including `SPEC_REC_ENGINE`, while the final native-import worker
with the real SDK under Electron (T-9/T-17) and real deactivate/reload behavior
(T-14/T-15/T-16) remain unverified. Under the current VE rule, the blanket
promotion is not justified by the automated D-56 result alone. Recommendation:
retain explicit per-element partial verification where evidence is missing, or
have PM explicitly settle status semantics; do not invent manual passes.

**F-7-L2 (Medium, same preservation issue):** the `SPEC_REC_SESSION` Shutdown
paragraph claims delivered text is already in the file because it is appended
as it arrives. `TranscriptFile.append()` instead queues asynchronous `fs.write`
calls on a promise chain and returns before they complete; `close()` awaits
that chain. A host exit before completion can therefore lose received text,
not only audio still awaiting recognition. T-14/T-15 also expect received text
in the file without expressing the accepted best-effort exception. Recommendation:
align the explanation and acceptance interpretation with the user decision;
no code mechanism or stronger persistence guarantee is requested by QM.

#### Independent Verification

- Full compile-all equivalent passed in the isolated committed checkout. An
	initial Kanban build failed because the isolated layout resolved root Ajv 6
	instead of its installed package-local Ajv 8; linking the existing package-local
	dependencies resolved it. No shared source or dependencies were modified.
- Full suite: 457/457 tests passed, 50/50 files. This includes unresolved-flush
	shutdown, no `finish()` call on shutdown from running, repeated shutdown,
	startup cancellation/failure, both emitted-worker paths and package contents.
- F-1 through F-4 remain covered. F-5 is superseded by approved D-56, not repaired
	against its old contract. No new D-56 code deviation found in this review.
- Supersession check passed for active recognition-budget wording. Old CD round
	records/D-54 are history explicitly superseded by D-56; the capture helper's
	two-second kill fallback is a different operation, not a recognition flush.
- T-1 through T-17: NOT RUN by QM, blocked by the lack of a controllable Windows
	EDH/isolated profile with branch extensions and test audio/model prerequisites.
	This includes settings/picker, marks, StatusBar, placement, end/close UI,
	transcript timing, download/real SDK/restart, hashes/non-ANSI profile,
	missing-model profile, worker kill, legacy-job activation, lifecycle reload
	races and installed-VSIX smoke. Unit tests are not substitutes for these cases.
- U-1 through U-5 remain user-owned. Licence/telemetry publication gate OPEN.
	Existing Low CD I-2 / VE I-1 tool-infix issue remains unchanged.
- Shared-tree hazard confirmed: `packages/recorder/package.json` is modified
	outside the reviewed commit. QM did not touch or restore it; PM must resolve
	ownership before shared-tree builds/packages can represent this review.

---

#### PM Decisions (Round 3)

User agreed to this disposition on 2026-10-03.

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | F-6 (L0/L1/L2) | fix-now | The status rule ties `implemented` to verification and forbids promotion on PARTIAL; the German/English criterion, real-SDK import under Electron and deactivate/reload are not verified. Elements whose acceptance depends on that open evidence go back to their pre-promotion status individually, with no blanket rollback of elements that are proven. They are promoted after the manual cases pass. Metadata only: no spec content, code or manual result changes, and no manual pass is invented. |
| 2 | F-7 (L1/L2) | fix-now — wording, with the user | The text must say what the user accepted: received text is saved best effort and loss is accepted, including when saving fails. System Designer aligns `REQ_REC_BUTTON` AC-6, the `SPEC_REC_SESSION` Shutdown paragraph (queued writes, not "already in the file") and the T-14/T-15 expectations. No code, no new waiting, no synchronous persistence, no stronger shutdown machinery. |

Shared-tree hazard: `packages/recorder/package.json` held uncommitted pre-redesign
content from an unknown actor, identical to `development`. With the user's
approval PM restored it to the committed branch version on 2026-10-03; nothing
unique was lost.

Route: SD with the user on F-7, owner of the status values on F-6, then Test
Designer for T-14/T-15 wording, VE, QM Round 4. The manual cases T-1..T-17 and
U-1..U-5 follow, and the licence and telemetry gate stays open with the user.

#### SD Response (Round 3)

F-6 (status values) is not mine and not touched; no `:status:` value was changed. F-7 is wording only, worked out with the user (2026-10-03): the text must say what was accepted, namely best effort, loss included, also when saving fails. The user asked whether the close must wait for the write queue; it does, because it is the same `close()` as after a normal end (the message needs the complete file), it costs local file operations only, and no timer, no extra wait and no synchronous write is added. Whether VS Code leaves the time stays verify-first 7.

- D-57 (user, QM round 3, F-7): Saving at shutdown is best effort. The delta is handed to the write queue of the transcript file (`append` does not wait for the write); `close()` waits for the queue; a host exit before it is empty loses that text, like audio still on its way. `REQ_REC_BUTTON` AC-6 no longer says the received text "SHALL be kept": it says the text is saved and the notification attempted, both without guarantee, and names the cases (writing fails, host ends first). `SPEC_REC_SESSION` Shutdown and AC-14 say "handed to the write queue, step 4 waits" instead of "already in the file"; `SPEC_REC_TRANSCRIPTFILE` Writing states that `append` returns without waiting and `close()` waits for the chain. Checked and unchanged because they promise nothing stronger: `US_REC_CAPTURE` AC-5 ("the end of the transcript may then be missing and the Actor may not be notified"), `REQ_REC_DISPATCH` AC-1 ("only attempted"), `REQ_REC_TRANSCRIPTFILE` AC-2 and AC-3 (normal operation and normal end), `SPEC_REC_SESSION` AC-4 and AC-5 (breakdown: `close()` is awaited there, nothing is cut off). No machinery changes.

| # | Finding | Spec change | What Dev changes | Checks |
|---|---------|-------------|------------------|--------|
| 1 | F-7-L1 | `REQ_REC_BUTTON` AC-6 | nothing (code already does this) | none new |
| 2 | F-7-L2 | `SPEC_REC_SESSION` Shutdown, AC-14; `SPEC_REC_TRANSCRIPTFILE` Writing | nothing | none new |

For the Test Designer (not edited by me): T-14 and T-15 must not expect that all text received before the close is in the file. Expected: the file exists and is closed, it holds the text whose writes completed, and it may lack the last received text; a lost tail or a missing message is not a failure. The AC mapping stays (`REQ_REC_BUTTON` AC-6, `SPEC_REC_SESSION` AC-14); add `SPEC_REC_TRANSCRIPTFILE` Writing to the T-14 reference as the source of the queue.

### Round 4

**Date:** 2026-10-03. **Reviewer:** Quality Manager. **Addressee:** Project Manager.
**Reviewed revision:** `20702be`, on `feature/recorder-redesign`; shared tree was
clean before review. Execution HEAD was `02dd73b`: the sole additional commit
changes CM memory only; an independent diff confirms identical docs, packages,
tests and Verify policy. **Scope:** F-6's 25-element status table, F-7/D-57 wording
and preservation of F-1 through F-5/D-56. **Verdict:** FINDINGS; F-7 resolved,
F-6 only partly resolved. No new code defect found; overall acceptance PARTIAL.

#### Per-Level Results

| Level | MECE / Trace Result | Findings |
|-------|---------------------|----------|
| L0 | PASS for this correction: user-approved D-56 intent is unchanged, and the three real-source/host-dependent stories are back to approved. | No additional L0 finding. Declarative enable gating and normal dispatch retain their local evidence; this is not a T-1/T-6 manual PASS. |
| L1 | D-57 resolves F-7-L1 and retains normal-end versus shutdown separation. Links remain intact. | F-6-L1 remains open for the real recognition-to-file delay in REQ_REC_TRANSCRIPTFILE AC-3. |
| L2 | D-57 resolves F-7-L2; session, engine, capture and package regressions pass. | F-6-L2 remains open for host-dependent/session and package acceptance; see the five residual status rows below. |
| Schema | PASS | Strict Sphinx build with -W --keep-going completed without warnings. |

#### L0 Findings

No new finding. `US_REC_CAPTURE`, `US_REC_TRANSCRIPT` and `US_REC_LIVEVIEW`
are now `approved`, as requested. `US_REC_ENABLE` and `US_REC_DISPATCH` retain
manifest/start-guard and normal-message evidence respectively. Their status
does not close the still-unexecuted host cases or the underlying speech criteria.

#### L1 Finding F-6-L1 (Medium): File Timing Still Depends on Open Speech Evidence

The VE table keeps `REQ_REC_TRANSCRIPTFILE` implemented on the grounds that
AC-1 through AC-4 are unit tested. AC-3, however, requires remaining speech to
be written within the delay of `REQ_REC_SPEECH` AC-4: 20 seconds from speech,
not merely successful append/close after a fake engine emits text. Real SDK
latency and final recognition-to-disk completion are still open (T-6/T-8,
U-2/U-4). The same report correctly returns `REQ_REC_SPEECH` to approved for
this missing evidence. File naming, no-overwrite, queued writes and marks are
verified; the whole requirement's acceptance is not. Recommendation to PM:
retain partial evidence without a fully verified element status until this
linked AC is settled. No new timing mechanism is requested.

#### L2 Finding F-6-L2 (Medium): The Remaining Table Overstates Host Coverage

| Element still implemented | Verified evidence | Evidence still missing |
|---------------------------|-------------------|------------------------|
| SPEC_REC_BUTTON | Manifest command/menu tests and source inspection; session/core mark tests. | AC-4 also requires the actual Actor picker and cancellation behavior, not just the palette when clause. AC-2/AC-3 describe actual inline availability. T-1/T-2 remain NOT RUN; the manifest-only AC-4 test does not invoke the handler or QuickPick. |
| SPEC_REC_STATUSBAR | formatElapsed, session active span and tick events; source wiring. | AC-1/AC-2/AC-4 concern the actual visible item, displayed Actor/red icon/time and click command. Tests do not exercise the StatusBar refresh/click wiring; T-4 is NOT RUN. |
| SPEC_REC_SESSION | State/end/start/error logic and real transcript-file queue tested with fake ports; deactivate source awaits session.shutdown(). | AC-11 explicitly includes deactivate awaiting completion; T-15 maps to that AC. The table's dismissal of deactivate as not an AC is therefore incorrect. Actual host shutdown/reload and Verify-first 7 remain open (T-14/T-15/T-16), even though the local sequence and accepted loss tolerance are proven. |
| SPEC_MOD_REC_PKG | Dependency declaration, clean output and nine-file packaging tests. | AC-3 requires recording to function with Core alone, not just absence of a PIM dependency; AC-5 includes first-start fetching. Installed real recording (T-17) and real first-start preparation (T-9/U-1) remain open. A file-list test establishes AC-6, not every package AC. |

I disagree that these four elements are fully verified by automated evidence
alone. Static review supports the implementation and found no contrary code;
it does not turn the declared EDH/user acceptance into observed results. The
same visible-action criteria already hold `REQ_REC_BUTTON` and
`REQ_REC_STATUSBAR` at approved. Under PM's Round 3 decision, retain approved
for elements with these open criteria, or have PM explicitly settle an
alternative status meaning; do not silently dismiss the criteria. In particular,
no successful host-wide flush or guaranteed shutdown notification is demanded:
D-56/D-57 deliberately accept their loss.

The other eight retained statuses have local implementation evidence:
`US_REC_ENABLE`, `US_REC_DISPATCH`, `REQ_REC_ENABLE`, `REQ_REC_DISPATCH`,
`REQ_ENG_ACTORMARK`, `SPEC_REC_SETTINGS`, `SPEC_REC_TRANSCRIPTFILE`,
`SPEC_REC_DISPATCH`. This does not imply completion of their consuming stories
or a manual host PASS. The twelve reversions are accepted; the five residual
elements above prevent closing F-6 as a whole.

#### F-7 and Earlier Findings

- F-7: resolved. `REQ_REC_BUTTON` AC-6 now explicitly permits saving failure and
	host-exit loss. `SPEC_REC_SESSION` Shutdown/AC-14 and
	`SPEC_REC_TRANSCRIPTFILE` Writing describe append returning before asynchronous
	writes and close awaiting the chain. T-14/T-15 accept queued-tail loss and a
	missing message, while still checking an existing, readable, closed file.
- Independent diff `04040e4..20702be`: six docs/report/protocol files only; no
	changes in packages or source tests. F-1/F-2 lifecycle/start failures, F-3
	emitted ESM loading and F-4 clean packaging are untouched. F-5 remains
	superseded by D-56; no deadline/shortening requirement was reintroduced.
- Independent focused regression run at the reviewed revision: 103/103 tests,
	five files (session, IO, components, emitted-worker/package, Actor mark) PASS.
	No full-suite or compile-all rerun by QM for this documentation-only delta;
	VE's 457/457 and full build remain separately attributed VE evidence.

#### Unexecuted Acceptance and Handover

- T-1 through T-17: all NOT RUN by QM. No available tool can drive a desktop
	Development Host/isolated installed-VSIX profile with real audio/model input.
	Browser automation cannot control that host; the available VS Code command
	tool is restricted to new-project setup, not this audit.
- Specifically open: T-1 settings/menu gating; T-2 start/picker/cancellation;
	T-3 Actor mark; T-4 StatusBar/click; T-5 placement/live text; T-6 end/dispatch;
	T-7 close dialog; T-8 file timing/marks; T-9 real SDK/start/progress/restart;
	T-10 official hashes/non-ANSI path; T-11 missing model; T-12 worker kill;
	T-13 legacy-job activation; T-14 running close/reload; T-15 finishing reload;
	T-16 starting reload; T-17 installed Core+Recorder recording. No fake/static
	check is counted as a manual PASS; the user/EDH operator can run the existing
	protocol in the required profile and supply observed results.
- U-1 through U-5 and D-28 licence/telemetry remain user-owned and OPEN.
	Existing Low CD I-2 / VE I-1 tool-infix issue is unchanged, not duplicated.
- The shared-manifest hazard is resolved in the reviewed clean tree. QM changed
	only this Findings Report; no code, normative spec, status or protocol result
	was altered. Findings are routed exclusively to PM for disposition.

#### PM Decisions (Round 4)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | F-7 | resolved | QM confirms requirement, session Shutdown/AC-14, TranscriptFile Writing and T-14/T-15 now agree on the asynchronous queue and best-effort preservation. |
| 2 | F-6 (five retained elements: `REQ_REC_TRANSCRIPTFILE`, `SPEC_REC_BUTTON`, `SPEC_REC_STATUSBAR`, `SPEC_REC_SESSION`, `SPEC_MOD_REC_PKG`) | accept-as-is — user decision 2026-10-03 | The remaining dispute is about what `implemented` means, not about behavior: in the current ontology VE sets `implemented` only after verification, while the user reads it as "code is there, automated tests pass". A further QM round only to move five status values has no value; the user validates the behavior in the Extension Development Host (U-1..U-5 as far as possible, fixes follow if a defect shows). QM's disagreement stays on record: it does not accept that all 13 retained elements have full automated evidence, and this decision does not claim otherwise. Nothing is relaxed silently. |

Route: no further QM round. The user runs U-1..U-5 in the Extension Development
Host; a defect found there is fixed and re-verified in a targeted way. After the
user's validation, VE promotes the twelve `approved` elements per its Round 4
table and the user decides on the merge. T-1..T-17 stay NOT RUN and are not
counted as passed; the licence and telemetry gate (D-28) blocks publication, not
the merge.

Follow-up outside this change: the status vocabulary (`implemented` /
`verified` / possibly `validated`) and how `verified` can be automated, tracked in
the backlog.

### Targeted Check after User Validation and D-58/D-59

**Date:** 2026-10-03. **Reviewer:** Quality Manager. **Addressee:** Project Manager.
**Scope:** new `REQ_REC_SPEECH` promotion, eleven remaining approved elements,
D-58/D-59 consistency and unchanged lifecycle contracts. This is the requested
single targeted check, not another full round or a reopening of accepted F-6.
**Reviewed revision:** `2067805`; execution HEAD `b5b23c7` adds CM memory only.
**Verdict:** FINDINGS: new promotion overstates documented coverage (F-8 below).
Title changes are consistent. No new behavioral defect is demonstrated.

#### Per-Level Results

| Level | MECE / Trace Result | Finding |
|-------|---------------------|---------|
| L0 | PASS for unchanged story content/statuses; remaining story criteria are not all settled by the reported U cases. | No new L0 finding. |
| L1 | D-58 settings title matches its design/manifest; speech links remain intact. | F-8: the new REQ_REC_SPEECH status is supported by partial, not complete, acceptance evidence. |
| L2 | D-58/D-59 titles match manifest, README, assertions and protocol; design content otherwise unchanged. | No new design finding; SPEC_REC_ENGINE correctly retains open network/telemetry evidence. |
| Schema | PASS | Strict Sphinx build with -W --keep-going completed with zero schema warnings. |

#### L1 Finding F-8 (Medium): New Promotion Claims More Than the Reported Tests

User-reported results can support status: QM independence does not require
duplicating an acceptance judgment owned by the user. U-1/U-2/U-5 are useful
real-machine evidence, especially download success, both sources, acceptable
German/English behavior, time marks and observed log/file contents. However,
their documented statements do not support VE's claim that all eight
`REQ_REC_SPEECH` ACs are completely covered:

- **AC-1:** both sources working does not settle the same AC's missing-source
	warning/continuation and both-sources-lost behavior. U-3 is BLOCKED, not PASS.
	Automated fake-port coverage supports local logic, not an observed driver case.
- **AC-2:** speech recognized on this laptop does not show that no audio leaves
	it. The recorded U-5 summary covers logs/files, not its protocol's offline
	steps. The same VE table explicitly leaves SPEC_REC_ENGINE's no-network AC
	open because networking was not monitored. Source-level local-engine intent
	is not a user observation of network behavior; no actual audio leak is alleged.
- **AC-4:** a felt 3-6-second delay in a short run is positive evidence of typical
	latency there. It is not a timed speech-to-file result for every tested phrase,
	final post-end recognition/writes, or longer operation. U-4 is NOT RUN. This
	does not invent a one-hour product requirement or a mandatory merge gate; it
	identifies the difference between the observed sample and the claimed coverage.
- **AC-8:** successful second-start download is supported. The failure path and
	visible-progress details are not documented by that statement alone. A manual
	second start does not demonstrate automatic retry or proxy route isolation.

Recommendation to PM: retain explicit partial evidence (and approved under the
current verified-status rule), or explicitly accept the new promotion with its
known gaps under the user's code-exists status meaning. The prior accept-as-is
decision concerned five other elements; it does not itself establish new speech
evidence. No additional code, retry policy, shutdown wait or new test campaign
is requested. Clarification of already observed results can improve the record.

#### Status and Delta Consistency

- Exactly one status changed in the committed delta: REQ_REC_SPEECH. Eleven
	approved elements remain; none is clearly fully settled by the reported
	U-1/U-2/U-5 statements. Their remaining failures, UI/lifecycle, environment,
	long-run or licence/telemetry criteria justify retaining partial coverage.
	The accepted five F-6 statuses are not re-adjudicated here.
- D-58/D-59 agree across specs, manifest, README, title assertions and protocol:
	settings group "Jarvis Recorder", commands "Jarvis: Start Recording" and
	"Jarvis: Show Running Recording". No stale old contributed title found in
	those active surfaces. Generic recording verbs, dialog text and historical
	reports are not old contributed command/group titles.
- Independent diff since `20702be`: runtime TypeScript and the lifecycle/build
	regression tests are unchanged; only manifest presentation strings, README,
	the existing IO title assertions and docs/protocol/report content changed.
	F-1 through F-4, D-56/F-5 supersession and D-57 queued-write/best-effort text
	are untouched. This is a delta check, not a new full runtime verification.

#### Verification and Explicit Exclusions

- Independent title validation: 5/5 manifest tests PASS (28 unrelated IO tests
	skipped by the explicit manifest filter). All seven packages compile; Flow
	and Kanban extension/webview bundles PASS. Strict Sphinx/schema gate PASS.
	VE's full 457-test/package results are not represented as QM reruns.
- No new EDH, real-audio, network capture, download/proxy, unsupported-platform,
	final-flush latency, source-loss or one-hour test was executed by QM. User
	observations are explicitly attributed to the user via PM, not QM measurements.
- T-1 through T-17 stay NOT RUN. U-3 stays BLOCKED; U-4 stays NOT RUN. U-1/U-2/U-5
	remain reported PASS without silently extending their documented observations.
- User decisions stand: U-3/U-4 are not made new release blockers by this report;
	D-28 blocks publication, not merge. Merge still requires the user's explicit OK,
	which the triggering message says has not been given. PM decides disposition.
- QM writes only this Findings Report; no code, spec/status or test result edits.

#### PM Decisions (Targeted Check)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | D-58 / D-59 (group and command titles) | resolved | QM confirms the "Jarvis Recorder" group and the "Jarvis:" command titles are consistent across spec, manifest, README, tests and protocol. |
| 2 | F-8 (`REQ_REC_SPEECH` promoted to `implemented`) | fix-now: back to `approved` — user decision 2026-10-03 | The reported U-1/U-2/U-5 results cover AC-1, AC-2, AC-4 and AC-8 only in part (U-3 blocked, no offline or no-audio-leak observation, latency felt on a short run, only the successful second start). Status follows verification, and the user's results should not be stretched to an acceptance criterion they did not exercise. Metadata only: one status line, no code, spec text or test change. |

The user does not want a further long run: no further QM or VE round after the
status line. The release-note candidates stay as agreed (U-3 blocked, U-4 not run,
echo coverage limited to the user's hardware, T-1..T-17 not run). The merge needs
the user's explicit OK, which is still open.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
