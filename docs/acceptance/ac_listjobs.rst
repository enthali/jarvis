List-Jobs Tool Acceptance Criteria
==================================

The ``jarvis_listJobs`` tool of the Automation module, which lets an agent read
the registered heartbeat jobs, executed by the User in an Extension Development
Host with the workspace ``testdata/test.code-workspace`` open, as one journey.

**Setup:** the tester copies ``testdata/heartbeat/heartbeat.yaml`` into
``<workspace root>/.jarvis/`` (``testdata/.jarvis/``) and reloads the window. It
contains three jobs that cover the observable states: ``t1-cron-sentinel``
(schedule ``*/5 * * * *``, active), ``t-listjobs-paused`` (schedule
``*/10 * * * *``, ``enabled: false``) and ``t2-manual-show-output`` (schedule
``manual``).

.. ac:: Journey: the job list through the language model tool and through MCP
   :id: AC_LISTJOBS_JOURNEY
   :status: approved
   :validates: US_AUT_HEARTBEAT

   **Given** the three jobs above, an agent chat in Agent mode, ``jarvis.mcp.enabled``
   set to ``true`` (the default is ``false``) and an MCP client such as GitHub
   Copilot connected

   1. **When** the tester sends the prompt ``Call jarvis_listJobs and show me
      the full result.``
      **Then** the JSON result lists every job of ``heartbeat.yaml``, each with
      ``name``, ``schedule``, ``enabled`` and ``nextFire``; ``t1-cron-sentinel``
      has ``enabled: true`` and a ``nextFire`` ISO-8601 timestamp in the future;
      ``t-listjobs-paused`` has ``enabled: false`` and ``nextFire: null``;
      ``t2-manual-show-output`` has ``nextFire: null`` and is enabled.
   2. **When** the tester calls ``jarvis_listJobs`` through the MCP interface
      **Then** the returned ``jobs`` array has the same jobs, with the same
      ``name``, ``schedule``, ``enabled`` and ``nextFire`` values, as the result
      of step 1, with no job missing or added.
