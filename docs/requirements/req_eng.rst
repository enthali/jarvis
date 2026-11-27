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
   :status: implemented
   :priority: required
   :links: US_MOD_INSTALL

   **Description:**
   Tools registered through ``registerTool`` SHALL follow the naming convention
   ``jarvis_<verb>`` for core and ``jarvis_pim_<verb>`` for PIM. The recorder
   registers no tools today; a tool it registers later uses
   ``jarvis_rec_<verb>``. The engine SHALL reject names that do
   not start with ``jarvis_`` and SHALL reject duplicate names.

   **Acceptance Criteria:**

   * AC-1: ``registerTool`` throws a descriptive error for a name not starting
     with ``jarvis_``.
   * AC-2: ``registerTool`` throws for a name already registered (no silent
     overwrite).
   * AC-3: PIM tools use the ``jarvis_pim_`` infix; should the recorder register
     a tool, it uses ``jarvis_rec_``.
   * AC-4: Core tool names retain the ``jarvis_<verb>`` form without an infix.


.. req:: Tool Reference and Description Namespace
   :id: REQ_ENG_TOOLREF
   :status: approved
   :priority: required
   :links: US_MOD_TOOLREF; REQ_ENG_TOOLNS

   **Description:**
   Every entry of ``contributes.languageModelTools`` in a Jarvis package SHALL
   name its owning package in its ``toolReferenceName`` and at the start of its
   ``modelDescription``. The package is the suffix of the extension id
   ``enthali.jarvis-<package>``: ``core``, ``kanban`` and ``pim``
   today. The tool ``name`` is governed by ``REQ_ENG_TOOLNS`` and does not
   change.

   A former ``toolReferenceName`` no longer resolves after this change; the
   ``languageModelTools`` contribution point offers no property that keeps an
   old reference as an alias (VS Code contribution points reference, checked
   2026-10-24).

   **Acceptance Criteria:**

   * AC-1: ``toolReferenceName`` SHALL be ``jarvis_<package>_<former
     reference>``; ``createActor`` becomes ``jarvis_core_createActor`` and
     ``task`` becomes ``jarvis_pim_task``.
   * AC-2: ``modelDescription`` SHALL begin with ``jarvis_<package>:`` and a
     space, followed by the description the tool had before.
   * AC-3: A ``modelDescription`` that carries a deprecation notice SHALL carry the
     package first and the notice directly after it, so the notice stays at the
     start of the description text.
   * AC-4: The ``toolReferenceName`` values of all Jarvis packages SHALL be
     unique.
   * AC-5: ``name``, ``displayName``, ``icon``, ``canBeReferencedInPrompt``,
     ``inputSchema`` and the description passed to ``registerTool`` SHALL NOT
     change, and no tool is added or removed.
   * AC-6: A maintained document or shipped asset that names a tool as a ``#``
     chat reference SHALL use the new ``toolReferenceName``.


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
   :status: implemented
   :priority: required
   :links: US_COM_FIND; REQ_ACTOR_SCHEMA; REQ_ACTOR_MAIL

   **Description:**
   The core SHALL expose a read-only ``JarvisCoreApi.listActors()`` method so
   add-on packages (e.g. ``kanban``) can enumerate Actors
   without their own scan. It replaces ``listJarvisSessions()``.

   **Acceptance Criteria:**

   * AC-1: A ``JarvisActor`` type is exposed on the public API surface with the
     shape ``{ name: string; summary: string; agent: string; folder: string;
     id: string }`` — the entry shape of the former ``jarvis_listActors``
     tool, which the Jarvis AHP client replaces by ``jarvis_listActors`` of
     ``SPEC_COM_TOOLS`` (name and summary only).
   * AC-2: ``listActors()`` returns one ``JarvisActor`` per Actor discovered per
     ``REQ_ACTOR_TREE`` AC-2, from the current Actor scan.
   * AC-3: The method performs no filesystem scan of its own — it is a
     read-only view of the existing scan state.
   * AC-4: A missing ``summary`` is returned as an empty string. ``agent`` is
     the Actor name (``REQ_ACTOR_WHOAMI`` AC-1).
   * AC-5: ``listJarvisSessions()`` and the ``JarvisSession`` type SHALL be
     removed; existing add-on callers SHALL use ``listActors()``.
   * AC-6: The API SHALL expose an event ``onDidScanActors`` that fires once after every
     completed Actor rescan, whether or not the Actor list changed, so that an add-on can
     read ``listActors()`` again after each scan. The member is additive: ``version`` stays
     ``2`` (``REQ_ENG_CONTRACT`` AC-3) and an add-on SHALL check that the member exists
     before using it.


