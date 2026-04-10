# Verification Report: self-update

**Date**: 2026-04-10
**Change Proposal**: docs/changes/self-update.md
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 5 | 5 | 0 |
| Designs | 4 | 4 | 0 |
| Implementations | 3 | 3 | 0 |
| Tests | 19 | 19 | 0 |
| Traceability | 5 | 5 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_REL_UPDATECHECK | GitHub Release Version Check | SPEC_REL_UPDATECHECK | ✅ | ✅ | ✅ |
| REQ_REL_UPDATENOTIFY | Update Notification with Actions | SPEC_REL_UPDATENOTIFY | ✅ | ✅ | ✅ |
| REQ_REL_UPDATEINSTALL | Download and Install .vsix | SPEC_REL_UPDATENOTIFY | ✅ | ✅ | ✅ |
| REQ_REL_UPDATECOMMAND | Manual Update Check Command | SPEC_REL_UPDATECOMMAND | ✅ | ✅ | ✅ |
| REQ_CFG_UPDATECHECK | Update Check Configuration | SPEC_CFG_UPDATECHECK | ✅ | ✅ | ✅ |

## Acceptance Criteria Verification

### REQ_REL_UPDATECHECK
- [x] AC-1: GET request to `api.github.com/repos/enthali/jarvis/releases/latest` with `User-Agent: Jarvis-VSCode-Extension` header → `src/updateCheck.ts` L18–21
- [x] AC-2: `tag_name` stripped of `v`, component-wise MAJOR.MINOR.PATCH comparison → `isNewer()` at `src/updateCheck.ts` L37–43
- [x] AC-3: No authentication token — only `User-Agent` header in request options → `src/updateCheck.ts` L20
- [x] AC-4: Network errors silently ignored when `silent=true` (automatic check) → `src/updateCheck.ts` L79–84

### REQ_REL_UPDATENOTIFY
- [x] AC-1: Notification message: `"Jarvis v${newVersion} is available (current: v${currentVersion})"` → `src/updateCheck.ts` L96
- [x] AC-2: "Release Notes" button opens `release.html_url` via `vscode.env.openExternal` → `src/updateCheck.ts` L101–103
- [x] AC-3: "Download & Install" button triggers download-and-install flow → `src/updateCheck.ts` L104–137
- [x] AC-4: Dismiss (undefined action) causes no further action — neither branch taken → `src/updateCheck.ts` L100–137

### REQ_REL_UPDATEINSTALL
- [x] AC-1: First `.vsix` asset selected via `release.assets.find(a => a.name.endsWith('.vsix'))` → `src/updateCheck.ts` L106
- [x] AC-2: Downloaded to `os.tmpdir() + '/' + asset.name` → `src/updateCheck.ts` L114
- [x] AC-3: Installed via `workbench.extensions.installExtension` with `vscode.Uri.file(tmpPath)` → `src/updateCheck.ts` L120–123
- [x] AC-4: Reload prompt: `"Jarvis has been updated. Reload to activate v${newVersion}."` with "Reload Now" button → `src/updateCheck.ts` L128–133
- [x] AC-5: No `.vsix` asset → error message shown and release page opened as fallback → `src/updateCheck.ts` L107–112

### REQ_REL_UPDATECOMMAND
- [x] AC-1: Command `jarvis.checkForUpdates` with title `"Jarvis: Check for Updates"` registered in `package.json` commands array; not hidden from Command Palette → `package.json`
- [x] AC-2: Calls `checkForUpdates(context, false)` which triggers the same notification flow → `src/extension.ts` L105–108
- [x] AC-3: Up-to-date message: `"Jarvis is up to date (v${currentVersion})."` shown when `silent=false` and no newer version → `src/updateCheck.ts` L89–93

### REQ_CFG_UPDATECHECK
- [x] AC-1: `jarvis.checkForUpdates` is `boolean` with `default: true` in `package.json` configuration block → `package.json`
- [x] AC-2: Automatic check gated by `getConfiguration('jarvis').get<boolean>('checkForUpdates', true)` — skipped when false → `src/extension.ts` L99–102
- [x] AC-3: Manual command registration is unconditional (outside the `if (autoCheck)` block) → `src/extension.ts` L105–108

## Test Protocol

