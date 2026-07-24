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
   :links: US_ENT_ENTITY; US_ENT_AGENTSESSION; US_INJ_INJECT

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
   expand into an "Agent" category (when an agent is bound) and a "Files"
   category showing every file actually present in the entity's own folder,
   recursively,
   **so that** I can browse and open any file that belongs to that entity
   directly from the tree, without leaving it, and without the list being
   artificially limited to a fixed set of "known" files.

   **(actor-owned-files-tree CR):** this story is rewritten from its
   original fixed-3-file-list scope (``context.md``, YAML config, agent
   file, always flat siblings) to a fully recursive, folder-driven listing
   grouped under category nodes. The fixed list is **replaced**, not
   supplemented.

   **Acceptance Criteria:**

   * AC-1: Every Actor, Project, and Event leaf node is expandable and shows
     up to two category child nodes, each independently collapsible:

     a. **"Agent"** — shown only when the entity's ``agent`` field is set
        AND it resolves to an existing agent file (same "present = has
        content" rule used elsewhere in the Explorer, e.g. the unified
        entity tree's category nodes). Contains exactly one synthetic child,
        labelled ``Agent File: <filename>``, pointing at the resolved
        ``.github/agents/<file>.agent.md``.
     b. **"Files"** — always shown (every entity has at least its own YAML
        config file). Contains a live, recursive listing of every file and
        subfolder actually present in the entity's own folder, sorted
        alphabetically (files and folders interleaved in one alphabetical
        order, not folders-first), including hidden (dot-prefixed) entries.
        Subfolders are themselves expandable and recurse the same way.

   * AC-2: ``.md`` files (in either category, including ``context.md`` and
     the Agent category's ``*.agent.md`` synthetic node) open as rendered
     **Markdown Preview**, not the raw text editor.
   * AC-3: Non-``.md`` files open in VS Code's standard **preview mode**
     (single click reuses the same preview tab; double-click, or editing,
     pins it) — ordinary VS Code Explorer browsing behavior, avoiding tab
     explosion when browsing many files.
   * AC-4: Both open destinations are the fixed Docs column (column 2),
     consistent with existing entity-file placement
     (``REQ_MSG_EDITORPLACEMENT``) — unchanged from the prior fixed-list
     behavior.
   * AC-5: Each file/folder child shows a tooltip with its full filesystem
     path.
   * AC-6: Right-click "Copy Path" / "Copy Full Path" continue to work
     exactly as before on every file child (unchanged by this CR).
   * AC-7: The Files category's listing updates when files are added to or
     removed from the entity's own folder or any of its subfolders — this
     is **eventually consistent within the existing scan interval** (or
     immediately after a manual "Jarvis: Rescan"), not instantaneous; a
     dedicated file-system watcher for immediate reactivity is explicitly
     deferred (not part of this CR).
   * AC-8: This continues to be purely additive at the entity-node level —
     existing inline icon buttons and existing entity-node click behavior
     (open agent session / open chat) are unchanged by this feature.


.. story:: Recently Touched Files per Entity
   :id: US_ENT_TOUCHEDFILES
   :status: approved
   :priority: optional
   :links: US_ENT_ENTITY_FILES_TREE; US_HOOK_ROUTE; US_ENT_ENTITY; US_EXP_SIDEBAR

   *Context: US_HOOK_ROUTE gave the Hook Engine a typed dispatch registry
   with no real consumer beyond activity tracking (US_HOOK_ACTIVITY). This
   is a second consumer: instead of "is this entity's session active right
   now", it answers "what files has the agent actually read or written
   while working on this entity" — visibility a user currently only gets by
   manually checking git status or the file explorer.*

   **As a** Jarvis User,
   **I want** each Actor, Project, and Event node in the Jarvis Explorer to
   show a "Recently Touched Files" subtree listing files the agent has
   read or written while working in that entity's bound session,
   **so that** I can see at a glance what the agent actually touched,
   without digging through transcripts or git status.

   **Acceptance Criteria:**

   * AC-1: A "Recently Touched Files" category node appears under each
     Actor/Project/Event leaf, alongside the existing "Agent"/"Files"
     categories (US_ENT_ENTITY_FILES_TREE) — a third, independent,
     collapsible category, not nested inside "Files".
   * AC-2: The subtree is hierarchical and **workspace-root-relative** —
     not scoped to the entity's own folder, since the agent can touch
     files anywhere in the workspace. Empty intermediate folder branches
     are pruned (only branches that lead to at least one touched file are
     shown).
   * AC-3: A file is added to the list the first time the agent reads or
     writes it during a session bound to that entity; the entry records
     last-read and/or last-edited timestamps and is shown in a tooltip (no
     separate child node per timestamp).
   * AC-4: The list persists across VS Code reloads (stored outside the
     entity's own folder, so it never collides with or pollutes the
     "Files" category from US_ENT_ENTITY_FILES_TREE).
   * AC-5: Clicking a touched-file entry opens it the same way as an
     entity's own "Files" category entries (Markdown Preview for ``.md``,
     VS Code preview-mode tab otherwise, Docs column) — consistent
     behavior across all file-showing categories in the Explorer.
   * AC-6: A right-click diff view lets the user compare the touched
     file's current content against its last-known-good (source control)
     version, when available.
   * AC-7: Right-click Copy Path / Copy Full Path / Reveal in Explorer are
     available on every touched-file entry (reusing the existing
     entity-file context-menu mechanism from US_ENT_ENTITY_FILES_TREE).
   * AC-8: An inline trash icon on each entry removes it from the list
     immediately (KISS — no separate "dismissed" state; the file
     reappears if touched again).
   * AC-9: This is purely additive — it does not change any existing
     entity-node behavior, the "Agent"/"Files" categories, or the Hook
     Engine's existing activity-tracking consumer (US_HOOK_ACTIVITY).
