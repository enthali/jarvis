Session Recording UI Acceptance Tests
======================================

.. story:: Session Recording Feature Enable/Disable Acceptance Tests
   :id: US_UAT_REC_ENABLE
   :status: approved
   :priority: optional
   :links: US_REC_ENABLE; US_REC_CAPTURE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the recording enable/disable setting,
   **so that** I can verify the feature gate works end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover the default-off state (no buttons visible when disabled)
   * AC-2: At least one test verifies buttons appear after enabling the feature
   * AC-3: At least one test verifies buttons disappear after disabling the feature again

   **Test Scenarios:**

   **T-1 — Buttons hidden when feature disabled (default)**
     Setup: Fresh workspace; ``jarvis.recording.enabled`` not set (defaults to ``false``).
     Action: Open the Jarvis sidebar; expand a project node and an event node.
     Expected: No ``$(circle-outline)`` record button appears on project or event nodes.

   **T-2 — Buttons appear after enabling feature**
     Setup: ``jarvis.recording.enabled = false``; ``jarvis.recording.whisperPath`` set
     to ``testdata/recording`` (relative to workspace root).
     Action: Change ``jarvis.recording.enabled`` to ``true`` in VS Code settings.
     Expected: After tree refresh, a ``$(circle-outline)`` record button is visible on
     each project and event node (inline action).

   **T-3 — Buttons hidden again after disabling**
     Setup: ``jarvis.recording.enabled = true`` (buttons visible).
     Action: Change ``jarvis.recording.enabled`` back to ``false`` in VS Code settings.
     Expected: After tree refresh, record buttons are no longer visible on any node.


.. story:: Session Recording Configuration Acceptance Tests
   :id: US_UAT_REC_CONFIG
   :status: approved
   :priority: optional
   :links: US_REC_CONFIG

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the whisper path configuration,
   **so that** I can verify path validation and error handling before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover the happy path (valid path set, recording starts)
   * AC-2: At least one test covers a missing/non-existent whisper path (error on start)
   * AC-3: At least one test covers Python not being available on PATH

   **Test Scenarios:**

   **T-4 — Valid whisperPath allows recording to start**
     Setup: ``jarvis.recording.enabled = true``; ``jarvis.recording.whisperPath`` set to
     the absolute path of ``testdata/recording`` (which contains ``recorder.py`` and an
     ``input/`` subfolder).
     Action: Click the ``$(circle-outline)`` record button on a project node.
     Expected: Recording starts; StatusBar item appears; ``testdata/recording/.recording.json``
     is created.

   **T-5 — Missing whisperPath shows error message**
     Setup: ``jarvis.recording.enabled = true``; ``jarvis.recording.whisperPath`` set to
     a path that does not exist (e.g. ``C:\nonexistent\whisper``).
     Action: Click the ``$(circle-outline)`` record button on a project node.
     Expected: An error notification appears (e.g. *"whisperPath does not exist"*);
     no ``.recording.json`` is created; StatusBar does not appear.

   **T-6 — Python unavailable shows error message**
     Setup: ``jarvis.recording.enabled = true``; ``jarvis.recording.whisperPath`` set to
     ``testdata/recording``; Python removed from PATH (or tested on a machine without Python).
     Action: Click the record button on a project node.
     Expected: An error notification mentions Python is not available; no state written;
     StatusBar does not appear.


.. story:: Session Recording Capture Acceptance Tests
   :id: US_UAT_REC_CAPTURE
   :status: approved
   :priority: optional
   :links: US_REC_CAPTURE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the full recording lifecycle,
   **so that** I can verify start, timer, stop, and graceful deactivation end-to-end.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover starting a recording via the inline tree button
   * AC-2: At least one test verifies the StatusBar timer counts up correctly
   * AC-3: At least one test covers stopping via the StatusBar click
   * AC-4: At least one test covers stopping via the inline stop button on the active node
   * AC-5: At least one test covers extension deactivation while recording is active

   **Test Scenarios:**

   **T-7 — Start recording via inline tree button**
     Setup: ``jarvis.recording.enabled = true``; ``jarvis.recording.whisperPath`` →
     ``testdata/recording``; Python available.
     Action: Hover over a project node (e.g. ``alpha``); click the ``$(circle-outline)``
     record button.
     Expected: StatusBar item shows ``🔴 alpha — 00:00`` and increments every second;
     ``testdata/recording/.recording.json`` is created containing ``project``, ``pid``,
     and ``startTime``; the record button on the *active* node changes to a red
     ``$(circle-filled)`` icon; other project/event nodes still show the grey
     ``$(circle-outline)`` icon.

   **T-8 — StatusBar timer increments**
     Setup: Recording active (T-7 precondition).
     Action: Wait 3–5 seconds without clicking anything.
     Expected: StatusBar text advances from ``00:00`` to approximately ``00:03``–``00:05``.

   **T-9 — Stop recording via StatusBar click**
     Setup: Recording active (T-7 precondition); StatusBar shows timer.
     Action: Click the StatusBar item (``🔴 alpha — MM:SS``).
     Expected: StatusBar item disappears; ``testdata/recording/.recording.json`` is deleted;
     ``testdata/recording/.stop`` sentinel is written and subsequently deleted; the node
     icon reverts to grey ``$(circle-outline)``; no error notification shown.

   **T-10 — Stop recording via inline stop button**
     Setup: Recording active on project node ``alpha``.
     Action: Hover over the ``alpha`` project node; click the red ``$(circle-filled)``
     stop button.
     Expected: Same observable result as T-9.

   **T-11 — Clicking another node stops current recording**
     Setup: Recording active on project node ``alpha``.
     Action: Click the ``$(circle-outline)`` record button on a *different* project node
     (e.g. ``beta``).
     Expected: The ``alpha`` recording stops (StatusBar disappears,
     ``.recording.json`` is deleted, ``alpha`` node reverts to grey);
     no new recording starts for ``beta``.

   **T-12 — Extension deactivate stops recording gracefully**
     Setup: Recording active (T-7 precondition); ``testdata/recording/.recording.json``
     exists.
     Action: Close VS Code (or run ``Developer: Reload Window``).
     Expected: The ``deactivate()`` hook fires; ``testdata/recording/.stop`` sentinel is
     written; ``testdata/recording/.recording.json`` is deleted before the process exits;
     no orphaned subprocess left running.
