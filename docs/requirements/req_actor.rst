Actor Requirements
==================

.. note::
  Requirements for the Actor, the only kind of persistent participant in
  Jarvis. The Actor is
  defined by three unique capabilities (ADR-12): **persistent context**
  (``context.md``), **message addressability** (heartbeat/reminder through
  the existing queue), and **loose session binding** (swappable chat
  session). All requirements use the ``ACTOR`` theme.

.. req:: Actor Storage Convention
   :id: REQ_ACTOR_SCHEMA
   :status: implemented
   :priority: mandatory
   :links: US_ACTOR_ACTORS

   **Description:**
   An Actor SHALL be identified on disk by an ``actor.yaml`` file inside a
   direct child folder of ``jarvis.actors.folder`` (default
   ``.jarvis/actors/``). It is the leaf marker of the ACTORS tree
   (``REQ_ACTOR_TREE``) and is not bound to a kind registry.

   **Acceptance Criteria:**

   * AC-1: The ``actor.yaml`` schema SHALL require exactly one field:
     ``name`` (string, minLength 1).
   * AC-2: The schema SHALL allow one optional field: ``summary`` (string).
     A legacy ``agent`` property SHALL remain accepted by the schema,
     described as deprecated and ignored; Jarvis ignores its value and
     never writes it. An Actor's agent is identified by the Actor name
     (``REQ_ACTOR_WHOAMI`` AC-1).
   * AC-3: ``additionalProperties`` SHALL be set to ``false``. No
     legacy-kind fields (``dates``, ``kind``, etc.) SHALL be permitted.
   * AC-4: A JSON Schema file ``schemas/actor.schema.json`` (draft-07)
     SHALL describe the schema.
   * AC-5: ``package.json`` ``contributes.yamlValidation`` SHALL include an
     entry binding ``actor.yaml`` to ``./schemas/actor.schema.json``.
   * AC-6: When an Actor is created through Jarvis (``REQ_ACTOR_CREATE``,
     ``REQ_ACTOR_CREATETOOL``), the new folder name SHALL be the verbatim
     input ``name`` value (no slug transformation, no lower-casing),
     matching the ``name`` written to ``actor.yaml``. This creation
     convention does not invalidate manually placed ``actor.yaml`` files
     whose folder and YAML names differ.
   * AC-7: The internal scanner key of an Actor and the ``id`` field in its
     ``jarvis_listActors`` entry SHALL be the absolute path to that Actor's
     ``actor.yaml`` file, not its
     folder or ``context.md``. This path is derived from the file location;
     ``actor.yaml`` SHALL NOT contain an ``id`` field. Actors SHALL come
     from direct-child discovery.
     Actor names SHALL be unique: two Actors with the same YAML ``name`` are
     a misconfiguration, not a supported case. Jarvis's own creation paths
     SHALL NOT produce one (``REQ_ACTOR_CREATE`` AC-3,
     ``REQ_ACTOR_CREATETOOL`` AC-7); a duplicate can only come from a
     manual ``actor.yaml`` edit. The ACTORS view still shows
     both folders, but every name-based function (message destination and
     sender validation, heartbeat destinations, agent file maintenance,
     prompt injection, touched files, activity indicator, Kanban owner
     resolution) SHALL refuse to act on the ambiguous name rather than pick
     one (``REQ_ACTOR_WHOAMI`` AC-5, ``REQ_INJ_PRIMITIVE`` AC-2). When a message
     send is refused because its destination or sender name is ambiguous,
     the user SHALL see an error notification naming the name and the
     folders that carry it; the other functions refuse without a
     notification.

.. req:: Actor Message Addressability
  :id: REQ_ACTOR_ACTIVATION
  :status: approved
  :priority: mandatory
  :links: US_ACTOR_ACTORS; REQ_ACTOR_SCHEMA; REQ_AUT_HEARTBEAT_RESOLVER_REUSE; REQ_MSG_REMINDERS_DELIVER; REQ_MSG_QUEUE; REQ_MSG_AUTODELIVER_CONFIG

  **Description:**
  An Actor SHALL be a valid destination for messages from heartbeat jobs
  and reminders even when its chat session is not already open. Message
  delivery, not the sender, controls notification.

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
   * AC-3: Heartbeat and reminder destinations SHALL resolve Actors
     through direct-child Actor discovery. The existing unified destination resolver
     (``REQ_AUT_HEARTBEAT_RESOLVER_REUSE`` AC-1..AC-3) SHALL include this
     Actor source, with no parallel enumeration. Delivery SHALL reuse the
     existing heartbeat scheduler, reminder store, and message delivery
     mechanisms; no second Actor-only scheduler or reminder store SHALL be
     introduced.

