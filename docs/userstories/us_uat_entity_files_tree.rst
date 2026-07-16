Entity File Children User Acceptance Tests
============================================

.. story:: Entity File Children Acceptance Tests
   :id: US_UAT_ENTITY_FILES_TREE
   :status: draft
   :priority: required
   :links: US_ENT_ENTITY_FILES_TREE

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the recursive
   Agent/Files category tree feature (Actor, Project, and Event nodes
   expanding into an "Agent" category and a "Files" category that
   recursively mirrors the entity's own folder),
   **so that** I can verify end-to-end that all three entity kinds expose
   consistent, correct file-navigation behavior without regressing existing
   inline-icon or click-to-chat behavior.

   **(actor-owned-files-tree CR):** rewritten from the original fixed-3-file
   scope to the category-layer, recursive-folder-scan design.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a Project, Event, and Actor leaf node each
     become expandable and show a "Files" category on expand, and an
     "Agent" category when the entity has a resolvable agent (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-1, T-2, T-3).
   * AC-2: A test verifies that an entity without a configured (or
     unresolvable) ``agent`` shows only the "Files" category — no "Agent"
     category node at all (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-4).
   * AC-3: A test verifies that the "Files" category recursively lists every
     file and subfolder in the entity's own folder, alphabetically sorted,
     including hidden (dot-prefixed) entries, with subfolders themselves
     expandable (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-5, T-6).
   * AC-4: A test verifies that clicking a ``.md`` file (in either category,
     including ``context.md`` and the Agent category's ``*.agent.md``
     synthetic node) opens it as rendered Markdown Preview (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-7).
   * AC-5: A test verifies that clicking a non-``.md`` file opens it in VS
     Code's standard preview mode (single click reuses the tab, double-click
     pins it) (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-8).
   * AC-6: A test verifies that a file/folder child's tooltip shows the full
     filesystem path, forward-slash normalized (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-9).
   * AC-7: A test verifies fail-open behavior when the Agent category's
     resolved file is removed after the agent-modes cache was already
     populated: the category still renders (stale cache), but clicking its
     child shows a warning notification, no error is thrown, and no file is
     auto-created (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-10).
   * AC-8: A test verifies that existing inline icons and the entity-node
     click-to-chat command are unaffected by the new category layer (maps
     to ``US_ENT_ENTITY_FILES_TREE`` / T-11).
   * AC-9: A test verifies that adding/removing a file in an entity's folder
     is reflected in the "Files" category after the next scan-interval
     rescan or a manual "Jarvis: Rescan", without requiring the extension to
     reload (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-12).
   * AC-10: A test verifies Copy Path / Copy Full Path continue to work
     unchanged on file children in both categories (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-13).
   * AC-11: A test verifies that (a) Copy Path / Copy Full Path work on a
     **folder** child within the "Files" category (completing
     ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-7's "every file/folder" coverage),
     and (b) entity-specific context-menu actions (e.g. "Open Agent
     Session", kind-specific inline actions) are **absent** from file and
     folder children's right-click menu, confirming the ``contextValue``
     isolation required by ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-5 (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-14).

   **Test Scenarios (summary):**

   * T-1: Project node (``alpha``, agent bound) expands → "Agent" and
     "Files" category nodes shown.
   * T-2: Actor node (``copilot-cm``, agent bound) expands → "Agent" and
     "Files" category nodes shown.
   * T-3: Event node (``DevCon 2026``, agent bound) expands → "Agent" and
     "Files" category nodes shown.
   * T-4: Project node without ``agent`` (``legacy-no-agent``) expands →
     only "Files" category shown, no "Agent" category.
   * T-5: Expand "Files" on ``alpha`` → all files/subfolders in
     ``testdata/projects/alpha/`` shown alphabetically, hidden entries
     included.
   * T-6: Expand a subfolder within "Files" → recurses identically.
   * T-7: Click ``context.md`` and the Agent category's ``*.agent.md``
     child → both open as Markdown Preview.
   * T-8: Click a non-``.md`` file in "Files" (e.g. the YAML config) →
     opens in preview-mode tab (single click reuse, double-click pin).
   * T-9: Hover a file/folder child → tooltip shows full absolute path
     (forward slashes).
   * T-10: Agent resolved at cache-population time, then its ``.agent.md``
     is renamed/removed → "Agent" category still shown (stale cache), click
     → warning notification, no crash, no file created.
   * T-11: Existing inline icons and click-to-chat on the entity node
     itself are unchanged after the node becomes expandable.
   * T-12: Add a new file to an entity's folder, trigger "Jarvis: Rescan" →
     new file appears in "Files" on next expand.
   * T-13: Right-click a file child in "Files" → Copy Path / Copy Full Path
     work exactly as before.
   * T-14: Right-click a **folder** child in "Files" (e.g. ``drafts``) →
     Copy Path / Copy Full Path work; entity-specific context-menu actions
     ("Open Agent Session", kind-specific inline items) are absent from
     file and folder children's right-click menus.
