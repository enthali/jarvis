# Change Document: session-recording-ui

**Status**: approved
**Branch**: feature/session-recording-ui
**Created**: 2026-04-15
**Author**: Project Manager

---

## Summary

VS Code UI für Session Recording: Settings, Record-Button im Tree, StatusBar-Timer, Subprocess-Management für `recorder.py`.
Design-Referenz: `projects/project-manager/recording-design.md`.

---

## Level 0: User Stories

**Status**: ✅ abgestimmt

### Neue User Stories

| ID | User Story | Priorität |
|----|-----------|----------|
| `US_REC_CAPTURE` | Als Jarvis-Nutzer möchte ich ein Meeting mit einem Klick aufnehmen und stoppen können, damit die Audio-Datei für die spätere Transkription bereitsteht. | mandatory |
| `US_REC_ENABLE` | Als Jarvis-Nutzer möchte ich das Recording-Feature ein- und ausschalten können (default: aus), damit es nur aktiv ist wenn ich es bewusst aktiviert habe. | mandatory |
| `US_REC_CONFIG` | Als Jarvis-Nutzer möchte ich den Pfad zum Whisper-Projekt konfigurieren können, damit Jarvis weiß wo `recorder.py` und die `input/`-Ordner liegen. | mandatory |

### Entscheidungen

- D-0-1: Theme `REC` — eigenes Theme, unidirektionale Abhängigkeit (`REC` → `jarvis_vse`), nie umgekehrt.
- D-0-2: Settings als eigenständige User Stories (`US_REC_ENABLE`, `US_REC_CONFIG`) — eigener User Value (Kontrolle, Konfigurierbarkeit), MECE zu `US_REC_CAPTURE`.
- D-0-3: Heartbeat-Watcher für `output/`-Polling ist explizit **out of scope** (separater Change `session-recording-watcher`).

---

## Level 1: Requirements

**Status**: ✅ abgestimmt

### Neue Requirements

| ID | Titel | Links |
|----|-------|-------|
| `REQ_REC_ENABLE` | Setting `jarvis.recording.enabled` in eigener Gruppe "Recording" (default: false) — schaltet das gesamte Feature ein/aus | `US_REC_ENABLE` |
| `REQ_REC_CONFIG` | Setting `jarvis.recording.whisperPath` in Gruppe "Recording" — Pfad zum Whisper-Projekt, muss beim Starten existieren | `US_REC_CONFIG` |
| `REQ_REC_BUTTON` | Inline-Action auf Projekt- und Event-Nodes: grau (idle), rot nur auf dem aktiv aufnehmenden Node; nur sichtbar wenn Feature enabled | `US_REC_CAPTURE`, `US_REC_ENABLE` |
| `REQ_REC_STATUSBAR` | StatusBar-Item mit `🔴` + Projektname + Laufzeit-Timer während Aufnahme; Klick stoppt Aufnahme | `US_REC_CAPTURE` |
| `REQ_REC_SUBPROCESS` | Start/Stop von `recorder.py` als Subprocess; State persistent in `.recording.json`; graceful shutdown bei Extension-Deactivate | `US_REC_CAPTURE`, `US_REC_CONFIG` |

---

## Level 2: Design

**Status**: ✅ abgestimmt

### Neue Design-Elemente

| ID | Beschreibung | Links |
|----|-------------|-------|
| `SPEC_REC_SETTINGS` | `package.json`: Gruppe "Recording" (eigene Gruppe, nicht unter PIM). Contributions: `jarvis.recording.enabled` (boolean, default `false`), `jarvis.recording.whisperPath` (string, default `""`). | `REQ_REC_ENABLE`, `REQ_REC_CONFIG` |
| `SPEC_REC_BUTTON` | `package.json` menu contributions für `jarvisProject` und `jarvisEvent` context values: command `jarvis.startRecording` (Icon `circle-outline`, grau) wenn Node nicht aktiv aufnimmt; command `jarvis.stopRecording` (Icon `circle-filled` + `charts.red`) wenn `RecordingManager.currentProject === node.name`. When-clause: `jarvis.recording.enabled == true`. Commands einmalig in `extension.ts` registriert — Logik in `RecordingManager`. | `REQ_REC_BUTTON`, `REQ_REC_ENABLE` |
| `SPEC_REC_STATUSBAR` | `vscode.window.createStatusBarItem(Right, 10)`. Text: `🔴 <name> — MM:SS` (Elapsed via `setInterval` 1s). Command: `jarvis.stopRecording`. Nur sichtbar während Aufnahme läuft (`show()`/`hide()`). | `REQ_REC_STATUSBAR` |
| `SPEC_REC_SUBPROCESS` | Neue Datei `src/recording.ts` — Klasse `RecordingManager`. `start(name)`: Guard (enabled + whisperPath exists + Python verfügbar + nicht bereits am Laufen), `child_process.spawn("python", [recorder.py, "--project", name, "--output", input/])`, schreibt `whisperPath/.recording.json: { project, pid, startTime }`. `stop()`: schreibt `whisperPath/.stop`, wartet 500 ms, löscht `.recording.json`. `currentProject` getter. `deactivate()` → ruft `stop()` falls aktiv. Registriert im `deactivate()`-Hook von `extension.ts`. | `REQ_REC_SUBPROCESS`, `REQ_REC_CONFIG` |

### Entscheidungen

- D-2-1: `RecordingManager` in eigener Datei `src/recording.ts` — Subprocess-Logik isoliert von `extension.ts`.
- D-2-2: `.recording.json` und `.stop` liegen in `whisperPath` (nicht in Extension-Storage) — `recorder.py` kann ebenfalls darauf zugreifen.
- D-2-3: Stop via `.stop`-Sentinel-File statt `process.kill` — graceful buffer flush in `recorder.py`.
- D-2-4: Commands `jarvis.startRecording`/`jarvis.stopRecording` **einmal** in `extension.ts` registriert; `package.json` hat je einen menu-Eintrag für `jarvisProject` und `jarvisEvent` — keine Logik-Duplizierung.
- D-2-5: Python nicht verfügbar → `vscode.window.showErrorMessage`, kein State geschrieben, kein Crash.
