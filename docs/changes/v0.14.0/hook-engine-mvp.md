# Change Document: hook-engine-mvp

**Status**: in-progress
**Branch**: feature/hook-engine-mvp
**Created**: 2026-06-28
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Introduce a Hook Engine MVP into the Jarvis extension host. The engine observes agent activity events (e.g. tool calls, chat turns) and makes them visible via the Jarvis Output Channel in VS Code. No triggered actions, no session memory injection in this MVP. The exact interface between the hook engine and VS Code is a design decision — the designer has full freedom to find the right abstraction. The API must be designed for longevity; many future features will depend on it. Acceptance criterion: agent activity is visible in the Jarvis Output Channel.

---

## Related Github Issues

- #17 Hook Engine — observe VS Code agent lifecycle events (file edits, tool calls, chat turns)

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_DEV_LOGGING | Structured Logging | referenced | Hook events log to the existing "Jarvis" Output Channel; not modified |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_HOOK_OBSERVE | Observe Agent Lifecycle Hooks (MVP) | optional |

### Decisions

- Decision 1: **New theme `HOOK`.** The Hook Engine is a domain-neutral Layer 1 foundation in `jarvis-core` (consumers: memory housekeeping, agent steering, entity flows). It is a standalone subsystem, not heartbeat automation (AUT). New theme files `us_hook.rst` / `req_hook.rst` / `spec_hook.rst` + toctree + naming-convention entry.
- Decision 2: **Real mechanism = VS Code Agent Hooks (Preview).** JSON-configured lifecycle events (8: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart, SubagentStop, Stop), received via a proxy and processed in the extension (TypeScript). Same hook interface across VS Code / Copilot CLI / Claude Code.
- Decision 3: **MVP = observe + log only.** All 8 events routed to the extension and logged; no event bus, no triggered actions, no memory injection, no per-session routing. Logger is part of the engine; the bus is inserted later between engine and sinks without changing intake.
- Decision 4: Hook engine stays in `jarvis-core` (sessions, prompt injection, session open/create are core functions).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (reuses US_DEV_LOGGING channel rather than adding one)
- [x] Gaps identified and addressed (real hook mechanism + observable scope clarified)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_DEV_LOGGING | US_DEV_LOGGING | referenced | Hook log entries use the existing channel; not modified |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_HOOK_INTAKE | Agent Hook Intake | US_HOOK_OBSERVE | optional |
| REQ_HOOK_LOG | Hook Event Logging | US_HOOK_OBSERVE; REQ_DEV_LOGGING | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1: Two REQs — intake (`REQ_HOOK_INTAKE`: proxy receives the 8 events, surfaces them typed, bus-ready) vs logging sink (`REQ_HOOK_LOG`: `[Hook]` entries on the Jarvis channel) — cleanly separated concerns.
- Decision 2: Intake is additive and structured so a future dispatch bus / subscribers slot in without changing the intake contract.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies (logging reuses REQ_DEV_LOGGING)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_DEV_LOGCHANNEL | REQ_HOOK_LOG | referenced | "Jarvis" LogOutputChannel reused for `[Hook]` entries; not modified |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_HOOK_CONFIG | Hook Configuration Self-Install | REQ_HOOK_INTAKE |
| SPEC_HOOK_BRIDGE | Hook Bridge | REQ_HOOK_INTAKE |
| SPEC_HOOK_INTAKE | Hook Intake HTTP Listener | REQ_HOOK_INTAKE |
| SPEC_HOOK_LOG | Hook Event Logging Sink | REQ_HOOK_LOG; SPEC_DEV_LOGCHANNEL |

### Conflicts Detected

None.

### Decisions

- Decision 1: **Hook config in `.jarvis/hooks/`**, not `.github/` — enabled via the `chat.hookFilesLocations` setting (confirmed in the VS Code docs). The engine self-installs the config + bridge there.
- Decision 2: **Dedicated HTTP listener in core** on an **ephemeral port** (`server.listen(0)`, OS-assigned), independent of the MCP server. Ephemeral over fixed-port because the user runs 3–5 parallel VS Code instances; the bound port is published to `.jarvis/hooks/port` so each instance's bridge finds its own listener (per-workspace → naturally collision-free). Chosen over file-spool because the future control path (continue/block/permissionDecision) needs request/response — file-spool would be a throwaway dead-end with no reuse.
- Decision 3: **Node bridge** (`bridge.mjs`) — no Python dependency; stdlib-only; cross-platform via forward slashes (+ `windows` override). WSL2/Linux multi-host is a known follow-up.
- Decision 4: **Non-blocking is a hard guarantee** — the bridge always returns exit 0 + `{"continue": true}`, even on transport failure; it never influences the agent. Refined principle: blocking is **subscriber-conditional** — the bridge only waits for events with a *deciding* subscriber; in the MVP the only subscriber is the logger (pure sink), so all events return immediately. Agent-influencing output is reserved for future layers (JarvisAgentSessions); multi-subscriber decision-merge is a known Layer-2 concern.
- Decision 5: **Bus-ready intake** — `HookEngine.receive()` is the stable contract; the MVP calls the logger sink directly, a future bus/subscribers slot in behind it without changing the bridge or listener.
- Decision 6: **X-as-Code, in the repo.** The `chat.hookFilesLocations` entry is written to **workspace** settings (`.vscode/settings.json`, in-repo, versioned), merged not overwritten — never user/machine settings. Keeps the whole hook wiring in the repo, no host pollution.
- Decision 7: **Known/deferred:** agent-editable `bridge.mjs` is a documented security consideration (protect hook scripts from unattended edits); teardown/cleanup on disable is deferred (stale config is harmless).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_HOOK_OBSERVE | REQ_HOOK_INTAKE | SPEC_HOOK_CONFIG + SPEC_HOOK_BRIDGE + SPEC_HOOK_INTAKE | ✅ |
| US_HOOK_OBSERVE | REQ_HOOK_LOG | SPEC_HOOK_LOG | ✅ |

Verified via `get_need_links.py` impact queries (US→REQ and REQ→SPEC, `--direction in`).
|------------|--------------|--------|-----------|
| US_xxx | REQ_xxx | SPEC_xxx | ✅ |
| SYSPILOT_US_NEW_1 | SYSPILOT_REQ_NEW_1 | SYSPILOT_SPEC_NEW_1 | ✅ |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `{artefact name}` | {files + lines fixed / none} | {files + lines fixed / none} | {count — acceptable historic stranding} |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: ...
- [ ] Issue 2: ...

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** {DATE}

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L? | {ID} | {description} | high / medium / low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now / defer / accept-as-is | {rationale} |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
