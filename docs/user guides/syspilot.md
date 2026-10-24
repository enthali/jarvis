# Jarvis Syspilot

Jarvis Syspilot (`enthali.jarvis-syspilot`) detects new [syspilot](https://github.com/enthali/syspilot) releases and hands installation and updates off to the **Syspilot Setup Engineer** actor. It never installs anything itself and never asks for consent. It requires [Jarvis Core](core.md).

> **EXPERIMENTAL — DO NOT USE.** The upcoming syspilot 0.10 release will
> break compatibility.

## How it works

- On VS Code startup, it compares the Frontmatter `version` in `.github/agents/syspilot.setup.agent.md` with the upstream release tag. If the file is missing, it is copied, and the actor is always notified on this first run.
- If a newer version exists, or on first run, the Syspilot Setup Engineer actor (created automatically if missing) receives a notification asking whether to install now, skip this version, or delay it by N days.
- The actor answers with the tools `jarvis_SyspilotSkipThisVersion()` and `jarvis_delaySyspilotUpdate(days)`.
- **`jarvis.syspilotUpdate`** in the Command Palette forces a re-check and ignores any skip or delay state.

## Opt out

Uninstall this extension. There is no separate setting to switch it off.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.syspilot.releaseTag` | `main` | syspilot release tag (branch, tag, or commit-ish) from which the setup agent and its companion files are fetched. |