**File**: docs/changes/tst-self-update.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_REL_UPDATECOMMAND | AC-1 | `Jarvis: Check for Updates` appears in Command Palette | PASS |
| 2 | REQ_REL_UPDATECOMMAND | AC-2 | Running command when update available shows notification | PASS |
| 3 | REQ_REL_UPDATECOMMAND | AC-3 | Running command when up-to-date shows "Jarvis is up to date (v0.1.1)." | PASS |
| 4 | REQ_CFG_UPDATECHECK | AC-1 | `jarvis.checkForUpdates` setting exists as boolean, default true | PASS |
| 5 | REQ_CFG_UPDATECHECK | AC-2 | Setting to false and reloading skips auto-check on activation | PASS |
| 6 | REQ_CFG_UPDATECHECK | AC-3 | Manual command works regardless of setting value | PASS |
| 7 | REQ_REL_UPDATECHECK | AC-1 | GET request to GitHub API with User-Agent header | PASS |
| 8 | REQ_REL_UPDATECHECK | AC-2 | tag_name stripped of `v`, component-wise comparison | PASS |
| 9 | REQ_REL_UPDATECHECK | AC-3 | No authentication token used | PASS |
| 10 | REQ_REL_UPDATECHECK | AC-4 | Network errors silently ignored in auto-check | PASS |
| 11 | REQ_REL_UPDATENOTIFY | AC-1 | Notification message format | PASS |
| 12 | REQ_REL_UPDATENOTIFY | AC-2 | Release Notes button opens html_url | PASS |
| 13 | REQ_REL_UPDATENOTIFY | AC-3 | Download & Install button triggers install flow | PASS |
| 14 | REQ_REL_UPDATENOTIFY | AC-4 | Dismiss = no action | PASS |
| 15 | REQ_REL_UPDATEINSTALL | AC-1 | First .vsix asset selected | PASS |
| 16 | REQ_REL_UPDATEINSTALL | AC-2 | Download to tmpdir | PASS |
| 17 | REQ_REL_UPDATEINSTALL | AC-3 | Install via workbench.extensions.installExtension | PASS |
| 18 | REQ_REL_UPDATEINSTALL | AC-4 | Reload prompt after install | PASS |
| 19 | REQ_REL_UPDATEINSTALL | AC-5 | No .vsix fallback opens release page | PASS |

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_REL_UPDATECHECK | SPEC_REL_UPDATECHECK | `src/updateCheck.ts` | tst-self-update #7–10 | ✅ |
| REQ_REL_UPDATENOTIFY | SPEC_REL_UPDATENOTIFY | `src/updateCheck.ts` | tst-self-update #11–14 | ✅ |
| REQ_REL_UPDATEINSTALL | SPEC_REL_UPDATENOTIFY | `src/updateCheck.ts` | tst-self-update #15–19 | ✅ |
| REQ_REL_UPDATECOMMAND | SPEC_REL_UPDATECOMMAND | `src/extension.ts`, `package.json` | tst-self-update #1–3 | ✅ |
| REQ_CFG_UPDATECHECK | SPEC_CFG_UPDATECHECK | `src/extension.ts`, `package.json` | tst-self-update #4–6 | ✅ |

**Bidirectional traceability:**
- `src/updateCheck.ts` L1–2: references `SPEC_REL_UPDATECHECK`, `SPEC_REL_UPDATENOTIFY`, `SPEC_REL_UPDATECOMMAND`, `REQ_REL_UPDATECHECK`, `REQ_REL_UPDATENOTIFY`, `REQ_REL_UPDATEINSTALL`, `REQ_REL_UPDATECOMMAND`
- `src/extension.ts` L1–2: references `SPEC_REL_UPDATECOMMAND`, `REQ_REL_UPDATECOMMAND`, `REQ_CFG_UPDATECHECK`
- `src/extension.ts` L98: inline comment references `SPEC_REL_UPDATECOMMAND`, `SPEC_CFG_UPDATECHECK`
- All SPECs link to their REQs via `:links:` directives
- All REQs link to `US_REL_SELFUPDATE` via `:links:` directives
- UAT chain: `US_UAT_SELFUPDATE` → `REQ_UAT_SELFUPDATE_TESTDATA` → `SPEC_UAT_SELFUPDATE_FILES`

## Issues Found

(none)

## Conclusion

All 5 requirements (19 acceptance criteria) are correctly implemented, match the design specifications, have complete test coverage in the test protocol (all PASSED), and have bidirectional traceability from US → REQ → SPEC → Code → Test. The implementation is ready for status promotion.

*Generated by syspilot Verify Agent*
