# Jarvis Kanban

Convention-based kanban boards for Jarvis Actors.

## Overview

This package adds kanban board support to Jarvis. An Actor can have one or more
kanban boards defined as YAML files in its folder.

Boards are discovered automatically via convention:
- `kanban.yaml` — default board
- `*.kanban.yaml` — named boards

## Tools

| Tool | Description |
|------|-------------|
| `jarvis_createKanbanBoard` | Creates a new kanban board with a skeleton template |
| `jarvis_verifyKanbanSchema` | Validates a board against the JSON Schema and semantic rules |
| `jarvis_openKanbanBoard` | Opens a board in the interactive webview renderer |
| `jarvis_updateKanbanItem` | Updates an existing item by its stable integer ID; live-refreshes any open board webview |
| `jarvis_addKanbanItem` | Adds a new item with validated field values; auto-assigns next stable ID |
| `jarvis_deleteKanbanItem` | Removes an item by its stable ID |
| `jarvis_listKanbanItems` | Lists items, optionally filtered by field values |
| `jarvis_updateKanbanFields` | Adds or updates field definitions (add options, rename options, add new fields) |

Supply `ownerName` explicitly for every Kanban tool; it is not inferred from the calling session.

## Board Schema

See `schemas/kanban.schema.json` for the full JSON Schema definition.

A board YAML file has three top-level keys:
- `title` — display title
- `fields` — field definitions (exactly one must be named `status`)
- `items` — board items (cards)

### Field Types

| Type | `options` | Use for |
|------|-----------|--------|
| `single_select` | required — list of option objects (`{ id, name, color? }`) | status columns, priority, category |
| `text` | forbidden | freeform notes, descriptions, URLs |

The `status` field must be `single_select`; its options define the board's columns.

### Item Properties

| Property | Required | Description |
|----------|----------|-------------|
| `id` | yes | Stable integer ID — never reuse |
| `name` | yes | Display title |
| `status` | yes | Must match a `status` field option id |
| `nextId` | no | Next available ID hint for tooling |

Undeclared field keys on items are allowed but produce a validator warning.

## Configuration

On activation, this extension self-provisions its bundled Copilot Skill and
Instructions files (namespace `jarvis-kanban`) into the workspace's
`.github/skills/` and `.github/instructions/`, teaching agents how to read
and write `kanban.yaml` boards.

| Setting | Description | Default |
|---------|-------------|---------|
| `jarvis.kanban.autoProvision` | Automatically provision (and keep current) the bundled Copilot Skill/Instructions files. Set to `false` to remove them. | `true` |

## Requirements

- Requires `enthali.jarvis-core` extension
