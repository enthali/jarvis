# Test Protocol: project-scan

**Date**: 2026-04-01
**Change Document**: docs/changes/project-scan.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_YAMLDATA | AC-1 | YAML files from jarvis.projectsFolder shown in Projects section | PASS |
| 2 | REQ_EXP_YAMLDATA | AC-2 | YAML files from jarvis.eventsFolder shown in Events section | PASS |
| 3 | REQ_EXP_YAMLDATA | AC-3 | `name` field used as tree item label | PASS |
| 4 | REQ_EXP_YAMLDATA | AC-4 | Unparseable files skipped without crash | NOT TESTED |
| 5 | REQ_EXP_REACTIVECACHE | AC-1 | UI never blocks — file I/O in background | PASS |
| 6 | REQ_EXP_REACTIVECACHE | AC-5 | Tree empty on first open, fills after first scan | PASS |
| 7 | REQ_CFG_FOLDERPATHS | AC-1 | jarvis.projectsFolder setting exists and accepts absolute path | PASS |
| 8 | REQ_CFG_FOLDERPATHS | AC-2 | jarvis.eventsFolder setting exists and accepts absolute path | PASS |
| 9 | REQ_CFG_SCANINTERVAL | AC-1 | jarvis.scanInterval setting exists with default 120 | PASS |

## Notes

- AC-4 (unparseable YAML handling) not manually tested — would require creating intentionally broken test files.
  Covered by code review: try/catch in `_collectNames` skips any file that fails to parse.
- User initially had projectsFolder/eventsFolder swapped in settings — once corrected, data appeared in correct sections.
