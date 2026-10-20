# Session Context: Test Designer

Role, duties, and workflow are defined in the agent description (`syspilot.uat`).
This file captures operational deltas.

## Active

- tst-kanban-list-details (c61b4be): all T-1..T-27 NOT RUN. T-27 step 4 checks the AC-8 label half (QM F-1, Dev fix `24602ba`): `ghostlabel` absent, shared `urgent` counts 1. Step 6 (no refresh via the "Jarvis Kanban" log; limit: explicit refresh calls are unlogged) and step 7 (board-not-found, `SPEC_KAN_FILTERVALUES` algorithm step 1) unchanged.
- Awaiting VE re-check of F-1; reopen only on a QM or VE finding.
- CM analysis request (09:50:18Z, PM direction): protocol T-1..T-27 re-scoping pending user approval. No protocol edit until approved.
- Own error to correct after approval: T-1, T-4, T-5, T-6, T-18 put field values at top level; they belong under `fields`.
- Spec gap (escalated, not decided): top-level `id` on add is silently ignored; REQ_KAN_ADD AC-4 and REQ_KAN_WRITEVALID AC-4 require rejection.
- Open with PM: branch in spec line 19 (`feature/kanban-management-tools`) vs protocol header (`feature/kanban-list-details`). Protocol unchanged.
- CM decisions applied: step 6 accepted with its limit; step 7 is board-not-found (`SPEC_KAN_FILTERVALUES` algorithm step 1, REQ AC-7); step 1 keeps `actor unknown` as written and cites `SPEC_KAN_SKILLCONTENT` owner bullet and `SPEC_KAN_CREATE` step 1.

## Findings

- kanban verify (`jarvis_verifyKanbanSchema`) runs the JSON Schema check first and returns early; semantic checks (status options) run only when the structure passes. Non-text label entries are caught structurally (`labels` items are strings).
- kanban panel refresh: save and file-change refreshes log to the "Jarvis Kanban" channel; explicit `refreshKanbanPanel` logs nothing and reaches only an open panel. Use the channel for no-refresh checks and state the explicit-call limit.
- An AC that delegates (e.g. SPEC AC-1 to SPEC_KAN_LIST step 2) states no outcome. Before writing "not in approved spec", grep all specs, REQs and UAT specs for the text; state the grep scope when reporting "only in".
- Quote the exact AC text read at HEAD in TST notes; a paraphrase cannot be checked against the spec.
- CM status messages can describe an older HEAD; check `git log` and the protocol's commit before acting.
- Test paths: resolve the EDH file location from the `.code-workspace` folder (`testdata/`), not the repo root; a bare `.github/...` path points at the repo's own copy.
- Always create US_UAT_* + REQ_UAT_* stubs alongside SPEC_UAT_* — traceability gap on #43 required a second pass.
- Module integration (compile/package/CI) is explicitly out of UAT scope — note this in every TST to avoid tester confusion.
- For tools using active-tab heuristic (whoAmI, kanban tools): include a note reminding tester to confirm active tab before invoking.
- Scope expansions arrive as additive T-N extensions to existing SPEC_UAT — check System Designer commits for new fixtures before writing scenarios.
- module-skill-provisioning UAT delivered and executed: US/REQ/SPEC_UAT_SKILL_PROVISION + tst (T-1..T-8 static, all PASS). Static analysis is an accepted execution mode when EDH unavailable; cite code evidence per scenario.
- kanban-skill-content UAT delivered and executed: US/REQ/SPEC_UAT_KAN_SKILL, T-1..T-12 (text field, backward compat, schema errors, undeclared-key warning, applyTo fix, skill content); prerequisite: stacked EDH (core + kanban).
- agent-mode-reset-race UAT delivered and executed: US/REQ/SPEC_UAT_MSG_MODETARGET, T-1..T-7; two independent defects tested separately; all scenarios designed for static code analysis (structural properties, not runtime VS Code behavior).
- kanban-management-tools UAT delivered: US/REQ/SPEC_UAT_KAN_MGMT, T-1..T-27 (ADD/DELETE/LIST/FIELDS + WRITEVALID + skill content; T-22..T-27 LIST details and FILTER VALUES added by kanban-list-details); T-5 explicitly tests that undeclared key is error (not warning) — the F-1 stricter-validation difference.
- kanban-update-validation UAT delivered and executed: amended SPEC_UAT_KANBAN T-22 (id→error not silent skip); US/REQ/SPEC_UAT_KAN_UPDATE_VALID T-1..T-4 (BC-1 bad single_select, BC-2 undeclared key, BC-3 positive + compat); no stale pre-existing scenarios.
- actor-kernel-instructions-delivery UAT delivered: US/REQ/SPEC_UAT_MOD_ACTORRULES T-1..T-6 (default-off, opt-in names, idempotency, opt-out, isolation, old-hyphen files not removed); T-6 tests REQ_MOD_SKILL_ORPHAN AC-3 guarantee.
- whoami-all-entity-kinds UAT delivered: amended SPEC_UAT_WHOAMI T-3 (wording+AC-12); US/REQ/SPEC_UAT_ACT_WHOAMI_MULTIKINDS T-1..T-5 (Project/Event resolved, multi-match→error, Actor regression, kanban regression); T-3 needs temp fixture (Actor+Project same name).
