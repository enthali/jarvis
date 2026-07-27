Actor Requirements
==================

.. req:: Sessions Feature Toggle
   :id: REQ_ACT_TOGGLE
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   The extension SHALL provide a setting to control the Sessions feature:

   * ``jarvis.sessions.enabled`` (boolean, default ``true``) — master toggle.
     When ``false``, no Sessions tree view, ``jarvis.newEntity`` Session option,
     ``jarvis_listSessionEntities`` tool, or scanner path for sessions
     SHALL be active.

   The Sessions feature SHALL discover session entities under the fixed path
   ``<workspaceRoot>/.jarvis/sessions/`` (no user configuration). The directory
   is created on demand when a new Session is created via ``jarvis.newEntity``.

   **Acceptance Criteria:**

   * AC-1: When ``jarvis.sessions.enabled`` is ``false``, the ``jarvisSessions``
     tree view SHALL be hidden (``when``-clause evaluates to false).
   * AC-2: When the ``.jarvis/sessions/`` folder contains no session entities,
     the Sessions tree SHALL show an empty state (no nodes).
   * AC-3a: Changing ``jarvis.sessions.enabled`` triggers immediate view
     show/hide via VS Code's ``when``-clause re-evaluation (no reload
     required).


.. req:: Session Entity Schema
   :id: REQ_ACT_SCHEMA
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   A ``session.yaml`` file SHALL serve as the leaf marker for a session entity.

   **Acceptance Criteria:**

   * AC-1: The schema SHALL require exactly one field: ``name`` (string).
   * AC-2: The schema SHALL allow optional fields: ``summary`` (string) and ``agent`` (string).
   * AC-3: No additional properties SHALL be permitted (``additionalProperties:
     false``).
   * AC-4: A JSON Schema file at ``schemas/session.schema.json`` (draft-07)
     SHALL describe the schema.
   * AC-5: ``package.json`` ``contributes.yamlValidation`` SHALL include an
     entry that binds ``session.yaml`` to ``./schemas/session.schema.json``,
     analogous to existing ``project.yaml`` and ``event.yaml`` entries.


