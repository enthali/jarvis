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
