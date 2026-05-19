``jarvis_createSession`` Tool UAT Requirements
===============================================

.. req:: jarvis_createSession Tool — Test Data and Verification Requirements
   :id: REQ_UAT_CREATESESSIONTOOL
   :status: draft
   :priority: required
   :links: US_UAT_CREATESESSIONTOOL; REQ_SES_CREATETOOL

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate ``jarvis_createSession`` in the Extension
   Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/create-session-tool`` checked out).
   * Pre-existing session test data from ``REQ_UAT_SES_TREE`` must be present
     (``testdata/.jarvis/sessions/copilot-cm/`` and
     ``testdata/.jarvis/sessions/dev-feature-x/``).
   * An active VS Code Chat agent session (any name) must be open in the EDH so
     that tool calls can be invoked.
   * For T-10 (no workspace), a second VS Code window with no folder open is
     required.
   * All tool calls in T-1 through T-9 are made via the VS Code Chat panel
     (either inline ``#createSession`` reference or direct LM prompt asking
     the model to call the tool).

   **Acceptance Criteria — per REQ_SES_CREATETOOL AC:**

   * AC-1 (REQ AC-1 — tool registration gate):
     The tester SHALL verify that the tool appears in the VS Code Chat tool
     picker (``#createSession``) when ``jarvis.sessions.enabled=true`` and is
     absent — no entry in the picker — when ``false`` (T-8).

   * AC-2 (REQ AC-2 — successful creation):
     After a successful T-1 or T-2 call, the tester SHALL verify:

     a. ``testdata/.jarvis/sessions/<name>/`` exists.
     b. ``session.yaml`` contains ``name: <name>`` (always) and ``summary:
        <summary>`` (only when a non-blank summary was supplied).
     c. ``context.md`` contains exactly ``# <name>`` followed by a blank line,
        and nothing else.

   * AC-3 (REQ AC-3 — Sessions Tree auto-refresh):
     The tester SHALL observe that the new session node appears in the Sessions
     tree within 2 seconds of the tool returning, without clicking any Rescan
     button (T-1, T-2).

   * AC-4 (REQ AC-4 — initialMessage enqueued):
     After T-2, the tester SHALL invoke ``jarvis_readMessage`` (or
     ``jarvis_listSessions`` + ``jarvis_sendToSession`` round-trip check) to
     confirm that the ``initialMessage`` text is present in the new session's
     message queue and that the sender field is ``"jarvis_createSession"``
     (T-2, T-11).

   * AC-5 (REQ AC-5 — idempotency):
     After T-3, the tester SHALL verify:

     a. The tool response contains ``created: false`` and the reason string
        ``session "<name>" already exists; no action taken``.
     b. The ``mtime`` (last-modified timestamp) of ``session.yaml`` and
        ``context.md`` is unchanged from the original creation.
     c. No additional message has been enqueued (inbox count does not
        increase from the T-2 baseline).

   * AC-6 (REQ AC-6 — name validation):
     For T-4, T-5, T-6, T-7, the tester SHALL verify that the tool returns (or
     throws) an error whose message begins with ``"invalid session name:"``
     and that no filesystem artefact was created.

   * AC-7 (REQ AC-7 — tool picker reference name):
     The tester SHALL confirm that typing ``#createSession`` in the VS Code Chat
     input resolves to the ``jarvis_createSession`` tool (T-1 setup step).

   * AC-8 (REQ AC-8 — verbatim naming / no Windows reserved names):
     T-9 verifies that a name containing a space creates a folder with that
     literal space. T-7 verifies that ``CON`` and ``LPT9`` are rejected.

   * AC-9 (REQ AC-9 — no-workspace error prefix):
     For T-10, the tester SHALL verify that the error message begins with
     ``"jarvis_createSession: no workspace open"`` and is distinct from
     ``"invalid session name:"`` — confirming that the workspace guard fires
     after name validation but before the idempotency check.

   * AC-10 (REQ AC-10 — auto-open):
     For T-12, the tester SHALL verify that after a successful
     ``jarvis_createSession`` call (``created: true``) a new chat editor for
     the session opens automatically without any manual click, and that within
     ~7 seconds the ``initialMessage`` text is delivered into that chat via the
     auto-delivery loop (no manual ``jarvis_readMessage`` required).
     For T-13, the tester SHALL verify that an idempotent skip
     (``created: false``) also results in the chat editor being opened or
     focused, confirming consistent open-session end-state on both paths.
