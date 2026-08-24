---
description: "Jarvis Kanban Board — convention-based kanban boards for actors, projects, and events. USE FOR: creating boards, viewing boards, updating items, validating schemas, understanding board structure. DO NOT USE FOR: general task management outside Jarvis entities, editing non-kanban YAML files."
---

# Jarvis Kanban Board

## Tools

| Tool | Purpose |
|------|---------|
| `jarvis_createKanbanBoard` | Create a new board for an entity |
| `jarvis_openKanbanBoard` | Open a board in the webview renderer |
| `jarvis_verifyKanbanSchema` | Validate structure and semantics |
| `jarvis_updateKanbanItem` | Update fields on an existing item by ID |

## Owner Resolution

- **Omit `ownerName`** to address the calling actor's own board. The tool resolves the caller via `jarvis_whoAmI` internally.
- Supply `ownerName` only to address a *different* entity's board.
- A supplied name that matches no scanned entity returns `{ error: "actor unknown" }`.

## Board Anatomy

A board is a YAML file with three required top-level keys:

| Key | Required | Description |
|-----|----------|-------------|
| `title` | yes | Display title for the board |
| `fields` | yes | Array of field definitions (min 1) |
| `items` | yes | Array of board items (cards) |
| `nextId` | no | Next auto-increment ID; when absent, derived as max(existing ids) + 1 |

The `status` field drives the board's columns — its options define the column names and order.

## Field Types

Each field in `fields[]` has a `name` and a `type`:

| Type | `options` | Behaviour |
|------|-----------|-----------|
| `single_select` | **required** | Item value must match one of the declared option names |
| `text` | **forbidden** | Item value is any freeform string, unconstrained |

The `status` field **must** be `single_select` — its options are the columns.

## Item Properties

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `id` | yes | integer ≥ 1 | Unique, immutable, never reused |
| `name` | yes | string | Item title |
| `status` | yes | string | Must match a `status` field option |
| `labels` | no | string[] | Tags / categories |
| `notes` | no | string | Freeform notes (built-in, always available) |
| *declared field name* | no | string | Value for any user-defined field |

## Pitfalls

1. **Undeclared key is silently ignored.** An item key that matches no declared field is schema-valid, is reported by `jarvis_verifyKanbanSchema` as a *warning* (not an error), and is **never rendered**. Symptom: the board renders, verification looks clean (check the `warnings` array), and the value is absent from the card.
2. **Invalid field type fails structurally.** A `type` other than `single_select` or `text` produces an ajv validation error that does not name the permitted values.
3. **`options` and field type are coupled.** `options` on a `text` field, or missing `options` on a `single_select` field, is a structural error.
4. **`id` is immutable and never reused.** `nextId` must only ever increase.
5. **`status` must be `single_select`** — its options define the board's columns. A `text` status would produce a board with no columns.

## Example

```yaml
title: Sprint Board
nextId: 3
fields:
  - name: status
    type: single_select
    options:
      - name: Backlog
      - name: In Progress
      - name: Done
  - name: priority
    type: single_select
    options:
      - name: Low
      - name: Medium
      - name: High
  - name: rationale
    type: text
items:
  - id: 1
    name: Implement text fields
    status: In Progress
    priority: High
    rationale: GH #57 gap 4 — boards need freeform annotation
  - id: 2
    name: Write documentation
    status: Backlog
    priority: Medium
```

## Workflow

1. **Create** — `jarvis_createKanbanBoard` (omit `ownerName` for your own board)
2. **Edit** — modify items via `jarvis_updateKanbanItem` or edit the YAML directly
3. **Verify** — `jarvis_verifyKanbanSchema` — read both `errors` and `warnings`
4. **View** — `jarvis_openKanbanBoard` to render in the webview
