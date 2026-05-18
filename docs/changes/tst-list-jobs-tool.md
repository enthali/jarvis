# Test Protocol: list-jobs-tool

**Date:** 2026-05-18
**Branch:** `feature/list-jobs-tool`
**Tester:** User (manual UAT in Extension Development Host, F5)
**Build:** TypeScript clean, Sphinx clean

## Setup

- `testdata/heartbeat/heartbeat.yaml` enthält `t-listjobs-paused` mit `enabled: false`
- Test via LM-Chat (`#listJobs`) und MCP-Client

## Results

| ID | Description | Result |
|---|---|---|
| T-1 | `#listJobs` liefert JSON-Array aller Jobs | **PASS** |
| T-2 | `t-listjobs-paused` → `enabled: false`, `nextFire: null` | **PASS** |
| T-3 | `t2-manual-show-output` → `schedule: "manual"`, `nextFire: null` | **PASS** |
| T-4 | `t1-cron-sentinel` → `enabled: true`, `nextFire` ISO-Timestamp in der Zukunft | **PASS** |
| T-5 | MCP-Aufruf liefert identische Job-Liste in `{ jobs: [...] }` | **PASS** |

## Summary

All 5 acceptance tests **PASS**. Feature ready for merge.
