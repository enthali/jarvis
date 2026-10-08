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
- **heartbeat-agent-model-selection** — merged `452c769` on development (2026-10-08, squash, not pushed, PM). User decisions: no default model, existing agent steps without `vendor`+`model` fail (breaking, D-2); the model list shows only vendor+model, tool and failure message same notation (D-12). Open, recorded, NOT passed: live cases T-2/T-4..T-9 and a BYOK/local job run (user accepted the risk); 4 new elements + SPEC_AUT_AGENTEXEC + REQ_AUT_JOBEXEC stay `approved` until a live pass. Release Engineer hand-over MUST take the CD section "Release Note (for the Release Engineer)". Debts with PM: backlog #53 (outputVar), #54 (removed heartbeatConfigFile still documented). Lesson: stale editor buffers reverted committed files (QM entry, CD, specs): `git status`/diff before CD edits, commit at once.
- **actor-identity-via-agent-file** — `feature/actor-identity-via-agent-file`, HEAD `5be25935` (development merged in by PM, nothing squashed or pushed). Design user-guided, rest autonomous. All items passed Verify/QM (kernel `## 0. Identity` removal, T-9 removal included). Open: integration check after the merge, order Verify -> System Designer (SPEC_ENG_API status and links, CD counts) -> QM, one actor at a time; PM merges, not me. Scripted EDH T-1..T-8, T-10 NOT RUN, 3 s mode-command wait OPEN. Deferred by PM: backlog #47 (R4-1), multi-root, persona wording.
- **recorder-redesign** — released in `v0.29.0` (tag, release commit 6ba6cf9 "on-device recorder", 2026-10-03). Open, never passed: T-1..T-17 NOT RUN, U-3 BLOCKED, U-4 NOT RUN; 12 elements `approved`; D-28 licence/telemetry blocks publication. Release-note candidates: U-3/U-4 untested, echo coverage limited to this hardware, first-start TLS retry undecided.

## Process Rules

- **Stale editor copies (since 2026-09-27)**: files reappear in the worktree in an older committed state (10 cases). Read specs via `git show HEAD:`, run `git status` and `git diff` before every commit, commit explicit paths only. A stale file is restored only if its hash equals an earlier committed version of the same file (diff saved to `%TEMP%` first, timestamps and hashes reported to PM); anything else, ask PM. Restore is PM's; I do not restore.
- **Dispatch by artefact owner (2026-10-08)**: send a change to the actor that created the artefact (UAT elements and Test Protocol: Test Designer; design text: System Designer). Read the CD before quoting it to PM; I once described a CD row that did not exist.
- **Finding assignment, not solving (2026-09-20)**: When QM findings need to be addressed, CM assigns them to the responsible actor — System Designer for spec/design issues, Dev Engineer for code issues. CM does NOT solve findings directly. This applies to the CM's own pipeline work too (e.g., whoami-hookless-error R1: CM wrongly fixed spec UAT issues itself instead of routing to SD).
