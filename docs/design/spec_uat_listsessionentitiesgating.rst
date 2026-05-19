``jarvis_listSessionEntities`` Gating UAT Design Specifications
===============================================================

.. spec:: jarvis_listSessionEntities Gating Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_LISTSESSIONENTITIESGATING
   :status: implemented
   :links: REQ_UAT_LISTSESSIONENTITIESGATING

   **Description:**
   Step-by-step procedures and expected outcomes for the three
   ``jarvis_listSessionEntities`` gating acceptance test scenarios, covering
   the enabled path, the disabled path, and the symmetry regression check with
   ``jarvis_createSession``.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/list-session-entities-gating-bug`` branch.  Launch via F5 in
     VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…).  This sets ``testdata/`` as the workspace root.
   * Pre-existing session test data is present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and ``context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md``

   * For each scenario: apply the required ``jarvis.sessions.enabled`` value in
     VS Code Settings UI (search ``sessions.enabled``), then run
     **Developer: Restart Extension Host** from the Command Palette, and
     reopen the VS Code Chat panel before issuing the prompt.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 7 43 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Feature ENABLED

          *CR AC: 1, 2*
        - Precondition: ``jarvis.sessions.enabled=true`` (default). Restart
          Extension Host.

          Open the VS Code Chat **Tools** picker (click the tools icon in the
          Chat input bar) and confirm ``jarvis_listSessionEntities`` is listed.

          Then prompt the model:

          *"List my Jarvis sessions."*

          Observe the tool call in the chat thread.
        - **Tool picker:** ``jarvis_listSessionEntities`` is visible in the
          Tools picker before issuing the prompt.

          **Tool invoked:** Copilot invokes ``jarvis_listSessionEntities``
          automatically (tool call shown in the chat thread).

          **Response:** A JSON array (or human-readable summary) that includes
          at least ``copilot-cm`` and ``dev-feature-x`` — the two pre-existing
          sessions.

      * - T-2

          Feature DISABLED

          *CR AC: 1*
        - Precondition: set ``jarvis.sessions.enabled=false`` in VS Code
          Settings UI. Run **Developer: Restart Extension Host**. Reopen
          Chat panel.

          Open the VS Code Chat **Tools** picker.

          Then prompt the model:

          *"List my Jarvis sessions."*

          Observe the chat response.
        - **Tool picker:** ``jarvis_listSessionEntities`` is NOT present in
          the Tools picker.

          **Tool NOT invoked:** Copilot does not call
          ``jarvis_listSessionEntities``.  It either responds with a
          free-form answer, states it cannot access sessions, or asks for
          permission to use a different tool.

          **No session list** is returned from the Jarvis extension.

      * - T-3

          Symmetry — both tools absent

          *CR AC: 3, 4*
        - Precondition: ``jarvis.sessions.enabled=false`` (same reload state
          as T-2 — no additional reload required if T-2 was run immediately
          before).

          Open the VS Code Chat **Tools** picker.

          Verify both ``jarvis_listSessionEntities`` and
          ``jarvis_createSession`` in the list.
        - **Both absent:** Neither ``jarvis_listSessionEntities`` nor
          ``jarvis_createSession`` appears in the Tools picker.

          This confirms that the single ``if (sessions.enabled)`` gated block
          in ``extension.ts`` controls both tools simultaneously, consistent
          with the ``tool-deregistration.md`` ADR (static gating, reload
          required to apply config changes).

          *Restore: set* ``jarvis.sessions.enabled=true`` *and restart
          Extension Host to leave the EDH in a usable state.*
