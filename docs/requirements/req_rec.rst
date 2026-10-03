Recording Requirements
======================

.. req:: Recording Enabled Setting
   :id: REQ_REC_ENABLE
   :status: implemented
   :priority: mandatory
   :links: US_REC_ENABLE

   **Description:**
   The extension SHALL provide a ``jarvis.recording.enabled`` setting in a dedicated
   "Jarvis Recorder" settings group that enables or disables the entire Recording feature.

   **Acceptance Criteria:**

   * AC-1: The setting type SHALL be ``boolean`` with default value ``false``
   * AC-2: The setting SHALL belong to a settings group titled "Jarvis Recorder"
   * AC-3: When ``false``, no start-recording action SHALL appear on Actor nodes and the
     recording commands SHALL NOT appear in the Command Palette
   * AC-4: When ``true``, the start-recording action SHALL be available on Actor nodes (``REQ_REC_BUTTON``)
   * AC-5: Setting it to ``false`` SHALL affect only the start of recordings: a running
     recording and its StatusBar item SHALL NOT be affected


.. req:: Start Recording and Recording Indicator at the Actor
   :id: REQ_REC_BUTTON
   :status: approved
   :priority: mandatory
   :links: US_REC_CAPTURE; US_REC_ENABLE; REQ_REC_LIVEVIEW; REQ_ACTOR_ACTIVITY; REQ_ENG_ACTORMARK

   **Description:**
   The extension SHALL let the user start a recording for an Actor from the
   ACTORS tree or by command, and SHALL mark the Actor that is being recorded.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.startRecording`` command SHALL appear as an inline action to the
     right of an Actor node's name, on hover, when ``jarvis.recording.enabled`` is ``true``
     and no recording is running. Invoked there, it SHALL record for that Actor without
     asking for a target.
   * AC-2: Invoked from the Command Palette, ``jarvis.startRecording`` SHALL ask the user
     to pick the target Actor from the Actors listed in the ACTORS view and start the
     recording for the chosen one. Cancelling the pick SHALL start nothing.
   * AC-3: While a recording runs, the Actor it is for SHALL show a red filled circle icon in
     front of its name, always visible (not only on hover). While it is shown, it takes the
     place of the activity indicator (``REQ_ACTOR_ACTIVITY`` AC-7); when the recording is
     over, the activity indicator applies again.
   * AC-4: While a recording runs, the inline action of every Actor SHALL bring the
     transcript view (``REQ_REC_LIVEVIEW``) back instead of starting a recording; it SHALL NOT
     end a recording
   * AC-5: A recording counts as running from its start until its transcript is complete
     (``REQ_REC_TRANSCRIPTFILE`` AC-3). Attempting to start another recording while one is
     running SHALL show a warning message and not start a new recording; this can only
     happen from the Command Palette, because the inline action is not shown meanwhile (AC-1).
   * AC-6: When the extension is deactivated (VS Code closed or reloaded) while a recording
     runs, the recording SHALL end at once, without waiting for further recognition results.
     The extension SHALL save the text received so far in the transcript file and attempt
     the notification of the Actor (``REQ_REC_DISPATCH``), both on a best-effort basis
     without a guarantee: the transcript may lack its last words and more, for example when
     writing fails or the host ends first, and the message may not be sent. Closing the view
     as part of the shutdown SHALL NOT raise the question of ``REQ_REC_LIVEVIEW`` AC-5.


.. req:: Recording StatusBar Timer
   :id: REQ_REC_STATUSBAR
   :status: approved
   :priority: mandatory
   :links: US_REC_CAPTURE; REQ_REC_LIVEVIEW

   **Description:**
   The extension SHALL show a StatusBar item while a recording is running,
   displaying a red filled circle, the Actor name and the elapsed time.

   **Acceptance Criteria:**

   * AC-1: The StatusBar item SHALL be visible only while a recording is running
   * AC-2: The item SHALL show a red filled circle, the Actor name and the elapsed time;
     the time format is decided at design level and is the same as in ``REQ_REC_LIVEVIEW`` AC-2
   * AC-3: The elapsed time SHALL update every second
   * AC-4: Clicking the StatusBar item SHALL bring the transcript view (``REQ_REC_LIVEVIEW``)
     back; it SHALL NOT end the recording


