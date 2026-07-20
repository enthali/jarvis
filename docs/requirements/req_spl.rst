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
   * AC-2: The extension contributes only its own commands and settings — no
     modifications to core manifests.
   * AC-3: When not installed, no syspilot-related commands, settings, or
     actors are contributed.


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
     the module SHALL copy the pinned upstream agent file (and its companion
     ``bootstrap.json``) into ``.github/agents/`` and then send a
     "setup available" notification.
   * AC-2: If the local file exists, the module SHALL parse its YAML frontmatter
     ``version`` field and compare it to the upstream version.
   * AC-3: If versions are identical, no action is taken.
   * AC-4: If versions differ and the version is not in skip-state and the
     module is not in suspend-state, a notification SHALL be sent.
   * AC-5: The upstream version SHALL be fetched from the pinned syspilot
     Release Tag URL only — no arbitrary network endpoints.


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
   actor via the Jarvis message queue, containing the available version info
   and the user's options.

   **Acceptance Criteria:**

   * AC-1: The message text SHALL inform the actor of the available version and
     offer three options: install, suspend for N days, or skip this version.
   * AC-2: The message SHALL include the exact upstream version string so the
     actor can reference it.
   * AC-3: The message sender field SHALL identify the module (e.g.
     ``"jarvis-syspilot"``).
   * AC-4: After queuing the message, the module relies on the existing
     auto-delivery mechanism (``REQ_MSG_AUTODELIVER_POLL``) to present it to
     the actor's chat session — no custom delivery logic is needed.


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
