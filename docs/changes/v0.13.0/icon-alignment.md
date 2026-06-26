# Change Document: icon-alignment

**Status**: approved
**Branch**: feature/icon-alignment
**Created**: 2026-06-24
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Align the VS Code activity bar icon with the marketplace icon. Currently, the marketplace shows a generic "J" icon while VS Code displays a circle with a play button (from `resources/jarvis.svg`). This change will ensure consistent branding across both surfaces by updating the activity bar icon to match the marketplace "J" icon.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_PKGCONTRACT | Extension Package Contract | linked-from | Icon consistency requirement added at REQ/SPEC level |

### New User Stories

None — icon alignment is a branding consistency requirement, not a new capability.

### Decisions

- Decision 1: Activity bar icon will use the same "J" icon as the marketplace
- Decision 2: Icon format will be SVG for activity bar, PNG for marketplace (128×128)

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_REL_PKGCONTRACT | US_REL_PKGCONTRACT | modified | AC-8 updated: PNG generated from single-source SVG |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REL_ICONALIGN | Activity Bar Icon Alignment | US_REL_PKGCONTRACT | mandatory |

### Conflicts Detected

None.

### Decisions

- Decision 1: Activity bar icon will use the same "J" icon as the marketplace
- Decision 2: Icon format will be SVG for activity bar, PNG for marketplace (128×128)
- Decision 3: The "J" icon will be a monogram-style letter J (to be designed)

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REL_PKGCONTRACT | REQ_REL_PKGCONTRACT | modified | AC-8 updated: PNG generated via script |
| SPEC_REL_MKTMETA | REQ_REL_MKTMETA | modified | Icon description updated from placeholder to play-triangle + J |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_ICONALIGN | Icon Generation and Alignment | REQ_REL_ICONALIGN; REQ_REL_PKGCONTRACT |

### Conflicts Detected

None.

### Decisions

- Decision 1: Activity bar icon will use the same "J" icon as the marketplace
- Decision 2: Icon format will be SVG for activity bar, PNG for marketplace (128×128)
- Decision 3: The "J" icon will be a monogram-style letter J (to be designed)
- Decision 4: Visual concept is a **right-pointing play triangle** with a **J inside** — "go play with Jarvis agents"
- Decision 5: Activity bar SVG: monochromatic triangle outline + J path (stroke-based, `currentColor`)
- Decision 6: Marketplace icon: blue filled triangle + white J (matching the same shape)
- Decision 7: J is positioned for optical balance within the triangle (slightly left of geometric center)
- Decision 8: J uses a left-extending serif at top, vertical stem, and curved bottom-left hook
- Decision 9: `resources/jarvis.svg` is the **single source of truth** — all derived icons are generated
- Decision 10: `scripts/generate-icons.mjs` copies SVG to packages + generates marketplace PNG via `sharp`
- Decision 11: Generated artifacts are committed to git — no CI pipeline change needed; re-run script on demand

### Open Design Questions

~~1. What is the right visual concept for a "J"-based activity bar icon that feels branded and interesting?~~
→ Resolved: Play triangle + J inside

~~2. Should it reference the circle from the marketplace icon, or stand on its own?~~
→ Resolved: Replaces the circle entirely — both icons become triangle-based

~~3. Are there visual elements from the Jarvis concept (assistant, agent, sessions) worth incorporating?~~
→ Resolved: The "play" metaphor suggests action/running agents

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
| US_REL_PKGCONTRACT | REQ_REL_ICONALIGN | SPEC_REL_ICONALIGN | ✅ |
| US_REL_PKGCONTRACT | REQ_REL_MKTMETA | SPEC_REL_MKTMETA | ✅ |

### Artefakt-Removal-Check

N/A — no artefacts removed. Old icon files were replaced in-place (same filenames).

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