.. req:: Sessions Tree View
   :id: REQ_ACT_TREE
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS; REQ_EXP_UNIFIEDTREE

   **Description:**
   A new TreeView ``jarvisSessions`` SHALL display all actor entities.

   **Acceptance Criteria:**

   * AC-1: The view SHALL appear in the ``jarvis-explorer`` sidebar container
     between the Projects view and the Events view.
   * AC-2: The view SHALL be gated on ``config.jarvis.sessions.enabled == true``
     (same ``when``-clause pattern as Projects and Events).
   * AC-3: Each leaf node SHALL have label equal to the session ``name`` field,
     tooltip equal to ``summary``, and ``contextValue`` of ``jarvisSession``.
   * AC-4: Session nodes SHALL be sorted alphabetically by name (case-insensitive).
   * AC-5: When the scanner refreshes, the Sessions tree SHALL refresh
     automatically.
   * AC-6: Session leaf nodes SHALL be expandable (``collapsibleState = Collapsed``)
     to show file children (see ``REQ_ENT_ENTITY_FILE_CHILDREN``). This does
     not change the leaf-node identity defined in AC-3.
   * AC-7: (actor-terminology-rename CR) The tree view's user-visible **display
     name** (``package.json`` ``views`` → ``name`` field) SHALL be ``"Actors"``
     (not "Sessions") — aligning the VS Code sidebar label with the Actor
     entity-kind terminology established at the concept level by
     ``US_ACT_ACTORS``. The internal view ID (``jarvisSessions``), setting key
     (``jarvis.sessions.enabled``), and storage paths remain unchanged (Phase
     2+ scope).
   * AC-8: (actor-terminology-rename CR; **corrected by actor-internal-
     identifiers-rename CR** — see AC-13) The command title for
     ``jarvis.newSession`` SHALL be ``"Jarvis: New Actor"`` (not "New
     Session"). ~~the command title for jarvis.openAgentSession SHALL be
     "Jarvis: Open Actor Chat"~~ — **this clause was a bug**: identified
     during the actor-internal-identifiers-rename CR that
     ``jarvis.openAgentSession`` is bound to Project and Event context menus
     as well (``packages/pim/package.json``), not just Actor — an
     Actor-specific title on a shared command mislabeled the Project/Event
     "Open" action. See AC-13 for the correction.
   * AC-9: (actor-terminology-rename CR) The settings-group title for the
     ``jarvis.sessions.*`` configuration block SHALL be ``"Actors"`` (not
     "Sessions"); individual setting descriptions SHALL use "Actor" instead of
     "Session" where referring to the entity kind.
   * AC-10: (actor-internal-identifiers-rename CR) The tree view's
     **internal** VS Code view ID SHALL be renamed from ``jarvisSessions`` to
     ``jarvisActors`` — in ``package.json`` (``views`` id, activation event
     ``onView:jarvisActors``, all ``when: "view == jarvisActors"`` menu
     clauses) and in the corresponding ``createTreeView('jarvisActors', ...)``
     call and ``EntityKindConfig.viewId`` in ``extension.ts``. This is
     distinct from AC-7's display **name** (already "Actors" since Phase 1) —
     AC-10 renames the machine identifier itself. The entity ``kind`` string
     passed to ``registerEntityKind``/``treeFactory.getProvider`` (currently
     ``'session'``) and the per-leaf-node ``contextValue`` (``jarvisSession``,
     singular) are explicitly **unchanged** in this CR — seen as a Phase 5
     concern alongside the LM/MCP tool names (``jarvis_listSessions`` etc.),
     since ``kind`` values are echoed in tool-facing JSON output
     (``jarvis_listJarvisSessions``), which is out of scope here.
     **(actor-tool-rename CR, Phase 5 update):** Phase 5 renamed the two
     LM/MCP tool names themselves (``jarvis_listSessions``→
     ``jarvis_listActors``, ``jarvis_createSession``→``jarvis_createActor``
     — see ``REQ_ACT_LISTTOOL``/``REQ_ACT_CREATETOOL``). The internal
     ``kind`` string (``'session'``) and ``contextValue``
     (``jarvisSession``) were explicitly OUT of that CR's scope and remain
     unchanged — there is no further planned phase to rename them; they are
     now a permanent internal identifier, not a deferred item.
   * AC-11: (actor-internal-identifiers-rename CR) The command ID
     ``jarvis.newSession`` SHALL be renamed to ``jarvis.newActor`` (title
     "Jarvis: New Actor" unchanged from AC-8) — this command is exclusively
     bound to the Actor tree (``view == jarvisActors`` per AC-10), so renaming
     its ID carries no cross-entity-kind risk, unlike
     ``jarvis.openAgentSession`` (see AC-13).
   * AC-12: (actor-internal-identifiers-rename CR — **corrected during
     design**, see below) The TypeScript class ``SessionTreeProvider``
     (``packages/core/src/apps/session/sessionTreeProvider.ts``) SHALL be
     **removed**, along with its sole consumer,
     ``src/tests/sessionTreeEquivalence.test.ts``. Impact analysis found this
     class is not used by the running extension at all — the actual live
     Actor tree provider comes from the generic ``engine.treeFactory.
     getProvider('session')`` (``EntityKindConfig``-driven factory, same
     mechanism as Project/Event). ``SessionTreeProvider`` was a deliberately
     preserved "legacy reference implementation" whose only purpose was to
     let ``sessionTreeEquivalence.test.ts`` prove the new generic factory
     behaves the same as the old hand-written provider — a one-time
     migration proof from a prior CR (the "S5 engine generalization"),
     already superseded for Project/Event by their own
     ``projectTreeExpectation.test.ts``/``eventTreeExpectation.test.ts``.
     Renaming a class with no production caller would have added a
     misleading impression of live code; removal (not rename) is correct
     (user-confirmed). ``src/tests/remove-open-recording-icon.test.ts``'s two
     assertions that read this file's contents directly are updated to check
     ``extension.ts``'s session ``EntityKindConfig`` registration instead —
     verified passing (214/214 vitest). **Follow-up gap flagged for Test
     Designer:** unlike Project/Event, there is no
     ``sessionTreeExpectation.test.ts`` for the session/actor kind — this CR
     does not add one (out of System Designer's role), but it is the natural
     next step to fully close the coverage this removed equivalence test
     used to (partially) provide.
   * AC-13: (actor-internal-identifiers-rename CR — bug fix, see AC-8)
     ``jarvis.openAgentSession`` is used to open the bound agent chat for
     **any** entity kind (Project, Event, Actor alike — see
     ``REQ_ENT_AGENTSESSION``), not just Actor. Its command ID SHALL remain
     ``jarvis.openAgentSession`` (no rename — this CR's internal-identifier
     scope is Actor-specific commands only) and its title SHALL be corrected
     from the erroneous "Jarvis: Open Actor Chat" (AC-8, now struck through)
     to the entity-neutral ``"Jarvis: Open Agent Chat"``, so Project/Event
     context menus no longer show an Actor-specific label for a shared
     action.
   * AC-14: (unified-entity-tree CR) The standalone ``jarvisActors`` view
     SHALL be retired: ``createTreeView('jarvisActors', ...)`` is replaced by
     the unified ``jarvisEntities`` registration (see ``REQ_EXP_UNIFIEDTREE``).
     The view ID ``jarvisActors`` (AC-10), the entity ``kind`` string
     ``'session'``, the ``contextValue`` ``jarvisSession``, and all leaf-node
     behavior (AC-3 through AC-6) are **unchanged** — only the top-level
     ``createTreeView()`` call and its ``package.json`` view/activation-event
     contribution move into the unified tree's registration. Actor entities
     always render under a category node (label "Actors") — Actors gains no
     special-casing beyond what ``REQ_EXP_UNIFIEDTREE`` already defines
     generically for every kind.


.. req:: Dual-Path Actor Storage Convention Scanner
   :id: REQ_ACT_DUALPATH_SCANNER
   :status: draft
   :priority: required
   :links: US_ACT_DUALPATH_STORAGE; REQ_ACT_TREE

   **Description:**
   The Actor entity scanner SHALL recognize and merge two on-disk naming
   conventions into a single logical Actor list: the existing
   ``<workspaceRoot>/.jarvis/sessions/<name>/session.yaml`` convention, and a
   new ``<workspaceRoot>/.jarvis/actors/<name>/actor.yaml`` convention. Both
   are scanned on every rescan; the union of entities found is presented as
   one Actor tree/list with no user-visible distinction based on which
   convention a given Actor uses.

   **Acceptance Criteria:**

   * AC-1: The scanner SHALL scan **both** ``<workspaceRoot>/.jarvis/
     sessions/`` (matching ``session.yaml``) and ``<workspaceRoot>/.jarvis/
     actors/`` (matching ``actor.yaml``) on every rescan, for as long as the
     Actor feature (``jarvis.sessions.enabled``) is on — regardless of
     whether either folder currently contains any entities.
   * AC-2: Entities found under either convention SHALL be merged into one
     combined, alphabetically-sorted-by-name Actor tree/list (``REQ_ACT_TREE``
     AC-4) — the merge SHALL NOT group or visually separate entities by
     which convention they came from.
   * AC-3: The two conventions SHALL never produce a colliding entity
     identity: since an entity's identity (used as the scanner's internal
     map key) is the absolute path of its convention file, and the two
     conventions live under different parent folders with different
     filenames, no path collision is possible even if a folder of the same
     ``<name>`` exists under both ``.jarvis/sessions/`` and
     ``.jarvis/actors/`` simultaneously — both SHALL appear as two distinct
     Actor entities (same display name, different underlying files) rather
     than being merged or one silently shadowing the other.
   * AC-4: **New** Actor creation (``jarvis.newActor`` command,
     ``jarvis_createActor`` tool (renamed from ``jarvis_createSession`` by
     the actor-tool-rename CR, Phase 5) — ``REQ_ACT_NEWENTITY``/
     ``REQ_ACT_CREATETOOL``) SHALL write **only** the new convention
     (``.jarvis/actors/<name>/actor.yaml``) going forward. Neither creation
     path SHALL ever write a new ``session.yaml``.
   * AC-5: Actors already stored under the old convention
     (``.jarvis/sessions/<name>/session.yaml``) SHALL continue to be fully
     readable and writable — reading/opening ``context.md``, the file
     children tree, the right-click context menu, and click-to-chat
     (``jarvis.openAgentSession``) SHALL all work identically regardless of
     which convention an Actor uses. No auto-migration, auto-rename, or
     any other mutation of old-convention folders SHALL ever be performed
     by this requirement.
   * AC-6: This is a **permanent** dual-convention support — not a
     transition window with an implied deadline. No sunset date, deprecation
     warning, or migration prompt SHALL be introduced for old-convention
     Actors by this requirement.
   * AC-7: If a subfolder of the same name exists as a non-leaf grouping
     ("category") folder under both ``.jarvis/sessions/`` and
     ``.jarvis/actors/`` (e.g. both have a subfolder named ``"archive"``),
     the merged tree SHALL show two separate category folder nodes with
     that same display name (one per source convention) rather than merging
     their contents into a single folder node — accepted as a rare,
     cosmetically-imperfect edge case rather than adding cross-convention
     folder-identity merging complexity for uncertain benefit.


.. req:: Opt-In Actor Migration Command
   :id: REQ_ACT_MIGRATIONCOMMAND
   :status: approved
   :priority: optional
   :links: US_ACT_MIGRATIONCOMMAND; REQ_ACT_DUALPATH_SCANNER

   **Description:**
   A single Command Palette-only command SHALL let a user migrate one
   old-convention Actor (``.jarvis/sessions/<name>/session.yaml``) to the
   new convention (``.jarvis/actors/<name>/actor.yaml``) on demand. This is
   the only migration mechanism this CR introduces — it does not add any
   tree/context-menu entry point, bulk operation, or automatic/scheduled
   migration.

   **Acceptance Criteria:**

   * AC-1: A command ``jarvis.migrateSessionToActor`` (title "Jarvis:
     Migrate Session to Actor") SHALL be registered, reachable only via the
     Command Palette — no tree node, context-menu entry, or title-bar icon
     SHALL trigger it.
   * AC-2: Invoking the command SHALL open a QuickPick listing every Actor
     entity whose convention file is ``session.yaml`` (old convention) —
     determined by checking each Actor leaf's underlying file path suffix,
     the same technique already used elsewhere to distinguish conventions
     (e.g. ``UnifiedEntityTreeProvider._kindOf()``). Actors already stored
     under ``actor.yaml`` (new convention) SHALL NOT appear in this list —
     there is nothing to migrate for them.
   * AC-3: If the list from AC-2 is empty, the command SHALL show an
     informative message (e.g. "No session-convention Actors to migrate")
     instead of opening an empty QuickPick.
   * AC-4: Upon selecting an Actor, the command SHALL:
     (a) move the Actor's folder from
     ``.jarvis/sessions/<name>/`` to ``.jarvis/actors/<name>/`` (preserving
     ``context.md`` and any other files inside unchanged),
     (b) rename the convention file from ``session.yaml`` to ``actor.yaml``
     within that folder (content unchanged — same ``name``/``summary``
     fields as before),
     (c) trigger a scanner rescan so the migrated Actor immediately appears
     under the new convention in the Actor tree.
   * AC-5: If the target path ``.jarvis/actors/<name>/`` already exists
     (name collision with an existing new-convention Actor of the same
     name), the command SHALL abort the migration for that Actor with an
     error notification and SHALL NOT delete, overwrite, or partially move
     any files — the old-convention folder remains fully intact and
     untouched.
   * AC-6: After a successful migration (AC-4 completes without error), the
     command SHALL unconditionally queue a message via the message-queue's
     internal ``appendMessage()`` function (the same underlying mechanism
     used by ``jarvis_sendMessage``, called directly rather than through the
     LM-tool wrapper — see ``SPEC_ACT_MIGRATIONCOMMAND`` for why this
     bypasses the LM tool's ``senderSession`` validation, precedented by
     the existing ``heartbeat``/``jarvis_createActor`` (was
     ``jarvis_createSession`` — renamed by the actor-tool-rename CR, Phase
     5)/``Reminder`` senders), addressed to the migrated Actor's name, with
     sender ``"Jarvis"``, informing it of its new folder and ``context.md``
     path. This send SHALL happen regardless of whether a chat session by
     that name is currently open — a harmless queued-but-unread message is
     the accepted outcome when it is not.
   * AC-7: This command SHALL NOT provide bulk/multi-select migration, SHALL
     NOT appear in any tree node's context menu, SHALL NOT run automatically
     or on any schedule, and SHALL NOT change how new Actors are created
     (``REQ_ACT_DUALPATH_SCANNER`` AC-4 is unaffected).


.. req:: newEntity Command — Session Support
   :id: REQ_ACT_NEWENTITY
   :status: draft
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   The existing ``jarvis.newEntity`` command SHALL offer "Session" as a third
   QuickPick option alongside "Project" and "Event".

   **(actor-dualpath-scanner CR amendment):** AC-2/AC-3 below are rewritten
   to target the new storage convention (``.jarvis/actors/``/``actor.yaml``)
   per ``REQ_ACT_DUALPATH_SCANNER`` AC-4 — new Actors are no longer written
   under the old ``.jarvis/sessions/``/``session.yaml`` convention. The
   command ID (``jarvis.newSession``/``jarvis.newActor`` — already renamed
   by the ``actor-internal-identifiers-rename`` CR) is unaffected.

   **Acceptance Criteria:**

   * AC-1: When the user selects "Session", a prompt SHALL ask for the session
     name.
   * AC-2: The extension SHALL create a new folder using the session name
     **verbatim** (no lowercase transformation, no slug, no character
     substitution) under the fixed path ``<workspaceRoot>/.jarvis/actors/``
     (was ``.jarvis/sessions/`` — changed by this CR), creating the parent
     directory on demand if absent. The folder name is storage only; Actor
     identity is the ``name:`` field inside ``actor.yaml``.
   * AC-3: Inside the new folder, the extension SHALL create ``actor.yaml``
     (was ``session.yaml`` — changed by this CR) with ``name`` and
     ``summary`` (empty) fields, and an empty ``context.md``.
   * AC-4: If no workspace is open, the command SHALL show a warning and abort.
   * AC-5: After creation the scanner SHALL be triggered to rescan so the new
     session appears in the tree immediately.
   * AC-6: A standalone ``jarvis.newActor`` command SHALL exist (icon ``$(add)``,
     hidden from the Command Palette). ``jarvis.newEntity`` Session branch SHALL
     delegate to ``jarvis.newActor`` — no duplicate creation logic.
   * AC-7: The Sessions view title SHALL show a ``+`` button bound to
     ``jarvis.newActor`` (``navigation@1`` group) and a **Rescan** button bound to
     ``jarvis.rescan`` (``navigation@3`` group).
   * AC-8: On successful creation the new Session SHALL be auto-opened as an agent
     chat session via ``jarvis.openAgentSession`` (no manual action required).
   * AC-9: Invalid session names (per the character set and dot-only and
     Windows reserved-name rules defined in ``SPEC_ACT_NEWENTITY`` step 5)
     SHALL be rejected via real-time inline validation in the name input box
     (``showInputBox`` ``validateInput`` callback).  The user SHALL receive
     immediate feedback and SHALL NOT be able to confirm an invalid name.  The
     name SHALL NOT be silently sanitized.


.. req:: jarvis_listActors LM+MCP Tool
   :id: REQ_ACT_LISTTOOL
   :status: approved
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   A Language Model and MCP tool ``jarvis_listActors`` SHALL return
   the array of Actor entities known to the scanner.

   **(actor-tool-rename CR, Phase 5 — hard cutover):** this tool was
   previously named ``jarvis_listSessions`` (itself renamed from
   ``jarvis_listSessionEntities``). The old name is REMOVED entirely — no
   deprecated stub is kept, unlike the earlier ``sendToSession``/
   ``readMessage`` soft-deprecation cycle (this tool sees only light,
   occasional use, so a hard cutover was judged appropriate). All
   ``toolReferenceName``/error-message/registration references below use
   the new name.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL return a JSON object ``{ "sessions": [...] }`` where
     each element has ``name``, ``summary`` (may be empty string),
     ``agent`` (may be empty string when no binding is set), and
     ``folder`` (absolute filesystem path to the session directory, forward
     slashes). The JSON response key ``"sessions"`` is UNCHANGED by this
     rename — only the tool's own name changes; the response shape is a
     storage-layer/wire-format detail out of scope for Phase 5 (same
     rationale as ``jarvis.sessions.enabled`` staying unchanged).
   * AC-2: The tool SHALL be registered only when ``jarvis.sessions.enabled``
     is ``true`` at activation time.  When the setting is ``false``, the tool
     SHALL be absent from both the LM tool catalog and the MCP tool catalog
     after extension reload.  Gating is static (activation-time only) per
     ADR ``tool-deregistration.md`` — no runtime add/remove.
   * AC-3: The tool SHALL be distinct from ``jarvis_listChatSessions`` (which
     lists VS Code chat tab titles, an unrelated concept — explicitly NOT
     renamed by this CR). Both MAY be active simultaneously.
   * AC-4: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``listActors`` (was ``listSessions``).


.. req:: Session Tree-Node Context Menu Parity
   :id: REQ_ACT_CONTEXTMENU
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   Session tree leaf nodes (``contextValue: jarvisSession``) SHALL expose the same
   context-menu actions as Project and Event leaf nodes.

   **Acceptance Criteria:**

   * AC-1: The context menu for a ``jarvisSession`` node SHALL contain the
     right-click **Open** / **Copy Path** / **Copy Full Path** entries per
     ``REQ_ENT_ENTITY_CONTEXTMENU`` (entity-tree-context-menu CR). The
     earlier **Open Context** entry (``jarvis.openContext``, inline group)
     is **retired** — ``jarvis.openContext`` no longer exists (see
     ``REQ_ACT_OPENCONTEXT``, ``REQ_ENT_OPENCONTEXT``); "Open" on a
     ``jarvisSession`` node now invokes ``jarvis.openAgentSession``
     (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-2), not a dedicated context.md command.
   * AC-2: The context menu SHALL contain **Open Agent Session**
     (``jarvis.openAgentSession``, inline group).
   * AC-3: The context menu SHALL contain **Reveal in Explorer**
     (``jarvis.revealInExplorer``, context-actions group).
   * AC-4: The context menu SHALL contain **Reveal in OS**
     (``jarvis.revealInOS``, context-actions group).
   * AC-5: The context menu SHALL contain **Open in Terminal**
     (``jarvis.openInTerminal``, context-actions group).
   * AC-6: All five command implementations are unchanged; only the
     ``when``-clauses in ``package.json`` are extended to include
     ``viewItem == jarvisSession``. (Historical — AC-1's command has since
     been retired per the note above; AC-2 through AC-5 remain accurate.)


.. req:: Agent-Session Identity Prompt
   :id: REQ_ACT_AGENTPROMPT
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS

   **Description:**
   When ``jarvis.openAgentSession`` creates a **new** chat session for any entity
   (project, event, or session), it SHALL send an identity prompt that establishes
   the agent's role, names the entity's persistent memory file, and instructs the
   agent to maintain it.

   **Acceptance Criteria:**

   * AC-1: The prompt SHALL begin with ``You are the <kind> "<name>".`` where
     ``<kind>`` is derived from ``entity.kind`` (``project | event | session``),
     defaulting to ``project`` for backwards compatibility.
   * AC-2: The prompt SHALL include the absolute path of the entity's
     ``context.md`` rendered as an inline code span (backtick-quoted), so the
     agent can locate the file unambiguously.
   * AC-3: The prompt SHALL instruct the agent to read ``context.md`` on session
     start to restore prior context and to update it with important decisions,
     plans, and findings as work proceeds.
   * AC-4: The identity-prompt behaviour SHALL apply uniformly to projects, events,
     and sessions — no per-kind divergence in wording structure.


.. req:: openContext on Session Nodes — Retired
   :id: REQ_ACT_OPENCONTEXT
   :status: implemented
   :priority: required
   :links: US_ACT_ACTORS; REQ_ENT_OPENCONTEXT

   **Retired (entity-tree-context-menu CR):** ``jarvis.openContext`` is fully
   retired (see ``REQ_ENT_OPENCONTEXT``) — the command no longer exists for
   any entity kind, including sessions/actors. ``context.md`` on a
   ``jarvisSession`` node is reachable via the entity's expandable file
   children (``jarvis.openEntityFile``, ``REQ_ENT_ENTITY_FILE_CHILDREN``)
   and the right-click "Open"/"Copy Path"/"Copy Full Path" menu
   (``REQ_ENT_ENTITY_CONTEXTMENU``).

   **Historical Description** (kept for traceability): the ``jarvis.openContext``
   command worked on session tree nodes, identically to project and event
   nodes.

   **Historical Acceptance Criteria:**

   * AC-1: (historical) When invoked on a ``jarvisSession`` node, the command
     opened the ``context.md`` file located in the same folder as
     ``session.yaml``.
   * AC-2: (historical) The file opened in the editor (``preview: false``),
     analogous to the behaviour for project and event nodes.
   * AC-3: (historical) The ``jarvis.openContext`` command handled a session
     tree node argument identically to a project node, dispatching on the
     ``folder`` property.


.. req:: jarvis_createActor LM+MCP Tool
   :id: REQ_ACT_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACT_CREATETOOL

   **Description:**
   A Language Model and MCP tool ``jarvis_createActor`` SHALL
   programmatically create an Actor entity under the fixed path
   ``<workspaceRoot>/.jarvis/actors/<name>/``.

   **(actor-dualpath-scanner CR amendment):** AC-2/AC-5 below are rewritten
   to target the new storage convention per ``REQ_ACT_DUALPATH_SCANNER``
   AC-4 — this tool now writes new Actors under
   ``.jarvis/actors/<name>/actor.yaml``.

   **(actor-tool-rename CR, Phase 5 — hard cutover):** the tool's own name
   is renamed from ``jarvis_createSession`` to ``jarvis_createActor``. The
   old name is REMOVED entirely — no deprecated stub is kept. All
   ``toolReferenceName``/error-message/sender-string references below use
   the new name.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered via ``registerDualTool()`` inside the
     ``if (sessions.enabled)`` activation block, and SHALL be absent when
     ``jarvis.sessions.enabled`` is ``false``.
   * AC-2: On a successful create, the tool SHALL:

     a. Create the directory ``<workspaceRoot>/.jarvis/actors/<name>/`` (was
        ``.jarvis/sessions/<name>/`` — changed by the actor-dualpath-scanner
        CR) where the folder name is the verbatim ``name`` parameter — no
        slug transformation.
     b. Write ``actor.yaml`` (was ``session.yaml`` — changed by the
        actor-dualpath-scanner CR) containing the ``name`` field (always)
        and the ``summary`` field (only when the supplied summary is
        non-blank).
     c. Write an empty ``context.md`` containing only ``# <name>\n\n``.

   * AC-3: After creation, the tool SHALL call ``scanner.rescan()`` so the
     Actor tree refreshes within 2 seconds without a manual action.
   * AC-4: When ``initialMessage`` is provided, the tool SHALL enqueue it via
     ``appendMessage()`` using the Actor's ``name`` as the destination and
     ``"jarvis_createActor"`` (was ``"jarvis_createSession"`` — changed by
     this CR) as the sender, after the folder is created and before the
     response is returned.  The message SHALL NOT be enqueued when the
     Actor already existed (idempotency guard).
   * AC-5: When a folder ``<workspaceRoot>/.jarvis/actors/<name>/`` (was
     ``.jarvis/sessions/<name>/`` — changed by the actor-dualpath-scanner
     CR) already exists, the tool SHALL return
     ``{ created: false, reason: "session \"<name>\" already exists; no action taken",
     path: ".jarvis/actors/<name>" }`` (path prefix likewise changed from
     ``.jarvis/sessions/``) without modifying any file or enqueuing any
     message. **Note:** the ``"session \"<name>\" already exists"`` wording
     in the response is UNCHANGED by this CR (a response-payload string, not
     the tool's own name) — out of scope for Phase 5, same rationale as
     AC-1's response shape note in ``REQ_ACT_LISTTOOL``. This idempotency
     check now only guards against a name collision in the *new* convention
     folder — it does NOT check whether an old-convention
     (``.jarvis/sessions/<name>/``) Actor of the same name already exists
     (see ``REQ_ACT_DUALPATH_SCANNER`` Decisions for the accepted
     same-name-across-conventions edge case).
   * AC-6: The tool SHALL validate ``name`` before attempting any filesystem
     operation.  An empty string or a string containing any of the characters
     ``/ \ : * ? " < > |`` or a null/control character SHALL result in a thrown
     error with message ``"invalid session name: <reason>"`` (message text
     UNCHANGED by this CR); this error SHALL surface as an LM tool error for
     the LM path and as an MCP error for the MCP path.
   * AC-7: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``createActor`` (was ``createSession``).
   * AC-8: The ``name`` MUST NOT be ``.`` or ``..``; on Windows it MUST NOT be
     a reserved device name (``CON``, ``PRN``, ``AUX``, ``NUL``,
     ``COM1``–``COM9``, ``LPT1``–``LPT9``, case-insensitive).
   * AC-9: If no workspace folder is open when the tool is invoked, the tool
     MUST raise an error whose message begins with
     ``"jarvis_createActor: no workspace open"`` (was
     ``"jarvis_createSession: no workspace open"`` — changed by this CR to
     match the new tool name).
     This prefix MUST be distinct from ``"invalid session name:"`` so that
     LLM callers can unambiguously distinguish precondition failures
     (no workspace) from input-validation failures (bad name).
   * AC-10: Auto-open — After successful creation (``created: true``) the tool
     MUST trigger opening of the new session's agent chat via the
     ``jarvis.openAgentSession`` command, passing a ``LeafNode`` constructed as
     ``{ kind: 'leaf', id: path.join(targetPath, 'actor.yaml') }`` (was
     ``session.yaml`` — changed by the actor-dualpath-scanner CR).
     The auto-delivery heartbeat loop (existing 5 s poll) is responsible for
     subsequently delivering any queued ``initialMessage`` into that chat.
     On idempotent skip (``created: false``), the tool MUST also trigger the
     same auto-open command so that the caller always receives an opened-session
     end-state regardless of which path was taken.
     Errors from the ``openAgentSession`` call MUST be logged at ``warn`` level
     and MUST NOT cause the tool to return an error (best-effort).


.. req:: Session Tree Inverted Click Semantics
   :id: REQ_ACT_TREECLICK
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_OPENCONTEXT; REQ_ENT_ENTITY_CONTEXTMENU

   **Description:**
   The `jarvisSession` tree leaf node's primary action (single click) SHALL
   open the agent-chat editor. Opening `context.md` is reachable via the
   entity's expandable file children and the right-click context menu (see
   AC-2) — no dedicated command is introduced for Actor nodes.

   **Acceptance Criteria:**

   * AC-1: The `command` property of every `jarvisSession` `TreeItem` SHALL
     be bound to `jarvis.openAgentSession` (replacing the previous binding to
     `jarvis.openContext`).
   * AC-2: **Historical, superseded (entity-tree-context-menu CR):** an
     earlier revision of this AC stated `jarvis.openContext` "remains the
     inline `context.md` icon for `jarvisSession` nodes." `jarvis.openContext`
     is now fully retired (`REQ_ACT_OPENCONTEXT`, `REQ_ENT_OPENCONTEXT`) —
     `context.md` is reached via file children (`jarvis.openEntityFile`) and
     the right-click Open/Copy Path/Copy Full Path menu
     (`REQ_ENT_ENTITY_CONTEXTMENU`) instead. No separate Actor-specific
     command exists or is introduced.
   * AC-3: Double-click on a session node SHALL exhibit the same behaviour as
     single click. This is satisfied by VS Code's default TreeView mapping and
     requires no explicit implementation; it SHALL be verified in UAT only.
   * AC-4: **Historical, superseded (entity-tree-context-menu CR):** an
     earlier revision of this AC asserted all existing `view/item/context`
     menu entries for `viewItem == jarvisSession` "SHALL remain unchanged,"
     listing `jarvis.openContext` among them. `jarvis.openContext`'s entry is
     retired along with the command; the current menu entries are specified
     by `REQ_ACT_CONTEXTMENU` and `REQ_ENT_ENTITY_CONTEXTMENU`.
   * AC-5: **Historical, superseded (entity-tree-context-menu CR):**
     `jarvis.openContext`'s missing-file discovery behaviour (described here
     for Actor nodes, citing `entity-open-context-cleanup`'s
     `REQ_ENT_OPENCONTEXT` AC-2/AC-6) is moot — the command itself no longer
     exists. Kept for historical traceability only.
   * AC-6: Making the session node expandable (``collapsibleState = Collapsed``,
     per ``REQ_ENT_ENTITY_FILE_CHILDREN``) does not interfere with this
     binding — clicking the label still invokes ``jarvis.openAgentSession``;
     clicking the expand arrow only expands/collapses.

   **Retired (entity-open-context-cleanup CR):** the command
   `jarvis.openSessionContext` — introduced by an earlier revision of this
   REQ as a dedicated Actor inline-icon command with auto-create semantics —
   was never activated (its `package.json` menu binding shipped with
   `"when": "false"` and no code path ever invoked it programmatically). It
   is removed from the codebase entirely (not merged/kept as an alias) — see
   `entity-open-context-cleanup.md` for the Artefakt-Removal-Check.

.. req:: Session Agent Field
   :id: REQ_ACT_AGENT_FIELD
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY

   **Description:**
   The session entity schema, YAML scanner, and tool output SHALL support an
   optional ``agent`` field that records the VS Code chat-mode name bound to a
   session.

   **Acceptance Criteria:**

   * AC-1: ``schemas/session.schema.json`` SHALL declare an optional
     ``agent`` property (type ``string``) so YAML editors provide
     completion and inline documentation.
   * AC-2: ``src/yamlScanner.ts`` ``EntityEntry`` interface SHALL gain an
     optional ``agent?: string`` field.  The scanner SHALL read the ``agent``
     field from ``session.yaml`` and store it in the entity when the value is
     a non-empty string.  A missing or non-string value SHALL result in
     ``undefined`` (no error).
   * AC-3: The ``jarvis_listSessionEntities`` tool output SHALL include
     ``agent`` (as ``""`` when absent) alongside the existing ``name``,
     ``summary``, and ``folder`` fields, so that LLM callers can inspect
     existing bindings.


.. req:: Agent Picker at Session Creation
   :id: REQ_ACT_AGENT_PICKER
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_NEWENTITY

   **Description:**
   The ``jarvis.newSession`` command SHALL present an optional agent picker after
   the summary prompt.

   **Acceptance Criteria:**

   * AC-1: After prompting for ``name`` and ``summary``, the command SHALL
     display a QuickPick populated with: a "No agent" entry (yields
     ``agent: ""`` in ``session.yaml``) and one entry per user-invocable
     agent discovered under ``.github/agents/`` (see ``REQ_ACT_AGENT_DISCOVERY``).
   * AC-2: If the user dismisses the picker (Escape / window close), the
     command SHALL abort; no folder, ``session.yaml``, or ``context.md`` SHALL
     be created.
   * AC-3: If the user selects "No agent", ``agent: ""`` SHALL be
     written to ``session.yaml``.  A chat editor SHALL be opened via
     ``openNewChatEditor()`` without mode-prime (VS Code default mode).
   * AC-4: If the user selects a named agent, that agent's identity (per
     ``REQ_ACT_AGENT_DISCOVERY`` AC-7) SHALL be written to ``session.yaml``
     as ``agent: "<identity>"``.  The identity is used verbatim; it may
     contain spaces (e.g., ``"Change Manager"``).  The chat editor SHALL be
     opened via mode-prime + ``openNewChatEditor()``.
   * AC-5: The picker SHALL show agent names alphabetically, with "No agent"
     always first.


