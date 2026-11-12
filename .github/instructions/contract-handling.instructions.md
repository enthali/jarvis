---
description: "Governs Contract responsibility, committed handoffs, consultation, and blocker escalation for every Jarvis actor."
applyTo: "**"
---
# Contract Handling

`Current responsibility` is temporary authority to maintain the Contract instance; durable artifact ownership stays with each artifact's owner.

## Handoff

- **HANDOFF** (via `SEND`) — after completing work, select the next logical included artifact owner whose work can progress the Contract. Update Contract status, artifact evidence, and `Current responsibility`, then commit the Contract and related artifacts as one consistent state before sending HANDOFF. This intentionally prioritizes single-writer, consistent Contract state over uninterrupted communication and accepts the brief notification gap. In the HANDOFF message, name the Contract path and the commit; the completed outcome is the last Handover-log line and the remaining work is in the open rows. Keep notes and messages short and direct: facts and decisions, no recited evidence, no instruction to a receiver who owns the next artifact. Consider updating your context.md according to the memory instructions.
- **ACK** (via `RESPOND`) — before starting work received through a HANDOFF, verify that the named commit's Contract header states `Current responsibility` as yourself. When it does, re-read your `context.md`, your role card, and the active Contract, then RESPOND with ACK. When it names another actor, escalate the discrepancy.

## Consultation

- **CONSULT** (via `SEND`) — request advice or review from another actor at any time, explicitly marked as a consultation. `Current responsibility` stays with its holder; the consulted actor reads the Contract and the versioned work artifacts and answers with findings.
- **CONSULTRESPOND** (via `RESPOND`) — return the consulted actor's answer or findings to the asker. `Current responsibility` stays with its holder.

Questions and escalation leave `Current responsibility` with its holder. When no included artifact owner can progress the Contract, record an actionable blocker and escalate.
