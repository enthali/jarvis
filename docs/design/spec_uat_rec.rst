Session Recording UI UAT Design Specifications
===============================================

.. spec:: Session Recording UI Test Data Files
   :id: SPEC_UAT_REC_FILES
   :status: approved
   :links: REQ_UAT_REC_TESTDATA; SPEC_REC_SETTINGS; SPEC_REC_BUTTON; SPEC_REC_STATUSBAR; SPEC_REC_SUBPROCESS

   **Description:**
   Test data lives under ``testdata/recording/``. The mock ``recorder.py`` simulates
   the real Whisper recorder without requiring a Whisper installation, enabling all
   T-7 through T-12 scenarios to run in the Extension Development Host.

   **Test data:**

   * ``testdata/recording/recorder.py`` — mock recorder; polls for ``.stop`` sentinel
     and exits cleanly; accepts ``--name``, ``--no-timestamp``, and ``--output-dir`` CLI
     args (matching the actual recorder.py API)
   * ``testdata/recording/input/`` — empty placeholder directory for audio chunk output
   * Existing ``testdata/projects/`` YAML files are reused as recording targets
     (no new project files needed)

   **Mock recorder.py behaviour:**

   .. code-block:: python

      # testdata/recording/recorder.py
      # Mock recorder for Jarvis UAT — no audio capture, just sentinel polling
      import argparse, os, sys, time

      parser = argparse.ArgumentParser()
      parser.add_argument("--name", required=True)
      parser.add_argument("--no-timestamp", action="store_true")
      parser.add_argument("--output-dir", required=True)
      args = parser.parse_args()

      whisper_path = os.path.dirname(os.path.abspath(__file__))
      stop_file = os.path.join(whisper_path, ".stop")

      print(f"[mock-recorder] started name={args.name}", flush=True)
      while not os.path.exists(stop_file):
          time.sleep(0.5)
      print("[mock-recorder] .stop detected, exiting cleanly", flush=True)
      sys.exit(0)

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 18 42 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (feature disabled)
        - Open Jarvis sidebar with ``recording.enabled = false``
        - No record button on any project or event node
      * - T-2 (enable feature)
        - Set ``recording.enabled = true``, refresh tree
        - ``$(circle-outline)`` record button visible on every project and event node
      * - T-3 (disable feature)
        - Set ``recording.enabled = false``, refresh tree
        - Record buttons disappear from all nodes
      * - T-4 (valid whisperPath)
        - Click record on project node with valid path configured
        - StatusBar appears; ``.recording.json`` created in ``testdata/recording/``
      * - T-5 (missing whisperPath)
        - Click record with non-existent path configured
        - Error notification; no ``.recording.json``; no StatusBar
      * - T-6 (Python unavailable)
        - Click record with Python absent from PATH
        - Error notification mentions Python; no state written; no StatusBar
      * - T-7 (start recording)
        - Click ``$(circle-outline)`` on project node ``alpha``
        - StatusBar shows ``🔴 alpha — 00:00``; ``.recording.json`` created; active node shows red icon
      * - T-8 (timer increments)
        - Wait 3–5 s with recording active
        - StatusBar text advances to approx. ``00:03``–``00:05``
      * - T-9 (stop via StatusBar)
        - Click StatusBar item while recording
        - StatusBar hides; ``.recording.json`` deleted; ``.stop`` written then deleted; node reverts to grey
      * - T-10 (stop via inline button)
        - Click red ``$(circle-filled)`` on active recording node
        - Same result as T-9
      * - T-11 (second recording blocked)
        - Click record on a different node while one is active
        - Notification prevents second recording; original recording continues
      * - T-12 (deactivate hook)
        - Reload window while recording active
        - ``.stop`` sentinel written; ``.recording.json`` deleted; no orphan subprocess
