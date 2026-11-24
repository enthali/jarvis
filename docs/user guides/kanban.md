# Jarvis Kanban

Jarvis Kanban (`enthali.jarvis-kanban`) adds kanban boards to actors. A board is a YAML file in the actor's folder; Jarvis finds it by convention and shows it in an interactive webview. It requires [Jarvis Core](core.md).

## Boards

- `kanban.yaml` is the default board.
- `<name>.kanban.yaml` is a named board.

A board button appears in the explorer tree next to the actor. Open a board from there or with **Jarvis: Open Kanban Board** in the Command Palette.

### Working in the board view

The board view is read-only: nothing you do in it changes the file.

- **Refresh.** In a board opened as an editor tab, the **Refresh Kanban Board** button in the editor title bar, next to **Open as Text**, reads the file again at once. The board normally follows its file by itself; use Refresh when a tab has missed an update. Your filter text, swimlane choice and collapsed lanes stay as they are.
- **Swimlanes.** The selector in the board header groups the cards into horizontal lanes across the status columns. Choose `None` (the default), any other `single_select` field (one lane per option, plus `Uncategorized` for cards without a valid value), or `Labels` (one lane per label in alphabetical order, plus `Unlabelled`). A card with several labels appears in each of its label lanes; the column totals still count each card once. Lanes can be collapsed. The choice lasts while the tab is open and starts at `None` again when you reopen it.

A board file has three top-level keys: `title`, `fields` (exactly one field named `status`), and `items`. The `status` field is a `single_select`; its options are the board's columns. Each item has a stable integer `id` that is never reused, a `name`, and a `status` that matches an option of the `status` field. Other fields are `single_select` (with `options`) or `text`. Undeclared field keys on items are allowed but produce a validator warning. The full definition is in `schemas/kanban.schema.json`.

## Tools

Supply `ownerName` explicitly for every kanban tool; it is not inferred from the calling session.

| Tool | Purpose |
|------|---------|
| `jarvis_createKanbanBoard` | Create a board with a skeleton template. |
| `jarvis_verifyKanbanSchema` | Validate a board against the JSON Schema and semantic rules. |
| `jarvis_openKanbanBoard` | Open a board in the webview. |
| `jarvis_addKanbanItem` | Add an item with validated field values; the next stable ID is assigned automatically, so supplying an `id` (also inside `fields`) is rejected. `labels` must be an array of strings. |
| `jarvis_updateKanbanItem` | Update an item by its stable ID; an open board refreshes live. Values are strings, except `labels`, which takes an array of strings. |
| `jarvis_deleteKanbanItem` | Remove an item by its stable ID. |
| `jarvis_listKanbanItems` | List items, optionally filtered by status, labels or declared fields. `fields` takes `{ fieldName: value }` for declared fields other than `status`: a `single_select` field must match one of its options exactly, a `text` field matches a part of the text ignoring case, and an item must match every entry; an unknown field or option returns an error, not an empty list. Compact by default (`id`, `name`, `status`, `labels`); `details: true` returns full items. Non-string label entries in a board file are left out of the result. |
| `jarvis_listKanbanFilterValues` | List the status values (empty columns included), the options of the other `single_select` fields and the labels, each with its card count, for building filters. |
| `jarvis_updateKanbanFields` | Add or remove field definitions or options; a field or option still used by items is not removed. |

## Archiving finished cards

No tool archives cards, and nothing defines when a board is "large". The convention the bundled skill teaches agents is to move finished cards to a second board of the same owner named `archive` (file `archive.kanban.yaml`), using the existing tools. A card is added to the archive board before it is deleted from the working board, so a failed step never loses it. It gets a new `id` on the archive board; the agent keeps the old `id` in `notes`. A new board declares only `status` and `priority`, so a declared field that the cards use must be added to the archive board first with `jarvis_updateKanbanFields`.

## Agent instructions

On activation, the package installs its bundled Copilot skill and instructions (namespace `jarvis-kanban`) into `.github/skills/` and `.github/instructions/`. They teach agents how to read and write `kanban.yaml` boards.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jarvis.kanban.autoProvision` | `true` | Provision, and keep current, the bundled Copilot skill and instructions files. Set to `false` to remove them. |
