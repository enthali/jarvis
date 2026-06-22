Entity Parity UAT Design Specifications
=========================================

.. spec:: Entity Feature Parity Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_ENTITY_PARITY
   :status: draft
   :links: REQ_UAT_ENTITY_PARITY

   **Description:**
   Step-by-step procedures and expected outcomes for all entity-parity acceptance
   test scenarios: schema fail-open, unbound semantics, New-Entity agent picker,
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

          ``agent: ""`` treated as unbound — default chat on tree-click

          *CR AC: 1*
        - Edit ``alpha/project.yaml`` → set ``agent: ""``. Trigger rescan.
          Click ``alpha`` node.
        - Default chat opens (no mode), no picker, no YAML mutation. Chat is
          renamed to ``alpha`` and init-prompt is submitted. After test,
          restore ``agent: syspilot.cm``.

      * - T-17

          Event without ``summary`` — schema warning; loads at runtime

          *CR AC: 2*
        - Open ``Conference/event.yaml`` in editor. Check Events Tree.
        - VS Code Problems panel shows a JSON Schema **warning** (not error)
          for missing ``summary``. Entity still appears in Events Tree.

      * - T-27

          New-Entity picker: cancel → no entity, no chat

          *CR AC: 7*
        - Run ``Jarvis: New Project``. Enter name ``parity-cancel``. Press
          Escape in the agent picker.
        - No folder/YAML created under ``testdata/projects/``. No VS Code
          Chat opened. Output Channel: no error.

      * - T-28

          New-Entity picker: "No agent" → ``agent: ""`` + default chat

          *CR AC: 8*
        - Run ``Jarvis: New Project``. Enter name ``parity-noagent``.
          Select "No agent" in the picker.
        - ``testdata/projects/parity-noagent/project.yaml`` contains
          ``agent: ""``. Default chat opens (no mode). Chat is renamed to
          ``parity-noagent``. Init-prompt is submitted referencing
          ``${kind}=project``. Remove the folder after test.

      * - T-29

          New-Entity picker: concrete agent → mode chat

          *CR AC: 9*
        - Run ``Jarvis: New Project``. Enter name ``parity-bound``.
          Select ``syspilot.cm`` in the picker.
        - ``parity-bound/project.yaml`` contains ``agent: "syspilot.cm"``.
          VS Code Chat opens in ``syspilot.cm`` mode. Chat is renamed to
          ``parity-bound``. Init-prompt is submitted. Remove folder after
          test.

      * - T-30

          Tree-click on ``agent: ""`` entity → default chat (no picker)

          *CR AC: 10*
        - Set ``alpha/project.yaml`` to ``agent: ""``. Trigger rescan. Close
          any open chat for ``alpha``. Click ``alpha`` in Projects Tree.
        - Default chat opens (no mode), no picker, YAML unchanged. Chat is
          renamed to ``alpha`` and init-prompt is submitted. Restore YAML
          after test.

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

          Project node: 2 inline icons present

          *CR AC: 4*
        - Hover over ``alpha`` in Projects Tree.
        - Two icons visible: ``$(go-to-file)``, ``$(notebook)``.
          Tooltip text present for each. No ``$(record)`` icon visible.

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

          ``$(record)`` icon absent regardless of ``recording/`` subfolder

          *CR AC: 4*
        - Step 1: verify ``alpha/recording/`` absent; hover → no ``$(record)``
          icon. Step 2: create ``alpha/recording/``; trigger rescan;
          hover → still no ``$(record)`` icon. Delete ``recording/`` after test.
        - ``$(record)`` icon never appears, regardless of folder presence.

      * - T-37

          Event and Session nodes have same icons

          *CR AC: 4*
        - Hover over ``DevCon 2026`` (Events) and ``copilot-cm`` (Sessions).
        - Both node types show the same two icons (``$(go-to-file)``,
          ``$(notebook)``) with the same tooltips. No ``$(record)`` icon.

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
