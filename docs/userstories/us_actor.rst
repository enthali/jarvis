Actor User Stories (One-Kind-Consolidation Phase 1)
====================================================

.. note::

   This file specifies the **new simple Actor** introduced in the
   one-kind-consolidation CR, Phase 1. The new Actor is built as a
   **parallel world**: it coexists with the legacy unified Entity system
   (``us_act.rst``) until Phase 2 removes the old stack.

   The new Actor is defined by three unique capabilities that distinguish it
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
   context and can actively interact, without the kind machinery
   (registration, multi-tree-root, kind-specific filters) of the legacy
   Entity system.

   The new Actor lives under ``jarvis.actors.folder`` (default
   ``.jarvis/actors/``, already a live setting) using the ``actor.yaml``
   convention. No new setting is introduced by these stories.

.. story:: The New Simple Actor
  :id: US_ACTOR_ACTORS
  :status: approved
  :priority: mandatory
  :links: US_EXP_SIDEBAR; US_MSG_CHATQUEUE; US_MSG_AUTODELIVERY; US_MSG_REMINDERS; US_AUT_HEARTBEAT

  **As a** Jarvis user,
  **I want** an Actor — a persona that can adopt a role — so that I can
  give a standing function or work context a durable identity and
  message addressability, without the kind machinery of the legacy Entity
  system.

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

   * AC-1: An Actor created through the new Actor command is stored as
     ``<actorsFolder>/<name>/actor.yaml`` (where ``actorsFolder`` is
     ``jarvis.actors.folder``, default ``.jarvis/actors/``; see
     US_ACT_DUALPATH_STORAGE AC-1). The folder name matches the input
     Actor name. Manually placed direct child folders with ``actor.yaml``
     remain discoverable even if their YAML names differ from their folder
     names; duplicate YAML names are a defensive collision case, not a
     supported creation workflow. The ``actor.yaml`` file contains
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
     for new Actors also use this kindless discovery, while the legacy
     Actor, Project, and Event paths remain available in parallel in Phase 1.
   * AC-6: The Actor exists independently of the legacy unified Entity
     system. The legacy ``.jarvis/sessions/`` convention (US_ACT_DUALPATH_STORAGE)
     is untouched; the new Actor is never written there.
   * AC-7: An Actor can be bound to an agent persona via the optional
     ``agent:`` field in ``actor.yaml``. The binding is optional and can
     be set or changed at any time; it does not affect the Actor's
     identity or memory.


.. story:: Dedicated ACTORS Tree
   :id: US_ACTOR_TREE
   :status: approved
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_ACTOR_ACTORS

   **As a** Jarvis user,
   **I want** a dedicated "ACTORS" tree in the Jarvis Explorer,
   **so that** I have one clearly separated place where all my new Actors
   live, without the unified-tree or kind-machinery underneath.

   **Acceptance Criteria:**

   * AC-1: The Jarvis Explorer shows a new top-level "ACTORS" tree,
     independent of the existing "Jarvis Entities" unified tree.
   * AC-2: The tree lists Actors only from direct child folders of
     ``jarvis.actors.folder`` containing ``actor.yaml``. It does not
     scan deeper subfolders or show grouping nodes.
   * AC-3: The leaf label is the Actor name from ``actor.yaml``; if the
     file is missing, unparseable, or its ``name:`` field is absent, the
     folder name is shown as fallback (same convention as US_EXP_SIDEBAR).
   * AC-4: Changing ``jarvis.actors.folder`` re-scans the new root
     automatically (US_CFG_PROJECTPATH AC-4).
   * AC-5: This tree exposes no kind categories, no kind filter, no
     per-kind settings UI, and no archive feature. Moving an Actor folder
     out of the root's direct children or deleting it is ordinary file
     management; such a folder is no longer discovered as an Actor.
   * AC-6: Clicking a leaf opens (or reuses) the Actor's chat session, the
     same way the existing tree opens session-kind leaves.
   * AC-7: The tree refreshes via the standard ``jarvis.rescan`` command
     and the periodic rescan job; both are extended to include the new
     scan root.
   * AC-8: The ACTORS tree is shown when ``jarvis.actors.folder`` is
     resolvable; if it cannot be resolved (no workspace, unset folder),
     the node is not shown.
   * AC-9: No new setting is introduced; the existing ``jarvis.actors.folder``
     is reused (US_ACT_DUALPATH_STORAGE AC-1 already defines its default
     as ``.jarvis/actors/``).


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

   * AC-1: Clicking the "+" button opens a "New Entry" QuickPick in the
     ACTORS tree. Its "Create Actor" choice opens a name input, reusing
     the same validation rules as the existing session-name input (no
     empty, no path characters, no Windows reserved names). The new tree
     does not offer Project or Event choices.
   * AC-2: The name is validated against all locations scanned under
     ``jarvis.actors.folder``; if a folder with that name already exists,
     an error is shown and nothing is created.
   * AC-3: A valid input creates ``<actorsFolder>/<name>``/ containing an
     ``actor.yaml`` (``name: <name>`` plus optional ``summary:`` and
     ``agent:``) and an empty ``context.md``.
   * AC-4: After creation, an agent binding QuickPick opens (Escape skips);
     the chosen agent name is written into the ``agent:`` field of
     ``actor.yaml``.
   * AC-5: The ACTORS tree refreshes to show the new Actor immediately,
     without a manual rescan.
   * AC-6: The legacy "New Entity" QuickPick (US_ENT_NEWENTITY) remains
     available with its legacy options in Phase 1. The ACTORS tree's
     "New Entry" QuickPick is a separate entry point for the new Actor
     convention. Phase 2 will remove the old tree entry point and retain
     the QuickPick in the ACTORS tree.
   * AC-7: This story creates new-convention files only
     (``.jarvis/actors/<name>/``); it does not touch ``.jarvis/sessions/``.


.. story:: Actor Identity Recovery (New)
   :id: US_ACTOR_WHOAMI
   :status: approved
   :priority: required
   :links: US_ACTOR_ACTORS

   **As a** new simple Actor operating in a chat session,
   **I want** a tool ``jarvis_whoAmI`` that tells me my own name and the
   absolute path to my ``context.md``,
   **so that** I can reliably recover my identity after ``/compact`` or
   context loss and resume my role by reading my persistent memory.

   **Acceptance Criteria:**

   * AC-1: Calling ``jarvis_whoAmI`` from a chat session bound to a new
     simple Actor (i.e. a session whose Actor folder exists under
     ``jarvis.actors.folder``) SHALL return the Actor's name and the
     absolute path to its ``context.md``.
   * AC-2: If the calling session is not bound to a discoverable Actor
     (no folder under ``jarvis.actors.folder``), the tool SHALL return an
     error instructing the session to ask the user to resolve its
     identity.
   * AC-3: The tool SHALL require no input parameters; the extension
     resolves the calling session's identity automatically.
   * AC-4: If the name matches more than one registered entity (legacy or
     new), the tool SHALL return an error rather than guess — a confused
     identity is worse than no identity.
   * AC-5: This tool reuses the existing ``jarvis_whoAmI`` implementation;
     the legacy US_ACT_WHOAMI and this story describe the same tool at two
     different lifecycle stages (Phase 1: both work in parallel; Phase 2:
     the legacy story is removed and this becomes the sole
     specification).
