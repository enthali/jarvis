List-Jobs Tool User Acceptance Tests
=====================================

.. story:: List-Jobs Tool Acceptance Tests
   :id: US_UAT_LISTJOBS
   :status: approved
   :priority: optional
   :links: US_AUT_HEARTBEAT

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scripts for the
   ``jarvis_listJobs`` tool,
   **so that** I can verify that agents can query all registered heartbeat
   jobs and receive correct metadata (name, schedule, enabled state, next
   fire time) via both the LM API and MCP.

   **Acceptance Criteria:**

   * AC-1: A test verifies that calling ``jarvis_listJobs`` without
     arguments returns the complete list of jobs from ``heartbeat.yaml``,
     with each entry containing ``name``, ``schedule``, ``enabled``, and
     ``nextFire`` fields.
   * AC-2: A test verifies that a job with ``enabled: false`` in YAML appears
     in the list with ``enabled: false`` and ``nextFire: null``.
   * AC-3: A test verifies that a job with ``schedule: manual`` appears with
     ``nextFire: null`` regardless of its ``enabled`` state.
   * AC-4: A test verifies that an active cron job (no ``enabled`` field or
     ``enabled: true``) appears with a ``nextFire`` value that is a valid
     ISO-8601 timestamp in the future.
   * AC-5: A test verifies that calling ``jarvis_listJobs`` via the MCP
     interface returns the same job list as the LM API call.

   **Test Scenarios:**

   **T-1 — Full job list returned via LM tool**
     Setup: ``heartbeat.yaml`` contains at least one job of each type
     (cron-active, cron-paused, manual).
     Action: In an agent chat, invoke ``jarvis_listJobs`` with no arguments.
     Expected: JSON response lists all jobs; every entry has ``name``,
     ``schedule``, ``enabled``, and ``nextFire`` keys.

   **T-2 — Paused job shows enabled: false and nextFire: null**
     Setup: ``testdata/heartbeat/heartbeat.yaml`` contains
     ``t-listjobs-paused`` with ``schedule: */10 * * * *`` and
     ``enabled: false``.
     Action: Call ``jarvis_listJobs``; locate ``t-listjobs-paused`` in the
     result.
     Expected: ``enabled`` is ``false``; ``nextFire`` is ``null``.

   **T-3 — Manual job shows nextFire: null**
     Setup: ``heartbeat.yaml`` contains ``t2-manual-show-output`` with
     ``schedule: manual``.
     Action: Locate ``t2-manual-show-output`` in the ``jarvis_listJobs``
     result.
     Expected: ``nextFire`` is ``null``; ``enabled`` is ``true`` (or
     absent, treated as true).

   **T-4 — Active cron job shows future ISO timestamp**
     Setup: ``t1-cron-sentinel`` is active (no ``enabled: false``).
     Action: Locate ``t1-cron-sentinel`` in the ``jarvis_listJobs`` result.
     Expected: ``enabled`` is ``true``; ``nextFire`` is a non-null
     ISO-8601 string representing a time in the future.

   **T-5 — MCP call returns same data as LM call**
     Setup: Extension running with MCP server enabled.
     Action: Call ``jarvis_listJobs`` via the MCP interface (e.g. GitHub
     Copilot MCP tool invocation).
     Expected: The ``jobs`` array returned is identical in structure and
     values to the LM API result from T-1.
