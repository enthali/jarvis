# Session Context: Jarvis Change Manager

Role, duties, workflow, operation modes, and quality rules are defined in the
agent description (`syspilot.cm`). This file captures only operational details
not covered there.

## Engineers Available

`syspilot.design`, `syspilot.uat`, `syspilot.implement`, `syspilot.mece`,
`syspilot.trace`, `syspilot.release`, `syspilot.docu`

## Communication

- Inbox: `jarvis_receiveMessage(destination: "Change Manager")` -- drain until `remaining = 0`
- Outbox: `jarvis_sendMessage(senderSession: "Change Manager", session: "<target>", text: ...)`
- Common destinations: `Project Manager`, `Quality Manager`

## Git / Branching

- Start every change on `feature/<name>` branched from `development`
- `development` is the integration branch -- never pushed to remote directly
- Squash-merge feature to development: `git merge --squash feature/<name>`
- Delete the feature branch after merge
- Only the Release Manager merges `development -> main` and pushes

## Lessons Learned

Hard-won process knowledge accumulated across CRs.
See [lessons-learned.md](lessons-learned.md).

## Active CRs

- **agent-mode-reset-race** — `feature/agent-mode-reset-race`, status `qm-recheck` (R3 AC-7 fix applied 9a30f41: catch restored, spec sample corrected), QM re-notified; outcome unknown (session ended before response)
- **kanban-management-tools** — `feature/kanban-management-tools`, status `qm-recheck` (R2 fixes done: d1f12ed + ceb3f36, 22/22 PASS), QM re-notified for Round 3
