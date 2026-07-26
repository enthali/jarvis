# Change Document: jarvis-kanban

**Status**: ready-for-merge
**Branch**: feature/jarvis-kanban
**Created**: 2026-07-25
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Introduce a new standalone `packages/kanban/` module that renders read-only kanban
boards from a YAML file, visually consistent with the existing Message Flow and
Message Log webviews. The board schema is modeled after GitHub Projects' ontology
(`status` as an enum-valued field on items, plus `fields` and `items`) so a project
can move between local-only and GitHub-backed boards without a schema migration.
Board location follows a convention-over-configuration model: a `kanban.yaml` (or
`<name>.kanban.yaml`) file living in an actor's or entity's folder makes that node
"own" the board and surfaces a tree button on that node — no explicit path setting.
Users open a board via the tree button (single board opens directly, multiple boards
offer a Quick Pick) or the `Jarvis: Open Kanban Board` command. Three tools follow a
uniform, optional-parameter pattern, resolving the calling actor via `jarvis_whoAmI`
when no owner is given: `jarvis_createKanbanBoard`, `jarvis_verifyKanbanSchema` (reads
the board, validates against the schema, returns structured findings so an actor can
fix problems iteratively), and `jarvis_openKanbanBoard`. Renderer-side filtering
(e.g. by priority or labels) is included; swimlanes and write-back are explicitly
deferred to Phase 2, and the optional GitHub Issues importer to Phase 3. **Acceptance
criteria**: (a) a valid board YAML renders as a kanban webview matching the existing
visualization style; (b) the three tools behave per the uniform pattern above, with an
"actor unknown" error for unresolvable owners; (c) `jarvis_verifyKanbanSchema` returns
actionable structured findings; (d) the new module is fully integrated the same way
existing modules are — build tasks (`compile all` and per-package), CI pipeline,
webview build wiring, `package.json`/manifest registration, and a module-level README —
so nothing about the module is a special case relative to `flow`/`pim`/`recorder`.

**GitHub Issue(s)**: #46

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None — no existing US modified.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_KAN_BOARD | Kanban Board from YAML | required |
| US_KAN_DISCOVER | Convention-Based Board Discovery | required |
| US_KAN_TOOLS | Kanban Board Tools | required |

### Decisions

