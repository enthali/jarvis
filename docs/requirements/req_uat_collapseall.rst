Collapse All Title-Bar Button UAT Requirements
================================================

.. req:: Collapse All Title-Bar Button — Test Data and Verification Requirements
   :id: REQ_UAT_COLLAPSEALL
   :status: draft
   :priority: optional
   :links: US_UAT_COLLAPSEALL; REQ_EXP_TREEVIEW; SPEC_EXP_COLLAPSEALL

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the native "Collapse All" title-bar button
   on all 6 Jarvis tree views in the Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/ui-improvements`` checked out).
   * All 6 Jarvis tree views enabled and visible in the sidebar: Projects,
     Events, Sessions, Messages, Reminders, Heartbeat.
   * At least one entity in Projects/Events/Sessions expanded to show file
     children (e.g. ``alpha``, per ``REQ_ENT_ENTITY_FILE_CHILDREN``).
   * At least one queued message exists so the Messages tree shows an
     expandable session group node.
   * At least one heartbeat job with sub-steps exists so the Heartbeat tree
     has an expandable node.

   **Acceptance Criteria:**

   * AC-1 (REQ_EXP_TREEVIEW AC-12 — button visible on all 6 views):
     For T-1, the tester SHALL open each of the 6 tree views in turn and
     verify a "Collapse All" icon is present in that view's title bar.

   * AC-2 (REQ_EXP_TREEVIEW AC-12 — collapses all expanded nodes):
     For T-2, the tester SHALL expand ``alpha`` (Projects) and its file
     children, plus at least one other Projects node, then click "Collapse
     All" and verify every expanded node — including the entity's file
     children — collapses in a single action.

   * AC-3 (REQ_EXP_TREEVIEW AC-12 — no side effects):
     For T-3, the tester SHALL expand at least 2 session group nodes in the
     Messages tree, click "Collapse All", and verify: message counts and
     preview text are unchanged, no chat editor opens as a side effect, and
     no node is removed or reordered — only the expand/collapse view state
     changes.

   * AC-4 (REQ_EXP_TREEVIEW AC-12 — no regression to click behavior):
     For T-4, the tester SHALL, after a "Collapse All", re-expand and click
     an Actor node and a Messages group-node label, and verify both still
     produce their established click behavior (agent chat opens at Main
     placement) — unaffected by the Collapse All action.
