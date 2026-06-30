# FIND-2026-04-17 — Experiments: VS Code Terminal Inject + node-pty

**Datum:** 2026-04-17  
**Ausgangslage:** Finding 7 (Ping-Problem). Welcher Inject-Mechanismus funktioniert tatsächlich für Copilot CLI?

---

## Experiment 1 — `WriteConsoleInput` (Win32 AttachConsole) ❌/✅

**Setup:** Win32-API-Chain: `FreeConsole()` → `AttachConsole(target-pid)` → `CreateFile("CONIN$")` → `WriteConsoleInput(records)`

| Target | Ergebnis |
|--------|---------|
| conhost-basierte `pwsh` | ✅ funktioniert |
| Windows Terminal `pwsh` (ConPTY) | ✅ funktioniert |
| **Copilot CLI TUI** | ❌ Events landen im Buffer, Copilot liest da nicht — nutzt Node's Raw-Mode stdin (PTY-Pipe) |

**Stolperfallen:**
- PS 5.1: `[uint32]0x80000000` nicht castbar → dezimal/long nutzen
- `[ushort]` → `[uint16]`
- CR muss `VirtualKeyCode=0x0D` **und** `VirtualScanCode=0x1C` haben, sonst rendert PSReadLine falsches Zeichen
- Nach `FreeConsole` + `AttachConsole(target)` + `FreeConsole` klappt Injector-Shell zu → `Start-Job` als Workaround

---

## Experiment 2 — `node-pty` PTY-Wrapper ✅ Durchbruch

**Setup:** Node.js-Wrapper startet `copilot.exe` als Child in einer von ihm kontrollierten ConPTY. User-Tastatur 1:1 durchgereicht, Copilot-Output an User-stdout. Wrapper schreibt nach Pattern-Erkennung Text in den PTY-Master.

```js
const pty = require('node-pty');
const ptyProc = pty.spawn('copilot.exe', [], { name: 'xterm-256color', cols, rows, env });
ptyProc.onData(d => process.stdout.write(d));
process.stdin.on('data', d => ptyProc.write(d));
setTimeout(() => ptyProc.write('hallo\r'), 5000);
```

**Test-Ergebnis:**
1. Copilot TUI startete normal im Wrapper ✅
2. Trust-Prompt wurde vom User bestätigt ✅
3. Nach `"Ask me anything"` Pattern wurde Inject ausgeführt ✅
4. Copilot sah Zeile als echten Prompt-Input ✅
5. Copilot antwortete normal ✅

**Schönheitsfehler:** `/ commands · ? help` Hinweiszeile erscheint doppelt nach Inject — vermutlich Redraw-Sync (`\r` vs `\r\n`). Kein funktionales Problem.

**Bewiesene Eigenschaften:**
- PTY-Master-Write für Copilot **ununterscheidbar** von echter User-Tastatur
- Keine "Automation detection"
- User kann weiterhin von Hand tippen
- `node-pty` auf Windows nutzt automatisch **ConPTY** (Windows 10+) — keine speziellen Build Tools nötig

---

## Phase-1 Architektur (nach Experiment 2)

```
┌──────────────────┐    Message Queue     ┌─────────────────────┐
│  Jarvis          │ ─── Play-Button ───→ │  jarvis-wrapper.js  │
│  (VS Code Ext.)  │                      │  (node-pty host)    │
│                  │                      │   └─► copilot.exe   │
│                  │    Named Pipe        │       (in PTY)       │
│                  │ ─── "ping/inbox" ──→ │   PTY-Write          │
│                  │ ← MCP sendToSession ─│   Copilot → MCP     │
└──────────────────┘                      └─────────────────────┘
```

**Bewiesene Bausteine:**
- ✅ CLI-Session per `-p` / `--resume=<uuid>` starten
- ✅ Sessions erscheinen in VS Code Sidebar (shared `session-store.db`)
- ✅ MCP-Brücke: CLI → Jarvis
- ✅ Text-Inject via node-pty
- ✅ Verschiedene Rendering-Modi

---

## Experiment 3 — VS Code Terminal Inject ✅ (einfachste Lösung)

**Key Finding:** `terminal.sendText(text + '\r', false)` funktioniert direkt aus der Extension.

