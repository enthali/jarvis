Jarvis Entity User Stories
==========================

Generic, user-facing behavior that applies across at least two of the three
Jarvis Entity kinds (Project / Event / Actor). Kind-agnostic engine plumbing
(no user-facing "why") lives in the ``ENG`` theme instead — see
``docs/namingconventions.rst``.

.. story:: Jarvis Entity Kinds
   :id: US_ENT_ENTITY
   :status: draft
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_ENT_OPENYAML; US_ENT_NEWENTITY; US_ENT_SCANREFRESH; US_ENT_CONTENTDETECT; US_ENT_NAMESORT; US_ENT_AGENTSESSION; US_ENT_CONTEXTACTIONS; US_ENT_OPENCONTEXT; US_ENT_AGENTSESSION_PROMPT; US_ENT_ENTITYPARITY; US_ENT_ENTITY_FILES_TREE

   **As a** Jarvis user,
   **I want** distinct entity kinds that each focus on their real-world
   function — Project (work body), Event (time-bound), Actor (standing
   function) — so that each kind's behavior matches its real-world role,
   while sharing one consistent interaction model (agent binding, tree-click
   to chat, uniform file access) across all three.

   **Acceptance Criteria:**

   * AC-1: All three kinds (Project, Event, Actor) share the same generic
     interaction model: agent binding, tree-click-to-chat, uniform inline
     icons, and expandable file children.
   * AC-2: Kind-specific behavior (Project filtering, Event date-sort, Actor
     mailbox semantics) is specified separately under ``PRJ``/``EVT``/``ACT``
     and does not duplicate the generic behavior specified here.
   * AC-3: This US is the parent for all cross-kind (``ENT``-themed) generic
     User Stories in this file; each child US links back to this one.


.. story:: Open YAML from Tree Item
   :id: US_ENT_OPENYAML
   :status: implemented
   :priority: optional
   :links: US_ENT_ENTITY

   **As a** Jarvis User,
   **I want** to open the YAML file of a project or event directly from the tree view,
   **so that** I can quickly view or edit the raw data in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Each project leaf item shows an inline action button (go-to-file icon) on hover
   * AC-2: Each event leaf item shows an inline action button (go-to-file icon) on hover
   * AC-3: Clicking the button opens the associated YAML file in the VS Code editor
   * AC-4: Clicking on the tree item label itself does nothing (``TreeItem.command`` stays
     empty, reserved for a future detail view)
   * AC-5: Folder nodes do not have this button


.. story:: Create New Project or Event
   :id: US_ENT_NEWENTITY
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR; US_ENT_AGENTSESSION; US_CFG_PROJECTPATH

   **As a** Jarvis User,
   **I want** to create a new project or event directly from a ``+`` button in the
   explorer title bar,
   **so that** I can quickly scaffold a new entity folder, see it immediately in the
   sidebar, and start working in its agent session.

   **Acceptance Criteria:**

   * AC-1: A ``+`` icon (``$(add)``) in the Projects title bar triggers
     ``Jarvis: New Project`` — prompts for a project name, creates
     ``<raw-name>/project.yaml`` in ``jarvis.projectsFolder`` (verbatim folder
     name, no slug transformation), triggers a scanner refresh, and opens the
     agent session
   * AC-2: A ``+`` icon (``$(add)``) in the Events title bar triggers
     ``Jarvis: New Event`` — prompts for an event name and a start date
     (``YYYY-MM-DD``), creates ``<yyyy-MM-dd>_<raw-name>/event.yaml`` in
     ``jarvis.eventsFolder`` (underscore separator, raw name verbatim), triggers
     a scanner refresh, and opens the agent session
   * AC-3: The convention YAML file is pre-populated with a minimal template
     (``name`` field, plus ``dates`` for events with start = end = input date)
   * AC-4: If the user cancels any input prompt, the command aborts without side effects
   * AC-5: The scanner refresh is immediate — the new entity appears in the sidebar
     without waiting for the next scan interval
   * AC-6: The commands SHALL NOT appear in the Command Palette (they are only
     reachable via the title bar icons)
   * AC-7: Invalid entity names (filesystem-illegal characters, dot-only names,
     Windows reserved device names) SHALL be rejected via ``validateInput``
     inline feedback — same rules as actor creation.


.. story:: Manual Rescan Button
   :id: US_ENT_SCANREFRESH
   :status: implemented
   :priority: mandatory
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** a refresh button in the title bar of the Projects and Events tree views,
   **so that** I can trigger an immediate rescan without waiting for the next scan cycle.

   **Acceptance Criteria:**

   * AC-1: A refresh icon (``$(refresh)``) is visible in the Projects title bar
   * AC-2: A refresh icon (``$(refresh)``) is visible in the Events title bar
   * AC-3: Clicking the button triggers an immediate rescan and the tree updates


