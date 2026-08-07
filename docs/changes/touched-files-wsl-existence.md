# Change Document: touched-files-wsl-existence

**Status**: in-progress
**Branch**: feature/touched-files-wsl-existence
**Created**: 2026-08-06
**Author**: Project Manager / Change Manager
**Operation Mode**: user-guided

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

GH #65 follow-up. In WSL and VS Code Remote workspaces, the "Recently Touched Files" tree silently omits files that exist and were genuinely touched. Root cause: `existingOnly()` (introduced by the `touched-files-cleanup` CR, `SPEC_ENT_TOUCHEDFILES` AC-15) calls `fs.existsSync(path.join(workspaceFolders[0].uri.fsPath, relPath))`. On Windows with a WSL workspace, `uri.fsPath` returns a UNC path (`\\wsl$\...`) or a `/home/...` form that Node.js `fs` on the host cannot resolve; the probe returns `false` for files that exist on the remote filesystem, hiding them from the display. `cleanupTouchedFiles` uses the same probe and would permanently delete those valid records.

A second authority mismatch compounds the issue: `TouchTracker` records relative paths against the PostToolUse hook's working directory, which may differ from `workspaceFolders[0].uri.fsPath` if the hook runs from a subdirectory. An existence check that resolves against `workspaceFolders[0].uri.fsPath` without first confirming it is the correct root can misclassify a path that is valid under the hook root.

This CR fixes both by replacing Node-fs probes with VS Code's remote-capable `vscode.workspace.fs.stat` (which delegates to the correct filesystem authority for local, WSL, SSH and Dev Container workspaces), aligning the root authority used for probing with the root used when the path was recorded, and failing open on any lookup uncertainty so valid entries are neither hidden nor deleted.

**URI continuity (scope addition, 2026-08-06):** the touched-file leaf node currently stores only `filePath: string`; `openEntityFile`, `revealInExplorer`, and `diffTouchedFile` reconstruct `vscode.Uri.file(node.filePath)`, which is always a local-filesystem URI. A visibility-only fix would make remote leaves appear in the tree but leave open/reveal/diff broken or navigating to the wrong place. This CR therefore resolves a remote-capable workspace URI once (at node-build time from the stored entry) and carries it on the leaf node, using it for existence probe, open, reveal, and diff. Copy Path semantics remain as text/fsPath where appropriate.

Acceptance:
- AC-1: Files that exist in a WSL or Remote workspace are not hidden by `existingOnly()` and are not deleted by `cleanupTouchedFiles`.
- AC-2: Files that genuinely do not exist are hidden/removed as before (local workspace behaviour unchanged).
- AC-3: On lookup error or root-authority uncertainty, the entry remains persisted and cleanup-protected but is hidden from the tree.
- AC-4: Display and cleanup share the same resolver and the same root authority.
- AC-5: `windowDays = 0` continues to mean no limit (not changed by this CR).
- AC-6: Focused tests covering local + WSL/Remote scenarios and the root-authority mismatch case are included.

