Syspilot Lifecycle UAT Design Specifications
=============================================

.. spec:: Syspilot Lifecycle Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_SPL
   :status: draft
   :links: REQ_UAT_SPL_TESTDATA; REQ_UAT_SPL_TESTS

   **Description:**
   Step-by-step procedures and expected outcomes for all twenty-six syspilot
   lifecycle acceptance scenarios (T-1 through T-26), covering: zero-trace when
   not installed, command presence and LM tool manifest registration,
   first-run copy-and-notify, version-match no-op, version-mismatch
   notification, actor provisioning, notification content, suspend/skip/manual
   commands, supply-chain URL verification, network failure handling, state
   persistence, opt-out, decision-point logging, auto-delivery registration,
   and installation-completeness gate (startup and manual command paths).

   **Test Setup:**

   * Extension Development Host (F5) launched with the appropriate modules
     (with or without ``enthali.jarvis-syspilot`` per-scenario).
   * Workspace: ``testdata/test.code-workspace``.
   * Before each scenario: delete ``.jarvis/syspilot-state.json`` and delete
     or rename ``.github/agents/syspilot.setup.agent.md`` unless the scenario
     specifies a pre-existing state.
   * For version-mismatch scenarios: manually set the local file's frontmatter
     ``version`` field to a lower value than the current upstream ``main`` tag,
     or keep the file from a known older release.
   * Jarvis Output Channel open for log verification (T-16, T-20).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Zero-trace: module not installed

          *AC: REQ_UAT_SPL_TESTS AC-1*
        - Launch Extension Development Host WITHOUT ``enthali.jarvis-syspilot``.
          Open Command Palette (``Ctrl+Shift+P``), search ``syspilot``.
          Check Settings UI (``Ctrl+,``) and Jarvis Entities tree.
        - No ``jarvis.syspilotUpdate``, ``jarvis.delaySyspilotUpdate``, or
          ``jarvis.SyspilotSkipThisVersion`` commands found. No
          ``jarvis.syspilot.releaseTag`` setting found. No "Syspilot Setup
          Engineer" actor in the Entities tree.

      * - T-2

          Module installed — commands and LM tools present

          *AC: REQ_UAT_SPL_TESTS AC-2, REQ_SPL_PACKAGE AC-4*
        - Launch Extension Development Host WITH ``enthali.jarvis-syspilot``.
          Open Command Palette and search ``syspilot``. Open a chat and
          click the "Configure Tools" picker (``#``); search ``delay``.
        - ``jarvis.syspilotUpdate`` (or its display name),
          ``jarvis.delaySyspilotUpdate``, and
          ``jarvis.SyspilotSkipThisVersion`` all appear.
          ``jarvis.syspilot.releaseTag`` appears in Settings UI.
          ``#delaySyspilotUpdate`` and ``#SyspilotSkipThisVersion`` both
          appear in the "Configure Tools" picker.

      * - T-3

          First run — local file absent — copy and notify

          *AC: REQ_UAT_SPL_TESTS AC-3*
        - Confirm ``.github/agents/syspilot.setup.agent.md`` is absent.
          Reload the VS Code window (triggers ``activate()``). Wait 5 s.
        - ``.github/agents/syspilot.setup.agent.md`` is created.
          "Syspilot Setup Engineer" actor appears in Entities tree.
          Actor's message queue contains a notification asking the actor
          to present the user with three choices (install now,
          skip this version, delay for N days); message does NOT
          contain a specific upstream version string.

      * - T-4

          Version match — no notification

          *AC: REQ_UAT_SPL_TESTS AC-4*
        - Ensure the local file's ``version`` frontmatter matches the
          current upstream ``main`` tag AND that
          ``.github/agents/syspilot.pm.agent.md`` exists (installation
          complete). Reload VS Code.
        - No new message in the actor's queue after the reload.
          No information dialog about an update.

      * - T-5

          Version mismatch — notification sent

          *AC: REQ_UAT_SPL_TESTS AC-5*
        - Set local file ``version`` to ``"0.0.1"`` (older than upstream).
          No state file active. Reload VS Code. Wait 5 s.
        - A new notification appears in the actor's message queue.
          Notification offers three user choices (install now, skip,
          delay) — no upstream version number.

      * - T-6

          Actor auto-created on first notification

          *AC: REQ_UAT_SPL_TESTS AC-6*
        - Ensure "Syspilot Setup Engineer" actor does NOT exist.
          Version mismatch active (per T-5 setup). Reload VS Code.
        - Actor folder appears under ``.jarvis/actors/Syspilot Setup
          Engineer/``. ``actor.yaml`` contains ``agent: syspilot.setup``
          (or equivalent binding). Actor node visible in Entities tree.

      * - T-7

          Actor already exists — not modified

          *AC: REQ_UAT_SPL_TESTS AC-7*
        - "Syspilot Setup Engineer" actor already exists from T-6.
          Note its ``actor.yaml`` content. Version mismatch active.
          Reload VS Code.
        - Actor folder contents are unchanged after the reload —
          ``actor.yaml`` identical to the noted content. Only a new
          notification is appended to the queue.

      * - T-8

          Notification message content (three choices, no version number)

          *AC: REQ_UAT_SPL_TESTS AC-8*
        - Version mismatch active. Reload VS Code. Inspect the queued
          message (expand actor in Messages tree, or use
          ``jarvis_receiveMessage`` in the actor's chat session).
        - Message text contains a reference to ``jarvis_delaySyspilotUpdate``
          (delay option), ``jarvis_SyspilotSkipThisVersion`` (skip
          option), and an "install this update now" prompt. Message does
          NOT contain a specific upstream version number.

      * - T-9

          Suspend — notifications suppressed while active

          *AC: REQ_UAT_SPL_TESTS AC-9*
        - Version mismatch active. From the actor's chat session (or
          Command Palette), call ``jarvis_delaySyspilotUpdate`` with
          ``days=30``. Observe the informational message. Reload VS Code.
          Wait 5 s.
        - ``.jarvis/syspilot-state.json`` contains ``suspendedUntil``
          approximately 30 days in the future. After the reload, NO new
          notification is queued (startup check suppressed by suspension).

      * - T-10

          Suspend expired — notification resumes

          *AC: REQ_UAT_SPL_TESTS AC-10*
        - Write ``{"suspendedUntil": "<1 minute in the past>"}`` to
          ``.jarvis/syspilot-state.json``. Version mismatch active.
          Reload VS Code.
        - A new notification IS queued — suspension has expired.

      * - T-11

          Skip version — notification suppressed for that version

          *AC: REQ_UAT_SPL_TESTS AC-11*
        - Version mismatch active (upstream = version X). Reload to get
          notification (T-5 flow). From the actor's chat, call
          ``jarvis_SyspilotSkipThisVersion``. Observe the informational
          message ("version X will be skipped"). Reload VS Code.
        - ``.jarvis/syspilot-state.json`` contains
          ``"skippedVersion": "X"``. After the reload, NO new notification
          is queued for version X.

      * - T-12

          Skip does not suppress a different version

          *AC: REQ_UAT_SPL_TESTS AC-12*
        - ``skippedVersion`` in state is set to ``"0.9.0"``. Local file
          version is ``"0.8.0"`` (so upstream is newer than local AND
          different from the skipped version). Reload VS Code.
        - A new notification IS queued — the upstream version differs
          from both the local version and the skipped version.

      * - T-13

          Manual command ignores suspend

          *AC: REQ_UAT_SPL_TESTS AC-13*
        - Suspension active (``suspendedUntil`` 30 days in the future).
          Version mismatch active. Run
          ``Jarvis: Check Syspilot Update`` from Command Palette.
        - A notification IS queued to the actor's queue regardless of
          suspension. An informational message confirms notification sent.

      * - T-14

          Manual command ignores skip

          *AC: REQ_UAT_SPL_TESTS AC-14*
        - ``skippedVersion`` equals the current upstream version. Local
          file version is older (mismatch). Run manual update command.
        - A notification IS queued regardless of skip state. An
          informational message confirms notification sent.

      * - T-15

          Manual command when already up to date

          *AC: REQ_UAT_SPL_TESTS AC-15*
        - Local file version matches upstream exactly. ``.github/agents/
          syspilot.pm.agent.md`` exists (installation complete).
          No suspend/skip. Run manual update command.
        - A toast message appears (e.g.
          "syspilot is up to date (version X).").
          No notification is queued to the actor.

      * - T-16

          Network failure — graceful degradation

          *AC: REQ_UAT_SPL_TESTS AC-16*
        - Block network access to ``raw.githubusercontent.com`` or set
          ``jarvis.syspilot.releaseTag`` to a bad value (e.g.
          ``"does-not-exist-tag-xyz"``). Reload VS Code.
        - No crash, no error dialog. Jarvis Output Channel shows a
          ``[SPL] fetch failed`` or ``[SPL] network error`` warning log
          line. No notification is queued.

      * - T-17

          Release tag config changes upstream URL

          *AC: REQ_UAT_SPL_TESTS AC-17*
        - Set ``jarvis.syspilot.releaseTag`` to ``"v1.0.0"`` in Workspace
          Settings. Reload VS Code (or run manual update command) with
          verbose Output Channel open.
        - Jarvis Output Channel log shows a URL containing
          ``/enthali/syspilot/v1.0.0/`` (the configured tag), not
          ``/main/``.

      * - T-18

          Suspend state survives VS Code restart

          *AC: REQ_UAT_SPL_TESTS AC-18*
        - Run T-9 to write ``suspendedUntil`` to the state file. Fully
          close and reopen VS Code (or reload window). Wait 5 s.
        - ``.jarvis/syspilot-state.json`` still contains the unchanged
          ``suspendedUntil`` timestamp. No notification queued on startup.

      * - T-19

          Skip state survives VS Code restart

          *AC: REQ_UAT_SPL_TESTS AC-19*
        - Run T-11 to write ``skippedVersion`` to the state file. Fully
          close and reopen VS Code. Wait 5 s.
        - ``.jarvis/syspilot-state.json`` still contains
          ``"skippedVersion"`` unchanged. No notification queued on startup.

      * - T-20

          Corrupt state file — fail-open

          *AC: REQ_UAT_SPL_TESTS AC-20*
        - Write ``{corrupt`` to ``.jarvis/syspilot-state.json``. Version
          mismatch active (no suspend/skip logically active). Reload VS
          Code.
        - No crash, no error dialog. Jarvis Output Channel may show a
          warning about the unreadable state file. A notification IS
          queued (version diff detected, no active guards — fail-open).

      * - T-21

          Opt-out via module uninstall

          *AC: REQ_UAT_SPL_TESTS AC-21*
        - Module currently installed and "Syspilot Setup Engineer" actor
          exists. Uninstall ``enthali.jarvis-syspilot`` from VS Code
          Extensions panel. Reload VS Code.
        - ``jarvis.syspilotUpdate`` and the other syspilot commands no
          longer appear in the Command Palette. ``jarvis.syspilot.releaseTag``
          no longer appears in Settings UI. No background startup check
          fires (no new notifications on the actor after the reload).

      * - T-22

          Decision-point logging at info level

          *AC: REQ_UAT_SPL_TESTS AC-22, REQ_SPL_STARTUP_CHECK AC-6*
        - Version mismatch active. Jarvis Output Channel open. Reload VS
          Code. Observe the Output Channel within a few seconds.
        - Output Channel shows ``[SPL]`` info-level log entries covering
          all four decision points: (a) upstream version fetched,
          (b) whether local file was missing/downloaded or present,
          (c) local-vs-upstream comparison result, (d) resulting decision
          (e.g. ``notify``). No entry is absent for any of the four
          points.

      * - T-23

          Auto-delivery registered after notification

          *AC: REQ_UAT_SPL_TESTS AC-23, SPEC_SPL_NOTIFY AC-4*
        - Version mismatch active. Confirm ``autodelivery.json`` does not
          list "Syspilot Setup Engineer" before test. Reload VS Code.
          Wait a few seconds for activation and notification to fire.
          Inspect ``autodelivery.json`` in the extension storage folder.
        - ``autodelivery.json`` contains ``"Syspilot Setup Engineer"``.
          No manual "Enable Auto-Delivery" action was performed by the
          user — registration is automatic (same pattern as Reminders).

      * - T-24

          Installation-completeness gate: versions match, marker absent — notify

          *AC: REQ_UAT_SPL_TESTS AC-24, REQ_SPL_STARTUP_CHECK AC-7*
        - Local file version matches the current upstream ``main`` tag.
          Delete ``.github/agents/syspilot.pm.agent.md`` (or confirm it
          was never created). No suspend/skip state active. Reload VS
          Code. Wait a few seconds for activation.
        - A notification IS queued to the actor's message queue (the
          three-choice message) despite the version match. The
          installation-completeness gate detects the absent marker and
          bypasses the version-match early return. No crash, no error.

      * - T-25

          Manual command: installation gate fires even if versions match

          *AC: REQ_UAT_SPL_TESTS AC-25, REQ_SPL_STARTUP_CHECK AC-7, REQ_SPL_MANUAL AC-1*
        - Local file version matches upstream. Delete ``.github/agents/
          syspilot.pm.agent.md`` (installation incomplete). No
          suspend/skip active. Run ``Jarvis: Check Syspilot Update``
          from the Command Palette.
        - A notification IS queued (three-choice message) despite the
          version match. No "already up to date" toast appears. The
          manual command checks the installation-completeness gate and
          bypasses the version-match early return when the marker is
          absent.

      * - T-26

          LM tools declared in manifest with correct toolReferenceName

          *AC: REQ_UAT_SPL_TESTS AC-26, SPEC_SPL_PACKAGE AC-5*
        - Module installed. Inspect ``packages/syspilot/package.json``
          directly. In the Extension Development Host open a chat and
          click the "Configure Tools" (``#``) picker; search ``delay``.
        - ``packages/syspilot/package.json`` ``contributes.languageModelTools``
          array contains two entries:
          ``{"name": "jarvis_delaySyspilotUpdate", "toolReferenceName":
          "delaySyspilotUpdate", ...}`` and
          ``{"name": "jarvis_SyspilotSkipThisVersion", "toolReferenceName":
          "SyspilotSkipThisVersion", ...}``.
          Both ``#delaySyspilotUpdate`` and ``#SyspilotSkipThisVersion``
          appear in the "Configure Tools" picker.

.. spec:: Syspilot Lifecycle Test Data Files
   :id: SPEC_UAT_SPL_FILES
   :status: draft
   :links: REQ_UAT_SPL_TESTDATA

   **Description:**
   No dedicated test-data fixture files are required for the syspilot lifecycle
   UAT beyond the standard workspace and the ability to write specific content
   to ``.jarvis/syspilot-state.json`` and to edit the frontmatter ``version``
   field in ``.github/agents/syspilot.setup.agent.md``.

   **Setup Recipes:**

   * **Version mismatch:** Open ``.github/agents/syspilot.setup.agent.md``
     (created by T-3 or fetched manually) and change the ``version:`` line in
     the YAML frontmatter to ``version: "0.0.1"``. Save the file.
   * **Expired suspension:** Write
     ``{"suspendedUntil": "2020-01-01T00:00:00.000Z"}`` to
     ``.jarvis/syspilot-state.json``.
   * **Active suspension:** Write
     ``{"suspendedUntil": "<ISO date 30 days from now>"}`` to
     ``.jarvis/syspilot-state.json``.
   * **Skip state:** Write
     ``{"skippedVersion": "<current upstream version>"}`` to
     ``.jarvis/syspilot-state.json``.
   * **Corrupt state:** Write ``{corrupt`` to
     ``.jarvis/syspilot-state.json``.
   * **Reset:** Delete ``.jarvis/syspilot-state.json`` and revert
     ``.github/agents/syspilot.setup.agent.md`` to its upstream content.

   **Acceptance Criteria:**

   * AC-1: All state-file manipulations above can be performed with a plain
     text editor — no special tooling is required beyond VS Code.
   * AC-2: The current upstream version can be determined by fetching
     ``https://raw.githubusercontent.com/enthali/syspilot/main/syspilot/agents/syspilot.setup.agent.md``
     and reading the ``version:`` frontmatter field.
