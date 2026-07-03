Collapse All Title-Bar Button UAT Design Specifications
==========================================================

.. spec:: Collapse All Title-Bar Button Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_COLLAPSEALL
   :status: draft
   :links: REQ_UAT_COLLAPSEALL

   **Description:**
   Step-by-step procedures and expected outcomes for all four "Collapse
   All" title-bar button acceptance test scenarios: presence on all 6 tree
   views, collapsing expanded nodes (including entity file children),
   absence of side effects, and no regression to existing click behavior.

   **Test Setup:**

   * Extension Development Host launched from ``feature/ui-improvements``
     via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * All 6 Jarvis tree views visible: Projects, Events, Sessions, Messages,
     Reminders, Heartbeat.
   * At least one queued message present (for the Messages tree group
     node) and one heartbeat job with sub-steps (for the Heartbeat tree).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          "Collapse All" visible on all 6 tree views

          *CR AC: 1*
        - Open the Jarvis sidebar; view each of Projects, Events, Sessions,
          Messages, Reminders, Heartbeat in turn.
        - Each view's title bar shows a "Collapse All" icon
          (``$(collapse-all)``), consistent with VS Code's native
          convention.

      * - T-2

          Collapse All collapses expanded entity + file-child nodes

          *CR AC: 2*
        - Expand ``alpha`` in the Projects tree and its 3 file children;
          also expand one other Projects node. Click "Collapse All" in the
          Projects view title bar.
        - All expanded nodes — including ``alpha``'s file children —
          collapse in a single click. No node remains expanded.

      * - T-3

          Collapse All on Messages tree — no side effects

          *CR AC: 3*
        - Expand at least 2 session group nodes in the Messages tree (note
          their message counts/preview text). Click "Collapse All".
        - All session group nodes collapse. Message counts and preview
          text are unchanged when nodes are re-expanded. No chat editor
          opens as a side effect of the Collapse All action itself.

      * - T-4

          No regression to existing click behavior after Collapse All

          *CR AC: 4*
        - After T-3's Collapse All, re-expand and click the ``alpha`` Actor
          node's label, then re-expand and click a Messages group-node
          label.
        - Both clicks still produce their established behavior: the
          agent chat opens/focuses at Main placement (column 1), identical
          to pre-Collapse-All behavior. Collapse All has not altered any
          click/command binding.
