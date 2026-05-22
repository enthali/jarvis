# Change Document: session-agent-binding

**Status:** in-progress
**Mode:** autonomous
**Branch:** `feature/session-agent-binding`
**Source:** PM Change Request (2026-05-22)
**Change Manager:** Jarvis CM session
**Base commit (develop):** `fdf49fc`
**Spike reference (NOT to merge):** `experiment/agent-mode-spike` @ `acd46bb`

---

## CR Intent (from PM)

Each Jarvis session may optionally be bound to a specific agent (chat mode).
When the session is opened, the chat editor uses that agent automatically,
removing the need for the user to pick it from the chat picker every time.

Binding is set optionally at session creation (UI picker), persisted in
`session.yaml`, accepted by the `jarvis_createSession` tool, and applied on
session open.

### User-visible Acceptance Criteria

1. Session-creation UI: optional agent picker showing all agents discovered
   under `.github/agents/` (or equivalent path) plus a "No agent" option.
2. Persistence: chosen agent stored in `session.yaml`.
3. On session open with bound agent: chat editor opens directly in that mode.
4. `jarvis_createSession` accepts optional `agent` parameter; no parameter
   means no binding.
5. Validation in `jarvis_createSession`: if `agent` is set but unknown, call
   fails with an error listing available agents (same pattern as
   `validate-session-destination`). Session is NOT created.
6. Backward compatibility: existing `session.yaml` files without `agent` field
   keep working (open in default mode, no error, no regression).
7. Schema extension: `schemas/session.schema.json` gains an optional `agent` field.

### Out of Scope

- Changing an already-bound agent after the fact (manual yaml edit or follow-up CR)
- Auto-switching the agent in a running chat (no in-flight mode change)
- Auto-delivery / heartbeat behavior changes

### PM Hints (not implementation-prescriptive)

- Spike branch `experiment/agent-mode-spike` @ `acd46bb` has a working end-to-end
  prototype with user-UAT confirmed by Research. Dev Engineer may use it as a
  reference; the spike branch itself will NOT be merged.
- Validation pattern for AC#5 is identical to `validate-session-destination`
  (see `SPEC_MSG_SENDTOSESSION` for error-format reference).
- Source-of-truth for "available agents" is designer's call. Expectation: all
  `.github/agents/*.agent.md` files with `user-invocable: true` in frontmatter,
  or a similar discovery mechanism. Must be justified in SPEC.

---

## Intent Gate

