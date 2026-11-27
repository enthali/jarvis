# Jarvis PIM

Jarvis PIM (`enthali.jarvis-pim`) is the Personal Information Manager: Outlook-backed categories and tasks. It requires [Jarvis Core](core.md).

> **EXPERIMENTAL.** Email triage is not part of a Jarvis PIM release; it
> remains in an externally maintained skill.

## Categories

A **Categories** view in the Jarvis sidebar manages Outlook categories. It is off by default, like the Outlook Tasks integration. To use it, set both `jarvis.outlook.enabled` and `jarvis.outlook.categories.enabled` to `true`. With the categories setting off, no Outlook category provider is registered and the view is not shown. The former setting `jarvis.pim.showCategories` no longer exists and is not migrated; if you had it on, set `jarvis.outlook.categories.enabled` to `true`. Reload the window after changing it so the provider follows.

## Tasks

A custom Task Editor opens `.jarvis-task` files.

Outlook as a task source is off by default. Turn on `jarvis.outlook.enabled` to use it; `jarvis.outlook.tasks.enabled` (default `true`) then controls the tasks feature separately, so you can switch tasks off without turning off the Outlook integration.

## Mail indicators on Actors

With `jarvis.outlook.enabled` on, an Actor in the ACTORS view shows an icon when Outlook has a mail folder with the Actor's name directly under your default Inbox. The folder name must match the Actor name exactly, including case; a folder nested deeper in the Inbox does not count, and if two Actors have the same name neither shows an icon.

- A **flag** icon means the folder holds at least one mail with a pending follow-up flag, read or unread. A completed or cleared flag does not count.
- A **mail** icon means the folder holds unread mail and no pending follow-up flag.
- An Actor shows only one icon. Chat activity (Error, Waiting, Working) comes first, then the recording mark, then the flag, then the mail icon. When a higher icon ends, the next one that still applies appears.

The icons are not live. Jarvis PIM starts once VS Code has finished starting, so the icons appear without opening any PIM view. Jarvis reads Outlook then, after every scan of the ACTORS view (the background rescan, see `jarvis.scanInterval`, and the manual rescan) and when you change `jarvis.outlook.enabled`, which takes effect without a reload. Jarvis only reads: it never marks mail read, never sets or completes a flag, and never changes folders. It does not start Outlook; if Outlook is not running or cannot be read, no icon is shown and no message appears. Without the PIM extension no Actor shows these icons.

## Configuration

In **Settings**, these settings are listed under **Jarvis PIM**. The setting names start with `jarvis.outlook`.

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.outlook.enabled` | `false` | Enable Outlook COM integration (Windows with Outlook Classic), including the flag and mail icons on Actors. When disabled, no Outlook COM calls are made. |
| `jarvis.outlook.categories.enabled` | `false` | Enable the Outlook Categories integration (category provider and Categories view). Effective only when `jarvis.outlook.enabled` is `true`. |
| `jarvis.outlook.tasks.enabled` | `true` | Enable the Outlook Tasks integration. Effective only when `jarvis.outlook.enabled` is `true`. |
