# Research — Session Context

## Rolle
Research-Engineer fuer explorative Spikes, Quellenrecherche und technische Findings. Kein formaler syspilot-Prozess: keine US/REQ/SPEC schreiben, keine CM-Orchestrierung, kein Verify-Gate.

## Arbeitsgrenzen
- Research klaert Machbarkeit, Risiken, API-Verhalten und Workarounds.
- Research darf kleine Spike-Branches und Experimente anlegen, um Hypothesen zu pruefen.
- Research implementiert keine produktiven Aenderungen auf `develop` und merged nicht selbst. Findings gehen an PM/CM; produktive Umsetzung laeuft ueber den normalen Change-Prozess oder explizite User-Anweisung.
- Wenn Research ausnahmsweise einen Mini-Fix als Experiment committed, bleibt er isoliert auf dem Research-Branch, bis PM/CM uebernimmt.

## Branch-Regel
Research-Branches starten von `develop`, bleiben isoliert und werden nicht ohne PM/CM-Entscheidung gemerged. Namensschema: `research-<kurzer-slug>` oder, fuer reine Wegwerfexperimente, `experiment/<kurzer-slug>`. Vor jeder Aenderung Branch und Dirty-State pruefen.

## Aktueller Auftrag
Kein dauerhafter Auftrag. Research arbeitet ad hoc auf PM-/User-Fragen. Die folgenden Abschnitte sind historische Findings und Architektur-Notizen.

## Weitere Research-Artefakte (in diesem Ordner)
- `architecture-review-2026-05.md` — 11 Findings (F1–F11) zur Tech-Debt-Welle, priorisiert. Spawn-Quelle fuer kommende CRs an PM.
- `future-ideas.md` — strategische Ideen, die noch keine CRs sind (Trigger / Idee / offene Fragen / Status). Neue Eintraege oben anfuegen.
- `chat-injection-findings-2026-07.md` — Verhalten von `workbench.action.chat.*` in VS Code 1.130: Namenskonvention, Widget-Aufloesung, `needToClearSession`-Risiko, validierte Minimalsequenz fuer Injektion in Bestandssessions.

## Historische Findings: Background Agent Sessions (proposed APIs)

### Ziel
Klären ob VS Code proposed APIs es erlauben, Chat-Sessions programmatisch ohne UI-Fokus-Wechsel zu starten, Prompts zu injizieren und Responses zu lesen. Erster Kandidat: QM-Session per Heartbeat triggern.

### Proposed APIs (VS Code 1.116)

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

### Aktivierung
In `package.json`: `"enabledApiProposals": ["chatSessionsProvider", "chatParticipantPrivate"]`
Dann: `npx vscode-dts dev` → `.d.ts` Dateien generieren → proposed API-Typen verfügbar.

### Kernfragen für den PoC
1. Kann `createChatSessionItem` eine Session mit einem bestimmten Agent-Mode (z.B. `syspilot.qm`) erstellen?
2. Ist `requestHandler` ein Inject-Punkt für Prompts — oder nur ein Listener?
3. Funktioniert das ohne UI-Fokus-Wechsel?
4. Minimaler PoC: Session erstellen → Prompt injizieren → Response lesen

### Quelle
https://github.com/microsoft/vscode/tree/main/src/vscode-dts

---

## Findings (2026-04-16)

### 1. VS Code proposed APIs — Sackgasse
Die APIs `chatSessionsProvider` und `chatParticipantPrivate` sind **Provider-Pattern, nicht Consumer-Pattern**. Sie erlauben externen Anbietern (wie Copilot, Claude) ihre Sessions in der VS Code UI zu rendern — nicht aber, Sessions von außen zu steuern oder Prompts zu injizieren.

- `IChatService.sendRequest()` ist **internal workbench service**, nicht in der Extension API exposed.
- Alle Chat-Requests gehen durch `IChatWidget.acceptInput()` → UI-Fokus erforderlich.
- `workbench.action.chat.open` mit `IChatViewOpenOptions` (query, mode, blockOnResponse, …) geht immer durch das Widget → Fokus-Wechsel.
- `ChatSession.requestHandler` ist ein **Listener** auf eingehende Requests, kein Inject-Punkt.

