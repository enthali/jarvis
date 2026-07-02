# Change Document: pim-treenode-filenode-fix

**Status**: design-complete
**Branch**: feature/pim-treenode-filenode-fix
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Small, urgent hotfix: `packages/pim/src/extension.ts`'s `collectLeaves()` fails to compile (`tsc -p packages/pim`) because `TreeNode` (`packages/core`) gained a third union variant, `FileNode` (kind: `'file'`, no `.children`), when `entity-files-tree` added file-tree-children support. `collectLeaves()` still assumes the non-leaf branch is always a `FolderNode` and recurses into `.children` — never updated for the 3-variant union. This blocks any full-package-suite build, including the release pipeline, on current `develop`.

Root cause is twofold: (1) the code gap itself, and (2) a missing spec link — `SPEC_ENT_ENTITY_FILE_CHILDREN` (which introduced `FileNode`) was never linked to `SPEC_PRJ_LISTPROJECTS` (or `SPEC_EVT`), which owns `collectLeaves()` in `packages/pim` (per `spec_evt.rst`'s own note: "`collectLeaves()` helper is reused from `SPEC_PRJ_LISTPROJECTS`"). That missing link is why the original `entity-files-tree` impact analysis never surfaced `packages/pim` as an affected consumer of the `TreeNode` union change.

Scope: (a) System Designer adds the missing spec link so this traceability gap doesn't recur; (b) Dev Engineer narrows `collectLeaves()`'s else-branch to explicitly check `node.kind === 'folder'` (exhaustive handling of all 3 `TreeNode` variants) — a type-narrowing correctness fix, no behavior change (runtime risk was already assessed as low/unreachable, but the compile error itself blocks builds).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None — this is a spec-completeness fix (missing cross-link) + code-narrowing correctness fix. No new user-facing behavior, no US/REQ content changes.

### New User Stories

None.

### Decisions

- No new US/REQ needed — `SPEC_ENT_ENTITY_FILE_CHILDREN`'s existing REQ (`REQ_ENT_ENTITY_FILE_CHILDREN`) already covers the FileNode variant's intent; the gap is purely a missing SPEC-level cross-link to the consumer (`SPEC_PRJ_LISTPROJECTS`) that was never surfaced during the original `entity-files-tree` impact analysis.
- Code fix is a pure type-narrowing correctness change (exhaustive `TreeNode` union handling), not a behavior change — confirmed low/unreachable runtime risk, but it's a hard compile blocker.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — no US touched
- [x] No redundancies
- [x] Gaps identified and addressed — the missing link itself is the gap this CR closes

---

## Level 1: Requirements

**Status**: ✅ completed (no changes)

### Impacted Requirements

None — confirmed at Level 0: no REQ content changes needed, this is a pure SPEC-level cross-link gap.

### New Requirements

None.

### Conflicts Detected

None.

### Decisions

- No REQ changes needed — `REQ_ENT_ENTITY_FILE_CHILDREN` already fully specifies the `FileNode` variant's intent; the gap was purely a missing SPEC-to-SPEC cross-link.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] N/A — no new REQs

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_ENTITY_FILE_CHILDREN | REQ_ENT_ENTITY_FILE_CHILDREN | modified | added `SPEC_PRJ_LISTPROJECTS` to `:links:` — the missing cross-link that caused the original impact-analysis gap |
| SPEC_PRJ_LISTPROJECTS | REQ_PRJ_LISTPROJECTS | modified | added `SPEC_ENT_ENTITY_FILE_CHILDREN` to `:links:`; design notes extended with an explicit `TreeNode`/`FileNode` exhaustive-handling requirement for `collectLeaves()` consumers |
| SPEC_EVT_LISTEVENTS | REQ_EVT_LISTEVENTS | modified | added `SPEC_ENT_ENTITY_FILE_CHILDREN` to `:links:` (per CM's task #2 — this spec reuses the same `collectLeaves()` helper and is equally affected); design notes cross-reference `SPEC_PRJ_LISTPROJECTS`'s note |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: The `collectLeaves()` code-narrowing fix itself (handling all 3 `TreeNode` variants exhaustively) is explicitly left to Dev Engineer per this CD's own Summary scope split — System Designer's role here is closing the traceability gap and documenting the exhaustive-handling *requirement* in design notes (both `SPEC_PRJ_LISTPROJECTS` and `SPEC_EVT_LISTEVENTS`), not authoring the code fix itself.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] N/A — no new SPECs, only cross-links and design-note clarifications on existing approved/implemented SPECs

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| Design Element | Now Links To | Complete? |
|------------|--------------|-----------|
| SPEC_ENT_ENTITY_FILE_CHILDREN | SPEC_PRJ_LISTPROJECTS (new) | ✅ |
| SPEC_PRJ_LISTPROJECTS | SPEC_ENT_ENTITY_FILE_CHILDREN (new, bidirectional via `linked_from`) | ✅ |
| SPEC_EVT_LISTEVENTS | SPEC_ENT_ENTITY_FILE_CHILDREN (new) | ✅ |

Build verification: `sphinx-build -b html . _build/html -W --keep-going` — 0 warnings, 0 errors. Spot-checked via `get_need_links.py SPEC_ENT_ENTITY_FILE_CHILDREN --direction both --depth 1` — both new links resolve bidirectionally.

### Artefakt-Removal-Check

Not applicable — this CR adds cross-links only; no artefact removed.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation (Dev Engineer's `collectLeaves()` code-narrowing fix)

---

## Post-Design MECE Fix — Stale Code Sample in SPEC_PRJ_LISTPROJECTS

**Found by:** MECE Engineer
**Date:** 2026-07-02

### Finding

`SPEC_PRJ_LISTPROJECTS`'s illustrative `collectLeaves()` code sample (under "Leaf extraction helper") still showed the old 2-branch implementation (`if 'leaf' ... else recurse into .children`), which is exactly the bug this hotfix closed — a reader following the spec's own code sample verbatim would reintroduce it. This contradicted the spec's own newly-added design note (which correctly demands exhaustive 3-way handling) and the actual fixed code in `packages/pim/src/extension.ts` (commit 5179309). `SPEC_EVT_LISTEVENTS` inherited the staleness by reference (reuses the same helper).

### Resolution

`SPEC_PRJ_LISTPROJECTS`'s `collectLeaves()` code sample rewritten to match the actual fixed implementation exactly (3 explicit branches: `'leaf'` push, `'folder'` recurse, `'file'` no-op with explanatory comment) — verified line-for-line against `packages/pim/src/extension.ts`. No changes needed to `SPEC_EVT_LISTEVENTS` itself (it references `SPEC_PRJ_LISTPROJECTS`'s helper by name, not by duplicating the code sample).

Rebuilt (`sphinx-build -W --keep-going`) — 0 warnings. Ready for QM.

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

None. Independent QM review (not reusing CM-pipeline results) covered:

- Code: read `collectLeaves()` in `packages/pim/src/extension.ts` directly — confirmed exhaustive 3-branch handling (`leaf` push / `folder` recurse / `file` no-op with comment), matches CD's claims exactly. Also checked `packages/recorder/src/extension.ts`'s `TreeNode` consumer (`highlightDecorator`) — confirmed safe (early-returns on non-leaf, no exhaustiveness issue).
- Full package-suite build (`compile all`: core+pim+recorder+mcp) re-run independently — clean, exit 0.
- New test file `src/tests/pim-collectleaves-filenode.test.ts` re-run independently — 4/4 pass.
- Spec cross-links re-verified via `get_need_links.py --direction both` on all 3 touched elements (`SPEC_ENT_ENTITY_FILE_CHILDREN`, `SPEC_PRJ_LISTPROJECTS`, `SPEC_EVT_LISTEVENTS`) — both new links resolve bidirectionally.
- `SPEC_PRJ_LISTPROJECTS`'s corrected `collectLeaves()` code sample re-verified line-for-line against the actual implementation — matches exactly.
- Full `sphinx-build -W --keep-going` re-run independently — build succeeded, 0 warnings.
- "Assume spec root cause" self-check: root cause was correctly attributed to a missing SPEC-level cross-link (not just a code gap) before this CR was opened — consistent with QM's standing audit principle.

No functional, traceability, or documentation-currency defects found.

#### PM Decisions

None needed — no findings this round.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
