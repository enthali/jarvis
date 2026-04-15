# Change Document: session-recording-watcher

**Status**: approved
**Branch**: feature/session-recording-watcher
**Created**: 2026-04-15
**Author**: Project Manager

---

## Summary

Adds a Heartbeat-driven transcript watcher to Jarvis. After `recorder.py` finishes and Whisper transcribes the audio, the watcher detects the `.txt` in `whisperPath/output/`, looks up the original project name from a sidecar JSON in `whisperPath/input/`, dispatches the transcript as a Message Queue entry to the project session, and deletes the sidecar as a processed handshake.

---

## Level 0: User Stories

**Status**: ✅ abgestimmt

### Neue User Stories

| ID | User Story | Priorität |
|----|-----------|----------|
| `US_REC_DISPATCH` | Als Jarvis-Nutzer möchte ich, dass fertige Transkripte automatisch an die zugehörige Projekt-Session weitergeleitet werden, damit Meeting Minutes ohne manuelle Schritte im richtigen Kontext erscheinen. | mandatory |

### Entscheidungen

- D-0-1: Keine eigene US für den Heartbeat-Job-Eintrag — das ist technisches Mittel, kein eigener User Value.
- D-0-2: `US_REC_ENABLE` + `US_REC_CONFIG` aus `session-recording-ui` gelten weiterhin — Watcher läuft nur wenn `recording.enabled == true` + `whisperPath` gesetzt.

---

## Level 1: Requirements

**Status**: ✅ abgestimmt

### Neue Requirements

| ID | Titel | Links |
|----|-------|-------|
| `REQ_REC_DISPATCH` | Watcher pollt `whisperPath/output/` nach neuen `.txt`-Dateien; für jede Datei mit zugehörigem Sidecar JSON wird der Transcript als Message an die Projekt-Session dispatcht | `US_REC_DISPATCH` |
| `REQ_REC_SIDECAR` | Beim Recording-Start wird `whisperPath/input/<recordingName>.json` mit `{ "project": "<originalName>" }` geschrieben; nach Dispatch wird die Datei gelöscht (Processed-Handshake) | `US_REC_DISPATCH`, `US_REC_CAPTURE` |
| `REQ_REC_WATCHERJOB` | `jarvis.checkTranscripts` Command wird als Heartbeat-Job registriert wenn `recording.enabled == true` + `whisperPath` gesetzt; deregistriert bei Disable | `US_REC_DISPATCH`, `US_REC_ENABLE` |

---

## Level 2: Design

**Status**: ✅ abgestimmt

### Neue Design-Elemente

| ID | Beschreibung | Links |
|----|-------------|-------|
| `SPEC_REC_SIDECAR` | `recording.ts` `start()`: nach Spawn zusätzlich `whisperPath/input/<recordingName>.json` schreiben: `{ project: "<originalName>" }`. Datei wird vom Watcher nach Dispatch gelöscht — kein eigenes Stop/Cleanup nötig. | `REQ_REC_SIDECAR` |
| `SPEC_REC_WATCHER` | Neuer Command `jarvis.checkTranscripts` in `extension.ts`: liest `whisperPath/output/*.txt`; für jede `.txt` prüft ob `whisperPath/input/<stem>.json` existiert; wenn ja: liest `project` aus JSON, liest Transcript-Text, ruft `messageQueue.appendMessage(project, text, "Whisper Watcher")` auf, löscht JSON. Wenn nein: skip (bereits verarbeitet). Guard: `recording.enabled == true` + `whisperPath` existiert. | `REQ_REC_DISPATCH`, `REQ_REC_SIDECAR` |
| `SPEC_REC_WATCHERJOB` | `syncTranscriptWatcherJob()` in `extension.ts` — analog zu `syncRescanJob()`: bei `recording.enabled == true` + `whisperPath` gesetzt → `heartbeat.registerJob("checkTranscripts", { command: "jarvis.checkTranscripts", cron: "<same as rescan>" })`; bei Disable → `heartbeat.unregisterJob("checkTranscripts")`. Aufgerufen beim Start und bei `onDidChangeConfiguration`. | `REQ_REC_WATCHERJOB` |

### Entscheidungen

- D-2-1: Sidecar JSON in `input/` (nicht `output/`) — liegt neben der `.wav`, nicht neben der `.txt`, vermeidet Konflikte mit Whisper-Output-Scans.
- D-2-2: JSON-Löschung = Processed-Flag — kein separates `.done` File nötig, sauberer Handshake.
- D-2-3: Dispatch via `messageQueue.appendMessage()` direkt — kein MCP-Roundtrip, wir sind im Extension-Host-Prozess.
- D-2-4: Cron-Frequenz des Watcher-Jobs = gleiche wie Rescan-Job (aus `jarvis.heartbeat.rescanCron` oder hardcoded `*/30 * * * * *`).
