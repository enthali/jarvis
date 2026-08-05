# Validation Report: touched-files-cleanup

**Change Request**: touched-files-cleanup
**Change Document**: [touched-files-cleanup.md](touched-files-cleanup.md)
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED**

---

## Scope

Verified only what the Change Document declares as changed. All three elements
were already at `:status: implemented` before this verification.

| ID | Level | Declared change |
|---|---|---|
| `US_ENT_TOUCHEDFILES` | L0 | Context paragraph; AC-8 extended to branch and category; AC-10..AC-14 added |
| `REQ_ENT_TOUCHEDFILES` | L1 | recorded-vs-displayed note; AC-7/AC-13 rewritten; AC-15, AC-15a, AC-16, AC-17, AC-18 added |
| `SPEC_ENT_TOUCHEDFILES` | L2 | filter helpers, `contextValue` split, three `TouchStore` methods, two commands, the setting, the config-change subscription, five design notes; AC list renumbered and extended to AC-21 |

No new elements. No artefact removed.

---

## Traceability

The CD's own table was re-checked against the RST sources and the code:

| Level 0 | Level 1 | Level 2 / code |
|---|---|---|
| AC-8 trash on entry / branch / category | AC-13 | `removeEntry` / `removeUnder` / `removeAll`, `jarvis.removeTouchedFile(s)`, `jarvisTouchedFileFolder` |
| AC-10 absent files hidden, not deleted | AC-16 | `existingOnly()` at category expansion |
| AC-11 rolling window, default 0 | AC-15, AC-15a | `withinWindow()`, `readWindowDays()`, the setting, `onDidChangeConfiguration` → `refreshAll()` |
| AC-12 nothing removed automatically | AC-18 | no timer, no activation hook; every removal path is a registered command |
| AC-13 cleanup action reports its result | AC-17 | `removeMissing()`, `jarvis.cleanupTouchedFiles`, `showInformationMessage` |
| AC-14 no removal is permanent | AC-13 | unchanged — `recordTouches()` recreates on next touch |
| category visibility (D-7) | AC-7 | `withinWindow()` in `_getLeafChildren()` |

AC-18 is checkable by inspection: no `TouchStore` method removes anything on a
time criterion. Confirmed by reading all four removal methods. ✅

---

## Code vs. specification

| Spec claim | Evidence | Result |
|---|---|---|
| `existingOnly()` filters to files present on disk, fails open with no workspace root | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L104-L105) — `if (!workspaceRoot) { return entries; }` | ✅ |
| `readWindowDays()` reads the setting, 0 = no limit | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L116) | ✅ |
| `withinWindow()` is a rolling window against the later of last-read / last-edited (D-10) | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L121-L130) — `Math.max` over both, `windowDays <= 0` short-circuit | ✅ |
| Category visibility keyed to the window only, never to the existence check (D-7/D-13) | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L677) — `withinWindow(...)` in the leaf-children path; no `existingOnly` call there | ✅ |
| Folder `contextValue` split (F-13) | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L453) — `jarvisTouchedFileFolder` | ✅ |
| Three new `TouchStore` methods | [touchStore.ts](../../packages/core/src/engine/hooks/touchStore.ts#L87-L102) | ✅ |
| `removeMissing()` keeps its probes inside the synchronous critical section (F-14, AC-6a) | `touchStore.ts` `removeMissing` body read directly — no `await` between load and save | ✅ |
| One handler serves folder and category, switching on `node.kind` (D-15) | [extension.ts](../../packages/core/src/extension.ts#L850-L855) | ✅ |
| Cleanup command names the entity (QM R1 Finding 3 fix) | [extension.ts](../../packages/core/src/extension.ts#L863-L866) | ✅ |
| Config-change subscription (AC-15a / SPEC AC-21) | [extension.ts](../../packages/core/src/extension.ts#L878) — `affectsConfiguration('jarvis.touchedFiles.windowDays')` | ✅ |
| Setting contributed: number, default 0, minimum 0, Hooks group | [package.json](../../packages/core/package.json#L268) | ✅ |

`existingOnly()`'s fail-open branch is the property most easily lost in a later
refactor and the one a reader is least likely to expect, so it was checked
against AC-15's wording specifically rather than inferred from the function name.

---

## Build and tests

| Check | Result |
|---|---|
| `compile all` | ✅ clean |
| `npx vitest run` | ✅ 398 passed / 398, 39 files |

`touched-files-cleanup.test.ts`: 9 behavioural tests calling the real exported
`withinWindow` / `existingOnly` and the real `TouchStore.removeUnder` /
`removeAll` / `removeMissing` against temp-directory fixtures. No simulated
logic.

**Manual verification:** the user exercised this CR directly in the Extension
Host (reported via PM). That covers the two command handlers and the
configuration-change listener, which are the parts unit tests do not reach —
this codebase does not unit-test `extension.ts` wiring.

---

## Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | — | QM R1 Finding 1 (medium): `SPEC_ENT_TOUCHEDFILES`'s own numbered AC list was stale and did not cover this CR's scope. PM `fix-now`; AC-6/AC-7 rewritten and AC-13..AC-21 added. Verified present and matching code. | Closed |
| 2 | — | QM R1 Finding 3 (low): cleanup message omitted the entity name. PM `fix-now`; verified fixed. | Closed |
| 3 | low | **Accepted deviation, still live:** the spec's embedded code comment places `readWindowDays`/`withinWindow`/`existingOnly` in `touchStore.ts` and reads the setting as `getConfiguration('jarvis').get('touchedFiles.windowDays')`; the shipped code has them in `treeFactory.ts` reading `getConfiguration('jarvis.touchedFiles').get('windowDays')`. Functionally equivalent — and the shipped placement avoids a `vscode` import in `touchStore.ts`. PM `accept-as-is` (QM R1 Finding 2). | Open, accepted |
| 4 | low | **Accepted deviation, still live:** `SPEC_ENT_TOUCHEDFILES` specifies `inline@1`/`inline@2` for the category menu entries (cleanup before remove); shipped [package.json](../../packages/core/package.json#L200-L202) uses bare `inline` for all three, and declaration order puts remove before cleanup. PM `accept-as-is` (QM R1 Finding 4). Recorded here because a reader comparing spec to manifest will otherwise re-discover it as a defect. | Open, accepted |

No blocking issue. Findings 3 and 4 are known spec-vs-code divergences that PM
accepted with reasons; they are recorded so the acceptance travels with the
artefact rather than living only in the QM section.

---

## Status updates applied

None required — `US_ENT_TOUCHEDFILES`, `REQ_ENT_TOUCHEDFILES` and
`SPEC_ENT_TOUCHEDFILES` were already `:status: implemented`.
