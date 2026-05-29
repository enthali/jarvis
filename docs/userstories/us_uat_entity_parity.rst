Entity Parity User Acceptance Tests
=====================================

.. story:: Entity Feature Parity Acceptance Tests
   :id: US_UAT_ENTITY_PARITY
   :status: draft
   :priority: required
   :links: US_EXP_ENTITYPARITY; US_SES_AGENTBIND; US_SES_SESSIONS

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for entity feature parity
   (Projects and Events gaining the same agent-binding, tree-click-to-chat,
   lazy-bind, inline-icons, and schema-strictness capabilities as Sessions),
   **so that** I can verify end-to-end that all three entity kinds behave
   consistently before release.

   **Acceptance Criteria:**

   * AC-1: A test verifies that an existing ``project.yaml`` without an ``agent``
     field is loaded by the scanner, marked as unbound, and a ``[WARN]`` log
     entry is emitted — the entity is not dropped (maps to
     ``US_EXP_ENTITYPARITY`` AC-1 / T-15).
   * AC-2: A test verifies that ``agent: ""`` (explicit empty string) in
     ``project.yaml`` is treated as unbound (same as missing field), causing
     the lazy-bind picker to fire on tree-click (maps to
     ``US_EXP_ENTITYPARITY`` AC-1 / T-16).
   * AC-3: A test verifies that ``event.yaml`` without a ``summary`` field loads
     at runtime but triggers an editor schema warning (maps to
     ``US_EXP_ENTITYPARITY`` AC-2 / T-17).
   * AC-4: A test verifies that clicking a **bound** project or event leaf node
     opens the agent-chat editor in the specified agent mode, without any picker
     appearing (maps to ``US_EXP_ENTITYPARITY`` AC-3, AC-5 / T-31, T-32,
     T-38, T-39).
   * AC-5: A test verifies that all three entity types expose uniform inline
     icons: ``$(go-to-file)`` for YAML, ``$(notebook)`` for context.md, and
     ``$(record)`` for recording (maps to ``US_EXP_ENTITYPARITY`` AC-4 /
     T-33–T-37).
   * AC-6: A test verifies that the ``$(record)`` icon is visible only when a
     ``recording/`` subfolder exists under the entity folder (maps to
     ``US_EXP_ENTITYPARITY`` AC-4 / T-36).
   * AC-7: A test verifies the full lazy-bind flow for an unbound entity:
     cancel → no mutation, "default agent" → ``agent: ""`` written + no chat,
     concrete agent → YAML written + chat opened (maps to
     ``US_EXP_ENTITYPARITY`` AC-7 / T-27–T-30).
   * AC-8: A test verifies that a second tree-click on an entity whose
     ``agent`` is ``""`` (after a "default agent" lazy-bind) re-fires the
     picker, confirming the entity remains unbound (maps to
     ``US_EXP_ENTITYPARITY`` AC-7 / T-28).
   * AC-9: A test verifies that a YAML write failure during lazy-bind aborts
     cleanly: warn-log emitted, no chat opened, no partial file state (maps to
     ``US_EXP_ENTITYPARITY`` AC-7 / T-30).
   * AC-10: A test verifies that a kind-aware init-prompt fires when a project
     or event is opened via tree-click for the first time, and does NOT fire
     on re-click of an already-open session (maps to ``US_SES_SESSIONS`` AC-9
     / T-40, T-41).

   **Test Scenarios (summary):**

   * T-15: Scanner loads project without ``agent`` → unbound + warn-log.
   * T-16: ``agent: ""`` in project.yaml → entity unbound; picker fires on click.
   * T-17: Event without ``summary`` → loads at runtime; editor shows schema
     warning.
   * T-27: Tree-click unbound project → cancel picker → no mutation, no chat.
   * T-28: Tree-click unbound project → "default agent" → ``agent: ""`` written,
     no chat; second click re-fires picker.
   * T-29: Tree-click unbound project → concrete agent → YAML written, chat opens.
   * T-30: Tree-click unbound project → YAML write fails → warn-log, no chat,
     no partial state.
   * T-31: Tree-click bound project → no picker, immediate chat in bound agent.
   * T-32: Tree-click bound event → no picker, immediate chat in bound agent.
   * T-33: Project node has 3 inline icons on hover.
   * T-34: ``$(go-to-file)`` opens project YAML; no chat side-effect.
   * T-35: ``$(notebook)`` opens context.md in non-preview tab.
   * T-36: ``$(record)`` hidden without ``recording/``; visible when present.
   * T-37: Event and Session nodes have same 3 icons (parity).
   * T-38: Tree-click bound project → chat opens in correct agent mode.
   * T-39: Tree-click bound event → chat opens in correct agent mode.
   * T-40: Init-prompt fires for project on first tree-click open.
   * T-41: Init-prompt fires for event on first tree-click open.
