Syspilot Lifecycle User Stories
================================

.. story:: Syspilot Version Detection and Handoff
   :id: US_SPL_LIFECYCLE
   :status: draft
   :priority: optional
   :links: US_MOD_INSTALL; US_ACT_ACTORS

   **As a** Jarvis user who uses syspilot,
   **I want** Jarvis to detect when a new syspilot version is available and hand
   off the update decision to syspilot's own Setup Agent,
   **so that** I stay current with syspilot releases without leaving my editor
   and syspilot retains full control over its own installation process.

   **Acceptance Criteria:**

   * AC-1: On VS Code startup, the module checks whether a local
     ``.github/agents/syspilot.setup.agent.md`` exists and whether its
     frontmatter version matches the upstream release-tag version.
   * AC-2: When versions differ (or the file is absent), a dedicated actor
     "Syspilot Setup Engineer" is notified via the Jarvis message service;
     the user sees the notification in their chat session.
   * AC-3: The actor receives an actionable prompt offering three options:
     install the update, suspend notifications for N days, or skip this
     specific version permanently.
   * AC-4: A manual command ``jarvis.syspilotUpdate`` allows the user to
     force a re-check at any time, ignoring both suspend and skip states.
   * AC-5: Complete opt-out is achieved by uninstalling the module — no
     separate "disable update management" state exists within the module.
   * AC-6: The module never installs syspilot itself — it only detects,
     notifies, and hands off to the Setup Agent which decides and installs.
   * AC-7: The upstream agent file is fetched only from a pinned syspilot
     Release Tag (supply-chain integrity).
