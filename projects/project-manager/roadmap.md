# Jarvis Roadmap

*Last updated: 2026-04-10*

## Next Up

| Change | Status |
|--------|--------|
| qa-fix-critical (HIGH-1: session→destination, HIGH-2: sidebar 3→4) | post-release |
| qa-lifecycle-reqs (REQ_DEV_ACTIVATION, REQ_DEV_DISPOSAL) | planned |
| qa-spec-cleanup (OutputChannel type, syncRescanJob SPEC) | planned |
| qa-story-structure (US_EXP_AGENTSESSION placement, UAT overlap) | planned |
| qa-link-hygiene (20 missing :links:) | planned |

## v0.3.0 (releasing)

| Change | Status |
|--------|--------|
| Scanner Refresh (entity comparison, rescan button, name sort) | done |
| Heartbeat Tree View (cron-parser, next-run display) | done |
| Heartbeat Architecture (register/unregister, zentraler Scheduler) | done |
| Message Inbox Pattern (readMessage LM Tool) | done |
| Unified Logging (Timestamps, shared OutputChannel) | done |
| MCP Server (Dual-Registration) | done |

## Planned

- **Detail Pages** — Webview für Projekt/Event Details (Felder anzeigen, editieren)
- **Dashboard** — Übersicht Tasks/Fälligkeiten/Backlog-Trend (wie Action Items Trend)
- **Tasks Integration** — Outlook COM Provider, Read-Through Cache, Task-Tree + Dashboard
- **Session Recorder** — Audio → Whisper → Transcript → sendToSession
- **`jarvis_listProjects` LM Tool** — Projekte per Tool abfragen (für Agents + MCP)

## Architecture Decisions

### MCP Server (2026-04-10)
- **Scope:** Embedded in Extension, kein separater Prozess
- **Transport:** HTTP/SSE auf localhost
- **Port:** Konfigurierbar via `jarvis.mcpPort` (default: `31415`)
- **Dual-Registration:** Ein Wrapper registriert Tool bei VS Code LM API + MCP Server gleichzeitig
- **Alle LM Tools automatisch exposed:** sendToSession, readMessage, listSessions, listProjects, rescan
- **Clients:** Heartbeat-Scripts (Python), Claude Desktop, externe IDEs
- **Cross-Workspace Messaging:** Jeder Workspace hat eigenen Port → Jarvis-Instanzen können sich gegenseitig Messages schicken. Hub-and-Spoke: ProjectManager (:31400, 27+ Sessions) als zentraler Hub, Dev-Workspaces als Spokes (Jarvis Dev :31415, syspilot :31416, etc.). Jedes Projekt schreibt an seine Session beim Hub.
- **Sicherheit:** nur 127.0.0.1, optional shared token aus `.jarvis/mcp-token`
- **Dep:** `@modelcontextprotocol/sdk`

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
- **esbuild bundler** — VSIX von 4.4MB auf ~200KB reduzieren

## Open Questions

- **OSS Readiness:** Produkt-Boundaries und Dependencies definieren bevor Open Source
- **Distribution:** GitHub Release + .vsix — kein Marketplace
