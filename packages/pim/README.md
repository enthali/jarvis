# Jarvis PIM

Jarvis Personal Information Manager — projects, events, categories, and tasks.

Adds **Projects**, **Events**, and **Categories** tree views to the Jarvis Explorer, sourced from YAML files in configurable folders. Includes a custom Task Editor for `.jarvis-task` files, filter/search commands for projects and events, and Outlook category management (when Outlook integration is enabled in `enthali.jarvis-core`).

## Features

- **Projects** and **Events** views — browse, search, and filter YAML-backed entities
- **Categories** view — manage Outlook categories (requires `jarvis.pim.showCategories` and `jarvis.outlook.enabled`)
- **Task Editor** — custom editor for `.jarvis-task` files

## Configuration

Enable each view via the shared settings in `enthali.jarvis-core`: `jarvis.projects.enabled`, `jarvis.events.enabled`, `jarvis.pim.showCategories`. Folder locations (`jarvis.projectsFolder`, `jarvis.eventsFolder`) are also configured on core.

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed.