.. req:: Actor Node Mark API
   :id: REQ_ENG_ACTORMARK
   :status: implemented
   :priority: required
   :links: US_REC_CAPTURE; REQ_ACTOR_TREE; REQ_COM_STATE; REQ_ENG_ACTORINDICATOR; REQ_ENG_CONTRACT

   **Description:**
   The core SHALL expose a method on ``JarvisCoreApi`` with which an add-on marks one
   Actor node in the ACTORS view with an icon and removes the mark again. The recorder
   uses it to show which Actor is being recorded. It is not a decorator mechanism: the
   core stays in control of how the node is drawn.

   **Acceptance Criteria:**

   * AC-1: ``markActor(actorId, icon)`` SHALL be on the API surface and return a
     ``vscode.Disposable``; ``actorId`` is ``JarvisActor.id`` and ``icon`` a
     ``vscode.ThemeIcon``
   * AC-2: While a mark is set and the Actor is Idle (``REQ_COM_STATE``), the Actor's node
     SHALL show the icon in place of its normal icon, taking precedence over every indicator
     (``REQ_ENG_ACTORINDICATOR``). An activity state other than Idle takes precedence over the
     mark. Marks on the same Actor are kept as
     separate entries; the node SHALL show the most recently added mark that is still set.
     When no mark is set, the node SHALL show the indicator
     that applies (``REQ_ENG_ACTORINDICATOR`` AC-2), or its normal icon.
   * AC-3: Disposing the returned ``Disposable`` SHALL remove exactly that mark and leave the
     other marks on the same Actor in place. Disposing it a second time SHALL change nothing.
   * AC-4: A mark SHALL change nothing else on the node (label, context value, click
     command, menus, children)
   * AC-5: The member is additive: ``version`` stays ``2`` (``REQ_ENG_CONTRACT`` AC-3), and an
     add-on SHALL check that the member exists before calling it


.. req:: Actor Node Indicator API
   :id: REQ_ENG_ACTORINDICATOR
   :status: implemented
   :priority: required
   :links: US_ACTOR_MAIL; REQ_ACTOR_TREE; REQ_COM_STATE; REQ_ENG_ACTORMARK; REQ_ENG_ACTORLIST; REQ_ENG_CONTRACT; REQ_ACTOR_MAIL

   **Description:**
   The core SHALL expose a method on ``JarvisCoreApi`` with which an add-on shows a status
   indicator icon on one Actor node in the ACTORS view and removes it again. PIM uses it to
   show unread and flagged mail. An indicator is weaker than a recording mark
   (``REQ_ENG_ACTORMARK``) and than the activity state; the core stays in control of how the
   node is drawn and sets no indicator itself.

   **Acceptance Criteria:**

   * AC-1: ``indicateActor(actorId, icon)`` SHALL be on the API surface and return a
     ``vscode.Disposable``; ``actorId`` is ``JarvisActor.id`` and ``icon`` a ``vscode.ThemeIcon``.
   * AC-2: While an indicator is set, the Actor is Idle (``REQ_COM_STATE``) and no mark is set,
     the node SHALL show the indicator icon in place of its normal icon. An activity state other
     than Idle and any mark take precedence over the indicator. Indicators on the same Actor are
     kept as separate entries; the node SHALL show the most recently added indicator that is
     still set, and its normal icon when none is set.
   * AC-3: Disposing the returned ``Disposable`` SHALL remove exactly that indicator and leave
     the others on the same Actor in place. Disposing it a second time SHALL change nothing.
   * AC-4: An indicator SHALL change nothing else on the node (label, context value, click
     command, menus, children).
   * AC-5: The core SHALL set no indicator itself: with no add-on that calls ``indicateActor``,
     no Actor node shows one.
   * AC-6: The member is additive: ``version`` stays ``2`` (``REQ_ENG_CONTRACT`` AC-3), and an
     add-on SHALL check that the member exists before calling it.
