Entity Parity User Acceptance Tests
=====================================

.. story:: Entity Feature Parity Acceptance Tests
   :id: US_UAT_ENTITY_PARITY
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; US_ACT_ACTORS

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for entity feature parity
   (Projects and Events gaining the same agent-binding, tree-click-to-chat,
   inline-icons, and schema-strictness capabilities as Sessions),
   **so that** I can verify end-to-end that all three entity kinds behave
   consistently before release.

   **Acceptance Criteria:**

   * AC-1: A test verifies that an existing ``project.yaml`` without an ``agent``
     field is loaded by the scanner, marked as unbound, and a ``[WARN]`` log
     entry is emitted — the entity is not dropped (maps to
     ``US_ENT_ENTITYPARITY`` AC-1 / T-15).
   * AC-2: A test verifies that ``agent: ""`` (explicit empty string) in
     ``project.yaml`` is treated as unbound at runtime: tree-click opens a
     default chat directly (no picker, no YAML writeback), followed by rename
     and init-prompt (maps to ``US_ENT_ENTITYPARITY`` AC-1 / T-16).
   * AC-3: A test verifies that ``event.yaml`` without a ``summary`` field loads
     at runtime but triggers an editor schema warning (maps to
     ``US_ENT_ENTITYPARITY`` AC-2 / T-17).
   * AC-4: A test verifies that clicking a **bound** project or event leaf node
     opens the agent-chat editor in the specified agent mode, without any picker
     appearing (maps to ``US_ENT_ENTITYPARITY`` AC-3, AC-5 / T-31, T-32,
     T-38, T-39).
   * AC-5: A test verifies that all three entity types expose uniform inline
     icons: ``$(go-to-file)`` for YAML and ``$(notebook)`` for context.md
     (maps to ``US_ENT_ENTITYPARITY`` AC-4 / T-33–T-35, T-37).
   * AC-6: A test verifies that the ``$(record)`` "Open Recording" icon does
     **not** appear on any entity tree item, regardless of whether a
     ``recording/`` subfolder exists (maps to ``US_ENT_ENTITYPARITY`` AC-4 /
     T-36).
   * AC-7: A test verifies the New-Entity agent-picker flow: invoking
     ``Jarvis: New …`` and pressing Escape in the picker aborts entity
     creation (no folder/YAML written, no chat) (maps to
     ``US_ENT_ENTITYPARITY`` AC-7 / T-27).
   * AC-8: A test verifies that selecting "No agent" during New-Entity
     creation writes ``agent: ""`` to YAML and opens a default chat
     (no mode) followed by rename + init-prompt (maps to
     ``US_ENT_ENTITYPARITY`` AC-7 / T-28).
   * AC-9: A test verifies that selecting a concrete agent during New-Entity
     creation writes ``agent: "<name>"`` and opens chat in that mode
     followed by rename + init-prompt (maps to
     ``US_ENT_ENTITYPARITY`` AC-7 / T-29).
   * AC-10: A test verifies that a kind-aware init-prompt fires when a project
     or event is opened via tree-click for the first time, and does NOT fire
     on re-click of an already-open session (maps to ``US_ACT_ACTORS`` AC-9
     / T-40, T-41).

   **Test Scenarios (summary):**

   * T-15: Scanner loads project without ``agent`` → unbound + warn-log.
   * T-16: ``agent: ""`` in project.yaml → tree-click opens default chat
     directly (no picker, no writeback) + rename + init-prompt.
   * T-17: Event without ``summary`` → loads at runtime; editor shows schema
     warning.
   * T-27: ``New Project/Event/Session`` → Escape in agent picker → entity
     creation aborted (no folder/YAML, no chat).
   * T-28: ``New Project/Event/Session`` → select "No agent" → ``agent: ""``
     written; default chat opens (no mode) + rename + init-prompt.
   * T-29: ``New Project/Event/Session`` → select concrete agent →
     ``agent: "<name>"`` written; chat opens in that mode + rename +
     init-prompt.
   * T-30: Tree-click entity with ``agent: ""`` → default chat opens (no
     picker, no YAML mutation) + rename + init-prompt.
   * T-31: Tree-click bound project → no picker, immediate chat in bound agent.
   * T-32: Tree-click bound event → no picker, immediate chat in bound agent.
   * T-33: Project node has 2 inline icons on hover (YAML + context.md).
   * T-34: ``$(go-to-file)`` opens project YAML; no chat side-effect.
   * T-35: ``$(notebook)`` opens context.md in non-preview tab.
   * T-36: No ``$(record)`` "Open Recording" icon on any entity node
     (regardless of ``recording/`` subfolder presence).
   * T-37: Event and Session nodes have same 2 icons (parity).
   * T-38: Tree-click bound project → chat opens in correct agent mode.
   * T-39: Tree-click bound event → chat opens in correct agent mode.
   * T-40: Init-prompt fires for project on first tree-click open.
   * T-41: Init-prompt fires for event on first tree-click open.
