New Simple Actor Requirements
=============================

.. note::
  Requirements for the **new simple Actor** introduced by the
  one-kind-consolidation CR (Phase 1: parallel world). These requirements
  are independent of the legacy unified-Entity system in ``req_act.rst``
  (``REQ_ACT_*``) and the legacy Project/Event requirements in
  ``req_prj.rst`` / ``req_evt.rst`` (``REQ_PRJ_*`` / ``REQ_EVT_*``),
  which are deprecated in place and removed in Phase 2. The new Actor is
  defined by three unique capabilities (ADR-12): **persistent context**
  (``context.md``), **message addressability** (heartbeat/reminder through
  the existing queue), and **loose session binding** (swappable chat
  session). All new requirements use the ``ACTOR`` theme (not ``ACT``) to
  distinguish from the legacy ``REQ_ACT_*`` identifiers.

.. req:: Actor Storage Convention
   :id: REQ_ACTOR_SCHEMA
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_ACTORS

   **Description:**
   The new simple Actor SHALL be identified on disk by an ``actor.yaml``
   file inside a folder under ``jarvis.actors.folder`` (default
   ``.jarvis/actors/``). Unlike a legacy ``session.yaml`` or
   ``project.yaml``, this file is NOT bound to the legacy
   ``EntityKindConfig`` machinery: it is the leaf marker for the new
   ACTORS tree root (``REQ_ACTOR_TREE``) and nothing else.

   **Acceptance Criteria:**

   * AC-1: The ``actor.yaml`` schema SHALL require exactly one field:
     ``name`` (string, minLength 1).
   * AC-2: The schema SHALL allow two optional fields: ``summary`` (string)
     and ``agent`` (string). ``agent`` holds the VS Code chat-mode or agent
     persona name, if the user chooses to bind one; "No agent" is
     represented by the empty string ``""``, not by omitting the field.
   * AC-3: ``additionalProperties`` SHALL be set to ``false``. No
     legacy-kind fields (``dates``, ``kind``, etc.) SHALL be permitted.
   * AC-4: A JSON Schema file ``schemas/actor.schema.json`` (draft-07)
     SHALL describe the schema.
   * AC-5: ``package.json`` ``contributes.yamlValidation`` SHALL include an
     entry binding ``actor.yaml`` to ``./schemas/actor.schema.json``.
   * AC-6: When the Actor is created through ``jarvis.newActorSimple``,
     the new folder name SHALL be the verbatim input ``name`` value
     (no slug transformation, no lower-casing), matching the ``name``
     written to ``actor.yaml`` (``REQ_ACTOR_CREATE`` AC-3/AC-4).
     This creation convention does not invalidate manually placed
     ``actor.yaml`` files whose folder and YAML names differ.
   * AC-7: For a new-convention Actor, the internal scanner key and the ``id``
     field in its ``jarvis_listActors`` entry and successful
     ``jarvis_whoAmI`` response SHALL be the absolute path to that
     Actor's ``actor.yaml`` file, not its folder or ``context.md``.
     This path is derived from the file location; ``actor.yaml`` SHALL
     NOT contain an ``id`` field. New Actor entries in
     ``jarvis_listActors`` SHALL come from kindless direct-child Actor
     discovery, not from kind registration. Existing response fields
     remain, and legacy Actor tool responses are unchanged in Phase 1.
     Distinct direct child folders remain distinct even if their YAML ``name``
     values are identical. Such manually introduced name collisions are
     a defensive edge case, not a supported creation workflow; an
     ambiguous name still causes the existing ``jarvis_whoAmI`` error
     (``REQ_ACT_WHOAMI`` AC-11).

