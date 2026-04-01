# Test Protocol: manual-test

**Date**: 2026-03-31
**Change Document**: docs/changes/manual-test.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_LAUNCHCONFIG | AC-1 | .vscode/launch.json contains extensionHost configuration | PASS |
| 2 | REQ_EXP_ACTIVITYBAR | AC-1 | Jarvis icon visible in Activity Bar | PASS |
| 3 | REQ_EXP_ACTIVITYBAR | AC-2 | Tooltip shows "Jarvis" | PASS |
| 4 | REQ_EXP_TREEVIEW | AC-1-4 | Projects and Events sections visible, collapsible, with text labels | PASS |
| 5 | REQ_EXP_DUMMYDATA | AC-1-4 | 3 projects and 2 events shown with correct naming pattern | PASS |

## Notes

Dogfooding run — first use of manual test step. Extension Development Host launched via `code --extensionDevelopmentPath=`. All checks confirmed by user via ask_questions tool.
