# Change Document: entity-files-tree

**Status**: ready-for-review
**Branch**: feature/entity-files-tree
**Created**: 2026-06-30
**Author**: PM
**Operation Mode**: autonomous (switched from user-guided per user direction after L2 approval, 2026-07-01)

---

## Summary

Add clickable file tree items to Session, Project, and Event trees showing the 3 core files per entity: `context.md`, YAML config (`session.yaml` / `project.yaml` / `event.yaml`), and agent file (`.agent.md`). Clicking a file opens it in the editor. Tooltip shows the full file path. Items sorted by path then filename. Existing inline tool-icon shortcuts stay unchanged — this is purely additive. No hook integration yet — pure UI change building on existing TreeProviders. Acceptance criterion: each entity node expands to show its 3 files, click opens the file, tooltip shows path.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | extended | Tree now shows file children under entity nodes |
| US_SES_SESSIONS | Sessions Entity Type | extended | Session tree gains file children (context.md, session.yaml, agent file) |
| US_SES_TREECLICK | Session Tree Primary Action | extended | Session leaf becomes expandable (collapsibleState changes); existing click-to-chat and inline notebook icon are unchanged |
| US_EXP_ENTITYPARITY | Entity Feature Parity (Projects & Events) | extended | File-tree parity across all 3 entity types is the core goal of this CR |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_EXP_ENTITY_FILES_TREE | As a Jarvis user, I want each Session/Project/Event node to expand and show its core files (`context.md`, YAML config, agent file if configured) as clickable tree items with tooltips, so that I can open any of these files directly by clicking on the file child, without leaving the tree. | mandatory |

### Decisions

- **Additive only** — no changes to existing inline icons (`$(go-to-file)`, `$(notebook)`) on any entity type; current implementation stays as-is
- **Up to 3 file children per entity** — `context.md`, YAML config (`session.yaml`/`project.yaml`/`event.yaml`), and the agent file; agent file child omitted when not configured (fail-open)
- **Pure UI change** — no schema changes, no new commands; leverages existing TreeProvider infrastructure
- **Tooltips on file nodes** — show full filesystem path for discoverability
- **Out of scope**: `US_EXP_OPENYAML` and `US_EXP_OPENCONTEXT` are not impacted — no changes to existing inline-icon behavior in this CR

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — file children are additive, existing inline-icon and click behaviors unchanged
- [x] No redundancies — new US is scoped distinctly from `US_EXP_OPENYAML`/`US_EXP_OPENCONTEXT` (those stay untouched)
- [x] Gaps identified and addressed — agent-file-absent case explicitly fail-open in AC-2

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_TREEVIEW | US_EXP_SIDEBAR | extended | AC-11 added: entity leaf nodes may be expandable; doesn't change leaf identity |
| REQ_SES_TREE | US_SES_SESSIONS | extended | AC-6 added: session leaf nodes may be expandable |
| REQ_SES_TREECLICK | US_SES_TREECLICK | extended | AC-7 added: expand arrow doesn't interfere with click-to-chat binding |
| REQ_EXP_ENTITY_TREECLICK | US_EXP_ENTITYPARITY | extended | AC-4 added: expand arrow doesn't interfere with click-to-chat binding |

**Reviewed and excluded** (linked but not impacted): `REQ_EXP_YAMLDATA`, `REQ_EXP_REACTIVECACHE`, `REQ_SES_CONTEXTMENU`, `REQ_SES_OPENCONTEXT`, `REQ_EXP_ENTITY_ICONS`, `REQ_SES_AGENTPROMPT`, `REQ_SES_LISTTOOL`, `REQ_SES_NEWENTITY`, `REQ_SES_SCHEMA`, `REQ_SES_TOGGLE`, `REQ_EXP_ENTITY_AGENT`, `REQ_EXP_EVENT_SUMMARY`, `REQ_AUT_HEARTBEATVIEW`, `REQ_EXP_DUMMYDATA`, `REQ_EXP_TASKTREE`, `REQ_EXP_ACTIVITYBAR` — unrelated domains (agent binding, schema, heartbeat, tasks, activity bar) or explicitly unchanged per Level 0 decisions.

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EXP_ENTITY_FILE_CHILDREN | Entity File Children in Tree | US_EXP_ENTITY_FILES_TREE; US_SES_SESSIONS; US_EXP_ENTITYPARITY; REQ_EXP_TREEVIEW | mandatory |

