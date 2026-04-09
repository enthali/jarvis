# Test Protocol: heartbeat

**Date**: 2026-04-08
**Change Document**: docs/changes/heartbeat.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_AUT_SCHEDULER | AC-1,2,3 | T-1: Cron job fires every minute, sentinel.txt written | PASS |
| 2 | REQ_AUT_JOBEXEC | AC-2 | T-1: PowerShell step executes via pwsh, output in channel | PASS |
| 3 | REQ_AUT_OUTPUT | AC-1,2 | T-1: Output Channel shows sentinel script output | PASS |
| 4 | REQ_AUT_STATUSBAR | AC-1,2,3 | Status bar shows next job + time (not idle) after config loaded | PASS |
| 5 | REQ_AUT_MANUALRUN | AC-1,2 | T-2: `Jarvis: Run Heartbeat Job` QuickPick → t2-manual-show-output runs | PASS |
| 6 | REQ_AUT_JOBEXEC | AC-3 | T-2: command step executes via executeCommand, logged in channel | PASS |
| 7 | REQ_AUT_JOBEXEC | AC-1 | T-3: Python step runs via python.defaultInterpreterPath | PASS |
| 8 | REQ_AUT_OUTPUT | AC-2 | T-3: Python stdout (executable path + version) visible in channel | PASS |
| 9 | REQ_AUT_JOBEXEC | AC-4 | T-4: Job aborts on exit 1, remaining steps skipped | PASS |
| 10 | REQ_AUT_OUTPUT | AC-3,4 | T-4: Error toast shown with job name + "powershell exit 1" | PASS |
| 11 | REQ_CFG_HEARTBEATPATH | AC-1,2,3 | T-5: jarvis.heartbeatConfigFile override loads jobs, no ENOENT | PASS |
| 12 | REQ_CFG_HEARTBEATINTERVAL | AC-1,2 | T-6: jarvis.heartbeatInterval=10 in EDH workspace settings.json → scheduler fires every ~10s (confirmed via repeated T-1 sentinel writes) | PASS |

## Notes

- Relative script paths in heartbeat.yaml are resolved relative to the
  heartbeat.yaml file's directory (configDir). Scripts written as `scripts/x.ps1`
  relative to the YAML file location.
- Bug found and fixed during UAT: relative paths were initially resolved from
  wrong base (VS Code install dir / workspace folder). Fixed by threading
  configDir = path.dirname(configPath) through the call chain.
- Bug found and fixed: manual job command used stale job list from last tick.
  Fixed by calling scheduler.reload() before runManualJob() on each command
  invocation.
- T-3 confirmed Python resolves to system Python (no workspace venv in this
  project); python.defaultInterpreterPath used correctly.
