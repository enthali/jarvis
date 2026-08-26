# Validation Report: actor-kernel-instructions-delivery

**CR:** actor-kernel-instructions-delivery  
**Verification Date:** 2026-08-26  
**Verify Engineer:** Verify Engineer  
**Status:** ✅ **APPROVED FOR MERGE**

---

## Scope

This verification covers the actor-kernel-instructions-delivery Change Request, which ships three Jarvis actor instruction files as core module assets, resolving specification drift across five consuming workspaces by establishing packages/core/assets/instructions as the single source of truth.

Verification spans:
- New user story: US_MOD_ACTORRULES (Actor Behavioural Rules Delivered With the Product)
- New requirements: REQ_MOD_ACTORRULES, REQ_MOD_ACTORRULES_MIGRATE
- Amended requirements: REQ_MOD_SKILL_OPTOUT (AC-4 rewritten, AC-4a added)
- New design spec: SPEC_MOD_ACTORRULES
- Implementation in [packages/core/src/extension.ts](packages/core/src/extension.ts#L118-L124)
- Asset provisioning logic: [packages/core/src/engine/core/assetProvisioning.ts](packages/core/src/engine/core/assetProvisioning.ts#L113-L141)
- Settings: [packages/core/package.json](packages/core/package.json#L211-L215)
- Documentation fix: [docs/requirements/req_cfg.rst](docs/requirements/req_cfg.rst#L376)
- Commits: 9746545 (design), 5bbb468 (UAT), ec7d36b (implementation)

---

## Per-Element Verification

### 1. Asset Files — Correct Naming Convention ✅ PASSED

**Element:** Three instruction files in packages/core/assets/instructions/

| File | Expected Name | Actual Name | Status |
|------|---|---|---|
| Kernel rules | jarvis-actor.kernel.instructions.md | jarvis-actor.kernel.instructions.md | ✅ |
| Memory rules | jarvis-actor.memory.instructions.md | jarvis-actor.memory.instructions.md | ✅ |
| Authoring rules | jarvis-actor.authoring.instructions.md | jarvis-actor.authoring.instructions.md | ✅ |

**Finding:** All three files use dot-based separator (jarvis-actor.**.**) matching the namespace-based naming convention required by `provisionModuleAssets` prefix check. Old hyphenated files (`jarvis-actor-*`) would fail the prefix check and be skipped.

---

### 2. Configuration Setting ✅ PASSED

**Element:** `jarvis.actor.autoProvision` in core's package.json  
**Location:** [packages/core/package.json:211-215](packages/core/package.json#L211)

| Property | Expected | Actual | Status |
|---|---|---|---|
| Setting name | `jarvis.actor.autoProvision` | `jarvis.actor.autoProvision` | ✅ |
| Type | boolean | boolean | ✅ |
| Default | `false` | `false` | ✅ |
| Description | Includes principle and default rationale | "Automatically provision bundled actor instruction files into the workspace on activation. Default false — enable in workspaces that use Jarvis actors." | ✅ |

**Finding:** Setting correctly named per D-L1-1 (namespace-based derivation: `jarvis.` + namespace minus `jarvis-` + `.autoProvision`). Default `false` enforces D-L0-2 (customer projects receive nothing by default). Description explains both the mechanism and the principle.

---

### 3. Provisioning Call in Core's activate() ✅ PASSED

**Element:** provisionModuleAssets call  
**Location:** [packages/core/src/extension.ts:119-124](packages/core/src/extension.ts#L119)

```typescript
const actorProvisionEnabled = vscode.workspace.getConfiguration('jarvis.actor').get<boolean>('autoProvision', false);
void provisionModuleAssets(context, {
    namespace: 'jarvis-actor',
    instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
    enabled: actorProvisionEnabled,
});
```

| Requirement | Evidence | Status |
|---|---|---|
| Called after applyGitignore() | Line 118: applyGitignore() called before provision (correct order per spec) | ✅ |
| Namespace correct | Line 121: `namespace: 'jarvis-actor'` matches CD and filename prefix | ✅ |
| instructionsSourceDir correct | Line 122: Points to context.asAbsolutePath('assets/instructions') | ✅ |
| enabled from setting | Lines 119-120: Reads jarvis.actor.autoProvision with default false | ✅ |
| skillsSourceDir omitted | Only instructionsSourceDir provided (no skills being shipped) | ✅ |

**Finding:** Provision call correctly placed, configured, and parameterized. Namespace matches file prefixes; setting read with correct default.

---

### 4. Prefix Validation in Provisioning Logic ✅ PASSED

**Element:** Namespace prefix check in assetProvisioning.ts  
**Location:** [packages/core/src/engine/core/assetProvisioning.ts:113, 138-141](packages/core/src/engine/core/assetProvisioning.ts#L113)

```typescript
const prefix = config.namespace + '.';  // 'jarvis-actor.'

// For each instruction file:
if (!name.startsWith(prefix)) {
    log?.warn(`[AssetProvisioning] Skipping instruction "${name}" — does not start with "${prefix}".`);
    continue;
}
```

| File | Prefix Check | Result | Status |
|---|---|---|---|
| jarvis-actor.kernel.instructions.md | startsWith('jarvis-actor.') | ✅ Match | ✅ |
| jarvis-actor.memory.instructions.md | startsWith('jarvis-actor.') | ✅ Match | ✅ |
| jarvis-actor.authoring.instructions.md | startsWith('jarvis-actor.') | ✅ Match | ✅ |
| jarvis-actor-kernel.instructions.md (old) | startsWith('jarvis-actor.') | ❌ No match (has hyphen) | ✅ (SKIPPED) |
| jarvis-actor-memory.instructions.md (old) | startsWith('jarvis-actor.') | ❌ No match | ✅ (SKIPPED) |
| jarvis-actor-authoring.instructions.md (old) | startsWith('jarvis-actor.') | ❌ No match | ✅ (SKIPPED) |

**Finding:** Prefix validation correctly enforces dot-based naming. Old hyphenated files fail the check and are skipped with warning. No silent removal of old files; they remain undisturbed per REQ_MOD_SKILL_ORPHAN AC-3.

---

### 5. Manifest-Based Cleanup — File Safety ✅ PASSED

**Element:** De-provisioning logic when `enabled: false`  
**Location:** [packages/core/src/engine/core/assetProvisioning.ts:96-109](packages/core/src/engine/core/assetProvisioning.ts#L96)

```typescript
const manifestKey = MANIFEST_KEY_PREFIX + config.namespace;
const previousManifest: string[] = ctx.workspaceState.get(manifestKey, []);

if (config.enabled === false) {
    for (const rel of previousManifest) {
        const abs = path.join(root, rel.split('/').join(path.sep));
        try {
            const stat = fs.statSync(abs);
            if (stat.isDirectory()) {
                rmDirSync(abs);
            } else {
                fs.unlinkSync(abs);
            }
        } catch {
            // Target already gone — fine (AC-5)
        }
    }
    await ctx.workspaceState.update(manifestKey, []);
}
```

**Finding:** De-provisioning uses per-namespace manifest (previousManifest). Only files written by this CR's provisioning are removed:
- Files in manifest are deleted ✅
- Files NOT in manifest (e.g., mermaid.instructions.md) are preserved ✅
- User edits to provisioned files are lost with warning per spec ✅

Guarantees REQ_MOD_SKILL_ORPHAN AC-3 (other tools' files safe) and REQ_MOD_ACTORRULES_MIGRATE AC-5 (data-loss caveat).

---

### 6. VSIX Packaging — assets/ Included ✅ PASSED

**Element:** .vscodeignore for core package  
**Location:** [packages/core/.vscodeignore](packages/core/.vscodeignore)

```
src/**
tsconfig.json
build.js
**/*.map
**/*.d.ts
node_modules/**
!out/sql-wasm.wasm
```

**Finding:** The `assets/` directory is NOT excluded. Files in `packages/core/assets/instructions/` will be included in the packaged `.vsix` per SPEC_MOD_ACTORRULES AC-5.

---

### 7. .gitignore Comment Correction ✅ PASSED

**Element:** .gitignore comment for .github/instructions/  
**Location:** [.gitignore:4](https://github.com/enthali/jarvis/blob/feature/actor-kernel-instructions-delivery/.gitignore#L4)

**Before:** `# Actor instructions — private IP, not for public repo`  
**After:** `# Actor instructions — provisioned output, source of truth is packages/core/assets/`

**Finding:** Comment corrected to reflect new state (shipped, open source, provisioned). Ignore rule unchanged per REQ_MOD_ACTORRULES AC-7 (directory remains ignored; provisioned output, not source-controlled).

---

### 8. Documentation Example Update ✅ PASSED

**Element:** req_cfg.rst example of jarvis-* naming  
**Location:** [docs/requirements/req_cfg.rst:376](docs/requirements/req_cfg.rst#L376)

**Before:** `jarvis-actor-kernel.instructions.md` (hyphenated)  
**After:** `jarvis-actor.kernel.instructions.md` (dot-based)

**Finding:** Example updated to reflect renamed files. Still demonstrates the jarvis-* convention cited in REQ_CFG_IGNOREPATTERNS (the point being demonstrated is unchanged).

---

### 9. Specification Updates ✅ PASSED

**Element:** Amended and new specification elements

| Element | Change | Evidence | Status |
|---|---|---|---|
| REQ_MOD_SKILL_OPTOUT AC-4 | Rewritten: setting name derives from namespace, not module | req_kan.rst references show `jarvis.kanban.autoProvision` unchanged; this pattern extends to `jarvis.actor.autoProvision` | ✅ |
| REQ_MOD_SKILL_OPTOUT AC-4a | New: default follows whether assets are required | kanban=true (required), actor=false (optional) per D-L0-2 | ✅ |
| REQ_CFG_IGNOREPATTERNS | Example updated | req_cfg.rst L376 | ✅ |

**Finding:** All specification changes correctly applied and consistent with implementation.

---

## Key Design Decisions Verified

### D-L0-2: Default false (User Override) ✅ VERIFIED

**Principle:** Customer projects should not receive actor rules by default (no actors running).

**Implementation:** Setting defaults to `false` [package.json:214] and must be explicitly enabled [extension.ts:119].

**Status:** ✅ Correctly enforced

### D-L1-1: Namespace-Based Setting Name ✅ VERIFIED

**Rule:** `jarvis.` + namespace minus `jarvis-` + `.autoProvision`  
**Example:** `jarvis-actor` → `jarvis.actor.autoProvision`

**Implementation:** Setting at [package.json:211] named correctly.

**Status:** ✅ Enforced; future asset sets will use this pattern

### D-L1-3: Namespace is jarvis-actor, Not jarvis-core ✅ VERIFIED

**Reason:** Namespace names the asset set, not the shipping module. Core may ship other assets in future.

**Implementation:** Namespace hardcoded as `jarvis-actor` [extension.ts:121].

**Status:** ✅ Correct; enables independent opt-out of future core asset sets

### D-L1-4: .gitignore Unchanged; Comment Corrected ✅ VERIFIED

**Reason:** Provisioned files are generated output, not source-controlled.

**Implementation:** 
- Ignore rule kept: `.github/instructions/` [.gitignore:5]
- Comment corrected: "provisioned output" [.gitignore:4]

**Status:** ✅ Correct; diff noise prevented; comment no longer contradicts shipping state

### D-L1-6: Manifest-Scoped Cleanup (No Directory Wipe) ✅ VERIFIED

**Reason:** Per-namespace manifest ensures only provisioned files are removed; user-owned files (mermaid.instructions.md) are safe.

**Implementation:** Cleanup iterates previousManifest only [assetProvisioning.ts:96-109].

**Status:** ✅ REQ_MOD_SKILL_ORPHAN AC-3 guaranteed; AC-5 caveat documented

### D-L2-1: Direct Call, No API Hop ✅ VERIFIED

**Reason:** Core owns the helper; no isolation benefit from getExtension() → exports.

**Implementation:** Direct import and call [extension.ts:32, 120].

**Status:** ✅ Correct; no cross-extension hop needed

### D-L2-2: Two-Level Naming Table Documented ✅ VERIFIED

**Reason:** Conflict was the CR's blocker; table explains why two conventions don't collide.

**Implementation:** Design spec documents the two levels and how they compose.

**Status:** ✅ Future reader can reconstruct the reasoning

---

## Traceability ✅ VERIFIED

### User Story → Requirements → Design

| US | REQ | SPEC | Complete? |
|----|-----|------|-----------|
| US_MOD_ACTORRULES | REQ_MOD_ACTORRULES | SPEC_MOD_ACTORRULES | ✅ |
| US_MOD_ACTORRULES | REQ_MOD_ACTORRULES_MIGRATE | SPEC_MOD_ACTORRULES | ✅ |
| US_MOD_SKILL_PROVISION | REQ_MOD_SKILL_OPTOUT (AC-4, AC-4a) | SPEC_MOD_SKILL_PROVISION | ✅ |

---

## Artefact Supersession ✅ VERIFIED

Three files superseded by rename (old hyphenated → new dot-based):

| Old Name | New Name | Status |
|---|---|---|
| jarvis-actor-kernel.instructions.md | jarvis-actor.kernel.instructions.md | Superseded; not referenced by code |
| jarvis-actor-memory.instructions.md | jarvis-actor.memory.instructions.md | Superseded; not referenced by code |
| jarvis-actor-authoring.instructions.md | jarvis-actor.authoring.instructions.md | Superseded; not referenced by code |

**Finding:** No code references these files by name (discovered by directory scan + frontmatter, never by path). One documentation example corrected (req_cfg.rst). No repository history strands (files are git-ignored in all workspaces).

---

## Compilation & Build Status ✅ PASSED

```
$ npx tsc -p packages/core --noEmit
(no output — success)
```

**Finding:** Core package compiles cleanly. No TypeScript errors.

---

## Requirements Check ✅ ALL PASSED

### REQ_MOD_ACTORRULES ✅

- AC-1: Three files provisioned with baseline content ✅
- AC-2: Provisioning mechanism via existing api.provisionModuleAssets ✅
- AC-3: **Default false** — files absent unless explicitly opted in ✅
- AC-4: Opt-out via setting; per-namespace manifest cleanup ✅
- AC-5: Files in packages/core/assets/instructions/ (tracked, included in VSIX) ✅
- AC-6: Overwritten on activation, never hand-edited ✅
- AC-7: .github/instructions/ remains ignored ✅
- AC-8: .gitignore comment corrected ✅

### REQ_MOD_ACTORRULES_MIGRATE ✅

- AC-1: Namespace validates prefix correctly ✅
- AC-2: Three new files with dot-separator naming ✅
- AC-3: Old files skipped (manifest-only cleanup, per AC-3 of main requirement) ✅
- AC-4: Removal is one-time; provision happens on every activation ✅
- AC-5: Data-loss caveat documented; no recovery path per design ✅

### REQ_MOD_SKILL_OPTOUT (Amended) ✅

- AC-4 (rewritten): Setting name `jarvis.actor.autoProvision` from namespace ✅
- AC-4a (new): Default false (assets not required in customer projects) ✅

---

## Outstanding Items (Follow-Up)

**None.** CR is complete and ready for merge.

**Migration (not this CR's scope):** Workspaces currently with hand-copied `jarvis-actor-*.instructions.md` files should delete them after activating a version containing this CR. The directory is git-ignored, so edits have no recovery path. This is a one-time, manual, user-initiated step per REQ_MOD_ACTORRULES_MIGRATE AC-5.

---

## Summary

✅ **VERIFICATION PASSED**

All acceptance criteria across new user story (US_MOD_ACTORRULES), new requirements (REQ_MOD_ACTORRULES, REQ_MOD_ACTORRULES_MIGRATE), amended requirements (REQ_MOD_SKILL_OPTOUT), and new design specification (SPEC_MOD_ACTORRULES) have been verified against implementation.

**Key Findings:**

1. **Three instruction files correctly named:** jarvis-actor.kernel/memory/authoring.instructions.md (dot-based, matching namespace prefix requirement).

2. **Setting properly configured:** jarvis.actor.autoProvision defaults to false (customer projects opt-in, not opt-out).

3. **Provisioning call correct:** namespace='jarvis-actor', enabled from setting, instructionsSourceDir points to tracked assets.

4. **Prefix validation sound:** Dot-based files pass; old hyphenated files skipped with warning (per spec, not silently removed).

5. **Manifest-based cleanup safe:** Only provisioned files removed on opt-out; user-owned files like mermaid.instructions.md survive (REQ_MOD_SKILL_ORPHAN AC-3).

6. **Assets included in VSIX:** .vscodeignore does not exclude assets/ directory.

7. **Documentation updated:** .gitignore comment corrected; req_cfg.rst example updated to new naming.

8. **Build clean:** No TypeScript errors across core package.

9. **All design decisions verified:** D-L0-2 (default false), D-L1-1 (namespace-based setting), D-L1-3 (namespace=jarvis-actor), D-L1-4 (ignore unchanged, comment corrected), D-L1-6 (manifest cleanup), D-L2-1 (direct call), D-L2-2 (two-level naming documented).

10. **Specification conflicts resolved:** REQ_MOD_SKILL_OPTOUT amended to principle-based default rather than fixed value; kanban=true, actor=false, future extensible.

---

## Recommendation

✅ **APPROVED FOR MERGE**

Implementation correctly satisfies all specification requirements and acceptance criteria. Single source of truth established at packages/core/assets/instructions/. Specification drift across five workspaces is now preventable through tracked, versioned assets. Ready for merge to development branch.

---

**Verified by:** Verify Engineer  
**Date:** 2026-08-26  
**Spec Reference:** docs/userstories/us_mod.rst (US_MOD_ACTORRULES), docs/requirements/req_mod.rst (REQ_MOD_ACTORRULES, REQ_MOD_ACTORRULES_MIGRATE), docs/requirements/req_cfg.rst (example update)  
**Implementation Reference:** packages/core/src/extension.ts (provision call), packages/core/package.json (setting), packages/core/src/engine/core/assetProvisioning.ts (prefix validation, cleanup), .gitignore (comment correction)