Governance note (PM): do not merge until Verify Engineer and QM complete AND the user manually validates in their WSL workspace and explicitly approves merge.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_ENT_TOUCHEDFILES` | Recently Touched Files per Entity | modified | AC-10 amended; AC-15 and AC-16 added |

No new User Story. The capability the user asked for is unchanged — it stopped
holding under conditions the story never stated.

### Findings

**F-1 — the stated root cause does not survive inspection, and the correct one
is not yet established.** The CD attributes the regression to `fs.existsSync`
failing on a path `uri.fsPath` returns for a remote workspace. Two observations
argue against it:

- No Jarvis package declares `extensionKind`, so each defaults to `workspace`.
  In a Remote-WSL, SSH or dev-container window the extension host runs on the
  remote side, where the workspace file system is local and `uri.scheme` is
  `file`. Node `fs` is then the correct API, not a broken one.
- `TouchStore._load` reads the store with `fs.readFileSync`. If Node `fs` could
  not resolve workspace paths in the affected environment, no entry would load,
  the entry map would be empty, and `withinWindow()` would omit the category
  altogether (`SPEC_ENT_TOUCHEDFILES` AC-6). The user sees the category *with
  files missing under it*, which is the opposite signal: the store loads, and
  the paths are wrong.

**F-2 — the more likely mechanism is the recorded path, not the probe.**
`TouchTracker` computes `path.relative(cwd, p)` where both `cwd` and `p` come
from the hook payload — that is, from the agent process, not from VS Code.
`path.relative` is platform-dependent. If the two arrive in different forms
(agent reporting `/home/...` while the extension host resolves `C:\...`, or the
reverse), the result is not a relative path but a traversal such as
`../../home/user/...`, which no file-system API resolves. The same class of
error occurs entirely locally when `cwd` is a subdirectory of the workspace
root: the entry is then relative to the wrong base.

This matters beyond diagnosis. **A wrong path is wrong under every API**, so
replacing `fs.existsSync` with `vscode.workspace.fs.stat` would close this CR
with the defect alive — and leave the specification carrying a mechanism that
was never true but was never checked either, because the claim it sat next to
was correct.

**F-3 — display and removal require different evidence.** A displayed leaf
promises that open, reveal and diff can address a file, so uncertainty is not
enough to show one. Removal is irreversible history loss, so uncertainty is not
enough to delete one either. An undetermined entry therefore belongs to a third
state: persisted but hidden, until a later touch records a resolvable basis.

**F-4 — the root authority cannot be recovered from what is stored.** The
resolution suggested at intake, `getWorkspaceFolder(relPath) → folder.uri →
joinPath(...)`, does not work as written: `getWorkspaceFolder` takes a `Uri`
(`vscode.d.ts`), and obtaining that `Uri` is the problem being solved. The
information needed to resolve a stored entry — which root it was made relative
to — was never recorded. Every existing entry therefore carries an unknown
basis, and a repair that resolves entries strictly would discard the history it
is meant to rescue. Recorded here because it constrains Level 0: AC-15 has to
cover entries written before AC-15 existed.

**F-5 — `Uri.file()` is a real defect, and probably not this one.** Leaf nodes
store `filePath: string` and the open/reveal/diff commands rebuild
`vscode.Uri.file(node.filePath)`, which always produces the `file` scheme. That
is wrong for virtual file systems (`vscode-vfs://`), where Node `fs` does not
work either. In Remote-WSL it is most likely correct, for the reason in F-1.
The fix is worth making on its own merits; it should not be presented as the
remedy for the reported symptom until F-1 is settled.

### Decisions

- [x] **D-1: AC-10 now hides only what is *known* not to exist.** Its previous
  wording — "a file that does not currently exist on disk" — silently assumed
  existence is always determinable. That assumption is the defect, so it is
  stated rather than patched around.
- [x] **D-2 (superseded by user decision, 2026-08-06):** the first Level 0
  pass treated uncertain entries as existing for both display and removal.
  The user separated the two concerns: undetermined entries remain persisted
  and cleanup-protected, but are not shown. AC-15 now records that decision.
- [x] **D-3: AC-15 explicitly covers already-recorded entries.** Justified by
  F-4: without it, the first correct implementation of a strict probe destroys
  every entry whose basis is unknown.
- [x] **D-4: AC-16 states the addressing assumption AC-5 and AC-7 were missing**
  rather than amending them. They describe *which* actions exist and remain
  true; AC-16 describes what an entry denotes. Splitting them keeps one
  criterion per claim.
- [x] **D-5: no API is named at Level 0.** `workspace.fs.stat`, `Uri.joinPath`
  and root resolution are Level 2 concerns. With the mechanism unsettled,
  naming one in a User Story would fix the story to a cause not yet
  demonstrated.

### Open

**O-1 — two observations from the affected workspace would settle F-1 and F-2.**
Neither is available to me from this machine:

1. The contents of `.jarvis/state/touched-files/<kind>-<name>.json` there. Keys
   shaped like `src/foo.ts` refute F-2; keys shaped like `../../home/...`, or
   carrying a drive letter, confirm it.
2. `workspaceFolders[0].uri.toString()` there. A `file:` scheme rules out the
   probe API as the cause and leaves F-2 as the only candidate.

Level 0 does not depend on the answer — every criterion above holds either way.
Level 1 does: the requirement that replaces the probe has to name what it is
fixing.

