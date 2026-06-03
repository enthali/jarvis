Safe Send Union Destination User Acceptance Tests
===================================================

.. story:: Safe Send-to-Session Destination Union Acceptance Tests
   :id: US_UAT_SAFE_SEND_UNION
   :status: draft
   :priority: required
   :links: US_MSG_SAFE_SEND; US_MSG_AUTODELIVERY

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the extended destination
   validation of ``jarvis_sendToSession``, where the valid destination set is
   now the union of {YAML entity names (sessions, projects, events)} ∪ {VS Code
   chat session titles},
   **so that** I can verify that the tool accepts all valid targets, rejects
   unknown targets with a useful error, leaves no side effect on invalid
   invocations, and that auto-delivery still opens chat for new YAML entities.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_sendToSession`` accepts a YAML
     **session** entity name as the destination (maps to ``US_MSG_SAFE_SEND``
     AC-4, AC-6 / T-44).
   * AC-2: A test verifies that ``jarvis_sendToSession`` accepts a YAML
     **project** entity name as the destination (maps to ``US_MSG_SAFE_SEND``
     AC-4, AC-6 / T-45).
   * AC-3: A test verifies that ``jarvis_sendToSession`` accepts a YAML
     **event** entity name as the destination (maps to ``US_MSG_SAFE_SEND``
     AC-4, AC-6 / T-46).
   * AC-4: A test verifies that ``jarvis_sendToSession`` accepts an active
     VS Code chat tab title as the destination (maps to ``US_MSG_SAFE_SEND``
     AC-4, AC-6 / T-47).
   * AC-5: A test verifies that an unknown destination causes the tool to
     return an error that names the invalid destination and lists all valid
     destinations (maps to ``US_MSG_SAFE_SEND`` AC-1, AC-2 / T-48).
   * AC-6: A test verifies that an invalid destination produces no side effect
     — no message is appended to the queue (maps to ``US_MSG_SAFE_SEND``
     AC-3 / T-50).
   * AC-7: A test verifies that sending to a YAML entity with no open chat tab
     triggers chat-open via the auto-delivery path on the next poll cycle —
     no regression from v0.6.1 behaviour (maps to ``US_MSG_SAFE_SEND`` AC-5
     / T-49, T-55).

   **Test Scenarios (summary):**

   * T-44: ``jarvis_sendToSession`` to YAML session entity → success.
   * T-45: ``jarvis_sendToSession`` to YAML project entity → success.
   * T-46: ``jarvis_sendToSession`` to YAML event entity → success.
   * T-47: ``jarvis_sendToSession`` to chat tab title → success.
   * T-48: Unknown destination → error naming destination + listing valid set.
   * T-49: YAML entity (no open chat) → auto-delivery opens chat on poll.
   * T-50: Invalid destination → no side effect in queue.
   * T-55: Auto-delivery to new YAML entity → chat opens per v0.6.1 path.
