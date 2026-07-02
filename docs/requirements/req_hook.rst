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