**Fazit:** VS Code Chat-Architektur ist Widget-bound. Kein Provider (Copilot, Claude, etc.) kann das umgehen — Plattform-Limitierung.

### 2. Copilot CLI — funktioniert headless
Alternative gefunden: die **Copilot CLI** (`copilot.exe`, v1.0.29) ist ein eigenständiger Agent mit vollem Funktionsumfang außerhalb von VS Code.

- `copilot -p "prompt"` — programmatischer One-Shot (exit nach Antwort)
- `copilot --resume=<uuid>` — Session mit bekannter ID fortsetzen
- `copilot --continue` — letzte Session fortsetzen (keine ID nötig)
- `copilot --resume=<self-generated-uuid>` — neue Session **mit vorgegebener UUID** starten
- `copilot --output-format json` — JSONL Output für programmatische Verarbeitung
- `copilot --share` — Session als Markdown exportieren (Dateiname enthält Session-ID)
- `copilot --allow-tool='name' --allow-all-tools --yolo` — Permission-Flags
- `copilot --agent <name>` — Custom Agents (`.github/agents/*.md`)
- `copilot --acp` — Agent Client Protocol Server (rein maschinell, kein UI)
- `copilot --remote` — Session von GitHub Web/Mobile steuerbar (**nicht** programmatisch)

### 3. Shared State via SQLite: `~/.copilot/session-store.db`
Die CLI speichert **alle** Sessions in einer SQLite-DB unter `~/.copilot/session-store.db` (Schema v2). Tabellen:
- `sessions` (id, cwd, repository, branch, summary, timestamps)
- `turns` (session_id, turn_index, user_message, assistant_response)
- `checkpoints` (title, overview, history, work_done, next_steps)
- `session_files`, `session_refs`, `search_index` (FTS5)

**Wichtig:** Diese DB wird **auch von VS Code gelesen** — Sessions die per CLI gestartet werden, erscheinen automatisch in der VS Code Sidebar (Chat View). Shared State zwischen CLI und VS Code ist gegeben.

Trotz "Option 2 — speichere Sessions lokal im Repository" beim CLI-Setup landet alles global unter `~/.copilot/`. Keine Repo-lokale Persistenz.

