# Test Protocol: actor-kernel-instructions-delivery

**Change Request**: actor-kernel-instructions-delivery  
**Branch**: `feature/actor-kernel-instructions-delivery`  
**UAT Spec**: [SPEC_UAT_MOD_ACTORRULES](../design/spec_uat_mod_actorrules.rst)  
**Date**: 2026-08-26

---

## Execution Note

Executed as **code-based static analysis** against commit `ec7d36b`.
Evidence from `packages/core/src/extension.ts` L118-124,
`packages/core/package.json` L211-214,
`packages/core/src/engine/core/assetProvisioning.ts` (unchanged; consumed as-is),
and `.gitignore` L5-6.

Module integration (compile/package/CI) is not covered here — verified by
the Verify Engineer in `val-actor-kernel-instructions-delivery.md`.

---

## Test Scenarios

### T-1 — Default `false`: no files provisioned without opt-in

**AC**: `REQ_MOD_ACTORRULES` AC-3

**Code evidence** — `extension.ts` L119:
```typescript
const actorProvisionEnabled = vscode.workspace.getConfiguration('jarvis.actor')
    .get<boolean>('autoProvision', false);
```
`package.json` L211-214: `"jarvis.actor.autoProvision"` — `"default": false`.

When `actorProvisionEnabled` is `false`, L120-124:
```typescript
void provisionModuleAssets(context, {
    namespace: 'jarvis-actor',
    instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
    enabled: false,
});
```
`assetProvisioning.ts` — `enabled === false` → de-provision path (remove
manifest entries, return without any writes). On first activation with default,
`previousManifest` is `[]` (no prior entries) → nothing removed, nothing
written. No `jarvis-actor.*` file appears in `.github/instructions/`.

**Result**: ✅ PASS (static)

---

### T-2 — Opt-in (`true`): three files provisioned with correct names

**AC**: `REQ_MOD_ACTORRULES` AC-1, AC-2, AC-4

**Code evidence**: With `actorProvisionEnabled = true`, the provision path runs.
`instructionsSourceDir: context.asAbsolutePath('assets/instructions')` resolves
to `packages/core/assets/instructions/`.

Three files verified present (file search):
- `packages/core/assets/instructions/jarvis-actor.kernel.instructions.md`
- `packages/core/assets/instructions/jarvis-actor.memory.instructions.md`
- `packages/core/assets/instructions/jarvis-actor.authoring.instructions.md`

All three start with `jarvis-actor.` — satisfying:
- The provisioning namespace check (`startsWith('jarvis-actor.')`) — dot separator ✅
- The product-wide `jarvis-*` convention — for workspace gitignore classification ✅

No `skillsSourceDir` is passed (AC-4: instructions only, no skills). Returns
without error; three files appear in `.github/instructions/`.

**Result**: ✅ PASS (static)

---

### T-3 — Idempotency: second activation produces no writes

**AC**: `REQ_MOD_SKILL_PROVISION` AC-4 (consumed unchanged)

**Code evidence**: `assetProvisioning.ts` — instructions path:
```typescript
if (!filesEqual(srcFile, destFile)) {
    fs.copyFileSync(srcFile, destFile);
}
```
Second activation with unchanged bundle: `filesEqual` compares bytes; identical
content → returns `true` → `copyFileSync` not called → file timestamp
unchanged. The manifest is updated to the same set; no write to disk.

**Result**: ✅ PASS (static)

---

### T-4 — Opt-out: three provisioned files removed, others untouched

**AC**: `REQ_MOD_ACTORRULES` AC-5; `REQ_MOD_SKILL_OPTOUT` AC-2

**Code evidence**: `assetProvisioning.ts` — de-provision path: iterates
`previousManifest` (the three `jarvis-actor.*` paths); removes each; clears
manifest to `[]`. Files outside the manifest (e.g. `mermaid.instructions.md`)
are not in `previousManifest` and are therefore never touched by the removal
loop.

**Result**: ✅ PASS (static)

---

### T-5 — Isolation: user-authored file never touched

**AC**: `REQ_MOD_SKILL_ORPHAN` AC-3 (consumed unchanged)

**Code evidence**: `assetProvisioning.ts` — the orphan removal loop:
```typescript
for (const rel of previousManifest) {
    if (currentSet.has(rel)) { continue; }
    // remove rel
}
```
`user.custom.instructions.md` was never written by `provisionModuleAssets` for
the `jarvis-actor` namespace → it is not in `previousManifest` for that
namespace → the loop never reaches it → it is never removed, in either the
provision or de-provision pass.

**Result**: ✅ PASS (static)

---

### T-6 — Old hyphenated files NOT removed by opt-out

**AC**: `REQ_MOD_ACTORRULES_MIGRATE` AC-3

**Code evidence**: `jarvis-actor-kernel.instructions.md` (hyphen, not dot
separator) was never written by the `jarvis-actor`-namespaced call to
`provisionModuleAssets` — it does not start with `jarvis-actor.` so it was
never accepted by the namespace validation gate, and it therefore appears in no
manifest. The de-provision loop only removes entries in `previousManifest`;
this file is not one of them → it survives opt-out.

This is `REQ_MOD_SKILL_ORPHAN` AC-3 in action: *"files not in the manifest
SHALL NEVER be removed"*.

**Migration note** (documented, not asserted): until the old hyphenated files
are manually deleted, both the old and new copies apply (both have
`applyTo: "**"`), running duplicate rules. The removal is a deliberate one-time
manual step.

**Result**: ✅ PASS (static)

---

### `.gitignore` comment correction (supporting evidence)

**AC**: `REQ_MOD_ACTORRULES` AC-8

`.gitignore` L5-6 (post-fix):
```
# Actor instructions — provisioned output, source of truth is packages/core/assets/
.github/instructions/
```

The previous comment "private IP, not for public repo" has been replaced with
an accurate description of the directory's purpose. The ignore rule itself is
unchanged.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Scenario | Result |
|---|----------|--------|
| T-1 | Default `false` → no files written | ✅ PASS (static) |
| T-2 | Opt-in → 3 files with correct `jarvis-actor.` names | ✅ PASS (static) |
| T-3 | Idempotency → timestamp unchanged on second activation | ✅ PASS (static) |
| T-4 | Opt-out → 3 files removed, others untouched | ✅ PASS (static) |
| T-5 | Isolation → user-authored file survives provision + de-provision | ✅ PASS (static) |
| T-6 | Old hyphenated files NOT removed (outside manifest) | ✅ PASS (static) |
| — | `.gitignore` comment corrected | ✅ PASS (static) |

**Overall: 6 / 6 PASS**

All scenarios verified against commit `ec7d36b`.
