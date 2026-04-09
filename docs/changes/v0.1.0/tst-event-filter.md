# Test Protocol: event-filter

**Date**: 2026-04-07
**Change Document**: docs/changes/event-filter.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_YAMLDATA | AC-5 | `dates.end` extracted and stored as `EntityEntry.datesEnd` | PASS |
| 2 | REQ_EXP_EVENTFILTER | AC-1 | Filter icon visible in Events title bar, triggers `jarvis.filterFutureEvents` | PASS |
| 3 | REQ_EXP_EVENTFILTER | AC-2 | Single click toggles filter on/off | PASS |
| 4 | REQ_EXP_EVENTFILTER | AC-3 | Past events (`datesEnd < today`) hidden when filter active | PASS |
| 5 | REQ_EXP_EVENTFILTER | AC-4 | Events without `datesEnd` still shown when filter active (fail-open) | PASS |
| 6 | REQ_EXP_EVENTFILTER | AC-5 | Icon switches between `$(filter)` and `$(filter-filled)` | PASS |
| 7 | REQ_EXP_EVENTFILTERPERSIST | AC-1 | Filter state stored as boolean under `jarvis.eventFutureFilter` | PASS |
| 8 | REQ_EXP_EVENTFILTERPERSIST | AC-2 | Saved filter state applied on extension activation | PASS |

## Notes

- View description shows `(future only)` when filter is active
- Empty folder nodes are hidden when all their children are filtered out
- Filter icon only visible on hover in multi-view containers — VS Code platform limitation, accepted
