# Session Context: Test Designer

Role, duties, and workflow are defined in the agent description (`syspilot.uat`).
This file captures operational deltas.

## Findings

- Always create US_UAT_* + REQ_UAT_* stubs alongside SPEC_UAT_* — traceability gap on #43 required a second pass.
- Module integration (compile/package/CI) is explicitly out of UAT scope — note this in every TST to avoid tester confusion.
- For tools using active-tab heuristic (whoAmI, kanban tools): include a note reminding tester to confirm active tab before invoking.
- Scope expansions arrive as additive T-N extensions to existing SPEC_UAT — check System Designer commits for new fixtures before writing scenarios.
- module-skill-provisioning UAT delivered and executed: US/REQ/SPEC_UAT_SKILL_PROVISION + tst (T-1..T-8 static, all PASS). Static analysis is an accepted execution mode when EDH unavailable; cite code evidence per scenario.
- kanban-skill-content UAT delivered and executed: US/REQ/SPEC_UAT_KAN_SKILL, T-1..T-12 (text field, backward compat, schema errors, undeclared-key warning, applyTo fix, skill content); prerequisite: stacked EDH (core + kanban).
- agent-mode-reset-race UAT delivered and executed: US/REQ/SPEC_UAT_MSG_MODETARGET, T-1..T-7; two independent defects tested separately; all scenarios designed for static code analysis (structural properties, not runtime VS Code behavior).
- kanban-management-tools UAT delivered: US/REQ/SPEC_UAT_KAN_MGMT, T-1..T-21 (ADD/DELETE/LIST/FIELDS + WRITEVALID + skill content); T-5 explicitly tests that undeclared key is error (not warning) — the F-1 stricter-validation difference.
- kanban-update-validation UAT delivered: amended SPEC_UAT_KANBAN T-22 (id→error not silent skip); US/REQ/SPEC_UAT_KAN_UPDATE_VALID T-1..T-4 (BC-1 bad single_select, BC-2 undeclared key, T-3 positive, T-4 compat); BC-3 covered by amended T-22.
