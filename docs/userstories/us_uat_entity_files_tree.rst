Entity File Children User Acceptance Tests
============================================

.. story:: Entity File Children Acceptance Tests
   :id: US_UAT_ENTITY_FILES_TREE
   :status: draft
   :priority: required
   :links: US_ENT_ENTITY_FILES_TREE

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the entity file
   children tree feature (Actor, Project, and Event nodes expanding to show
   ``context.md``, the YAML config, and the agent file as clickable children),
   **so that** I can verify end-to-end that all three entity kinds expose
   consistent, correct file-navigation behavior without regressing existing
   inline-icon or click-to-chat behavior.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a Project, Event, and Actor leaf node each
     become expandable and show their file children on expand (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-1, T-2, T-3).
   * AC-2: A test verifies that an entity without a configured ``agent``
     shows only 2 file children (``context.md``, YAML) — no agent-file child
     (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-4).
   * AC-3: A test verifies that clicking each file child (``context.md``,
     YAML, agent file) opens the corresponding file in a non-preview editor
     tab (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-5, T-6, T-7).
   * AC-4: A test verifies that a file child's tooltip shows the full
     filesystem path, forward-slash normalized (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-8).
   * AC-5: A test verifies fail-open behavior when a configured agent file is
     missing on disk: a warning notification appears, no error is thrown, and
     no file is auto-created (maps to ``US_ENT_ENTITY_FILES_TREE`` / T-9).
   * AC-6: A test verifies that existing inline icons (``$(go-to-file)``,
     ``$(notebook)``) and the entity-node click-to-chat command are
     unaffected by the new expand capability (maps to
     ``US_ENT_ENTITY_FILES_TREE`` / T-10).

   **Test Scenarios (summary):**

   * T-1: Project node (``alpha``, agent bound) expands → 3 file children
     shown (``context.md``, ``project.yaml``, ``syspilot.cm.agent.md``).
   * T-2: Actor node (``copilot-cm``, agent bound) expands → 3 file
     children shown.
   * T-3: Event node (``DevCon 2026``, agent bound) expands → 3 file
     children shown.
   * T-4: Project node without ``agent`` (``legacy-no-agent``) expands → only
     2 file children shown (no agent-file child).
   * T-5: Click ``context.md`` child → opens in non-preview editor tab.
   * T-6: Click YAML child → opens in non-preview editor tab.
   * T-7: Click agent-file child → opens ``.agent.md`` in non-preview editor tab.
   * T-8: Hover a file child → tooltip shows full absolute path
     (forward slashes).
   * T-9: Agent configured but ``.agent.md`` missing on disk → click shows
     warning notification, no crash, no file created.
   * T-10: Existing inline icons and click-to-chat on the entity node itself
     are unchanged after the node becomes expandable.
