# Test Protocol: heartbeat-view

**Date**: 2026-04-10
**Change Document**: docs/changes/heartbeat-view.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_AUT_HEARTBEATVIEW | AC-1 | Heartbeat is 4th section in Jarvis sidebar | PASS |
| 2 | REQ_AUT_HEARTBEATVIEW | AC-2 | Jobs are collapsible top-level nodes with name | PASS |
| 3 | REQ_AUT_HEARTBEATVIEW | AC-3 | Next execution time shown via cron-parser | PASS |
| 4 | REQ_AUT_HEARTBEATVIEW | AC-4 | Manual jobs show "manuell" | PASS |
| 5 | REQ_AUT_HEARTBEATVIEW | AC-5 | Expanding job shows step children | PASS |
| 6 | REQ_AUT_HEARTBEATVIEW | AC-6 | Step labels show type: run / agent → prompt | PASS |
| 7 | REQ_AUT_HEARTBEATVIEW | AC-7 | Refresh button reloads and refreshes tree | PASS |
| 8 | REQ_AUT_RUNJOB | AC-1 | Play icon visible inline on job nodes | PASS |
| 9 | REQ_AUT_RUNJOB | AC-2 | Clicking play executes the job | PASS |
| 10 | REQ_AUT_RUNJOB | AC-3 | Works for both scheduled and manual jobs | PASS |
| 11 | REQ_AUT_RUNALLJOBS | AC-1 | Run-all icon visible in view title bar | PASS |
| 12 | REQ_AUT_RUNALLJOBS | AC-2 | Runs all non-manual jobs sequentially | PASS |
| 13 | REQ_AUT_RUNALLJOBS | AC-3 | Best-effort continues on failure | NOT TESTED |

## Notes

- AC-3 of REQ_AUT_HEARTBEATVIEW: Time displayed is computed correctly at render time using cron-parser. It does not auto-refresh between manual refreshes (not required by spec). Clicking the refresh button (AC-7) recalculates next-run times.
- AC-2 of REQ_AUT_RUNALLJOBS: Runs only non-manual jobs as specified in REQ_AUT_RUNALLJOBS ("all jobs whose schedule is not manual"). User questioned the design; behavior is per specification.
- AC-3 of REQ_AUT_RUNALLJOBS: Could not be verified — no failure-inducing test data available in the test environment. Implementation uses best-effort loop (continues on failure) per design spec.
