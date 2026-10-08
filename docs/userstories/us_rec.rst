Recording User Stories
======================

.. story:: Record a Meeting for an Actor
   :id: US_REC_CAPTURE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_TREE; US_REC_ENABLE

   **As a** Jarvis user,
   **I want** to start the recording of a meeting for a chosen Actor with a single action, and to get back to the running recording at any time,
   **so that** the Actor can turn the meeting into minutes using its own context.

   **Acceptance Criteria:**

   * AC-1: An Actor in the ACTORS tree shows a start-recording action to the right of its name when I hover over it. The same action is available as a command that asks me to pick the target Actor.
   * AC-2: While a recording runs, the Actor it is for shows a red filled circle icon in front of its name, always visible; while a recording runs, the hover action of the Actors brings the transcript view back (``US_REC_LIVEVIEW``) instead of starting a recording
   * AC-3: While a recording runs, the StatusBar shows a red filled circle, the name of the Actor and the elapsed time; clicking it brings the transcript view back
   * AC-4: Only one recording can run at a time, and a recording counts as running until its transcript is complete; starting a second recording shows a warning
   * AC-5: If VS Code is closed or reloaded while a recording runs, the recording ends at once, without waiting for further speech to be recognised; the end of the transcript may then be missing and the Actor may not be notified


.. story:: Enable / Disable Recording Feature
   :id: US_REC_ENABLE
   :status: implemented
   :priority: mandatory
   :links: US_REC_CAPTURE

   **As a** Jarvis user,
   **I want** to enable or disable the Recording feature (default: off),
   **so that** it is only active when I consciously switch it on.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.recording.enabled`` setting (boolean, default ``false``) controls the feature
   * AC-2: When disabled, no start-recording action or command is offered
   * AC-3: When enabled, the recording actions of ``US_REC_CAPTURE`` are offered
   * AC-4: Switching it off only affects starting; a recording that is already running is not touched


.. story:: Meeting Transcript Right After the Meeting
   :id: US_REC_TRANSCRIPT
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_FILES_TREE

   **As a** Jarvis user,
   **I want** the transcript of a meeting to be available almost immediately after the meeting,
   **so that** the Actor can process it while my memory of the meeting is still fresh.

   **Acceptance Criteria:**

   * AC-1: A recording produces a text file in the target Actor's folder, identifiable by the date and time the recording started
   * AC-2: The transcript contains what I say into my microphone and what is played through my computer's speakers, so the other participants of an online meeting are included. If only one of the two can be captured, I get a warning that says which one is missing, and the recording goes on with the other
   * AC-3: Text appears in that file while the meeting runs, at most 20 seconds behind the speech; after I stop, the transcript is complete within the same delay
   * AC-4: Speech is recognised on my computer: no audio leaves it, and none is stored; only the transcript remains
   * AC-5: Meetings alternate between German and English; I do not choose a language. Occasionally misrecognised words, or a sentence transcribed entirely in the other language, are accepted
   * AC-6: If the transcription cannot start, no recording starts and I am told why. If it breaks down during the meeting, I am told immediately, and the recording ends as if I had ended it; what was recognised so far is kept
   * AC-7: The first recording on a computer may need a one-time download of what the speech recognition requires; I see its progress, and the recording begins when it is done, or I am told why it cannot
   * AC-8: About every minute the transcript carries a mark with the local time, so that the Actor can place passages in the meeting


.. story:: Watch the Transcript While the Meeting Runs
   :id: US_REC_LIVEVIEW
   :status: approved
   :priority: mandatory
   :links: US_REC_CAPTURE; US_REC_TRANSCRIPT; US_REC_DISPATCH; US_MSG_EDITORPLACEMENT

   **As a** Jarvis user,
   **I want** to see the transcript grow while the meeting runs,
   **so that** I can tell at a glance that the recording works and what it has captured.

   **Acceptance Criteria:**

   * AC-1: When a recording starts, the transcript view opens automatically in the Secondary editor column, without taking my focus away from what I am working on
   * AC-2: At the top of the view I see a prominent button to end the recording, and next to it which Actor the recording is for, the elapsed time, and how many words have been captured so far
   * AC-3: Below, I see the text appear as it is transcribed, and the newest text stays visible without my scrolling
   * AC-4: Pressing the button ends the recording; the transcript then completes (``US_REC_TRANSCRIPT`` AC-3) and the Actor is notified (``US_REC_DISPATCH``)
   * AC-5: If I close the view while a recording runs, I am asked whether to end the recording; if I answer no, the view reappears
   * AC-6: When I bring the view back during a recording, from the Actor or from the StatusBar, it is shown and focused and holds all the text so far
   * AC-7: After the recording has ended, the view stays open with the final text until I close it; closing it then asks nothing


.. story:: Notify the Actor of a New Transcript
   :id: US_REC_DISPATCH
   :status: implemented
   :priority: mandatory
   :links: US_REC_TRANSCRIPT; US_MSG_AUTODELIVERY

   **As a** Jarvis user,
   **I want** the Actor I recorded for to be told when its transcript is complete,
   **so that** it knows a new transcript is waiting and can start on the minutes.

   **Acceptance Criteria:**

   * AC-1: When the transcript is complete, a message is sent to the target Actor saying that a new transcript is available and giving its file path
