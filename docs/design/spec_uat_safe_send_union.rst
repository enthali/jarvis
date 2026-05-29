Safe Send Union Destination UAT Design Specifications
=======================================================

.. spec:: Safe Send-to-Session Destination Union Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SAFE_SEND_UNION
   :status: draft
   :links: REQ_UAT_SAFE_SEND_UNION

   **Description:**
   Step-by-step procedures and expected outcomes for ``jarvis_sendToSession``
   destination union validation and auto-delivery regression scenarios.

   **Test Setup:**

   * Extension Development Host from ``feature/entity-parity`` via F5.
   * Workspace: ``testdata/test.code-workspace``.
   * Entities in scanner: ``copilot-cm`` (session), ``alpha`` (project),
     ``DevCon 2026`` (event).
   * For T-47: chat tab "My Agent Tab" open and named.
   * For T-49, T-55: no open chat tabs for ``alpha`` / ``beta``.
   * For T-55: auto-delivery enabled for ``beta`` via Messages tree.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-44

          YAML session entity name accepted

          *AC-4, AC-6*
        - Invoke ``jarvis_sendToSession`` with
          ``{"destination": "copilot-cm", "message": "Hello from T-44"}``.
        - Tool returns success. No error. Message appears in Messages tree
          under ``copilot-cm``.

      * - T-45

          YAML project entity name accepted

          *AC-4, AC-6*
        - Invoke with ``{"destination": "alpha", "message": "Project ping"}``.
        - Tool returns success. Message queued for ``alpha``.

      * - T-46

          YAML event entity name accepted

          *AC-4, AC-6*
        - Invoke with
          ``{"destination": "DevCon 2026", "message": "Event ping"}``.
        - Tool returns success. Message queued for ``DevCon 2026``.

      * - T-47

          Chat tab title accepted

          *AC-4, AC-6*
        - Invoke with
          ``{"destination": "My Agent Tab", "message": "Chat ping"}``.
        - Tool returns success.

      * - T-48

          Unknown destination → error with valid-destination list

          *AC-1, AC-2*
        - Invoke with
          ``{"destination": "ghost-session-xyz", "message": "Lost"}``.
        - Tool returns an **error** (not success). Error message contains
          ``"ghost-session-xyz"`` and lists at least the known YAML entity
          names as valid options.

      * - T-49

          YAML entity (no open chat) → auto-delivery opens chat

          *AC-4, AC-5*
        - Queue message to ``alpha`` (no open chat). Wait ≤30 s.
        - Auto-delivery poll opens a VS Code Chat session for ``alpha``.
          Message delivered. Behaviour identical to v0.6.1 session path.

      * - T-50

          Invalid destination → no side effect

          *AC-3*
        - Note message count in Messages tree. Invoke with invalid destination.
          Re-check message count.
        - Count unchanged. No message appended.

      * - T-55

          Auto-delivery to new YAML entity — regression

          *AC-5*
        - With auto-delivery enabled for ``beta``, queue a message via
          ``jarvis_sendToSession``. Wait ≤30 s.
        - Chat opens for ``beta``; message delivered. No ``[ERROR]`` entries.
