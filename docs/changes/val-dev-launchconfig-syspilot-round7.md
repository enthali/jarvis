# MECE Findings: dev-launchconfig-syspilot — Round 7

**Date:** 2026-07-21
**Scope:** L1 (REQ_SPL_NOTIFY, REQ_SPL_STARTUP_CHECK, REQ_SPL_MANUAL) + L2 (SPEC_SPL_NOTIFY, SPEC_SPL_STARTUP, SPEC_SPL_MANUAL) + code (`versionCheck.ts`) + UAT tiers (T-3, T-4, T-5, T-8, T-13..T-15, T-24) + regression tests
**Commits reviewed:** a52d724 (System Designer), 5b00255 (Dev Engineer), b3bd4af (Test Designer)
**Status:** PARTIAL PASS — no functional defects; one UAT-tier coverage gap found

## 1. Vocabulary: Underscore LM Tool Names + "delay" (not dot-notation/postpone)

| Source | Text |
|---|---|
| `UPDATE_NOTIFICATION_TEXT` (`versionCheck.ts`) | `Please ask the user whether they want to install this update now, skip this version by calling jarvis_SyspilotSkipThisVersion(), or delay it for N days by calling jarvis_delaySyspilotUpdate(N).` |
| `SPEC_SPL_NOTIFY` message template + pseudocode `text` literal | Identical string (concatenated). |
| `REQ_SPL_NOTIFY` AC-1 / Description | "install this update now, skip this version permanently, or delay it for N days ... underscore-delimited LM tool names (`jarvis_SyspilotSkipThisVersion`, `jarvis_delaySyspilotUpdate`)." |
| UAT tiers (US/REQ/SPEC) T-3, T-5, T-8 | All say "three choices: install now / skip / delay for N days", reference `jarvis_SyspilotSkipThisVersion` / `jarvis_delaySyspilotUpdate` (underscore only). |
| Regression test | `UPDATE_NOTIFICATION_TEXT` exact-string assertion + keyword presence checks. |

**Result:** ✅ Fully consistent. Zero occurrences of dot-notation
(`jarvis.SyspilotSkipThisVersion()`/`jarvis.delaySyspilotUpdate()` as
*message-text* tool references) or "postpone" anywhere in code, REQ, SPEC, or
UAT tiers. (Dot-notation command IDs `jarvis.delaySyspilotUpdate` /
`jarvis.SyspilotSkipThisVersion` correctly remain as the VS Code **command**
identifiers in `package.json`/REQ_SPL_SUSPEND/REQ_SPL_SKIP — a distinct,
correct usage from the underscore **LM tool** names used in the notification
text and referenced by T-8/AC-8.)

## 2. Installation-Completeness Gate — Startup Flow

`checkSyspilotVersion()`: `isInstalled(workspaceRoot)` (checks
`.github/agents/syspilot.pm.agent.md`) gates the version-match early-return
alongside `freshlyDownloaded`; skip/suspend checks remain downstream,
unaffected. Matches `SPEC_SPL_STARTUP` pseudocode/AC-4/AC-6 and
`REQ_SPL_STARTUP_CHECK` AC-7 exactly (including the log line
`freshlyDownloaded=..., installed=... — bypassing version-match gate`).

**Result:** ✅ Matches spec. Skip/suspend gates are still honored — the
installed-marker check only affects the version-match early return, not the
downstream skip/suspend checks (confirmed by reading the gate ordering in
`versionCheck.ts`).

## 3. Installation-Completeness Gate — Manual Flow

