Actor Identity Acceptance Criteria
==================================

These criteria validate that every Actor is recognisable in its chat by its own
agent, however it was created, in the ``core`` module (``MOD_ACTOR``).

**Setup:** Use a disposable Extension Development Host (EDH) with a writable
workspace and ``packages/core`` enabled. Set ``jarvis.actors.folder`` to
``.jarvis/actors``. Create ``.jarvis/actors/LegacyIdentity/actor.yaml`` with
``name: LegacyIdentity``, ``summary: Existing actor`` and
``agent: OtherPersona``, and its ``context.md`` with ``# LegacyIdentity``. Do not
create an agent for ``LegacyIdentity`` by hand. Keep the names ``NewIdentity``,
``QuietIdentity`` and ``ToolIdentity`` unused. Do not use ``jarvis_whoAmI`` to
establish identity. Run the three journeys in the order given; the third relies
on ``LegacyIdentity`` having been opened in the first.

.. ac:: An existing Actor identifies itself in a fresh chat and after compaction
   :id: AC_ACTOR_IDENTITY_JOURNEY
   :status: approved
   :validates: US_ACTOR_WHOAMI; US_ACTOR_ACTORS

   **Given** the Actor ``LegacyIdentity`` exists as set up above and an
   unrelated file editor has the focus

   1. **When** I open ``LegacyIdentity`` from the ACTORS tree and ask in the new
      chat: "What is your Actor name and workspace-relative context.md path?
      Answer without calling tools."
      **Then** the chat uses the agent ``LegacyIdentity``, not ``OtherPersona``,
      and the first answer names ``LegacyIdentity`` and
      ``.jarvis/actors/LegacyIdentity/context.md``, without a tool call and
      without a request to identify the active tab. I edited no ``actor.yaml``.
   2. **When** I continue the conversation until the VS Code chat compaction
      action is available, compact the conversation and ask the same question
      again without tools
      **Then** the answer again names ``LegacyIdentity`` and
      ``.jarvis/actors/LegacyIdentity/context.md``. Whether the contents of
      ``context.md`` survived is not judged. If the EDH offers no compaction
      action, this step is blocked, not passed.

.. ac:: New Actors open in their own agent, with automatic opening on or off
   :id: AC_ACTOR_CREATE_JOURNEY
   :status: approved
   :validates: US_ACTOR_CREATE; US_ACTOR_ACTORS

   **Given** ``jarvis.actors.openSessionOnCreate`` is enabled and the ACTORS tree
   is visible

   1. **When** I click "+" on the ACTORS tree, enter ``NewIdentity`` and the
      summary ``New role``
      **Then** I am asked only for the name and the summary, no agent picker
      appears, the tree shows ``NewIdentity``, and its chat opens in the agent
      ``NewIdentity`` without a persona selection.
   2. **When** I disable ``jarvis.actors.openSessionOnCreate``, create
      ``QuietIdentity`` with "+" and skip the summary, and then click the new
      tree item and ask in its chat: "What is your Actor name and
      workspace-relative context.md path? Answer without calling tools."
      **Then** no chat opens at creation and no agent picker appears; the click
      opens the chat in the agent ``QuietIdentity``, and it answers the question
      with ``QuietIdentity`` and ``.jarvis/actors/QuietIdentity/context.md``
      without tool calls.

.. ac:: A tool-created Actor and an existing Actor point at their own agent
   :id: AC_ACTOR_FILES_JOURNEY
   :status: approved
   :validates: US_ACTOR_CREATETOOL; US_ACTOR_FILES_TREE

   **Given** an Actor chat that can call ``jarvis_createActor``, and
   ``LegacyIdentity`` has been opened once

   1. **When** I have the chat call ``jarvis_createActor`` with
      ``name: ToolIdentity``, ``summary: Tool role`` and the legacy input
      ``agent: OtherPersona`` (through the MCP variant if the chat tool UI
      cannot send the extra input)
      **Then** the call succeeds, the tree shows ``ToolIdentity``, and its chat
      opens in the agent ``ToolIdentity``, not ``OtherPersona``.
   2. **When** I refresh the ACTORS tree, expand the ``LegacyIdentity`` node and
      its Agent category, and open the child
      **Then** there is one ``Agent File: ...`` child, and it opens
      ``LegacyIdentity.agent.md`` in the Markdown preview, not a file of
      ``OtherPersona``.