### Horizontal Check (MECE)

- AC-10, AC-15 and AC-16 partition cleanly: AC-10 governs proven absence,
  AC-15 governs the durable hidden state for undetermined entries, and AC-16
  governs how a proven-present entry is addressed once shown. No state is
  covered twice and none is left out.
- AC-12 already states that display filters never remove anything; AC-15
  strengthens the same guarantee for the cleanup action, which AC-12 does not
  cover, and neither contradicts the other.
- Against siblings: `US_ENT_ENTITY_FILES_TREE` addresses files under an entity
  folder and shares the addressing assumption named in AC-16. It is deliberately
  left alone — the intake scoped ordinary Entity Files out unless the regression
  test proves it shares the defect. If it does, that is a separate CR, and AC-16
  gives it a precedent to follow rather than a rule to re-derive.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_ENT_TOUCHEDFILES` | `US_ENT_TOUCHEDFILES` | modified | AC-16 and AC-17 amended; AC-19, AC-20, AC-21 added |

### Not impacted — checked

| ID | Why not |
|---|---|
| `REQ_HOOK_ROUTE` | It defines the `PostToolUse` payload, including `cwd`. AC-20 places the obligation on the consumer to record a resolvable basis; it does not ask the hook to deliver a different payload. |
| `REQ_ENT_ENTITY_FILE_CHILDREN` | The "Files" category shares the addressing assumption but is scoped out at intake. AC-21 is written for touched-file leaves only, so nothing here changes by implication. |
| `REQ_CFG_GROUPS`, `REQ_CFG_FIXEDPATHS` | No setting and no runtime path is added or moved. |

### Findings

**F-6 — a requirement must not name the probe API, and here that is more than
style.** The intake asked for "replace Node-fs with a remote-capable probe".
With the mechanism unsettled (F-1, F-2), writing an API into a requirement
would fix the specification to a cause not yet demonstrated, and would make the
requirement pass the day the API is swapped whether or not the user's files
reappear. AC-16 therefore states the property — determination through the
authority that owns the folder, the same one the editor would use to open the
file — and leaves the API to Level 2. That phrasing is satisfied by the correct
fix under either mechanism, and by neither fix if only the API changes while the
stored path stays wrong.

**F-7 — AC-16's original wording already assumed a determinate answer.** "A
leaf whose file does not exist" has no reading for "could not tell". The
amendment splits the three states apart: determined-absent (hidden),
determined-present (shown), and undetermined (persisted but hidden, AC-19).
This is why AC-19 is a separate criterion rather than a clause: it is the state
the previous text had no word for.

**F-8 — AC-17's danger was not visible in its own text.** It removes entries
"whose file does not exist" — the same determination as AC-16, but written
independently, so nothing in the requirement said the two had to agree. They
must: an entry the tree would have shown must not be deletable by the cleanup
action. AC-17 now says so explicitly rather than leaving it to whoever
implements both.

**F-9 — AC-20 is not conditional on the diagnosis, though its urgency is.**
Recording the basis a path is relative to is required for any correct
resolution: `path.relative(cwd, p)` over a hook-supplied `cwd` produces a string
whose meaning cannot be recovered afterwards, and a multi-root workspace makes
this ambiguous even locally. If F-2 is confirmed, AC-20 is the fix; if it is
refuted, AC-20 is still the precondition that lets AC-16 be implemented
strictly. Recorded here so a later reader does not mistake it for a
consequence of the diagnosis.

**F-10 — AC-21 states an invariant, not a list of call sites.** Enumerating
open, reveal and diff would leave the next action to re-derive the rule, in the
same way AC-5/AC-7 at Level 0 left the addressing assumption unstated. The
invariant is that anything the tree shows must be reachable by everything the
tree offers on it — a leaf whose actions cannot reach it is worse than an
absent leaf, because it looks like a working affordance.

### Decisions

- [x] **D-6: AC-16 states the authority, not the API.** Justified by F-6.
- [x] **D-7: AC-19 is a standalone criterion.** Justified by F-7. It also gives
  AC-17 and AC-16 one shared definition of absence instead of two.
- [x] **D-8: only a definite "no such file" counts as absence, and only a
  successful resolution counts as present for display.** Any other outcome is
  the durable undetermined state: hidden but retained. Stated positively
  because failure modes cannot be enumerated.
- [x] **D-9: AC-20 binds the recording side, and grandfathers what it cannot
  fix.** Entries already persisted carry no basis; they are undetermined under
  AC-19 rather than displayed or discarded. The user decided they remain in
  that state permanently unless a later touch supersedes them.
- [x] **D-10: AC-21 is written for touched-file leaves only**, matching the
  intake's scoping of ordinary Entity Files. If the regression test shows the
  "Files" category shares the defect, AC-21 is the precedent for a separate CR.

### Open

**O-1 (carried from Level 0) — the two observations still gate the Level 2
design, not this level.** Every criterion above holds under either mechanism.
What the answer decides is where Level 2 spends effort: replacing the probe
(F-1) or repairing how new entries record their basis (F-2). The user decided
that existing entries with no basis SHALL NOT be re-anchored by search; they
remain permanently undetermined, persisted and hidden.

### Horizontal Check (MECE)

- AC-16, AC-19 and AC-13 partition removal and display without overlap: AC-16
  shows only determined-present entries and hides determined-absent ones;
  AC-19 keeps undetermined entries hidden and persisted; AC-13 removes on
  explicit user intent regardless of either. AC-18 remains the statement that
  nothing else removes anything.
- AC-20 and AC-16 are on opposite sides of the store: AC-20 governs what is
  written, AC-16 what is read. Neither restates the other.
- AC-21 and AC-9/AC-11/AC-12 do not overlap: those name which actions exist,
  AC-21 constrains how all of them address the file. Against
  `REQ_ENT_ENTITY_CONTEXTMENU`, which supplies the menu mechanism: unchanged,
  since AC-21 governs the argument passed, not the menu.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_ENT_TOUCHEDFILES` | `REQ_ENT_TOUCHEDFILES` | modified | Canonical URI identity, root-aware persistence, tri-state probing, URI-carrying leaves, race-safe cleanup and multi-root grouping |