.. req:: Transcript Dispatch
   :id: REQ_REC_DISPATCH
   :status: implemented
   :priority: mandatory
   :links: US_REC_DISPATCH; REQ_REC_TRANSCRIPTFILE; REQ_MSG_QUEUE

   **Description:**
   When the transcript of a recording is complete, the extension SHALL notify the
   target Actor of the new transcript via the Message Queue.

   **Acceptance Criteria:**

   * AC-1: The transcript is complete when the recording has ended and all speech that
     can still be recognised has been written to the transcript file
     (``REQ_REC_TRANSCRIPTFILE`` AC-3). At that point the extension SHALL append a
     notification message addressed to the target Actor. At VS Code shutdown no further
     recognition is awaited and the message is only attempted (``REQ_REC_BUTTON`` AC-6).
   * AC-2: The message SHALL state that a new transcript is available and SHALL contain
     the full path of the transcript file, not its content; the Actor reads the file on
     demand


.. req:: Transcript File
   :id: REQ_REC_TRANSCRIPTFILE
   :status: implemented
   :priority: mandatory
   :links: US_REC_TRANSCRIPT; REQ_REC_SPEECH

   **Description:**
   Each recording SHALL write its transcript to a plain-text file in the target
   Actor's folder. The exact location and the file naming are decided at design level.

   **Acceptance Criteria:**

   * AC-1: One text file per recording SHALL be created in the target Actor's folder,
     named so that the start date and time of the recording can be read from the name. An
     existing file SHALL NOT be overwritten, also not by a recording started right after
     another one.
   * AC-2: The file SHALL be created when the recording starts, and the recognised text
     SHALL be appended to it while the recording runs. A recording that does not start
     SHALL leave no file behind.
   * AC-3: After the recording ends, the remaining recognised text SHALL be written and
     the file is then complete, within the delay of ``REQ_REC_SPEECH`` AC-4
   * AC-4: While the recording runs, the extension SHALL write a time mark with the local
     time, as ``[HH:MM]`` on a line of its own, before the first recognised text and before the
     first text after each full minute since the previous mark. No marks are written during
     silence. A mark MAY fall inside a sentence.


.. req:: Local Speech Recognition
   :id: REQ_REC_SPEECH
   :status: approved
   :priority: mandatory
   :links: US_REC_TRANSCRIPT

   **Description:**
   While a recording runs, the extension SHALL recognise the speech of the meeting on
   the user's computer and turn it into text.

   **Acceptance Criteria:**

   * AC-1: The recording SHALL capture both the microphone and the computer's audio
     output (speakers); the speech of both SHALL be recognised and appear in the same
     transcript. Separate channels or speaker labels are not required. If only one of the
     two sources can be captured, at the start or later, the extension SHALL warn the user,
     naming the missing source, and the recording SHALL continue with the other one. If
     neither can be captured, the recording SHALL NOT start (``REQ_REC_FAILURE`` AC-1); if
     both are lost later, that is a breakdown (``REQ_REC_FAILURE`` AC-2).
   * AC-2: Recognition SHALL run on the user's computer. No audio SHALL be sent to a
     cloud or any other network service.
   * AC-3: The extension SHALL NOT write audio to disk at any point; only the transcript is
     persisted
   * AC-4: Recognised text SHALL be written to the transcript file at most 20 seconds
     after it was spoken. After the recording ends, the remaining speech SHALL be
     recognised and written within the same limit.
   * AC-5: German and English SHALL be recognised in the same meeting without the user
     selecting a language. Occasionally misrecognised words, or a sentence recognised
     entirely in the other language, are acceptable.
   * AC-6: The recognised text SHALL NOT be written to the log; only the number of words
     recognised so far, at intervals (the interval is decided at design level)
   * AC-7: The recorder SHALL support Windows. On any other platform a recording SHALL NOT
     start (``REQ_REC_FAILURE`` AC-1) and the notice SHALL name the platform as the reason.
   * AC-8: Components that the recognition needs and that are not yet on the machine SHALL be
     fetched once, at the first start, with visible progress; the recording begins when they
     are ready. If they cannot be fetched, the recording SHALL NOT start
     (``REQ_REC_FAILURE`` AC-1).


