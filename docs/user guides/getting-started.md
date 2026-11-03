# Getting Started

Jarvis turns chat sessions into **actors**: persistent entities with their own memory, messaging, and scheduling. This page takes you from installation to your first actor.

## 1. Install

Install **Jarvis Core** (`enthali.jarvis-core`) from the VS Code Marketplace, or install the `.vsix` from [GitHub Releases](https://github.com/enthali/Jarvis/releases) with **Extensions → ... → Install from VSIX...**. VS Code 1.95.0 or later is required.

The other packages are optional add-ons that need Jarvis Core. Install only what you need; see the [Core guide](core.md) for the list.

Actor chats also require an available VS Code Agent Host and an authenticated agent. Jarvis no longer uses the old chat UI as a fallback. The Agent Host path has been exercised on Windows with VS Code 1.143.1 and, for clean Actor startup, 1.144.0; the manifest's minimum version alone does not establish Agent Host compatibility.

### Updating to the Agent Host path

Before the next release, update existing project-owned prompts, skills and agent instructions:

| Former call or reference | Current call or action |
|--------------------------|------------------------|
| `jarvis_sendMessage(session, text, senderSession)` / `#jarvis_core_sendMessage` | `jarvis_sendMessage(session, text)`; `session` names the recipient Actor. The calling Actor chat supplies the sender. |
| `jarvis_receiveMessage(destination)` / `#jarvis_core_receiveMessage` | `jarvis_receiveMessage()`; only the calling Actor's inbox is accessible. Repeat until `remaining` is `0`. |
| `#jarvis_core_listActors` | `jarvis_listActors()`; returns Actor names and short descriptions, not `actor.yaml` path IDs. |
| `jarvis_listChatSessions` / `#jarvis_core_listChatSessions` | No general session-list tool. Use `jarvis_listActors()` for Actors or the Agents window for chats. |
| `jarvis_readMessage`, `jarvis_sendToSession` | Removed; use `jarvis_receiveMessage()` and `jarvis_sendMessage(session, text)`. |
| `jarvis_injectPrompt` / `#jarvis_core_injectPrompt` / **Jarvis: Inject Prompt** | Removed without a general prompt-injection replacement. Open the Actor chat to interact directly. |
| `jarvis.messages.notificationTemplate` | Removed; inbox announcements use fixed text. |

`jarvis_createActorSession(actor)` finds or creates an Actor chat and returns its session address. These four Agent Host tools are not MCP tools. External scripts that previously woke an Actor through MCP messaging must move that work to a heartbeat step. Reminders and heartbeat message steps still write to the inbox.

With `jarvis.actor.autoProvision` enabled, provisioning refreshes the bundled Actor instructions; owners must update hand-maintained copies themselves. The package-prefixed references of other extension tools, such as `#jarvis_core_createActor` and `#jarvis_pim_task`, remain in use.

### Updating from a hook-based version

Jarvis no longer uses agent hooks or requires an external `node` command for Actor tool calls. The hook-based **Recently Touched Files** category and its diff/remove/cleanup actions are removed without replacement; Actor activity still comes from the Agent Host.

On activation, Jarvis cleans up its five known legacy files in `.github/hooks/` of the first workspace folder without an opt-in. Automatic cleanup covers only that folder and can fail. If any remain in a project, including another workspace folder, remove only `jarvis-hooks.json`, `jarvis-bridge.mjs`, `jarvis-port`, `bridge.mjs`, and `port` by hand from that project's `.github/hooks/`; keep the directory and all other files. Removal failures are logged and retried on the next activation. The old `.jarvis/state/touched-files/` data is retained but no longer used. Existing `jarvis.hooks.autoInstall` and `jarvis.touchedFiles.windowDays` settings have no effect. See the [Core guide](core.md) for the cleanup details.

The MCP server is disabled by default, including after an upgrade when no explicit `jarvis.mcp.enabled` value is stored. To use it, set `jarvis.mcp.enabled` to `true`. Existing explicit `true` or `false` values still apply; see the [MCP guide](mcp.md).

### Updating to 0.31.1

Update tool references in existing prompts to `#jarvis_<package>_<reference>`,
for example `#jarvis_core_createActor`, `#jarvis_pim_task`, and
`#jarvis_pim_category`. The former unprefixed references no longer resolve.
That release left registered tool IDs and MCP tool names unchanged; the later Agent Host migration above changes the messaging interface.

## 2. Open Jarvis

Open the Jarvis view in the activity bar. Jarvis scans its folders and fills the views automatically.

## 3. Check where actors live

Actors are folders with an `actor.yaml` file. New actors are created in `.jarvis/actors` in your workspace. To use another folder, change `jarvis.actors.folder` under **Settings → Extensions → Jarvis**. Only direct child folders that contain an `actor.yaml` appear in the ACTORS view.

## 4. Create your first actor

Click **+** in the ACTORS view title bar or use the `#jarvis_core_createActor` tool in chat. Jarvis creates the actor folder with its `actor.yaml` and `context.md` memory file and opens the Actor's Agent Host chat; `jarvis.actors.openSessionOnCreate` controls the last step. Click an existing Actor or choose **Open** to find its chat or create one.

In the Agents window, tick **Created In > jarvis-core** to include Jarvis-created chats. **Mark done** archives a chat and makes it read-only; Jarvis restores it on opening or message delivery. Only **Delete** removes it. A workspace in a repository subfolder may be labelled **Worktree** without creating a Git worktree.

For module tools such as `#jarvis_core_listJobs` or `#jarvis_kanban_listKanbanItems`, keep the Actor chat open in an editor window running Jarvis. Their availability, and the Jarvis views or webviews, in the Agents window remain unverified. See the [Core guide](core.md) for delivery controls, activity icons and workspace limits.

## Where to go next

Each package has its own guide:

- [Core](core.md) — actors, messaging, reminders, heartbeat
- [PIM](pim.md) — Outlook categories and tasks
- [Recorder](recorder.md) — meeting recording and transcripts
- [MCP](mcp.md) — Jarvis tools for external MCP clients
- [Message Flow](flow.md) — message traffic visualization
- [Kanban](kanban.md) — kanban boards for actors
- [Syspilot](syspilot.md) — syspilot install and update hand-off
- [Migration Shim](core-gh.md) — deprecated package
