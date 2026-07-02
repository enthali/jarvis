Entity Tree Context Menu UAT Requirements
===========================================

.. req:: Entity Tree Context Menu — Test Data and Verification Requirements
   :id: REQ_UAT_ENTITY_CONTEXTMENU
   :status: draft
   :priority: optional
   :links: US_UAT_ENTITY_CONTEXTMENU; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the entity tree's right-click context menu
   (Open / Copy Path / Copy Full Path) in the Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/entity-tree-context-menu`` checked out).
   * Pre-existing entity test data:

     - ``testdata/projects/alpha/project.yaml`` — ``agent: syspilot.cm``,
       ``context.md`` present.
     - ``testdata/events/2026-06-15_DevCon 2026/event.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.
     - ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.

   * All three entity sections (Sessions, Projects, Events) expanded in the
     Jarvis sidebar, with ``alpha``/``DevCon 2026``/``copilot-cm`` expanded
     to show their file children.
   * A clipboard-inspection method available (paste into a scratch editor
     tab or terminal to verify contents) for T-3/T-4/T-7/T-8.

   **Acceptance Criteria:**

   * AC-1 (REQ_ENT_ENTITY_CONTEXTMENU AC-1/AC-6 — file-child menu entries):
     For T-1, the tester SHALL right-click the ``context.md`` child under
     ``alpha`` and verify exactly 3 entries appear: Open, Copy Path, Copy
     Full Path, with a visual separator between Open and the two Copy
     entries.

   * AC-2 (REQ_ENT_ENTITY_CONTEXTMENU AC-1 — Open on file-child):
     For T-2, the tester SHALL click Open on the ``context.md`` child under
     ``alpha`` and verify it opens in a non-preview editor tab, identical to
     left-clicking the same node.

   * AC-3 (REQ_ENT_ENTITY_CONTEXTMENU AC-3/AC-5 — Copy Path on file-child):
     For T-3, the tester SHALL click Copy Path on the ``context.md`` child
     under ``alpha`` and verify the clipboard contains the absolute OS path
     to the ``alpha`` folder (e.g. ``.../testdata/projects/alpha``) — no
     filename included.

   * AC-4 (REQ_ENT_ENTITY_CONTEXTMENU AC-4/AC-5 — Copy Full Path on
     file-child):
     For T-4, the tester SHALL click Copy Full Path on the same node and
     verify the clipboard contains the absolute OS path including the
     filename (e.g. ``.../testdata/projects/alpha/context.md``).

   * AC-5 (REQ_ENT_ENTITY_CONTEXTMENU AC-2/AC-6 — root-node menu entries,
     all 3 kinds):
     For T-5, the tester SHALL right-click ``alpha`` (Project),
     ``DevCon 2026`` (Event), and ``copilot-cm`` (Actor) in turn and verify
     each shows the same 3 entries: Open, Copy Path, Copy Full Path.

   * AC-6 (REQ_ENT_ENTITY_CONTEXTMENU AC-2 — Open on root node):
     For T-6, the tester SHALL click Open on ``alpha`` and verify the agent
     chat opens (Main placement, per ``REQ_MSG_EDITORPLACEMENT``),
     identical to left-clicking the node.

   * AC-7 (REQ_ENT_ENTITY_CONTEXTMENU AC-3/AC-5 — Copy Path on root node):
     For T-7, the tester SHALL click Copy Path on ``alpha`` and verify the
     clipboard contains the absolute OS path to the ``alpha`` folder.

   * AC-8 (REQ_ENT_ENTITY_CONTEXTMENU AC-4 — Copy Full Path on root node
     equals Copy Path):
     For T-8, the tester SHALL click Copy Full Path on ``alpha`` and verify
     the clipboard contains the identical value captured in T-7, and that
     both Copy Path and Copy Full Path remain visible in the menu (neither
     is conditionally hidden for root nodes).

   * AC-9 (REQ_ENT_ENTITY_CONTEXTMENU AC-7 — folder node exclusion):
     For T-9, the tester SHALL right-click a grouping/folder node (e.g. a
     year folder under Events, if present, or any ``jarvisFolder`` node)
     and verify none of Open/Copy Path/Copy Full Path appear.

   * AC-10 (REQ_ENT_ENTITY_CONTEXTMENU AC-8 — Command Palette exclusion):
     For T-10, the tester SHALL open the Command Palette
     (``Ctrl+Shift+P``) and search for "Copy Path" / "Copy Full Path" and
     verify neither Jarvis command appears.
