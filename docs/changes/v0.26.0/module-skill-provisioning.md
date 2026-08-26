# Change Document: module-skill-provisioning

**Status**: merged
**Branch**: feature/module-skill-provisioning
**Created**: 2026-08-20
**Author**: Project Manager
**Operation Mode**: user-guided

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

Jarvis modules (VSIX packages: core, kanban, pim, flow, recorder, syspilot, ...)
currently have no way to ship their own Copilot Skills and Instructions files
and get them into a workspace's `.github/skills/` and `.github/instructions/`
— every such file today is either hand-authored per-repo or installed via the
syspilot-specific manual installer agent. This CR adds a generic mechanism:
a module bundles its own skill/instruction assets and self-installs (or
updates) them into the current workspace's `.github/` tree when it activates,
without clobbering user-authored files or other modules' assets, and without
leaving orphans behind when a module's own asset set changes.

Fix direction: a shared helper (likely in `packages/core`) that any module's
`activate()` calls with its own bundled asset folder path; namespaced,
idempotent writes; orphan cleanup scoped to that module's own namespace only.
Designer should evaluate `.github/agents/syspilot.installer.agent.md`'s
existing install/orphan-cleanup pattern as prior art (manual + syspilot-only
today) and the `<!-- mermaid-ai-skills:start -->` marker block in
`copilot-instructions.md` as a possible second precedent — verify its origin
(likely the separate Mermaid Chart extension, not Jarvis) before reusing it
as a model.

Acceptance criteria (draft, refine at Level 2):
- A module can declare one or more skill/instruction assets bundled in its
  own package.
- On activation, those assets are written into `.github/skills/` /
  `.github/instructions/` in the open workspace if missing or outdated.
- Files not owned by the installing module (user-authored, or another
  module's) are never touched or removed.
- When a module's own bundled asset set changes (file renamed/removed
  upstream), the previous version is cleaned up on next activation
  (no orphans) — scoped strictly to that module's own prior assets.
- No corresponding GitHub Issue — tracked as backlog item 4 on
  `.jarvis/actors/Project Manager/backlog.kanban.yaml`. Item 5
  (jarvis-kanban skill content) depends on this CR's convention and
  follows as a separate CR.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `US_MOD_INSTALL` and `US_SPL_LIFECYCLE` (`--direction in --depth 1`).
Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MOD_INSTALL | Install Only the Capabilities I Need | modified | Installing a module now also provisions its bundled AI guidance assets into `.github/`; new AC needed |
| US_SPL_LIFECYCLE | Syspilot Version Detection and Handoff | not impacted | Addresses live upstream version-sync for the syspilot agent file; orthogonal to static bundled provisioning |
| US_UAT_MODULAR_INSTALL | Modular Install Acceptance Tests | not impacted at US level | UAT scenario extensions are a Level 2 concern |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MOD_SKILL_PROVISION | As a Jarvis user who installs a module, I want that module's bundled Copilot Skill and Instructions files automatically placed in my workspace's `.github/skills/` and `.github/instructions/` on activation — and kept current as I update the module — so that I get the right AI guidance without any manual setup. | mandatory |

### Decisions

