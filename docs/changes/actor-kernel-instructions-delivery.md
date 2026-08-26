# Change Document: actor-kernel-instructions-delivery

**Status**: design-complete
**Branch**: feature/actor-kernel-instructions-delivery
**Created**: 2026-08-26
**Author**: Project Manager
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

---

## Summary

The three Jarvis actor instruction files — `jarvis-actor-kernel`,
`jarvis-actor-memory`, `jarvis-actor-authoring` — define what a Jarvis actor
*is*: identity recovery, memory ownership, SEND/RECEIVE/RESPOND messaging,
clean-tree commit discipline, escalation, culture, memory-graph structure, and
authoring discipline. They are Jarvis-core behaviour, but Jarvis does not ship
them. They exist only as untracked hand-copied files in each consuming
workspace's `.github/instructions/`, which is gitignored in Jarvis
(`.gitignore:6`) and matched by `jarvis-*` in syspilot (`.gitignore:71`).

**Consequence, measured 2026-08-26 across five workspaces** (jarvis, syspilot,
Automobil, Assistant, sonar): the copies have diverged with no mechanism to
detect or reconcile it.

- `kernel` — four distinct versions. The most complete one (a strict superset
  containing both the "End your turn with a clean tree" section and the
  scope-escalation paragraph) exists only in Automobil.
- `authoring` — identical in four workspaces; sonar's copy predates the
  "Write the reason, not only the claim" section entirely.
- `memory` — content-identical in four workspaces; sonar's copy carries one
  rule that exists nowhere else (check memory before answering a question).

Both consuming projects already gitignore these files *as if* extension-
delivered. Nothing delivers them. That gap is the root cause of the drift.

**Fix direction.** Ship them from `jarvis-core` using the existing module
asset provisioning mechanism (`SPEC_MOD_SKILL_PROVISION`,
`api.provisionModuleAssets`) that `jarvis-kanban` already uses. Source of
truth becomes `packages/core/assets/instructions/` — tracked, and already
exempt from the `jarvis-*` ignore rule via the existing
`!packages/*/assets/**` negation, so no `.gitignore` restructuring is needed.
The provisioned copy in each workspace's `.github/instructions/` becomes pure
output: overwritten on activation, never hand-edited.

**Content baseline** (consolidation of the five observed copies, decided with
the user 2026-08-26):
- `kernel` — Automobil's version verbatim; it is a strict superset of the rest.
- `authoring` — the version common to jarvis/syspilot/Automobil/Assistant.
- `memory` — that same common version plus one added rule, reconciled with the
  document's existing "What to Store" gate rather than restating it:
  > **Memory first.** When a question about the project arises, check the
  > actor's `context.md` and its memory graph before looking elsewhere. If the
  > answer is not there and it meets the storage bar above, add it.

**Licensing/visibility decision (user, 2026-08-26).** These files were
deliberately withheld from the public repo — `.gitignore:5` still reads
"Actor Kernel instructions — private IP, not for public repo". The user has
explicitly reversed that: they are released under the project's existing MIT
license, like the rest of Jarvis. The stale `.gitignore` comment must be
corrected as part of this change so it does not contradict the new state.

**Out of scope, named so a reader can place it:** syspilot's fourth file,
`jarvis-actor-memory-repository.instructions.md`, describes syspilot's nested
private-memory-repository topology, which Jarvis does not use. It is not core,
is not shipped here, and the user is renaming it to a `syspilot-` prefix in
that project.

Acceptance criteria (user-visible):
- Installing/activating jarvis-core in a workspace provisions the three
  `jarvis-actor-*.instructions.md` files into `.github/instructions/`, with
  content matching the baseline above.
- Provisioning can be opted out of via a setting, mirroring the existing
  `jarvis.kanban.autoProvision` pattern; opting out de-provisions previously
  installed files per the existing manifest behaviour.
- The three files are tracked in the repository under
  `packages/core/assets/instructions/` and are included in the packaged
  `.vsix`.
- `.gitignore`'s "private IP, not for public repo" comment no longer
  contradicts the shipped state.
- A user who wants to add their own project-specific actor guidance writes
  their own separate instruction file; the Jarvis-delivered files are
  Jarvis-owned and overwritten on activation.

---

## Design-Time Blocker Found and Resolved

The dispatch stated "no new provisioning mechanism needed". That was correct in
the end, but only after a rename — as briefed the CR could not have worked.

