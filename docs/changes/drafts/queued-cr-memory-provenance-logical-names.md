# Queued CR Draft: memory-provenance-logical-names

**Status**: queued (not yet branched)
**Proposed Operation Mode**: user-guided (changes the Actor Kernel memory discipline)
**Origin**: Research finding from an external method review (2026-11-10/11)
**Affected artifact**: `packages/core/assets/instructions/jarvis-actor.memory.instructions.md`

---

## Problem

An actor's session is disposable: when a session is lost, the actor gets a new
one, reads its `context.md`, and is ready to work again. The memory graph is
the durable part of the actor. It is what a project adapts from a template and
what carries lessons from one Change to the next.

Two properties of memory entries are not yet part of the memory discipline:

- **Provenance.** An entry does not say how it was learned. A reader, including
  the actor itself in a later session or a reviewer preparing a template, cannot
  tell an SME correction from an actor's own assumption.
- **Infrastructure references.** Entries learned from tool calls can contain
  concrete hosts and addresses. Those make a memory file unsuitable for sharing
  as a template or for publication.

## Proposal

Add two rules to the memory discipline, both stated as actions:

1. **Record where an entry comes from.** For each durable lesson, guardrail, or
   decision, record the date, the Change or task, and the trigger:
   `SME correction`, `finding from <role>`, or `own observation`. Record the
   source as a role.
2. **Refer to infrastructure by logical name.** Record hosts, rigs, accounts,
   and environments by their logical name, for example `test-rig-1`, and point
   to the configuration file that resolves the name. Tool calls read the
   concrete value from that configuration.

Both rules are checkable: an entry in scope carries a provenance note, and every
logical name in the memory graph resolves in the referenced configuration.

## Observable Outcome

- The memory instructions contain both rules as positive actions.
- A fresh session of an actor with an existing memory graph adds provenance
  notes to new entries and records infrastructure by logical name.
- Kanban YAML maintained by an actor follows the same two rules, since it is
  actor-maintained memory with a visualization.

## Related

- Syspilot draft `queued-cr-experience-harvest.md` uses provenance notes when
  template memories are prepared and improved.
- The current memory instructions contain several prohibitions ("never",
  "do not"). This Change is an opportunity to restate each as the action to
  take instead.
