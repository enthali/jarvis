Heartbeat Destination Validation User Acceptance Tests
========================================================

.. story:: Heartbeat Queue-Step Destination Validation Acceptance Tests
   :id: US_UAT_HEARTBEAT_DEST_VALID
   :status: draft
   :priority: optional
   :links: US_AUT_HEARTBEAT_VALIDATION

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for heartbeat queue-step
   destination validation — at load time and via ``jarvis_registerJob`` —
   verifying that the same shared resolver used by ``jarvis_sendToSession``
   is applied (no drift),
   **so that** I can confirm that invalid heartbeat destinations are caught
   early and that valid jobs are not affected.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a heartbeat YAML with a valid YAML entity as
     a queue-step destination loads without any warning notification or log
     entry (maps to ``US_AUT_HEARTBEAT_VALIDATION`` AC-5 / T-51).
   * AC-2: A test verifies that a heartbeat YAML with an invalid queue-step
     destination emits a warning notification and a ``[WARN]`` log entry at
     load time, but the job is still loaded (maps to
     ``US_AUT_HEARTBEAT_VALIDATION`` AC-1, AC-2 / T-52).
   * AC-3: A test verifies that ``jarvis_registerJob`` rejects a job with an
     invalid queue-step destination — tool returns an error and the job is
     NOT persisted (maps to ``US_AUT_HEARTBEAT_VALIDATION`` AC-4 / T-53).
   * AC-4: A test verifies that a pre-existing correctly configured heartbeat
     job (valid entity destination) executes without error, confirming no
     regression (maps to ``US_AUT_HEARTBEAT_VALIDATION`` AC-5 / T-54).
   * AC-5 (``heartbeat-destination-actoryaml`` CR): A test verifies that a
     heartbeat queue step targeting an actor-model entity
     (``.jarvis/actors/<name>/actor.yaml``) validates and delivers successfully
     even when no matching chat tab is currently open — the ``KindDrivenScanner``
     wiring enables actor-entity destinations that were silently rejected
     before this fix (T-55).

   **Testability note:** ``US_AUT_HEARTBEAT_VALIDATION`` AC-3 (at-fire-time
   skip of invalid step) cannot be conveniently verified in manual UAT
   without waiting for a cron tick. It is flagged as a testability concern —
   unit-test coverage by the dev engineer is recommended.

   **Test Scenarios (summary):**

   * T-51: Valid YAML entity destination in heartbeat YAML → loads without
     warning.
   * T-52: Invalid destination → warning notification + ``[WARN]`` log at
     load; job still loaded.
   * T-53: ``jarvis_registerJob`` with invalid destination → error; job not
     persisted.
   * T-54: Correctly configured job → behavior unchanged (no regression).
   * T-55: Actor-model entity destination (actor.yaml) with no chat tab open
     → validates as valid; job step delivers the queued message.
