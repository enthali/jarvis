# Verification Report: outlook-categories

**Date**: 2026-04-13
**Change Proposal**: docs/changes/outlook-categories.md
**Branch**: feature/outlook-categories
**Status**: ⚠️ PARTIAL — all tests passed; 3 spec/req docs need updates to reflect UAT-time changes

---

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| User Stories | 4 new + 3 modified | 4 new ✅ (code/tests); 3 modified ✅ | 4 new USs have `:status: draft` |
| Requirements | 7 new + 3 modified | 9 / 10 | 1 (REQ_CFG_SETTINGSGROUPS AC-2 stale) |
| Design Specs | 7 new + 3 modified | 8 / 10 | 2 (SPEC_OLK_SETTINGS + SPEC_PIM_CATVIEW group name stale) |
| Implementations | 6 source files | 6 / 6 | 0 |
| Tests | 26 scenarios | 26 / 26 PASSED | 0 |
| Traceability | US→REQ→SPEC→Code | Complete | 0 |

---

## Test Protocol

**File**: docs/changes/tst-outlook-categories.md
**Result**: PASSED

| # | Test-ID | Description | Result |
|---|---------|-------------|--------|
| 1 | T-1 | Provider registered when outlookEnabled=true | PASSED |
| 2 | T-2 | No provider when outlookEnabled=false | PASSED |
| 3 | T-3 | Cache populated via get | PASSED |
| 4 | T-4 | Heartbeat-triggered cache refresh | PASSED |
| 5 | T-5 | Manual refresh via icon | PASSED |
| 6 | T-6 | get all categories | PASSED |
| 7 | T-7 | get with filter | PASSED |
| 8 | T-8 | set (create category) | PASSED |
| 9 | T-9 | delete category | PASSED |
| 10 | T-10 | rename via tool | PASSED |
| 11 | T-11 | error when no provider | PASSED |
| 12 | T-12 | MCP call | PASSED |
| 13 | T-13 | Categories view visible (showCategories=true) | PASSED |
| 14 | T-14 | Categories view hidden (showCategories=false) | PASSED |
| 15 | T-15 | Node details (name + source) | PASSED |
| 16 | T-16 | Refresh icon in tree | PASSED |
| 17 | T-17 | Rename via context menu | PASSED |
| 18 | T-18 | Delete via context menu | PASSED |
| 19 | T-19 | No provider, view shows placeholder | PASSED |
| 20 | T-20 | Read via COM with Outlook running | PASSED |
| 21 | T-21 | Colour heuristic (Project→blue, Event→pink) | PASSED |
| 22 | T-22 | set with colour heuristic | PASSED |
| 23 | T-23 | delete via COM | PASSED |
| 24 | T-24 | Rename preserves colour | PASSED |
| 25 | T-25 | Category.id populated from COM CategoryID | PASSED |
| 26 | T-26 | Disabled guard (no COM/PS when outlookEnabled=false) | PASSED |

---

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_PIM_PROVIDER | Category Provider Interface | SPEC_PIM_IFACE | `src/pim/ICategoryProvider.ts` | T-1,T-2,T-25 | ✅ |
| REQ_PIM_CACHE | Generic Domain Cache | SPEC_PIM_CACHE | `src/pim/DomainCache.ts` | T-3,T-4,T-5 | ✅ |
| REQ_PIM_SERVICE | Category Service | SPEC_PIM_SERVICE | `src/pim/CategoryService.ts` | T-3–T-12 | ✅ |
| REQ_PIM_CATTOOL | Category Management Tool (LM/MCP) | SPEC_PIM_CATTOOL | `src/extension.ts` | T-3,T-6–T-12 | ✅ |
| REQ_PIM_CATVIEW | Categories Sidebar Tree View | SPEC_PIM_CATVIEW | `src/pim/CategoryTreeProvider.ts` | T-13–T-19 | ✅ |
| REQ_OLK_COMBRIDGE | Outlook COM Bridge | SPEC_OLK_COMBRIDGE | `src/outlookIntegration/OutlookCategoryProvider.ts` | T-20–T-26 | ✅ |
| REQ_OLK_ENABLE | Outlook Master Toggle | SPEC_OLK_SETTINGS | `src/extension.ts`, `package.json` | T-1,T-2,T-26 | ✅ |
| REQ_EXP_TREEVIEW (AC-10) | "Categories" 5th sidebar view | SPEC_EXP_EXTENSION | `package.json` | T-13,T-14 | ✅ |
| REQ_EXP_FEATURETOGGLE (AC-6) | Categories when-clause | SPEC_EXP_FEATURETOGGLE | `package.json` | T-13,T-14 | ✅ |
| REQ_CFG_SETTINGSGROUPS (AC-2) | Settings groups include Outlook + Categories | SPEC_OLK_SETTINGS, SPEC_PIM_CATVIEW | `package.json` | T-13,T-14 | ⚠️ |