.. story:: YAML Content Change Detection
   :id: US_ENT_CONTENTDETECT
   :status: implemented
   :priority: mandatory
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** changes to YAML file content (e.g. renaming a project) to be reflected
   in the sidebar after the next scan,
   **so that** the displayed data stays accurate and I don't see stale names or dates.

   **Acceptance Criteria:**

   * AC-1: After editing a YAML field (e.g. ``name:``) and the next scan runs,
     the sidebar reflects the new value
   * AC-2: Changes to ``dates.end`` in event YAML are detected and the future-event
     filter behaves correctly with the new value


.. story:: Sort Tree by Entity Name
   :id: US_ENT_NAMESORT
   :status: implemented
   :priority: optional
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** the tree items sorted alphabetically by their YAML entity name
   rather than by folder name,
   **so that** I can find projects and events more easily in the sidebar.

   **Acceptance Criteria:**

   * AC-1: Leaf nodes are sorted by their YAML ``name`` field (case-insensitive)
   * AC-2: Folder (grouping) nodes are sorted by folder name (case-insensitive)
   * AC-3: Folders and leaves are interleaved — all children at a given level are
     sorted together in a single alphabetical list


.. story:: Open Agent Session from Explorer
   :id: US_ENT_AGENTSESSION
   :status: approved
   :priority: optional
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR; US_MSG_OPENSESSION; US_ENT_OPENYAML

   **As a** Jarvis User,
   **I want** to open the dedicated agent chat session for a project or event
   directly from its tree node in the Jarvis Explorer,
   **so that** I can jump straight into the agent conversation for that item
   without searching through chat sessions manually.

   **Acceptance Criteria:**

   * AC-1: Every project and event leaf node shows an inline action button
     (comment-discussion icon) to open the agent session for that item
   * AC-2: Clicking the button looks up a chat session whose title matches the
     project/event ``name`` and opens it in the editor
   * AC-3: If no matching session exists, a new editor chat is opened and an
     initialization prompt is sent that tells the agent which project/event it
     is working on and asks the user to rename the session
   * AC-4: Folder nodes do not show the button


.. story:: Context Actions on Project and Event Nodes
   :id: US_ENT_CONTEXTACTIONS
   :status: approved
   :priority: optional
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** context menu actions on project and event tree nodes,
   **so that** I can quickly navigate to the entity folder in the editor,
   OS file manager, or an integrated terminal.

   **Acceptance Criteria:**

   * AC-1: Right-clicking a project or event node shows "Reveal in Explorer",
     "Reveal in File Explorer", and "Open in Terminal" actions
   * AC-2: Each action delegates to the corresponding built-in VS Code command
   * AC-3: No custom file-system logic is needed — all three actions use VS Code
     built-in commands


.. story:: Open Context File from Tree Node
   :id: US_ENT_OPENCONTEXT
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR; US_ENT_OPENYAML; US_ENT_AGENTSESSION

   **As a** Jarvis User,
   **I want** to open the ``context.md`` file for a project or event directly
   from its tree node in the Jarvis Explorer,
   **so that** I can quickly view or edit the context documentation for that
   item without manually navigating the file system.

   **Acceptance Criteria:**

   * AC-1: Every project and event leaf node shows an inline action button
     (notebook icon) to open the ``context.md`` file for that item
   * AC-2: Clicking the button opens the ``context.md`` file from the entity's
     folder in the VS Code editor
   * AC-3: If no ``context.md`` exists directly in the folder, the button
     searches one level deep in subfolders (hidden folders excluded)
   * AC-4: If exactly one ``context.md`` is found in subfolders, it is opened
     directly without prompting
   * AC-5: If multiple ``context.md`` files are found, a QuickPick picker
     lets the user choose which one to open
   * AC-6: If no ``context.md`` is found anywhere, an information message is
     shown instead of attempting to open a non-existent file
   * AC-7: Folder nodes do not show the button


