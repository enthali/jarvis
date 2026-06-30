# Change Document: hook-event-router

**Status**: in-progress
**Branch**: feature/hook-event-router
**Created**: 2026-06-30
**Author**: PM
**Operation Mode**: user-guided (default)

---

## Summary

Add event routing to the Hook Engine so that incoming hook payloads are classified by `hook_event_name` and dispatched to typed handlers via an internal `on(eventName, handler)` registry. The bridge.mjs receives `--event <name>` from jarvis-hooks.json and includes it in the POST payload. Logging changes from `[Hook] Unknown {json}` to `[Hook] UserPromptSubmit`, `[Hook] PreToolUse`, etc. No functional consumer in this CR — only routing and clean logging.

---

## Related Github Issues

{list of all gh issues addressed or partially addressed in this change}

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_HOOK_OBSERVE | Observe Agent Lifecycle Hooks (MVP) | modified | Routing adds typed dispatch to the existing intake/logging flow; US_HOOK_OBSERVE AC-4 (bus-ready intake) is satisfied by this CR |
| US_HOOK_CONTROL | Control Hook Auto-Installation | referenced | No change to auto-install logic; SPEC_HOOK_AUTOINST unchanged |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_HOOK_ROUTE | Route Hook Events by Type | optional |

### Decisions

- Decision 1: **New theme `HOOK` continues** — routing is a natural evolution of the Hook Engine MVP (US_HOOK_OBSERVE), not a new theme. The `on(eventName, handler)` registry is the "bus-ready" intake promised in US_HOOK_OBSERVE AC-4.
- Decision 2: **No new US for logging format change** — the log format improvement (`[Hook] Unknown` → `[Hook] UserPromptSubmit`) is a quality improvement within US_HOOK_OBSERVE AC-2, not a new user story.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (routing satisfies US_HOOK_OBSERVE AC-4)
- [x] Gaps identified and addressed (typed dispatch was the missing piece)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_HOOK_INTAKE | US_HOOK_OBSERVE | modified | AC-4 (bus-ready intake) now satisfied by typed dispatch registry; intake contract extended with eventName routing |
| REQ_HOOK_LOG | US_HOOK_OBSERVE | modified | Log format improved: event name now extracted from payload instead of "Unknown" |
| REQ_HOOK_AUTOINST | US_HOOK_CONTROL | referenced | No change to auto-install logic |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_HOOK_ROUTE | Hook Event Routing | US_HOOK_ROUTE; REQ_HOOK_INTAKE | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1: **REQ_HOOK_INTAKE modified, not replaced** — the intake contract is extended (eventName routing added) but remains backward compatible. The "bus-ready" promise in AC-4 is now fulfilled.
- Decision 2: **REQ_HOOK_LOG modified** — the log format change is a quality improvement within the existing requirement; no new REQ needed.
- Decision 3: **New REQ_HOOK_ROUTE** — captures the routing mechanism as a distinct concern (registry, dispatch, typed handlers) that future consumers will depend on.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies (routing is the missing piece from REQ_HOOK_INTAKE AC-4)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_HOOK_INTAKE | REQ_HOOK_INTAKE | modified | HookEvent interface extended with `eventName` field; `receive()` now dispatches via registry; HTTP listener extracts `hook_event_name` from payload |
| SPEC_HOOK_LOG | REQ_HOOK_LOG | modified | Log format changed from `[Hook] Unknown` to `[Hook] <eventName>`; event name extracted from payload |
| SPEC_HOOK_CONFIG | REQ_HOOK_INTAKE | modified | `jarvis-hooks.json` updated: bridge command now includes `--event <name>` parameter for each of the 8 events |
| SPEC_HOOK_BRIDGE | REQ_HOOK_INTAKE | modified | Bridge reads `--event` argument and includes it in POST payload as `hook_event_name` |
| SPEC_HOOK_AUTOINST | REQ_HOOK_AUTOINST | referenced | No change to auto-install logic |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_HOOK_ROUTE | Hook Event Routing Registry | REQ_HOOK_ROUTE; SPEC_HOOK_INTAKE |

### Conflicts Detected

None.

### Decisions