---

## Acceptance Criteria Verification

### REQ_PIM_PROVIDER
- [x] AC-1: `source: string` on interface → `ICategoryProvider.ts` ✅
- [x] AC-2: `getCategories()` → `ICategoryProvider.ts` ✅
- [x] AC-3: `setCategory(name, color)` → `ICategoryProvider.ts` ✅
- [x] AC-4: `deleteCategory(name)` → `ICategoryProvider.ts` ✅
- [x] AC-5: `renameCategory(oldName, newName)` → `ICategoryProvider.ts` ✅
- [x] AC-6: `Category.source` field → `ICategoryProvider.ts` ✅
- [x] AC-7: `Category.id?` optional field; operations prefer id when set → `CategoryService.ts` T-25 ✅

### REQ_PIM_CACHE
- [x] AC-1: `get(): T | undefined` → `DomainCache.ts` ✅
- [x] AC-2: `invalidate(): void` → `DomainCache.ts` ✅
- [x] AC-3: `refresh(): Promise<T>` → `DomainCache.ts` ✅
- [x] AC-4: Heartbeat job "Jarvis: Category Refresh" → `syncCategoryRefreshJob()` T-4 ✅
- [x] AC-5: `DomainCache<T>` generic → `DomainCache.ts` ✅

### REQ_PIM_SERVICE
- [x] AC-1: Manages providers array → `CategoryService.ts` ✅
- [x] AC-2: Cache hit returns cached data; miss triggers refresh → `getCategories()` ✅
- [x] AC-3: `set` broadcasts / targets by provider → T-8 ✅
- [x] AC-4: `delete` broadcasts / targets by provider → T-9 ✅
- [x] AC-5: `rename` broadcasts / targets by provider → T-10 ✅
- [x] AC-6: Cache invalidated after write ops → `setCategory/deleteCategory/renameCategory` ✅
- [x] AC-7: Providers are stateless; service owns cache ✅

### REQ_PIM_CATTOOL
- [x] AC-1: `action: "get"|"set"|"delete"|"rename"` → extension.ts ✅
- [x] AC-2: `name`, `filter`, `provider`, `oldName`, `newName` optional params ✅
- [x] AC-3: `get` with/without filter → T-6,T-7 ✅
- [x] AC-4: `set` creates/updates → T-8 ✅
- [x] AC-5: `delete` removes → T-9 ✅
- [x] AC-6: `rename` requires both `oldName`+`newName` → T-10 ✅
- [x] AC-7: No naming convention enforcement ✅
- [x] AC-8: Registered via `registerDualTool()` → T-12 ✅
- [x] AC-9: Guard `hasProviders()` returns error message → T-11 ✅

### REQ_PIM_CATVIEW
- [x] AC-1: "Categories" view as 5th section when `showCategories=true` → T-13 ✅
- [x] AC-2: Nodes show name + source tag → T-15 ✅
- [x] AC-3: Refresh button `$(refresh)` in title → T-5,T-16 ✅
- [x] AC-4: Controlled by `jarvis.pim.showCategories` (default: `true`) → T-13,T-14 ✅
- [x] AC-5: "no categories" placeholder → T-19 ✅
- [x] AC-6: `when`-clause implementation = `config.jarvis.pim.showCategories == true` → ⚠️ see Issue 2
- [x] AC-7: Context menu "Rename Category" → T-17 ✅
- [x] AC-8: Context menu "Delete Category" with confirmation → T-18 ✅
- [x] AC-9: Both commands hidden from Command Palette → `package.json` menus ✅

