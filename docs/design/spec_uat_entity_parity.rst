Entity Parity UAT Design Specifications
=========================================

.. spec:: Entity Feature Parity Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ENTITY_PARITY
   :status: draft
   :links: REQ_UAT_ENTITY_PARITY

   **Description:**
   Step-by-step procedures and expected outcomes for all entity-parity acceptance
   test scenarios: schema fail-open, unbound semantics, lazy-bind 3-way flow,
   inline icons, tree-click parity, and kind-aware init-prompt.

   **Test Setup:**

   * Extension Development Host launched from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * All three entity sections (Sessions, Projects, Events) expanded in the
     Jarvis sidebar.
   * Jarvis Output Channel open (View → Output → Jarvis).
   * Restore all test-data files after destructive scenarios before proceeding.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-15

          Scanner fail-open: project without ``agent``

          *CR AC: 1*
        - Reload EDH. Observe the Projects Tree and Output Channel.
        - ``legacy-no-agent`` appears in the Projects Tree. Output Channel
          contains a ``[WARN]`` log line referencing the folder name and
          indicating the entity is unbound. No error thrown.

      * - T-16

          ``agent: ""`` treated as unbound

          *CR AC: 1*
        - Edit ``alpha/project.yaml`` → set ``agent: ""``. Trigger rescan.
          Click ``alpha`` node.
        - Agent-picker QuickPick fires. Entity is treated as unbound.
          After test, restore ``agent: syspilot.cm``.

      * - T-17

          Event without ``summary`` — schema warning; loads at runtime

          *CR AC: 2*
        - Open ``Conference/event.yaml`` in editor. Check Events Tree.
        - VS Code Problems panel shows a JSON Schema **warning** (not error)
          for missing ``summary``. Entity still appears in Events Tree.

      * - T-27

          Lazy-bind: cancel → no mutation, no chat

          *CR AC: 7 (cancel)*
        - Click ``legacy-no-agent`` in Projects Tree. Press Escape in picker.
        - No VS Code Chat opened. ``project.yaml`` byte-for-byte unchanged.
          Output Channel: no error.

      * - T-28

          Lazy-bind: "default agent" → ``agent: ""``, no chat; second
          click re-fires picker

          *CR AC: 7 ("default agent")*
        - Click ``legacy-no-agent``. Select "default agent". Observe. Click
          ``legacy-no-agent`` again.
        - First click: ``agent: ""`` written to YAML; no chat opened. Second
          click: picker fires again (empty string = unbound). Restore YAML
          after test.

      * - T-29

          Lazy-bind: concrete agent → YAML written, chat opened

          *CR AC: 7 (concrete)*
        - Click ``legacy-no-agent``. Select ``syspilot.cm`` in picker.
        - ``project.yaml`` updated: ``agent: "syspilot.cm"``. VS Code Chat
          opens for ``legacy-no-agent`` in ``syspilot.cm`` mode. Restore YAML.

      * - T-30

          Lazy-bind: YAML write fails → warn-log, no chat

          *CR AC: 7 (error path)*
        - Make ``legacy-no-agent/project.yaml`` read-only. Click node. Select
          any agent.
        - No chat opened. Output Channel: ``[WARN]`` entry with folder name
          and write-failure indication. YAML unchanged. Remove read-only flag.

      * - T-31

          Bound project → direct chat open

          *CR AC: 3, 5*
        - Close any open chat for ``alpha``. Click ``alpha`` in Projects Tree.
        - Chat opens immediately in ``syspilot.cm`` mode. No picker appears.

      * - T-32

          Bound event → direct chat open

          *CR AC: 3 (events)*
        - Close any open chat for ``DevCon 2026``. Click ``DevCon 2026`` in
          Events Tree.
        - Chat opens in ``syspilot.cm`` mode. No picker appears.

      * - T-33

          Project node: 3 inline icons present

          *CR AC: 4*
        - Hover over ``alpha`` in Projects Tree.
        - Three icons visible: ``$(go-to-file)``, ``$(notebook)``,
          ``$(record)``. Tooltip text present for each.

      * - T-34

          ``$(go-to-file)`` opens project YAML

          *CR AC: 4*
        - Click ``$(go-to-file)`` icon on ``alpha`` node.
        - ``alpha/project.yaml`` opens in a non-preview editor tab. No chat
          side-effect.

      * - T-35

          ``$(notebook)`` opens context.md (non-preview)

          *CR AC: 4*
        - Click ``$(notebook)`` icon on ``alpha`` node.
        - ``alpha/context.md`` opens. Tab is sticky (not in italics / preview
          mode). No chat side-effect.

      * - T-36

          ``$(record)`` gated by ``recording/`` subfolder

          *CR AC: 4*
        - Step 1: verify ``alpha/recording/`` absent; hover → ``$(record)``
          icon not visible. Step 2: create ``alpha/recording/``; trigger rescan;
          hover → ``$(record)`` visible. Delete ``recording/`` after test.
        - Icon visibility matches folder presence.

      * - T-37

          Event and Session nodes have same icons

          *CR AC: 4*
        - Hover over ``DevCon 2026`` (Events) and ``copilot-cm`` (Sessions).
        - Both node types show the same three icons with the same tooltips.

      * - T-38

          Bound project: chat in correct agent mode

          *CR AC: 3, 5*
        - Click ``alpha`` (agent: syspilot.cm). No existing chat for ``alpha``.
        - Chat opens in ``syspilot.cm`` mode.

      * - T-39

          Bound event: chat in correct agent mode

          *CR AC: 3 (events)*
        - Click ``DevCon 2026`` (agent: syspilot.cm). No existing chat.
        - Chat opens in ``syspilot.cm`` mode.

      * - T-40

          Init-prompt fires for project (kind-aware)

          *US_SES_SESSIONS AC-9*
        - Click ``alpha`` (no open chat). Observe transcript.
          Then click again (chat already open).
        - First click: kind-aware init-prompt submitted (references project
          kind, name, context.md path). Second click: focus only, no re-prompt.

      * - T-41

          Init-prompt fires for event (kind-aware)

          *US_SES_SESSIONS AC-9*
        - Click ``DevCon 2026`` (no open chat). Observe transcript.
        - Kind-aware init-prompt submitted referencing event kind and name.