- D-L0-1: Activation-time bundled-asset provisioning (files from module VSIX, no network) is the pattern this CR defines. It is distinct from `REQ_SPL_STARTUP_CHECK`'s live upstream-fetch; neither supersedes the other.
- D-L0-2: `syspilot.installer.agent.md` is a manual, user-triggered, network-based full installer — not a Jarvis runtime primitive. It is not generalized here. What is borrowed: namespace-scoped orphan detection and idempotent-write pattern.
- D-L0-3: The `mermaid-ai-skills` marker block in `copilot-instructions.md` is owned by the MermaidChart VS Code extension, not by Jarvis. It is not a precedent for this CR.
- D-L0-4: When a module is uninstalled, its previously provisioned `.github/` files remain (VS Code has no reliable on-uninstall hook). Intentional. Orphan cleanup covers only activation-time cleanup of the module's own prior-version files.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `REQ_MOD_ZEROTRACE` targets VS Code UI surfaces (views, settings, commands, LM tools), not workspace `.github/` config files; provisioned AI guidance files are workspace artifacts, not surface contributions.
- [x] No redundancies — `US_SPL_LIFECYCLE` is about version-sync with upstream network; `US_MOD_SKILL_PROVISION` is about delivering static bundled assets on activation.
- [x] Gaps identified and addressed — uninstall behaviour explicitly scoped: files remain, user manages manually; no "remove on uninstall" requirement introduced.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above. REQ_ENG_* and REQ_MOD_NOMIGRATION
assessed as not impacted (no change to engine contract or migration behaviour).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MOD_CORE | US_MOD_INSTALL | modified | Added AC-4: core exports `provisionModuleAssets` helper |
| REQ_MOD_ADDONS | US_MOD_INSTALL | modified | Added AC-8: modules with bundled assets SHALL call the helper |
| REQ_MOD_ZEROTRACE | US_MOD_INSTALL | not impacted | Covers VS Code UI surfaces only; `.github/` config files are out of scope |
| REQ_MOD_NOMIGRATION | US_MOD_INSTALL | not impacted | No data migration involved |
| REQ_SPL_STARTUP_CHECK | US_SPL_LIFECYCLE | not impacted | Governs live network-fetch for version sync; orthogonal to bundled-asset provisioning |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MOD_SKILL_PROVISION | Module Asset Provisioning Helper | US_MOD_SKILL_PROVISION; US_MOD_INSTALL | mandatory |
| REQ_MOD_SKILL_ORPHAN | Module Asset Orphan Cleanup | US_MOD_SKILL_PROVISION | mandatory |
| REQ_MOD_SKILL_OPTOUT | Module-Owned Provisioning Opt-Out | US_MOD_SKILL_PROVISION | mandatory |

### Conflicts Detected

None.

### Decisions

- D-L1-1: Orphan cleanup is manifest-based (`workspaceState`) — not filename-pattern-based. This avoids the need for tailoring-file exclusion rules and correctly protects any user-added namespace-prefixed file the module never wrote.
- D-L1-2: The provisioning call is fire-and-forget from `activate()` (non-blocking), matching the pattern established by `REQ_SPL_STARTUP_CHECK`.
- D-L1-3: `provisionModuleAssets` takes `ExtensionContext` as first argument so the helper can own the manifest via `workspaceState`. Each module passes its own context.
- D-L1-4 (user decision, 2026-08-21): Opt-out is **per-module and module-owned**, not global. Rationale: a module's skill can be functionally required — without the kanban skill an agent does not know how to read/write `kanban.yaml` or create labels — so a global opt-out would break such a module. Core provides only the `enabled` flag; each module decides whether to surface it as `jarvis.<module>.autoProvision`. Core reads no setting itself, which also keeps `REQ_MOD_ZEROTRACE` intact.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_MOD_ZEROTRACE` targets VS Code surface contributions; `.github/` workspace files are not VS Code surface contributions. The opt-out setting is contributed by the module's own manifest, so it disappears with the module.
- [x] No redundancies — `REQ_SPL_STARTUP_CHECK` handles network-fetched version sync; the new reqs handle static VSIX-bundled assets.
- [x] All new REQs link to User Stories (`US_MOD_SKILL_PROVISION`, `US_MOD_INSTALL`).

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above (`REQ_MOD_CORE`, `REQ_MOD_ADDONS`, `--direction in --depth 1`).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENG_API | REQ_MOD_SKILL_PROVISION | modified | Added `provisionModuleAssets` to the `JarvisCoreApi` interface + AC-9 |
| SPEC_MOD_CORE_PKG | REQ_MOD_CORE | modified | Added AC-6: core exposes the provisioning helper |
| SPEC_MOD_MONOREPO | REQ_MOD_CORE, REQ_MOD_ADDONS | not impacted | No new package, no build-graph change |
| SPEC_MOD_ADDON_ONBOARDING | REQ_MOD_ADDONS | not impacted | Checklist covers mandatory registration points; asset provisioning is opt-in per module (see D-L2-4) |
| SPEC_MOD_PIM_PKG / REC / MCP / FLOW / SPL_PKG | REQ_MOD_ADDONS | not impacted | No module adopts the mechanism in this CR |
| SPEC_ENG_HEARTBEAT_JOBAPI | REQ_MOD_ADDONS | not impacted | Unrelated API surface |
| SPEC_MOD_SUITE | REQ_MOD_ADDONS | not impacted | Deprecated |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MOD_SKILL_PROVISION | Module Asset Provisioning Helper | REQ_MOD_SKILL_PROVISION, REQ_MOD_SKILL_OPTOUT, SPEC_ENG_API |
| SPEC_MOD_SKILL_MANIFEST | Provisioning Manifest & Orphan Cleanup | REQ_MOD_SKILL_ORPHAN, REQ_MOD_SKILL_OPTOUT |

