# Test Protocol: subfolder-view

**Date**: 2026-04-02
**Change Document**: docs/changes/subfolder-view.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_EXP_TREEVIEW | AC-4 | Subfolders appear as collapsible folder nodes | PASS |
| 2 | REQ_EXP_TREEVIEW | AC-5 | Folder nodes can be nested to any depth | PASS |
| 3 | REQ_EXP_TREEVIEW | AC-6 | YAML files are leaf items under parent folder | PASS |
| 4 | REQ_EXP_YAMLDATA | AC-1 | Project subfolders as folder nodes with leaf items | PASS |
| 5 | REQ_EXP_YAMLDATA | AC-2 | Same for event subfolders | PASS |
| 6 | REQ_EXP_YAMLDATA | AC-3 | name field used as label | PASS |
| 7 | REQ_EXP_YAMLDATA | AC-4 | Invalid files skipped | PASS |
| 8 | REQ_UAT_VALID_SAMPLES | AC-5 | Subfolder testdata present and displayed | PASS |

## Notes

- active/ folder node visible under Projects, containing "Project: Delta Operations"
- conferences/ folder node visible under Events, containing "Event: IoT Summit"
- Existing root-level items (3 projects, 3 events) still displayed correctly
- Invalid files still silently skipped
