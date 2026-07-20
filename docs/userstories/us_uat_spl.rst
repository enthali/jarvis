Syspilot Lifecycle User Acceptance Tests
=========================================

.. story:: Syspilot Lifecycle Acceptance Tests
   :id: US_UAT_SPL
   :status: draft
   :priority: optional
   :links: US_SPL_LIFECYCLE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the syspilot lifecycle module
   (``enthali.jarvis-syspilot``),
   **so that** I can verify end-to-end that the module detects syspilot version
   differences, provisions the Setup Engineer actor, delivers structured
   notifications, honours suspend/skip/manual commands, maintains state across
   restarts, and produces no trace when not installed.

   **Preconditions for all scenarios (unless stated otherwise):**

   * Network access to ``raw.githubusercontent.com`` is available.
   * The workspace is ``testdata/test.code-workspace``.
   * ``jarvis.syspilot.releaseTag`` is at its default value (``"main"``).
   * ``.jarvis/syspilot-state.json`` is absent or empty before each test.
   * ``.github/agents/syspilot.setup.agent.md`` is absent before each test
     unless the scenario explicitly requires it to exist.

   **Acceptance Criteria:**

   * AC-1: A test verifies that, when ``enthali.jarvis-syspilot`` is NOT
     installed, no syspilot-related commands, actors, or background checks
     are present (T-1).
   * AC-2: A test verifies that the module commands appear in the Command
     Palette when the module IS installed (T-2).
   * AC-3: A test verifies first-run detection: when no local agent file
     exists, the file is copied from upstream and an "initial setup" notification
     is delivered to the "Syspilot Setup Engineer" actor (T-3).
   * AC-4: A test verifies that when the local file version matches upstream,
     no notification is sent (T-4).
   * AC-5: A test verifies that when versions differ (no suspend/skip active),
     an "update available" notification is sent (T-5).
   * AC-6: A test verifies that the actor is auto-created on first notification
     and not modified on subsequent runs (T-6, T-7).
   * AC-7: A test verifies that the notification message contains the upstream
     version string and the three option prompts (T-8).
   * AC-8: A test verifies that the suspend command persists state, suppresses
     subsequent notifications while active, and that notifications resume after
     expiry (T-9, T-10).
   * AC-9: A test verifies that the skip command persists the skipped version,
     suppresses notifications for that version only, and that a newer upstream
     version re-triggers a notification (T-11, T-12).
   * AC-10: A test verifies that the manual ``jarvis.syspilotUpdate`` command
     ignores both suspend and skip states (T-13, T-14) and shows an
     informational message when already up to date (T-15).
   * AC-11: A test verifies that network failures during the upstream fetch are
     handled gracefully — no crash, warning logged (T-16).
   * AC-12: A test verifies that changing ``jarvis.syspilot.releaseTag`` changes
     the upstream source URL used for the check (T-17).
   * AC-13: A test verifies that suspend and skip states survive a VS Code
     restart (T-18, T-19) and that an absent or corrupt state file is treated
     as empty (T-20).
   * AC-14: A test verifies the opt-out path: uninstalling the module removes
     all syspilot-related surface (T-21).

   **Test Scenarios:**

   **T-1 — Module absent — zero syspilot surface**
     Setup: Ensure ``enthali.jarvis-syspilot`` is NOT installed. Open the
     Extension Development Host WITHOUT the syspilot module (F5 from core only).
     Action: Open the Command Palette (``Ctrl+Shift+P``) and search for
     ``syspilot``. Also check the Jarvis Entities tree for any "Syspilot Setup
     Engineer" actor node.
     Expected: No ``jarvis.syspilotUpdate``, ``jarvis.delaySyspilotUpdate``, or
     ``jarvis.SyspilotSkipThisVersion`` commands appear. No "Syspilot Setup
     Engineer" actor exists. No syspilot-related setting appears in
     ``Ctrl+,``.

   **T-2 — Module installed — commands present**
     Setup: Install ``enthali.jarvis-syspilot`` alongside ``enthali.jarvis-core``
     in the Extension Development Host (F5 with syspilot module active).
     Action: Open the Command Palette and search for ``syspilot``.
     Expected: At minimum the following commands appear:
     ``Jarvis: Check Syspilot Update`` (or equivalent display name for
     ``jarvis.syspilotUpdate``), ``jarvis.delaySyspilotUpdate``, and
     ``jarvis.SyspilotSkipThisVersion``. The setting
     ``jarvis.syspilot.releaseTag`` appears in the VS Code Settings UI
     under a Jarvis group.

   **T-3 — First run: no local agent file — copy and notify**
     Setup: Module installed. Confirm ``.github/agents/syspilot.setup.agent.md``
     does NOT exist in the workspace. Delete or rename it if present.
     Action: Reload the VS Code window (or launch a fresh Extension Development
     Host) so the module's ``activate()`` fires. Wait a few seconds.
     Expected:
     (a) ``.github/agents/syspilot.setup.agent.md`` is created with content
     fetched from the configured upstream release tag.
     (b) A "Syspilot Setup Engineer" actor appears in the Jarvis Entities tree.
     (c) The actor's message queue contains an "initial setup" notification
     (visible via the Messages tree or ``jarvis_receiveMessage`` tool). The
     notification references the upstream version string.

   **T-4 — Versions match — no notification**
     Setup: Module installed. ``.github/agents/syspilot.setup.agent.md`` exists
     locally with the same version as the upstream ``main`` tag. State file
     absent (no suspend/skip).
     Action: Reload the VS Code window.
     Expected: No new message is delivered to "Syspilot Setup Engineer" — the
     actor's message queue remains empty (or at its previous count). No
     information dialog about an update appears.

   **T-5 — Version mismatch — update notification sent**
     Setup: Module installed. ``.github/agents/syspilot.setup.agent.md`` exists
     locally but its frontmatter ``version`` field has been manually edited to
     an older value (e.g. ``version: "0.0.1"``). No suspend/skip state active.
     Action: Reload the VS Code window.
     Expected: The "Syspilot Setup Engineer" actor's message queue receives a
     new "update available" notification. The notification text identifies the
     current upstream version and lists the three options (install, suspend,
     skip).

   **T-6 — Actor auto-created on first notification**
     Setup: Module installed. No "Syspilot Setup Engineer" actor exists. Ensure
     a version mismatch (per T-5 setup) so a notification will be triggered.
     Action: Reload the VS Code window. Wait a few seconds for activation.
     Expected: A "Syspilot Setup Engineer" actor node appears in the Jarvis
     Entities tree. The actor folder exists at
     ``.jarvis/actors/Syspilot Setup Engineer/`` (or ``sessions/`` if using
     legacy convention). Its ``actor.yaml`` binds ``agent: syspilot.setup``.

   **T-7 — Actor already exists — not modified**
     Setup: "Syspilot Setup Engineer" actor already exists from a prior run.
     Manually note its ``actor.yaml`` content and any files in its folder.
     Version mismatch active.
     Action: Reload the VS Code window (triggers another notification check).
     Expected: The actor folder contents are unchanged — no new
     ``actor.yaml``, no folder rename. Only the message queue has a new
     notification appended.

   **T-8 — Notification message contains version and three options**
     Setup: Version mismatch active (per T-5). Actor exists.
     Action: Reload the VS Code window. In the Messages tree expand the
     "Syspilot Setup Engineer" node and inspect the queued message (or
     open a chat for that actor and run ``jarvis_receiveMessage``).
     Expected: The message text contains:
     (a) The upstream version string (e.g. ``1.3.0`` or a semver string).
     (b) An option to install the update.
     (c) A reference to ``jarvis.delaySyspilotUpdate(<days>)`` or
     ``jarvis_delaySyspilotUpdate``.
     (d) A reference to ``jarvis.SyspilotSkipThisVersion()`` or
     ``jarvis_SyspilotSkipThisVersion``.

   **T-9 — Suspend: notifications suppressed while active**
     Setup: Version mismatch active. Module installed.
     Action: Open the "Syspilot Setup Engineer" chat. In the chat, call
     ``jarvis_delaySyspilotUpdate`` with ``days=30`` (or run the VS Code
     command with argument ``30``). Confirm the informational message
     ("suspended until <date>") appears. Then reload the VS Code window.
     Expected:
     (a) ``.jarvis/syspilot-state.json`` contains a ``suspendedUntil``
     timestamp approximately 30 days in the future.
     (b) After the reload, NO new notification is delivered to the actor's
     queue — the startup check is suppressed by the active suspension.

   **T-10 — Suspend expires — notification resumes**
     Setup: ``.jarvis/syspilot-state.json`` manually set to
     ``{"suspendedUntil": "<a timestamp 1 minute in the past>"}`` (simulate
     expired suspension). Version mismatch active.
     Action: Reload the VS Code window.
     Expected: A new notification is delivered to the actor's queue —
     suspension has expired, so normal version-diff detection resumes.

   **T-11 — Skip version: notification suppressed for that version**
     Setup: Version mismatch active (upstream = version X). Module installed.
     Receive the notification (T-5). Then call ``jarvis_SyspilotSkipThisVersion``
     (via chat or Command Palette). Confirm the informational message
     ("version X will be skipped") appears.
     Action: Reload the VS Code window.
     Expected:
     (a) ``.jarvis/syspilot-state.json`` contains ``"skippedVersion": "X"``.
     (b) After the reload, NO new notification is delivered — version X is
     in skip-state.

   **T-12 — Skip does not suppress a different (newer) version**
     Setup: ``skippedVersion`` in state is set to an old version string (e.g.
     ``"0.9.0"``). The local agent file version is also ``"0.9.0"``. The
     actual upstream version is now a different (newer) value (e.g. edit
     the local file's frontmatter to ``0.8.0`` so upstream ``0.9.0`` is
     "newer than local", or set up a real version mismatch against
     upstream).
     Action: Reload the VS Code window.
     Expected: A new notification IS delivered — the new upstream version
     differs from both the local version and the skipped version, so the
     skip-state does not suppress it.

   **T-13 — Manual command ignores suspend state**
     Setup: Suspension active (``suspendedUntil`` = 30 days in the future).
     Version mismatch active.
     Action: Run ``Jarvis: Check Syspilot Update`` from the Command Palette.
     Expected: A notification is delivered to the actor's queue regardless
     of the active suspension. An informational message confirms the
     notification was sent.

   **T-14 — Manual command ignores skip state**
     Setup: ``skippedVersion`` in state equals the current upstream version.
     Version mismatch active (local file is older).
     Action: Run ``Jarvis: Check Syspilot Update`` from the Command Palette.
     Expected: A notification is delivered regardless of the skip-state. An
     informational message confirms the notification was sent.

   **T-15 — Manual command when already up to date**
     Setup: Local file version matches upstream exactly. No suspend/skip
     active.
     Action: Run ``Jarvis: Check Syspilot Update`` from the Command Palette.
     Expected: An informational toast message appears (e.g. "syspilot is up
     to date (version X)."). No notification is queued to the actor.

   **T-16 — Network failure handled gracefully**
     Setup: Block network access to ``raw.githubusercontent.com`` (e.g.
     disconnect the network or set ``jarvis.syspilot.releaseTag`` to a
     known-bad value that produces a 404). Version mismatch would be
     active if the fetch succeeded.
     Action: Reload the VS Code window.
     Expected: No crash, no error dialog. The Jarvis Output Channel shows
     a warning log line (e.g. ``[SPL] fetch failed`` or ``[SPL] network
     error``). No notification is delivered to the actor.

   **T-17 — Release tag config changes upstream URL**
     Setup: Set ``jarvis.syspilot.releaseTag`` to a specific tag value
     (e.g. ``"v1.0.0"``). Enable verbose/debug logging on the Jarvis
     Output Channel if available.
     Action: Reload the VS Code window or run the manual update command.
     Expected: The Jarvis Output Channel log shows a fetch URL containing
     the configured tag (e.g. ``…/enthali/syspilot/v1.0.0/…``), NOT the
     default ``main`` path.

   **T-18 — Suspend state survives VS Code restart**
     Setup: Suspend active (``suspendedUntil`` = 30 days in future, written by
     T-9 or manually). Version mismatch active.
     Action: Fully close and reopen VS Code (or use Developer: Reload Window
     to simulate reactivation).
     Expected: ``.jarvis/syspilot-state.json`` still contains the
     ``suspendedUntil`` timestamp unchanged. No notification is delivered
     on startup (suspension still active).

   **T-19 — Skip state survives VS Code restart**
     Setup: Skip active (``skippedVersion`` = current upstream version, set by
     T-11 or manually). Version mismatch active.
     Action: Fully close and reopen VS Code.
     Expected: ``.jarvis/syspilot-state.json`` still contains
     ``"skippedVersion": "<version>"`` unchanged. No notification is
     delivered on startup (skip still active).

   **T-20 — Absent/corrupt state file treated as empty (fail-open)**
     Setup: Write obviously invalid JSON to ``.jarvis/syspilot-state.json``
     (e.g. ``{corrupt``). Version mismatch active. No suspend/skip would
     logically be active.
     Action: Reload the VS Code window.
     Expected: No crash, no error dialog. The module treats the corrupt
     file as "no state" (empty suspend/skip) and proceeds normally — a
     notification IS delivered (version diff is detected, no active
     guards). The Jarvis Output Channel may show a warning about the
     unreadable state file.

   **T-21 — Opt-out via module uninstall**
     Setup: ``enthali.jarvis-syspilot`` is currently installed and the
     "Syspilot Setup Engineer" actor exists.
     Action: Uninstall ``enthali.jarvis-syspilot`` from VS Code and reload
     the window.
     Expected: The syspilot commands no longer appear in the Command Palette.
     No background startup check fires. The "Syspilot Setup Engineer" actor
     may remain in the Entities tree (it was created by the core via the
     API and persists in the workspace), but no further messages are
     delivered to it. No syspilot-related setting appears in Settings UI.
