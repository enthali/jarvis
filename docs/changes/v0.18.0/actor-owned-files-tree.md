# Change Document: actor-owned-files-tree

**Status**: in-progress
**Branch**: feature/actor-owned-files-tree
**Created**: 2026-07-15
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Replace the fixed 3-file MVP (`context.md`, `session.yaml`/`actor.yaml`/`project.yaml`/`event.yaml`, agent file) under each entity node with a recursive subtree of **all files actually present in the entity's own folder**. This replaces the fixed list entirely; it does not add a 4th category alongside it.

All `.md` files (including `context.md` and `*.agent.md`) open as rendered **Markdown Preview** — more readable than raw text for the average user. VS Code's preview toolbar offers "Open Source" for anyone who needs to edit. All other files open as a normal text editor in VS Code's standard **preview mode** (single click reuses the same preview tab; double-click pins it) — this matches ordinary VS Code Explorer browsing behavior and avoids tab explosion when browsing many files. Both open in the fixed Docs column (column 2), consistent with existing entity-file placement (`SPEC_MSG_EDITORPLACEMENT`). Right-click: "Copy Path" / "Copy Full Path" (existing, unchanged).

Acceptance: all files in the entity's own folder appear as child nodes, sorted alphabetically; subfolders expand recursively; `.md` files open as Markdown Preview; other files open in preview mode; hidden files/folders included; works for actors/sessions, projects, and events uniformly; tree updates when files are added/removed from the entity folder; fixed 3-file MVP list is fully replaced, not additive.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ENT_ENTITY_FILES_TREE | Entity File Children in Tree | modified | Rewritten from fixed-3-file-list to Agent/Files category layer with recursive folder scan, Markdown Preview vs. preview-mode split, and eventually-consistent reactivity. |

### New User Stories

None — per PM's explicit instruction, no new US/REQ/SPEC IDs; all amendments are in-place rewrites of existing elements.

### Decisions

