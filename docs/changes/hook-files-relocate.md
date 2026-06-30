# Change Document: hook-files-relocate

**Status**: in-progress
**Branch**: feature/hook-files-relocate
**Created**: 2026-06-30
**Author**: PM
**Operation Mode**: user-guided (default)

---

## Summary

Relocate Hook Engine files from `packages/core/src/` root into `packages/core/src/engine/hooks/` subdirectory, matching the pattern used in `apps/` where each feature has its own folder. Moves `hookConfig.ts`, `hookEngine.ts`, and `hookIntake.ts` into `engine/hooks/`. Updates all imports in `extension.ts` accordingly. No functional change — pure structural cleanup. Acceptance criterion: TypeScript compiles cleanly, all tests pass, behavior unchanged.

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

- Decision 1: **No spec changes needed** — relocating source files is an implementation detail. No US, REQ, or SPEC documents reference absolute file paths; they reference module roles (SPEC_HOOK_CONFIG, SPEC_HOOK_BRIDGE, etc.) which are unchanged.
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

None — no spec-level changes required. SPEC_HOOK_CONFIG, SPEC_HOOK_BRIDGE, SPEC_HOOK_INTAKE, SPEC_HOOK_LOG, SPEC_HOOK_ROUTE, SPEC_HOOK_AUTOINST are unchanged.

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
| `packages/core/src/hookEngine.ts` (old path) | extension.ts import updated ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/hookIntake.ts` (old path) | hookEngine.ts (in same folder — no change needed) ✅ | None | Previous CRs reference by role not path |
| `packages/core/src/hookConfig.ts` (old path) | extension.ts import updated ✅ | None | Previous CRs reference by role not path |

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

| ID | Title | Links |
|----|-------|-------|
| SYSPILOT_SPEC_NEW_1 | ... | REQ_xxx, SYSPILOT_REQ_NEW_1 |

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
