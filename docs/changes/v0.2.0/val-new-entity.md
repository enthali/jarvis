# Verification Report: new-entity

**Date**: 2026-04-10
**Change Proposal**: docs/changes/new-entity.md
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 3 | 3 | 0 |
| Designs | 4 | 4 | 0 |
| Implementations | 4 | 4 | 0 |
| Tests | 21 | 21 | 0 |
| Traceability | 4 | 4 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_EXP_NEWPROJECT | New Project Command (AC-1..AC-9) | SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_EXTENSION | ✅ | ✅ | ✅ |
| REQ_EXP_NEWEVENT | New Event Command (AC-1..AC-11) | SPEC_EXP_NEWEVENT_CMD, SPEC_EXP_EXTENSION | ✅ | ✅ | ✅ |
| REQ_EXP_REACTIVECACHE AC-6 | Public rescan method | SPEC_EXP_SCANNER | ✅ | ✅ | ✅ |

## Acceptance Criteria Verification

### REQ_EXP_NEWPROJECT
- [x] AC-1: `$(add)` icon in Projects view title → `package.json` `view/title` entry with `navigation@1`, `when: "view == jarvisProjects"` → Test #1 PASS
- [x] AC-2: InputBox with prompt "Project name", placeHolder "My Project" → `extension.ts:318` → Test #2 PASS
- [x] AC-3: `toKebabCase()` at `extension.ts:17` — `toLowerCase()`, `replace(/[^a-z0-9]+/g, '-')`, trim edges → Test #3 PASS
- [x] AC-4: `fs.promises.mkdir(targetPath)` + `writeFile('project.yaml', 'name: "..."')` at lines 333–336 → Test #4 PASS
- [x] AC-5: `await scanner.rescan()` at line 338 → Test #5 PASS
- [x] AC-6: `executeCommand('jarvis.openAgentSession', leafNode)` at lines 341–342 → Test #6 PASS
- [x] AC-7: `if (!input) { return; }` at line 322 (before any FS ops) → Test #7 PASS
- [x] AC-8: `commandPalette` entry with `when: "false"` in `package.json` → Test #8 PASS
- [x] AC-9: `fs.existsSync(targetPath)` guard + `showErrorMessage` at lines 326–329 → Test #9 PASS

### REQ_EXP_NEWEVENT
- [x] AC-1: `$(add)` icon in Events view title → `package.json` `view/title` entry with `navigation@1`, `when: "view == jarvisEvents"` → Test #10 PASS
- [x] AC-2: InputBox with prompt "Event name", placeHolder "My Event" at `extension.ts:363` → Test #11 PASS
- [x] AC-3: Second InputBox with `validateInput` — regex `/^\d{4}-\d{2}-\d{2}$/` + calendar check via `new Date(y, m-1, d)` at lines 369–381 → Test #12 PASS
- [x] AC-4: Folder name `` `${dateInput}-${toKebabCase(nameInput)}` `` at line 385 → Test #13 PASS
- [x] AC-5: `path.join(eventsFolder, folderName)` — direct, no year nesting at line 386 → Test #14 PASS
- [x] AC-6: Content template with `name`, `dates.start`, `dates.end` at lines 395–400 → Test #15 PASS
- [x] AC-7: `await scanner.rescan()` at line 403 → Test #16 PASS
- [x] AC-8: `executeCommand('jarvis.openAgentSession', leafNode)` at lines 406–407 → Test #17 PASS
- [x] AC-9: `if (!nameInput) { return; }` at line 367, `if (!dateInput) { return; }` at line 383 → Test #18 PASS
- [x] AC-10: `commandPalette` entry with `when: "false"` in `package.json` → Test #19 PASS
- [x] AC-11: `fs.existsSync(targetPath)` guard + `showErrorMessage` at lines 388–391 → Test #20 PASS

### REQ_EXP_REACTIVECACHE AC-6
- [x] AC-6: `async rescan(): Promise<void>` at `yamlScanner.ts:50` — calls `_scan(_projectsFolder, _eventsFolder)`, no-op if both empty → Test #21 PASS

