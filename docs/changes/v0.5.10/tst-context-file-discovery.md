# Test Protocol: context-file-discovery

**Change Document:** docs/changes/context-file-discovery.md  
**Date:** 2026-05-07  
**Tester:** User (manual UAT in Extension Development Host)  
**Branch:** feature/context-file-discovery

## Test Results

| ID | Scenario | AC Coverage | Expected | Result |
|----|----------|-------------|----------|--------|
| T-1 | Regression: direct context.md opens (alpha) | REQ_EXP_OPENCONTEXT AC-2 | Direct context.md opens | PASS |
| T-2 | Regression: missing file → info message | REQ_EXP_OPENCONTEXT AC-6 | Info message shown | PASS |
| T-3 | Regression: button absent on folder nodes | REQ_EXP_OPENCONTEXT AC-7 | Button not displayed | PASS |
| T-4 | Regression: button visible on event nodes | REQ_EXP_OPENCONTEXT AC-1 | $(notebook) shown | PASS |
| T-5 | Regression: button alongside other inline buttons | REQ_EXP_OPENCONTEXT AC-1 | All 3 buttons visible | PASS |
| T-6 | Subfolder discovery — sub/context.md found | REQ_EXP_OPENCONTEXT AC-3 | sub/context.md opens | PASS |
| T-7 | Multiple matches → QuickPick | REQ_EXP_OPENCONTEXT AC-5 | QuickPick with pm/qm paths | PASS |
| T-8 | Hidden folders ignored | REQ_EXP_OPENCONTEXT AC-4 | Info message, no open | PASS |
| T-9 | Direct hit takes precedence | REQ_EXP_OPENCONTEXT AC-2 | Direct context.md opens, no picker | PASS |

## Summary

All 9 test cases PASS. No regressions. Subfolder discovery and QuickPick work as specified.