### REQ_OLK_COMBRIDGE
- [x] AC-1: `source: "outlook"` → T-3,T-6,T-20 ✅
- [x] AC-2: `child_process.execFile('powershell', ...)` with 10s timeout → T-20 ✅
- [x] AC-3: Provider is stateless → architecture verified ✅
- [x] AC-4: Non-Windows returns `[]` / rejects gracefully → T-26 ✅
- [x] AC-5: Color heuristic project→8, event→10, else→0 → T-21,T-22 ✅
- [x] AC-6: Rename = delete old + create new with preserved color → T-24 ✅
- [x] AC-7: `id` populated from COM `CategoryID` → T-25 ✅

### REQ_OLK_ENABLE
- [x] AC-1: `jarvis.outlookEnabled` boolean, default `false` → `package.json` ✅
- [x] AC-2: When `false`, no COM calls / no provider instantiated → T-2,T-26 ✅
- [x] AC-3: Changing setting prompts window reload → `extension.ts:933` ✅

### REQ_CFG_SETTINGSGROUPS (modified)
- [x] AC-1: `contributes.configuration` is array ✅
- [ ] AC-2: Groups include "Outlook" + "Categories" → ⚠️ implementation uses single "PIM" group
- [x] AC-3: Each setting in exactly one group ✅
- [x] AC-4: No key/type/default changes ✅

---

## Issues Found

### ⚠️ Issue 1: Settings group name stale in REQ_CFG_SETTINGSGROUPS, SPEC_OLK_SETTINGS, SPEC_PIM_CATVIEW

- **Severity**: Medium
- **Category**: Requirements + Design documentation
- **Description**: During UAT, the separate "Outlook" and "Categories" settings groups were merged into a single "PIM" group in `package.json`. The following documents still reference the pre-UAT names:
  - `docs/requirements/req_cfg.rst` — REQ_CFG_SETTINGSGROUPS AC-2 lists "Outlook, Categories" as separate groups
  - `docs/design/spec_olk.rst` — SPEC_OLK_SETTINGS describes a `{"title": "Outlook", ...}` configuration object
  - `docs/design/spec_pim.rst` — SPEC_PIM_CATVIEW describes a `{"title": "Categories", ...}` configuration object
- **Expected**: Documents updated to reflect `{"title": "PIM", ...}` with both settings
- **Actual**: Stale "Outlook" and "Categories" group names remain in three spec/req files
- **Recommendation**: Update the three files to reflect the merged "PIM" group as implemented

### ⚠️ Issue 2: `when`-clause form stale in SPEC_PIM_CATVIEW and REQ_PIM_CATVIEW

- **Severity**: Low
- **Category**: Design + Requirements documentation
- **Description**: During UAT it was discovered that VS Code's `when`-clause needs `== true` for boolean settings bindings. Both specs were not updated:
  - `docs/design/spec_pim.rst` SPEC_PIM_CATVIEW manifest section: `"when": "config.jarvis.pim.showCategories"` (missing `== true`)
  - `docs/requirements/req_pim.rst` REQ_PIM_CATVIEW AC-6: `config.jarvis.pim.showCategories` (missing `== true`)
  - Implementation in `package.json`: `"when": "config.jarvis.pim.showCategories == true"` ✅
- **Expected**: Specs and requirements use `config.jarvis.pim.showCategories == true`
- **Actual**: Plain form without `== true` — causes view to never appear
- **Recommendation**: Update SPEC_PIM_CATVIEW and REQ_PIM_CATVIEW AC-6

### ⚠️ Issue 3: New User Story statuses remain `:status: draft`

- **Severity**: Low
- **Category**: Documentation
- **Description**: The four new user stories introduced by this change still carry `:status: draft` instead of `:status: implemented`:
  - `us_pim.rst` — US_PIM_CATEGORIES, US_PIM_CATTOOL, US_PIM_CATVIEW
  - `us_olk.rst` — US_OLK_COMBRIDGE
- **Expected**: `:status: implemented`
- **Actual**: `:status: draft`
- **Recommendation**: Update status fields in the two user story files

### ℹ️ Issue 4: Change document "Final Consistency Check" not completed

- **Severity**: Low
- **Category**: Process
- **Description**: `docs/changes/outlook-categories.md` still shows `**Status**: ⏳ not started` for the "Final Consistency Check" section.
- **Recommendation**: Mark as completed (or remove the section)

