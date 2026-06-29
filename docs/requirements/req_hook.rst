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
   * AC-5: The hook engine SHALL reside in ``jarvis-core``.
   * AC-6: The hook intake SHALL be **non-blocking** — the bridge SHALL always
     return exit code 0 with ``{"continue": true}`` and SHALL never block, deny, or
     otherwise influence the agent. (Agent-influencing output is reserved for future
     layers, explicitly out of scope for this MVP.)


.. req:: Hook Event Logging
   :id: REQ_HOOK_LOG
   :status: draft
   :priority: optional
   :links: US_HOOK_OBSERVE; REQ_DEV_LOGGING

   **Description:**
   Every hook event received by the hook engine SHALL be logged to the existing
   "Jarvis" Output Channel (REQ_DEV_LOGGING) with a ``[Hook]`` module tag. The MVP
   SHALL perform no action beyond logging.

   **Acceptance Criteria:**

   * AC-1: Each received hook event SHALL produce a log entry on the single "Jarvis"
     ``LogOutputChannel`` with the ``[Hook]`` tag.
   * AC-2: The log entry SHALL include the event type and its payload so the
     delivered data is observable.
   * AC-3: The MVP SHALL take no other action — no event bus dispatch, no triggered
     actions, no memory injection, no per-session routing.
   * AC-4: No separate output channel SHALL be created — the "Jarvis" channel from
     ``SPEC_DEV_LOGCHANNEL`` is reused.
