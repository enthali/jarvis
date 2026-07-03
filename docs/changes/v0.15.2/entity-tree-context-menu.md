# Change Document: entity-tree-context-menu

**Status**: design-complete
**Branch**: feature/entity-tree-context-menu
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Two independent, small cleanups to the entity tree's interaction model. Part 1: remove the 2 inline icon buttons (`jarvis.openContext`, `jarvis.openYamlFile`) currently shown on Project/Event/Actor root tree nodes — these are now redundant since `entity-files-tree` already exposes context.md/session.yaml/agent-file as expandable, individually-openable tree children. Part 2: add a new right-click context menu with 3 entries — Open, Copy Path (absolute folder path, no filename), Copy Full Path (absolute path incl. filename) — for both the file-children nodes and the Project/Event/Actor root nodes themselves (where Copy Path/Copy Full Path are equivalent, folder-only). Motivation: users frequently need the absolute filesystem path to a session/project/event artifact (e.g. to paste into another tool or terminal), and the current inline icons duplicate functionality already available via the file-children tree. Acceptance: no inline icons remain on entity root nodes; right-click on any file-child or entity root node offers Open/Copy Path/Copy Full Path, both copying full absolute OS paths to the clipboard.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ENT_ENTITYPARITY | Entity Feature Parity (Projects & Events) | referenced | new REQ_ENT_ENTITY_CONTEXTMENU links up here — consistent right-click surface across all 3 kinds is a parity concern |
| US_ENT_ENTITY_FILES_TREE | Entity File Children in Tree | referenced | the file-children capability this CR's context menu extends |
| US_ENT_OPENCONTEXT | Open Context File from Tree Node | referenced | REQ_ENT_OPENCONTEXT (inline icon retirement) and REQ_ENT_ENTITY_ICONS (superseded) both link here |

### New User Stories

None — this CR is a UI-interaction refinement of already-established entity-tree capabilities (file children, click-to-chat, context.md discovery). No new user-facing capability warrants a new US; the new REQ links upward to the 3 existing USes above.

### Decisions

- No new US needed: removing 2 redundant inline icons and adding a right-click Open/Copy Path/Copy Full Path menu are both refinements of interaction mechanics already covered by `US_ENT_ENTITYPARITY` (equal-peer-kinds principle) and `US_ENT_ENTITY_FILES_TREE` (file-children capability this menu builds on).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — confirmed no new US required

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ENT_OPENYAML | US_ENT_OPENYAML | modified | rewritten as fully "Retired" (command entirely removed, not just inline placement) |
| REQ_ENT_OPENCONTEXT | US_ENT_OPENCONTEXT | modified | rewritten as fully "Retired" (command entirely removed, not just inline placement) |
| REQ_ENT_ENTITY_ICONS | US_ENT_ENTITYPARITY | modified | entire requirement superseded — rewritten in place (kept, not deleted: zero incoming links, safe) documenting both inline icons are gone |
| REQ_ENT_ENTITY_TREECLICK | US_ENT_ENTITYPARITY | modified | stale "inline button remains" claim removed from description/AC-2 (Trace Engineer finding) |
| REQ_ACT_OPENCONTEXT | US_ACT_ACTORS | modified | rewritten as fully "Retired", mirroring REQ_ENT_OPENCONTEXT (MECE Engineer HIGH finding — ACT-theme mirror of the retired command was missed in the original pass) |
| REQ_ACT_CONTEXTMENU | US_ACT_ACTORS | modified | AC-1 rewritten — no longer asserts the retired "Open Context" inline entry; now points to the new Open/Copy Path/Copy Full Path menu (MECE Engineer HIGH finding) |
| REQ_ACT_TREECLICK | US_ENT_ENTITYPARITY | modified | AC-2/AC-4/AC-5 rewritten as historical/superseded — no longer contradicts SPEC_ACT_TREECLICK's already-correct framing (MECE Engineer HIGH finding) |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ENT_ENTITY_CONTEXTMENU | Entity Tree Context Menu — Open / Copy Path / Copy Full Path | US_ENT_ENTITYPARITY; US_ENT_ENTITY_FILES_TREE; US_ENT_OPENCONTEXT; REQ_ENT_ENTITY_FILE_CHILDREN; REQ_ENT_ENTITY_TREECLICK; REQ_ENT_AGENTSESSION; REQ_ENT_OPENYAML; REQ_ENT_OPENCONTEXT | optional |