### Conflicts Detected

None. The click-vs-expand question (does making a leaf node expandable interfere with its existing click-to-chat command?) was resolved as **not a real conflict** — VS Code's TreeView fires `TreeItem.command` on label click independently of the expand-arrow hit-target. Resolved via clarifying ACs, no behavior change needed.

### Decisions

- `REQ_EXP_ENTITY_FILE_CHILDREN` placed under the `EXP` theme (not `SES`) because it spans all 3 entity kinds uniformly — consistent with existing cross-entity REQs (`REQ_EXP_ENTITY_TREECLICK`, `REQ_EXP_ENTITY_ICONS`)
- Click-vs-expand resolved via clarifying notes on 4 existing REQs rather than new ACs — no functional change, only documentation of already-correct VS Code behavior

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
| SPEC_EXP_PROVIDER | REQ_EXP_TREEVIEW | extended | Link added to `SPEC_EXP_ENTITY_FILE_CHILDREN`; leaf `collapsibleState` changes `None` → `Collapsed` |
| SPEC_SES_TREE | REQ_SES_TREE | extended | Link added to `SPEC_EXP_ENTITY_FILE_CHILDREN`; same collapsibleState change for sessions |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_ENTITY_FILE_CHILDREN | Entity File Children in Tree | REQ_EXP_ENTITY_FILE_CHILDREN; SPEC_EXP_PROVIDER; SPEC_SES_TREE; SPEC_EXP_ENTITY_TREECLICK |

### Conflicts Detected

None.

### Decisions

- New `FileNode` variant added to the shared `TreeNode` union (`yamlScanner.ts`); file children computed on-the-fly in `getChildren()`, not cached
- Single shared helper `getEntityFileChildren()` reused by all 3 providers (Project/Event/Session) — no duplicated logic
- YAML child requires no extra lookup — `leaf.id` already is the YAML file path (existing convention)
- Agent file path resolved as `<workspaceRoot>/.github/agents/<agent>.agent.md` — a shared file across entities with the same `agent` value (confirmed with user: agent file drives session behavior, `context.md` is long-term memory, YAML ties both together)
- New command `jarvis.openEntityFile` — fail-open (warning notification, no auto-creation) on missing file, following `SPEC_EXP_HEARTBEAT_OPENFILE` precedent
- New `contextValue: jarvisEntityFile` excludes file children from all existing entity context-menu `when`-clauses
- No context-menu entries added for file children in this CR

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_ENTITY_FILES_TREE | REQ_EXP_ENTITY_FILE_CHILDREN | SPEC_EXP_ENTITY_FILE_CHILDREN | ✅ |
| US_EXP_SIDEBAR | REQ_EXP_TREEVIEW | SPEC_EXP_PROVIDER | ✅ |
| US_SES_SESSIONS | REQ_SES_TREE | SPEC_SES_TREE | ✅ |
| US_SES_TREECLICK | REQ_SES_TREECLICK | SPEC_SES_TREECLICK | ✅ |
| US_EXP_ENTITYPARITY | REQ_EXP_ENTITY_TREECLICK | SPEC_EXP_ENTITY_TREECLICK | ✅ |

Verified via `get_need_links.py` outgoing-link queries on `US_EXP_ENTITY_FILES_TREE` and `REQ_EXP_ENTITY_FILE_CHILDREN` — full chain US → REQ → SPEC confirmed, no dangling links.

### Artefakt-Removal-Check

Not applicable — this CR is purely additive. No artefact (file, field, configuration key, REQ/SPEC-ID) is removed.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

### Implementation Notes

Implemented in commit 8d73d35 on `feature/entity-files-tree`. `tsc` clean, 149/149 tests pass, docs build succeeds.

- **Deviation from design (informational, not a scope change):** the design referenced separate `ProjectTreeProvider`/`EventTreeProvider`/`SessionTreeProvider` classes. These no longer exist as separate classes — already unified into a single `GenericTreeDataProvider` (S5 engine generalization, prior CR). Dev Engineer implemented `getEntityFileChildren()` in the one shared location instead — functionally equivalent to the design intent, even less duplication than anticipated. Flagged for System Designer awareness in case other pending Change Documents still reference the old 3-provider model.
- 4 pre-existing tests updated to reflect the intentional `collapsibleState` `None` → `Collapsed` change (sessionTreeEquivalence, treeFactoryHooks, projectTreeExpectation, eventTreeExpectation).