### Session-State Filesystem
Jede CLI-Session erzeugt `~/.copilot/session-state/<uuid>/`:
- `workspace.yaml` — id, cwd, git_root, repository, branch, **summary**
- `inuse.<PID>.lock` — aktive Session-Erkennung
- `events.jsonl` — Event-Log
- `checkpoints/`, `rewind-snapshots/` — Checkpointing

### Terminal.sendText Varianten

| Variante | Code | Submit? |
|----------|------|---------|
| A | `sendText(text, true)` — default `\n` | ❌ |
| **B** | **`sendText(text + '\r', false)` — CR only** | **✅** |
| C | `sendText(text + '\n', false)` — LF only | ❌ |
| D | `sendText(text + '\r\n', false)` — CRLF | ✅ |
| E | `sendText(text, false)` + `sendSequence(\r)` | ✅ (braucht Fokus) |

**Variante B ist die sauberste Lösung.** Ein Write, kein Fokus-Wechsel, kein Extra-Newline.

### Konsequenz: node-pty Wrapper nicht nötig für VS Code

Die VS Code Extension **ist** der PTY-Host. `terminal.sendText()` = `ptyProc.write()`. Architektur vereinfacht sich erheblich.

### Weitere Findings aus Experiment 3

| Finding | Detail |
|---------|--------|
| **Trust-Prompt entfällt** | CLI in VS Code Terminal → kein Trust-Prompt. Readiness-Detection vereinfacht. |
| **`/remote` möglich** | `--remote` Flag → Session von GitHub Web steuerbar. |
| **`/rename` per Inject** | `/rename Neuer Name\r` funktioniert → Extension kann Sessions beim Create umbenennen. |
| **UUID-Management** | `copilot --resume=<selbst-uuid>` startet neue Session mit vorgegebener UUID. Kein nachträgliches Auslesen nötig. |

### Session-Lifecycle Snippet

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

### Output-Problem
Terminal-API hat **kein** `onData` (stable). Lösung: **MCP als Rückkanal** — Agenten antworten via `jarvis_sendToSession`.

---

## Experiment 4 — CLI + Chat View parallel ❌

**Frage:** Kann man dieselbe Session gleichzeitig als CLI-Terminal und in der Chat View nutzen?

**Ergebnis:** Nein. Chat View und CLI haben **getrennte Laufzeit-Prozesse** — `session-store.db` ist nur Persistenz, kein Live-Kanal. Gleichzeitiges Schreiben = Konflikt.

- ✅ Chat View kann vergangene Turns **lesen** (Viewer-Funktion)
- ❌ Chat View kann nicht in eine **laufende** CLI-Session reinschreiben

---

## Finale Architektur (nach allen Experimenten)

```
┌──────────────────┐                      ┌─────────────────────┐
│  Jarvis          │   createTerminal()   │  VS Code Terminal   │
│  (VS Code Ext.)  │ ──────────────────→  │   └─► copilot.exe  │
│                  │                      │       (in PTY)      │
│                  │   sendText()+'\r'    │                     │
│                  │ ──── prompt ───────→ │   TUI Input         │
│                  │ ← MCP sendToSession ─│   Copilot → MCP     │
└──────────────────┘                      └─────────────────────┘
```

**Kein Wrapper, keine Named Pipe, kein Extra-Prozess.** Alles nativ über VS Code APIs.

### Minimal-API die Jarvis braucht

| Funktion | Implementierung |
|---------|----------------|
| `createCopilotTerminal(name, uuid?, model?)` | `createTerminal()` + `--resume=<uuid>` |
| `sendToTerminal(nameOrUuid, text)` | `terminal.sendText(text + '\r', false)` |
| `resumeTerminal(uuid)` | `createTerminal` mit `--resume=<uuid>` |
| MCP-Rückkanal | bereits vorhanden (`jarvis_sendToSession`) |

### Offene Fragen (Stand 2026-04-17)

1. **Readiness-Detection:** Wann ist die TUI bereit? (`inuse.<PID>.lock`? Timeout? MCP-ready-signal?)
2. **Error-Detection:** Wie erkennt Jarvis einen Crash eines Agent-Terminals?
3. **Parallele Agenten:** Wie viele CLI-Sessions gleichzeitig? (API-Rate-Limits?)
