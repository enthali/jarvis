# Change Document: extension-pkg-contract

**Status**: in-progress
**Branch**: feature/extension-pkg-contract
**Created**: 2026-06-24
**Author**: PM
**Operation Mode**: user-guided

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

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_RELEASE | Extension Release | linked-from | `US_REL_PKGCONTRACT` links to it |
| US_REL_MARKETPLACE | VS Code Marketplace Discoverability | linked-from | `US_REL_PKGCONTRACT` links to it |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_REL_PKGCONTRACT | Extension Package Contract | mandatory |

### Decisions

- New developer-facing US preferred over reusing `US_REL_MARKETPLACE` (user-facing); the build contract is a standing architectural rule, not a one-time fix.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — complements `US_REL_RELEASE` and `US_REL_MARKETPLACE` at a different concern level
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_REL_RELEASEACTION | US_REL_RELEASE | modified | Added link to `REQ_REL_PKGCONTRACT` |
| REQ_REL_VSCEPKG | US_REL_RELEASE | modified | Added link to `REQ_REL_PKGCONTRACT` |
| REQ_REL_MKTPUBLISH | US_REL_MARKETPLACE | modified | Added link to `REQ_REL_PKGCONTRACT` |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REL_PKGCONTRACT | Extension Package Contract | US_REL_PKGCONTRACT | mandatory |

### Conflicts Detected

None.

### Decisions

- `REQ_REL_PKGCONTRACT` captures the structural prerequisites (build.js, .vscodeignore, scripts, esbuild devDep) that `REQ_REL_VSCEPKG` and `REQ_REL_RELEASEACTION` implicitly depend on.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — `REQ_REL_VSCEPKG` covers the vsce invocation; `REQ_REL_PKGCONTRACT` covers the structural prerequisites
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MOD_CORE_PKG | REQ_MOD_CORE | modified | Added link to `SPEC_REL_PKGCONTRACT` |
| SPEC_MOD_PIM_PKG | REQ_MOD_ADDONS | modified | Added link to `SPEC_REL_PKGCONTRACT` |
| SPEC_MOD_REC_PKG | REQ_MOD_ADDONS | modified | Added link to `SPEC_REL_PKGCONTRACT` |
| SPEC_MOD_MCP_PKG | REQ_MOD_ADDONS | modified | Added link to `SPEC_REL_PKGCONTRACT` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_PKGCONTRACT | Extension Package Contract | REQ_REL_PKGCONTRACT |

### Conflicts Detected

None.

### Decisions

- `external: ['vscode', 'jarvis-core']` in all add-on `build.js` scripts — `jarvis-core` is a workspace peer resolved at runtime by the VS Code extension host; bundling it would violate the extension host contract.
- `@modelcontextprotocol/sdk` is **inlined** in the MCP bundle — it is a true production dependency with no runtime provider.
- PIM and Recorder have no production deps beyond `jarvis-core`; their `build.js` is structurally identical to core minus the sql-wasm WASM copy step.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REL_PKGCONTRACT | REQ_REL_PKGCONTRACT | SPEC_REL_PKGCONTRACT | ✅ |
| US_REL_RELEASE | REQ_REL_RELEASEACTION, REQ_REL_VSCEPKG | SPEC_MOD_CORE_PKG, SPEC_MOD_PIM_PKG, SPEC_MOD_REC_PKG, SPEC_MOD_MCP_PKG | ✅ (link added) |
| US_REL_MARKETPLACE | REQ_REL_MKTPUBLISH | — | ✅ (link added) |

### Artefakt-Removal-Check

This CR adds artefacts only (new files: `build.js` × 3, `.vscodeignore` × 2). No artefacts removed. Check not applicable.

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
