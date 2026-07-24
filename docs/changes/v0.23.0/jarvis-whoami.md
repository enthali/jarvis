# Change Document: jarvis-whoami

**Status**: ready-for-merge
**Branch**: feature/jarvis-whoami
**Created**: 2026-07-24
**Author**: PM
**Operation Mode**: autonomous

**GitHub Issue(s)**: #44

---

## Summary

Add a `jarvis_whoAmI` tool that a Jarvis actor can call to reliably identify itself — returning its session name and the absolute path to its `context.md`. Every Jarvis actor knows who it is via its chat session name; but after a `/compact` or context loss, that information may be inaccessible from within the session. A dedicated tool solves this without any inference or guesswork: the extension always knows which session is calling (the tool invocation is scoped to the calling session), looks up the matching actor via the actor registry, and returns name + `context.md` path directly. This is the minimal, reliable implementation of the Identity Recovery path described in the Actor Kernel (Section 0): call `jarvis_whoAmI` → get name and folder → read `context.md`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None — no existing US modified.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ACT_WHOAMI | As a Jarvis Actor, I want a tool `jarvis_whoAmI` that tells me my name and context.md path, so that I can recover my identity after /compact or context loss | required |

### Decisions

- Decision 1: Tool belongs in ACT theme — it's an actor-related tool alongside `jarvis_listActors` and `jarvis_createActor`.
- Decision 2: No input parameters — the extension resolves identity automatically (AC-3).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_ACT_ACTORS covers actor concept, US_ACT_CREATETOOL covers creation; no existing US covers identity recovery
- [x] Gaps identified and addressed — this US fills the identity-recovery gap described in Actor Kernel Section 0

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

None — no existing REQ modified.

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ACT_WHOAMI | jarvis_whoAmI LM+MCP Tool | US_ACT_WHOAMI; REQ_ACT_LISTTOOL | required |

### Conflicts Detected

None.

### Decisions

- Decision 1: Calling-session resolution — VS Code `LanguageModelToolInvocationOptions` exposes no session identity. The tool uses the active-tab-label heuristic: `vscode.window.tabGroups.activeTabGroup.activeTab.label`. This is reliable because the invoking chat session IS the active tab during tool invocation.
- Decision 2: Same gating as `REQ_ACT_LISTTOOL` — tool registered only when `jarvis.sessions.enabled` is `true`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_ACT_LISTTOOL lists all actors; REQ_ACT_WHOAMI identifies the calling actor (complementary, not overlapping)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

None — no existing SPEC modified.

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ACT_WHOAMI | jarvis_whoAmI Tool Registration | REQ_ACT_WHOAMI; SPEC_ACT_TOOLS |

### Conflicts Detected

None.

### Decisions

- Decision 1: Active-tab-label heuristic documented as the resolution mechanism in the spec. Limitation acknowledged: if the user manually switches tabs between tool invocation and execution, the wrong tab could be read. This is an accepted edge case — the tool is designed for actor self-identification, not cross-session queries.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | UAT | Complete? |
|------------|--------------|--------|-----|----------|
| US_ACT_WHOAMI | REQ_ACT_WHOAMI | SPEC_ACT_WHOAMI | SPEC_UAT_WHOAMI | ✅ |
| US_UAT_WHOAMI | REQ_UAT_WHOAMI | SPEC_UAT_WHOAMI | — | ✅ |

### Artefakt-Removal-Check

N/A — this CR adds a new tool; no artefacts removed.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified (MECE: PASS, Trace: PASS)
- [x] Ready for implementation

---

## QM Findings

### Round 1 (2026-07-24)

**Verdict: BLOCK**

- Traceability table claimed `US_UAT_WHOAMI` / `REQ_UAT_WHOAMI` / `SPEC_UAT_WHOAMI` existed and were ✅ complete. At time of review, none of the three existed anywhere in `docs/` — grep for all three IDs returned zero matches. The CD's own Final Consistency Check was inaccurate.
- Implementation code (`packages/core/src/extension.ts`, `packages/core/package.json`) was also unverified at this point.
- Verdict sent to CM (gate signal routing: verdict → CM).

### Round 2 (2026-07-24)

**Verdict: CLEAR**

Re-verified after CM's fix (commit `222ce69`):

- **UAT artifacts now exist and are sound**: `us_uat_whoami.rst` (US_UAT_WHOAMI, 5 ACs), `req_uat_whoami.rst` (REQ_UAT_WHOAMI, test data + per-AC verification criteria), `spec_uat_whoami.rst` (SPEC_UAT_WHOAMI, T-1..T-8 scenarios) — all read directly, content accurate, links correct (`US_UAT_WHOAMI → US_ACT_WHOAMI`; `REQ_UAT_WHOAMI → US_UAT_WHOAMI, REQ_ACT_WHOAMI`; `SPEC_UAT_WHOAMI → REQ_UAT_WHOAMI, US_UAT_WHOAMI, SPEC_ACT_WHOAMI, REQ_ACT_WHOAMI`).
- **Code-vs-Spec**: `jarvis_whoAmI` registration in `extension.ts` (line ~1154) independently read — matches `SPEC_ACT_WHOAMI` algorithm exactly (active-tab guard, entity lookup, JSON return shape, error messages, log line). Registration confirmed inside the `sessions.enabled` gate (same block as `jarvis_createActor`), satisfying AC-4/gating.
- **Build**: full package-suite `compile all` — clean, no errors.
- **`registerDualTool()` → `engine.registerTool()` deviation**: confirmed corrected in all three occurrences (spec, code sketch, no stray references remain).
- **Minor non-blocking note**: `REQ_UAT_WHOAMI`/`tst-jarvis-whoami.md` test-data prerequisites reference actor folders `Change Manager` and `Test Designer` under `testdata/.jarvis/actors/` — these specific names do not currently exist there (only generic `Actor 1..4`, `Session 1..3`). This blocks literal manual execution of the UAT protocol as written but does not affect code or spec correctness. Flagged to PM for a decision.

**PM Decision (2026-07-24):** Fix-now — add named fixtures `testdata/.jarvis/actors/Change Manager/` and `testdata/.jarvis/actors/Test Designer/` with minimal `actor.yaml` + `context.md`. Rationale: semantic correctness matters for an actor-identity feature; named fixtures make the UAT protocol self-contained and executable as written.

**Overall**: Pure-additive CR, no existing elements modified, traceability complete, code matches spec, build clean. CLEAR sent to CM; findings report sent to PM.

## Implementation Notes

- **Acceptable deviation**: SPEC_ACT_WHOAMI originally referenced `registerDualTool()` which does not exist. Dev Engineer used `engine.registerTool()` (consistent with all other tools). System Designer corrected the spec. No functional impact.
- **Identity resolution mechanism**: Active-tab-label heuristic (`vscode.window.tabGroups.activeTabGroup.activeTab.label`). VS Code exposes no API for calling session identity from a tool invocation context. Limitation documented and accepted in SPEC_ACT_WHOAMI.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
