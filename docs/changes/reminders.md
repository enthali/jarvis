# Change: reminders

## Status

- Created: 2026-05-18
- Branch: `feature/reminders`
- Mode: autonomous

## Intent

Agents and the user need a way to schedule a message for future delivery at a
specific point in time. The new Reminders feature lets any LM agent (or the
user) register a time-stamped reminder that — when due — automatically delivers
a message to a named chat session via the existing auto-delivery pipeline.

## Acceptance Criteria

1. Agent can call `jarvis_setReminder({ text, session, deliverAt })` to register
   a reminder. Returns `{ id, deliverAt }`.
2. At `deliverAt` (±5 s, polled with the existing 5-second loop) the message is
   delivered to the target session via auto-delivery.
3. After delivery, the reminder is removed from `reminders.yaml`.
4. `jarvis_listReminders()` returns open reminders: id, text, session,
   deliverAt, remaining time.
5. `jarvis_cancelReminder({ id })` removes a reminder before delivery.
6. A dedicated "Reminders" sidebar view (Jarvis Activity Bar container,
   sibling of the Messages view) shows open reminders.
7. VS Code restart: persisted reminders are preserved and delivered when due.
8. Clicking a reminder node in the "Reminders" view opens `reminders.yaml` in
   the editor and reveals the line of that reminder entry (analogous to
   message and heartbeat node clicks).

## Affected Specs

| Level | ID | File | Change |
|---|---|---|---|
| US | `US_MSG_REMINDERS` (new) | `docs/userstories/us_msg.rst` | new story |
| REQ | `REQ_MSG_REMINDERS_PERSIST` (new) | `docs/requirements/req_msg.rst` | YAML schema + read/write |
| REQ | `REQ_MSG_REMINDERS_DELIVER` (new) | `docs/requirements/req_msg.rst` | poll loop integration |
| REQ | `REQ_MSG_REMINDERS_TOOLS` (new) | `docs/requirements/req_msg.rst` | 3 LM+MCP tools |
| REQ | `REQ_MSG_REMINDERS_VIEW` (new) | `docs/requirements/req_msg.rst` | Reminders sidebar view |
| REQ | `REQ_EXP_REMINDER_OPENFILE` (new) | `docs/requirements/req_exp.rst` | click reminder → open YAML |
| SPEC | `SPEC_MSG_REMINDERSTORE` (new) | `docs/design/spec_msg.rst` | file format + module |
| SPEC | `SPEC_MSG_REMINDERSLOOP` (new) | `docs/design/spec_msg.rst` | poll loop extension |
| SPEC | `SPEC_MSG_REMINDERSTOOLS` (new) | `docs/design/spec_msg.rst` | LM+MCP tool registration |
| SPEC | `SPEC_MSG_REMINDERSVIEW` (new) | `docs/design/spec_msg.rst` | dedicated tree view |
| SPEC | `SPEC_EXP_REMINDER_OPENFILE` (new) | `docs/design/spec_exp.rst` | open YAML command |

## Design Decisions

- **Persistence format**: YAML (`reminders.yaml`) co-located with
  `messages.json`. YAML was chosen for human readability; the existing
  `js-yaml` dependency (already used by `yamlScanner.ts`) is reused.
- **Auto-delivery enablement**: When a reminder fires, the target session is
  automatically added to `autodelivery.json` (idempotent `addAutoDelivery`)
  before the message is appended. This ensures delivery even if the session was
  not previously on the auto-delivery list.
- **ID**: `crypto.randomUUID()` — no external dependency.
- **Poll integration**: Reminder checks happen in the same 5-second
  `setInterval` loop after the existing auto-delivery handling, ensuring at
  most ±5 s delivery latency.
