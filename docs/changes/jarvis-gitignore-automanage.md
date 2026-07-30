# Change Document: jarvis-gitignore-automanage

**Status**: in-progress
**Branch**: feature/jarvis-gitignore-automanage
**Created**: 2026-07-30
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

Consuming projects currently hand-manage `.gitignore` entries for
Jarvis-generated transient state. #58 established a `jarvis-` prefix for
files Jarvis generates into directories it does not exclusively own
(`REQ_CFG_FILEPREFIX`); the prefix marks **ownership of the generation
act**, not disposability — authored artefacts (icons, change docs, instruction
files) may also carry `jarvis-` as a product name. This change makes Jarvis
maintain the corresponding workspace-root `.gitignore` entries automatically
(nested `.gitignore` files are out of scope).

On activation (and on `jarvis.gitignore.autoManage` configuration change),
Jarvis maintains a marked block in the workspace-root `.gitignore`:
```
# BEGIN JARVIS MANAGED (see jarvis.gitignore.autoManage)
…enumerated, path-anchored ignore entries from getIgnoreEntries()…
# END JARVIS MANAGED
```
If missing, appends it (creating `.gitignore` if needed); if present but
stale, rewrites **only** the content between the markers, leaving surrounding
user content untouched. Setting `jarvis.gitignore.autoManage` (boolean,
default `true`) opts out; turning it off **actively removes** the block
(symmetry with #58's both-removal-paths precedent — no orphaned managed
block).

