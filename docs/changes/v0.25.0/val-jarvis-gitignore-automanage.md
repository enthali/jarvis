# Validation Report: jarvis-gitignore-automanage

**Change Request**: jarvis-gitignore-automanage (GH #60)
**Change Document**: [jarvis-gitignore-automanage.md](jarvis-gitignore-automanage.md)
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED**

---

## Scope

Verified only what the Change Document declares as changed.

### New elements

| ID | Level | Verified against |
|---|---|---|
| `US_CFG_AUTOGITIGNORE` | L0 | every AC discharged at L1 and L2 (table below) |
| `REQ_CFG_IGNOREPATTERNS` | L1 | `configPaths.ts` `WORKSPACE_PATHS` / `getIgnoreEntries()` |
| `REQ_CFG_IGNOREBLOCK` | L1 | `gitignoreManager.ts` region functions |
| `REQ_CFG_IGNOREAUTOMANAGE` | L1 | `package.json` setting + `extension.ts` change listener |
| `SPEC_CFG_IGNOREMANAGER` | L2 | `gitignoreManager.ts` (spec embeds the actual code) |

### Modified elements

| ID | Change verified |
|---|---|
| `REQ_CFG_FILEPREFIX` | new AC-7 (rule is one-directional) present |
| `SPEC_CFG_PATHRESOLVER` | `WORKSPACE_PATHS` (path + durability) and `getIgnoreEntries()` present |
| `SPEC_CFG_WORKSPACEFILES` | `.jarvis/`-as-a-unit recommendation corrected; durability column present |
| `SPEC_HOOK_CONFIG` | hooks entry now described as maintained, not recommended |

---

## Traceability

Every AC of the new story reaches both lower levels. Re-checked against the CD's
own table, and each target read in the RST source:

| `US_CFG_AUTOGITIGNORE` | Requirement | Design |
|---|---|---|
| AC-1 no user action | `REQ_CFG_IGNOREBLOCK` AC-3, `REQ_CFG_IGNOREPATTERNS` AC-1 | `SPEC_CFG_IGNOREMANAGER` AC-2/3/4 |
| AC-2 self-explaining region | `REQ_CFG_IGNOREBLOCK` AC-1 | Markers section |
| AC-3 byte-exact preservation | `REQ_CFG_IGNOREBLOCK` AC-5, AC-6 | `withRegion`/`withoutRegion`, `detectEol` |
| AC-4 no collateral ignoring | `REQ_CFG_IGNOREPATTERNS` AC-2/3/4 | `WORKSPACE_PATHS` durability, AC-11 |
| AC-5 opt-out removes | `REQ_CFG_IGNOREAUTOMANAGE` AC-3 | `withoutRegion`, change listener, AC-7 |
| AC-6 no churn | `REQ_CFG_IGNOREBLOCK` AC-4, AC-11 | byte comparison, AC-5 |
| AC-7 non-git workspace | `REQ_CFG_IGNOREBLOCK` AC-8 | `workspaceRootIfGitRepo`, AC-9 |

No orphan requirement, no design element without an upward link. ✅

---

## Code vs. specification

| Spec claim | Evidence | Result |
|---|---|---|
| `gitignoreManager.ts` exports region primitives | [gitignoreManager.ts](../../packages/core/src/engine/core/gitignoreManager.ts#L17-L56) — `locateRegion`, `detectEol`, `withRegion`, `withoutRegion`, `workspaceRootIfGitRepo` | ✅ |
| `applyGitignoreAt(root, managed)` is the testable pure-filesystem core | [gitignoreManager.ts](../../packages/core/src/engine/core/gitignoreManager.ts#L73) | ✅ |
| `applyGitignore()` is a thin wrapper: resolve root → read config → delegate → contain errors | [gitignoreManager.ts](../../packages/core/src/engine/core/gitignoreManager.ts#L97-L106) | ✅ |
| Managed vs. opt-out selects `withRegion` / `withoutRegion` | [gitignoreManager.ts](../../packages/core/src/engine/core/gitignoreManager.ts#L89-L90) | ✅ |
| `WORKSPACE_PATHS` carries path + durability; `getIgnoreEntries()` derives from it | [configPaths.ts](../../packages/core/src/engine/core/configPaths.ts#L144-L163) | ✅ |
| Region content is an enumerated anchored list, never `**/jarvis-*` | root `.gitignore` read; no `**/jarvis-*` anywhere | ✅ |

The decisive design correction of this CR — rejecting the CD's own proposed
`**/jarvis-*` pattern, which git's matcher showed would untrack 15 tracked
authored files including this CR's own Change Document — is present in the
shipped state: the pattern does not appear, and the enumerated list is what
`getIgnoreEntries()` returns.

---

## Build and tests

| Check | Result |
|---|---|
| `compile all` (7 packages + 2 webview builds) | ✅ clean |
| `npx vitest run` | ✅ 398 passed / 398, 39 files |

Test coverage for this CR specifically: `gitignore-manager.test.ts` calls the
real exported `applyGitignoreAt` against temp-directory fixtures across create,
append, rewrite-stale, idempotency (real `mtimeMs` comparison), malformed-refuse
(byte equality), opt-out removal, opt-out-no-region, opt-out-with-no-file, and
the two EOL cases. No simulated logic remains — verified by reading the file.

---

## Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | — | QM Round 1 raised two findings (untested `applyGitignore`, overclaimed mixed-EOL preservation). Both PM `fix-now`; both verified resolved in QM Round 2 and independently re-confirmed here. | Closed |
| 2 | low | No UAT scenario family exists for this area. Consistent with GH #58's precedent, tracked under GH #61. | Open, accepted |
| 3 | low | `REQ_CFG_GROUPS` and `SPEC_CFG_MANIFEST` remain stale (CD Issues 5/6). Disclosed by the CD and correctly scoped out of this CR. | Open, separate CR |

No blocking issue. Findings 2 and 3 were open before this CR and are unchanged
by it.

---

## Status updates applied

`US_CFG_AUTOGITIGNORE`, `REQ_CFG_IGNOREPATTERNS`, `REQ_CFG_IGNOREBLOCK`,
`REQ_CFG_IGNOREAUTOMANAGE`, `SPEC_CFG_IGNOREMANAGER`: `approved` → `implemented`.

`REQ_CFG_FIXEDPATHS`, `SPEC_CFG_PATHRESOLVER`, `SPEC_HOOK_AUTOINST` already
`implemented` — unchanged.