.. req:: Actor Message Addressability
  :id: REQ_ACTOR_ACTIVATION
  :status: approved
  :priority: mandatory
  :links: US_ACTOR_ACTORS; REQ_ACTOR_SCHEMA; REQ_AUT_HEARTBEAT_RESOLVER_REUSE; REQ_MSG_REMINDERS_DELIVER; REQ_MSG_QUEUE; REQ_MSG_AUTODELIVER_CONFIG

  **Description:**
  A new-convention Actor SHALL be a valid destination for messages from
  heartbeat jobs and reminders even when its chat session is not already
  open. Message delivery, not the sender, controls notification.

  **Acceptance Criteria:**

   * AC-1: A heartbeat job or reminder addressed to a discoverable Actor
     under ``jarvis.actors.folder`` SHALL resolve to that Actor and queue a
     message without requiring an already-open chat session.
   * AC-2: Neither heartbeat nor reminder SHALL directly open a chat session
     or change the Actor destination's auto-delivery preference. The existing
     message-delivery workflow SHALL notify automatically only when that
     preference is enabled; otherwise the queued message SHALL remain
     available for manual notification. When the user or the delivery
     workflow opens the Actor's session, its own ``context.md`` SHALL be
     available for resumption.
   * AC-3: Heartbeat and reminder destinations for new Actors SHALL
     resolve through kindless direct-child Actor discovery, without
     registering them in ``KindDrivenScanner`` or a kind configuration.
     The existing unified destination resolver (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE``
     AC-1..AC-3) SHALL include this Actor source, with no parallel
     enumeration. Delivery SHALL reuse the existing heartbeat scheduler,
     reminder store, and message delivery mechanisms; no second Actor-only
     scheduler or reminder store SHALL be introduced. Legacy Actor,
     Project, and Event destination paths remain functional in Phase 1.

.. req:: Actor Session Binding
   :id: REQ_ACTOR_BINDING
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_ACTORS; REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   A new-convention Actor's identity and memory SHALL remain independent
   of the lifetime of any one VS Code chat session.

   **Acceptance Criteria:**

   * AC-1: Closing or restarting a bound chat session SHALL NOT delete or
     change the Actor's ``actor.yaml`` or ``context.md``.
   * AC-2: A replacement session SHALL be able to bind to the same Actor
     without changing its on-disk identity or memory.
   * AC-3: Once bound, the replacement session SHALL resolve to that
     Actor through ``jarvis_whoAmI``; the former session SHALL NOT be
     treated as the Actor's permanent identity.

.. req:: ACTORS Tree View
   :id: REQ_ACTOR_TREE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_TREE; US_EXP_SIDEBAR; REQ_ACTOR_SCHEMA

   **Description:**
   A new TreeView SHALL display Actors in direct child folders of the
   ``jarvis.actors.folder`` setting as a dedicated top-level node labelled
   **ACTORS** in the Jarvis Explorer sidebar, independent of the legacy
   unified-entity tree (``REQ_ENT_UNIFIEDTREE`` / ``REQ_EXP_UNIFIEDTREE``).

   **Acceptance Criteria:**

   * AC-1: The view SHALL appear in the ``jarvis-explorer`` sidebar
     container as a top-level node labelled **ACTORS**, parallel to (not
     nested inside) the existing "Projects", "Events", and "Actors"
     (legacy) category nodes.
   * AC-2: The ACTORS node SHALL scan only direct child folders of
     ``jarvis.actors.folder`` containing an ``actor.yaml`` file. It
     SHALL NOT descend into child folders or show grouping nodes.
   * AC-3: Each leaf node SHALL have label equal to the ``actor.yaml``
     ``name`` field (fallback: folder name if ``name`` is absent),
     tooltip equal to ``summary`` (or empty), and ``contextValue`` of
     ``jarvisActor`` (distinct from the legacy ``jarvisSession`` value
     specified by ``REQ_ACT_TREE`` AC-3).
   * AC-4: Changing ``jarvis.actors.folder`` SHALL trigger an immediate
     rescan of the ACTORS tree (same reactive-cache pattern as
     ``REQ_EXP_REACTIVECACHE``).
   * AC-5: No kind categories, filter buttons, settings, or Jarvis
     archive feature SHALL be introduced for this tree. Moving a folder
     out of the root's direct children (including into a nested folder)
     or deleting it is ordinary filesystem management; it is then no
     longer discovered as an Actor by this tree.
   * AC-6: Clicking a leaf node SHALL open (or reuse) the Actor's bound
     chat session via the existing ``jarvis.openAgentSession`` command
     (``REQ_ACT_OPENCONTEXT`` / ``REQ_ACT_AGENT_OPEN``) — same primitive as
     tree-click in the legacy ACTORS tree. No new click primitive is
     introduced in Phase 1.
   * AC-7: The "Refresh" mechanism SHALL be the existing
     ``jarvis.rescan`` command and the periodic scanner job; both SHALL
     include the new ACTORS root in Phase 1 (``US_ACTOR_TREE`` AC-7).
   * AC-8: If ``jarvis.actors.folder`` cannot be resolved (e.g. no
     workspace root open), the ACTORS node SHALL be hidden (empty state),
     not shown with an error.
   * AC-9: No new setting is introduced; the tree reuses the existing
     ``jarvis.actors.folder`` setting (default ``.jarvis/actors/``)
     already defined by ``REQ_CFG_FOLDERPATHS``.

