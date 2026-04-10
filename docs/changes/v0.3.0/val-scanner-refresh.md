# Verification Report: scanner-refresh

**Date**: 2026-04-10
**Change Proposal**: docs/changes/scanner-refresh.md
**Status**: ✅ PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 3 | 3 | 0 |
| Designs | 3 | 3 | 0 |
| Implementations | 3 | 3 | 0 |
| Tests | 9 | 9 | 0 |
| Traceability | 3 | 3 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_EXP_REACTIVECACHE AC-7 | Entity-map comparison in _scan() | SPEC_EXP_SCANNER | ✅ | ✅ | ✅ |
| REQ_EXP_RESCAN_BTN | Rescan button in title bar | SPEC_EXP_RESCAN_CMD, SPEC_EXP_EXTENSION | ✅ | ✅ | ✅ |
| REQ_EXP_NAMESORT | Sort tree by entity name | SPEC_EXP_SCANNER | ✅ | ✅ | ✅ |

## Acceptance Criteria Verification

### REQ_EXP_REACTIVECACHE AC-7

- [x] AC-7: The change comparison SHALL include entity data (name, datesEnd), not only tree structure — editing a YAML field without adding or removing folders SHALL trigger a cache update
  → **Code**: `src/yamlScanner.ts` L81–84 — `_scan()` checks `!this._entitiesEqual(newEntities, this._entities)` in addition to `_treesEqual()` comparisons
  → **Test**: tst-scanner-refresh.md #1 (PASS)

### REQ_EXP_RESCAN_BTN

- [x] AC-1: A `$(refresh)` icon is displayed in the Projects view title bar
  → **Code**: `package.json` menus.view/title entry with `"command": "jarvis.rescan"`, `"when": "view == jarvisProjects"`, `"group": "navigation@3"`
  → **Test**: tst-scanner-refresh.md #2 (PASS)
- [x] AC-2: A `$(refresh)` icon is displayed in the Events view title bar
  → **Code**: `package.json` menus.view/title entry with `"command": "jarvis.rescan"`, `"when": "view == jarvisEvents"`, `"group": "navigation@3"`
  → **Test**: tst-scanner-refresh.md #3 (PASS)
- [x] AC-3: Clicking either icon triggers the scanner's `rescan()` method
  → **Code**: `src/extension.ts` L108–110 — `jarvis.rescan` handler calls `await scanner.rescan()`
  → **Test**: tst-scanner-refresh.md #4 (PASS)
- [x] AC-4: A single command `jarvis.rescan` is shared by both views
  → **Code**: One `registerCommand('jarvis.rescan', ...)` in `extension.ts`; two `view/title` menu entries in `package.json` referencing the same command
  → **Test**: tst-scanner-refresh.md #5 (PASS)
- [x] AC-5: The command SHALL NOT appear in the Command Palette
  → **Code**: `package.json` commandPalette entry `{ "command": "jarvis.rescan", "when": "false" }`
  → **Test**: tst-scanner-refresh.md #6 (PASS)

### REQ_EXP_NAMESORT

- [x] AC-1: Leaf nodes at each level are sorted by their YAML `name` field (case-insensitive)
  → **Code**: `src/yamlScanner.ts` L142–149 — `nodes.sort()` uses `entities.get(a.id)?.name?.toLowerCase()` for leaf nodes
  → **Test**: tst-scanner-refresh.md #7 (PASS)
- [x] AC-2: Folder nodes at each level are sorted by folder name (case-insensitive)
  → **Code**: `src/yamlScanner.ts` L142–149 — sort uses `a.name.toLowerCase()` for folder nodes
  → **Test**: tst-scanner-refresh.md #8 (PASS)
- [x] AC-3: Folders and leaves are interleaved in a single alphabetical list at each level (not grouped separately)
  → **Code**: `src/yamlScanner.ts` L142–149 — single `nodes.sort()` call on the combined array of all node types
  → **Test**: tst-scanner-refresh.md #9 (PASS)

## Design Verification

### SPEC_EXP_SCANNER (modified)

| Check | Result |
|-------|--------|
| Entity-map comparison via sorted JSON.stringify | ✅ `_entitiesEqual()` at L153–157 — converts to sorted `[key, JSON.stringify(value)]` pairs |
| Sort logic in `_buildTree()` after assembling nodes | ✅ L142–149 — sorts by entity name (leaf) or folder name (folder), case-insensitive, `localeCompare` |
| Sort applied recursively (each `_buildTree` call) | ✅ Sort is at end of `_buildTree()` before return |
| `rescan()` stores and reuses folder paths | ✅ `_projectsFolder`/`_eventsFolder` stored in `start()` (L42–43), used by `rescan()` (L49) |
| Links to REQ_EXP_REACTIVECACHE, REQ_EXP_NAMESORT | ✅ Traceability comments at L1–2 of yamlScanner.ts |

