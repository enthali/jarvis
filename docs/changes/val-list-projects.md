# Verification Report: list-projects

**Date**: 2026-04-12  
**Change Proposal**: docs/changes/list-projects.md  
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 1 | 1 | 0 |
| Designs | 1 | 1 | 0 |
| Implementations | 2 | 2 | 0 |
| Tests | 0 | 0 | 0 |
| Traceability | 1 | 1 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_EXP_LISTPROJECTS | List Projects LM Tool | SPEC_EXP_LISTPROJECTS | ✅ | — | ✅ |

## Acceptance Criteria Verification

### REQ_EXP_LISTPROJECTS

- [x] AC-1: `jarvis_listProjects` registered via `registerDualTool()` with `canBeReferencedInPrompt: true` in `package.json` → Code: `src/extension.ts` L507
- [x] AC-2: Empty input schema — `package.json` declares `"properties": {}` and the `registerDualTool()` call passes `{}` as Zod schema → Code: `src/extension.ts` L554, `package.json` L360
- [x] AC-3: Returns array of `{ name, folder }` — `name` from `scanner.getEntity()` with fallback to `path.basename(absDir)`, `folder` as `path.relative()` with forward slashes → Code: `src/extension.ts` L518–L528
- [x] AC-4: Empty array when no projects — `collectLeaves()` returns `[]` when tree is empty, `.map()` preserves `[]` → Code: `src/extension.ts` L495–L505
- [x] AC-5: Available via MCP server — MCP handler registered in `registerDualTool()` call, returns `{ projects }` → Code: `src/extension.ts` L536–L553

## Test Protocol

**File**: docs/changes/tst-list-projects.md  
**Result**: MISSING

No test protocol found. The change was verified by code inspection against all acceptance criteria. UAT is performed by the developer session separately.

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| US_EXP_LISTPROJECTS | — | — | — | ✅ (story) |
| REQ_EXP_LISTPROJECTS | SPEC_EXP_LISTPROJECTS | `src/extension.ts`, `package.json` | — | ✅ |

## Code Verification Details

### src/extension.ts

- **Traceability comments**: Lines 1–2 include `SPEC_EXP_LISTPROJECTS` and `REQ_EXP_LISTPROJECTS`; inline comments at L493–L494 repeat both IDs ✅
- **`collectLeaves()` helper** (L495–L505): Recursively walks `TreeNode[]`, collecting `LeafNode`s — matches spec ✅
- **LM handler** (L508–L535): Reads `projectsFolder`, calls `collectLeaves(scanner.getProjectTree())`, maps to `{ name, folder }`, returns `LanguageModelToolResult` with JSON text ✅
- **MCP handler** (L536–L553): Same logic, returns `{ projects }` plain object ✅
- **Disposable**: `listProjectsTool` pushed to `context.subscriptions` at L705 ✅
- **Logging**: Both handlers log via `log.info()` with `[EXP]` tag ✅

### package.json

- **`languageModelTools`** entry (L350–L362): name `jarvis_listProjects`, displayName `List Projects`, `canBeReferencedInPrompt: true`, `toolReferenceName: listProjects`, icon `$(project)`, empty `inputSchema` ✅

### Documentation

- **US_EXP_LISTPROJECTS** in `docs/userstories/us_exp.rst`: status `approved`, 4 ACs, links to `US_EXP_SIDEBAR; US_MSG_MCPSERVER` ✅
- **REQ_EXP_LISTPROJECTS** in `docs/requirements/req_exp.rst`: status `approved`, 5 ACs, links to `US_EXP_LISTPROJECTS; REQ_EXP_YAMLDATA` ✅
- **SPEC_EXP_LISTPROJECTS** in `docs/design/spec_exp.rst`: status `approved`, links to `REQ_EXP_LISTPROJECTS; SPEC_EXP_SCANNER; SPEC_MSG_DUALREGISTRATION` ✅

## Issues Found

No blocking or medium-severity issues.

### ℹ️ Note 1: Inlined logic vs. shared helper

- **Severity**: Low
- **Category**: Code
- **Description**: The spec describes a shared `getProjectList()` helper function called by both LM and MCP handlers. The implementation inlines the logic in both handlers instead.
- **Impact**: None — functionally equivalent, code duplication is minimal (~10 lines).

### ℹ️ Note 2: Minor modelDescription wording

- **Severity**: Low
- **Category**: Design
- **Description**: Spec shows `"Returns the list of projects in the Jarvis workspace with their name and folder path. Use this to discover available projects."` but `package.json` uses `"Returns the list of projects configured in the current Jarvis workspace. Each project has a name and folder path."`.
- **Impact**: None — both convey the same meaning to LLM consumers.

## Build

```
> npm run compile
> tsc -p ./
(no errors)
```

## Recommendations

None — implementation is complete and correct.

## Conclusion

All acceptance criteria for `REQ_EXP_LISTPROJECTS` are satisfied. Traceability chain `US_EXP_LISTPROJECTS → REQ_EXP_LISTPROJECTS → SPEC_EXP_LISTPROJECTS → Code` is complete and bidirectional. The implementation follows the established `registerDualTool()` pattern used by the other five tools. Build compiles cleanly. **Verification passed.**
