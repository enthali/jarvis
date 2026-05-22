Session Init Prompt on Auto-Open User Acceptance Tests
=======================================================

.. story:: Session Init Prompt on Auto-Open Acceptance Tests
   :id: US_UAT_SESSIONINITPROMPT
   :status: draft
   :priority: required
   :links: US_EXP_AGENTSESSION; US_EXP_AGENTSESSION_PROMPT; US_MSG_STABLESESSION

   **As a** Jarvis Test Engineer running the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the session
   init-prompt and agent-mode assignment on session open,
   **so that** I can verify that both the tree-click and auto-delivery open
   paths start a new chat in the correct agent mode and submit the
   init-prompt exactly once, that existing sessions are opened without
   re-applying mode or prompt, and that all documented edge cases (absent
   agent field, entity-lookup miss, invalid agent name, multiple queued
   messages, background tab) are exercised.

   **Acceptance Criteria:**

   * AC-1: A test verifies that clicking a session node whose ``session.yaml``
     has an ``agent`` field opens a *new* VS Code Chat session in that agent
     mode and submits the init-prompt automatically (maps to CR AC-1 / T-1).
   * AC-2: A test verifies that clicking a session node whose ``session.yaml``
     has **no** ``agent`` field opens a new chat in the user's current mode
     and still submits the init-prompt (no mode-prime, but prompt sent;
     maps to CR AC-1 edge / T-2).
   * AC-3: A test verifies that clicking a session node for an **already
     existing** named chat focuses that chat without creating a new session,
     without renaming, without re-sending the init-prompt, and without
     changing the chat mode (maps to CR AC-2 / T-3).
   * AC-4: A test verifies that the auto-delivery poll, when it finds no
     live session matching the destination entity name, opens a new chat in
     the entity's bound agent mode and submits the init-prompt before
     delivering the queued message (maps to CR AC-3 / T-4).
   * AC-5: A test verifies that the outcomes of the tree-click path (T-1)
     and the auto-delivery path (T-4) for the same entity are functionally
     identical — same agent mode, same init-prompt text, same session name
     (maps to CR AC-4 / T-5).
   * AC-6: A test verifies that when the auto-delivery destination name does
     not match any entity in ``scanner.entities``, a new chat is opened but
     no mode-prime and no init-prompt are applied (graceful skip; T-E2).
   * AC-7: A test verifies that a typo in the ``agent`` field causes no
     crash; the init-prompt is still sent; the observed chat mode is noted
     as implementation-defined (spec gap flagged; T-E3).
   * AC-8: A test verifies that with multiple messages queued for the same
     new session, the init-prompt is submitted exactly once — on the first
     poll cycle — and subsequent messages use the existing-session path
     without re-submitting the prompt (T-E4).
   * AC-9: A test verifies that clicking a session node for a chat that
     exists but is currently in a background tab focuses that tab without
     any new-session behaviour (T-E5).
