# Verification Report: folder-filter

**Date**: 2026-04-03
**Change Proposal**: docs/changes/folder-filter.md
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 2 | 2 | 0 |
| Designs | 3 | 3 | 0 |
| Implementations | 3 | 3 | 0 |
| Tests | 8 | 8 | 0 |
| Traceability | 5 | 5 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_EXP_PROJECTFILTER | Project Folder Filter | SPEC_EXP_FILTERCOMMAND, SPEC_EXP_PROVIDER | ✅ | ✅ | ✅ |
| REQ_EXP_FILTERPERSIST | Filter Persistence | SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND | ✅ | ✅ | ✅ |

## Acceptance Criteria Verification

### REQ_EXP_PROJECTFILTER

- [x] AC-1: Filter icon in Projects title bar triggers `jarvis.filterProjectFolders` → `package.json` menu entry with `view == jarvisProjects`, Test #1 PASS
- [x] AC-2: QuickPick shows one entry per existing root-level folder → `extension.ts` `filterHandler` maps `scanner.getProjectTree()` folder nodes, Test #2 PASS
- [x] AC-3: Pre-selected = visible (check icon), deselected = hidden (circle icon) → codicon toggle in `renderItems()`, Test #3 PASS
- [x] AC-4: Tree updates immediately on each toggle → `projectProvider.setHiddenFolders()` called in `onDidAccept`, Test #4 PASS
- [x] AC-5: Icon changes between filter and filter-filled → two commands with `when` clause on `jarvis.projectFilterActive`, Test #5 PASS

### REQ_EXP_FILTERPERSIST

- [x] AC-1: Hidden folders stored in `workspaceState` → `context.workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenFolders])` in `onDidAccept`, Test #6 PASS
- [x] AC-2: On extension start the saved filter is applied → `activate()` reads `workspaceState.get<string[]>('jarvis.hiddenProjectFolders')` and calls `setHiddenFolders()`, Test #7 PASS
- [x] AC-3: Only existing folders persisted — stale entries discarded → QuickPick builds items from live `scanner.getProjectTree()`; stale names never enter `hiddenFolders`, Test #8 PASS

## Test Protocol

**File**: docs/changes/tst-folder-filter.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_PROJECTFILTER | AC-1 | Filter icon triggers command | PASS |
| 2 | REQ_EXP_PROJECTFILTER | AC-2 | QuickPick shows one entry per folder | PASS |
| 3 | REQ_EXP_PROJECTFILTER | AC-3 | Check/circle icons indicate state | PASS |
| 4 | REQ_EXP_PROJECTFILTER | AC-4 | Tree updates immediately on toggle | PASS |
| 5 | REQ_EXP_PROJECTFILTER | AC-5 | Icon changes filter/filter-filled | PASS |
| 6 | REQ_EXP_FILTERPERSIST | AC-1 | Hidden folders in workspaceState | PASS |
| 7 | REQ_EXP_FILTERPERSIST | AC-2 | Saved filter applied on start | PASS |
| 8 | REQ_EXP_FILTERPERSIST | AC-3 | Stale entries discarded | PASS |

## Design Verification

| SPEC ID | Description | Linked REQs | Code File | Matches | Status |
|---------|-------------|-------------|-----------|---------|--------|
| SPEC_EXP_FILTERCOMMAND | Filter Command | REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST | `src/extension.ts` | ✅ | ✅ |
| SPEC_EXP_PROVIDER (modified) | ProjectTreeProvider filter | REQ_EXP_PROJECTFILTER | `src/projectTreeProvider.ts` | ✅ | ✅ |
| SPEC_EXP_EXTENSION (modified) | Activation + workspaceState | REQ_EXP_FILTERPERSIST | `src/extension.ts` | ✅ | ✅ |

### Design vs Implementation Notes

- **SPEC_EXP_FILTERCOMMAND** specifies `showQuickPick` with `canPickMany: true`. Actual implementation uses `createQuickPick` with `canSelectMany = false` and single-click toggle via codicons. This is an intentional UX refinement during UAT — functionality is equivalent (toggle folders, persist state, update tree). **Accepted deviation.**
- **SPEC_EXP_PROVIDER** specifies `_hiddenFolders`, `setHiddenFolders()`, `getHiddenFolders()`, and filter in `getChildren()` — all implemented exactly as designed.
- **SPEC_EXP_EXTENSION** specifies workspaceState restore on activation and command registration — implemented as designed, with the additional `projectView.description = '(filtered)'` enhancement.

## Code Verification

| File | Traceability Comments | Follows Conventions | Status |
|------|----------------------|---------------------|--------|
| `src/extension.ts` | `SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND` + `REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_EXP_REACTIVECACHE, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST` | ✅ | ✅ |
| `src/projectTreeProvider.ts` | `SPEC_EXP_PROVIDER, SPEC_EXP_FILTERCOMMAND` + `REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST` | ✅ | ✅ |
| `src/yamlScanner.ts` | Unchanged — no filter knowledge | ✅ | ✅ |
| `src/eventTreeProvider.ts` | Unchanged — no filter for events | ✅ | ✅ |
| `package.json` | Two commands + two menu entries with when clauses | ✅ | ✅ |

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_EXP_PROJECTFILTER | SPEC_EXP_FILTERCOMMAND, SPEC_EXP_PROVIDER | `extension.ts`, `projectTreeProvider.ts`, `package.json` | tst-folder-filter #1–5 | ✅ |
| REQ_EXP_FILTERPERSIST | SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND | `extension.ts` | tst-folder-filter #6–8 | ✅ |

Bidirectional links verified:
- US_EXP_PROJECTFILTER → REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST ✅
- REQ_EXP_PROJECTFILTER → SPEC_EXP_FILTERCOMMAND, SPEC_EXP_PROVIDER ✅
- REQ_EXP_FILTERPERSIST → SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND ✅
- SPECs → Code (traceability comments in source files) ✅
- Tests → REQs (test protocol references REQ IDs) ✅

## Compile Result

```
$ npm run compile
> jarvis@0.0.1 compile
> tsc -p ./
```

No errors.

## Issues Found

None.

## Recommendations

1. Consider updating SPEC_EXP_FILTERCOMMAND to reflect the actual `createQuickPick` + single-click toggle UX (instead of `showQuickPick` with `canPickMany`). Low priority — the current spec captures intent correctly and the deviation was an intentional UAT refinement.

## Conclusion

All requirements implemented, all acceptance criteria verified via manual UAT (PASSED), all traceability links in place, code compiles cleanly which follows project conventions. The `folder-filter` change is **verified and ready for release**.
