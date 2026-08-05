# Change Document: touched-files-cleanup

**Status**: merged
**Branch**: feature/touched-files-cleanup
**Created**: 2026-08-04
**Author**: PM
**Operation Mode**: user-guided (default)

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

The "Recently Touched Files" tree (SPEC_ENT_TOUCHEDFILES, `TouchStore`) accumulates entries over time that are no longer of interest: files touched once and not revisited since, and files that no longer exist on disk. Today only a single entry can be removed at a time, manually, via the existing `jarvis.removeTouchedFile` command.

Level 0 analysis (see Findings F-2/F-3/F-4 below) moved the design from automatic deletion to display filtering: age and file-absence are not user intent, and a file's absence can be temporary (branch switch), so deleting on either would lose history a user might still want. The shipped design:

1. **Age window** — a configurable rolling window (default: 0 = no limit) hides touched-file entries not touched again within that many days; the underlying data is untouched, so widening the window brings entries back.
2. **Dead-file filtering** — entries whose file no longer exists are hidden from display, not deleted, for the same reason (branch-blind store).
3. **Explicit removal, three scopes** — the existing single-entry trash icon now also works on a folder branch and on the whole category (removes everything below, including hidden entries), plus a new on-demand "clean up dead entries" action on the category that actually deletes entries whose file is confirmed gone and reports the count.

Acceptance criteria (user-visible):

- A configurable rolling window (default 0 = no limit) hides touched-file entries not touched within that many days; changing the setting takes effect immediately, is fully reversible, and never deletes anything.
- Entries whose file no longer exists are hidden from the tree, not deleted, so they reappear if the file returns (e.g. after a branch switch).
- The trash icon removes everything at and below the node it's invoked on — entry, folder, or whole category — including entries currently hidden by the window or dead-file filter.
- A separate on-demand action on the category permanently removes entries whose file is confirmed missing, and reports how many were removed.
- Nothing is removed automatically; every deletion is an explicit user action.

---

## Level 0: User Stories

### Impacted

| ID | Change | Status |
|---|---|---|
| `US_ENT_TOUCHEDFILES` | Context paragraph added; AC-8 extended to branch and category; AC-10 to AC-14 added | `approved` → `draft` |

No new user stories. The capability belongs to the story that already promised it in its title.

### Findings

**F-1 — The CR delivers a word the story already used.** The story is titled "*Recently* Touched Files", but nothing in it ever bounded the list by time: an entry was written on first touch and stayed for good. "Recently" lived in the title only. This is recorded in the Context paragraph so the change reads as the story being completed, not extended.

**F-2 — Removal has three separate causes, and they are not the same kind of thing.** They were conflated under one word ("cleanup") in the Summary:

| Cause | What it is | Mechanism |
|---|---|---|
| The user clicks the trash icon | intent | delete |
| The entry is old | a property that changes on its own, continuously | display filter |
| The file does not exist | a state that can revert | display filter |

Age and absence are not events — nothing happens at the moment they become true. Deleting on them makes the stored data depend on when a cleanup pass happened to run.

**F-3 — A threshold that deletes cannot be tuned; a threshold that filters can.** If a 2-day threshold deletes, then raising it to 7 tomorrow shows nothing more, because the data is already gone. The setting can only ever destroy, never restore, so the user cannot try a value out — turning it down to see what happens costs something unrecoverable. As a display window, 1 → 7 → 1 is free. This is the decisive argument for F-2's split and it applies to no other part of the CR.

**F-4 — Absence reverts, and the git branch is the standard case.** A file touched on branch A does not exist while branch B is checked out. `.jarvis/state/` is deliberately not in git, so the store is branch-blind — it cannot distinguish "deleted" from "not on this branch". Deleting on absence therefore loses touch history for files that are still present, and the original plan ran cleanup on activation, which is exactly when a branch has just been switched. Filtering on absence loses nothing: the entry is hidden while the file is away and is back with it.

**F-5 — Anything hidden must stay reachable by another route.** Once display is filtered, the trash icon on a tree node can no longer reach the entries that are not rendered, so dead entries would accumulate invisibly with no way to remove them. This is what makes the category-level cleanup action structurally necessary rather than a convenience.

