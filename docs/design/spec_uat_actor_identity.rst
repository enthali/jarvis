Actor Identity Change User Test Scenarios
=========================================

All scenarios are design only; execution results live in the change Test
Protocol. Use a disposable Extension Development Host (EDH) on
``feature/actor-identity-via-agent-file`` with a writable workspace and
``packages/core`` enabled. Configure
``jarvis.actors.folder`` to ``.jarvis/actors``. Before starting, create
``.jarvis/actors/LegacyIdentity/actor.yaml`` with ``name: LegacyIdentity``,
``summary: Existing actor`` and ``agent: OtherPersona``, and create its
``context.md`` with ``# LegacyIdentity``. Do not manually create an agent
for it. Keep ``NewIdentity``, ``QuietIdentity`` and ``ToolIdentity`` unused.
Use a workspace without agent hooks, as in the user's current VS Code setup.
If the EDH cannot disable hooks or expose chat compaction, record that
precondition as BLOCKED rather than claiming those properties were tested.
Do not use ``jarvis_whoAmI`` to establish identity. Module integration,
compilation, and package checks are outside User UAT.

.. spec:: Actor Identity User Outcomes
   :id: SPEC_UAT_ACTOR_IDENTITY
   :status: draft
   :links: REQ_UAT_ACTOR_IDENTITY

   * T-1 (US_ACTOR_WHOAMI AC-1, AC-4): Open ``LegacyIdentity`` from the
     ACTORS tree. Focus an unrelated file editor; in the new Actor chat,
     ask "What is your Actor name and workspace-relative context.md path?
     Answer without calling tools." Expect ``LegacyIdentity`` and
     ``.jarvis/actors/LegacyIdentity/context.md`` in the first answer,
     with no tool call or request to identify the active tab.
   * T-2 (US_ACTOR_WHOAMI AC-2): In that chat, add enough conversation
     for VS Code's chat compaction action to be available, then invoke it.
     Ask the same question as T-1 without tools. Expect the same name and
     relative path. Do not judge whether the memory contents survived
     compaction; if no compaction control is available, mark BLOCKED.
   * T-3 (US_ACTOR_WHOAMI AC-3; US_ACTOR_ACTORS AC-6): With the existing
     ``LegacyIdentity`` fixture and no manual agent setup, open its chat
     after EDH activation. Expect the selected chat agent to be
     ``LegacyIdentity``, not ``OtherPersona``, and the first reply to
     identify the Actor as in T-1. No edit to ``actor.yaml`` is required.
   * T-10 (US_ACTOR_WHOAMI AC-1; REQ_ACTOR_WHOAMI AC-10): Open the Actor
     chat's available-tools picker and search for ``jarvis_whoAmI``.
     Expect no offered tool of that name. The identity request in T-1
     still succeeds without it.

.. spec:: Actor Agent User Outcomes
   :id: SPEC_UAT_ACTOR_AGENT
   :status: draft
   :links: REQ_UAT_ACTOR_AGENT

   T-3 and T-4 exercise US_ACTOR_ACTORS AC-6: the existing Actor uses
   its own agent despite legacy ``agent:``, and the newly created Actor
   uses its own agent without a persona selection.

.. spec:: Tree Creation User Outcomes
   :id: SPEC_UAT_ACTOR_CREATE
   :status: draft
   :links: REQ_UAT_ACTOR_CREATE

   * T-4 (US_ACTOR_CREATE AC-3, AC-4, AC-6): Enable
     ``jarvis.actors.openSessionOnCreate``. Click + on the ACTORS tree;
     enter ``NewIdentity`` and summary ``New role``. Expect only those
     two inputs, no agent picker; the tree shows ``NewIdentity``, its
     chat opens in the ``NewIdentity`` agent, and its folder contains
     ``actor.yaml`` and ``context.md`` with the supplied values.
   * T-5 (US_ACTOR_CREATE AC-4, AC-6): Disable
     ``jarvis.actors.openSessionOnCreate``. Create ``QuietIdentity``
     using + and skip the summary input. Expect no automatic chat open
     and no agent picker. Click the new tree item to open its chat;
     expect the selected mode ``QuietIdentity`` and an identity reply
     without tool calls. If the new mode command is not registered in
     the EDH after the implementation's 3 s wait, record the visible
     failure and flag the timing assumption for Engineering.

.. spec:: Tool Creation User Outcomes
   :id: SPEC_UAT_ACTOR_CREATETOOL
   :status: draft
   :links: REQ_UAT_ACTOR_CREATETOOL

   * T-6 (US_ACTOR_CREATETOOL AC-2, AC-3): In an Actor chat, call
     ``jarvis_createActor`` with ``name: ToolIdentity``,
     ``summary: Tool role``, ``agent: OtherPersona``. Expect successful
     creation, a ``ToolIdentity`` tree entry, ``actor.yaml`` and
     ``context.md`` containing the supplied name/summary but no stored
     ``agent`` field; opening its chat selects ``ToolIdentity``, not
     ``OtherPersona``. If the chat tool UI cannot send an extra legacy
     input, use its MCP variant; if neither accepts the call, record
     BLOCKED and leave the compatibility claim untested.

.. spec:: Actor Listing User Outcomes
   :id: SPEC_UAT_ACTOR_LISTTOOL
   :status: draft
   :links: REQ_UAT_ACTOR_LISTTOOL

   * T-7 (US_ACTOR_LISTTOOL AC-2): After T-3 and T-4, call
     ``jarvis_listActors`` without parameters. Expect entries for
     ``LegacyIdentity`` and ``NewIdentity``; each entry's ``agent``
     equals its ``name``. ``OtherPersona`` is never returned as the
     agent of ``LegacyIdentity``.

.. spec:: Agent File Tree User Outcomes
   :id: SPEC_UAT_ACTOR_FILES_TREE
   :status: draft
   :links: REQ_UAT_ACTOR_FILES_TREE

   * T-8 (US_ACTOR_FILES_TREE AC-1a): After opening
     ``LegacyIdentity``, refresh and expand its ACTORS node and Agent
     category. Expect one ``Agent File: ...`` child that opens
     ``LegacyIdentity.agent.md`` in the Markdown preview, not the
     ``OtherPersona`` file named in the old YAML.