Heartbeat UAT Requirements
===========================

.. req:: Heartbeat Test Data Files
   :id: REQ_UAT_HEARTBEAT_TESTDATA
   :status: implemented
   :priority: optional
   :links: US_UAT_HEARTBEAT

   **Description:**
   The repo SHALL contain a ``testdata/heartbeat/`` folder with a YAML job
   definition and test scripts covering all five step types and the failure path.

   **Acceptance Criteria:**

   * AC-1: ``testdata/heartbeat/heartbeat.yaml`` defines at least one scheduled job
     (cron), one manual job (command), one Python step, and one failing step
   * AC-2: Script files for powershell and python steps exist under
     ``testdata/heartbeat/scripts/``
   * AC-3: The failing step exits with a non-zero exit code to enable toast testing
   * AC-4: A manual job with an ``agent`` step exists, referencing a prompt file
     under ``testdata/heartbeat/prompts/``
   * AC-5: A manual job with a ``queue`` step exists, specifying ``session`` and
     ``text`` fields for message queue testing


.. req:: Heartbeat Tree View Test Procedures
   :id: REQ_UAT_HEARTBEATVIEW_TESTS
   :status: implemented
   :priority: optional
   :links: US_UAT_HEARTBEATVIEW

   **Description:**
   Manual test procedures SHALL exist that verify the heartbeat tree view renders
   correctly and all action buttons work.

   **Acceptance Criteria:**

   * AC-1: A test procedure verifies the Heartbeat view appears in the Jarvis sidebar
     with job nodes and correct next-run descriptions
   * AC-2: A test procedure verifies expanding a job node shows its steps
   * AC-3: A test procedure verifies the inline play button executes a single job
   * AC-4: A test procedure verifies the refresh button reloads the config and updates
     the tree
   * AC-5: A test procedure verifies the tree refreshes automatically on scheduler tick


.. req:: Job Registration Test Procedures
   :id: REQ_UAT_JOBREG_TESTS
   :status: approved
   :priority: optional
   :links: US_UAT_JOBREG

   **Description:**
   Manual test procedures SHALL exist that verify the heartbeat job registration API
   and the scanner's integration with the heartbeat system.

   **Acceptance Criteria:**

   * AC-1: A test procedure verifies that ``registerJob`` creates an entry in
     ``heartbeat.yaml`` and the tree view updates
   * AC-2: A test procedure verifies that ``registerJob`` upserts (overwrites) an
     existing entry with the same name
   * AC-3: A test procedure verifies that ``unregisterJob`` removes an entry and
     the tree view updates
   * AC-4: A test procedure verifies the ``"Jarvis: Rescan"`` job is registered
     when ``scanInterval > 0``
   * AC-5: A test procedure verifies that ``scanInterval = 0`` results in no
     rescan job being registered
