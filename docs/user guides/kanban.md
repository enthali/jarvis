# Jarvis Kanban

Jarvis Kanban (`enthali.jarvis-kanban`) adds kanban boards to actors. A board is a YAML file in the actor's folder; Jarvis finds it by convention and shows it in an interactive webview. It requires [Jarvis Core](core.md).

## Boards

- `kanban.yaml` is the default board.
- `<name>.kanban.yaml` is a named board.

A board button appears in the explorer tree next to the actor. Open a board from there or with **Jarvis: Open Kanban Board** in the Command Palette.

A board file has three top-level keys: `title`, `fields` (exactly one field named `status`), and `items`. The `status` field is a `single_select`; its options are the board's columns. Each item has a stable integer `id` that is never reused, a `name`, and a `status` that matches an option of the `status` field. Other fields are `single_select` (with `options`) or `text`. Undeclared field keys on items are allowed but produce a validator warning. The full definition is in `schemas/kanban.schema.json`.

## Tools

Supply `ownerName` explicitly for every kanban tool; it is not inferred from the calling session.

| Tool | Purpose |
|------|---------|
| `jarvis_createKanbanBoard` | Create a board with a skeleton template. |
| `jarvis_verifyKanbanSchema` | Validate a board against the JSON Schema and semantic rules. |
| `jarvis_openKanbanBoard` | Open a board in the webview. |
| `jarvis_addKanbanItem` | Add an item with validated field values; the next stable ID is assigned automatically. |
| `jarvis_updateKanbanItem` | Update an item by its stable ID; an open board refreshes live. |
| `jarvis_deleteKanbanItem` | Remove an item by its stable ID. |
| `jarvis_listKanbanItems` | List items, optionally filtered by status or labels. Compact by default (`id`, `name`, `status`, `labels`); `details: true` returns full items. |
| `jarvis_listKanbanFilterValues` | List the status values (empty columns included) and labels with their card counts, for building filters. |
| `jarvis_updateKanbanFields` | Add or update field definitions (add or rename options, add fields). |

## Agent instructions

On activation, the package installs its bundled Copilot skill and instructions (namespace `jarvis-kanban`) into `.github/skills/` and `.github/instructions/`. They teach agents how to read and write `kanban.yaml` boards.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.kanban.autoProvision` | `true` | Provision, and keep current, the bundled Copilot skill and instructions files. Set to `false` to remove them. |
