Heartbeat Destination Validation UAT Design Specifications
=============================================================

.. spec:: Heartbeat Queue-Step Destination Validation Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_HEARTBEAT_DEST_VALID
   :status: draft
   :links: REQ_UAT_HEARTBEAT_DEST_VALID

   **Description:**
   Step-by-step procedures and expected outcomes for heartbeat queue-step
   destination validation scenarios: load-time warning, ``jarvis_registerJob``
   rejection, and no-regression for valid jobs.

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
