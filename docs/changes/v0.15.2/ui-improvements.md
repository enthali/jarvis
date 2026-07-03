# Change Document: ui-improvements

**Status**: design-complete
**Branch**: feature/ui-improvements
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Small bundle of independent tree-view UI improvements collected as backlog items during the `entity-tree-context-menu` CR:

1. **Category-node copy**: right-click on a category/grouping node (Projects/Events/Actors headers in the sidebar) offers "Copy" to copy the category name to the clipboard.
2. **Copy File Name**: right-click on a file-child node (context.md/session.yaml/agent-file) gains a "Copy File Name" entry (bare filename, no path), alongside the existing Copy Path/Copy Full Path from `entity-tree-context-menu`.
3. **context.md rendered preview** (corrected during design — `jarvis.openContext` no longer exists, retired in `entity-tree-context-menu`): `jarvis.openEntityFile`'s handler branches to open `context.md` specifically via VS Code's rendered Markdown preview (`markdown.showPreview`) instead of the raw text editor; `session.yaml` and the agent-file continue to open as raw text.
4. **Collapse All**: all Jarvis tree views (Projects/Events/Actors/Messages/Reminders/Heartbeat) get the native VS Code "Collapse All" title-bar button via `showCollapseAll: true` on `createTreeView()` — currently unset on all 6 call sites.
5. **Messages tree — click-to-open on group node** (addendum): clicking a session/actor group node's label in the Messages tree (`SessionGroupNode`, the row itself — not the inline Play button) opens that actor's chat at Main, same as an Actor tree click elsewhere in the sidebar. Previously `SessionGroupNode` had no click command at all.

No functional/behavioral changes beyond these five additive UI conveniences. Small, low-risk, spec + code.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ENT_ENTITYPARITY | Entity Feature Parity (Projects & Events) | referenced | REQ_ENT_ENTITY_CONTEXTMENU's extended ACs (category Copy, Copy File Name, context.md preview) link up here, same as the original entity-tree-context-menu additions |
| US_EXP_SIDEBAR | Project & Event Explorer | referenced | REQ_EXP_TREEVIEW's new AC-12 (Collapse All) links up here |
| US_MSG_EDITORPLACEMENT | Predictable Editor-Group Placement with Focus Restore | referenced | REQ_MSG_EDITORPLACEMENT's new AC-10 (item 5, Messages tree group-node click-to-open) links up here |
| US_MSG_CHATQUEUE | Chat Message Queue | referenced | REQ_MSG_EXPLORER's new AC-5 (item 5 cross-reference) links up here |

### New User Stories

None — all 5 items are interaction refinements of already-established capabilities (entity tree context menu, tree view sidebar, editor-group placement model). No new user-facing capability warrants a new US.

### Decisions

- No new US needed for any of the 4 items — confirmed each is a refinement of an existing US-level capability (US_ENT_ENTITYPARITY for the context-menu items, US_EXP_SIDEBAR for Collapse All).

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
| REQ_ENT_ENTITY_CONTEXTMENU | US_ENT_ENTITYPARITY | modified | AC-7 amended (folder nodes now get a separate single-entry menu); new AC-9 (category-node Copy), AC-10 (Copy File Name), AC-11 (context.md rendered preview); 2 new Decisions documenting the name-vs-path and exact-basename-match choices |
| REQ_EXP_TREEVIEW | US_EXP_SIDEBAR | modified | new AC-12 (Collapse All on all 6 tree views) |
| REQ_MSG_EDITORPLACEMENT | US_MSG_EDITORPLACEMENT | modified | new AC-10 (item 5: Messages tree group-node click targets Main, same as Actor tree click/Play button) |
| REQ_MSG_EXPLORER | US_MSG_CHATQUEUE | modified | new AC-5 cross-referencing REQ_MSG_EDITORPLACEMENT AC-10; linked REQ_MSG_EDITORPLACEMENT |

### New Requirements

None — all 5 items fit as extensions of existing REQs rather than warranting new ones (item 4 considered a new REQ but `REQ_EXP_TREEVIEW` already enumerates every Jarvis tree view, making it a more cohesive home than a standalone REQ; item 5 is a direct extension of the already-established `REQ_MSG_EDITORPLACEMENT` placement model).

### Conflicts Detected

None. All edits are additive ACs plus one amendment (AC-7) that narrows a previous absolute statement ("SHALL NOT show this context menu") to carve out the new, distinct single-entry menu — no contradiction, since the 3-entry Open/Copy Path/Copy Full Path menu still SHALL NOT appear on folder nodes.

