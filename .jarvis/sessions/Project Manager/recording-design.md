# Session Recording — Design Notes

*Work in progress — Brainstorm, kein Change Request*

## User Story (Kern)

Als Jarvis-Nutzer möchte ich Meetings direkt aus VS Code aufnehmen und automatisch transkribieren lassen,
damit ich Meeting Minutes per LLM generieren kann — mit Projekt-Kontext.

## Pipeline (übernommen aus ProjectManager)

```
[VS Code Extension]                      [Extern / Docker]

🔴 Record Button (Projekt-Zeile)
  → spawnt recorder.py Subprocess
  → schreibt .wav nach whisperPath/input/
  → State: .recording.json

Stopp (StatusBar-Klick) → .stop File ──→ recorder.py stoppt

                              input/ProjektX_2026-04-15_1430.wav
                                         ↓
                              Whisper (Docker/Ollama) pollt input/ & transkribiert
                                         ↓
                              output/ProjektX_2026-04-15_1430.txt

Heartbeat-Watcher pollt output/ ←────
  → findet .txt ohne .done
  → sendToSession(ProjektX, transcript)
  → .txt → .done
```

## Komponenten

| Komponente | Wo | Details |
|------------|-----|---------|
| Record Start/Stop | VS Code Command + Tree-Button + StatusBar | UI-Integration |
| `recorder.py` | Lokal beim User (nicht shipped) | Audio-Capture via sounddevice/PyAudio, braucht Python-Env |
| Whisper | Docker (Ollama) | Bleibt extern, kein Dep in Extension |
| Watcher | Heartbeat Job (cron) | Pollt `output/` Ordner |
| Message Dispatch | `jarvis_sendToSession` | Transcript → Session → Skill `transcribe-meeting-minutes` |

## UI

### Tree-Integration (Projekt-Zeile)

- Record-Button als Inline-Action im Projekt-Node
- **Grau** = nicht am Aufnehmen
- **Rot** = Aufnahme läuft für dieses Projekt
- Klick auf grauen Button → startet Recording für dieses Projekt
- Klick auf roten Button → stoppt Recording

### StatusBar (während Aufnahme)

- Roter Punkt `🔴` + Projektname + Laufzeit: `🔴 Project: Foo — 12:34`
- Klick auf StatusBar-Item → stoppt Recording
- Nur sichtbar wenn Aufnahme läuft

### Recorder State

- `.recording.json` im recordings-Ordner: `{ project, pid, start_time }`
- `.stop` File als Signal zum Beenden (recorder.py pollt)
- Extension prüft beim Start ob ein stale `.recording.json` existiert (PID-Check)

## Settings

- `jarvis.recording.enabled` (boolean, default: **false**) — Master-Toggle, Feature off by default
- `jarvis.recording.whisperPath` (string, default: `""`) — Basispfad zum Whisper-Projekt

Convention innerhalb `whisperPath`:
```
C:\whisper\
  ├── recorder.py       ← Audio-Capture Script (gepflegt im Whisper-Projekt)
  ├── input\            ← .wav (Jarvis schreibt hier, Whisper liest)
  └── output\           ← .txt (Whisper schreibt hier, Jarvis-Watcher liest)
```

Jarvis sucht `recorder.py` in `whisperPath`, schreibt `.wav` nach `whisperPath/input/`, Heartbeat-Watcher pollt `whisperPath/output/`.

## Constraints

- Feature ist **default aus** — nur für User die recorder.py + Whisper/Docker lokal eingerichtet haben
- `recorder.py` wird **nicht** mit der Extension shipped — bleibt User-seitig
- Nur Windows (Audio-Capture-Libs sind OS-spezifisch)
- Kein Streaming — erst vollständige Aufnahme, dann Transkription

## Zukunft (nicht v1)

- **Kalender-Auto-Recording:** Wenn ein Kalendertermin einem Projekt/Event zugeordnet ist (via Kategorie), startet die Aufnahme automatisch bei Termin-Beginn und stoppt bei Termin-Ende.
- **Live-Transkription:** Streaming an Whisper während der Aufnahme (statt Post-Processing)