**`provisionModuleAssets` validates `name.startsWith(namespace + '.')`**
([assetProvisioning.ts:114](packages/core/src/engine/core/assetProvisioning.ts#L114)).
The existing filenames use a hyphen after the namespace, so every candidate
namespace fails:

| namespace | required prefix | `jarvis-actor-kernel.instructions.md` |
|---|---|---|
| `jarvis-core` | `jarvis-core.` | ❌ |
| `jarvis-actor` | `jarvis-actor.` | ❌ |
| `jarvis` | `jarvis.` | ❌ |

All three files would have been **silently skipped** — a warning in a log, and
nothing provisioned. Verified by simulation, not by reading alone.

**Resolution (user decision, 2026-08-26): rename the files, do not relax the
rule.** The two naming conventions in play are not in conflict; they operate at
different levels and compose. See `SPEC_MOD_ACTORRULES` for the table. The
pre-convention names satisfy only the product-level rule because they predate
the module-level one — so the filenames were wrong, not the rule.

My initial recommendation was to relax the separator check. The user's question
about `jarvis.` vs `jarvis-` exposed that as the wrong call: relaxing would have
weakened a shipped, approved rule to accommodate three files that simply had not
been renamed yet.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `US_MOD_SKILL_PROVISION` and `US_MOD_INSTALL`
(`--direction in --depth 1`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MOD_SKILL_PROVISION | Module Copilot Asset Self-Provisioning | not impacted | Consumed unchanged; this CR adds a consumer, not a mechanism change |
| US_MOD_INSTALL | Install Only the Capabilities I Need | not impacted | No packaging or install-combination change |
| US_KAN_SKILL | Kanban Skill and Instructions Content | not impacted | Separate namespace, separate manifest |
| US_ACT_ACTORS | Actors | not impacted | Actor entity behaviour unchanged; this is delivery of the rules, not their content |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MOD_ACTORRULES | Actor Behavioural Rules Delivered With the Product | mandatory |

### Decisions

- D-L0-1: The story is themed `MOD`, not `ACT`. The subject is actor rules but the concern is *delivery* — bundling, provisioning, opt-out. `ACT` covers the actor entity kind; putting it there would also break the ID/file convention (`US_ACT_*` must live in `us_act.rst`).
- D-L0-2 (user decision): AC-3 states that **nothing is written unless the user opts in**. The dispatch specified a setting defaulting to `true`; the user overrode this — actor rules are meaningless in a workspace that runs no actors, and a customer project should stay free of them. Recorded as a deliberate deviation from the dispatch, not an oversight.
- D-L0-3: AC-5 requires the files to be recognisable as product-managed. Without that, someone edits the workspace copy and loses it on the next provisioning run — the copy is generated output, not source.
- D-L0-4: The story is about convergence, not novelty. The rules already exist in four repositories and have already drifted, with nothing detecting the drift. That is the harm being addressed.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_MOD_SKILL_PROVISION` governs the mechanism; this one governs one asset set carried by it.
- [x] No redundancies — no existing story covers delivery of actor rule content.
- [x] Gaps identified and addressed — the "not in customer projects" constraint is stated as an AC rather than left to the setting's default value.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MOD_SKILL_OPTOUT | US_MOD_SKILL_PROVISION | modified | AC-4 rewritten (setting name derives from *namespace*, not module); new AC-4a (default follows whether assets are required) |
| REQ_MOD_SKILL_PROVISION | US_MOD_SKILL_PROVISION | not impacted | The namespace rule stands unchanged — the filenames were corrected instead |
| REQ_MOD_SKILL_ORPHAN | US_MOD_SKILL_PROVISION | not impacted | AC-3 is what forbids auto-removing the old files; relied on, not changed |
| REQ_MOD_CORE | US_MOD_INSTALL | not impacted | AC-4 already has core exporting the helper; being a caller needs no new AC |
| REQ_KAN_SKILLCONTENT | US_KAN_SKILL | not impacted | Different namespace and manifest |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MOD_ACTORRULES | Actor Rule Set Delivery | US_MOD_ACTORRULES; REQ_MOD_SKILL_PROVISION; REQ_MOD_SKILL_OPTOUT; REQ_MOD_CORE | mandatory |
| REQ_MOD_ACTORRULES_MIGRATE | Actor Rule Set Migration | US_MOD_ACTORRULES; REQ_MOD_SKILL_ORPHAN | mandatory |

### Conflicts Detected

- ⚠️ Dispatch says `jarvis.core.autoProvision` default `true`; `REQ_MOD_SKILL_OPTOUT` AC-4 stated the convention as default `true`; the user requires these files absent from customer projects by default.
  - Resolution: setting is `jarvis.actor.autoProvision`, default `false`. AC-4 amended so the default follows a *principle* (are the assets required for the module to function?) rather than a fixed value — kanban stays `true`, actor rules are `false`. No exception clause needed.

### Decisions

- D-L1-1: The setting name derives from the **namespace**, not the module: `jarvis.` + namespace minus `jarvis-` + `.autoProvision`. This reproduces the already-shipped `jarvis.kanban.autoProvision` exactly, and yields `jarvis.actor.autoProvision` here. Naming per module would break as soon as one module ships two asset sets — which core now plausibly will.
- D-L1-2: `jarvis.actor.autoProvision` (singular) does not collide with the existing `jarvis.actors.folder` (plural). Both are legitimate under `jarvis.<area>.<setting>`; the derivation rule fixes which one this is.
- D-L1-3: Namespace `jarvis-actor`, not `jarvis-core` (user decision). The namespace names the asset set, not the shipping package — core is also heartbeat, messaging and sessions. It also keeps a future non-actor core asset set independently opt-outable, since one setting is derived per namespace.
- D-L1-4: `.gitignore` keeps ignoring `.github/instructions/` (`REQ_MOD_ACTORRULES` AC-7). With the source of truth in `packages/core/assets/instructions/`, the workspace copy is generated output. Un-ignoring it would put generated files under version control and produce diff noise on every provisioning run. Only the false comment is corrected (AC-8).
- D-L1-5: Migration is its own requirement rather than an AC on the delivery requirement. It is a one-time operational step with a different lifetime from the delivery rule, and burying it would make it easy to skip — while skipping it leaves two copies of every rule active at once.
- D-L1-6: The helper is explicitly **not** extended to delete the old files (`REQ_MOD_ACTORRULES_MIGRATE` AC-3). Letting it remove files it never wrote would void `REQ_MOD_SKILL_ORPHAN` AC-3 — the single guarantee protecting every user-authored file in that directory, including `mermaid.instructions.md`.
- D-L1-7: The data-loss note (AC-5) is mandatory content, not a courtesy. `.github/instructions/` is git-ignored, so a user's local edits there have no recovery path once superseded.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — the amended AC-4/AC-4a keeps kanban's shipped behaviour (`default true`, required assets) valid under the new principle.
- [x] No redundancies — delivery and migration are separate concerns with separate lifetimes; neither restates the provisioning mechanism.
- [x] All new REQs link to User Stories.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MOD_SKILL_PROVISION | REQ_MOD_SKILL_PROVISION | not impacted | Consumed as-is; the namespace check is satisfied by the renamed files |
| SPEC_MOD_SKILL_MANIFEST | REQ_MOD_SKILL_ORPHAN | not impacted | Per-namespace manifest handles `jarvis-actor` with no change |
| SPEC_MOD_CORE_PKG | REQ_MOD_CORE | not impacted | AC-6 already records core as exposing the helper; being a caller adds nothing to the package contract |
| SPEC_ENG_API | REQ_MOD_SKILL_PROVISION | not impacted | Core calls the helper directly, not through `JarvisCoreApi` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MOD_ACTORRULES | Actor Rule Set Provisioning | REQ_MOD_ACTORRULES, REQ_MOD_ACTORRULES_MIGRATE, SPEC_MOD_SKILL_PROVISION, SPEC_MOD_CORE_PKG |

### Conflicts Detected

None.

### Decisions

- D-L2-1: Core calls `provisionModuleAssets` **directly**, not via `JarvisCoreApi`. The cross-extension `getExtension(...).exports` hop exists because add-ons ship as separate VSIXs; core is the module that exports the helper, so routing through its own public API would add indirection for no isolation benefit.
- D-L2-2: The spec records *why the two naming conventions are not in conflict* as a table, not just the resulting filename. The conflict was the CR's blocker and the question that surfaced it was a reasonable one — a reader who cannot reconstruct the two levels will re-open it.
- D-L2-3: AC-3 names `mermaid.instructions.md` explicitly as a file that must survive an opt-out. It is owned by the MermaidChart extension, sits in the same directory, and is the concrete case that proves manifest-scoped cleanup works. A test that only checks "the three files were removed" would pass even if the directory were wiped.
- D-L2-4: The bundle ships `instructions/` only, with no `skills/` directory. `SPEC_MOD_SKILL_PROVISION` AC-2 already makes an omitted source directory a no-op, so no empty folder is needed.
- D-L2-5: The setting description states the default and the reason ("Off by default — enable in workspaces that run Jarvis actors"). The Settings UI is where a user meets this feature, and a bare boolean gives no clue why it is off.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — nothing in `SPEC_MOD_SKILL_PROVISION` or `SPEC_MOD_SKILL_MANIFEST` is altered; this is a call site plus a bundle layout.
- [x] All new SPECs link to Requirements.
- [x] Add-on onboarding preflight (`SPEC_MOD_ADDON_ONBOARDING`) checked — not applicable: no new `packages/<name>` add-on.

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MOD_ACTORRULES | REQ_MOD_ACTORRULES | SPEC_MOD_ACTORRULES | ✅ |
| US_MOD_ACTORRULES | REQ_MOD_ACTORRULES_MIGRATE | SPEC_MOD_ACTORRULES | ✅ |
| US_MOD_SKILL_PROVISION | REQ_MOD_SKILL_OPTOUT (AC-4, AC-4a) | SPEC_MOD_SKILL_PROVISION | ✅ (amended, already linked) |

Verified by impact query rather than inspection: each new element was queried
`--direction in` and returned a child.

### Implementation Checklist

Ordered, because two steps are destructive and one is easy to skip:

1. Create `packages/core/assets/instructions/` with the three renamed files at
   the settled content baselines (`REQ_MOD_ACTORRULES`).
2. Confirm `packages/core/.vscodeignore` does not exclude `assets/**`
   (`SPEC_MOD_ACTORRULES` AC-5) — assets absent from the VSIX fail only after
   packaging.
3. Contribute `jarvis.actor.autoProvision` (default `false`) in
   `packages/core/package.json`.
4. Add the `provisionModuleAssets` call in core's `activate()`.
5. Correct the `.gitignore` comment (`REQ_MOD_ACTORRULES` AC-8). Do **not**
   un-ignore the directory (AC-7).
6. **Migration, manual and one-time — per workspace, in this order.** The
   ordering matters because `jarvis.actor.autoProvision` defaults to `false`:
   installing the new version writes nothing on its own, so deleting the old
   files first would leave the workspace with no actor rules at all.

   a. Install the new version.
   b. Set `jarvis.actor.autoProvision` to `true` in the workspaces that run
      actors. Workspaces that do not are already finished — nothing was
      written and nothing needs deleting (`REQ_MOD_ACTORRULES_MIGRATE` AC-4).
   c. Confirm the three `jarvis-actor.{kernel,memory,authoring}.instructions.md`
      are present in `.github/instructions/`.
   d. Rescue any local edits to the old files first — the directory is
      git-ignored, so those edits have no recovery path
      (`REQ_MOD_ACTORRULES_MIGRATE` AC-5).
   e. Delete the three pre-convention `jarvis-actor-*.instructions.md`.

   Between (c) and (e) both sets are active simultaneously
   (`applyTo: "**"` in each), so keep that window short.

### Artefakt-Removal-Check

Three files are superseded by rename:
`jarvis-actor-{kernel,memory,authoring}.instructions.md`.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `jarvis-actor-*.instructions.md` | none — no code references them; they are applied by VS Code via `applyTo` frontmatter, not by path | **1 found and fixed:** `REQ_CFG_IGNOREPATTERNS` (req_cfg.rst:375) cited `jarvis-actor-kernel.instructions.md` as an example of a name matched by the `jarvis-*` ignore — updated to `jarvis-actor.kernel.instructions.md` | n/a — first CR to reference them |

- [x] No class (a) references exist — verified by project-wide grep; the files are discovered by directory scan and frontmatter, never by name.
- [x] Class (b): one stale example found by grep and corrected in this CR. The new name still demonstrates the point, since it also begins `jarvis-`.
- [x] Not tracked in git (`git ls-files .github/instructions/` returns zero), so no repository history strands.

### Issues Found

None open. The one blocker found during design (namespace prefix rejection) is
resolved by rename and documented above; the destructive-first-run risk is
neutralised by defaulting the setting to `false`, and what remains is the
one-time migration in step 6, which is disclosed with its data-loss caveat.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_MOD_ACTORRULES](../design/spec_uat_mod_actorrules.rst)  
**Test Protocol**: [tst-actor-kernel-instructions-delivery.md](tst-actor-kernel-instructions-delivery.md)  
**Execution date**: 2026-08-26  
**Executed by**: Test Designer (static code analysis, commit `ec7d36b`)

| # | Scenario | Result |
|---|----------|--------|
| T-1 | Default `false` → no files written | ✅ PASS |
| T-2 | Opt-in → 3 files with correct `jarvis-actor.` names | ✅ PASS |
| T-3 | Idempotency → timestamp unchanged on second activation | ✅ PASS |
| T-4 | Opt-out → 3 files removed, others untouched | ✅ PASS |
| T-5 | Isolation → user-authored file survives provision + de-provision | ✅ PASS |
| T-6 | Old hyphenated files NOT removed (outside manifest) | ✅ PASS |

**All 6 scenarios PASS.** Full evidence in
`tst-actor-kernel-instructions-delivery.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-26

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| None | — | — | No MECE issues detected; specification is internally consistent | — |

#### Detailed Verification

**Mutual Exclusivity** ✅

- `US_MOD_ACTORRULES` (actor rules delivery) ⊥ `US_MOD_SKILL_PROVISION` (provisioning mechanism) — concerns at different levels; first consumes second
- `REQ_MOD_ACTORRULES` (delivery) ⊥ `REQ_MOD_ACTORRULES_MIGRATE` (migration) — distinct lifetimes; delivery is per-activation, migration is one-time manual
- `REQ_MOD_SKILL_OPTOUT` AC-4 (setting name derives from namespace) ∩ AC-4a (default follows asset-required principle) — complementary, not contradictory; AC-4a **supersedes** the flat "default true" previously stated, and the principle is forward-extensible
- No overlap with existing `REQ_MOD_SKILL_PROVISION`, `REQ_MOD_SKILL_ORPHAN`, `REQ_MOD_CORE`

**Collective Exhaustiveness** ✅

- **L0 (US):** All acceptance criteria mapped to requirements
  - AC-1 (delivery) → `REQ_MOD_ACTORRULES` AC-1, AC-4
  - AC-2 (convergence) → `REQ_MOD_ACTORRULES` AC-2
  - AC-3 (opt-in default off) → `REQ_MOD_ACTORRULES` AC-3, `REQ_MOD_SKILL_OPTOUT` AC-4a (principle: "not required" → default false)
  - AC-4 (opt-out) → `REQ_MOD_SKILL_OPTOUT` AC-2 (via `REQ_MOD_ACTORRULES`)
  - AC-5 (recognizable) → `REQ_MOD_ACTORRULES` AC-2 (provisioned copy with data-loss note)

- **L1 (REQ):** All acceptance criteria mapped to design specifications
  - `REQ_MOD_ACTORRULES` AC-1..AC-8 → `SPEC_MOD_ACTORRULES` (bundle layout, call site, settings, ACs 1–6)
  - `REQ_MOD_ACTORRULES_MIGRATE` AC-1..AC-5 → `SPEC_MOD_ACTORRULES` (provisioning manifest behavior via links to `SPEC_MOD_SKILL_MANIFEST`)
  - `REQ_MOD_SKILL_OPTOUT` AC-4/AC-4a (amended) → `SPEC_MOD_SKILL_PROVISION` (setting name pattern), `SPEC_MOD_SKILL_MANIFEST` (enabled/disabled cleanup)

- **L2 (SPEC):** All design acceptance criteria mapped to UAT
  - `SPEC_MOD_ACTORRULES` AC-1..AC-6 → UAT (T-1, T-2, T-3, T-4, T-5)
  - `SPEC_MOD_SKILL_MANIFEST` (manifest-based cleanup) → UAT (T-4, T-5, T-6)
  - Migration isolation (`jarvis-actor.*` vs `jarvis-actor-*.instructions.md`) → UAT (T-6)

**Traceability** ✅

- **US → REQ:**
  - `US_MOD_ACTORRULES` → `REQ_MOD_ACTORRULES`, `REQ_MOD_ACTORRULES_MIGRATE` ✓
  - `US_MOD_ACTORRULES` linked from `US_MOD_SKILL_PROVISION`, `US_ACT_ACTORS` — correct positions ✓

- **REQ → SPEC:**
  - `REQ_MOD_ACTORRULES` → `SPEC_MOD_ACTORRULES` ✓
  - `REQ_MOD_ACTORRULES_MIGRATE` → `SPEC_MOD_ACTORRULES` ✓
  - Amended `REQ_MOD_SKILL_OPTOUT` links not broken; new elements in both REQs link to common SPEC ✓

- **REQ → REQ:**
  - `REQ_MOD_ACTORRULES` → `REQ_MOD_SKILL_PROVISION` (consumes), `REQ_MOD_SKILL_OPTOUT` (applies), `REQ_MOD_CORE` (helper exported) ✓
  - `REQ_MOD_ACTORRULES_MIGRATE` → `REQ_MOD_SKILL_ORPHAN` (constraint: AC-3 forbids removal of unmanifested files) ✓

- **SPEC → SPEC:**
  - `SPEC_MOD_ACTORRULES` → `SPEC_MOD_SKILL_PROVISION` (helper contract), `SPEC_MOD_SKILL_MANIFEST` (cleanup semantics), `SPEC_MOD_CORE_PKG` (core exports helper) ✓

**Contradiction Analysis** ✅

- **Default-false vs "not written unless opted in":** Consistent. `REQ_MOD_ACTORRULES` AC-3 and `REQ_MOD_SKILL_OPTOUT` AC-4a both state the same principle: actor rules are optional (workspace may not run actors) → default false. No contradiction.

- **AC-4a principle-based default vs kanban shipped behavior:** Consistent. Kanban assets are **required** (agent does not know how to read/write `kanban.yaml` without the skill) → kanban's `jarvis.kanban.autoProvision` defaults to `true`. Actor rules are **optional** (many workspaces don't run actors) → `jarvis.actor.autoProvision` defaults to `false`. The principle is extensible: future core asset sets will inherit the pattern (required→true, optional→false).

- **AC-4 (naming derivation) vs existing kanban setting:** AC-4 rewritten but **semantically preserved.** Old text: "default true". New text: "default follows whether assets are required". Kanban's behavior is unchanged (still true for required assets); the new CR interprets the principle differently for optional assets. No contradiction of prior decisions, only forward extension.

- **Migration path (install → enable → verify → delete) vs default-false:** Consistent. If default were `true`, deleting old files first would leave workspace ruleless until re-enabled. With default `false`, new version writes nothing automatically, allowing step 6b (enable) to come *after* step 6a (install), which is the safe order.

**Implementation Coverage** ✅

- Verified commit `ec7d36b` (implementation):
  - `packages/core/assets/instructions/` contains all three bundled files ✓
  - `packages/core/package.json` contributes `jarvis.actor.autoProvision`, default `false` ✓
  - `packages/core/src/extension.ts` L119–124: reads setting, calls `provisionModuleAssets` with `enabled` parameter ✓
  - `.gitignore` L5 comment corrected from "private IP" to reflect MIT licensed output ✓
  - `.vscodeignore` does not exclude `assets/**` (verified: instructions bundle will be packaged) ✓

**UAT Coverage** ✅

- All 6 test scenarios (T-1..T-6) PASS per static code analysis (tst-actor-kernel-instructions-delivery.md)
- Evidence sourced from:
  - Extension code (extension.ts L118–124, package.json L211–214)
  - Asset files (files present and named correctly)
  - Provisioning helper behavior (consumed unchanged from `REQ_MOD_SKILL_PROVISION`)
  - Manifest-based cleanup (files in `jarvis-actor` namespace manifest are removed; files outside are preserved)

**Summary**

No MECE issues detected. The CR properly partitions its concerns (delivery vs. migration), maintains traceability across all three spec levels, contains no contradictions with existing requirements or shipped behavior, and provides complete test coverage of all acceptance criteria. The amendment to `REQ_MOD_SKILL_OPTOUT` AC-4a is a forward-extension rather than a contradiction, and it is semantically consistent with the principle already embedded in kanban's opt-out behavior.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | No blocking issues identified; CR ready for merge ✅ |

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-26

#### Analysis

Independent review performed outside the MECE Engineer's Round 1 pass:

- Read the CD in full, `US_MOD_ACTORRULES` (us_mod.rst), `REQ_MOD_ACTORRULES` /
  `REQ_MOD_ACTORRULES_MIGRATE` / amended `REQ_MOD_SKILL_OPTOUT` AC-4/AC-4a
  (req_mod.rst), and `SPEC_MOD_ACTORRULES` / `SPEC_MOD_SKILL_PROVISION` /
  `SPEC_MOD_SKILL_MANIFEST` (spec_mod.rst).
- Diffed `main..feature/actor-kernel-instructions-delivery` directly (not the
  CD's description of it): `.gitignore`, `packages/core/package.json`,
  `packages/core/src/extension.ts`, the three new asset files, and
  `docs/requirements/req_cfg.rst`. Confirmed
  `packages/core/src/engine/core/assetProvisioning.ts` has **zero** diff —
  the provisioning mechanism itself is genuinely untouched, as the CD claims.
- Read `assetProvisioning.ts` end-to-end (not just the cited line range) to
  independently verify the namespace-prefix gate (`name.startsWith(namespace +
  '.')`), the de-provision path, orphan cleanup, and idempotent byte-comparison
  copy — all match `SPEC_MOD_SKILL_PROVISION` and the CD's T-1..T-6 evidence.
- Compared the three bundled files' content against this workspace's own
  currently-active (pre-migration, hyphenated) instruction files: byte-for-byte
  match on structure and content, confirming the stated content baseline
  (kernel = superset with clean-tree + escalation sections; memory = common +
  "Memory First"; authoring = unchanged common version) was actually applied,
  not just described.
- Confirmed no namespace/setting collision: grepped `packages/core/package.json`
  for `jarvis.actor.autoProvision` — one match, no `jarvis.actors.folder`
  collision.
- Checked out `feature/actor-kernel-instructions-delivery` directly (already
  the active branch) and ran `npx tsc -p packages/core` (clean) and
  `npx vitest run` (406/406 pass, no regressions).

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Process | — | Change Manager's dispatch message asked QM to "send findings to Change Manager." QM's mandate is to route all findings/verdicts to PM exclusively, never directly to CM, regardless of the dispatch's wording — this review's report is being sent to PM as usual. No spec or code defect; flagged so CM's dispatch template can be corrected to say "PM" instead of "Change Manager." | Low (process, non-blocking) |

No spec, design, or code findings. The rename-not-relax resolution to the
design-time namespace blocker is applied correctly and completely; the
default-`false` / required-vs-optional principle in `REQ_MOD_SKILL_OPTOUT`
AC-4a is a genuine forward-extension with no contradiction to kanban's shipped
`true` default; the migration checklist's install→enable→verify→delete
ordering is sound and matches the default-`false` rationale; the
`REQ_MOD_ACTORRULES_MIGRATE` AC-3 non-automation guarantee is preserved
because the helper only ever acts on its own manifest.

**Verdict: QM CLEAR.**

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 (process) | Accept-as-is for this CR; fix separately | Not a defect in this CR's scope. Routed to Change Manager directly as a standalone note to correct the dispatch template's wording ("PM" instead of "Change Manager") for future CRs. |

**Merge decision:** QM CLEAR, no blocking findings across both review rounds.
Proceeding to request user confirmation before merge, per Merge Discipline.

---

## Appendix: Link Discovery Results

```
# US_MOD_SKILL_PROVISION --direction in --depth 1
linked_from: REQ_MOD_SKILL_PROVISION, REQ_MOD_SKILL_ORPHAN, REQ_MOD_SKILL_OPTOUT,
             US_KAN_SKILL, US_UAT_SKILL_PROVISION

# US_MOD_INSTALL --direction in --depth 1
linked_from: REQ_ENG_CONTRACT, REQ_ENG_SCANNER, REQ_ENG_TOOLNS, REQ_ENG_TREEFACTORY,
             REQ_ENG_TOOLREGISTRY, US_SPL_LIFECYCLE, US_UAT_MODULAR_INSTALL,
             REQ_MOD_CORE, REQ_MOD_ADDONS, REQ_MOD_ZEROTRACE, REQ_MOD_NOMIGRATION,
             REQ_MOD_SKILL_PROVISION, US_MOD_SKILL_PROVISION

# Post-write verification of new elements (--direction in --depth 1)
US_MOD_ACTORRULES          -> REQ_MOD_ACTORRULES, REQ_MOD_ACTORRULES_MIGRATE
REQ_MOD_ACTORRULES         -> SPEC_MOD_ACTORRULES
REQ_MOD_ACTORRULES_MIGRATE -> SPEC_MOD_ACTORRULES
```

---

*Generated by syspilot Change Agent*
