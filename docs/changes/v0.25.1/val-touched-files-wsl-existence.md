# Validation Report: touched-files-wsl-existence

**Change Request**: touched-files-wsl-existence (GH #65 follow-up)
**Change Document**: [touched-files-wsl-existence.md](touched-files-wsl-existence.md)
**Branch**: `feature/touched-files-wsl-existence` (tip `e1aa026`)
**Verified by**: Verify Engineer
**Date**: 2026-08-07
**Verdict**: ✅ **PASSED** (Round 4) — AC-27 reconciled, status change is now correct for that criterion; one residual AC-24 clause is asserted by the status but not implemented

> **Round 4, 2026-08-07, tip `ec14f44`.** Spec-only. AC-27 now matches the
> shipped behaviour and `SPEC_ENT_TOUCHEDFILES` is `implemented`. Rounds 1–3 are
> retained below unedited.

---

## Summary

The core of this CR is sound and, in places, better than the specification asked
for. Recording, probing and action-addressing are correct, and the GH #35
synchronous-mutation invariant survives the move to asynchronous probing.

But three of the specification's own numbered criteria are not implemented, and
one of them is a **live regression**: the trash icon on a touched-file folder
silently removes nothing for every entry written under the new schema. It is
covered by a test that passes an argument the production call site never
produces, which is why the suite is green.

Recommend fixing Finding 1 before the manual WSL gate, since that gate will not
catch it — the icon reports no error and the tree refreshes.

**Governance honoured:** branch not pushed; no merge action taken. Manual WSL
validation by the user remains the required gate.

---

## 1. What is correct

Verified against `SPEC_ENT_TOUCHEDFILES` D-11..D-17 and AC-22..AC-27, reading
the code rather than the CD's account of it.

| Spec criterion | Evidence | Result |
|---|---|---|
| **AC-22 / D-12** — record keyed by canonical `resourceUri.toString(true)`, stores `rootUri` + `/`-separated `relPath`; longest `file`-scheme root by `path.relative` boundary check, never string-prefix; no record if no root is authoritative | [touchTracker.ts](../../packages/core/src/engine/hooks/touchTracker.ts#L30-L45) — `scheme !== 'file'` skip, `rel.startsWith('..') \|\| path.isAbsolute(rel)` boundary test, longest-root selection, `undefined` when none | ✅ exact |
| **D-14** — `workspace.fs.stat` is the shared probe; only `FileNotFound` is `absent`, everything else `unknown` | [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L107-L121) | ✅ |
| **AC-15** — both `absent` and `unknown` hidden, neither deleted by the filter | `probeEntries` admits only `present` | ✅ |
| **AC-23 / D-13** — legacy entries (no `rootUri`/`relPath`) stay persisted, hidden, never migrated or cleaned up | `probeTouchEntry` returns `unknown` on the missing-metadata guard; cleanup passes only `absent` keys | ✅ |
| **AC-25 / D-17** — leaves carry `resourceUri`; open/reveal/diff use it and do not reconstruct `Uri.file(filePath)` | [extension.ts](../../packages/core/src/extension.ts#L586) reveal, [#L750](../../packages/core/src/extension.ts#L750) open, [#L847](../../packages/core/src/extension.ts#L847) diff — all `node.resourceUri ?? Uri.file(...)`, fallback retained for ordinary entity-file nodes | ✅ |
| **AC-26** (first half) — `removeTouchedFile` deletes by `recordKey`, not by deriving from the first workspace folder | [extension.ts](../../packages/core/src/extension.ts#L855-L864) | ✅ |
| **AC-19 / D-15** — cleanup snapshots, probes asynchronously, then removes through one synchronous compare-delete-write | [extension.ts](../../packages/core/src/extension.ts#L886-L895) + [touchStore.ts](../../packages/core/src/engine/hooks/touchStore.ts#L124-L145) | ✅ |
| **GH #35 invariant** — no `await` between load and save in the mutating turn | `removeEntriesIfUnchanged` is synchronous end to end; read directly | ✅ preserved |

`removeEntriesIfUnchanged` deserves a specific note: it compares `lastRead` **and**
`lastEdited` against the snapshot, so a concurrent touch of either kind protects
the entry. That is what D-15 promises, implemented as promised.

| Check | Result |
|---|---|
| `npx tsc -p packages/core` | ✅ clean |
| `npx vitest run` | ✅ 403 / 403, 40 files — matches the CD's claim |

---

## 2. Finding 1 — HIGH: folder-level removal is a silent no-op (regression)

`SPEC_ENT_TOUCHEDFILES` AC-17 specifies
`removeUnder(kind, name, rootUri, relFolderPath)`, and AC-26 requires that
"folder removal includes `rootUri` in its scope".

**Shipped signature** ([touchStore.ts](../../packages/core/src/engine/hooks/touchStore.ts#L87)):

```ts
async removeUnder(kind: string, name: string, relFolderPrefix: string): Promise<void>
```

Three parameters, no `rootUri`, and the body prefix-matches against the **entry
key**:

```ts
const prefix = relFolderPrefix.endsWith('/') ? relFolderPrefix : relFolderPrefix + '/';
for (const key of Object.keys(data.files)) { if (key.startsWith(prefix)) { delete data.files[key]; } }
```

This CR changed the key from a workspace-relative path to a canonical URI
(AC-22). The prefix handed in did **not** change: `buildTouchedFileChildren`
derives `relFolderPath` from `entry.relPath`
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L188)), so
it is root-relative, and
[extension.ts](../../packages/core/src/extension.ts#L874) passes it straight
through:

```ts
await touchStore.removeUnder(node.ownerKind, node.entityName, node.relFolderPath!);
```

The two no longer meet. Demonstrated rather than argued:

| | prefix used | key | matches |
|---|---|---|---|
| **production** (`node.relFolderPath`) | `src/` | `file:///ws/src/a.ts` | **false** |
| **test** ([touched-files-cleanup.test.ts](../../src/tests/touched-files-cleanup.test.ts#L182)) | `file:///ws/src/` | `file:///ws/src/a.ts` | true |

**User-visible effect:** the inline trash icon on a touched-file folder node —
bound in `package.json` on `viewItem == jarvisTouchedFileFolder` and shipped by
the `touched-files-cleanup` CR — deletes nothing for any entry recorded under
the new schema. No error, no message; the tree refreshes unchanged. Before this
CR it worked, because keys were the relative paths the prefix was built from.

**Why the suite did not catch it.** The test named *"removeUnder works with new
key format"* passes `'file:///ws/src'`. Its own comment records the hazard and
then steps around it:

> `// removeUnder uses key prefix matching — for new format, keys are URIs`
> `// so prefix-based removal on relPath won't work directly.`

The observation is exactly right. The test then asserts the case the production
path does not take, so it passes while the defect ships. This is worth naming
beyond the fix: a test whose argument is constructed by the test rather than
taken from the caller can only confirm the function, never the wiring.

**Fix shape** (design decision belongs to SD, not to this report): either pass
the resolved URI prefix from the leaf/folder node, or implement the specified
four-parameter `removeUnder` with `rootUri` scoping — the latter also discharges
AC-26's multi-root requirement, which is currently unmet for the same reason.

---

## 3. Finding 2 — MEDIUM: AC-24's authority validation is not implemented

AC-24 requires that `probeTouchEntry()`:

> parses `rootUri`, **requires an exact match to a currently open workspace
> folder**, joins `relPath` with `Uri.joinPath`, **verifies both the canonical
> record key and owning folder**, then calls `workspace.fs.stat`.

The shipped function
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L107-L121))
parses, joins and stats. It performs **neither** the open-folder match **nor**
the record-key verification.

Consequence: AC-15 names "authority mismatch" as one of the causes that must
yield `unknown`. There is no code path that can produce it — the only `unknown`
sources are missing metadata and a non-`FileNotFound` error. An entry whose
`rootUri` names a folder no longer open in the workspace is probed anyway, and
if that path resolves on the host it is displayed as present, and if it does not
it is reported `absent` and becomes eligible for deletion by cleanup.

That last consequence is what makes this more than pedantry: CD acceptance
criterion AC-3 promises that "root-authority uncertainty" leaves an entry
"persisted and cleanup-protected". Without the open-folder check, root-authority
uncertainty is not detected, so it cannot protect anything.

---

## 4. Finding 3 — MEDIUM: AC-27 multi-root grouping is not implemented

AC-27 requires the category to group resolved entries by `rootUri` and to show
a synthetic workspace-folder level when more than one root contributes visible
entries.

`rootUri` occurs in `treeFactory.ts` at exactly two places, both inside
`probeTouchEntry`. There is no grouping, and
[the category builder](../../packages/core/src/engine/core/treeFactory.ts#L748-L749)
passes the flat probed map straight to `buildTouchedFileChildren` with an empty
`underFolder`.

In a two-root workspace where both roots contain `src/`, the folder nodes merge:
`seenFolders` de-duplicates on `relFolderPath` alone, so the second root's `src`
is dropped and its files appear under the first root's node. Combined with
Finding 1's missing `rootUri` scoping, this is the collision AC-27 and AC-26
were written to prevent.

Single-root workspaces — including the WSL case this CR targets — are
unaffected, which is why it is Medium rather than High.

---

## 5. Finding 4 — LOW: `removeMissing()` is dead code that still contains the original defect

[touchStore.ts](../../packages/core/src/engine/hooks/touchStore.ts#L102-L118)
still carries:

```ts
const abs = path.join(workspaceRoot, relPath);
if (!fs.existsSync(abs)) { delete data.files[relPath]; count++; }
```

That is the precise construct this CR exists to eliminate, and it is now doubly
wrong — `relPath` is a URI key under the new schema, so `path.join` produces
nonsense. It has **no production caller**: the cleanup command was rewired to
snapshot + probe + `removeEntriesIfUnchanged`, and the spec's AC-19 no longer
describes `removeMissing`.

No live impact today. Worth deleting rather than leaving: it is a working-looking
method with the defect's original shape, one call away from being reused.

---

## 6. Finding 5 — LOW: AC-15 names a function that no longer exists

AC-15 reads "``existingOnly()`` asynchronously probes the output of
``withinWindow()``". The function was renamed to `probeEntries()` and
`existingOnly` no longer exists anywhere in the codebase. The described
behaviour is correct; only the name is stale.

---

## 7. Observations, not findings

**The CD's Level 0 analysis is the strongest part of this CR.** F-1 refutes the
intake's own stated root cause with two independent arguments — the
`extensionKind` default placing the extension host on the remote side, and the
`_load` reductio (if Node `fs` could not resolve workspace paths, the store
itself would not load and the category would vanish rather than lose entries).
F-2 then identifies the recorded path as the likelier mechanism and states the
consequence that matters: *a wrong path is wrong under every API*, so swapping
the probe alone would have closed the CR with the defect alive. The
implementation follows the analysis rather than the intake, which is why
`resolveRecordedTouch` exists at all.

**O-1 remains open and the design does not depend on it.** The two
affected-workspace observations were never obtained. Recording authority end to
end makes the fix correct under either mechanism — but it also means the manual
WSL gate is the first evidence that the reported symptom is actually resolved.
Worth stating plainly: nothing verified here demonstrates that the user's files
reappear. That is what the gate is for.

**Working tree:** `.vscode/settings.json` was modified and `.jarvis/autodelivery.json`
untracked at verification time. Neither is mine and neither affects the result.
The phantom spec-file reversions CM warned about were **not** present — no
`git checkout --` was needed.

---

## 8. Verdict detail

| Aspect | Result |
|---|---|
| Recording authority (AC-22 / D-12) | ✅ exact |
| Tri-state probe (D-14, AC-15) | ✅ behaviourally; ⚠️ AC-24 validation missing |
| Legacy entries retained and hidden (AC-23 / D-13) | ✅ |
| URI-carrying leaves, open/reveal/diff (AC-25 / D-17) | ✅ |
| Race-safe cleanup (AC-19 / D-15, GH #35) | ✅ |
| Leaf removal by record key (AC-26 first half) | ✅ |
| **Folder removal (AC-17, AC-26 second half)** | ❌ **silent no-op — regression** |
| **Multi-root grouping (AC-27)** | ❌ not implemented |
| Build / tests | ✅ clean, 403/403 |

**Not a rejection of the approach.** The hard parts — root authority, tri-state
semantics, race safety — are done, and done well. Three criteria the spec
already states are not yet in the code, one of them breaking a shipped
affordance.

**Recommendation:** fix Finding 1 before the manual WSL gate; route Findings 2
and 3 to SD/PM for fix-or-defer; delete the dead method in Finding 4; correct
the name in Finding 5.

---

# Round 2 — 2026-08-06, tip `8c7e8f9`

**Verdict: ⚠️ PARTIAL.** Findings 2, 4 and 5 resolved. Finding 1 resolved for
single-root and **regressed into a wrong-target deletion for multi-root**.
Finding 3's de-duplication is fixed but AC-27 is still not implemented.

| Check | Result |
|---|---|
| `npx tsc -p packages/core` | ✅ clean |
| `npx vitest run` | ✅ 404 / 404, 40 files |
| `removeMissing` gone from all sources and tests | ✅ no occurrence |

## R2.1 — Resolved

**Finding 2 (AC-24 authority validation)** — ✅ the substantive clause is in:

```ts
const folders = vscode.workspace.workspaceFolders;
if (!folders?.some(f => f.uri.toString(true) === entry.rootUri)) { return { result: 'unknown' }; }
```

Exact match against currently open folders, `unknown` on mismatch. This is what
gives "authority mismatch" a code path and lets CD acceptance criterion AC-3
actually protect an entry. The new test asserts it against a foreign `rootUri`.
*Residual (low):* AC-24 also requires verifying "the canonical record key";
`probeTouchEntry` still receives only the entry, never the key, so that clause
remains unimplemented. Materially smaller now that the root is validated.

**Finding 4 (dead `removeMissing`)** — ✅ deleted; no occurrence remains
anywhere, including tests.

**Finding 5 (stale name)** — ✅ `SPEC_ENT_TOUCHEDFILES` AC-15 now reads
`probeEntries()`.

**Finding 1, store half** — ✅ `removeUnder` now matches on `entry.relPath ?? key`,
so the root-relative prefix the production call site produces matches new-schema
entries, and legacy entries still match by key. The optional `rootUri` parameter
was added as AC-17 specifies. The R1 lesson was also taken in the test, which
now passes `('src', 'file:///ws')` — the shape the caller actually produces —
instead of the URI prefix it invented before.

## R2.2 — Finding 6, HIGH (multi-root only): the folder trash deletes the wrong root

The store function is correct. The **caller's derivation of `rootUri` is not**
([extension.ts](../../packages/core/src/extension.ts#L872-L877)):

```ts
// F1: derive rootUri from the first entry in the folder's entry map
const firstEntry = node.entries ? Object.values(node.entries)[0] : undefined;
const rootUri = firstEntry?.rootUri as string | undefined;
```

The comment says "the folder's entry map". It is not one:
`TouchedFileFolderNode.entries` is declared *"full flat entry map, for children
resolution"*
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L82)), and
`buildTouchedFileChildren` pushes the whole `entries` parameter onto every folder
node it creates
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L196)). The
node also carries no `rootUri` of its own.

So `Object.values(...)[0]` is the first entry of the **entire category**, chosen
by insertion order, with no relation to the folder that was clicked. Executed
against the exact expressions from the shipped code:

```
user clicks the root-B 'src' node
extension derives rootUri : file:///wsA
correct rootUri would be  : file:///wsB
removeUnder deletes       : file:///wsA/src/a.ts
```

**The user clicks root B's folder and root A's history is deleted.** R1's defect
removed nothing; this one removes the wrong thing, so it is worse in kind even
though it is narrower in reach.

A second path, same cause: if the first entry is a legacy record it has no
`rootUri`, so `rootUri` is `undefined` and `removeUnder`'s guard
`(!rootUri || entry.rootUri === rootUri)` degrades to "any root" — the folder
prefix is then removed across every root at once.

**Single-root workspaces are correct**, because only one root exists for the
derivation to pick. That includes the WSL scenario this CR targets, which is why
this is scoped rather than blocking everything — but it is also why the manual
WSL gate will not surface it, for the second round running.

**Fix shape** (SD's call): give `TouchedFileFolderNode` a `rootUri`, set from the
`entry` that created the node in `buildTouchedFileChildren`, and have
`extension.ts` pass `node.rootUri`. That is where the value is already known,
and it also supplies what AC-27 needs.

**Test-coverage note, same class as R1.** The revised `removeUnder` test hardcodes
the correct `rootUri`. Nothing exercises the derivation, which is the part that
is wrong. R1's finding was that a test constructing its own argument confirms the
function but not the wiring; the fix moved the untested seam one level up rather
than closing it.

## R2.3 — Finding 3 partially addressed: AC-27 still not implemented

De-duplication is fixed — the key is now `${entry.rootUri ?? ''}|${relFolderPath}`,
so two roots' `src` folders no longer collapse into one node. That removes the
data-hiding half of the R1 finding.

AC-27 itself is unchanged and still unmet: it requires the category to **group
resolved entries by `rootUri`** and to show the workspace-folder name as a
synthetic top-level folder when more than one root contributes visible entries.
Neither exists. The observable result in a two-root workspace is now **two
sibling folder nodes with the identical label** and nothing distinguishing them —
which, combined with Finding 6, means the two nodes are not only
indistinguishable but also both act on whichever root happens to be first.

Fixing Finding 6 as suggested above makes AC-27 largely fall out: once the node
knows its root, grouping and labelling have the value they need.

## R2.4 — Verdict detail

| Aspect | R1 | R2 |
|---|---|---|
| Folder removal reaches new-schema entries | ❌ no-op | ✅ fixed |
| Folder removal targets the correct root | — | ❌ **wrong root (multi-root)** |
| AC-24 open-folder validation | ❌ | ✅ |
| AC-24 record-key verification | ❌ | ❌ residual, low |
| Multi-root de-duplication | ❌ merged | ✅ fixed |
| AC-27 grouping + synthetic root folder | ❌ | ❌ unchanged |
| Dead `removeMissing` | ❌ | ✅ deleted |
| AC-15 name | ❌ | ✅ corrected |
| Build / tests | ✅ 403 | ✅ 404 |

**Recommendation:** one focused change — put `rootUri` on the folder node and
consume it in `extension.ts` — closes Finding 6 and most of AC-27 together. Add
a test that builds the node through `buildTouchedFileChildren` and passes *that*
node to the handler's logic, so the derivation is covered rather than the store
function alone. Everything else on this branch is ready.

---

# Round 3 — 2026-08-06, tip `6870484`

**Verdict: ✅ PASSED** for the CR's functional scope. Finding 6 resolved. One
open item (R3.3) is a specification-conformance question, not a defect.

| Check | Result |
|---|---|
| `npx tsc -p packages/core` | ✅ clean |
| `npx vitest run` | ✅ 406 / 406, 40 files |

## R3.1 — Finding 6 resolved

The arbitrary derivation is gone. `TouchedFileFolderNode` now carries `rootUri`,
set from the entry that created the node, and the handler passes it verbatim:

```ts
await touchStore.removeUnder(node.ownerKind, node.entityName, node.relFolderPath!, node.rootUri);
```

Three things make this correct rather than merely different:

- **`entries` is now scoped to the node's root**
  ([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L198-L201)),
  so children resolution cannot cross roots either. The field's comment was
  updated with it — it previously said "full flat entry map", which is what made
  R2's caller comment ("the folder's entry map") wrong in the first place. Code
  and comment now agree.
- **Nested folders inherit correctly.** The expansion path at
  [treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L606)
  passes `element.entries` — already root-scoped — so a folder built at depth 2
  derives its `rootUri` from entries that can only belong to one root.
- **The `rootUri === undefined` branch is unreachable in display.** Legacy
  entries have no `rootUri`, so `probeTouchEntry` returns `unknown` and
  `probeEntries` drops them before
  [the category ever calls the builder](../../packages/core/src/engine/core/treeFactory.ts#L766).
  Every displayed folder node therefore has a defined `rootUri`, and
  `removeUnder`'s `(!rootUri || …)` fallback cannot degrade to "any root" through
  this path. Benign residual, checked rather than assumed.

**Test coverage — the R2 gap is closed at the seam that mattered.** The new
`buildTouchedFileChildren` test asserts two distinct folder nodes with
`rootUri` `file:///wsA` and `file:///wsB`, exercising the producing path rather
than a hand-built argument. The second test still hardcodes the root when
calling `removeUnder`, but what now sits between them is a single property read
(`node.rootUri`), not logic — which is precisely why R2's version was dangerous
and this one is not. Chaining the two (take the node from the first test, feed
its `rootUri` to the second) would close it completely; worth doing, not worth
blocking on.

## R3.2 — AC-27's user-visible purpose is met

Identically-named folders from different roots are now distinguishable: the tree
item gets `description = root.name` when more than one workspace folder is open
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L492-L497)),
and each node acts on its own root. The failure R2 described — two identical
siblings both deleting whichever root sorted first — is gone.

## R3.3 — Open: AC-27 is implemented differently from how it is written

AC-27 says:

> the category **groups resolved entries by `rootUri`** before building each
> root-relative hierarchy. The workspace-folder name is shown as a **synthetic
> top-level folder** only when **more than one root contributes visible
> entries**; a single-root workspace retains the existing tree shape.

The shipped design has no grouping pass and no synthetic folder level; it
disambiguates in place via `item.description`. Three concrete mismatches:

1. **No synthetic top-level folder.** The shipped approach avoids an extra
   nesting level, which is arguably the better UX — but it is not what the
   criterion states.
2. **The condition differs.** The code tests `folders.length > 1` — how many
   roots are *open* — where AC-27 says "more than one root *contributes visible
   entries*". In a two-root workspace where only one has touched files, every
   folder node carries a redundant root name.
3. **Top-level leaves are not disambiguated.** Files touched at a root's top
   level become leaves, not folders, so they receive no `description`. Two roots
   each with a top-level `a.ts` produce two identical leaves. Under AC-27's
   synthetic-folder design this case could not arise, because each leaf would sit
   under its root's folder. Removal is still correct — leaves delete by
   `recordKey` — so this is a display ambiguity, not a data risk.

**This is not a request to change the code.** The shipped behaviour is
defensible and possibly preferable. But spec and code disagree, and the spec is
the contract, so one of them has to move — most cheaply by amending AC-27 to
describe the description-based design, and while doing so deciding what happens
to (2) and (3).

**Status consequence, stated because I got this wrong once before:**
`SPEC_ENT_TOUCHEDFILES` is currently `:status: approved`. It should **not** be
swept to `implemented` until AC-27 is reconciled, or that sweep records as
verified a criterion the artefact does not satisfy. I have not changed any
status.

## R3.4 — Verdict detail

| Aspect | R1 | R2 | R3 |
|---|---|---|---|
| Folder removal reaches new-schema entries | ❌ | ✅ | ✅ |
| Folder removal targets the correct root | — | ❌ wrong root | ✅ fixed |
| Root scoping of `entries` for children | — | ❌ | ✅ |
| Derivation covered by test | ❌ | ❌ | ✅ producing path |
| AC-24 open-folder validation | ❌ | ✅ | ✅ |
| AC-24 record-key verification | ❌ | ❌ residual, low | ❌ residual, low |
| Multi-root folders distinguishable | ❌ | ❌ | ✅ |
| AC-27 as written | ❌ | ❌ | ⚠️ divergent design |
| Dead `removeMissing` | ❌ | ✅ | ✅ |
| Build / tests | ✅ 403 | ✅ 404 | ✅ 406 |

**Remaining before merge:** the manual WSL validation gate, which is the user's
and is still the only evidence that the reported symptom is actually resolved —
nothing verified across three rounds demonstrates that, because O-1 was never
answered. Unlike Rounds 1 and 2, there is no longer a known defect the gate
would fail to notice.

---

# Round 4 — 2026-08-07, tip `ec14f44`

**Verdict: ✅ PASSED.** Spec-only commit, `docs/design/spec_ent.rst` alone.
All three requested confirmations hold. One residual is raised below.

## R4.1 — The three confirmations

**1. AC-27 matches the shipped behaviour.** ✅ The amendment addresses all three
mismatches from R3.3, and does so by describing what the code does rather than
by softening the criterion:

| R3.3 mismatch | Amended AC-27 |
|---|---|
| No synthetic top-level folder | "disambiguated by `rootUri` instead of by an additional nesting level"; folder node shows the root name as its `description` |
| Condition is `folders.length > 1`, not "roots contributing visible entries" | "When more than one workspace folder is **open**" |
| Top-level leaves not disambiguated | stated explicitly: identically-named top-level files "stay visually indistinguishable — accepted as the normative behavior for this CR" |

The third is the one that mattered. It would have been easy to omit, since it
is the shipped design's one genuine loss against the specified design. Naming it
as accepted normative behaviour means the next reader meets a decision instead of
a bug. The amendment also picks up the de-duplication key and root-scoped
`entries` — both verified in R3 — so AC-27 now describes the whole mechanism
rather than only the visible part.

**2. `SPEC_ENT_TOUCHEDFILES` is `:status: implemented`.** ✅ Changed in the same
commit. Correct **for AC-27**, which is what R3 gated it on — see R4.2 for the
part that is not.

**3. Sphinx `-W --keep-going`.** ✅ build succeeded, no warnings.

## R4.2 — Residual: AC-24 asserts a check the code does not perform

AC-24 is unchanged and still reads:

> `probeTouchEntry()` parses `rootUri`, requires an exact match to a currently
> open workspace folder, joins `relPath` with `Uri.joinPath`, **verifies both the
> canonical record key and owning folder**, then calls `workspace.fs.stat`.

The owning-folder half is implemented (R2 verified it). The **canonical record
key** half is not, and cannot be as written: `probeTouchEntry(entry)` receives
only the entry — the key is never passed in
([treeFactory.ts](../../packages/core/src/engine/core/treeFactory.ts#L107)).

I flagged this as a low residual in R2 and R3, when the element was `approved`
and the gap was merely unfinished work. It changes character now: `implemented`
asserts that the artefact satisfies every criterion, and for this clause it does
not. That is the same shape as the AC-27 divergence just corrected, in the same
element, and the same shape as the error I recorded against myself in
[val-jarvis-gitignore-wiring-restore.md](val-jarvis-gitignore-wiring-restore.md)
§5 — a status marking that says "checked" about something unchecked.

PM's decision to **defer the fix** is not in question. What is in question is
carrying an unsatisfied clause under an `implemented` marker.

Three ways out, cheapest first:

1. **Amend AC-24 the way AC-27 was just amended** — state that the stored key is
   not re-verified. Worth adding the reason: the key is
   `Uri.joinPath(rootUri, relPath).toString(true)` by construction at record
   time, so re-deriving it during the probe compares the value against its own
   inputs. It is not vacuous — it would catch a hand-edited or corrupted store
   file — but that is a different purpose from the one AC-24 is written for, and
   worth saying rather than leaving as an unexplained omission.
2. **Implement it** — pass the key into `probeTouchEntry` and compare.
3. **Revert the status** until either is done.

Option 1 costs one paragraph and leaves the `implemented` marker honest. That is
the recommendation.

**Not a blocker for this CR.** No behaviour is wrong, and the deferral stands.
It is a bookkeeping correction, raised because the status change is exactly what
converts it from a known gap into a false claim.

## R4.3 — Merge readiness

| Item | State |
|---|---|
| Functional findings R1–R3 | ✅ all resolved |
| AC-27 spec/code reconciliation | ✅ done |
| `SPEC_ENT_TOUCHEDFILES` status | ✅ `implemented` — pending R4.2 for AC-24 |
| Sphinx `-W` | ✅ clean |
| Manual WSL validation gate | ⏳ outstanding — the user's, and still the only evidence the reported symptom is resolved (O-1 unanswered) |
