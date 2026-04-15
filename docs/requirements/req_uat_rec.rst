Session Recording UI UAT Requirements
======================================

.. req:: Session Recording UI Test Data
   :id: REQ_UAT_REC_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_REC_ENABLE; US_UAT_REC_CONFIG; US_UAT_REC_CAPTURE; REQ_REC_ENABLE; REQ_REC_CONFIG; REQ_REC_BUTTON; REQ_REC_STATUSBAR; REQ_REC_SUBPROCESS

   **Description:**
   The repo SHALL contain a ``testdata/recording/`` folder with a mock ``recorder.py``
   and the required subdirectory structure for manual verification of the session
   recording UI feature.

   **Acceptance Criteria:**

   * AC-1: ``testdata/recording/recorder.py`` exists — a mock Python script that
     accepts ``--name``, ``--no-timestamp``, and ``--output-dir`` arguments (matching
     the actual recorder.py API used by ``RecordingManager.start()``), writes a start
     marker, sleeps until the ``.stop`` sentinel file appears (polling every 0.5 s),
     then exits cleanly; this allows T-7 through T-12 to run without a real Whisper
     installation
   * AC-2: ``testdata/recording/input/`` directory exists (empty placeholder) so
     ``recorder.py`` can write audio chunks without path errors
   * AC-3: Expected outcomes for each scenario (T-1 through T-12 from
     ``US_UAT_REC_ENABLE``, ``US_UAT_REC_CONFIG``, ``US_UAT_REC_CAPTURE``) SHALL be
     documented in the test protocol ``docs/changes/tst-session-recording-ui.md``
   * AC-4: The mock ``recorder.py`` MUST NOT depend on any third-party Python packages
     so it runs in any Python 3 environment without additional installs
   * AC-5: Existing ``testdata/projects/`` and ``testdata/events/`` files are reused
     for project/event node targets — no additional project YAML files are required
