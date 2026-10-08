Recording Design Specifications
================================

.. note::
   The recorder records the speech of a meeting from the microphone and the speaker
   output on Windows, recognises it on the user's computer and writes the transcript
   into the Actor's folder. The specs run from the audio source to the message to the
   Actor; ``SPEC_REC_SESSION`` owns the lifecycle that connects them. Assumptions that
   are not proven yet are marked **Verify first**; the Dev Engineer works through them
   in the first implementation step and comes back to the System Designer if one fails.

.. spec:: Recording Settings in package.json
   :id: SPEC_REC_SETTINGS
   :status: implemented
   :links: REQ_REC_ENABLE

   **Description:**
   The "Jarvis Recorder" settings group of ``package.json`` holds one setting. The
   ``jarvis.recording.whisperPath`` setting no longer exists.

   **package.json** (inside ``contributes.configuration``):

   .. code-block:: json

      {
        "title": "Jarvis Recorder",
        "properties": {
          "jarvis.recording.enabled": {
            "type": "boolean",
            "default": false,
            "description": "Enable the meeting recording feature (Windows only). Offers a start action on the Actors in the ACTORS view."
          }
        }
      }

   **Legacy job:** the earlier recorder registered the persistent heartbeat job
   ``Jarvis: Check Transcripts`` (``SPEC_ENG_HEARTBEAT_JOBAPI``: jobs survive restart and
   uninstall). On activation the recorder calls
   ``api.unregisterJob('Jarvis: Check Transcripts')`` once per activation; it is a no-op when
   the job is absent, and an error from the call is logged and does not stop the activation.
   Without it, an upgraded installation would call the removed command
   ``jarvis.checkTranscripts`` every scan interval.

   **Acceptance Criteria:**

   * AC-1: The "Jarvis Recorder" group contributes exactly ``jarvis.recording.enabled``
     (boolean, default ``false``), nothing else.
   * AC-2: No setting, command, menu or job named after the Whisper pipeline is contributed
     or registered; the legacy job is unregistered on activation.
   * AC-3: The setting gates only the start (``SPEC_REC_BUTTON`` ``when`` clauses and the
     guard in ``SPEC_REC_SESSION``); no code reads it to stop a running recording.


.. spec:: Start and Show Actions on the Actors
   :id: SPEC_REC_BUTTON
   :status: implemented
   :links: REQ_REC_BUTTON; REQ_REC_ENABLE; REQ_ENG_ACTORMARK; SPEC_ENG_ACTORMARK

   **Description:**
   Two commands and their menu entries in ``package.json``; the handlers are registered in
   ``extension.ts`` and call ``SPEC_REC_SESSION`` and ``SPEC_REC_LIVEVIEW``. There is no stop
   command: a recording is ended only in the transcript view (``SPEC_REC_LIVEVIEW``).

   **Commands** (``contributes.commands``):

   .. code-block:: json

      { "command": "jarvis.startRecording", "title": "Jarvis: Start Recording",        "icon": "$(circle-outline)" },
      { "command": "jarvis.showRecording",  "title": "Jarvis: Show Running Recording", "icon": "$(circle-filled)" }

   **Menus:**

   .. code-block:: json

      "commandPalette": [
        { "command": "jarvis.startRecording", "when": "config.jarvis.recording.enabled == true" },
        { "command": "jarvis.showRecording",  "when": "false" }
      ],
      "view/item/context": [
        {
          "command": "jarvis.startRecording",
          "when": "view == jarvisActors && viewItem == jarvisActor && config.jarvis.recording.enabled == true && jarvis.recordingRunning != true",
          "group": "inline"
        },
        {
          "command": "jarvis.showRecording",
          "when": "view == jarvisActors && viewItem == jarvisActor && jarvis.recordingRunning == true",
          "group": "inline"
        }
      ]

   ``viewItem == jarvisActor`` is the context value the core gives every Actor node
   (``SPEC_ACTOR_TREE``); the ``showRecording`` entry has no ``config`` condition, so
   switching the setting off does not take the way back to a running recording
   (``REQ_REC_ENABLE`` AC-5). The palette entry for ``startRecording`` stays visible while a
   recording runs so that the warning of ``REQ_REC_BUTTON`` AC-5 can be reached.

   **Context key:** ``jarvis.recordingRunning`` (boolean) is set with
   ``executeCommand('setContext', ...)`` by ``SPEC_REC_SESSION``: ``true`` from ``running``
   until ``idle`` (including ``finishing``).

   **Handlers:**

   .. code-block:: typescript

      // jarvis.startRecording(node?: { kind: 'actor'; id: string })
      const actors = api.listActors();
      const actor = node
          ? actors.find(a => a.id === node.id)
          : await pickActor(actors);          // QuickPick: label = name, description = summary, sorted by name
      if (!actor) { return; }                // palette pick cancelled, or the node vanished
      await session.start(actor);

      // jarvis.showRecording()
      liveView.show();

   The title of a command is static, so the hover action cannot name the Actor that is
   being recorded; the red circle marks it (below).

   **Red circle:** while the session is ``running`` or ``finishing``,
   ``SPEC_REC_SESSION`` holds ``api.markActor(actor.id, new vscode.ThemeIcon('circle-filled',
   new vscode.ThemeColor('charts.red')))``. When ``api.markActor`` does not exist (an older
   core), the mark is skipped and the rest works.

   **Acceptance Criteria:**

   * AC-1: The manifest contributes exactly the two commands above and no stop command.
   * AC-2: The inline start action shows on Actor nodes only when the setting is ``true`` and
     no recording is running (``REQ_REC_BUTTON`` AC-1).
   * AC-3: The inline show action shows on Actor nodes whenever a recording is running, with
     no condition on the setting (``REQ_REC_BUTTON`` AC-4).
   * AC-4: The Command Palette offers ``jarvis.startRecording`` when the setting is ``true``;
     it asks for the Actor, and cancelling starts nothing (``REQ_REC_BUTTON`` AC-2).
   * AC-5: The target Actor is looked up by ``id`` in ``api.listActors()``.
   * AC-6: The red circle is set through ``markActor`` while a recording is running or
     finishing and removed afterwards (``REQ_REC_BUTTON`` AC-3).