.. req:: Create Actor Command
   :id: REQ_ACTOR_CREATE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_CREATE; US_ENT_NEWENTITY; REQ_ACTOR_SCHEMA; REQ_ACTOR_TREE

   **Description:**
   A single ``+`` (``$(add)``) icon SHALL be added to the ACTORS tree's
   title bar. Clicking it SHALL open a "New Entry" QuickPick with a
   "Create Actor" choice; selecting it SHALL prompt for the new Actor's
   name. On acceptance, the command SHALL create the folder,
   ``actor.yaml``, and empty ``context.md``, and invoke the agent-binding
   QuickPick — writing the selected agent (or ``""``) to ``actor.yaml``
   before triggering a tree rescan.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the ACTORS view title bar SHALL trigger
     the command ``jarvis.newActorSimple`` (title "Jarvis: New Simple
     Actor"). The command SHALL NOT appear in the Command Palette — it is
     title-bar-only. It SHALL open a "New Entry" QuickPick with a "Create
     Actor" choice and no Project or Event choices. Selecting "Create
     Actor" SHALL proceed to AC-2.
   * AC-2: The command SHALL then show an InputBox prompting for the Actor name.
     Invalid names SHALL be rejected with inline ``validateInput``
     feedback using the **same** rules as ``REQ_ACT_CREATETOOL`` AC-6/AC-8
     (``/ \ : * ? " < > |``, null/control chars, dot-only, Windows
     reserved device names, ``.``/``..``).
   * AC-3: Before creating, the command SHALL check whether the direct
     child path ``<actorsFolder>/<name>/`` exists on disk, including a
     folder without ``actor.yaml``. If it does, the command SHALL show
     an error notification and abort without modifying the filesystem.
   * AC-4: On acceptance, the command SHALL create:

     a. The directory ``<actorsFolder>/<name>/``.
     b. ``actor.yaml`` with ``name: "<input>"`` (always),
        ``summary: ""`` (empty string, not omitted), and ``agent: ""``
        (set after AC-6).
     c. ``context.md`` with the template ``# <name>\n\n`` (same as
        ``REQ_ACT_CREATETOOL`` AC-2c).

   * AC-5: After file creation (before the rescan), the command SHALL
     invoke the shared agent-picker (``REQ_ACT_AGENT_PICKER`` /
     ``SPEC_ENT_AGENT_PICKER``) with "No agent" as the default option.
     The selected agent (or ``""`` if "No agent" or Escape) SHALL be written
     back to ``actor.yaml``.
   * AC-6: After the agent is written, an immediate ``scanner.rescan()``
     SHALL be triggered so the new Actor appears in the ACTORS tree
     without a manual refresh.
   * AC-7: If the user cancels the "New Entry" QuickPick or the InputBox,
     the command SHALL exit without side effects (no folder, no file
     written). Cancelling the
     agent-picker (Escape) SHALL **not** abort the creation — "No agent"
     is a valid outcome (``agent: ""``).
   * AC-8: The legacy "New Entity" QuickPick (``REQ_ENT_NEWENTITY`` /
     ``US_ENT_NEWENTITY``) SHALL remain functional in Phase 1 as a
     parallel path with its legacy options. Phase 2 SHALL remove the old
     tree entry point and retain the ACTORS tree's "New Entry" QuickPick
     for Actor creation; the old Project/Event/Session choices SHALL NOT
     appear in the ACTORS root.
   * AC-9: The command SHALL NOT write to ``.jarvis/sessions/`` under any
     circumstance — only to ``jarvis.actors.folder``. This separates the
     new convention from the legacy dual-path scanner
     (``REQ_ACT_DUALPATH_SCANNER``) for this CR.