> **Update 2026-07-21 (Agent Host 1.129.1):** Es sind **zwei lose gekoppelte Stores** — `~/.copilot/session-store.db` (SDK/CLI) **und** `state.vscdb` (VS-Code-Index). Eine Agent-Host-Session erscheint in **beiden** und **auch in `jarvis_listChatSessions`** (früheres Prior „Jarvis sieht sie nicht" = falsch). Ein `/rename` in VS Code schreibt nur in `state.vscdb`, **nicht** in den CLI-Store → Namen können driften. **Stabile Identität = Session-URI/UUID (`agenthost-content:///sessionId/…`), nicht der Name.** Voll dokumentiert in [FI-2026-07-21-agent-host-stage0-compat.md](FI-2026-07-21-agent-host-stage0-compat.md).

### 4. Vier Rendering-Modi für die gleiche Session
| Modus | UI | `/remote` | `/rename` |
|-------|----|----|----|
| **PowerShell extern** | Terminal TUI (VT100-style) | ✅ funktioniert | ⚠️ Command da, tut nichts |
| **VS Code Terminal** (`resume in terminal`) | Terminal TUI | ✅ | ⚠️ |
| **VS Code Chat View** | VS Code Chat Widget | ❌ | — |
| **VS Code Editor View** | VS Code Chat Widget | ❌ | — |

Die **Terminal-Varianten** haben vollen Funktionsumfang (inkl. `/remote`, `/ide`, `/session`, `/resume`, `/compact`, `/context`, `/mcp`).

### 5. Session-ID abfragen
Kein offizielles API-Kommando. Wege:
- **Agent selbst fragen** (`"wie lautet meine session-id?"`) — er kennt sie aus seinem Kontext
- **SQLite-Query** auf `session-store.db` (ORDER BY created_at DESC)
- **UUID selbst vorgeben** mit `--resume=<meine-uuid>` → ID vor Start bekannt
- **`--output-format json`** parsen
- **`--share`** erzeugt `copilot-session-<id>.md` mit ID im Dateinamen

### 6. MCP-Integration: funktioniert
CLI konnte Nachricht per `jarvis_sendToSession` in VS Code Message Queue schicken (Test 2026-04-16, `"Hallo vom Copilot CLI! 👋"` kam an). Voraussetzung: laufende Jarvis Extension (HTTP MCP auf Ports 31410/31413/31414/31420) und `.mcp.json` mit `mcpServers`-Key (CLI-Format, nicht VS Code's `servers`).

`.vscode/mcp.json` wird von CLI **nicht** mehr gelesen (laut MCP Migration Notice).

### 7. Das Ping-Problem
Sessions können sich per `jarvis_sendToSession` Nachrichten schicken — aber die **Ziel-Session wacht nicht auf**. Sie muss aktiv `jarvis_readMessage` aufrufen.

Lösungsansätze (gemeinsam mit CLI-Session erarbeitet, 2026-04-16):

**A) PTY-Proxy (node-pty):** Wrapper startet `copilot` als Child in virtuellem Terminal. File Watcher erkennt neue Messages in `messages.json` → schreibt "check deine messages\n" direkt in PTY-stdin. Mehrere CLI-Sessions parallel möglich.

**B) Named Pipe Bridge (Windows):** CLI-Starter-Script erstellt Named Pipe `\\.\pipe\jarvis-cli-<name>`. Reader-Thread leitet an `copilot` stdin. Jarvis Extension öffnet Pipe bei neuer Nachricht und schreibt Ping-Text.

**C) Win32 `WriteConsoleInput`:** Attach an Console der Ziel-PowerShell per PID, inject Tastatur-Events. Nachteil: nur eine attached Console pro Prozess möglich.

**D) Wrapper-Script `Start-CopilotSession.ps1`:** Kombiniert A+B — startet Copilot, öffnet IPC zu Jarvis, inject bei Messages. Sauberste User-Experience: User merkt nichts, CLI-Session bekommt einfach "check inbox" in den Prompt.

**Wichtig:** `/remote` ist **nicht** als programmatischer Endpoint nutzbar — nur für GitHub Web/Mobile Steuerung gedacht.

### 8. ACP — Agent Client Protocol
`copilot --acp` startet einen Machine-to-Machine Protokoll-Server. Offener Standard, Jarvis könnte als ACP-Client sprechen. **Aber:** kein UI, kein "reinschauen", reine Backend-Automation. Nicht ideal für Vision "CLI-Session mit der ich quatschen kann".

---

## Empfohlene Architektur (Vision)

```
┌──────────────┐    Message Queue     ┌──────────────────┐
│  Jarvis      │ ─── Play-Button ───→ │  copilot -p      │
│  (VS Code    │                      │  --allow-all -s  │
│   Extension) │ ← sendToSession ──── │  CLI Session      │
│              │                      └──────────────────┘
│              │                              │
│              │                        Session fertig → exit
│              │                              │
│              │                       Ping (PTY/Pipe) ↑
│              │ ────────── wake-up ─────────────────────┘
└──────────────┘
```

- **Starten:** Heartbeat oder Play-Button in Message-UI → `copilot -p "<prompt>" --resume=<uuid> --allow-tool=jarvis-* -s`
- **Antworten:** CLI-Session schickt per MCP `jarvis_sendToSession` an Absender
- **Aufwecken:** PTY/Named-Pipe-Inject bei neuer Message in Inbox
- **Reinschauen:** User öffnet Session in VS Code Sidebar, Chat View, Editor View oder `copilot --resume=<uuid>` im Terminal
- **Remote:** `--remote` aktivierbar → Steuerung vom Handy/Web
- **Mehrere Sessions parallel:** ja, mit eigenen UUIDs / sprechenden Namen

