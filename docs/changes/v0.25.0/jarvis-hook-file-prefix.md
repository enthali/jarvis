# Change Document: jarvis-hook-file-prefix

**Status**: merged
**Branch**: feature/jarvis-hook-file-prefix
**Created**: 2026-07-29
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

`.github/hooks/bridge.mjs` and `.github/hooks/port` are Jarvis-generated
runtime/self-install artifacts living in a GitHub-Copilot-pinned directory
(`.github/hooks/` — confirmed not relocatable). They currently carry no
naming convention that lets a consuming project safely `.gitignore` them,
since `bridge.mjs`/`port` look like they could belong to any tool. This
change renames them to `jarvis-bridge.mjs` and `jarvis-port` (hyphen prefix,
matching the existing repo-wide convention — package names, resource files,
instruction docs all already use `jarvis-`), updates the self-install logic
in `hookConfig.ts`/`hookIntake.ts` accordingly, and documents the resulting
`.gitignore` pattern (`.github/hooks/jarvis-*`) in a new "Workspace File
Layout & VCS Visibility" section of `docs/design/spec_cfg.rst`.

Root cause: no naming convention was ever established for Jarvis-owned files
sharing a platform-pinned directory with other tools' contributions.

Fix direction: rename the two generated files and every reference to them;
add the spec_cfg.rst documentation section (also used by the related
`.jarvis/` reorg, #59).

Acceptance criteria:
- `.github/hooks/bridge.mjs` → `.github/hooks/jarvis-bridge.mjs`, `port` →
  `jarvis-port`, self-install writes the new names, no leftover references
  to the old names in source.
- Existing installs with the old filenames still work after upgrade (self-
  install must not orphan a running hook setup — old files cleaned up or
  harmlessly ignored).
- `docs/design/spec_cfg.rst` gains the new documentation section.
- No functional change to hook behavior — the rename includes migration logic
  (clean up old filenames on upgrade, preserve working installs), but no
  hook protocol, handshake, or observable session behavior changes.

GitHub Issue: #58

---

## Level 0: User Stories

**Status**: ✅ completed

### Impact analysis (performed before element selection)

Project-wide grep for `bridge.mjs`, `hooks/port`, `BRIDGE_FILE`, `PORT_FILE`,
`portFile`, `bridgePath` — 94 matches in 16 files:

| Class | Where | Handling |
|---|---|---|
| Active source | `packages/core/src/engine/hooks/hookConfig.ts`, `.../hookIntake.ts` | L2 scope |
| Active spec | `docs/design/spec_hook.rst` (25 matches — `SPEC_HOOK_CONFIG`, `SPEC_HOOK_BRIDGE`, `SPEC_HOOK_INTAKE`) | L2 scope |
| Active repo config | `.gitignore` lines 51–52 | L2 scope — see finding 2 |
| Historic Change Docs | `docs/changes/v0.14.0/*`, `docs/changes/v0.24.1/*` | Acceptable historic stranding — not rewritten |
| Actor memory / research notes | `.jarvis/actors/Research/FI-*.md` | Not Jarvis-owned by this actor; out of scope |

**Correction to the CM's file paths:** the two source files are
`packages/core/src/engine/hooks/hookConfig.ts` and
`packages/core/src/engine/hooks/hookIntake.ts` — not `packages/core/src/hookConfig.ts`
and `packages/core/src/engine/sessions/hookIntake.ts` as listed in the CR
message. No functional consequence, recorded so L2 targets the right files.

### Two findings that change the framing

**Finding 1 — the convention already exists; it was applied to one of three
files.** The CD's root cause reads "no naming convention was ever established
for Jarvis-owned files sharing a platform-pinned directory". Verified against
the repository, that is not accurate. `.github/hooks/` already contains
**`jarvis-hooks.json`** — correctly prefixed. The repo-wide `jarvis-` convention
is likewise real and consistently applied elsewhere (`jarvis-core`,
`jarvis-flow`, `jarvis-pim`, `jarvis-recorder`, `jarvis-mcp`, `jarvis-suite`,
`jarvis-128.png`, `jarvis-actor-kernel.instructions.md`, …).

So the defect is narrower and more precise: **the convention was established
and then not carried to the two files generated later in the same directory.**
This matters beyond wording — a rule that is followed in two thirds of one
directory is not missing, it is unenforced, which is a different problem with a
different remedy. The remedy is to state it normatively at L1/L2 so it binds
the next generated file, rather than to invent a convention.

**Finding 2 — the workaround is already in the repository, and it is
lossy.** `.gitignore` lines 51–52 currently exclude `.github/hooks/` and
`testdata/.github/hooks/` **wholesale**. That is the blunt instrument this CR
replaces, and it demonstrates the user cost concretely: the only pattern that
reliably covers `bridge.mjs` and `port` also hides `jarvis-hooks.json` and any
hook file the project itself might want to version, in a directory GitHub
Copilot pins and shares. This is the strongest available evidence for the user
need, and it is evidence from this repository rather than a hypothetical — this
repository is itself a consuming project (it dogfoods Jarvis).

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_HOOK_OBSERVE` | Observe Agent Lifecycle Hooks (MVP) | **unchanged** | Names no files in its ACs — speaks only of "a hook proxy". The rename is invisible at this level. Verified, not assumed |
| `US_CFG_FIXEDPATHS` | Fixed Runtime File Paths | **unchanged** | Adjacent but orthogonal — see MECE below |
| `US_DEV_CONVENTIONS` | Developer Conventions Documentation | **unchanged** | See Decision 3 |

No existing User Story required modification. This is unusual for a CR and was
double-checked: the rename is a property of files the *product writes into a
user's workspace*, and no existing story describes that surface at all. That
absence is the gap this CR fills.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| `US_CFG_WORKSPACEFILES` | Identifiable Jarvis-Owned Workspace Files | required |

**As a** Jarvis user whose workspace is a version-controlled repository,
**I want** every file Jarvis generates into my workspace to be recognisable as
Jarvis-owned and selectively ignorable, **so that** I can keep Jarvis's runtime
artifacts out of my repository without also losing control over my own files in
the same directories, and without having to investigate each unfamiliar file
that appears.

Six ACs: AC-1 attributable by name alone; AC-2 one forward-compatible ignore
pattern; AC-3 selective ignoring must not require directory-wide exclusion;
AC-4 no orphaned files across upgrade; AC-5 existing installs keep working
across upgrade; AC-6 convention and pattern documented.

### Decisions

**Decision 1 — one new story, not two.** The migration behaviour (CD acceptance
criterion 2) is carried as AC-4/AC-5 of the same story rather than a separate
"safe upgrade" story. Rationale: an upgrade that renames the files but leaves
`bridge.mjs` and `port` behind produces *exactly the symptom this CR exists to
remove* — unattributable Jarvis files littering a shared directory. It is the
same user goal reached from the other direction, not an independent one.
Splitting it would create two stories with overlapping ACs, i.e. a MECE
violation introduced at birth.

**Decision 2 — the story is written to cover a shared directory *or* a
Jarvis-owned one.** AC-1/AC-2 say "a directory it does not exclusively own",
and AC-3 forbids directory-wide exclusion *as the only remedy* rather than
forbidding it outright. This is deliberate: `.github/hooks/` is shared and
needs a per-file prefix, whereas `.jarvis/` is exclusively Jarvis's and is
already selectively ignorable as a unit. The CD states the new `spec_cfg.rst`
section is shared with #59 (`.jarvis/` reorg), so the story must motivate both
without forcing a redundant prefix on files inside `.jarvis/`. Stating the
principle as *attributable and selectively ignorable, by whichever mechanism
fits the directory* achieves that.

**Decision 3 — the convention belongs in a design spec, not in
`docs/namingconventions.rst`.** This was checked because `US_DEV_CONVENTIONS`
claims `namingconventions.rst` is the single source of truth for project
conventions, and it does contain a "File Naming" section. Read in full, that
section is scoped exclusively to artifacts *this project authors*
(`us_<theme>.rst`, `req_<theme>.rst`, `spec_<theme>.rst`, Change Documents) —
plus spec-ID and Git-workflow rules. The `jarvis-` runtime prefix is a
different category: it is **product behaviour**, observable in a third-party
workspace, and it must be testable. A convention documented only in
`namingconventions.rst` would carry no US/REQ/SPEC traceability and no
acceptance criteria. Hence `spec_cfg.rst` as the CD proposes, and
`US_DEV_CONVENTIONS` is left unmodified.

**Decision 4 — theme CFG, persona "Jarvis User".** CFG is the established home
for workspace-file-layout concerns (`US_CFG_FIXEDPATHS` sits there), and the CD
independently chose `spec_cfg.rst` — consistent. Persona: the affected party is
a Jarvis user whose workspace happens to be under version control. No new
persona is introduced in `namingconventions.rst`; the qualifier is carried in
the story text instead, which seemed proportionate for a single story.

### Horizontal Check (MECE)

- [x] **No contradictions with existing User Stories.**
      Checked `US_CFG_FIXEDPATHS` most closely, as it is the nearest neighbour.
      It governs *where* runtime files live (fixed paths under `.jarvis/`, not
      configurable). `US_CFG_WORKSPACEFILES` governs *how they are named and
      whether they can be excluded from version control*. Orthogonal axes —
      location vs. identity/visibility. Neither constrains the other, and no AC
      of either is falsified by the other. The two are linked so the boundary
      is visible to the next reader.
- [x] **No redundancies.** No existing story mentions naming, `.gitignore`,
      VCS visibility, or upgrade file-migration. Confirmed by grep across
      `docs/userstories/`.
- [x] **Gaps identified and addressed.** The gap is the absence of any story
      describing Jarvis's *footprint in the user's repository* as a
      user-visible concern. `US_CFG_WORKSPACEFILES` fills it and is
      deliberately general enough to serve #59.

### Open question for CM before L1

The CD scopes this as "rename only — no functional behavior change". AC-4/AC-5
(cleanup of old files + no broken install) are **not** a pure rename: they are
new migration behaviour that did not previously exist. I have kept them,
because without them the rename produces litter and the CR defeats its own
purpose — but the CD's "rename only" framing should be corrected so QM does not
read the migration logic as scope creep.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from the User Stories above, plus a grep of `docs/requirements/`
for `bridge.mjs`, `hooks/port`, `.github/hooks` — **4 matches, all in one
requirement**. The rename touches the requirement layer in exactly one place.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_HOOK_AUTOINST` | `US_HOOK_CONTROL` | **modified** | AC-3 enumerated the managed files by name, including `bridge.mjs` and `port`. Extended to the new names **and** the superseded ones — see Decision 2. `:links:` extended with `REQ_CFG_FILEMIGRATION` |
| `REQ_HOOK_INTAKE` | `US_HOOK_OBSERVE` | **unchanged** | Verified, not assumed: it names no file. The port file appears only at design level (`SPEC_HOOK_INTAKE`), which is correct — *that* a port is published is the requirement, *where* is design |
| `REQ_CFG_FIXEDPATHS` | `US_CFG_FIXEDPATHS` | **unchanged** | Governs `.jarvis/` paths. Orthogonal — see MECE |
| `REQ_CFG_RENAMES` | `US_CFG_GROUPS` | **unchanged** | Precedent for a rename-with-migration, but scoped to *settings keys*. Not extended — see Decision 4 |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| `REQ_CFG_FILEPREFIX` | Jarvis File Prefix in Shared Directories | `US_CFG_WORKSPACEFILES` | required |
| `REQ_CFG_FILEMIGRATION` | Superseded Generated File Cleanup | `US_CFG_WORKSPACEFILES`; `REQ_CFG_FILEPREFIX` | required |

`REQ_CFG_FILEPREFIX` — 6 ACs: the standing prefix rule (AC-1); the three
concrete filenames (AC-2); the pattern `.github/hooks/jarvis-*` matching all
and only Jarvis's files (AC-3); no active reference to the superseded names
(AC-4); documented in the design spec (AC-5); this repository's own
`.gitignore` narrowed from wholesale exclusion (AC-6).

`REQ_CFG_FILEMIGRATION` — 6 ACs: removal on activation (AC-1); confined to
Jarvis's own superseded names (AC-2); the install stays functional throughout
(AC-3); best-effort, non-fatal (AC-4); idempotent (AC-5); **both** removal paths
covered (AC-6).

### Conflicts Detected

- ⚠️ `REQ_HOOK_AUTOINST` AC-3 vs `REQ_CFG_FILEMIGRATION` AC-6: AC-3 enumerated
  the removable files by name, so a workspace that upgraded and then set
  `jarvis.hooks.autoInstall: false` would have kept `bridge.mjs` and `port` —
  after explicitly asking Jarvis to leave nothing behind. The two statements
  would have contradicted each other the moment the rename landed.
  - **Resolution:** `REQ_HOOK_AUTOINST` AC-3 extended to cover both the current
    and the superseded names, with the rationale stated inline (both sets are
    Jarvis-managed, so removing both is what AC-7 already implies). This is a
    **MECE correction, not scope creep** — the contradiction is created by this
    CR and must be resolved by it.

### Decisions

**Decision 1 — two requirements, not one, and the AC split proves it.** The six
ACs of `US_CFG_WORKSPACEFILES` partition 4/2 with no AC straddling the boundary:
AC-1/2/3/6 (attribution, ignorability, documentation) are properties of *how
Jarvis names what it writes*; AC-4/5 (no orphans, install keeps working) are
properties of *what Jarvis does about what it previously wrote*. Different
trigger, different verification, different lifetime — the naming rule is
permanent, the migration rule is debt that will one day be retired. A single
requirement would have mixed a standing constraint with a transitional one and
made the retirement impossible to scope later.

**Decision 2 — the migration requirement binds *every* removal path, not the
new one.** `REQ_CFG_FILEMIGRATION` AC-6 is deliberately phrased as a property of
all code paths that remove Jarvis-managed hook files. There are two of them
(activation cleanup, `autoInstall: false` teardown) and covering only the
obvious one reproduces the defect on the other. This is the same failure shape
as the v0.5.8 / CR #54 regression: a fix recorded per-path rather than at the
choke point survives until the next person touches the other path. The general
rule lives once in `REQ_CFG_FILEMIGRATION`; the concrete file list lives once in
`REQ_HOOK_AUTOINST` AC-3 — no restatement, so no MECE violation.

**Decision 3 — the prefix rule is stated prospectively, per CM's instruction.**
Following L0 finding 1 (the convention is *unenforced*, not missing),
`REQ_CFG_FILEPREFIX` AC-1 constrains the **act of generating a file**, and AC-2
merely records today's instances. A requirement that only enumerated the three
current filenames would be satisfied by this CR and re-broken by the next file
added to `.github/hooks/` — which is precisely the history that produced GH #58.

**Decision 4 — `REQ_CFG_RENAMES` is left alone.** It was checked as the nearest
precedent (rename with a documented migration path) but it is scoped to VS Code
*settings keys*, and its migration mechanism is a release note rather than
runtime cleanup — a user must act, whereas here nothing must be asked of the
user. Folding generated-file renames into it would merge two mechanisms that
only look alike.

**Decision 5 — `.jarvis/` is explicitly excluded from the prefix rule.**
`REQ_CFG_FILEPREFIX` carries an applicability clause: the prefix applies to
directories Jarvis does *not* exclusively own. `.jarvis/` is Jarvis's own and is
already selectively ignorable as a unit, so a prefix inside it would be pure
noise. Stated in the requirement rather than left implicit, because GH #59 will
work in that directory and should not inherit a rule that was never meant for
it.

**Decision 6 — AC-6 of `REQ_CFG_FILEPREFIX` (this repo's `.gitignore`) is a
requirement, not a chore.** CM confirmed the fix is in scope. It is carried as
an AC because Jarvis dogfoods itself: this repository is a consuming project,
its wholesale `.github/hooks/` exclusion is the concrete user cost documented in
L0 finding 2, and narrowing it is the working demonstration that AC-3 actually
holds. A pattern nobody has applied is an untested claim.

### Horizontal Check (MECE)

- [x] **No contradictions with existing Requirements.** One was found and
      resolved rather than inherited — `REQ_HOOK_AUTOINST` AC-3, see Conflicts.
      `REQ_CFG_FIXEDPATHS` was checked closely as the nearest neighbour: it
      fixes *where* runtime files live under `.jarvis/`; the new requirements
      govern *how files are named and whether they can be excluded from VCS* in
      directories Jarvis shares. Neither constrains the other, and
      `REQ_CFG_FILEPREFIX`'s applicability clause makes the boundary explicit
      instead of leaving it to be rediscovered.
- [x] **No redundancies.** Grep across `docs/requirements/` for naming,
      `.gitignore`, VCS visibility, and file migration returned nothing but the
      four `REQ_HOOK_AUTOINST` lines. `REQ_CFG_RENAMES` overlaps in theme only,
      not in subject (settings keys vs. generated files) — see Decision 4. The
      two new requirements do not restate each other: the migration rule points
      at `REQ_HOOK_AUTOINST` AC-3 for the concrete list instead of duplicating
      it.
- [x] **All new REQs link to User Stories.** Both link `US_CFG_WORKSPACEFILES`;
      `REQ_CFG_FILEMIGRATION` additionally links `REQ_CFG_FILEPREFIX`, and
      `REQ_HOOK_AUTOINST` gained a link to `REQ_CFG_FILEMIGRATION` so the
      dependency introduced by the conflict resolution is visible.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from the Requirements above, plus the 25-match grep in
`docs/design/spec_hook.rst` recorded at L0.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_HOOK_CONFIG` | `REQ_HOOK_INTAKE`, `REQ_CFG_FILEPREFIX` | **modified** | All 8 command strings in the `jarvis-hooks.json` block; the bridge-write and port-publish steps; new step 5 (cleanup); design notes now state *why* the prefix exists here and point at `SPEC_CFG_WORKSPACEFILES`; new AC-6. `:links:` extended |
| `SPEC_HOOK_BRIDGE` | `REQ_HOOK_INTAKE`, `REQ_CFG_FILEPREFIX` | **modified** | Script filename, the header comment inside the code block, the `readFileSync(join(here, 'jarvis-port'))` line, AC-2. `:links:` extended |
| `SPEC_HOOK_INTAKE` | `REQ_HOOK_INTAKE` | **modified** | Port-publication path in the listener description, the GH #51 ordering caveat, AC-1. Filename only — the intake contract is untouched |
| `SPEC_HOOK_AUTOINST` | `REQ_HOOK_AUTOINST` | **modified** | Teardown steps renamed and extended with the superseded names (new step 4); AC-3; step-range reference `1–4` → `1–5` following the new self-install step. `:links:` extended with `SPEC_HOOK_MIGRATE` |
| `SPEC_HOOK_LOG`, `SPEC_HOOK_ROUTE`, `SPEC_HOOK_ACTIVITY` | — | **unchanged** | Verified by grep: no filename references. Consistent with the CD's "no protocol or observable behaviour change" |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| `SPEC_CFG_WORKSPACEFILES` | Jarvis-Owned Workspace Files and Ignore Patterns | `REQ_CFG_FILEPREFIX`, `REQ_CFG_FIXEDPATHS`, `SPEC_HOOK_CONFIG` |
| `SPEC_HOOK_MIGRATE` | Superseded Hook File Cleanup | `REQ_CFG_FILEMIGRATION`, `SPEC_HOOK_CONFIG`, `SPEC_HOOK_AUTOINST`, `SPEC_CFG_WORKSPACEFILES` |

`SPEC_CFG_WORKSPACEFILES` is the new "Workspace File Layout & VCS Visibility"
section the CD asks for: the two-category table (`.jarvis/` owned as a unit vs.
`.github/hooks/` shared and prefixed), the three generated hook files with their
lifecycles, the recommended `.gitignore` entry, and the explicit argument
against wholesale directory exclusion.

`SPEC_HOOK_MIGRATE` carries the cleanup behaviour: the closed list of superseded
names, the two removal paths, and five required properties (explicit list never
a pattern, no window of inconsistency, failure non-fatal, idempotent and quiet,
no observable session behaviour change).

### Conflicts Detected

- ⚠️ `SPEC_HOOK_AUTOINST` teardown vs. `SPEC_HOOK_CONFIG` self-install: both
  remove files, and only one of them was in the CD's stated scope. Same conflict
  as at L1, surfacing again one level down because the removal logic is written
  out twice.
  - **Resolution:** extracted into `SPEC_HOOK_MIGRATE` and referenced from both
    sites, so the list of superseded names exists once. Whoever retires the
    migration later deletes one spec element rather than hunting for two copies
    that may have drifted.

- ⚠️ `SPEC_HOOK_CONFIG` design note "`port` is a generated runtime artifact and
  SHOULD be git-ignored" vs. the new `SPEC_CFG_WORKSPACEFILES`: the hook spec
  gave `.gitignore` advice for one file while the new section owns that topic
  for all of them.
  - **Resolution:** the hook-spec note now states the pattern's *cause* (shared
    directory → prefix → single pattern) and delegates the pattern itself to
    `SPEC_CFG_WORKSPACEFILES`. One authority, no drift.

### Decisions

**Decision 1 — the migration behaviour gets its own spec element.** It could
have been three more bullets in `SPEC_HOOK_CONFIG`. It is separate because it
has a different lifetime: `SPEC_HOOK_CONFIG` describes what Jarvis does forever,
`SPEC_HOOK_MIGRATE` describes what it does *until pre-GH-#58 installs are no
longer supported*. Migration debt that is inlined into permanent specs is never
found again when it could be removed. The spec says so explicitly, and names the
retirement as a PM decision rather than silently assuming one.

**Decision 2 — cleanup deletes an explicit list, never a pattern.** Stated as a
required property because the tempting implementation is the wrong one: an
engine that deletes `.github/hooks/*` minus its own current files, or anything
matching a heuristic, would destroy other tools' contributions in a directory
GitHub Copilot pins and shares. The prefix exists so Jarvis *stops guessing*
which files there are its own; a heuristic deletion would reintroduce the guess
at the one point where being wrong is unrecoverable.

**Decision 3 — "quiet when idempotent" is specified, not left to taste.** Every
activation for the rest of the product's life would otherwise log a migration
that completed once, years ago. Log noise that scales with time is a defect;
naming it here costs one sentence.

**Decision 4 — the `.gitignore` change is specified, not performed.** The
requirement (`REQ_CFG_FILEPREFIX` AC-6) and the recommended pattern
(`SPEC_CFG_WORKSPACEFILES`) are written down; the edit to `.gitignore` lines
51–52 is an implementation step for the Developer. The System Designer does not
implement.

**Decision 5 — `SPEC_CFG_WORKSPACEFILES` explains the mechanism choice, not
just the outcome.** The table would be shorter without the "Ownership" column,
but the column is what makes the section reusable for GH #59: it says *why*
`.jarvis/` needs no prefix, so the next CR extends the table instead of arguing
the question again or applying the prefix where it adds nothing.

**Decision 6 — the code block in `SPEC_HOOK_BRIDGE` was updated, not
abandoned.** The spec embeds the bridge source verbatim. Leaving `join(here,
'port')` in it would have made the spec contradict its own AC-2. Embedded source
in a spec is a maintenance liability, but that is a pre-existing property of
this spec and not something to change under a rename CR — flagged to CM, not
acted on.

### Horizontal Check (MECE)

- [x] **No contradictions with existing Designs.** Two were found and resolved
      rather than inherited (see Conflicts). Verified afterwards by re-running
      the grep for `bridge.mjs` / `hooks/port` across `docs/design/`: every
      remaining occurrence names them *as superseded*, none as a current
      filename — checked line by line, not by match count.
      `SPEC_CFG_PATHRESOLVER` and `SPEC_CFG_DEFAULTPATHS` were checked and are
      unaffected: they resolve paths *inside* `.jarvis/`, which the new section
      explicitly leaves alone.
- [x] **All new SPECs link to Requirements.** `SPEC_CFG_WORKSPACEFILES` →
      `REQ_CFG_FILEPREFIX` (+ `REQ_CFG_FIXEDPATHS` for the boundary);
      `SPEC_HOOK_MIGRATE` → `REQ_CFG_FILEMIGRATION`. Both also link the design
      elements they constrain, so the dependency is navigable in both
      directions.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_CFG_WORKSPACEFILES` | `REQ_CFG_FILEPREFIX` | `SPEC_CFG_WORKSPACEFILES`, `SPEC_HOOK_CONFIG`, `SPEC_HOOK_BRIDGE` | ✅ |
| `US_CFG_WORKSPACEFILES` | `REQ_CFG_FILEMIGRATION` | `SPEC_HOOK_MIGRATE`, `SPEC_HOOK_AUTOINST` | ✅ |
| `US_HOOK_CONTROL` | `REQ_HOOK_AUTOINST` *(modified)* | `SPEC_HOOK_AUTOINST` *(modified)* | ✅ |
| `US_HOOK_OBSERVE` | `REQ_HOOK_INTAKE` *(unchanged)* | `SPEC_HOOK_INTAKE` *(filename only)* | ✅ |

**AC coverage of `US_CFG_WORKSPACEFILES`** — every story AC lands on a
requirement AC, and no requirement AC is orphaned:

| Story AC | Requirement | Design |
|---|---|---|
| AC-1 attributable by name | `REQ_CFG_FILEPREFIX` AC-1/AC-2 | `SPEC_CFG_WORKSPACEFILES`, `SPEC_HOOK_CONFIG` AC-6 |
| AC-2 one forward-compatible pattern | `REQ_CFG_FILEPREFIX` AC-3 | `SPEC_CFG_WORKSPACEFILES` (pattern + rule) |
| AC-3 no directory-wide exclusion needed | `REQ_CFG_FILEPREFIX` AC-3/AC-6 | `SPEC_CFG_WORKSPACEFILES` ("why not wholesale") |
| AC-4 no orphans across upgrade | `REQ_CFG_FILEMIGRATION` AC-1/AC-6 | `SPEC_HOOK_MIGRATE` AC-1/AC-2 |
| AC-5 install keeps working | `REQ_CFG_FILEMIGRATION` AC-3/AC-4/AC-5 | `SPEC_HOOK_MIGRATE` AC-4/AC-5/AC-6 |
| AC-6 documented | `REQ_CFG_FILEPREFIX` AC-5 | `SPEC_CFG_WORKSPACEFILES` (is the documentation) |

**Cross-level consistency:** `python -m sphinx -b html docs docs/_build/html -W
--keep-going` → **build succeeded, zero warnings**. All `:links:` targets
resolve; no dangling references introduced.

### Artefakt-Removal-Check

This CR removes two artefacts: the generated files `.github/hooks/bridge.mjs`
and `.github/hooks/port`. Grep run project-wide over the name variants
`bridge.mjs`, `hooks/port`, `BRIDGE_FILE`, `PORT_FILE`, `portFile`,
`bridgePath`.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `.github/hooks/bridge.mjs` | `packages/core/src/engine/hooks/hookConfig.ts` (`BRIDGE_FILE`, `bridgePath`, hook command strings), `.gitignore` L51–52 → **specified here, implemented by Dev** | `docs/design/spec_hook.rst` — `SPEC_HOOK_CONFIG` (8 command strings, step 3, design notes, security note, AC-2), `SPEC_HOOK_BRIDGE` (description, code block, AC-2) → **fixed in this CR** | `docs/changes/v0.14.0/*` (5 files), `docs/changes/v0.24.1/whoami-session-id-resolution.md` — acceptable historic stranding |
| `.github/hooks/port` | `packages/core/src/engine/hooks/hookIntake.ts` (`portFile`, write on listen, unlink on stop), `hookConfig.ts` (`PORT_FILE`, `BRIDGE_SOURCE`), `.gitignore` L51–52 → **specified here, implemented by Dev** | `docs/design/spec_hook.rst` — `SPEC_HOOK_CONFIG` (step 4, design notes, AC-3/AC-4), `SPEC_HOOK_BRIDGE` (code block, AC-2), `SPEC_HOOK_INTAKE` (listener, GH #51 caveat, AC-1), `SPEC_HOOK_AUTOINST` (teardown, AC-3) → **fixed in this CR** | same set as above |

Both names still appear in active documents **by design**:
`REQ_CFG_FILEMIGRATION`, `REQ_HOOK_AUTOINST` AC-3, `SPEC_HOOK_MIGRATE`,
`SPEC_HOOK_CONFIG` step 5, `SPEC_HOOK_AUTOINST` teardown step 4, and
`US_CFG_WORKSPACEFILES` name them **as superseded** — which *is* the removal
being specified. Every occurrence was read rather than counted; none asserts
them as current filenames.

- [x] All class (a) active code/workflow references identified and specified for
      the Developer (`hookConfig.ts`, `hookIntake.ts`, `.gitignore`). The System
      Designer specifies; the code change is the Developer's step — called out
      so QM does not read the unchanged source as an incomplete CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic
      stranding" and disclosed above. Note: several v0.14.0 documents reference
      `.jarvis/hooks/` rather than `.github/hooks/` — an *earlier* relocation,
      already stranded before this CR and not caused by it
- [x] `.jarvis/actors/Research/FI-*.md` — another actor's memory, not this
      actor's to modify (actor kernel §2). Out of scope, disclosed

### Issues Found

- [x] **Issue 1 (resolved at L1):** `REQ_HOOK_AUTOINST` AC-3 would have
      contradicted the rename. Extended to cover both name sets — see L1
      Conflicts
- [x] **Issue 2 (resolved at L2):** removal logic existed at two sites; extracted
      into `SPEC_HOOK_MIGRATE` — see L2 Conflicts
- [ ] **Issue 3 (open, for PM — no action in this CR):** the superseded-name
      list in `SPEC_HOOK_MIGRATE` is migration debt with no retirement date.
      Recorded in the spec as an explicit PM decision so it is retired
      deliberately rather than carried indefinitely
- [ ] **Issue 4 (open, for CM — pre-existing):** `SPEC_HOOK_BRIDGE` embeds the
      bridge source verbatim, so every change to the script is also a spec edit
      and the two can silently diverge. Updated correctly here, but the coupling
      is a standing liability. Not addressed under a rename CR
- [ ] **Issue 5 (open, informational):** `SPEC_HOOK_CONFIG`, `SPEC_HOOK_BRIDGE`,
      `SPEC_HOOK_INTAKE` and `SPEC_HOOK_AUTOINST` carry `:status: implemented`
      while now describing behaviour that is not yet implemented (new filenames,
      cleanup). Left as-is rather than flipped to `draft`: the elements are
      overwhelmingly implemented and only the delta is not. The delta lives in
      the two new elements, which are `approved` at spec level and become
      `implemented` after Dev. Same `:status:` hygiene question raised during
      GH #51 — still unresolved project-wide

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

**Implementation scope handed to the Developer** (the specification is complete;
none of the following is done in this CR):

1. `packages/core/src/engine/hooks/hookConfig.ts` — `BRIDGE_FILE` →
   `jarvis-bridge.mjs`, `PORT_FILE` → `jarvis-port`, `BRIDGE_SOURCE` reads
   `jarvis-port`, the 8 hook command strings, plus the new cleanup step
2. `packages/core/src/engine/hooks/hookIntake.ts` — port file path
3. `jarvis.hooks.autoInstall: false` teardown — extend to the superseded names
4. `.gitignore` L51–52 — `.github/hooks/` → `.github/hooks/jarvis-*` (and the
   `testdata/` equivalent)

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-29

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Code | REQ_CFG_FILEMIGRATION | No test exists anywhere in `src/tests/` for the rename or the migration cleanup — no `bridge.mjs`/`jarvis-bridge.mjs`/`SUPERSEDED_FILES` reference in the test suite, and the overall count is unchanged at 323/323 (same as CR #56's final count) confirming zero tests were added. Several ACs are directly testable and untested: AC-2 (cleanup confined to the two named files), AC-4 (best-effort, non-fatal on delete failure), AC-5 (idempotent, no duplicate side effects/log spam), AC-6 (both removal paths covered). Unlike recent CRs (#52/#54/#51: static text-matching; #53/#56: some genuine functional tests), this CR ships with none at all. | medium |
| 2 | UAT | — | No UAT scenario family exists for the Hook Engine at all (no `spec_uat_hook*.rst`) — the CD itself does not raise this as an Issue, unlike the pattern in recent notification/injection CRs where an existing UAT file was at least extendable. Not this CR's gap to close alone, but worth naming as a standing absence for the Hook Engine area. | low |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 5 commits on `development..feature/jarvis-hook-file-prefix`, exact match to CM's message, correct order.

Read the CD in full: an unusually rigorous review — L0 correctly re-framed the CD's own root-cause claim ("no convention existed" → "convention existed, unenforced on 2 of 3 files," verified by grep against `jarvis-hooks.json`'s existing correct prefix), caught and resolved a real MECE contradiction at L1 (`REQ_HOOK_AUTOINST` AC-3 enumerating only current filenames would have broken the `autoInstall:false` opt-out path for upgraded workspaces), and extracted duplicated removal logic into one new spec (`SPEC_HOOK_MIGRATE`) rather than leaving it stated twice — the same "single choke point" discipline called out as a standing lesson after CR #54/#58's v0.5.8-shaped regression class.

All code independently verified against spec: `hookConfig.ts`'s `BRIDGE_FILE`/`PORT_FILE`/`SUPERSEDED_FILES` constants, both `installHookConfig` (step 2b migration cleanup) and `uninstallHookConfig` (superseded names folded into `filesToRemove`) — confirming REQ_CFG_FILEMIGRATION AC-6's "both removal paths" requirement is actually met in code, not just asserted. `hookIntake.ts`'s `portFile` reads `jarvis-port`. `.gitignore` L51-52 narrowed to `.github/hooks/jarvis-*` (+ testdata equivalent) exactly as specified. All modified/new US/REQ/SPEC elements (`US_CFG_WORKSPACEFILES`, `REQ_CFG_FILEPREFIX`, `REQ_CFG_FILEMIGRATION`, `REQ_HOOK_AUTOINST` AC-3, `SPEC_CFG_WORKSPACEFILES`, `SPEC_HOOK_MIGRATE`, `SPEC_HOOK_CONFIG` step 5/AC-6, `SPEC_HOOK_AUTOINST` teardown step 4) read in full — text matches code exactly, no drift.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 323/323 passed, 31/31 files (unchanged from CR #56, confirming Finding 1: no new tests).

**Overall: CLEAR.** No blocking issues. One medium-severity item (zero test coverage for testable migration-cleanup properties) and one low-severity item (standing absence of a Hook Engine UAT family, not raised as an Issue in the CD) recorded for PM.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | Fix now | This logic deletes files on the user's disk (`SUPERSEDED_FILES` cleanup at both the install and uninstall removal paths). Several ACs QM named are directly unit-testable (cleanup confined to the two named files, non-fatal on delete failure, idempotency, both-removal-paths coverage) — cheap to add now, and this is exactly the class of change ("fails plausibly" on a user's real files) where an untested assumption is expensive to discover after release. Sending back to CM for a second round. |
| 2 | 2 | Accept as-is (this CR) | QM itself frames it as a standing, pre-existing absence for the whole Hook Engine area, not something this CR introduced or is scoped to close. Tracked separately as GH #61 rather than left unrecorded. |

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-29

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. Round 1 Finding 1 resolved — see verification below. | — |

**Verification of Round 1 Finding 1 (fix-now):**

Git log independently re-checked: 8 commits total, exactly matching CM's disclosure, only `ef8de75` new since Round 1 (the test commit). New file `src/tests/hook-file-prefix-migration.test.ts` read in full — 11 assertions across TC-1..TC-4, mapping 1:1 onto the four ACs named in Round 1: TC-1 confines cleanup to the closed list (includes a genuine filesystem test proving `other-tool.sh`/`custom-hook.json` survive cleanup, not just a source-text check for the constant), TC-2 proves ENOENT is swallowed both via a direct filesystem exercise and via source-text checks on both `installHookConfig` and `uninstallHookConfig`'s catch blocks, TC-3 is a genuine filesystem idempotency test (cleanup run twice, second pass on already-absent files does not throw), TC-4 confirms both removal paths (`installHookConfig` step 2b, `uninstallHookConfig`'s `filesToRemove`) include `SUPERSEDED_FILES` via source-text checks. A mix of genuine behavioral tests (TC-1's third case, all of TC-2's first case, all of TC-3) and source-structure checks (appropriate for confirming constant/control-flow shape) — a stronger methodology than several recent CRs' pure text-matching.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 334/334 passed (32/32 files), consistent with CM's disclosed count and the +11 assertions in the new file.

Round 1 Finding 2 (UAT gap) was accepted as-is by PM (GH #61) — no action expected or taken this round.

**Overall: CLEAR.** Round 1's fix-now finding is resolved. No new or outstanding findings.

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