- Decision 1: **SPEC_HOOK_INTAKE modified** — the `HookEvent` interface gains an `eventName` field (extracted from `hook_event_name` in payload). The `HookEngine.receive()` method now dispatches to registered handlers via `on(eventName, handler)` registry. The HTTP listener extracts `hook_event_name` from the incoming payload.
- Decision 2: **SPEC_HOOK_LOG modified** — the logging sink now receives the typed event with `eventName` and logs `[Hook] <eventName>` instead of `[Hook] Unknown`. The full payload is still logged for observability.
- Decision 3: **SPEC_HOOK_CONFIG modified** — the generated `jarvis-hooks.json` now includes `--event <EventName>` in each bridge command (e.g., `node .github/hooks/bridge.mjs --event UserPromptSubmit`).
- Decision 4: **SPEC_HOOK_BRIDGE modified** — the bridge script parses `--event <name>` from command line and includes it in the POST body as `hook_event_name`.
- Decision 5: **New SPEC_HOOK_ROUTE** — defines the `on(eventName, handler)` registry, the dispatch mechanism in `receive()`, and the typed handler signature. This is the "bus-ready" foundation promised in SPEC_HOOK_INTAKE.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_HOOK_OBSERVE | REQ_HOOK_INTAKE (modified) | SPEC_HOOK_INTAKE (modified) + SPEC_HOOK_LOG (modified) + SPEC_HOOK_CONFIG (modified) + SPEC_HOOK_BRIDGE (modified) | ✅ |
| US_HOOK_OBSERVE | REQ_HOOK_ROUTE (new) | SPEC_HOOK_ROUTE (new) | ✅ |
| US_HOOK_CONTROL | REQ_HOOK_AUTOINST | SPEC_HOOK_AUTOINST | ✅ |

Verified via `get_need_links.py` impact queries (US→REQ and REQ→SPEC, `--direction in`).

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

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

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
# Impact from US_HOOK_OBSERVE (incoming, depth 2)
["REQ_HOOK_AUTOINST", "REQ_HOOK_INTAKE", "REQ_HOOK_LOG", "SPEC_HOOK_BRIDGE", "SPEC_HOOK_CONFIG", "SPEC_HOOK_INTAKE", "SPEC_HOOK_LOG", "US_HOOK_CONTROL"]

# Impact from REQ_HOOK_INTAKE (incoming, depth 2)
["SPEC_HOOK_AUTOINST", "SPEC_HOOK_BRIDGE", "SPEC_HOOK_CONFIG", "SPEC_HOOK_INTAKE"]

# Impact from REQ_HOOK_LOG (incoming, depth 2)
["SPEC_HOOK_LOG"]

# Impact from SPEC_HOOK_INTAKE (incoming, depth 2)
["SPEC_HOOK_AUTOINST"]

# Impact from SPEC_HOOK_LOG (incoming, depth 2)
[]

# Impact from SPEC_HOOK_CONFIG (incoming, depth 2)
["SPEC_HOOK_AUTOINST"]

# Impact from SPEC_HOOK_BRIDGE (incoming, depth 2)
[]

# Impact from SPEC_HOOK_AUTOINST (incoming, depth 2)
[]

# Outgoing links from SPEC_HOOK_INTAKE (depth 2)
["REQ_HOOK_INTAKE", "US_HOOK_OBSERVE"]

# Outgoing links from SPEC_HOOK_LOG (depth 2)
["REQ_DEV_LOGGING", "REQ_HOOK_LOG", "SPEC_DEV_LOGCHANNEL", "US_HOOK_OBSERVE"]

# Outgoing links from SPEC_HOOK_CONFIG (depth 2)
["REQ_HOOK_INTAKE", "US_HOOK_OBSERVE"]

# Outgoing links from SPEC_HOOK_BRIDGE (depth 2)
["REQ_HOOK_INTAKE", "US_HOOK_OBSERVE"]

# Outgoing links from SPEC_HOOK_AUTOINST (depth 2)
["REQ_HOOK_AUTOINST", "REQ_HOOK_INTAKE", "SPEC_HOOK_CONFIG", "SPEC_HOOK_INTAKE", "US_HOOK_CONTROL"]

# Impact from SPEC_DEV_LOGCHANNEL (incoming, depth 2)
["SPEC_AUT_AGENTEXEC", "SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP", "SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR", "SPEC_AUT_OUTPUTCHANNEL", "SPEC_AUT_QUEUEEXEC", "SPEC_HOOK_LOG", "SPEC_REL_RETIREINSTALL", "SPEC_REL_UPDATECHECK", "SPEC_REL_UPDATECOMMAND", "SPEC_UAT_LOGGING_FILES"]
```

---

*Generated by syspilot Change Agent*