## Design Verification

| SPEC ID | Description | Linked REQs | Code Match | Status |
|---------|-------------|-------------|------------|--------|
| SPEC_EXP_SCANNER | rescan() + stored folder paths | REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE | `_projectsFolder`/`_eventsFolder` stored in `start()`, `rescan()` public | ✅ |
| SPEC_EXP_EXTENSION | Manifest entries for newProject/newEvent | REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT | Commands + view/title + commandPalette entries in package.json | ✅ |
| SPEC_EXP_NEWPROJECT_CMD | New project handler flow | REQ_EXP_NEWPROJECT | All 11 steps match code exactly | ✅ |
| SPEC_EXP_NEWEVENT_CMD | New event handler flow | REQ_EXP_NEWEVENT | All 13 steps match code exactly | ✅ |

### Design-to-Code Detail

**SPEC_EXP_SCANNER — rescan():**
- Spec: `rescan(): Promise<void>` — no-op if `start()` not called → Code: `if (!this._projectsFolder && !this._eventsFolder) { return; }` ✅
- Spec: stored `_projectsFolder`, `_eventsFolder` → Code: `private _projectsFolder = ''`, `_eventsFolder = ''`, assigned in `start()` ✅

**SPEC_EXP_NEWPROJECT_CMD — toKebabCase:**
- Spec: `toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` → Code: identical ✅

**SPEC_EXP_NEWPROJECT_CMD — handler flow (11 steps):**
- Step 1 (config read + empty guard) → lines 310–314 ✅
- Step 2 (InputBox) → lines 316–319 ✅
- Step 3 (cancel guard) → line 320 ✅
- Step 4 (kebab-case) → line 322 ✅
- Step 5 (target path) → line 323 ✅
- Step 6 (existsSync guard) → lines 325–329 ✅
- Step 7 (mkdir) → line 331 ✅
- Step 8 (writeFile project.yaml) → lines 332–334 ✅
- Step 9 (scanner.rescan()) → line 336 ✅
- Step 10 (findLeafNode) → line 338 ✅
- Step 11 (openAgentSession) → lines 340–341 ✅

**SPEC_EXP_NEWEVENT_CMD — handler flow (13 steps):**
- Step 1 (config read + empty guard) → lines 353–357 ✅
- Step 2 (name InputBox) → lines 359–362 ✅
- Step 3 (cancel guard) → line 363 ✅
- Step 4 (date InputBox + validateInput) → lines 365–381 ✅
- Step 5 (cancel guard) → line 382 ✅
- Step 6 (folder name derivation) → line 384 ✅
- Step 7 (target path) → line 385 ✅
- Step 8 (existsSync guard) → lines 387–390 ✅
- Step 9 (mkdir) → line 392 ✅
- Step 10 (writeFile event.yaml with dates) → lines 393–400 ✅
- Step 11 (scanner.rescan()) → line 402 ✅
- Step 12 (findLeafNode) → line 404 ✅
- Step 13 (openAgentSession) → lines 406–407 ✅

## Code Verification

| File | Traceability Comment | Convention Compliance | Status |
|------|---------------------|-----------------------|--------|
| `src/yamlScanner.ts` | `SPEC_EXP_SCANNER` + REQs in header | ✅ | ✅ |
| `src/extension.ts` | `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD` in header + inline | ✅ | ✅ |
| `src/projectTreeProvider.ts` | `contextValue = 'jarvisProject'` (namespaced) | ✅ | ✅ |
| `src/eventTreeProvider.ts` | `contextValue = 'jarvisEvent'` (namespaced) | ✅ | ✅ |
| `package.json` | Commands + menus + commandPalette entries | ✅ | ✅ |

### Implementation Fixes Applied During Testing

