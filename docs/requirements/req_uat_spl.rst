Syspilot Lifecycle UAT Requirements
=====================================

.. req:: Syspilot Lifecycle UAT Test Data and Environment
   :id: REQ_UAT_SPL_TESTDATA
   :status: draft
   :priority: optional
   :links: US_UAT_SPL; REQ_SPL_STARTUP_CHECK; REQ_SPL_STATE

   **Description:**
   The repo and test environment SHALL provide the fixtures and setup steps
   needed to exercise all 21 syspilot lifecycle acceptance scenarios (T-1..T-21).

   **Test Data Requirements:**

   * ``testdata/test.code-workspace`` is the standard workspace for all scenarios.
   * ``.github/agents/syspilot.setup.agent.md`` is absent before each scenario
     unless the scenario explicitly requires a pre-existing file with a specific
     frontmatter ``version``.
   * ``.jarvis/syspilot-state.json`` is absent or empty before each scenario
     unless the scenario requires a specific suspend/skip state.
   * For T-5 / T-7 / T-8 / T-9..T-14 / T-18..T-19: a version mismatch is
     induced by manually editing the local agent file's ``version`` frontmatter
     to a value older than the configured upstream tag (or using the file
     written by a prior run and known to be behind the current ``main`` tag).
   * For T-10: ``.jarvis/syspilot-state.json`` is pre-written with
     ``{"suspendedUntil": "<ISO timestamp 1 minute in the past>"}``
     to simulate an expired suspension.
   * For T-16: network access to ``raw.githubusercontent.com`` is blocked (by
     disconnecting the network adapter or setting
     ``jarvis.syspilot.releaseTag`` to a bad value that produces a non-200
     response).
   * For T-20: ``.jarvis/syspilot-state.json`` is pre-written with invalid JSON
     (e.g. ``{corrupt``).
   * Reset all test-data files and VS Code settings to their defaults between
     scenarios.

   **Acceptance Criteria:**

   * AC-1: The Extension Development Host can be launched with
     ``enthali.jarvis-syspilot`` active alongside ``enthali.jarvis-core``.
   * AC-2: The Extension Development Host can be launched WITHOUT
     ``enthali.jarvis-syspilot`` to verify zero-trace (T-1).
   * AC-3: The Jarvis Output Channel is accessible to verify log warnings
     for T-16 and T-20.


.. req:: Syspilot Lifecycle UAT Test Scenarios
   :id: REQ_UAT_SPL_TESTS
   :status: draft
   :priority: optional
   :links: US_UAT_SPL; REQ_UAT_SPL_TESTDATA; REQ_SPL_PACKAGE; REQ_SPL_STARTUP_CHECK; REQ_SPL_ACTOR; REQ_SPL_NOTIFY; REQ_SPL_SUSPEND; REQ_SPL_SKIP; REQ_SPL_MANUAL; REQ_SPL_SUPPLY_CHAIN; REQ_SPL_STATE

   **Description:**
   Manual test procedures SHALL exist for all 21 syspilot lifecycle acceptance
   scenarios (T-1 through T-21), verifying: zero-trace when not installed,
   command availability, first-run copy-and-notify, version-match no-op,
   version-mismatch notify, actor provisioning, notification content, suspend
   and skip tools, manual force-check, supply-chain URL, network failure
   handling, state persistence, and opt-out via uninstall.

   **Acceptance Criteria:**

   * AC-1 (T-1 — zero trace):
     When ``enthali.jarvis-syspilot`` is not installed, no syspilot-related
     command, setting, or actor SHALL be present in any VS Code UI surface.
   * AC-2 (T-2 — commands present):
     When installed, ``jarvis.syspilotUpdate``,
     ``jarvis.delaySyspilotUpdate``, and ``jarvis.SyspilotSkipThisVersion``
     SHALL appear in the Command Palette and the release-tag setting SHALL
     appear in the Settings UI.
   * AC-3 (T-3 — first run copy and notify):
     When no local agent file exists, the module SHALL copy it from upstream
     and queue a notification for the "Syspilot Setup Engineer" actor on VS
     Code startup. The notification SHALL present three choices (install now /
     skip this version / delay for N days) and SHALL NOT reference a
     specific upstream version string.
   * AC-4 (T-4 — version match, no notification):
     When the local file version equals the upstream version AND the
     installation marker ``.github/agents/syspilot.pm.agent.md`` exists,
     no notification SHALL be sent.
   * AC-5 (T-5 — version mismatch, notification sent):
     When versions differ and no suppress state is active, a notification
     SHALL be queued for the actor presenting three choices (install now /
     skip this version / delay for N days). The notification SHALL NOT
     include a specific upstream version number.
   * AC-6 (T-6 — actor auto-created):
     The "Syspilot Setup Engineer" actor SHALL be created with the correct
     ``agent: syspilot.setup`` binding when it does not already exist.
   * AC-7 (T-7 — actor not modified if already exists):
     If the actor already exists, its folder and ``actor.yaml`` SHALL NOT be
     modified by a subsequent activation.
   * AC-8 (T-8 — notification content):
     The notification message SHALL present three choices: install now,
     skip (``jarvis_SyspilotSkipThisVersion``), and delay
     (``jarvis_delaySyspilotUpdate``). No upstream version number SHALL
     appear in the text.
   * AC-9 (T-9 — suspend persisted and active):
     ``jarvis_delaySyspilotUpdate`` SHALL persist a ``suspendedUntil``
     timestamp; the next startup SHALL NOT send a notification while
     suspension is active.
   * AC-10 (T-10 — suspension expiry):
     Once ``suspendedUntil`` is in the past, normal notification detection
     SHALL resume on the next startup.
   * AC-11 (T-11 — skip persisted and active):
     ``jarvis_SyspilotSkipThisVersion`` SHALL persist the skipped version;
     the next startup SHALL NOT send a notification for that version.
   * AC-12 (T-12 — skip does not suppress different version):
     A newer upstream version (different from the skipped one) SHALL
     trigger a notification regardless of skip state.
   * AC-13 (T-13 — manual ignores suspend):
     ``jarvis.syspilotUpdate`` SHALL deliver a notification even when
     ``suspendedUntil`` is in the future.
   * AC-14 (T-14 — manual ignores skip):
     ``jarvis.syspilotUpdate`` SHALL deliver a notification even when
     the upstream version equals ``skippedVersion``.
   * AC-15 (T-15 — manual up-to-date message):
     When versions match AND the installation marker
     ``.github/agents/syspilot.pm.agent.md`` exists, ``jarvis.syspilotUpdate``
     SHALL show an informational "up to date" message — no notification queued.
   * AC-16 (T-16 — network failure graceful):
     A network error during the upstream fetch SHALL produce only a warning
     log in the Output Channel — no crash, no error dialog, no notification.
   * AC-17 (T-17 — release tag URL):
     The URL used to fetch upstream content SHALL include the configured
     ``jarvis.syspilot.releaseTag`` value.
   * AC-18 (T-18 — suspend survives restart):
     Suspend state SHALL persist in ``.jarvis/syspilot-state.json`` across
     VS Code restarts.
   * AC-19 (T-19 — skip survives restart):
     Skip state SHALL persist in ``.jarvis/syspilot-state.json`` across
     VS Code restarts.
   * AC-20 (T-20 — corrupt state fail-open):
     An absent or corrupt ``.jarvis/syspilot-state.json`` SHALL be treated
     as empty state — no crash, normal detection proceeds.
   * AC-21 (T-21 — opt-out via uninstall):
     Uninstalling ``enthali.jarvis-syspilot`` SHALL remove all syspilot-
     related commands and settings; no background check fires on reload.
   * AC-22 (T-22 — decision-point logging):
     The Jarvis Output Channel SHALL show ``[SPL]`` info-level log entries
     for all four decision points: upstream version fetched, local file
     download status, comparison result, and resulting decision
     (``REQ_SPL_STARTUP_CHECK`` AC-6).
   * AC-23 (T-23 — auto-delivery registration):
     After notification fires, ``autodelivery.json`` SHALL contain
     ``"Syspilot Setup Engineer"`` without any manual user action
     (``REQ_SPL_NOTIFY`` AC-4 / ``SPEC_SPL_NOTIFY`` AC-4).
   * AC-24 (T-24 — installation-completeness gate):
     When the local file version matches upstream but
     ``.github/agents/syspilot.pm.agent.md`` is absent, the module SHALL
     bypass the version-match early return and send a notification
     (``REQ_SPL_STARTUP_CHECK`` AC-7).
   * AC-25 (T-25 — manual command installation-completeness gate):
     When ``jarvis.syspilotUpdate`` is run manually, versions match, but
     ``.github/agents/syspilot.pm.agent.md`` is absent, the command SHALL
     bypass the version-match early return and queue a notification — no
     "up to date" toast (``REQ_SPL_STARTUP_CHECK`` AC-7,
     ``REQ_SPL_MANUAL`` AC-1).
   * AC-26 (T-26 — LM tools declared in manifest):
     ``packages/syspilot/package.json`` SHALL contain a
     ``contributes.languageModelTools`` array declaring both
     ``jarvis_delaySyspilotUpdate`` (``toolReferenceName: delaySyspilotUpdate``)
     and ``jarvis_SyspilotSkipThisVersion``
     (``toolReferenceName: SyspilotSkipThisVersion``), and both SHALL appear
     in VS Code's "Configure Tools" picker when the module is installed
     (``REQ_SPL_PACKAGE`` AC-4 / ``SPEC_SPL_PACKAGE`` AC-5).
