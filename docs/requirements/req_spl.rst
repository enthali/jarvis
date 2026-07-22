Syspilot Lifecycle Requirements
================================

.. req:: Syspilot Module Package
   :id: REQ_SPL_PACKAGE
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE; REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE

   **Description:**
   The syspilot lifecycle module SHALL be packaged as a separate extension
   (``enthali.jarvis-syspilot``) depending on the core via
   ``extensionDependencies: ["enthali.jarvis-core"]``. When not installed, zero
   surface for syspilot management is present (per ``REQ_MOD_ZEROTRACE``).

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: The extension contributes only its own commands, settings, and
     language-model tools — no modifications to core manifests.
   * AC-3: When not installed, no syspilot-related commands, settings, tools,
     or actors are contributed.
   * AC-4: The manifest SHALL declare ``contributes.languageModelTools``
     entries for all LM tools registered at runtime (e.g.
     ``jarvis_delaySyspilotUpdate``, ``jarvis_SyspilotSkipThisVersion``),
     so VS Code surfaces them in the "Configure Tools" picker alongside
     core tools.


.. req:: Startup Version Check
   :id: REQ_SPL_STARTUP_CHECK
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **Description:**
   On extension activation (VS Code startup), the module SHALL compare the
   local agent file's frontmatter version with the upstream release-tag version
   and determine whether a notification is warranted.

   **Acceptance Criteria:**

   * AC-1: If ``.github/agents/syspilot.setup.agent.md`` does not exist locally,
     the module SHALL copy the pinned upstream agent file into
     ``.github/agents/`` and then proceed to the notification step (same
     message as for a version mismatch — no distinct "initial setup"
     notification). No companion files (e.g. ``bootstrap.json``) are
     managed by Jarvis — the single-artifact contract is the agent file
     only.
   * AC-2: If the local file exists, the module SHALL parse its YAML frontmatter
     ``version`` field and compare it to the upstream version.
   * AC-3: If versions are identical AND the file was NOT just freshly copied
     in the same activation, no action is taken.
   * AC-4: If versions differ and the version is not in skip-state and the
     module is not in suspend-state, a notification SHALL be sent.
   * AC-5: The upstream version SHALL be fetched from the pinned syspilot
     Release Tag URL only — no arbitrary network endpoints.
   * AC-6: The module SHALL log (at minimum): the upstream version fetched,
     whether the local file was missing and downloaded, the local-vs-upstream
     comparison result, and the resulting decision (notify / skip / suspend /
     up-to-date).
   * AC-7: The version-match early-return (AC-3) SHALL additionally require
     that the installation is complete — i.e.
     ``.github/agents/syspilot.pm.agent.md`` exists. If the marker file is
     absent, the flow SHALL treat the situation like ``freshlyDownloaded``
     (bypass version-match, proceed to skip/suspend gates and notify if not
     gated). This ensures the actor is re-notified when the user has not yet
     completed the initial installation workflow.


.. req:: Actor Provisioning
   :id: REQ_SPL_ACTOR
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE; US_ACT_ACTORS

   **Description:**
   The module SHALL ensure a "Syspilot Setup Engineer" actor exists before
   sending it a notification message.

   **Acceptance Criteria:**

   * AC-1: On first run (or if the actor folder is missing), the module SHALL
     create the actor via the Jarvis core API (``createActor`` or equivalent)
     with name ``"Syspilot Setup Engineer"`` and an appropriate summary.
   * AC-2: The actor's ``actor.yaml`` SHALL bind to the
     ``syspilot.setup.agent.md`` agent (``agent: syspilot.setup``).
   * AC-3: If the actor already exists, no modification is made.


