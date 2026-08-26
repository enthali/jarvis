Kanban Skill Content UAT Requirements
======================================

.. req:: Kanban Skill and Text-Field Test Harness & Data
   :id: REQ_UAT_KAN_SKILL
   :status: approved
   :priority: required
   :links: US_UAT_KAN_SKILL; REQ_KAN_TEXTFIELD; REQ_KAN_SKILLCONTENT; REQ_KAN_INSTRUCTIONS

   **Description:**
   The repository SHALL provide the test data needed to execute the
   kanban-skill-content acceptance scenarios in an Extension Development Host
   (EDH) that has both ``packages/core`` and ``packages/kanban`` active.

   The branch under test is ``feature/kanban-skill-content``, stacked on
   ``feature/module-skill-provisioning``. The EDH must include both
   extensions so that the provisioning mechanism has installed the skill and
   instructions into the open workspace's ``.github/`` tree.

   **Acceptance Criteria:**

   * AC-1: A board fixture with a ``type: text`` field is available for T-1 and
     T-2. Canonical path:
     ``testdata/kanban/sample-with-textfield.kanban.yaml``.
     The fixture SHALL declare a ``description`` field of ``type: text`` and
     include at least one item with a non-empty ``description`` value.
   * AC-2: The existing ``testdata/kanban/sample.kanban.yaml`` (no ``text``
     fields) is used unchanged for backward-compat verification (T-3).
   * AC-3: Inline invalid board YAML strings are used for T-4, T-5, T-6, T-7
     (pasted directly into a temporary file); no permanent fixture required.
   * AC-4: The workspace in the EDH must have received the provisioned assets —
     ``.github/skills/jarvis-kanban.board/SKILL.md`` and
     ``.github/instructions/jarvis-kanban.yaml.instructions.md`` — via the
     module-skill-provisioning activation (T-8 through T-12).
   * AC-5: The tester confirms the active tab is the board file (or the EDH
     is the workspace window) before invoking tools, to satisfy the active-tab
     heuristic used by ``jarvis_whoAmI`` and kanban tools.
   * AC-6: Step-by-step outcomes for T-1..T-12 are documented in the test
     protocol for this CR.
