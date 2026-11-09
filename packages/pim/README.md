# Jarvis PIM

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

Jarvis Personal Information Manager — Outlook categories and tasks.

Adds a **Categories** view to the Jarvis sidebar and a custom Task Editor for `.jarvis-task` files. Category management is available when Outlook integration is enabled in `enthali.jarvis-core`.

## Features

- **Categories** view — manage Outlook categories (hidden by default; requires `jarvis.pim.showCategories` and `jarvis.outlook.enabled` set to `true`)
- **Task Editor** — custom editor for `.jarvis-task` files

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.pim.showCategories` | `false` | Show the Categories view in the Jarvis sidebar. The view also requires `jarvis.outlook.enabled`. |

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
