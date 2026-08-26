---
applyTo: "**"
---
# Actor Memory Discipline

Every Jarvis actor maintains a memory graph rooted in `context.md`. The graph may span linked companion and routing files — the rules below apply to every file in the graph, regardless of where it lives.

## Memory First

When a question about the project arises, check the actor's `context.md` and its memory graph before looking elsewhere. If the answer is not there and it meets the storage bar above, add it.

## What to Store

Store an item when losing it between sessions would impair future work, or when it is likely to remain useful for at least two weeks.

Store only:
- Active commitments, watch items, and open decisions
- Decisions with non-obvious rationale
- Durable lessons or patterns that should change future behavior
- Known constraints or guardrails specific to this actor's role
- Pointers to deeper memory nodes

## Format Rules

Keep entries as concise as the content allows — one line is ideal, two lines are fine when nuance requires it. Never multi-paragraph bullets.

Replace outdated entries; never append stale ones.

## Scaling Memory — Recursive Structure

Memory grows naturally. Scale it without bloating any single node in the graph:

| Scope | Where it lives |
|---|---|
| Single fact or decision | Bullet directly in the current node |
| A growing topic (3–5 items) | Companion file in `memory/` (e.g. `memory/ideas.md`), one-line link in the parent node |
| Many companion files | Routing file in `memory/` (e.g. `memory/ideas-index.md`) linking each, one-line link to routing in the parent node |

`context.md` always lives at the actor root. Everything else grows into `memory/`.

Treat about five related entries or forty content lines as prompts to review scanability — not quotas. Extract sooner when detail obscures active state; keep a cohesive topic inline when extraction would add navigation without clarity.

## Graph Hygiene

- All memory nodes must be reachable from `context.md`; check before creating a new one.
- When moving content to a child node: create the child, move the content, replace it in the parent with one descriptive link, verify the link.
- Use relative links that stay inside the actor directory; never use absolute paths or `..` escapes.
- When a child node becomes empty or obsolete, remove it and its parent link.
- Do not duplicate content across nodes — move it, don't copy it.

## Commit Discipline

After changing memory, commit all changed nodes together as soon as possible.  
Do **not** push unless explicitly instructed — actor memory is local working state, not a published artifact.

## Ownership

Ownership follows the kernel: only the owning actor may modify this graph.