.. req:: Notification Message
   :id: REQ_SPL_NOTIFY
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE; REQ_SPL_ACTOR

   **Description:**
   The module SHALL send a structured message to the "Syspilot Setup Engineer"
   actor via the Jarvis message queue, instructing it to ask the user to choose
   one of three options: install the update now, skip this version permanently,
   or delay notifications for N days.

   **Acceptance Criteria:**

   * AC-1: The message text SHALL instruct the actor to ask the user whether
     they want to install this update now, skip this version permanently, or
     delay it for N days — three explicit choices. The message SHALL use
     underscore-delimited LM tool names (``jarvis_SyspilotSkipThisVersion``,
     ``jarvis_delaySyspilotUpdate``) so the actor can invoke them directly.
   * AC-2: The message SHALL NOT embed an explicit version number — the actor
     reads its own frontmatter after fetching.
   * AC-3: The message sender field SHALL identify the module (e.g.
     ``"jarvis-syspilot"``).
   * AC-4: After queuing the message, the module SHALL call
     ``addAutoDelivery`` (idempotent) to ensure the actor is on the
     auto-delivery list, so the message is picked up by the existing
     auto-delivery poll loop (``REQ_MSG_AUTODELIVER_POLL``) without
     requiring the user to manually register the actor. This follows
     the same pattern established by the reminders feature.


.. req:: Suspend Tool
   :id: REQ_SPL_SUSPEND
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **Description:**
   A VS Code command ``jarvis.delaySyspilotUpdate`` SHALL allow the Setup Agent
   to suspend update notifications for a specified number of days.

   **Acceptance Criteria:**

   * AC-1: The command accepts a single numeric argument (days) and persists a
     "suspended until" timestamp.
   * AC-2: While suspended, the startup check (``REQ_SPL_STARTUP_CHECK`` AC-4)
     SHALL NOT send a notification.
   * AC-3: Once the suspension expires, normal version-diff detection resumes.
   * AC-4: The command is registered as an LM tool so the agent can invoke it
     conversationally.


.. req:: Skip Version Tool
   :id: REQ_SPL_SKIP
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **Description:**
   A VS Code command ``jarvis.SyspilotSkipThisVersion`` SHALL allow the Setup
   Agent to permanently suppress notifications for the current upstream version.

   **Acceptance Criteria:**

   * AC-1: The command persists the skipped version string.
   * AC-2: The startup check (``REQ_SPL_STARTUP_CHECK`` AC-4) SHALL NOT
     notify for a version that is in skip-state.
   * AC-3: A newer upstream version (different from the skipped one) is NOT
     affected — normal detection resumes.
   * AC-4: The command is registered as an LM tool so the agent can invoke it
     conversationally.


.. req:: Manual Update Command
   :id: REQ_SPL_MANUAL
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **Description:**
   A VS Code command ``jarvis.syspilotUpdate`` SHALL force a version re-check
   and notification regardless of suspend or skip state.

   **Acceptance Criteria:**

   * AC-1: The command ignores both suspend-state and skip-state.
   * AC-2: It performs the same version comparison as the startup check
     (``REQ_SPL_STARTUP_CHECK``) and, if versions differ, sends a notification
     (``REQ_SPL_NOTIFY``).
   * AC-3: If versions are identical, an informational message is shown ("you
     are up to date") — no actor notification is sent.
   * AC-4: The command is available in the Command Palette.


.. req:: Supply-Chain Integrity
   :id: REQ_SPL_SUPPLY_CHAIN
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **Description:**
   The module SHALL fetch the upstream agent file only from a trusted,
   pinned source — a syspilot Release Tag on GitHub.

   **Acceptance Criteria:**

   * AC-1: The upstream URL is constructed from a configurable setting
     (``jarvis.syspilot.releaseTag``) pointing to a specific tag or ``main``
     on the ``enthali/syspilot`` repository.
   * AC-2: The module SHALL fetch raw file content via the GitHub raw content
     API (``raw.githubusercontent.com``).
   * AC-3: No user-supplied arbitrary URLs are accepted for the upstream
     source.
   * AC-4: Network failures are handled gracefully — the module logs a
     warning and skips the check (no crash, no user-facing error dialog).


.. req:: State Persistence
   :id: REQ_SPL_STATE
   :status: draft
   :priority: optional
   :links: REQ_SPL_SUSPEND; REQ_SPL_SKIP

   **Description:**
   Suspend and skip states SHALL be persisted so they survive VS Code restarts.

   **Acceptance Criteria:**

   * AC-1: State is stored in a JSON file under
     ``.jarvis/syspilot-state.json`` in the workspace root.
   * AC-2: The file contains at minimum: ``suspendedUntil`` (ISO timestamp or
     null) and ``skippedVersion`` (string or null).
   * AC-3: The file is created on first write; absence means no suspend/skip
     is active.
