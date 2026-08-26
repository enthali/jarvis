# Test Protocol: module-skill-provisioning

**Change Request**: module-skill-provisioning  
**Branch**: `feature/module-skill-provisioning`  
**UAT Spec**: [SPEC_UAT_SKILL_PROVISION](../design/spec_uat_skill_provisioning.rst)  
**Date**: 2026-08-24

---

## Execution Note

This protocol was executed as a **code-based static analysis** of the
implementation on `feature/module-skill-provisioning` commit `6a83ee0`.
Dynamic runtime verification (Extension Development Host) was not available
for this execution pass.

For each scenario the code path that would be exercised is cited; the expected
observable and the implementation evidence are both stated so that a human
tester running a live EDH can confirm or rebut the static verdict.
Scenarios that are trivially verifiable by code (T-1, T-3, T-4, T-5, T-6,
T-7, T-8) are marked **PASS (static)**. Scenario T-2 (timestamp-unchanged
idempotency check) is marked **PASS (static-inferred)** with a note on how to
confirm dynamically.

Module integration (compile, package, CI) is **not** covered here; verified
by the Verify Engineer in `val-module-skill-provisioning.md`.

---

## Test Scope

1. **First activation** — fresh workspace receives skill + instructions (T-1)
2. **Idempotency** — unchanged bundle writes nothing (T-2)
3. **Content update** — modified file re-synchronised (T-3)
4. **Orphan cleanup** — skill removed from bundle is deleted (T-4)
5. **Isolation** — user-authored and other-module files untouched (T-5)
6. **Opt-out** — `jarvis.kanban.autoProvision = false` removes assets (T-6)
7. **Re-enable** — assets restored after opt-out (T-7)
8. **No workspace** — no writes, no activation error (T-8)

---

## Test Environment

### Prerequisites

- VS Code Extension Development Host (EDH) with Jarvis from
  `feature/module-skill-provisioning` (F5 → launch profile that includes
  `core` + `kanban`)
- Workspace: any single-folder workspace with a writable root
- Jarvis Output Channel open (View → Output → Jarvis)
- `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` — present ✅
  (verified by Verify Engineer)
- `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md`
  — present ✅

### Relevant Implementation Files

| File | Role |
|------|------|
| `packages/core/src/engine/core/assetProvisioning.ts` | Helper implementation |
| `packages/kanban/src/extension.ts` L243–250 | Activation wiring + opt-out setting |
| `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` | Fixture skill |
| `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md` | Fixture instructions |

---

## Test Scenarios

### T-1 — First activation: assets provisioned

**AC**: `REQ_MOD_SKILL_PROVISION` AC-1..AC-4

**Precondition**: Workspace with no pre-existing `jarvis-kanban.*` files in
`.github/skills/` or `.github/instructions/`. Launch EDH with core + kanban.

**Steps**:
1. Confirm `.github/skills/` does not contain `jarvis-kanban.board/`.
2. Confirm `.github/instructions/` does not contain
   `jarvis-kanban.yaml.instructions.md`.
3. Activate core + kanban.
4. Wait ~2 s; check both target directories.

**Expected**:
- `.github/skills/jarvis-kanban.board/SKILL.md` created.
- `.github/instructions/jarvis-kanban.yaml.instructions.md` created.
- No activation error in Output Channel.

**Code evidence**: `assetProvisioning.ts` L114–161 — skill bundle enumerated,
namespace prefix validated (`jarvis-kanban.`), `copyDirSync` called, manifest
updated via `ctx.workspaceState.update`. Instructions copied if
`!filesEqual(srcFile, destFile)` (first time destFile absent → `filesEqual`
returns false → file is copied).

**Result**: ✅ PASS (static)

---

### T-2 — Idempotency: unchanged bundle writes nothing

**AC**: `REQ_MOD_SKILL_PROVISION` AC-3..AC-4; `SPEC_MOD_SKILL_PROVISION` AC-4

**Precondition**: From T-1 — both files provisioned and byte-identical to bundle.

**Steps**:
1. Note the last-modified timestamp of
   `.github/skills/jarvis-kanban.board/SKILL.md`.
2. Note the last-modified timestamp of
   `.github/instructions/jarvis-kanban.yaml.instructions.md`.
3. Reload VS Code window (Developer: Reload Window).
4. Wait ~2 s; inspect both file timestamps.