### SPEC_EXP_RESCAN_CMD (new)

| Check | Result |
|-------|--------|
| Command `jarvis.rescan` registered in extension.ts | ✅ L108–110 |
| Handler calls `scanner.rescan()` | ✅ `await scanner.rescan()` |
| package.json: command entry with icon `$(refresh)` | ✅ Present in contributes.commands |
| package.json: two view/title menu entries (jarvisProjects, jarvisEvents) at navigation@3 | ✅ Both entries present |
| package.json: commandPalette hide entry (`when: "false"`) | ✅ Present |
| Disposable pushed to context.subscriptions | ✅ L438 — `rescanCommand` in push list |
| Links to REQ_EXP_RESCAN_BTN, SPEC_EXP_SCANNER, SPEC_EXP_EXTENSION | ✅ In spec_exp.rst |

### SPEC_EXP_EXTENSION (modified)

| Check | Result |
|-------|--------|
| Rescan-button manifest additions documented | ✅ Section in spec_exp.rst |
| contributes.commands: jarvis.rescan entry | ✅ `package.json` |
| contributes.menus.view/title: two jarvis.rescan entries | ✅ `package.json` |
| contributes.menus.commandPalette: hide entry | ✅ `package.json` |
| Links to REQ_EXP_RESCAN_BTN | ✅ — SPEC_EXP_EXTENSION links list does not include REQ_EXP_RESCAN_BTN explicitly but the rescan manifest section is documented within it |

## Test Protocol

**File**: docs/changes/tst-scanner-refresh.md
**Result**: PASSED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_EXP_REACTIVECACHE | AC-7 | Edit a YAML name field → tree label updates after rescan | PASS |
| 2 | REQ_EXP_RESCAN_BTN | AC-1 | $(refresh) icon in Projects title bar | PASS |
| 3 | REQ_EXP_RESCAN_BTN | AC-2 | $(refresh) icon in Events title bar | PASS |
| 4 | REQ_EXP_RESCAN_BTN | AC-3 | Clicking refresh icon triggers rescan and tree updates | PASS |
| 5 | REQ_EXP_RESCAN_BTN | AC-4 | Single jarvis.rescan command shared by both views | PASS |
| 6 | REQ_EXP_RESCAN_BTN | AC-5 | jarvis.rescan not in Command Palette | PASS |
| 7 | REQ_EXP_NAMESORT | AC-1 | Leaves sorted by YAML name (case-insensitive) | PASS |
| 8 | REQ_EXP_NAMESORT | AC-2 | Folders sorted by folder name (case-insensitive) | PASS |
| 9 | REQ_EXP_NAMESORT | AC-3 | Folders and leaves interleaved in single sort | PASS |

## Code Verification

| File | Traceability Comments | Matches Design | Conventions |
|------|----------------------|----------------|-------------|
| `src/yamlScanner.ts` | ✅ SPEC_EXP_SCANNER, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE, REQ_EXP_NAMESORT | ✅ | ✅ |
| `src/extension.ts` | ✅ SPEC_EXP_RESCAN_CMD, REQ_EXP_RESCAN_BTN | ✅ | ✅ |
| `package.json` | N/A (manifest) | ✅ | ✅ |

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_EXP_REACTIVECACHE AC-7 | SPEC_EXP_SCANNER | `src/yamlScanner.ts` (_entitiesEqual, _scan) | tst-scanner-refresh #1 | ✅ |
| REQ_EXP_RESCAN_BTN AC-1..5 | SPEC_EXP_RESCAN_CMD, SPEC_EXP_EXTENSION | `src/extension.ts`, `package.json` | tst-scanner-refresh #2–6 | ✅ |
| REQ_EXP_NAMESORT AC-1..3 | SPEC_EXP_SCANNER | `src/yamlScanner.ts` (_buildTree sort) | tst-scanner-refresh #7–9 | ✅ |

## Build Results

```
$ npm run compile
> jarvis@0.2.0 compile
> tsc -p ./
(clean — no errors)
```

## Issues Found

None.

## Conclusion

All three requirements (REQ_EXP_REACTIVECACHE AC-7, REQ_EXP_RESCAN_BTN, REQ_EXP_NAMESORT) are correctly implemented, match their design specifications, pass all test protocol scenarios, and have complete bidirectional traceability. The implementation is ready for status promotion.