.. req:: Transcription Failure Notice
   :id: REQ_REC_FAILURE
   :status: approved
   :priority: mandatory
   :links: US_REC_TRANSCRIPT; REQ_REC_LIVEVIEW; REQ_REC_DISPATCH

   **Description:**
   The extension SHALL tell the user immediately when speech recognition, audio capture or
   the writing of the transcript cannot run, so that a silent failure is not mistaken for a
   quiet meeting.

   **Acceptance Criteria:**

   * AC-1: If recognition, audio capture or the transcript file cannot start (for example on an
     unsupported platform, or without the speech model), the extension SHALL show an error
     notification naming the reason and SHALL NOT start the recording (no indicator, no view)
   * AC-2: If recognition breaks down, all audio sources are lost, or the transcript file
     cannot be written (folder gone, disk full) while a recording runs, the extension SHALL
     show an error notification at once, not only when the recording ends
   * AC-3: The text recognised up to a breakdown SHALL remain in the transcript file
   * AC-4: A breakdown SHALL end the recording as the end-recording button does
     (``REQ_REC_LIVEVIEW`` AC-4); the Actor is notified as for any ended recording
     (``REQ_REC_DISPATCH``). If the meeting goes on, the user starts a new recording, which
     yields a second transcript and a second message. A breakdown right after the start may
     leave an empty transcript file; that is accepted and the Actor is still notified.


.. req:: Transcript View
   :id: REQ_REC_LIVEVIEW
   :status: approved
   :priority: mandatory
   :links: US_REC_LIVEVIEW; US_REC_CAPTURE; REQ_MSG_EDITORPLACEMENT; REQ_REC_TRANSCRIPTFILE; REQ_REC_DISPATCH

   **Description:**
   While a recording runs, the extension SHALL show the live transcript in a view that
   also holds the control to end the recording.

   **Acceptance Criteria:**

   * AC-1: When a recording starts, the view SHALL open automatically in the Secondary
     editor column in the sense of ``REQ_MSG_EDITORPLACEMENT`` AC-3 (the last existing
     column, not a fixed one), and SHALL leave the user's focus where it was
   * AC-2: At the top, the view SHALL show a prominent end-recording button and, next to
     it, the name of the Actor, the elapsed time and the number of words recognised so far
   * AC-3: Below, the view SHALL show the recognised text as it arrives and SHALL keep
     the newest text visible without the user scrolling
   * AC-4: Pressing the end-recording button SHALL end the recording: the remaining
     speech is recognised, the transcript file is completed (``REQ_REC_TRANSCRIPTFILE``
     AC-3), and the dispatch of ``REQ_REC_DISPATCH`` follows
   * AC-5: If the user closes the view while a recording runs, the extension SHALL ask
     whether to end the recording. "Yes" SHALL end it as in AC-4; "No" SHALL reopen the
     view as in AC-1.
   * AC-6: When the view is brought back during a recording (``REQ_REC_BUTTON`` AC-4,
     ``REQ_REC_STATUSBAR`` AC-4), it SHALL be revealed and focused where it is, also when it
     is hidden behind another tab, and SHALL show the whole text recognised so far
   * AC-7: After the recording has ended, the view SHALL stay open with the final text until
     the user closes it; the end-recording button SHALL then have no effect, and closing the
     view SHALL NOT raise the question of AC-5
