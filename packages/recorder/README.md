# Jarvis Recorder

Jarvis Recorder — session recording, Whisper transcription pipeline, and transcript notifications.

Recordings are handed off to a local Whisper pipeline for transcription; a notification is shown when a transcript is ready.

## Configuration

| Setting | Default | Description |
|---------|---------|--------------|
| `jarvis.recording.enabled` | `false` | Enable session recording. |
| `jarvis.recording.whisperPath` | `""` | Absolute path to the Whisper project folder containing `recorder.py` and the `input/` subfolder. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
- A local Whisper installation, pointed to via `jarvis.recording.whisperPath`.
