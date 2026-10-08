Actor Identity Change User Acceptance Tests
===========================================

.. story:: Actor Identity User Test
   :id: US_UAT_ACTOR_IDENTITY
   :status: draft
   :priority: required
   :links: US_ACTOR_WHOAMI

   **As a** Jarvis user, **I want** to check identity in a fresh and a
   compacted Actor chat, **so that** I can trust it without a lookup.

   **Acceptance Criteria:**

   * AC-1: A new Actor session identifies its name and workspace-relative
     memory path before using a tool, with a different editor focused (T-1).
   * AC-2: The same identity is available after chat compaction (T-2).
   * AC-3: An Actor created before the change identifies itself without
     manually updating its configuration (T-3).
   * AC-4: The obsolete identity tool is no longer offered in chat (T-10).

.. story:: Actor Agent User Test
   :id: US_UAT_ACTOR_AGENT
   :status: draft
   :priority: required
   :links: US_ACTOR_ACTORS

   **As a** Jarvis user, **I want** existing Actors to gain their own agent
   without choosing a persona, **so that** they continue working (T-3, T-4).

   **Acceptance Criteria:**

   * AC-1: An existing Actor opens in its own agent even if its old
     ``actor.yaml`` names a different agent (T-3).
   * AC-2: A new Actor uses its own agent without a persona selection (T-4).

.. story:: Create Actor User Test
   :id: US_UAT_ACTOR_CREATE
   :status: draft
   :priority: required
   :links: US_ACTOR_CREATE

   **As a** Jarvis user, **I want** creation from the ACTORS tree to ask only
   for name and optional summary, **so that** I can create an Actor directly.

   **Acceptance Criteria:**

   * AC-1: Creation has no agent picker and the new Actor opens in its own
     agent (T-4).
   * AC-2: Creation with automatic session opening disabled still prepares
     the Actor for its first open (T-5).

.. story:: Create Actor Tool User Test
   :id: US_UAT_ACTOR_CREATETOOL
   :status: draft
   :priority: required
   :links: US_ACTOR_CREATETOOL

   **As an** Actor, **I want** to create another Actor with a name and
   summary, **so that** a legacy persona hint does not change its identity.

   **Acceptance Criteria:**

   * AC-1: Tool creation with an old ``agent`` input succeeds and produces
     an Actor with its own agent, not the suggested persona (T-6).

.. story:: List Actor Tool User Test
   :id: US_UAT_ACTOR_LISTTOOL
   :status: draft
   :priority: required
   :links: US_ACTOR_LISTTOOL

   **As an** Actor, **I want** the Actor list to identify each Actor's own
   agent, **so that** I can address the right participant.

   **Acceptance Criteria:**

   * AC-1: Listing existing and new Actors reports their own names as
     agents, irrespective of an old ``agent:`` value (T-7).

.. story:: Actor Agent File User Test
   :id: US_UAT_ACTOR_FILES_TREE
   :status: draft
   :priority: required
   :links: US_ACTOR_FILES_TREE

   **As a** Jarvis user, **I want** to browse each Actor's own agent file
   from the tree, **so that** I can inspect its identity (T-8).

   **Acceptance Criteria:**

   * AC-1: An Actor's Agent category points at its own named agent file,
     not the agent mentioned in legacy metadata (T-8).