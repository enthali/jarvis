# Jarvis Syspilot

Detects new [syspilot](https://github.com/enthali/syspilot) releases and hands off installation/updates to the **Syspilot Setup Engineer** actor — it never asks for consent and never installs anything itself.

## Behavior

- On VS Code startup, checks the Frontmatter `version` in `.github/agents/syspilot.setup.agent.md` against the upstream release tag. If the file is missing, it is copied (single-artifact contract — no companion files) and the flow always notifies the actor on this first run, regardless of version equality.
- If a newer version is available (or on first run), the **Syspilot Setup Engineer** actor (auto-created if missing) receives a unified notification asking the user whether they want to install the update now, skip this version by calling `jarvis_SyspilotSkipThisVersion()`, or delay it for N days by calling `jarvis_delaySyspilotUpdate(N)`.
- `jarvis.syspilotUpdate` (Command Palette) forces a re-check, ignoring any suspend/skip state.
- `jarvis_delaySyspilotUpdate(days)` and `jarvis_SyspilotSkipThisVersion()` are exposed as LM tools so the actor can act on the notification conversationally.

## Configuration

- `jarvis.syspilot.releaseTag` — the syspilot release tag (branch, tag, or commit-ish) to fetch from. Default: `main`.

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.

## Opt-out

Uninstall this extension. There is no separate "don't manage" setting.
