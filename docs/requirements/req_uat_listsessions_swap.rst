List Sessions Tool Swap UAT Requirements
==========================================

.. req:: List Sessions / List Chat Sessions Tool Swap — Test Data and Verification Requirements
   :id: REQ_UAT_LISTSESSIONS_SWAP
   :status: draft
   :priority: required
   :links: US_UAT_LISTSESSIONS_SWAP; REQ_MSG_LISTSESSIONS

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the v0.7.0 breaking rename of the list-sessions tools:
   ``jarvis_listActors`` now returns YAML entities; ``jarvis_listChatSessions``
   is the new tool for VS Code chat tab titles.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * At least two YAML session entities must exist:

     - ``testdata/.jarvis/sessions/copilot-cm/session.yaml``
     - ``testdata/.jarvis/sessions/dev-feature-x/session.yaml``

   * For T-2 and T-3: at least one named VS Code Chat session tab must exist
     (rename a chat tab to e.g. "Test Tab Alpha") and at least one default
     ("New Chat") or unnamed session must also be present.

   **Acceptance Criteria:**

   * AC-1 (``jarvis_listActors`` returns YAML entities):
     For T-1, the tester SHALL invoke ``jarvis_listActors`` and verify the
     response is an array of **objects** (not strings) each with ``name``,
     ``summary``, and ``folder`` fields. Both ``copilot-cm`` and
     ``dev-feature-x`` SHALL be present. No chat tab titles SHALL appear in
     the response.

   * AC-2 (``jarvis_listChatSessions`` returns chat titles):
     For T-2, the tester SHALL invoke ``jarvis_listChatSessions`` and verify
     the response is an array of **strings** (chat tab titles). "Test Tab Alpha"
     SHALL appear. YAML entity names SHALL NOT appear unless they also happen
     to be open chat tab titles.

   * AC-3 (unnamed sessions filtered):
     For T-3, the tester SHALL verify the ``jarvis_listChatSessions`` response
     contains only "Test Tab Alpha" and does not include empty-string or
     "New Chat" entries.
