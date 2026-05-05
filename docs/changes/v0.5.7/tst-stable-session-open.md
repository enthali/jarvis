# Test Protocol: stable-session-open

**Change Document:** docs/changes/stable-session-open.md  
**Date:** 2026-05-05  
**Tester:** User (manual UAT in Extension Development Host)  
**Branch:** develop (commit 95f0255)

## Test Results

| ID | Scenario | AC Coverage | Expected | Result |
|----|----------|-------------|----------|--------|
| T-1 | New session created for project without existing session | REQ_MSG_OPENCHAT | New chat session created and active | PASS |
| T-2 | Existing session is focused, no duplicate created | REQ_MSG_PINNED, REQ_MSG_SESSIONLOOKUP | Existing session focused, no new tab | PASS |
| T-3 | Existing session opens pinned (not in preview) | REQ_MSG_PINNED | Tab not italic, not in preview mode | PASS |
| T-4 | New session receives initialization prompt with context.md path | REQ_MSG_SENDPROMPT | Chat input contains projects/alpha/context.md path | PASS |
| T-5 | New session is renamed to entity name | REQ_MSG_AGENTSESSION | Session tab title = "alpha" after /rename | PASS |

## Summary

All 5 test cases PASS. No deviations or regressions observed.
