``jarvis_createActor`` Tool UAT Design Specifications
=========================================================

.. note::

   **(actor-tool-rename CR, Phase 5):** this tool was renamed from
   ``jarvis_createSession`` to ``jarvis_createActor`` (hard cutover, old
   name removed entirely). All test prompts/scenarios below have been
   updated to use the new tool name.

.. spec:: jarvis_createActor Tool Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_CREATESESSIONTOOL
   :status: draft
   :links: REQ_UAT_CREATESESSIONTOOL

   **Description:**
   Step-by-step procedures and expected outcomes for all thirteen
   ``jarvis_createActor`` acceptance test scenarios, covering the happy path,
   full-parameter call, idempotency, name validation, disabled-gate, verbatim
   naming, no-workspace error, round-trip consistency with
   ``jarvis_sendToSession``, and auto-open behaviour (post-headless-pivot).

   **Test Setup:**

   * Extension Development Host (EDH) running the Jarvis extension from the
     ``feature/create-session-tool`` branch.  Launch via F5 in VS Code.
   * Open workspace: ``testdata/test.code-workspace`` (File → Open Workspace
     from File…).  This sets ``testdata/`` as the workspace root.
   * Pre-existing session test data is present:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` and ``context.md``
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` and
       ``context.md``

   * An agent chat session is open in the EDH (any name; the test engineer's
     own session is sufficient).
   * All tool calls are issued via the VS Code Chat input bar using direct
     prompts such as *"Call jarvis_createActor with name 'MySes'"* or the
     ``#createSession`` tool reference.  Observe both the tool response rendered
     in the chat thread and the filesystem / sidebar state.
   * Between scenarios, delete any folders created under
     ``testdata/.jarvis/sessions/`` that were not pre-existing, to reset state.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 7 43 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Happy path — name only

          *CR AC: 1, 2, 3, 7*
        - Precondition: ``testdata/.jarvis/sessions/happy-path-test/`` does not
          exist.

          In the VS Code Chat input bar, type ``#createSession`` and confirm it
          resolves.  Then prompt the model:

          *"Call jarvis_createActor with name 'happy-path-test'. No summary.
          No initialMessage."*

          Observe the tool response in the chat thread and the Sessions tree in
          the Jarvis sidebar.
        - **Response:** JSON object ``{ "created": true, "path":
          ".jarvis/sessions/happy-path-test" }``.

          **Filesystem:** ``testdata/.jarvis/sessions/happy-path-test/``
          exists.

          ``session.yaml`` contains::

            name: happy-path-test

          (no ``summary`` key).

          ``context.md`` contains exactly::

            # happy-path-test

          (heading + blank line, nothing else).

          **Sessions tree:** The node ``happy-path-test`` appears in the
          Sessions tree within 2 seconds; no manual Rescan required.

          **Tool picker:** ``#createSession`` resolved in the pre-step
          confirms REQ AC-7.

          *Clean up: delete* ``testdata/.jarvis/sessions/happy-path-test/``.

      * - T-2

          All three parameters

          *CR AC: 2b, 4*
        - Precondition: ``testdata/.jarvis/sessions/full-params/`` does not
          exist.

          Prompt the model:

          *"Call jarvis_createActor with name 'full-params', summary
          'Integration test session', initialMessage 'Hello from T-2'."*

          After the tool returns, prompt: *"Call jarvis_readMessage for session
          'full-params'."*
        - **Response:** ``{ "created": true, "path":
          ".jarvis/sessions/full-params" }``.

          **Filesystem:**
          ``session.yaml`` contains::

            name: full-params
            summary: Integration test session

          ``context.md`` contains ``# full-params`` + blank line.

          **Inbox:** ``jarvis_readMessage`` (or equivalent inbox poll) returns
          a message with:

          * ``text``: ``"Hello from T-2"``
          * ``sender``: ``"jarvis_createActor"``
          * ``destination``: ``"full-params"``

          **Sessions tree:** node ``full-params`` appears within 2 seconds.

          *Clean up: delete* ``testdata/.jarvis/sessions/full-params/``.

      * - T-3

          Idempotency

          *CR AC: 5*
        - Precondition: Session ``full-params`` created in T-2 is intact; note
          the ``mtime`` (right-click → Properties, or ``Get-Item session.yaml |
          Select-Object LastWriteTime`` in a terminal).

          Prompt the model:

          *"Call jarvis_createActor with name 'full-params', summary 'Changed
          summary', initialMessage 'Second message'."*

          After the tool returns, check the inbox again.
        - **Response:** ``{ "created": false, "reason": "session
          \"full-params\" already exists; no action taken", "path":
          ".jarvis/sessions/full-params" }``.

          **Filesystem:** ``session.yaml`` still contains
          ``summary: Integration test session`` (original value — not
          overwritten).  ``mtime`` of ``session.yaml`` and ``context.md`` is
          unchanged.

          **Inbox:** no new message enqueued; the inbox still contains only
          the T-2 message (count does not increase).

          *Clean up: delete* ``testdata/.jarvis/sessions/full-params/``.

      * - T-4

          Invalid name — empty string

          *CR AC: 6*
        - Precondition: none special.

          Prompt the model:

          *"Call jarvis_createActor with name ''."* (empty string)
        - **Response:** Error (tool error or model-surfaced error) whose
          message begins with ``"invalid session name:"``.

          **Filesystem:** no new folder created under
          ``testdata/.jarvis/sessions/``.

      * - T-5

          Invalid name — contains ``/``

          *CR AC: 6*
        - Prompt the model:

          *"Call jarvis_createActor with name 'bad/name'."*
        - **Response:** Error beginning with ``"invalid session name:"``.

          **Filesystem:** no new folder created.

          Repeat for ``\`` (backslash), ``:``, ``*``, ``?``, ``"``, ``<``,
          ``>``, ``|`` — each must produce the same error class.  At minimum
          verify ``/`` and ``\`` manually.

      * - T-6

          Invalid names — ``.`` and ``..``

          *CR AC: 6, 8*
        - Step 1 — Prompt: *"Call jarvis_createActor with name '.'."*

          Step 2 — Prompt: *"Call jarvis_createActor with name '..'."*
        - **Step 1 response:** Error beginning with ``"invalid session name:"``.

          **Step 2 response:** Error beginning with ``"invalid session name:"``.

          **Filesystem:** no folder created for either call.

      * - T-7

          Windows reserved device names

          *CR AC: 6, 8*
        - Step 1 — Prompt: *"Call jarvis_createActor with name 'CON'."*

          Step 2 — Prompt: *"Call jarvis_createActor with name 'LPT9'."*
        - **Step 1 response:** Error beginning with ``"invalid session name:"``.

          **Step 2 response:** Error beginning with ``"invalid session name:"``.

          **Filesystem:** no folder created for either call.

          *Note: The check is case-insensitive; ``con`` and ``lpt9`` must
          also be rejected.  Optionally verify one lowercase variant.*

      * - T-8

          Disabled gate

          *CR AC: 1*
        - Step 1 — In the EDH Workspace Settings set
          ``jarvis.sessions.enabled`` to ``false``.  Run
          **Developer: Reload Window** (Ctrl+Shift+P).  Wait for the
          extension to re-activate.

          Step 2 — Open VS Code Chat.  Type ``#`` in the input bar and
          look for ``createSession`` in the tool picker suggestions.

          Step 3 — Re-enable: set ``jarvis.sessions.enabled`` to ``true``
          and reload window again.  Repeat the tool-picker check.
        - **Step 2 expected:** ``createSession`` does NOT appear in the
          tool picker.  Attempting to prompt the model to call
          ``jarvis_createActor`` results in a "tool not found" or
          equivalent failure.

          **Step 3 expected:** ``createSession`` reappears in the tool
          picker after reload.  A T-1-style call succeeds.

          *Clean up: restore* ``jarvis.sessions.enabled=true``.

      * - T-9

          Verbatim folder naming — no slug transformation

          *CR AC: 2a (no-slug design)*
        - Precondition: ``testdata/.jarvis/sessions/Test Session/`` does not
          exist.

          Step 1 — Prompt the model:

          *"Call jarvis_createActor with name 'Test Session' (with the
          space)."*

          Step 2 — Open a terminal in the EDH and run::

            Get-ChildItem testdata/.jarvis/sessions/

          Step 3 — For contrast, run ``Jarvis: New Session`` (Sessions tree
          ``+`` button) and enter ``Test Session`` as the name.  Note the
          folder name created by the UI command.
        - **Step 1 response:** ``{ "created": true, "path":
          ".jarvis/sessions/Test Session" }``.

          **Step 2:** The directory listing shows a folder named literally
          ``Test Session`` (with the space) — NOT ``test-session`` or
          ``test_session``.

          **Step 3 (contrast):** The UI command (``jarvis.newSession``) creates
          a slug-based folder such as ``test-session`` (lowercase, hyphen for
          space).  This confirms the two creation paths are intentionally
          asymmetric (see CR Decision 1 in ``docs/changes/create-session-tool.md``).

          *Clean up: delete* ``testdata/.jarvis/sessions/Test Session/``
          *and* ``testdata/.jarvis/sessions/test-session/``
          *(or whichever slug the UI produced).*

      * - T-10

          No workspace open

          *REQ AC: 9 (no-workspace precondition prefix)*
        - Open a **second VS Code window** with no folder / workspace open.
          Ensure the Jarvis extension is active (check Output → Jarvis channel).

          In a Chat session in that windowless instance, prompt:

          *"Call jarvis_createActor with name 'nws-test'."*
        - **Response:** Error whose message begins with
          ``"jarvis_createActor: no workspace open"`` (NOT
          ``"invalid session name:"``) — confirming that the workspace guard
          fires after name validation but before the idempotency check, and
          that the ``jarvis_createActor: no workspace open`` prefix is
          distinct from ``invalid session name:``.

          No folder is created anywhere.

      * - T-11

          Round-trip — create then send

          *CR AC: 2a, 4 (round-trip consistency, CR Decision 1)*
        - Precondition: ``testdata/.jarvis/sessions/Round Trip Test/`` does
          not exist.

          Step 1 — Prompt: *"Call jarvis_createActor with name 'Round Trip
          Test'."*

          Step 2 — Prompt: *"Call jarvis_sendToSession with destination 'Round
          Trip Test' and message 'Round-trip check'."*

          Step 3 — Prompt: *"Call jarvis_readMessage for session 'Round Trip
          Test'."*
        - **Step 1 response:** ``{ "created": true, "path":
          ".jarvis/sessions/Round Trip Test" }``.

          **Step 2 response:** success (no error).

          **Step 3 response:** Message with text ``"Round-trip check"`` is
          returned from the inbox of session ``"Round Trip Test"``.

          This confirms that ``jarvis_createActor`` and
          ``jarvis_sendToSession`` share the same verbatim-name addressing
          scheme (CR Decision 1 rationale).

          *Clean up: delete* ``testdata/.jarvis/sessions/Round Trip Test/``.

      * - T-12

          Auto-open + delivery (post-headless-pivot)

          *REQ AC: 10 (auto-open) + 4 (initialMessage delivery via
          auto-delivery loop)*
        - Precondition: ``testdata/.jarvis/sessions/auto-open-test/`` does not
          exist.  Sessions tree visible.
          ``jarvis.messages.enabled = true`` (default) so the auto-delivery
          loop is running.

          Step 1 — Prompt the model:

          *"Call jarvis_createActor with name 'auto-open-test',
          initialMessage 'Auto-delivered hello'."*

          Step 2 — Wait up to 7 seconds (5 s heartbeat poll + buffer).
        - **Response:** ``{ "created": true, "path":
          ".jarvis/sessions/auto-open-test" }``.

          **Auto-open:** A new chat editor for session ``auto-open-test``
          opens automatically — no manual click required.

          **Auto-delivery:** Within ~7 seconds, the message text
          ``Auto-delivered hello`` appears as a delivered message in that
          chat editor (auto-delivery loop fed it from the queue).

          **Sessions tree:** The new node ``auto-open-test`` appears in the
          Sessions tree within 2 s as before (AC-3).

          *Clean up: delete* ``testdata/.jarvis/sessions/auto-open-test/``.

      * - T-13

          Idempotent skip still opens the session

          *REQ AC: 10 (auto-open on idempotent skip)*
        - Precondition: ``testdata/.jarvis/sessions/idempotent-open/`` already
          exists (create it once in a prior step, then close the chat editor
          for it if it was opened).

          Step 1 — Prompt the model:

          *"Call jarvis_createActor with name 'idempotent-open'."*
        - **Response:** JSON object that includes ``"created": false``.

          **Auto-open:** A chat editor for ``idempotent-open`` is opened
          (or focused if already open) — even though no files were written.

          *Clean up: delete* ``testdata/.jarvis/sessions/idempotent-open/``.
