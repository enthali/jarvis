# MECE Findings: syspilot-release-readiness — Round 1

**Date:** 2026-07-22
**Scope:** L0 (none touched) + L1 (REQ_MOD_ADDONS AC-7, REQ_REL_UPDATEINSTALL) + L2 (SPEC_REL_COREGH, SPEC_REL_UPDATENOTIFY, SPEC_MOD_SPL_PKG, SPEC_MOD_SUITE, SPEC_MOD_ADDON_ONBOARDING) + code (`release.yml`, `updateCheck.ts`, `packages/syspilot/README.md`, `packages/suite/*`) + agent tailoring file + UAT tiers (T-10, T-16, T-17)
**Commits reviewed:** 0eeec29 (System Designer), 52ac20c (Dev Engineer), f94f658 (Test Designer)
**Status:** PASS

## 1. REQ/SPEC MECE — New AC-7 / Onboarding Checklist

`REQ_MOD_ADDONS` AC-1..AC-7 each cover a distinct, non-overlapping add-on
(pim/recorder/-/mcp/flow/syspilot, plus AC-3/AC-4 as cross-cutting
contribution/registration rules). AC-7 (syspilot) follows the exact pattern
of AC-5 (mcp)/AC-6 (flow) — no duplication, no gap.

`SPEC_MOD_ADDON_ONBOARDING` (new) is scoped purely to *process* (a
checklist to run during future add-on CRs) — it does not restate or
duplicate any AC from `REQ_MOD_ADDONS`, `SPEC_REL_COREGH`,
`REQ_REL_UPDATEINSTALL`, `SPEC_REL_UPDATENOTIFY`, or `SPEC_MOD_MONOREPO`; it
only *references* them by ID. No overlap introduced.

**Result:** ✅ Mutually exclusive, collectively exhaustive. No overlaps from
the new AC-7 or the onboarding checklist addition.

## 2. `release.yml` vs. `SPEC_REL_COREGH` CI Sequence

| SPEC narrative step | `release.yml` step | Match |
|---|---|---|
| 1. `npm ci` + compile + esbuild bundle (core) | `npm ci`, `npm run compile`, `node packages/core/build.js --minify` | ✅ |
| 2. Package `enthali.jarvis-core` | `cd packages/core && npx vsce package --no-dependencies` | ✅ |
| 3. Build+package `enthali.jarvis` shim (own `vscode:prepublish`, no bundle copy) | `cd packages/core-gh && npx vsce package --no-dependencies` (comment confirms no copy from core) | ✅ |
| 4. Package add-ons (pim, recorder, mcp, flow, syspilot) | Five explicit `vsce package` steps in that exact order, syspilot included | ✅ |
| 5. GitHub Release — upload all VSIXs (core, shim, pim, recorder, mcp, flow, syspilot) | `files:` glob lists all seven `*.vsix` paths including `packages/syspilot/*.vsix` | ✅ |
| 6. Marketplace publish — core + add-ons only, NOT `jarvis` | Six `vsce publish` steps: core, pim, recorder, mcp, flow, syspilot, suite — no `jarvis`/core-gh publish step | ✅ |

**Result:** ✅ Exact match. `packages/syspilot` is fully wired into
packaging (step 4), GitHub Release upload (step 5), and Marketplace publish
(step 6), consistent with the checklist's item 1.