## Nächste Schritte
1. PoC-Wrapper: `Start-CopilotSession.ps1` mit Named-Pipe-Ping
2. Jarvis Extension: `jarvis.pingSession(name)` Command + File-Watcher auf Inbox
3. Test: CM-Workflow als CLI-Session orchestrieren, QM als separate CLI-Session
4. Offene Frage: Kann CLI-Session beim Start automatisch ihre Inbox abfragen?

---

## Experimente (2026-04-17)

### Experiment 1: `WriteConsoleInput` (AttachConsole-basiert)
Ordner: `experiments/inject-console/`

**Ergebnis:** Funktioniert perfekt für **PowerShell als Target**, aber **nicht für Copilot CLI**.

Win32 API Chain: `FreeConsole()` → `AttachConsole(target-pid)` → `CreateFile("CONIN$", GENERIC_READ|GENERIC_WRITE)` → `WriteConsoleInput(records)`.

Getestet gegen:
- ✅ conhost-basierte `pwsh` (PID 4540) — `Hallo` erschien im Input und wurde (mit korrekten `VirtualKeyCode=0x0D` + `VirtualScanCode=0x1C`) auch submittet
- ✅ Windows Terminal `pwsh` (PID 8604) — funktionierte ebenfalls (trotz ConPTY-Layer — unter der Haube ist eine "echte" conhost-Console)
- ❌ Copilot CLI TUI — Events landen im Console-Input-Buffer, aber Copilot **liest da nicht**. Es nutzt Node's Raw-Mode stdin (readable stream), der direkt aus der PTY-Pipe speist.

**Stolperfallen gelernt:**
- PS 5.1 kann `[uint32]0x80000000` nicht casten → dezimal/long nutzen
- `[ushort]` existiert nicht als PS Typ-Accelerator → `[uint16]`
- Für CR muss `VirtualKeyCode=0x0D` **und** `VirtualScanCode=0x1C` gesetzt sein, sonst rendert PSReadLine ein fremdes Zeichen (sah wie `m` aus) statt zu submittieren
- Nach `FreeConsole` + `AttachConsole(target)` + `FreeConsole` kann der Injector-PowerShell-Prozess nicht sauber zu seiner eigenen Console zurück — die Shell klappt zu. Workaround: Inject in Child-Prozess laufen lassen (`Start-Job`)

### Experiment 2: `node-pty` PTY-Wrapper ✅ **Durchbruch**
Ordner: `experiments/node-pty-wrapper/`

**Setup:** Node.js-Wrapper startet `copilot.exe` als Child in einer von ihm kontrollierten ConPTY. User-Tastatur wird 1:1 durchgereicht, Copilot-Output geht an User-stdout. Zusätzlich schreibt der Wrapper nach einer Wartezeit (oder wenn ein bestimmtes Output-Pattern erscheint) Text direkt in den PTY-Master.

**Code-Kern (wirklich minimal):**
```js
const pty = require('node-pty');
const ptyProc = pty.spawn('copilot.exe', [], { name: 'xterm-256color', cols, rows, env });
ptyProc.onData(d => process.stdout.write(d));
process.stdin.on('data', d => ptyProc.write(d));
setTimeout(() => ptyProc.write('hallo\r'), 5000);
```

**Test-Ergebnis 2026-04-17:**
1. Copilot TUI startete normal im Wrapper ✅
2. Trust-Prompt wurde vom User bestätigt ✅
3. Nach Erkennen von `"Ask me anything"` (bzw. Timeout 20s) wurde der Inject ausgeführt ✅
4. Copilot sah die Zeile `"Sag 'hallo' und dann erklär mir in einem Satz was du bist."` als echten Prompt-Input ✅
5. Copilot antwortete normal: *"Hallo! Ich bin der GitHub Copilot CLI – ein KI-gestützter Terminal-Assistent..."* ✅