### Not impacted — checked

| ID | Why not |
|---|---|
| `SPEC_ENT_ENTITY_FILE_CHILDREN` | Shared open/reveal handlers gain an optional URI argument with their existing local-path fallback; ordinary Entity Files retain their current behavior and data shape. |
| `SPEC_ENG_TREEFACTORY` | The touched-file nodes and builders are provider-local specializations; the generic tree-factory contract does not change. |
| `SPEC_HOOK_ROUTE` | The existing `PostToolUse` payload remains sufficient. Root selection is performed by `TouchTracker`, not added to the hook contract. |

### New Design Elements

None. The change remains inside `SPEC_ENT_TOUCHEDFILES`.

### Findings

**F-11 — authority has to be persisted when the touch is recorded.** A stored
relative path cannot later identify which workspace root owns it. New records
therefore carry canonical resource identity, `rootUri` and `relPath`; existing
records are not guessed or migrated.

**F-12 — display, cleanup and actions need one resolver but different state
policies.** `probeTouchEntry()` resolves through the recorded workspace-folder
authority and returns `present`, `absent` or `unknown`. Display includes only
`present`; cleanup removes only `absent`; open, reveal and diff use the same
resolved URI.

**F-13 — remote-capable probing is asynchronous, while mutation must remain
synchronous.** Cleanup snapshots and probes asynchronously, then
`removeEntriesIfUnchanged()` performs one synchronous compare-delete-write
turn. A concurrent touch changes the stored entry and prevents a stale probe
from deleting it, preserving the GH #35 invariant.

**F-14 — multi-root identity must remain visible to destructive actions.**
Folder removal includes `rootUri`, and the tree adds synthetic workspace-root
folders only when multiple roots contribute visible entries. Equal relative
paths in different roots therefore neither collide nor remove one another.

### Conflicts Detected

- No design-to-design conflict remains.
- The intake Summary's asserted Node-fs/host root cause remains unproven and
  its AC-3 says unknown entries are shown. Both differ from the approved
  specification: unknown entries are permanently persisted but hidden. The
  Summary is retained as the PM/CM intake record; F-1 through F-4 and D-2/D-8
  record the reviewed conclusion.

