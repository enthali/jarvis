# Session Context: Test Designer

Role, duties, and workflow are defined in the agent description (`syspilot.uat`).
This file captures operational deltas.

## Active

- tst-kanban-list-details (v0.31.0; header branch `feature/kanban-list-details`, not on `development`): 37 of 38 rows NOT RUN. T-21 PASS is a user observation (2026-10-19, see kanban-list-details.md#user-validation), not a protocol run.
- Kanban F-1 (AC-8 label count; fix `24602ba`, protocol step `c61b4be`, val re-check `5ed617a`, all on `feature/kanban-list-details`): fix and protocol closed. Val status PARTIAL because the manual EDH cases are open.
- tst-actor-tree-mail-marker (branch `feature/actor-tree-mail-marker`, not on `development`; protocol at `351ab47`): 22 rows NOT RUN, 0 PASS, 0 BLOCKED. T-8 and T-9 cannot run in EDH (agent hooks disabled). T-10 to T-12 must be run and recorded before merge. No merge.
- Open with CM: analysis request (09:50:18Z) on protocol re-scoping. No approval or re-scoping commit is visible in git; ask CM before any protocol edit.
- Open with PM: top-level `id` on add. Rejection is covered by T-6a and T-6b with test evidence; confirm the REQ_KAN_ADD AC-4 and REQ_KAN_WRITEVALID AC-4 reading with PM, then close.

## Findings

- A user observation is recorded as "seen" and names the steps it did not cover. Never mark PASS on partial coverage.
- Status values (NOT RUN, PASS, FAIL) come from the owning spec. Do not add a status it does not define (BLOCKED was reverted per PM); record a blocker in the row note.
- Never change an expected result to fit a test result. If a case is wrong, flag it to CM and keep the original until approved.
- Before writing setup or memory that refers to a fix, check which branch carries its commit (`git branch --contains <hash>`).
- Verify memory items against git before keeping them. CM status messages can describe an older HEAD; check `git log` first.
- Field values go under `fields`. Top-level declared field names are rejected (rule 6), so cases must use `fields`.
- Kanban verify (`jarvis_verifyKanbanSchema`) runs the JSON Schema check first and returns early; semantic checks run only when the structure passes.
- Kanban refresh: save and file-change refreshes log to the "Jarvis Kanban" channel; explicit `refreshKanbanPanel` logs nothing. State the explicit-call limit in no-refresh checks.
- An AC that delegates (e.g. to a SPEC step) states no outcome. Check the delegated step before writing an expected result.
- Quote the exact AC text read at HEAD in TST notes. Before writing "not in approved spec", grep all specs, REQs and UAT specs, and state the grep scope when reporting "only in".
- Static analysis is an accepted execution mode when EDH is unavailable. Cite code evidence per scenario.
- Every SPEC_UAT_* needs matching US_UAT_* and REQ_UAT_* stubs (a traceability gap needed a second pass once).
- Module integration (compile, package, CI) is out of UAT scope. State this in every TST.
- Tools that use the active-tab heuristic (kanban tools, whoAmI): add a note to confirm the active tab before invoking.
- EDH test paths resolve from the `.code-workspace` folder (`testdata/`), not the repo root.
- Scope expansions arrive as additive T-N cases on the existing SPEC_UAT. Check System Designer commits for new fixtures first.
