# Test Protocol: proj-folders

**Date**: 2026-04-09
**Change Document**: docs/changes/proj-folders.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_YAMLDATA | AC-1 | Projects: convention file detection (alpha, beta, gamma, delta, developer, PM) | PASS |
| 2 | REQ_EXP_YAMLDATA | AC-2 | Events: convention file detection (conference, workshop, IoT summit, meetup, invalid status) | PASS |
| 3 | REQ_EXP_TREEVIEW | AC-4 | active/ appears as collapsible grouping node | PASS |
| 4 | REQ_EXP_TREEVIEW | AC-4 | 2025/ and 2027/ appear as year grouping nodes | PASS |
| 5 | REQ_EXP_YAMLDATA | AC-4 | invalid-no-name: folder name shown as fallback label | PASS |
| 6 | REQ_EXP_YAMLDATA | AC-4 | invalid-bad-name: folder name shown as fallback label | PASS |
| 7 | REQ_EXP_YAMLDATA | AC-4 | invalid-empty (events): folder name shown as fallback label | PASS |
| 8 | REQ_EXP_EVENTFILTER | AC-6 | Future filter: 2025/ pruned, 2027/ remains, invalid-* remain (fail-open) | PASS |
| 9 | REQ_EXP_EVENTFILTER | AC-6 | Disable filter: 2025/ reappears with all events | PASS |
| 10 | REQ_EXP_TREEVIEW | AC-6 | Open YAML opens alpha/project.yaml | PASS |
| 11 | REQ_EXP_TREEVIEW | AC-6 | Leaf nodes have no expand arrow (no descent into leaf folders) | PASS |

## Notes

All tests performed in Extension Development Host with testdata workspace.
Convention-file model working correctly for both projects and events.
Fallback labels display folder name for all three invalid-file variants.
Empty-branch pruning works recursively — entire 2025/ year folder disappears when future-only filter is active.