.. req:: Actor Session Binding
   :id: REQ_ACTOR_BINDING
   :status: implemented
   :priority: mandatory
   :links: US_ACTOR_ACTORS; REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   An Actor's identity and memory SHALL remain independent of the lifetime
   of any one VS Code chat session.

   **Acceptance Criteria:**

   * AC-1: Closing or restarting a bound chat session SHALL NOT delete or
     change the Actor's ``actor.yaml`` or ``context.md``.
   * AC-2: A replacement session SHALL be able to bind to the same Actor
     without changing its on-disk identity or memory.
   * AC-3: Once bound, the replacement session SHALL know that Actor
     through the Actor's own agent (``REQ_ACTOR_WHOAMI`` AC-3); the former
     session SHALL NOT be treated as the Actor's permanent identity.

.. req:: ACTORS Tree View
   :id: REQ_ACTOR_TREE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_TREE; US_EXP_SIDEBAR; REQ_ACTOR_SCHEMA; REQ_EXP_REACTIVECACHE; REQ_CFG_SCANINTERVAL; REQ_CFG_FOLDERPATHS

   **Description:**
   A TreeView SHALL display the Actors found in direct child folders of
   ``jarvis.actors.folder`` as the ACTORS view of the Jarvis Explorer.

   **Acceptance Criteria:**

   * AC-1: The view SHALL appear in the ``jarvis-explorer`` sidebar
     container. Its title SHALL read ``<workspace name> Actors``, where
     ``<workspace name>`` is the name of the first workspace folder.
   * AC-2: The view SHALL list only direct child folders of
     ``jarvis.actors.folder`` that contain an ``actor.yaml`` file. It SHALL
     NOT descend into child folders or show grouping nodes.
   * AC-3: Each Actor node SHALL have label equal to the ``actor.yaml``
     ``name`` field (fallback: folder name when the file is missing,
     unparseable, or has no ``name``), tooltip equal to ``summary`` (or
     empty), and ``contextValue`` ``jarvisActor``.
   * AC-4: Actor nodes SHALL be sorted alphabetically by their label,
     case-insensitive.
   * AC-5: Changing ``jarvis.actors.folder`` SHALL trigger an immediate
     rescan of the view (reactive-cache pattern of ``REQ_EXP_REACTIVECACHE``).
   * AC-6: A change to an Actor's ``actor.yaml`` content SHALL be reflected
     in the view after the next scan.
   * AC-7: The view SHALL refresh via the ``jarvis.rescan`` command and the
     periodic background rescan, whose interval is ``jarvis.scanInterval``
     (``REQ_CFG_SCANINTERVAL``).
   * AC-8: The view's title bar SHALL show a ``$(refresh)`` button bound to
     ``jarvis.rescan``.
   * AC-9: The view's title bar SHALL offer VS Code's Collapse All action.
     It SHALL only collapse expanded nodes — no node is removed, reordered,
     or reloaded, and no click command fires.
   * AC-10: Clicking an Actor node SHALL invoke ``jarvis.openActorSession``
     (``REQ_ACTOR_OPENSESSION``). Actor nodes are expandable
     (``REQ_ACTOR_FILES_TREE``); clicking the label still opens the session,
     clicking the expand arrow only expands or collapses.
   * AC-11: No kind categories, filter buttons, or archive feature SHALL be
     introduced for this view. Moving a folder out of the root's direct
     children (including into a nested folder) or deleting it is ordinary
     filesystem management; it is then no longer discovered as an Actor.
   * AC-12: If ``jarvis.actors.folder`` cannot be resolved (e.g. no
     workspace open), the view SHALL show an empty state, not an error.
   * AC-13: The view SHALL use the ``jarvis.actors.folder`` setting
     (default ``.jarvis/actors/``, ``REQ_CFG_FOLDERPATHS``) and introduce no
     further setting.

