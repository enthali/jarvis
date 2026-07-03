# Change Document: message-flow-diagram

**Status**: draft
**Branch**: feature/message-flow-diagram (not yet created)
**Created**: 2026-07-02
**Author**: Research (pre-staged; PM to confirm at official kickoff)
**Operation Mode**: TBD — PM to set at official kickoff (autonomous | user-guided)

---

## Summary

Adds an interactive D3 chord-diagram visualization of inter-agent message flow, sourced from the existing `.jarvis/message-log.json` (fixed path, no new logging needed — `{destination, sender, text, timestamp}` per entry). Ships as a **separate module** (new package, analogous to `packages/pim`/`packages/recorder`, own theme `FLOW` per the `PIM`-precedent for module-boundary-aligned themes — not folded into Core's `MSG` theme), opened as a VS Code Webview Panel editor tab. Nodes = sessions/actors, edges = message counts (directional), with a client-side "Fog of Time" opacity/color fade (age-based, adjustable via an in-webview slider) and hover tooltips (message count, time range, sample text).

**Editor-group placement (extends the `experiment/editor-group-placement` model, [FI-2026-07-01-editor-group-placement.md](../../.jarvis/sessions/Research/FI-2026-07-01-editor-group-placement.md)):** the fixed "Docs" slot at column 2 generalizes to a broader **Content Tab** (column 2, fixed) shared by entity docs *and* the diagram — coexistence, not replacement (mixed tabs in one group; users with only 2 groups will see Secondary actor chats land there too until they open a 3rd group — **requires user documentation**, e.g. README Explorer Sidebar section). Clicking an actor node in the diagram opens that actor's chat in **Main** (column 1) via the existing extension↔webview `postMessage` bridge — no technical barrier despite the webview's rendering sandbox. The webview's own tab must be excluded from the dynamic "last column" count used for Secondary-actor placement.

**Other confirmed decisions:** VS Code theming via `--vscode-charts-*`/`--vscode-*` CSS custom properties (opt-in, not automatic — webviews don't inherit native theming for granular color choices); D3 vendored locally (CSP does not allow CDN fetch); entry point = icon button on the Messages tree-view title bar + a command; refresh via 5s poll of `message-log.json` (matches existing auto-delivery poll-loop pattern; delivery isn't faster than that anyway, no file-watcher needed for v1); new module needs a stable, documented path/link into the Core spec tree for `message-log.json` rather than a new registered API surface.

**Not yet decided by PM/Designer:** exact package name, precise `US_FLOW_*`/`REQ_FLOW_*`/`SPEC_FLOW_*` IDs, default time-window/data-volume cap for v1, whether Content-tab coexistence needs a first-run hint dialog vs. README-only documentation.

**Origin:** GitHub issue #11 ("Feature: Message Flow Visualization with Chord Diagram"), scoped and refined in a Research/PM discussion session on 2026-07-02 (see [FI-2026-06-28-hook-engine.md](../../.jarvis/sessions/Research/FI-2026-06-28-hook-engine.md) and [FI-2026-07-01-editor-group-placement.md](../../.jarvis/sessions/Research/FI-2026-07-01-editor-group-placement.md) for related prior work this builds on).

---

## Level 0: User Stories

**Status**: ⏳ not started

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| | | | |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| SYSPILOT_US_NEW_1 | As a..., I want..., so that... | mandatory |

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ⏳ not started

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| | | | |

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

**Status**: ⏳ not started

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| | | | |

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

**Status**: ⏳ not started

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| | | | |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| | | | |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: ...

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.*

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Pre-staged by Research (2026-07-02), based on issue #11 + Research/PM scoping discussion. Not an official CR kickoff — PM to review, confirm Operation Mode, and hand to System Designer via the normal `syspilot.cm` process.*
