``jarvis_listSessionEntities`` Gating UAT Requirements
======================================================

.. req:: jarvis_listSessionEntities Gating — Test Data and Verification Requirements
   :id: REQ_UAT_LISTSESSIONENTITIESGATING
   :status: implemented
   :priority: required
   :links: US_UAT_LISTSESSIONENTITIESGATING; REQ_ACT_LISTTOOL

   **Description:**
   Specifies the workspace state and per-AC verification criteria required to
   manually validate the ``jarvis_listSessionEntities`` gating behaviour in the
   Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/list-session-entities-gating-bug`` checked
     out).
   * Pre-existing session test data must be present:
     ``testdata/.jarvis/sessions/copilot-cm/`` and
     ``testdata/.jarvis/sessions/dev-feature-x/``.
   * An active VS Code Chat agent session (any name) must be open in the EDH so
     that tool calls can be observed.
   * For each scenario requiring a reload: change the setting in VS Code
     Settings UI (``jarvis.sessions.enabled``), then run
     **Developer: Restart Extension Host** from the Command Palette, and
     reopen the Chat panel before issuing the prompt.

   **Acceptance Criteria — per REQ_ACT_LISTTOOL AC:**

   * AC-1 (Feature ENABLED — tool registered):
     The tester SHALL verify that with ``jarvis.sessions.enabled=true`` and
     the Extension Host reloaded, the ``jarvis_listSessionEntities`` tool is
     accessible: either via the VS Code Chat **Tools** picker or by prompting
     Copilot *"List my Jarvis sessions"* and observing that the tool is invoked
     and returns a JSON array containing at least the two pre-existing sessions
     (T-1).

   * AC-2 (Feature DISABLED — tool absent):
     The tester SHALL verify that with ``jarvis.sessions.enabled=false`` and
     the Extension Host reloaded, ``jarvis_listSessionEntities`` does NOT
     appear in the VS Code Chat **Tools** picker, and that a prompt such as
     *"List my Jarvis sessions"* does NOT trigger the tool — Copilot either
     responds without invoking any tool or reports that the tool is unavailable
     (T-2).

   * AC-3 (Symmetry — both session tools absent):
     The tester SHALL verify that with ``jarvis.sessions.enabled=false``, both
     ``jarvis_listSessionEntities`` and ``jarvis_createActor`` are absent
     from the **Tools** picker in the same reload, confirming that the shared
     gated block disables all session-related LM/MCP tools at once (T-3).