**Observation (non-blocking):** `release.yml` also packages/publishes
`enthali.jarvis-suite` (not mentioned in the SPEC's 6-step narrative, which
predates the suite deprecation decision). This is pre-existing behavior, not
introduced by this CR, and is consistent with `SPEC_MOD_SUITE` AC-3 ("the
pack remains publishable for existing users"). Not a finding.

## 3. `updateCheck.ts` `idToVsix` vs. REQ/SPEC Mapping Tables

| Extension ID | REQ_REL_UPDATEINSTALL table | `idToVsix` (updateCheck.ts) | Match |
|---|---|---|---|
| `enthali.jarvis` | `jarvis-{version}.vsix` | `` `jarvis-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-core` | `jarvis-core-{version}.vsix` | `` `jarvis-core-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-pim` | `jarvis-pim-{version}.vsix` | `` `jarvis-pim-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-recorder` | `jarvis-recorder-{version}.vsix` | `` `jarvis-recorder-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-mcp` | `jarvis-mcp-{version}.vsix` | `` `jarvis-mcp-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-flow` | `jarvis-flow-{version}.vsix` | `` `jarvis-flow-${newVersion}.vsix` `` | ✅ |
| `enthali.jarvis-syspilot` | `jarvis-syspilot-{version}.vsix` | `` `jarvis-syspilot-${newVersion}.vsix` `` | ✅ |

`SPEC_REL_UPDATENOTIFY`'s design-level mapping table (mirrors the REQ table)
also confirmed to include the identical `enthali.jarvis-syspilot` row.

**Result:** ✅ Exact match — extension ID and VSIX filename pattern
identical across REQ, SPEC, and code for all seven entries, including the
new syspilot row.

## 4. `packages/syspilot/README.md` vs. Shipped Notification Text

| Source | Text |
|---|---|
| `UPDATE_NOTIFICATION_TEXT` (`versionCheck.ts`, confirmed in Round 7) | "...install this update now, skip this version by calling `jarvis_SyspilotSkipThisVersion()`, or delay it for N days by calling `jarvis_delaySyspilotUpdate(N)`." |
| `packages/syspilot/README.md` | "...asking the user whether they want to install the update now, skip this version by calling `jarvis_SyspilotSkipThisVersion()`, or delay it for N days by calling `jarvis_delaySyspilotUpdate(N)`." |

**Result:** ✅ README wording matches the shipped code's tool names
(underscore notation) and "delay" terminology exactly — consistent with the
dev-launchconfig-syspilot Round 7/8 findings. No stale "postpone" or
dot-notation references.

## 5. Suite Deprecation vs. `SPEC_MOD_SUITE` AC-1/AC-2

- `packages/suite/package.json` description: `"[DEPRECATED] Install all
  Jarvis capabilities: ... Install components individually instead."` — ✅
  contains "DEPRECATED" and redirect language (AC-1).
- `packages/suite/README.md`: opens with a blockquote `> **Deprecated.**
  This extension pack is no longer maintained. Install the Jarvis components
  you need individually instead...` — ✅ (AC-1).
- `extensionPack` array: `["enthali.jarvis-core", "enthali.jarvis-pim",
  "enthali.jarvis-recorder", "enthali.jarvis-mcp", "enthali.jarvis-flow"]` —
  ✅ does **not** include `enthali.jarvis-syspilot` (AC-2).

**Result:** ✅ Matches `SPEC_MOD_SUITE` AC-1/AC-2 exactly.

## 6. `SPEC_MOD_ADDON_ONBOARDING` Checklist vs. `syspilot.design.tailoring.md`

Compared the 6-item checklist in `SPEC_MOD_ADDON_ONBOARDING` against the
identically-numbered list in `.github/agents/syspilot.design.tailoring.md`
("Add-on Onboarding Preflight" section) — both lists cover, in the same
order: (1) Release CI, (2) self-update REQ-level mapping, (3) self-update
SPEC-level mapping, (4) `updateCheck.ts` `idToVsix`, (5)
`REQ_MOD_ADDONS` new AC, (6) `SPEC_MOD_MONOREPO` layout — including the same
closing rationale sentence about `jarvis-flow`/`jarvis-syspilot` past
incidents.

**Bidirectional link check:**
- `REQ_MOD_ADDONS` `:links:` includes `SPEC_MOD_ADDON_ONBOARDING`. ✅
- `SPEC_MOD_ADDON_ONBOARDING` `:links:` includes `REQ_MOD_ADDONS`. ✅

**Result:** ✅ Content matches (tailoring file is a faithful operational
restatement of the spec checklist) and the traceability link is
bidirectional.

**Checklist item 6 self-check:** `SPEC_MOD_MONOREPO`'s "Target layout" code
block already lists `syspilot/ -> enthali.jarvis-syspilot` (added by the
prior `jarvis-syspilot` CR) — item 6 is already satisfied for syspilot, not
newly touched by this CR, consistent with `SPEC_MOD_ADDON_ONBOARDING` AC-1
("satisfied for all currently shipped add-ons").

## 7. UAT Tiers (T-10, T-16, T-17)

- **T-10** (US/REQ AC-5/SPEC, self-update tier): verifies the `idToVsix`
  entry for syspilot resolves correctly and the extension is included in the
  "Download & Install" batch. Linked to `REQ_REL_UPDATEINSTALL`. Scenario
  count 9→10 updated consistently in US/REQ.
- **T-16** (US/REQ AC-7/SPEC, modular-install tier): static check that
  `packages/syspilot` is packaged and uploaded in `release.yml`. Linked to
  `SPEC_REL_COREGH`. Minor phrasing looseness: expected text says the
  release-upload step includes `packages/syspilot/enthali.jarvis-syspilot-*.vsix`
  (or equivalent asset pattern) — actual glob is `packages/syspilot/*.vsix`
  and the real VSIX filename is `jarvis-syspilot-{version}.vsix` (no
  `enthali.` prefix). The scenario's own escape clause ("or the equivalent
  asset pattern") covers this; not a defect, but worth tightening in a future
  pass for precision.
- **T-17** (US/REQ AC-7/SPEC): static check of suite deprecation +
  `extensionPack` exclusion, linked to `SPEC_MOD_SUITE` AC-1. No overlap
  with T-16 (different concern: packaging pipeline vs. suite pack content).

**Result:** ✅ No redundant overlap between T-10/T-16/T-17 or with
pre-existing scenarios in either UAT set. Both `us_uat_selfupdate.rst` and
`us_uat_modular_install.rst` scenario/AC counts updated consistently across
US/REQ/SPEC tiers.

## 8. Quality Gates

| Gate | Result |
|---|---|
| `npx tsc -p packages/core && npx tsc -p packages/syspilot` | ✅ 0 errors |
| `npm test` (full suite) | ✅ 270/270 passing |
| Sphinx build (`-W --keep-going`) | ✅ 0 warnings |

## Findings Summary

No blocking findings. One cosmetic, non-blocking observation in T-16's
expected-text precision (Section 7) — already covered by the scenario's own
escape clause.

## Verdict

**PASS.** REQ/SPEC ACs are mutually exclusive and collectively exhaustive
with no overlaps introduced by the new AC-7/onboarding checklist.
`release.yml`, `updateCheck.ts`, the syspilot README, and suite deprecation
artifacts all match their governing REQ/SPEC text exactly. The onboarding
checklist and its tailoring-file mirror are content-consistent and
bidirectionally linked. UAT coverage (T-10/T-16/T-17) is exhaustive and
non-overlapping.
