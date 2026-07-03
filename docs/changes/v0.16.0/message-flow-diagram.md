# Change Document: message-flow-diagram

**Status**: design-approved (PM approved 2026-07-03, SPEC_MOD_SUITE folded in per PM reversal)
**Branch**: feature/message-flow-diagram
**Created**: 2026-07-02
**Author**: Research (pre-staged), PM (kickoff confirmed 2026-07-03)
**Operation Mode**: user-guided — System Designer pauses after Level 2 (design complete) for user feedback before Dev Engineer starts implementation.

---

## Summary

Adds an interactive D3 chord-diagram visualization of inter-agent message flow, sourced from the existing `.jarvis/message-log.json` (fixed path, no new logging needed — `{destination, sender, text, timestamp}` per entry). Ships as a **separate module** (new package, analogous to `packages/pim`/`packages/recorder`, own theme `FLOW` per the `PIM`-precedent for module-boundary-aligned themes — not folded into Core's `MSG` theme), opened as a VS Code Webview Panel editor tab. Nodes = sessions/actors, edges = message counts (directional), with a client-side "Fog of Time" opacity/color fade (age-based, adjustable via an in-webview slider) and hover tooltips (message count, time range, sample text).

**Editor-group placement (extends the `experiment/editor-group-placement` model, [FI-2026-07-01-editor-group-placement.md](../../.jarvis/sessions/Research/FI-2026-07-01-editor-group-placement.md)):** the fixed "Docs" slot at column 2 generalizes to a broader **Content Tab** (column 2, fixed) shared by entity docs *and* the diagram — coexistence, not replacement (mixed tabs in one group; users with only 2 groups will see Secondary actor chats land there too until they open a 3rd group — **requires user documentation**, e.g. README Explorer Sidebar section). Clicking an actor node in the diagram opens that actor's chat in **Main** (column 1) via the existing extension↔webview `postMessage` bridge — no technical barrier despite the webview's rendering sandbox. The webview's own tab must be excluded from the dynamic "last column" count used for Secondary-actor placement.

**Other confirmed decisions:** VS Code theming via `--vscode-charts-*`/`--vscode-*` CSS custom properties (opt-in, not automatic — webviews don't inherit native theming for granular color choices); D3 vendored locally (CSP does not allow CDN fetch); entry point = icon button on the Messages tree-view title bar + a command; refresh via 5s poll of `message-log.json` (matches existing auto-delivery poll-loop pattern; delivery isn't faster than that anyway, no file-watcher needed for v1); new module needs a stable, documented path/link into the Core spec tree for `message-log.json` rather than a new registered API surface.

**Not yet decided by PM/Designer:** ~~exact package name, precise `US_FLOW_*`/`REQ_FLOW_*`/`SPEC_FLOW_*` IDs, default time-window/data-volume cap for v1, whether Content-tab coexistence needs a first-run hint dialog vs. README-only documentation.~~ **Resolved during design (see Decisions below).**

**Origin:** GitHub issue #11 ("Feature: Message Flow Visualization with Chord Diagram"), scoped and refined in a Research/PM discussion session on 2026-07-02 (see [FI-2026-06-28-hook-engine.md](../../.jarvis/sessions/Research/FI-2026-06-28-hook-engine.md) and [FI-2026-07-01-editor-group-placement.md](../../.jarvis/sessions/Research/FI-2026-07-01-editor-group-placement.md) for related prior work this builds on).

---

## Level 0: User Stories

**Status**: ✅ complete

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_EDITORPLACEMENT | Editor-Group Placement Model | amended | AC-2 reworded: "Docs" column renamed **Content** column to reflect it now also hosts the diagram Webview Panel (coexisting, not replacing entity docs). |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_FLOW_CHORDVIEW | Message Flow Chord Diagram | optional |

### Decisions

- New theme: **FLOW** (added to `docs/namingconventions.rst`) — "Message Flow Visualization", per the `PIM`/`HOOK` precedent of module-boundary-aligned themes.
- Single new story (`US_FLOW_CHORDVIEW`) covers the whole feature at story level; placement/coexistence detail is pushed to REQ level (extending `US_MSG_EDITORPLACEMENT`) rather than duplicated as a second story.
- Links: `US_FLOW_CHORDVIEW` → `US_EXP_SIDEBAR` (entry point: tree-view title button), `US_MSG_CHATQUEUE` (data domain), `US_MSG_EDITORPLACEMENT` (actor-click placement reuse).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (checked against `US_MSG_*`, `US_PIM_CATEGORIES`, `US_EXP_SIDEBAR` — no overlapping story covers diagram visualization)
- [x] Gaps identified and addressed (none found)

---

## Level 1: Requirements

**Status**: ✅ complete

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_EDITORPLACEMENT | US_MSG_EDITORPLACEMENT | amended | AC-2 reworded (Docs → Content); new AC-11: diagram panel targets the same fixed Content column, webview identified by `viewType` (not URI/session-name), Secondary-column math unaffected since Content is already floored at column 2. |
| REQ_MOD_ADDONS | US_MOD_INSTALL | amended | New AC-6: `enthali.jarvis-flow` as a 4th separately-installable add-on. |
| REQ_MOD_ZEROTRACE | US_MOD_INSTALL | amended | New AC-6: zero-trace guarantee extended to the flow add-on's contributions. |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_FLOW_PACKAGE | Flow Add-on Package | US_FLOW_CHORDVIEW; REQ_MOD_ADDONS | optional |
| REQ_FLOW_DATASOURCE | Message Flow Data Source | US_FLOW_CHORDVIEW; REQ_MSG_LOGSETTING | optional |
| REQ_FLOW_CHORDVIEW | Chord Diagram Visualization | US_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE | optional |
| REQ_FLOW_WEBVIEWPANEL | Message Flow Webview Panel | US_FLOW_CHORDVIEW; REQ_FLOW_CHORDVIEW; REQ_MSG_EDITORPLACEMENT; REQ_EXP_TREEVIEW | optional |
| REQ_FLOW_ACTORCLICK | Actor Node Click Opens Chat | US_FLOW_CHORDVIEW; REQ_FLOW_WEBVIEWPANEL; REQ_MSG_EDITORPLACEMENT; REQ_MSG_SESSIONLOOKUP | optional |

### Conflicts Detected

- None. `REQ_MSG_EDITORPLACEMENT`'s existing 3-target model (Main/Docs→Content/Secondary) already generalizes cleanly to a 4th tab type sharing the Content column; no restructuring of the placement model itself was needed.

### Decisions

- **Package name**: `packages/flow` → extension id `enthali.jarvis-flow` (mirrors `jarvis-pim`/`jarvis-recorder` naming).
- **IDs**: `REQ_FLOW_PACKAGE`, `REQ_FLOW_DATASOURCE`, `REQ_FLOW_CHORDVIEW`, `REQ_FLOW_WEBVIEWPANEL`, `REQ_FLOW_ACTORCLICK` (mirrored 1:1 at SPEC level, see Level 2).
- **Default volume cap (v1)**: most recent 500 entries, no time-based boundary (`REQ_FLOW_DATASOURCE` AC-2) — a fixed default, no new setting introduced in this CR. Revised during user review from an earlier 30-day/2,000-entry combined cap: a purely entry-count cap avoids hiding an older/idle project's message history behind a rolling time window, while still bounding render cost.
- **First-run hint vs. README-only**: **README-only** (`REQ_MSG_EDITORPLACEMENT` AC-11) — no in-app first-run dialog. Rationale: no other feature in this codebase uses first-run dialogs; keeps v1 scope small; the coexistence behavior is a one-time layout curiosity, not a recurring decision point for the user.
- **Webview tab exclusion from Secondary-column math**: resolved as a non-issue rather than requiring new filtering code — the diagram panel is always opened at the fixed `DOCS_COLUMN`/Content column (never via `resolveSecondaryColumn()`), and since Content already floors `Math.max(2, ...)` at column 2, no group-count corruption is possible. Documented explicitly in `SPEC_MSG_EDITORPLACEMENT` to prevent a future Dev Engineer from routing the panel through `resolveSecondaryColumn()` by mistake.
- **In scope, folded into this CR per PM decision**: `SPEC_MOD_SUITE` (the `enthali.jarvis-suite` extension pack) amended to include `jarvis-flow` alongside the existing 4 extensions. Suite-pack update ships alongside jarvis-flow in the same release, so no "references unpublished package" concern. System Designer to amend design accordingly.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (all 5 new REQs link to `US_FLOW_CHORDVIEW`)

---

## Level 2: Design

**Status**: ✅ complete

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_EDITORPLACEMENT | REQ_MSG_EDITORPLACEMENT | amended | `DOCS_COLUMN` constant annotated as "Content" column; `resolveSecondaryColumn()` design note explains why the diagram panel needs no special-case exclusion logic; `openAtDocs` section cross-references the panel's analogous fixed-column `createWebviewPanel` call. |
| SPEC_MOD_MONOREPO | REQ_MOD_ADDONS | amended | Layout listing gains `packages/flow`; "three extension packages" → "four". |
| SPEC_MOD_SUITE | REQ_MOD_ADDONS; REQ_FLOW_PACKAGE | amended | Amendment #2 (post-PM-approval reversal): suite pack description and AC-1/AC-3 updated from 4 to 5 extensions, `jarvis-flow` added to the referenced list. |
| SPEC_DEV_LAUNCHCONFIG | REQ_DEV_LAUNCHCONFIG | amended | Amendment #3 (pre-existing drift closed): rewritten from the stale pre-monorepo single-config description to the actual 5-tier `launch.json`/`tasks.json` structure, including the Flow package added by this CR. |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MOD_FLOW_PKG | Flow Package | REQ_FLOW_PACKAGE; REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; SPEC_REL_PKGCONTRACT |
| SPEC_FLOW_DATASERVICE | Flow Data Service | REQ_FLOW_DATASOURCE; SPEC_MSG_LOGSETTING |
| SPEC_FLOW_WEBVIEW | Flow Webview Panel | REQ_FLOW_WEBVIEWPANEL; SPEC_FLOW_DATASERVICE; SPEC_MSG_EDITORPLACEMENT |
| SPEC_FLOW_CHORDRENDER | Chord Diagram Renderer | REQ_FLOW_CHORDVIEW; SPEC_FLOW_WEBVIEW |
| SPEC_FLOW_ACTORCLICK | Actor Node Click Bridge | REQ_FLOW_ACTORCLICK; SPEC_FLOW_CHORDRENDER; SPEC_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP |

### Conflicts Detected

- None.

### Decisions

- The diagram panel is created via `vscode.window.createWebviewPanel(FLOW_VIEWTYPE, ..., DOCS_COLUMN, ...)` directly at the fixed column, exactly mirroring `openAtDocs`'s pattern — no new placement helper function needed in `SPEC_MSG_EDITORPLACEMENT` itself.
- `handleActorClick` (`SPEC_FLOW_ACTORCLICK`) reuses `openAtMain`/`lookupSessionUUID` from the core's exported engine surface unmodified — no Flow-specific branch added to the placement helpers, keeping the core placement logic single-owned.
- Fog-of-Time fade and the slider are purely client-side rendering parameters (`opacityFor()`) — they never trigger a new data fetch, keeping the 5 s poll as the only data-refresh path.
- **Amendment (post-approval, PM reversal)**: `SPEC_MOD_SUITE` updated to list `jarvis-flow` as the 5th extension in the suite pack, per PM's explicit instruction to fold suite-pack inclusion into this CR rather than defer it. `SPEC_MOD_FLOW_PKG`'s own links are unchanged — the suite pack references the flow package, not vice versa, consistent with how PIM/recorder/MCP are referenced.
- **Amendment (implementation deviation, Dev Engineer commit `2d18c43`)**: `SPEC_FLOW_ACTORCLICK`'s code sample assumed `lookupSessionUUID`/`openAtMain` were reachable via `JarvisCoreApi`'s exports — they aren't (`openAtMain` is a private closure in core's `extension.ts`; `lookupSessionUUID` is re-exported from `engine/index.ts` only as a type, not a value). Dev Engineer's workaround — invoking the already-registered `jarvis.openMessageSession` command via `vscode.commands.executeCommand` instead of calling the functions directly — achieves identical reuse (no Flow-specific placement/lookup logic, no `JarvisCoreApi` change) and is spec-correct; updated `SPEC_FLOW_ACTORCLICK`'s description/code sample/ACs to match, and dropped its now-inaccurate `SPEC_MSG_SESSIONLOOKUP` link (no longer a direct dependency).
- **Amendment (pre-existing drift closed, flagged by Dev Engineer during the launch.json/tasks.json fix)**: `SPEC_DEV_LAUNCHCONFIG` (`docs/design/spec_dev.rst`) still documented the original pre-monorepo single "Run Extension" configuration — never updated across the PIM/Recorder/MCP modular-delivery CRs, which each added a progressive launch config without touching this spec. Rewritten to document the actual 5-tier structure (Core; Core+PIM; Core+PIM+Recorder; Run All incl. Flow; retired monolith) and the `tasks.json` compile-task chain, plus a new AC-3/AC-5 requiring "Run All"/`compile all` to always absorb future add-on packages and the spec to stay in sync going forward. Decision: fixed now rather than deferred, since Dev Engineer is already editing the same `launch.json`/`tasks.json` files for this CR's own Flow entry — closing the drift here is strictly additive to the in-scope fix, not separate scope creep. `REQ_DEV_LAUNCHCONFIG` itself needed no change — its ACs are already generic enough ("a launch configuration of type `extensionHost`") to cover the multi-config reality without contradiction.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ complete

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_FLOW_CHORDVIEW | REQ_FLOW_PACKAGE | SPEC_MOD_FLOW_PKG | ✅ |
| US_FLOW_CHORDVIEW | REQ_FLOW_DATASOURCE | SPEC_FLOW_DATASERVICE | ✅ |
| US_FLOW_CHORDVIEW | REQ_FLOW_CHORDVIEW | SPEC_FLOW_CHORDRENDER | ✅ |
| US_FLOW_CHORDVIEW | REQ_FLOW_WEBVIEWPANEL | SPEC_FLOW_WEBVIEW | ✅ |
| US_FLOW_CHORDVIEW | REQ_FLOW_ACTORCLICK | SPEC_FLOW_ACTORCLICK | ✅ |
| US_MSG_EDITORPLACEMENT | REQ_MSG_EDITORPLACEMENT (amended) | SPEC_MSG_EDITORPLACEMENT (amended) | ✅ |
| US_MOD_INSTALL | REQ_MOD_ADDONS, REQ_MOD_ZEROTRACE (amended) | SPEC_MOD_MONOREPO, SPEC_MOD_FLOW_PKG, SPEC_MOD_SUITE (amended) | ✅ |
| US_DEV_MANUALTEST | REQ_DEV_LAUNCHCONFIG | SPEC_DEV_LAUNCHCONFIG (amended) | ✅ |

