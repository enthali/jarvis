Kanban Skill Content User Acceptance Tests
==========================================

.. story:: Kanban Skill and Text-Field Acceptance Tests
   :id: US_UAT_KAN_SKILL
   :status: approved
   :priority: required
   :links: US_KAN_SKILL; US_KAN_TEXTFIELD

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the kanban skill/instructions content
   and the ``text`` field type,
   **so that** I can verify the ``type: text`` addition is schema-enforced and
   rendered, existing boards are unaffected, known authoring traps are
   documented in the skill, and the instructions file applies to both board
   filename conventions.

   Module integration (compile/package/CI) is out of UAT scope.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a board with a declared ``type: text`` field
     passes ``jarvis_verifyKanbanSchema`` without errors (T-1).
   * AC-2: A test verifies that a ``text`` field value renders as a labelled
     ``name: value`` pair on the card (T-2).
   * AC-3: A test verifies backward compatibility: a board with no ``text``
     field validates and renders exactly as before (T-3).
   * AC-4: A test verifies that a ``text`` field declaring ``options`` is
     rejected by ``jarvis_verifyKanbanSchema`` as a structural error (T-4).
   * AC-5: A test verifies that a ``single_select`` field without ``options``
     is rejected as a structural error (T-5).
   * AC-6: A test verifies that a ``status`` field of ``type: text`` is a
     semantic error (T-6).
   * AC-7: A test verifies that an item key matching no declared field is
     reported as a **warning** (not an error) — the silent-failure trap (T-7).
   * AC-8: A test verifies that the instructions ``applyTo`` glob matches
     both ``kanban.yaml`` and ``*.kanban.yaml`` filenames (T-8).
   * AC-9: A test verifies that the instructions state ``name`` (not
     ``title``) as the item property and ``nextId`` as optional (T-9).
   * AC-10: A test verifies that the skill contains all required sections
     (T-10).
   * AC-11: A test verifies that the skill's Owner Resolution section says
     to omit ``ownerName`` — not to call ``jarvis_whoAmI`` first (T-11).
   * AC-12: A test verifies that the skill's Pitfalls section names the
     undeclared-key silent-failure trap with its observable symptom (T-12).
