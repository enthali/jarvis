# FIND-2026-04-16 — Background Agent Sessions (Proposed APIs Research)

**Datum:** 2026-04-16  
**Frage:** Erlauben VS Code proposed APIs es, Chat-Sessions programmatisch ohne UI-Fokus-Wechsel zu starten, Prompts zu injizieren und Responses zu lesen?

---

## Proposed APIs (VS Code 1.116)

**chatSessionsProvider:**
- `chat.createChatSessionItemController(type, refreshHandler)` — Sessions programmatisch erstellen
- `ChatSessionItemController.items` — Collection von Sessions (add/delete/get/replace)
- `ChatSessionItemController.createChatSessionItem(uri, label)` — Neue Session erstellen
- `ChatSessionContentProvider.provideChatSessionContent(uri)` — Session-Inhalt liefern
- `ChatSession.requestHandler` — Neue Requests programmatisch handlen
- `ChatSession.activeResponseCallback` — Laufende Response streamen

**chatParticipantPrivate:**
- `window.activeChatPanelSessionResource` — URI der aktiven Chat-Session
- `onDidChangeActiveChatPanelSessionResource` — Event bei Session-Wechsel
- `onDidDisposeChatSession` — Event wenn Session geschlossen
- `ChatRequest.sessionResource` — Session-URI bei jedem Request
- `ChatRequest.permissionLevel`: `'autoApprove' | 'autopilot'` — Auto-Approve für autonome Agents

**Aktivierung:** `package.json` → `"enabledApiProposals": ["chatSessionsProvider", "chatParticipantPrivate"]`, dann `npx vscode-dts dev`

---

## Finding 1 — VS Code proposed APIs: Sackgasse ❌

Die APIs sind **Provider-Pattern, nicht Consumer-Pattern**. Sie erlauben externen Anbietern (Copilot, Claude) ihre Sessions in der VS Code UI zu rendern — nicht aber, Sessions von außen zu steuern.

- `IChatService.sendRequest()` ist **internal workbench service**, nicht in der Extension API exposed.
- Alle Chat-Requests gehen durch `IChatWidget.acceptInput()` → UI-Fokus erforderlich.
- `ChatSession.requestHandler` ist ein **Listener** auf eingehende Requests, kein Inject-Punkt.

**Fazit:** VS Code Chat-Architektur ist Widget-bound. Plattform-Limitierung, kein Workaround möglich.

---

## Finding 2 — Copilot CLI: headless ✅

Die **Copilot CLI** (`copilot.exe`, v1.0.29) ist ein eigenständiger Agent mit vollem Funktionsumfang außerhalb von VS Code:

| Flag | Funktion |
|------|---------|
| `copilot -p "prompt"` | One-Shot, exit nach Antwort |
| `copilot --resume=<uuid>` | Session mit bekannter ID fortsetzen |
| `copilot --continue` | Letzte Session fortsetzen |
| `copilot --resume=<selbst-uuid>` | Neue Session mit vorgegebener UUID |
| `copilot --output-format json` | JSONL Output für programmatische Verarbeitung |
| `copilot --share` | Export als Markdown (`copilot-session-<id>.md`) |
| `copilot --allow-all-tools --yolo` | Permission-Flags |
| `copilot --agent <name>` | Custom Agents (`.github/agents/*.md`) |
| `copilot --acp` | Agent Client Protocol Server (machine-to-machine) |
| `copilot --remote` | Session von GitHub Web steuerbar (nicht programmatisch) |

---

## Finding 3 — Shared State via SQLite: `~/.copilot/session-store.db` ✅

SQLite-DB (Schema v2), Tabellen:
- `sessions` (id, cwd, repository, branch, summary, timestamps)
- `turns` (session_id, turn_index, user_message, assistant_response)
- `checkpoints` (title, overview, history, work_done, next_steps)
- `session_files`, `session_refs`, `search_index` (FTS5)

**Wichtig:** Diese DB wird **auch von VS Code gelesen** — CLI-Sessions erscheinen automatisch in der VS Code Sidebar. Trotz "lokales Repo" als Setup-Option landet alles global unter `~/.copilot/`.

---

## Finding 4 — Vier Rendering-Modi für dieselbe Session

| Modus | UI | `/remote` |
|-------|----|-----------|
| PowerShell extern | Terminal TUI (VT100) | ✅ |
| VS Code Terminal (`resume in terminal`) | Terminal TUI | ✅ |
| VS Code Chat View | VS Code Chat Widget | ❌ |
| VS Code Editor View | VS Code Chat Widget | ❌ |

