---
description: "Jarvis Kanban Board — convention-based kanban boards for actors, projects, and events. USE FOR: creating boards, viewing boards, updating items, validating schemas. DO NOT USE FOR: general task management outside Jarvis entities."
---

# Jarvis Kanban Board

Manage kanban boards attached to Jarvis actors, projects, and events.

## Tools

| Tool | Purpose |
|------|---------|
| `jarvis_createKanbanBoard` | Create a new kanban board for an entity |
| `jarvis_openKanbanBoard` | Open a board in the webview renderer |
| `jarvis_verifyKanbanSchema` | Validate a board against schema and semantic rules |
| `jarvis_updateKanbanItem` | Update fields on an existing board item |

## Board Convention

- Boards are YAML files named `kanban.yaml` or `<name>.kanban.yaml`
- They live inside entity folders (actors, projects, events)
- Each board has fields (columns), items (cards), and a `nextId` counter

## Quick Start

1. Create a board: use `jarvis_createKanbanBoard` with an owner name
2. Open it: use `jarvis_openKanbanBoard`
3. Update items: use `jarvis_updateKanbanItem` with item ID and changes
