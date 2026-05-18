# Change: heartbeat-pause-resume

## Status

- Created: 2026-05-18
- Branch: `feature/heartbeat-pause-resume`
- Mode: autonomous

## Intent

Heartbeat-Jobs sollen pausiert und wieder gestartet werden können, ohne sie aus
`heartbeat.yaml` zu löschen. Aktuell muss man einen Job aus der YAML entfernen,
um ihn temporär (Urlaub, Wartung, Debugging) zu deaktivieren.

## UI-Konzept

- **Run mode:** Inline-Buttons `$(play)` (manuell laufen) + `$(debug-pause)` (pausieren)
- **Paused mode:** Inline-Buttons `$(play)` (manuell laufen) + `$(debug-continue)`
  (Resume + sofort starten) — anderes Icon als Run, damit visuell unterscheidbar

Der Manual-Play-Button ist in beiden Zuständen verfügbar (unabhängig vom
Pause-Zustand). Resume ist die einzige Aktion, die den Pause-Zustand aufhebt.

## Acceptance Criteria

1. Im Tree gibt es pro Job im Run-Modus einen Pause-Button (`$(debug-pause)`).
2. Klick auf Pause → Job wird nicht mehr vom Scheduler ausgeführt; Tree zeigt
   "pausiert".
3. Im Paused-Modus zeigt der Tree einen Resume-Button (`$(debug-continue)`);
   Klick = `enabled: true` + sofortiger einmaliger Lauf.
4. Pause-Zustand wird in `heartbeat.yaml` als `enabled: false` persistiert
   (überlebt Neustart).
5. Bestehender Manual-Trigger (`$(play)`-Button) bleibt auf aktiven Jobs
   unverändert funktionsfähig.
6. Der Manual-Trigger ist auch auf pausierten Jobs verfügbar; ein Klick
   löst einen Einmal-Lauf aus, ohne den Pause-Zustand zu ändern.

## Affected Specs

| ID | File | Change |
|---|---|---|
| `US_AUT_HEARTBEAT` | docs/userstories/us_aut.rst | +AC-14 (pause), +AC-15 (resume + run + persist) |
| `REQ_AUT_PAUSE` (new) | docs/requirements/req_aut.rst | 5 ACs |
| `SPEC_AUT_JOBSCHEMA` | docs/design/spec_aut.rst | +`enabled?: boolean` |
| `SPEC_AUT_SCHEDULERLOOP` | docs/design/spec_aut.rst | skip `enabled === false` |
| `SPEC_AUT_HEARTBEATPROVIDER` | docs/design/spec_aut.rst | contextValue = `heartbeatJob` \| `heartbeatJobPaused` |
| `SPEC_AUT_PAUSECOMMAND` (new) | docs/design/spec_aut.rst | `jarvis.pauseHeartbeatJob` + `jarvis.resumeHeartbeatJob` |

## Implementation Notes

- `src/heartbeat.ts`: extend `HeartbeatJob`; add `setJobEnabled(name, enabled)`
  helper that rewrites `heartbeat.yaml`; add two command registrations.
- `src/heartbeatTreeProvider.ts`: switch `contextValue` based on `job.enabled`;
  optionally add `⏸` to description when paused.
- `package.json`: register commands with `$(debug-pause)` / `$(debug-start)`
  icons; menu entries:
  - `jarvis.pauseHeartbeatJob` inline on `heartbeatJob`
  - `jarvis.resumeHeartbeatJob` inline on `heartbeatJobPaused`
  - existing `jarvis.runJob` inline on `heartbeatJob` (unchanged); NOT on
    `heartbeatJobPaused` (paused job gets resume button only per AC-3)
- Both new commands `"when": "false"` in `commandPalette` (tree-only).
- Update `testdata/heartbeat/heartbeat.yaml` example: optional, document via
  README/spec.

## Test Plan (UAT)

| ID | Step | Expected |
|---|---|---|
| T-1 | Aktiver Job im Tree | Pause- und Play-Button sichtbar |
| T-2 | Klick Pause-Button | Tree-Icon/contextValue wechselt zu paused; Run- und Resume-Button sichtbar; YAML enthält `enabled: false` |
| T-3 | Reload Extension | Pause-Zustand bleibt erhalten |
| T-4 | Klick Resume-Button (`$(debug-continue)`) auf pausierten Job | Job läuft sofort; YAML hat wieder `enabled: true` (oder Feld entfernt); Tree zurück zu Run-Modus |
| T-5 | Scheduler-Tick während pausiert | Job feuert NICHT (Log zeigt keinen Run) |
| T-6 | Aktiver Job Play-Button | Manuelles Ausführen funktioniert wie vorher (unverändert) |
| T-7 | Pausierter Job Play-Button | Einmal-Lauf; Pause-Zustand bleibt erhalten |

## Decisions

- AC-3 interpretiert als "klick Resume = enabled=true + sofortiger Einmal-Lauf"
  (passt zu "klarer Aufruf zum Aktivieren").
- `enabled` fehlt im YAML → wird als `true` interpretiert (Backward-Compat).