.. spec:: StatusBar Recording Timer
   :id: SPEC_REC_STATUSBAR
   :status: implemented
   :links: REQ_REC_STATUSBAR

   **Description:**
   One StatusBar item, owned by ``extension.ts``, driven by ``SPEC_REC_SESSION``.

   .. code-block:: typescript

      const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
      item.command = 'jarvis.showRecording';
      item.tooltip = 'Show the running recording';

      // text, refreshed once a second while the item is visible:
      //   running:    `🔴 ${actor.name} — ${formatElapsed(now - startedAt)}`
      //   finishing:  `🔴 ${actor.name} — ${formatElapsed(endedAt - startedAt)} · finishing`

   The item is shown from ``running`` until ``idle`` and hidden otherwise.

   **Elapsed time format:** ``formatElapsed(ms)`` in ``session.ts`` returns ``MM:SS`` below one
   hour and ``H:MM:SS`` from one hour. The transcript view receives the formatted string from
   the host (``SPEC_REC_LIVEVIEW``), so both places use this one function
   (``REQ_REC_STATUSBAR`` AC-2).

   **Acceptance Criteria:**

   * AC-1: The item is visible exactly while the session is ``running`` or ``finishing``.
   * AC-2: The text shows a red circle, the Actor name and the elapsed time; the time stops
     counting when the end begins.
   * AC-3: The text is refreshed on every tick of the session timer (``SPEC_REC_SESSION``, one
     second).
   * AC-4: A click executes ``jarvis.showRecording``; it never ends the recording.