### Decisions

- Decision 1 (item 1, name vs. path): category/folder-node "Copy" copies the display name, not a filesystem path — see REQ_ENT_ENTITY_CONTEXTMENU's new Decisions entry for full rationale.
- Decision 2 (item 3, exact-basename match): the context.md render check is `path.basename(node.filePath) === 'context.md'`, not an extension check — the agent-file child is also `.md` (`*.agent.md`) and must remain raw text; see REQ_ENT_ENTITY_CONTEXTMENU's new Decisions entry.
- Decision 3 (item 4, REQ placement): `REQ_EXP_TREEVIEW` extended (new AC-12) rather than creating a standalone REQ — it already enumerates every Jarvis tree view (Projects/Events/Messages/Categories, extended over time to include Actors/Reminders/Heartbeat via sibling REQs), making it the most cohesive home for a cross-tree-view UI convenience.
- Decision 4 (item 5, no-session-yet behavior): if the group node's destination has no live chat session yet (only queued messages, no session ever opened), the click handler is a silent no-op rather than creating a new session — deliberately different from `jarvis.openAgentSession`/`jarvis.sendMessages` (which both create on miss), since a label click is a lower-intent, exploratory action compared to explicitly clicking "Play" to send.

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
| SPEC_ENT_ENTITY_CONTEXTMENU | REQ_ENT_ENTITY_CONTEXTMENU | modified | 2 new commands (`jarvis.copyFileName`, `jarvis.copyCategoryName`) + package.json registration for all 4 contextValue targets; design notes updated |
| SPEC_ENT_ENTITY_FILE_CHILDREN | REQ_ENT_ENTITY_FILE_CHILDREN | modified | `jarvis.openEntityFile` handler gains the `context.md` → `markdown.showPreview` branch; AC-7 updated; stale "no context-menu actions" note corrected (was already stale from `entity-tree-context-menu`, fixed while in the area) |
| SPEC_MSG_EDITORPLACEMENT | REQ_MSG_EDITORPLACEMENT | modified | new `jarvis.openMessageSession` command (item 5) documented in design notes, reusing `openAtMain`/`lookupSessionUUID`; linked `SPEC_MSG_TREEPROVIDER` |
| SPEC_MSG_TREEPROVIDER | REQ_MSG_EXPLORER | modified | `SessionGroupNode`'s `getTreeItem()` now sets `item.command` (previously unset); linked `SPEC_MSG_EDITORPLACEMENT` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_COLLAPSEALL | Collapse All Title-Bar Button (All Tree Views) | REQ_EXP_TREEVIEW; SPEC_EXP_PROVIDER; SPEC_ACT_TREE |

### Conflicts Detected

None.

### Decisions

- Decision 1: `jarvis.copyFileName`/`jarvis.copyCategoryName` are separate, small commands (not folded into the existing `resolveCopyPaths()` helper) — they operate on different data (bare filename via `path.basename()`, or the folder node's `.name` field directly) with no shared resolution logic worth extracting.
- Decision 2: `SPEC_EXP_COLLAPSEALL` is a new, focused SPEC rather than folding the 6-call-site change into `SPEC_EXP_PROVIDER` (which only covers `TreeDataProvider` classes, not the `createTreeView()` registration call sites) — cleaner separation between "what the tree contains" (`SPEC_EXP_PROVIDER`) and "how the view is registered" (`SPEC_EXP_COLLAPSEALL`).
- Decision 3: found and fixed one pre-existing stale note in `SPEC_ENT_ENTITY_FILE_CHILDREN` ("no view/item/context menu entries are added for jarvisEntityFile") while in the area — this was already inaccurate before this CR (from `entity-tree-context-menu`), not introduced by `ui-improvements`, but left uncorrected until now.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] New SPEC links to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_ENTITYPARITY (referenced) | REQ_ENT_ENTITY_CONTEXTMENU | SPEC_ENT_ENTITY_CONTEXTMENU, SPEC_ENT_ENTITY_FILE_CHILDREN | ✅ |
| US_EXP_SIDEBAR (referenced) | REQ_EXP_TREEVIEW | SPEC_EXP_COLLAPSEALL | ✅ |
| US_MSG_EDITORPLACEMENT (referenced) | REQ_MSG_EDITORPLACEMENT | SPEC_MSG_EDITORPLACEMENT | ✅ |
| US_MSG_CHATQUEUE (referenced) | REQ_MSG_EXPLORER | SPEC_MSG_TREEPROVIDER | ✅ |

