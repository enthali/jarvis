Recording User Stories
======================

.. story:: Record a Meeting with One Click
   :id: US_REC_CAPTURE
   :status: implemented
   :priority: mandatory

   **As a** Jarvis user,
   **I want** to start and stop a meeting recording with a single click on a Project or Event node,
   **so that** the audio file is ready for later transcription.

   **Acceptance Criteria:**

   * AC-1: A Start Recording button appears on Project and Event nodes when the feature is enabled
   * AC-2: Clicking Start Recording begins audio capture via ``recorder.py``
   * AC-3: A StatusBar item shows the recording in progress with elapsed time
   * AC-4: Clicking Stop Recording (button or StatusBar) stops the capture gracefully
   * AC-5: Only one recording can run at a time; starting a second recording shows a warning


.. story:: Enable / Disable Recording Feature
   :id: US_REC_ENABLE
   :status: implemented
   :priority: mandatory

   **As a** Jarvis user,
   **I want** to enable or disable the Recording feature (default: off),
   **so that** it is only active when I consciously switch it on.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.recording.enabled`` setting (boolean, default ``false``) controls the feature
   * AC-2: When disabled, no recording buttons appear in the tree views
   * AC-3: When enabled, Start/Stop buttons appear on Project and Event nodes


.. story:: Configure Whisper Project Path
   :id: US_REC_CONFIG
   :status: implemented
   :priority: mandatory

   **As a** Jarvis user,
   **I want** to configure the path to the Whisper project folder,
   **so that** Jarvis knows where ``recorder.py`` and the ``input/`` subfolder are located.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.recording.whisperPath`` setting (string, default ``""``) stores the path
   * AC-2: When starting a recording, Jarvis validates the path exists; an error message is shown if not
   * AC-3: The path is used to locate ``recorder.py`` and the ``input/`` output folder


.. story:: Auto-Dispatch Transcripts to Project Session
   :id: US_REC_DISPATCH
   :status: implemented
   :priority: mandatory

   **As a** Jarvis user,
   **I want** finished transcripts to be automatically forwarded to the corresponding project session,
   **so that** meeting minutes appear in the right context without manual steps.

   **Acceptance Criteria:**

   * AC-1: When Whisper finishes a transcription, a message is dispatched to the project's Message Queue entry
   * AC-2: The message notifies the session of the transcript file path so the LLM can process it on demand
   * AC-3: The watcher only runs when recording is enabled and ``whisperPath`` is configured
   * AC-4: No duplicate messages are dispatched for the same transcript
