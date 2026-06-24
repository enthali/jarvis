# Change Document: extension-rename

**Status**: in-progress
**Branch**: feature/extension-rename
**Created**: 2026-06-23
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Introduce `enthali.jarvis-core` as a new marketplace-publishable package alongside
the existing `enthali.jarvis`, enabling the full Jarvis extension family to be
published to the VS Code Marketplace. The name `jarvis` is globally taken on the
marketplace; `jarvis-core` is verified free. `enthali.jarvis` continues to be
built and shipped via GitHub Releases only (it will eventually become an EOL
migration stub — that is a separate future CR). The add-on packages
(`jarvis-pim`, `jarvis-recorder`, `jarvis-mcp`) update their
`extensionDependencies` to reference `enthali.jarvis-core` instead of
`enthali.jarvis`, since new users will install via the marketplace. The CI
release workflow is split: `enthali.jarvis` vsix → GitHub Release only;
`enthali.jarvis-core` + add-ons → `vsce publish` to marketplace only.

**Acceptance criteria (user-visible):**
- A new VS Code project can install `enthali.jarvis-core` from the marketplace and get full core functionality
- Installing `enthali.jarvis-pim` from the marketplace automatically installs `enthali.jarvis-core` as a dependency
- Existing users of `enthali.jarvis` (GitHub Releases) continue to receive updates via the existing auto-update mechanism unchanged
- After a release tag is pushed, CI publishes `jarvis-core` + add-ons to the marketplace and uploads `enthali.jarvis` vsix to GitHub Releases

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MOD_INSTALL | Install Only the Capabilities I Need | extended | Core marketplace identity changes from enthali.jarvis to enthali.jarvis-core |
| US_UAT_MODULAR_INSTALL | Modular Install Acceptance Tests | modified | extensionDependencies in test scenarios updated to enthali.jarvis-core |
| US_REL_MARKETPLACE | VS Code Marketplace Discoverability | implementing | Core is now published as enthali.jarvis-core |

### New User Stories

None.

### Decisions

- D-1: `packages/core/` becomes the primary marketplace identity (`enthali.jarvis-core`). Source stays in `packages/core/src/`.
- D-2: `packages/core-gh/` is a new thin packaging-only directory that produces the legacy `enthali.jarvis` VSIX for GitHub Releases. It has no `src/` — CI copies `out/` from `packages/core/` before packaging.
- D-3: The two identities may drift over time (different READMEs, icons, eventually source). When they do, `core-gh/` gets its own `src/`. For now they share the compiled bundle.
- D-4: The EOL migration prompt for `enthali.jarvis` users is deferred to a separate future CR.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified: runtime `getExtension('enthali.jarvis')` calls in all add-ons — fixed in this CR

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MOD_CORE | US_MOD_INSTALL | modified | Core extension ID changes to enthali.jarvis-core; core-gh provides backward-compat |
| REQ_MOD_ADDONS | US_MOD_INSTALL | modified | extensionDependencies updated to enthali.jarvis-core in all add-ons |
| REQ_UAT_MODULAR_INSTALL | US_UAT_MODULAR_INSTALL | modified | Test scenario references updated |
| REQ_REL_MKTPUBLISH | US_REL_MARKETPLACE | extended | All add-ons also published to marketplace; dual-VSIX CI; core-gh GitHub Release only |

### New Requirements

None.

### Conflicts Detected

None. REQ_MOD_NOMIGRATION (no migration for monolith→modular) is not contradicted — the rename migration (enthali.jarvis → enthali.jarvis-core) is a separate future CR.

### Decisions

- D-5: `REQ_MOD_NOMIGRATION` scope is the monolith-to-modular transition. The marketplace rename migration is a distinct future concern.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All impacts link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MOD_MONOREPO | REQ_MOD_CORE | modified | Layout updated: core→jarvis-core, core-gh→jarvis (legacy) |
| SPEC_MOD_CORE_PKG | REQ_MOD_CORE | modified | Extension ID updated; core-gh companion described |
| SPEC_MOD_PIM_PKG | REQ_MOD_ADDONS | modified | extensionDependencies → enthali.jarvis-core |
| SPEC_MOD_REC_PKG | REQ_MOD_ADDONS | modified | extensionDependencies → enthali.jarvis-core |
| SPEC_MOD_MCP_PKG | REQ_MOD_ADDONS | modified | extensionDependencies → enthali.jarvis-core |
| SPEC_UAT_MODULAR_INSTALL | REQ_UAT_MODULAR_INSTALL | modified | extensionDependencies reference updated |
| SPEC_REL_MKTPUBLISH | REQ_REL_MKTPUBLISH | modified | Publish steps extended to all add-ons; core-gh is GitHub Release only |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_COREGH | Legacy GitHub Release Package (enthali.jarvis) | REQ_REL_MKTPUBLISH |

### Conflicts Detected

None.

### Decisions

- D-6: Runtime `getExtension('enthali.jarvis')` calls in pim/recorder/mcp source updated to `enthali.jarvis-core` — required for add-ons to find core at runtime.
- D-7: `packages/suite/package.json` extensionPack updated to `enthali.jarvis-core` — suite installs the marketplace edition.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All modified SPECs reflect the implementation

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MOD_INSTALL | REQ_MOD_CORE (modified) | SPEC_MOD_CORE_PKG, SPEC_MOD_MONOREPO | ✅ |
| US_MOD_INSTALL | REQ_MOD_ADDONS (modified) | SPEC_MOD_PIM_PKG, SPEC_MOD_REC_PKG, SPEC_MOD_MCP_PKG | ✅ |
| US_UAT_MODULAR_INSTALL | REQ_UAT_MODULAR_INSTALL | SPEC_UAT_MODULAR_INSTALL | ✅ |
| US_REL_MARKETPLACE | REQ_REL_MKTPUBLISH (extended) | SPEC_REL_MKTPUBLISH, SPEC_REL_COREGH (new) | ✅ |

### Artefakt-Removal-Check

The string `enthali.jarvis` (bare, without `-pim`/`-recorder`/`-mcp`/`-suite` suffix) is effectively removed as a runtime identifier for core.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `enthali.jarvis` (core extension ID) | pim/recorder/mcp `getExtension` calls — fixed | spec_mod.rst, spec_uat_modular_install.rst — fixed | docs/changes/v0.*.*/*, modular-install.md — acceptable historic stranding |
| `"jarvis": "*"` (workspace dep in add-ons) | pim/recorder/mcp package.json — fixed to `jarvis-core: "*"` | none | none |
| `from 'jarvis'` (TS imports in add-ons) | all add-on .ts files — fixed to `from 'jarvis-core'` | none | none |

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as acceptable historic stranding

### Issues Found

None.

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
