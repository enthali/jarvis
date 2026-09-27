Session Tools UAT Design Specifications
=========================================

.. spec:: Open Chat Session Test Data
   :id: SPEC_UAT_OPENSESSION_FILES
   :status: approved
   :links: REQ_UAT_OPENSESSION_TESTDATA; SPEC_MSG_OPENSESSION

   **Description:**
   No new test data files are required. The Open Chat Session command reads
   session data from the live ``state.vscdb`` database. Testers create and
   rename chat sessions manually in the Extension Development Host.

   **Test data:**

   * Uses live ``state.vscdb`` sessions — no files in ``testdata/``

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (open named)
        - Run ``Jarvis: Open Chat Session``, select "Project Alpha"
        - Session opens as editor tab
      * - T-2 (no sessions)
        - Run ``Jarvis: Open Chat Session`` with no named sessions
        - Info notification shown, no QuickPick
      * - T-3 (filter unnamed)
        - Run command with named, unnamed, and "New Chat" sessions
        - Only named sessions appear in QuickPick
      * - T-4 (stale session)
        - Select a session that was closed while QuickPick was open
        - No crash; platform handles stale URI gracefully


.. spec:: List Sessions LM Tool Test Data
   :id: SPEC_UAT_LISTSESSIONS_FILES
   :status: approved
   :links: REQ_UAT_LISTSESSIONS_TESTDATA; SPEC_MSG_LISTSESSIONS

   **Description:**
   No new test data files are required. The LM Tool reads session data from
   the live ``state.vscdb`` database. Testers create and rename chat sessions
   manually in the Extension Development Host.

   **Test data:**

   * Uses live ``state.vscdb`` sessions — no files in ``testdata/``

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (tool picker)
        - Type ``#`` in Chat panel
        - ``listSessions`` appears in tool list
      * - T-2 (list named)
        - Invoke ``#listSessions`` with a named session present
        - JSON array containing ``"Project Alpha"`` returned
      * - T-3 (empty list)
        - Invoke ``#listSessions`` with no named sessions
        - Empty JSON array ``[]`` returned
      * - T-4 (filter unnamed)
        - Invoke tool with named, unnamed, and "New Chat" sessions
        - Only named session titles in returned array