.. req:: Agent Discovery Mechanism
   :id: REQ_ACT_AGENT_DISCOVERY
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_PICKER; REQ_ACT_AGENT_CREATETOOL

   **Description:**
   The set of available agents SHALL be determined at runtime by scanning
   ``.github/agents/`` in the current workspace for agent definition files.

   **Acceptance Criteria:**

   * AC-1: The discovery function SHALL scan all ``*.agent.md`` files in
     ``<workspaceRoot>/.github/agents/``.
   * AC-2: A file is INCLUDED in the valid set UNLESS its YAML frontmatter
     explicitly contains ``user-invocable: false``.
     Files without a ``user-invocable`` key, files without frontmatter at all,
     and files with ``user-invocable: true`` SHALL all be INCLUDED.
     Only an explicit ``user-invocable: false`` SHALL exclude the file.
   * AC-3: When no frontmatter ``name`` key is set (or the value is blank),
     the agent identifier SHALL be the file basename without the ``.agent.md``
     suffix (e.g., ``syspilot.cm.agent.md`` → ``syspilot.cm``).  See AC-7 for
     the complete identity rule.
   * AC-4: If the ``.github/agents/`` directory does not exist or is unreadable,
     the function SHALL return an empty list without error.
   * AC-5: The returned list SHALL be sorted alphabetically by agent identifier.
   * AC-6: Discovery is performed on-demand (at picker-open time and at
     validation time); no persistent cache is maintained.
   * AC-7: The agent identifier SHALL be determined as follows: if the agent
     file's YAML frontmatter contains a ``name`` key whose value is a non-empty
     string, the identifier is that value trimmed of leading and trailing
     whitespace; otherwise, the identifier is the filename basename without the
     ``.agent.md`` suffix.  This identifier is used for picker labels,
     ``session.yaml agent:`` field values, and the ``mode:`` parameter of
     ``workbench.action.chat.open``.


