# Jarvis Roadmap

*Last updated: 2026-04-09*

## Next Up

| Change | Status |
|--------|--------|
| Folder Convention (project.yaml / event.yaml) | in progress |
| New Project / New Event Commands (+Icon) | queued |

## Planned

- **Detail Pages** — Webview für Projekt/Event Details (Felder anzeigen, editieren)
- **Dashboard** — Übersicht Tasks/Fälligkeiten/Backlog-Trend (wie Action Items Trend)
- **Tasks Integration** — Outlook COM Provider, Read-Through Cache, Task-Tree + Dashboard
- **Session Recorder** — Audio → Whisper → Transcript → sendToSession

## Architecture Decisions

### Tasks Integration (2026-04-09)
- **Provider-Pattern:** TaskProvider Interface (read/write) — kein MCP zur Laufzeit
- **Cache:** RAM-basiert (Read-Through), zyklisch via Heartbeat refreshed
- **Write:** Direkt zum Provider, dann Cache invalidieren
- **Erster Provider:** Outlook Classic (COM), kein Graph/OAuth nötig
- **Erweiterbar:** Jeder Provider füllt denselben Cache (Gmail etc. denkbar, nicht geplant)
- **UI:** TreeProvider + Webview Dashboard lesen nur aus Cache
- **LM Tools:** Agent kann Tasks lesen/schreiben über VS Code Function Calls (schneller als MCP)

## Backlog

- **sendToSession sender bug** — Sender wird aus aktivem Tab ermittelt statt aus der Session die den Call ausgelöst hat. Kritisch für Rückantworten.
- **message tree actions** — Klick auf Message öffnet messages.json; Klick auf Pfad/Session öffnet die Session; einzelne Messages zustellbar (nicht nur ganze Session-Gruppe)
- **self-update-check** — beim Start GitHub Releases API prüfen, Notification wenn neue Version
- **esbuild bundler** — VSIX von 4.4MB auf ~200KB reduzieren

## Open Questions

- **OSS Readiness:** Produkt-Boundaries und Dependencies definieren bevor Open Source
- **MCP Server Scope:** Bleibt separat, nicht in Jarvis Extension (vorerst)
- **Distribution:** GitHub Release + .vsix — kein Marketplace