.. req:: Create Actor Command
   :id: REQ_ACTOR_CREATE
   :status: implemented
   :priority: mandatory
   :links: US_ACTOR_CREATE; REQ_ACTOR_SCHEMA; REQ_ACTOR_TREE; REQ_ACTOR_CREATETOOL; REQ_ACTOR_WHOAMI; REQ_ACTOR_OPENSESSION

   **Description:**
   A ``+`` (``$(add)``) icon in the ACTORS view title bar SHALL create a new
   Actor. The command SHALL use the same creation routine as
   ``jarvis_createActor`` (``REQ_ACTOR_CREATETOOL`` AC-2), so both entry
   points produce identical files.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the ACTORS view title bar SHALL trigger
     the command ``jarvis.newActor``. The command SHALL NOT appear in
     the Command Palette. It SHALL open the name InputBox directly
     (AC-2).
   * AC-2: The command SHALL show an InputBox for the Actor name. Invalid
     names SHALL be rejected with inline ``validateInput`` feedback using
     the name rules of ``REQ_ACTOR_CREATETOOL`` AC-5.
   * AC-3: Before creating, the command SHALL rescan the actors folder and
     then check whether the direct child path ``<actorsFolder>/<name>/``
     exists on disk, including a folder without ``actor.yaml``, or whether
     an Actor with that ``name`` already exists in any folder
     (``REQ_ACTOR_SCHEMA`` AC-7). If either holds, the command SHALL show
     an error notification naming the existing folder and abort without
     modifying the filesystem.
   * AC-4: The command SHALL then show an optional InputBox for the
     summary. Escape SHALL skip it (empty summary), not abort.
   * AC-5: The command SHALL create the Actor via the shared creation
     routine (``REQ_ACTOR_CREATETOOL`` AC-2) with the entered name and
     summary.
   * AC-6: The command SHALL NOT show an agent picker. After file creation
     (before the rescan) it SHALL ensure the Actor's agent
     (``REQ_ACTOR_WHOAMI`` AC-4).
   * AC-7: After the agent is ensured, an immediate rescan SHALL be
     triggered so the new Actor appears in the ACTORS view without a manual
     refresh.
   * AC-8: If the user cancels the name InputBox, the command SHALL exit
     without side effects (no folder, no file written).
   * AC-9: After creation, when ``jarvis.actors.openSessionOnCreate`` is
     ``true``, the command SHALL open the new Actor's chat session via
     ``REQ_ACTOR_OPENSESSION``.
   * AC-10: The setting ``jarvis.actors.openSessionOnCreate`` SHALL be a
     boolean in the Actors settings group, default ``true``. Its description
     SHALL state the trade-off: opening directly lets the user start working
     with the new Actor; turning it off keeps the current chat in focus,
     e.g. when creating several Actors in a row. The setting governs both
     this command and ``REQ_ACTOR_CREATETOOL`` AC-9.

.. req:: Actor Identity via Own Agent
   :id: REQ_ACTOR_WHOAMI
   :status: implemented
   :priority: required
   :links: US_ACTOR_WHOAMI; REQ_ACTOR_SCHEMA; REQ_ACTOR_AGENT_DISCOVERY

   **Description:**
   Every Actor SHALL have exactly one chat agent of its own, identified by
   the Actor name. Jarvis SHALL keep the Actor's name and the location of its
   ``context.md`` in that agent, so that the Actor knows both in every
   session without a tool call and without agent hooks. The requirement ID
   is kept for traceability from the former ``jarvis_whoAmI`` tool.

   **Acceptance Criteria:**

   * AC-1: The Actor's agent SHALL be the agent whose front matter ``name``
     equals the Actor name (agent identity per
     ``REQ_ACTOR_AGENT_DISCOVERY`` AC-3), whatever its file name is.
   * AC-2: When no agent carries the Actor name, Jarvis SHALL create
     ``.github/agents/<Actor name>.agent.md`` whose front matter holds
     ``name: "<Actor name>"``.
   * AC-3: Jarvis SHALL maintain exactly two lines directly after the front
     matter of the Actor's agent file. Line 1 SHALL read
     ``You act as Actor <name>``. Line 2 SHALL read ``Your context memory is
     <workspace-relative path of context.md>. Read it and the files it links
     if you did not do that already or after a compaction.`` Jarvis SHALL NOT
     change anything else in the file.
   * AC-4: Before Jarvis creates an Actor (``REQ_ACTOR_CREATE`` AC-6,
     ``REQ_ACTOR_CREATETOOL`` AC-6), opens an Actor's session, or delivers a
     message into it (``REQ_ACTOR_INITPROMPT`` AC-6), it SHALL ensure that
     AC-2 and AC-3 hold: create the agent when it is missing, restore the
     two lines when they are absent or different. Only then SHALL it set the
     Actor's agent mode. The check runs at these points and not at
     extension startup, so activation is not slowed. All three points SHALL
     call one and the same routine; none implements its own variant.
   * AC-5: When the Actor name is carried by more than one Actor
     (``REQ_ACTOR_SCHEMA`` AC-7), Jarvis SHALL NOT create or change an agent
     for it.
   * AC-6: When ``<Actor name>.agent.md`` exists but its front matter
     ``name`` differs from the Actor name, Jarvis SHALL NOT change that file
     and SHALL NOT treat it as the Actor's agent. It SHALL show a warning
     notification naming the file.
   * AC-7: Jarvis SHALL NOT delete agent files. When an Actor is renamed, the
     agent of the new name is created at the next check (AC-4) and the agent
     file of the former name stays.
   * AC-8: Jarvis SHALL NOT copy persona content into the agent file. The
     Actor's persona is referenced from its ``context.md`` and read as text,
     so several Actors may share one persona.
   * AC-9: Whether a project tracks or ignores the agent files in version
     control is the project's concern: Jarvis restores the two lines of AC-3
     whenever the check of AC-4 runs.
   * AC-10: The tool ``jarvis_whoAmI`` SHALL NOT be registered as Language
     Model or MCP tool, and ``whoAmI`` SHALL NOT appear in the Chat tool
     picker.
   * AC-11: The Actor kernel instructions delivered by Jarvis
     (``REQ_MOD_ACTORRULES``) SHALL NOT tell an Actor to call
     ``jarvis_whoAmI``.

