# Session Context: Test Designer

Role, duties, and workflow are defined in the agent description (`syspilot.uat`).
This file captures operational deltas.

## Findings

- Always create US_UAT_* + REQ_UAT_* stubs alongside SPEC_UAT_* — traceability gap on #43 required a second pass.
- Module integration (compile/package/CI) is explicitly out of UAT scope — note this in every TST to avoid tester confusion.
- For tools using active-tab heuristic (whoAmI, kanban tools): include a note reminding tester to confirm active tab before invoking.
- Scope expansions arrive as additive T-N extensions to existing SPEC_UAT — check System Designer commits for new fixtures before writing scenarios.