**Expected**:
- Both timestamps unchanged — no file was rewritten.
- Output Channel shows no new write activity.

**Code evidence**: `assetProvisioning.ts` — `filesEqual()` L20–25 reads both
buffers and calls `bufA.equals(bufB)`; returns `true` when content matches.
`copyDirSync` writes a file only if `!filesEqual(srcPath, destPath)` L31.
Instructions: `if (!filesEqual(srcFile, destFile))` L158 — condition false
when byte-identical → `copyFileSync` not called.

**Note for runtime tester**: timestamp check is the only definitive
observable. If timestamps change, the idempotency guarantee is broken.

**Result**: ✅ PASS (static-inferred)

---

### T-3 — Content update: modified file re-synchronised

**AC**: `REQ_MOD_SKILL_PROVISION` AC-3..AC-4

**Precondition**: From T-1 — both files provisioned.

**Steps**:
1. Manually edit `.github/skills/jarvis-kanban.board/SKILL.md` — append the
   line `<!-- manually edited -->`.
2. Note the last-modified timestamp.
3. Reload VS Code window.
4. Wait ~2 s; open the file.

**Expected**:
- The appended line is gone — file content matches the bundle's `SKILL.md`.
- `.github/instructions/jarvis-kanban.yaml.instructions.md` unchanged (it
  was not edited).

**Code evidence**: Edited workspace file now differs from bundle →
`filesEqual()` returns `false` → `copyDirSync` overwrites it. The
instructions file, having not been edited, still passes `filesEqual` and is
not rewritten.

**Result**: ✅ PASS (static)

---

### T-4 — Orphan cleanup: removed skill deleted on next activation

**AC**: `REQ_MOD_SKILL_ORPHAN` AC-1..AC-4; `SPEC_MOD_SKILL_MANIFEST` AC-2, AC-4

**Precondition**: From T-1 — `jarvis-kanban.board/` in workspace and recorded
in manifest.

**Steps**:
1. Remove `packages/kanban/assets/skills/jarvis-kanban.board/` from the
   repository (simulates a module update that drops this skill).
2. Recompile kanban (`npx tsc -p packages/kanban`).
3. Reload VS Code window.
4. Wait ~2 s; inspect `.github/skills/`.

**Expected**:
- `.github/skills/jarvis-kanban.board/` is removed from the workspace.
- If the instructions file was still in the bundle, it remains present.
- No activation error.

**Code evidence**: `assetProvisioning.ts` L163–177 — for each entry in
`previousManifest`, checks `currentSet.has(rel)`. With the skill folder
removed from the bundle, `currentSet` is empty for that entry; the `else`
branch calls `rmDirSync(abs)` or `fs.unlinkSync(abs)`.

**Restore step**: Re-add `packages/kanban/assets/skills/jarvis-kanban.board/`
and recompile before proceeding.

**Result**: ✅ PASS (static)

---

### T-5 — Isolation: user-authored and other-module files untouched

**AC**: `REQ_MOD_SKILL_ORPHAN` AC-3; `SPEC_MOD_SKILL_MANIFEST` AC-3

**Precondition**: Clean workspace.

**Steps**:
1. Create `testWorkspace/.github/skills/user.custom-skill/SKILL.md` (any
   content — simulates a user-authored skill).
