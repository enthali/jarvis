# Change Document: marketplace-publish

**Status**: in-progress
**Branch**: feature/marketplace-publish
**Created**: 2026-06-23
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Publish the `enthali.jarvis` (core) extension to the Visual Studio Code Marketplace so new users can discover and install Jarvis directly from within VS Code without requiring a manual vsix download. The `enthali` publisher account has been created on the marketplace and a PAT (`VSCE_PAT`) has been stored as a GitHub Actions secret. This change adds the required marketplace metadata to `packages/core/package.json` (icon, keywords, categories, galleryBanner), produces a user-facing README, and extends the CI release workflow to run `vsce publish` after a successful release tag — so every future release is automatically published to the marketplace.

**Acceptance criteria (user-visible):**
- `enthali.jarvis` is findable on the VS Code Marketplace by name and keyword search
- Extension page shows a meaningful description, icon, and links to the GitHub repository
- After a release tag is pushed, the CI publishes the new version to the marketplace without manual intervention
- The existing GitHub Releases auto-update path continues to work unchanged

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_RELEASE | Extension Release | extended | Marketplace publish becomes part of the release flow |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_REL_MARKETPLACE | As a VS Code user, I want to find and install Jarvis directly from the VS Code Marketplace, so that I can discover and try it without visiting GitHub or downloading a .vsix manually | mandatory |

### Decisions

- D-1: Marketplace publish scope is `enthali.jarvis` (core) only. Add-on packages (PIM, Recorder, MCP, Suite) are deferred to a follow-up marketplace CR.
- D-2: The icon placeholder (`resources/jarvis-128.png`) is a generated solid-colour PNG. A proper icon is a future improvement.
- D-3: Publishing reuses the existing `.vsix` produced by the package step (`vsce publish --packagePath`), avoiding a double-bundle.
- D-4: The `VSCE_PAT` secret is already stored in the GitHub Actions environment; no secret management changes are needed.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (US_REL_RELEASE covers GitHub Release; US_REL_MARKETPLACE covers Marketplace discoverability — distinct)
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_REL_RELEASEACTION | US_REL_RELEASE | extended | Add marketplace publish step after GitHub Release creation |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REL_MKTMETA | Marketplace Metadata | US_REL_MARKETPLACE | mandatory |
| REQ_REL_MKTPUBLISH | Automated Marketplace Publish | US_REL_MARKETPLACE | mandatory |

### Conflicts Detected

None.

### Decisions

- D-5: `REQ_REL_RELEASEACTION` is extended (not replaced) — the GitHub Release step remains; the marketplace publish step is additive.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REL_RELEASEACTION | REQ_REL_RELEASEACTION | extended | Add `vsce publish --packagePath` step after GitHub Release |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_MKTMETA | Marketplace Metadata in package.json | REQ_REL_MKTMETA |
| SPEC_REL_MKTPUBLISH | CI Marketplace Publish Step | REQ_REL_MKTPUBLISH |

### Conflicts Detected

None.

### Decisions

- D-6: `vsce publish --packagePath packages/core/jarvis-*.vsix` reuses the already-built VSIX from the package step — no double-bundle.
- D-7: `icon` field points to `resources/jarvis-128.png` (128×128 PNG, generated placeholder). `galleryBanner.color` uses `#1e1e2e` (dark theme).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REL_RELEASE (extended) | REQ_REL_RELEASEACTION (extended) | SPEC_REL_RELEASEACTION (extended) | ✅ |
| US_REL_MARKETPLACE | REQ_REL_MKTMETA | SPEC_REL_MKTMETA | ✅ |
| US_REL_MARKETPLACE | REQ_REL_MKTPUBLISH | SPEC_REL_MKTPUBLISH | ✅ |

### Artefakt-Removal-Check

No artefacts removed in this CR.

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
