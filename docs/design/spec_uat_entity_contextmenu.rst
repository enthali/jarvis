Entity Tree Context Menu UAT Design Specifications
=====================================================

.. spec:: Entity Tree Context Menu Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ENTITY_CONTEXTMENU
   :status: draft
   :links: REQ_UAT_ENTITY_CONTEXTMENU

   **Description:**
   Step-by-step procedures and expected outcomes for all ten entity tree
   context-menu acceptance test scenarios: menu contents on file-child and
   root nodes, Open parity with left-click for both node kinds, Copy
   Path/Copy Full Path correctness (folder-only vs. incl. filename), the
   root-node Copy Path == Copy Full Path equivalence, folder-node exclusion,
   and Command Palette exclusion.

   **Test Setup:**

   * Extension Development Host launched from
     ``feature/entity-tree-context-menu`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * All three entity sections (Sessions, Projects, Events) expanded;
     ``alpha``/``DevCon 2026``/``copilot-cm`` expanded to show file
     children.
   * A scratch editor tab or terminal available to paste clipboard contents
     for inspection.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          File-child menu contents

          *CR AC: 1*
        - Right-click the ``context.md`` child under ``alpha``.
        - Exactly 3 entries appear: **Open**, **Copy Path**, **Copy Full
          Path**, with a visual separator between Open and the two Copy
          entries (``open`` vs. ``clipboard`` menu groups).

      * - T-2

          Open on file-child parity with left-click

          *CR AC: 2*
        - Click **Open** on the ``context.md`` child under ``alpha``.
        - ``testdata/projects/alpha/context.md`` opens in a non-preview
          editor tab — identical result to left-clicking the same node
          (``jarvis.openEntityFile``).

      * - T-3

          Copy Path on file-child (folder only)

          *CR AC: 3*
        - Click **Copy Path** on the ``context.md`` child under ``alpha``.
          Paste the clipboard into a scratch tab.
        - Clipboard contains the absolute OS path to the ``alpha`` folder
          (e.g. ``.../testdata/projects/alpha``) — no ``context.md``
          filename included.

      * - T-4

          Copy Full Path on file-child (incl. filename)

          *CR AC: 4*
        - Click **Copy Full Path** on the same ``context.md`` child. Paste
          the clipboard into a scratch tab.
        - Clipboard contains the absolute OS path including the filename
          (e.g. ``.../testdata/projects/alpha/context.md``).

      * - T-5

          Root-node menu contents, all 3 kinds

          *CR AC: 5*
        - Right-click ``alpha`` (Project), then ``DevCon 2026`` (Event),
          then ``copilot-cm`` (Actor) in turn.
        - Each shows the same 3 entries: Open, Copy Path, Copy Full Path —
          no kind-specific variation.

      * - T-6

          Open on root node parity with left-click

          *CR AC: 6*
        - Click **Open** on ``alpha``.
        - The agent chat for ``alpha`` opens at Main placement (column 1),
          identical to left-clicking the node
          (``jarvis.openAgentSession``).

      * - T-7

          Copy Path on root node

          *CR AC: 7*
        - Click **Copy Path** on ``alpha``. Paste the clipboard into a
          scratch tab.
        - Clipboard contains the absolute OS path to the ``alpha`` folder
          (e.g. ``.../testdata/projects/alpha``).

      * - T-8

          Copy Full Path on root node equals Copy Path

          *CR AC: 8*
        - Click **Copy Full Path** on ``alpha``. Paste the clipboard into a
          scratch tab and compare with the value captured in T-7.
        - Clipboard contains the identical value as T-7 (root nodes have no
          filename to differ). Both **Copy Path** and **Copy Full Path**
          remain visible in the menu — neither is conditionally hidden.

      * - T-9

          Folder node exclusion

          *CR AC: 9*
        - Right-click a grouping/folder node (e.g. a year folder under
          Events, if present in the tree; any ``jarvisFolder`` node).
        - None of Open, Copy Path, Copy Full Path appear in the context
          menu.

      * - T-10

          Command Palette exclusion

          *CR AC: 10*
        - Open the Command Palette (``Ctrl+Shift+P``) and search "Copy
          Path" and "Copy Full Path".
        - Neither Jarvis command appears in the palette results.
