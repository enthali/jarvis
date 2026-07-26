# Actor 1

Finding
- Kanban board is tracked in [kanban.yaml](kanban.yaml); both boards pass verifyKanbanSchema with no errors.
- Additional "bug" board created: [bug.kanban.yaml](bug.kanban.yaml).
- verifyKanbanSchema needs boardName without extension (e.g. "bug", or omit for default kanban.yaml).
- Schema now requires each item to have a unique integer `id` field (added to both boards).

Next
- Keep durable notes here and backlog work in the kanban boards.
