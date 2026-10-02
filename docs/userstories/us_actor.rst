Actor User Stories
==================

.. note::

   The Actor is defined by three unique capabilities that distinguish it
   from a plain Agent persona:

   1. **Persistent context** — the Actor owns a ``context.md`` that accumulates
      memory across sessions; it is not reset when the chat session closes.
   2. **Message addressability** — heartbeat jobs and reminders can send the
      Actor messages without an open chat session; message delivery, not the
      sender, determines whether notification is automatic or manual.
   3. **Loose session binding** — the Actor is coupled to a chat session, but
      the coupling is loose: the session can be swapped without losing the
      Actor's identity or memory. The Actor outlives any single session.

   The goal: **a persona that can adopt a role** — it manages its own
   context and can actively interact, without kind registration, multiple
   tree roots, or kind-specific filters.

   The Actor lives under ``jarvis.actors.folder`` (default
   ``.jarvis/actors/``) using the ``actor.yaml`` convention. The only
   Actor-specific setting beyond the folder is
   ``jarvis.actors.openSessionOnCreate`` (US_ACTOR_CREATE AC-6).

.. story:: The Actor
  :id: US_ACTOR_ACTORS
  :status: approved
  :priority: mandatory
  :links: US_EXP_SIDEBAR; US_MSG_CHATQUEUE; US_MSG_AUTODELIVERY; US_MSG_REMINDERS; US_AUT_HEARTBEAT

  **As a** Jarvis user,
  **I want** an Actor — a persona that can adopt a role — so that I can
  give a standing function or work context a durable identity and
  message addressability.

   **Definition:** An Actor is an extension of an Agent. Its unique
   differentiators over a plain agent are:

   1. **Persistent context** — it owns a ``context.md`` file that is its
      durable memory; the file persists across sessions and is owned by the
      Actor, not by any single chat session.
   2. **Message addressability** — it can receive queued messages from a
      heartbeat job or reminder without an open chat session; the existing
      delivery preference governs whether notification is automatic or manual.
   3. **Loose session binding** — it is coupled to a chat session for
      interaction, but the coupling is loose: the session can be closed,
      restarted, or swapped without losing the Actor's identity or
      memory. The Actor outlives any single session.

   **Acceptance Criteria:**

   * AC-1: An Actor created by Jarvis (US_ACTOR_CREATE, US_ACTOR_CREATETOOL)
     is stored as ``<actorsFolder>/<name>/actor.yaml`` (where
     ``actorsFolder`` is ``jarvis.actors.folder``, default
     ``.jarvis/actors/``). The folder name matches the input
     Actor name. Manually placed direct child folders with ``actor.yaml``
     remain discoverable even if their YAML names differ from their folder
     names. Actor names are unique: Jarvis never creates a second Actor
     with a name already in use. A duplicate can only arise from a manual
     ``actor.yaml`` edit; it is a misconfiguration, Jarvis does not act on
     that name, and sending a message to it fails with an error the user
     sees. The ``actor.yaml`` file contains
     ``name`` (required) and ``summary`` (optional), and optionally
     ``agent:`` to bind the Actor to a specific agent persona.
   * AC-2: The Actor's ``context.md`` is its persistent memory. It is
     read and written by the Actor itself (via the agent running in its
     session) and is never mutated by any other mechanism. The file is
     never auto-migrated or auto-renamed.
   * AC-3: A heartbeat job (``jarvis_registerJob``) or reminder
     (``jarvis_setReminder``) addressed to the Actor queues a message without
     requiring an open chat session. Neither sender activates a session or
     overrides its delivery preference; the message-delivery mechanism alone
     determines automatic versus manual notification. When the user or the
     existing message-delivery workflow later opens the session, the Actor
     can resume from its ``context.md``.
   * AC-4: The Actor's chat session is a regular VS Code chat session.
     Closing, restarting, or swapping the session does not destroy the
     Actor; its identity (name, folder, ``context.md``) is fully
     recoverable from the file system alone.
   * AC-5: The Actor does not require any kind registration, kind-driven
     scanner, or multi-tree-root infrastructure. It is discovered only
     as a direct child folder of ``jarvis.actors.folder`` (US_ACTOR_TREE
     AC-2); deeper subfolders are not scanned for Actors. Listing,
     identity recovery, and heartbeat/reminder destination resolution
     also use this kindless discovery.
   * AC-6: An Actor can be bound to an agent persona via the optional
     ``agent:`` field in ``actor.yaml``. The binding is optional and can
     be set or changed at any time; it does not affect the Actor's
     identity or memory.
   * AC-7: When a new chat session is opened for an Actor, it receives an
     initialization prompt naming the Actor and its ``context.md`` and asking
     it to keep that memory lean and action-oriented; the session opens in
     the Actor's bound agent mode. The user can replace the prompt via
     ``jarvis.agentSession.initPromptTemplate``.


