Logging User Acceptance Tests
==============================

.. story:: Unified Logging Acceptance Tests
   :id: US_UAT_LOGGING
   :status: implemented
   :priority: mandatory
   :links: US_DEV_LOGGING

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the unified logging feature,
   **so that** I can verify all modules log to a single Output Channel with
   correct levels and module tags.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover the single "Jarvis" Output Channel creation
   * AC-2: At least one test per module tag ([Heartbeat], [MSG], [Scanner], [Update])
   * AC-3: At least one test verifies log-level filtering via the dropdown

   **Test Scenarios:**

   **T-1 — "Jarvis" Output Channel exists**
     Setup: Launch Extension Development Host.
     Action: Open the Output panel, check the channel dropdown.
     Expected: A channel named "Jarvis" is listed. No channel named
     "Jarvis Heartbeat" exists.

   **T-2 — [Heartbeat] tag on job execution**
     Setup: Configure a manual heartbeat job in heartbeat.yaml.
     Action: Run the job via ``Jarvis: Run Heartbeat Job`` command.
     Expected: Output channel shows entries tagged ``[Heartbeat]`` with
     timestamps.

   **T-3 — [Scanner] tag on rescan**
     Setup: Configure ``jarvis.projectsFolder`` with ``testdata/projects/``.
     Action: Click the refresh icon in the Projects title bar.
     Expected: Output channel shows ``[Scanner]`` entries (e.g.
     "Scan started", "Scan complete").

   **T-4 — [MSG] tag on message operations**
     Setup: Have a chat session open.
     Action: Use the ``jarvis_sendToSession`` LM tool to queue a message.
     Expected: Output channel shows ``[MSG]`` entries.

   **T-5 — [Update] tag on update check**
     Setup: Extension activated with ``jarvis.checkForUpdates: true``.
     Action: Run ``Jarvis: Check for Updates`` command.
     Expected: Output channel shows ``[Update]`` entries.

   **T-6 — Log-level filtering**
     Setup: Produce log entries at various levels (info, debug).
     Action: Switch the log-level dropdown in the Output panel to "Info".
     Expected: Debug and trace entries are hidden; info/warn/error remain
     visible.

   **T-7 — Timestamps present**
     Setup: Trigger any logged operation.
     Action: Inspect Output channel entries.
     Expected: Each line has an automatic timestamp prefix from
     ``LogOutputChannel``.
