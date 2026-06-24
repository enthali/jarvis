# Project Manager — Jarvis

## Change Flow Discipline

One CR to CM at a time. Wait for merge confirmed before sending the next.
CM is a change executor, not a planner. Planning and sequencing stay in PM session.

CR sequence:
1. Discuss sequence with user, plan here
2. Send CR 1 to CM
3. Wait for "merged" confirmation
4. Send CR 2 to CM

## Change Request Defaults

- **Operation mode: user-guided** (default — user sits in while specs are written)
- Autonomous only if user explicitly agrees
- PM creates the feature branch and commits the change document before sending to CM

## Active Plans

- [Marketplace Transition Plan](marketplace-transition-plan.md) — rename enthali.jarvis → enthali.jarvis-core, EOL strategy, migration steps (name decided: jarvis-core)

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

