# Jarvis Recorder

Jarvis Recorder — session recording, Whisper transcription pipeline, and transcript notifications.

Adds **Start/Stop Recording** buttons to Project and Event nodes in the Jarvis Explorer. Recordings are handed off to a local Whisper pipeline for transcription; a notification is shown when a transcript is ready.

## Configuration

| Setting | Default | Description |
|---------|---------|--------------|
| `jarvis.recording.enabled` | `false` | Enable the Session Recording feature. When true, Start/Stop Recording buttons appear on Project and Event nodes. |
| `jarvis.recording.whisperPath` | `""` | Absolute path to the Whisper project folder containing `recorder.py` and the `input/` subfolder. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
- A local Whisper installation, pointed to via `jarvis.recording.whisperPath`.