.. story:: Disciplined & Configurable Agent-Session Init Prompt
   :id: US_ENT_AGENTSESSION_PROMPT
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITY; US_ENT_AGENTSESSION

   **As a** Jarvis User,
   **I want** the agent-session initialization prompt to enforce disciplined
   ``context.md`` authoring and to be overridable in VS Code settings,
   **so that** agent sessions maintain a lean, action-oriented persistent memory
   instead of growing into an unbounded log, and advanced users can adapt the
   prompt to their conventions.

   **Acceptance Criteria:**

   * AC-1: The default prompt enforces a Decision / Finding / Next structure with
     one concise line per bullet, aggressive pruning, and no append-only logs,
     raw tool output, or transient chatter.
   * AC-2: The default prompt includes a "Will this still matter in 2 weeks?" gate
     before writing to ``context.md``.
   * AC-3: A VS Code setting ``jarvis.agentSession.initPromptTemplate`` (string)
     lets the user replace the default prompt with a custom template.
   * AC-4: The template supports three placeholders: ``${kind}``, ``${name}``, and
     ``${contextPath}``; these are substituted at session-open time.
   * AC-5: The configured prompt is sent on both ``jarvis.openAgentSession`` and
     ``jarvis.newSession``.
   * AC-6: The configured prompt is also sent when ``jarvis.sendMessages`` or the
     auto-delivery poll loop opens a **new** session (no matching UUID found) and
     the destination name matches a known project, event, or actor entity in the
     scanner store; both paths use the same template and placeholder substitution
     as AC-4. If no entity matches the destination name, the init prompt is skipped
     and the new session receives only the notification stub.
   * AC-7: When a session is opened via tree-click, ``jarvis.sendMessages``, or
     the auto-delivery poll loop and the entity has a bound ``agent`` field, the
     session SHALL open in that agent mode — regardless of the user's currently
     active VS Code Chat mode setting at the time of opening. Mode is applied at
     session birth, not via post-creation switching.
   * AC-8: The default prompt includes a scaling-valve rule that instructs the
     agent to move a topic to a dedicated file beside ``context.md`` (with a
     one-line summary and relative link left in ``context.md``) when the topic
     grows past ~5 bullets. The rule applies uniformly to all entity kinds.


.. story:: Entity Feature Parity (Projects & Events)
   :id: US_ENT_ENTITYPARITY
   :status: draft
   :priority: required
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR; US_ENT_AGENTSESSION

   **As a** Jarvis User,
   **I want** Projects and Events to have the same feature-set as Actors —
   agent binding, tree-click-to-chat, and uniform inline icons —
   **so that** every entity type behaves consistently and I do not have to
   remember different interaction patterns for different entity kinds.

   **Acceptance Criteria:**

   * AC-1: Project and Event schemas declare ``agent`` as **required**.
     The scanner is fail-open: YAMLs missing ``agent`` still load, but the
     entity is flagged internally as **unbound**. A warning log line is
     emitted at scan time.
   * AC-2: Event schema makes ``summary`` required. Existing events without
     ``summary`` get a validation warning in editors but still load at runtime.
   * AC-3: Tree-click on a project or event leaf node opens the agent-chat
     editor (same as actor tree-click). The existing ``$(go-to-file)``
     button remains for opening the YAML.
   * AC-4: All three entity types show uniform inline icons:
     ``$(go-to-file)`` for YAML and ``$(notebook)`` for context.md.
   * AC-5: ``jarvis.openAgentSession`` respects the ``agent`` field on
     project/event entities (same behavior as actors: if agent is set, open
     in that mode).
   * AC-6: The YAML scanner reads ``agent`` from ``project.yaml`` and
     ``event.yaml`` — same pattern as ``session.yaml``.
   * AC-7: Tree-click on an **unbound** entity (project, event, or actor —
     i.e. ``agent`` field missing or ``agent: ""``) opens a default chat
     editor directly (no picker, no YAML mutation). The chat is renamed to
     the entity name and the kind-aware init-prompt is submitted. The user
     may pick a chat-mode via VS Code's native chat-mode dropdown.
   * AC-8: ``jarvis.newProject`` and ``jarvis.newEvent`` invoke the
     agent-picker after the name/date prompts — same shared picker component
     as ``jarvis.newSession``. After creation, the chat editor opens per
     the agent-picker chat-open gate (concrete agent → mode chat; "No agent" →
     default chat with no mode; cancel → abort). In all non-cancel paths the
     chat is renamed and the init-prompt is submitted.


.. story:: Entity File Children in Tree
   :id: US_ENT_ENTITY_FILES_TREE
   :status: approved
   :priority: mandatory
   :links: US_ENT_ENTITY; US_EXP_SIDEBAR; US_ACT_ACTORS; US_ENT_ENTITYPARITY

   **As a** Jarvis User,
   **I want** each Actor, Project, and Event node in the Jarvis Explorer to
   expand and show its core files (``context.md``, the YAML config, and the
   agent file when one is configured) as clickable tree items with tooltips,
   **so that** I can open any of these files directly by clicking on the file
   child, without leaving the tree.

   **Acceptance Criteria:**

   * AC-1: Every Actor, Project, and Event leaf node is expandable and shows
     up to 3 file children: ``context.md``, the entity's YAML config file
     (``session.yaml`` / ``project.yaml`` / ``event.yaml``), and the agent
     file.
   * AC-2: The agent file child is shown only when the entity has a
     configured agent file; otherwise it is omitted (fail-open, no error).
   * AC-3: Each file child shows a tooltip with the full filesystem path of
     that file.
   * AC-4: Clicking a file child opens that file directly in the VS Code
     editor.
   * AC-5: This is purely additive — existing inline icon buttons (YAML,
     context.md) and existing entity-node click behavior (open agent session
     / open chat) are unchanged by this feature.