.. story:: Dedicated ACTORS Tree
   :id: US_ACTOR_TREE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_ACTOR_ACTORS

   **As a** Jarvis user,
   **I want** a dedicated "ACTORS" tree in the Jarvis Explorer,
   **so that** I have one clearly separated place where all my Actors
   live.

   **Acceptance Criteria:**

   * AC-1: The Jarvis Explorer shows a top-level ACTORS tree whose title
     reads "<workspace name> Actors".
   * AC-2: The tree lists Actors only from direct child folders of
     ``jarvis.actors.folder`` containing ``actor.yaml``. It does not
     scan deeper subfolders or show grouping nodes.
   * AC-3: The leaf label is the Actor name from ``actor.yaml``; if the
     file is missing, unparseable, or its ``name:`` field is absent, the
     folder name is shown as fallback.
   * AC-4: Changing ``jarvis.actors.folder`` re-scans the new root
     automatically.
   * AC-5: This tree exposes no kind categories, no kind filter, no
     per-kind settings UI, and no archive feature. Moving an Actor folder
     out of the root's direct children or deleting it is ordinary file
     management; such a folder is no longer discovered as an Actor.
   * AC-6: Clicking a leaf opens (or reuses) the Actor's chat session.
   * AC-7: The tree refreshes via the standard ``jarvis.rescan`` command
     and a periodic background rescan every ``jarvis.scanInterval``
     minutes (default: 2; 0 disables automatic scanning). The background
     rescan is internal to Jarvis and does not appear as a heartbeat job.
   * AC-8: The ACTORS tree is shown when ``jarvis.actors.folder`` is
     resolvable; if it cannot be resolved (no workspace, unset folder),
     the node is not shown.
   * AC-9: This tree introduces no new setting; the existing
     ``jarvis.actors.folder`` is reused, with its default ``.jarvis/actors/``.
   * AC-10: Actors are sorted alphabetically by their displayed name,
     case-insensitive.
   * AC-11: A refresh button in the ACTORS title bar triggers
     ``jarvis.rescan``, so I can force an immediate rescan (e.g. while
     testing) instead of waiting for the periodic one.
   * AC-12: After I edit an Actor's ``actor.yaml`` (e.g. its ``name:``), the
     tree shows the new value after the next scan.
   * AC-13: A "Collapse All" button in the ACTORS title bar collapses every
     expanded Actor node and its file categories (US_ACTOR_FILES_TREE) in one
     click. It only changes what is expanded: no node is removed, reordered,
     or reloaded, and no click action fires.


.. story:: Create an Actor from the ACTORS Tree
   :id: US_ACTOR_CREATE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_TREE; US_ACTOR_ACTORS

   **As a** Jarvis user,
   **I want** a single "+" button in the ACTORS tree title bar,
   **so that** I can create a new Actor — folder, ``actor.yaml``,
   ``context.md``, and optional agent binding — in one step.

   **Acceptance Criteria:**

   * AC-1: Clicking the "+" button opens a name input directly, that
     rejects empty names, path characters, and Windows reserved names.
   * AC-2: The name is validated against all locations scanned under
     ``jarvis.actors.folder``; if a folder with that name already exists,
     or an Actor with that name exists in any folder, an error is shown and
     nothing is created.
   * AC-3: A valid name is followed by an optional summary input (Escape
     skips). The Actor is then created as ``<actorsFolder>/<name>/``
     containing an ``actor.yaml`` (``name: <name>`` plus optional
     ``summary:`` and ``agent:``) and a ``context.md`` pre-filled with the
     Actor name as heading, followed by the summary if one was given.
   * AC-4: After creation, an agent binding QuickPick opens (Escape skips);
     the chosen agent name is written into the ``agent:`` field of
     ``actor.yaml``.
   * AC-5: The ACTORS tree refreshes to show the new Actor immediately,
     without a manual rescan.
   * AC-6: After a new Actor is created, its chat session opens when the
     setting ``jarvis.actors.openSessionOnCreate`` is enabled (default:
     enabled). The setting's description explains the trade-off: opening
     directly lets me start working with the new Actor right away; turning
     it off keeps the current chat in focus, e.g. when creating several
     Actors in a row.


