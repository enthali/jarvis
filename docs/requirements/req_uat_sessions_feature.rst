Sessions Feature UAT Requirements
==================================

.. req:: Sessions Tree View UAT Requirements
   :id: REQ_UAT_ACT_TREE
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_TOGGLE; REQ_ACT_TREE; REQ_ACT_SCHEMA; REQ_ACT_OPENCONTEXT

   **Description:**
   The Sessions tree view behaviour — toggle gating, folder configuration, alphabetical
   ordering, node clicks, and context-menu entries — SHALL be verifiable through manual
   test scenarios T-1 through T-4 and T-6.

   **Test Data Requirements:**

   * Two sample sessions in ``testdata/.jarvis/sessions/``:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` — ``name: copilot-cm``,
       ``summary: "Change Manager session"``.
     * ``testdata/.jarvis/sessions/copilot-cm/context.md`` — minimal markdown header.
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` — ``name: dev-feature-x``,
       ``summary: "Working on feature X"``.
     * ``testdata/.jarvis/sessions/dev-feature-x/context.md`` — minimal markdown header.

   **Acceptance Criteria:**

   * AC-1: With ``jarvis.sessions.enabled=true`` (default) the Sessions view SHALL
     be present in the Jarvis sidebar; disabling it without reload SHALL hide the
     view; re-enabling SHALL show it again (T-1).
   * AC-2: The Sessions tree SHALL display ``copilot-cm`` and ``dev-feature-x``
     from ``testdata/.jarvis/sessions/`` in alphabetical order, without any
     folder configuration (T-2).
   * AC-3: Clicking a session node SHALL open its ``context.md`` in the editor (T-3).
   * AC-4: Right-clicking a session node SHALL show all five context-menu entries:
     **Open Context**, **Open Agent Session**, **Reveal in Explorer**,
     **Reveal in OS**, and **Open in Terminal** (T-4).
   * AC-5: A ``session.yaml`` with missing ``name`` field SHALL produce a YAML schema
     validation error in the Problems panel (T-6).
   * AC-6: (actor-terminology-rename CR) The tree view's display name, the
     ``jarvis.newSession``/``jarvis.openAgentSession`` command titles, and the
     settings-group title/descriptions SHALL use "Actor" terminology, per
     ``REQ_ACT_TREE`` AC-7/AC-8/AC-9 (T-12).
   * AC-7: (actor-terminology-rename CR) The view ID (``jarvisSessions``),
     command IDs (``jarvis.newSession``, ``jarvis.openAgentSession``), setting
     key (``jarvis.sessions.enabled``), and storage path
     (``.jarvis/sessions/``) SHALL remain unchanged by the terminology rename
     (negative test, T-13).
   * AC-8: (actor-internal-identifiers-rename CR) The view ID SHALL be
     ``jarvisActors`` (not ``jarvisSessions``), the command ID
     ``jarvis.newSession`` SHALL be renamed to ``jarvis.newActor``, the
     command ID ``jarvis.openAgentSession`` SHALL remain unchanged, and its
     title SHALL be corrected from "Jarvis: Open Actor Chat" to
     "Jarvis: Open Agent Chat" (entity-neutral, same across Project/Event/Actor).
     The previous keybindings and tree-collapse state SHALL be reset to
     defaults as a one-time side effect of the ID changes (T-14, T-15, T-16).
   * AC-9: (actor-dualpath-scanner CR) The scanner SHALL read both old-convention
     (``.jarvis/sessions/*/session.yaml``) and new-convention
     (``.jarvis/actors/*/actor.yaml``) Actor folders, merge them into a single
     tree with no visible distinction, and display all actors alphabetically
     regardless of source convention (T-17, T-18, T-19). New actors created
     via ``Jarvis: New Actor`` or ``jarvis_createSession`` tool SHALL write to
     the new convention only (T-20, T-21). Project and Event scanners SHALL
     remain unaffected (regression check, T-24).


.. req:: Sessions New Entity UAT Requirements
   :id: REQ_UAT_ACT_NEWENTITY
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_NEWENTITY

   **Description:**
   The extension of ``jarvis.newEntity`` to include a **Session** option and the
   Phase-2 write-path change to use the new convention SHALL be verifiable through
   manual test scenarios T-5, T-5a, and T-20 (new-convention write verification).

   **Test Data Requirements:**

   * The ``testdata/.jarvis/sessions/`` folder must exist (created on demand by
     ``ensureSessionsDir()`` when running T-5/T-5a).
   * The ``testdata/.jarvis/actors/`` folder must exist (created on demand by
     ``ensureActorsDir()`` when running T-20).

   **Acceptance Criteria:**

   * AC-1: The ``jarvis.newEntity`` QuickPick SHALL display exactly three options:
     **Project**, **Event**, and **Session** (T-5).
   * AC-2 (actor-dualpath-scanner CR — amended): Selecting **Session** and completing
     the prompts SHALL create a folder ``<workspace>/.jarvis/actors/<name-slug>/``
     containing ``actor.yaml`` (previously ``session.yaml``, now updated to new
     convention) with the provided ``name`` and ``summary``, plus ``context.md`` (T-20).
   * AC-3: The newly created session node SHALL appear in the Sessions tree
     immediately after creation, without a manual reload (T-5, T-20).
   * AC-4: After creation, a new Copilot chat session SHALL open automatically
     with the identity prompt described in ``REQ_ACT_AGENTPROMPT`` (T-5, T-5a, T-11, T-20).
   * AC-5: The Sessions view title ``+`` button (``jarvis.newActor``) SHALL
     trigger the same creation flow as T-5 without going through the QuickPick
     (T-5a). The command SHALL be absent from the Command Palette.


