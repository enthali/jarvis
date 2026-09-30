Engine Requirements
===================

.. req:: Engine API Contract
   :id: REQ_ENG_CONTRACT
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core SHALL expose a versioned ``JarvisCoreApi`` from its ``activate()``
   return value, providing a tool-injection hook through which add-ons plug
   into the engine. There is no entity-kind registration: the Actor is the
   only entity kind and is discovered without registration
   (``REQ_ACTOR_SCHEMA``).

   **Acceptance Criteria:**

   * AC-1: ``activate()`` returns an object implementing ``JarvisCoreApi`` with
     ``version``, ``registerTool``, and ``listActors`` (``REQ_ENG_ACTORLIST``).
   * AC-2: ``registerEntityKind`` and ``EntityKindConfig`` SHALL NOT exist on
     the API surface.
   * AC-3: The contract carries ``readonly version``. Removing
     ``registerEntityKind`` and ``listJarvisSessions`` is a breaking change, so
     ``version`` SHALL be ``2``; add-ons can guard against incompatibilities
     with it.


.. req:: Tool Namespace Convention
   :id: REQ_ENG_TOOLNS
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   Tools registered through ``registerTool`` SHALL follow the naming convention
   ``jarvis_<verb>`` for core, ``jarvis_pim_<verb>`` for PIM, and
   ``jarvis_rec_<verb>`` for the recorder. The engine SHALL reject names that do
   not start with ``jarvis_`` and SHALL reject duplicate names.

   **Acceptance Criteria:**

   * AC-1: ``registerTool`` throws a descriptive error for a name not starting
     with ``jarvis_``.
   * AC-2: ``registerTool`` throws for a name already registered (no silent
     overwrite).
   * AC-3: PIM tools use the ``jarvis_pim_`` infix; recorder tools use
     ``jarvis_rec_``.
   * AC-4: Core tool names retain the ``jarvis_<verb>`` form without an infix.


.. req:: Tool Registry Exposure
   :id: REQ_ENG_TOOLREGISTRY
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core SHALL expose a read-only surface on ``JarvisCoreApi`` that allows a
   consumer extension to enumerate all currently registered tools and to invoke
   any tool by name. This enables transport layers (e.g. MCP) to be implemented
   as separate extensions without reaching into engine internals.

   **Acceptance Criteria:**

   * AC-1: A consumer extension can obtain a list of all registered tools (name
     and description) via a single API call.
   * AC-2: A consumer extension can invoke any registered tool by name, receiving
     the same result type as a language-model invocation.
   * AC-3: The surface is read-only — it introduces no changes to
     ``registerTool`` or disposal semantics.
   * AC-4: If a tool is not registered, invocation throws a descriptive error.


.. req:: Platform Actor List API
   :id: REQ_ENG_ACTORLIST
   :status: approved
   :priority: required
   :links: US_ACTOR_LISTTOOL; REQ_ACTOR_LISTTOOL; REQ_ACTOR_SCHEMA

   **Description:**
   The core SHALL expose a read-only ``JarvisCoreApi.listActors()`` method so
   add-on packages (e.g. ``kanban``, ``syspilot``) can enumerate Actors
   without their own scan. It replaces ``listJarvisSessions()``.

   **Acceptance Criteria:**

   * AC-1: A ``JarvisActor`` type is exposed on the public API surface with the
     shape ``{ name: string; summary: string; agent: string; folder: string;
     id: string }`` — the same entry shape as ``jarvis_listActors``
     (``REQ_ACTOR_LISTTOOL`` AC-2).
   * AC-2: ``listActors()`` returns one ``JarvisActor`` per Actor discovered per
     ``REQ_ACTOR_TREE`` AC-2, from the current Actor scan.
   * AC-3: The method performs no filesystem scan of its own — it is a
     read-only view of the existing scan state.
   * AC-4: Missing optional fields (``summary``, ``agent``) are returned as
     empty strings.
   * AC-5: ``listJarvisSessions()`` and the ``JarvisSession`` type SHALL be
     removed; existing add-on callers SHALL use ``listActors()``.
