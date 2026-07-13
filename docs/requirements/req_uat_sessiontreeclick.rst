Session Tree Click Behaviour UAT Requirements
=============================================

.. req:: Session Tree Click Behaviour — Test Data and Verification Requirements
   :id: REQ_UAT_SESSIONTREECLICK
   :status: draft
   :priority: required
   :links: US_UAT_SESSIONTREECLICK; REQ_ACT_TREECLICK; REQ_ENT_OPENCONTEXT

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the inverted session-tree click semantics in
   the Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/session-tree-click-behavior`` checked
     out).
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * Pre-existing session test data must be present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and
       ``context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md``

   * The Sessions Tree must be visible in the Jarvis sidebar (expand the
     Sessions section if collapsed).
   * The Projects Tree (``testdata/projects/alpha``) and Events Tree
     (``testdata/events/2026-06-15_DevCon 2026``) must also be visible for
     T-10 (cross-kind consistency check).
   * An agent chat session must be open in the EDH (any name) for T-8 so that
     ``jarvis_createActor`` can be invoked.
   * Between scenarios that create or delete files, restore the original state
     before proceeding to the next scenario.

   **Acceptance Criteria — per REQ_ACT_TREECLICK AC:**

   * AC-1 (REQ AC-1 — single click opens agent chat):
     For T-1 and T-7, the tester SHALL verify that clicking the session name
     label opens (or focuses) a VS Code Chat editor panel whose title contains
     the session name, and that no editor for ``context.md`` is opened as a
     side effect.

   * AC-2 (REQ_ENT_OPENCONTEXT AC-6 — inline icon opens context.md,
     preview:false, via the shared ``jarvis.openContext`` command):
     For T-3, the tester SHALL verify that after clicking the inline icon the
     active editor is ``context.md`` and that its tab is not marked as
     preview (the tab title is not in italics / the tab does not close on next
     open).  The agent-chat editor SHALL NOT gain focus as a result of this
     click.

   * AC-3 (REQ_ENT_OPENCONTEXT AC-1 — inline icon with tooltip):
     For T-2, the tester SHALL verify that hovering over any ``jarvisSession``
     tree node reveals the inline icon, and that the tooltip text displayed is
     ``"Open Context"`` (the ``jarvis.openContext`` command title, category
     prefix stripped).

   * AC-4 (REQ AC-4 — double-click == single click):
     For T-4, the tester SHALL verify that a deliberate double-click on the
     session name produces exactly one agent-chat editor (no second editor, no
     duplicate chat), and that ``context.md`` is not opened.

   * AC-5 (REQ AC-5 — context menu unchanged):
     For T-5, the tester SHALL right-click a ``jarvisSession`` node and verify
     that the context menu contains exactly the following entries (order may
     vary by VS Code version):

     * **Open Context** (``jarvis.openContext``)
     * **Open Agent Session** (``jarvis.openAgentSession``)
     * **Reveal in Explorer** (``jarvis.revealInExplorer``)
     * **Reveal in OS** (``jarvis.revealInOS``)
     * **Open in Terminal** (``jarvis.openInTerminal``)

     Each entry SHALL be invokable without error.

   * AC-6 (REQ_ENT_OPENCONTEXT AC-6 — discovery-only, no auto-create):
     For T-6, the tester SHALL:

     a. Delete ``context.md`` from one of the pre-existing session folders.
     b. Confirm the file is absent on disk.
     c. Click the inline icon on that session node.
     d. Verify that ``context.md`` is **not** recreated on disk — the file
        remains absent.
     e. Verify that an information message is shown (e.g. "No context.md
        found for this entity") and that no editor opens as a result.
     f. Restore ``context.md`` (e.g. from version control) after the test.

   * AC-7 (legacy regression — pre-existing sessions):
     For T-7, the tester SHALL verify that ``copilot-cm`` and
     ``dev-feature-x`` (created before this CR) respond to the new click
     semantics — single click opens the agent chat, inline icon opens
     ``context.md`` — and that no data in their ``session.yaml`` or
     ``context.md`` files is modified by tree interactions (``mtime``
     unchanged for both files, confirming no auto-create side effect).

   * AC-8 (cross-CR sanity — freshly created session):
     For T-8, the tester SHALL invoke ``jarvis_createActor`` with a unique
     test name and immediately verify that the newly created session node in
     the Sessions Tree responds to single click by opening the agent chat (not
     ``context.md``), confirming uniform treatment of all session leaves.

   * AC-9 (command non-existence — entity-open-context-cleanup CR):
     For T-9, the tester SHALL verify that ``jarvis.openSessionContext`` no
     longer exists in any form:

     a. Search ``package.json`` (all packages) for ``openSessionContext`` —
        zero matches.
     b. Open the Command Palette (``Ctrl+Shift+P``) and confirm the command
        does not appear.
     c. From the Extension Development Host's Debug Console (or a temporary
        test command), attempt
        ``vscode.commands.executeCommand('jarvis.openSessionContext')`` and
        verify it rejects with a "command '...' not found" error, confirming
        the command is not merely hidden but genuinely unregistered.

   * AC-10 (cross-kind consistency — shared ``jarvis.openContext``):
     For T-10, the tester SHALL repeat the T-3 (inline icon opens
     ``context.md``, ``preview:false``) and T-6 (missing file → information
     message, no auto-create) checks on a Project node (``alpha``) and an
     Event node (``DevCon 2026``), and verify identical behavior to the
     Session node checks in T-3/T-6 — confirming ``jarvis.openContext`` is
     the single shared command for all 3 entity kinds.
