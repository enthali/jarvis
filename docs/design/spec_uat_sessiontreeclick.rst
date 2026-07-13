Session Tree Click Behaviour UAT Design Specifications
=======================================================

.. spec:: Session Tree Click Behaviour Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SESSIONTREECLICK
   :status: draft
   :links: REQ_UAT_SESSIONTREECLICK

   **Description:**
   Step-by-step procedures and expected outcomes for all ten
   session-tree click-behaviour acceptance test scenarios, covering the
   inverted single-click semantics, inline icon visibility and tooltip,
   non-preview ``context.md`` open, double-click equivalence, context-menu
   preservation, discovery-only behavior on missing ``context.md`` (no
   auto-create), regression of pre-existing sessions, cross-CR sanity for
   programmatically created sessions, non-existence of the retired
   ``jarvis.openSessionContext`` command, and cross-kind consistency of the
   shared ``jarvis.openContext`` command across Session/Project/Event.

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/session-tree-click-behavior`` branch.  Launch via **F5** in
     VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…).  This sets ``testdata/`` as the workspace root.
   * ``jarvis.sessions.enabled`` must be ``true`` (default; no override
     needed unless changed in a previous test run).
   * Pre-existing session test data must be present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and
       ``context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md``

   * Expand the **Sessions**, **Projects**, and **Events** sections in the
     Jarvis sidebar so all leaf nodes are visible (Projects/Events needed
     for T-10).
   * For T-8, an active VS Code Chat agent session must be open in the EDH.
   * Between destructive scenarios (T-6, T-8, T-10), restore the original file
     state before proceeding to the next scenario.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Single click opens agent chat

          *CR AC: 1*
        - Precondition: both pre-existing sessions are visible in the
          Sessions Tree.

          Click the label text of the ``copilot-cm`` session node (not any
          icon — click the name text).

          Observe the VS Code editor area and any newly opened panels.
        - **Agent chat:** A VS Code Chat editor panel opens (or gains focus
          if already open) with a title that includes ``copilot-cm``.  The
          ``/rename`` command fires and the init prompt is sent for a brand-new
          chat; if the chat was already open it is brought to focus without a
          second ``/rename``.

          **No context.md editor:** No editor tab for ``context.md`` is
          opened as a side-effect of this click.

          **Status bar / output:** No error messages in the Jarvis output
          channel.

      * - T-2

          Inline icon visible on hover; tooltip reads "Open context.md"

          *CR AC: 3*
        - Hover the mouse pointer over the ``dev-feature-x`` session node in
          the Sessions Tree (do not click yet).

          Observe whether an icon appears to the right of the label text.
          Then hover directly over the icon and observe the tooltip text.
        - **Icon visibility:** A small inline icon (e.g. a file glyph)
          appears to the right of the node label while hovering.  It is not
          visible when the pointer is elsewhere.

          **Tooltip:** The tooltip text reads exactly::

            Open context.md

          (no trailing punctuation, no capitalisation variation).

          **No action yet:** No editor or chat opens from a hover alone.

      * - T-3

          Inline icon click opens context.md; chat NOT opened

          *CR AC: 2, 3*
        - Hover over the ``copilot-cm`` session node to reveal the inline
          icon, then click the icon.

          Observe which editor tab becomes active and whether any chat panel
          opens.
        - **Editor:** The file
          ``testdata/.jarvis/sessions/copilot-cm/context.md`` opens in the
          editor area.

          **Non-preview tab:** The tab for ``context.md`` is **not** in
          preview mode — its title is rendered in normal (non-italic) weight
          and the tab persists when another file is opened.  (Equivalent to
          ``preview: false``.)

          **No agent chat:** No VS Code Chat editor panel is opened or
          focused as a result of this click.  Any chat panel already open is
          unaffected.

      * - T-4

          Double-click behaves identically to single click

          *CR AC: 4*
        - Close all open editor tabs.  Double-click the label text of the
          ``dev-feature-x`` session node in quick succession.

          Observe the editor area for any opened tabs or panels.
        - **Agent chat:** Exactly one VS Code Chat editor panel opens (or
          gains focus), identical to T-1.  The ``/rename`` + init prompt
          fires once.

          **No duplicate:** Only one chat editor is opened — not two side-
          by-side instances.

          **No context.md:** No editor tab for ``context.md`` appears.

      * - T-5

          Context-menu entries unchanged

          *CR AC: 5*
        - Right-click the ``copilot-cm`` session node in the Sessions Tree.

          Inspect the context menu that appears.  Then invoke each entry in
          turn and verify it executes without error.
        - **Menu entries:** The context menu contains at least the following
          five entries (labels may vary by locale but commands must map):

          * **Open Context** — opens ``context.md`` in the editor.
          * **Open Agent Session** — opens / focuses the agent-chat editor.
          * **Reveal in Explorer** — selects the session folder in the VS Code
            Explorer sidebar.
          * **Reveal in OS** — opens the session folder in File Explorer /
            Finder.
          * **Open in Terminal** — opens an integrated terminal with the
            session folder as cwd.

          **No new or missing entries** compared to the pre-CR context menu.
          **No errors** are shown in the notification area or Jarvis output
          channel when each entry is invoked.

      * - T-6

          Discovery-only behavior — missing context.md shows info message,
          no auto-create

          *CR AC: 6*
        - Precondition: using File Explorer or terminal, **delete**
          ``testdata/.jarvis/sessions/dev-feature-x/context.md``.
          Confirm the file is absent on disk.

          Return to the Jarvis sidebar.  Hover over the ``dev-feature-x``
          session node to reveal the inline icon, then click the icon.

          Observe the editor, any notifications, and the filesystem.
        - **No file recreation:** ``testdata/.jarvis/sessions/dev-feature-x/context.md``
          remains absent from disk — it is **not** recreated.

          **Information message:** A non-blocking information message is
          shown (e.g. "No context.md found for this entity").

          **No editor opened:** No editor tab opens as a result of this
          click; the agent-chat editor is also not opened.

          *Clean up: restore* ``context.md`` *(e.g. via* ``git checkout`` *)*
          *after the scenario.*

      * - T-7

          Regression — pre-existing sessions unaffected

          *CR AC: 1–6 regression*
        - With no prior modifications, perform **both** of the following
          on the ``copilot-cm`` session:

          a. Single click on the node label.
          b. Click the inline icon.

          Repeat for ``dev-feature-x``.

          After each action, inspect ``session.yaml`` and ``context.md``
          for unexpected modifications.
        - **Single click (a):** Agent-chat editor opens / focuses for the
          clicked session (same as T-1).

          **Inline icon (b):** ``context.md`` opens in a non-preview tab
          (same as T-3).

          **File integrity:** The ``mtime`` (last-modified timestamp) of
          ``session.yaml`` is unchanged for both sessions.  The ``mtime``
          of ``context.md`` is unchanged for both sessions (the files were
          not rewritten; only opened for reading).

          **No surprises:** No error toasts or unexpected notifications.

      * - T-8

          Cross-CR sanity — newly created session exhibits new semantics

          *CR AC: 1, 2 (cross-CR)*
        - Precondition: ``testdata/.jarvis/sessions/click-test-new/`` does
          not exist.

          In the VS Code Chat input bar, prompt the model:

          *"Call jarvis_createActor with name 'click-test-new'."*

          Wait for the Sessions Tree to show the new ``click-test-new``
          node (within 2 seconds).

          Then:

          a. Single click on the ``click-test-new`` label.
          b. Hover to reveal the inline icon, then click it.
        - **Sessions Tree refresh:** ``click-test-new`` appears in the tree
          within 2 seconds, no manual rescan.

          **Single click (a):** Agent-chat editor opens for ``click-test-new``
          (new click semantics apply to freshly created sessions).

          **Inline icon (b):** ``context.md`` for ``click-test-new`` opens in
          a non-preview editor tab.

          *Clean up: delete* ``testdata/.jarvis/sessions/click-test-new/``
          *after the scenario.*

      * - T-9

          ``jarvis.openSessionContext`` non-existence (not merely
          palette-hidden)

          *CR AC: 9*
        - a. Search all ``package.json`` files in the repository (root,
               ``packages/core``, ``packages/pim``) for the string
               ``openSessionContext``.

          b. Open the Command Palette (``Ctrl+Shift+P``) and search for
             "Open Session Context" / "openSessionContext".

          c. Open the EDH's Debug Console and run
             ``await vscode.commands.executeCommand('jarvis.openSessionContext')``.
        - **No package.json references:** zero matches for
          ``openSessionContext`` in any ``package.json``.

          **Not in palette:** the command does not appear in the Command
          Palette results.

          **Execution fails:** the ``executeCommand`` call rejects with an
          error containing "command 'jarvis.openSessionContext' not found"
          (or equivalent VS Code wording) — proving the command is fully
          unregistered, not just hidden from the palette.

      * - T-10

          Cross-kind consistency — shared ``jarvis.openContext`` behaves
          identically for Project/Event/Session

          *CR AC: 10*
        - Repeat the T-3 check (inline icon opens ``context.md``,
          ``preview:false``, no chat side-effect) on the ``alpha`` Project
          node and the ``DevCon 2026`` Event node.

          Then repeat the T-6 check (delete ``context.md``, click inline
          icon, observe no recreation + information message) on the same
          two nodes.
        - **Project (``alpha``):** Inline icon opens
          ``testdata/projects/alpha/context.md`` in a non-preview tab; after
          deleting the file, clicking the icon shows an information message
          and does not recreate it.

          **Event (``DevCon 2026``):** Inline icon opens
          ``testdata/events/2026-06-15_DevCon 2026/context.md`` in a
          non-preview tab; after deleting the file, clicking the icon shows
          an information message and does not recreate it.

          **Consistency:** Behavior for both kinds is identical to the
          Session node behavior verified in T-3/T-6, confirming
          ``jarvis.openContext`` is the single shared command across all 3
          entity kinds.

          *Clean up: restore both deleted* ``context.md`` *files (e.g. via*
          ``git checkout`` *) after the scenario.*

      * - T-9

          Command palette hygiene — openSessionContext not listed

          *CR implicit (commandPalette: false)*
        - Close the Sessions Tree hover / any open menus.  Open the VS Code
          Command Palette with ``Ctrl+Shift+P``.

          Type ``openSessionContext`` in the palette search box.

          Observe the list of matching commands.
        - **No match:** The command ``jarvis.openSessionContext`` (or any
          display label such as *"Open Session Context"*) does **not** appear
          in the Command Palette.

          This confirms the command is registered with
          ``"commandPalette": false`` in ``package.json`` and is intended
          for tree-context use only.