**F-6 — Calendar-day boundaries would cut off work in progress.** With "1 = since midnight", a user working at 01:00 sees one hour of their own running session. Separately, the stored timestamps are ISO 8601 UTC, so a rolling window needs no local-time conversion at all, while calendar days would introduce timezone and DST handling that is otherwise not present. A rolling window cannot express "yesterday" exactly; the list answers "what was I last working on", not a reporting question, so that is accepted.

### Decisions

- [x] **D-1: Age becomes a display window, not a deletion rule.** Rolling, measured in days back from now against the most recent touch of any kind. Rationale: F-3.
- [x] **D-2: Default window is 0, meaning no limit.** The displayed list is therefore unchanged on upgrade for every existing user; a window only ever takes effect because someone chose one. This also resolves the consequence noted below (Issue 1) — the category disappearing from an untouched entity becomes the visible result of a setting the user just changed, rather than a silent default.
- [x] **D-3: Non-existent files are hidden, not deleted.** Rationale: F-4.
- [x] **D-4: Nothing is removed automatically at all.** The `run on activation` trigger from the Summary is dropped; both automatic rules are display-only and lossless.
- [x] **D-5: The trash icon removes the subtree it sits on** — entry, folder branch, or the whole category — including entries not currently displayed, because "delete this folder" that leaves entries behind would be surprising.
- [x] **D-6: A separate cleanup action on the category node removes entries whose files no longer exist and reports the count afterwards.** Rationale: F-5, and the report exists because the entries were invisible while they accumulated.
- [x] **D-7: The category is shown when the entity has at least one recorded entry inside the display window** — keyed to the window, not to the existence check, and not to the raw recorded set.

  *Correction (2026-08-04): the reason first recorded here was wrong and is replaced.* It argued that keying visibility to the recorded set would leave a permanently empty category in customer environments where hooks are not permitted. That does not follow: without hooks nothing is ever recorded, so the category is absent under every candidate rule. The premise did not distinguish the options.

  The case that does distinguish them is "recorded > 0, displayed = 0", and two arguments decide it:

  1. Keying visibility to the existence check would require a file-system probe per recorded entry of *every* entity on every tree refresh — before anything is expanded, and `jarvis.scanInterval` refreshes every 2 minutes by default. The window is a comparison of timestamps already loaded and costs nothing.
  2. Keying it to the window leaves the category visible when its entries are all dead but still recent — exactly the state in which the cleanup action (D-6) is needed. The action is therefore reachable when it matters, without the always-on cost.

  Residual, accepted: an entity whose entries all fall outside the window shows no category, so the cleanup action is out of reach there. That is the case in which the user has said that anything older than the window does not interest them, and the next touched file restores both.

- [x] **D-8: Bulk removal is not confirmed.** The trash on a folder branch or the category removes recorded entries the user may never have seen — because the window or the existence check hid them, or simply because the branch was collapsed. Confirmed as intended: a bulk action legitimately reaches what is not currently in view, nothing here is irreversible in a damaging sense (AC-14 — a touched file returns), and confirmation prompts on low-cost actions train users to click through them.

### Open

*(none at Level 0)*

### Note for PM / CM — the Summary changed shape

Level 0 analysis moved this CR from destructive to non-destructive. Three statements in the Summary above no longer describe the specified behaviour:

- "removes touched-file entries whose age exceeds a threshold" — age now filters the display; nothing is removed.
- "run both periodically (e.g. on extension activation) and on demand" — there is no automatic run; see D-4 and F-4.
- "two automatic cleanup rules applied to the `TouchStore`" — one rule, applied on demand.

The user-visible outcome the CR was asked for is unchanged and the change is smaller. The Summary is PM's section and has been left untouched.

### Horizontal MECE Check (Level 0)

The three removal causes in F-2 partition cleanly: intent, age, and absence do not overlap, and no fourth cause is in play. Each maps to exactly one mechanism. Against sibling stories: `US_ENT_ENTITY_FILES_TREE` governs an entity's own folder contents and is untouched; `US_HOOK_ACTIVITY` consumes the same dispatch registry for session liveness and is unaffected by display rules on a different subtree.

---

## Level 1: Requirements

### Impacted

