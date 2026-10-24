# Jarvis Core

Jarvis Core (`enthali.jarvis-core`) is the harness: it turns chat sessions and agent personas into actors and provides messaging, reminders, the heartbeat scheduler, and the engine that the other packages build on. Requires VS Code 1.95.0 or later.

## Actors

An actor is a persistent persona with its own `context.md` memory and agent file. Actors are folders with an `actor.yaml` file; the ACTORS view shows direct child folders only, nested folders are not scanned. Jarvis creates or repairs the agent file with the actor name and memory path when needed. To move or remove an actor, use the file system; there is no Jarvis archive feature.

`jarvis_listActors` returns the absolute `actor.yaml` path as `id`.

## Messaging

Actors and sessions pass messages through a queue. The receiving session is notified and reads its messages with `jarvis_receiveMessage`. With logging enabled, every queued message is also appended to `.jarvis/message-log.json`.

## Reminders

Set cron-based or one-off reminders that appear as VS Code notifications.

## Heartbeat

Cron-based background jobs that run scripts (Python, PowerShell), VS Code commands, or single-shot language-model agent steps, with a live status view in the activity bar. Each agent step names both `vendor` and `model` (the model ID); there is no default or fallback. Use **Jarvis: List Language Models** or `jarvis_listModels` to see the pairs VS Code currently offers.

## Prompt injection

Send text or a slash command (for example `/compact`) to a named actor's session with the `jarvis_injectPrompt` tool or the **Jarvis: Inject Prompt** command. Jarvis starts the session if none exists.

## Language model tools

Core provides tools such as `#listActors`, `#listModels`, `#sendMessage`, `#receiveMessage`, `#createActor`, and `#injectPrompt`. Installed packages add their own tools.

## Add-ons

| Package | Purpose |
|---------|---------|
| [PIM](pim.md) | Outlook categories and tasks |
| [Recorder](recorder.md) | Meeting recording with local speech recognition |
| [MCP](mcp.md) | Jarvis tools for external MCP clients |
| [Message Flow](flow.md) | Visualization of message traffic |
| [Kanban](kanban.md) | Kanban boards for actors |
| [Syspilot](syspilot.md) | syspilot install and update hand-off |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.actors.folder` | `.jarvis/actors` | Workspace-relative or absolute folder containing new actor folders. |
| `jarvis.actors.openSessionOnCreate` | `true` | Open the new actor's chat right after creating it. Turn off to keep your current chat in focus, for example when creating several actors in a row. |
| `jarvis.actor.autoProvision` | `false` | Provision the bundled actor instruction files into the workspace on activation. Enable in workspaces that use Jarvis actors; set back to `false` to remove them. |
| `jarvis.agentSession.initPromptTemplate` | built-in prompt | Template for the initialization prompt sent to a new agent chat session. Leave empty to use the built-in default. |
| `jarvis.messages.enabled` | `true` | Enable the Messages feature. |
| `jarvis.messages.logging` | `true` | Append every queued message to `.jarvis/message-log.json`. |
| `jarvis.messages.notificationTemplate` | built-in text | Template for the notification a session receives when messages arrive. Placeholders: `${count}`, `${destination}`, `${sender}`. If empty, the built-in English default is used. |
| `jarvis.heartbeat.enabled` | `true` | Enable the heartbeat scheduler. |
| `jarvis.heartbeatInterval` | `60` | Heartbeat scheduler tick interval in seconds. |
| `jarvis.scanInterval` | `2` | Background rescan interval in minutes (0 = disabled). |
| `jarvis.reminders.enabled` | `true` | Enable reminders. |
| `jarvis.gitignore.autoManage` | `true` | Maintain a marked region in the workspace `.gitignore` listing Jarvis transient runtime paths. Set to `false` to remove the region. |
| `jarvis.hooks.autoInstall` | `true` | Install hook bridge files in `.github/hooks/`. Set to `false` to remove managed files and stop hook management. |
| `jarvis.checkForUpdates` | `true` | Check GitHub for new Jarvis releases when the extension activates. |
| `jarvis.releaseNotes.showOnUpdate` | `true` | Open the release notes the first time a newly installed Jarvis version runs. **Jarvis: Show Release Notes** works regardless. |
| `jarvis.touchedFiles.windowDays` | `0` | Rolling window in days; only files touched within it appear in Recently Touched Files (0 = no limit). |
