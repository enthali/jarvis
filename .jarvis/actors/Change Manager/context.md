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

- **actor-tree-mail-marker** — `feature/actor-tree-mail-marker` (HEAD 8f75644), status `QM Round 1 closed (PM accepted, CD 3790836); QM Round 2 findings 4 and 5 CLOSED (AC-5 fix ebc88b2, QM PASS at 2690eff); PM colon decision done: AC-5 full stop in 191654a (SD), recorded in CD 8f75644; QM diff confirmation pending`. Merge gate, user decides: listener in extension.ts has no automated test (residual risk NOT ACCEPTED by PM, manual T-12 NOT RUN); manual UAT T-2..T-6, T-10..T-12 NOT RUN; D-L1-8 setting-name drift deferred. CM never merges
- **agent-mode-reset-race** — `feature/agent-mode-reset-race`, status `qm-recheck` (R3 AC-7 fix applied 9a30f41: catch restored, spec sample corrected), QM re-notified; outcome unknown (session ended before response)
- **kanban-management-tools** — `feature/kanban-management-tools`, status `ready-for-merge`, QM R3 CLEAR (low findings deferred to backlog item 14), PM notified; 2 URR flags disclosed (F-1 closed by kanban-update-validation)
- **kanban-update-validation** — `feature/kanban-update-validation` (stacked on kanban-management-tools), status `ready-for-merge`, QM CLEAR, PM notified
- **actor-kernel-instructions-delivery** — `feature/actor-kernel-instructions-delivery`, status `qm-cleared`, QM R2 CLEAR, pending user confirmation for merge
- **whoami-all-entity-kinds** — `feature/whoami-all-entity-kinds`, status `r2-recheck` (fixes 274625f: TC-2/TC-4 + SPEC AC-2/AC-2a, 406/406 pass), VE + MECE re-dispatched → report to PM
- **one-kind-consolidation** — `feature/one-kind-consolidation`, status `in-progress`, user-guided mode, L0/L1/L2 pre-drafted by Architect, awaiting user review before dispatch
- **remove-newactor-legacy-quickpick** — merged `4723e94` on development (2026-09-30). QM CLEAR R1, VE PASSED, user-validated.
- **heartbeat-agent-model-selection** — merged `452c769` on development (2026-10-08, squash, not pushed, PM). User decisions: no default model, existing agent steps without `vendor`+`model` fail (breaking, D-2); the model list shows only vendor+model, tool and failure message same notation (D-12). Open, recorded, NOT passed: live cases T-2/T-4..T-9 and a BYOK/local job run (user accepted the risk); 4 new elements + SPEC_AUT_AGENTEXEC + REQ_AUT_JOBEXEC stay `approved` until a live pass. Release Engineer hand-over MUST take the CD section "Release Note (for the Release Engineer)". Debts with PM: backlog #53 (outputVar), #54 (removed heartbeatConfigFile still documented). Lesson: stale editor buffers reverted committed files (QM entry, CD, specs): `git status`/diff before CD edits, commit at once.
- **actor-identity-via-agent-file** — merged on development 2026-10-08 (squash `0e3f3aa1`, pushed by PM; feature branch kept locally). Open, never passed: scripted EDH T-1..T-8 and T-10 NOT RUN; 3 s mode-command wait OPEN. Deferred by PM: backlog #59 (R4-1), #57 (multi-root), #55 (18 old drafts). PM renumbered his items 43-47 to 55-59.
- **kanban-list-details** — `feature/kanban-list-details` (PM CD c0ed309, 2026-10-16), status `spec`, USER-GUIDED for every actor. SCOPE (PM, with user, supersedes the first brief): default unchanged (id, name, status, labels; NOT breaking); `details: true` = full card; NEW read-only board overview tool (declared status values + counts, labels in use + counts). L0/L1 committed bcd719b (tool `jarvis_listKanbanFilterValues`). L2 draft bf06c1b, USER-APPROVED. Dev DONE a0cb67e (7 files, not merged; 538 tests, 3 foreign-file failures in shared tree). Test protocol committed e049fa0 (T-1..T-27 NOT RUN). PM decision (user): SD fixes UAT T-15..T-18 text (own commit, no code change). PM decision: UAT wording (us_uat.rst / req_uat.rst L7, "manual end-to-end" -> validation terms) routed to SD, separate commit. QM note: NOT RUN manual UAT = value unconfirmed; merge gate only if PM/user say so. CD sign-off revert 9661f03 verified (sign-off open, C-3 open for user). TD 38d1490 accepted (T-21, boardName, step 5); TD adding AC-9 no-refresh and AC-1 board-not-found steps only if approved text states them. UAT wording e58100c verified. PM: branch = feature/kanban-list-details; line 19 fix e4482ee verified; VE round 2 1e091b6 (FILTERVALUES implemented) ran before HOLD reached VE, VE asked to re-confirm on final HEAD; TD AC-9/AC-1 pending. QM HOLD until final HEAD (line-19 fix, UAT wording, TD protocol). VE sets implemented per D-15 after pass. Open with PM/user: T-19/T-20 wording, 14f36ab subject, F-4 backlog, non-string label note (backlog). T-21 provisioning and T-24 unverified until EDH. Verify Engineer dispatched (rest of CR). Shared tree stale again (4 files: implement agent, core package.json/extension.ts, recorder package.json) reported to PM; PM stashed the 3 core/recorder files (stash@{0}) and restored HEAD; implement agent file left (Dev's; expected 0.30.0 line). Then Dev → Test Designer → VE → QM (one round, both halves); report readiness + QM findings to PM. Uncommitted edits of .github/agents/syspilot.*.agent.md are not mine, left alone.
- **recorder-redesign** — released in `v0.29.0` (tag, release commit 6ba6cf9 "on-device recorder", 2026-10-03). Open, never passed: T-1..T-17 NOT RUN, U-3 BLOCKED, U-4 NOT RUN; 12 elements `approved`; D-28 licence/telemetry blocks publication. Release-note candidates: U-3/U-4 untested, echo coverage limited to this hardware, first-start TLS retry undecided.

## Process Rules

- **Stale editor copies (since 2026-09-27)**: files reappear in the worktree in an older committed state (10 cases). Read specs via `git show HEAD:`, run `git status` and `git diff` before every commit, commit explicit paths only. A stale file is restored only if its hash equals an earlier committed version of the same file (diff saved to `%TEMP%` first, timestamps and hashes reported to PM); anything else, ask PM. Restore is PM's; I do not restore.
- **Dispatch by artefact owner (2026-10-08)**: send a change to the actor that created the artefact (UAT elements and Test Protocol: Test Designer; design text: System Designer). Read the CD before quoting it to PM; I once described a CD row that did not exist.
- **Finding assignment, not solving (2026-09-20)**: When QM findings need to be addressed, CM assigns them to the responsible actor — System Designer for spec/design issues, Dev Engineer for code issues. CM does NOT solve findings directly. This applies to the CM's own pipeline work too (e.g., whoami-hookless-error R1: CM wrongly fixed spec UAT issues itself instead of routing to SD).
