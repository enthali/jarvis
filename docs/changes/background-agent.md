# Change Document: background-agent

**Status**: approved
**Branch**: feature/background-agent
**Created**: 2026-04-08
**Author**: Jarvis Developer

---

## Summary

Extend the Heartbeat Scheduler with a new step type `agent` — a single-shot LLM
call via `vscode.lm` API executed directly in the Extension Host. The agent step
reads a prompt from a file, sends it to the default Copilot model, and optionally
writes the response to an output file. No new User Stories are needed; the existing
`US_AUT_HEARTBEAT` and `US_CFG_HEARTBEAT` already cover this.

Scope: Level 1 (REQ modifications) and Level 2 (new SPEC) only.

---

## Level 0: User Stories

**Status**: ✅ not changed — existing US_AUT_HEARTBEAT covers new step type

### Impacted User Stories

| ID | Title | Impact |
|----|-------|--------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | none — AC-2 says "steps", agent is a new step type within scope |

### Decisions

- Decision 1: No new US needed — `agent` is a new step type within the existing
  scheduler scope of `US_AUT_HEARTBEAT`

---

## Level 1: Requirements

**Status**: ✅ completed

### Modified Requirements

| ID | Impact | Notes |
|----|--------|-------|
| REQ_AUT_JOBCONFIG | AC-2 extended | Add `agent` to allowed `type` values; new AC-4 for agent step fields |
| REQ_AUT_JOBEXEC | New AC-5 | agent step execution via vscode.lm |

### Decisions

- Decision 2: `agent` step fields: `prompt` (path to prompt file, required),
  `outputFile` (path to write response, optional), `append` (bool, optional, default false)
- Decision 3: Use VS Code default Copilot model (`vscode.lm.selectChatModels`) —
  no user-configurable model selector for now (KISS)
- Decision 4: Logging: prompt path, model ID used, response length, any errors
  to Jarvis Heartbeat Output Channel
- Decision 5: `outputFile` is resolved relative to configDir (same as scripts)

### Horizontal Check (MECE)

- ✅ REQ_AUT_JOBCONFIG AC-2: clean extension (additive, no contradiction)
- ✅ REQ_AUT_JOBEXEC: new AC-5 is parallel structure to AC-1..3, no overlap
- ✅ REQ_AUT_OUTPUT AC-2 already covers "all step output" — agent logging naturally covered

---

## Level 2: Design

**Status**: ✅ completed

### Modified Design Elements

| ID | Impact | Notes |
|----|--------|-------|
| SPEC_AUT_JOBSCHEMA | TypeScript interface extended | `type` union + `prompt?` + `outputFile?` + `append?` fields |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_AUT_AGENTEXEC | Agent Step Executor | REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT; SPEC_AUT_EXECUTOR |

### Decisions

- Decision 6: `SPEC_AUT_JOBSCHEMA` modified in-place (additive fields, backward compatible)
- Decision 7: `executeAgentStep` as standalone async function in `heartbeat.ts`
- Decision 8: `vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' })`
  — use first result; fall back gracefully if none available
- Decision 9: Response written with `fs.writeFileSync` (overwrite) or `fs.appendFileSync`
  (when `append: true`)
- Decision 10: `outputFile` resolved relative to configDir via `resolveScriptPath`

### Horizontal Check (MECE)

- ✅ SPEC_AUT_EXECUTOR: unchanged — `runStep` dispatch table gets one new branch
- ✅ SPEC_AUT_AGENTEXEC: owns the LLM call, file write, and logging — no overlap with existing SPECs
- ✅ SPEC_AUT_JOBSCHEMA: interface change is additive — no backward incompatibility

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability

| US | REQ | SPEC |
|----|-----|------|
| US_AUT_HEARTBEAT (AC-2) | REQ_AUT_JOBCONFIG (AC-2 ext + AC-4) | SPEC_AUT_JOBSCHEMA (modified) |
| US_AUT_HEARTBEAT (AC-2) | REQ_AUT_JOBEXEC (AC-5) | SPEC_AUT_AGENTEXEC (new) |
