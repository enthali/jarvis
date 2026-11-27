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
     prompt injection, activity indicator, Kanban owner
     resolution) SHALL refuse to act on the ambiguous name rather than pick
     one (``REQ_ACTOR_WHOAMI`` AC-5). When a message
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
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_ACTORS; REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI

   **Description:**
   An Actor's identity and memory SHALL remain independent of the lifetime
   of any one VS Code chat session.

   **Acceptance Criteria:**

   * AC-1: Neither closing or restarting a bound chat session nor any Jarvis
     function SHALL delete, change, migrate or rename the ``actor.yaml`` or the
     ``context.md`` of an existing Actor. ``context.md`` is written only by the
     Actor itself; Jarvis writes the initial files only when it creates a new
     Actor (``SPEC_ACTOR_CREATE`` AC-1).
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
     (``REQ_COM_OPEN``). Actor nodes are expandable
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
   :links: US_ACTOR_CREATE; REQ_ACTOR_SCHEMA; REQ_ACTOR_TREE; REQ_ACTOR_CREATETOOL; REQ_ACTOR_WHOAMI; REQ_COM_OPEN; REQ_AUT_LISTMODELS

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
   * AC-4: The command SHALL then show an InputBox for the summary, which
     becomes the description of the Actor. A blank value (empty or only white
     space) SHALL be rejected with inline ``validateInput`` feedback; the
     summary cannot be skipped.
   * AC-5: The command SHALL then show the model picker of AC-11 and create
     the Actor via the shared creation routine (``REQ_ACTOR_CREATETOOL``
     AC-2) with the entered name and summary. The chosen model, if any, goes
     to the agent (AC-6).
   * AC-6: The command SHALL NOT show an agent picker. After file creation
     (before the rescan) it SHALL ensure the Actor's agent
     (``REQ_ACTOR_WHOAMI`` AC-4).
   * AC-7: After the agent is ensured, an immediate rescan SHALL be
     triggered so the new Actor appears in the ACTORS view without a manual
     refresh.
   * AC-8: If the user cancels the name InputBox, the summary InputBox or the
     model picker, the command SHALL exit without side effects (no folder, no
     file written).
   * AC-9: After creation, when ``jarvis.actors.openSessionOnCreate`` is
     ``true``, the command SHALL show the new Actor's chat as a click on it
     does (``REQ_COM_OPEN`` AC-6).
   * AC-10: The setting ``jarvis.actors.openSessionOnCreate`` SHALL be a
     boolean in the Actors settings group, default ``true``. Its description
     SHALL state the trade-off: opening directly lets the user start working
     with the new Actor; turning it off keeps the current chat in focus,
     e.g. when creating several Actors in a row. The setting governs both
     this command and ``REQ_ACTOR_CREATETOOL`` AC-9.
   * AC-11: After the summary, the command SHALL show a picker whose first
     entry is "No model" and whose other entries are the language models
     available at that moment, taken from the list of ``jarvis_listModels``
     (``REQ_AUT_LISTMODELS``): the ``model`` value with its vendor. Choosing
     "No model" SHALL leave the agent without a ``model`` line; choosing a model
     SHALL write it (``REQ_ACTOR_WHOAMI`` AC-14). When the list cannot be
     obtained, the picker SHALL offer only "No model" and the failure SHALL be
     logged at ``warn`` level.

.. req:: Actor Identity via Own Agent
   :id: REQ_ACTOR_WHOAMI
   :status: implemented
   :priority: required
   :links: US_ACTOR_WHOAMI; REQ_ACTOR_SCHEMA; REQ_ACTOR_AGENT_DISCOVERY

   **Description:**
   Every Actor SHALL have exactly one chat agent of its own, identified by
   the Actor name. Jarvis SHALL keep the Actor's name and the location of its
   ``context.md`` in that agent, so that the Actor knows both in every
   session without a tool call. The requirement ID
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
   * AC-12: The Actor kernel instructions delivered by Jarvis SHALL NOT contain
     an Identity section, because the Actor's agent already carries its name
     and the location of its ``context.md`` (AC-3). The section's removal is
     what ``SPEC_ACTOR_WHOAMI`` AC-10 pins; a mention of the word "identity"
     elsewhere in the text is not such a section.
   * AC-13: The front matter of an agent file that Jarvis creates SHALL hold a
     ``description`` and, only when the creation names a model (AC-14), a
     ``model`` line. The ``description`` SHALL be the summary of the Actor on
     one line, and the Actor name when the summary is empty, because the Agent
     Host lists only agent files that have a description
     (``REQ_COM_CHATNAME`` AC-5). The same rule gives the ``description`` that
     Jarvis adds to an existing agent file that has none.
   * AC-14: The ``model`` line SHALL be written only when Jarvis creates the
     agent file during an explicit creation of the Actor
     (``REQ_ACTOR_CREATE`` AC-11, ``REQ_ACTOR_CREATETOOL`` AC-11). It holds the
     ``model`` value of an entry of the model list of ``jarvis_listModels``.
     Every other creation of an agent file, such as for an existing Actor
     whose chat is opened or to which a message is delivered, SHALL omit
     ``model``, SHALL NOT query the model list and SHALL NOT depend on it.
     An existing agent file keeps every ``model`` entry and all other content,
     and a later change of the model list SHALL NOT cause a check or a rewrite
     of the ``model`` line.

