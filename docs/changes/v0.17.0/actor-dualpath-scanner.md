# Change Document: actor-dualpath-scanner

**Status**: in-progress
**Branch**: feature/actor-dualpath-scanner
**Created**: 2026-07-07
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Phase 2 of the "Consequent Actor Renaming" initiative. Introduces the new on-disk naming convention for Actor entities (`.jarvis/actors/*/actor.yaml`) alongside the existing convention (`.jarvis/sessions/*/session.yaml`), and makes the scanner read both, merging them into one logical Actor list. The "New Actor" creation command switches to writing only the new convention going forward. Old-named actors remain fully supported forever — read/write of their content (context.md, etc.) is unaffected; only the naming convention itself is frozen for existing actors (no forced migration, no end date, no auto-rename). A workspace may indefinitely contain a mix of old- and new-named actor folders, and the tooling must tolerate that mix at all times, not just during a transition window. Storage/scanner code only — no UI tree restructuring (that's Phase 3, Unified Entity Tree) and no LM/MCP tool renames (Phase 5).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_ACTORS | Actor Entity Type | unchanged | Referenced only; its own note updated to point at the new US below as "the separate, future code migration" it anticipated |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ACT_DUALPATH_STORAGE | Soft Actor Storage-Convention Migration | required |

### Decisions

- New US needed (unlike the two prior Actor-renaming phases) because this is a genuinely new, distinct user-facing capability — permanent dual-convention tolerance plus a forward-only convention switch for new Actors — not merely a UI-label or internal-identifier alignment fulfilling an already-specified need.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — fills the storage-migration gap `US_ACT_ACTORS`'s own note explicitly deferred to "a separate, future code migration"

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_NEWENTITY | US_ACT_ACTORS | modified | AC-2/AC-3/AC-6 rewritten — new Actor creation now writes `.jarvis/actors/<name>/actor.yaml` (was `.jarvis/sessions/<name>/session.yaml`); command ID (`jarvis.newActor`) unaffected |
| REQ_ACT_CREATETOOL | US_ACT_CREATETOOL | modified | AC-2/AC-5/AC-10 rewritten — `jarvis_createSession` tool now writes the new convention; tool name/schema unaffected (Phase 5 concern) |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ACT_DUALPATH_SCANNER | Dual-Path Actor Storage Convention Scanner | US_ACT_DUALPATH_STORAGE; REQ_ACT_TREE | required |

### Conflicts Detected

- None. `REQ_ACT_TREE` (view/tree rendering) is entirely unaffected — it already operates generically on whatever entities the scanner surfaces, regardless of source convention, so no amendment was needed there beyond a `:links:` cross-reference from the new REQ.

### Decisions

- **Permanent, not time-boxed** (per CD Summary's explicit constraint): `REQ_ACT_DUALPATH_SCANNER` AC-6 explicitly states no sunset date/deprecation warning/migration prompt is introduced — this is a standing dual-support contract, not a transition window.
- **Same-name-across-conventions edge case accepted, not prevented**: if an old-convention Actor and a new-convention Actor happen to share the same folder `<name>`, both appear as two separate entities (AC-3) — the create-tool's idempotency check (`REQ_ACT_CREATETOOL` AC-5) only checks the new-convention folder, deliberately not cross-checking the old one, to avoid adding cross-convention lookup complexity for what is expected to be a rare coincidence.
- **Folder-name collision (category/grouping subfolders) accepted, not merged** (AC-7): two folder nodes with the same display name from different conventions render as siblings rather than being merged — folder-identity merging across physically different parent directories was judged not worth the added complexity for a cosmetic edge case.

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
| SPEC_ACT_NEWENTITY | REQ_ACT_NEWENTITY | modified | Write-path steps 1/6/7 rewritten to `ensureActorsDir()`/`actor.yaml` |
| SPEC_ACT_CREATETOOL | REQ_ACT_CREATETOOL | modified | Idempotency check, file layout, response shapes, tool description/schema text all rewritten to the new convention; auto-open `LeafNode.id` now targets `actor.yaml` |
| SPEC_CFG_PATHRESOLVER | REQ_CFG_FIXEDPATHS | modified | New `getActorsDir()`/`ensureActorsDir()` functions added, mirroring the existing session pair; new cross-link to `REQ_ACT_DUALPATH_SCANNER` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ACT_DUALPATH_SCANNER | Dual-Path Actor Storage Convention Scanner | REQ_ACT_DUALPATH_SCANNER; SPEC_CFG_PATHRESOLVER |

### Conflicts Detected

- None.

### Decisions

- **`EntityKindConfig.additionalScanRoots` designed as a generic, optional extension point** (not an actor-only hardcoded special case) — keeps the engine's Project/Event contract completely untouched (they simply never set the field) while giving the session/actor kind exactly the one extra root it needs; a future kind with a similar dual-convention need could reuse the same mechanism without further engine changes.
- **Merge-sort, not concatenate-then-resort**: `_mergeSortedTrees()` merges two already-sorted lists in O(n) rather than re-deriving sort keys for a full re-sort — a minor efficiency choice consistent with each root's own `_buildTree()` call already producing a sorted list.
- **No new user-facing setting** for the actors folder path — `.jarvis/actors/` is fixed, exactly mirroring `jarvis.sessions.folder`'s existing "no folder setting" pattern (`US_ACT_ACTORS` AC-1), for consistency.
- Found and fixed several stale `session.yaml`/`.jarvis/sessions/` references in `SPEC_ACT_CREATETOOL`'s tool-description/schema/response-shape code samples while amending it — all were within this CR's own scope (the tool's write-path documentation), not separate pre-existing drift.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_DUALPATH_STORAGE | REQ_ACT_DUALPATH_SCANNER | SPEC_ACT_DUALPATH_SCANNER, SPEC_CFG_PATHRESOLVER | ✅ |
| US_ACT_ACTORS (unchanged) | REQ_ACT_NEWENTITY, REQ_ACT_CREATETOOL (both modified) | SPEC_ACT_NEWENTITY, SPEC_ACT_CREATETOOL (both modified) | ✅ |

`get_need_links.py --direction both` spot-checked on `US_ACT_DUALPATH_STORAGE`, `REQ_ACT_DUALPATH_SCANNER`, `SPEC_ACT_DUALPATH_SCANNER`, `REQ_ACT_NEWENTITY` — no dangling references in either direction. Sphinx build 0 warnings.

### Artefakt-Removal-Check

_Not applicable — no artefacts removed. Old-convention Actors and their `session.yaml`/`.jarvis/sessions/` files are explicitly preserved forever (this CR's whole point); nothing is deprecated or deleted._

### Issues Found

- None blocking.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Generation

**Status**: ✅ completed

**Performed by**: Test Designer

### Coverage Summary

Extended the existing Sessions Feature UAT chain (`US_UAT_ACT_SESSIONS` / `REQ_UAT_ACT_TREE` / `SPEC_UAT_ACT_SCENARIOS`) with eight new test scenarios (T-17 through T-24) covering the Phase 2 dual-path storage convention support:

| Scenario | Coverage |
|----------|----------|
| **T-17: Old-convention only** | Verifies backward compatibility — scanner finds old-convention actors from `.jarvis/sessions/*/session.yaml` only when new convention doesn't exist. |
| **T-18: New-convention only** | Verifies scanner discovers new-convention actors from `.jarvis/actors/*/actor.yaml` only when old convention doesn't exist. |
| **T-19: Mixed conventions** | Verifies scanner merges both old and new conventions into a single tree with no visible distinction between sources. |
| **T-20: New-convention write (command)** | Verifies that `Jarvis: New Actor` command creates only under new convention (`.jarvis/actors/`, not `.jarvis/sessions/`). |
| **T-21: New-convention write (tool)** | Verifies that `jarvis_createSession` tool creates only under new convention. |
| **T-22: Same-name edge case** | Verifies that when the same actor name exists under both conventions, both appear as separate distinct nodes (not deduplicated). |
| **T-23: Old-convention context.md writable** | Verifies that old-convention actors' `context.md` files remain fully writable — no freezing or read-only markers. |
| **T-24: Project/Event regression** | Verifies that Project and Event scanners are unaffected — they continue to use single-convention folders with no cross-convention logic. |

### Amended Requirements & Specs

- **AC-9 (REQ_UAT_ACT_TREE)**: Added dual-path scanner coverage requirement linking to T-17 through T-24
- **AC-2 (REQ_UAT_ACT_NEWENTITY)**: Amended to reflect new-convention write path (`.jarvis/actors/`, not `.jarvis/sessions/`)
- **New REQ_UAT_ACT_DUALPATH_SCANNER**: Complete new requirement section documenting all 8 acceptance criteria for dual-path support (T-17 through T-24)
- **SPEC_UAT_ACT_SCENARIOS**: Extended description to reference 24 test scenarios (was 16); updated `:links:` to include new `REQ_UAT_ACT_DUALPATH_SCANNER`; added all 8 new test outcome rows

### Verification

- **Sphinx build**: 0 warnings; all links valid
- **Traceability**: `get_need_links.py --direction both` on `REQ_UAT_ACT_DUALPATH_SCANNER` confirms links clean (outgoing: `US_UAT_ACT_SESSIONS`, `REQ_ACT_DUALPATH_SCANNER`, `REQ_ACT_NEWENTITY`, `REQ_ACT_CREATETOOL`; incoming: `SPEC_UAT_ACT_SCENARIOS`)
- **UAT chain extended**: Extended existing sessions-feature chain; no new UAT files created

### Handoff Note

The dual-path scanner mechanism is described in the design specs via updated code samples and cross-references to `REQ_ACT_DUALPATH_SCANNER` (EntityKindConfig.additionalScanRoots, merger logic, getActorsDir()/ensureActorsDir() helpers). Test scenarios document user-observable behavior (mixed workspaces, creation paths, edge cases, backward compatibility, regression checks). Implementation verification is the Verify Engineer's responsibility.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-08

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed:

1. **Code-vs-Spec:**
   - `EntityKindConfig.additionalScanRoots` field: defined in `yamlScanner.ts` (line 256), generic/optional — Project/Event unaffected (neither sets it; pim package has zero `additionalScanRoots` references) ✓
   - Session/actor kind config wires `{ folderSettingKey: 'jarvis.actors.folder', conventionFile: 'actor.yaml' }` (extension.ts lines 433-434); folder resolver handles `jarvis.actors.folder` via `configPaths.getActorsDir()` (line 392-393) ✓
   - `_mergeSortedTrees()`: O(n) merge sort in `yamlScanner.ts` (lines 473-491), merges two sorted lists by name-key ✓
   - `getActorsDir()` / `ensureActorsDir()`: present in `packages/core/src/engine/core/configPaths.ts` (lines 77-86) ✓
   - `jarvis.newActor` writes `actor.yaml` to actors dir (extension.ts lines 1023/1032/1044) ✓
   - `jarvis_createSession` tool writes `actor.yaml` to actors dir (extension.ts lines 1079/1097) ✓
   - **Permanence check:** no migration, rename, freeze, or deprecation logic on old-convention `session.yaml` actors — old actors remain fully live ✓
   - **Scope integrity:** `additionalScanRoots` not present in `packages/pim` — Project/Event scanners genuinely unaffected ✓

2. **Build** (`npx tsc -p packages/core`): clean (0 errors) ✓

3. **Tests** (`npx vitest run`): 214/214 passed (22 test files, 0 failures) ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - `REQ_ACT_DUALPATH_SCANNER`: links = [US_ACT_DUALPATH_STORAGE, REQ_ACT_TREE], linked_from = [SPEC_ACT_DUALPATH_SCANNER, SPEC_CFG_PATHRESOLVER, REQ_UAT_ACT_DUALPATH_SCANNER] — 0 dangling ✓

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
