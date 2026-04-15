Tree Node Open File Acceptance Tests
=====================================

.. story:: Tree Node Open File Acceptance Tests
   :id: US_UAT_EXP_OPENFILE
   :status: approved
   :priority: optional
   :links: US_EXP_OPENFILE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for click-to-navigate on Heartbeat
   Job nodes and Message nodes,
   **so that** I can verify that clicking a tree node opens the correct source file
   at the correct position end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: Heartbeat Job node navigation
     and Message node navigation
   * AC-2: At least one test covers the happy path for each node type (correct line /
     position revealed)
   * AC-3: At least one test covers the fallback path (position not found → line 0)
   * AC-4: At least one test covers the error path (source file missing → no crash)

   **Test Scenarios:**

   **T-1 — Click job node → heartbeat.yaml opens at correct line**
     Setup: ``jarvis.heartbeatConfigFile`` points to
     ``testdata/heartbeat/heartbeat.yaml``. At least one job (e.g. ``t1-cron-sentinel``)
     is defined. The Jarvis sidebar Heartbeat view is open.
     Action: Single-click the ``t1-cron-sentinel`` job node in the Heartbeat tree.
     Expected: ``heartbeat.yaml`` opens in the editor. The cursor/viewport is
     positioned at the line that contains ``name: t1-cron-sentinel``. No error
     toast or dialog appears.

   **T-2 — Click job node when job name not found → file opens at line 0 (fallback)**
     Setup: Same as T-1 but the YAML file has been modified externally so that the
     job name stored in the tree item no longer appears as text in the file (e.g.
     rename the job in YAML without reloading Jarvis).
     Action: Single-click the stale job node.
     Expected: ``heartbeat.yaml`` opens in the editor. The cursor/viewport is at
     line 1 (top of file, line 0 fallback). No error toast or dialog appears.

   **T-3 — Click job node when heartbeat.yaml missing → graceful error, no crash**
     Setup: Set ``jarvis.heartbeatConfigFile`` to a path that does not exist (e.g.
     ``testdata/heartbeat/nonexistent.yaml``). Reload the Jarvis sidebar so the tree
     shows the stale job node with the missing config path.
     Action: Single-click any job node.
     Expected: An error message is shown in the VS Code notification area or Output
     Channel. The extension does NOT crash; the Extension Development Host remains
     responsive. No unhandled exception dialog.

   **T-4 — Click message node → messages JSON opens at correct position**
     Setup: ``testdata/msg/messages.json`` contains at least two message entries.
     The Messages view is visible in the Jarvis sidebar.
     Action: Single-click the second message node (index 1) in the Messages tree.
     Expected: ``messages.json`` opens in the editor. The cursor/viewport is
     positioned at or near the start of the second message object in the JSON array.
     No error toast or dialog appears.

   **T-5 — Click message node at index 0 and index > 0 → both navigate correctly**
     Setup: Same as T-4. At least two message entries are present.
     Action: (a) Single-click the first message node (index 0).
     Expected (a): ``messages.json`` opens; cursor is at the very beginning of the
     file (line 1) or at the first message object.
     Action (b): Single-click the second message node (index 1).
     Expected (b): ``messages.json`` opens; cursor is scrolled to the second message
     object, visibly different from index 0.

   **T-6 — Click message node when file missing → graceful error, no crash**
     Setup: Remove or rename ``testdata/msg/messages.json`` so it does not exist.
     Reload the Jarvis sidebar so a stale message node remains visible in the tree.
     Action: Single-click any message node.
     Expected: An error message is shown in the VS Code notification area or Output
     Channel. The extension does NOT crash; the Extension Development Host remains
     responsive. No unhandled exception dialog.