.. req:: Actor Identity Recovery Tool
   :id: REQ_ACTOR_WHOAMI
   :status: approved
   :priority: required
   :links: US_ACTOR_WHOAMI; REQ_ACTOR_SCHEMA; REQ_ACT_WHOAMI

   **Description:**
   The new simple Actor SHALL be resolvable by identity via the existing
   ``jarvis_whoAmI`` LM/MCP tool (``REQ_ACT_WHOAMI``). This requirement
   specifies the additional cases that ``REQ_ACT_WHOAMI`` does not yet
   cover for the new convention.

   **Acceptance Criteria:**

   * AC-1: If the calling session is bound to an Actor stored under
     ``jarvis.actors.folder`` (new convention, ``actor.yaml``) and no
     cross-convention name collision exists (AC-4), the tool
     SHALL return ``{ "name": "<name>", "contextPath": "<absolute path to
     context.md>", "id": "<absolute path to actor.yaml>" }``. ``id`` is
     added for new-convention Actors; ``name`` and ``contextPath`` retain
     the shape specified by ``REQ_ACT_WHOAMI`` AC-2. Resolution of new
     Actors SHALL use kindless direct-child Actor discovery, not the
     legacy kind registry. Legacy resolution and responses remain
     unchanged in Phase 1.
   * AC-2: If the calling session is **not** bound to any discoverable
     Actor (neither new nor legacy convention), the tool SHALL return the
     AC-3 error from ``REQ_ACT_WHOAMI`` — the same error message, no
     separate new error type is introduced in Phase 1.
   * AC-3: The tool SHALL accept **no** input parameters — identity is
     derived from the calling session's identity via hook intake
     (``REQ_HOOK_INTAKE``) per ``REQ_ACT_WHOAMI`` AC-6/AC-9.
   * AC-4: **Name collision (Phase 1 known limitation):** if a name
     collision exists between an Actor under the legacy convention
     (``.jarvis/sessions/<name>/session.yaml``) and an Actor under the new
     convention (``.jarvis/actors/<name>/actor.yaml``), the tool SHALL
     return an **error** — not a guess. The error SHALL name both paths
     and recommend the user rename one of them. Phase 2 (when the legacy
     convention is removed) will make this case unreachable.
     ~~The tool SHALL return the new-convention Actor.~~ — rejected:
     returning a wrong identity is a more severe failure than no identity
     (``REQ_ACT_WHOAMI`` AC-7).
   * AC-5: This tool SHALL NOT be re-registered as a new tool ID in
     Phase 1 — the existing ``jarvis_whoAmI`` (``REQ_ACT_WHOAMI``,
     ``toolReferenceName: whoAmI``) is reused as-is. The new-convention
     resolution path (AC-1) is an **extension** of the existing tool's
     behaviour, not a separate tool.
   * AC-6: Phase 2 (legacy ``US_ACT_WHOAMI`` removal): when the legacy
     ``REQ_ACT_WHOAMI`` is superseded by this requirement, AC-1/AC-2/AC-3/
     AC-5 of this requirement become the authoritative spec for the
     ``jarvis_whoAmI`` tool; AC-4 (collision) is deleted as it becomes
     unreachable once the legacy convention is removed.
