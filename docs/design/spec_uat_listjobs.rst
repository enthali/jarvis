List-Jobs Tool UAT Design Specifications
=========================================

.. spec:: List-Jobs Tool Test Data
   :id: SPEC_UAT_LISTJOBS_TESTDATA
   :status: approved
   :links: REQ_UAT_LISTJOBS_TESTDATA

   **Description:**
   Test data is provided by ``testdata/heartbeat/heartbeat.yaml``.
   The following jobs cover all T-1..T-5 scenarios.

   .. list-table::
      :header-rows: 1
      :widths: 25 20 15 40

      * - Job name
        - Schedule
        - enabled
        - Purpose
      * - ``t1-cron-sentinel``
        - ``*/5 * * * *``
        - (default) true
        - Active cron job — used in T-1, T-4
      * - ``t-listjobs-paused``
        - ``*/10 * * * *``
        - false
        - Paused cron job — used in T-1, T-2
      * - ``t2-manual-show-output``
        - ``manual``
        - (default) true
        - Manual-schedule job — used in T-1, T-3

   **Pre-condition for all tests:**

   * ``jarvis.heartbeatConfigFile`` is set to
     ``<workspace>/testdata/heartbeat/heartbeat.yaml``.
   * The Extension Development Host has been started via **F5** with the
     ``testdata/test.code-workspace`` workspace.
   * For T-5: MCP server is enabled (``jarvis.mcp.enabled: true``) and
     the MCP client (e.g. GitHub Copilot) is connected.


.. spec:: List-Jobs Tool Test Procedures
   :id: SPEC_UAT_LISTJOBS_PROCEDURES
   :status: approved
   :links: REQ_UAT_LISTJOBS_TESTS

   **Description:**
   Manual step-by-step procedures for T-1..T-5.

   **T-1 — Full job list returned via LM tool**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - Open an agent chat (e.g. GitHub Copilot Chat in Agent mode).
        - Chat window is open and Jarvis tools are available.
      * - 2
        - Send the prompt: ``Call jarvis_listJobs and show me the full
          result.``
        - The tool is invoked with no arguments.
      * - 3
        - Inspect the JSON response.
        - Every entry in the list contains the keys ``name``,
          ``schedule``, ``enabled``, and ``nextFire``. The list includes
          at least ``t1-cron-sentinel``, ``t-listjobs-paused``, and
          ``t2-manual-show-output``.

   **T-2 — Paused job shows enabled: false and nextFire: null**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - From the T-1 result, locate the entry for
          ``t-listjobs-paused``.
        - Entry is present in the list.
      * - 2
        - Read the ``enabled`` field of ``t-listjobs-paused``.
        - Value is ``false``.
      * - 3
        - Read the ``nextFire`` field of ``t-listjobs-paused``.
        - Value is ``null``.

   **T-3 — Manual job shows nextFire: null**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - From the T-1 result, locate the entry for
          ``t2-manual-show-output``.
        - Entry is present in the list.
      * - 2
        - Read the ``schedule`` field.
        - Value is ``"manual"``.
      * - 3
        - Read the ``nextFire`` field.
        - Value is ``null``.
      * - 4
        - Read the ``enabled`` field.
        - Value is ``true`` (or the field is absent, which also means
          enabled).

   **T-4 — Active cron job shows future ISO timestamp**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - From the T-1 result, locate the entry for
          ``t1-cron-sentinel``.
        - Entry is present in the list.
      * - 2
        - Read the ``enabled`` field.
        - Value is ``true`` (or absent).
      * - 3
        - Read the ``nextFire`` field.
        - Value is a non-null string in ISO-8601 format (e.g.
          ``"2026-05-18T14:05:00.000Z"``).
      * - 4
        - Compare ``nextFire`` to the current UTC time.
        - ``nextFire`` represents a time in the future (later than now).

   **T-5 — MCP call returns same data as LM call**

   .. list-table::
      :header-rows: 1
      :widths: 10 45 45

      * - Step
        - Action
        - Expected result
      * - 1
        - In GitHub Copilot Chat (Agent mode), invoke the
          ``jarvis_listJobs`` MCP tool directly (e.g. via ``#jarvis_listJobs``
          or through an agent prompt that triggers the MCP server).
        - The MCP interface is called; a ``jobs`` array is returned.
      * - 2
        - Compare the ``jobs`` array entries to the LM API result from
          T-1 (same agent session or a fresh call).
        - Each job entry in the MCP result matches the corresponding LM
          result entry: same ``name``, ``schedule``, ``enabled``, and
          ``nextFire`` values.
      * - 3
        - Verify no extra or missing jobs in the MCP result.
        - Job count and names are identical between both interfaces.