### Decisions

- [x] **D-11:** New records use `resourceUri.toString(true)` as key and store
  `rootUri` plus root-relative `relPath`.
- [x] **D-12:** `resolveRecordedTouch()` selects the longest containing open
  `file`-scheme workspace root using `path.relative()` boundary checks. A
  touch with no authoritative root is not recorded.
- [x] **D-13:** Legacy entries are never searched, guessed or migrated. They
  remain permanently unknown, hidden and cleanup-protected until a later touch
  creates a resolvable canonical record.
- [x] **D-14:** `workspace.fs.stat` is the shared authority-aware probe. Only
  `FileNotFound` means absent; every other failure or metadata mismatch means
  unknown.
- [x] **D-15:** Cleanup uses snapshot + asynchronous probes + synchronous
  compare-before-delete, preserving concurrent touches and the synchronous
  store mutation invariant.
- [x] **D-16:** Leaf removal uses the canonical record key; folder removal is
  root-scoped; category removal may remove legacy unknown entries because it
  requires no root inference.
- [x] **D-17:** Touched-file leaves carry `resourceUri`. Shared open/reveal
  commands use it when present and keep `Uri.file(filePath)` as the unchanged
  fallback for ordinary entity-file nodes.

### Horizontal Check (MECE)

- [x] Present, absent and unknown are disjoint and exhaustive; display and
  cleanup apply distinct, explicit policies to them.
- [x] Recording, resolution, presentation, action addressing and removal each
  have one owner and no duplicated root inference.
- [x] Single-root and multi-root tree shapes are both specified.
- [x] No contradictions with linked Designs; no new SPEC is required.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_ENT_TOUCHEDFILES` AC-10, AC-15, AC-16 | `REQ_ENT_TOUCHEDFILES` AC-16, AC-17, AC-19, AC-20, AC-21 | `SPEC_ENT_TOUCHEDFILES` AC-15, AC-19, AC-22–AC-27 | ✅ |

### Artefakt-Removal-Check

Not applicable. No file, field, configuration key or specification ID is
removed. The design replaces the `removeMissing()` method contract during
implementation; it is not yet an implemented artefact removed by this design
pass.

### Issues Found

- [x] The intake's exact runtime root cause remains unverified without the two
  affected-workspace observations in O-1. The design does not depend on that
  diagnosis because it records and validates authority end to end.
- [x] Manual WSL validation remains a governance gate before merge, as stated
  in the Summary.

### Sign-off

- [x] All levels completed (no deprecated transition markers introduced)
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
**Review date:** 2026-08-07

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 | `SPEC_ENT_TOUCHEDFILES` AC-27 | Spec text describes grouping-by-`rootUri` + synthetic top-level folder; shipped design disambiguates via `item.description` in place — no grouping pass, no synthetic level, condition tests "roots open" not "roots with visible entries", top-level leaves get no disambiguation. VE's own R3.3, carried here as a QM-confirmed finding rather than only a VE observation. Reconciliation in progress in parallel per CM (SD amending spec to match code, no code change). | Medium |
| 2 | L2 | `SPEC_ENT_TOUCHEDFILES` AC-24 | "Verifies... the canonical record key" clause not implemented — `probeTouchEntry` receives only the entry, never the key. Residual since VE R2, unchanged through R3. Non-blocking per VE (materially smaller since the open-folder match was added), concur. | Low |

**Independent verification (git log, code, spec, build):**

Git log fully disclosed — 14 commits, exact match to CM's message, correct order across all three VE rounds (R1 PARTIAL → R2 PARTIAL → R3 PASSED) plus their two memory commits, zero undisclosed commits.

Read the CD's Level 0/1/2 analysis in full. F-1's refutation of the intake's own stated root cause (extensionKind defaults to `workspace` so the extension host runs remote-side where Node fs is correct; the `_load` reductio — if Node fs couldn't resolve workspace paths, the store wouldn't load and the whole category would vanish, not lose individual entries) is sound and independently re-derivable from the code as described. F-4's observation that `getWorkspaceFolder` takes a `Uri` (the very thing missing) rather than producing one is confirmed against `vscode.d.ts`'s actual signature. D-2/D-8's three-state model (present/absent/unknown, only the last two hidden, only "absent" removable) is exactly what shipped.

Independently read the current code against VE's R3 verdict table rather than re-deriving VE's own diffs: `probeTouchEntry` in [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L107-L121) — `rootUri`/`relPath` presence guard, open-folder-authority match against `vscode.workspace.workspaceFolders`, `Uri.joinPath` + `workspace.fs.stat`, only `FileNotFound` → `absent` — confirmed AC-24's open-folder validation is in, matching VE's R2 fix and unchanged through R3. `TouchedFileFolderNode.rootUri` confirmed present with the corrected comment ("entries scoped to this root"); `buildTouchedFileChildren` confirmed scoping `entries` to the node's own root before it is handed to nested folders (`scopedEntries` filter on `e.rootUri === rootUri`), which is what makes nested-folder inheritance correct per R3.1's second bullet. `extension.ts`'s `removeUnder` call site confirmed passing `node.rootUri` verbatim (line 874) rather than R2's rejected `Object.values(node.entries)[0]?.rootUri` derivation. `touchStore.ts`'s `removeUnder` confirmed matching on `entry.relPath ?? key` (not the old workspace-relative-vs-URI-key mismatch from R1) with `rootUri` as an optional additional filter — the exact fix VE's R1→R2 progression describes. `treeFactory.ts`'s `item.description = root.name` gated on `folders.length > 1 && element.rootUri` confirmed present, matching R3.2's disambiguation claim and R3.3's "tests roots-open not roots-with-entries" characterization of the same code.

Spot-checked the new `rootUri propagation through folder nodes` test suite in [touched-files-cleanup.test.ts](../../src/tests/touched-files-cleanup.test.ts#L201-L235): confirmed the `buildTouchedFileChildren` test asserts two distinct folder nodes carrying `file:///wsA`/`file:///wsB` respectively (producing-path coverage, closing R1/R2's "test builds its own argument" defect class at the seam that mattered), and confirmed the adjacent `removeUnder` test still hardcodes the root when invoking the store method directly — matching VE's own characterization that this remaining gap is a single property read, not logic, and is low-risk rather than a repeat of the R1/R2 pattern.

