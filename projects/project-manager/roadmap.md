# Jarvis Roadmap

*Last updated: 2026-04-13*

## Next Up

| Change | Status |
|--------|--------|
| qa-lifecycle-reqs (M-1: Activation, M-2: Disposal, M-5: RescanBridge) | planned |

## v0.4.0 (in progress)

| Change | Status |
|--------|--------|
| qa-doc-improvements (link hygiene + doc fixes) | done |
| list-projects (jarvis_listProjects LM+MCP Tool) | done |
| settings-grp (Settings Gruppierung + Feature-Toggle) | done |
| context-actions (Reveal in Explorer/OS/Terminal) | done |
| event-sort (Chronologische Sortierung mit Datums-Label) | in progress |

## v0.3.1 (released)

| Change | Status |
|--------|--------|
| qa-fix-critical (HIGH-1/2) | done |
| qa-doc-cleanup (M-3/4/6) | done |
| heartbeat-job-tools (registerJob, unregisterJob) | done |
| sender-fix (senderSession priority) | done |

## v0.3.0 (released)

| Change | Status |
|--------|--------|
| Scanner Refresh (entity comparison, rescan button, name sort) | done |
| Heartbeat Tree View (cron-parser, next-run display) | done |
| Heartbeat Architecture (register/unregister, zentraler Scheduler) | done |
| Message Inbox Pattern (readMessage LM Tool) | done |
| Unified Logging (Timestamps, shared OutputChannel) | done |
| MCP Server (Dual-Registration) | done |

## v0.5.x — Outlook Integration (feature-complete milestone)

v0.5.x iteriert bis Outlook vollständig funktioniert. Nicht implementierte Features sind Bugs, kein v0.6.0 vorher.
Alle Outlook-Features sind abschaltbar (Feature-Toggle, `when`-Clauses). Sidebar-Views nur wo ein "browse" Workflow sinnvoll ist.
Constraint: Windows + Outlook Classic (COM), kein Graph/OAuth.

| Feature | Scope | Sidebar View |
|---------|-------|-------------|
| **Outlook Categories Sync** | Pro Projekt/Event Outlook-Kategorie anlegen/sync (COM). Fundament für alle anderen Features. | ja (abschaltbar, default: an — für UAT/Einrichtung nützlich) |
| **Outlook Tasks** | Task-Tree gefiltert nach Jarvis-Kategorien, Read-Through Cache via Heartbeat | ja |
| **Outlook Calendar** | Kalendereinträge pro Projekt/Event gefiltert nach Kategorie | ja |
| **Outlook Contacts** | Personen mit Kategorie-Tag → wer gehört zu welchem Projekt/Event | ja |
| **Outlook Inbox** | Mails nach Kategorie gruppiert (read-only) | tbd |

## Planned (post v0.5.x)

- **Detail Pages** — Webview für Projekt/Event Details (Felder anzeigen, editieren)
- **Dashboard** — Übersicht Tasks/Fälligkeiten/Backlog-Trend
- **Session Recorder** — Audio → Whisper → Transcript → sendToSession

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

### Outlook Integration (2026-04-13)
- **Constraint:** Windows + Outlook Classic (COM) only — kein Graph, kein OAuth
- **Feature-Toggle:** Alle Outlook-Features abschaltbar (`jarvis.outlookEnabled`), Sidebar-Views via `when`-Clauses versteckt
- **Kategorien als Fundament:** Pro Projekt/Event eine Outlook-Kategorie → gemeinsames Label-System für Tasks, Mails, Kalender, Kontakte
- **Provider-Pattern:** OutlookProvider Interface (read/write) — kein MCP zur Laufzeit
- **Cache:** RAM-basiert (Read-Through), zyklisch via Heartbeat refreshed
- **Sidebar-Regel:** View nur wenn echter "browse" Workflow — Kategorien-Sync ist Infrastruktur (kein eigener View)
- **LM Tools:** Agent kann Tasks/Kontakte lesen/schreiben über VS Code Function Calls

## Backlog

- **CLI Session Lookup** — Play-Button findet Copilot CLI Sessions nicht (`state.vscdb` enthält sie nicht). Braucht alternativen Mechanismus (z.B. Session-Registry via `jarvis_registerSession`). Blockiert parallele CM-Skalierung.
- **message tree actions** — Klick auf Message öffnet messages.json; Klick auf Pfad/Session öffnet die Session; einzelne Messages zustellbar (nicht nur ganze Session-Gruppe)
- **esbuild bundler** — VSIX von 4.4MB auf ~200KB reduzieren

## Open Questions

- **OSS Readiness:** Produkt-Boundaries und Dependencies definieren bevor Open Source
- **Distribution:** GitHub Release + .vsix — kein Marketplace
- **Parallel Development (Worktrees):** Git Worktrees ermöglichen parallele Change Manager auf getrennten Branches. Jarvis liefert Infrastruktur (MCP, Message Queue), syspilot muss Agent-Orchestrierung bauen (Worktree-Lifecycle, Branch-Konflikt-Vermeidung, Merge-Strategie). Gemeinsam mit syspilot PM entwickeln.
