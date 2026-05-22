Sessions User Stories
=====================

.. story:: Sessions Entity Type
   :id: US_SES_SESSIONS
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** a 'Sessions' entity type — a lightweight project alternative with
   just ``name`` and ``summary`` — so that I can track Copilot agent sessions,
   dev work sessions, and other short-lived contexts without the heavyweight
   Project schema.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.sessions.enabled`` boolean setting (default: true) gates
     the Sessions feature. Sessions are discovered under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (no folder setting). When
     disabled, no Sessions tree, commands, or tools are active.
   * AC-2: A Sessions tree view appears in the Jarvis Explorer sidebar when
     enabled, listing all session entities alphabetically by name. Each leaf
     node has ``contextValue`` ``jarvisSession``.
   * AC-3: A ``session.yaml`` schema with exactly ``name`` (required) and
     ``summary`` (optional) fields is recognized by the YAML scanner. A JSON
     Schema is provided for editor validation.
   * AC-4: The existing ``jarvis.openContext`` command works on session tree
     nodes and opens the ``context.md`` file adjacent to ``session.yaml``.
   * AC-5: A new LM+MCP tool ``jarvis_listSessionEntities`` returns the list of
     session entities (``name``, ``summary``, ``folder``). It is distinct from
     ``jarvis_listSessions``, which lists chat sessions.
   * AC-6: The existing ``jarvis.newEntity`` command supports session creation
     as a third option alongside Project and Event. It creates a folder with
     ``session.yaml`` and an empty ``context.md`` under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (created on demand).
   * AC-7: The Sessions feature is independent of the Projects and Events
     features — it can be active when both are disabled.
   * AC-8: Session tree nodes expose the same context-menu actions as Project
     and Event nodes (Open Context, Open Agent Session, Reveal in Explorer,
     Reveal in OS, Open in Terminal).
   * AC-9: Opening a new agent session for any entity kind sends a kind-aware
     identity prompt naming the entity and its ``context.md`` path.


.. story:: Programmatic Session Creation Tool
   :id: US_SES_CREATETOOL
   :status: implemented
   :priority: required

   **As an** LLM operating within an active Jarvis session,
   **I want** a tool ``jarvis_createSession`` that programmatically creates a
   new session folder with ``session.yaml`` and ``context.md``,
   **so that** I can orchestrate multi-session workflows (e.g. "spawn a
   research sub-session", "create a QualityManager session") without requiring
   the human to click through the Sessions Tree UI.

   **Acceptance Criteria:**

   * AC-1: The tool ``jarvis_createSession`` is registered via LM and MCP when
     ``jarvis.sessions.enabled=true``; it is absent when the setting is ``false``.
   * AC-2: A successful call creates ``<workspace>/.jarvis/sessions/<name>/``,
     ``session.yaml`` (with ``name`` and optional ``summary``), and an empty
     ``context.md``.
   * AC-3: The Sessions Tree reflects the new session within 2 seconds of
     creation, without any manual rescan.
   * AC-4: An optional ``initialMessage`` parameter, when provided, is enqueued
     in the new session's message queue immediately after creation so it is
     returned on the next inbox poll.
   * AC-5: If a session with the given ``name`` already exists, the tool returns
     a success response with ``created: false`` and the reason
     ``"session \"<name>\" already exists; no action taken"``; no file is
     overwritten and no ``initialMessage`` is enqueued.
   * AC-6: A ``name`` value that is empty, contains filesystem-illegal
     characters, is ``.`` or ``..``, or is a Windows reserved device name
     (``CON``, ``PRN``, ``AUX``, ``NUL``, ``COM1``–``COM9``, ``LPT1``–``LPT9``)
     results in an error ``"invalid session name: <reason>"`` — the folder name
     is used verbatim (no slug-ification) to preserve round-trip consistency
     with ``jarvis_sendToSession``.


.. story:: Session Agent Binding
   :id: US_SES_AGENTBIND
   :status: draft
   :priority: required

   **As a** Jarvis user,
   **I want** each new session to optionally declare which agent (chat mode) it
   is designed for, so that opening the session activates the correct agent
   automatically — without me having to select it from the VS Code chat picker
   every time.

   **Context:**
   Every Jarvis session typically has a designated role: a Project Manager
   session runs in ``syspilot.pm`` mode, a Change Manager session in
   ``syspilot.cm`` mode, and so on.  Without binding, the user must re-select
   the correct chat mode every time they reopen a session, which is both
   friction and an error source.  Persisting the choice in ``session.yaml`` and
   applying it on open removes that friction for the entire lifetime of the
   session.

   **Acceptance Criteria:**

   * AC-1: When creating a new session via the UI (``jarvis.newSession`` or
     ``jarvis.newEntity``), the user is presented with an agent picker that
     lists all user-invocable agents discovered from the workspace (opt-out
     via ``user-invocable: false`` in frontmatter) plus a "No agent" option.
     Each agent is presented under its frontmatter ``name`` field (if set and
     non-empty), otherwise under its filename stem without ``.agent.md``.
     Dismissing the picker (Escape) cancels the creation.
   * AC-2: The chosen agent (or no-agent, i.e. empty string) is persisted in
     ``session.yaml`` as an optional ``agent`` field; the field is omitted
     entirely when "No agent" was selected.
   * AC-3: Opening a session with a bound agent (via ``jarvis.openAgentSession``
     on a new-session path) opens the chat editor in that agent mode.
   * AC-4: The tool ``jarvis_createSession`` accepts an optional ``agent``
     parameter.  When absent or blank, no binding is set.
   * AC-5: If ``agent`` is provided to ``jarvis_createSession`` but is not a
     known agent, the call fails with a self-contained error message listing
     available agents; the session folder is NOT created.
   * AC-6: Existing ``session.yaml`` files without an ``agent`` field continue
     to work without error (open in default chat mode).
   * AC-7: ``session.schema.json`` is extended with an optional ``agent`` field
     so YAML editors provide completion and validation.


.. story:: Session Tree Primary Action
   :id: US_SES_TREECLICK
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** clicking a session name in the Sessions Tree to immediately open
   the agent-chat editor for that session,
   **so that** entering a session feels natural and frictionless — the agent
   chat is the primary destination, not a text file.

   **Context:**
   The previous default click behaviour opened ``context.md``. This contradicts
   user expectation built during the ``create-session-tool`` UAT: after
   programmatic session creation the reflex is to click the session name and
   land in the chat, not in the memory file. The memory file remains reachable
   via a dedicated inline icon on the tree item.

   **Acceptance Criteria:**

   * AC-1: A single click on a session leaf node opens / activates the
     agent-chat editor (identical to ``jarvis.openAgentSession``).
   * AC-2: A dedicated inline icon on the session tree item opens
     ``context.md`` in the editor when clicked.
   * AC-3: The inline icon has a tooltip so the user understands its purpose.
   * AC-4: Double-click on a session node behaves identically to single click
     (VS Code default behaviour; no explicit code required).
   * AC-5: Existing context-menu entries for session nodes remain unaffected.
   * AC-6: If ``context.md`` is absent in the session folder (legacy session),
     the inline icon action creates the file with the standard template before
     opening it.