CR is intent-only. PM hints flag the spike branch as a reference but explicitly
defer discovery-mechanism choice to the designer. Validation pattern is an
optional reference, not a mandate. Mode is autonomous; no clarification needed.
Proceed.

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/session-agent-binding` from `develop@fdf49fc` |
| 1a. Change Document | done | CM | this file |
| 2. Impact + Design | done | syspilot.design | US_SES_AGENTBIND; 6×REQ_SES_AGENT_*; 5×SPEC_SES_AGENT_* |
| 3. UAT artifacts | done | syspilot.uat | commit `2e0a387`; `tst-session-agent-binding.md` with 10 cases (T-1..T-10); 2 advisory notes (no blocker): missing standalone T-ID for listSessionEntities agent output, T-7 observability is VS Code-UI-level only per SPEC |
| 4. Implementation | done | syspilot.implement | commit `3fb34c3`; 4 src/config files modified (schema, scanner, extension, package.json); compile clean; no new lint violations; 5 spike-vs-SPEC deviations all resolved in favor of SPEC (notably: `user-invocable: true` discovery gate enforced — spike didn't) |
| 5. MECE final | done | syspilot.mece | PASS-WITH-ADVISORIES (commit `3fb34c3` reviewed); 5 advisories all resolvable in Documentation step; sphinx clean; impl consistent with SPEC (11/11 invariants) |
| 6. Documentation | done | syspilot.docu | commit `43ce7d1`; 13/13 status → implemented; A-1..A-5 applied; README+copilot-instructions synced; sphinx clean |
| 7. Notify | pending | CM | PM + QM via Jarvis |
| 8. Merge approval | pending | PM | fix/defer/accept |
| 9. Squash-merge | pending | CM | feature → develop |
| 10. Post-merge | pending | CM | commit hash + branch name to PM |

---

## Decisions

| # | Topic | Decision |
|---|-------|----------|
| D-1 | Discovery mechanism | `.github/agents/*.agent.md` files with `user-invocable: true` in YAML frontmatter. Basename-without-`.agent.md` is the agent identifier. Rationale: file-based, no live VS Code state dependency, matches existing convention, `user-invocable` gate excludes internal agents. |
| D-2 | Frontmatter parse | Simple regex match (`/^user-invocable:\s*true\s*$/m`) — no full YAML parse. The key is always a boolean literal in agent files; adding a dependency or import for this one check is over-engineering. |
| D-3 | Manual entry option | Omitted from spec (not in CR AC). Spike included it; CR says only discovered agents + "No agent". Follow-up CR can add it. |
| D-4 | Validation scope | `jarvis_createSession` validates `agent` (blocking). `jarvis.newSession` picker only shows valid agents by construction — no separate validation in the UI path. |
| D-5 | Error format | `Agent "${agent}" is not available.\nAvailable agents: ${names}` — mirrors `REQ_MSG_DEST_ERROR` shape exactly. `(none)` when set is empty. |
| D-6 | Existing-session open | `agent` binding NOT re-applied on existing-session path (`vscode-chat-session://` UUID open). Mode was set when the session was created; re-applying would be disruptive. |
| D-7 | `listSessionEntities` output | Include `agent: ""` for sessions with no binding (empty-string sentinel). Callers treat `""` as no binding per `REQ_SES_AGENT_COMPAT AC-3`. |

---

## Engineer Reports

### syspilot.design (Impact + Design)

**Status:** complete  
**Commit:** `63370c8`

**New/modified RST files:**
- `docs/userstories/us_ses.rst` — added `US_SES_AGENTBIND`
- `docs/requirements/req_ses.rst` — added `REQ_SES_AGENT_FIELD`, `REQ_SES_AGENT_PICKER`, `REQ_SES_AGENT_DISCOVERY`, `REQ_SES_AGENT_CREATETOOL`, `REQ_SES_AGENT_VALIDATION`, `REQ_SES_AGENT_OPEN`, `REQ_SES_AGENT_COMPAT`
- `docs/design/spec_ses.rst` — added `SPEC_SES_AGENT_DISCOVERY`, `SPEC_SES_AGENT_SCHEMA`, `SPEC_SES_AGENT_PICKER`, `SPEC_SES_AGENT_CREATETOOL`, `SPEC_SES_AGENT_OPEN`

**Impact-analysis touched IDs:**
- US: `US_SES_SESSIONS` (schema + scanner + tool), `US_SES_CREATETOOL` (new agent param)
- REQ: `REQ_SES_SCHEMA`, `REQ_SES_CREATETOOL`, `REQ_SES_NEWENTITY`, `REQ_SES_LISTTOOL`, `REQ_EXP_AGENTSESSION`
- SPEC: `SPEC_SES_SCANNER`, `SPEC_SES_SCHEMA`, `SPEC_SES_CREATETOOL`, `SPEC_SES_NEWENTITY`, `SPEC_SES_TOOLS`, `SPEC_EXP_AGENTSESSION`

**Discovery mechanism chosen:** `.github/agents/*.agent.md` with `user-invocable: true` in YAML frontmatter. Agent identifier = basename without `.agent.md`. See Decision D-1/D-2.

**Error message format (unknown-agent case):**
```
Agent "syspilot.design" is not available.
Available agents: syspilot.cm, syspilot.pm, syspilot.qm, syspilot.setup
```
When no agents discoverable:
```
Agent "my-custom" is not available.
Available agents: (none)
```

**Sphinx last line:** `build succeeded.`

### syspilot.uat (UAT Protocol)

**Status:** complete  
**Commit:** `2e0a387`

10 UAT cases (T-1..T-10) covering AC-1..AC-7. 2 advisory notes: no standalone T-ID for `listSessionEntities` agent field (covered as sub-check); T-7 (open-with-mode) observability is VS Code UI-level only per SPEC. No blockers.

### syspilot.implement (Implementation)

**Status:** complete  
**Commit:** `3fb34c3`

**Files:** `schemas/session.schema.json`, `src/yamlScanner.ts`, `src/extension.ts`, `package.json`  
**Compile:** `tsc -p ./` — 0 errors  
**Lint:** pre-existing ESLint v9 baseline (missing `eslint.config.js`); no new violations  
**Tests:** no unit-test infra; UAT covers T-1..T-10

**Spike-vs-SPEC deviations (5, all resolved by following SPEC):**
1. Discovery function: spike `discoverWorkspaceAgentModes` → SPEC `discoverAgentModes`
2. Frontmatter parse: spike `js-yaml` full parse → SPEC regex `readFrontmatterBool` (no new dep)
3. Discovery gate: spike accepts any `*.agent.md` → SPEC requires `user-invocable: true` (critical: excludes internal agents like `syspilot.implement`)
4. Picker manual entry: spike adds `Enter agent name...` → SPEC D-3 omits it
5. `yamlString()` helper applied consistently across both creation paths

### syspilot.mece (MECE Final Check)

**Status:** complete — PASS-WITH-ADVISORIES  
**Commit reviewed:** `3fb34c3` (implementation)

**Verdict:** PASS-WITH-ADVISORIES — no blockers; 5 advisories all resolvable in Documentation step.

| ID | Severity | Element | Issue |
|----|----------|---------|-------|
| A-1 | advisory | `REQ_SES_SCHEMA` AC-2 | `one optional field` wording stale — `agent` is a second optional field. Update AC-2. |
| A-2 | advisory | `REQ_SES_LISTTOOL` AC-1 | Output contract omits `agent`. Update to include `agent (may be empty string)`. |
| A-3 | advisory | `SPEC_SES_SCANNER` | `EntityEntry` code block lacks `agent?: string`. Add field or cross-reference to `SPEC_SES_AGENT_SCHEMA`. |
| A-4 | advisory | `SPEC_EXP_AGENTSESSION` | Handler code block stale; `chatOpenOptions.mode` conditional not reflected. Update in Documentation step. |
| A-5 | advisory | `package.json` (impl) | `jarvis_listSessionEntities` `modelDescription` omits `agent` field. Append description. |

**Implementation consistent with SPEC:** all 11 invariants pass (discovery gate, error format, schema field, EntityEntry, tool input, mode conditional, backward compat, picker abort, no-agent omission, LM/MCP parity, validation ordering).

**Traceability:** all 7 US_SES_AGENTBIND ACs traced US→REQ→SPEC→UAT. All new REQs/SPECs link upward. No orphans.

**Sphinx build:** verified clean by CM (`python -m sphinx -b html docs docs/_build/html -W --keep-going -E` → `build succeeded.`)

**Documentation step required actions:**
- Set `:status: implemented` on US_SES_AGENTBIND, all 7 REQ_SES_AGENT_*, all 5 SPEC_SES_AGENT_*
- Apply advisories A-1..A-5

