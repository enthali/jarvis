Actor Identity Recovery (jarvis_whoAmI) UAT Design Specifications
==================================================================

.. spec:: jarvis_whoAmI — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_WHOAMI
   :status: draft
   :links: REQ_UAT_WHOAMI; US_UAT_WHOAMI; SPEC_ACT_WHOAMI; REQ_ACT_WHOAMI

   **Description:**
   Step-by-step procedures and expected outcomes for test scenarios covering
   the ``jarvis_whoAmI`` LM+MCP tool. Scenarios cover identity resolution for
   registered actors, error handling for non-actor sessions, the no-input
   contract, and tool availability gating.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/jarvis-whoami`` branch. Launch via **F5** in VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…). This sets ``testdata/`` as the workspace root.
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * Test-data files under ``testdata/.jarvis/actors/``:

     * Actor ``Change Manager`` with ``session.yaml`` containing
       ``name: Change Manager`` and ``kind: session`` (or no kind — default).
     * Actor ``Test Designer`` with ``session.yaml`` containing
       ``name: Test Designer``.
     * Each actor has a ``context.md`` file.

   * Open the **Jarvis** Output Channel (View → Output → Jarvis) so that
     ``[SES] whoAmI`` log entries can be inspected.
   * Confirm that the Jarvis sidebar shows both actors in the Sessions tree
     before starting tests.
   * For the tool to be available: ``jarvis.sessions.enabled`` must be ``true``
     (verified by the tool appearing in the VS Code Chat tool picker under
     name ``whoAmI``).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 35 40 17

      * - Scenario
        - Action
        - Expected Result
        - Req Link

      * - T-1

          Registered actor — name and contextPath returned

          *(AC-1, AC-3)*
        - Precondition: The ``Change Manager`` actor is registered (session.yaml
          present under ``testdata/.jarvis/actors/Change Manager/``). A VS Code
          chat session named ``Change Manager`` is open and is the **active tab**.

          From within the ``Change Manager`` chat session, invoke the tool:

          .. code-block:: text

             #whoAmI

          (Select the tool from the tool picker, or type ``#whoAmI`` in the chat input.)

          Observe the tool result.
        - **JSON result returned:** The tool returns a JSON object of the form:

          .. code-block:: json

             {
               "name": "Change Manager",
               "contextPath": "<absolute path to testdata/.jarvis/actors/Change Manager/context.md>"
             }

          **Name matches session:** ``name`` value equals ``"Change Manager"``.

          **contextPath is absolute:** The path starts with the workspace root
          and ends with ``actors/Change Manager/context.md``.

          **Log entry:** Jarvis Output Channel shows
          ``[SES] whoAmI: "Change Manager" → <contextPath>``.

          **No input required:** The tool is invoked without any parameters.
        - REQ_ACT_WHOAMI AC-1, AC-2; US_ACT_WHOAMI AC-1, AC-3

      * - T-2

          Second registered actor — different name and path returned

          *(AC-1, identity isolation)*
        - Precondition: The ``Test Designer`` actor is registered. A VS Code
          chat session named ``Test Designer`` is open and is the **active tab**.

          From within the ``Test Designer`` chat session, invoke the tool:

          .. code-block:: text

             #whoAmI

          Observe the tool result.
        - **JSON result returned:**

          .. code-block:: json

             {
               "name": "Test Designer",
               "contextPath": "<absolute path to testdata/.jarvis/actors/Test Designer/context.md>"
             }

          **Name matches session:** ``name`` equals ``"Test Designer"``
          (not ``"Change Manager"`` — identity isolation confirmed).

          **contextPath is absolute:** Points to the correct actor's folder.

          **Log entry:** Output Channel shows
          ``[SES] whoAmI: "Test Designer" → <contextPath>``.
        - REQ_ACT_WHOAMI AC-1, AC-2

      * - T-3

          Non-actor session — error message returned

          *(AC-2)*
        - Precondition: A VS Code chat session is open whose title does NOT
          match any registered actor. For example, open a plain VS Code Chat
          (without any Jarvis actor association) named ``Copilot`` or
          ``(untitled)`` and make it the active tab.

          From within the non-actor session, invoke the tool:

          .. code-block:: text

             #whoAmI

          Observe the tool result.
        - **Error message returned:** The tool returns a JSON object
          (or plain text) containing an error:

          .. code-block:: json

             {
               "error": "You are not a registered actor. Please ask the user which actor you are."
             }

          **No crash:** The tool does not throw or cause the extension to error.

          **No contextPath:** The result does not contain a ``contextPath``
          or ``name`` field.
        - REQ_ACT_WHOAMI AC-3; US_ACT_WHOAMI AC-2

      * - T-4

          No active tab — graceful error

          *(AC-2 edge, robustness)*
        - Precondition: This scenario tests the "no active tab" branch.
          In practice this is hard to trigger manually (there is almost always
          an active tab in VS Code); test by reviewing the handler code or
          simulating via unit test.

          If testable manually: close all editor tabs and all chat panels
          such that ``vscode.window.tabGroups.activeTabGroup.activeTab`` is
          ``undefined``, then invoke ``#whoAmI``.

          Observe the tool result.
        - **Graceful error returned:** The tool returns an error object:

          .. code-block:: json

             {
               "error": "No active tab. Please ask the user which actor you are."
             }

          **No crash:** No exception propagates to the user.

          **Note:** If this scenario cannot be triggered manually in the EDH,
          it is acceptable to verify by code inspection that the ``!activeTab``
          guard is present in the handler.
        - REQ_ACT_WHOAMI AC-3; SPEC_ACT_WHOAMI algorithm step 1

      * - T-5

          Tool requires no input parameters

          *(AC-3)*
        - Precondition: ``Change Manager`` session is open and active.

          Open the VS Code Chat tool picker (click the tool icon or type ``#``
          in the chat input). Locate ``whoAmI`` in the list.

          Observe whether the tool requests any parameters when selected.
        - **No parameter prompt:** The tool is invokable without entering any
          parameters. The tool picker shows ``whoAmI`` with no required fields.

          **Tool result returned:** The tool returns the expected JSON result
          for the active actor without any additional input.
        - REQ_ACT_WHOAMI AC-1; US_ACT_WHOAMI AC-3

      * - T-6

          Tool visible in tool picker (sessions.enabled = true)

          *(AC-4, AC-5)*
        - Precondition: ``jarvis.sessions.enabled`` is ``true`` (default).
          Extension is running in EDH.

          Open VS Code Chat and type ``#`` in the chat input to open the tool
          picker.

          Search for ``whoAmI``.
        - **Tool appears:** ``whoAmI`` is visible in the tool picker list.

          **Tool reference name:** The tool appears under the short name
          ``whoAmI`` (not the full ``jarvis_whoAmI``).
        - REQ_ACT_WHOAMI AC-4, AC-5

      * - T-7

          Tool NOT available (sessions.enabled = false)

          *(AC-4 — gating)*
        - Precondition: Set ``jarvis.sessions.enabled`` to ``false`` in VS Code
          Settings (or in ``testdata/.vscode/settings.json``). Restart the EDH
          (or reload the extension host) to apply the setting.

          Open VS Code Chat and type ``#`` to open the tool picker.

          Search for ``whoAmI``.
        - **Tool not present:** ``whoAmI`` does NOT appear in the tool picker.

          **No error:** The extension does not crash or log an error about the
          missing tool.

          **Teardown:** Reset ``jarvis.sessions.enabled`` to ``true`` and
          restart the EDH before running subsequent tests.
        - REQ_ACT_WHOAMI AC-4

      * - T-8

          Identity recovery after /compact — end-to-end

          *(US_ACT_WHOAMI motivating use case)*
        - Precondition: ``Change Manager`` session is open and has been
          compacted via ``/compact`` (so its prior context messages are
          summarized or removed).

          From within the ``Change Manager`` session (post-compact), invoke:

          .. code-block:: text

             #whoAmI

          Observe the result.
        - **Identity returned:** The tool returns the correct actor name
          (``"Change Manager"``) and ``contextPath`` even after ``/compact``.

          **contextPath is readable:** Navigate to the returned path in the
          file system (or open it in VS Code) — it opens the actor's
          ``context.md`` correctly.

          **Recovery confirmed:** The actor can use the returned ``contextPath``
          to read its persistent memory and resume its role.
        - US_ACT_WHOAMI AC-1; REQ_ACT_WHOAMI AC-2
