Chat Editor Reuse — Session Open User Acceptance Tests
=======================================================

.. story:: Chat Editor Reuse on Session Open Acceptance Tests
   :id: US_UAT_CHATEDITORREUSE
   :status: implemented
   :priority: required
   :links: US_ENT_AGENTSESSION; US_MSG_AUTODELIVERY; US_MSG_EDITORPLACEMENT; US_FLOW_CHORDVIEW

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``chat-editor-reuse-on-session-open`` change and the subsequent
   ``editor-group-placement`` change,
   **so that** I can verify that every programmatic path that opens a new
   Jarvis session produces a **dedicated, fresh chat editor** — not a reused
   one — while the existing-UUID path remains intact, and that Actor-chat and
   entity-file tabs land in their correct, stable Main/Docs editor-group
   columns without ever relocating a tab the user has already opened
   elsewhere.

   **Acceptance Criteria:**

   * AC-1: A test verifies that clicking a Session-Tree entry for a session
     with a known UUID activates that session's existing editor (regression
     guard; the UUID-based path must remain unaffected by the change).
   * AC-2: A test verifies that invoking ``jarvis_createActor`` with
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
   * AC-6: A test verifies that clicking an Actor node in the entity tree
     always opens/focuses that session's chat in view column 1 (Main) —
     including the close+reopen case where the tab was already open in a
     different column (maps to REQ_MSG_EDITORPLACEMENT AC-1/AC-5 / T-6).
   * AC-7: A test verifies that opening ``context.md``, a YAML config file,
     or an agent file from the entity tree always opens it in view column 2
     (Docs), fixed regardless of the current editor-group layout (maps to
     REQ_MSG_EDITORPLACEMENT AC-2 / T-7).
   * AC-8: A test verifies the "already-open-anywhere" rule: if a Docs-target
     file is already open in a column the user manually moved it to,
     re-triggering the same open action focuses it in place rather than
     moving it back to column 2 (maps to REQ_MSG_EDITORPLACEMENT AC-4 / T-8).
   * AC-9: A test verifies that the Play-button send command
     (``jarvis.sendMessages``) targets Main (view column 1) exactly like an
     Actor tree click — including the close+reopen rule when the session's
     tab is open in a different column, and simple focus-in-place when it is
     already at Main (maps to REQ_MSG_EDITORPLACEMENT AC-9 / REQ_MSG_SEND
     AC-9 / T-9).
   * AC-10: A test verifies that clicking a session/actor group node's
     label in the Messages tree (not the Play button) opens that session's
     chat at Main (column 1), mirroring the Play-button and Actor-tree-click
     targets, and that no live session yet results in a silent no-op rather
     than creating a new session (maps to REQ_MSG_EDITORPLACEMENT AC-10 /
     REQ_MSG_EXPLORER AC-5 / T-10, ``ui-improvements`` CR).
   * AC-11: A test verifies that the message-flow diagram Webview Panel
     coexists with an already-open entity-doc tab in the same Content
     column (rather than replacing it), and that opening the diagram does
     not perturb Secondary-column placement for unrelated Actor sessions
     (maps to REQ_MSG_EDITORPLACEMENT AC-11 / T-11, ``message-flow-diagram``
     CR).

   **Test Scenarios (summary):**

   * T-1: Existing-UUID regression — click Session-Tree entry for a session
     with a known UUID → that session's editor is activated; no new editor
     created.  (SPEC_ENT_AGENTSESSION)
   * T-2: ``jarvis_createActor`` happy path — invoke with ``name`` +
     ``initialMessage`` → new chat editor opens; init-prompt and
     ``initialMessage`` appear in it, not in the invoking chat.
     (SPEC_ENT_AGENTSESSION)
   * T-3: UI "New Session" command — invoke from the Sessions tree-view
     title bar → new chat editor opens; no existing editor is reused.
     (SPEC_ENT_AGENTSESSION)
   * T-4: Successive new sessions — trigger "New Session" (or
     ``jarvis_createActor``) twice → two distinct editors visible; the
     second open does not reuse the first editor.  (SPEC_ENT_AGENTSESSION)
   * T-5: Auto-delivery new-editor path — enable auto-delivery for a
     session, close its chat editor, queue a message → delivery loop opens
     a **new** chat editor for that session, not the previously focused one.
     (SPEC_MSG_AUTODELIVER_POLL)
   * T-6: Main-target close+reopen — Actor chat open in a non-1 column,
     click the Actor node again → tab closes and reopens fresh in column 1.
     (SPEC_MSG_EDITORPLACEMENT)
   * T-7: Docs-target fixed column — open an entity's ``context.md``/YAML/
     agent file → opens in column 2 regardless of current layout.
     (SPEC_MSG_EDITORPLACEMENT)
   * T-8: Already-open-anywhere rule — manually move a Docs-target tab to
     column 3, reopen the same file from the tree → focuses in column 3, not
     moved back to column 2. (SPEC_MSG_EDITORPLACEMENT)
   * T-9: Play-button targets Main — click Play (``jarvis.sendMessages``)
     for a session open in a non-1 column → close+reopen at column 1; click
     Play again while already at Main → simple focus-in-place, no
     close+reopen. (SPEC_MSG_SENDCOMMAND)
   * T-10: Messages tree group-node label click → Main — click a session
     group node's label (not Play) for a session with a live chat open
     elsewhere → close+reopen at column 1; click the label for a
     destination with no live session yet → silent no-op, no new session
     created. (SPEC_MSG_TREEPROVIDER, SPEC_MSG_EDITORPLACEMENT,
     ``ui-improvements`` CR)
   * T-11: Message-flow diagram Content-column coexistence — open the
     diagram while an entity's ``context.md`` is already open in column 2
     → diagram opens as a separate tab in the same column, existing doc tab
     untouched; with only 2 columns open, an unrelated Secondary-target
     delivery still resolves to column 2; with 3 columns open, it resolves
     to the existing 3rd column — the diagram tab never miscounts as an
     extra column. (SPEC_MSG_EDITORPLACEMENT, SPEC_FLOW_WEBVIEW,
     ``message-flow-diagram`` CR)
