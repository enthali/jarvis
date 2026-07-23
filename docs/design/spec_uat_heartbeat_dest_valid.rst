Heartbeat Destination Validation UAT Design Specifications
=============================================================

.. spec:: Heartbeat Queue-Step Destination Validation Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_HEARTBEAT_DEST_VALID
   :status: draft
   :links: REQ_UAT_HEARTBEAT_DEST_VALID

   **Description:**
   Step-by-step procedures and expected outcomes for heartbeat queue-step
   destination validation scenarios: load-time warning, ``jarvis_registerJob``
   rejection, no-regression for valid jobs, and actor-entity destination
   validation after the ``KindDrivenScanner`` wiring fix.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * Heartbeat YAML at ``testdata/heartbeat/heartbeat.yaml``.
   * Jarvis Output Channel open.
   * Entities loaded: ``copilot-cm`` (session), ``alpha`` (project).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-51

          Valid YAML entity destination — no warning

          *AC-5*
        - Verify a heartbeat job with ``queue`` step
          ``destination: "alpha"`` exists. Reload EDH. Check Output Channel
          and Heartbeat tree.
        - No ``[WARN]`` entries in Output Channel referencing the queue step
          destination. Job appears in Heartbeat tree and is scheduled normally.

      * - T-52

          Invalid destination — load-time warning

          *AC-1, AC-2*
        - Add a job with ``queue`` step
          ``destination: "nonexistent-entity"`` to heartbeat YAML. Reload EDH.
          Observe notifications and Output Channel. Revert heartbeat YAML.
        - VS Code warning notification appears referencing the invalid
          destination. Output Channel shows ``[WARN]`` with job name, step
          index, and ``"nonexistent-entity"``. The job WITH the invalid step
          still appears in the Heartbeat tree (loaded, not dropped).

      * - T-53

          ``jarvis_registerJob`` rejects invalid destination

          *AC-4*
        - Invoke ``jarvis_registerJob`` with a job definition containing a
          ``queue`` step with ``destination: "ghost-dest"``.
        - Tool returns an **error** response. Error message names
          ``"ghost-dest"``. ``heartbeat.yaml`` is unchanged. Job does NOT
          appear in the Heartbeat tree.

      * - T-54

          Valid job behaviour unchanged (no regression)

          *AC-5*
        - Run the pre-existing heartbeat job (valid entity destination) via
          ``Jarvis: Run Heartbeat Job``.
        - Job executes successfully. No new ``[WARN]`` or ``[ERROR]`` entries
          in Output Channel related to destination validation.

      * - T-55

          Actor entity destination with no chat tab open — validates and
          delivers

          *AC-6, SPEC_AUT_HEARTBEAT_LOAD_VALIDATION AC-1/3*
        - Add a heartbeat job with a ``queue`` step whose ``destination``
          names an existing actor entity (one present under
          ``.jarvis/actors/`` in the workspace, e.g. ``Syspilot Setup
          Engineer`` or another actor). Ensure no VS Code chat tab for that
          actor is currently open. Reload the EDH (load-time validation).
          Then run the job via ``Jarvis: Run Heartbeat Job``.
        - At load time: no ``[WARN]`` about the destination — the actor is
          resolved as a valid destination by the ``KindDrivenScanner``-wired
          ``getValidDestinations()``.
          At run time: the queue step executes without a ``[WARN]`` or
          ``[ERROR]``; the message is queued to the actor (visible in the
          Messages tree for that actor). Note: before this fix, the actor
          destination would have been silently rejected at load because the
          scanner was not wired into ``activateHeartbeat()``.
