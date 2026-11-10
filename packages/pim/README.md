# Jarvis PIM

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

Jarvis Personal Information Manager — Outlook categories and tasks.

Adds a **Categories** view to the Jarvis sidebar and a custom Task Editor for `.jarvis-task` files. Category management is available when Outlook integration is enabled in `enthali.jarvis-core`.

## Features

- **Categories** view — manage Outlook categories (off by default; requires `jarvis.outlook.enabled` and `jarvis.outlook.categories.enabled` set to `true`)
- **Task Editor** — custom editor for `.jarvis-task` files

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.outlook.enabled` | `false` | Enable Outlook COM integration (Windows with Outlook Classic). When disabled, no Outlook COM calls are made. |
| `jarvis.outlook.categories.enabled` | `false` | Enable the Outlook Categories integration (category provider and Categories view). Effective only when `jarvis.outlook.enabled` is `true`. |
| `jarvis.outlook.tasks.enabled` | `true` | Enable the Outlook Tasks integration. Effective only when `jarvis.outlook.enabled` is `true`. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
