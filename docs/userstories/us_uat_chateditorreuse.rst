Chat Editor Reuse — Session Open User Acceptance Tests
=======================================================

.. story:: Chat Editor Reuse on Session Open Acceptance Tests
   :id: US_UAT_CHATEDITORREUSE
   :status: implemented
   :priority: required
   :links: US_ENT_AGENTSESSION; US_MSG_AUTODELIVERY

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``chat-editor-reuse-on-session-open`` change,
   **so that** I can verify that every programmatic path that opens a new
   Jarvis session produces a **dedicated, fresh chat editor** — not a reused
   one — while the existing-UUID path remains intact, covering all five
   acceptance criteria from the Change Document.

   **Acceptance Criteria:**

   * AC-1: A test verifies that clicking a Session-Tree entry for a session
     with a known UUID activates that session's existing editor (regression
     guard; the UUID-based path must remain unaffected by the change).
   * AC-2: A test verifies that invoking ``jarvis_createSession`` with
     ``name`` + ``initialMessage`` opens a **new** chat editor for the
     session, and that both the init-prompt and the ``initialMessage`` land
     in that new editor — not in the invoking chat.
   * AC-3: A test verifies that the UI "New Session" command (Sessions
     tree-view title bar) opens a **new** chat editor each time it is
     invoked.
   * AC-4: A test verifies that triggering two new-session opens in
     succession (either UI or tool) produces **two separate** chat editors,
     visible as distinct tabs — no reuse of the first editor.
   * AC-5: A test verifies that the auto-delivery loop, when it delivers a
     message to a session whose chat editor is **not** currently open, opens
     a **new** chat editor for that session rather than reusing any
     previously focused chat.

   **Test Scenarios (summary):**

   * T-1: Existing-UUID regression — click Session-Tree entry for a session
     with a known UUID → that session's editor is activated; no new editor
     created.  (SPEC_ENT_AGENTSESSION)
   * T-2: ``jarvis_createSession`` happy path — invoke with ``name`` +
     ``initialMessage`` → new chat editor opens; init-prompt and
     ``initialMessage`` appear in it, not in the invoking chat.
     (SPEC_ENT_AGENTSESSION)
   * T-3: UI "New Session" command — invoke from the Sessions tree-view
     title bar → new chat editor opens; no existing editor is reused.
     (SPEC_ENT_AGENTSESSION)
   * T-4: Successive new sessions — trigger "New Session" (or
     ``jarvis_createSession``) twice → two distinct editors visible; the
     second open does not reuse the first editor.  (SPEC_ENT_AGENTSESSION)
   * T-5: Auto-delivery new-editor path — enable auto-delivery for a
     session, close its chat editor, queue a message → delivery loop opens
     a **new** chat editor for that session, not the previously focused one.
     (SPEC_MSG_AUTODELIVER_POLL)
