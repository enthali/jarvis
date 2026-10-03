# Jarvis Recorder

Records a meeting from your microphone and your computer's speaker output (the other participants of an online meeting), recognises the speech on your computer, and writes the transcript into the Actor's folder. When the transcript is complete the Actor is told.

**Windows only.** On other platforms a recording does not start and the notice names the platform.

## Use

1. Set `jarvis.recording.enabled` to `true`.
2. Hover an Actor in the ACTORS view and click the circle, or run **Jarvis: Start Recording** from the Command Palette and pick the Actor.
3. A transcript view opens next to your work and shows the text as it grows, with Actor, elapsed time and word count. A red circle marks the Actor and the StatusBar.
4. End the recording with **End recording** in the transcript view. Clicking the StatusBar item or the Actor's hover action only brings the view back; closing the view asks whether to end the recording.

The transcript is `<Actor folder>/transcripts/YYYY-MM-DD_HHmmss.txt` with a `[HH:MM]` mark about every minute. No audio is stored. Jarvis does not put transcripts under version control. German and English are recognised without choosing a language; the engine may add tags such as `<de-DE>` to the text, which you or the Actor can ignore.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.recording.enabled` | `false` | Offers the start action on the Actors and the **Jarvis: Start Recording** command. Switching it off does not touch a recording that is already running. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
- Windows with **PowerShell 7 or newer** recommended (PowerShell 5.1 starts the audio helper as well, but is not verified).
- The speech model of **VS Code's own voice dictation** (the local model). Use the dictation once, or import the model with *Chat: Install Dictation Model from Local Package...*. The recorder reads the model from that cache and never downloads or copies it. It does not work when you have chosen a cloud model for dictation instead of the local one, or have never obtained the local model.
- Internet access on the first start: the speech runtime (about 230 MB download, about 40 MB on disk) is fetched once from the npm and NuGet registries, checked against pinned SHA-512 values and kept in the extension's storage. Nothing of it is part of the extension package.

## Privacy

Recognition runs on your computer in a separate process; audio never leaves it and is never written to disk. The log shows the word count, never the text. The speech runtime's usage telemetry is switched off (it may still send a minimal process-info event).

## Known limits

- An end is an end: if recognition or capture breaks down, the recording ends, the text so far stays in the file, and the Actor is told. Start a new recording to continue.
- If only one audio source can be captured you get a warning naming the missing one and the recording continues with the other.
- When VS Code closes or reloads, a running recording ends at once without waiting for further recognition: the text received so far is saved, but the transcript may lack its last words and the Actor may not be notified.
- Whether the Actor reacts to the message at once depends on its delivery setting.
