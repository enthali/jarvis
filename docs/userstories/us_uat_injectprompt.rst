Prompt Injection User Acceptance Tests
=======================================

.. story:: Prompt Injection Acceptance Tests
   :id: US_UAT_INJECTPROMPT
   :status: draft
   :priority: required
   :links: US_INJ_INJECT

   **As a** Jarvis Test Engineer running the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the prompt-injection
   primitive, LM tool, and VS Code command,
   **so that** I can verify that text and slash-commands (including ``/compact``)
   can be injected into named entity sessions via both the LM tool and the
   Command Palette, that sessions are spawned with correct agent-mode and
   init-prompt when no live session exists, that unknown entity names produce
   user-visible errors, and that the three former injection call sites have been
   consolidated onto the single primitive.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_injectPrompt(actor, text)`` injects
     the given text into an existing live session of the named actor
     (maps to SPEC_UAT_INJECTPROMPT T-1, T-2).
   * AC-2: A test verifies that when no live session exists for the named actor,
     a new session is spawned with the correct agent-mode and init-prompt before
     the text is injected (maps to T-3, T-4).
   * AC-3: A test verifies end-to-end that injecting ``/compact`` into a session
     with 10+ messages causes VS Code to compact that session and reduces the
     message count (maps to T-5).
   * AC-4: A test verifies that the ``Jarvis: Inject Prompt`` command appears in
     the Command Palette, presents an entity quick-pick and an input box, and
     injects the entered text on confirmation; cancel at either step exits
     cleanly (maps to T-6, T-7, T-8).
   * AC-5: A test verifies that an unknown entity name returns a user-visible
     error message via both the LM tool (tool return, not a throw) and the
     VS Code command (warning notification) (maps to T-9, T-10).
   * AC-6: A test verifies that message-notification, auto-delivery, and
     tree-click session-open all route through the single ``injectPrompt()``
     primitive — no duplicate injection logic remains in consumer call sites
     (maps to T-12, T-13, T-14).
