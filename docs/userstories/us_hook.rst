Hook Engine User Stories
========================

.. story:: Observe Agent Lifecycle Hooks (MVP)
   :id: US_HOOK_OBSERVE
   :status: draft
   :priority: optional
   :links: US_DEV_LOGGING

   *Context: Layer 1 foundation of the Hook Engine (GitHub Issue #17). VS Code
   Agent Hooks (Preview) deliver JSON-configured lifecycle events; Copilot CLI and
   Claude Code expose the same hook interface (GA). This MVP only receives and logs
   the events — no event bus, no triggered actions, no memory injection, no
   per-session routing. It establishes the domain-neutral foundation in
   ``jarvis-core`` on which future consumers (memory housekeeping, agent steering,
   entity flows) build.*

   **As a** Jarvis developer,
   **I want** the extension host to receive all eight VS Code agent lifecycle hook
   events (``SessionStart``, ``UserPromptSubmit``, ``PreToolUse``, ``PostToolUse``,
   ``PreCompact``, ``SubagentStart``, ``SubagentStop``, ``Stop``) and log each to
   the "Jarvis" Output Channel,
   **so that** I can observe what data the hooks actually deliver and build
   hook-driven features on this foundation.

   **Acceptance Criteria:**

   * AC-1: A hook proxy receives each of the eight VS Code agent lifecycle events as
     JSON and forwards it to the extension host.
   * AC-2: The extension logs every received hook event to the existing "Jarvis"
     Output Channel (US_DEV_LOGGING) with a ``[Hook]`` tag, including the event type
     and its payload.
   * AC-3: The MVP performs **no** action beyond logging — no event bus, no
     triggered actions, no memory injection, no per-session routing.
   * AC-4: The hook engine lives in ``jarvis-core`` and is structured so that a
     future event bus and subscribers can be inserted without changing the hook
     intake path.
   * AC-5: Hook intake is additive — when hooks are not configured, Jarvis behaves
     exactly as before.
   * AC-6: The log entry includes the event name (e.g., ``UserPromptSubmit``,
     ``PreToolUse``) extracted from the payload, not ``Unknown``.


.. story:: Route Hook Events by Type
   :id: US_HOOK_ROUTE
   :status: draft
   :priority: optional
   :links: US_HOOK_OBSERVE

   *Context: The Hook Engine MVP (US_HOOK_OBSERVE) receives and logs all hook
   events. Future consumers (memory housekeeping, agent steering, entity flows)
   need to react to specific event types. This story adds the typed dispatch
   registry that fulfills the "bus-ready" promise of US_HOOK_OBSERVE AC-4.*

   **As a** Jarvis developer,
   **I want** the Hook Engine to classify incoming hook events by their
   ``hook_event_name`` and dispatch them to typed handlers via an internal
   ``on(eventName, handler)`` registry,
   **so that** future features can subscribe to specific event types without
   modifying the intake path.

   **Acceptance Criteria:**

   * AC-1: The Hook Engine provides ``on(eventName, handler)`` and
     ``off(eventName, handler)`` methods for registering/unregistering handlers.
   * AC-2: When a hook event is received, all handlers registered for that event
     name are called in registration order.
   * AC-3: Exceptions in handlers are caught and logged; they do not prevent other
     handlers from running.
   * AC-4: The logging sink (US_HOOK_OBSERVE) is always invoked after dispatch,
     even when no handlers are registered.
   * AC-5: The registry lives in ``jarvis-core`` and has no dependencies on MCP,
     sessions, or other features.


.. story:: Control Hook Auto-Installation
   :id: US_HOOK_CONTROL
   :status: draft
   :priority: optional
   :links: US_HOOK_OBSERVE

   *Context: The Hook Engine MVP (US_HOOK_OBSERVE) self-installs bridge files into
   ``.github/hooks/`` on every activation. Some users need to manage that directory
   themselves — e.g. for custom hook configurations, CI tooling, or to avoid
   generated files in version control. This story provides an opt-out mechanism.*

   **As a** Jarvis user,
   **I want** a setting that controls whether Jarvis automatically installs and
   manages hook bridge files in my workspace,
   **so that** I can opt out of automatic hook management when I want full control
   over my ``.github/hooks/`` directory.

   **Acceptance Criteria:**

   * AC-1: A VS Code setting exists that lets the user disable automatic hook file
     installation (opt-out).
   * AC-2: When the setting is disabled, Jarvis removes all hook files it previously
     installed and stops managing them.
   * AC-3: When the setting is re-enabled, Jarvis restores hook file management on
     the next activation.
   * AC-4: The default behaviour is unchanged — hook files are auto-installed unless
     the user explicitly opts out.