`manualSyspilotUpdate()` applies the identical `isInstalled(workspaceRoot)`
gate before its own version-match early return (up-to-date info message),
matching `REQ_SPL_MANUAL` AC-2 ("same version comparison as the startup
check") and `SPEC_SPL_MANUAL`'s pseudocode, which explicitly re-checks
`syspilot.pm.agent.md`.

**Result:** ✅ Code/REQ/SPEC consistent — marker-absent + version-match
correctly bypasses the "up to date" short-circuit and falls through to
`notifyActor()` in both flows. Confirmed at the regression-test level too:
`manualSyspilotUpdate: notifies when installed but the PM marker is absent,
even if versions match` (`syspilot-versioncheck.test.ts`).

**UAT-tier gap:** T-24 (installation-completeness gate) exists only for the
**startup** flow ("Reload the VS Code window"). There is no corresponding
manual-command scenario mirroring T-24 (marker absent + version match →
manual command notifies instead of showing "up to date"), even though this
exact case is code-verified and matches AC-2/SPEC_SPL_MANUAL. Additionally,
**T-15**'s setup ("Local file version matches upstream exactly. No
suspend/skip active.") does not state that the `syspilot.pm.agent.md` marker
is present — for T-15's expected "up to date" outcome to hold, the marker
must be present, but this precondition is left implicit while the sibling
T-4 (startup, same scenario) explicitly states it ("`syspilot.pm.agent.md`
also exists (installation is complete)"). This is a minor human-run UAT
completeness gap, not a functional defect.

## 4. Notify vs. No-Notify Matrix

| Marker present | Versions match | Flow | Expected | Code | REQ/SPEC | UAT |
|---|---|---|---|---|---|---|
| yes | yes | startup | no notify | ✅ | ✅ (AC-3/AC-7) | ✅ T-4 |
| yes | yes | manual | "up to date" info, no notify | ✅ | ✅ (AC-2) | ⚠️ T-15 (marker precondition implicit) |
| no | yes | startup | notify | ✅ | ✅ (AC-7) | ✅ T-24 |
| no | yes | manual | notify | ✅ | ✅ (AC-2, by reference) | ❌ no dedicated scenario |
| any | no | startup | notify (subject to skip/suspend) | ✅ | ✅ (AC-4) | ✅ T-5 |
| any | no | manual | notify (skip/suspend ignored) | ✅ | ✅ (AC-1/AC-2) | ✅ T-13/T-14 |

## 5. Logging

`versionCheck.ts` logs `installed=<bool>` alongside `local=`/`upstream=` in
both the true-up-to-date branch and the bypass branch
(`freshlyDownloaded=..., installed=... — bypassing version-match gate`),
matching `SPEC_SPL_STARTUP` AC-5/AC-6 and `REQ_SPL_STARTUP_CHECK` AC-6.
T-22 (decision-point logging) and T-24 (gate detection) correctly partition
the true-up-to-date case from the incomplete-install case at the UAT level.

**Result:** ✅ Matches spec.

## 6. Quality Gates

| Gate | Result |
|---|---|
| `npx tsc -p packages/core && npx tsc -p packages/syspilot` | ✅ 0 errors |
| `npx vitest run src/tests/syspilot-versioncheck.test.ts` | ✅ 22/22 passing |
| `npm test` (full suite) | ✅ 270/270 passing |
| Sphinx build (`-W --keep-going`) | ✅ 0 warnings |

## Findings Summary

| ID | Severity | Description | Status |
|---|---|---|---|
| G-3 | Low (documentation/UAT-tier only) | No manual-command UAT scenario mirrors T-24 (marker-absent + version-match → notify); T-15's setup doesn't state the marker-present precondition needed for its "up to date" expectation to hold unambiguously. | Open, non-blocking — behavior is already code- and regression-test-verified. |

## Recommendation

Add a T-25 (or fold into T-15's setup) explicitly stating the marker
precondition for T-15, and optionally add a manual-path counterpart to T-24.
Documentation-only; no code, REQ, or SPEC change needed.

## Verdict

**PASS** on all functional requirements (vocabulary, both gate flows, logging,
notify/no-notify matrix, quality gates). One low-severity, non-blocking UAT
documentation gap (G-3) noted for optional follow-up.