2. Create `testWorkspace/.github/skills/other-module.some-skill/SKILL.md`
   (simulates another module's asset).
3. Launch EDH; activate core + kanban.
4. Wait ~2 s; inspect `.github/skills/`.

**Expected**:
- `jarvis-kanban.board/SKILL.md` provisioned.
- `user.custom-skill/SKILL.md` — present and unchanged.
- `other-module.some-skill/SKILL.md` — present and unchanged.

**Code evidence**: `assetProvisioning.ts` L163 — orphan removal loops only
over `previousManifest` entries. On first activation, `previousManifest` is
`[]` (L80 default). Neither `user.custom-skill` nor `other-module.some-skill`
is ever in the manifest, so neither is ever touched. This guarantee holds by
construction, not by exclusion rule.

**Result**: ✅ PASS (static)

---

### T-6 — Opt-out: `enabled: false` removes provisioned assets

**AC**: `REQ_MOD_SKILL_OPTOUT` AC-1..AC-2; `SPEC_MOD_SKILL_MANIFEST` AC-6

**Precondition**: From T-1 — kanban assets provisioned.

**Steps**:
1. Open VS Code Settings (Ctrl+,); search `jarvis.kanban.autoProvision`.
2. Set to `false`.
3. Reload VS Code window.
4. Wait ~2 s; inspect `.github/skills/` and `.github/instructions/`.

**Expected**:
- `.github/skills/jarvis-kanban.board/` removed.
- `.github/instructions/jarvis-kanban.yaml.instructions.md` removed.
- No activation error.

**Code evidence**:
- `packages/kanban/src/extension.ts` L243: reads
  `getConfiguration('jarvis.kanban').get<boolean>('autoProvision', true)`.
  With setting `false`, `autoProvision = false` → passed as `enabled: false`.
- `assetProvisioning.ts` L89: `if (config.enabled === false)` — enters
  de-provision path; L90–101: iterates `previousManifest`, removes each
  entry, clears manifest to `[]`, returns without writes.

**Result**: ✅ PASS (static)

---

### T-7 — Re-enable: assets restored after opt-out

**AC**: `REQ_MOD_SKILL_OPTOUT` AC-3; `SPEC_MOD_SKILL_MANIFEST` AC-7

**Precondition**: From T-6 — assets absent, manifest cleared.

**Steps**:
1. Open VS Code Settings; set `jarvis.kanban.autoProvision` back to `true`
   (or delete the override to restore the default).
2. Reload VS Code window.
3. Wait ~2 s; inspect `.github/skills/` and `.github/instructions/`.

**Expected**:
- `jarvis-kanban.board/SKILL.md` re-provisioned.
- `jarvis-kanban.yaml.instructions.md` re-provisioned.
- No activation error.

**Code evidence**: After T-6, `previousManifest` is `[]`. On re-enable,
`config.enabled` is not `false` → normal provision path. `previousManifest`
empty means no orphan removals; full bundle enumerated; all assets written
(absent → `filesEqual` returns `false`); manifest updated to full set.
No disabled-state flag to check — `D-L2-6` explicitly removes any such path.

**Result**: ✅ PASS (static)

---

### T-8 — No workspace: no writes, no activation error

**AC**: `REQ_MOD_SKILL_PROVISION` AC-5; `SPEC_MOD_SKILL_PROVISION` AC-5

**Precondition**: A VS Code window with no workspace folder open.

**Steps**:
1. Open a new VS Code window (File → New Window).
2. Close any open folder (File → Close Folder) if one opened by default.
3. Install/activate core + kanban in this window (or F5 from the repo with
   no workspace in the host).
4. Open Output Channel → Jarvis.

**Expected**:
- No `.github/` folder is created anywhere.
- Jarvis Output Channel shows: `[AssetProvisioning] No workspace folder open
  — skipping provisioning for "jarvis-kanban".`
- Extension activation completes without error or exception.

**Code evidence**: `assetProvisioning.ts` L84–87:
```typescript
const root = getWorkspaceRoot();
if (!root) {
    log(`No workspace folder open — skipping provisioning for "${config.namespace}".`);
    return;
}
```
`getWorkspaceRoot()` returns `undefined` when no folder is open; the early
return prevents all subsequent filesystem access.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Scenario | Result |
|---|----------|--------|
| T-1 | First activation: assets provisioned | ✅ PASS (static) |
| T-2 | Idempotency: unchanged bundle writes nothing | ✅ PASS (static-inferred) |
| T-3 | Content update: modified file re-synchronised | ✅ PASS (static) |
| T-4 | Orphan cleanup: removed skill deleted on next activation | ✅ PASS (static) |
| T-5 | Isolation: user-authored and other-module files untouched | ✅ PASS (static) |
| T-6 | Opt-out: `enabled: false` removes provisioned assets | ✅ PASS (static) |
| T-7 | Re-enable: assets restored after opt-out | ✅ PASS (static) |
| T-8 | No workspace: no writes, no activation error | ✅ PASS (static) |

**Overall: 8 / 8 PASS**

All scenarios verified against the implementation on commit `6a83ee0`.
Code evidence cited per scenario. T-2 carries a runtime note (timestamp
observable) — the static inference is sound but a live EDH run would confirm
it conclusively.