### Conflicts Detected

None. The 3 modified REQs receive additive/corrective edits (retiring stale ACs, documenting supersession) that don't contradict any surviving AC content.

### Decisions

- Decision 1 (Part 1 scope call): "Open" on entity root nodes reuses the existing `jarvis.openAgentSession` command (click-to-chat) rather than `jarvis.openContext`/`jarvis.openYamlFile` — the root node's established primary interaction is already click-to-chat, so "Open" on right-click mirrors that for discoverability instead of introducing a second, different meaning of "open" for the same node.
- Decision 2 (resolved, PM decision 2026-07-02): as a consequence of Decision 1 plus the inline-icon removal, `jarvis.openContext` and `jarvis.openYamlFile` had **zero remaining callers**. Originally flagged (not resolved) since CM's task said "the underlying commands themselves stay" — PM reconsidered and decided to retire both **in this CR** rather than defer, per the no-permanent-stub precedent (`entity-open-context-cleanup` retiring `jarvis.openSessionContext`). `REQ_ENT_OPENYAML`/`REQ_ENT_OPENCONTEXT` rewritten as fully "Retired" (not just inline-placement-removed); zero remaining incoming links confirmed via `get_need_links.py` before this rewrite. Full code removal is Dev Engineer's task in this same CR.
- Decision 3: Copy Path and Copy Full Path both remain visible on entity root nodes even though they resolve to the same value there (no filename to differ) — chosen over conditionally hiding one, for menu consistency across node kinds and simpler `when`-clause design (uniform 3-entry menu everywhere, no root-node special case).
- Decision 4: `REQ_ENT_ENTITY_ICONS` is rewritten in place (status kept, content marked "Superseded", ACs individually marked "Retired") rather than deleted — it has zero incoming links (verified), so deletion was safe, but rewriting preserves the historical record of what changed and why, consistent with the `SPEC_ACT_TREECLICK` "Retired section" precedent from `entity-open-context-cleanup`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] New REQ links to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_OPENYAML_CMD | REQ_ENT_OPENYAML | modified | fully retired (not just inline-registration removed) — historical handler/algorithm kept for traceability, removal instructions added for Dev Engineer |
| SPEC_ENT_OPENCONTEXT_CMD | REQ_ENT_OPENCONTEXT | modified | fully retired (not just inline-registration removed) — historical handler/algorithm kept for traceability, removal instructions added for Dev Engineer |
| SPEC_ENT_ENTITY_ICONS | REQ_ENT_ENTITY_ICONS | modified | rewritten as superseded (historical icon table/order/ACs); unrelated `jarvis.openRecording` removal content (ACs 4/5/6/9) left intact |
| SPEC_ACT_TREECLICK | REQ_ACT_TREECLICK | modified | Description, "No other changes" paragraph, AC-3, AC-5 updated — no longer claims the `$(notebook)` inline icon still invokes `jarvis.openContext` |
| SPEC_ENT_AGENTSESSION | REQ_ENT_AGENTSESSION | modified | design note fixed — no longer references the retired `$(go-to-file)` button as "existing" |
| SPEC_EXP_EXTENSION | (manifest aggregation) | modified | `REQ_ENT_OPENYAML` removed from `:links:` |
| SPEC_ACT_CONTEXTMENU | REQ_ACT_CONTEXTMENU | modified | JSON code sample's `jarvis.openContext` inline entry removed (4 entries remain); "Retired" section added (MECE Engineer HIGH finding — SPEC_ACT_TREECLICK's own note said this spec was "not otherwise touched," which was accurate at the time but became a contradiction once the command was retired) |
| SPEC_ACT_TREE | REQ_ACT_OPENCONTEXT | modified | historical note fixed (found during my own sweep, not in CM's original list) — no longer implies `jarvis.openContext` reuse is still accurate |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ENT_ENTITY_CONTEXTMENU | Entity Tree Context Menu — Open / Copy Path / Copy Full Path | REQ_ENT_ENTITY_CONTEXTMENU; SPEC_ENT_ENTITY_FILE_CHILDREN; SPEC_ENT_AGENTSESSION; SPEC_EXP_EXTENSION |

### Conflicts Detected

None.

### Decisions

- Decision 1: `jarvis.copyPath`/`jarvis.copyFullPath` are new, generic commands (not per-node-kind variants) — a single `resolveCopyPaths()` helper branches on `node.kind` (`'file'` vs entity root `LeafNode`), avoiding 4 near-duplicate command registrations for the 4 `contextValue` targets.
- Decision 2: "Open" entries reuse `jarvis.openEntityFile`/`jarvis.openAgentSession` directly as `view/item/context` bindings — no new "Open" command is registered, avoiding indirection/duplication.
- Decision 3: new `open`/`clipboard@1`/`clipboard@2` menu groups (rather than reusing the existing `context-actions` group used by Reveal/OS/Terminal) — keeps Open/Copy Path/Copy Full Path visually separate from the pre-existing Reveal-in-Explorer/OS/Terminal actions, consistent with VS Code's convention of grouping semantically-related actions with a separator between groups.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] New SPEC links to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_ENTITYPARITY (referenced) | REQ_ENT_ENTITY_CONTEXTMENU, REQ_ENT_ENTITY_ICONS | SPEC_ENT_ENTITY_CONTEXTMENU | ✅ |
| US_ENT_ENTITY_FILES_TREE (referenced) | REQ_ENT_ENTITY_CONTEXTMENU | SPEC_ENT_ENTITY_CONTEXTMENU | ✅ |
| US_ENT_OPENCONTEXT (referenced) | REQ_ENT_OPENCONTEXT, REQ_ENT_OPENYAML, REQ_ENT_ENTITY_ICONS | SPEC_ENT_OPENCONTEXT_CMD, SPEC_ENT_OPENYAML_CMD | ✅ |

Build verification: `sphinx-build -b html . _build/html -W --keep-going` — 0 warnings, 0 errors. Spot-checked via `get_need_links.py REQ_ENT_ENTITY_CONTEXTMENU --direction both --depth 1` — all 8 outgoing links and 4 incoming links resolve correctly.

### Artefakt-Removal-Check

Per PM decision (2026-07-02), `jarvis.openContext` and `jarvis.openYamlFile` are now fully retired (command + all bindings), not just their inline placement. Proactive grep sweep across code + docs (normally run at CR close, done now while already in this area):

| Removed Artefact | Class (a): Active Code/Workflow refs | Class (b): Active Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `jarvis.openContext` | `packages/core/src/extension.ts` (~line 604, registration — to be deleted by Dev Engineer); `packages/core/package.json` (3 entries: `contributes.commands`, `commandPalette`, inline menu — the inline menu entry was already removed by the earlier revision of this CR, `commands`/`commandPalette` entries remain to be deleted); `packages/pim/package.json` (1 remaining entry: `contributes.commands` equivalent, if present — verify at implementation time). **Legacy/out-of-scope**: root-level `src/extension.ts` (~line 944) and `src/tests/remove-open-recording-icon.test.ts` (line 83) also reference it, but root `src/` is confirmed **not part of the active build** (root `package.json`'s `compile` script targets `packages/core` only) — appears to be pre-monorepo-migration legacy code; flagged for awareness, intentionally out of this CR's scope (cleaning up the orphaned root `src/` tree is a separate, larger concern). | `docs/design/spec_ent.rst`, `spec_act.rst`, `docs/requirements/req_ent.rst` — all updated in this CR to document the retirement transparently (historical sections, not silent deletion). | `docs/changes/entity-open-context-cleanup.md` references `jarvis.openContext` extensively as the *surviving* unified command from that CR — accepted as historic record, that CR's own conclusions remain accurate for their own timeframe. |
| `jarvis.openYamlFile` | `packages/core/src/extension.ts` (~line 476, registration — to be deleted by Dev Engineer); `packages/core/package.json` and `packages/pim/package.json` (`contributes.commands` entries — inline menu entries already removed). **Legacy/out-of-scope**: root-level `src/extension.ts` (~line 756) and `src/tests/remove-open-recording-icon.test.ts` (line 89) — same not-part-of-active-build situation as above. | `docs/design/spec_ent.rst`, `docs/requirements/req_ent.rst` — updated in this CR. | None found referencing this specific command by name in other historic CDs. |

- [x] All class (a) active code/workflow references identified; deletion is Dev Engineer's implementation task in this same CR (not deferred)
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above
- **Note**: the root-level `src/` legacy code (not part of the active build) is disclosed above but intentionally not cleaned up in this CR — out of scope, flagged for a possible future dedicated cleanup CR if the dead root `src/` tree is ever addressed.

### Issues Found

None — the previously flagged orphaned-command issue (Level 1 Decision 2) is resolved: PM decided to retire both commands in this CR rather than defer.

### Sign-off

- [x] All levels completed (no unresolved ⚠️ DEPRECATED markers — `REQ_ENT_ENTITY_ICONS`/`REQ_ENT_OPENYAML`/`REQ_ENT_OPENCONTEXT`/`SPEC_ENT_ENTITY_ICONS`/`SPEC_ENT_OPENYAML_CMD`/`SPEC_ENT_OPENCONTEXT_CMD` use "Superseded"/"Retired" wording per project convention, not `:status: deprecated` stubs)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation (Dev Engineer: full removal of `jarvis.openContext`/`jarvis.openYamlFile` — command registrations, `context.subscriptions` entries, and remaining `package.json` `contributes.commands`/`commandPalette` entries — plus add `jarvis.copyPath`/`jarvis.copyFullPath` + their `view/item/context` bindings, per `SPEC_ENT_ENTITY_CONTEXTMENU`)

### UAT Update (Test Designer, 2026-07-02)

**Existing chain reworked (superseded, not deleted):** `US_UAT_OPENCONTEXT` → `REQ_UAT_OPENCONTEXT_TESTDATA` → `SPEC_UAT_OPENCONTEXT_FILES` tested `jarvis.openContext`'s 3-step discovery algorithm (direct hit → subfolder scan → QuickPick → info message), which is now fully retired with no surviving equivalent — `jarvis.openEntityFile` (file children) opens a fixed, already-known path with no discovery/QuickPick, and `jarvis.openAgentSession` (root nodes) opens the chat, not `context.md`. All three files marked "Superseded by the `entity-tree-context-menu` CR" at the top (following the `REQ_ENT_ENTITY_ICONS` precedent — kept, not deleted, for historical traceability), with forward cross-references to `US_UAT_ENTITY_FILES_TREE` (missing-file fail-open, T-9) and the new chain below.

**New UAT chain created:** `US_UAT_ENTITY_CONTEXTMENU` → `REQ_UAT_ENTITY_CONTEXTMENU` → `SPEC_UAT_ENTITY_CONTEXTMENU` (10 scenarios, T-1–T-10):
- T-1–T-4: file-child node — menu contents, Open parity with left-click, Copy Path (folder-only), Copy Full Path (incl. filename).
- T-5–T-8: entity root nodes (Project/Event/Actor) — menu contents across all 3 kinds, Open parity with left-click, Copy Path, and Copy Full Path == Copy Path (both remain visible per the spec's design decision).
- T-9: folder-node exclusion. T-10: Command Palette exclusion.

Toctrees updated (`us_uat.rst`, `req_uat.rst`, `spec_uat.rst`). Verification: `sphinx-build -b html docs docs/_build/html -W --keep-going -E` — 0 warnings, 0 errors. `get_need_links.py --direction both` spot-checked on `US_UAT_ENTITY_CONTEXTMENU` and `US_UAT_OPENCONTEXT` — no dangling links.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-02

#### Findings

None. Independent QM review (not reusing CM-pipeline MECE/Trace results) covered:

- Code: confirmed `jarvis.openContext`/`jarvis.openYamlFile` have zero remaining references anywhere in `packages/**` (source + both `package.json` manifests) — full retirement verified directly, not just via report. `jarvis.copyPath`/`jarvis.copyFullPath` + shared `resolveCopyPaths()` helper read directly in `packages/core/src/extension.ts` — matches `SPEC_ENT_ENTITY_CONTEXTMENU` exactly (folder-only vs. incl.-filename resolution, entity-root fallback to folder-only for both). `view/item/context` bindings in both `packages/core/package.json` and `packages/pim/package.json` confirmed consistent across all 4 `contextValue` targets (`jarvisEntityFile`, `jarvisSession`, `jarvisProject`, `jarvisEvent`), correct `open`/`clipboard@1`/`clipboard@2` groups, "Open" entries correctly reuse `jarvis.openEntityFile`/`jarvis.openAgentSession` (no new Open command, per Decision 2). Confirmed both retired inline icons (`$(notebook)`/`$(go-to-file)`) have zero remaining references in either package.json.
- Full package-suite build (core+pim+recorder+mcp) — re-run independently, clean.
- Full test suite — re-run independently, 186/186 pass.
- Traceability: re-verified via `get_need_links.py --direction both` on 9 elements (`REQ_ENT_ENTITY_CONTEXTMENU`, `SPEC_ENT_ENTITY_CONTEXTMENU`, `REQ_ACT_OPENCONTEXT`, `REQ_ACT_CONTEXTMENU`, `REQ_ACT_TREECLICK`, `SPEC_ACT_CONTEXTMENU`, `SPEC_ACT_TREE`, `REQ_ENT_OPENCONTEXT`, `REQ_ENT_OPENYAML`) — all resolve bidirectionally, matching the CD's MECE-HIGH-finding-fix claims exactly (ACT-theme elements no longer describe the retired command as live).
- UAT: independently confirmed `US_UAT_OPENCONTEXT` carries a transparent, detailed "Superseded by entity-tree-context-menu" disclosure (not silently stranded) and forward-links to `US_UAT_ENTITY_CONTEXTMENU`; new UAT scenarios T-1–T-10 read directly in `spec_uat_entity_contextmenu.rst` and confirmed to accurately describe the actual implemented behavior (menu groups, Open parity, Copy Path/Copy Full Path semantics, folder-node and Command Palette exclusion).
- Full `sphinx-build -W --keep-going` — re-run independently, 0 warnings.
- "Assume spec root cause" self-check: n/a — this CR's own MECE pass already caught and fixed the ACT-theme contradiction (spec-level gap) before reaching QM, consistent with the standing principle.

No functional, traceability, or documentation-currency defects found. (Note, non-blocking: `REQ_ENT_ENTITY_CONTEXTMENU`/`SPEC_ENT_ENTITY_CONTEXTMENU` carry `:status: draft` despite being fully implemented and tested — but this matches a pre-existing, repo-wide inconsistent status-field convention already present elsewhere in `req_ent.rst` (e.g. `REQ_ENT_AGENTSESSION`, long-shipped, also still `draft`), not something introduced or worsened by this CR — not flagged as a CR-specific finding.)

#### PM Decisions

None needed — no findings this round.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
