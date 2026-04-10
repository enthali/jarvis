# Test Protocol: scanner-refresh

**Date**: 2026-04-10
**Change Document**: docs/changes/scanner-refresh.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_REACTIVECACHE | AC-7 | Edit a YAML name field → tree label updates after rescan | PASS |
| 2 | REQ_EXP_RESCAN_BTN | AC-1 | $(refresh) icon in Projects title bar | PASS |
| 3 | REQ_EXP_RESCAN_BTN | AC-2 | $(refresh) icon in Events title bar | PASS |
| 4 | REQ_EXP_RESCAN_BTN | AC-3 | Clicking refresh icon triggers rescan and tree updates | PASS |
| 5 | REQ_EXP_RESCAN_BTN | AC-4 | Single jarvis.rescan command shared by both views | PASS |
| 6 | REQ_EXP_RESCAN_BTN | AC-5 | jarvis.rescan not in Command Palette | PASS |
| 7 | REQ_EXP_NAMESORT | AC-1 | Leaves sorted by YAML name (case-insensitive) | PASS |
| 8 | REQ_EXP_NAMESORT | AC-2 | Folders sorted by folder name (case-insensitive) | PASS |
| 9 | REQ_EXP_NAMESORT | AC-3 | Folders and leaves interleaved in single sort | PASS |

## Notes

Manual UAT performed in Extension Development Host with testdata/ projects and events.
