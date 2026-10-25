# Jarvis Recorder

Jarvis Recorder (`enthali.jarvis-recorder`) records a meeting from your microphone and your computer's speaker output, recognises the speech on your computer, and writes the transcript into the actor's folder. When the transcript is complete, the actor is told. It requires [Jarvis Core](core.md).

**Windows only.** On other platforms a recording does not start and the notice names the platform.

## Record a meeting

1. Set `jarvis.recording.enabled` to `true`.
2. Hover an actor in the ACTORS view and click the circle, or run **Jarvis: Start Recording** from the Command Palette and pick the actor.
3. A transcript view opens next to your work and shows the text as it grows, with actor, elapsed time, and word count. A red circle marks the actor and the status bar.
4. End the recording with **End recording** in the transcript view. Clicking the status bar item or the actor's hover action only brings the view back; closing the view asks whether to end the recording.

The transcript is `<actor folder>/transcripts/YYYY-MM-DD_HHmmss.txt` with a `[HH:MM]` mark about every minute. No audio is stored. Jarvis does not put transcripts under version control. German and English are recognised without choosing a language; the engine may add tags such as `<de-DE>` to the text, which you or the actor can ignore.

## Requirements

- Windows with PowerShell 7 or newer recommended (PowerShell 5.1 starts the audio helper as well, but is not verified).
- The local speech model of VS Code's own voice dictation. Use the dictation once, or import the model with *Chat: Install Dictation Model from Local Package...*. The recorder reads the model from that cache and never downloads or copies it. It does not work with a cloud dictation model, or if you never obtained the local one.
- Internet access on the first start: the speech runtime (about 230 MB download, about 40 MB on disk) is fetched once from the npm and NuGet registries, checked against pinned SHA-512 values, and kept in the extension's storage.

## Privacy

Recognition runs on your computer in a separate process; audio never leaves it and is never written to disk. The log shows the word count, never the text. The speech runtime's usage telemetry is switched off, although it may still send a minimal process-info event.

## Known limits

- If recognition or capture breaks down, the recording ends, the text so far stays in the file, and the actor is told. Start a new recording to continue.
- If only one audio source can be captured, you get a warning naming the missing one and the recording continues with the other.
- When VS Code closes or reloads, a running recording ends at once. The text received so far is saved, but the transcript may lack its last words and the actor may not be notified.
- Whether the actor reacts to the message at once depends on its delivery setting.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.recording.enabled` | `false` | Offers the start action on the actors and the **Jarvis: Start Recording** command. Switching it off does not touch a recording that is already running. |