**Kleiner Schönheitsfehler:** Nach dem Inject erscheint die `/ commands · ? help` Hinweiszeile doppelt — vermutlich Redraw-Sync wegen `\r` vs `\r\n` oder Timing. Kein funktionales Problem, kann später behoben werden.

**Bewiesen:**
- PTY-Master-Write ist für Copilot **ununterscheidbar** von echter User-Tastatur
- Keine "Automation detection" — Copilot verhält sich komplett normal
- User kann weiterhin von Hand tippen, Wrapper ist transparent
- `node-pty` auf Windows nutzt automatisch **ConPTY** (Windows 10+) — keine speziellen Build Tools nötig

## Phase-1 Architektur (abgesichert)

```
┌──────────────────┐    Message Queue     ┌─────────────────────┐
│  Jarvis          │ ─── Play-Button ───→ │  jarvis-wrapper.js  │
│  (VS Code Ext.)  │                      │  (node-pty host)    │
│                  │                      │   └─► copilot.exe   │
│                  │                      │       (in PTY)       │
│                  │    Named Pipe        │                      │
│                  │ ─── "ping/inbox" ──→ │   PTY-Write          │
│                  │                      │                      │
│                  │ ← MCP sendToSession ─│   Copilot →          │
│                  │   jarvis_* tools     │   jarvis-vse-mcp     │
└──────────────────┘                      └─────────────────────┘
```

**Bewiesene Bausteine:**
- ✅ CLI-Session per `-p` / `--resume=<uuid>` starten (headless)
- ✅ Sessions erscheinen in VS Code Sidebar (shared `session-store.db`)
- ✅ MCP-Brücke: CLI → Jarvis (`.mcp.json` mit `mcpServers`-Key)
- ✅ Text-Inject in laufende CLI via node-pty
- ✅ Verschiedene Rendering-Modi: externe PS, Windows Terminal, VS Code Terminal

**Noch zu tun für Phase 1 komplett:**
1. Named-Pipe-Listener in den Wrapper einbauen (statt Timer)
2. Jarvis Extension Command `jarvis.pingSession(name)` + File-Watcher auf Inbox
3. Wrapper-Script `Start-JarvisSession.ps1` das UUID generiert, Session registriert, wrapper startet
4. End-to-End-Test: Message in Inbox → Jarvis ping → Wrapper inject → CLI-Session liest Inbox → antwortet per MCP

---

## Experiment 3: VS Code Terminal Inject ✅ (2026-04-17)
Direkt in `src/extension.ts` als `jarvis.injectPrompt` Command.

### Session-State Filesystem
Jede CLI-Session erzeugt `~/.copilot/session-state/<uuid>/`:
- `workspace.yaml` — id, cwd, git_root, repository, branch, **summary** (bidirektional mit VS Code Chat Window Titel)
- `inuse.<PID>.lock` — aktive Session-Erkennung (Datei existiert solange Prozess läuft)
- `events.jsonl` — Event-Log
- `checkpoints/`, `rewind-snapshots/` — Checkpointing

### Key Finding: `terminal.sendText(text + '\r', false)` ✅
Die VS Code Terminal API kann direkt in Copilot CLI TUI-Sessions injecten:

```typescript
terminal.sendText(text + '\r', false);
```

**Getestet (A/B/C/D/E Varianten):**
| Variante | Code | Submit? |
|----------|------|---------|
| A | `sendText(text, true)` — default `\n` | ❌ |
| B | `sendText(text + '\r', false)` — CR only | ✅ |
| C | `sendText(text + '\n', false)` — LF only | ❌ |
| D | `sendText(text + '\r\n', false)` — CRLF | ✅ |
| E | `sendText(text, false)` + `sendSequence(\r)` | ✅ (braucht Fokus) |

**Variante B ist die sauberste Lösung.** Ein Write, kein Fokus-Wechsel, kein Extra-Newline.

### Konsequenz: node-pty Wrapper nicht nötig für VS Code
Die VS Code Extension **ist** der PTY-Host. `terminal.sendText()` = `ptyProc.write()`. Architektur vereinfacht sich erheblich.

