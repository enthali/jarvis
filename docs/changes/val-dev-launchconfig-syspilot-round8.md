# MECE Findings: dev-launchconfig-syspilot — Round 8

**Date:** 2026-07-21
**Scope:** L1 (REQ_SPL_PACKAGE) + L2 (SPEC_SPL_PACKAGE) + code (`packages/syspilot/package.json`, `extension.ts`) + UAT tiers (T-2, T-26) + `packages/core/package.json` untouched-check
**Commits reviewed:** 4ab547b (System Designer), 15a279c (Dev Engineer), 3996864 (Test Designer)
**Status:** PASS

## 1. REQ/SPEC MECE Check

**REQ_SPL_PACKAGE (AC-1..AC-4):**

| AC | Concern | Overlap with others? |
|---|---|---|
| AC-1 | `extensionDependencies` manifest key | None |
| AC-2 | Contribution scope (own commands/settings/tools only, no core edits) | None |
| AC-3 | Zero-trace when uninstalled | None |
| AC-4 (new) | `contributes.languageModelTools` entries required for all runtime-registered LM tools | None — distinct from AC-2 (which governs *scope*, not *presence*) |

**Result:** ✅ Mutually exclusive, collectively exhaustive over the package
manifest's contribution surface (dependency declaration, contribution scope,
zero-trace, and now LM-tool declaration).

**SPEC_SPL_PACKAGE (AC-1..AC-5):**

| AC | Concern |
|---|---|
| AC-1 | `extensionDependencies` |
| AC-2 | `contributes.commands` |
| AC-3 | `contributes.configuration` |
| AC-4 | Monorepo build integration |
| AC-5 (new) | `contributes.languageModelTools` full JSON shape |

**Result:** ✅ No overlaps — AC-2/AC-3/AC-5 partition the `contributes.*`
namespace by contribution type (commands / configuration / LM tools) with no
double-coverage. Collectively exhaustive over the manifest surface actually
shipped in `package.json`.

## 2. Manifest JSON vs. SPEC_SPL_PACKAGE AC-5 — Field-by-Field

| Field | `jarvis_delaySyspilotUpdate` | `jarvis_SyspilotSkipThisVersion` | Match |
|---|---|---|---|
| `name` | `jarvis_delaySyspilotUpdate` | `jarvis_SyspilotSkipThisVersion` | ✅ exact |
| `displayName` | `Delay Syspilot Update` | `Skip This Syspilot Version` | ✅ exact |
| `toolReferenceName` | `delaySyspilotUpdate` | `SyspilotSkipThisVersion` | ✅ exact |
| `icon` | `$(watch)` | `$(debug-step-over)` | ✅ exact |
| `tags` | `["jarvis"]` | `["jarvis"]` | ✅ exact |
| `canBeReferencedInPrompt` | `true` | `true` | ✅ exact |
| `inputSchema` | `{required:["days"], properties:{days:{type:"number",...}}}` | `{type:"object",properties:{}}` | ✅ structurally identical (type/required match; description text is free-form, non-normative) |
| `modelDescription` | paraphrased vs. spec's wording | paraphrased vs. spec's wording | ⚠️ text differs (see note) |

**Note on `modelDescription`:** The shipped text differs verbatim from the
SPEC's illustrative example (e.g. spec: "Suspend syspilot update
notifications for N days. The actor invokes this when the user chooses to
delay." vs. shipped: "Delays the syspilot update prompt for N days by
suspending update notifications until then."). AC-5 requires the manifest to
declare entries "following the same **shape**" (listing required *fields*,
not verbatim text) — `modelDescription` is free-form prose, not a
character-for-character contract like `UPDATE_NOTIFICATION_TEXT`. **Not a
finding** — this is expected/acceptable variance, analogous to how
`displayName`/command titles elsewhere in this spec are illustrative rather
than exact-match requirements.

**Result:** ✅ All structurally-significant fields (`name`,
`toolReferenceName`, `inputSchema` shape, `icon`, `tags`,
`canBeReferencedInPrompt`) match exactly.

## 3. Manifest vs. `api.registerTool()` Call Sites

| Tool | Manifest `name` | `registerTool()` first arg (`extension.ts`) | Match |
|---|---|---|---|
| Delay | `jarvis_delaySyspilotUpdate` | `'jarvis_delaySyspilotUpdate'` (line 51) | ✅ |
| Skip | `jarvis_SyspilotSkipThisVersion` | `'jarvis_SyspilotSkipThisVersion'` (line 77) | ✅ |

**Result:** ✅ Runtime tool names exactly match the manifest's declared LM
tool names — VS Code will correctly associate the "Configure Tools" picker
entries with the tools actually registered at activation.

## 4. `packages/core/package.json` Untouched Check

Inspected each of the three Round 8 commits directly:

- `4ab547b` — touched only `docs/requirements/req_spl.rst` and
  `docs/design/spec_spl.rst` (2 files, 49 insertions/4 deletions).
- `15a279c` — touched only `packages/syspilot/package.json` (1 file, 16
  insertions), commit message self-documents: "Scoped strictly to
  packages/syspilot/package.json; packages/core/package.json untouched."
- `3996864` — touched only the three UAT-tier RST files (3 files, 69
  insertions/15 deletions).

**Result:** ✅ Confirmed — none of the three Round 8 commits touch
`packages/core/package.json`. (An unrelated, pre-existing diff exists between
this feature branch and `main` in `packages/core/package.json` — the
`jarvis.messages.notificationTemplate` default/description text from an
earlier, unrelated change on this same branch. Not introduced by Round 8;
out of scope for this check.)

## 5. UAT Tiers (T-2, T-26)

- **T-2** (US/REQ AC-2/SPEC): strengthened to require opening the "Configure
  Tools" picker and confirming both `#delaySyspilotUpdate` and
  `#SyspilotSkipThisVersion` appear, in addition to the pre-existing
  command/setting checks. Consistent across all three tiers.
- **T-26** (US AC-19/REQ AC-26/SPEC): new scenario — inspects
  `packages/syspilot/package.json` directly for the two
  `contributes.languageModelTools` entries (name + toolReferenceName) and
  confirms both appear in the "Configure Tools" picker. Correctly linked to
  `SPEC_SPL_PACKAGE` AC-5. SPEC scenario count updated 25→26 consistently.

**Result:** ✅ T-2/T-26 collectively exhaustive over the new manifest
surface (command presence already covered by original T-2; LM-tool presence
now covered by strengthened T-2 + dedicated T-26) with no redundant overlap
between the two scenarios (T-2 checks picker-visibility as a side effect of
general "module installed" smoke test; T-26 checks the manifest source of
truth directly plus picker-visibility as confirmation).

## 6. Quality Gates

| Gate | Result |
|---|---|
| `npx tsc -p packages/core && npx tsc -p packages/syspilot` | ✅ 0 errors |
| `npm test` (full suite) | ✅ 270/270 passing |
| Sphinx build (`-W --keep-going`) | ✅ 0 warnings |

## Findings Summary

No findings. `modelDescription` prose variance (Section 2) is noted for
completeness but does not constitute a defect — AC-5 does not mandate
verbatim text for this field.

## Verdict

**PASS.** REQ/SPEC ACs are mutually exclusive and collectively exhaustive at
both L1 and L2. Manifest JSON matches SPEC_SPL_PACKAGE AC-5 on all
structurally-significant fields and matches the runtime `registerTool()`
call sites exactly. `packages/core/package.json` is confirmed untouched by
all three Round 8 commits.
