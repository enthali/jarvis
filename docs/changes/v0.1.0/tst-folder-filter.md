# Test Protocol: folder-filter

**Date**: 2026-04-03
**Change Document**: docs/changes/folder-filter.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_PROJECTFILTER | AC-1 | Filter icon in Projects title bar triggers `jarvis.filterProjectFolders` | PASS |
| 2 | REQ_EXP_PROJECTFILTER | AC-2 | QuickPick shows one entry per existing folder | PASS |
| 3 | REQ_EXP_PROJECTFILTER | AC-3 | Check/circle icons indicate visible/hidden state | PASS |
| 4 | REQ_EXP_PROJECTFILTER | AC-4 | Tree updates immediately on each toggle click | PASS |
| 5 | REQ_EXP_PROJECTFILTER | AC-5 | Icon changes between filter and filter-filled when filter is active | PASS |
| 6 | REQ_EXP_FILTERPERSIST | AC-1 | Hidden folders stored in workspaceState | PASS |
| 7 | REQ_EXP_FILTERPERSIST | AC-2 | On extension start the saved filter is applied | PASS |
| 8 | REQ_EXP_FILTERPERSIST | AC-3 | Only existing folders persisted — stale entries discarded | PASS |

## Notes

- QuickPick uses single-click toggle UX (`canSelectMany = false`) with `$(check)` / `$(circle-large-outline)` codicons instead of multi-select with OK button, per user preference
- Filter icon only visible on hover in multi-view containers — VS Code platform limitation, accepted
- QuickPick always appears at top center — VS Code API limitation, accepted
