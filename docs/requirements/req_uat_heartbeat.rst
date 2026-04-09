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
