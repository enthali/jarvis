# Test Protocol: tree-search

**Change**: tree-search  
**Date**: 2026-04-24  
**Tester**: User (manual, Extension Development Host)  
**Verdict**: PASS (with hotfix)

## Test Results

| ID  | Description                                      | Result | Notes                                      |
|-----|--------------------------------------------------|--------|--------------------------------------------|
| T-1 | Search icon visible in Projects title bar        | PASS   |                                            |
| T-2 | Search icon visible in Events title bar          | PASS   |                                            |
| T-3 | Projects QuickPick lists all project items       | PASS   |                                            |
| T-4 | Events QuickPick lists items with date labels    | PASS   |                                            |
| T-5 | Typing filters items live                        | PASS   |                                            |
| T-6 | Selecting project reveals and focuses tree node  | PASS   | Initially FAIL — fixed by adding getParent() to ProjectTreeProvider |
| T-7 | Selecting event reveals and focuses tree node    | PASS   |                                            |
| T-8 | Escape cancels without side effects              | PASS   |                                            |

## Hotfix Applied

**Root Cause**: `TreeView.reveal()` requires `getParent()` to be implemented in the TreeDataProvider for non-root items. Both `ProjectTreeProvider` and `EventTreeProvider` were missing this method.

**Fix**: Added `getParent()` + `_findParent()` helper to both providers (commit: `fix(tree-search): add getParent() to ProjectTreeProvider and EventTreeProvider for reveal() support`).

**Impact**: None beyond tree-search — `getParent()` is only called by `TreeView.reveal()`.
