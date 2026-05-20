``jarvis_createSession`` Tool User Acceptance Tests
=====================================================

.. story:: jarvis_createSession Tool Acceptance Tests
   :id: US_UAT_CREATESESSIONTOOL
   :status: draft
   :priority: required
   :links: US_SES_CREATETOOL

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``jarvis_createSession`` LM+MCP tool,
   **so that** I can verify end-to-end that the tool creates session folders
   correctly, validates input, enforces idempotency, handles the disabled-gate
   case, uses verbatim folder names (no slugging), supports the
   round-trip with ``jarvis_sendToSession``, and auto-opens the new session's
   agent chat — covering all ten acceptance criteria in ``REQ_SES_CREATETOOL``.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_createSession`` appears in the VS Code
     Chat tool picker when ``jarvis.sessions.enabled=true`` and is absent when
     ``false`` (maps to REQ AC-1).
   * AC-2: A test verifies that a successful call creates the session folder,
     ``session.yaml``, and ``context.md`` with correct content (maps to REQ
     AC-2).
   * AC-3: A test verifies that the Sessions Tree reflects the new session within
     2 seconds without a manual rescan (maps to REQ AC-3).
   * AC-4: A test verifies that ``initialMessage`` is enqueued in the new
     session's inbox and readable on the next poll (maps to REQ AC-4).
   * AC-5: A test verifies that calling the tool for an existing session returns
     ``created: false`` with the expected reason and leaves all files untouched,
     without enqueuing any additional message (maps to REQ AC-5).
   * AC-6: Tests verify that invalid ``name`` values — empty string, illegal
     characters, ``.``, ``..``, and Windows reserved device names — each produce
     an ``"invalid session name: …"`` error (maps to REQ AC-6 and AC-8).
   * AC-7: A test verifies the tool appears in the Chat tool picker with
     ``toolReferenceName`` ``createSession`` (maps to REQ AC-7).
   * AC-8: A test verifies verbatim (non-slugged) folder naming and the
     round-trip consistency with ``jarvis_sendToSession`` (maps to REQ AC-2a
     and the no-workspace / no-session error path).
   * AC-9: As tester, I can verify that calling ``jarvis_createSession`` with
     no workspace open produces an error whose message begins with
     ``jarvis_createSession: no workspace open``, distinct from the
     ``invalid session name:`` prefix used for name validation (maps to
     REQ AC-9).
   * AC-10: A test verifies that after a successful call the new session's
     agent chat opens automatically (no manual click), and that on an
     idempotent skip the chat is also opened/focused — confirming consistent
     open-session end-state on both creation and skip paths (maps to
     REQ AC-10; T-12 and T-13).

   **Test Scenarios (summary):**

   * T-1: Happy path — ``name`` only, verify folder + ``session.yaml`` +
     ``context.md`` + tree refresh.
   * T-2: All three parameters (``name`` + ``summary`` + ``initialMessage``).
   * T-3: Idempotency — repeat call → ``created: false``, files unchanged, no
     duplicate message.
   * T-4: Invalid name ``""`` → ``"invalid session name: …"`` error.
   * T-5: Invalid name containing ``/`` → error.
   * T-6: Invalid names ``.`` and ``..`` → error each.
   * T-7: Windows reserved names ``CON`` and ``LPT9`` → error each.
   * T-8: Disabled gate (``jarvis.sessions.enabled=false``) → tool absent;
     re-enable + reload → tool back.
   * T-9: Verbatim folder naming — ``"Test Session"`` creates folder with space,
     unlike slugged ``jarvis.newSession`` UI output.
   * T-10: No workspace open → error with
     ``"jarvis_createSession: no workspace open"`` prefix.
   * T-11: Round-trip — create with space in name, then
     ``jarvis_sendToSession`` to same exact name → message lands in inbox.
   * T-12: Auto-open + delivery — create with ``initialMessage``; verify chat
     opens automatically and message is auto-delivered within ~7 s.
   * T-13: Idempotent auto-open — repeat call for existing session; verify
     chat is opened/focused even though ``created: false``.