.. req:: jarvis_createActor Agent Parameter
   :id: REQ_ACT_AGENT_CREATETOOL
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_CREATETOOL

   **Description:**
   The ``jarvis_createActor`` tool (renamed from ``jarvis_createSession`` by
   the actor-tool-rename CR, Phase 5) SHALL accept an optional ``agent``
   parameter and write it to ``actor.yaml`` when provided and valid.

   **Acceptance Criteria:**

   * AC-1: The tool input schema SHALL include an optional ``agent`` parameter
     (type ``string``).
   * AC-2: When ``agent`` is blank or absent, the tool SHALL behave exactly as
     before (no ``agent`` field in ``actor.yaml``); no validation runs.
   * AC-3: When ``agent`` is non-blank, the tool SHALL validate it against the
     set of available agent identities (per ``REQ_ACT_AGENT_DISCOVERY`` AC-7)
     **before** any filesystem operation.  The supplied value must exactly match
     an identity string from the discovery result (frontmatter name or filename
     stem, as applicable).  If the value is unknown, the tool SHALL throw an
     error (see ``REQ_ACT_AGENT_VALIDATION``); the Actor folder SHALL NOT be
     created.
   * AC-4: When ``agent`` is non-blank and valid, the tool SHALL write
     ``agent: "<name>"`` to ``actor.yaml`` after ``summary`` (if present).
   * AC-5: Both the LM and MCP handler paths SHALL enforce AC-3 identically.
   * AC-6: The ``package.json`` ``contributes.languageModelTools`` input schema
     for ``jarvis_createActor`` SHALL be updated to include the ``agent``
     field with a clear description.


