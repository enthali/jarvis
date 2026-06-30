# Change Document: engine-restructure

**Status**: completed
**Branch**: feature/engine-restructure
**Created**: 2026-06-30
**Author**: PM
**Operation Mode**: user-guided (default)

---

## Summary

Restructure `packages/core/src/engine/` into feature subdirectories, matching the pattern already established by `apps/session/` and `engine/hooks/`. Move files as follows: `configPaths.ts`, `coreApi.ts`, `types.ts`, `treeFactory.ts`, `updateCheck.ts` → `engine/core/`; `messageQueue.ts`, `sessionLookup.ts`, `yamlScanner.ts` → `engine/sessions/`. `index.ts` stays at `engine/` root and re-exports everything. All imports across the codebase updated accordingly. No functional change — pure structural cleanup. Acceptance criterion: TypeScript compiles cleanly, all tests pass, behavior unchanged.

---

## Related Github Issues

{list of all gh issues addressed or partially addressed in this change}

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None — this is a pure structural cleanup with no functional change.

### New User Stories

None.

### Decisions

- Decision 1: **No spec changes needed** — relocating source files is an implementation detail. No US, REQ, or SPEC documents reference absolute file paths; they reference module roles (SPEC_ENG_API, SPEC_ENG_SCANNER, etc.) which are unchanged.
- Decision 2: **No artefact removal** — files are moved, not deleted. `git mv` preserves history.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories (no functional change)
- [x] No redundancies
- [x] No gaps (no new functionality)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

None — no functional change; all requirements remain satisfied.

### New Requirements

None.

### Conflicts Detected

None.

### Decisions

None.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] No new REQs needed (structural change only)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

None — no spec-level changes required. SPEC_ENG_API, SPEC_ENG_SCANNER, SPEC_ENG_TREEFACTORY, SPEC_ENG_REGISTER_KIND, SPEC_ENG_REGISTER_TOOL, SPEC_ENG_HEARTBEAT_JOBAPI, SPEC_ENG_SESSIONLIST, SPEC_ENG_TOOLREGISTRY are unchanged.

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

None.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] No spec documents need updating (no path references in specs)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

No new traceability required — pure structural refactor.

### Artefakt-Removal-Check

No artefacts removed — files relocated via `git mv` (history preserved).

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `packages/core/src/engine/configPaths.ts` (old path) | extension.ts, heartbeat.ts, coreApi.ts, types.ts, treeFactory.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/coreApi.ts` (old path) | extension.ts, coreApi.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/types.ts` (old path) | extension.ts, coreApi.ts, types.ts, treeFactory.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/treeFactory.ts` (old path) | extension.ts, coreApi.ts, treeFactory.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/updateCheck.ts` (old path) | extension.ts import updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/messageQueue.ts` (old path) | extension.ts, heartbeat.ts, messageTreeProvider.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/sessionLookup.ts` (old path) | extension.ts, heartbeat.ts, sessionLookup-wsl2.test.ts imports updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/engine/yamlScanner.ts` (old path) | extension.ts, sessionTreeProvider.ts, coreApi.ts, treeFactory.ts, types.ts, yamlScanner.ts, 8 test files imports updated ✅ | None | Previous CRs reference by role not path |

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding"

### Issues Found

None.

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
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
