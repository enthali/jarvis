---
applyTo: "**/{kanban.yaml,*.kanban.yaml}"
---
# Kanban Board YAML

- Board-level required keys: `title`, `fields`, `items`. `nextId` is optional; when present it must only ever increase.
- Each item requires `id` (integer ≥ 1, immutable, never reused), `name` (string), `status` (string matching a status option).
- The item title property is `name`, not `title`.
- A `single_select` field requires `options`; item values must match one of those option names.
- A `text` field must not have `options`; item values are unconstrained strings.
- A key on an item that matches no declared field name is accepted by the schema but **ignored by the renderer** — declare the field first.
- Run `jarvis_verifyKanbanSchema` after manual edits, and read both the `errors` and `warnings` arrays.
