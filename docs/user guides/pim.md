# Jarvis PIM

Jarvis PIM (`enthali.jarvis-pim`) is the Personal Information Manager: Outlook-backed categories and tasks. It requires [Jarvis Core](core.md).

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

## Categories

A **Categories** view in the Jarvis sidebar manages Outlook categories. It needs `jarvis.pim.showCategories` and `jarvis.outlook.enabled`.

## Tasks

A custom Task Editor opens `.jarvis-task` files.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.pim.showCategories` | `true` | Show the Categories view in the Jarvis sidebar. |
| `jarvis.outlook.enabled` | `false` | Enable Outlook COM integration (Windows with Outlook Classic). When disabled, no Outlook COM calls are made. |
| `jarvis.outlook.tasks.enabled` | `true` | Enable the Outlook Tasks integration. Effective only when `jarvis.outlook.enabled` is `true`. |