| ID | Change | Status |
|---|---|---|
| `REQ_ENT_TOUCHEDFILES` | Description note on recorded-vs-displayed; AC-7 and AC-13 rewritten; AC-15, AC-15a, AC-16, AC-17, AC-18 added | `approved` → `draft` |

### Not impacted — checked

| ID | Why not |
|---|---|
| `REQ_CFG_GROUPS` | The new setting joins the existing **Hooks** group; no group is added, removed, or re-ordered. (The requirement's eleven-group enumeration is already out of step with the shipped `package.json`, which also carries Actors, Prompt Templates and Hooks — a known discrepancy escalated under GH #60, not re-reported here and not touched by this CR.) |
| `REQ_CFG_FIXEDPATHS` | `.jarvis/state/touched-files/` is already enumerated; no new path is introduced. |
| `REQ_HOOK_ROUTE`, `REQ_HOOK_ACTIVITY` | Recording is unchanged. This CR only governs what is displayed and what an explicit user action removes. |
| `REQ_ENT_ENTITY_FILE_CHILDREN`, `REQ_ENT_ENTITY_CONTEXTMENU` | Reused as-is; the trash icon's extension to folder and category nodes needs new context values, which is a Level 2 concern. |

### Findings

**F-7 — The setting has no natural group, and inventing one has a cost.** `REQ_CFG_GROUPS` fixes eleven group titles in a specific order and is already contradicted by the shipped manifest; adding a twelfth would deepen a discrepancy that is already open elsewhere. The **Hooks** group is the honest home: the touched-file data exists only because hooks run, and in an environment where hooks are not permitted the setting has nothing to act on. This follows the precedent set by `SPEC_REL_RELEASENOTES`, which explicitly avoided introducing a group for the same reason.

**F-8 — `minimum: 0` and "0 = no limit" is an established local convention.** `jarvis.scanInterval` already ships as a number with `minimum: 0` and the description "(0 = disabled)". The window setting reuses that shape rather than introducing a nullable value or a second boolean toggle.

**F-9 — Key naming follows the dotted feature-group form.** The newer settings use `jarvis.<feature>.<name>` (`jarvis.hooks.autoInstall`, `jarvis.messages.logging`, `jarvis.mcp.enabled`); the flat form survives only in older keys (`jarvis.scanInterval`, `jarvis.heartbeatInterval`). Hence `jarvis.touchedFiles.windowDays`.

**F-10 — The window is cheap to evaluate, the existence check is not, and they are therefore applied at different points.** The window compares two ISO 8601 UTC strings already loaded from the store. The existence check touches the file system once per candidate entry. AC-7 and AC-16 place them accordingly: the window decides category visibility on every refresh, the existence check runs only when a category is expanded, over the entries that survived the window. This is what makes the D-7 arrangement affordable.

### Decisions

- [x] **D-9: `jarvis.touchedFiles.windowDays`**, `number`, default `0`, `minimum` 0, Hooks group, no explicit `scope` (VS Code's `window` default, matching the other numeric settings, so a workspace may override it). Rationale: F-7, F-8, F-9.
- [x] **D-10: The window is evaluated against the later of last-read and last-edited**, both of which may be absent on a given entry (AC-6). Stated in AC-15 because the story left "most recent touch of any kind" as intent, and an unstated tie-break would be invented at Level 2.
- [x] **D-11: The cleanup action ignores the window.** It sweeps every recorded entry of the entity, including those the window is hiding — a dead entry outside the window is no more useful than one inside it, and the entries it targets are invisible by definition.
- [x] **D-12: AC-15a requires the setting to take effect on the configuration-change event**, not merely "on next render", so the requirement is observable: change the value, the tree reflects it, no reload.

### Open

- [ ] **Issue 2 — cost of the existence check on expand is bounded but not quantified.** AC-16 probes each entry that survives the window when its parent is expanded. For an entity with a large recorded set and the default window of `0` (no limit), that is one probe per recorded entry on first expand. No caching is required by Level 1; whether Level 2 introduces one, and on what invalidation, is left to `SPEC_ENT_TOUCHEDFILES`. Flagged here so it is not discovered as a surprise during implementation.

### Horizontal MECE Check (Level 1)

Within `REQ_ENT_TOUCHEDFILES` the new criteria do not overlap: AC-15 governs the window, AC-16 the existence check, AC-13 user-initiated removal, AC-17 the one bulk action that is not a trash icon, AC-18 the guarantee that nothing else removes anything. AC-7 consumes AC-15 only, which is what keeps the refresh path free of file-system access. Against sibling requirements: `REQ_ENT_ENTITY_FILE_CHILDREN` governs a different category under the same entity node and is untouched; `REQ_HOOK_ACTIVITY` shares the dispatch registry but not the store.

---

## Level 2: Design Specification

### Impacted

| ID | Change |
|---|---|
| `SPEC_ENT_TOUCHEDFILES` | `withinWindow()` / `existingOnly()` / `readWindowDays()` helpers; both filters applied at category expansion; `_getLeafChildren()` visibility keyed to the window; folder `contextValue` split to `jarvisTouchedFileFolder`; `TouchStore.removeUnder/removeAll/removeMissing`; `jarvis.removeTouchedFiles` and `jarvis.cleanupTouchedFiles` commands; `jarvis.touchedFiles.windowDays` contribution; configuration-change subscription; five design notes |

### Not impacted — checked

| ID | Why not |
|---|---|
| `SPEC_ENG_TREEFACTORY` | It governs `SubtreeNode.contextValue` for factory-rendered subtrees. The touched-file nodes are provider-local to `GenericTreeDataProvider` and set `contextValue` on the `TreeItem` directly, as they already did — the new value changes no factory behaviour. (Named explicitly because the CR intake flagged it as a possible secondary impact.) |
| `SPEC_CFG_PATHRESOLVER` | No new path. The touched-files directory is unchanged. |
| `SPEC_HOOK_ROUTE`, `SPEC_HOOK_ACTIVITY`, `SPEC_ENT_ENTITY_FILE_CHILDREN` | Recording and the sibling categories are untouched. |

### Findings

**F-11 — A per-node filter cannot express "prune empty branches".** A folder node may only appear if at least one *displayed* file sits below it. Deciding that inside `buildTouchedFileChildren()` would mean re-examining the whole subtree at every level. Filtering the entry map once at the category root and carrying the filtered map on the folder nodes produces the same tree in one pass, and the existing property that empty branches never appear survives untouched — a folder node is still only ever created for a path present in the map it is handed.

**F-12 — That same arrangement is what bounds the cost of AC-16, and it removes the need for a cache.** This resolves Issue 2 from Level 1: the file-system probes are one per window-surviving entry per *category* expansion, not per folder expansion and not per refresh. No caching layer is specified, and none is needed at this cost. Should a cache ever be introduced, its invalidation would have to cover branch switches, which is precisely the event the design is built to tolerate.

**F-13 — The folder `contextValue` split is forced, not preferred.** The previous revision reused `jarvisEntityFileFolder` and recorded that splitting it would be a small follow-up if a folder-specific action ever appeared. AC-13's folder trash is that action. The value is also worn by "Files" category folders, which have nothing to remove, so keeping it shared would place a trash icon on nodes where the command has no effect. `jarvisEntityFileFolder` has no menu bindings today, so nothing is lost by no longer using it here.

**F-14 — `removeMissing()` must keep its probes inside the synchronous critical section.** The read-mutate-write body is uninterruptible by construction (AC-6a, GH #35). Computing the dead set outside it and deleting afterwards would be cheaper but opens a window in which a file touched between probe and delete is removed anyway. The probes therefore stay inside, lengthening a blocking section that is bounded by the entry count and paid only on explicit invocation.

### Decisions

- [x] **D-13: `withinWindow()` decides category visibility, `existingOnly()` never does** — the mechanical consequence of D-7, placed in `_getLeafChildren()` and in the `touchedFilesCategory` branch of `getChildren()` respectively.
- [x] **D-14: `TouchedFileFolderNode.entries` now carries the filtered map**, not the full recorded map. Rationale: F-11, F-12.
- [x] **D-15: One handler, `jarvis.removeTouchedFiles`, serves folder and category nodes**, switching on `node.kind`. Both mean "remove everything recorded below this node"; they differ only in what "below" is, so two registrations would duplicate the same intent.
- [x] **D-16: `removeAll()` deletes the JSON file** rather than writing an empty one — `_load()` already fails open to `{ files: {} }`, so the two are indistinguishable to every reader, and deleting leaves no orphan behind.
- [x] **D-17: The cleanup command reports the zero case too.** Suppressing it would leave the user unable to distinguish "nothing to do" from "the command did not run" — and the entries in question are invisible either way, so the message is the only evidence available.
- [x] **D-18: `$(clear-all)` is the cleanup icon.** The codicon set has no broom.

### Open

*(none at Level 2)*

### Horizontal MECE Check (Level 2)

The three new `TouchStore` methods partition the removal space exactly as Level 1 defines it: `removeUnder` and `removeAll` serve AC-13 (intent, scoped by node), `removeMissing` serves AC-17 (dead entries, store-wide); `removeEntry` remains the single-leaf case. No method removes anything on a time criterion, which is what makes AC-18 checkable by inspection. On the display side, `withinWindow()` and `existingOnly()` are pure functions over the entry map with no shared state and no ordering dependency beyond the deliberate composition at the category root.

### Traceability

| Level 0 | Level 1 | Level 2 |
|---|---|---|
| AC-8 (trash on entry / branch / category) | AC-13 | `removeEntry` / `removeUnder` / `removeAll`, `jarvis.removeTouchedFile(s)`, `jarvisTouchedFileFolder` |
| AC-10 (absent files hidden, not deleted) | AC-16 | `existingOnly()` at category expansion |
| AC-11 (rolling window, default 0) | AC-15, AC-15a | `withinWindow()`, `readWindowDays()`, `jarvis.touchedFiles.windowDays`, `onDidChangeConfiguration` → `refreshAll()` |
| AC-12 (nothing removed automatically) | AC-18 | no timer, no activation hook; every removal path is a registered command |
| AC-13 (cleanup action, reports its result) | AC-17 | `removeMissing()`, `jarvis.cleanupTouchedFiles`, `showInformationMessage` |
| AC-14 (no removal is permanent) | AC-13 | unchanged — `recordTouches()` recreates any entry on the next touch |
| — (category visibility, D-7) | AC-7 | `withinWindow()` in `_getLeafChildren()` |

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. This section did not exist
in this CD prior to Round 1 — added by QM per its own charter, since the CD had
no Issues/Sign-off/Appendix scaffold at all.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-08-05

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 | `SPEC_ENT_TOUCHEDFILES` | The Description, embedded code, and design notes were updated for this CR, but the spec's own numbered Acceptance Criteria list (1–12) was not — AC-6 still reads "if and only if the entity's touch map is non-empty", which the shipped code no longer does (visibility is now keyed to `withinWindow()`, not the raw map). No AC exists for the window filter, the existence filter, the `contextValue` split, the three new `TouchStore` methods, the two new commands, the `windowDays` setting, or the `onDidChangeConfiguration` subscription — all of which the CD's own "Impacted" table declares as this spec's scope. | Medium |
| 2 | L2 | `SPEC_ENT_TOUCHEDFILES` / `treeFactory.ts` | Spec's embedded code places `readWindowDays()`/`withinWindow()`/`existingOnly()` in `touchStore.ts` (file-path comment above the block); actual code lives in `treeFactory.ts`, and the config read differs in form (spec: `getConfiguration('jarvis').get('touchedFiles.windowDays')`; code: `getConfiguration('jarvis.touchedFiles').get('windowDays')`). Functionally equivalent — and arguably the better placement, since `touchStore.ts` has no `vscode` import today — but undocumented. Same class of module-location drift as CR #63's Issue 11. | Low |
| 3 | L2 | `SPEC_ENT_TOUCHEDFILES` / `extension.ts` | `jarvis.cleanupTouchedFiles`'s reported message ("Removed N missing file(s)."/"No missing files found.") omits the entity name that the spec's exact code included (`${node.entityName}: ...`). D-17's own rationale calls the message "the only evidence available" for entries that were invisible while they accumulated — without the entity name, that evidence doesn't say which entity it is evidence for. | Low |
| 4 | L2 | `SPEC_ENT_TOUCHEDFILES` / `package.json` | The category node's `removeTouchedFiles`/`cleanupTouchedFiles` menu entries both use the bare `"inline"` group; the spec specifies `inline@1`/`inline@2` for explicit, guaranteed ordering (cleanup before remove). Declaration order in the shipped file happens to put remove before cleanup — the reverse of what the spec asked for — and neither is guaranteed without the `@N` suffix. | Low |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 9 commits, exact match to CM's message, correct order, zero undisclosed commits.

Read the CD in full: a strong, well-reasoned Level 0 pivot (F-2 through F-6) from destructive cleanup to non-destructive display filtering plus an explicit, on-demand removal action — correctly distinguishes intent (delete), age (a display window), and absence (a display filter that reverts), and correctly identifies the git-branch case as the reason absence must not delete (F-4). D-7's visibility rule (keyed to the window, not the existence check) is justified by a genuine cost argument (F-10/F-12: the window is a timestamp comparison already loaded, the existence check is a file-system probe per entry) and is correctly implemented in `treeFactory.ts`'s `_getLeafChildren()`.

All code independently verified: `touchStore.ts` (`removeUnder`/`removeAll`/`removeMissing`) matches the spec's intent exactly, with `removeMissing()`'s existence probes correctly kept inside the synchronous critical section (AC-6a, GH #35) — confirmed by reading `_load`/`_save` and the method bodies directly; no `await` sits between load and save. `treeFactory.ts`'s `withinWindow()`/`existingOnly()`/`readWindowDays()` and the category/folder/leaf node handling match the spec's described behavior (window decides category visibility; existence check runs once per category expansion and is carried on the folder nodes, never re-probed on descent) — verified by tracing `_getLeafChildren()` → `_getTouchedCategoryChildren()` → `buildTouchedFileChildren()`. The `jarvisTouchedFileFolder` contextValue split (F-13) is present and distinct from `jarvisEntityFileFolder`, with no leftover shared binding. `extension.ts` wires both new commands and the `onDidChangeConfiguration` → `refreshAll()` listener as specified (AC-15a). `package.json` contributes `jarvis.touchedFiles.windowDays` (number, default 0, minimum 0, Hooks group) correctly.

`touched-files-cleanup.test.ts` read in full: 9 genuine behavioral tests calling the real exported `withinWindow`/`existingOnly` (from `treeFactory.ts`) and `TouchStore.removeUnder`/`removeAll`/`removeMissing` (from `touchStore.ts`) against real temp-directory fixtures — no simulated/duplicated logic. Coverage is at the pure-function/store level; the two new command handlers and the configuration-change listener in `extension.ts` are not directly unit-tested, consistent with this codebase's existing convention of not unit-testing `extension.ts` wiring itself.

Reviewed the CD's three self-run "Horizontal MECE Check" sections (Level 0/1/2, run inline by SD per the CM's note rather than via a formal MECE Engineer delegation): all three partitions hold under independent inspection — F-2's three removal causes (intent/age/absence) map to exactly one mechanism each with no overlap; Level 1's AC-15/AC-16/AC-13/AC-17/AC-18 partition the requirement's own criteria without overlap; Level 2's `removeUnder`/`removeAll`/`removeMissing`/`removeEntry` partition the removal space exactly as Level 1 defines it, and `withinWindow()`/`existingOnly()` are confirmed pure functions with no shared state. No contradiction found in any of the three.

Level 1's Issue 2 (cost of the existence check on expand, "bounded but not quantified") is correctly resolved by Level 2's F-12 (one probe per window-surviving entry per category expansion, not per folder expansion or per refresh) — closed, not re-raised.

Full `npx tsc -p packages/core` — clean. Independently re-ran `npx vitest run` — 398/398 passed, 39/39 files, matching CM's disclosed count exactly (+9 tests, +1 file over the prior 389/38).

**Process note:** this CD had no `## Issues`, `## Sign-off`, or `## QM Findings` section at all prior to this review — unlike other recent CDs in this repository. QM has added the `## QM Findings` section per its own charter (findings must be written into the CD, not left as a Jarvis message only); the absence of the other sections is noted to PM/CM as a template-consistency observation, not a spec defect.

**Overall: FINDINGS (non-blocking).** One Medium finding (stale/incomplete SPEC-level Acceptance Criteria for this CR's own declared scope) and three Low findings (module-location/config-key drift, cleanup-message context loss, menu-ordering drift) — none affect correctness, tests, or the build. Recommend PM route Finding 1 to whoever owns `SPEC_ENT_TOUCHEDFILES` next (fix-now or defer) and decide fix/defer/accept for Findings 2–4.

### PM Decisions — Round 1

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Fix now** | `SPEC_ENT_TOUCHEDFILES`'s own numbered AC list is the spec's contract; leaving AC-6 stale and the new mechanisms un-numbered lets this exact CR's scope drift out of its own governing spec on day one. Route to System Designer to add/update the numbered ACs for the window filter, existence filter, `contextValue` split, the 3 `TouchStore` methods, the 2 commands, the setting, and the config-change subscription. |
| 2 | **Accept as-is** | Cosmetic file-path/config-key drift in the spec's embedded code comment; the actual placement (`treeFactory.ts`) is arguably better (no `vscode` import needed in `touchStore.ts`). Same class already accepted for CR #63's Issue 11 — no new precedent risk. |
| 3 | **Fix now** | D-17's own rationale calls the cleanup message "the only evidence available" for entries that were invisible while accumulating — without the entity name, that evidence doesn't identify which entity it's about. One-line fix in `extension.ts`'s `jarvis.cleanupTouchedFiles` handler. |
| 4 | **Accept as-is** | Menu ordering (`inline@1`/`inline@2` vs bare `inline`) is a minor UX polish item with no functional impact — both actions remain reachable and correct regardless of left-to-right order. |

### Round 2 — Post-fix verification (2026-08-05)

**Reviewed by:** QM
**Review date:** 2026-08-05
**Scope:** Findings 1 and 3 fixes only (Findings 2/4 accepted as-is, not re-checked), per CM's dispatch.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. | — |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 5 new commits since Round 1 (`c644b03` through `13b74b5`), exact match to CM's message, correct order, zero undisclosed commits.

Finding 1 (Medium, stale/missing SPEC ACs) — `SPEC_ENT_TOUCHEDFILES` read in full: AC-6 and AC-7 correctly rewritten to state the actual shipped rule (category visibility keyed to `withinWindow()` only, never to `existingOnly()` or the file system); AC-13 through AC-21 added, each cross-referencing the `REQ_ENT_TOUCHEDFILES` AC it satisfies, covering the `windowDays` setting, `withinWindow()`'s rolling-window semantics, `existingOnly()` including its previously-undocumented fail-open behavior when no workspace root is available (independently re-verified against `treeFactory.ts`'s `if (!workspaceRoot) { return entries; }` — matches AC-15's claim exactly), the `jarvisTouchedFileFolder` contextValue split, `removeUnder()`/`removeAll()`, the `jarvis.removeTouchedFiles` command, `removeMissing()`'s in-critical-section probes, the `jarvis.cleanupTouchedFiles` command (now correctly stating it names the entity), and the `onDidChangeConfiguration` → `refreshAll()` subscription. This closes the gap completely — no shipped mechanism from this CR's scope is left without a numbered AC.

Finding 3 (Low, cleanup message missing entity name) — `extension.ts`'s `jarvis.cleanupTouchedFiles` handler now reads `` `${node.entityName}: removed ${count} missing file(s).` `` / `` `${node.entityName}: nothing to clean up.` ``, matching the spec's original intent and the newly-added AC-20. Verified directly against the source.

Trivial comment drift (`13b74b5`, SD self-disclosed, not a QM finding): the `onDidChangeConfiguration` listener's comment now correctly cites AC-21 (its number after the Finding-1 renumbering) instead of the stale AC-15a. Confirmed via direct read — no functional change.

Findings 2 and 4 — PM recorded **accept-as-is** for both (Round 1 table above); not re-verified, no code touched for either in this round's commits.

Full `npx tsc -p packages/core` — clean. Independently re-ran `npx vitest run` — 398/398 passed, 39/39 files, unchanged from Round 1 (neither fix required new test coverage: one is a spec-text-only change, the other a one-line string literal).

**Overall: CLEAR.** Both fix-now findings verified correctly and completely resolved; no regression. Ready to close from QM's side.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | — |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