### Trust-Prompt entfällt in VS Code
Copilot CLI innerhalb eines VS Code Terminals → **kein Trust-Prompt**. Readiness-Detection vereinfacht.

### `/remote` — Session von überall erreichbar
CLI-Sessions mit `--remote` → über GitHub Web steuerbar. Lokal laufender Agent von überall erreichbar. (Web ✅, Handy-App ❌)

### `/rename` per Inject
`/rename Neuer Name\r` funktioniert als injecteter Prompt → Extension kann Sessions beim Create sofort benennen.

### UUID-Management
`copilot --resume=<selbst-generierte-uuid>` startet **neue** Session mit vorgegebener UUID. Kein nachträgliches Auslesen nötig.

### Session-Lifecycle per `createTerminal()`
```typescript
const uuid = crypto.randomUUID();
const terminal = vscode.window.createTerminal({
    name: 'agent-xyz',
    shellPath: 'copilot',
    shellArgs: ['--model', 'gpt-4.1', `--resume=${uuid}`, '--yolo']
});
terminal.sendText('/rename Agent XYZ\r', false);
terminal.sendText('Du bist Agent XYZ. Bitte registriere dich...\r', false);
```

### Worktree-Möglichkeit
Jeder Agent in eigenem Git Worktree → parallele File-Edits ohne Konflikte.

### Output-Problem bleibt
Terminal-API hat **kein** `onData` (stable). Lösung: **MCP als Rückkanal** — Agenten antworten via `jarvis_sendToSession`.

---

## Aktualisierte Architektur (vereinfacht)

```
┌──────────────────┐                      ┌─────────────────────┐
│  Jarvis          │   createTerminal()   │  VS Code Terminal   │
│  (VS Code Ext.)  │ ──────────────────→  │   └─► copilot.exe  │
│                  │                      │       (in PTY)      │
│                  │   sendText()+'\r'    │                     │
│                  │ ──── prompt ───────→ │   TUI Input         │
│                  │                      │                     │
│                  │ ← MCP sendToSession ─│   Copilot →         │
│                  │   jarvis_* tools     │   MCP HTTP Server   │
└──────────────────┘                      └─────────────────────┘
```

**Kein Wrapper, keine Named Pipe, kein Extra-Prozess.** Alles nativ über VS Code APIs.

### Was Jarvis braucht (Minimal-API)
1. **`createCopilotTerminal(name, uuid?, model?)`** — Terminal erstellen, Copilot starten, UUID zurückgeben
2. **`sendToTerminal(nameOrUuid, text)`** — `terminal.sendText(text + '\r', false)`
3. **`resumeTerminal(uuid)`** — `createTerminal` mit `--resume=<uuid>`
4. **MCP-Rückkanal** — bereits vorhanden (`jarvis_sendToSession`)

### Offene Fragen
1. Readiness-Detection: Wann ist die TUI bereit? (`inuse.<PID>.lock`? Timeout? MCP-ready-signal?)
2. Error-Detection: Wie erkennt Jarvis dass ein Agent-Terminal crashed ist?
3. Parallele Agenten: Wie viele CLI-Sessions gleichzeitig? (API-Rate-Limits?)

---

## Experiment 4: CLI + Chat View parallel (2026-04-17)

**Frage:** Kann man die gleiche Session gleichzeitig als CLI-Terminal und in der Chat View (Editor) öffnen und nutzen?

**Ergebnis:** Nein. Input in der Chat View kommt nicht in der CLI-Session an. Beide haben **getrennte Laufzeit-Prozesse** — die SQLite `session-store.db` ist nur Persistenz, kein Live-Kanal. Gleichzeitiges Schreiben = Konflikt.

- ✅ Chat View kann vergangene Turns **lesen** (Viewer-Funktion)
- ❌ Chat View kann nicht in eine **laufende** CLI-Session reinschreiben
- ❌ Zwei gleichzeitige "Writer" auf der gleichen Session → Konflikt

