# Jarvis Core

Jarvis Core (`enthali.jarvis-core`) is the harness: it turns chat sessions and agent personas into actors and provides messaging, reminders, the heartbeat scheduler, and the engine that the other packages build on. Requires VS Code 1.95.0 or later.

## Actors

An actor is a persistent persona with its own `context.md` memory and agent file. Actors are folders with an `actor.yaml` file; the ACTORS view shows direct child folders only, nested folders are not scanned. Jarvis creates or repairs the agent file with the actor name and memory path when needed. To move or remove an actor, use the file system; there is no Jarvis archive feature.

`jarvis_listActors()` returns Actor names and short descriptions from the workspace's `actor.yaml` files.

### Actor chats

Jarvis uses VS Code's Agent Host for Actor chats. Click an Actor in ACTORS or choose **Open** to find its chat or create one. An existing editor tab is reused; otherwise the chat opens as a pinned tab in the first editor group. Clicking an Actor group in Messages or a node in Message Flow opens an existing chat only. Delivering a message never opens a tab or takes focus.

In the Agents window, enable **Created In > jarvis-core** in the session filter to show chats created by Jarvis. **Mark done** archives a chat and makes it read-only; Jarvis restores it when opening it or delivering an announcement. Only **Delete** removes the chat. A workspace below a repository root can appear as **Worktree** without a Git worktree having been created.

The ACTORS view takes activity from the Agent Host: a red circle with a cross means Error, a blue question mark means Waiting, and an animated spinner means Working. Idle has no activity icon. Activity takes priority over the recording mark, which takes priority over the mail icon. A failed turn stays in Error until the next turn; cancelling a turn returns to Idle.

## Messaging

Actors pass messages through a persistent inbox. An announcement tells the receiving Actor how many messages wait; their content is returned only by `jarvis_receiveMessage()`, not inserted as a prompt. Enable **Direct Delivery** for automatic announcements, or use the play action in Messages to announce waiting messages manually. A missing Actor chat is created for delivery. Without an Agent Host connection, announcements wait; opening a chat shows an information message instead of falling back to the old chat UI. With logging enabled, every queued message is also appended to `.jarvis/message-log.json`.

The Agent Host client provides these tools to Actor chats and approves calls addressed to its own tools:

| Tool call | Result |
|-----------|--------|
| `jarvis_sendMessage(session, text)` | Queue a message for the named Actor. The caller's Actor is the sender; there is no `senderSession` input. |
| `jarvis_receiveMessage()` | Return and remove the oldest message from the calling Actor's inbox, with sender, time and `remaining`. Call until `remaining` is `0`; there is no `destination` input. |
| `jarvis_listActors()` | List workspace Actors with names and short descriptions. |
| `jarvis_createActorSession(actor)` | Find or create the named Actor's chat and return its session address. |

The sender and inbox are bound to the calling Actor chat, not supplied by the model. The client serves the window's first workspace folder; routing to other workspaces and using the same workspace in two windows are not supported by this MVP. These four tools are not exposed through MCP.

## Reminders

Set cron-based or one-off reminders that appear as VS Code notifications.

## Heartbeat

Cron-based background jobs that run scripts (Python, PowerShell), VS Code commands, or single-shot language-model agent steps, with a live status view in the activity bar. Each agent step names both `vendor` and `model` (the model ID); there is no default or fallback. Use **Jarvis: List Language Models** or `jarvis_listModels` to see the pairs VS Code currently offers.

## Language model tools

Extension tools retain package-prefixed chat references, such as `#jarvis_core_listModels`, `#jarvis_core_createActor`, and `#jarvis_core_listJobs`. They are separate from the four Agent Host tools above. Installed packages add their own tools, for example `#jarvis_kanban_listKanbanItems`. These module tools reach an Actor chat only while it is open in a window running Jarvis.

Core, Kanban, PIM and Syspilot declare Agents window support, but module tools and views or webviews there have not been verified live. Use an editor window running Jarvis for the documented module-tool path.

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
| `jarvis.heartbeat.enabled` | `true` | Enable the heartbeat scheduler. |
| `jarvis.heartbeatInterval` | `60` | Heartbeat scheduler tick interval in seconds. |
| `jarvis.scanInterval` | `2` | Background rescan interval in minutes (0 = disabled). |
| `jarvis.reminders.enabled` | `true` | Enable reminders. |
| `jarvis.gitignore.autoManage` | `true` | Maintain a marked region in the workspace `.gitignore` listing Jarvis transient runtime paths. Set to `false` to remove the region. |
| `jarvis.hooks.autoInstall` | `true` | Install hook bridge files in `.github/hooks/`. Set to `false` to remove managed files and stop hook management. |
| `jarvis.checkForUpdates` | `true` | Check GitHub for new Jarvis releases when the extension activates. |
| `jarvis.releaseNotes.showOnUpdate` | `true` | Open the release notes the first time a newly installed Jarvis version runs. **Jarvis: Show Release Notes** works regardless. |
| `jarvis.touchedFiles.windowDays` | `0` | Rolling window in days; only files touched within it appear in Recently Touched Files (0 = no limit). |