.. req:: Sessions LM/MCP Tool UAT Requirements
   :id: REQ_UAT_ACT_TOOL
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_LISTTOOL

   **Description:**
   The ``jarvis_listSessionEntities`` LM+MCP tool registration and output SHALL be
   verifiable through manual test scenarios T-7 and T-8.

   **Test Data Requirements:**

   * Same two sample sessions as REQ_UAT_ACT_TREE.
   * ``jarvis.mcp.enabled=true`` for T-8 (MCP port listening).

   **Acceptance Criteria:**

   * AC-1: In an agent chat, invoking ``#listSessionEntities`` SHALL return
     both sample sessions with ``name``, ``summary``, and folder path (T-7).
   * AC-2: When ``jarvis.mcp.enabled=true``, the tool SHALL be accessible via the
     MCP endpoint and return the same data as the LM tool call (T-8).
   * AC-3: No error SHALL appear in the Jarvis output channel during tool calls (T-7,
     T-8).


.. req:: Sessions Feature Toggle UAT Requirements
   :id: REQ_UAT_ACT_TOGGLE
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_TOGGLE

   **Description:**
   The independence of the Sessions feature from Projects/Events and the gating of
   tool registration by ``jarvis.sessions.enabled`` SHALL be verifiable through manual
   test scenarios T-9 and T-10.

   **Test Data Requirements:**

   * ``jarvis.projects.enabled=false`` and ``jarvis.events.enabled=false`` for T-10.
   * ``jarvis.sessions.enabled=false`` for T-9.

   **Acceptance Criteria:**

   * AC-1: With ``jarvis.sessions.enabled=false`` and a reload, ``jarvis_listSessionEntities``
     SHALL NOT appear in the agent tool autocomplete (T-9).
   * AC-2: Re-enabling ``jarvis.sessions.enabled`` and reloading SHALL restore the tool
     in the autocomplete (T-9).
   * AC-3: With ``jarvis.projects.enabled=false`` and ``jarvis.events.enabled=false``,
     the Sessions view SHALL still be present and the tool SHALL return sessions
     without error (T-10).


.. req:: Agent-Session Identity Prompt UAT Requirements
   :id: REQ_UAT_ACT_AGENTPROMPT
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_AGENTPROMPT

   **Description:**
   The identity prompt sent by ``jarvis.openAgentSession`` when creating a new chat
   session SHALL be verifiable through manual test scenario T-11.

   **Test Data Requirements:**

   * A newly created session entity (e.g. ``test-session`` from T-5 or
     ``btn-session`` from T-5a) where no prior chat session exists.

   **Acceptance Criteria:**

   * AC-1: The first message in the auto-opened chat SHALL start with
     ``You are the session "<name>"`` (T-11).
   * AC-2: The message SHALL contain the absolute path of ``context.md`` as an
     inline code span (backtick-quoted) (T-11).
   * AC-3: The message SHALL instruct the agent to read and update ``context.md``
     as persistent memory (T-11).
   * AC-4: The same prompt structure SHALL apply to project and event entities
     (``You are the project/event "<name>"``), verified by opening a new agent
     session on a project node (T-11).


.. req:: Actor Dual-Path Storage Convention Scanner UAT Requirements
   :id: REQ_UAT_ACT_DUALPATH_SCANNER
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_DUALPATH_SCANNER; REQ_ACT_NEWENTITY; REQ_ACT_CREATETOOL

   **Description:**
   The Actor scanner's support for both old-convention (``.jarvis/sessions/*/session.yaml``)
   and new-convention (``.jarvis/actors/*/actor.yaml``) storage, its merging behavior,
   the new-convention write-path, edge-case handling, and Project/Event regression checks
   SHALL be verifiable through manual test scenarios T-17 through T-24.

   **Test Data Requirements:**

   * Old-convention actors: ``testdata/.jarvis/sessions/old-alpha/``,
     ``testdata/.jarvis/sessions/old-beta/`` (each with ``session.yaml`` and ``context.md``)
   * New-convention actors: ``testdata/.jarvis/actors/new-alpha/``,
     ``testdata/.jarvis/actors/new-beta/`` (each with ``actor.yaml`` and ``context.md``)
   * Same-name edge case: duplicate folder name under both conventions
     (``testdata/.jarvis/sessions/shared-name/`` and ``testdata/.jarvis/actors/shared-name/``)

   **Acceptance Criteria:**

   * AC-1: Scanner reads old-convention actors only (`.jarvis/sessions/*/session.yaml`)
     when new-convention folder does not exist, displaying them in alphabetical order
     without error (T-17, backward compatibility).
   * AC-2: Scanner reads new-convention actors only (``.jarvis/actors/*/actor.yaml``)
     when old-convention folder does not exist, displaying them in alphabetical order
     without error (T-18).
   * AC-3: Scanner merges both conventions when both are present, displaying all actors
     alphabetically with no visible distinction between old and new sources (T-19).
   * AC-4: New actors created via ``Jarvis: New Actor`` command SHALL be written to the
     new convention (``.jarvis/actors/``) only, not to old-convention (``.jarvis/sessions/``)
     (T-20).
   * AC-5: Actors created via ``jarvis_createSession`` tool SHALL be written to the new
     convention (``.jarvis/actors/``) only (T-21).
   * AC-6: When same-name actor exists under both conventions (edge case), both SHALL
     appear as two separate distinct nodes in the tree, not merged or deduplicated (T-22).
   * AC-7: Old-convention actors' ``context.md`` files SHALL remain fully writable and
     unaffected by the Phase-2 storage change — the files are not frozen or marked
     read-only (T-23).
   * AC-8: Project and Event scanners SHALL NOT be affected by the Actor dual-convention
     support — they continue to read only their own single convention folders (``.jarvis/projects/``,
     ``.jarvis/events/``) with no cross-convention logic (regression check, T-24).
