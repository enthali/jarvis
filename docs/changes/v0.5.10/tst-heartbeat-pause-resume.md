# Test Protocol: heartbeat-pause-resume

**Date:** 2026-05-18
**Branch:** `feature/heartbeat-pause-resume`
**Tester:** User (manual UAT in Extension Development Host, F5)
**Build:** TypeScript clean (`tsc -p ./`), Sphinx clean (`-W --keep-going -E`)

## Setup

- `jarvis.heartbeatConfigFile` = `testdata/heartbeat/heartbeat.yaml`
- Test subject: `t1-cron-sentinel` (schedule `*/5 * * * *`)

## Results

| ID | Description | Result |
|---|---|---|
| T-1 | Active job shows `$(play)` + `$(debug-pause)` inline buttons | **PASS** |
| T-2 | Pause → toast, contextValue switches, `enabled: false` in YAML, buttons become `$(play)` + `$(debug-continue)` | **PASS** |
| T-3 | Paused state survives Developer: Reload Window | **PASS** |
| T-4 | Resume (`$(debug-continue)`) → toast, immediate run, returns to active state, `enabled` removed | **PASS** |
| T-5 | Scheduler skips paused job (no run, sentinel unchanged) | **PASS** |
| T-6 | Manual `$(play)` on active job unchanged | **PASS** |
| T-7 | Manual `$(play)` on paused job → one-shot run, pause state preserved (`enabled: false` unchanged, buttons unchanged) | **PASS** |

## Summary

All 7 acceptance tests **PASS** (initial 6/6 PASS + follow-up fix for PM
addendum: runJob on `heartbeatJobPaused`, resume icon `$(debug-continue)`).
Feature ready for merge.