### Bug Fix (found in Dev Host testing, same CR)

**Bug:** `getEntityFileChildren()` constructed the agent file path as `${entity.agent}.agent.md`, assuming the `session.yaml` `agent:` value (the agent's frontmatter `name:`) is also the filename. False — filename and frontmatter `name:` are independent. Root cause was in the approved `SPEC_EXP_ENTITY_FILE_CHILDREN` design itself (Dev Engineer implemented exactly as spec'd).

**Resolution:**
- `SPEC_EXP_ENTITY_FILE_CHILDREN` amended (commit cab9867) — agent-file lookup now reuses `discoverAgentModes()` (`SPEC_SES_AGENT_DISCOVERY`), matching by frontmatter `name:` identity instead of constructing a filename. `REQ_EXP_ENTITY_FILE_CHILDREN` confirmed unchanged (already agent-mechanism-agnostic).
- Re-implemented in commit 4fe0bdc: new `packages/core/src/engine/sessions/agentDiscovery.ts` (extracted `discoverAgentModes()` from `extension.ts`, plus new `getAgentModesCached()` and `resolveAgentFileChild()`, fail-open on no match). `getEntityFileChildren()` is now async.
- **Deviation from amended design (informational):** the amended spec placed the new resolver in `extension.ts`; Dev Engineer placed it in the new `agentDiscovery.ts` instead to avoid an import cycle (`extension.ts → treeFactory.ts → yamlScanner.ts → extension.ts`). Same algorithm/behavior as spec'd, different module home to fit the actual dependency graph.
- Verification: `tsc` clean, 149/149 tests pass, docs build succeeds.

### Process Note

System Designer initially dispatched directly to Dev Engineer for the spec-amendment handoff (bypassing CM) — corrected mid-flight; recorded in CM's lessons-learned for future CRs. No impact on this CR's outcome.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** MECE Engineer, Trace Engineer
**Review date:** 2026-07-01

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 | SPEC_EXP_PROVIDER, SPEC_SES_TREE | Own prose/code samples still show leaf `collapsibleState = None`, even though both now link to `SPEC_EXP_ENTITY_FILE_CHILDREN` which overrides this to `Collapsed`. `SPEC_SES_TREE` has a precedent `.. note::` pattern for a prior override (item.command → `SPEC_SES_TREECLICK`) but none was added for this override. Stale/self-contradictory if either SPEC is read standalone. | medium |
| 2 | — | UAT chain vs. functional chain | Functional chain (US/REQ/SPEC) bumped to `approved` after Final Consistency Check; parallel UAT chain remains `draft`. | low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Small clarifying-note addition, same pattern as existing precedent in `SPEC_SES_TREE`; routed back to System Designer |
| 2 | 2 | accept-as-is | Matches established repo convention — UAT status reflects test-execution state, not design-review state; functional and UAT chains use different status semantics by design |

MECE Engineer: PASS, no violations (redundancies, contradictions, gaps — all none; full traceability confirmed).
Trace Engineer: PASS, no dangling links, no missing back-links, 0 sphinx warnings/errors across 16408 needs.

### Round 2 (Independent QM Review)

**Reviewed by:** Quality Manager (dispatched MECE Engineer × L0/L1/L2, Trace Engineer × 2 elements)
**Review date:** 2026-07-01
**Scope:** Independent verification, not part of the CM pipeline that produced Round 1.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L0 | US_EXP_ENTITY_FILES_TREE AC-5 vs. CD Summary | CD Summary states "Replaces the current tool-icon shortcuts with a proper file tree"; US AC-5 and CD Decisions both state inline icons are "unchanged"/"additive only". Implementation and Decisions confirm icons are **retained** — the Summary sentence is stale/inaccurate and should be corrected to avoid misleading future readers. | medium |
| 2 | L1 | REQ_EXP_TREEVIEW AC-11, REQ_SES_TREE AC-6 vs. REQ_EXP_ENTITY_FILE_CHILDREN AC-1 | Modality mismatch: new REQ mandates leaf nodes SHALL be `Collapsed` (matches implementation — always expandable). Existing extended REQs use "MAY be expandable" (optional). Should be updated to SHALL to match actual (unconditional) implementation. | medium |
| 3 | L0 | US_EXP_SIDEBAR | "Leaf node" definition predates this CR and doesn't acknowledge that leaf nodes are now expandable with file children — stale wording if read standalone. | low |
| 4 | L0/L1 | US_EXP_ENTITY_FILES_TREE / REQ_EXP_ENTITY_FILE_CHILDREN | Minor gaps, none blocking: (a) file-child context-menu behavior unstated (implementation excludes them via `contextValue`, but not documented at US/REQ level); (b) sort order ("path then filename" per CD Summary) not in ACs; (c) agent-file shared-identity-across-entities behavior (per CD L2 Decisions) not stated at US/REQ level; (d) behavior on missing mandatory files (context.md/YAML) undocumented. | low |
| 5 | L2 | SPEC_EXP_ENTITY_FILE_CHILDREN | Two documentation-only gaps: workspace-root precondition for agent-file path resolution is implicit; `contextValue` context-menu exclusion pattern has no `when`-clause example. Not a functional gap — implementer can infer both. | low |

