---
applyTo: "**/*.kanban.yaml"
---
# Jarvis Kanban YAML Conventions

When editing `.kanban.yaml` files, follow these conventions:

- Every board MUST have `title`, `nextId`, `fields`, and `items` keys.
- `nextId` is an auto-incrementing integer — never reuse or decrement it.
- Each item MUST have a unique integer `id` and a `title` string.
- Field values on items must match the `options` defined in `fields`.
- Use `jarvis_verifyKanbanSchema` to validate after manual edits.
