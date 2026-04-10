# Test Protocol: new-entity

**Date**: 2026-04-10
**Change Document**: docs/changes/new-entity.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_NEWPROJECT | AC-1 | $(add) icon in Projects title bar triggers jarvis.newProject | PASS |
| 2 | REQ_EXP_NEWPROJECT | AC-2 | InputBox prompts for project name | PASS |
| 3 | REQ_EXP_NEWPROJECT | AC-3 | Folder name derived as kebab-case | PASS |
| 4 | REQ_EXP_NEWPROJECT | AC-4 | Folder created with project.yaml containing name | PASS |
| 5 | REQ_EXP_NEWPROJECT | AC-5 | Immediate scanner rescan triggered | PASS |
| 6 | REQ_EXP_NEWPROJECT | AC-6 | Agent session opened after rescan | PASS |
| 7 | REQ_EXP_NEWPROJECT | AC-7 | Cancel InputBox exits without side effects | PASS |
| 8 | REQ_EXP_NEWPROJECT | AC-8 | Command not in Command Palette | PASS |
| 9 | REQ_EXP_NEWPROJECT | AC-9 | Duplicate folder shows error notification | PASS |
| 10 | REQ_EXP_NEWEVENT | AC-1 | $(add) icon in Events title bar triggers jarvis.newEvent | PASS |
| 11 | REQ_EXP_NEWEVENT | AC-2 | InputBox prompts for event name | PASS |
| 12 | REQ_EXP_NEWEVENT | AC-3 | Second InputBox for date with inline validation | PASS |
| 13 | REQ_EXP_NEWEVENT | AC-4 | Folder name derived as date-kebab-name | PASS |
| 14 | REQ_EXP_NEWEVENT | AC-5 | Folder created directly in eventsFolder | PASS |
| 15 | REQ_EXP_NEWEVENT | AC-6 | event.yaml contains name, dates.start, dates.end | PASS |
| 16 | REQ_EXP_NEWEVENT | AC-7 | Immediate scanner rescan triggered | PASS |
| 17 | REQ_EXP_NEWEVENT | AC-8 | Agent session opened after rescan | PASS |
| 18 | REQ_EXP_NEWEVENT | AC-9 | Cancel any InputBox exits without side effects | PASS |
| 19 | REQ_EXP_NEWEVENT | AC-10 | Command not in Command Palette | PASS |
| 20 | REQ_EXP_NEWEVENT | AC-11 | Duplicate folder shows error notification | PASS |
| 21 | REQ_EXP_REACTIVECACHE | AC-6 | Public rescan() triggers immediate re-scan | PASS |

## Observations & Fixes During Testing

1. **Button order inconsistency** — Projects showed "Filter, +" while Events showed "+, Filter". Fixed by adding explicit `navigation@1` / `navigation@2` group ordering in package.json.
2. **contextValue namespace collision** — Another extension injected an "Add Diagram" button on items with `contextValue = 'project'`. Fixed by namespacing to `jarvisProject`, `jarvisEvent`, `jarvisFolder`.

## Notes

All 21 acceptance criteria verified in Extension Development Host. Scanner rescan is instant — new entities appear in the tree immediately after creation.
