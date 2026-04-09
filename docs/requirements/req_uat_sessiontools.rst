Session Tools UAT Requirements
=================================

.. req:: Open Chat Session Test Data
   :id: REQ_UAT_OPENSESSION_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_OPENSESSION; REQ_MSG_OPENSESSION; REQ_MSG_SESSIONFILTER

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification
   of the Open Chat Session (QuickPick) command.

   **Acceptance Criteria:**

   * AC-1: No new test data files are required — the feature operates on live
     ``state.vscdb`` data; testers create named sessions manually during testing
   * AC-2: Expected outcomes for each test scenario (T-1 through T-4 from
     ``US_UAT_OPENSESSION``) SHALL be documented in the test protocol
   * AC-3: Test instructions SHALL specify that at least one chat session must
     be manually renamed to a known name (e.g. "Project Alpha") before testing


.. req:: List Sessions LM Tool Test Data
   :id: REQ_UAT_LISTSESSIONS_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_LISTSESSIONS; REQ_MSG_LISTSESSIONS; REQ_MSG_SESSIONFILTER

   **Description:**
   The repo SHALL contain documented expected outcomes for manual verification
   of the List Sessions LM Tool.

   **Acceptance Criteria:**

   * AC-1: No new test data files are required — the tool reads live
     ``state.vscdb`` data; testers create named sessions manually during testing
   * AC-2: Expected outcomes for each test scenario (T-1 through T-4 from
     ``US_UAT_LISTSESSIONS``) SHALL be documented in the test protocol
   * AC-3: Test instructions SHALL specify that the tester verifies tool
     availability via the ``#`` tool picker in the Chat panel


.. req:: Open Agent Session Test Data
   :id: REQ_UAT_AGENTSESSION_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_AGENTSESSION; REQ_EXP_AGENTSESSION

   **Description:**
   The repo SHALL contain test data and documented expected outcomes for manual
   verification of the Open Agent Session explorer action.

   **Acceptance Criteria:**

   * AC-1: Uses existing ``testdata/projects/`` and ``testdata/events/`` files
     (e.g. ``project-alpha.yaml``, ``event-conference.yaml``) — no new test
     data files required
   * AC-2: Expected outcomes for each test scenario (T-1 through T-5 from
     ``US_UAT_AGENTSESSION``) SHALL be documented in the test protocol
   * AC-3: Test instructions SHALL specify that ``jarvis.projectsFolder`` and
     ``jarvis.eventsFolder`` are pointed at the ``testdata/`` directories