.. req:: Agent Validation Error Contract
   :id: REQ_ACT_AGENT_VALIDATION
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_CREATETOOL

   **Description:**
   The error thrown by ``jarvis_createActor`` (renamed from
   ``jarvis_createSession`` by the actor-tool-rename CR, Phase 5) when an
   unknown agent name is supplied SHALL be self-contained enough for the
   calling agent to correct the invocation immediately.  The contract
   mirrors ``REQ_MSG_DEST_ERROR``.

   **Acceptance Criteria:**

   * AC-1: The error message SHALL state that the supplied agent is not
     available, quoting the supplied name verbatim.
   * AC-2: The error message SHALL list all currently available agent names
     in alphabetically sorted order.
   * AC-3: If the available set is empty (no user-invocable agents discovered),
     the error SHALL indicate this explicitly rather than showing an empty list.
   * AC-4: The error message template SHALL be::

        Agent "${agent}" is not available.
        Available agents: ${names}

     where ``${agent}`` is the supplied (invalid) value and ``${names}`` is the
     alphabetically sorted list of available agent names joined with ``", "``; if
     the set is empty ``${names}`` is the literal ``"(none)"``.
   * AC-5: The error SHALL be raised as a JavaScript ``Error`` object so that
     both the VS Code LM tool invocation path and the MCP handler surface the
     message text to the caller unchanged.


