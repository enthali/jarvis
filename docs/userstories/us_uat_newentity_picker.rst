New Entity Picker and KISS Naming User Acceptance Tests
=========================================================

.. story:: New Entity Picker and KISS Folder Naming Acceptance Tests
   :id: US_UAT_NEWENTITY_PICKER
   :status: draft
   :priority: required
   :links: US_EXP_NEWENTITY; US_EXP_ENTITYPARITY

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the extended
   ``jarvis.newProject``, ``jarvis.newEvent``, and ``jarvis.newSession``
   commands covering (a) the mandatory agent-picker step added to all three
   commands and (b) the KISS folder-naming rule (verbatim raw name for
   projects/sessions, ``<date>_<rawName>`` for events),
   **so that** I can verify picker cancel semantics, "default agent" and
   concrete-agent branches, creation-only behaviour for projects/events, and
   that folder names are no longer kebab-cased.

   **Acceptance Criteria:**

   * AC-1: A test verifies that JSON Schema validation warns when
     ``project.yaml`` lacks the ``agent`` field (editor-time validation;
     maps to ``US_EXP_ENTITYPARITY`` AC-1 / T-14).
   * AC-2: A test verifies that ``event.yaml`` without ``summary`` shows a
     schema warning in the editor but loads at runtime (maps to
     ``US_EXP_ENTITYPARITY`` AC-2 / T-17).
   * AC-3: A test verifies that cancelling the agent picker at any point in
     ``jarvis.newProject`` or ``jarvis.newEvent`` aborts the command without
     creating any folder or file (maps to ``US_EXP_ENTITYPARITY`` AC-8 /
     T-18, T-19, T-22).
   * AC-4: A test verifies that selecting "default agent" in the picker writes
     ``agent: ""`` and does **not** open a chat editor for project or event
     creation commands (maps to ``US_EXP_ENTITYPARITY`` AC-8 / T-20, T-23).
   * AC-5: A test verifies that selecting a concrete agent writes the agent
     name and does **not** open a chat editor for project or event creation
     (maps to ``US_EXP_ENTITYPARITY`` AC-8 / T-21, T-24).
   * AC-6: A test verifies that for ``jarvis.newSession``, selecting a
     concrete agent writes the agent name AND opens the chat editor (maps to
     ``US_SES_AGENTBIND`` AC-3 / T-26).
   * AC-7: A test verifies that ``jarvis.newProject`` creates a folder with
     the verbatim raw name (no kebab-case conversion) (maps to CR AC-2 /
     T-42).
   * AC-8: A test verifies that ``jarvis.newEvent`` creates a folder named
     ``<startDate>_<rawName>`` with an underscore separator and verbatim
     raw name (maps to CR AC-2 / T-43).

   **Test Scenarios (summary):**

   * T-14: ``project.yaml`` without ``agent`` → editor schema warning.
   * T-17: ``event.yaml`` without ``summary`` → editor schema warning; loads
     at runtime.
   * T-18: ``jarvis.newProject`` — cancel at name prompt → no folder.
   * T-19: ``jarvis.newProject`` — cancel at picker → no folder.
   * T-20: ``jarvis.newProject`` — "default agent" → ``agent: ""``; no chat.
   * T-21: ``jarvis.newProject`` — concrete agent → agent written; no chat.
   * T-22: ``jarvis.newEvent`` — cancel at picker → no folder.
   * T-23: ``jarvis.newEvent`` — "default agent" → ``agent: ""``; no chat.
   * T-24: ``jarvis.newEvent`` — concrete agent → agent written; no chat.
   * T-25: ``jarvis.newSession`` — cancel at picker → no folder.
   * T-26: ``jarvis.newSession`` — concrete agent → agent written; chat opened.
   * T-42: ``jarvis.newProject`` KISS naming — verbatim folder, no kebab-case.
   * T-43: ``jarvis.newEvent`` KISS naming — ``<date>_<rawName>`` folder.