**Live-Test:** Diese Session (Research) läuft als CLI-Terminal. Die gleiche Session ist parallel in der Chat View geöffnet. Input aus der Chat View kommt in der CLI nicht an und umgekehrt. Beide Seiten sehen nur ihren eigenen Input-Strang.

## Architektur-Entscheidung: Nur CLI-Terminal

**Kein Mischbetrieb.** Alle Agent-Sessions laufen als CLI-Terminal.

**Begründung:**
- `terminal.sendText()` funktioniert ohne UI-Fokus-Wechsel — Grundvoraussetzung für Background Agents
- Chat View hat keinen programmatischen Inject (braucht Widget-Fokus)
- Paralleler Betrieb CLI + Chat View auf gleicher Session funktioniert nicht
- `/remote` (Session vom Web/Handy steuern) geht nur in CLI — Chat View hat kein Äquivalent
- Chat View bleibt nutzbar als **nachträglicher Viewer** (Session beendet → in Chat View lesen)

**Implementierungsplan (minimal):**
1. **`jarvis.openAgentSession`** ändern: `createTerminal()` mit `copilot --resume=<uuid>` statt Chat View öffnen
2. **`jarvis.sendMessages`** (Play-Button) ändern: `terminal.sendText()` statt `workbench.action.chat.open({ query })`
3. **Terminal-Lookup** per Name-Konvention: `vscode.window.terminals.find(t => t.name === destination)`
4. **Kein Extra-State** — Terminal-Name = Session-Name, das reicht

### Experiment 5: UUID-Vorgabe bei Session-Start ✅ (2026-04-17)

`copilot --resume=<selbst-generierte-uuid>` startet eine **neue** Session mit exakt dieser UUID. Session taucht in `~/.copilot/session-state/<uuid>/` auf und ist in der VS Code Sidebar sichtbar. UUID kann also vorab in `project.yaml` gespeichert werden.

### Session-Lifecycle bei `openAgentSession` (Klick auf Projekt)

**Flow:**
1. UUID aus `project.yaml` lesen — wenn keine vorhanden: generieren + in YAML schreiben
2. Session-Status prüfen (Lock-File + Terminal-Liste)
3. Je nach Status: öffnen, vordergrund, oder warnen

**Entscheidungsmatrix:**

| Lock-File | Terminal | Aktion |
|-----------|----------|--------|
| ❌ | ❌ | **Neu starten** — `createTerminal()` + `copilot --resume=<uuid>` |
| ❌ | ✅ | **Warnung** "Terminal offen aber Session scheint nicht aktiv" → `terminal.show()` trotzdem |
| ✅ | ❌ | **Warnung** "Session läuft extern (PID xyz). Trotzdem hier öffnen?" → bei Bestätigung `createTerminal()` (Copilot warnt intern nochmal) |
| ✅ | ✅ | **Vordergrund** — `terminal.show()` |

**Lock-File Pfad:** `~/.copilot/session-state/<uuid>/inuse.<PID>.lock`

### Play-Button (`sendMessages`)

Wenn Ziel-Session ein offenes Terminal ist:
- `terminal.sendText("Du hast N neue Nachrichten. Lies sie mit jarvis_readMessage (destination: \"<name>\") bis remaining = 0.\r", false)`
- Kein Fokus-Wechsel, kein UI-Interrupt
- Messages bleiben in der Queue — Agent entscheidet selbst wann/wie er sie liest


---

## 2026-05-23 — Custom Agent als Chat Mode + Architecture Review

### Finding: workbench.action.chat.open { mode } akzeptiert Custom-Agent-Namen
`.github/agents/<name>.agent.md` ohne explizites `name:` Frontmatter → Mode = Dateiname ohne `.agent.md`. Validiert per Spike auf `experiment/agent-mode-spike` (commit `acd46bb`). Funktioniert produktiv, kein proposed API nötig.

