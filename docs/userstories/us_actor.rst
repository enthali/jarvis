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
   3. **Loose chat binding** — the Actor is coupled to a chat, but
      the coupling is loose: the chat can be swapped without losing the
      Actor's identity or memory. The Actor outlives any single chat.

   The goal: **a persona that can adopt a role** — it manages its own
   context and can actively interact, without kind registration, multiple
   tree roots, or kind-specific filters.

   Where Actors are kept and how the chat of a new Actor opens on creation are
   specified in ``US_ACTOR_TREE`` and ``US_ACTOR_CREATE`` (AC-6).

.. story:: The Actor
  :id: US_ACTOR_ACTORS
  :status: approved
  :tracked_by: MOD_ACTOR
  :priority: mandatory
  :links: US_EXP_SIDEBAR; US_COM_SEND; US_COM_DELIVERY; US_MSG_REMINDERS; US_AUT_HEARTBEAT

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
   3. **Loose chat binding** — it is coupled to a chat for
      interaction, but the coupling is loose: the chat can be closed,
      restarted, or swapped without losing the Actor's identity or
      memory. The Actor outlives any single chat.

   **Acceptance Criteria:**

   * AC-1: An Actor created by Jarvis (US_ACTOR_CREATE, US_ACTOR_CREATETOOL)
     has a name that is unique: Jarvis never creates a second Actor with a name
     already in use. An Actor that I set up by hand is found as well. Two
     Actors with the same
     name are a misconfiguration: Jarvis does not act on that name, and a
     message to it fails with an error that I see. An Actor has a name and
     optionally a short description.
   * AC-2: The Actor's memory is read and written by the Actor itself. Nothing
     else changes it, and Jarvis never moves or renames it automatically.
   * AC-3: A heartbeat job or a reminder addressed to the Actor queues a message
     without requiring an open chat. Neither of them opens a chat or overrides
     the Actor's delivery preference; the message delivery alone decides
     between automatic and manual notification. When the user or the delivery
     later opens the chat, the Actor can resume from its memory.
   * AC-4: The Actor's chat is a regular chat.
     Closing, restarting, or swapping the chat does not destroy the
     Actor; its identity (name and memory) survives and can be recovered
     without the chat.
   * AC-5: My Actors are found as soon as I place them where Jarvis looks for
     Actors; an Actor placed anywhere else is not found. Listing, the Actor's
     identity (``US_ACTOR_WHOAMI``), and the destination of heartbeat jobs and
     reminders all agree on which Actors exist.
   * AC-6: Every Actor, including those that existed before, is recognisable in
     its chat as that Actor and behaves as it, without any action by me
     (``US_ACTOR_WHOAMI``). The persona it adopts is not chosen in Jarvis: the
     Actor's memory refers to it, and several Actors may share one persona.
   * AC-7: A new chat for an Actor starts informed: the Actor knows who it is and
     where its memory is, and is asked to keep that memory lean and
     action-oriented. I can change how a new chat is introduced.


.. story:: Dedicated ACTORS Tree
   :id: US_ACTOR_TREE
   :status: approved
   :tracked_by: MOD_ACTOR
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
   :tracked_by: MOD_ACTOR
   :priority: mandatory
   :links: US_ACTOR_TREE; US_ACTOR_ACTORS

   **As a** Jarvis user,
   **I want** a single "+" button in the ACTORS tree title bar,
   **so that** I can create a new Actor — folder, ``actor.yaml``,
   ``context.md``, and its own agent — in one step.

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
     ``summary:``) and a ``context.md`` pre-filled with the
     Actor name as heading, followed by the summary if one was given.
   * AC-4: No agent is picked. The new Actor has its own agent
     (``US_ACTOR_ACTORS`` AC-6).
   * AC-5: The ACTORS tree refreshes to show the new Actor immediately,
     without a manual rescan.
   * AC-6: After a new Actor is created, its chat session opens when the
     setting ``jarvis.actors.openSessionOnCreate`` is enabled (default:
     enabled). The setting's description explains the trade-off: opening
     directly lets me start working with the new Actor right away; turning
     it off keeps the current chat in focus, e.g. when creating several
     Actors in a row.


.. story:: Actor Identity
   :id: US_ACTOR_WHOAMI
   :status: approved
   :tracked_by: MOD_ACTOR
   :priority: required
   :links: US_ACTOR_ACTORS

   **As a** Jarvis Actor operating in a chat session,
   **I want** to know my own name and where my ``context.md`` lives in every
   session,
   **so that** I can resume my role from my persistent memory without asking
   the user and without calling a tool.

   **Acceptance Criteria:**

   * AC-1: A session of an Actor knows the Actor's name and the
     workspace-relative path of its ``context.md`` from the first request
     on, without a tool call.
   * AC-2: This also holds after the conversation was compacted. Whether the
     content of ``context.md`` is remembered afterwards is not part of this
     story; it remains subject to Copilot's compaction behaviour.
   * AC-3: Every Actor has this identity without any action by the user,
     including Actors that existed before this feature.
   * AC-4: The identity depends only on the Actor, never on which editor
     tab, file, or panel is focused, so I can trust it without checking
     where the user's cursor is.


