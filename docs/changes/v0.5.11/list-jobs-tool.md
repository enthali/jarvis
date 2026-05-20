# Change: list-jobs-tool

## Status

- Created: 2026-05-18
- Branch: `feature/list-jobs-tool`
- Mode: autonomous

## Intent

Agents können aktuell Jobs registrieren (`jarvis_registerJob`) und deregistrieren
(`jarvis_unregisterJob`), aber nicht abfragen, welche Jobs aktiv sind. Das neue
Tool `jarvis_listJobs()` schließt diese Lücke — analog zu `jarvis_listSessions`
und (kommend) `jarvis_listReminders`.

## Acceptance Criteria

1. `jarvis_listJobs()` liefert pro Job: `name`, `schedule`, `enabled` (bool),
   `nextFire` (ISO-Timestamp oder `null` bei `manual` oder `enabled=false`).
2. Tool ist via LM API und MCP registriert (Pattern `registerDualTool`).

## Affected Specs

| ID | File | Change |
|---|---|---|
| `US_AUT_HEARTBEAT` | docs/userstories/us_aut.rst | +AC-18 (listJobs) |
| `REQ_AUT_LISTJOBS_TOOL` (new) | docs/requirements/req_aut.rst | 5 ACs |
| `SPEC_AUT_LISTJOBS_TOOL` (new) | docs/design/spec_aut.rst | registerDualTool-Call + `jobDescriptor()` Helper |

## Implementation Notes

- `src/extension.ts` neben `registerJobTool`/`unregisterJobTool`:
  - `registerDualTool('jarvis_listJobs', ...)` mit leerem Input-Schema
  - LM-Handler returnt `LanguageModelToolResult` mit JSON-Stringified Liste
  - MCP-Handler returnt `{ jobs: JobDescriptor[] }`
- Helper `jobDescriptor(job)`:
  - `enabled = job.enabled !== false`
  - `nextFire = (enabled && schedule !== 'manual') ? CronExpressionParser.parse(schedule).next().toISOString() : null`
  - try/catch um Parse-Fehler → `nextFire: null`
- Import von `CronExpressionParser` aus `cron-parser` (bereits in
  `heartbeatTreeProvider.ts` genutzt).

## Test Plan (UAT)

| ID | Step | Expected |
|---|---|---|
| T-1 | LM-Tool aufrufen ohne Input | Liste aller Jobs aus `heartbeat.yaml` |
| T-2 | Pausierten Job in der Liste prüfen | `enabled: false`, `nextFire: null` |
| T-3 | Manual-Job prüfen | `nextFire: null` |
| T-4 | Cron-Job aktiv prüfen | `nextFire` enthält ISO-Timestamp in der Zukunft |
| T-5 | MCP-Aufruf liefert gleiches Ergebnis | Identische Job-Liste |
