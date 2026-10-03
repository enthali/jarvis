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
- **kanban-management-tools** — `feature/kanban-management-tools`, status `ready-for-merge`, QM R3 CLEAR (low findings deferred to backlog item 14), PM notified; 2 URR flags disclosed (F-1 closed by kanban-update-validation)
- **kanban-update-validation** — `feature/kanban-update-validation` (stacked on kanban-management-tools), status `ready-for-merge`, QM CLEAR, PM notified
- **actor-kernel-instructions-delivery** — `feature/actor-kernel-instructions-delivery`, status `qm-cleared`, QM R2 CLEAR, pending user confirmation for merge
- **whoami-all-entity-kinds** — `feature/whoami-all-entity-kinds`, status `r2-recheck` (fixes 274625f: TC-2/TC-4 + SPEC AC-2/AC-2a, 406/406 pass), VE + MECE re-dispatched → report to PM
- **one-kind-consolidation** — `feature/one-kind-consolidation`, status `in-progress`, user-guided mode, L0/L1/L2 pre-drafted by Architect, awaiting user review before dispatch
- **remove-newactor-legacy-quickpick** — merged `4723e94` on development (2026-09-30). QM CLEAR R1, VE PASSED, user-validated.
- **recorder-redesign** — `feature/recorder-redesign`, status `post-validation-changes`, autonomous. User validated in EDH (via PM): U-1 PASS (first start TLS failure, second ok, retry undecided), U-2 PASS, U-3 BLOCKED (not a release blocker), U-4 NOT RUN (user decision), U-5 PASS; T-1..T-17 NOT RUN. Release-note candidates: U-3/U-4 untested, echo coverage limited to this hardware. In scope now: backlog 49 settings group title "Recording" → "Jarvis Recorder" AND command titles "Start Recording"/"Show Running Recording" get the "Jarvis:" prefix (user: "ja wäre gut"; SPEC_REC_BUTTON, REQ_REC_ENABLE AC-2, SPEC_REC_SETTINGS) — one pass: SD done (15ba935 D-58 group title, 1eda339 D-59 command titles), QM targeted check done and committed by PM (aec3293). F-8 closed: REQ_REC_SPEECH back to `approved` (VE 88b9bb4; 13 `implemented` / 12 `approved`). CM report sent to PM with full state for the merge decision. Nothing further from CM unless PM sends something; user wants no more QM/VE rounds. Merge only with the user's explicit OK (not given); PM merges, isolated worktree if other actors have uncommitted files. D-28 blocks publication not merge. Open, not passed: T-1..T-17 NOT RUN, U-3 BLOCKED, U-4 NOT RUN. VE promotion rule: of the 12 `approved` promote only those whose open evidence is covered by U-1/U-2/U-5; others stay with open cases named. Merge only after QM answer + user's explicit OK (not given). D-28 blocks publication not merge. Leave QM's/other actors' uncommitted files alone.

## Process Rules

- **Finding assignment, not solving (2026-09-20)**: When QM findings need to be addressed, CM assigns them to the responsible actor — System Designer for spec/design issues, Dev Engineer for code issues. CM does NOT solve findings directly. This applies to the CM's own pipeline work too (e.g., whoami-hookless-error R1: CM wrongly fixed spec UAT issues itself instead of routing to SD).