`get_need_links.py --direction both` spot-checked on `US_FLOW_CHORDVIEW`, `REQ_FLOW_WEBVIEWPANEL`, `REQ_MSG_EDITORPLACEMENT`, `SPEC_MOD_FLOW_PKG`, `SPEC_FLOW_ACTORCLICK` — all links resolve, no dangling references. Sphinx clean rebuild (`-W --keep-going`, `_build` removed first): 0 warnings.

### Artefakt-Removal-Check

_Not applicable — no artefact removed, purely additive new module._

### Issues Found

- Flagged for PM: `SPEC_MOD_SUITE` (extension pack) intentionally left out of scope — see Level 1 Decisions.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (none found)
- [x] Traceability verified
- [x] Ready for implementation — **PM approved 2026-07-03**, SPEC_MOD_SUITE folded in per PM reversal. Proceeding to Test Designer/Dev Engineer.

---

## UAT Generation (Test Designer, 2026-07-03)

New UAT chain `US_UAT_FLOW` → `REQ_UAT_FLOW_TESTDATA`/`REQ_UAT_FLOW_TESTS` →
`SPEC_UAT_FLOW_FILES`/`SPEC_UAT_FLOW_PROCEDURES` covers the diagram's own
functional behavior (T-1..T-9): title-bar/command-palette open + singleton
reveal, empty state (no log file), the 500-entry cap, node/edge rendering +
hover tooltip, Fog-of-Time fade + slider (no re-fetch), actor-click → Main
(incl. no-op-on-miss), and 5 s poll refresh.

