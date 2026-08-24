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

- **CR #43 prompt-injection-tool** — `feature/prompt-injection-tool`, status `ready-for-merge`, QM Round 2 CLEAR, PM notified
- **CR #44 jarvis-whoami** — `feature/jarvis-whoami`, status `ready-for-merge`, QM CLEAR, PM notified
- **CR #46 jarvis-kanban** — `feature/jarvis-kanban`, status `ready-for-merge`, QM Round 5 CLEAR; PM review required before merge; 4 tools (create/verify/open/update), item IDs, 23 UAT scenarios
- **module-skill-provisioning** — `feature/module-skill-provisioning`, status `qm-cleared`, held pending joint user validation with kanban-skill-content; do NOT merge until PM instructs
- **kanban-skill-content** — `feature/kanban-skill-content` (stacked on module-skill-provisioning), status `ready-for-merge`, MECE CLEAR (15d76ff), QM CLEAR, PM notified; joint user validation with module-skill-provisioning required before either merges
- **agent-mode-reset-race** — `feature/agent-mode-reset-race`, status `qm-recheck` (R3 AC-7 fix applied 9a30f41: catch restored, spec sample corrected), QM re-notified
