# Verification Report: proj-folders

**Date**: 2026-04-09
**Change Proposal**: docs/changes/proj-folders.md
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 3 | 3 | 0 |
| Designs | 3 | 3 | 0 |
| Implementations | 3 | 3 | 0 |
| Tests | 11 | 11 | 0 |
| Traceability | 3 | 3 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_EXP_YAMLDATA AC-1 | Convention file scanning (projects) | SPEC_EXP_SCANNER | ✅ | ✅ T-1 | ✅ |
| REQ_EXP_YAMLDATA AC-2 | Convention file scanning (events) | SPEC_EXP_SCANNER | ✅ | ✅ T-2 | ✅ |
| REQ_EXP_YAMLDATA AC-4 | Fallback label for invalid convention files | SPEC_EXP_SCANNER + SPEC_EXP_PROVIDER | ✅ | ✅ T-5,6,7 | ✅ |
| REQ_EXP_TREEVIEW AC-4 | Grouping nodes = folders without convention file | SPEC_EXP_PROVIDER | ✅ | ✅ T-3,4 | ✅ |
| REQ_EXP_TREEVIEW AC-6 | Leaf = folder with convention file, no descent | SPEC_EXP_SCANNER + SPEC_EXP_PROVIDER | ✅ | ✅ T-10,11 | ✅ |
| REQ_EXP_TREEVIEW AC-9 | Empty grouping nodes omitted | SPEC_EXP_SCANNER | ✅ | ✅ T-8 | ✅ |
| REQ_EXP_EVENTFILTER AC-6 | Empty-branch pruning when filter active | SPEC_EXP_PROVIDER | ✅ | ✅ T-8,9 | ✅ |

## Acceptance Criteria Verification

### REQ_EXP_YAMLDATA
- [x] AC-1: `_buildTree()` checks for `project.yaml` in subdirectories → `yamlScanner.ts:100-103`
- [x] AC-2: `_scan()` passes `'event.yaml'` for events → `yamlScanner.ts:72`
- [x] AC-3: `name` field used as label → `yamlScanner.ts:110` (unchanged)
- [x] AC-4: Invalid convention file → `entities.set(conventionPath, { name: entry.name })` → `yamlScanner.ts:115,119`
- [x] AC-5: `datesEnd` extracted → `yamlScanner.ts:111-112` (unchanged logic)

### REQ_EXP_TREEVIEW
- [x] AC-4: Folders without convention file recurse as FolderNode → `yamlScanner.ts:123-126`
- [x] AC-5: Nesting to any depth via recursive `_buildTree()` (unchanged)
- [x] AC-6: Folder with convention file = LeafNode, no recursion → `yamlScanner.ts:106-121`
- [x] AC-9: Empty folders omitted → `children.length > 0` check at `yamlScanner.ts:124`

### REQ_EXP_EVENTFILTER
- [x] AC-6: `_filterFuture()` recurses into FolderNodes, only includes if `visibleChildren.length > 0` → `eventTreeProvider.ts:74-77` (pre-existing)

## Test Protocol

**File**: docs/changes/tst-proj-folders.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_YAMLDATA | AC-1 | Projects: convention file detection | PASS |
| 2 | REQ_EXP_YAMLDATA | AC-2 | Events: convention file detection | PASS |
| 3 | REQ_EXP_TREEVIEW | AC-4 | active/ as collapsible grouping node | PASS |
| 4 | REQ_EXP_TREEVIEW | AC-4 | 2025/ and 2027/ as year grouping nodes | PASS |
| 5 | REQ_EXP_YAMLDATA | AC-4 | invalid-no-name: folder name fallback | PASS |
| 6 | REQ_EXP_YAMLDATA | AC-4 | invalid-bad-name: folder name fallback | PASS |
| 7 | REQ_EXP_YAMLDATA | AC-4 | invalid-empty: folder name fallback | PASS |
| 8 | REQ_EXP_EVENTFILTER | AC-6 | Future filter prunes 2025/, keeps 2027/ | PASS |
| 9 | REQ_EXP_EVENTFILTER | AC-6 | Disable filter restores 2025/ | PASS |
| 10 | REQ_EXP_TREEVIEW | AC-6 | Open YAML opens convention file | PASS |
| 11 | REQ_EXP_TREEVIEW | AC-6 | Leaf nodes have no expand arrow | PASS |

## Code Verification

### yamlScanner.ts
- [x] Traceability comments present: `// Implementation: SPEC_EXP_SCANNER` and `// Requirements: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_EVENTFILTER`
- [x] `_buildTree(folder, entities, conventionFile)` — signature matches SPEC_EXP_SCANNER
- [x] `_scan()` callers: `'project.yaml'` and `'event.yaml'` — matches SPEC_EXP_SCANNER
- [x] Convention file exists check via `fs.promises.access()` — correct
- [x] Valid convention file → EntityEntry with `name` + optional `datesEnd` — correct
- [x] Invalid convention file → EntityEntry with `name = entry.name` (folder name) — matches REQ AC-4
- [x] No convention file → recurse, omit if empty — matches REQ AC-9
- [x] Non-directory entries ignored (comment at line 129) — matches SPEC "Non-YAML files…ignored"

### projectTreeProvider.ts
- [x] Traceability comments present
- [x] `import * as path from 'path'` added
- [x] Fallback label: `path.basename(path.dirname(element.id))` — matches SPEC_EXP_PROVIDER

### eventTreeProvider.ts
- [x] Traceability comments present
- [x] `import * as path from 'path'` added
- [x] Fallback label: `path.basename(path.dirname(element.id))` — matches SPEC_EXP_PROVIDER
- [x] `_filterFuture()` recursive empty-branch pruning — matches SPEC_EXP_PROVIDER future-filter section

### testdata
- [x] Projects: alpha, beta, gamma, invalid-no-name, invalid-bad-name, active/delta — matches SPEC_UAT_TESTDATA_FILES
- [x] Events: 2025/conference, 2025/workshop, 2025/iot-summit, 2027/meetup, invalid-empty, invalid-bad-status — matches SPEC_UAT_TESTDATA_FILES
- [x] developer/ and project-manager/ also present (pre-existing, also convention-file format)

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_EXP_YAMLDATA AC-1/2 | SPEC_EXP_SCANNER | `yamlScanner.ts` | tst T-1, T-2 | ✅ |
| REQ_EXP_YAMLDATA AC-4 | SPEC_EXP_SCANNER + SPEC_EXP_PROVIDER | `yamlScanner.ts`, `*TreeProvider.ts` | tst T-5, T-6, T-7 | ✅ |
| REQ_EXP_TREEVIEW AC-4/6/9 | SPEC_EXP_SCANNER + SPEC_EXP_PROVIDER | `yamlScanner.ts` | tst T-3, T-4, T-10, T-11 | ✅ |
| REQ_EXP_EVENTFILTER AC-6 | SPEC_EXP_PROVIDER | `eventTreeProvider.ts` | tst T-8, T-9 | ✅ |
| — (testdata) | SPEC_UAT_TESTDATA_FILES | `testdata/projects/`, `testdata/events/` | tst T-1..T-11 | ✅ |

## Issues Found

No issues found.

## Conclusion

All 3 modified requirements (7 ACs) are fully implemented and tested. Code matches design specifications precisely. Traceability is complete in all directions. Test protocol passed with 11/11 tests. The implementation is approved.