#### Independent Checks Confirming No Regressions

- MECE L2 (SPEC_EXP_PROVIDER, SPEC_SES_TREE, SPEC_EXP_ENTITY_FILE_CHILDREN): PASS — Round 1 Finding #1 fix (collapsibleState override notes) verified present, clear, non-contradictory, consistent with precedent pattern.
- Trace (US_EXP_ENTITY_FILES_TREE full chain): PASS — 100% REQ→SPEC AC coverage, no dangling links, no semantic drift.
- Trace (SPEC_SES_TREE): PASS — confirms Round 1 Finding #1 resolved; bidirectional link to SPEC_EXP_ENTITY_FILE_CHILDREN valid; upward chain to US_SES_SESSIONS intact.

**QM Verdict:** No blocking defects found. All findings are documentation/specification-wording issues (stale summary sentence, modality wording, minor gaps) — the implementation itself is consistent with the intended (mandatory, additive) behavior in every case checked. Recommend fix-now for #1 and #2 (quick text corrections); #3-#5 may be deferred or accepted.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | CD Summary corrected — "replaces" → confirms icons unchanged, additive only (done directly by PM) |
| 2 | 2 | fix-now | Routed to CM: change MAY→SHALL in REQ_EXP_TREEVIEW AC-11 and REQ_SES_TREE AC-6 to match actual unconditional implementation |
| 3 | 3 | defer | Backlog note added to PM context.md; low priority stale-wording cleanup, no functional risk |
| 4 | 4 | accept-as-is | Implementation is correct in all four sub-points; AC-level documentation could be more complete but nothing is functionally wrong |
| 5 | 5 | accept-as-is | Documentation-only gaps, inferable by implementer; not worth a fix-now cycle |

### Round 3 (Spot-Check on Bug-Fix Amendment)

**Reviewed by:** Quality Manager (dispatched Trace Engineer for the new SPEC_EXP_ENTITY_FILE_CHILDREN → SPEC_SES_AGENT_DISCOVERY link) + direct code-vs-spec read
**Review date:** 2026-07-01
**Trigger:** CM flagged the agent-file-resolution bug fix (commits cab9867, 4fe0bdc) for spot-check before final sign-off.

**Result: PASS, no blocking defects.**

- New link `SPEC_EXP_ENTITY_FILE_CHILDREN → SPEC_SES_AGENT_DISCOVERY` resolves cleanly; `SPEC_SES_AGENT_DISCOVERY`'s own upward chain (REQ_SES_AGENT_DISCOVERY/PICKER/CREATETOOL) is unaffected — purely additive downstream consumer, no scope change.
- Amendment's "Amendment note" and code sample accurately describe the reused `discoverAgentModes()` identity-to-file resolution (frontmatter `name:` match, fail-open on no match) — verified directly against `packages/core/src/engine/sessions/agentDiscovery.ts`; no semantic drift.
- **Pre-existing, non-blocking observation (not introduced by this CR):** `SPEC_EXP_ENTITY_FILE_CHILDREN`'s code samples still say the resolver lives in `src/extension.ts`/`src/yamlScanner.ts`, but the actual (documented, CD-flagged) deviation places it in `packages/core/src/engine/sessions/agentDiscovery.ts`. This matches a repo-wide stale-path convention already present throughout `spec_exp.rst` predating this CR (also true of unrelated SPECs in the same file) — not a new defect, no action required here.

**QM sign-off:** Cleared for merge.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
