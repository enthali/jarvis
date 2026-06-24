# Change Document: extension-pkg-contract

**Status**: in-progress
**Branch**: feature/extension-pkg-contract
**Created**: 2026-06-24
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

The v0.11.0 CI failure (missing `build.js` in add-on packages) exposed a spec gap: there is no authoritative definition of what a publishable Jarvis extension package must contain. Each package spec describes its own feature behaviour but not the structural prerequisites for building and publishing. This change introduces a reusable "extension package contract" spec element that defines exactly what every publishable Jarvis extension SHALL have (esbuild `build.js`, `.vscodeignore`, `vscode:prepublish` invoking compile+bundle, required `package.json` marketplace fields). All existing per-package specs link to this contract. The add-on `build.js` scripts are then added as the concrete implementation that satisfies the contract. Future packages are spec-compliant from day one, and QM can verify structural compliance against the contract rather than relying on implicit convention.

**Acceptance criteria (user-visible / verifiable):**
- A new spec element `SPEC_REL_PKGCONTRACT` (or equivalent ID) exists in `spec_rel.rst` and enumerates the mandatory structural elements of a publishable extension package
- `SPEC_MOD_CORE_PKG`, `SPEC_MOD_PIM_PKG`, `SPEC_MOD_REC_PKG`, `SPEC_MOD_MCP_PKG` each link to `SPEC_REL_PKGCONTRACT`
- `packages/pim`, `packages/recorder`, `packages/mcp` each have a `build.js` that satisfies the contract
- `npm run bundle` succeeds in all three add-on packages
- `vsce package --no-dependencies` produces a valid vsix for each add-on
- CI release pipeline completes end-to-end without error (validated locally before merge)

---

## Level 0: User Stories

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_xxx | ... | modified | ... |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| SYSPILOT_US_NEW_1 | As a..., I want..., so that... | mandatory |

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
| REQ_xxx | US_xxx | modified | ... |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| SYSPILOT_REQ_NEW_1 | ... | US_xxx | mandatory |

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
| SPEC_xxx | REQ_xxx | modified | ... |

### New Design Elements

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
