# Change Document: dev-launchconfig-syspilot

**Status**: ready for PM manual verification
**Branch**: feature/dev-launchconfig-syspilot
**Created**: 2026-07-21
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Manual testing of the `jarvis-syspilot` module (GH #39) found that its dev
launch/build tooling was never wired up: `.vscode/launch.json` has no
`extensionHost` configuration including `packages/syspilot`, and
`.vscode/tasks.json` has no compile task for it either — the module cannot be
exercised in the Extension Host at all today. Root-cause discussion surfaced
a deeper traceability gap behind the missing wiring: `docs/design/spec_mod.rst`
(the package/module registry — `SPEC_MOD_CORE_PKG`, `SPEC_MOD_PIM_PKG`,
`SPEC_MOD_REC_PKG`, `SPEC_MOD_FLOW_PKG`, `SPEC_MOD_SUITE`,
`SPEC_MOD_MCP_PKG`) never got a `SPEC_MOD_SPL_PKG` entry for the syspilot
package added during #39, and `SPEC_DEV_LAUNCHCONFIG` (`docs/design/spec_dev.rst`)
only links to `REQ_DEV_LAUNCHCONFIG` — it has no link to any `SPEC_MOD_*_PKG`
element, so there is no traceability edge that would make a future impact
scan flag the dev launch config as affected when a new module/package is
added. This change (a) adds the missing `SPEC_MOD_SPL_PKG` module-registry
entry for syspilot, (b) links `SPEC_DEV_LAUNCHCONFIG` to the module specs so
this class of gap is structurally caught next time, and (c) fixes the actual
`.vscode/launch.json`/`.vscode/tasks.json` wiring so `packages/syspilot` can
be run and manually tested in the Extension Host (a "Run Core + Syspilot"
launch configuration plus matching compile task, per the existing pattern for
pim/recorder/mcp/flow).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

_(none — US_DEV_MANUALTEST is generic enough to cover all modules; no US change needed)_

### New User Stories

_(none)_

### Decisions

- Decision 1: No US impact. US_DEV_MANUALTEST says "A VS Code launch configuration exists for Run Extension" — this covers all modules generically.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_DEV_LAUNCHCONFIG | US_DEV_MANUALTEST | no change needed | AC text already generic; SPEC_DEV_LAUNCHCONFIG AC-3 captures the "every module" invariant |

### New Requirements

_(none)_

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: REQ_DEV_LAUNCHCONFIG left as-is — SPEC_DEV_LAUNCHCONFIG AC-3 already mandates "Run All SHALL always include every package added by a subsequent add-on CR"; no REQ-level text amendment needed.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_DEV_LAUNCHCONFIG | REQ_DEV_LAUNCHCONFIG | modified | Added syspilot to code samples, AC-3 enumeration, "Run Core + Syspilot" config; added link to SPEC_MOD_MONOREPO for structural traceability |
| SPEC_MOD_MONOREPO | REQ_MOD_CORE, REQ_MOD_ADDONS | modified | Added packages/syspilot to target layout; updated description count (4→5 packages) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MOD_SPL_PKG | Syspilot Package | REQ_MOD_ADDONS, REQ_MOD_ZEROTRACE, SPEC_SPL_PACKAGE |

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: SPEC_DEV_LAUNCHCONFIG now links to SPEC_MOD_MONOREPO (not individual _PKG specs) so that future impact scans from SPEC_MOD_MONOREPO reach the dev tooling spec.
- Decision 2: "Run Core + Syspilot" is a separate progressive config (meaningfully distinct debugging combination per AC-3(a)) since syspilot is independent of PIM/recorder.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_DEV_MANUALTEST | REQ_DEV_LAUNCHCONFIG | SPEC_DEV_LAUNCHCONFIG, SPEC_MOD_MONOREPO | ✅ |
| (new module) | REQ_MOD_ADDONS, REQ_MOD_ZEROTRACE | SPEC_MOD_SPL_PKG | ✅ |

### Artefakt-Removal-Check

No artefacts removed in this CR.

### Issues Found

**Issue 1 (found during PM T-14 manual UAT, fixed before merge):** Upstream URL in `versionCheck.ts` was missing the `syspilot/` path prefix, producing a 404 when fetching the agent file from the enthali/syspilot repository. Root cause: the repo layout is `syspilot/agents/syspilot.setup.agent.md`, not `agents/syspilot.setup.agent.md`. Fixed by System Designer (SPEC_SPL_STARTUP + SPEC_UAT_SPL_FILES AC-2 corrected, commit 3cc1379) and Dev Engineer (upstreamUrl() updated + 404-vs-network error messages split, commit 9a5df80). Two regression tests added. MECE re-verification: QUALITY PASS.

**Round 3 — Unified notification flow (commits ca44d73, 019bea8, bca1864):** PM further simplified the notification design during manual testing — the initial/update distinction and the "install" option were dropped. The syspilot module now uses a single unified message path: file is always silently copied/updated; actor is notified with skip/delay options only (no version string, no install prompt). Changes:
- System Designer (commit ca44d73): `REQ_SPL_STARTUP_CHECK` AC-1 simplified; `REQ_SPL_NOTIFY` AC-1/AC-2 unified; `SPEC_SPL_STARTUP` pseudocode uses single `notifyActor(api)` call; `SPEC_SPL_NOTIFY` uses single `UPDATE_NOTIFICATION_TEXT` constant.
- Test Designer (commit 019bea8): UAT T-3/T-5/T-8 aligned to unified flow (removed version string and install-option assertions).
- Dev Engineer (commit bca1864): `versionCheck.ts` implementation cleaned to single notification path; 4 new regression tests added; 263/263 tests passing.
- MECE re-verification: QUALITY PASS (val-dev-launchconfig-syspilot-notify-unify.md committed). Trace: PASS.

**Round 4 — Bootstrap.json removal, first-run bug fix, logging (commits 02d0e9d, 5edcf35, f2d5eac):** Further PM testing revealed two more issues:
- *bootstrap.json removed entirely:* The companion `bootstrap.json` copy was dropped from the artifact contract. Only `.github/agents/syspilot.setup.agent.md` matters for version detection. The `copyCompanionFiles()` helper was deleted; `REQ_SPL_STARTUP_CHECK` AC-1 and `SPEC_SPL_STARTUP` updated to reflect single-artifact contract.
- *First-run control-flow bug fixed:* First-run silently skipped `notifyActor()` because the version-match check ran before the `freshlyDownloaded` gate, so a freshly-copied file (version == upstream) would exit early without notifying. Fixed with a `freshlyDownloaded` flag that bypasses the match-skip branch when the file was just downloaded. New `REQ_SPL_STARTUP_CHECK` AC-3 clarified and AC-4 added (first-run SHALL always notify).
- *Logging added:* 4 decision points instrumented with `log.info` entries (upstream fetch, download status, version comparison, resulting action). `REQ_SPL_STARTUP_CHECK` AC-6 added; `SPEC_SPL_STARTUP` AC-5 added; T-22 UAT scenario added.
- Commits: System Designer (02d0e9d), Test Designer T-22 (5edcf35), Dev Engineer (f2d5eac — 266/266 tests, 3 new regression tests).
- MECE re-verification: QUALITY PASS (val-dev-launchconfig-syspilot-notify-round4.md committed). Trace: PASS.
- *Artefakt-Removal disclosure:* Issue 1 (Round 2 URL bug fix for bootstrap.json URL) is now historically superseded — the artifact was subsequently deleted rather than fixed. val-dev-launchconfig-syspilot-bugfix.md records what was true at the time and is accepted as historical stranding per the Artefakt-Removal-Check rule.

**Note — pending PM manual re-verification:** T-13 and T-14 still require PM's F5 re-test after all changes. Status remains "ready for PM manual verification".

**Rounds 5 + 6 — Auto-delivery registration and notification wording (all quality gates CLEAR):**

*Round 5 — Auto-delivery registration (commits 2c0296a, 53cfcde, 35b2ac1, 24e7688, cdf7c30):*
`notifyActor()` now idempotently registers the Syspilot Setup Engineer for auto-delivery after queuing the notification message, so the message reaches the actor even when the chat tab is not currently focused. Because `packages/core`’s `messageQueue` internals are not exported across package boundaries, the module uses local equivalent helpers independently verified by Trace Engineer. Signature and spec corrections followed (commits 24e7688, cdf7c30 — including `workspaceRoot` extraction fix). T-23 UAT scenario added to verify `autodelivery.json` registration.

*Round 6 — Notification text wording (commits d19fd41, 92da08b, cadfb23, e740d30, 2fe33f6):*
The `UPDATE_NOTIFICATION_TEXT` constant was aligned to PM-specified exact wording: the message directs the **Syspilot Setup Engineer** to ask the user whether they want to install the update now, skip this version via `SyspilotSkipThisVersion`, or postpone via `delaySyspilotUpdate` — gender-neutral "they", no explicit version number, three options. UAT T-3/T-5/T-8 aligned across all tiers (US/REQ/SPEC) with corrective commit cadfb23. Requirements-prose/AC consistency corrections applied in e740d30 and 2fe33f6.

*Final validation state:* code text, template, and test literals character-for-character aligned; 266/266 tests passing; TypeScript clean; lint 0 errors (193 baseline warnings); Sphinx 0 warnings. MECE final PASS; Trace PASS (including cdf7c30 workspaceRoot fix).

**Round 7 — LM tool-name vocabulary fix + installation-completeness gate (commits a52d724, 5b00255, b3bd4af, 3ea7078, 2986712):**

*Tool-name vocabulary fix (PM F5 finding):* The notification message used dot notation (`jarvis.delaySyspilotUpdate`) instead of the actual underscore LM tool name, causing the actor to invoke the generic `jarvis_setReminder` tool instead of the syspilot-specific one. Fixed: message now uses exact LM tool names `jarvis_SyspilotSkipThisVersion()` and `jarvis_delaySyspilotUpdate(N)`. The word "postpone" replaced by "delay" throughout (matching the tool name). System Designer (commit a52d724): REQ/SPEC updated; UAT T-3/T-5/T-8 vocabulary aligned.

*Installation-completeness gate:* Presence of `.github/agents/syspilot.pm.agent.md` is now required for the version-match early-return to fire. If the marker is absent (syspilot not fully installed), the flow bypasses only that early-return — skip/suspend gates remain honored — and still notifies the actor. Applies to both startup and manual command flows. New `REQ_SPL_STARTUP_CHECK` AC-7 added; `SPEC_SPL_STARTUP` AC-4/5/6 and `SPEC_SPL_MANUAL` pseudocode updated.

*UAT updates:* T-24 (startup, marker absent — notification fires despite version match) and T-25 (manual command, marker absent) added across all tiers. T-4 and T-15 preconditions tightened to require the marker present so they exercise the "truly up to date" path. Test Designer commits: b3bd4af, 3ea7078.

*Dev Engineer (commit 5b00255):* implementation of both changes; 270/270 tests passing (4 new regression tests).

*Final validation — Round 7:* 270/270 tests; TypeScript clean; lint 0 errors (193 baseline warnings); Sphinx 0 warnings. MECE final PASS (val-dev-launchconfig-syspilot-round7.md committed, G-3 gap closed). Trace final PASS (zero findings).

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [ ] Ready for merge — **awaiting PM manual F5 verification of T-13/T-14**

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Scoped review per CM notification: the new `SPEC_MOD_SPL_PKG` registry entry, the new `SPEC_DEV_LAUNCHCONFIG`→`SPEC_MOD_MONOREPO` traceability link, and the actual `.vscode/launch.json`/`.vscode/tasks.json` wiring.

#### Findings

None.

#### Independent Verification (for the record)

- `.vscode/launch.json` — "Run Core + Syspilot" and the updated "Run All" configs both confirmed present with correct `--extensionDevelopmentPath`/`outFiles` entries for `packages/syspilot`, matching CD/val report exactly.
- `.vscode/tasks.json` — "compile core+syspilot" and "compile all" (core→pim→recorder→mcp→flow[+build steps]→syspilot) tasks confirmed present and in the documented order.
- `docs/design/spec_mod.rst` — `SPEC_MOD_SPL_PKG` entry confirmed present.
- `packages/syspilot/package.json` — `extensionDependencies` confirmed declared, consistent with the zero-trace/add-on pattern claimed by the CD and val report.

#### Hold Status

Per CM's explicit instruction (applying the sequencing lesson from msg-notify-default-text-fix), **QM's CLEAR signal is held** pending PM's manual Extension Host verification of T-13 (zero-trace without syspilot) and T-14 (launch activation). All code/spec elements independently checked above are correct; this CR is **not yet cleared for merge** — awaiting PM's F5 confirmation before QM's final verdict.

#### PM Decisions

_(none required — no findings; awaiting F5 verification only)_

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Re-verification following PM's original T-14 manual pass finding a 404 (upstream URL missing the `syspilot/` path prefix). Bug fixed same-branch: commits 3cc1379 (spec), 9a5df80 (code + error-split + regression tests).

#### Findings

None.

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts:37` — `upstreamUrl()` confirmed returns `.../enthali/syspilot/${tag}/syspilot/agents/${fileName}` (the missing `syspilot/` segment is now present).
- `docs/design/spec_spl.rst:59` — pseudocode URL confirmed corrected to match.
- `src/tests/syspilot-versioncheck.test.ts` — 2 new regression tests confirmed asserting the corrected literal URL for both the agent file and `bootstrap.json` (tag substitution checked for both `main` and `v1.2.0`).
- Bootstrap.json fetch (`copyCompanionFiles()`) confirmed to reuse the same `upstreamUrl()` helper — single source of truth, no duplicated/divergent URL logic.
- 404-vs-network error split in `fetchText()` reviewed — distinct `reason: 'not-found' | 'network'` branches confirmed present.

#### Hold Status

Still holding — PM is re-running T-13/T-14 now per CM's update. QM's CLEAR signal remains withheld until that manual re-verification lands, per the same sequencing discipline as Round 1. All code/spec fixes independently re-verified correct in the meantime.

#### PM Decisions

_(none required — no findings; awaiting F5 verification only)_

### Round 3

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Scoped review per CM notification: the unified notification flow (dropped initial/update distinction, single skip/delay-only message, no version string, no install option) across `REQ_SPL_STARTUP_CHECK`, `REQ_SPL_NOTIFY`, `SPEC_SPL_STARTUP`, `SPEC_SPL_NOTIFY`, the implementation, and the UAT T-3/T-5/T-8 realignment.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 | SPEC_SPL_MANUAL | This spec's pseudocode (the `jarvis.syspilotUpdate` manual command) still shows `await notifyActor(api, upstreamVersion, 'update');` — the pre-unification 3-argument call with a version/reason parameter. The actual shipped code (`manualSyspilotUpdate()` in `versionCheck.ts`) already calls the unified 2-argument `notifyActor(api, log)`, matching `SPEC_SPL_STARTUP`'s updated pseudocode exactly. `SPEC_SPL_MANUAL` was not in the list of specs touched by the Round 3 commits (only `SPEC_SPL_STARTUP`/`SPEC_SPL_NOTIFY` were) — a sibling spec that consumes the same now-unified helper was missed. Purely a stale code-sample/prose issue; the manual command's actual runtime behavior is correct and already unified. | low |

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts:87-96` — `UPDATE_NOTIFICATION_TEXT` confirmed to be a single constant with no embedded version number and no install option, only skip/delay language; `notifyActor(api, log)` confirmed to take no reason/version parameter.
- `packages/syspilot/src/versionCheck.ts:160` (startup path) and `:189` (`manualSyspilotUpdate`) — both confirmed to call the same unified `notifyActor(api, log)` — one single code path for both triggers, exactly as the CD claims.
- `docs/design/spec_spl.rst` — `SPEC_SPL_STARTUP`'s pseudocode confirmed updated to the unified call; `SPEC_SPL_MANUAL`'s pseudocode confirmed NOT updated (Finding #1 above).
- Did not re-derive the full UAT T-3/T-5/T-8 diff independently this round (accepted MECE's line-referenced verification as sufficient for the UAT-tier text changes given the small, mechanical nature of the wording edits).

#### Hold Status

Per established practice on this CR: **QM's CLEAR signal remains held** pending PM's manual F5 re-verification of T-13/T-14. Finding #1 is low-severity and does not itself block merge, but is recorded for PM disposition alongside the merge decision.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now (done) | System Designer removed stale version/reason args (commit 542d451); Trace caught the `log` param was still missing vs. shipped signature, fixed (commit abb1746). QM independently re-confirmed: all 3 `notifyActor` occurrences in spec_spl.rst now read `notifyActor(api, log)`, matching shipped code exactly. Finding closed. |

---

### Round 4

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Scoped review per CM notification: removal of bootstrap.json from the artifact contract (single-artifact), the first-run control-flow bug fix (`freshlyDownloaded` flag), and logging added at 4 decision points, across `REQ_SPL_STARTUP_CHECK` (AC-1, AC-3, AC-6), `SPEC_SPL_STARTUP`, the implementation, and the new UAT T-22.

#### Findings

None.

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts`/`packages/syspilot` tree — confirmed zero remaining references to `copyCompanionFiles`/`bootstrap.json` anywhere in code or `spec_spl.rst` — single-artifact contract (agent file only) confirmed clean.
- `checkSyspilotVersion()` and `manualSyspilotUpdate()` — both confirmed to set a local `freshlyDownloaded` flag on first-run download, and both confirmed to skip the version-match early-return only when `!freshlyDownloaded` — the bug fix (first-run always notifies regardless of version match) is present in both call paths, matching `REQ_SPL_STARTUP_CHECK` AC-3/AC-4 exactly.
- Logging — confirmed all 4 decision points present: upstream version fetched (`log.info('[SPL] upstream version: ...')`), local-file-missing/download (`'[SPL] local file missing — downloading...'`), comparison result (`'[SPL] local=..., upstream=...'`), and all 4 resulting-decision branches (up-to-date, skipped, suspended, notifying) each logged distinctly — matches `REQ_SPL_STARTUP_CHECK` AC-6 exactly.
- `src/tests/syspilot-versioncheck.test.ts` — confirmed 3 new regression tests: first-run always-notifies (bug fix), existing-file-with-match does NOT notify (regression guard), and decision-point logging assertions (upstream version, missing-file, notify-decision log lines).
- `docs/requirements/req_spl.rst` AC-1/AC-3/AC-6 — wording confirmed to match implementation precisely (no bootstrap.json, "NOT just freshly copied" gate, 4 named logging points).

#### Hold Status

Per established practice on this CR: **QM's CLEAR signal remains held** pending PM's manual F5 re-verification. No findings this round.

#### PM Decisions

_(none required — no findings)_

---

### Round 5+6 (retroactive)

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

CM's Rounds 5+6 notification was a closeout summary only — auto-delivery registration (`SPEC_SPL_NOTIFY` AC-4, T-23) and the exact three-choice notification wording (install now / skip / postpone) were implemented, MECE/Trace-passed, and folded into the CD's Final Consistency Check section *before* QM was dispatched to review either round individually. QM is reviewing both retroactively in this single combined round, scoped to: `notifyActor()`'s new `workspaceRoot` parameter and `addAutoDelivery()` idempotent registration; the `UPDATE_NOTIFICATION_TEXT` wording change; and the corresponding REQ/SPEC/UAT/test alignment.

#### Process Note

Unlike Rounds 1–4, QM was not individually dispatched per-round for Rounds 5 and 6 — they were implemented, MECE/Trace-verified, and merged into the CD's narrative as already "CLEAR" before reaching QM. This is the same class of sequencing gap previously flagged on `msg-notify-default-text-fix` (independent QM review arriving after work is already presented as settled). No functional problem was found in this case (see Findings below), but flagging the pattern again for PM/CM awareness: QM's independent-review dispatch should happen once per round, before the round is narrated as closed in the CD, not batched retroactively.

#### Findings

None.

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts:80` — `notifyActor(api, workspaceRoot, log)` confirmed 3-arg; both call sites (`checkSyspilotVersion` line 182, `manualSyspilotUpdate` line 230) confirmed passing `workspaceRoot` correctly.
- `docs/design/spec_spl.rst` — all 4 `notifyActor` occurrences (SPEC_SPL_STARTUP pseudocode, SPEC_SPL_NOTIFY function signature, SPEC_SPL_MANUAL pseudocode) confirmed updated to the 3-arg signature — no stale 2-arg leftovers this time.
- `addAutoDelivery()`/`resolveMessagesPath()` — confirmed idempotent (checks `list.includes(sessionName)` before appending) and correctly mirrors `.jarvis/messages.json` / `.jarvis/autodelivery.json` paths.
- `src/tests/syspilot-versioncheck.test.ts` — confirmed a regression test asserting auto-delivery registration on first notify AND non-duplication on a second notify (idempotency); confirmed 3 tests asserting `UPDATE_NOTIFICATION_TEXT`'s exact literal text, absence of a version-number pattern, and presence of all three choices (install/skip/postpone).
- `docs/requirements/req_spl.rst` — `REQ_SPL_NOTIFY` AC-3/AC-4 wording confirmed to match "install this update now, skip this version permanently, or postpone notifications for N days" exactly as implemented.
- `docs/design/spec_uat_spl.rst` — T-23 (auto-delivery registration scenario) confirmed present; T-3/T-5/T-8 confirmed reworded to "install now" language, no stale "run workflow" phrasing remaining anywhere in the UAT tiers.

#### Hold Status

Per established practice on this CR: **QM's CLEAR signal remains held** pending PM's final manual F5 verification. No findings this round; the process note above is informational, not a blocker.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | Process Note | accept-as-is (this CR) | No functional harm resulted — QM's retroactive combined review found zero issues. Accepting for `dev-launchconfig-syspilot` since the CR is otherwise complete and re-litigating dispatch order now would only add delay. Action item recorded separately: CM should dispatch QM once per round, before narrating a round as closed in the CD, for future multi-round CRs (same class of gap as `msg-notify-default-text-fix`, second occurrence — worth a direct process check with CM, not just a documentation note). |

---

### Round 7

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Scoped review per CM notification (dispatched before closeout this time — the Round 5+6 dispatch-timing process note was addressed): PM F5-test-driven follow-ups — (a) notification text corrected to real underscore LM tool names (`jarvis_SyspilotSkipThisVersion`/`jarvis_delaySyspilotUpdate`, "delay" not "postpone"); (b) new installation-completeness gate requiring `.github/agents/syspilot.pm.agent.md` before the version-match early-return applies, in both startup and manual flows, skip/suspend still honored.

#### Findings

None.

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts` — `UPDATE_NOTIFICATION_TEXT` confirmed to use `jarvis_SyspilotSkipThisVersion()`/`jarvis_delaySyspilotUpdate(N)` (underscore LM tool names) and "delay" wording, not the old dot-notation VS Code command names or "postpone".
- `packages/syspilot/src/extension.ts` — confirmed the LM tool registrations are literally named `jarvis_delaySyspilotUpdate` and `jarvis_SyspilotSkipThisVersion` (registerLanguageModelTool), matching the notification text exactly; the separate dot-notation `jarvis.delaySyspilotUpdate`/`jarvis.SyspilotSkipThisVersion` VS Code *commands* remain distinct and correctly not referenced in the actor-facing message.
- `isInstalled()` — confirmed checks `.github/agents/syspilot.pm.agent.md` existence; both `checkSyspilotVersion()` and `manualSyspilotUpdate()` confirmed to bypass the version-match early-return when `!installed`, while still honoring skip/suspend afterward (startup flow) — matches `REQ_SPL_STARTUP_CHECK` AC-7 exactly.
- `src/tests/syspilot-versioncheck.test.ts` — confirmed new regression tests: still-notifies-when-marker-absent (both startup and manual paths), does-NOT-notify when installed+match, and explicit assertions that the notification text contains the underscore tool names and does NOT contain the old dot-notation names.
- `docs/design/spec_spl.rst`/`docs/requirements/req_spl.rst` — AC-7/AC-4/AC-5/AC-6 wording and pseudocode confirmed to match the implementation precisely; no stale "postpone" or dot-notation tool-name references remain.
- `docs/design/spec_uat_spl.rst` — T-15 (precondition now requires installed marker for genuine "up to date" path) and new T-25 (manual command + marker absent + version match → gate fires → notification, no "up to date" toast) confirmed present and correctly scoped.

#### Hold Status

Per established practice on this CR: **QM's CLEAR signal remains held** pending PM's re-test of this round. No findings.

#### PM Decisions

_(none required — no findings)_

---

### Round 8

**Reviewed by:** QM
**Review date:** 2026-07-21

#### Scope

Scoped review per CM notification: `packages/syspilot/package.json` lacked `contributes.languageModelTools` manifest entries for `jarvis_delaySyspilotUpdate`/`jarvis_SyspilotSkipThisVersion` — the likely true root cause of Round 7's "wrong tool called" symptom (tools registered at runtime via `api.registerTool()` but never surfaced in VS Code's "Configure Tools" picker without a manifest declaration). Fixed by adding both entries matching `packages/core/package.json`'s shape.

#### Findings

None.

#### Independent Verification (for the record)

- `packages/syspilot/package.json` — `contributes.languageModelTools` confirmed to declare both `jarvis_delaySyspilotUpdate` (`toolReferenceName: delaySyspilotUpdate`, `inputSchema` requiring `days: number`) and `jarvis_SyspilotSkipThisVersion` (`toolReferenceName: SyspilotSkipThisVersion`, empty input schema) — shape (displayName/modelDescription/canBeReferencedInPrompt/icon/tags/inputSchema) confirmed structurally identical to `packages/core/package.json`'s existing entries.
- `packages/syspilot/src/extension.ts` — confirmed both `api.registerTool('jarvis_delaySyspilotUpdate', ...)` and `api.registerTool('jarvis_SyspilotSkipThisVersion', ...)` runtime registrations use the exact same tool names as the new manifest entries, and the `days` input parameter matches the manifest's `inputSchema`.
- `docs/requirements/req_spl.rst`/`docs/design/spec_spl.rst` — `REQ_SPL_PACKAGE` AC-4 and `SPEC_SPL_PACKAGE` AC-5 confirmed present and worded consistently with the actual manifest JSON added.
- `docs/design/spec_uat_spl.rst` — T-2 (strengthened to check the "Configure Tools" picker) and new T-26 (manifest inspection + picker visibility for both tools) confirmed present and correctly scoped.

#### Hold Status

Per established practice on this CR: **QM's CLEAR signal remains held** pending PM's re-test of both Round 7 and Round 8 together (per CM's combined-review request). No findings.

#### PM Decisions

_(none required — no findings)_

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