**CM confirmed (2026-07-30) — Issue 1 / L1 Conflict 1:** the CD's original
block body `**/jarvis-*` is **rejected**. Verified with git's matcher, that
pattern matches tracked authored files (extension icons, Change Documents
including this CR's, etc.). Tracked files would not break on day one, but
future adds would be ignored with no obvious link to this change. Normative
body is an **enumerated, anchored list** of disposable paths from the same
single path source as `REQ_CFG_PATHSINGLESOURCE` (`getIgnoreEntries()` /
`WORKSPACE_PATHS` durability). The #58 `.github/hooks/jarvis-*` entry is
**retained and relocated into the managed region**, not absorbed into a
generic recursive pattern — criterion goal (one managed place, no duplicate
hand rules outside the region) holds; the CD's absorb-into-`**/jarvis-*`
mechanism does not. Negation-based `.jarvis/*` + `!.jarvis/actors/` was
considered and rejected (silent failure on other durable subtrees).

Acceptance criteria: (1) a fresh workspace with no `.gitignore` gets one
created containing the marked block with the **enumerated** managed body;
(2) an existing `.gitignore` without the block gets it appended; (3) a
workspace with a stale/hand-edited version of the block gets only the marked
content rewritten, surrounding user content preserved; (4) setting
`jarvis.gitignore.autoManage=false` removes a previously-added block;
(5) Jarvis's own `.gitignore` is migrated to the marked block with the
enumerated body, with `.github/hooks/jarvis-*` inside the region (not a
separate hand line outside it); (6) `US_CFG_AUTOGITIGNORE` (and linked REQs/
SPECs) document automatic maintenance. GitHub Issue: #60.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impact analysis (performed before element selection)

Link-walk from the CD's named starting points, plus a repo-wide evaluation of
the proposed pattern using git's own matcher.

| Surface | Evidence | Verdict |
|---|---|---|
| `US_CFG_WORKSPACEFILES` (#58) | AC-2 "one ignore pattern … SHALL NOT have to enumerate", AC-3 "SHALL NOT require ignoring files the user owns" | parent story — unchanged, but AC-3 is what the CD's pattern breaks |
| `US_CFG_RUNTIMELAYOUT` (#59) | AC-2 "addressable as a single unit … keeps covering files the same feature adds later" | second parent — the `.jarvis/` half of the same promise |
| `REQ_CFG_FILEPREFIX` (#58) | description enumerates *authored* `jarvis-*` artefacts; AC-3 scopes the glob to `.github/hooks/` | contradicts the CD's premise (finding 2) |
| `REQ_CFG_FILEMIGRATION`, `REQ_HOOK_AUTOINST` | both-removal-paths, best-effort, workspace-scoped, container-not-removed | precedent template for the new setting |
| `SPEC_CFG_WORKSPACEFILES` | "Ignore pattern: `.jarvis/` *(as a unit)*" | contradicted by the repo's own practice (finding 3) |
| `REQ_CFG_GROUPS` | "exactly the following groups in this order" (eleven) | already violated by shipped `package.json` (finding 4) |
| `.gitignore`, `git ls-files` | 15 tracked files match `jarvis-*` | finding 1 |
| doc surface for `gitignore` | 7 matches in 4 files | small, fully enumerated above |

### Four findings that change the framing

**Finding 1 — the proposed pattern ignores fifteen tracked, authored files in
this repository, including this Change Document.** `git ls-files` matched
against `(^|/)jarvis-` returns 15 tracked paths: seven
`packages/*/resources/jarvis-128.png` (the shipped extension icons), six
`docs/changes/**/jarvis-*.md` Change Documents — one of which is this CR's own —
one actor-memory note, and `.github/instructions/jarvis-actor-*.md` beyond that
(already hidden by a different rule). Verified with git's own matcher rather
than by reading the glob:

```
$ git -c core.excludesFile=<tmp with '**/jarvis-*'> check-ignore -v --no-index ...
<tmp>:1:**/jarvis-*   docs/changes/jarvis-future-cr.md
<tmp>:1:**/jarvis-*   packages/core/resources/jarvis-256.png
```

Already-tracked files are unaffected by `.gitignore`, so nothing breaks the day
the pattern lands — which is what makes it dangerous. The *next* Change Document
named `jarvis-*` and the *next* icon are silently untracked, and the omission
surfaces in a release that ships without an icon or a review that cannot find a
CD. CD acceptance criterion (5) asks for this repository to be migrated first,
so the criterion as written arms the trap in the one workspace that dogfoods it.

**Finding 2 — the CD's account of what #58 established is inverted.** The
Summary states the convention as "any file that is transient/regenerable runtime
state … is named `jarvis-*`; anything durable/authored … never carries the
prefix". `REQ_CFG_FILEPREFIX` says no such thing in either direction. Its AC-1
binds *generation*: files Jarvis **generates into a directory it does not
exclusively own** must carry the prefix. Its own description then lists authored,
version-controlled artefacts that carry the prefix — `jarvis-core`,
`jarvis-flow`, `jarvis-128.png`, `jarvis-actor-kernel.instructions.md` — as
evidence that the convention pre-existed. The prefix marks *ownership by
Jarvis*, not *transience*, and "Jarvis" is also the product name, so any project
about Jarvis authors files under it. The converse the CD needs — prefix implies
disposable — is exactly what finding 1 disproves.

**Finding 3 — `.jarvis/` is not ignorable as a unit, and the design spec says
it is.** `SPEC_CFG_WORKSPACEFILES` tabulates `.jarvis/` with ignore pattern
"`.jarvis/` *(as a unit)*", on the reasoning that an exclusively-owned directory
needs no finer mechanism. But `.jarvis/actors/` holds actor memory — durable
team knowledge, the artefact the whole actor model exists to accumulate. This
repository tracks it (`git ls-files '.jarvis/*'` returns `.jarvis/actors` and
nothing else) and its `.gitignore` correspondingly ignores five specific
subpaths rather than the directory. Ownership settles who writes; it does not
settle what is disposable. The spec's recommendation and the repository's
practice have disagreed since #59, and this CR is the first to have to choose
between them, because the managed block has to contain one or the other.

**Finding 4 — `REQ_CFG_GROUPS` is already dead letter, and this CR would be the
third to walk past it.** It is `:status: implemented` and states the settings
groups are "exactly … Projects, Events, Sessions, Messages, Heartbeat,
Reminders, MCP, PIM, Outlook, Recording, Updates" in that order. Shipped
`packages/core/package.json` contributes `Actors`, `Messages`,
`Prompt Templates`, `Heartbeat`, `Reminders`, `Updates`, `Hooks` — a rename, two
additions, and five groups that moved to other packages at the monorepo split.
`REQ_HOOK_AUTOINST` added `Hooks` without amending it. Adding
`jarvis.gitignore.autoManage` puts this CR in the same position. Scope rule
carried from #59 — *fix what this CR's own trace makes incoherent, escalate what
is merely adjacent* — places the re-baseline outside this CR but requires the
conflict to be recorded rather than repeated silently. See L1 Decision 5.

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_CFG_WORKSPACEFILES` | Identifiable Jarvis-Owned Workspace Files | parent, unchanged | AC-2/AC-3 are the constraints the new story inherits; AC-3 is what rules out the CD's pattern |
| `US_CFG_RUNTIMELAYOUT` | Comprehensible Runtime File Layout | parent, unchanged | AC-2 is the `.jarvis/` half of the same promise |
| `US_CFG_GROUPS` | Grouped Settings Organization | not modified — escalated | AC-8 fixes eleven groups; already false (finding 4) |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| `US_CFG_AUTOGITIGNORE` | Automatically Maintained Ignore Entries | required |

### Decisions

**Decision 1 — the story is about removing the manual step, not about a
particular pattern.** The CD names both the goal (Jarvis maintains the entry)
and the mechanism (`**/jarvis-*`). Only the goal is a user story; the pattern is
a requirement-level choice, and finding 1 shows the CD's choice does not survive
contact with the repository it is meant to be demonstrated in. Writing the
mechanism into the story would have made the defect unfixable below L0.

**Decision 2 — AC-4 is added and is load-bearing.** "The maintained region SHALL
NOT cause any file authored by the user or by another tool to be ignored." This
is a restatement of `US_CFG_WORKSPACEFILES` AC-3 at the point where it now binds
something Jarvis *writes* rather than something Jarvis *recommends* — the
distinction that makes it worth restating. Without it, L1 has no ground to
reject the recursive glob, and finding 1's evidence would live only in this
document.

**Decision 3 — AC-2 (self-explaining region) and AC-3 (byte-exact preservation)
are user-visible, not implementation detail.** Jarvis is modifying a file the
user version-controls and did not ask it to touch. The block markers naming the
setting are what turn that from an unexplained diff into a reversible,
attributable one — the same argument `REQ_CFG_FILEPREFIX` makes for filenames,
applied to lines in a file.

**Decision 4 — AC-6 (no churn) is stated because the counter-example exists.**
`jarvis-port` is rewritten on every activation, which is why
`SPEC_CFG_WORKSPACEFILES` recommends ignoring it. A managed block that
reformats or reorders on activation would produce the same churn in a file that
*cannot* be ignored, in every workspace, forever.

**Decision 5 — CD acceptance criterion (5) is retained but its content
changes.** This repository is still migrated to the managed block, and that is
the right demonstration. What it is migrated *to* is settled at L1, and it is
not `**/jarvis-*`. See L1 Decision 2.

**Decision 6 — the CD's premise (finding 2) is corrected in
`REQ_CFG_FILEPREFIX`, not in a story.** The claim is about a convention, and the
convention is stated at requirement level. `REQ_CFG_FILEPREFIX` gains an
explicit statement of its one-directionality, because this CR is the proof that
the converse gets read into it.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_CFG_AUTOGITIGNORE`
      adds *maintenance* to a hierarchy that so far only specified *naming and
      layout*; it takes no acceptance criterion away from either parent.
- [x] No redundancies — `US_CFG_WORKSPACEFILES` AC-2 says one pattern must
      suffice; `US_CFG_RUNTIMELAYOUT` AC-2 says the same for `.jarvis/`; neither
      says who writes it down. That gap is this story and nothing else.
- [x] Gaps identified and addressed — AC-4 (collateral ignoring), AC-6 (churn)
      and AC-7 (non-git workspace) are absent from both parents because neither
      parent had Jarvis writing to a user-owned file.


---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from the User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_CFG_FILEPREFIX` | `US_CFG_WORKSPACEFILES` | modified | new AC-7 states the rule's one-directionality (L0 finding 2) |
| `REQ_CFG_FIXEDPATHS` | `US_CFG_FIXEDPATHS` | unchanged, referenced | supplies the `.jarvis/` paths the region covers |
| `REQ_CFG_PATHSINGLESOURCE` | `US_CFG_FIXEDPATHS` | unchanged, referenced | `REQ_CFG_IGNOREPATTERNS` AC-5/AC-6 bind the region to it |
| `REQ_CFG_MSGDIR` | `US_CFG_RUNTIMELAYOUT` | unchanged, referenced | `.jarvis/messages/` is one covered path |
| `REQ_CFG_FILEMIGRATION` | `US_CFG_WORKSPACEFILES` | unchanged, precedent | AC-6 both-removal-paths is the basis for opt-out removal |
| `REQ_HOOK_AUTOINST` | `US_HOOK_CONTROL` | unchanged, precedent | AC-2/AC-6/AC-7 are the template for the new setting |
| `REQ_CFG_GROUPS` | `US_CFG_GROUPS` | not modified — escalated | already contradicted by shipped `package.json` (L0 finding 4) |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| `REQ_CFG_IGNOREPATTERNS` | Ignore Entries Jarvis Maintains | `US_CFG_AUTOGITIGNORE`, `REQ_CFG_FIXEDPATHS`, `REQ_CFG_FILEPREFIX`, `REQ_CFG_PATHSINGLESOURCE` | required |
| `REQ_CFG_IGNOREBLOCK` | Marked Region Maintenance in .gitignore | `US_CFG_AUTOGITIGNORE`, `REQ_CFG_IGNOREPATTERNS` | required |
| `REQ_CFG_IGNOREAUTOMANAGE` | Ignore Auto-Management Setting | `US_CFG_AUTOGITIGNORE`, `REQ_CFG_IGNOREBLOCK`, `REQ_CFG_FILEMIGRATION` | required |

### Conflicts Detected

**⚠️ Conflict 1 — the CD's block content vs. `US_CFG_WORKSPACEFILES` AC-3 and
`REQ_CFG_FILEPREFIX` AC-3.** `**/jarvis-*` matches fifteen tracked authored
files here (L0 finding 1). AC-3 of `REQ_CFG_FILEPREFIX` already requires the
glob to "NOT match any file Jarvis does not generate", and it is satisfied today
precisely because it is anchored to `.github/hooks/`. Removing the anchor
removes the property.

- **Resolution:** `REQ_CFG_IGNOREPATTERNS` AC-3 forbids unanchored recursive
  globs and AC-4 restates the non-over-matching property. **This changes CD
  acceptance criteria (1), (3) and (5)'s block content and criterion (4)
  entirely** — see Decisions 1 and 2.

**⚠️ Conflict 2 — the inversion that would have replaced the glob is unsafe for
a different reason, and the near miss is worth recording.** The natural repair
is to keep one generic rule but anchor it: `.jarvis/*` followed by
`!.jarvis/actors/`. It is valid git, and against this repository it reproduces
the current effective state exactly. It fails on the legacy actor root:
`.jarvis/sessions/` also holds actor folders with `context.md`
(`SPEC_ACT_*` — "`.jarvis/sessions/`/`session.yaml` root"), so the inversion
would silently stop tracking actor memory in every workspace that has not
migrated to `.jarvis/actors/`.

- **Resolution:** enumerate the transient paths rather than negating out the
  durable ones. The two designs fail in opposite directions: enumerating
  transient paths fails by *tracking* a new runtime file — visible immediately
  as churn in `git status`, and self-correcting; negating durable ones fails by
  *hiding* user knowledge — discovered later and elsewhere. The same asymmetry
  that produced L0 finding 1 decides this. See Decision 3.

**⚠️ Conflict 3 — nothing said which extension writes the file.** The CD says
"on activation, Jarvis maintains …". Jarvis ships as several independently
installed extensions activating in the same workspace with no ordering
guarantee — the premise `US_CFG_RUNTIMELAYOUT` AC-5 was written for in #59. Two
of them rewriting one file concurrently can duplicate or truncate it, and it is
a file the user version-controls.

- **Resolution:** `REQ_CFG_IGNOREBLOCK` AC-10 assigns the maintenance to exactly
  one extension and forbids the others from writing or removing the region, even
  though they generate files it covers.

**⚠️ Conflict 4 — `REQ_CFG_GROUPS` (`:status: implemented`) fixes the settings
groups at eleven named titles in a fixed order, and the shipped manifest already
disagrees.** Adding `jarvis.gitignore.autoManage` needs a group.

- **Resolution:** not resolved in this CR. See Decision 5 — the setting is
  specified without asserting a group list, and the re-baseline is escalated.

### Decisions

**Decision 1 — the requirement level owns the block's content, and it is not
the CD's pattern.** The CD names `**/jarvis-*` in its Summary and in acceptance
criteria (1), (3) and (5). L0 finding 1 shows git itself would ignore this CR's
own Change Document under it. `REQ_CFG_IGNOREPATTERNS` therefore states the
content as a property — transient paths only, each anchored — and records the
disproof next to it, so the glob is not re-proposed from the same premise.

**Decision 2 — CD acceptance criterion (4) does not survive, and is replaced
rather than dropped.** Criterion (4) asks to consolidate `.github/hooks/jarvis-*`
into the generic pattern, "one pattern, not two overlapping ones". With no
generic pattern there is no overlap to remove: the hooks entry is retained
verbatim and *relocated* into the managed region, where Jarvis now keeps it
current. The goal behind criterion (4) — no two rules covering the same files —
holds; the mechanism it named does not.

**Decision 3 — brevity stops being a design criterion once the file is
maintained automatically, and this is stated in the requirement.** The single
generic pattern was the right shape for a hand-maintained file, where every line
is a line the user writes and later revisits. `US_CFG_WORKSPACEFILES` AC-2 says
the *user* must not have to enumerate — it says nothing about how many lines the
result has. Under automation the enumeration moves into Jarvis, which is the
authority on what it writes and already holds that list in one place
(`REQ_CFG_PATHSINGLESOURCE`, GH #59). `REQ_CFG_IGNOREPATTERNS` AC-5/AC-6 bind
the region to that source so a second list cannot appear, and AC-7 records that
line count is not the criterion — otherwise the glob returns as a
simplification.

**Decision 4 — the malformed-marker case is a refusal, not a repair
(`REQ_CFG_IGNOREBLOCK` AC-7).** If the markers are unbalanced or duplicated, the
region's boundary is unknown. Every repair strategy — take the first begin, take
the outermost pair, rewrite from the last marker — deletes user content in some
arrangement. Refusing costs the user one log line and an unmanaged file; the
alternative costs them lines they wrote.

**Decision 5 — `REQ_CFG_GROUPS` is left alone and escalated (L0 finding 4).**
The new requirements specify the setting's key, type, default and scope, and
deliberately do not assert which group it belongs to, because `REQ_CFG_GROUPS`
cannot be satisfied as written — it names five groups that moved to other
packages at the monorepo split and omits three that ship today. Amending it here
would mean re-baselining the settings surface of seven packages inside a CR
about `.gitignore`. Recorded for a separate CR; the design level states the
placement as an observation about the manifest as it actually is.

**Decision 6 — `REQ_CFG_FILEPREFIX` gains AC-7 rather than a clarifying note.**
The converse it now forbids was read out of AC-1 by this CR's own Change
Document, which is evidence that the one-directionality is not obvious from the
existing text. A note would document the reading; an acceptance criterion
governs the next one.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_CFG_IGNOREPATTERNS`
      AC-4 is a specialisation of `REQ_CFG_FILEPREFIX` AC-3, not a competing
      rule; the new AC-7 removes the only reading under which they conflicted.
- [x] No redundancies — content (`IGNOREPATTERNS`), maintenance (`IGNOREBLOCK`)
      and control (`IGNOREAUTOMANAGE`) are disjoint: the first says what the
      region contains, the second how it is written, the third whether it is
      written at all. Each acceptance criterion appears in exactly one.
- [x] All new REQs link to `US_CFG_AUTOGITIGNORE`.


---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from the Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_CFG_PATHRESOLVER` | `REQ_CFG_IGNOREPATTERNS` | modified | gains `WORKSPACE_PATHS` (path + durability) and `getIgnoreEntries()`; new link |
| `SPEC_CFG_WORKSPACEFILES` | `REQ_CFG_IGNOREPATTERNS` | modified | `.jarvis/`-as-a-unit recommendation corrected (L0 finding 3); durability column; managed-region content for this repo; new link |
| `SPEC_HOOK_CONFIG` | `REQ_CFG_FILEPREFIX` | modified (one note) | the hooks entry is now maintained, not recommended |
| `SPEC_HOOK_AUTOINST` | `REQ_HOOK_AUTOINST` | unchanged, template | setting definition, teardown, change listener, workspace scope |
| `SPEC_CFG_MANIFEST` | `REQ_CFG_GROUPS` | not modified — escalated | stale snapshot; see L1 Decision 5 |
| `SPEC_ACT_DUALPATH_SCANNER` | `REQ_ACT_DUALPATH_SCANNER` | unchanged, evidence | establishes `.jarvis/sessions/` as the legacy actor root — the basis for classifying it durable |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| `SPEC_CFG_IGNOREMANAGER` | Managed .gitignore Region | `REQ_CFG_IGNOREBLOCK`, `REQ_CFG_IGNOREAUTOMANAGE`, `REQ_CFG_IGNOREPATTERNS`, `SPEC_CFG_PATHRESOLVER`, `SPEC_CFG_WORKSPACEFILES` |

### Conflicts Detected

**⚠️ Conflict 5 — `SPEC_CFG_WORKSPACEFILES` recommended ignoring `.jarvis/` as a
unit, and this repository has never done so.** The table's reasoning was that an
exclusively-owned directory needs no finer mechanism. It conflates two questions:
ownership decides who may write, durability decides what belongs in version
control. `.jarvis/actors/` and `.jarvis/sessions/` hold `context.md` — the
knowledge the actor model exists to accumulate.

- **Resolution:** the ignore column now reads "the transient paths within it",
  and a `Version control` column classifies every row. The reasoning paragraph
  is rewritten to say what it got wrong, because the original is a plausible
  argument that would otherwise be made again.

**⚠️ Conflict 6 — `getIgnoreEntries()` had no honest way to derive entries from
the existing getters.** `REQ_CFG_IGNOREPATTERNS` AC-5 binds the region to the
resolver, but the getters return absolute paths or `undefined`, and git needs
workspace-relative patterns. Deriving one from the other by trimming the
workspace root is precisely the string manipulation `REQ_CFG_PATHSINGLESOURCE`
AC-2 forbids — the defect #59 was about.

- **Resolution:** `WORKSPACE_PATHS` declares the relative form and the
  durability, and `getIgnoreEntries()` filters it. The getters are unchanged.
  The correspondence between the two is stated as a verifiable invariant rather
  than a convention, because #59's lesson is that a convention linking two lists
  is broken by whoever adds the next entry.

**⚠️ Conflict 7 — `SPEC_CFG_MANIFEST` cannot absorb the new setting.** It is a
snapshot of `contributes.configuration` "after this CR" (`settings-cleanup`),
`:status: implemented`, and describes eleven groups including five that moved to
other packages at the monorepo split.

- **Resolution:** the setting is defined inside `SPEC_CFG_IGNOREMANAGER`,
  following the `SPEC_HOOK_AUTOINST` precedent, and the element states plainly
  that it does not assert conformance to `REQ_CFG_GROUPS` and why. Escalated.

### Decisions

**Decision 1 — `WORKSPACE_PATHS` lists the durable paths too, although they are
filtered out.** A list containing only transient paths makes a durable path
indistinguishable from a path nobody classified, and the two need opposite
treatment: an unclassified path is an omission to fix, a durable path is a
decision to keep. `.jarvis/sessions/` is the case that proves it — it looks like
runtime state from its name and is actor memory in fact.

**Decision 2 — idempotency is decided by comparing rendered bytes to the file's
bytes, not to remembered state.** The alternative — recording what Jarvis last
wrote — would be runtime state about runtime state, able to go stale on its own,
and would make a user's harmless reformatting look like a difference. The
comparison also gives `REQ_CFG_IGNOREBLOCK` AC-4 for free: if nothing differs,
no write happens, so there is no path by which activation can dirty the file.

**Decision 3 — line endings normalise on content-changing writes only.**
`detectEol` returns the majority ending, and a content-changing write (region
create, update, or removal) rejoins the entire file with that ending. When no
content change occurs, the `rendered === existing` equality check suppresses the
write, so a mixed-ending file whose region is already current is left
untouched. Normalisation thus happens only as a side effect of a write the
user's configuration requested, never as a standalone whole-file diff.

**Decision 4 — `core` is the single writer, and the cross-package cost is
stated rather than hidden.** `flow`, `syspilot`, `recorder` and `kanban`
generate paths the region covers but must not write it
(`REQ_CFG_IGNOREBLOCK` AC-10), so their paths are declared in `core`'s
`WORKSPACE_PATHS`. That is a real coupling: a package adding a generated file
must add a line in another package. The alternative is several extensions
writing one user-owned file with no activation-order guarantee — the hazard
`US_CFG_RUNTIMELAYOUT` AC-5 exists for. Naming the cost is what stops it being
"fixed" later by letting each package manage its own entries.

**Decision 5 — the runtime configuration listener is specified although
`REQ_CFG_IGNOREAUTOMANAGE` AC-5 only requires "next activation".** The listener
does more than the requirement, not less, and it mirrors `SPEC_HOOK_AUTOINST`.
Without it the CD's acceptance criterion (4) — "setting `false` removes a
previously-added block" — is true only after a window reload, and a user who
toggles the setting and sees nothing happen concludes it is broken.

**Decision 6 — `.git` presence is tested by existence, not by directory-ness.**
`.git` is a directory in a normal clone and a *file* in a worktree or submodule.
Testing for a directory would silently disable the feature in every worktree —
a failure that is invisible until someone wonders why their worktree tracks
runtime state.

**Decision 7 — the `testdata/` entries stay outside the managed region and stay
hand-maintained.** `testdata/` is a second workspace root inside this
repository; the Jarvis maintaining this file runs at the repository root and
manages only its own root (`REQ_CFG_IGNOREBLOCK` AC-2). Keeping them adjacent to
the region is also the working demonstration of AC-5: user content next to the
region survives every rewrite.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — the one that existed
      (`SPEC_CFG_WORKSPACEFILES`' `.jarvis/`-as-a-unit recommendation) is
      corrected in place, with its original reasoning recorded as wrong rather
      than deleted.
- [x] All new SPECs link to Requirements — `SPEC_CFG_IGNOREMANAGER` links all
      three new requirements plus the two design elements it depends on.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_CFG_AUTOGITIGNORE` (new) | `REQ_CFG_IGNOREPATTERNS`, `REQ_CFG_IGNOREBLOCK`, `REQ_CFG_IGNOREAUTOMANAGE` | `SPEC_CFG_IGNOREMANAGER`, `SPEC_CFG_PATHRESOLVER`, `SPEC_CFG_WORKSPACEFILES` | ✅ |
| `US_CFG_WORKSPACEFILES` (parent) | `REQ_CFG_FILEPREFIX` (AC-7 new), `REQ_CFG_FILEMIGRATION` | `SPEC_CFG_WORKSPACEFILES`, `SPEC_HOOK_CONFIG` | ✅ |
| `US_CFG_RUNTIMELAYOUT` (parent) | `REQ_CFG_MSGDIR` | `SPEC_CFG_WORKSPACEFILES` | ✅ |
| `US_CFG_FIXEDPATHS` | `REQ_CFG_FIXEDPATHS`, `REQ_CFG_PATHSINGLESOURCE` | `SPEC_CFG_PATHRESOLVER` | ✅ |
| `US_HOOK_CONTROL` | `REQ_HOOK_AUTOINST` | `SPEC_HOOK_AUTOINST` | ✅ unchanged — precedent only |

**Every acceptance criterion of the new story is discharged at both levels.**

| `US_CFG_AUTOGITIGNORE` | Requirement | Design |
|---|---|---|
| AC-1 no user action | `REQ_CFG_IGNOREBLOCK` AC-3, `REQ_CFG_IGNOREPATTERNS` AC-1 | `SPEC_CFG_IGNOREMANAGER` AC-2/AC-3/AC-4 |
| AC-2 self-explaining region | `REQ_CFG_IGNOREBLOCK` AC-1 | Markers section |
| AC-3 byte-exact preservation | `REQ_CFG_IGNOREBLOCK` AC-5, AC-6 | `withRegion`/`withoutRegion`, `detectEol` |
| AC-4 no collateral ignoring | `REQ_CFG_IGNOREPATTERNS` AC-2/AC-3/AC-4 | `WORKSPACE_PATHS` durability, `SPEC_CFG_IGNOREMANAGER` AC-11 |
| AC-5 opt-out removes | `REQ_CFG_IGNOREAUTOMANAGE` AC-3 | `withoutRegion`, change listener, AC-7 |
| AC-6 no churn | `REQ_CFG_IGNOREBLOCK` AC-4, AC-11 | byte comparison, AC-5 |
| AC-7 non-git workspace | `REQ_CFG_IGNOREBLOCK` AC-8 | `workspaceRootIfGitRepo`, AC-9 |

### Artefakt-Removal-Check

**Not applicable — this CR removes no artefact.** Recorded rather than skipped,
because the CD as written appeared to remove one: acceptance criterion (4) asked
to consolidate `.github/hooks/jarvis-*` away into a generic pattern. Under L1
Decision 2 that entry is **retained verbatim and relocated** into the managed
region, so no filename, field, configuration key or element ID ceases to exist.
No element is deprecated by this CR.

Confirmed by grep over `docs/**/*.rst` for `gitignore|autoManage`: 62 matches in
4 files, every one either new text from this CR, the two historic *Context*
paragraphs in `us_cfg.rst` (which describe the situation before #58/#59 and
remain accurate as history), or `REQ_CFG_FILEPREFIX` AC-6, which still holds —
the entry it mandates is now written by Jarvis rather than by hand. Checked line
by line, not by match count.

### Issues Found

- [x] **Issue 1 — the CD's block content is unsafe and is specified differently
      (L0 finding 1, L1 Conflict 1).** `**/jarvis-*` matches 15 tracked authored
      files here, including this CR's own Change Document; verified with git's
      own matcher. **CM confirmed 2026-07-30** — Summary updated: enumerated
      anchored list + hooks entry relocated into the region; `**/jarvis-*`
      rejected.
- [x] **Issue 2 — the CD's account of #58 is inverted (L0 finding 2).**
      `REQ_CFG_FILEPREFIX` binds the act of generating; the converse does not
      hold. Fixed by new AC-7 in that requirement.
- [x] **Issue 3 — `SPEC_CFG_WORKSPACEFILES` recommended ignoring `.jarvis/`
      wholesale (L0 finding 3, L2 Conflict 5).** Would withhold actor memory
      from version control. Corrected, with a durability classification.
- [x] **Issue 4 — no extension owned the write (L1 Conflict 3).** Assigned to
      `core` with the cross-package cost stated.
- [ ] **Issue 5 — `REQ_CFG_GROUPS` is dead letter (L0 finding 4, L1 Conflict 4,
      L2 Conflict 7).** Open, separate CR.
- [ ] **Issue 6 — `SPEC_CFG_MANIFEST` is a stale snapshot.** Open, same CR as
      Issue 5.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (7 conflicts; Conflict 1 / Issue 1 confirmed by
      CM 2026-07-30 — Summary ACs match enumerated managed body)
- [x] Traceability verified, including every story AC to both levels
- [x] Sphinx `-W --keep-going` clean at every commit
- [x] All new elements set to `:status: approved`: `US_CFG_AUTOGITIGNORE`,
      `REQ_CFG_IGNOREPATTERNS`, `REQ_CFG_IGNOREBLOCK`,
      `REQ_CFG_IGNOREAUTOMANAGE`, `SPEC_CFG_IGNOREMANAGER`
- [x] Ready for implementation

#### Implementation scope handed to the Developer

Specification only — no source was modified by the System Designer.

1. `packages/core/src/engine/core/configPaths.ts` — add `WORKSPACE_PATHS` with
   the durability classification and `getIgnoreEntries()`.
2. `packages/core/src/engine/core/gitignoreManager.ts` — new module per
   `SPEC_CFG_IGNOREMANAGER`.
3. `packages/core/src/extension.ts` — call `applyGitignore()` during activation
   and register the `onDidChangeConfiguration` listener.
4. `packages/core/package.json` — contribute `jarvis.gitignore.autoManage`
   (boolean, default `true`, scope `resource`) in a `Gitignore` group.
5. `.gitignore` — replace the hand-maintained root Jarvis entries with the
   managed region as shown in `SPEC_CFG_WORKSPACEFILES`; leave the `testdata/`
   entries outside it.
6. Tests — the getter/`WORKSPACE_PATHS` coverage invariant
   (`SPEC_CFG_PATHRESOLVER` design notes) and the six region cases of
   `SPEC_CFG_IGNOREMANAGER` AC-2 to AC-7.

**Not in scope, reported:** the working tree carries untracked residue from
earlier CRs — `.github/hooks/`, `.jarvis/messages.json`,
`.jarvis/message-log.json`, `.jarvis/autodelivery.json`. The last three are
exactly the superseded paths `SPEC_CFG_STATEMIGRATION` (#59) removes after a
union write; their presence suggests #59's migration has not run in this
workspace yet.


---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-30

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Code | SPEC_CFG_IGNOREMANAGER | The CD itself calls `applyGitignore()` "the only place in Jarvis that writes a file the user authored and version-controls," yet no test calls it. `gitignore-manager.test.ts` imports and directly tests only `locateRegion`/`detectEol`; the six "region management (file-level)" tests (AC-2, AC-3, AC-4, AC-6, AC-7) construct their own inline copy of the region-replace/append/remove logic in the test body rather than importing `applyGitignore` (which is exported) or `withRegion`/`withoutRegion` — so a defect in the real function (the `managed`/opt-out branch, the `existing === undefined && !managed` early return, the `vscode.workspace.getConfiguration` wiring, or the byte-comparison idempotency check itself) would not be caught by any of these tests. | high |
| 2 | Design/Code | SPEC_CFG_IGNOREMANAGER | Decision 3 states "mixed line endings are left mixed," but `applyGitignore` computes one dominant `eol` via `detectEol` and joins the *entire* file with it (`next.join(eol)`) whenever a real write is needed — not just the marked region. In a genuinely mixed-EOL file, a write triggered by real region content changes would normalize every line's terminator to the dominant style as a side effect, producing a larger diff than "byte-exact preservation of surrounding content" (AC-3) implies. This holds only when a real content change coincides with a genuinely mixed-EOL file — the common case (uniform EOL, or no content change) is unaffected — but the scenario is untested and the Decision 3 heading somewhat overstates what the implementation guarantees. | low |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 7 commits, exact match to CM's message, correct order.

Read the CD in full: this System Designer's own self-correction is the most consequential I have reviewed across #58/#59/#60 — the CD's proposed `**/jarvis-*` pattern was proven, with git's own matcher, to silently untrack 15 already-committed authored files including this CR's own Change Document, and was replaced with an enumerated anchored list before Dev ever saw it. A second near-miss (`.jarvis/*` + `!.jarvis/actors/`) was independently found and rejected for missing the legacy `.jarvis/sessions/` actor root. Both are exactly the class of defect that ships invisibly (nothing breaks on day one) and is caught here only by testing the proposed pattern against the real repository rather than reading it.

All code independently verified against spec: `configPaths.ts`'s `WORKSPACE_PATHS` (7 transient + 2 durable, matching `.gitignore`'s managed region order exactly) and `getIgnoreEntries()`; `gitignoreManager.ts`'s `locateRegion`/`detectEol`/`withRegion`/`withoutRegion`/`workspaceRootIfGitRepo`/`applyGitignore` — malformed-refuse, `.git`-by-existence-not-directory (Decision 6), byte-comparison idempotency, all match `SPEC_CFG_IGNOREMANAGER`'s body verbatim (the spec embeds the actual code). `extension.ts` calls `applyGitignore()` at activation and registers the `onDidChangeConfiguration` listener scoped to `jarvis.gitignore.autoManage`. `package.json` contributes the setting. Root `.gitignore` migrated correctly: managed region present, enumerated entries, `.github/hooks/jarvis-*` retained inside the region, no `**/jarvis-*` anywhere, `testdata/` entries correctly left outside.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 372/372 passed, 37/37 files, matching CM's disclosed count.

UAT: no scenario family exists for this area either (consistent with #58's precedent), not raised as a new gap. Issues 5/6 (`REQ_CFG_GROUPS`/`SPEC_CFG_MANIFEST` stale) are disclosed and correctly scoped out — not re-raised.

**Overall: CLEAR with one fix-now recommendation.** Finding 1 is the same class of gap flagged and fixed in both #58 R1 and #59 R1 — the function that actually mutates a user's real, version-controlled file has no test exercising it directly, only tests of duplicated logic or of its lower-level helpers. Given the CD's own framing of `applyGitignore` as uniquely high-stakes, recommend the same fix-now disposition. Finding 2 is informational/low — worth a test or a prose correction, not a functional block.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | Fix now | `applyGitignore` is the only function in Jarvis that writes a file the user authored and version-controls — untested, its config-wiring/opt-out/idempotency-comparison paths could silently corrupt a real `.gitignore`. Same disposition as #58 R1 and #59 R1, arguably higher stakes since this one writes to the user's own tracked file directly rather than Jarvis-owned state. |
| 2 | 2 | Fix now (bundled) | Cheap correction — either narrow Decision 3's claim to match actual whole-file EOL normalization, or add a test proving the narrower claim; bundle into the same round since Finding 1 already reopens this file. |

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-30

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | — | — | None — both Round 1 findings resolved. | — |

**Independent verification (git log, code, specs, build):**

Git log re-checked — 11 commits total (the original 7 + `e720a71` PM decisions + `091fca3` QM R1 + `bb51986` Dev fix + `997919b` Dev doc-narrowing follow-up), exact match to CM's disclosure, correct order, zero undisclosed commits.

**Finding 1 resolution verified.** `gitignoreManager.ts` now exports `applyGitignoreAt(root, managed)`, extracted from `applyGitignore()` — pure filesystem logic (no `vscode.workspace.getConfiguration` call inside it), directly importable and callable against real temp directories. `applyGitignore()` itself is now a thin wrapper: resolve workspace root/git check, read the config, delegate to `applyGitignoreAt`, contain errors. `gitignore-manager.test.ts`'s `applyGitignoreAt` describe block was read in full: every region test (AC-2 create, AC-3 append preserving user content, AC-4 rewrite-stale preserving surrounding content, AC-5 idempotency via real `mtimeMs` comparison across two calls with a spin-wait to guarantee a distinguishable timestamp on any unwanted second write, AC-6 malformed-refuse via exact byte equality of the untouched file, AC-7 opt-out removal, an added opt-out-no-region no-op case, AC-9 opt-out-with-no-file-does-not-create) now calls the real exported `applyGitignoreAt` against genuine temp-directory files created with `fs.writeFileSync`/read back with `fs.readFileSync` — no inline-simulated logic remains anywhere in the file. This closes the gap exactly: a defect in the real production function's create/append/rewrite/idempotency/malformed/opt-out branches would now be caught.

**Finding 2 resolution verified.** Two new EOL tests were added: "CRLF file gets CRLF region" (majority-EOL detection carried into a real write) and "content-changing write normalizes to majority EOL" (a genuinely mixed-ending file, `line-a\r\nline-b\n`, is confirmed via `applyGitignoreAt` + read-back to lose its CRLF once a real content-changing write occurs) — the exact scenario Round 1 flagged as untested. `SPEC_CFG_IGNOREMANAGER`'s line-endings paragraph (`docs/design/spec_cfg.rst`) and the CD's own Decision 3 were both rewritten to state the narrowed, accurate claim: normalization to the majority ending happens on any content-changing write (create/update/removal), and a mixed-ending file is left untouched only when the idempotency equality check suppresses the write entirely. Read both in full — text now matches the implementation exactly, no overclaim remains.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 377/377 passed, 37/37 files, matching CM's disclosed count exactly (+5 assertions over Round 1's 372, consistent with the new EOL/idempotency-by-mtime/opt-out-no-region tests added).

**Overall: CLEAR.** Both Round 1 findings are resolved with real production-function coverage rather than a narrower fix; the EOL claim correction is documentation-accurate now rather than merely tested-around. This CR is ready to close from QM's side.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | | | |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