### Conflicts Detected

None.

### Decisions

- D-L2-1: Assets live in `packages/<name>/assets/`, **not** the package's `.github/` — every add-on `.vscodeignore` excludes `.github/**`, so assets placed there would be silently absent from the packaged VSIX. Verified against [packages/kanban/.vscodeignore](packages/kanban/.vscodeignore).
- D-L2-2: Manifest is stored in the **calling module's** `workspaceState`, not core's. This scopes cleanup to the owning module by construction — one module physically cannot read or clear another's manifest — rather than by a rule that could be violated.
- D-L2-3: Namespace-prefix validation happens at the **write gate**, not at cleanup. An invalid asset is never written, so it is never in the manifest, so cleanup never has to reason about it.
- D-L2-4: `SPEC_MOD_ADDON_ONBOARDING` is not extended with a provisioning item. The checklist enumerates registration points a new add-on *must* satisfy; asset provisioning is optional per module, and a mandatory checklist item for an optional capability produces false failures.
- D-L2-5: Byte-level copy and byte-level comparison — no text decoding, EOL normalisation, or BOM handling. Any transformation would make the workspace file differ from its source on every activation, turning the idempotency AC into a permanent false negative.
- D-L2-6: No persisted "disabled" state. `enabled: false` empties the manifest; re-enabling then sees an empty manifest plus a full bundle and provisions everything. This removes the need for a separate restore path.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — `SPEC_SPL_STARTUP` writes one network-fetched file to `.github/agents/`; the new specs write VSIX-bundled files to `.github/skills/` and `.github/instructions/`. Disjoint target directories, disjoint sources, no shared state.
- [x] All new SPECs link to Requirements.
- [x] Add-on onboarding preflight (`SPEC_MOD_ADDON_ONBOARDING`) checked — not applicable: this CR introduces no new `packages/<name>` add-on.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MOD_SKILL_PROVISION | REQ_MOD_SKILL_PROVISION, REQ_MOD_SKILL_ORPHAN, REQ_MOD_SKILL_OPTOUT | SPEC_MOD_SKILL_PROVISION, SPEC_MOD_SKILL_MANIFEST, SPEC_ENG_API | ✅ |
| US_MOD_INSTALL (AC-7) | REQ_MOD_CORE (AC-4), REQ_MOD_ADDONS (AC-8), REQ_MOD_SKILL_PROVISION | SPEC_MOD_CORE_PKG (AC-6), SPEC_MOD_SKILL_PROVISION | ✅ |

Every new element has a parent at the level above and a child at the level below.
`REQ_MOD_SKILL_OPTOUT` is realised jointly by `SPEC_MOD_SKILL_PROVISION` (the
`enabled` flag in `ModuleAssetConfig`) and `SPEC_MOD_SKILL_MANIFEST` (the
de-provision path).

### Artefakt-Removal-Check

Not applicable — this CR removes no artefact.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-24

#### Analysis

**Traceability verified:**
- US → REQ: `US_MOD_SKILL_PROVISION` traces to `REQ_MOD_SKILL_PROVISION`, `REQ_MOD_SKILL_ORPHAN`, `REQ_MOD_SKILL_OPTOUT`; `US_MOD_INSTALL` (AC-7) links to provisioning requirements. ✅
- REQ → SPEC: Each requirement links to design specs. `REQ_MOD_SKILL_PROVISION` → `SPEC_MOD_SKILL_PROVISION`; `REQ_MOD_SKILL_ORPHAN` → `SPEC_MOD_SKILL_MANIFEST`; `REQ_MOD_SKILL_OPTOUT` → `SPEC_MOD_SKILL_PROVISION` (enabled flag) + `SPEC_MOD_SKILL_MANIFEST` (de-provision). ✅
- Modified elements properly linked: `US_MOD_INSTALL` (AC-7), `REQ_MOD_CORE` (AC-4), `REQ_MOD_ADDONS` (AC-8), `SPEC_MOD_CORE_PKG` (AC-6), `SPEC_ENG_API` (AC-9) all trace to originating requirements. ✅