Extended two existing chains rather than duplicating cross-cutting coverage:

- `US_UAT_MODULAR_INSTALL`: new AC-7/AC-8 + T-10/T-11/T-12 — zero-trace when
  `enthali.jarvis-flow` is absent, lights-up when installed alongside core,
  and requires-core activation guard.
- `US_UAT_CHATEDITORREUSE`: new AC-11/T-11 — diagram Webview Panel coexists
  with an already-open entity-doc tab in the Content column (doesn't replace
  it), and opening the diagram doesn't perturb Secondary-column placement for
  unrelated Actor sessions at 2 or 3 open columns (`REQ_MSG_EDITORPLACEMENT`
  AC-11).

Test data: two new fixtures documented in `SPEC_UAT_FLOW_FILES`
(`message-log-flow-cap.json` for the 500-entry cap, `message-log-flow-sample.json`
for normal rendering/fade) — not yet created as actual files pending Dev
Engineer's `message-log.json` reader implementation (avoids fixture drift
before the exact on-disk schema is finalized in code).

Verification: `sphinx-build -W --keep-going -E` — 0 warnings.
`get_need_links.py --direction both` spot-checked on `US_UAT_FLOW`,
`US_UAT_MODULAR_INSTALL`, `US_UAT_CHATEDITORREUSE` — no dangling links.

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-03

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | **No findings.** All specification levels (L0/L1/L2) are clean, consistent, and complete. Traceability verified end-to-end across all 13+ traced elements. Full 5-package suite build clean (core+pim+recorder+mcp+flow), 222/222 tests pass, sphinx 0 warnings. Code-vs-spec verified independently: `resolvePythonInterpreter()` N/A here — in flow: `DOCS_COLUMN` constant, `createWebviewPanel` at fixed column 2 (never via `resolveSecondaryColumn()`), `handleActorClick` invoking `jarvis.openMessageSession` via `executeCommand` (matches amended SPEC_FLOW_ACTORCLICK, deviation from original design correctly recorded and spec updated), D3 vendored via esbuild bundle (no CDN), 500-entry cap in `dataService.ts`. SPEC_MSG_EDITORPLACEMENT code sample matches `resolveSecondaryColumn()` in core. `SPEC_MOD_SUITE`/suite `package.json` list 5 extensions including `enthali.jarvis-flow`. Test data fixtures both present and correct (`message-log-flow-cap.json` confirmed 520 entries, `message-log-flow-sample.json` confirmed content). UAT chains US_UAT_FLOW (T-1..T-9), US_UAT_MODULAR_INSTALL (T-10..T-12), US_UAT_CHATEDITORREUSE (T-11) — all read directly and accurate. SPEC_FLOW_ACTORCLICK correctly dropped the now-inaccurate `SPEC_MSG_SESSIONLOOKUP` outgoing link (REQ_FLOW_ACTORCLICK still retains it at REQ level, which is correct since the REQ was authored before the implementation deviation). | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | N/A — no findings | — |

