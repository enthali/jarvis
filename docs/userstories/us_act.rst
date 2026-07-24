Actor User Stories
==================

.. note::

   **Concept-storage decoupling:** the entity *kind* is named **Actor**
   (Hewitt actor model — mailbox=message queue, state=``context.md``,
   heartbeat=activator+supervisor); the word "Session" is retired as a
   Jarvis concept name and belongs to the platform (VS Code / Copilot chat
   sessions) instead. Storage paths and filenames
   (``.jarvis/sessions/``, ``session.yaml``, ``jarvis.sessions.enabled``,
   ``jarvis_listSessions``, ``jarvis.newSession``) were **unchanged** as of
   this note's original CR (``actor-terminology-rename``, Phase 1) — flagged
   there as "a separate, future code migration." That migration is
   ``US_ACT_DUALPATH_STORAGE`` below (``actor-dualpath-scanner`` CR, Phase 2):
   a **soft**, permanent-coexistence migration, not a hard rename — existing
   ``.jarvis/sessions/``/``session.yaml`` actors are never touched or
   forced to move. Where this file says "session folder" or
   "``session.yaml``" it refers to the literal (still-live, still-written-
   by-old-actors) storage layer; where it says "Actor" it refers to the
   entity kind concept. **(actor-tool-rename CR, Phase 5 addendum):** the
   LM/MCP tool names flagged above as unchanged in Phase 1
   (``jarvis_listSessions``, and separately ``jarvis_createSession``) have
   now been renamed to ``jarvis_listActors``/``jarvis_createActor`` by
   Phase 5 — the "future code migration" foreshadowed by this note is
   complete for the tool-name layer specifically (storage paths/filenames
   remain unchanged, per ``US_ACT_DUALPATH_STORAGE``'s permanent
   dual-convention design).

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
   * AC-5: A new LM+MCP tool ``jarvis_listActors`` (renamed from
     ``jarvis_listSessions`` by the actor-tool-rename CR, Phase 5) returns
     the list of actor entities (``name``, ``summary``, ``folder``). It is
     distinct from ``jarvis_listChatSessions``, which lists VS Code chat tab
     titles.
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


.. story:: Soft Actor Storage-Convention Migration
   :id: US_ACT_DUALPATH_STORAGE
   :status: draft
   :priority: required
   :links: US_ACT_ACTORS

   **As a** Jarvis user (and the agents/tooling that operate on my
   workspace),
   **I want** new Actor entities to be created under a dedicated
   ``.jarvis/actors/`` naming convention that matches the "Actor" concept,
   while every Actor I already have under the older ``.jarvis/sessions/``
   convention keeps working fully and forever with no forced migration,
   **so that** the codebase's own storage layer finally catches up to the
   "Actor" terminology for new entities, without ever requiring me to
   rename, move, or otherwise disturb existing ones — a workspace mixing
   both conventions indefinitely is a normal, permanently supported state,
   not a transitional inconvenience.

   **Acceptance Criteria:**

   * AC-1: A new fixed storage convention, ``<workspaceRoot>/.jarvis/actors/
     <name>/actor.yaml``, is recognized alongside the existing
     ``<workspaceRoot>/.jarvis/sessions/<name>/session.yaml`` convention —
     both are scanned, and their entities are merged into one logical Actor
     list/tree with no visible distinction to the user based on which
     convention a given Actor happens to use.
   * AC-2: Creating a **new** Actor (via the tree's "New Actor" button or
     the ``jarvis_createActor`` tool — renamed from ``jarvis_createSession``
     by the actor-tool-rename CR, Phase 5) writes only the new convention
     (``.jarvis/actors/<name>/actor.yaml``) going forward — it never writes
     a new ``session.yaml``.
   * AC-3: Actors already stored under the old convention are **never**
     auto-migrated, auto-renamed, or otherwise mutated by this capability —
     their ``context.md`` and all other content remain fully readable and
     writable exactly as before, indefinitely, with no deprecation
     timeline.
   * AC-4: A workspace containing a mix of old- and new-convention Actor
     folders is a normal, fully supported, permanent state — not a
     transition window with an implied end state where every Actor is
     eventually expected to use the new convention.
   * AC-5: This capability is storage/scanner-level only — it does not
     change the Actor tree's visual structure (a separate capability —
     Unified Entity Tree, Phase 3, since completed) and does not itself
     rename any LM/MCP tool (that was Phase 5, ``actor-tool-rename`` CR,
     since completed — see ``jarvis_listActors``/``jarvis_createActor`` in
     ``US_ACT_ACTORS`` AC-5 and ``US_ACT_CREATETOOL`` above).