.. story:: Actor Identity Recovery
   :id: US_ACTOR_WHOAMI
   :status: approved
   :priority: required
   :links: US_ACTOR_ACTORS

   **As an** Actor operating in a chat session,
   **I want** a tool ``jarvis_whoAmI`` that tells me my own name and the
   absolute path to my ``context.md``,
   **so that** I can reliably recover my identity after ``/compact`` or
   context loss and resume my role by reading my persistent memory.

   **Acceptance Criteria:**

   * AC-1: Calling ``jarvis_whoAmI`` from a chat session bound to an Actor
     (i.e. a session whose Actor folder exists under
     ``jarvis.actors.folder``) SHALL return the Actor's name and the
     absolute path to its ``context.md``.
   * AC-2: If the calling session is not bound to a discoverable Actor
     (no folder under ``jarvis.actors.folder``), the tool SHALL return an
     error instructing the session to ask the user to resolve its
     identity.
   * AC-3: The tool SHALL require no input parameters; the extension
     resolves the calling session's identity automatically.
   * AC-4: If the name matches more than one Actor, the tool SHALL return
     an error rather than guess — a confused identity is worse than no
     identity.
   * AC-5: The answer SHALL depend only on which session asked, not on which
     editor tab, file, or panel is focused. Repeated calls from one unchanged
     session SHALL return the same Actor, so I can trust the answer without
     checking where the user's cursor is.
   * AC-6: If the extension cannot determine which session asked, it SHALL
     say so and ask the user rather than return a guess — a confidently
     wrong identity would make me adopt another Actor's memory.


.. story:: Programmatic Actor Creation
   :id: US_ACTOR_CREATETOOL
   :status: approved
   :priority: required
   :links: US_ACTOR_ACTORS; US_ACTOR_CREATE

   **As an** Actor working in a chat session,
   **I want** to create another Actor by tool call,
   **so that** I can set up follow-up roles or work contexts myself without
   the user clicking through the ACTORS tree.

   **Acceptance Criteria:**

   * AC-1: ``jarvis_createActor`` is available as LM and MCP tool whenever
     ``jarvis.actors.folder`` is resolvable (same condition as
     US_ACTOR_TREE AC-8); no other setting gates it.
   * AC-2: A successful call creates ``<actorsFolder>/<name>/`` with the
     same files as US_ACTOR_CREATE AC-3: ``actor.yaml`` (``name``, optional
     ``summary``, optional ``agent``) and the pre-filled ``context.md``.
   * AC-3: An unknown ``agent`` is rejected with an error listing the
     available agents.
   * AC-4: Invalid names are rejected with the same rules as
     US_ACTOR_CREATE AC-1.
   * AC-5: If the Actor already exists (a folder with that name, or an
     Actor with that name in any folder), nothing is created, overwritten,
     queued, or opened; the result says ``created: false``.
   * AC-6: An optional ``initialMessage`` is queued for the new Actor.
   * AC-7: The ACTORS tree shows the new Actor without a manual rescan.
   * AC-8: After creating a new Actor, the tool opens its chat session
     under the same ``jarvis.actors.openSessionOnCreate`` setting as
     US_ACTOR_CREATE AC-6.


.. story:: List Actors Programmatically
   :id: US_ACTOR_LISTTOOL
   :status: approved
   :priority: required
   :links: US_ACTOR_ACTORS; US_ACTOR_TREE

   **As an** Actor working in a chat session,
   **I want** a tool that lists all Actors,
   **so that** I can find the Actors I can message or coordinate with without
   asking the user.

   **Acceptance Criteria:**

   * AC-1: ``jarvis_listActors`` is available as LM and MCP tool whenever
     ``jarvis.actors.folder`` is resolvable (same condition as
     US_ACTOR_TREE AC-8).
   * AC-2: The tool returns every Actor shown in the ACTORS tree
     (US_ACTOR_TREE AC-2), each with ``name``, ``summary`` and ``agent``
     (empty string if absent), ``folder``, and ``id`` (absolute path of its
     ``actor.yaml``).
   * AC-3: The tool requires no input parameters.
   * AC-4: It is distinct from ``jarvis_listChatSessions``, which lists VS Code
     chat tab titles.


