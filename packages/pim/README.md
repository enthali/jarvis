# Jarvis PIM

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

Jarvis Personal Information Manager — Outlook categories, tasks and Actor mail indicators.

Adds a **Categories** view to the Jarvis sidebar, a custom Task Editor for `.jarvis-task` files, and flag and mail icons on Actor nodes in the ACTORS view. Category management is available when Outlook integration is enabled in `enthali.jarvis-core`.

## Features

- **Categories** view — manage Outlook categories (off by default; requires `jarvis.outlook.enabled` and `jarvis.outlook.categories.enabled` set to `true`)
- **Task Editor** — custom editor for `.jarvis-task` files
- **Mail indicators on Actors** — with `jarvis.outlook.enabled` on, an Actor shows a flag icon while the Outlook folder of the same name directly under your Inbox holds mail with a pending follow-up flag, and a mail icon while it holds unread mail and no pending flag. The icons update at each ACTORS scan, not live; PIM starts with VS Code, so no view needs to be opened first; Outlook is only read, never started or changed. See the [PIM guide](../../docs/user%20guides/pim.md)

## Configuration

In **Settings**, these settings are listed under **Jarvis PIM**. The setting names start with `jarvis.outlook`.

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.outlook.enabled` | `false` | Enable Outlook COM integration (Windows with Outlook Classic), including the flag and mail icons on Actors. When disabled, no Outlook COM calls are made. |
| `jarvis.outlook.categories.enabled` | `false` | Enable the Outlook Categories integration (category provider and Categories view). Effective only when `jarvis.outlook.enabled` is `true`. |
| `jarvis.outlook.tasks.enabled` | `true` | Enable the Outlook Tasks integration. Effective only when `jarvis.outlook.enabled` is `true`. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
