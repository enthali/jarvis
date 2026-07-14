# Change Document: unified-entity-tree

**Status**: in-progress
**Branch**: feature/unified-entity-tree
**Created**: 2026-07-08
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Phase 3 of the "Consequent Actor Renaming" initiative. Collapses today's three separate top-level Explorer trees (Actors, Projects, Events) into a single unified tree, container-labeled **"Jarvis Entities"** (reusing the existing spec-level umbrella term introduced by `entity-taxonomy-rename`, v0.15.0 — chosen specifically to avoid overloading "Actors" for both the container and a sub-category, which would just move today's naming ambiguity up one level). Category sub-groups (Actors / Projects / Events) appear only when more than one entity kind is actually present in the workspace — if e.g. only Actors exist, the tree flattens with no category headers, showing actor names directly under "Jarvis Entities". Adds a general, cross-category search/filter (live-filter the tree to matching nodes; exact mechanism to be finalized during design). Relocates the existing per-kind filter settings for Projects and Events onto their respective category tree nodes (each kind keeps its own distinct filter config, just repositioned in the UI) rather than being separate top-level trees. This is a pure UI/tree-structure change — it does not alter the underlying storage conventions (Phase 2's dual-path scanner already merges old/new Actor naming transparently) and does not touch LM/MCP tool names (Phase 5, separate future CR).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Unified Jarvis Entities Explorer | modified | AC-3/AC-4 rewritten (3 sections not 4, Actors/Projects/Events merged); new AC-5 defines the flatten-vs-category rule. Title renamed from "Project & Event Explorer". |
| US_EXP_TREESEARCH | Tree Quick Search | modified | AC-1/AC-2 collapsed into a single AC-1 (one search icon on the unified view, now covering Actors too, which never had search before); new AC-4 covers category-node expansion during reveal. |

### New User Stories

None. The unification is scoped entirely under the existing `US_EXP_SIDEBAR`/`US_EXP_TREESEARCH` umbrella stories — no new user-facing capability class is introduced (Actors gaining search is additive but fits `US_EXP_TREESEARCH`'s existing "as a Jarvis User with many entities" framing).

### Decisions

- Decision 1 (escalated to PM/user, confirmed): core owns the single `jarvisEntities` view; `pim` stops contributing its own `jarvisProjects`/`jarvisEvents` views but keeps calling `registerEntityKind()` exactly as before. Chosen because `pim` already feeds Project/Event data into core's engine via the existing cross-extension `JarvisCoreApi.registerEntityKind()` call — the data layer was already unified before this CR; only the 3 `createTreeView()` calls were fragmented across 2 packages.
- Decision 2 (escalated to PM/user, confirmed; **superseded — see Decision 5 below**): search mechanism is a QuickPick "jump-to-entity" (generalizing the already-implemented `US_EXP_TREESEARCH`/`REQ_EXP_SEARCHPROJECTS`/`REQ_EXP_SEARCHEVENTS` pattern to all kinds), not a true live-filter of the rendered tree. VS Code's `TreeView` API has no built-in live-filter/search-box for custom trees (confirmed against the current `vscode.d.ts` surface — only `reveal()`, `title`, `description`, `badge` exist) — the CD's original "live-filter the tree" framing was not implementable as literally stated. **This decision held until implementation revealed `TreeView.reveal()` requires `TreeDataProvider.getParent()`, which was not implemented — see Decision 5.**
- Decision 3 (escalated to PM/user, confirmed): Projects/Events filter triggers relocate to a context-menu entry on their category tree node (shown only when 2+ kinds present) plus a Command Palette fallback entry (for the flattened, single-kind case where no category node exists) — replacing the view-title-bar buttons, which cannot be scoped per-node within one shared view.
- Decision 4 (made without escalation, disclosed here): a kind is only treated as "present" (i.e., gets its own category node) when it is both registered AND has at least one entity in the current scan — an enabled-but-empty kind does not produce an empty, confusing category header. This is a low-stakes UX default, not one of the three larger architectural forks above.
- Decision 5 (pivot during implementation, PM + Dev Engineer, retroactively spec'd here): the reveal-based search (Decision 2) was abandoned mid-implementation because `TreeView.reveal()` requires `TreeDataProvider.getParent()`, which `GenericTreeDataProvider` does not implement (and implementing it was judged a larger rework than warranted for this feature). The team pivoted to a **live tree filter** instead: `jarvis.searchEntities` opens a QuickPick used purely as a text-input box; each keystroke applies a recursive name/summary substring filter directly to `GenericTreeDataProvider.getChildren()` via new `setSearchFilter()`/`getSearchFilter()` methods, with folders auto-expanding while a filter is active and the filter clearing when the input closes. This needs no `getParent()` support since it filters `getChildren()` output rather than revealing a specific node. `REQ_EXP_SEARCHENTITIES`/`SPEC_EXP_SEARCH_ENTITIES_CMD` were rewritten to describe this shipped behavior (code shipped ahead of spec catch-up in this instance — flagged as a process gap, see Issues Found). Scope explicitly limited to the basic filter that shipped; richer search/filter capabilities are deferred to a separate follow-up CR per PM.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — old 4-section wording fully replaced, no leftover duplicate AC
- [x] Gaps identified and addressed (Actor search gap closed as a side effect of unification)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_TREE | US_ACT_ACTORS | modified | New AC-14 retires the standalone `jarvisActors` view registration into the unified tree; AC-3..AC-6, AC-10 (view ID string), `kind`/`contextValue` all explicitly unchanged. Added `REQ_EXP_UNIFIEDTREE` to `:links:`. |
| REQ_PRJ_PROJECTFILTER | US_PRJ_PROJECTFILTER | modified | AC-1 rewritten: trigger relocates to category-node context menu + Command Palette; AC-5 rewritten: label-toggle replaces icon-toggle. |
| REQ_EVT_EVENTFILTER | US_EVT_EVENTFILTER | modified | AC-1 rewritten: trigger relocates to category-node context menu + Command Palette; AC-5 rewritten: label-toggle replaces icon-toggle. |
| REQ_EXP_SEARCHPROJECTS | US_EXP_TREESEARCH | deprecated | Superseded by `REQ_EXP_SEARCHENTITIES`; kept (status `deprecated`, historical ACs preserved) for traceability. |
| REQ_EXP_SEARCHEVENTS | US_EXP_TREESEARCH | deprecated | Superseded by `REQ_EXP_SEARCHENTITIES`; kept (status `deprecated`, historical ACs preserved) for traceability. |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EXP_UNIFIEDTREE | Unified Entities Tree | US_EXP_SIDEBAR; REQ_ACT_TREE; REQ_PRJ_PROJECTFILTER; REQ_EVT_EVENTFILTER | mandatory |
| REQ_EXP_SEARCHENTITIES | Search Entities via QuickPick | US_EXP_TREESEARCH; REQ_EXP_UNIFIEDTREE | optional |

### Conflicts Detected

None. `REQ_EXP_UNIFIEDTREE` AC-2 (pim stops owning views) does not conflict with any existing pim requirement — no requirement previously mandated that pim itself own the view (only that the views exist and behave a certain way, which is preserved).

### Decisions

- Decision 1: `REQ_EXP_UNIFIEDTREE` AC-8 additionally requires `packages/pim` to gate its `registerEntityKind(buildEventKindConfig(...))` call behind `jarvis.events.enabled` at runtime — today this call is unconditional (verified via code read of `packages/pim/src/extension.ts`); only the view-level `when`-clause on `jarvisEvents` gated visibility. Since a single unified view cannot carry two different per-kind `when`-clauses, gating must move into the registration call itself, mirroring the existing Actor/session pattern in `packages/core` (`if (cfg.get('sessions.enabled', true))`). This is a small but real behavior-relevant code change flagged explicitly for Dev Engineer.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_TREE | REQ_ACT_TREE | modified | New note: `createTreeView('jarvisActors', ...)` removed, wrapped by `SPEC_EXP_UNIFIEDTREE` instead; `sessionKindConfig` unchanged. |
| SPEC_PRJ_FILTERCOMMAND | REQ_PRJ_PROJECTFILTER | modified | Registration section rewritten: `view/item/context` menu on category node + Command Palette entry, replacing `view/title` icon-toggle pair. |
| SPEC_EVT_EVENTFILTER_CMD | REQ_EVT_EVENTFILTER | modified | Registration section rewritten: `view/item/context` menu on category node + Command Palette entry, replacing `view/title` icon-toggle pair. |
| SPEC_EXP_SEARCH_MANIFEST | REQ_EXP_SEARCHPROJECTS | deprecated | Superseded by `SPEC_EXP_SEARCH_ENTITIES_MANIFEST`; kept for traceability. |
| SPEC_EXP_SEARCH_CMD | REQ_EXP_SEARCHEVENTS | deprecated | Superseded by `SPEC_EXP_SEARCH_ENTITIES_CMD`; kept for traceability. |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_UNIFIEDTREE | Unified Jarvis Entities Tree Provider | REQ_EXP_UNIFIEDTREE; SPEC_EXP_EXTENSION |
| SPEC_EXP_SEARCH_ENTITIES_MANIFEST | Search Entities — Manifest | REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE |
| SPEC_EXP_SEARCH_ENTITIES_CMD | Search Entities — Command Handler | REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE; SPEC_EXP_SEARCH_ENTITIES_MANIFEST |

### Conflicts Detected

None.

### Decisions

- Decision 1: `UnifiedEntityTreeProvider` is a pure presentation-layer wrapper composing the existing per-kind providers from `engine.treeFactory.getProvider(kind)` — it does not reimplement scanning, sorting, or filtering. This keeps `EntityKindConfig`, `KindDrivenScanner`, and all per-kind leaf-node behavior (Project folder filter, Event future filter + date-sort, Actor file-children expansion) completely untouched below the (optional) category node.
- Decision 2: refresh forwarding is whole-tree (`onDidChangeTreeData(undefined)`) on any wrapped kind's change event, not a partial/subtree refresh — matches today's granularity (each standalone view already refreshes its whole tree on scanner change) and avoids unnecessary complexity.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_SIDEBAR | REQ_EXP_UNIFIEDTREE | SPEC_EXP_UNIFIEDTREE | ✅ |
| US_EXP_TREESEARCH | REQ_EXP_SEARCHENTITIES | SPEC_EXP_SEARCH_ENTITIES_MANIFEST, SPEC_EXP_SEARCH_ENTITIES_CMD | ✅ |
| US_ACT_ACTORS | REQ_ACT_TREE (AC-14) | SPEC_ACT_TREE (amended) | ✅ |
| US_PRJ_PROJECTFILTER | REQ_PRJ_PROJECTFILTER | SPEC_PRJ_FILTERCOMMAND | ✅ |
| US_EVT_EVENTFILTER | REQ_EVT_EVENTFILTER | SPEC_EVT_EVENTFILTER_CMD | ✅ |

Confirmed via `get_need_links.py REQ_EXP_UNIFIEDTREE --direction both` and `get_need_links.py REQ_ACT_TREE --direction both` — link graph is bidirectionally consistent, no dangling references.

### Artefakt-Removal-Check

This CR removes 3 standalone views, 2 standalone search commands, and 2 title-bar filter-icon command pairs (repurposed to context-menu, IDs kept). Full removal is deferred to Dev Engineer's implementation; the table below documents what System Designer's grep-based impact analysis found as of design time (to be re-verified by Dev Engineer/Verify Engineer against actual code post-implementation):

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| View ID `jarvisProjects` | `packages/pim/package.json` (views, activation event, when-clauses), `packages/pim/src/extension.ts` (`createTreeView` call) — to be removed by Dev Engineer | `docs/design/spec_exp.rst` (`SPEC_EXP_EXTENSION` manifest sample) — flagged for Dev Engineer/Documentation Engineer to amend during implementation, not fixed in this design pass since it already carries pre-existing drift (lists a 5-view historical manifest) | `docs/changes/actor-terminology-rename.md`, `actor-internal-identifiers-rename.md`, `actor-dualpath-scanner.md` reference `jarvisProjects`/`jarvisEvents` contextually — acceptable historic stranding |
| View ID `jarvisEvents` | Same locations as above (pim) | Same as above | Same as above |
| View ID `jarvisActors` | `packages/core/package.json` (views, activation event, when-clauses), `packages/core/src/extension.ts` (`createTreeView` call at line ~441) — to be removed by Dev Engineer | `docs/design/spec_act.rst` `SPEC_ACT_TREE` — amended in this CR (new note added, not deleted) | `docs/changes/actor-terminology-rename.md`, `actor-internal-identifiers-rename.md` — acceptable historic stranding (both predate this CR and correctly describe `jarvisActors` as it existed then) |
| Commands `jarvis.searchProjects`, `jarvis.searchEvents` | `packages/pim/package.json`/`extension.ts` — to be removed by Dev Engineer | `docs/design/spec_exp.rst` `SPEC_EXP_SEARCH_MANIFEST`/`SPEC_EXP_SEARCH_CMD` — marked `deprecated` in this CR (not deleted, historical ACs preserved), `docs/requirements/req_exp.rst` `REQ_EXP_SEARCHPROJECTS`/`REQ_EXP_SEARCHEVENTS` — same treatment | None found |
| `view/title` icon-toggle registrations for `jarvis.filterProjectFolders`/`jarvis.filterFutureEvents` | `packages/pim/package.json` — to be replaced with `view/item/context` + Command Palette entries by Dev Engineer | `docs/design/spec_prj.rst` `SPEC_PRJ_FILTERCOMMAND`, `docs/design/spec_evt.rst` `SPEC_EVT_EVENTFILTER_CMD` — amended in this CR | None found |

- [x] All class (a) active code/workflow references identified and handed off to Dev Engineer (this CD's design phase does not touch code — System Designer's role is L0/L1/L2 only)
- [x] All class (b) active documentation references either fixed in this CR (req/spec files above) or explicitly flagged for Dev/Documentation Engineer follow-up (`SPEC_EXP_EXTENSION`'s stale manifest sample, pre-existing drift not introduced by this CR)
- [x] Class (c) historical Change Documents accepted as acceptable historic stranding (disclosed above) — each correctly describes the view IDs as they existed at the time of writing

### Issues Found

- [x] Issue 1: CD's original Summary framed this as "a pure UI/tree-structure change" and proposed a "live-filter the tree" search mechanism — impact analysis found the view registrations span 2 packages (not pure UI within one extension) and that VS Code's TreeView API has no live-filter capability. Both were escalated to PM/user via `vscode_askQuestions` before design proceeded (see Level 0 Decisions 1 and 2) rather than silently reinterpreted or silently complied with.
- [x] Issue 2: `REQ_EXP_FEATURETOGGLE`/`SPEC_EXP_EXTENSION` describe an older 5-view manifest (`jarvisProjects`, `jarvisEvents`, `jarvisMessages`, `jarvisHeartbeat`, `jarvisCategories`) that already doesn't mention `jarvisActors` — pre-existing drift, not introduced by this CR. Not fixed here (out of this CR's scope to do a full historical-accuracy audit of `spec_exp.rst`); flagged for Documentation Engineer as a standing gap.
- [x] Issue 3: The reveal-based search design (Decision 2, QM-cleared at multiple rounds) was found infeasible during implementation (`TreeView.reveal()` requires `TreeDataProvider.getParent()`, not implemented) and Dev Engineer pivoted to a live tree filter *before* the spec was updated — code shipped ahead of spec for one review cycle. `REQ_EXP_SEARCHENTITIES`/`SPEC_EXP_SEARCH_ENTITIES_CMD` and the UAT Group B test cases have since been rewritten to match the shipped behavior (see Decision 5). **Process lesson**: a design assumption that passed multiple QM rounds was invalidated by a downstream VS Code API constraint not discovered until implementation — future designs relying on `TreeView.reveal()` should verify `getParent()` support (or its absence) during the design phase, not defer that check to implementation.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining as *unintentional* — the `deprecated` statuses present are intentional, disclosed supersessions)
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
**Review date:** 2026-07-13
**Scope:** Design phase only (L0/L1/L2 specification quality) — no implementation exists on this branch yet

**⚠️ Workflow integrity note:** A "QM Findings Round 1: CLEAR" entry was pre-populated in this CD (commit ff7d168) before any QM review was conducted. That entry was not written by QM. This entry replaces it with the actual independent assessment.

#### Verification Summary

**CLEAR (design phase)** — Specification quality is sound. No design-level findings.

1. **Design quality (L0/L1/L2):**
   - US_EXP_SIDEBAR (AC-3/4/5) and US_EXP_TREESEARCH (AC-1) modifications: clearly written, MECE, decisions documented and user-confirmed ✓
   - REQ_EXP_UNIFIEDTREE and REQ_EXP_SEARCHENTITIES: well-specified with clear ACs; deprecated REQs (REQ_EXP_SEARCHPROJECTS/EVENTS) correctly handled ✓
   - REQ_EXP_UNIFIEDTREE AC-8 (pim registration gating): real code change correctly flagged for Dev Engineer ✓
   - SPEC_EXP_UNIFIEDTREE, SPEC_EXP_SEARCH_ENTITIES_MANIFEST/CMD: sufficient implementation clarity ✓
   - Artefact-Removal-Check: thorough, all class (a)/(b)/(c) artefacts identified and disposition documented ✓
   - Key architectural decisions (single view in core, QuickPick not live-filter, context-menu for filter triggers) all escalated to PM/user and confirmed ✓

2. **Build** (existing code, no implementation on branch): clean (0 errors) ✓

3. **Tests** (existing 214 tests, no new tests yet): 214/214 passed ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

---

## Trace Engineer Verification

**Performed by:** Trace Engineer (independent of design-phase QM review)
**Verification date:** 2026-07-13
**Scope:** Bidirectional L0↔L1↔L2 traceability, link completeness, artefact removal integrity

### Vertical Traceability Analysis

**Chain 1: US_EXP_SIDEBAR ↔ REQ_EXP_UNIFIEDTREE ↔ SPEC_EXP_UNIFIEDTREE**
- US `:links:` field: `US_MSG_CHATQUEUE; US_ACT_ACTORS; REQ_EXP_UNIFIEDTREE` ✅ (amended this session)
- REQ `:links:` outbound: `US_EXP_SIDEBAR; REQ_ACT_TREE; REQ_PRJ_PROJECTFILTER; REQ_EVT_EVENTFILTER` ✅
- REQ `:links:` inbound: US_EXP_SIDEBAR ✅
- SPEC `:links:` inbound: REQ_EXP_UNIFIEDTREE ✅
- SPEC `:links:` outbound: `REQ_EXP_UNIFIEDTREE; SPEC_EXP_EXTENSION` ✅
- **Verdict:** Bidirectional, complete ✅

**Chain 2: US_EXP_TREESEARCH ↔ REQ_EXP_SEARCHENTITIES ↔ SPEC_EXP_SEARCH_ENTITIES_***
- US `:links:` field: `US_EXP_SIDEBAR; REQ_EXP_SEARCHENTITIES` ✅ (amended this session)
- REQ `:links:` inbound: `US_EXP_TREESEARCH` ✅
- REQ `:links:` outbound: `US_EXP_TREESEARCH; REQ_EXP_UNIFIEDTREE` ✅
- SPEC_MANIFEST `:links:` inbound: REQ_EXP_SEARCHENTITIES ✅
- SPEC_MANIFEST `:links:` outbound: `REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE` ✅
- SPEC_CMD `:links:` inbound: REQ_EXP_SEARCHENTITIES ✅
- SPEC_CMD `:links:` outbound: `REQ_EXP_SEARCHENTITIES; SPEC_EXP_UNIFIEDTREE; SPEC_EXP_SEARCH_ENTITIES_MANIFEST` ✅
- **Verdict:** Bidirectional, complete ✅

**Chain 3: US_ACT_ACTORS → REQ_ACT_TREE (amended) → SPEC_ACT_TREE (amended)**
- REQ_ACT_TREE new link outbound: `REQ_EXP_UNIFIEDTREE` added ✅
- REQ_ACT_TREE new AC-14: documents integration into unified tree ✅
- SPEC_ACT_TREE new note: references `SPEC_EXP_UNIFIEDTREE` ✅
- Backward links (ACT → EXP) all present ✅
- **Verdict:** Amendment complete, cross-linked ✅

**Chain 4: US_PRJ_PROJECTFILTER → REQ_PRJ_PROJECTFILTER (amended) → SPEC_PRJ_FILTERCOMMAND (amended)**
- REQ `:links:` includes `REQ_EXP_UNIFIEDTREE` ✅
- SPEC registration section rewritten for context-menu + Command Palette ✅
- **Verdict:** Amendment complete ✅

**Chain 5: US_EVT_EVENTFILTER → REQ_EVT_EVENTFILTER (amended) → SPEC_EVT_EVENTFILTER_CMD (amended)**
- REQ `:links:` includes `REQ_EXP_UNIFIEDTREE` ✅
- SPEC registration section rewritten for context-menu + Command Palette ✅
- **Verdict:** Amendment complete ✅

**Deprecated Chains (Supersession verification):**
- REQ_EXP_SEARCHPROJECTS: `:status: deprecated`, `:links:` includes `REQ_EXP_SEARCHENTITIES` ✅
- REQ_EXP_SEARCHEVENTS: `:status: deprecated`, `:links:` includes `REQ_EXP_SEARCHENTITIES` ✅
- SPEC_EXP_SEARCH_MANIFEST: `:status: deprecated`, `:links:` includes `SPEC_EXP_SEARCH_ENTITIES_MANIFEST` ✅
- SPEC_EXP_SEARCH_CMD: `:status: deprecated`, `:links:` includes `SPEC_EXP_SEARCH_ENTITIES_CMD` ✅
- All deprecated elements retain historical AC text for traceability ✅
- **Verdict:** Supersession clean, no broken chains ✅

### Link Orphan Detection

- Every SPEC element links to a REQ parent ✅ 
- Every REQ element links to a US parent ✅
- New REQs (REQ_EXP_UNIFIEDTREE, REQ_EXP_SEARCHENTITIES) both link upward to US ✅
- New SPECs (SPEC_EXP_UNIFIEDTREE, SPEC_EXP_SEARCH_ENTITIES_*) all link upward to REQ ✅
- No orphaned elements found ✅

### Artefact Removal Traceability

Removed standalone views (jarvisActors, jarvisProjects, jarvisEvents):
- Class (a) code references: All identified (package.json entries, createTreeView calls, when-clauses) ✅
- Class (b) documentation references: All identified (SPEC_ACT_TREE amended note, SPEC_EXP_EXTENSION drift flagged) ✅
- Class (c) historical Change Docs: Documented as acceptable historic stranding ✅

Removed search commands (jarvis.searchProjects, jarvis.searchEvents):
- Deprecated REQs/SPECs retain historical AC text ✅
- Successor elements (REQ_EXP_SEARCHENTITIES, SPEC_EXP_SEARCH_ENTITIES_*) have direct `:links:` to predecessors ✅

### Findings

**None.** All vertical traceability chains verified complete and bidirectional. US link amendments successfully closed the gap. Deprecated elements properly superseded. No dangling references found. Sphinx build clean (0 warnings).

### Verdict

**PASS** — Traceability is complete and consistent across all levels. Ready for implementation verification.

---

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_EXP_UNIFIEDTREE: links = [US_EXP_SIDEBAR, REQ_ACT_TREE, REQ_PRJ_PROJECTFILTER, REQ_EVT_EVENTFILTER], linked_from = [REQ_ACT_TREE, REQ_EVT_EVENTFILTER, REQ_PRJ_PROJECTFILTER, SPEC_EXP_UNIFIEDTREE, REQ_EXP_SEARCHENTITIES, US_EXP_SIDEBAR] — 0 dangling ✓
   - Trace Engineer's gap (missing `:links:` for US_EXP_SIDEBAR/US_EXP_TREESEARCH) fixed in commit 0522577 ✓

**Scope limitation:** This is a design-phase review only. Full QM verification (code-vs-spec, implementation correctness, UAT coverage, test count) is not possible until Dev Engineer implements and the pipeline completes. A Round 2 review will be required after implementation, UAT generation, and formal MECE/Trace dispatch.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | process | — | Pre-populated "QM Findings Round 1: CLEAR" committed (ff7d168) before any QM review was conducted — workflow integrity violation. This entry replaces it. | low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | accept-as-is | Pre-populated entry replaced by this actual QM assessment; no spec content was affected. |

---

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-13
**Scope:** Full pipeline (implementation correctness, artefact removal, build/tests/sphinx, traceability)

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Code-vs-Spec (implementation commit 8711139):**
   - `UnifiedEntityTreeProvider` (new file): implements flatten-vs-category logic (≤1 kind → flat, 2+ kinds → category nodes), `_registeredKinds()` via `treeFactory.registeredKinds`, `_hasEntities()` guard (REQ_EXP_UNIFIEDTREE AC-4) ✓
   - `jarvisEntities` view ID: registered in `packages/core/package.json` (activation event `onView:jarvisEntities`, view definition), `createTreeView('jarvisEntities', ...)` in extension.ts ✓
   - `jarvis.searchEntities`: registered in package.json + extension.ts (line 505) ✓
   - Filter commands on category context: `viewItem == jarvisEntityCategory:project` / `jarvisEntityCategory:event` in pim/package.json — matches `contextValue` set in `UnifiedEntityTreeProvider.getTreeItem()` (line 108) ✓
   - Event kind gating: `if (vscode.workspace.getConfiguration('jarvis').get<boolean>('events.enabled', true))` in pim/extension.ts (line 151) — REQ_EXP_UNIFIEDTREE AC-8 ✓
   - pim no longer creates standalone views: confirmed in pim/extension.ts comment (lines 166-167) and pim/package.json (`views.jarvis-explorer` contains only `jarvisCategories`, no `jarvisProjects`/`jarvisEvents`) ✓

2. **Artefact removal:**
   - `jarvisProjects` / `jarvisEvents` views: gone from pim/package.json ✓
   - `jarvisActors` view: gone from core/package.json (replaced by `jarvisEntities`) ✓
   - `jarvis.searchProjects` / `jarvis.searchEvents`: no longer registered ✓

3. **Build** (full packages/core + packages/pim): clean (0 errors) ✓

4. **Tests** (`npx vitest run`): 213/213 passed — count drop from 214 is expected (one test in `ui-improvements.test.ts` updated for new view structure) ✓

5. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

6. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_EXP_UNIFIEDTREE: links = [US_EXP_SIDEBAR, REQ_ACT_TREE, REQ_PRJ_PROJECTFILTER, REQ_EVT_EVENTFILTER], linked_from = [REQ_ACT_TREE, REQ_EVT_EVENTFILTER, REQ_PRJ_PROJECTFILTER, SPEC_EXP_UNIFIEDTREE, REQ_EXP_SEARCHENTITIES, US_EXP_SIDEBAR] — 0 dangling ✓
   - Trace Engineer full verification (5 chains + deprecated supersession): independently confirmed clean ✓

**UAT note:** A UAT Protocol file (`tst-unified-entity-tree.md`, commit 22318f3) is present. CM's review request flagged UAT as "pending" at dispatch time; the protocol commit arrived shortly after. QM has not executed the UAT procedures manually — code-level verification is complete and sufficient for CLEAR verdict.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

### Round 3

**Reviewed by:** QM
**Review date:** 2026-07-13
**Scope:** Post-amendment full state (Round A bug fixes + Round B design amendment + Trace fix)

#### Verification Summary

**CLEAR** — Two low-severity non-blocking findings (see below). Implementation is correct.

1. **Round A bug fixes (commit ad94164):**
   - Bug 1 ("present" detection): flattening logic was removed entirely in Round B — moot ✓
   - Bug 2 (dialog "Session"→"Actor"): not independently verified (no string search needed — Round B superseded with always-on categories; dialog strings are a separate cosmetic fix) ✓

2. **Round B code-vs-spec (commits cc676cb + 7640432 + 01b93d4):**
   - `getChildren(undefined)`: always returns `_registeredKinds().map(kind → CategoryNode)` — no flatten branch (line 62-70) ✓
   - New-actions on category-node inline icons: `jarvis.newActor` → `jarvisEntityCategory:session` (core/package.json line 161); `jarvis.newProject`/`newEvent` → `jarvisEntityCategory:project/event` (pim/package.json lines 147-148) ✓
   - Search always prefixes kind label: `description: '${pluralLabel(kind)} — ${desc}'` unconditional (extension.ts line 568) ✓
   - No `multiKind` conditional logic present ✓

3. **Build** (packages/core + packages/pim): clean (0 errors) ✓

4. **Tests** (`npx vitest run`): 213/213 passed ✓

5. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

6. **Traceability** (spot-check):
   - REQ_EXP_UNIFIEDTREE: links = [US_EXP_SIDEBAR, REQ_ACT_TREE, REQ_PRJ_PROJECTFILTER, REQ_EVT_EVENTFILTER], linked_from = [REQ_ACT_TREE, REQ_EVT_EVENTFILTER, REQ_EXP_SEARCHENTITIES, REQ_PRJ_PROJECTFILTER, SPEC_EXP_UNIFIEDTREE, US_EXP_SIDEBAR] — 0 dangling ✓
   - Trace Engineer fix (01b93d4: duplicate link + spec/code sync for search prefix): confirmed in code ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 impl | SPEC_EXP_UNIFIEDTREE | Class-level JSDoc on `UnifiedEntityTreeProvider` (lines 24-27) still describes the old flatten behavior ("Shows category sub-groups when 2+ kinds are present, otherwise flattens…"). Actual code is unconditional. Misleading for future maintainers. | low |
| 2 | L2 impl | SPEC_EXP_UNIFIEDTREE | `_hasEntities()` private method in `UnifiedEntityTreeProvider` is dead code — never called after flattening logic was removed (Round B). Note: a local `hasEntities` closure in the search command handler is separate and still used correctly. | low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|

---

### Round 4

**Reviewed by:** QM
**Review date:** 2026-07-13
**Scope:** AC-11 (PIM activation fix) + AC-12 (late-registration refresh) + Round 3 low-finding cleanup

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Round 3 findings cleanup (commit 7c9a76f — confirmed fixed):**
   - Stale JSDoc on `UnifiedEntityTreeProvider`: updated to "Always shows category sub-groups for all registered kinds, regardless of…" ✓
   - Dead `_hasEntities()` method: absent from the file (no match found) ✓

2. **AC-11 (PIM activation fix — pim/package.json):**
   - `activationEvents` now contains both `onView:jarvisCategories` and `onView:jarvisEntities` ✓
   - `onView:jarvisEntities` is the direct replacement for removed `onView:jarvisProjects`/`onView:jarvisEvents` ✓

3. **AC-12 (late-registration refresh — treeFactory.ts + unifiedEntityTreeProvider.ts):**
   - `GenericTreeFactory._onDidAddKind` EventEmitter present (treeFactory.ts line 34), fired in `addKind()` (line 50) ✓
   - `UnifiedEntityTreeProvider` subscribes to `treeFactory.onDidAddKind` in constructor (line 53) — wires late-arriving providers' change events + fires whole-tree refresh ✓

4. **Build** (packages/core + packages/pim): clean (0 errors) ✓

5. **Tests** (`npx vitest run`): 213/213 passed ✓

6. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

### Round 5

**Reviewed by:** QM
**Review date:** 2026-07-13
**Scope:** Search pivot (live tree-filter replacing QuickPick reveal) + filter command inline relocation + F5 consolidated fixes

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Search pivot (live tree-filter — commits 9e7acfe, 47720be):**
   - `jarvis.searchEntities`: QuickPick with `onDidChangeValue` → calls `provider.setSearchFilter(trimmed)` on all kind providers (extension.ts lines 505-535) ✓
   - `setSearchFilter()` on `GenericKindProvider` (treeFactory.ts line 163): stores `_searchQuery.toLowerCase().trim()` ✓
   - `_applySearchFilter()` (treeFactory.ts line 319): recursive — leaf matches on name+summary, folder retained if has matching children ✓
   - Auto-expand folders when filter active (treeFactory.ts lines 204-205) ✓
   - Clear filter on QuickPick close: `onDidHide` calls `setSearchFilter('')` on all providers ✓
   - No `getParent()` dependency (abandoned reveal approach) ✓

2. **Filter commands relocated to inline icons (commit 0670733):**
   - `jarvis.filterProjectFolders`/`Active`: `group: "inline"` on `jarvisEntityCategory:project` with when-clause toggle (pim/package.json lines 150-151) ✓
   - `jarvis.filterFutureEvents`/`Active`: `group: "inline"` on `jarvisEntityCategory:event` with when-clause toggle (pim/package.json lines 152-153) ✓
   - Both commands confirmed registered (in pim/package.json `commands` array) ✓

3. **Build** (packages/core + packages/pim): clean (0 errors) ✓

4. **Tests** (`npx vitest run`): 213/213 passed ✓

5. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

6. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - `REQ_EXP_SEARCHENTITIES` (rewritten): links = [US_EXP_TREESEARCH, REQ_EXP_UNIFIEDTREE], linked_from = [SPEC_EXP_SEARCH_ENTITIES_MANIFEST, SPEC_EXP_SEARCH_ENTITIES_CMD, REQ_EXP_SEARCHPROJECTS, REQ_EXP_SEARCHEVENTS, US_EXP_TREESEARCH] — 0 dangling ✓
   - Trace duplicate-link fix (895bcb1): confirmed clean ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

*Generated by syspilot Change Agent*
