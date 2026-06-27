Engine Requirements
===================

.. req:: Engine API Contract
   :id: REQ_ENG_CONTRACT
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core SHALL expose a versioned ``JarvisCoreApi`` from its ``activate()``
   return value, providing an entity-kind registration hook and a tool-injection
   hook through which add-ons plug into the engine.

   **Acceptance Criteria:**

   * AC-1: ``activate()`` returns an object implementing ``JarvisCoreApi`` with
     ``version``, ``registerEntityKind``, and ``registerTool``.
   * AC-2: ``registerEntityKind(config)`` accepts an ``EntityKindConfig``
     (``kind``, ``viewId``, ``folderSettingKey``, ``label``) and returns a
     ``Disposable`` that removes the kind's tree and tools.
   * AC-3: The contract carries ``readonly version`` (initially ``1``) so add-ons
     can guard against future incompatibilities.
   * AC-4: The session kind is registered through ``registerEntityKind`` as the
     core's own reference application — the engine has no kind-specific branches.


.. req:: Central Scanner Driven by Registered Kinds
   :id: REQ_ENG_SCANNER
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core SHALL own a single generic scanner that discovers entities for every
   registered kind. Each kind declares the setting that holds its scan folder
   via ``EntityKindConfig.folderSettingKey``; the engine reads that setting and
   scans. No add-on implements its own scanner.

   **Acceptance Criteria:**

   * AC-1: The scanner enumerates entities for all registered kinds using each
     kind's ``folderSettingKey``.
   * AC-2: Registering or disposing a kind adds or removes its folder from the
     scan set at runtime.
   * AC-3: The session kind scans its fixed ``.jarvis/sessions/`` path via the
     same mechanism (no special-case code path).


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
     ``jarvis_rec_``. Existing PIM tool names (e.g. ``jarvis_listProjects``) are
     renamed accordingly (e.g. ``jarvis_pim_listProjects``).
   * AC-4: Core tool names retain the ``jarvis_<verb>`` form without an infix.


.. req:: Generic Tree-Provider Factory
   :id: REQ_ENG_TREEFACTORY
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   The core SHALL own a single generic ``TreeDataProvider`` factory driven by
   registered kinds, replacing per-kind provider classes. Tree items render from
   each kind's ``EntityKindConfig`` (label factory, contextValue derived from
   kind). Add-ons may decorate items for their own kinds without modifying
   engine code.

   **Acceptance Criteria:**

   * AC-1: The engine exposes one ``TreeDataProvider``; no per-kind provider
     classes exist in the codebase.
   * AC-2: ``contextValue`` is derived uniformly from the kind discriminator.
   * AC-3: An add-on can contribute item decoration for its own kind via a
     documented extension point without modifying engine code.


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
   * AC-3: The surface is purely additive — it introduces no changes to existing
     ``registerTool``, ``registerEntityKind``, or disposal semantics.
   * AC-4: If a tool is not registered, invocation throws a descriptive error.


.. req:: Platform Session List API
   :id: REQ_ENG_SESSIONLIST
   :status: draft
   :priority: optional
   :links: US_MSG_JARVISSESSIONS

   **Description:**
   The core SHALL expose a read-only ``JarvisCoreApi.listJarvisSessions()`` method
   that returns every entity currently held by the central scanner, across all
   registered kinds, as a flat ``JarvisSession[]``. This publishes the
   already-existing cross-kind entity list (``scanner.entities``); it introduces
   no new scanner, provider, or registry.

   **Acceptance Criteria:**

   * AC-1: A ``JarvisSession`` type is exposed on the public API surface with the
     shape ``{ name: string; summary: string; agent: string; kind: string;
     folder: string }``.
   * AC-2: ``listJarvisSessions()`` returns one ``JarvisSession`` per scanned
     entity across all registered kinds (``session``, ``project``, ``event``, and
     any future kind), derived from the central scanner's current cache.
   * AC-3: The method performs no filesystem scan of its own — it is a read-only
     view of the scanner's existing state.
   * AC-4: Missing optional fields (``summary``, ``agent``) are returned as empty
     strings, matching the shape of ``jarvis_listSessions`` /
     ``jarvis_listProjects``.
   * AC-5: The addition is purely additive — no existing API method changes.
