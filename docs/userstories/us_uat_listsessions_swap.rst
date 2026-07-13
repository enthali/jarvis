List Sessions Tool Swap User Acceptance Tests
===============================================

.. story:: List Sessions / List Chat Sessions Tool Swap Acceptance Tests
   :id: US_UAT_LISTSESSIONS_SWAP
   :status: draft
   :priority: required
   :links: US_MSG_LISTSESSIONS

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the breaking v0.7.0 tool
   rename — ``jarvis_listActors`` now returns YAML session entities while
   the new ``jarvis_listChatSessions`` returns VS Code chat tab titles,
   **so that** I can verify the swap is correct, callers can discover the
   right tool for each purpose, and empty/unnamed sessions are filtered
   properly.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_listActors`` now returns an array
     of YAML session entity objects (``name``, ``summary``, ``folder``),
     not chat tab title strings (maps to ``US_MSG_LISTSESSIONS`` AC-1 /
     T-1).
   * AC-2: A test verifies that ``jarvis_listChatSessions`` (new tool) returns
     an array of VS Code chat tab title strings (maps to
     ``US_MSG_LISTSESSIONS`` AC-1, AC-2 / T-2).
   * AC-3: A test verifies that ``jarvis_listChatSessions`` excludes unnamed
     and default ("New Chat") sessions (maps to ``US_MSG_LISTSESSIONS``
     AC-3 / T-3).

   **Test Scenarios (summary):**

   * T-1: ``jarvis_listActors`` → YAML entity array (not chat titles).
   * T-2: ``jarvis_listChatSessions`` → chat tab title strings.
   * T-3: ``jarvis_listChatSessions`` → unnamed/empty sessions excluded.