**Mutual exclusivity verified:**
- `REQ_MOD_SKILL_PROVISION` (delivery mechanism: bundled assets, fire-and-forget)
- `REQ_MOD_SKILL_ORPHAN` (cleanup scoping: module's own prior assets, manifest-based)
- `REQ_MOD_SKILL_OPTOUT` (module control: per-module opt-in/out policy)
These address three distinct, non-overlapping concerns. ✅

**Collective exhaustiveness verified:**
- Asset delivery on activation: ✅ `SPEC_MOD_SKILL_PROVISION` algorithm (L3–6: write phase with idempotency)
- Orphan cleanup on activation: ✅ `SPEC_MOD_SKILL_MANIFEST` (cleanup phase: L2 read previous manifest, L2 remove stale, L3 write current)
- User control mechanism: ✅ `REQ_MOD_SKILL_OPTOUT` (enabled flag, per-module decision, de-provision path)
- Module-to-workspace isolation: ✅ `SPEC_MOD_SKILL_MANIFEST` (manifest stored in calling module's workspaceState, namespace prefix validation at write gate)
No feature aspects left unaddressed. ✅

**Orthogonality verified:**
- vs. existing specs: `SPEC_SPL_STARTUP_CHECK` (network-fetched syspilot agent file) ⊥ this CR (VSIX-bundled skill/instruction files); different sources (network vs. VSIX), different targets (`.github/agents/` vs. `.github/skills/` + `.github/instructions/`), different update timing (live sync vs. activation-time). ✅
- vs. `SPEC_MOD_ZEROTRACE`: Module asset provisioning affects workspace `.github/` files (not VS Code surface contributions); does not violate ZeroTrace. ✅
- No contradiction with `US_SPL_LIFECYCLE`, `REQ_SPL_STARTUP_CHECK`, or related specs. ✅

**Implementation coverage verified:**
- `assetProvisioning.ts`: Full algorithm (steps 1–6 per spec) implemented with error handling per asset. ✅
- `types.ts`: `ModuleAssetConfig` interface defined; matches spec exactly. ✅
- `coreApi.ts`: `provisionModuleAssets` exported on `JarvisCoreApi`; callable by add-ons. ✅
- Kanban integration: Activation hook calls the helper; namespace `jarvis-kanban`; both source directories resolved via `context.asAbsolutePath()`; opt-out setting wired (`jarvis.kanban.autoProvision`). ✅
- Assets bundled: `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` and `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md` present. ✅
- Gitignore preserved: `.vscodeignore` does not exclude `assets/**`; workspace `.gitignore` negation `!packages/*/assets/**` intact. ✅

**UAT coverage verified:**
All 8 scenarios pass (static analysis):
- T-1: First activation provisions assets. ✅
- T-2: Idempotency — unchanged bundle writes nothing (byte-level comparison). ✅
- T-3: Content update re-synchronises. ✅
- T-4: Orphan cleanup removes stale assets. ✅
- T-5: Isolation — user and other-module files untouched (manifest-scoped removals only). ✅
- T-6: Opt-out (`enabled: false`) removes provisioned assets. ✅
- T-7: Re-enable (`enabled: true`) restores full asset set. ✅
- T-8: No workspace — no error, no writes. ✅

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | No MECE issues detected. Specification is internally consistent, fully traced, and implemented correctly. | — |

---

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

Traceability independently re-verified by direct read (not solely relying on
Round 1): `US_MOD_SKILL_PROVISION` → `REQ_MOD_SKILL_PROVISION`/`REQ_MOD_SKILL_ORPHAN`/
`REQ_MOD_SKILL_OPTOUT` → `SPEC_MOD_SKILL_PROVISION`/`SPEC_MOD_SKILL_MANIFEST`/
`SPEC_ENG_API` AC-9, all read in full in `req_mod.rst`/`spec_mod.rst`/`spec_eng.rst` —
consistent, no gaps. `assetProvisioning.ts`, `types.ts`, `coreApi.ts`, and
`packages/kanban/src/extension.ts`'s wiring independently read against the spec's
6-step algorithm — matches. `packages/kanban/.vscodeignore` confirmed not excluding
`assets/**`. Full `compile all` clean; 406/406 tests re-run (40 files).

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Code-vs-Spec / cross-cutting | `SPEC_CFG_IGNOREMANAGER`, `.gitignore` | The `!packages/*/assets/**` negation was added directly inside the `# BEGIN/END JARVIS MANAGED` region of `.gitignore`, not to `WORKSPACE_PATHS`/`getIgnoreEntries()` in `configPaths.ts`. `applyGitignore()` runs unconditionally on every core activation (`extension.ts` L114) and on config changes (L180); `withRegion()` (`gitignoreManager.ts`) fully replaces the managed region's body with only `getIgnoreEntries()`'s output. The negation is not in that generator, so it is silently dropped on the next activation — at which point the pre-existing unanchored `jarvis-*` pattern (also in the managed region, matches at any depth) re-excludes `packages/kanban/assets/skills/jarvis-kanban.board/` and `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md`, i.e. the exact assets this CR exists to ship. Root cause is at the spec/impact-analysis layer: Level 2's impacted-elements table never identified `SPEC_CFG_IGNOREMANAGER`/`REQ_CFG_IGNOREPATTERNS` as impacted, so the negation was hand-patched into generated output instead of the durable generator source. Same failure class the codebase already hit twice in this exact area (`jarvis-gitignore-automanage` R1, `jarvis-gitignore-wiring-restore`). VE's val report only checked static presence of the line, not survival across a regeneration cycle. **Fix:** add the negation as a durable entry in `WORKSPACE_PATHS` (`configPaths.ts`) so `getIgnoreEntries()` emits it, then re-verify the line survives an `applyGitignore()` call. | High (blocking) |
| 2 | Code-vs-Spec | `SPEC_MOD_SKILL_PROVISION`, `assetProvisioning.ts` | The helper logs exclusively via a local `console.log` wrapper, not the DI'd `vscode.LogOutputChannel` pattern every sibling module in `packages/core/src/engine/core/` uses (`gitignoreManager.ts`'s `setIgnoreManagerLogger`, `reminders.ts`'s `setRemindersLogger`, `sessionLookup.ts`'s `setSessionLookupLogger`, `hookConfig.ts`'s `log.info`/`log.warn`). Consequences: (a) `REQ_MOD_SKILL_PROVISION` AC-2/AC-5 and the spec's "Failure handling" section both say the function "SHALL log a warning" — but every message, including genuine warnings, goes through one undifferentiated `console.log`, never `.warn()`; (b) `console.log` does not route to the Jarvis Output channel — it is only visible in the Extension Development Host's debug console, not to a real user. This directly contradicts the UAT Test Protocol's own claimed evidence for T-8 ("Jarvis Output Channel shows: `[AssetProvisioning] No workspace folder open ...`"), which does not hold for the shipped implementation. **Fix:** wire `assetProvisioning.ts` through a DI'd `vscode.LogOutputChannel` (a `setAssetProvisioningLogger`, following the established sibling pattern) and split warning-worthy messages onto `.warn()` vs `.info()` for success paths. | Medium |

---

#### PM Decision

**Decided by:** Project Manager
**Decision date:** 2026-08-24

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Fix now** | Release-blocking: the negation is silently wiped on the very next core activation, which re-excludes the exact assets this CR ships — the CR's own purpose fails on second run, not a cosmetic gap. Same failure class already hit twice before in this area, so the durable-generator fix is well-understood and low-risk. |
| 2 | **Fix now** | Not a style preference — the shipped code contradicts its own written ACs (AC-2/AC-5 "SHALL log a warning") and the UAT Test Protocol's claimed T-8 evidence doesn't hold against the real implementation. Low cost: follows an established sibling pattern already used four times in the same directory. |

SEND to CM: fix both on `feature/module-skill-provisioning`, re-run affected UAT (T-8 at minimum) and MECE/QM re-check before merge.

---

### Round 3 — MECE Re-Check (Post-QM-Fix)

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-24

#### Analysis

**Scope:** QM Round 2 fixes applied (commit `1bc5186`). Verify no new contradictions, redundancies, or traceability gaps; confirm AC-2/AC-5 ("SHALL log warning") hold structurally; check impact on existing specs.

**Fix 1 verification** (`!packages/*/assets/**` → `WORKSPACE_PATHS`):
- Change location: `configPaths.ts` WORKSPACE_PATHS array, marked `durability: 'transient'`
- Spec impact: Adds durable generator source for an entry previously hand-patched into generated output; aligns implementation with `SPEC_CFG_IGNOREMANAGER`'s data-driven design (AC-1, AC-4: region content sourced from `getIgnoreEntries()`)
- No contradiction: `SPEC_CFG_PATHRESOLVER` and `SPEC_CFG_IGNOREMANAGER` both anticipate multiple entries in WORKSPACE_PATHS; negation is a valid transient entry
- No redundancy: single entry, necessary for bundle-asset preservation
- Orthogonality: gitignore management itself is unchanged; only the source of entries is made durable
- Traceability: `getIgnoreEntries()` remains the single source of truth (REQ_CFG_PATHSINGLESOURCE AC-2); no new linkage needed

**Fix 2 verification** (logging → DI'd LogOutputChannel):
- Change location: `assetProvisioning.ts` — module-level `setAssetProvisioningLogger()` function + `log?.warn()` / `log?.info()` calls; wired in `packages/core/src/extension.ts` L113
- Spec compliance: `REQ_MOD_SKILL_PROVISION` AC-2/AC-5 both state "SHALL log a warning" for namespace violations and no-workspace cases; now fulfilled structurally (`.warn()` method enforces severity semantics)
- Orthogonality: Follows established sibling pattern (`setIgnoreManagerLogger`, `setRemindersLogger`, `setSessionLookupLogger`); no new pattern introduced
- Traceability: No spec changes needed; implementation now matches the intent of AC-2/AC-5 as written (previously the ACs and implementation were in conflict)
- No redundancy: One logger per component is the norm; the DI setup prevents module-to-module coupling

**UAT impact (T-8 re-verified)**:
- T-8 precondition: No workspace folder open
- Expected outcome: "Jarvis Output Channel shows a warning message (not an error)"
- Previous gap: `console.log` output went to Extension Development Host debug console, not Jarvis Output Channel — claimed evidence didn't hold
- Now: Line 86 calls `log?.warn()` (where `log` is the Jarvis `vscode.LogOutputChannel` from `core/extension.ts` L109) — message now correctly routes to Jarvis Output Channel ✅

**No impact on existing specifications**:
- `SPEC_MOD_SKILL_PROVISION` unchanged — only implementation corrected
- `SPEC_MOD_SKILL_MANIFEST` unchanged — only implementation corrected
- `SPEC_CFG_IGNOREMANAGER` — fix aligns implementation with spec intent, no spec change needed
- `SPEC_ENG_API` AC-9 — unchanged (still specifies the algorithm correctly)

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | **No new MECE issues introduced by QM Round 2 fixes.** Fix 1 aligns implementation with spec's data-driven design. Fix 2 resolves AC/implementation conflict without spec changes. Both fixes are additive (no removal, no re-scoping). | — |

---

### Round 4 — QM Verification of Round 2 Fixes

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

Both Round 2 fixes independently re-verified in code, not taken on CM's/MECE's word:

- Finding 1: `configPaths.ts` `WORKSPACE_PATHS` now carries `{ rel: '!packages/*/assets/**', durability: 'transient' }` after the `jarvis-*` entry, so `getIgnoreEntries()` emits it and `.gitignore`'s managed region (read directly) matches the generator's declaration order exactly. This is the durable source, not a one-off edit — confirmed it will survive any `applyGitignore()` regeneration.
- Finding 2: `assetProvisioning.ts` now has a module-level `log?: vscode.LogOutputChannel` set via `setAssetProvisioningLogger()`; no-workspace (L86) and namespace-violation (L125/L143) paths call `.warn()`, success/cleanup paths call `.info()`. `extension.ts` creates the shared `log` channel (L108) and calls `setAssetProvisioningLogger(log)` (L113) before `applyGitignore()`/hook-engine setup — correct order, matches the four sibling DI patterns exactly.

Full `compile all` clean; 406/406 tests re-run (40 files). MECE Round 3 (by MECE Engineer) independently confirms no new spec contradictions — agrees with QM's own read.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | Both Round 2 findings confirmed fixed at the root cause (durable generator entry; DI'd LogOutputChannel with correct warn/info split and wire-up order). No new issues introduced. | — |

**Verdict: QM CLEAR.**

---

## Appendix: Link Discovery Results

```
# US_MOD_INSTALL --direction in --depth 1
linked_from: REQ_ENG_CONTRACT, REQ_ENG_SCANNER, REQ_ENG_TOOLNS, REQ_ENG_TREEFACTORY,
             REQ_ENG_TOOLREGISTRY, REQ_MOD_CORE, REQ_MOD_ADDONS, REQ_MOD_ZEROTRACE,
             REQ_MOD_NOMIGRATION, US_SPL_LIFECYCLE, US_UAT_MODULAR_INSTALL

# US_SPL_LIFECYCLE --direction in --depth 1
linked_from: REQ_SPL_PACKAGE, REQ_SPL_STARTUP_CHECK, REQ_SPL_ACTOR, REQ_SPL_NOTIFY,
             REQ_SPL_SUSPEND, REQ_SPL_SKIP, REQ_SPL_MANUAL, REQ_SPL_SUPPLY_CHAIN,
             US_UAT_SPL
```

---

*Generated by syspilot Change Agent*