.. req:: Open Session with Bound Agent
   :id: REQ_ACT_AGENT_OPEN
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ENT_AGENTSESSION

   **Description:**
   When ``jarvis.openAgentSession`` creates a new chat session for a session
   entity that has an ``agent`` binding, the chat editor SHALL open in that
   agent mode.

   **Acceptance Criteria:**

   * AC-1: On the new-session path (no existing UUID found), when
     ``entity.agent`` is set and non-empty, the ``workbench.action.chat.open``
     command SHALL be invoked with ``{ query: <initPrompt>, mode: entity.agent }``
     instead of ``{ query: <initPrompt> }``.
   * AC-2: When ``entity.agent`` is absent or empty, the existing behavior SHALL
     be preserved (no ``mode`` parameter).
   * AC-3: On the existing-session path (UUID found), the command opens the
     existing pinned tab unchanged; the ``agent`` binding is NOT re-applied
     (the chat mode was already set when the session was first created).
   * AC-4: If the ``mode`` value is unrecognised by VS Code (e.g. the agent was
     removed after binding), VS Code falls back to its default chat mode; no
     error is surfaced to the user by Jarvis.


.. req:: Session Agent Backward Compatibility
   :id: REQ_ACT_AGENT_COMPAT
   :status: implemented
   :priority: required
   :links: US_ENT_ENTITYPARITY; REQ_ACT_AGENT_FIELD; REQ_ACT_AGENT_OPEN

   **Description:**
   All existing ``session.yaml`` files that do not contain an ``agent`` field
   SHALL continue to work without any change in behaviour.

   **Acceptance Criteria:**

   * AC-1: When the scanner reads a ``session.yaml`` without an ``agent``
     field, ``EntityEntry.agent`` SHALL be ``undefined`` — no error, no default
     value inserted.
   * AC-2: When ``jarvis.openAgentSession`` is invoked for an entity with
     ``agent === undefined``, the command SHALL follow the existing path
     unchanged (no ``mode`` passed to ``workbench.action.chat.open``).
   * AC-3: The ``jarvis_listSessionEntities`` tool SHALL return ``agent: ""``
     for entities without an ``agent`` field (empty-string sentinel for
     forward compatibility) — callers MUST treat ``""`` as "no binding".
   * AC-4: No migration step is required; the ``additionalProperties: false``
     constraint in the schema is relaxed by adding ``agent`` as an explicitly
     permitted property — existing files without the field remain valid.

   .. note::

      **Backward-compat note (v0.6.0 filename-stem values):** Existing
      ``session.yaml`` files written by v0.6.0 that store a filename-stem
      value in the ``agent`` field (e.g. ``agent: syspilot.cm``) continue to
      resolve correctly when the corresponding agent file has no ``name:``
      frontmatter key, because per ``SPEC_ACT_AGENT_DISCOVERY`` the effective
      identity is ``name?.trim() || filename-stem``.  See
      ``SPEC_ACT_AGENT_DISCOVERY`` for the identity-drift edge case (out of
      scope for this CR).