.. story:: Activity Indicator on Actor Nodes
   :id: US_ACTOR_ACTIVITY
   :status: approved
   :priority: optional
   :links: US_ACTOR_TREE

   **As a** Jarvis User,
   **I want** every Actor node in the ACTORS tree to show whether an agent is
   currently working in that Actor's chat session,
   **so that** I can tell at a glance which Actors have something happening
   right now, without opening every chat tab to check.

   **Acceptance Criteria:**

   * AC-1: Every Actor node shows one of exactly two visual states: **Active**
     while an agent turn is running in the Actor's session, or **Inactive**
     otherwise.
   * AC-2: An Actor becomes Active when agent activity starts in its session
     (a session starts, a prompt is submitted, a tool runs, the session is
     compacted, or a subagent runs), and Inactive when the agent turn ends.
   * AC-3: An Actor with no observed activity yet (e.g. just after workspace
     open) is Inactive.
   * AC-4: There is no third "error" or "unknown" state and no timeout-based
     transition — the indicator only changes on the activity in AC-2.
   * AC-5: The indicator is a visual cue only — it does not gate or block any
     Actor-node behavior (click-to-chat, context menu, file children).
   * AC-6: Which runtime signals report this activity is specified at L1/L2;
     replacing the signal source does not change this story.


.. story:: Context Actions on Actor Nodes
   :id: US_ACTOR_CONTEXTACTIONS
   :status: approved
   :priority: optional
   :links: US_ACTOR_TREE

   **As a** Jarvis User,
   **I want** context menu actions on Actor nodes in the ACTORS tree,
   **so that** I can quickly reach the Actor's folder in the editor, the OS
   file manager, or an integrated terminal, or copy its path.

   **Acceptance Criteria:**

   * AC-1: Right-clicking an Actor node shows "Open", which opens the Actor's
     chat session exactly like clicking the node (US_ACTOR_TREE AC-6).
   * AC-2: Right-clicking an Actor node shows "Reveal in Explorer", "Reveal in
     File Explorer", and "Open in Terminal".
   * AC-3: Right-clicking an Actor node also shows "Copy Path" and "Copy Full
     Path"; both copy the absolute path of the Actor's folder.
   * AC-4: Each action delegates to the corresponding built-in VS Code
     command; no custom file-system logic is needed.