.. spec:: Recording Session
   :id: SPEC_REC_SESSION
   :status: implemented
   :links: REQ_REC_BUTTON; REQ_REC_ENABLE; REQ_REC_FAILURE; REQ_REC_LIVEVIEW; REQ_REC_SPEECH; REQ_REC_DISPATCH; REQ_REC_TRANSCRIPTFILE; SPEC_REC_TRANSCRIPTFILE

   **Description:**
   ``src/session.ts`` holds ``RecordingSession``: the one object that knows whether a
   recording exists and connects capture, engine, transcript file, view and message.
   ``extension.ts`` only wires commands, the StatusBar item and the view to it.

   .. code-block:: typescript

      type RecordingState = 'idle' | 'starting' | 'running' | 'finishing';
      type EndReason = 'user' | 'breakdown' | 'shutdown';

      class RecordingSession {
          readonly onDidChange: vscode.Event<void>;
          get state(): RecordingState;
          get actor(): JarvisActor | undefined;
          get startedAt(): number | undefined;   // Date.now() when 'running' began
          get endedAt(): number | undefined;     // Date.now() when 'finishing' began
          get text(): string;                    // everything recognised so far (for the view)
          get words(): number;

          start(actor: JarvisActor): Promise<void>;
          end(reason: EndReason): Promise<void>;
      }

      export function formatElapsed(ms: number): string;   // SPEC_REC_STATUSBAR

   **States:** ``idle`` → ``starting`` → ``running`` → ``finishing`` → ``idle``. A start is
   accepted only in ``idle``. A recording counts as *running* from ``running`` until it is
   ``idle`` again, so ``finishing`` belongs to it: the red circle, the StatusBar item and the
   view stay, a second start is refused, and the end button has no effect
   (``REQ_REC_BUTTON`` AC-5, ``REQ_REC_LIVEVIEW`` AC-7).

   **``end`` by state** (the promise it returns always resolves when the session is ``idle``):

   * ``idle``: nothing to do.
   * ``starting``: only ``'shutdown'`` acts: it cancels the start (below). ``'user'`` is ignored
     (the end button does not exist yet); ``'breakdown'`` is not used while starting, a failure
     then goes through *fail*.
   * ``running``: starts the end sequence below.
   * ``finishing``: no second sequence is started; the call returns the promise of the
     sequence in progress. ``'shutdown'`` additionally ends the wait of step 3 of that
     sequence at once; a repeated shutdown changes nothing.

   **``start(actor)``** (every step that fails goes to *fail* below; the transcript file is
   created as late as possible and *fail* discards it, so a failed start leaves none):

   1. Guard: ``jarvis.recording.enabled`` is ``true``; otherwise show an information message
      and return (a keybinding can call the command although the menus hide it). Guard: state
      is ``idle``; otherwise ``showWarningMessage('A recording is already running for
      <actor>.')`` and return (``REQ_REC_BUTTON`` AC-5). State → ``starting``.
   2. Platform: ``process.platform === 'win32'``, otherwise fail with "Recording works on
      Windows only." (``REQ_REC_SPEECH`` AC-7).
   3. ``components.ensure()`` (``SPEC_REC_COMPONENTS``), with progress; failure → fail.
   4. ``engine.start()`` (``SPEC_REC_ENGINE``): model located and loaded, live session
      started; failure → fail with its reason. The engine needs 4 to 10 seconds to be ready; a
      window progress "Jarvis Recorder: starting speech recognition" covers that time.
   5. ``capture.start()`` (``SPEC_REC_CAPTURE``): both sources missing → fail. One source
      missing → ``showWarningMessage`` naming it, for example "Speaker output could not be
      captured; recording continues with the microphone." (``REQ_REC_SPEECH`` AC-1).
   6. ``transcriptFile.create(actor)`` (``SPEC_REC_TRANSCRIPTFILE``); failure → fail.
   7. Wire ``capture`` data into ``engine.push``, ``engine`` text into ``transcriptFile.append``
      and the view. State → ``running``; ``startedAt = Date.now()``;
      ``setContext('jarvis.recordingRunning', true)``; set the mark (``SPEC_REC_BUTTON``); show
      the StatusBar item; open the view with focus kept (``SPEC_REC_LIVEVIEW``); start the log
      timer (``LOG_INTERVAL_MS``) and the tick timer (``TICK_MS = 1000``). The session owns both
      timers and stops them at ``idle``. Every tick fires ``onDidChange``; the StatusBar item
      and the view take the elapsed time from the session. A failure in this step goes to
      *fail*.

   **Failures during the start (cancellation):** the session subscribes to the failure events
   of a component when it creates it, before it awaits the component's start: the engine's
   ``onFailure``, the failure, loss and exit events of the capture helper
   (``SPEC_REC_CAPTURE``) and write errors of the transcript file. The first failure while the
   state is ``starting`` cancels the start: its reason is kept, the components that already run
   are stopped (which settles their pending awaits), and each step checks after its await
   whether the start was cancelled and then goes to *fail*. A component whose start completes
   after the cancellation is stopped at once. The same events while ``running`` are a
   breakdown. A start that waits on a component that never answers fails by timeout: the
   engine after 60 seconds (``SPEC_REC_ENGINE``), the capture helper after
   ``CAPTURE_READY_TIMEOUT_MS = 15000`` (``SPEC_REC_CAPTURE``). There is no watchdog while
   ``running`` (D-26).

   **fail(reason):** idempotent; stop what was started (capture, engine); a transcript file
   created in step 6 is closed and deleted (``transcriptFile.discard()``);
   ``showErrorMessage('Recording not started: <reason>')``, state → ``idle``. A cancellation by
   shutdown is silent: no message, no file, no notice to the Actor.

   **``end(reason)``** in ``running`` (one sequence for all three reasons; the other states
   are covered above):

   1. State → ``finishing``; ``endedAt = Date.now()``; tell the view and the StatusBar.
   2. ``capture.stop()``; the remaining chunks go to the engine.
   3. ``engine.finish()`` and wait for the final result. The wait has a deadline of
      ``FINISH_TIMEOUT_MS = 20000`` from the start of the step and ends earlier when the
      engine has failed or a shutdown arrives. A sequence started by ``'shutdown'`` does not
      wait at all, and a shutdown during the wait leaves it at once; in both cases the
      step ends with ``engine.dispose()``, so no further recognition result is awaited or
      used (D-56).
   4. ``transcriptFile.close()``.
   5. Dispatch (``SPEC_REC_DISPATCH``): one message to the Actor, whatever the reason.
   6. Remove the mark, ``setContext('jarvis.recordingRunning', false)``, hide the StatusBar
      item, stop both timers, tell the view it is done, state → ``idle``.

   Steps 2 to 5 are each guarded: an error is logged and the sequence goes on. Step 6 runs in
   a ``finally``, so the session always returns to ``idle``, for example when ``sendMessage``
   throws for an ambiguous Actor name.

   **Breakdown:** the engine fails (``SPEC_REC_ENGINE``), the capture process exits or loses
   both sources (``SPEC_REC_CAPTURE``), or the transcript file cannot be written
   (``SPEC_REC_TRANSCRIPTFILE``). The first of these calls
   ``showErrorMessage('Recording ended: <reason>. What was recognised so far is saved in
   <path>.')`` and then ``end('breakdown')``. There is no watchdog for a silent stall; the word
   count in the view shows it (D-26).

   **Shutdown:** close means exit (D-56). ``deactivate()`` sets ``shuttingDown`` and awaits
   ``end('shutdown')``, whatever the state: ``starting`` is cancelled silently, ``running``
   runs the end sequence without the wait of step 3, ``finishing`` joins the sequence in
   progress and ends its wait at once, ``idle`` returns at once. No timer or time budget
   exists for it. What follows the wait are the local operations of steps 4 and 5: the file
   is closed and the message is attempted. ``deactivate()`` does not return before they are
   done, but VS Code may end the host earlier, so the message is not guaranteed. The text the
   engine has delivered is handed to the write queue of the transcript file as it arrives
   (``SPEC_REC_TRANSCRIPTFILE``) and step 4 waits for that queue, as it does after a normal end;
   no extra wait is added. A host exit before the queue is empty loses the text still in it, as
   it loses audio still on its way and results not yet delivered. Saving is therefore best
   effort: the transcript may lack its last words and more, and the 20-second promises do not
   apply (``REQ_REC_BUTTON`` AC-6). The order stays close, dispatch, because the message needs
   the closed file. Closing the view during shutdown raises no question
   (``SPEC_REC_LIVEVIEW``).

   **Word count:** a word is a run of non-whitespace characters in the text the engine
   delivered; the count is kept across delta boundaries (a delta may end inside a word). Time
   marks written by the transcript file are not counted. ``text`` holds everything written
   to the file, marks included, as returned by ``transcriptFile.append``.

   **Log:** the ``Jarvis Recorder`` log channel gets start and end lines (reason, path) and
   every ``LOG_INTERVAL_MS = 10000`` a line ``[Recording] words=<n>``. The recognised text is
   never logged (``REQ_REC_SPEECH`` AC-6).

   **Acceptance Criteria:**

   * AC-1: ``RecordingSession`` has the four states above; ``start`` is accepted only in
     ``idle``; ``end`` acts by state as described, and a second end sequence never starts.
   * AC-2: The start steps run in the order above; a failing step stops what was started,
     discards a transcript file already created, and shows the reason, so a failed start
     leaves no file (``REQ_REC_FAILURE`` AC-1, ``REQ_REC_TRANSCRIPTFILE`` AC-2).
   * AC-3: ``jarvis.recordingRunning`` is ``true`` from ``running`` until ``idle`` and ``false``
     otherwise; the mark and the StatusBar item follow the same span.
   * AC-4: ``end`` runs one sequence for ``user``, ``breakdown`` and ``shutdown``; the Actor is
     notified once after the file is closed (``REQ_REC_DISPATCH`` AC-1), also after a
     breakdown (``REQ_REC_FAILURE`` AC-4); at shutdown the message is attempted without a
     guarantee (``REQ_REC_BUTTON`` AC-6).
   * AC-5: A breakdown shows an error at once and keeps the text recognised so far
     (``REQ_REC_FAILURE`` AC-2, AC-3). Losing both audio sources and a failed file write count
     as breakdowns.
   * AC-6: The first-start preparation shows progress (``REQ_REC_SPEECH`` AC-8).
   * AC-7: The log holds the word count every 10 seconds and never the recognised text.
   * AC-8: ``formatElapsed`` is the only elapsed-time formatter.
   * AC-9: The session owns the one-second tick timer from ``running`` to ``idle``; the
     StatusBar item and the view are refreshed from it (``REQ_REC_STATUSBAR`` AC-3).
   * AC-10: ``end`` always reaches ``idle``: an error in a step is logged, the later steps still
     run, and the cleanup of step 6 is in a ``finally``.
   * AC-11: A second ``end`` while ``finishing`` returns the promise of the sequence in
     progress. A shutdown during ``finishing`` ends the remaining wait at once (a repeated
     shutdown changes nothing), and ``deactivate()`` awaits the completion: file closed and
     message attempted.
   * AC-12: A failure of the engine, the capture helper or the transcript file during
     ``starting`` cancels the start (components stopped, file discarded, error shown,
     ``idle``); a component that finishes starting after the cancellation is stopped at once.
   * AC-13: A shutdown during ``starting`` cancels the start silently: no error, no file, no
     message.
   * AC-14: A shutdown during ``running`` runs the end sequence without the wait for the final
     result: the engine is disposed, the file is closed after the queued writes (the text
     received so far, best effort), and the message is attempted.

   **Verify first:** whether ``deactivate()`` returns in time for steps 4 and 5 (local file
   and message operations, no wait) on a normal window close and on a reload.


.. spec:: Audio Capture Helper
   :id: SPEC_REC_CAPTURE
   :status: approved
   :links: REQ_REC_SPEECH; REQ_REC_FAILURE

   **Description:**
   ``src/capture.ts`` starts a PowerShell helper, ``resources/capture.ps1`` (a script with an
   embedded C# type compiled with ``Add-Type`` in memory), that opens the default microphone
   and the default speaker output (WASAPI loopback) and writes one mixed stream. The script
   ships in the VSIX: ``packages/recorder/.vscodeignore`` does not exclude ``resources/``.

   **Process:** ``spawn(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
   '-File', scriptPath], { windowsHide: true })``; ``shell`` is ``pwsh`` when it is found on
   ``PATH``, otherwise ``powershell`` (PowerShell 7 or newer is recommended in the README;
   5.1 is not verified).

   **Contract:**

   * ``stdout``: raw PCM, 16-bit little endian, mono, 16 kHz, continuous, in blocks of 4096
     samples (8192 bytes). Both sources are converted to mono at 16 kHz, summed and
     clipped. The loopback delivers no data during silence, so the helper fills its share
     with zeros and keeps the stream running on its own clock.
   * ``stderr``: one JSON object per line.
     ``{"event":"ready","mic":true,"speaker":false}`` once, after both sources were tried;
     ``{"event":"source","name":"mic"|"speaker","state":"lost"}`` when one source fails
     later; ``{"event":"error","message":"..."}``.
   * ``stdin``: closing it asks the helper to stop; it writes the last block and exits with
     code 0. The parent kills the process after 2 seconds if it has not exited.

   **Parent behaviour:** ``ready`` with both sources ``false`` is a failed start, and so is the
   absence of ``ready`` within ``CAPTURE_READY_TIMEOUT_MS = 15000`` (the helper is killed; start-up
   was measured at 1.2 to 3.3 s). ``ready``
   with one ``false``, or a later ``lost`` for one source, produces the warning of
   ``SPEC_REC_SESSION`` step 5 and the recording goes on. ``lost`` for the second source, an
   ``error`` event, or an exit before the stop was asked for is a breakdown. The parent
   forwards ``stdout`` chunks to the engine and keeps nothing.

   **Acceptance Criteria:**

   * AC-1: The helper writes only the stream above to ``stdout``; neither the helper nor the
     parent writes audio to disk (``REQ_REC_SPEECH`` AC-3).
   * AC-2: A missing source is reported in ``ready`` or as ``lost`` and does not stop the
     helper while the other source works (``REQ_REC_SPEECH`` AC-1).
   * AC-3: Stopping is done by closing ``stdin``; a helper that does not exit within 2 seconds
     is killed.
   * AC-4: An exit that was not asked for, or the loss of both sources, is a breakdown
     (``REQ_REC_FAILURE`` AC-2).
   * AC-5: A helper that sends no ``ready`` within 15 seconds fails the start. Its failure,
     loss and exit events reach the session from the moment the helper is created
     (``SPEC_REC_SESSION``, failures during the start).

   **Verify first:** mixing and resampling (sources arrive as 48 kHz, 2 or 4 channels, float),
   the silence fill, and that the script runs under ``pwsh`` and ``powershell`` with the
   corporate AppLocker and language-mode rules.


.. spec:: Recognition Engine in a Child Process
   :id: SPEC_REC_ENGINE
   :status: approved
   :links: REQ_REC_SPEECH; REQ_REC_FAILURE

   **Description:**
   The recognition runs in the Foundry Local SDK, the same engine as VS Code's built-in voice
   input (user decision), in a child process of the extension host: run in the host the SDK
   stalls the event loop by up to 0.3 s (0.09 s measured with the child process), the loaded
   model takes about 1 GB of memory (0.8 GB resident set in Research's run, 1.06 GB working
   set in the Dev Engineer's 75-second run), which is better kept out of the host, and a crash in
   the host would take every extension down. The rest of the recorder sees only this
   interface, so running the engine in the host stays a fallback:

   .. code-block:: typescript

      interface TranscriptionEngine {
          start(): Promise<void>;               // model loaded, live session started
          push(chunk: Uint8Array): void;        // PCM16 LE mono 16 kHz
          finish(): Promise<void>;              // flush; resolves when the final result is in
          dispose(): void;                      // kill the worker; no failure; a pending finish() resolves
          readonly onText: vscode.Event<string>;     // text deltas as they arrive
          readonly onFailure: vscode.Event<string>;  // reason, fired at most once
          readonly failure: string | undefined;      // the reason once raised, for a check after an await
      }

   **Worker:** ``src/engineWorker.ts``, bundled as a second esbuild entry to
   ``out/engineWorker.js``. It is started with ``child_process.fork(workerPath, [], { env: {
   ...process.env, ELECTRON_RUN_AS_NODE: '1', ORT_TELEMETRY_DISABLED: '1' }, serialization:
   'advanced', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })``. The SDK is not bundled: the worker
   loads it from the directory of ``SPEC_REC_COMPONENTS`` with a dynamic ``import()`` of
   ``file://<sdkDir>/dist/index.js``; the package is ESM-only, so ``require`` does not work.

   **IPC messages:**

   * parent → worker: ``{ t: 'init', sdkDir, modelDir, language: 'auto' }``,
     ``{ t: 'audio', data: Uint8Array }``, ``{ t: 'finish' }``.
   * worker → parent: ``{ t: 'ready' }``, ``{ t: 'text', delta }``, ``{ t: 'final', text }``,
     ``{ t: 'error', message }``.

   **Worker flow** (SDK 2.1.0; the calls are taken from the SDK's README and from its own
   tests, ``sdk_v2/js/test/audio-session.test.ts``, which stream PCM through an ``AudioSession``
   with a Nemotron streaming model; read, not run by us):
   ``FoundryLocalManager.create({ appName: 'jarvis-recorder', modelCacheDir,
   disableNonessentialTelemetry: true })`` with ``modelCacheDir = <globalStorage>/foundry-local/cache``
   (our own folder, which the worker derives as ``<dirname(sdkDir)>/cache`` instead of
   receiving it in ``init``: the registration persists there, so nothing is written into VS
   Code's cache); ``manager.getCatalog(CatalogType.Local)``; ``getModelVariant(id)``, and only when
   the model is not registered yet ``registerModel(<modelDir>/Microsoft/
   nemotron-3.5-asr-streaming-0.6b-generic-cpu-3/v3, id, metadata)`` where ``id`` has the form
   ``<name>:<version>`` (``nemotron-3.5-asr-streaming-0.6b-generic-cpu:3``) and ``metadata`` is a
   ``MutableModelInfo`` with the task ``automatic-speech-recognition`` (and, as in Research's
   run, ``DisplayName`` and ``ModelType: 'nemotron_speech'``); a second registration throws
   "already registered". Then ``model.load()`` (the model is loaded in place, not copied).
   The public catalog is never asked for models, so no network is used.

   **Live session** (``AudioSession``): ``new AudioSession(model)`` (the model must carry the
   task above); a ``Request`` holding ``Item.audioDescriptor('pcm', 16000, 1)`` and one
   ``ItemQueue``, with the option ``additionalOptions: { language: 'auto' }``;
   ``stream = session.processStreamingRequest(request)``, started at once; then ``ready`` is
   sent. Each audio chunk from the parent is pushed with ``queue.push(Item.bytes(copy))``, a
   copy of its own and not a view. Every ``speechSegment`` item of the stream is forwarded as
   ``text`` (its ``text``). On ``finish``: ``queue.markFinished()``, drain the stream, ``await
   stream.response`` (a ``speechResult`` with the aggregated text), send ``final``, then
   dispose queue, session and manager.

   **Choice of API:** ``AudioSession`` is the target. The older
   ``createAudioClient().createLiveTranscriptionSession()`` is marked deprecated in 2.1.0
   (removal announced for the end of 2026) and is only the fallback. The removal does not
   reach us while the version is pinned in the manifest (``SPEC_REC_COMPONENTS``); it matters
   at the next version change. Research ran both in a child process on 2.1.0 (measured
   below) and both work, so the choice is settled for the Dev Engineer: ``AudioSession``,
   and the deprecated call only if ``AudioSession`` misbehaves with the real audio source
   (D-46). Only the worker contains this choice, the interface above does not change.

   **Use of results:** the file and the view receive the text of the ``speechSegment`` items
   (all measured items were of kind ``none``, that is text deltas). ``final`` only ends
   ``finish()``; its text is not used (D-35).

   **Language tags:** 2.1.0 puts tags such as ``<de-DE>`` into the text, as delta events of
   their own after pauses (3 of 133 events in a 35-second clip) and also into the aggregated
   text; 1.2.3 did not. They are left in: the text is written as the engine delivers it, and the
   Actor may use or ignore the tags (D-47). They are not reliable: on the synthetic English
   samples the tag read ``<de-DE>``.

   **Failure:** ``error``, an unexpected ``exit`` or ``disconnect`` of the worker, a rejected
   audio write, or ``init`` not answered with ``ready`` within 60 seconds raises ``onFailure``
   once and ends the engine; later ``push`` calls are ignored and ``finish()`` resolves at
   once (``REQ_REC_FAILURE`` AC-2).

   **Acceptance Criteria:**

   * AC-1: The engine runs in a child process; the extension host loads no native SDK code.
   * AC-2: At most one worker and one live session exist at a time (the SDK allows one
     session per loaded model).
   * AC-3: Audio reaches the worker only through IPC; nothing is written to disk
     (``REQ_REC_SPEECH`` AC-3).
   * AC-4: Recognition is local: the worker makes no network call for recognition
     (``REQ_REC_SPEECH`` AC-2).
   * AC-5: ``finish()`` resolves after ``final``, after a failure, after ``dispose()`` (which
     is an expected end of the worker and raises no failure), or after the timeout of
     ``SPEC_REC_SESSION``.
   * AC-6: Language is ``auto``; no language setting exists (``REQ_REC_SPEECH`` AC-5).
   * AC-7: Nothing in the path delays text beyond the engine itself: the helper writes blocks
     of 4096 samples (256 ms), the chunks are relayed and the deltas are written at once, with
     no buffering of ours. The 20-second bound of ``REQ_REC_SPEECH`` AC-4 therefore rests on the
     engine's own delay, which was measured at under 0.3 s (below).
   * AC-8: The SDK's telemetry is switched off through ``disableNonessentialTelemetry`` and
     ``ORT_TELEMETRY_DISABLED``; a minimal process-info event may still be sent (Research).
   * AC-9: The engine's text is passed on unchanged: no tag or other engine output is removed
     or interpreted. Time marks are added by the transcript file (``SPEC_REC_TRANSCRIPTFILE``).
   * AC-10: The emitted worker, ``out/engineWorker.js``, loads the SDK with a native dynamic
     ``import()`` in every supported build path (a plain compile of the package as well as the
     bundle); a compile that turns it into ``require`` is a defect. A test starts the emitted
     file and checks that it loads an ESM package from an SDK directory and reaches ``ready``,
     so that a build that cannot load the SDK fails before any manual test.
   * AC-11: A failure is kept in ``failure`` once raised, so that a check after an await, or a
     subscriber that attaches late, still sees it; the session subscribes before it calls
     ``start()`` (``SPEC_REC_SESSION``).

   **Measured** (Research, 2026-10-02: a 35-second WAV fed in real time in blocks of 4096
   samples; SDK 2.1.0; worker as a child process of the extension host started with
   ``ELECTRON_RUN_AS_NODE``; model in place from VS Code's cache): ready after 4 to 10 s; the
   child held about 0.8 GB (resident set; the Dev Engineer measured a working set of 1.06 GB in
   a 75-second live run); ``AudioSession``: text 4 to 263 ms behind the audio (median 105
   ms), end result 0.3 to 0.4 s after ``markFinished``; the deprecated call: median 44 ms, at
   most 315 ms, end 0.3 to 0.56 s; the host event loop stalled at most 0.09 s. With SDK 1.2.3 a
   killed child showed as an ``exit`` event after 0.2 s with the host unchanged.

   **Verify first:** (1) The same with the real source: the microphone and speaker helper
   (``SPEC_REC_CAPTURE``) feeding the live session, and a long recording (an hour: memory of
   the child and the delay must stay flat; only 35 seconds were measured).
   (2) That killing or crashing the child with 2.1.0 shows as ``exit`` in the parent. (3)
   Whether a ``speechSegment`` ever carries a time stamp or a kind other than ``none`` (none
   seen). (4) German and English with real
   speech: the tag read ``<de-DE>`` also for the English part of the synthetic samples, which
   says nothing about real speech; the user tests this at the end. (5) The DLL search when
   the path holds non-ANSI characters (``%APPDATA%``).


.. spec:: Speech Components
   :id: SPEC_REC_COMPONENTS
   :status: approved
   :links: REQ_REC_SPEECH; REQ_REC_FAILURE

   **Description:**
   ``src/components.ts`` makes sure that what the engine needs is on the machine, once, at
   the first start. Nothing of it is in the VSIX (``SPEC_MOD_REC_PKG`` AC-5).

   **Manifest:** ``resources/components.json`` pins the SDK version and every download: ``{ id,
   version, url, sha512, bytes, extract: [{ from, to }] }``. The three entries (Research, SDK
   2.1.0, win-x64):

   * npm ``foundry-local-sdk@2.1.0`` (tarball 34.3 MB, all platforms): extract
     ``package/dist/**``, ``package/package.json`` (the SDK reads it at import and throws without
     it) and ``package/prebuilds/win32-x64/*`` (``foundry_local_node.node``,
     ``foundry_local_preload.node``, ``foundry_local.dll``,
     ``Microsoft.Windows.AI.MachineLearning.dll``).
   * NuGet ``Microsoft.ML.OnnxRuntime@1.30.0`` (157.2 MB): extract
     ``runtimes/win-x64/native/onnxruntime.dll``.
   * NuGet ``Microsoft.ML.OnnxRuntimeGenAI.Foundry@0.17.1`` (34.8 MB): extract
     ``runtimes/win-x64/native/onnxruntime-genai.dll``.

   The two DLLs go next to ``foundry_local.dll``, into ``<target>/prebuilds/win32-x64/`` (the
   loader preloads ONNX Runtime from there; no ``libraryPath`` is needed). About 226 MB are
   downloaded once (about 30 seconds measured through the proxy) for about 39 MB on disk. Sizes
   are decimal MB. The Dev Engineer takes the SHA-512 values from the official registries when the
   manifest is written; the extension never takes a hash from the response it checks.
   Changing a version means changing the manifest.

   **``ensure()``:**

   1. Check the model first (see *Model location*): a missing model fails the start here,
      before anything is downloaded. Then the target directory
      ``<globalStorage>/foundry-local/<sdkVersion>/``: if it holds the marker file
      ``.complete`` with the hash of the manifest, return.
   2. ``vscode.window.withProgress({ location: Notification, title: 'Jarvis Recorder:
      preparing speech recognition (one-time download, about 230 MB)' })`` and report megabytes done of
      total.
   3. For each entry: download with the ``https`` module (VS Code's proxy handling applies in
      the extension host) to a temporary file; only ``https`` URLs and only the hosts
      ``registry.npmjs.org`` and ``*.nuget.org`` (including redirects, at most five); check
      the SHA-512 against the manifest; a mismatch deletes the file and fails.
   4. Extract (tar for npm, zip for NuGet) with a small bundled library or a minimal reader of
      our own (Zip64 is not needed: the packages are far below its limits); every entry path is
      resolved against the target directory and an entry that would land outside it is
      rejected.
   5. Write ``.complete``; delete the temporary files.

   **Model location:** ``modelDir`` is the cache of VS Code's dictation,
   ``<VS Code data directory>/chatDictationModels``, derived from the extension's
   ``globalStorageUri`` (three directories up, then ``chatDictationModels``). The model is
   present when the folder ``Microsoft/nemotron-3.5-asr-streaming-0.6b-generic-cpu-3/v3``
   below it holds ``genai_config.json``. If not, the start fails with: "The speech model was
   not found. Use VS Code's voice dictation once, or import the model with 'Chat: Install
   Dictation Model from Local Package...', then try again. This works only with the local
   dictation model, not with the cloud model." (D-24). The extension never downloads the model.

   **Acceptance Criteria:**

   * AC-1: Components are fetched only from the manifest and only over ``https`` from the
     allowed hosts; a file is used only after its SHA-512 matched.
   * AC-2: Extraction never writes outside the target directory.
   * AC-3: With ``.complete`` present nothing is downloaded and the start is not delayed.
   * AC-4: The first start shows download progress; a failure fails the start with the
     reason (``REQ_REC_SPEECH`` AC-8, ``REQ_REC_FAILURE`` AC-1).
   * AC-5: The model is read from the VS Code dictation cache and never downloaded or copied;
     a missing model fails the start with the message above.

   **Proven** (Research, 2026-10-02): the assembly end to end in the extension host through the
   proxy (the three downloads, extraction, loading addon and DLLs from the target directory
   without ``libraryPath``, creating the manager).

   **Verify first:** (1) The DLL search when the path holds non-ANSI characters. (2) Optional:
   whether range requests for the zip directory can avoid fetching the whole packages (would
   save about 180 MB). (3) The derivation of ``modelDir`` from ``globalStorageUri`` for a
   normal, Insiders and portable VS Code. (4) The licence of
   ``Microsoft.Windows.AI.MachineLearning.dll`` (``license.txt`` not read) and the terms of npm
   and NuGet (D-28). (5) That the registry's integrity value of 2.1.0 equals the SHA-512 in
   the manifest.


.. spec:: Transcript File
   :id: SPEC_REC_TRANSCRIPTFILE
   :status: implemented
   :links: REQ_REC_TRANSCRIPTFILE

   **Description:**
   ``src/transcriptFile.ts`` creates and writes the transcript.

   **Path:** ``<actor.folder>/transcripts/<YYYY-MM-DD_HHmmss>.txt``, local time of the
   moment the recording became ``running`` (``actor.folder`` is the absolute Actor folder of
   ``JarvisActor``). The folder is created with ``recursive``. The file is opened with the
   flag ``wx``; when it exists, the suffix ``-2``, ``-3`` and so on is added before the
   extension (at most 99) so that no file is overwritten, also after a quick restart.

   **Writing:** UTF-8 without BOM. ``append(delta, at: Date)`` returns the text it wrote (a
   time mark when one is due, then the delta) so that the view shows exactly what the file
   holds. The delta is written as it was received, without speaker labels, one write at a time
   (a promise chain): ``append`` returns without waiting for the write, and ``close()`` waits for
   the chain before it closes the handle. A failed write
   is a breakdown (``SPEC_REC_SESSION``). ``discard()`` closes the handle
   and deletes the file (used only by a failed start, ``SPEC_REC_SESSION``). The file shows in the
   Actor's Files category after the next scan (``US_ACTOR_FILES_TREE``); no code is needed for
   that.

   **Time marks:** the file object keeps ``lastMarkAt``. A mark is due when nothing was
   written yet, or when ``at - lastMarkAt >= 60000`` ms. The mark is the local time of ``at``
   as ``[HH:MM]`` (hours and minutes of ``Date`` in the local zone, two digits each) followed by a
   line break; unless it is the first text of the file, a line break comes before it. Time
   marks are written only when text arrives, so silence produces none, and a mark may fall
   inside a sentence (the engine reports no sentence boundaries). The time is the one at which
   the host received the text, 0.1 to 0.3 s after the speech. The engine gives no time
   stamps of its own.

   **Acceptance Criteria:**

   * AC-1: One file per recording at the path above; the name carries the start date and time
     (``REQ_REC_TRANSCRIPTFILE`` AC-1).
   * AC-2: An existing file is never overwritten.
   * AC-3: The file is created late in the start and a failed start discards it, so none is
     left behind; recognised text is appended while the recording runs
     (``REQ_REC_TRANSCRIPTFILE`` AC-2).
   * AC-4: A write error raises a breakdown.
   * AC-5: A time mark ``[HH:MM]`` with the local time is written before the first text and
     before the first text after each full minute since the previous mark; silence produces
     none (``REQ_REC_TRANSCRIPTFILE`` AC-4).


.. spec:: Transcript View
   :id: SPEC_REC_LIVEVIEW
   :status: approved
   :links: REQ_REC_LIVEVIEW; REQ_REC_BUTTON; REQ_REC_STATUSBAR

   **Description:**
   ``src/liveView.ts`` owns one ``WebviewPanel`` that shows the running transcript. The
   HTML, a few styles and about forty lines of script are generated in the host as one
   string; no separate webview build is needed.

   **Placement:** the column is ``Math.max(2, vscode.window.tabGroups.all.length)``: the
   Secondary rule of ``REQ_MSG_EDITORPLACEMENT`` AC-3 in its sense, computed here because
   the core does not export it (D-12). If that rule changes in the core, this line follows.
   The view is a tab like any other in that group; a chat delivered there may hide it, and
   the StatusBar item or the hover action brings it back. It is not excluded from the group
   count the way the flow diagram is (``REQ_MSG_EDITORPLACEMENT`` AC-11).

   **Panel:** ``createWebviewPanel('jarvis.recorder.transcript', 'Recording: <Actor>', {
   viewColumn, preserveFocus: true }, { enableScripts: true })``. The page sets the content
   security policy ``default-src 'none'; style-src 'nonce-…'; script-src 'nonce-…'``. Text is
   added with ``textContent``, never as HTML, because the transcript is untrusted speech
   content.

   **Layout:** at the top a bar with the primary button "End recording", and next to it the
   Actor name, the elapsed time and the word count; below it a framed area, filled with
   the transcript, scrolled to the end after every addition. VS Code theme variables supply
   the colours.

   **Messages:**

   * view → host: ``{ type: 'ready' }`` after load, ``{ type: 'end' }`` when the button is
     pressed.
   * host → view: ``{ type: 'init', actor, text, words, elapsed, state }`` on ``ready``
     (the host keeps the text in ``RecordingSession.text``, so a reopened view shows
     everything), ``{ type: 'text', delta, words }``, ``{ type: 'tick', elapsed }`` on every
     tick of the session timer (``SPEC_REC_SESSION``; the one ``formatElapsed``), ``{ type: 'state', state:
     'finishing' | 'done' }``.

   **Button:** ``running``: enabled, press posts ``end`` and the host calls
   ``session.end('user')``. ``finishing``: disabled, label "Finishing…". ``done``: disabled,
   label "Recording ended", the final text stays until the user closes the view.

   **Show:** ``show()`` (called by ``jarvis.showRecording``): if the panel exists,
   ``reveal(undefined, false)`` (shown and focused where it is, also when hidden behind another
   tab); otherwise create it at the column above with focus. The automatic open at the start
   uses ``preserveFocus: true``. A panel of an earlier, finished recording is disposed
   before the new one is created.

   **Close:** on ``onDidDispose``, only while the session is ``running`` and not shutting
   down: ``showWarningMessage('End the recording for <Actor>?', { modal: true }, 'End
   recording', 'Keep recording')``. "End recording" calls ``session.end('user')``; "Keep
   recording" or dismissing the dialog reopens the view with ``show()``. In ``finishing``,
   ``idle`` and during shutdown nothing is asked.

   **Acceptance Criteria:**

   * AC-1: At the start the view opens in the column above with the focus left where it was
     (``REQ_REC_LIVEVIEW`` AC-1).
   * AC-2: The page shows the end button, Actor, elapsed time and word count at the top and the
     text below, scrolled to the newest (``REQ_REC_LIVEVIEW`` AC-2, AC-3).
   * AC-3: The button ends the recording and is disabled from ``finishing`` on
     (``REQ_REC_LIVEVIEW`` AC-4, AC-7).
   * AC-4: Closing the view while ``running`` asks the question of ``REQ_REC_LIVEVIEW`` AC-5;
     "no" reopens it. At no other time is a question asked.
   * AC-5: ``show()`` reveals and focuses the existing panel or creates one, and the page then
     holds all text so far (``REQ_REC_LIVEVIEW`` AC-6).
   * AC-6: Transcript text enters the page only through ``textContent``.

   **Verify first:** that no close question appears, and that none blocks the exit, when VS
   Code closes or reloads the window.


.. spec:: Transcript Dispatch
   :id: SPEC_REC_DISPATCH
   :status: implemented
   :links: REQ_REC_DISPATCH; SPEC_ENG_API

   **Description:**
   ``SPEC_REC_SESSION`` ``end`` step 5 sends one message through the core API
   (``SPEC_ENG_API`` AC-8). Nothing is polled and no job exists.

   .. code-block:: typescript

      api.sendMessage(actor.name, 'Recorder',
          `A new meeting transcript is available: ${transcriptFile.path}`);

   The message holds the absolute path, not the content; the Actor reads the file when it
   wants to. The core resolves ``actor.name`` (``SPEC_ENG_API`` AC-8): an ambiguous name makes
   it show an error and throw, which the recorder logs; the message is then not queued. It
   is delivered like any queued message, so an Actor without auto-delivery gets it when the
   user delivers it (D-22). The message is sent only if a transcript file was created.

   **Acceptance Criteria:**

   * AC-1: One message per recording, after the file is closed, whatever ended the recording
     (``REQ_REC_DISPATCH`` AC-1).
   * AC-2: The message text names the new transcript and contains its full path
     (``REQ_REC_DISPATCH`` AC-2).
   * AC-3: A start that failed sends nothing.
