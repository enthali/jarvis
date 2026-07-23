Heartbeat Destination Validation UAT Requirements
===================================================

.. req:: Heartbeat Queue-Step Destination Validation — Test Data and Verification Requirements
   :id: REQ_UAT_HEARTBEAT_DEST_VALID
   :status: draft
   :priority: optional
   :links: US_UAT_HEARTBEAT_DEST_VALID; REQ_AUT_HEARTBEAT_RESOLVER_REUSE

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating heartbeat queue-step destination validation at load time and via
   ``jarvis_registerJob``, and confirming no regression for valid jobs.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * A valid heartbeat YAML must exist in ``testdata/heartbeat/heartbeat.yaml``
     containing at least one job with a ``queue`` step pointing to ``alpha``
     (a known project entity) — used for T-51.
   * For T-52: temporarily add a second job with a ``queue`` step using
     ``destination: "nonexistent-entity"``. Revert after the test.
   * For T-53: prepare a job definition JSON/YAML with an invalid destination
     for use with ``jarvis_registerJob``.
   * For T-54: the pre-existing valid heartbeat job (pointing to ``copilot-cm``
     or ``alpha``) is used without modification.
   * Jarvis Output Channel must be open.

   **Acceptance Criteria:**

   * AC-1 (valid destination — no warning):
     For T-51, the tester SHALL reload the EDH with the valid heartbeat YAML
     in place and verify: no warning notification appears, no ``[WARN]`` entries
     in the Output Channel referencing the ``queue`` step destination, and the
     job appears in the Heartbeat tree.

   * AC-2 (invalid destination — load-time warning):
     For T-52, the tester SHALL reload the EDH with the invalid destination job
     added and verify: a VS Code warning notification appears (not silent), and
     the Output Channel contains a ``[WARN]`` entry with the job name, step
     index, and the string ``"nonexistent-entity"``.

   * AC-3 (invalid destination — job still loaded):
     Continuation of T-52: the tester SHALL verify the job WITH the invalid
     step still appears in the Heartbeat tree (loaded but flagged, not dropped).

   * AC-4 (registerJob rejects invalid destination):
     For T-53, the tester SHALL invoke ``jarvis_registerJob`` with the prepared
     invalid-destination job definition and verify the tool returns an error
     (not success). The job SHALL NOT appear in ``heartbeat.yaml`` or the
     Heartbeat tree.

   * AC-5 (valid job unaffected):
     For T-54, the tester SHALL trigger the valid pre-existing heartbeat job
     (via ``Jarvis: Run Heartbeat Job``) and verify it executes without any
     ``[WARN]`` or ``[ERROR]`` entries relating to destination validation.
   * AC-6 (``heartbeat-destination-actoryaml`` CR — actor entity, no chat tab):
     For T-55, the tester SHALL configure a heartbeat queue step targeting an
     actor-model entity name (one present under ``.jarvis/actors/``) and
     ensure no chat tab for that actor is open, then trigger the job. The step
     SHALL complete without a ``[WARN]`` or ``[ERROR]`` about the destination,
     and the message SHALL be queued to the actor. Previously this silently
     failed because ``activateHeartbeat()`` was never given the
     ``KindDrivenScanner`` instance (``SPEC_AUT_HEARTBEAT_LOAD_VALIDATION``
     AC-1/AC-3).

   **Testability note:**
   ``US_AUT_HEARTBEAT_VALIDATION`` AC-3 (at-fire-time step skip) is NOT
   included as a manual test scenario because it requires waiting for a cron
   tick. The dev engineer SHALL provide a unit test for this behaviour.
