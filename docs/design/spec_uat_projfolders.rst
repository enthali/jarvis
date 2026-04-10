Convention-File Model UAT Design Specifications
=================================================

.. spec:: Convention-File Sidebar Test Data
   :id: SPEC_UAT_SIDEBAR_FILES
   :status: approved
   :links: REQ_UAT_SIDEBAR_TESTDATA; SPEC_UAT_TESTDATA_FILES

   **Description:**
   Test data for convention-file sidebar testing reuses the restructured
   ``testdata/`` directory documented in ``SPEC_UAT_TESTDATA_FILES``. No
   additional test data files are needed — the existing convention-file
   layout covers all scenarios.

   **Test data:**

   * Uses existing ``testdata/projects/`` (convention-file model):
     ``alpha/project.yaml``, ``beta/project.yaml``, ``gamma/project.yaml``,
     ``active/delta/project.yaml``, ``invalid-no-name/project.yaml``,
     ``invalid-bad-name/project.yaml``
   * Uses existing ``testdata/events/`` (convention-file model):
     ``2025/2025-03-15-conference/event.yaml``, ``2025/2025-06-20-workshop/event.yaml``,
     ``2025/2025-09-18-iot-summit/event.yaml``, ``2027/2027-01-10-meetup/event.yaml``,
     ``invalid-empty/event.yaml``, ``invalid-bad-status/event.yaml``

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (project convention)
        - Expand Projects section
        - 3 leaf nodes: "Project Alpha", "Project Beta", "Project Gamma"
      * - T-2 (event convention)
        - Expand Events section
        - Leaf nodes per event name; ``2025/`` and ``2027/`` as grouping nodes
      * - T-3 (grouping folder)
        - Expand Projects → ``active/``
        - Collapsible node; "Project Delta" inside
      * - T-4 (year grouping)
        - Expand Events → ``2025/``
        - 3 past events as leaf nodes inside year folder
      * - T-5 (fallback: no name)
        - Expand Projects with ``invalid-no-name/`` present
        - Leaf labeled ``invalid-no-name``
      * - T-6 (fallback: bad name)
        - Expand Projects with ``invalid-bad-name/`` present
        - Leaf labeled ``invalid-bad-name``
      * - T-7 (fallback: empty file)
        - Expand Events with ``invalid-empty/`` present
        - Leaf labeled ``invalid-empty``
      * - T-8 (no descent)
        - Expand Projects; inspect ``alpha/``
        - Leaf only — no expand arrow, no child items


.. spec:: Empty-Branch Pruning Test Data
   :id: SPEC_UAT_EVENTFILTER_FILES
   :status: approved
   :links: REQ_UAT_EVENTFILTER_TESTDATA; SPEC_UAT_TESTDATA_FILES

   **Description:**
   Test data for empty-branch pruning reuses the existing ``testdata/events/``
   directory. The year-grouped structure provides natural test cases — ``2025/``
   with only past events and ``2027/`` with a future event.

   **Test data:**

   * Uses existing ``testdata/events/2025/`` — 3 past events (all ``dates.end``
     before 2026-04-09)
   * Uses existing ``testdata/events/2027/`` — 1 future event
     (``2027-01-10-meetup``)
   * Uses existing ``testdata/events/invalid-bad-status/event.yaml`` — no
     ``dates.end`` field (fail-open test)

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (year pruned)
        - Enable future-only filter
        - ``2025/`` grouping node disappears entirely
      * - T-2 (partial pruning)
        - Enable future-only filter
        - ``2027/`` visible; ``2025/`` hidden; undated events remain
      * - T-3 (filter off)
        - Disable future-only filter
        - ``2025/`` reappears with all past events
      * - T-4 (undated survives)
        - Enable future-only filter
        - ``invalid-bad-status`` leaf remains visible (fail-open)