---

## Implementation Bugs & Fixes

### Bug #1: Missing launch.json/tasks.json configuration (PM manual test, 2026-07-03)

**Discovered by:** PM during F5 manual test in Extension Development Host
**Severity:** High (blocks manual testing)

**Root Cause:** packages/flow was never added to `.vscode/launch.json` or `.vscode/tasks.json`. Every prior package (PIM, Recorder, MCP) got progressively-larger "Run All" configs, but packages/flow skipped that step. F5 defaults to the first config ("Run Core"), so only core loaded — no Message Flow icon appeared on the Messages tree title bar. Additionally, packages/flow is the first package requiring a non-tsc build step (webview esbuild bundling via build.js + webview-build.js), and those bundle steps weren't wired into any task or launch config.

**Fix Applied (commits 06bc6c5, 160d3cc, a47e09e):**

1. **Dev Engineer** (commit 06bc6c5): Added packages/flow to `.vscode/launch.json` and `.vscode/tasks.json`
   - Updated "Run All" launch config with 5th `extensionDevelopmentPath` (packages/flow)
   - Updated "compile all" task to include packages/flow's tsc + bundle steps (build.js + webview-build.js)
   - Verified: full build with bundles exits 0, both bundles build successfully (extension.js 6.4kb, webview/chord.js 104.0kb)

2. **System Designer** (commits 160d3cc, a47e09e): Fixed SPEC_DEV_LAUNCHCONFIG drift
   - Rewrote SPEC_DEV_LAUNCHCONFIG to document the actual 5-tier monorepo launch/tasks config (Core, Core+PIM, Core+PIM+Recorder, Run All with MCP, Run All with Flow)
   - Refined compile-all task description to match the esbuild-bundling chain
   - Closed pre-existing drift from prior CRs (PIM/Recorder/MCP additions were never reflected in the spec)
   - Added AC-3/AC-5 to require future add-on packages to always update "Run All"/`compile all` and keep spec in sync

**Verification:** PM notified that fix is complete and ready for continued manual testing.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent. Pre-staged by Research (2026-07-02) based on issue #11 + Research/PM scoping discussion; kickoff confirmed by PM 2026-07-03.*
