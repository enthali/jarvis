# Jarvis PIM

Jarvis PIM (`enthali.jarvis-pim`) is the Personal Information Manager: Outlook-backed categories and tasks. It requires [Jarvis Core](core.md).

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

## Categories

A **Categories** view in the Jarvis sidebar manages Outlook categories. It is off by default, like the Outlook Tasks integration. To use it, set both `jarvis.outlook.enabled` and `jarvis.outlook.categories.enabled` to `true`. With the categories setting off, no Outlook category provider is registered and the view is not shown. The former setting `jarvis.pim.showCategories` no longer exists and is not migrated; if you had it on, set `jarvis.outlook.categories.enabled` to `true`. Reload the window after changing it so the provider follows.

## Tasks

A custom Task Editor opens `.jarvis-task` files.

Outlook as a task source is off by default. Turn on `jarvis.outlook.enabled` to use it; `jarvis.outlook.tasks.enabled` (default `true`) then controls the tasks feature separately, so you can switch tasks off without turning off the Outlook integration.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.outlook.enabled` | `false` | Enable Outlook COM integration (Windows with Outlook Classic). When disabled, no Outlook COM calls are made. |
| `jarvis.outlook.categories.enabled` | `false` | Enable the Outlook Categories integration (category provider and Categories view). Effective only when `jarvis.outlook.enabled` is `true`. |
| `jarvis.outlook.tasks.enabled` | `true` | Enable the Outlook Tasks integration. Effective only when `jarvis.outlook.enabled` is `true`. |
