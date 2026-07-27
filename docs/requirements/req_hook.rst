Hook Engine Requirements
========================

.. req:: Agent Hook Intake
   :id: REQ_HOOK_INTAKE
   :status: draft
   :priority: optional
   :links: US_HOOK_OBSERVE

   **Description:**
   The extension host SHALL receive the eight VS Code agent lifecycle hook events
   via a proxy and make each available to the hook engine as a typed event inside
   the extension. The intake path SHALL be additive and structured so that a future
   event bus and subscribers can be inserted without changing intake.

   **Acceptance Criteria:**

   * AC-1: A hook proxy SHALL receive each of the eight events — ``SessionStart``,
     ``UserPromptSubmit``, ``PreToolUse``, ``PostToolUse``, ``PreCompact``,
     ``SubagentStart``, ``SubagentStop``, ``Stop`` — as JSON and forward the
     payload to the extension host.
   * AC-2: The hook engine SHALL surface each received event as a typed value
     carrying at least the event type and the raw payload.
   * AC-3: The intake path SHALL be additive — when no hooks are configured, the
     extension behaves exactly as before (no behavioural change, no errors).
   * AC-4: The intake SHALL be structured so a future dispatch bus / subscribers can
     be inserted between intake and sink without changing the intake contract.
     **This is now satisfied by the typed dispatch registry (REQ_HOOK_ROUTE).**
   * AC-5: The hook engine SHALL reside in ``jarvis-core``.
   * AC-6: The hook intake SHALL be **non-blocking** — the bridge SHALL always
     return exit code 0 with ``{"continue": true}`` and SHALL never block, deny, or
     otherwise influence the agent. (Agent-influencing output is reserved for future
     layers, explicitly out of scope for this MVP.)
   * AC-7: The hook engine SHALL extract the event name from the payload
     (``hook_event_name``) and make it available as a typed field for routing.
   * AC-8: (actor-activity-indicator CR — bug fix) The hook engine SHALL extract
     the session identifier from the payload's ``session_id`` field
     (snake_case, matching the hook API's own JSON convention — see
     ``hook_event_name``, also snake_case) and expose it as ``HookEvent.sessionId``.
     ~~A prior implementation read ``parsed.sessionId`` (camelCase), a field that
     never exists in the payload — ``HookEvent.sessionId`` was therefore always
     ``undefined``, silently breaking every session-aware consumer (including the
     logging sink's session-id suffix, ``REQ_HOOK_LOG`` AC-2) since the hook
     engine's introduction. Confirmed via trace-level log inspection: the raw
     payload always carries ``session_id``, but it was never read.~~ Fixed by
     this CR.
   * AC-9: (**whoami-session-id-resolution CR, GH #51**) Dispatch SHALL
     happen-before the HTTP response. The intake listener SHALL deliver a
     received event to its subscribers *before* it responds to the bridge, and
     the bridge SHALL emit its ``{"continue": true}`` result only after that
     response has been received. Because VS Code waits for a hook to complete
     before it proceeds, this makes the following ordering an observable
     guarantee rather than a race: **for any tool invocation, that
     invocation's own ``PreToolUse`` event has already been dispatched to
     subscribers by the time the tool handler runs.**

     This ordering is a **contract, not an incidental property of the current
     implementation**. It is what allows a synchronous, in-process tool handler
     to consume information carried by an out-of-process hook event
     (``REQ_ACT_WHOAMI`` AC-9). Responding to the bridge before dispatching —
     an otherwise natural latency optimisation — SHALL NOT be introduced,
     because it would silently break every consumer relying on this ordering
     while leaving all existing tests passing. AC-6 (non-blocking) is
     unaffected: the bridge still always continues and never influences the
     agent; only the *order* of dispatch and response is constrained.


.. req:: Hook Event Logging
   :id: REQ_HOOK_LOG
   :status: implemented
   :priority: optional
   :links: US_HOOK_OBSERVE; REQ_DEV_LOGGING

   **Description:**
   Every hook event received by the hook engine SHALL be logged to the existing
   "Jarvis" Output Channel (REQ_DEV_LOGGING) with a ``[Hook]`` module tag. The MVP
   SHALL perform no action beyond logging.

   **Acceptance Criteria:**

   * AC-1: Each received hook event SHALL produce a log entry on the single "Jarvis"
     ``LogOutputChannel`` with the ``[Hook]`` tag.
   * AC-2: At the default ``info`` log level, the log entry SHALL include only
     the event name (and session id, when present) — not the payload. The
     full payload SHALL additionally be logged at ``trace`` level (event name
     + session id + full payload, unchanged from the original single-entry
     format), visible only when trace logging is explicitly enabled
     (``hook-log-level-reduction`` CR: reduces default-visible verbosity
     without losing full observability for troubleshooting).
   * AC-3: The MVP SHALL take no other action — no event bus dispatch, no triggered
     actions, no memory injection, no per-session routing.
   * AC-4: No separate output channel SHALL be created — the "Jarvis" channel from
     ``SPEC_DEV_LOGCHANNEL`` is reused.
   * AC-5: The log entry (both ``info`` and ``trace`` levels) SHALL include the
     event name (e.g., ``UserPromptSubmit``, ``PreToolUse``) extracted from
     the payload, not ``Unknown``.


.. req:: Hook Auto-Install Setting
   :id: REQ_HOOK_AUTOINST
   :status: draft
   :priority: optional
   :links: US_HOOK_CONTROL

   **Description:**
   The extension SHALL provide a ``jarvis.hooks.autoInstall`` VS Code setting
   (boolean, default ``true``) that controls whether the Hook Engine automatically
   installs and manages its bridge files in the workspace. When the setting is
   ``false``, the extension SHALL remove all Jarvis-managed hook files and stop
   managing the ``.github/hooks/`` directory.

   **Acceptance Criteria:**

   * AC-1: The extension SHALL contribute a ``jarvis.hooks.autoInstall`` setting of
     type boolean with default value ``true``.
   * AC-2: When ``jarvis.hooks.autoInstall`` is ``true``, the Hook Configuration
     Self-Install (SPEC_HOOK_CONFIG) SHALL proceed as defined — no behavioural
     change from current default.
   * AC-3: When ``jarvis.hooks.autoInstall`` is ``false``, the extension SHALL
     remove the following Jarvis-managed files if they exist:
     ``.github/hooks/jarvis-hooks.json``, ``.github/hooks/bridge.mjs``, and
     ``.github/hooks/port``.
   * AC-4: When ``jarvis.hooks.autoInstall`` is ``false``, the extension SHALL NOT
     write any hook files during activation or at any later time.
   * AC-5: When ``jarvis.hooks.autoInstall`` is changed from ``false`` to ``true``,
     the extension SHALL restore hook file management on the next activation
     (re-running the self-install sequence).
   * AC-6: The setting SHALL be workspace-scoped (each workspace can independently
     opt in or out).
   * AC-7: The teardown SHALL only remove files known to be Jarvis-managed — it
     SHALL NOT remove the ``.github/hooks/`` directory itself (other tools may use
     it).


.. req:: Hook Event Routing
   :id: REQ_HOOK_ROUTE
   :status: draft
   :priority: optional
   :links: US_HOOK_ROUTE; REQ_HOOK_INTAKE

   **Description:**
   The Hook Engine SHALL provide an internal ``on(eventName, handler)`` registry
   that allows typed handlers to subscribe to specific hook event names. When a
   hook event is received, the engine SHALL dispatch it to all handlers registered
   for that event name. This fulfills the "bus-ready" promise of REQ_HOOK_INTAKE
   AC-4.

   **Acceptance Criteria:**

   * AC-1: The Hook Engine SHALL expose ``on(eventName, handler)`` and
     ``off(eventName, handler)`` methods for registering and unregistering handlers.
   * AC-2: When a hook event is received, the engine SHALL call all handlers
     registered for that event's name in registration order.
   * AC-3: Exceptions in handlers SHALL be caught and logged; they SHALL NOT
     prevent other handlers from running.
   * AC-4: The logging sink (REQ_HOOK_LOG) SHALL always be invoked after dispatch,
     even when no handlers are registered.
   * AC-5: The registry SHALL reside in ``jarvis-core`` and SHALL NOT depend on
     MCP, sessions, or other features.
   * AC-6: The registry SHALL be the stable extension point for future consumers
     (memory housekeeping, agent steering, entity flows).


.. req:: Hook-Driven Entity Activity Indicator
   :id: REQ_HOOK_ACTIVITY
   :status: approved
   :priority: optional
   :links: US_HOOK_ACTIVITY; REQ_HOOK_ROUTE; REQ_HOOK_INTAKE; REQ_ENG_TREEFACTORY; REQ_EXP_UNIFIEDTREE

   **Description:**
   A hook-engine consumer SHALL track a two-state (Active/Inactive) status per
   entity, derived from the 8 lifecycle events (``REQ_HOOK_ACTIVITY`` AC-1/AC-2
   below), and reflect that status as an icon prefix on the corresponding
   entity's tree node label across all three kinds (Actor, Project, Event).

   **Session-to-entity correlation (the open empirical question, per CM's
   dispatch):** a hook event carries ``session_id`` — VS Code's own internal
   chat session UUID — not an entity name. Whether this UUID is the *same*
   UUID space as ``SessionInfo.sessionId`` from ``getAllSessions()``
   (``sessionLookup.ts``, sourced from ``state.vscdb``'s
   ``chat.ChatSessionStore.index``) was, as of this CR's design, an
   **unverified assumption** — the research finding
   (``FI-2026-06-28-hook-engine.md``) explicitly could not test this because
   the ``session_id`` extraction bug (``REQ_HOOK_INTAKE`` AC-8) meant the field
   was never populated, so no live comparison was ever possible. This
   requirement is written to depend on that correlation holding, but SHALL
   degrade gracefully (AC-9) if it does not, so the feature is never a hard
   blocker on an unverified assumption.

   **Acceptance Criteria:**

   * AC-1: An entity SHALL transition to **Active** when its session's
     ``session_id`` (per ``REQ_HOOK_INTAKE`` AC-8) is the subject of any of:
     ``SessionStart``, ``UserPromptSubmit``, ``PreToolUse``, ``PostToolUse``,
     ``PreCompact``, ``SubagentStart``, ``SubagentStop``.
   * AC-2: An entity SHALL transition to **Inactive** when its session's
     ``session_id`` is the subject of a ``Stop`` event.
   * AC-3: An entity with no observed event yet SHALL default to **Inactive**.
   * AC-4: There SHALL be no third state and no timeout-based transition — only
     the events in AC-1/AC-2 change state.
   * AC-5: The mapping from a hook event's ``session_id`` to an entity SHALL be:
     (a) resolve ``session_id`` to a chat session title via ``getAllSessions()``
     (the existing reverse-lookup data source, already used forward by
     ``lookupSessionUUID()``); (b) match that title, verbatim, against the
     ``name`` field of an Actor/Project/Event entity (entities are renamed to
     match their bound chat session's title on creation — see
     ``SPEC_ENT_AGENTSESSION`` — so title-to-entity-name matching is the
     existing, established correlation mechanism, not a new one invented for
     this CR).
   * AC-6: If no ``session_id`` is present on the event (payload malformed, or
     the ``REQ_HOOK_INTAKE`` AC-8 fix has not taken effect for some reason),
     the event SHALL be ignored for activity-tracking purposes — no error, no
     state change, per the existing hook-engine fail-open philosophy
     (``REQ_HOOK_LOG`` AC-3's "no other action" MVP posture).
   * AC-7: If the resolved title does not match any known entity name (stale
     session, generic "New Chat" title, or a chat session unrelated to any
     Jarvis entity), the event SHALL be ignored for activity-tracking purposes
     — no error, no state change.
   * AC-8: (superseded — see AC-8a) ~~The visual indicator SHALL be an icon
     prefix on the entity's tree node label — not a separate badge/description
     field and not an ``iconPath`` change (the latter is already used by the
     existing Project/Event task-count decorator, ``SPEC_PIM_TASKBADGE`` —
     this requirement avoids colliding with it by using the label-prefix
     mechanism instead, consistent with the existing bold-category-label
     precedent, ``REQ_EXP_UNIFIEDTREE`` AC-13).~~ A live F5 test found that
     codicon syntax (``$(circle-filled)``) does not render inside VS Code
     ``TreeView`` labels — it only resolves in QuickPick items and the status
     bar. Replaced by AC-8a.
   * AC-8a: The visual indicator SHALL be an ``item.iconPath`` change: a
     green filled-circle ``ThemeIcon`` when Active; when Inactive,
     ``iconPath`` SHALL be left untouched (not forced to a specific
     "inactive" icon), so the entity's normal icon — or
     ``SPEC_PIM_TASKBADGE``'s task-urgency icon, if one is set — remains
     visible. This resolves the potential collision with
     ``SPEC_PIM_TASKBADGE`` (also an ``iconPath`` user, Project/Event kinds
     only) by time-sharing rather than by touching a different field:
     ``ActivityDecorator`` only asserts ``iconPath`` while Active.
   * AC-9: If the session-to-entity correlation assumption (AC-5) does not
     hold in practice (i.e., hook ``session_id`` values never match any
     ``SessionInfo.sessionId``), the feature SHALL degrade to "no entity ever
     shows Active" — a silent no-op, not an error state, not a crash, and not
     a misleading indicator. **F5-confirmed:** a live test verified the
     correlation holds in practice — this AC now documents the retained
     safety-net behavior for entities/sessions where it might still fail
     (e.g. a stale or unmapped session), not an expected default outcome.
   * AC-10: This requirement SHALL NOT alter any existing entity-node
     behavior (click-to-chat, context menu, file children, inline category
     actions) — the indicator is an icon-only addition (AC-8a), non-invasive
     to any other TreeItem field or existing interaction.
