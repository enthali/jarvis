Chat Editor Reuse — Session Open UAT Requirements
==================================================

.. req:: Chat Editor Reuse — Test Data and Verification Requirements
   :id: REQ_UAT_CHATEDITORREUSE
   :status: implemented
   :priority: required
   :links: US_UAT_CHATEDITORREUSE; REQ_ENT_AGENTSESSION; REQ_MSG_AUTODELIVER_POLL; REQ_MSG_EDITORPLACEMENT; REQ_MSG_SEND

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
   * For T-6/T-7/T-8, the editor area must have at least 2 columns open
     (e.g. open any 2 unrelated files side-by-side via "Split Editor")
     before the scenario starts, so a non-Main/non-Docs column exists to
     relocate a tab into.
   * For T-9, a message must be queued for a session in the Messages tree
     (manual root, not Auto Delivery group) so the Play button is available;
     at least 2 columns must be open with the target session's chat tab
     open in a non-1 column for the close+reopen part of the check.
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

   * AC-6 (REQ_MSG_EDITORPLACEMENT AC-1/AC-5 — Main-target close+reopen):
     For T-6, the tester SHALL open an Actor session's chat, manually move
     its tab to a column other than 1, then click the same Actor node again
     in the entity tree, and verify the tab closes in its manually-moved
     column and reopens fresh, focused, in column 1.

   * AC-7 (REQ_MSG_EDITORPLACEMENT AC-2 — Docs-target fixed column):
     For T-7, the tester SHALL click the ``context.md``, YAML, and
     agent-file children of an entity node (per
     ``REQ_ENT_ENTITY_FILE_CHILDREN``) and verify each opens in view column
     2, regardless of how many columns are currently open or which one has
     focus.

   * AC-8 (REQ_MSG_EDITORPLACEMENT AC-4 — already-open-anywhere rule):
     For T-8, the tester SHALL open a Docs-target file (e.g. ``context.md``),
     manually move its tab to column 3, then click the same file child again
     from the entity tree, and verify the existing tab in column 3 is
     focused in place — it is NOT closed, reopened, or moved back to column
     2.

   * AC-9 (REQ_MSG_EDITORPLACEMENT AC-9 / REQ_MSG_SEND AC-9 — Play-button
     targets Main):
     For T-9, the tester SHALL:

     a. Queue a message for a session, open that session's chat tab, and
        manually move it to a column other than 1.
     b. Click the Play button (``jarvis.sendMessages``) for that session in
        the Messages tree.
     c. Verify the tab closes in its manually-moved column and reopens
        fresh, focused, in column 1 (same close+reopen rule as T-6).
     d. Queue a second message for the same session (now at Main). Click
        Play again and verify the existing column-1 tab is simply focused
        in place — no close+reopen, no second tab created.