.. story:: Programmatic Actor Creation
   :id: US_ACTOR_CREATETOOL
   :status: approved
   :tracked_by: MOD_ACTOR
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
     ``summary``) and the pre-filled ``context.md``; the new Actor has its
     own agent as in US_ACTOR_CREATE AC-4.
   * AC-3: The tool has no ``agent`` input. A caller that still passes one
     is not rejected; the value has no effect.
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


.. story:: Activity Indicator on Actor Nodes
   :id: US_ACTOR_ACTIVITY
   :status: approved
   :tracked_by: MOD_ACTOR
   :priority: optional
   :links: US_ACTOR_TREE

   **As a** Jarvis User,
   **I want** every Actor node in the ACTORS tree to show whether the Actor is
   working, waiting for me or in error,
   **so that** I can tell at a glance which Actors have something happening
   right now, without opening every chat tab to check.

   **Acceptance Criteria:**

   * AC-1: The indicator has four states: **Error**, **Waiting**, **Working** and
     **Idle**. An Idle Actor shows no activity indicator.
   * AC-2: An Actor is **Working** while its chat is processing a request. It is
     **Waiting** while its chat needs a confirmation or an answer from me. It is
     in **Error** when the last request of its chat ended with an error, until the
     next request of that chat runs. Otherwise it is **Idle**.
   * AC-3: When several states apply, Error is shown before Waiting, and
     Waiting before Working. An Actor without a chat, or whose state is not
     known, is Idle.
   * AC-4: The other icons of an Actor node are not activity states: the
     recording mark (``US_REC_CAPTURE`` AC-2) and the unread-mail icon
     (``US_ACTOR_MAIL``) keep their own rules, and ``US_ACTOR_MAIL`` AC-4 orders
     them against this indicator.
   * AC-5: The indicator is a visual cue only — it does not gate or block any
     Actor-node behavior (click-to-chat, context menu, file children).


.. story:: Unread Mail Icon on Actor Nodes
   :id: US_ACTOR_MAIL
   :status: approved
   :tracked_by: MOD_ACTOR
   :priority: optional
   :links: US_ACTOR_TREE; US_ACTOR_ACTIVITY; US_REC_CAPTURE

   **As a** Jarvis User,
   **I want** an Actor node in the ACTORS tree to show a mail icon while the Outlook mail
   folder of the same name, directly under my Inbox, holds unread mail,
   **so that** I can see which Actors have unread email without leaving VS Code.

   **Acceptance Criteria:**

   * AC-1: When the mail integration is enabled, an Actor node shows a mail icon
     in front of its name while the mail folder with the Actor's name, directly
     under my Inbox, holds at least one unread mail.
   * AC-2: An Actor without such a folder, or whose folder has no unread mail, shows no mail
     icon. A folder nested deeper in the Inbox does not count.
   * AC-3: The icon is as current as the last refresh of the Actor list (the
     regular and the manual refresh). It does not change live when mail arrives
     or is read.
   * AC-4: An Actor node shows at most one icon at a time, by this priority: activity state
     (error, waiting or working) before recording (red dot) before unread mail (mail icon). When an icon of a
     higher priority ends, the next one still present is shown; when none is present, the node
     shows no icon.
   * AC-5: The feature only reads Outlook. It never marks mail as read or unread, never moves,
     changes or sends mail, and never changes a folder.
   * AC-6: When Outlook cannot be read (for example because it is not running), no Actor shows
     a mail icon and no error message is shown.
   * AC-7: The mail icon does not change anything else on the Actor node.


.. story:: Context Actions on Actor Nodes
   :id: US_ACTOR_CONTEXTACTIONS
   :status: approved
   :tracked_by: MOD_ACTOR
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
   :tracked_by: MOD_ACTOR
   :priority: mandatory
   :links: US_ACTOR_TREE; US_ACTOR_ACTORS

   **As a** Jarvis User,
   **I want** each Actor node in the ACTORS tree to expand into an "Agent"
   category (when the Actor's own agent is found by the Actor name) and a "Files" category showing every
   file actually present in the Actor's own folder, recursively,
   **so that** I can browse and open any file that belongs to that Actor
   directly from the tree, without leaving it, and without the list being
   artificially limited to a fixed set of "known" files.

   **Acceptance Criteria:**

   * AC-1: Every Actor node is expandable and shows up to two category child
     nodes, each independently collapsible:

     a. **"Agent"** — shown only when the Actor's own agent is found by
        the Actor name
        (``US_ACTOR_ACTORS`` AC-6). Contains exactly one synthetic
        child, labelled ``Agent File: <filename>``, pointing at that
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
