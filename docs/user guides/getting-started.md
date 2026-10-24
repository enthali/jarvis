# Getting Started

Jarvis turns chat sessions into **actors**: persistent entities with their own memory, messaging, and scheduling. This page takes you from installation to your first actor.

## 1. Install

Install **Jarvis Core** (`enthali.jarvis-core`) from the VS Code Marketplace, or install the `.vsix` from [GitHub Releases](https://github.com/enthali/Jarvis/releases) with **Extensions → ... → Install from VSIX...**. VS Code 1.95.0 or later is required.

The other packages are optional add-ons that need Jarvis Core. Install only what you need; see the [Core guide](core.md) for the list.

## 2. Open Jarvis

Open the Jarvis view in the activity bar. Jarvis scans its folders and fills the views automatically.

## 3. Check where actors live

Actors are folders with an `actor.yaml` file. New actors are created in `.jarvis/actors` in your workspace. To use another folder, change `jarvis.actors.folder` under **Settings → Extensions → Jarvis**. Only direct child folders that contain an `actor.yaml` appear in the ACTORS view.

## 4. Create your first actor

Click **+** in the ACTORS view title bar, run **Jarvis: New Actor** from the Command Palette, or use the `#createActor` tool in chat. Jarvis creates the actor folder with its `actor.yaml` and `context.md` memory file and opens the actor's chat; `jarvis.actors.openSessionOnCreate` controls the last step.

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