.. req:: Programmatic Actor Creation Tool
   :id: REQ_ACTOR_CREATETOOL
   :status: implemented
   :priority: required
   :links: US_ACTOR_CREATETOOL; REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI; REQ_COM_OPEN; REQ_ACTOR_TREE; REQ_AUT_LISTMODELS

   **Description:**
   A Language Model and MCP tool ``jarvis_createActor`` SHALL create an
   Actor under ``jarvis.actors.folder``. Its creation routine is shared with
   the ACTORS "+" command (``REQ_ACTOR_CREATE``).

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered whenever ``jarvis.actors.folder`` is
     resolvable at activation time and SHALL appear in the Chat tool picker
     with ``toolReferenceName`` ``jarvis_core_createActor``. Inputs: ``name``
     and ``summary`` (required), ``model`` and ``initialMessage`` (optional).
     A caller that still passes ``agent`` SHALL NOT be rejected; the value has
     no effect.
   * AC-2: On a successful create, the shared creation routine SHALL:

     a. create ``<actorsFolder>/<name>/`` with the verbatim ``name`` as
        folder name;
     b. write ``actor.yaml`` with ``name`` and ``summary``;
     c. write ``context.md`` containing ``# <name>`` followed by a blank
        line and the summary.

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
     tool SHALL return ``{ created: false, reason: "actor "<name>" already
     exists; no action taken", path: "<workspace-relative folder of the
     existing Actor or path>" }`` without modifying any file, enqueuing any
     message, or opening any session.
   * AC-8: If no workspace folder is open, the tool SHALL raise an error
     whose message begins with ``"jarvis_createActor: no workspace open"``,
     distinct from the ``"invalid actor name:"`` prefix.
   * AC-9: After a successful create (``created: true``), when
     ``jarvis.actors.openSessionOnCreate`` is ``true`` (``REQ_ACTOR_CREATE``
     AC-10), the tool SHALL show the new Actor's chat as a click on it does
     (``REQ_COM_OPEN`` AC-6). Errors from opening SHALL be logged at
     ``warn`` level and SHALL NOT make the tool fail.
   * AC-10: The tool SHALL validate ``summary`` before any filesystem
     operation. A missing value, an empty one or one of only white space SHALL
     raise an error ``"invalid actor summary: <reason>"``.
   * AC-11: When ``model`` is given, the tool SHALL check it against the
     language models available at that moment (the ``model`` values of
     ``jarvis_listModels``, ``REQ_AUT_LISTMODELS``) after the check of AC-7 and
     before any file is written or message is queued. A value that is not in
     the list, also when the list is empty, SHALL raise an error that starts
     with ``"model not available:"``, names the value and lists the available
     models. When the list cannot be obtained, the tool SHALL raise a different
     error that starts with ``"jarvis_createActor: model catalog not
     available"``. In both cases nothing is created or queued. When ``model``
     is not given, the tool SHALL NOT query the list, and the agent file gets
     no ``model`` line. A valid model goes to the agent as
     ``REQ_ACTOR_WHOAMI`` AC-14 says.

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

.. req:: Actor Session Initialization Prompt
   :id: REQ_ACTOR_INITPROMPT
   :status: approved
   :priority: required
   :links: US_ACTOR_ACTORS; US_COM_NAME; REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_WHOAMI

   **Description:**
   Every new chat created for an Actor SHALL receive an
   initialization prompt that names the Actor and its ``context.md`` and
   establishes the memory discipline, and SHALL be written to in the Actor's own
   agent.

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
   * AC-5: The prompt SHALL be sent only when Jarvis creates the chat of an
     Actor (``REQ_COM_CHATNAME`` AC-1), once per created chat. It SHALL NOT be
     re-sent to an existing chat.
   * AC-6: Before Jarvis creates the chat of an Actor, or opens it or delivers
     into it, it SHALL ensure the Actor's agent (``REQ_ACTOR_WHOAMI`` AC-4). The
     agent is carried by every text that Jarvis writes into the chat
     (``REQ_COM_INJECT`` AC-3). When the agent could not be ensured
     (``REQ_ACTOR_WHOAMI`` AC-5, AC-6), no agent is passed.
.. req:: Actor Node Context Menu
   :id: REQ_ACTOR_CONTEXTACTIONS
   :status: approved
   :priority: optional
   :links: US_ACTOR_CONTEXTACTIONS; REQ_ACTOR_TREE; REQ_COM_OPEN

   **Description:**
   Right-clicking an Actor node (``contextValue`` ``jarvisActor``) SHALL show
   actions for its chat, its folder, and its path.

   **Acceptance Criteria:**

   * AC-1: **Open** SHALL invoke ``jarvis.openActorSession``
     (``REQ_COM_OPEN``), identical to clicking the node.
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
     ``<filename>`` (the bare file name, no prefix) pointing at that file. Otherwise the
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
