Entity File Children UAT Design Specifications
=================================================

.. spec:: Entity File Children Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ENTITY_FILES_TREE
   :status: draft
   :links: REQ_UAT_ENTITY_FILES_TREE

   **Description:**
   Step-by-step procedures and expected outcomes for all entity-file-children
   acceptance test scenarios: expand behavior for all 3 entity kinds,
   click-to-open per file child, tooltip content, fail-open on missing agent
   file, and no regression to existing inline-icon/click-to-chat behavior.

   **Test Setup:**

   * Extension Development Host launched from ``feature/entity-files-tree``
     via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * All three entity sections (Sessions, Projects, Events) expanded in the
     Jarvis sidebar.
   * Jarvis Output Channel open (View → Output → Jarvis).
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

          Project node expands → 3 file children

          *CR AC: 1, 3*
        - Expand ``alpha`` in the Projects Tree.
        - Node expands to show exactly 3 children: ``context.md``,
          ``project.yaml``, ``syspilot.cm.agent.md``, in that order.

      * - T-2

          Session node expands → 3 file children

          *CR AC: 1, 3*
        - Expand ``copilot-cm`` in the Sessions Tree.
        - Node expands to show exactly 3 children: ``context.md``,
          ``session.yaml``, ``syspilot.cm.agent.md``.

      * - T-3

          Event node expands → 3 file children

          *CR AC: 1, 3*
        - Expand ``DevCon 2026`` in the Events Tree.
        - Node expands to show exactly 3 children: ``context.md``,
          ``event.yaml``, ``syspilot.cm.agent.md``.

      * - T-4

          No agent → only 2 file children

          *CR AC: 2, 5*
        - Expand ``legacy-no-agent`` in the Projects Tree.
        - Node expands to show exactly 2 children: ``context.md``,
          ``project.yaml``. No agent-file child is present.

      * - T-5

          Click ``context.md`` child opens file

          *CR AC: 6*
        - Click the ``context.md`` child under ``alpha``.
        - ``testdata/projects/alpha/context.md`` opens in a non-preview
          (sticky) editor tab. No chat side-effect.

      * - T-6

          Click YAML child opens file

          *CR AC: 6*
        - Click the ``project.yaml`` child under ``alpha``.
        - ``testdata/projects/alpha/project.yaml`` opens in a non-preview
          editor tab. No chat side-effect.

      * - T-7

          Click agent-file child opens file

          *CR AC: 6*
        - Click the ``syspilot.cm.agent.md`` child under ``alpha``.
        - ``.github/agents/syspilot.cm.agent.md`` opens in a non-preview
          editor tab. No chat side-effect.

      * - T-8

          File child tooltip shows full path

          *CR AC: 7*
        - Hover over the ``project.yaml`` child under ``alpha``.
        - Tooltip shows the full absolute path to the file with forward
          slashes (e.g. ``.../testdata/projects/alpha/project.yaml``).

      * - T-9

          Fail-open: agent file missing on disk

          *CR AC: 5, 6*
        - Rename ``.github/agents/syspilot.cm.agent.md`` to
          ``syspilot.cm.agent.md.bak``. Trigger rescan if needed. Expand
          ``alpha`` and click the ``syspilot.cm.agent.md`` child.
        - A warning notification appears (e.g. "Jarvis: Cannot open file:
          ..."). No exception appears in the Output Channel. No file is
          created at the expected path. Restore the renamed file after the
          test.

      * - T-10

          No regression to inline icons / click-to-chat

          *CR AC: 8*
        - Hover over ``alpha``, ``copilot-cm``, and ``DevCon 2026``. Then
          click each node's label (not the expand arrow).
        - Existing inline icons (``$(go-to-file)``, ``$(notebook)``) are
          still present and unchanged. Clicking the node label still opens
          the agent chat exactly as before this CR.
