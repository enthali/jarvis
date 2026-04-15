Recording Requirements
======================

.. req:: Recording Enabled Setting
   :id: REQ_REC_ENABLE
   :status: implemented
   :priority: mandatory
   :links: US_REC_ENABLE

   **Description:**
   The extension SHALL provide a ``jarvis.recording.enabled`` setting in a dedicated
   "Recording" settings group that enables or disables the entire Recording feature.

   **Acceptance Criteria:**

   * AC-1: The setting type SHALL be ``boolean`` with default value ``false``
   * AC-2: The setting SHALL belong to a settings group titled "Recording" (not under PIM)
   * AC-3: When ``false``, no Start/Stop Recording buttons SHALL appear in tree views
   * AC-4: When ``true``, Start/Stop buttons SHALL become visible on Project and Event nodes


.. req:: Whisper Path Setting
   :id: REQ_REC_CONFIG
   :status: implemented
   :priority: mandatory
   :links: US_REC_CONFIG

   **Description:**
   The extension SHALL provide a ``jarvis.recording.whisperPath`` setting in the
   "Recording" group that specifies the absolute path to the Whisper project folder.

   **Acceptance Criteria:**

   * AC-1: The setting type SHALL be ``string`` with default value ``""``
   * AC-2: The setting SHALL belong to the same "Recording" settings group as ``REQ_REC_ENABLE``
   * AC-3: When starting a recording, the extension SHALL verify the path exists and show
     an error message if it does not
   * AC-4: The path SHALL be used to locate ``recorder.py`` (``<whisperPath>/recorder.py``)
     and the output folder (``<whisperPath>/input/``)


.. req:: Start/Stop Recording Buttons
   :id: REQ_REC_BUTTON
   :status: implemented
   :priority: mandatory
   :links: US_REC_CAPTURE; US_REC_ENABLE

   **Description:**
   The extension SHALL show inline action buttons on Project and Event tree nodes for
   starting and stopping recordings.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.startRecording`` command (icon: ``$(circle-outline)``) SHALL appear
     as an inline action on Project and Event nodes when ``jarvis.recording.enabled`` is
     ``true`` and no recording is active
   * AC-2: A ``jarvis.stopRecording`` command (icon: ``$(circle-filled)``) SHALL appear
     as an inline action on Project and Event nodes when ``jarvis.recording.enabled`` is
     ``true`` and a recording is active
   * AC-3: The actively-recording node SHALL display a red filled-circle icon
     (``circle-filled`` with ``charts.red`` color) to visually indicate the active recording
   * AC-4: Attempting to start a second recording while one is already running SHALL show
     a warning message and not start a new recording


.. req:: Recording StatusBar Timer
   :id: REQ_REC_STATUSBAR
   :status: implemented
   :priority: mandatory
   :links: US_REC_CAPTURE

   **Description:**
   The extension SHALL show a StatusBar item during an active recording displaying the
   project name and elapsed time.

   **Acceptance Criteria:**

   * AC-1: The StatusBar item SHALL be visible only while a recording is active
   * AC-2: The text SHALL follow the format ``🔴 <projectName> — MM:SS``
   * AC-3: The elapsed time SHALL update every second
   * AC-4: Clicking the StatusBar item SHALL stop the recording (command: ``jarvis.stopRecording``)


.. req:: Recording Subprocess Management
   :id: REQ_REC_SUBPROCESS
   :status: implemented
   :priority: mandatory
   :links: US_REC_CAPTURE; US_REC_CONFIG

   **Description:**
   The extension SHALL manage the ``recorder.py`` process lifecycle including startup
   validation, state persistence, and graceful shutdown.

   **Acceptance Criteria:**

   * AC-1: Before starting, the extension SHALL verify Python is available in PATH;
     a missing Python SHALL result in an error message, not a crash
   * AC-2: Recording SHALL be started via ``child_process.spawn("python", ["recorder.py",
     "--name", <recordingName>, "--no-timestamp", "--output-dir", <whisperPath>/input/])``,
     where ``<recordingName>`` is a timestamp-prefixed, sanitized form of the project name
     (e.g. ``2026-04-15_1430_alpha``)
   * AC-3: A ``<whisperPath>/.recording.json`` file SHALL be written on start containing
     ``{ project, pid, startTime }``
   * AC-4: Stop SHALL write a ``<whisperPath>/.stop`` sentinel file, wait 500 ms,
     then delete ``.recording.json``
   * AC-5: When the extension is deactivated while a recording is active, the recording
     SHALL be stopped gracefully (``deactivate()`` hook)


.. req:: Transcript Dispatch
   :id: REQ_REC_DISPATCH
   :status: implemented
   :priority: mandatory
   :links: US_REC_DISPATCH

   **Description:**
   The extension SHALL poll ``whisperPath/output/`` for new ``.txt`` transcript files
   and dispatch each to the corresponding project session via the Message Queue.

   **Acceptance Criteria:**

   * AC-1: For each ``.txt`` file in ``output/``, the watcher SHALL check whether a
     matching sidecar ``input/<stem>.json`` exists
   * AC-2: If the sidecar exists, the watcher SHALL read the project name from it,
     append a notification message (containing the transcript file path) as a Message Queue
     entry for that project, and delete the sidecar (processed handshake)
   * AC-3: If no sidecar exists, the file SHALL be skipped (already processed)
   * AC-4: The feature SHALL be inactive when ``jarvis.recording.enabled`` is false
     or ``whisperPath`` is not set


.. req:: Recording Sidecar File
   :id: REQ_REC_SIDECAR
   :status: implemented
   :priority: mandatory
   :links: US_REC_DISPATCH; US_REC_CAPTURE

   **Description:**
   When a recording starts, a sidecar JSON file SHALL be written to
   ``whisperPath/input/<recordingName>.json`` containing the original project name.
   Deletion of this file by the watcher serves as the processed handshake.

   **Acceptance Criteria:**

   * AC-1: On recording start, ``input/<recordingName>.json`` SHALL be written with
     ``{ "project": "<originalProjectName>" }``
   * AC-2: The watcher SHALL delete the sidecar after successful dispatch
   * AC-3: If the sidecar cannot be written, recording SHALL continue (non-fatal)


.. req:: Transcript Watcher Heartbeat Job
   :id: REQ_REC_WATCHERJOB
   :status: implemented
   :priority: mandatory
   :links: US_REC_DISPATCH; US_REC_ENABLE

   **Description:**
   The ``jarvis.checkTranscripts`` command SHALL be registered as a Heartbeat job
   when recording is enabled and ``whisperPath`` is set.

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.recording.enabled == true`` and ``whisperPath`` is set, a
     ``"Jarvis: Check Transcripts"`` heartbeat job SHALL be registered with the same
     cron schedule as the rescan job
   * AC-2: When ``jarvis.recording.enabled`` is set to false or ``whisperPath`` is
     cleared, the job SHALL be unregistered
   * AC-3: Changes to ``jarvis.recording.enabled`` or ``jarvis.recording.whisperPath``
     SHALL take effect immediately without reloading the window
