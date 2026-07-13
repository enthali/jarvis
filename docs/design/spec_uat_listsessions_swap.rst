List Sessions Tool Swap UAT Design Specifications
===================================================

.. spec:: List Sessions / List Chat Sessions Tool Swap Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_LISTSESSIONS_SWAP
   :status: draft
   :links: REQ_UAT_LISTSESSIONS_SWAP

   **Description:**
   Step-by-step procedures and expected outcomes for the v0.7.0 breaking
   tool-name swap: ``jarvis_listActors`` → YAML entities;
   ``jarvis_listChatSessions`` → VS Code chat tab titles.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * Sessions ``copilot-cm`` and ``dev-feature-x`` loaded.
   * For T-2, T-3: rename a VS Code Chat tab to "Test Tab Alpha"; leave one
     tab as "New Chat" (default/untitled).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          ``jarvis_listActors`` returns YAML entity objects

          *AC-1*
        - Open Chat tool picker (``#``). Invoke ``jarvis_listActors``.
          Inspect response.
        - Response is a JSON **array of objects**, not strings. Each object
          has ``name``, ``summary``, ``folder``. Both ``copilot-cm`` and
          ``dev-feature-x`` present. No chat tab titles in response.

      * - T-2

          ``jarvis_listChatSessions`` returns chat tab title strings

          *AC-2*
        - Verify ``jarvis_listChatSessions`` appears in picker. Invoke it.
          Inspect response.
        - Response is a JSON **array of strings** (titles). "Test Tab Alpha"
          present. No YAML entity objects in response (strings only).

      * - T-3

          ``jarvis_listChatSessions`` filters unnamed / "New Chat" sessions

          *AC-3*
        - With "Test Tab Alpha", one untitled chat, and one "New Chat" session
          open: invoke ``jarvis_listChatSessions``.
        - Response contains only ``["Test Tab Alpha"]``. Untitled and
          "New Chat" entries excluded.