.. req:: jarvis_whoAmI LM+MCP Tool
   :id: REQ_ACT_WHOAMI
   :status: draft
   :priority: required
   :links: US_ACT_WHOAMI; REQ_ACT_LISTTOOL; REQ_HOOK_INTAKE

   **Description:**
   A Language Model and MCP tool ``jarvis_whoAmI`` SHALL resolve the calling
   chat session to its registered Actor and return the Actor's name and
   ``context.md`` path.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept no input parameters. The calling session's
     identity SHALL be resolved automatically by the extension.
   * AC-2: When the calling session is a registered Actor entity (kind
     ``session``), the tool SHALL return a JSON object
     ``{ "name": "<actorName>", "contextPath": "<absolutePath>" }`` where
     ``contextPath`` is the absolute filesystem path to the Actor's
     ``context.md``.
   * AC-3: When the calling session is not a registered Actor, the tool SHALL
     return an error message instructing the session to ask the user to
     resolve its identity (e.g. "You are not a registered actor.
     Please ask the user which actor you are.").
   * AC-4: The tool SHALL be registered only when ``jarvis.sessions.enabled``
     is ``true`` at activation time (same gating as ``REQ_ACT_LISTTOOL``).
   * AC-5: The tool SHALL appear in the VS Code Chat tool picker with
     ``toolReferenceName`` ``whoAmI``.
   * AC-6: (**whoami-session-id-resolution CR, GH #51**) Identity SHALL be
     derived from the **identity of the calling chat session** and from
     nothing else. Editor focus — including
     ``vscode.window.tabGroups.activeTabGroup.activeTab`` — SHALL NOT be used
     as an identity source, neither as the primary mechanism nor as a
     fallback. Consequently the result SHALL be invariant under any change of
     editor focus, open files, or active tab group between or during calls,
     and repeated calls from one unchanged session SHALL return the same
     Actor.
   * AC-7: (**whoami-session-id-resolution CR, GH #51**) The tool SHALL NOT
     return an identity it cannot attribute to the calling session. When the
     calling session cannot be determined, or cannot be determined
     unambiguously, the tool SHALL return the AC-3 error rather than a
     best-guess Actor. A wrong identity is a more severe failure than no
     identity: the actor would load another actor's memory and act under a
     false role, and neither the actor nor the user is given any signal that
     this happened.
   * AC-8: (**whoami-session-id-resolution CR, GH #51**) The AC-3 error SHALL
     be returned only when the calling session genuinely has no bound Actor,
     or per AC-7 when the calling session is undeterminable. It SHALL NOT be
     reachable as a side effect of the user's editor focus.
   * AC-9: (**whoami-session-id-resolution CR, GH #51**) The mechanism that
     supplies the calling session's identity is the hook intake path
     (``REQ_HOOK_INTAKE``). This is a deliberate, documented dependency: when
     hook intake is unavailable, ``jarvis_whoAmI`` degrades to the AC-3 error
     per AC-7 and SHALL NOT fall back to any focus-based heuristic.