Terminal-Varianten haben vollen Funktionsumfang (inkl. `/remote`, `/ide`, `/session`, `/compact`, `/context`, `/mcp`).

---

## Finding 5 — Session-ID abfragen

Kein offizielles API-Kommando. Wege:
- Agent selbst fragen ("wie lautet meine session-id?")
- SQLite-Query auf `session-store.db` (ORDER BY created_at DESC)
- UUID selbst vorgeben mit `--resume=<meine-uuid>` → ID vor Start bekannt
- `--output-format json` parsen
- `--share` → `copilot-session-<id>.md`

---

## Finding 6 — MCP-Integration ✅

CLI konnte Nachricht per `jarvis_sendToSession` in VS Code Message Queue schicken (Test: `"Hallo vom Copilot CLI! 👋"` kam an). Voraussetzung: laufende Jarvis Extension und `.mcp.json` mit `mcpServers`-Key (CLI-Format, nicht VS Code's `servers`-Key).

`.vscode/mcp.json` wird von CLI **nicht** mehr gelesen (MCP Migration Notice).

---

## Finding 7 — Das Ping-Problem

Sessions können sich per `jarvis_sendToSession` Nachrichten schicken, aber die **Ziel-Session wacht nicht auf** — sie muss aktiv `jarvis_readMessage` aufrufen.

Lösungsansätze (erarbeitet mit CLI-Session, 2026-04-16):

| Option | Beschreibung |
|--------|-------------|
| **A) PTY-Proxy (node-pty)** | Wrapper startet `copilot` als Child in virtuellem Terminal. File Watcher erkennt neue Messages → schreibt `"check deine messages\n"` in PTY-stdin. |
| **B) Named Pipe Bridge (Windows)** | CLI-Starter-Script erstellt Named Pipe. Reader-Thread leitet an `copilot` stdin. Jarvis Extension öffnet Pipe bei neuer Nachricht. |
| **C) Win32 `WriteConsoleInput`** | Attach an Console der Ziel-PowerShell per PID, inject Tastatur-Events. Nachteil: nur eine attached Console pro Prozess. |
| **D) Wrapper-Script `Start-CopilotSession.ps1`** | Kombiniert A+B. Sauberste UX: User merkt nichts. |

**Wichtig:** `/remote` ist nicht als programmatischer Endpoint nutzbar — nur für GitHub Web/Mobile.

---

## Finding 8 — ACP (Agent Client Protocol)

`copilot --acp` startet einen Machine-to-Machine Protokoll-Server. Offener Standard, Jarvis könnte als ACP-Client sprechen. Aber: kein UI, kein "reinschauen", reine Backend-Automation. Nicht ideal für Vision "CLI-Session mit der ich quatschen kann".

---

## Empfohlene Architektur (Stand 2026-04-16)

```
┌──────────────┐    Message Queue     ┌──────────────────┐
│  Jarvis      │ ─── Play-Button ───→ │  copilot -p      │
│  (VS Code    │                      │  --allow-all -s  │
│   Extension) │ ← sendToSession ──── │  CLI Session      │
│              │                      └──────────────────┘
│              │    Ping (PTY/Pipe)            ↑
│              │ ────── wake-up ───────────────┘
└──────────────┘
```

**Starten:** Heartbeat oder Play-Button → `copilot -p "<prompt>" --resume=<uuid> --allow-tool=jarvis-* -s`  
**Antworten:** CLI-Session → MCP `jarvis_sendToSession` an Absender  
**Aufwecken:** PTY/Named-Pipe-Inject bei neuer Message  
**Reinschauen:** VS Code Sidebar / Chat View / Editor View / Terminal  
**Remote:** `--remote` aktivierbar → Steuerung vom Handy/Web  
**Mehrere Sessions parallel:** ja, mit eigenen UUIDs

---

## Nächste Schritte (Stand 2026-04-16)

1. PoC-Wrapper: `Start-CopilotSession.ps1` mit Named-Pipe-Ping
2. Jarvis Extension: `jarvis.pingSession(name)` Command + File-Watcher auf Inbox
3. Test: CM-Workflow als CLI-Session orchestrieren, QM als separate CLI-Session
4. Offene Frage: Kann CLI-Session beim Start automatisch ihre Inbox abfragen?