.. story:: Actor File Children in the ACTORS Tree
   :id: US_ACTOR_FILES_TREE
   :status: approved
   :priority: mandatory
   :links: US_ACTOR_TREE; US_ACTOR_ACTORS

   **As a** Jarvis User,
   **I want** each Actor node in the ACTORS tree to expand into an "Agent"
   category (when an agent is bound) and a "Files" category showing every
   file actually present in the Actor's own folder, recursively,
   **so that** I can browse and open any file that belongs to that Actor
   directly from the tree, without leaving it, and without the list being
   artificially limited to a fixed set of "known" files.

   **Acceptance Criteria:**

   * AC-1: Every Actor node is expandable and shows up to two category child
     nodes, each independently collapsible:

     a. **"Agent"** — shown only when the Actor's ``agent`` field is set AND
        it resolves to an existing agent file. Contains exactly one synthetic
        child, labelled ``Agent File: <filename>``, pointing at the resolved
        ``.github/agents/<file>.agent.md``.
     b. **"Files"** — always shown (every Actor has at least its own
        ``actor.yaml``). Contains a live, recursive listing of every file and
        subfolder actually present in the Actor's own folder, sorted
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
     consistent with existing file placement (``US_MSG_EDITORPLACEMENT``).
   * AC-5: Each file/folder child shows a tooltip with its full filesystem
     path.
   * AC-6: Right-clicking a file child shows "Open" (same as clicking it),
     "Copy Path", "Copy Full Path", and "Copy File Name" (the bare file
     name, no path).
   * AC-7: The Files category's listing updates when files are added to or
     removed from the Actor's own folder or any of its subfolders —
     eventually consistent within the existing scan interval (or immediately
     after a manual rescan, US_ACTOR_TREE AC-11), not instantaneous.
   * AC-8: This is additive at the Actor-node level — the node click behavior
     (open the Actor's chat session) is unchanged. ``actor.yaml`` and
     ``context.md`` are opened from the Files category; the Actor node has no
     inline open buttons.


.. story:: Recently Touched Files per Actor
   :id: US_ACTOR_TOUCHEDFILES
   :status: approved
   :priority: optional
   :links: US_ACTOR_FILES_TREE; US_ACTOR_TREE

   *Context: this story answers "what files has the agent actually read or
   written while working as this Actor" — visibility a user otherwise only
   gets by manually checking git status or the file explorer. How Jarvis
   learns about the agent's reads and writes is specified at L1/L2.
   Every automatic rule here governs what is displayed, not what was
   recorded: automatic rules are reversible, and every irreversible one is
   asked for.*

   **As a** Jarvis User,
   **I want** each Actor node in the ACTORS tree to show a "Recently Touched
   Files" subtree listing files the agent has read or written while working
   in that Actor's bound session,
   **so that** I can see at a glance what the agent actually touched,
   without digging through transcripts or git status.

   **Acceptance Criteria:**

   * AC-1: A "Recently Touched Files" category node appears under each Actor
     node, alongside the "Agent"/"Files" categories (US_ACTOR_FILES_TREE) —
     a third, independent, collapsible category, not nested inside "Files".
   * AC-2: The subtree is hierarchical and **workspace-root-relative** — not
     scoped to the Actor's own folder, since the agent can touch files
     anywhere in the workspace. Empty intermediate folder branches are pruned
     (only branches that lead to at least one touched file are shown).
   * AC-3: A file is added to the list the first time the agent reads or
     writes it during a session bound to that Actor; the entry records
     last-read and/or last-edited timestamps and is shown in a tooltip (no
     separate child node per timestamp).
   * AC-4: The list persists across VS Code reloads (stored outside the
     Actor's own folder, so it never collides with or pollutes the "Files"
     category from US_ACTOR_FILES_TREE).
   * AC-5: Clicking a touched-file entry opens it the same way as the Actor's
     own "Files" category entries (Markdown Preview for ``.md``, VS Code
     preview-mode tab otherwise, Docs column).
   * AC-6: A right-click diff view lets the user compare the touched file's
     current content against its last-known-good (source control) version,
     when available.
   * AC-7: Right-click Copy Path / Copy Full Path / Reveal in Explorer are
     available on every touched-file entry.
   * AC-8: An inline trash icon removes entries from the list immediately.
     It is available on a single entry, on a folder branch (removing every
     entry below it), and on the "Recently Touched Files" category itself
     (removing every entry recorded for that Actor). Removal always covers
     everything recorded below the node it sits on, including entries not
     currently displayed (no separate "dismissed" state; a file reappears if
     touched again).
   * AC-9: This is additive — it does not change the Actor node's behavior,
     the "Agent"/"Files" categories, or the activity indicator
     (US_ACTOR_ACTIVITY).
   * AC-10: A file that is *known* not to exist is not shown — every action
     the list offers (open, diff, reveal) assumes the file is there. It is
     not removed: absence is a state, not an event. A file missing on one git
     branch is back after switching to another, and its touch history is
     still true. Where existence cannot be established, AC-15 applies
     instead.
   * AC-11: The list shows only files touched within a user-configurable
     window, measured in days back from now against the most recent touch of
     any kind (read or write). The window is a rolling period, not a
     calendar-day boundary, so it does not cut off work in progress at
     midnight. The default is 0, meaning no limit. A changed window takes
     effect without restarting VS Code.
   * AC-12: No entry is ever removed automatically. The window (AC-11) and
     the existence check (AC-10) govern display only — widening the window,
     or switching back to the branch that has the file, brings entries back
     unchanged.
   * AC-13: A dedicated action on the "Recently Touched Files" category
     removes the entries whose files no longer exist, and afterwards reports
     how many were removed — they accumulated unseen, so a silent run would
     give the user nothing to go on. If every entry of an Actor is currently
     hidden, the next file the agent touches brings back category and action
     together.
   * AC-14: No removal is permanent — any file the agent touches again
     reappears in the list.
   * AC-15: Uncertainty is not evidence of absence. Where Jarvis cannot
     establish whether a file exists, the entry remains persisted and the
     cleanup action (AC-13) does not remove it, but it is not shown. Display
     requires a file Jarvis can address; removal requires proof that no file
     exists. An undetermined entry remains dormant until a later touch
     records enough information to resolve it. History recorded without its
     root stays permanently undetermined and hidden rather than being
     destroyed by a repair.
   * AC-16: The list addresses files the way the editor addresses them. Open,
     diff and reveal behave in a remote workspace — WSL, SSH, dev container —
     exactly as they do locally.