Build verification: `sphinx-build -b html . _build/html -W --keep-going` — 0 warnings, 0 errors. Spot-checked via `get_need_links.py` on `SPEC_EXP_COLLAPSEALL`, `REQ_ENT_ENTITY_CONTEXTMENU`, and `REQ_MSG_EDITORPLACEMENT` — all links resolve correctly.

### Artefakt-Removal-Check

Not applicable — no artefact removed, purely additive UI conveniences (2 new commands, 1 new branch in an existing handler, 1 new option on 6 existing `createTreeView()` calls).

### Issues Found

None (2 findings from CM's MECE check resolved, see below — Round noted before final Sign-off).

### MECE Findings Resolution (System Designer, 2026-07-02)

**Finding 1 (medium):** `context.md`'s Markdown-preview branch (`markdown.showPreview`) was calling VS Code's command with no `viewColumn` argument, silently bypassing the pre-existing Docs-column (column 2) placement guarantee (`REQ_MSG_EDITORPLACEMENT` AC-2) that `session.yaml`/agent-file continued to honor via `openAtDocs()`. **Resolved via option (a)**: `markdown.showPreview` is now called with an explicit `DOCS_COLUMN` argument, preserving the column-2 guarantee on first open. Reuse of an already-open preview tab for the same file on subsequent invocations relies on VS Code's own built-in `markdown.showPreview` behavior (not custom Jarvis logic). `SPEC_ENT_ENTITY_FILE_CHILDREN`'s code sample, AC-7, and `REQ_ENT_ENTITY_CONTEXTMENU` AC-11 updated to describe this as a "variant" (preview instead of raw editor) rather than a placement exception. `REQ_ENT_ENTITY_CONTEXTMENU` linked to `REQ_MSG_EDITORPLACEMENT`.

**Finding 2 (low):** `REQ_MSG_EDITORPLACEMENT` AC-10 and `REQ_MSG_EXPLORER` AC-5 made an unconditional "SHALL open at Main" claim, omitting the silent-no-op-on-miss behavior already documented in the CD's Decision 4 and `SPEC_MSG_EDITORPLACEMENT`'s design notes. Both ACs now explicitly state: opens at Main only if a live session already exists; silent no-op (no session created) otherwise.

Both fixes are spec-only (no code change needed for Finding 2; Finding 1 requires a small code change — see below).

### Code Change Needed (Finding 1, option a)

`jarvis.openEntityFile`'s `context.md` branch needs `markdown.showPreview` called with `DOCS_COLUMN` as the second argument (was previously called with only the `uri`). Routing to CM for Dev Engineer dispatch alongside the rest of this CR's implementation — see report to CM.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation (Dev Engineer: `jarvis.copyFileName`, `jarvis.copyCategoryName`, the `context.md` render branch in `jarvis.openEntityFile` — now with explicit `DOCS_COLUMN` argument per Finding 1 fix — `showCollapseAll: true` on all 6 `createTreeView()` calls, and the new `jarvis.openMessageSession` command bound to `SessionGroupNode`'s `TreeItem.command`)

### UAT Update (Test Designer, 2026-07-02)

**Items 1–3 (category copy, copy file name, context.md preview):** extended `us/req/spec_uat_entity_contextmenu.rst` (the chain created for `entity-tree-context-menu`):
- Fixed stale T-9/AC-9 — previously asserted folder nodes show *no* context menu; corrected to the new single-entry "Copy" menu per `REQ_ENT_ENTITY_CONTEXTMENU` AC-7/AC-9 amendment.
- Added AC-11/T-11 (Copy Category Name copies the display name, not a path), AC-12/T-12 (file-child nodes gain a 4th "Copy File Name" entry, bare filename), AC-13/T-13 (`context.md` opens via rendered Markdown preview; `session.yaml`/agent-file unaffected — exact-basename check verified).

**Item 4 (Collapse All):** new UAT chain `US_UAT_COLLAPSEALL` → `REQ_UAT_COLLAPSEALL` → `SPEC_UAT_COLLAPSEALL` (T-1–T-4): button presence on all 6 tree views, collapsing expanded nodes (incl. entity file children) in one click, no side effects (message counts/content unchanged, no chat opens), no regression to existing click bindings after a Collapse All.

**Item 5 (Messages tree group-node click):** extended `us/req/spec_uat_chateditorreuse.rst` with AC-10/T-10 — clicking a session group-node's label (not Play) targets Main with the same close+reopen/focus-in-place rules as T-6/T-9, plus the silent no-op-on-miss case (destination with queued messages but no live session ever opened) — mirroring the existing Play-button T-9 pattern per CM's instruction.

Toctrees updated (`us_uat.rst`, `req_uat.rst`, `spec_uat.rst` — new `*_collapseall` entries). Verification: `sphinx-build -b html docs docs/_build/html -W --keep-going -E` — 0 warnings, 0 errors. `get_need_links.py --direction both` spot-checked on `US_UAT_COLLAPSEALL`, `US_UAT_ENTITY_CONTEXTMENU`, `US_UAT_CHATEDITORREUSE` — no dangling links.

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-02

#### Findings

None. Independent QM review (not reusing CM-pipeline MECE/Trace results) covered all 5 items directly:

- **Item 1 (category copy)**: `jarvis.copyCategoryName` read directly in `packages/core/src/extension.ts` (~line 755) — copies `FolderNode.name` (display label), correctly bound to `viewItem == jarvisFolder` in both `packages/core/package.json` and `packages/pim/package.json`.
- **Item 2 (Copy File Name)**: `jarvis.copyFileName` read directly (~line 747) — copies `path.basename(node.filePath)`, correctly bound to `jarvisEntityFile` at `clipboard@3` (after the existing Copy Path/Copy Full Path).
- **Item 3 (context.md preview)**: `jarvis.openEntityFile`'s `context.md` branch read directly — exact-basename check (`path.basename(node.filePath) === 'context.md'`) before calling `markdown.showPreview(uri, DOCS_COLUMN)`; confirmed `DOCS_COLUMN` is the same `vscode.ViewColumn.Two` constant used elsewhere in the file — MECE Finding 1 fix (explicit Docs-column argument) verified present in the actual code, not just the spec.
- **Item 4 (Collapse All)**: confirmed `showCollapseAll: true` present on all 6 `createTreeView()` call sites (`jarvisProjects`/`jarvisEvents` in `packages/pim/src/extension.ts`; `jarvisSessions`/`jarvisMessages`/`jarvisReminders` in `packages/core/src/extension.ts`; the heartbeat view in `packages/core/src/apps/session/heartbeat.ts`).
- **Item 5 (Messages group-node click)**: `jarvis.openMessageSession` read directly — resolves via `lookupSessionUUID`, silent no-op (`return`) if unresolved, otherwise `openAtMain()`; `messageTreeProvider.ts`'s `SessionGroupNode.getTreeItem()` confirmed to set `item.command` to it (previously unset).
- Full package-suite build (core+pim+recorder+mcp) — re-run independently, clean.
- Full test suite — re-run independently, 206/206 pass.
- Traceability: re-verified via `get_need_links.py --direction both` on 9 touched/new elements (`REQ/SPEC_ENT_ENTITY_CONTEXTMENU`, `SPEC_ENT_ENTITY_FILE_CHILDREN`, `REQ_EXP_TREEVIEW`, `SPEC_EXP_COLLAPSEALL`, `REQ/SPEC_MSG_EDITORPLACEMENT`, `REQ_MSG_EXPLORER`, `SPEC_MSG_TREEPROVIDER`) — all resolve bidirectionally.
- MECE fixes re-verified directly in the REQ text: `REQ_ENT_ENTITY_CONTEXTMENU` AC-11 explicitly frames the Markdown-preview as a "variant" honoring the Docs-column guarantee (Finding 1); `REQ_MSG_EDITORPLACEMENT` AC-10 and `REQ_MSG_EXPLORER` AC-5 both explicitly state the silent-no-op-on-miss condition (Finding 2) — both confirmed present, matching the code exactly.
- UAT: independently read the fixed T-9 (folder-node single-entry Copy, no longer "no menu") and new T-11/T-12/T-13 in `spec_uat_entity_contextmenu.rst`, plus `US_UAT_COLLAPSEALL`'s new chain and the extended `US_UAT_CHATEDITORREUSE` chain — all traced and accurate against the implemented behavior.
- Full `sphinx-build -W --keep-going` — re-run independently, 0 warnings.
- "Assume spec root cause" self-check: n/a — no code-level defect found in this CR; both MECE findings were spec/design-completeness gaps caught during CM's own pipeline (Docs-column bypass, missing no-op statement) and fixed before reaching QM, consistent with the standing principle.

No functional, traceability, or documentation-currency defects found. Small, clean, well-scoped bundle of 5 additive UI items.

#### PM Decisions

None needed — no findings this round.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
