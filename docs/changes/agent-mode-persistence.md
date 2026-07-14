# Change Document: agent-mode-persistence

**Status**: in-progress
**Branch**: feature/agent-mode-persistence
**Created**: 2026-07-14
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

GitHub Copilot Chat sometimes loses the selected Agent Mode (custom agent,
e.g. `.github/agents/*.agent.md`) for an already-open chat session/tab. The
most reliably reproducible trigger is a VS Code window reload while an agent
chat session is already open — after reload, the chat tab reopens but Agent
Mode is no longer active. This has also been observed at other times, less
reliably. This matters because most of our agents are addressed via the
async messaging system (`jarvis_sendMessage`/`jarvis_receiveMessage`) — if
the receiving chat tab has silently lost Agent Mode, the agent may respond
as a generic assistant instead of running its intended workflow, without any
obvious signal that something is wrong. A likely related upstream bug is
tracked at microsoft/vscode#317276. Acceptance criterion: the window-reload
trigger no longer causes Agent Mode loss, and/or a documented,
user-actionable detection/recovery mechanism exists if a full fix isn't
possible within VS Code's current extension API surface. Tracked as GitHub
Issue #25.

---

## Level 0: User Stories

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_abc | ... | modified | ... |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_xxx | As a..., I want..., so that... | mandatory |

### Decisions

- Decision 1: ...
- Decision 2: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_abc | US_abc | modified | ... |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_xxx | ... | US_xxx | mandatory |

### Conflicts Detected

- ⚠️ REQ_xxx vs REQ_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_abc | REQ_abc | modified | ... |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_xxx | ... | REQ_abc, REQ_xxx |

### Conflicts Detected

- ⚠️ SPEC_xxx vs SPEC_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ⏳ not started | ✅ passed | ❌ failed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_xxx | REQ_xxx | SPEC_xxx | ✅ |
...

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
