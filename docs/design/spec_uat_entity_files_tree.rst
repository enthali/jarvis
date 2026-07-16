Entity File Children UAT Design Specifications
=================================================

.. spec:: Entity File Children Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ENTITY_FILES_TREE
   :status: draft
   :links: REQ_UAT_ENTITY_FILES_TREE

   **Description:**
   Step-by-step procedures and expected outcomes for all Agent/Files
   category-layer acceptance test scenarios: category-node expand behavior
   for all 3 entity kinds, recursive "Files" listing, Markdown Preview vs.
   preview-mode open behavior, tooltip content, fail-open on a stale-cached
   Agent category, tree-refresh-on-file-change, no regression to existing
   inline-icon/click-to-chat behavior, and unchanged Copy Path/Copy Full
   Path.

   **(actor-owned-files-tree CR):** rewritten from the fixed-3-file-list
   scenario set.

   **Test Setup:**

   * Extension Development Host launched from
     ``feature/actor-owned-files-tree`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * All three entity sections expanded in the Jarvis sidebar (or the
     unified "Jarvis Entities" tree's Actors/Projects/Events category nodes,
     if running after the ``unified-entity-tree`` CR).
   * Jarvis Output Channel open (View → Output → Jarvis).
   * ``testdata/projects/alpha/`` contains, in addition to ``context.md``
     and ``project.yaml``: ``notes.txt``, ``.jarvisnotes`` (hidden), and a
     ``drafts/`` subfolder containing ``idea.md``.
   * Restore all test-data files (including any renamed agent file) after
     destructive scenarios before proceeding to the next.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Project node expands → Agent + Files categories

          *CR AC: 1*
        - Expand ``alpha`` in the Projects Tree.
        - Node expands to show exactly 2 children, in order: an "Agent"
          category node, then a "Files" category node. Both are
          independently collapsed by default.

      * - T-2

          Actor node expands → Agent + Files categories

          *CR AC: 1*
        - Expand ``copilot-cm`` in the Sessions Tree.
        - Node expands to show "Agent" then "Files" category nodes,
          identical structure to T-1.

      * - T-3

          Event node expands → Agent + Files categories

          *CR AC: 1*
        - Expand ``DevCon 2026`` in the Events Tree.
        - Node expands to show "Agent" then "Files" category nodes,
          identical structure to T-1.

      * - T-4

          No agent → no Agent category at all

          *CR AC: 2*
        - Expand ``legacy-no-agent`` in the Projects Tree.
        - Node expands to show only one child: the "Files" category node.
          No "Agent" category node is present (not shown empty, not shown
          with a broken child — simply absent).

      * - T-5

          Files category recursively lists entity folder, alphabetical,
          hidden included

          *CR AC: 3*
        - Expand "Files" under ``alpha``.
        - Children shown, in one alphabetically sorted list (not
          folders-first): ``.jarvisnotes``, ``context.md``, ``drafts``,
          ``notes.txt``, ``project.yaml``. ``drafts`` shows a collapsed
          expand arrow.

      * - T-6

          Subfolder within Files recurses identically

          *CR AC: 3*
        - Expand the ``drafts`` child under "Files".
        - ``idea.md`` appears as a child, using the same listing rule
          (alphabetical, would include hidden entries if present).

      * - T-7

          ``.md`` files open as Markdown Preview

          *CR AC: 4*
        - Click ``context.md`` under "Files". Separately, expand "Agent"
          and click its ``Agent File: syspilot.cm.agent.md`` child.
        - Both open via VS Code's rendered Markdown Preview (not the raw
          text editor), in the Docs column (column 2).

      * - T-8

          Non-``.md`` files open in preview-mode tab

          *CR AC: 5*
        - Click ``project.yaml`` under "Files". Then click ``notes.txt``.
          Then double-click ``project.yaml`` again (or make an edit).
        - ``project.yaml`` opens in an italicized preview tab in the Docs
          column; clicking ``notes.txt`` reuses/replaces that same preview
          tab (still italicized) rather than opening a second tab;
          double-clicking/editing ``project.yaml`` pins it (title becomes
          non-italicized, a new preview tab would be used for the next
          single-click open).

      * - T-9

          File/folder child tooltip shows full path

          *CR AC: 6*
        - Hover over the ``project.yaml`` child and, separately, the
          ``drafts`` folder child, both under "Files" on ``alpha``.
        - Both tooltips show the full absolute path with forward slashes
          (e.g. ``.../testdata/projects/alpha/project.yaml`` and
          ``.../testdata/projects/alpha/drafts``).

      * - T-10

          Fail-open: Agent category stale cache, file removed after
          resolution

          *CR AC: 7*
        - Expand "Agent" under ``alpha`` once (so ``discoverAgentModes()``'s
          cache resolves ``syspilot.cm.agent.md``). Then rename
          ``.github/agents/syspilot.cm.agent.md`` to
          ``syspilot.cm.agent.md.bak`` (do NOT reload the extension).
          Collapse and re-expand ``alpha``, then expand "Agent" again and
          click its child.
        - The "Agent" category node still appears (module-level cache is
          stale by design — ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-2c/AC-6).
          Clicking its child shows a warning notification (e.g. "Jarvis:
          Cannot open file: ..."). No exception appears in the Output
          Channel. No file is created at the expected path. Restore the
          renamed file after the test.

      * - T-11

          No regression to inline icons / click-to-chat

          *CR AC: 8*
        - Hover over ``alpha``, ``copilot-cm``, and ``DevCon 2026``. Then
          click each node's label (not the expand arrow).
        - Existing inline icons (``$(go-to-file)``, ``$(notebook)``) are
          still present and unchanged. Clicking the node label still opens
          the agent chat exactly as before this CR.

      * - T-12

          Files category reflects added/removed files after rescan

          *CR AC: 9*
        - Outside VS Code (e.g. via a terminal or the OS file manager), add
          a new file ``scratch.md`` to ``testdata/projects/alpha/``. In VS
          Code, invoke "Jarvis: Rescan" from the Command Palette (or wait
          for the configured scan interval to elapse). Collapse and
          re-expand "Files" under ``alpha``.
        - ``scratch.md`` appears in the "Files" listing, in alphabetical
          order, without reloading the Extension Development Host. Remove
          ``scratch.md`` afterward and repeat to confirm removal is
          likewise reflected.

      * - T-13

          Copy Path / Copy Full Path unchanged

          *CR AC: 10*
        - Right-click ``project.yaml`` under "Files" on ``alpha`` and
          select "Copy Path", then repeat and select "Copy Full Path".
          Paste the clipboard contents after each.
        - "Copy Path" yields the entity folder's absolute path
          (``.../testdata/projects/alpha``); "Copy Full Path" yields the
          full file path (``.../testdata/projects/alpha/project.yaml``) —
          identical behavior to before this CR.

      * - T-14

          Folder child Copy Path + context-menu isolation

          *CR AC: 11*
        - Step 1 — Right-click the ``drafts`` folder child under "Files"
          on ``alpha``. Select "Copy Path", then "Copy Full Path".
          Step 2 — Right-click ``project.yaml`` (file child) and inspect
          the full context-menu item list. Step 3 — Right-click ``drafts``
          again and inspect the full context-menu item list.
        - Step 1: "Copy Path" yields
          ``.../testdata/projects/alpha/drafts``; "Copy Full Path" yields
          the same path (folder — no filename suffix). Step 2 & 3: The
          context menu for both the file child and the folder child
          contains Copy Path / Copy Full Path but does **not** contain
          entity-specific actions such as "Open Agent Session",
          "Reveal in Explorer" (entity variant), or any inline action
          registered under ``viewItem == jarvisProject``,
          ``viewItem == jarvisSession``, or ``viewItem == jarvisEvent``.
          This confirms that ``contextValue = jarvisEntityFile`` and
          ``contextValue = jarvisEntityFileFolder`` correctly exclude
          file/folder children from entity-node when-clauses.
