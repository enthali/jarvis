Tree Search UAT Requirements
=============================

.. req:: Tree Quick Search Test Data
   :id: REQ_UAT_EXP_TREESEARCH_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_EXP_TREESEARCH; REQ_EXP_SEARCHPROJECTS; REQ_EXP_SEARCHEVENTS

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the QuickPick-based search commands for the Projects and Events
   tree views.

   **Acceptance Criteria:**

   * AC-1: The existing ``testdata/projects/`` tree (alpha, beta, gamma,
     active/delta) is reused for T-1, T-3, T-5, T-6; no new project test data
     files are required
   * AC-2: The existing ``testdata/events/2025/`` entries (conference, workshop,
     IoT Summit) are reused for T-2, T-4, T-7; no new event test data files are
     required
   * AC-3: Workspace settings SHALL configure ``jarvis.projectsFolder`` to
     ``testdata/projects`` and ``jarvis.eventsFolder`` to ``testdata/events``
     (via ``testdata/test.code-workspace`` or the F5 launch configuration) before
     running the tests
   * AC-4: Expected outcomes for each test scenario (T-1 through T-8 from
     ``US_UAT_EXP_TREESEARCH``) SHALL be documented in the test protocol