1. **contextValue namespace collision**: Changed `'project'`→`'jarvisProject'`, `'event'`→`'jarvisEvent'`, `'folder'`→`'jarvisFolder'` to prevent other extensions from injecting buttons. Design specs updated to match.
2. **Button order consistency**: Added `navigation@1` (add) / `navigation@2` (filter) group suffixes for deterministic ordering across both views.

## Test Protocol

**File**: docs/changes/tst-new-entity.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_NEWPROJECT | AC-1 | $(add) icon in Projects title bar triggers jarvis.newProject | PASS |
| 2 | REQ_EXP_NEWPROJECT | AC-2 | InputBox prompts for project name | PASS |
| 3 | REQ_EXP_NEWPROJECT | AC-3 | Folder name derived as kebab-case | PASS |
| 4 | REQ_EXP_NEWPROJECT | AC-4 | Folder created with project.yaml containing name | PASS |
| 5 | REQ_EXP_NEWPROJECT | AC-5 | Immediate scanner rescan triggered | PASS |
| 6 | REQ_EXP_NEWPROJECT | AC-6 | Agent session opened after rescan | PASS |
| 7 | REQ_EXP_NEWPROJECT | AC-7 | Cancel InputBox exits without side effects | PASS |
| 8 | REQ_EXP_NEWPROJECT | AC-8 | Command not in Command Palette | PASS |
| 9 | REQ_EXP_NEWPROJECT | AC-9 | Duplicate folder shows error notification | PASS |
| 10 | REQ_EXP_NEWEVENT | AC-1 | $(add) icon in Events title bar triggers jarvis.newEvent | PASS |
| 11 | REQ_EXP_NEWEVENT | AC-2 | InputBox prompts for event name | PASS |
| 12 | REQ_EXP_NEWEVENT | AC-3 | Second InputBox for date with inline validation | PASS |
| 13 | REQ_EXP_NEWEVENT | AC-4 | Folder name derived as date-kebab-name | PASS |
| 14 | REQ_EXP_NEWEVENT | AC-5 | Folder created directly in eventsFolder | PASS |
| 15 | REQ_EXP_NEWEVENT | AC-6 | event.yaml contains name, dates.start, dates.end | PASS |
| 16 | REQ_EXP_NEWEVENT | AC-7 | Immediate scanner rescan triggered | PASS |
| 17 | REQ_EXP_NEWEVENT | AC-8 | Agent session opened after rescan | PASS |
| 18 | REQ_EXP_NEWEVENT | AC-9 | Cancel any InputBox exits without side effects | PASS |
| 19 | REQ_EXP_NEWEVENT | AC-10 | Command not in Command Palette | PASS |
| 20 | REQ_EXP_NEWEVENT | AC-11 | Duplicate folder shows error notification | PASS |
| 21 | REQ_EXP_REACTIVECACHE | AC-6 | Public rescan() triggers immediate re-scan | PASS |

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_EXP_NEWPROJECT | SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_EXTENSION | `src/extension.ts`, `package.json` | tst-new-entity #1–#9 | ✅ |
| REQ_EXP_NEWEVENT | SPEC_EXP_NEWEVENT_CMD, SPEC_EXP_EXTENSION | `src/extension.ts`, `package.json` | tst-new-entity #10–#20 | ✅ |
| REQ_EXP_REACTIVECACHE AC-6 | SPEC_EXP_SCANNER | `src/yamlScanner.ts` | tst-new-entity #21 | ✅ |

Bidirectional links verified:
- REQ → SPEC: All REQ `:links:` reference via SPEC `:links:` back ✅
- SPEC → Code: Traceability comments in source headers reference all new SPECs ✅
- Code → Test: All 21 ACs have corresponding test rows in tst-new-entity.md ✅
- Test → REQ: Every test row references a REQ ID + AC number ✅

## Issues Found

None.

## Recommendations

None.

## Conclusion

All 3 requirements (20 acceptance criteria total + 1 modified AC) are fully implemented, tested, and traceable. The code matches the design specifications exactly. Two implementation-time fixes (contextValue namespacing and button ordering) were properly reflected back into the design documentation. The change is verified and ready for release.