.. req:: Programmatic Actor Creation Tool
   :id: REQ_ACTOR_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACTOR_CREATETOOL; REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI; REQ_ACTOR_OPENSESSION; REQ_ACTOR_TREE

   **Description:**
   A Language Model and MCP tool ``jarvis_createActor`` SHALL create an
   Actor under ``jarvis.actors.folder``. Its creation routine is shared with
   the ACTORS "+" command (``REQ_ACTOR_CREATE``).

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered whenever ``jarvis.actors.folder`` is
     resolvable at activation time and SHALL appear in the Chat tool picker
     with ``toolReferenceName`` ``createActor``. Inputs: ``name``
     (required), ``summary``, ``initialMessage`` (optional). A caller that
     still passes ``agent`` SHALL NOT be rejected; the value has no effect.
   * AC-2: On a successful create, the shared creation routine SHALL:

     a. create ``<actorsFolder>/<name>/`` with the verbatim ``name`` as
        folder name;
     b. write ``actor.yaml`` with ``name`` and ``summary``;
     c. write ``context.md`` containing ``# <name>`` followed by a blank
        line and, when a non-blank summary is given, the summary.

     The tool SHALL return ``{ created: true, path: "<workspace-relative
     Actor folder>" }``.
   * AC-3: After creation, the tool SHALL trigger a rescan so the ACTORS
     view shows the new Actor within 2 seconds without a manual action.
   * AC-4: When ``initialMessage`` is provided and the Actor was created,
     the tool SHALL enqueue it with the Actor's ``name`` as destination and
     ``"jarvis_createActor"`` as sender, before returning.
   * AC-5: The tool SHALL validate ``name`` before any filesystem operation.
     An empty value, any of ``/ \ : * ? " < > |``, a null or control
     character, ``.`` or ``..``, or a Windows reserved device name (``CON``,
     ``PRN``, ``AUX``, ``NUL``, ``COM1``–``COM9``, ``LPT1``–``LPT9``,
     case-insensitive) SHALL raise an error ``"invalid actor name:
     <reason>"``.
   * AC-6: After the files are written, the shared creation routine SHALL
     ensure the Actor's agent (``REQ_ACTOR_WHOAMI`` AC-4). The tool takes no
     ``agent`` input to validate.
   * AC-7: The tool SHALL rescan the actors folder before this check. When
     ``<actorsFolder>/<name>/`` already exists, or an Actor with that
     ``name`` already exists in any folder (``REQ_ACTOR_SCHEMA`` AC-7), the
     tool SHALL return ``{ created: false, reason: "actor \"<name>\" already
     exists; no action taken", path: "<workspace-relative folder of the
     existing Actor or path>" }`` without modifying any file, enqueuing any
     message, or opening any session.
   * AC-8: If no workspace folder is open, the tool SHALL raise an error
     whose message begins with ``"jarvis_createActor: no workspace open"``,
     distinct from the ``"invalid actor name:"`` prefix.
   * AC-9: After a successful create (``created: true``), when
     ``jarvis.actors.openSessionOnCreate`` is ``true`` (``REQ_ACTOR_CREATE``
     AC-10), the tool SHALL open the new Actor's chat session via
     ``REQ_ACTOR_OPENSESSION``. Errors from opening SHALL be logged at
     ``warn`` level and SHALL NOT make the tool fail.

.. req:: List Actors Tool
   :id: REQ_ACTOR_LISTTOOL
   :status: implemented
   :priority: required
   :links: US_ACTOR_LISTTOOL; REQ_ACTOR_SCHEMA; REQ_ACTOR_TREE

   **Description:**
   A Language Model and MCP tool ``jarvis_listActors`` SHALL return all
   Actors.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered whenever ``jarvis.actors.folder`` is
     resolvable at activation time, SHALL accept no input parameters, and
     SHALL appear in the Chat tool picker with ``toolReferenceName``
     ``listActors``.
   * AC-2: The tool SHALL return ``{ "actors": [...] }`` with one entry per
     Actor discovered per ``REQ_ACTOR_TREE`` AC-2. Each entry SHALL have
     ``name``, ``summary``, ``agent`` (the Actor's own agent, identified by
     the Actor name, so equal to ``name``), ``folder``
     (absolute path of the Actor folder), and ``id`` (absolute path of its
     ``actor.yaml``, ``REQ_ACTOR_SCHEMA`` AC-7).
   * AC-3: The tool SHALL be distinct from ``jarvis_listChatSessions``,
     which lists VS Code chat tab titles.

.. req:: Agent Discovery
   :id: REQ_ACTOR_AGENT_DISCOVERY
   :status: implemented
   :priority: required
   :links: US_ACTOR_ACTORS; US_ACTOR_FILES_TREE

   **Description:**
   The agents of the workspace SHALL be determined at runtime by scanning
   ``.github/agents/`` in the current workspace, so that an Actor's agent can
   be found by name (``REQ_ACTOR_WHOAMI`` AC-1).

   **Acceptance Criteria:**

   * AC-1: Discovery SHALL scan all ``*.agent.md`` files in
     ``<workspaceRoot>/.github/agents/``.
   * AC-2: A file is included UNLESS its YAML frontmatter explicitly
     contains ``user-invocable: false``. Files without that key, without
     frontmatter, or with ``user-invocable: true`` SHALL be included.
   * AC-3: The agent identity SHALL be the frontmatter ``name`` value
     trimmed of surrounding whitespace when it is a non-empty string;
     otherwise the file basename without the ``.agent.md`` suffix (e.g.
     ``syspilot.cm.agent.md`` → ``syspilot.cm``). This identity is matched
     against the Actor name (``REQ_ACTOR_WHOAMI`` AC-1) and used as the chat
     ``mode`` parameter.
   * AC-4: If ``.github/agents/`` does not exist or is unreadable, discovery
     SHALL return an empty list without error.
   * AC-5: The returned list SHALL be sorted alphabetically by identity.
   * AC-6: Discovery SHALL run on demand (session open, message delivery); no
     persistent cache is kept.

.. req:: Open Actor Session
   :id: REQ_ACTOR_OPENSESSION
   :status: approved
   :priority: required
   :links: US_ACTOR_TREE; US_ACTOR_CONTEXTACTIONS; US_MSG_STABLESESSION; US_MSG_EDITORPLACEMENT; REQ_MSG_SESSIONLOOKUP; REQ_MSG_PINNED; REQ_MSG_OPENCHAT; REQ_MSG_EDITORPLACEMENT; REQ_ACTOR_INITPROMPT; REQ_INJ_PRIMITIVE

   **Description:**
   The command ``jarvis.openActorSession`` SHALL open the chat session of an
   Actor. It is user-initiated and therefore always targets the Main
   placement column (``REQ_MSG_EDITORPLACEMENT`` AC-1).

   **Acceptance Criteria:**

   * AC-1: The command SHALL be invoked by clicking an Actor node
     (``REQ_ACTOR_TREE`` AC-10) and by the right-click "Open" entry
     (``REQ_ACTOR_CONTEXTACTIONS`` AC-1). It SHALL NOT appear in the Command
     Palette.
   * AC-2: The command SHALL delegate to ``injectPrompt(<Actor name>, "")``
     with Main placement (``REQ_INJ_PRIMITIVE``) and SHALL NOT itself
     create, rename, mode-prime, or prompt a session. The empty payload
     means no chat message is submitted beyond what the primitive sends
     for a new session (``REQ_INJ_PRIMITIVE`` AC-7).
   * AC-3: Through that delegation, an existing session is opened pinned
     (``REQ_MSG_PINNED``) in the Main column, closed and reopened in column 1
     if it is open elsewhere (``REQ_MSG_EDITORPLACEMENT`` AC-5); a missing
     session is spawned by ``REQ_INJ_PRIMITIVE`` AC-4, which sends the
     initialization prompt once, and is relocated to the Main column
     (``REQ_MSG_EDITORPLACEMENT`` AC-12/AC-13).

.. req:: Actor Session Initialization Prompt
   :id: REQ_ACTOR_INITPROMPT
   :status: implemented
   :priority: required
   :links: US_ACTOR_ACTORS; US_MSG_STABLESESSION; REQ_INJ_PRIMITIVE; REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_WHOAMI

   **Description:**
   Every new chat session opened for an Actor SHALL receive an
   initialization prompt that names the Actor and its ``context.md`` and
   establishes the memory discipline, and SHALL open in the Actor's own
   agent mode.

   **Acceptance Criteria:**

   * AC-1: A setting ``jarvis.agentSession.initPromptTemplate`` (string,
     scope ``window``, Prompt Templates settings group) SHALL hold the prompt
     template. Its default is the built-in prompt of
     ``SPEC_ACTOR_INITPROMPT``.
   * AC-2: The placeholders ``${name}`` (Actor name) and ``${contextPath}``
     (absolute path of the Actor's ``context.md``) SHALL be substituted at
     send time. Any other placeholder, including a former ``${kind}``, SHALL
     be left as-is.
   * AC-3: An empty or absent setting SHALL fall back to the built-in
     default, not to an empty prompt.
   * AC-4: The built-in default SHALL address the session as the Actor by
     name, give the absolute ``context.md`` path as an inline code span,
     instruct the agent to read it at session start and keep it updated,
     enforce a Decision / Finding / Next structure with one concise line
     per bullet and a "Will this still matter in 2 weeks?" gate, and end
     its "Keep it minimal and action-oriented" list with the bullet
     (verbatim): ``- When a topic grows past ~5 bullets, move it to a
     dedicated file beside `context.md` and leave a one-line summary with a
     relative link in `context.md`.``
   * AC-5: The prompt SHALL be sent only by the new-session branch of
     ``REQ_INJ_PRIMITIVE`` (AC-4), once per created session. Every path that
     can create an Actor session — ``REQ_ACTOR_OPENSESSION``,
     ``jarvis.sendMessages``, the auto-delivery poll loop, and the injection
     tool and command (``REQ_INJ_TOOL``, ``REQ_INJ_COMMAND``) — SHALL reach
     it through that primitive and SHALL NOT send the prompt itself. It SHALL
     NOT be re-sent to an existing session.
   * AC-6: Before Jarvis creates an Actor session, or opens or delivers into
     an existing one, it SHALL ensure the Actor's agent
     (``REQ_ACTOR_WHOAMI`` AC-4) and then use that agent as the session's
     mode. A new session SHALL be created mode-primed:
     ``workbench.action.chat.open { mode: <Actor name> }`` and a 300 ms
     settle **before** ``openNewChatEditor()``, so the new session inherits
     the mode. For an existing session Jarvis SHALL re-apply the Actor's
     agent (workaround for VS Code dropping the mode). It SHALL NOT select
     any other mode. When the agent could not be ensured
     (``REQ_ACTOR_WHOAMI`` AC-5, AC-6), no mode is passed and the session's
     mode is left untouched.
   * AC-7: If VS Code does not recognize the mode (e.g. the agent file was
     removed), VS Code's default chat mode applies; Jarvis surfaces no
     error.

.. req:: Actor Node Context Menu
   :id: REQ_ACTOR_CONTEXTACTIONS
   :status: approved
   :priority: optional
   :links: US_ACTOR_CONTEXTACTIONS; REQ_ACTOR_TREE; REQ_ACTOR_OPENSESSION

   **Description:**
   Right-clicking an Actor node (``contextValue`` ``jarvisActor``) SHALL show
   actions for its chat, its folder, and its path.

   **Acceptance Criteria:**

   * AC-1: **Open** SHALL invoke ``jarvis.openActorSession``
     (``REQ_ACTOR_OPENSESSION``), identical to clicking the node.
   * AC-2: **Reveal in Explorer**, **Reveal in File Explorer**, and **Open
     in Terminal** SHALL reveal the Actor folder via the built-in commands
     ``revealInExplorer``, ``revealFileInOS``, and ``openInTerminal``
     (working directory = Actor folder).
   * AC-3: **Copy Path** and **Copy Full Path** SHALL both copy the absolute
     OS path of the Actor folder to the clipboard.
   * AC-4: These commands SHALL NOT appear in the Command Palette.

.. req:: Actor File Children
   :id: REQ_ACTOR_FILES_TREE
   :status: implemented
   :priority: mandatory
   :links: US_ACTOR_FILES_TREE; REQ_ACTOR_TREE; REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_WHOAMI; REQ_MSG_EDITORPLACEMENT

   **Description:**
   Actor nodes SHALL be expandable into an "Agent" category (conditional)
   and a "Files" category (always) that recursively mirrors the Actor's own
   folder.

   **Acceptance Criteria:**

   * AC-1: Every Actor node SHALL have ``collapsibleState = Collapsed``.
   * AC-2: An Actor node's children SHALL be, in order: an "Agent" category
     node (only when AC-4 holds) and a "Files" category node (always). Both
     SHALL be ``Collapsed`` and independently expandable.
   * AC-3: The "Files" category SHALL list the Actor folder recursively:
     every file and subfolder, sorted alphabetically (files and folders
     interleaved), including hidden (dot-prefixed) entries. Subfolders SHALL
     be expandable and recurse by the same rule.
   * AC-4: The "Agent" category SHALL be shown if and only if the Actor's
     own agent is found by the Actor name
     (``REQ_ACTOR_WHOAMI`` AC-1), that is, an agent file whose identity
     equals the Actor name exists. It SHALL contain exactly one child
     ``Agent File: <filename>`` pointing at that file. Otherwise the
     category is omitted (fail-open, no error).
   * AC-5: File and folder children SHALL show their full absolute path
     (forward slashes) as tooltip.
   * AC-6: Clicking a file child SHALL open it: ``.md`` files
     (case-insensitive, including ``context.md`` and ``*.agent.md``) as
     rendered Markdown Preview; other files in VS Code's standard preview
     mode. Both SHALL target the Docs column (column 2,
     ``REQ_MSG_EDITORPLACEMENT`` AC-2) on first open; a file already open in
     another column SHALL be focused in place (``REQ_MSG_EDITORPLACEMENT``
     AC-4).
   * AC-7: ``contextValue`` SHALL be ``jarvisActorFileCategory:agent`` /
     ``jarvisActorFileCategory:files`` for the categories,
     ``jarvisActorFileFolder`` for folders (``Collapsed``), and
     ``jarvisActorFile`` for files (``collapsibleState = None``).
   * AC-8: Right-clicking a file child SHALL show **Open** (same as clicking
     it), **Copy Path** (absolute path of the containing folder), **Copy
     Full Path** (absolute path of the file), and **Copy File Name** (bare
     file name). These commands SHALL NOT appear in the Command Palette.
   * AC-9: File children SHALL be shown whether or not the file still exists
     at click time; the "Agent" existence check is evaluated per rescan.
   * AC-10: The "Files" listing SHALL be recomputed on every expansion (no
     scanner cache) and refresh with the wider tree (periodic rescan or
     ``jarvis.rescan``); a dedicated file-system watcher is not required.

.. req:: Recently Touched Files per Actor
   :id: REQ_ACTOR_TOUCHEDFILES
   :status: approved
   :priority: optional
   :links: US_ACTOR_TOUCHEDFILES; REQ_HOOK_ROUTE; REQ_ACTOR_FILES_TREE; REQ_ACTOR_SCHEMA

   **Description:**
   A touch tracker SHALL record, per Actor, which files the agent has read
   or written, and each Actor node SHALL gain a third category child,
   "Recently Touched Files", sibling to "Agent"/"Files"
   (``REQ_ACTOR_FILES_TREE`` AC-2), listing those files as a persisted,
   hierarchical tree. The signal source today is the Hook Engine's
   ``PostToolUse`` event (``REQ_HOOK_ROUTE``); AC-1 to AC-5 describe that
   source.

   What is *recorded* and what is *displayed* are separate concerns
   (AC-15 to AC-18): the recorded set only ever changes through a touch or
   an explicit user action, while a display window and an existence check
   decide what of it is shown.

   **Acceptance Criteria:**

   * AC-1: The touch tracker SHALL subscribe only to ``PostToolUse`` (not
     ``PreToolUse``), so aborted or rejected tool calls are not counted.
   * AC-2: Each ``PostToolUse`` event SHALL be classified by an explicit
     allowlist keyed by ``tool_name`` (``TOUCH_RULES``):

     a. ``read_file`` → **read**, path from ``tool_input.filePath``.
     b. ``create_file``, ``replace_string_in_file`` → **write**, path from
        ``tool_input.filePath``.
     c. ``multi_replace_string_in_file`` → **write**, paths from
        ``tool_input.replacements[].filePath`` (de-duplicated per file).
     d. Any other ``tool_name`` SHALL be ignored — no path-sniffing
        heuristics.
   * AC-3: Tool success or failure SHALL NOT be tracked; ``tool_response``
     carries no reliable success signal.
   * AC-4: The event's ``session_id`` SHALL be resolved to an Actor name via
     the existing session-to-Actor correlation. Events without a resolvable
     Actor SHALL be ignored (fail-open).
   * AC-5: Extracted absolute paths SHALL be relativized against the event's
     ``cwd`` before being recorded or displayed.
   * AC-6: Each Actor SHALL have a persisted touch list at
     ``.jarvis/state/touched-files/actor-<name>.json`` (outside the Actor
     folder). Each entry SHALL record the relative path plus last-read and/or
     last-edited timestamp (ISO 8601 UTC); a write updates last-edited, a
     read updates last-read. The file SHALL be updated on every touch.
   * AC-6a: When file-touching tool calls overlap in time for the same
     Actor, every touch SHALL be recorded; no concurrent or previously
     persisted entry SHALL be lost.
   * AC-7: The "Recently Touched Files" category
     (``contextValue = 'jarvisActorFileCategory:touched'``, ``Collapsed``)
     SHALL follow "Agent"/"Files" and be shown only when the Actor has at
     least one recorded entry inside the display window (AC-15). Its
     visibility SHALL NOT depend on the existence check (AC-16); it MAY
     therefore be shown with no visible children, which is the state in
     which AC-17 is needed.
   * AC-8: Files SHALL be shown as a tree mirroring their
     workspace-root-relative folders; intermediate folders that lead to no
     touched file SHALL be pruned.
   * AC-9: Clicking a touched-file leaf SHALL open it as in
     ``REQ_ACTOR_FILES_TREE`` AC-6.
   * AC-10: A touched-file leaf's tooltip SHALL show its last-read and/or
     last-edited timestamp(s).
   * AC-11: Right-click on a touched-file leaf SHALL show **Copy Path**,
     **Copy Full Path**, and **Reveal in Explorer**.
   * AC-12: Right-click on a touched-file leaf SHALL additionally show a
     **diff** entry comparing the working-tree content with git ``HEAD``
     via the Git extension's virtual document scheme. Outside a git
     repository or for an untracked file the entry is shown as-is and
     simply produces no diff.
   * AC-13: An inline trash icon on a touched-file leaf, a folder node inside
     the category, and the category node itself SHALL delete every entry
     recorded below that node from the persisted list and refresh the tree
     immediately — including entries hidden by AC-15 or AC-16. No
     confirmation SHALL be shown; an entry reappears if touched again.
     Entries whose root is undetermined under AC-19 SHALL be retained by
     folder removal; the category-level removal MAY remove them.
   * AC-14: This SHALL NOT alter the "Agent"/"Files" categories, the Actor
     node's click or context-menu behavior, or the activity indicator
     (``US_ACTOR_ACTIVITY``).
   * AC-15: A setting ``jarvis.touchedFiles.windowDays`` (``number``, default
     ``0``, minimum 0, Hooks settings group) SHALL restrict the displayed
     list to entries whose most recent touch lies no more than ``n`` × 24
     hours in the past — a rolling period, compared in UTC. ``0`` means no
     limit.
   * AC-15a: A change to ``jarvis.touchedFiles.windowDays`` SHALL take effect
     without reloading the window.
   * AC-16: A touched-file leaf SHALL NOT be shown when its file is
     *determined* not to exist when its parent is expanded, and SHALL NOT be
     removed from the persisted list. Determination SHALL use the
     file-system authority that owns the entry's workspace folder, so that
     it is correct for remote workspaces (WSL, SSH, dev container) and
     virtual file systems. The entry SHALL reappear unchanged when the file
     does (e.g. after switching back to a git branch that has it).
   * AC-17: The category node SHALL offer a cleanup action, distinct from
     AC-13, that removes every entry whose file is *determined* not to
     exist — including entries outside the display window — using the same
     determination as AC-16, and afterwards reports how many were removed.
   * AC-18: No entry SHALL be removed without an explicit user action; there
     SHALL be no activation-time or scheduled removal.
   * AC-19: Where existence cannot be determined (resolution fails, the probe
     reports anything other than "no such file", or the owning workspace
     folder cannot be identified), the entry SHALL remain persisted, SHALL
     NOT be removed by AC-17, and SHALL NOT be shown. A later touch MAY
     supersede this state.
   * AC-20: An entry SHALL carry enough information to identify the
     workspace folder its path is relative to. Entries persisted without it
     SHALL be undetermined under AC-19 rather than discarded or shown.
   * AC-21: Opening, revealing and diffing a touched-file leaf SHALL address
     the file through the resolution of AC-16, not by assuming a local
     file-system path.
   * AC-22: When an Actor's ``name`` is carried by more than one Actor
     (``REQ_ACTOR_SCHEMA`` AC-7), no touch SHALL be recorded for that name
     (AC-4) and neither Actor node SHALL show a "Recently Touched Files"
     category; touches are attributed to neither folder. No notification is
     shown.

.. req:: Actor Activity Indicator
   :id: REQ_ACTOR_ACTIVITY
   :status: approved
   :priority: optional
   :links: US_ACTOR_ACTIVITY; REQ_ACTOR_TREE; REQ_HOOK_ROUTE; REQ_HOOK_INTAKE; REQ_ACTOR_SCHEMA

   **Description:**
   A two-state status (Active/Inactive) SHALL be tracked per Actor and shown
   on its node in the ACTORS view. The signal source today is the Hook
   Engine's lifecycle events (``REQ_HOOK_ROUTE``); AC-1, AC-2, AC-5 and AC-6
   describe that source.

   **Acceptance Criteria:**

   * AC-1: An Actor SHALL become **Active** when its session's
     ``session_id`` (``REQ_HOOK_INTAKE``) is the subject of any of
     ``SessionStart``, ``UserPromptSubmit``, ``PreToolUse``, ``PostToolUse``,
     ``PreCompact``, ``SubagentStart``, ``SubagentStop``.
   * AC-2: An Actor SHALL become **Inactive** when its session's
     ``session_id`` is the subject of a ``Stop`` event.
   * AC-3: An Actor with no observed event yet SHALL be **Inactive**.
   * AC-4: There SHALL be no third state and no timeout-based transition.
   * AC-5: A ``session_id`` SHALL be mapped to an Actor by resolving it to
     the chat session title via ``getAllSessions()`` and matching that title
     verbatim against the Actor ``name`` (sessions are renamed to the Actor
     name on creation, ``REQ_ACTOR_OPENSESSION`` AC-3).
   * AC-6: Events without ``session_id``, or whose title matches no Actor,
     SHALL be ignored — no error, no state change.
   * AC-7: The indicator SHALL be an ``iconPath`` change: a green
     filled-circle ``ThemeIcon`` while Active; while Inactive ``iconPath``
     SHALL be left untouched.
   * AC-8: If the session-to-Actor mapping never matches, the feature SHALL
     degrade to "no Actor shows Active" — a silent no-op, not an error and
     not a misleading indicator.
   * AC-9: The indicator SHALL NOT alter any other Actor-node behavior
     (click-to-chat, context menu, file children).
   * AC-10: When the title matches more than one Actor
     (``REQ_ACTOR_SCHEMA`` AC-7), the event SHALL be ignored like a title
     that matches none: no Actor becomes Active and no notification is
     shown. A title matching no Actor is not an error either; it only means
     that chat's activity cannot be attributed to an Actor (AC-6, AC-8).
