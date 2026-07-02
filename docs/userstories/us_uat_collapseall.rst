Collapse All Title-Bar Button User Acceptance Tests
=====================================================

.. story:: Collapse All Title-Bar Button Acceptance Tests
   :id: US_UAT_COLLAPSEALL
   :status: draft
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** manual acceptance test scenarios for the native "Collapse All"
   title-bar button now present on all 6 Jarvis tree views,
   **so that** I can verify the button is visible on every tree view and
   that clicking it collapses all expanded nodes without altering tree
   content, node structure, or click behavior.

   **Acceptance Criteria:**

   * AC-1: A test verifies the "Collapse All" title-bar button is visible
     on all 6 Jarvis tree views: Projects, Events, Sessions, Messages,
     Reminders, Heartbeat (maps to REQ_EXP_TREEVIEW AC-12 / T-1).
   * AC-2: A test verifies that clicking "Collapse All" on a tree with
     expanded entity nodes (including expanded file-children, per
     REQ_ENT_ENTITY_FILE_CHILDREN) collapses all of them in one action
     (maps to REQ_EXP_TREEVIEW AC-12 / T-2).
   * AC-3: A test verifies that "Collapse All" is purely a view-state
     change — no node is removed, reordered, or re-fetched, and no click
     command fires as a side effect (maps to REQ_EXP_TREEVIEW AC-12 / T-3).
   * AC-4: A regression test verifies that expanding a node after
     "Collapse All" and clicking it still produces the same result as
     before this CR (open-to-chat, open-file, etc.) — Collapse All does not
     alter any existing click/command binding (maps to REQ_EXP_TREEVIEW
     AC-12 / T-4).

   **Test Scenarios (summary):**

   * T-1: Open each of the 6 Jarvis tree views in turn → a "Collapse All"
     icon is visible in the view's title bar for all 6.
   * T-2: Expand several nodes (including an entity's file children) in the
     Projects tree, click "Collapse All" → all nodes collapse in one click.
   * T-3: Repeat T-2 on the Messages tree (with several session groups
     expanded) → all group nodes collapse; message counts/content
     unchanged; no chat opens as a side effect.
   * T-4: After Collapse All, re-expand and click a previously-tested node
     (e.g. an Actor node, or a Messages group-node label) → existing
     click behavior (open chat at Main, etc.) is unaffected.
