Actor Identity Change User Test Requirements
============================================

.. req:: Actor Identity Test Data
   :id: REQ_UAT_ACTOR_IDENTITY
   :status: draft
   :links: US_UAT_ACTOR_IDENTITY

   **Acceptance Criteria:**

   * AC-1: A writable EDH workspace contains one existing Actor called
     ``LegacyIdentity`` with ``actor.yaml`` and ``context.md``. Its memory
     path is ``.jarvis/actors/LegacyIdentity/context.md``; the tester can
     open a fresh chat, compact it, and focus another editor (T-1..T-3).

.. req:: Actor Agent Test Data
   :id: REQ_UAT_ACTOR_AGENT
   :status: draft
   :links: US_UAT_ACTOR_AGENT

   **Acceptance Criteria:**

   * AC-1: ``LegacyIdentity/actor.yaml`` has ``agent: OtherPersona``;
     ``OtherPersona`` is not the Actor's name. The tester does not create
     an agent for ``LegacyIdentity`` manually (T-3, T-8).

.. req:: Tree Creation Test Data
   :id: REQ_UAT_ACTOR_CREATE
   :status: draft
   :links: US_UAT_ACTOR_CREATE

   **Acceptance Criteria:**

   * AC-1: Names ``NewIdentity`` and ``QuietIdentity`` are unused; the
     ACTORS tree is visible. The tester can toggle
     ``jarvis.actors.openSessionOnCreate`` between true and false (T-4, T-5).

.. req:: Tool Creation Test Data
   :id: REQ_UAT_ACTOR_CREATETOOL
   :status: draft
   :links: US_UAT_ACTOR_CREATETOOL

   **Acceptance Criteria:**

   * AC-1: ``ToolIdentity`` is unused. An Actor chat can invoke
     ``jarvis_createActor`` with name, summary, and legacy
     ``agent: OtherPersona`` input (T-6).

.. req:: Actor Listing Test Data
   :id: REQ_UAT_ACTOR_LISTTOOL
   :status: draft
   :links: US_UAT_ACTOR_LISTTOOL

   **Acceptance Criteria:**

   * AC-1: ``LegacyIdentity`` and one newly created Actor are available;
     ``jarvis_listActors`` is callable from an Actor chat (T-7).

.. req:: Agent File Tree Test Data
   :id: REQ_UAT_ACTOR_FILES_TREE
   :status: draft
   :links: US_UAT_ACTOR_FILES_TREE

   **Acceptance Criteria:**

   * AC-1: ``LegacyIdentity`` has been opened once; the ACTORS tree is
     refreshed and its Agent category can be expanded (T-8).