.. story:: Opt-In Actor Storage-Convention Migration Command
   :id: US_ACT_MIGRATIONCOMMAND
   :status: draft
   :priority: optional
   :links: US_ACT_DUALPATH_STORAGE

   **As a** Jarvis user with one or more Actors still stored under the old
   ``.jarvis/sessions/`` convention,
   **I want** a deliberately minimal, opt-in Command Palette command that
   migrates a single chosen Actor to the new ``.jarvis/actors/`` convention
   on demand,
   **so that** I can move individual Actors forward when *I* decide to,
   without any automatic nudging, bulk operation, or tree/context-menu UI
   surface pressuring me to do so — migration remains entirely optional per
   ``US_ACT_DUALPATH_STORAGE`` AC-3/AC-4.

   **Acceptance Criteria:**

   * AC-1: A single Command Palette-only command lets the user pick one
     Actor currently stored under the old convention
     (``.jarvis/sessions/<name>/session.yaml``) from a list; Actors already
     using the new convention are never offered, since there is nothing to
     migrate for them.
   * AC-2: If no old-convention Actor exists, the command tells the user so
     instead of presenting an empty picker.
   * AC-3: Choosing an Actor moves its folder and convention file to the new
     location/name (``.jarvis/actors/<name>/actor.yaml``) without touching
     ``context.md`` or any other file inside the folder, then refreshes the
     Actor tree so the migrated Actor immediately appears under its new
     convention.
   * AC-4: After a successful migration, the migrated Actor is notified (via
     the existing message-queue mechanism) of its new folder and
     ``context.md`` path — sent unconditionally and without waiting for or
     requiring the Actor to currently be an open chat session.
   * AC-5: This command does not provide bulk migration, does not appear
     anywhere in the tree or a context menu, does not run automatically or
     on a schedule, and does not change how new Actors are created
     (``US_ACT_DUALPATH_STORAGE`` AC-2 is unaffected).


.. story:: Programmatic Actor Creation Tool
   :id: US_ACT_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **As an** LLM operating within an active Jarvis session,
   **I want** a tool ``jarvis_createActor`` (renamed from
   ``jarvis_createSession`` by the actor-tool-rename CR, Phase 5) that
   programmatically creates a new session folder with ``session.yaml`` and
   ``context.md``,
   **so that** I can orchestrate multi-session workflows (e.g. "spawn a
   research sub-session", "create a QualityManager session") without requiring
   the human to click through the Sessions Tree UI.

   **Acceptance Criteria:**

   * AC-1: The tool ``jarvis_createActor`` is registered via LM and MCP when
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


.. story:: Actor Identity Recovery Tool
   :id: US_ACT_WHOAMI
   :status: draft
   :priority: required
   :links: US_ACT_ACTORS

   **As a** Jarvis Actor operating in a chat session,
   **I want** a tool ``jarvis_whoAmI`` that tells me my own name and the path
   to my ``context.md``,
   **so that** I can reliably recover my identity after ``/compact`` or context
   loss and resume my role by reading my persistent memory.

   **Acceptance Criteria:**

   * AC-1: Calling ``jarvis_whoAmI`` from a chat session that is a registered
     Actor SHALL return the Actor's name and the absolute path to its
     ``context.md``.
   * AC-2: Calling ``jarvis_whoAmI`` from a chat session that is NOT a
     registered Actor SHALL return an error instructing the session to ask
     the user to resolve its identity.
   * AC-3: The tool SHALL require no input parameters — the extension resolves
     the calling session's identity automatically.
