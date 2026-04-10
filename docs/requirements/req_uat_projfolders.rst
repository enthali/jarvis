Convention-File Model UAT Requirements
=======================================

.. req:: Convention-File Sidebar Test Data
   :id: REQ_UAT_SIDEBAR_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_SIDEBAR; REQ_EXP_YAMLDATA; REQ_EXP_TREEVIEW

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the convention-file model in the Projects and Events explorer
   trees.

   **Acceptance Criteria:**

   * AC-1: ``testdata/projects/`` uses the convention-file model — each project is
     a folder containing ``project.yaml``. At least 3 valid projects and 2 invalid
     variants exist (as documented in ``SPEC_UAT_TESTDATA_FILES``)
   * AC-2: ``testdata/events/`` uses the convention-file model — each event is
     a folder containing ``event.yaml``, organized under year grouping folders.
     At least 3 valid events and 2 invalid variants exist
   * AC-3: At least one grouping folder (no convention file) with a nested leaf
     exists in ``testdata/projects/`` to test folder hierarchy
   * AC-4: Expected outcomes for each test scenario (T-1 through T-8 from
     ``US_UAT_SIDEBAR``) SHALL be documented in the test protocol


.. req:: Empty-Branch Pruning Test Data
   :id: REQ_UAT_EVENTFILTER_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_EVENTFILTER; REQ_EXP_EVENTFILTER

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of empty-branch pruning in the Events explorer tree when the
   future-only filter is active.

   **Acceptance Criteria:**

   * AC-1: ``testdata/events/`` contains at least one year grouping folder
     (``2025/``) with only past events, so that enabling the future-only filter
     causes the entire branch to be pruned
   * AC-2: ``testdata/events/`` contains at least one year grouping folder
     (``2027/``) with a future event, so it survives filtering
   * AC-3: At least one event without a ``dates.end`` field exists to verify
     fail-open behaviour
   * AC-4: Expected outcomes for each test scenario (T-1 through T-4 from
     ``US_UAT_EVENTFILTER``) SHALL be documented in the test protocol
