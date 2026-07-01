Chat Editor Reuse — Session Open UAT Requirements
==================================================

.. req:: Chat Editor Reuse — Test Data and Verification Requirements
   :id: REQ_UAT_CHATEDITORREUSE
   :status: implemented
   :priority: required
   :links: US_UAT_CHATEDITORREUSE; REQ_ENT_AGENTSESSION; REQ_MSG_AUTODELIVER_POLL

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the ``chat-editor-reuse-on-session-open``
   change in the Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/chat-editor-reuse-on-session-open``
     checked out).
   * Pre-existing session test data must be present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and
       ``context.md`` (used in T-1 for the known-UUID path).
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md`` (reserved; may be used as second session in T-4/T-5).

   * An active VS Code Chat agent session (any name) must be open in the EDH
     so that tool calls can be issued.
   * For T-5, auto-delivery must be enabled for the target session
     (``autodelivery.json`` lists the session name); the session's chat
     editor must be closed before the message is queued.
   * Between scenarios, close any chat editors opened during the scenario and
     delete any session folders created under ``testdata/.jarvis/sessions/``
     that were not pre-existing, to reset state.

   **Acceptance Criteria — per Change-Document AC:**

   * AC-1 (CR AC-1 — UUID path regression guard):
     The tester SHALL verify that clicking the ``copilot-cm`` (or any
     pre-existing) session node in the Sessions Tree activates its known
     editor without creating a new one.  The UUID-based
     ``vscode-chat-session://local/<uuid>`` path must continue to work
     as before (T-1).

   * AC-2 (CR AC-2 — ``jarvis_createSession`` fresh editor):
     After T-2, the tester SHALL verify:

     a. A new chat editor tab for the session is visible in the EDH.
     b. The init-prompt text appears in that new editor's conversation.
     c. The ``initialMessage`` text is auto-delivered into that editor
        (not into the invoking chat session).
     d. The tab count in the editor area increases by one compared with the
        pre-invocation state.

   * AC-3 (CR AC-3 — UI "New Session" fresh editor):
     The tester SHALL observe that invoking the "New Session" command (plus
     icon in the Sessions tree-view title bar) opens a new chat editor tab
     and does not navigate within any existing editor (T-3).

   * AC-4 (CR AC-4 — successive opens produce separate editors):
     After T-4, the tester SHALL verify that two distinct chat editor tabs
     are open simultaneously — each corresponding to a different session —
     and that neither session's editor is the same tab as the other (T-4).

   * AC-5 (CR AC-5 — auto-delivery opens new editor):
     After T-5, the tester SHALL verify that the auto-delivery poll (within
     ~7 s) opened a chat editor for the target session, and that this editor
     is a **new** tab — not the editor that was focused before the message
     was queued (T-5).