- Decision 1 (escalated to CM, confirmed): category layer design (Option B) — two per-entity category nodes, "Agent" (conditional on `agent` field + resolvable file) and "Files" (always present, recursive scan of the entity's own folder). A future "Recently Modified" category is designed as a drop-in extension (same node-kind pattern) but not implemented.
- Decision 2 (escalated to CM, confirmed): reactivity is eventually-consistent within the existing scan interval / manual "Jarvis: Rescan" — no new `FileSystemWatcher` introduced. Explicitly documented as deferred, not omitted.
- Decision 3 (escalated to CM, confirmed): the stale `SPEC_ENT_ENTITY_FILE_CHILDREN` code-sample architecture (three hand-written providers, a pre-unification design) is corrected to describe the real, current `GenericTreeDataProvider`/`treeFactory.ts` architecture as part of this CR, at zero extra cost since the spec was being rewritten anyway. The prior revision's dangling reference to nonexistent IDs (`SPEC_EXP_ENTITY_FILE_CHILDREN`/`REQ_EXP_ENTITY_FILE_CHILDREN`) is also resolved (removed, replaced by the correct existing IDs).
- Decision 4 (escalated to CM, confirmed): the agent-file child is **kept**, not dropped, even though it does not physically live inside the entity's own folder (it lives in the shared `.github/agents/` location) — represented as its own "Agent" category rather than folded into "Files", since it is conceptually distinct (a *reference* to a shared file, not an owned file).
- Decision 5 (made without escalation, disclosed here): the new recursive file-subtree node types (`EntityFileCategoryNode`/`EntityFileNode`/`EntityFileFolderNode`) are added to the tree provider's internal `ProviderNode` union (`packages/core/src/engine/core/treeFactory.ts`), **not** to `yamlScanner.ts`'s exported `TreeNode` union — this provably avoids widening the `collectLeaves()`/`v0.15.1`-class regression risk to a 4th `TreeNode` variant, since these new nodes never leave the provider (same principle already used for the existing `ChildTreeNode` hook-children mechanism). A verification step (grep for exhaustive `.kind` checks) is added to the SPEC for Dev Engineer as a belt-and-suspenders check.
- Decision 6 (made without escalation, disclosed here): alphabetical sort of the "Files" listing is one single pass over files and folders together (not folders-first) — a literal reading of the CD's "sorted alphabetically" wording. Flagged as easily reversible if folders-first is later preferred (common Explorer convention).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — the fixed-list's inability to represent a user's actual files is exactly the gap this CR closes

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ENT_ENTITY_FILE_CHILDREN | US_ENT_ENTITY_FILES_TREE | modified | AC-1 unchanged; AC-2 struck through (superseded) and replaced by AC-2a/AC-2b/AC-2c (category layer + recursive scan + Agent-category condition); AC-4 rewritten (extension-based `.md` check + preview-mode branch); AC-5 renumbered with new `contextValue` naming for category/folder nodes; new AC-7/AC-8 (Copy Path/Path unchanged, reactivity via existing rescan). |
| REQ_UAT_ENTITY_FILES_TREE | US_UAT_ENTITY_FILES_TREE | modified | Full rewrite: test data extended (extra files/subfolder/hidden file in `alpha`), ACs rewritten for category-layer behavior, new ACs for recursive listing, preview-mode, stale-cache fail-open, and rescan-reflected changes. |

### New Requirements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: `REQ_ENT_ENTITY_FILE_CHILDREN` AC-2c's "present = has content" condition for the Agent category is satisfied for free by `discoverAgentModes()`'s existing behavior (it only ever enumerates agent files that exist at scan time) — no additional `fs.existsSync` check needed. This does introduce one genuine fail-open edge case (agent file removed *after* the module-level cache was populated) — documented explicitly as AC-6/AC-7 (REQ and UAT respectively) rather than silently accepted.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories — n/a, no new REQs

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_ENTITY_FILE_CHILDREN | REQ_ENT_ENTITY_FILE_CHILDREN | modified | Full rewrite: (1) behavior change to Agent/Files category layer + recursive scan, matching the new REQ; (2) architecture correction — code samples now describe the real `GenericTreeDataProvider`/`treeFactory.ts` implementation instead of the stale pre-unification three-provider illustration, and the dangling `SPEC_EXP_*`/`REQ_EXP_*` reference is removed. `:links:` updated: `SPEC_EXP_PROVIDER` → `SPEC_ENG_TREEFACTORY` (the actual current provider spec). |
| SPEC_UAT_ENTITY_FILES_TREE | REQ_UAT_ENTITY_FILES_TREE | modified | Full rewrite of the scenario table (T-1 through T-13) matching the category-layer behavior; branch reference updated to `feature/actor-owned-files-tree`. |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: `openAtDocs()` (`packages/core/src/extension.ts`) gains an optional `{ preview?: boolean }` parameter (default `false`, preserving all other/future callers' behavior unchanged) rather than a new parallel function — confirmed via code read that it has exactly one existing call site (the entity-file-open command itself), so widening its signature carries no risk to other callers.
- Decision 2: the Agent category's single child is resolved fresh on every expansion of the "Agent" category node (not memoized beyond the existing `discoverAgentModes()` module-level cache) — cheap (one cache lookup + array `find()`), and keeps the implementation simple; no separate caching layer for the category-to-child mapping itself.
- Decision 3: `resolveCopyPaths()` (existing Copy Path/Copy Full Path helper) needs its parameter type widened from `FileNode | LeafNode` to also accept the new `EntityFileNode`/`EntityFileFolderNode` shapes (structurally compatible: `filePath`/`folderPath` + `label`) — a type-compatibility note only, no behavior change, left as a small Dev Engineer implementation detail rather than fully specified here (consistent with how much of this spec already defers small type-plumbing choices to implementation).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements — n/a, no new SPECs

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_ENTITY_FILES_TREE | REQ_ENT_ENTITY_FILE_CHILDREN | SPEC_ENT_ENTITY_FILE_CHILDREN | ✅ |
| US_UAT_ENTITY_FILES_TREE | REQ_UAT_ENTITY_FILES_TREE | SPEC_UAT_ENTITY_FILES_TREE | ✅ |

Confirmed via `get_need_links.py REQ_ENT_ENTITY_FILE_CHILDREN --direction both` — clean bidirectional links, no dangling references (the previously-dangling `SPEC_EXP_ENTITY_FILE_CHILDREN`/`REQ_EXP_ENTITY_FILE_CHILDREN` code-comment references have been removed as part of this CR's architecture correction).

### Artefakt-Removal-Check

Not a removal in the traceability sense (no REQ/SPEC ID is deleted — all four touched IDs are amended in place). However, the fixed 3-file MVP **behavior** is fully replaced, not kept alongside, per the CD's explicit instruction. There is no separate "artefact" (file, config key, or ID) to grep for beyond the behavior itself, which is entirely described by the amended REQ/SPEC text above — no dedicated removal-check table is applicable.

- [x] All class (a) active code/workflow references — n/a, this CR does not remove a named artefact
- [x] All class (b) active documentation references — n/a, same reason; the one genuine "removal" (the dangling `SPEC_EXP_*`/`REQ_EXP_*` code-comment reference) is fixed as part of the Level 2 rewrite above
- [x] Class (c) — n/a

### Issues Found

- [x] Issue 1: `SPEC_ENT_ENTITY_FILE_CHILDREN`'s previous revision described an architecture (three hand-written `TreeDataProvider` classes) that no longer matches the real code (the unified `GenericTreeDataProvider`/`treeFactory.ts` engine), and carried a broken reference to spec IDs that don't exist (`SPEC_EXP_ENTITY_FILE_CHILDREN`/`REQ_EXP_ENTITY_FILE_CHILDREN`). Root-caused during this CR's mandatory impact analysis (reading the actual current code before designing the amendment, rather than trusting the existing spec's code samples at face value). Fixed at zero extra cost since the spec needed a full rewrite anyway for the behavior change — see Level 0 Decision 3.
- [x] Issue 2: adding a new `TreeNode`-adjacent node kind risked repeating the exact class of bug fixed by `v0.15.1`'s `pim-treenode-filenode-fix` (an if/else-chain consumer silently not handling a new union variant). Resolved architecturally (new nodes kept provider-local, never assigned to the shared `TreeNode` type) rather than by review alone — see Level 0 Decision 5. A Dev Engineer verification step (grep for exhaustive `.kind` checks across `packages/core` and `packages/pim`) is added to the SPEC as a belt-and-suspenders confirmation, per CM's explicit request to keep this check visible.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining — the superseded AC-2 in REQ_ENT_ENTITY_FILE_CHILDREN is struck through with a clear pointer to its replacement, not left dangling)
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
**Review date:** 2026-07-16

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Code-vs-spec:**
   - **Provider-local node types (AC-10):** `EntityFileCategoryNode`, `EntityFileNode`, `EntityFileFolderNode` defined in `treeFactory.ts` (lines 31-54) and combined into `ProviderNode`. Zero matches in `yamlScanner.ts` — correctly kept provider-local, shared `TreeNode` union untouched ✓
   - **`getEntityFileChildren()` removed from yamlScanner.ts:** confirmed absent (zero matches) ✓
   - **AC-4a (.md → Markdown Preview):** `path.extname(node.filePath).toLowerCase() === '.md'` → `markdown.showPreview(uri, DOCS_COLUMN)` in extension.ts ✓
   - **AC-4b (non-.md → preview mode):** `openAtDocs(uri, { preview: true })` — `openAtDocs` correctly accepts optional `{ preview?: boolean }` parameter ✓
   - **Agent category (conditional, AC-2a):** `EntityFileCategoryNode` only created when agent file resolves (`_getLeafChildren` → `_getAgentCategoryChildren`) ✓

2. **Build** (packages/core + packages/pim): clean (0 errors) ✓

3. **Tests** (`npx vitest run`): 213/213 passed ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_ENT_ENTITY_FILE_CHILDREN: links = [US_ENT_ENTITY_FILES_TREE, US_ACT_ACTORS, US_ENT_ENTITYPARITY, REQ_EXP_TREEVIEW, REQ_MSG_EDITORPLACEMENT], linked_from = [SPEC_ENT_ENTITY_FILE_CHILDREN, REQ_ENT_ENTITY_CONTEXTMENU, REQ_UAT_ENTITY_FILES_TREE] — 0 dangling ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
