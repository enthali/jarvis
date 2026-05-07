Devcontainer Session Lookup UAT Design Specifications
======================================================

.. spec:: Devcontainer Session Lookup Test Data
   :id: SPEC_UAT_REMOTECOMPAT_FILES
   :status: approved
   :links: REQ_UAT_REMOTECOMPAT_FILES; US_MSG_REMOTECOMPAT

   **Description:**
   Test data for the Devcontainer Session Lookup feature reuses the existing
   ``testdata/projects/alpha/`` project leaf. The ``state.vscdb`` database is
   the live VS Code workspace storage file. Testers manipulate it manually for
   T-2 (missing-database scenario) and restore it afterwards.

   **Test data:**

   * ``testdata/projects/alpha/project.yaml`` — project leaf used for T-1 to T-4
   * Live ``state.vscdb`` at ``<globalStorageUri>/../workspaceStorage/<hash>/state.vscdb``
     — no additional fixture files required
   * For T-2: tester renames the file to ``state.vscdb.bak`` before the test and
     restores it after


.. spec:: Devcontainer Session Lookup Expected Outcomes
   :id: SPEC_UAT_REMOTECOMPAT_OUTCOMES
   :status: approved
   :links: REQ_UAT_REMOTECOMPAT_TESTDATA; REQ_MSG_SESSIONLOOKUP; US_MSG_REMOTECOMPAT

   **Description:**
   Expected outcome table for each Devcontainer Session Lookup test scenario.

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 12 48 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (local regression)
        - Run ``Jarvis: Open Agent Session`` on "alpha" with an existing "alpha"
          session and ``state.vscdb`` present
        - Existing "alpha" session is focused; no duplicate; behaviour matches
          pre-change behaviour
      * - T-2 (missing db)
        - Remove ``state.vscdb``; run ``Jarvis: Open Agent Session`` or
          ``jarvis_listSessions``
        - Warning visible in ``Output > Jarvis``; no crash; new session opened
          or empty list returned
      * - T-3 (path via globalStorageUri)
        - Trigger ``Jarvis: Open Agent Session``; inspect log output for resolved
          path
        - Logged path is under ``workspaceStorage/<hash>/`` derived from
          ``globalStorageUri``, not a remote filesystem path
      * - T-4 (listSessions tool)
        - Invoke ``jarvis_listSessions`` tool in agent chat with at least one
          session present
        - Tool response lists the expected session(s) by name; no error returned
