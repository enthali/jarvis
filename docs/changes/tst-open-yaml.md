# Test Protocol: open-yaml

**Date**: 2026-04-07
**Change Document**: docs/changes/open-yaml.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_OPENYAML | AC-1 | Project leaf items show inline `$(go-to-file)` button on hover | PASS |
| 2 | REQ_EXP_OPENYAML | AC-2 | Event leaf items show inline `$(go-to-file)` button on hover | PASS |
| 3 | REQ_EXP_OPENYAML | AC-3 | Clicking button opens associated YAML file in the VS Code editor | PASS |
| 4 | REQ_EXP_OPENYAML | AC-4 | Clicking the item label does nothing (`TreeItem.command` unset) | PASS |
| 5 | REQ_EXP_OPENYAML | AC-5 | Folder nodes have no inline button | PASS |

## Notes

- Button appears on hover for both Projects and Events leaf items
- Works for deeply nested items (items inside subfolders)
- `TreeItem.command` remains unset — label click reserved for future detail view