Full `npx tsc -p packages/core` — clean. Independently re-ran `npx vitest run` — 406/406 passed, 40/40 files, matching CM's and VE's disclosed count exactly.

**On CM's parallel-amendment note:** proceeding against the functional scope as instructed. Finding 1 above restates VE's R3.3 as a QM finding (not merely an observation) because it is a genuine spec-vs-code divergence that must be closed before `SPEC_ENT_TOUCHEDFILES` returns to `:status: implemented` — consistent with VE's own explicit refusal to sweep the status, and consistent with QM's charter to attribute root cause to the specification layer rather than treat a documented divergence as pre-resolved. Recording it here does not block merge of the functional scope; it blocks the status sweep, which VE has already correctly withheld.

**Overall: FINDINGS (non-blocking for the functional scope; Finding 1 blocks the pending `SPEC_ENT_TOUCHEDFILES` status sweep until reconciled).** The manual WSL validation gate (governance, not QM's scope) remains the outstanding step before merge — nothing in this review substitutes for it, per VE's own R1 "Observations" note that the design's correctness under either root-cause mechanism is not itself evidence the reported symptom is resolved.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 (AC-27 spec/code divergence) | fix-now (spec amendment, no code change) | Shipped behavior (description-based disambiguation) is the correct, simpler design — reconcile `SPEC_ENT_TOUCHEDFILES` AC-27's text to match it rather than build the spec's heavier grouping/synthetic-folder mechanism. CM's parallel amendment closes this and unblocks the status sweep to `implemented`; does not block this CD's merge. |
| 2 | 2 (AC-24 canonical-key verification) | defer | Low severity, residual since R2, materially reduced by the open-folder-authority check already in place. Track on the project backlog as a small follow-up rather than extend this CR further. |

---

## Appendix: Link Discovery Results

```
REQ_ENT_TOUCHEDFILES (in): SPEC_ENT_TOUCHEDFILES
```

---

*Generated by syspilot Change Agent*
