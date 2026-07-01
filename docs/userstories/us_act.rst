Actor User Stories
==================

.. note::

   **Concept-storage decoupling:** the entity *kind* is named **Actor**
   (Hewitt actor model — mailbox=message queue, state=``context.md``,
   heartbeat=activator+supervisor); the word "Session" is retired as a
   Jarvis concept name and belongs to the platform (VS Code / Copilot chat
   sessions) instead. Storage paths and filenames
   (``.jarvis/sessions/``, ``session.yaml``, ``jarvis.sessions.enabled``,
   ``jarvis_listSessions``, ``jarvis.newSession``) are **unchanged** in this
   CR — that is a separate, future code migration. Where this file says
   "session folder" or "``session.yaml``" it refers to the literal,
   unchanged storage layer; where it says "Actor" it refers to the entity
   kind concept.

.. story:: Actor Entity Type
   :id: US_ACT_ACTORS
   :status: draft
   :priority: required
   :links: US_EXP_SIDEBAR; US_ENT_ENTITY

   **As a** Jarvis user,
   **I want** an Actor entity type — a lightweight, agent-bound persistent
   context with just ``name`` and ``summary`` — so that I can give standing
   functions (PM, CM, QM, Research) and short-lived work contexts durable
   identity without the heavyweight Project schema.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.sessions.enabled`` boolean setting (default: true) gates
     the Actor feature. Actors are discovered under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (no folder setting; storage path
     unchanged, see note above). When disabled, no Actors tree, commands, or
     tools are active.
   * AC-2: An Actors tree view appears in the Jarvis Explorer sidebar when
     enabled, listing all actor entities alphabetically by name. Each leaf
     node has ``contextValue`` ``jarvisSession`` (storage-layer contextValue
     unchanged).
   * AC-3: A ``session.yaml`` schema with exactly ``name`` (required) and
     ``summary`` (optional) fields is recognized by the YAML scanner. A JSON
     Schema is provided for editor validation.
   * AC-4: The existing ``jarvis.openContext`` command works on actor tree
     nodes and opens the ``context.md`` file adjacent to ``session.yaml``.
   * AC-5: A new LM+MCP tool ``jarvis_listSessions`` returns the list of
     actor entities (``name``, ``summary``, ``folder``). It is distinct from
     ``jarvis_listChatSessions``, which lists VS Code chat tab titles.
   * AC-6: The existing ``jarvis.newEntity`` command supports actor creation
     as a third option alongside Project and Event. It creates a folder with
     ``session.yaml`` and an empty ``context.md`` under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (created on demand).
   * AC-7: The Actor feature is independent of the Projects and Events
     features — it can be active when both are disabled.
   * AC-8: Actor tree nodes expose the same context-menu actions as Project
     and Event nodes (Open Context, Open Agent Session, Reveal in Explorer,
     Reveal in OS, Open in Terminal).
   * AC-9: Opening a new agent session for any entity kind sends a kind-aware
     identity prompt naming the entity and its ``context.md`` path.


.. story:: Programmatic Session Creation Tool
   :id: US_ACT_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

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