---

## Traceability Matrix

| User Story | Requirement | Design Spec | Implementation | Test |
|------------|-------------|-------------|----------------|------|
| US_PIM_CATEGORIES | REQ_PIM_PROVIDER | SPEC_PIM_IFACE | `src/pim/ICategoryProvider.ts` | T-1,T-2,T-25 |
| US_PIM_CATEGORIES | REQ_PIM_CACHE | SPEC_PIM_CACHE | `src/pim/DomainCache.ts` | T-3,T-4 |
| US_PIM_CATEGORIES | REQ_PIM_SERVICE | SPEC_PIM_SERVICE | `src/pim/CategoryService.ts` | T-3–T-12 |
| US_PIM_CATTOOL | REQ_PIM_CATTOOL | SPEC_PIM_CATTOOL | `src/extension.ts` | T-3,T-6–T-12 |
| US_PIM_CATVIEW | REQ_PIM_CATVIEW | SPEC_PIM_CATVIEW | `src/pim/CategoryTreeProvider.ts` | T-13–T-19 |
| US_OLK_COMBRIDGE | REQ_OLK_COMBRIDGE | SPEC_OLK_COMBRIDGE | `src/outlookIntegration/OutlookCategoryProvider.ts` | T-20–T-26 |
| US_OLK_COMBRIDGE | REQ_OLK_ENABLE | SPEC_OLK_SETTINGS | `src/extension.ts`, `package.json` | T-1,T-2,T-26 |
| US_EXP_SIDEBAR (modified) | REQ_EXP_TREEVIEW (AC-10) | — | `package.json` | T-13,T-14 |
| US_EXP_FEATURETOGGLE (modified) | REQ_EXP_FEATURETOGGLE (AC-6) | — | `package.json` | T-13,T-14 |
| US_CFG_SETTINGSGROUPS (modified) | REQ_CFG_SETTINGSGROUPS (AC-2) | SPEC_OLK_SETTINGS, SPEC_PIM_CATVIEW | `package.json` | T-13,T-14 |

---

## Code Traceability Comments

All implementation files carry correct traceability headers:

| File | Comment |
|------|---------|
| `src/pim/ICategoryProvider.ts` | `// Implementation: SPEC_PIM_IFACE` + `// Requirements: REQ_PIM_PROVIDER` |
| `src/pim/DomainCache.ts` | `// Implementation: SPEC_PIM_CACHE` + `// Requirements: REQ_PIM_CACHE` |
| `src/pim/CategoryService.ts` | `// Implementation: SPEC_PIM_SERVICE` + `// Requirements: REQ_PIM_SERVICE` |
| `src/pim/CategoryTreeProvider.ts` | `// Implementation: SPEC_PIM_CATVIEW` + `// Requirements: REQ_PIM_CATVIEW` |
| `src/outlookIntegration/OutlookCategoryProvider.ts` | `// Implementation: SPEC_OLK_COMBRIDGE` + `// Requirements: REQ_OLK_COMBRIDGE` |
| `src/extension.ts` (PIM block) | `// Implementation: SPEC_OLK_SETTINGS, SPEC_PIM_SERVICE, SPEC_PIM_CATVIEW` |

---

## Conclusion

The implementation is functionally complete: all 7 new requirements are satisfied, all 26 UAT test scenarios passed, and the full US→REQ→SPEC→Code chain is traceable. The code correctly handles all edge cases (no provider, non-Windows, colour heuristic, rename-preserves-colour, id-based lookup, Command Palette hiding).

Three documentation artifacts require minor updates to match the runtime behaviour discovered during UAT:
1. `REQ_CFG_SETTINGSGROUPS` AC-2, `SPEC_OLK_SETTINGS`, and `SPEC_PIM_CATVIEW` must reflect the merged "PIM" settings group.
2. `SPEC_PIM_CATVIEW` and `REQ_PIM_CATVIEW` AC-6 must use `== true` in the when-clause.
3. User story statuses must be promoted from `draft` to `implemented`.

**Recommendation**: Fix the three documentation gaps (Issues 1–3) on this branch before merge.
Once fixed, all statuses can be marked `:status: implemented` and the change is ready to merge into `develop`.
