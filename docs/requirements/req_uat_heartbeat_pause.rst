Heartbeat Pause/Resume UAT Requirements
========================================

.. req:: Heartbeat Pause/Resume Test Data
   :id: REQ_UAT_HEARTBEAT_PAUSE_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_HEARTBEAT_PAUSE

   **Description:**
   The existing ``testdata/heartbeat/heartbeat.yaml`` provides sufficient job
   definitions for T-1..T-6. No additional test data files are required beyond
   what already exists.

   **Acceptance Criteria:**

   * AC-1: ``testdata/heartbeat/heartbeat.yaml`` contains at least one job that
     is active (no ``enabled`` field, or ``enabled: true``) — used for T-1, T-2,
     T-5, and T-6.
   * AC-2: The test job used for T-1/T-2 has a cron schedule (not ``"manual"``)
     so that T-5 (scheduler-skip) can be verified.
   * AC-3: The test procedures reference the exact job name from
     ``testdata/heartbeat/heartbeat.yaml`` so testers can match YAML entries to
     tree nodes unambiguously.
   * AC-4: After T-2 (Pause), the tester can inspect ``heartbeat.yaml`` in the
     editor to verify ``enabled: false`` was written.
   * AC-5: After T-4 (Resume), the tester can inspect ``heartbeat.yaml`` to
     verify ``enabled: true`` (or absence of the field).


.. req:: Heartbeat Pause/Resume Test Procedures
   :id: REQ_UAT_HEARTBEAT_PAUSE_TESTS
   :status: approved
   :priority: optional
   :links: US_UAT_HEARTBEAT_PAUSE

   **Description:**
   Manual test procedures SHALL cover all six scenarios in
   ``US_UAT_HEARTBEAT_PAUSE``, verifying the full pause/resume lifecycle and
   scheduler skip behaviour.

   **Acceptance Criteria:**

   * AC-1 (T-1): A test procedure verifies that both inline action buttons
     (``$(debug-pause)`` and ``$(debug-start)``) are visible on an active job
     node.
   * AC-2 (T-2): A test procedure verifies that clicking Pause changes the node
     to paused style and writes ``enabled: false`` to ``heartbeat.yaml``.
   * AC-3 (T-3): A test procedure verifies that the paused state is preserved
     after a window reload.
   * AC-4 (T-4): A test procedure verifies that clicking Start on a paused node
     runs the job once and restores active state in the tree and YAML.
   * AC-5 (T-5): A test procedure verifies that the scheduler does not execute a
     paused job on a cron tick.
   * AC-6 (T-6): A test procedure verifies that the manual Play button on an
     active job continues to work as before.
   * AC-7 (T-7): A test procedure verifies that the manual Play button is also
     available on a paused job node and triggers a one-shot run without changing
     the pause state.
