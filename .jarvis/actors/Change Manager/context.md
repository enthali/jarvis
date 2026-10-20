# Session Context: Jarvis Change Manager

Role, duties, workflow, operation modes, and quality rules are defined in the
agent description (`syspilot.cm`). This file captures only operational details
not covered there.

## Session Names

`Project Manager`, `Quality Manager`, `System Designer`, `Dev Engineer`,
`Test Designer`, `Verify Engineer`, `Change Manager`. Engineers are reached by
session name via `jarvis_sendMessage`, never via `runSubagent`.

## Communication

- Inbox: `jarvis_receiveMessage(destination: "Change Manager")` -- drain until `remaining = 0`
- Outbox: `jarvis_sendMessage(senderSession: "Change Manager", session: "<target>", text: ...)`
- Common destinations: `Project Manager`, `Quality Manager`

## Git / Branching

- Start every change on `feature/<name>` from `development`; CM commits only on its feature branch
- Agents do not commit to `development` (PM, 2026-10-20; `syspilot.branching`)
- `development` is the integration branch; CM never pushes and never merges
- Squash-merge is performed by the PM: `git merge --squash feature/<name>`
- The feature branch is kept after merge (`actor-tree-mail-marker`, 2026-10-20); deletion is the PM's call
- Only the Release Manager merges `development` to `main` and pushes

## Lessons Learned

Hard-won process knowledge accumulated across CRs.
See [lessons-learned.md](lessons-learned.md).

## Active CRs

Open commitments only. Finished CRs are in git history.

- **actor-tree-mail-marker** -- merged to `development` as `a32c888` (2026-10-20); memory commit `02dd2d4` on `feature/actor-tree-mail-marker`. Open: user accepted the listener residual risk (`extension.ts` line 1287, no automated test) and T-10 to T-12 NOT RUN. Manual UAT T-2, T-4, T-6, T-8, T-9, T-10 to T-14 NOT RUN (T-8, T-9: agent hooks disabled in EDH). D-L1-8 setting-name drift deferred. CD header status and any status-only commit: PM decides.
- **heartbeat-agent-model-selection** -- merged `452c769`, released in v0.30.0. Open: live cases T-2, T-4 to T-9 and a BYOK/local job run NOT passed (user accepted the risk); 4 new elements, SPEC_AUT_AGENTEXEC and REQ_AUT_JOBEXEC stay `approved` until a live pass. Backlog #53 (outputVar), #54 (removed heartbeatConfigFile still documented). Release Engineer hand-over: CD section "Release Note (for the Release Engineer)".
- **actor-identity-via-agent-file** -- merged `0e3f3aa` on `development` (2026-10-08), released in v0.30.0. Open, never passed: scripted EDH T-1 to T-8 and T-10 NOT RUN; 3 s mode-command wait OPEN. Backlog #59 (R4-1), #57 (multi-root), #55 (18 old drafts).
- **kanban-list-details** -- merged as `ea42217` on `development`; branch `feature/kanban-list-details` (tip `321e7a5`). Open: manual UAT T-1 to T-27 NOT RUN (value unconfirmed); T-21 provisioning and T-24 unverified until EDH; T-19/T-20 wording, `14f36ab` subject, F-4 backlog, non-string label note (backlog). CD sign-off open; C-3 open for user.
- **recorder-redesign** -- released in v0.29.0 (release commit `6ba6cf9`). Open, never passed: T-1 to T-17 NOT RUN, U-3 BLOCKED, U-4 NOT RUN; 12 elements `approved`; D-28 licence/telemetry blocks publication. Release-note candidates: U-3/U-4 untested, echo coverage limited to this hardware, first-start TLS retry undecided.

## Process Rules

- **Stale editor copies (since 2026-09-27)**: files reappear in the worktree in an older committed state. Read specs via `git show HEAD:`, run `git status` and `git diff` before every commit, commit explicit paths only. Commit at once after an edit. A stale file is restored only if its hash equals an earlier committed version of the same file (diff saved to `%TEMP%` first, timestamps and hashes reported to PM); anything else, ask PM. Restore is PM's; I do not restore.
- **Dispatch by artefact owner (2026-10-08)**: send a change to the actor that created the artefact (UAT elements and Test Protocol: Test Designer; design text: System Designer). Read the CD before quoting it to PM.
- **Finding assignment, not solving (2026-09-20)**: When QM findings need to be addressed, CM assigns them to the responsible actor -- System Designer for spec/design issues, Dev Engineer for code issues. CM does NOT solve findings directly, including its own pipeline work.