### Decision: Agent-Binding pro Entity über `agent`-Feld in YAML
`session.yaml` `agent: <mode>` wird beim Öffnen an `workbench.action.chat.open` durchgereicht. Schema + UI-Picker + `jarvis_createSession`-Tool-Param implementiert. „No agent" als explizite Option vorhanden.

### Finding: Architecture Review erstellt — 11 Findings (F1–F11)
Dokument: `.jarvis/sessions/Research/architecture-review-2026-05.md`. Top 3 nach Priorität:
- **F5** — Frontend/Core-Trennung, unifizierte `findEntity` / `createEntity` / `openEntity` für alle 3 Kinds (Sessions ist Testballon, F5 generalisiert auf Events + Projects)
- **F11** — `extension.ts` ist 2484 Zeilen → Modularisierung in `features/<x>/index.ts`-Struktur
- **F1** — Heartbeat wird Polling-Bus für alles; System-Jobs von User-Jobs trennen

### Next: Tech-Debt-Abbau in den nächsten Tagen
CRs werden einzeln aus dem Review-Doc abgeleitet und an PM gegeben. Reihenfolge nach Prio-Tabelle im Review. Produktive Umsetzung läuft über `syspilot.cm` — Research liefert nur Findings.

### Decision: Copilot Memory für Workflow-Wissen disabled (global User Settings)
`github.copilot.chat.tools.memory.enabled: false`, `github.copilot.chat.copilotMemory.enabled: false`. Begründung in `.github/copilot-instructions.md` (Memory Considerations Section): Workflow-Wissen = Code, gehört ins Repository, nicht in Copilots opaken AppData-Storage.

---

## 2026-07-28 — Spike: Message-Delivery kam nicht mehr an (Branch `research-message-delivery-noop`)

### Finding: Ursache war ein leeres `jarvis.messages.notificationTemplate`, nicht `chat.open`
Leerer Wert in den **User**-Settings → `applyTemplate` liefert `''` → `if (text)` in `injectPrompt` ueberspringt Schritt 4 → keine Injektion, kein Fehler — und die Auto-Delivery markiert die Nachricht danach trotzdem als `notified: true`. Nachricht verloren. A/B live belegt: leer → kein `step4`; 181 bzw. 192 Zeichen → Zustellung inkl. `UserPromptSubmit`.

### Finding: CR #54 war unschuldig; der Verdacht kam von einer Asymmetrie
Der Init-Prompt hat einen eingebauten Fallback (`DEFAULT_INIT_PROMPT`), das Notification-Template nicht — obwohl seine Settings-Beschreibung einen verspricht. Neue Sessions bekamen darum den Init-Prompt und wirkten funktionsfaehig, nur Bestandssessions taten nichts. Das lenkte den Verdacht auf den Bestandssession-Pfad.

### Finding: Der deklarierte Default greift; der leere Wert kam aus der Settings-UI
Mit geloeschtem Eintrag liefert die Konfiguration 192 Zeichen — frische Installationen sind nicht betroffen. Die Settings-UI schreibt beim Bearbeiten den Wert explizit in `settings.json`; Leeren des Feldes hinterlaesst `""`, nur das Zahnrad → „Reset Setting" entfernt den Eintrag. Nebenbefund: materialisierte Defaults altern still — zwei Profile tragen bis heute die Fassung mit dem deaktivierten `jarvis_readMessage`.

### Lesson: „Still erfolgreich" ist die gefaehrlichste Fehlerklasse
Gleiche Klasse wie der `whoAmI`-Defekt (#51): es scheitert plausibel statt laut. Regel fuer Zustellketten — jeder Schritt, der nichts tun kann, muss entweder etwas tun oder Fehlschlag melden, und die Queue darf erst nach bestaetigter Zustellung mutiert werden.

### Lesson: Bundle-Analyse liefert Fakten, nicht Schlussfolgerungen
Meine `chat.open`-Theorie war statisch gut belegt und trotzdem falsch. Erst Laufzeitexperimente haben diskriminiert; einziges belastbares Signal war der Hook `UserPromptSubmit` mit Session-UUID. API-Details in `chat-injection-findings-2026-07.md`.