- Decision 1: KAN is a new theme — kanban is a distinct capability, not a sub-feature of any existing theme.
- Decision 2: Phase 1 is read-only. Swimlanes and write-back deferred to Phase 2 (#47), GitHub importer to Phase 3 (#48).
- Decision 3: Tools resolve calling actor via `jarvis_whoAmI` (US_ACT_WHOAMI) — uniform pattern with optional `ownerName` override.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — no existing US covers kanban/board visualization
- [x] Gaps identified and addressed — three USes cover rendering, discovery, and tools (MECE across the feature)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

None — no existing REQ modified.

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_KAN_SCHEMA | Kanban Board YAML Schema | US_KAN_BOARD | required |
| REQ_KAN_RENDERER | Kanban Board Renderer | US_KAN_BOARD | required |
| REQ_KAN_DISCOVER | Convention-Based Board Discovery | US_KAN_DISCOVER | required |
| REQ_KAN_UX | Kanban Board UX Entry Points | US_KAN_DISCOVER; US_KAN_BOARD | required |
| REQ_KAN_CREATE | jarvis_createKanbanBoard Tool | US_KAN_TOOLS; REQ_ACT_WHOAMI | required |
| REQ_KAN_VERIFY | jarvis_verifyKanbanSchema Tool | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI | required |
| REQ_KAN_OPEN | jarvis_openKanbanBoard Tool | US_KAN_TOOLS; REQ_KAN_RENDERER; REQ_ACT_WHOAMI | required |
| REQ_KAN_MODULE | Kanban Module Integration | US_KAN_BOARD; US_KAN_TOOLS | required |
| REQ_KAN_UPDATE | jarvis_updateKanbanItem Tool | US_KAN_TOOLS; REQ_KAN_SCHEMA; REQ_ACT_WHOAMI | required |
| REQ_KAN_FILEOPEN | Kanban File Open | US_KAN_DISCOVER; US_KAN_BOARD | required |

### Conflicts Detected

None.

### Decisions

- Decision 1: Schema follows GitHub Projects ontology — `status` is an enum-valued field, not a structural concept. This enables future GitHub import without schema migration.
- Decision 2: `status` field uniqueness is a semantic constraint validated by `REQ_KAN_VERIFY`, not enforced structurally in JSON Schema. Keeps schema simple.
- Decision 3: All three tools share the same `(boardName?, ownerName?)` parameter pattern. Consistency reduces cognitive load for agents.
- Decision 4: Discovery uses `registerDecorator` (SPEC_ENG_API) — the kanban module decorates existing tree nodes rather than creating its own tree view. Zero new top-level UI in Phase 1.
- Decision 5: Phase 1 includes targeted item update tool (`jarvis_updateKanbanItem`) as scope gap fix (PM decision 2026-07-25). Items carry integer IDs for stable referencing. Full write-back remains Phase 2.
- Decision 6: PM explicitly authorized `id` as required in JSON Schema (2026-07-25). The prior revert of a433d28 was based on the spec saying otherwise; both spec and code are now updated to make `id` required. Actor 1 testdata fixtures (`testdata/.jarvis/actors/Actor 1/kanban.yaml` and `bug.kanban.yaml`) intentionally omit `id` fields and serve as negative test cases for `jarvis_verifyKanbanSchema` (T-24). The `missing-id.kanban.yaml` fixture under Change Manager serves the same purpose.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_KAN_SCHEMA vs REQ_KAN_VERIFY: schema defines structure, verify validates semantics (complementary)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

None — no existing SPEC modified.

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_KAN_SCHEMA | Kanban Board YAML Schema | REQ_KAN_SCHEMA |
| SPEC_KAN_RENDERER | Kanban Board Renderer | REQ_KAN_RENDERER; SPEC_KAN_SCHEMA |
| SPEC_KAN_DISCOVER | Convention-Based Board Discovery | REQ_KAN_DISCOVER; REQ_KAN_UX |
| SPEC_KAN_UX | Kanban Board UX Entry Points | REQ_KAN_UX; SPEC_KAN_DISCOVER; SPEC_KAN_RENDERER |
| SPEC_KAN_CREATE | jarvis_createKanbanBoard Tool | REQ_KAN_CREATE; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA |
| SPEC_KAN_VERIFY | jarvis_verifyKanbanSchema Tool | REQ_KAN_VERIFY; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA |
| SPEC_KAN_OPEN | jarvis_openKanbanBoard Tool | REQ_KAN_OPEN; SPEC_ACT_WHOAMI; SPEC_KAN_RENDERER |
| SPEC_KAN_MODULE | Kanban Module Integration | REQ_KAN_MODULE; SPEC_MOD_FLOW_PKG; SPEC_REL_PKGCONTRACT |
| SPEC_KAN_UPDATE | jarvis_updateKanbanItem Tool | REQ_KAN_UPDATE; SPEC_ACT_WHOAMI; SPEC_KAN_SCHEMA |
| SPEC_KAN_FILEOPEN | Kanban File Open via Custom Editor | REQ_KAN_FILEOPEN; SPEC_KAN_RENDERER; SPEC_KAN_UX |

### Conflicts Detected

None.

### Decisions

- Decision 1: Full JSON Schema published in SPEC_KAN_SCHEMA — items use `additionalProperties: { "type": "string" }` for user-defined fields. Semantic validation (field name exists, value matches option) handled separately by SPEC_KAN_VERIFY.
- Decision 2: Discovery via `api.registerDecorator` — kanban decorates existing tree nodes, no new tree view.
- Decision 3: Owner resolution in tools: `ownerName` given → scanner lookup; omitted → `jarvis_whoAmI` via `api.invokeTool`. Unresolvable → `{ error: "actor unknown" }`. Consistent across all three tools.
- Decision 4: Module structure mirrors `packages/flow/` exactly: tsconfig, package.json, build.js, webview-build.js, .vscodeignore, README.md, src/, webview/, resources/.
- Decision 5: Webview build follows flow's esbuild pattern. Renderer uses VS Code theme colors for dark/light/high-contrast consistency.
- Decision 6: `ajv` for JSON Schema validation in SPEC_KAN_VERIFY (bundled dependency of the kanban package).\n- Decision 7: Schema bundling — authoritative source at monorepo root `schemas/kanban.schema.json`; package-local copy at `packages/kanban/schemas/kanban.schema.json` synced by `build.js` prebuild step. `yamlValidation.url` uses package-relative `./schemas/kanban.schema.json` (same pattern as core's `session.schema.json`). `loadSchema()` resolves via `context.extensionUri`. Fixes QM Round 1 BLOCK finding.
- Decision 8: `customEditorProvider` for `*.kanban.yaml` / `kanban.yaml` intercepts file open — renders webview instead of text editor. "Open in Editor" available via context menu.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | UAT | Complete? |
|------------|--------------|--------|-----|-----------|
| US_KAN_BOARD | REQ_KAN_SCHEMA, REQ_KAN_RENDERER | SPEC_KAN_SCHEMA, SPEC_KAN_RENDERER | SPEC_UAT_KANBAN | ✅ |
| US_KAN_DISCOVER | REQ_KAN_DISCOVER, REQ_KAN_UX, REQ_KAN_FILEOPEN | SPEC_KAN_DISCOVER, SPEC_KAN_UX, SPEC_KAN_FILEOPEN | SPEC_UAT_KANBAN | ✅ |
| US_KAN_TOOLS | REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_UPDATE | SPEC_KAN_CREATE, SPEC_KAN_VERIFY, SPEC_KAN_OPEN, SPEC_KAN_UPDATE | SPEC_UAT_KANBAN | ✅ |
| (cross-cutting) | REQ_KAN_MODULE | SPEC_KAN_MODULE | — | ✅ |
| US_UAT_KANBAN | REQ_UAT_KANBAN | SPEC_UAT_KANBAN (T-1..T-23) | — | ✅ |

### Artefakt-Removal-Check

N/A — this CR is purely additive; no artefacts removed.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

### Round 1 (2026-07-25)

**Verdict: BLOCK**

**L0/L1/L2 specs** (US_KAN_BOARD/DISCOVER/TOOLS, all 8 REQ_KAN_*, all 8 SPEC_KAN_*): all exist, read directly, content sound, MECE, all links correct — no issues.

**UAT artifacts** (US_UAT_KANBAN, REQ_UAT_KANBAN, SPEC_UAT_KANBAN): all exist; SPEC_UAT_KANBAN has 17 rows covering the claimed 16 scenarios (T-13 split a/b) — read directly, accurate, correctly linked to REQ/US_KAN_* elements.

**Build**: full package-suite `compile all` — clean, kanban wired in correctly (`npx tsc -p packages/kanban && node build.js && node webview-build.js` in the chain). CI `release.yml` correctly packages and uploads `enthali.jarvis-kanban` VSIX (SPEC_KAN_MODULE AC-3).

**Blocking finding — schema file not bundled into the package (root cause: spec gap, not just a code bug):**

`packages/kanban/src/extension.ts` `loadSchema()` reads the schema from
`vscode.workspace.workspaceFolders?.[0]/schemas/kanban.schema.json` — i.e. the
*host workspace root*, not from inside `packages/kanban/` itself. The schema
file only physically exists at the monorepo-root `schemas/kanban.schema.json`;
`packages/kanban/` has no local copy (contrast with `packages/core/schemas/session.schema.json`,
which **is** a local copy bundled inside the core package — the established,
correct pattern for `SPEC_ENG_API`-style schema contributions).

Consequences, confirmed by reading the code and the CI workflow:

1. **`jarvis_verifyKanbanSchema` silently skips structural validation** for any
   real-world install: `loadSchema()` returns `undefined` whenever the user's
   own workspace (not this monorepo) is open, and the code's `if (schema) {...}`
   has no `else` — no error, no warning, just silent omission of the entire
   structural-validation layer mandated by REQ_KAN_VERIFY AC-2. This is a
   functional break, not a cosmetic one.
   
2. **`yamlValidation` contribution is also broken for packaged installs**:
   `package.json` registers `"url": "../../schemas/kanban.schema.json"` —
   outside the package directory. `vsce package` (run from `packages/kanban`,
   confirmed in `.github/workflows/release.yml` line 48) cannot include files
   outside its own package root, so the schema is absent from the published
   VSIX. Editor red-squiggle validation for `kanban.yaml`/`*.kanban.yaml`
   will not work for any real end user.

Both symptoms trace to the same root cause: **SPEC_KAN_SCHEMA / SPEC_KAN_MODULE
never specify that the schema file must be bundled inside `packages/kanban/`
itself** (e.g. `packages/kanban/schemas/kanban.schema.json`, mirroring core's
pattern), so the implementation reached for the monorepo-root copy instead —
which only happens to exist while developing *this* repository, not for a
Marketplace install. This only "works" in the EDH/UAT scenario described in
REQ_UAT_KANBAN because the whole monorepo happens to be on disk there.

Recommend routing to System Designer first (amend SPEC_KAN_SCHEMA/SPEC_KAN_MODULE
to mandate a package-local schema copy + build step to keep it in sync with the
root schema, same as core), then Dev Engineer for the code/package.json fix.

**Non-blocking note (same class of gap as CR #44):** `REQ_UAT_KANBAN` test-data
prerequisites reference `testdata/.jarvis/actors/Change Manager/kanban.yaml` and
`sprint2.kanban.yaml` — neither exists (only `context.md`/`actor.yaml` are present
in that folder; `testdata/kanban/sample.kanban.yaml` exists as a generic fixture
but isn't placed under the actor folder the UAT spec names). Blocks literal manual
execution of T-1, T-2, T-7 as written. Flagged to PM.

**Overall**: BLOCK sent to CM pending the schema-bundling fix. Findings report sent to PM.

### Round 2 (2026-07-25)

**Verdict: CLEAR**

Re-verified after CM's fix (4 files):

- **`build.js`**: prebuild step confirmed — copies `schemas/kanban.schema.json` from monorepo root to `packages/kanban/schemas/` before esbuild runs. Independently re-ran full `compile all`: log line `Copied schema → ...\packages\kanban\schemas\kanban.schema.json` confirmed, build clean.
- **`extension.ts`**: `loadSchema()` now resolves via `vscode.Uri.joinPath(extensionUri, 'schemas', 'kanban.schema.json')` (`extensionUri = context.extensionUri`, set in `activate()`) instead of the workspace root. Returns `{ error: '...' }` on failure instead of `undefined`; caller now checks `'error' in schemaResult` and surfaces a structured error (`errors: [{ field: 'schema', message }]`) instead of silently skipping structural validation. REQ_KAN_VERIFY AC-2 now genuinely met for real installs.
- **`package.json`**: `yamlValidation.url` for both `kanban.yaml` and `*.kanban.yaml` now `./schemas/kanban.schema.json` (package-relative) — will be included in the VSIX.
- **`.vscodeignore`**: confirmed does NOT exclude `schemas/**` — the copied file will ship in the package.
- **`packages/kanban/schemas/kanban.schema.json`**: exists on disk, generated by the prebuild step.
- **Spec amendments**: `SPEC_KAN_SCHEMA` AC-4 and `SPEC_KAN_MODULE` AC-7/AC-8/AC-9 read directly — accurately describe the fix (package-local copy, prebuild sync, package-relative yamlValidation URL, `extensionUri`-based resolution). Spec-first fix, consistent with the Round 1 routing (System Designer amended spec before Dev Engineer implemented).
- **Build**: full package-suite `compile all` — clean.
- **Tests**: independently re-ran `npx vitest run` — 272/272 passed, 27/27 test files, matching CM's claim exactly.

No new issues found. Round 1's non-blocking UAT test-data fixture gap remains open (PM decision pending) but does not affect this CLEAR.

**Overall**: CLEAR sent to CM. Findings report sent to PM.

### Round 3 (2026-07-25)

**Verdict: BLOCK**

Scope expansion reviewed: `REQ_KAN_UPDATE`/`SPEC_KAN_UPDATE` (`jarvis_updateKanbanItem`),
item `id`/`nextId` fields (schema + code + spec), `#id` renderer prefix, T-17..T-23 UAT
scenarios, CD Decision 5.

**What's sound:**

- `REQ_KAN_UPDATE`/`SPEC_KAN_UPDATE` read directly — content sound, correctly linked,
  matches implementation exactly: `jarvis_updateKanbanItem` in `extension.ts` finds by
  `id`, merges `changes`, validates `status` against field options, keeps `id` immutable,
  returns the documented `{path, updated, itemId}` / error shapes.
- `packages/kanban/package.json`: 4th `languageModelTools` entry
  (`toolReferenceName: "updateKanbanItem"`) confirmed registered correctly.
- Schema (`schemas/kanban.schema.json` and package-local copy): both include `nextId`
  (top-level, integer) and `id` (per-item, integer) matching `SPEC_KAN_SCHEMA`. Round 2's
  schema-bundling fix confirmed still intact — `compile all` prebuild log shows
  `Copied schema → ...\packages\kanban\schemas\kanban.schema.json`.
- Webview (`webview/kanban.ts`): `#id` prefix rendering confirmed present, matches
  `SPEC_KAN_RENDERER` AC-6.
- Build: full `compile all` — clean. Tests: independently re-ran `npx vitest run` —
  272/272, 27/27 files, matching CM's claim.
- **Previously-flagged non-blocking gap now resolved**: `testdata/.jarvis/actors/Change
  Manager/kanban.yaml` and `sprint2.kanban.yaml` now exist (confirmed by direct read),
  closing the UAT test-data fixture gap flagged in Round 1 and carried since.

**Blocking finding 1 — silent regression of an already-committed, spec-documented fix:**

Commit `b21c8df` ("fix(kanban): boardName normalization + UI create InputBox (#46)",
landed *after* Round 2 CLEAR) added: (a) `resolveBoardPath()` suffix-normalization
(accepts `"sprint"` or `"sprint.kanban.yaml"` equivalently, strips known suffixes,
maps `"kanban"`/empty to the default board), (b) a `showInputBox` prompt in the
`jarvis.createKanbanBoard` command letting the user name a board, with input
validation, and (c) matching amendments to `SPEC_KAN_CREATE` (step 2, normalization
rules) and `SPEC_KAN_UX` (AC-5/AC-6, Create command flow).

The very next commit, `b37e51a` ("feat(kanban): item IDs, nextId counter,
updateKanbanItem tool, #id in webview"), **reverted all of it** while adding the
item-ID feature — confirmed by `git show b37e51a -- packages/kanban/src/extension.ts`:
`resolveBoardPath()` is back to the unnormalized 3-line version, and the
`showInputBox` prompt is gone entirely (`jarvis.createKanbanBoard` again hardcodes
`kanban.yaml`, silently dropping named-board creation via the UI). `spec_kan.rst`
was reverted in lockstep — `SPEC_KAN_CREATE` step 2 and `SPEC_KAN_UX` no longer
mention normalization or the Create command flow at all (both confirmed absent by
direct read). Code and spec are internally consistent with *each other* post-revert,
but a previously completed, intentional piece of work was silently discarded, and
neither `b37e51a`'s commit message, `bf491f0`'s, nor CM's Round 3 request message
disclosed the reversal.

Consequence: `jarvis_createKanbanBoard`, `jarvis_updateKanbanItem`, `jarvis_verifyKanbanSchema`,
and `jarvis_openKanbanBoard` all resolve `boardName` via the unnormalized
`resolveBoardPath()` — passing a full filename like `"sprint.kanban.yaml"` as
`boardName` (a reasonable thing for an LLM caller to do) now produces
`sprint.kanban.yaml.kanban.yaml` instead of resolving correctly. The UI command no
longer offers named-board creation at all.

This is exactly the "silent regression / silent failure" pattern this review has
flagged before (cf. Round 1's silent-skip finding) — recommend CM investigate
whether this was an accidental base/rebase issue in the item-ID commits, then either
restore the fix or make an explicit, documented decision to defer it, rather than
letting it disappear unacknowledged.

**Blocking finding 2 — traceability gap: `REQ_KAN_UPDATE` links to a User Story that doesn't mention it:**

`REQ_KAN_UPDATE` declares `:links: US_KAN_TOOLS; ...`, but `US_KAN_TOOLS`'s own text
(`docs/userstories/us_kan.rst`) is unchanged since Round 1 — its "I want" statement
still reads "tools to create, validate, and open kanban boards" and its ACs (AC-1..AC-5)
enumerate only those three tools, with no AC covering update. The CD's Level 0 section
still states "Impacted User Stories: None — no existing US modified," which is
literally true but is itself the gap: a 4th tool was added at L1/L2 without the L0
story that motivates it being extended. Recommend adding an AC to `US_KAN_TOOLS` (or
broadening its "I want" statement) covering targeted item updates.

**Non-blocking finding — CD's own Final Consistency Check is stale:**

The "Traceability Verification" table (under *Final Consistency Check*) was not
updated for this scope expansion: the `US_KAN_TOOLS` row still lists only
`REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN` / `SPEC_KAN_CREATE, SPEC_KAN_VERIFY,
SPEC_KAN_OPEN` (missing `REQ_KAN_UPDATE`/`SPEC_KAN_UPDATE`), and the `US_UAT_KANBAN`
row still says `SPEC_UAT_KANBAN (T-1..T-16)` despite T-17..T-23 now existing (23
scenarios total, confirmed by direct read of `spec_uat_kanban.rst`). Should be
refreshed before merge for an accurate audit trail, but doesn't block this round on
its own.

**Overall**: BLOCK sent to CM (primarily Finding 1 — silent regression — plus Finding
2, a real upward-traceability gap). Findings report sent to PM.

### Round 4 (2026-07-25)

**Verdict: BLOCK**

Re-verified CM's three fixes for Round 3:

- **Finding 1 (normalization regression) — FIXED, verified**: commit `331b4b5`
  restores `resolveBoardPath()` suffix-stripping and the `createKanbanBoard`
  `showInputBox` prompt exactly as in the original `b21c8df`, confirmed by direct
  diff comparison. Commit `aa0d1cb` restores the matching `SPEC_KAN_CREATE` step 2
  and `SPEC_KAN_UX` AC-5/AC-6 text — confirmed present by direct read.
- **Finding 2 (US_KAN_TOOLS traceability gap) — FIXED, verified**: `US_KAN_TOOLS`
  now has AC-6 ("`jarvis_updateKanbanItem` updates an existing item by its stable
  ...") motivating `REQ_KAN_UPDATE` — confirmed by direct read.
- **Non-blocking CD table — FIXED, verified**: `US_KAN_TOOLS` row now lists
  `REQ_KAN_UPDATE`/`SPEC_KAN_UPDATE`; `US_UAT_KANBAN` row now reads
  `SPEC_UAT_KANBAN (T-1..T-23)` — confirmed by direct read.
- Build: full `compile all` — clean. Tests: independently re-ran `npx vitest run`
  — 272/272, 27/27 files.

**New blocking finding — undisclosed change directly contradicts existing spec text:**

A 4th commit, `a433d28` ("make item id required in JSON Schema"), landed alongside
the three fix commits but was **not mentioned anywhere in CM's Round 4 request**.
It adds `"id"` to the JSON Schema's `required` array for board items (both
`schemas/kanban.schema.json` and the package-local copy).

This directly contradicts `SPEC_KAN_SCHEMA`'s own explicit "Item IDs" section,
unchanged by this commit: *"`id` is required in the schema but not in `required`
at the JSON Schema level — it is auto-assigned by tools and validated semantically
by `SPEC_KAN_VERIFY`."* AC-5 likewise still reads *"Items with `id` present are
validated as integer >= 1"* — conditional wording that no longer matches the code.
The commit message's justification ("Actor 1 testdata fixtures intentionally lack
id — negative test cases") doesn't hold up under verification: `git status` shows
`testdata/.jarvis/actors/Actor 1/kanban.yaml` and `bug.kanban.yaml` are **untracked
— never committed**, and neither is referenced anywhere in `spec_uat_kanban.rst`
(grepped "Actor 1" — zero matches). The stated negative-test rationale for a spec
contradiction isn't part of the actual change set and isn't a documented UAT
scenario.

This isn't a functional break for the boards checked (all existing UAT fixtures —
`testdata/kanban/sample.kanban.yaml`, `Change Manager/kanban.yaml` — already carry
`id` on every item), but it is a real, verifiable spec-vs-code conflict introduced
as an undisclosed side-change while fixing unrelated findings. Recommend either (a)
reverting `a433d28` and keeping `id` semantically-required-but-not-JSON-Schema-required
per the existing, deliberate spec text, or (b) if the tightening is intentional,
amend `SPEC_KAN_SCHEMA`'s "Item IDs" section and AC-5 to match, and add a documented,
committed negative-test fixture + UAT scenario — but not both silently.

**Overall**: BLOCK sent to CM (new spec-contradicting undisclosed change). Rounds 1-3
findings all confirmed fixed. Findings report sent to PM, flagging the recurring
"undisclosed side-change" pattern across Rounds 3 and 4.

### Round 5 (2026-07-25)

**Verdict: CLEAR**

- **Finding fixed**: commit `fb5d865` — clean `git revert a433d28 --no-edit`.
  Confirmed via `git diff a433d28~1 fb5d865 -- schemas/kanban.schema.json
  packages/kanban/schemas/kanban.schema.json`: empty diff, i.e. both schema files
  are byte-identical to their pre-`a433d28` state. `id` is no longer in either
  file's item `required` array (`["name", "status"]`), consistent with
  `SPEC_KAN_SCHEMA`'s "Item IDs" section and AC-5.
- **No new undisclosed commits this round**: `git log` shows exactly one new
  commit (`fb5d865`) since Round 4 — the revert itself. Unlike Rounds 3→4, no
  extra side-changes rode along.
- **All prior fixes re-confirmed still intact**: `resolveBoardPath()`
  normalization and `showInputBox` (Round 3 fix) both still present in
  `extension.ts`; `US_KAN_TOOLS` AC-6 and CD traceability table (T-1..T-23,
  REQ/SPEC_KAN_UPDATE row) unaffected by the revert.
- Build: full `compile all` — clean. Tests: independently re-ran `npx vitest run`
  — 272/272, 27/27 files.

No new issues found. No open non-blocking items remain (UAT test-data fixture gap
resolved in Round 3; CD table staleness resolved in Round 4).

**Overall**: CLEAR sent to CM. Findings report sent to PM.

### Round 6 (2026-07-25)

**Verdict: CLEAR**

CM's request described 3 commits: filter simplification (spec `af69455`, code
`49f53e2`) and README updates (`a44de4f`). `git log 03e5682..HEAD` (since my Round 5
CLEAR commit) shows **4** commits — a 4th, `895c010` ("live refresh on tool write —
3 trigger sources"), was not mentioned.

**The undisclosed commit itself — verified sound:**

`895c010` adds a `FileSystemWatcher` (`kanbanPanel.ts`) alongside the existing
`onDidSaveTextDocument` listener, exports `refreshKanbanPanel()`, and calls it from
`jarvis_updateKanbanItem` after writing. This closes a real, legitimate gap:
`jarvis_updateKanbanItem` writes via `fs.promises.writeFile`, which does not fire
`onDidSaveTextDocument` (that only fires for the editor's own save action) — without
this fix, an open board webview would go stale after a tool-driven update.
`SPEC_KAN_RENDERER` AC-4 was correctly updated to document all three trigger
sources, matching the code. Minor non-blocking observation: a tool-driven update
now triggers two refreshes (the filesystem watcher's `onDidChange` and the direct
`refreshKanbanPanel()` call) — harmless (idempotent re-render) but slightly
redundant; not worth a fix on its own.

**Disclosed changes — verified:**

- Filter simplification: `matchesFilter()` in `webview/kanban.ts` read directly —
  case-insensitive substring match across `#id`/id, `name`, `status`, `labels`,
  `notes`, and all other field values, exactly as `SPEC_KAN_RENDERER` AC-3 now
  describes. Token parser (`label:`/`field:` syntax) fully removed, no dead code
  left behind.
- README updates: both `README.md` and `packages/kanban/README.md` confirmed to
  list `jarvis_updateKanbanItem` with accurate signature and behavior — the
  package README's description ("live-refreshes any open board webview") in fact
  already presupposes the undisclosed `895c010` fix, i.e. these two commits were
  clearly worked on together and should have been reported together.
- All Rounds 1-5 fixes re-confirmed intact: schema `id` still not in `required`
  (Round 4/5), `resolveBoardPath()` normalization + `showInputBox` still present
  (Round 3), `US_KAN_TOOLS` AC-6 present, CD traceability table current.
- Build: full `compile all` — clean. Tests: independently re-ran `npx vitest run`
  — 272/272, 27/27 files.

**Process concern — recurring incomplete disclosure (3rd occurrence):**

This is the second time CM's own itemized "here are the changes" list has omitted
a real commit (Round 4 omitted `a433d28`; this round omits `895c010`), with Round 5
being disclosed correctly in between. Both times the reviewing burden fell on
`git log <last-QM-commit>..HEAD` rather than the request message. Unlike Round 4,
this round's undisclosed commit is itself sound and doesn't block — but the pattern
itself is now recurring rather than a one-off, and is flagged strongly to PM as a
process item independent of this CLEAR.

**Overall**: CLEAR sent to CM. Findings report sent to PM, again flagging the
disclosure-completeness pattern (now 2 of the last 3 rounds).

### Round 7 (2026-07-25)

**Verdict: BLOCK**

CM's request for this "PM final batch" included, for the first time, a complete
itemized `git log` listing every commit since my Round 6 commit (`a87377a`),
including admin/memory commits. Independently ran `git log 03e5682..HEAD --oneline`
— the list matches exactly, zero undisclosed commits. **This is a genuine
improvement in disclosure practice and is called out positively below.**

**id required (Decision 6, PM-authorized) — sound, one internal spec staleness:**

Both `schemas/kanban.schema.json` and `packages/kanban/schemas/kanban.schema.json`
confirmed via direct read to have `"required": ["id", "name", "status"]`.
`SPEC_KAN_SCHEMA`'s "Item IDs" narrative section was correctly rewritten to state
`id` IS in the required array and items without it are structurally invalid — this
matches code and CD Decision 6 (which correctly documents the PM's explicit
authorization, avoiding a repeat of the Round 4 ambiguity).

Non-blocking: `SPEC_KAN_SCHEMA` AC-3 ("rejects items missing `name` or `status`")
and AC-5 ("Items with `id` present are validated as integer >= 1") were **not**
updated to match the narrative section — AC-5 still uses the old "if present"
conditional wording, and AC-3 doesn't mention `id` at all despite it now being
required. Internally inconsistent within the same spec entry; cosmetic, does not
block, but should be corrected (AC-3 → "...missing `name`, `status`, or `id`";
AC-5 → drop "present" framing).

**Context-menu create (`SPEC_KAN_UX` AC-7) — location and label mismatch (blocking):**

`SPEC_KAN_UX` AC-7 and UAT `T-25` both explicitly describe: right-click the
entity's **Files tree node**, select **"Add Kanban Board"**. The actual
`packages/kanban/package.json` contribution is:

```
"view/item/context": [
  { "command": "jarvis.createKanbanBoard",
    "when": "viewItem =~ /^jarvis(Session|Project|Event)/", "group": "kanban@1" }
]
```

This targets the entity's own root tree node (`viewItem` matching
`jarvisSession`/`jarvisProject`/`jarvisEvent`), not a distinct "Files" sub-node —
there is no `jarvis.filesNode` `viewItem` in the codebase at all
(confirmed via search of `packages/core/src`). There is also no menu-specific
`title` override in the contribution, so the entry shown reuses the command's own
title, **"Jarvis: Create Kanban Board"**, not **"Add Kanban Board"**.

`extension.ts`'s handler is consistent with the *entity-root-node* placement
(`node.kind === 'leaf'` matches the unified tree's entity leaf nodes, using
`path.dirname(node.id)` to get the owner folder) — so the code is internally
consistent with itself, just not with `SPEC_KAN_UX` AC-7 or `T-25` as written.
A tester executing `T-25` literally (right-click a Files node, look for "Add
Kanban Board") would not find it in the documented location/label.

This is a real spec/UAT-vs-code divergence, not obviously an out-of-band decision
like the id-required case — recommend PM confirm which is correct: (a) implementation
is fine as-is (arguably simpler — one menu entry per entity, no separate Files
node needed) and `SPEC_KAN_UX` AC-7 + `T-25` should be corrected to match, or
(b) the original Files-node/"Add Kanban Board" design was intended and the
`package.json` contribution + title need to change. Escalating per corrected
practice rather than assuming either side is authoritative.

**File-open custom editor (`SPEC_KAN_FILEOPEN`) — mechanism partially not implemented:**

`REQ_KAN_FILEOPEN` AC-1 and `SPEC_KAN_FILEOPEN` AC-1 (clicking a kanban file opens
the webview, not the text editor) are correctly implemented: `customEditors`
contribution with `priority: "default"` on `*.kanban.yaml`/`kanban.yaml`, backed by
`kanbanEditorProvider.ts`'s `CustomReadonlyEditorProvider` — read, reviewed in
full, matches spec's described mechanism (parse YAML, post to webview, no
`saveCustomDocument`).

However, `REQ_KAN_FILEOPEN` AC-2 / `SPEC_KAN_FILEOPEN` AC-2 and Mechanism step 4
describe a **context menu on the kanban file node** with two entries, "Open Kanban
Board" and "Open in Editor". No such context menu exists. The actual escape hatch
is an `editor/title` button (`jarvis.openKanbanAsText`, labelled "Jarvis: Open
Kanban as Text") that only appears once the custom editor is already open — a user
cannot right-click the file in the tree and choose directly, they must first open
the webview (default action) then use the title-bar button.

Notably, UAT `T-26`/`T-27` already document the **actual** title-bar-button
behavior (not the spec's file-node-context-menu design) — `T-27` even hedges with
"whichever label appears in the editor title bar", implying Test Designer noticed
the mismatch and tested reality without correcting the upstream spec text. This
means `REQ_KAN_FILEOPEN` AC-2 and `SPEC_KAN_FILEOPEN` AC-2/Mechanism step 4 are
demonstrably stale relative to both code and the UAT that already validates the
real behavior. Recommend correcting the spec text to describe the title-bar button
mechanism (straightforward correction, not an authority question like the AC-7
case above, since UAT evidence already shows what was actually built and tested).

**Negative fixture — sound:**

`testdata/.jarvis/actors/Change Manager/missing-id.kanban.yaml` (new, committed)
has one item with `id` and one item without — a well-formed negative fixture,
correctly referenced by `T-24`. Good model for a disclosed, referenced test fixture
(contrast with the recurring `Actor 1` files below).

**Non-blocking hygiene note (repeat observation):**

`testdata/.jarvis/actors/Actor 1/kanban.yaml` and `bug.kanban.yaml` are still
untracked (`git status` confirms — not part of any commit), and both still have
items entirely lacking `id`. CD Decision 6 text references "Actor 1 testdata
fixtures intentionally lacking `id`" as negative-test cases, but these files are
not committed and not referenced by any UAT scenario — the claim in the CD is not
accurate; the fixture that actually serves this purpose is the new, properly
committed and referenced `missing-id.kanban.yaml`. Recommend either committing the
`Actor 1` files with a clear purpose or deleting them — this stray pair has now
persisted across multiple rounds without resolution.

**Build/tests:** Full `compile all` — clean, kanban package builds and bundles
correctly. Independently re-ran `npx vitest run` — 272/272 passed, 27/27 files,
consistent with all prior rounds.

**Overall**: BLOCK. Primary reason: `T-25`/`SPEC_KAN_UX` AC-7 describe a menu
location and label that does not exist in the implementation — a UAT scenario
that would fail as literally written is a test-protocol validity defect, not
just a documentation nit. Secondary, non-blocking items (stale AC-3/AC-5 wording,
`SPEC_KAN_FILEOPEN` AC-2 mechanism drift, stray `Actor 1` fixtures) recorded above
for the next round. Disclosure practice improvement (complete git log) noted
positively. Verdict and findings sent to PM only, per corrected routing.

### Round 8 (2026-07-26)

**Verdict: BLOCK**

CM's request again included a complete `git log 76c4705..HEAD --oneline`
(4 commits) — independently re-ran, matches exactly. Disclosure practice
continues to hold. `git status` confirms the `Actor 1` fixtures flagged as
stray/untracked in Round 7 are now committed — that hygiene item is closed.

**Item 1 — AC-7 location: fixed. AC-7 label: now backwards (blocking):**

Location is now correctly documented and implemented: `SPEC_KAN_UX` AC-7,
`REQ_KAN_UX`, and `T-25` all describe/exercise the entity root node
(`viewItem =~ /^jarvis(Session|Project|Event)/`), matching
`packages/kanban/package.json`'s `view/item/context` contribution. Good —
Round 7's location finding is resolved.

However, the **label** is now inverted. `package.json` sets an explicit
`"title": "Add Kanban Board"` override on that menu entry — confirmed by direct
read. But `SPEC_KAN_UX` AC-7 states the entry "shows 'Jarvis: Create Kanban
Board'", and `T-25`'s scenario title and action text both instruct the tester
to "Select 'Jarvis: Create Kanban Board' from the context menu." Neither matches
what VS Code will actually render — the menu entry will read **"Add Kanban
Board"**, not "Jarvis: Create Kanban Board" (that's the command's own title,
used elsewhere e.g. Command Palette). A tester following `T-25` literally would
right-click, look for "Jarvis: Create Kanban Board", and not find it. CM's
own summary message describing this fix says the title override was added
"to match command title" — that framing itself is inaccurate; the override
exists specifically to show a *different*, shorter label than the command
title. Recommend correcting `SPEC_KAN_UX` AC-7 and `T-25` text to say "Add
Kanban Board" (matching the actual, and reasonable, package.json label) —
this is a straightforward text correction, not an authority question.

**Traceability gap — REQ_KAN_UX has no AC for context-menu-create (blocking):**

`SPEC_KAN_UX` AC-7 links to `REQ_KAN_UX`, and `T-25`'s Req Link column cites
"`REQ_KAN_UX` AC-7 (context menu)". Read `REQ_KAN_UX` in full: it only defines
AC-1 through AC-5 (tree button + command palette entry points) — there is no
AC-6 or AC-7 covering the entity-context-menu entry point at all. The SPEC and
UAT both trace up to a REQ acceptance criterion that does not exist. This is a
genuine US→REQ→SPEC→UAT traceability break for the whole context-menu-create
feature, not just a Round 8 label nit — recommend adding an AC-6 to `REQ_KAN_UX`
(e.g. "A context menu entry SHALL allow creating a board directly from an
entity's tree node, skipping the owner Quick Pick") and re-pointing `SPEC_KAN_UX`
AC-7 / `T-25` to it.

**Item 2 — "Open as Text" tree menu removal (Option A): sound:**

`packages/kanban/package.json`'s `view/item/context` array now contains only the
`createKanbanBoard` entry — the non-functional `openKanbanAsText` entry is gone,
confirmed via `git show 7156e2a`. `SPEC_KAN_FILEOPEN` AC-2 and `REQ_KAN_FILEOPEN`
AC-2 correctly restrict scope to the editor-title-bar button and explicitly note
the tree-context-menu path is deferred to a separate CR pending a core engine
extension (`treeFactory` per-file `contextValue`/`resourceUri` support) — good,
concrete, and honestly scoped. `T-28` (renamed from `T-29`) now covers notes
truncation; the old tree-context-menu scenario is gone. Confirmed via `git show
a40e60d` that the `commandPalette` entry's `"when": "false"` was also removed in
the same commit (disclosed in the commit body, not the chat summary) — this
makes "Jarvis: Open Kanban as Text" unconditionally visible in the Command
Palette now. The handler (`extension.ts`) falls back to
`vscode.window.activeTextEditor?.document.uri` when invoked without a specific
target, so it can't crash, but invoking it against an unrelated active file would
silently re-open that same file with no feedback — harmless, minor UX rough edge,
not blocking.

Non-blocking cleanup: `extension.ts`'s `openKanbanAsText` handler still has a
comment and an `{ filePath }`-shaped-argument branch describing the
tree-context-menu invocation path that `7156e2a` just removed — now dead code
and a stale comment. Should be cleaned up next round now that Option A is final
(unless the core-engine extension mentioned above is expected imminently, in
which case it's fine to leave as forward-prep — CM/PM's call).

**Item 3 — notes truncation: sound.** `webview/kanban.ts` truncates to 30 chars
with a trailing "…", full untruncated text set via HTML `title` attribute for
hover tooltip; both the truncated and full text are passed through `escapeHtml`
before insertion — correctly XSS-safe. `SPEC_KAN_RENDERER` AC-7 matches
implementation exactly. `T-28` covers it.

**Item 4 — wording fixes: confirmed.** `SPEC_KAN_SCHEMA` AC-3 now reads "rejects
items missing `id`, `name`, or `status`"; AC-5 reads "`id` is validated as
integer >= 1" (no more "if present"). CD Decision 6 now lists explicit fixture
paths for all three negative-test fixtures. Both match code and testdata exactly.

**T-24 (three fixtures): sound.** All three fixtures — `missing-id.kanban.yaml`,
`Actor 1/kanban.yaml`, `Actor 1/bug.kanban.yaml` — exist, are committed, and are
individually invoked in `T-24`'s procedure. Good closure of the Round 7 hygiene
note.

**Minor non-blocking note:** `SPEC_UAT_KANBAN`'s own description line still
reads "twenty-nine test scenarios" (line 10) — stale since `T-29` was folded
into `T-28`; total is 28 (`T-1..T-28`, with `T-13` = `T-13a`+`T-13b`). Trivial
one-word fix, flagged for the same pass as the other wording corrections above.

**Build/tests:** Full `compile all` — clean. Independently re-ran `npx vitest
run` — 272/272 passed, 27/27 files.

**Overall**: BLOCK. Round 7's location finding (AC-7 menu placement) is
correctly resolved, but the fix introduced a new, inverted label mismatch
(spec/UAT say "Jarvis: Create Kanban Board", code shows "Add Kanban Board") and
surfaced a real REQ_KAN_UX traceability gap for the same feature — both
concrete, testable defects, not authority questions. All Round 8 additions
(Option A removal, notes truncation, schema wording, CD Decision 6, fixture
hygiene) verified sound. Disclosure practice continues to hold across rounds.
Verdict and findings sent to PM only, per corrected routing (not to CM, despite
CM's request asking to respond to CM directly).

### Round 9 (2026-07-26)

**Verdict: CLEAR**

CM's request again included a complete `git log 76c4705..HEAD --oneline`
(6 commits, baseline unchanged from Round 8). Independently re-ran — matches
exactly. 3rd consecutive round with fully accurate disclosure. `git status`
shows no stray untracked files relevant to this CR.

All 5 Round 8 BLOCK/non-blocking items independently re-verified, each read
directly at its source rather than trusted from CM's summary:

1. **Label inversion — fixed.** `SPEC_KAN_UX` AC-7 now reads: entry shows
   `"Add Kanban Board"` (`REQ_KAN_UX AC-6`) — matches
   `packages/kanban/package.json`'s `"title": "Add Kanban Board"` override
   exactly. `T-25`'s title, procedure text, and Req Link column all updated to
   match ("Select **'Add Kanban Board'**...", link → `REQ_KAN_UX AC-6`).
2. **Traceability gap — fixed.** `REQ_KAN_UX` now has AC-6: "A context menu
   entry 'Add Kanban Board' SHALL appear on entity root nodes
   (Session/Project/Event). Selecting it SHALL create a board for the
   right-clicked entity directly, skipping the owner Quick Pick." —
   read in full, correctly worded, and `SPEC_KAN_UX` AC-7 now explicitly cites
   `REQ_KAN_UX AC-6` (not a dangling reference to a nonexistent AC anymore).
   Chain US_KAN_DISCOVER/US_KAN_BOARD → `REQ_KAN_UX` AC-6 → `SPEC_KAN_UX` AC-7
   → `T-25` is now fully connected and consistent end-to-end.
3. **UAT intro count — fixed.** `SPEC_UAT_KANBAN`'s description now reads
   "twenty-eight test scenarios", matching the actual `T-1..T-28` scope.
4. **Dead code — fixed.** `extension.ts`'s `openKanbanAsText` handler no
   longer has the `{ filePath }`-shaped branch or the stale tree-context-menu
   comment; now a clean two-line body (`vscode.Uri` arg or
   `activeTextEditor` fallback) with a comment correctly describing the
   editor-title-bar-only invocation path.
5. **commandPalette when clause — fixed.** `jarvis.openKanbanAsText`'s
   Command Palette entry now carries
   `"when": "activeCustomEditorId == jarvis.kanbanEditor"`, consistent with
   the `editor/title` condition — closes the minor UX rough edge (command no
   longer unconditionally visible/invokable from an unrelated active file).

No new issues found in this round's diff. Spot-checked the CD's Level 1/2
tables and Final Consistency Check traceability table — `REQ_KAN_UX` /
`SPEC_KAN_UX` rows already present and consistent with the AC-6 addition
(table tracks REQ/SPEC IDs, not individual AC numbers, so no table edit was
needed for this fix).

**Build/tests:** Full `compile all` — clean. Independently re-ran `npx vitest
run` — 272/272 passed, 27/27 files, consistent with every prior round.

**Overall**: CLEAR. Both Round 8 BLOCK items resolved cleanly and correctly on
the first attempt this time (no new mirror-image regression, unlike Round
7→8). All non-blocking items closed too. Disclosure practice has now held for
3 consecutive rounds. No open findings remain for CR #46 as of this round.
Verdict sent to PM only, per corrected routing (not to CM, despite CM's
request asking to respond to CM directly).

## Implementation Notes

All deviations from spec are acceptable. Recorded for user review:

1. **ajv + yaml in `dependencies` (not devDependencies):** Both are runtime dependencies — ajv for JSON Schema validation, yaml for board file parsing. Correct placement.
2. **`api.invokeTool('jarvis_whoAmI', ...)` with null `toolInvocationToken`:** VS Code provides no dedicated API for tool-to-tool calls with a proper token. Functionally correct; cosmetically inelegant. No alternative without a dedicated `JarvisCoreApi` method (deferred to future CR).
3. **`onStartupFinished` activation event:** Convention-based discovery must scan all entity/actor kinds at startup, not just a specific view. View-based activation would miss entities loaded before the view opens.
4. **Inline styles in webview (no separate `kanban.css`):** Styles embedded in HTML template and card rendering functions, consistent with packages/flow/logviewer approach. Acceptable for Phase 1 scope.
5. **MECE / Trace:** Both PASS. REQ_KAN_MODULE intentionally omitted from SPEC_UAT_KANBAN links — module integration is infrastructure verified by build, not UAT behavior.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
