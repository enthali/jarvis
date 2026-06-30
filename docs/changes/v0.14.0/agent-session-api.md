# Change Document: agent-session-api

**Status**: in-progress
**Branch**: feature/agent-session-api
**Created**: 2026-06-27
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Add a new `AgentSession` type, `AgentSessionProvider` interface, and `registerAgentSessionProvider()` / `jarvis_listAgentSessions` tool to `JarvisCoreApi`. This enables cross-add-on enumeration of all agent-session-capable entities (Sessions, Projects, Events, future types) without coupling callers to specific add-on internals. Closes GitHub Issue #4 and unblocks Issue #3 (`/freshmind` + `/housekeeping`).

**Architecture nudge (PM):** Before finalising the design, consider whether the existing registration mechanisms in `jarvis-core` (e.g. session providers, any other registered interfaces) can be consolidated into this single `AgentSessionProvider` pattern. The goal is one unified registration interface in `jarvis-core` — not a growing list of separate registration calls. PM explicitly authorises scope expansion into an interface redesign/cleanup if the Designer judges it necessary to avoid technical debt. The Designer should walk the user through the key architectural decisions interactively so the user can evaluate trade-offs before implementation begins.

---

## Related Github Issues

- **#4** — Platform API: `jarvis_listAgentSessions` + `AgentSessionProvider` registration (this CR)
- **#3** — Platform feature: `/freshmind` and `/housekeeping` (consumer of this API, next CR)

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_LISTSESSIONS | List Available Chat Sessions | referenced | Generalised by the new cross-kind tool; not modified |
| US_EXP_AGENTSESSION | Open Agent Session from Explorer | referenced | Related session capability; not modified |
| US_EXP_LISTPROJECTS | List Projects (LM Tool) | referenced | Kind-specific precedent; not modified |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_JARVISSESSIONS | Platform-Wide Session Enumeration | optional |

### Decisions

- Decision 1: **Architecture insight** — the central scanner already holds every entity of every kind (`yamlScanner.entities`). This CR **publishes that existing list**; it introduces no new scanner, provider, or registry ("no balcony").
- Decision 2: Naming — `JarvisSession` (not `AgentSession`) is the unambiguous common denominator for all three session-bearing kinds; avoids confusion with Copilot/Claude/CLI agent sessions.
- Decision 3: **KISS** — no opt-in `EntityKindConfig` marker. Every scanned entity is by construction a Jarvis session (a kind only appears if it registered a scan folder and a convention YAML was found).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (generalises kind-specific tools rather than duplicating)
- [x] Gaps identified and addressed (cross-kind enumeration was unpublished)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_LISTSESSIONS | US_MSG_LISTSESSIONS | referenced | Kind-specific chat-session tool; not modified |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ENG_SESSIONLIST | Platform Session List API | US_MSG_JARVISSESSIONS | optional |
| REQ_MSG_JARVISSESSIONS | List Jarvis Sessions LM Tool | US_MSG_JARVISSESSIONS; REQ_ENG_SESSIONLIST | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1: Split into API-layer REQ (`REQ_ENG_SESSIONLIST`, engine theme) and tool-layer REQ (`REQ_MSG_JARVISSESSIONS`, msg theme) — clean separation of platform surface vs tool wrapper.
- Decision 2: `JarvisSession` shape `{name, summary, agent, kind, folder}` mirrors existing `jarvis_listSessions`/`jarvis_listProjects` output plus `kind`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies (API + tool layers are distinct concerns)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENG_API | REQ_ENG_SESSIONLIST | modified | Added `JarvisSession` type + `listJarvisSessions()` method + AC-4a |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ENG_SESSIONLIST | Platform Session List API | REQ_ENG_SESSIONLIST |
| SPEC_MSG_JARVISSESSIONS | List Jarvis Sessions Tool | REQ_MSG_JARVISSESSIONS; REQ_ENG_SESSIONLIST; SPEC_ENG_SESSIONLIST |

### Conflicts Detected

None.

### Decisions

- Decision 1: `listJarvisSessions()` is a thin read-only projection of `scanner.entities` (maps to `JarvisSession`, normalises optional fields to empty strings).
- Decision 2: Tool registered via engine `registerTool` (dual LM + MCP), not raw `vscode.lm` — consistent with other Jarvis tools.
- Decision 3: No new scanner/provider/registry — purely additive; `JarvisCoreApi.version` stays `1`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_JARVISSESSIONS | REQ_ENG_SESSIONLIST | SPEC_ENG_API (mod) + SPEC_ENG_SESSIONLIST | ✅ |
| US_MSG_JARVISSESSIONS | REQ_MSG_JARVISSESSIONS | SPEC_MSG_JARVISSESSIONS | ✅ |

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
