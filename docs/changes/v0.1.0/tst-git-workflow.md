# Test Protocol: git-workflow

**Date**: 2025-07-23
**Change Document**: docs/changes/git-workflow.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_REL_BRANCHNAMING | AC-1 | Branch name starts with `feature/` | PASS |
| 2 | REQ_REL_BRANCHNAMING | AC-2 | Suffix matches Change Document name | PASS |
| 3 | REQ_REL_AGENTPOLICY | AC-1 | Release Agent documents squash merge command | PASS |
| 4 | REQ_REL_AGENTPOLICY | AC-2 | Release Agent notes no-push rule after merging | PASS |
| 5 | REQ_REL_BRANCHRETENTION | AC-1 | Feature branch kept in local git history after merge | PASS |
| 6 | REQ_REL_BRANCHRETENTION | AC-2 | Branch never pushed to origin after merging | PASS |
| 7 | REQ_REL_NOHOTFIX | AC-1 | copilot-instructions.md states no direct commits to main | PASS |
| 8 | REQ_REL_NOHOTFIX | AC-2 | Hotfixes explicitly listed as requiring Change process | PASS |
| 9 | REQ_DEV_CONVENTIONS | AC-1 | namingconventions.rst contains a "Git Workflow" section | PASS |
| 10 | REQ_DEV_CONVENTIONS | AC-2 | Section covers branch naming, squash merge, retention, no direct commits | PASS |
| 11 | REQ_DEV_CONVENTIONS | AC-3 | copilot-instructions.md and Release Agent reference namingconventions.rst | PASS |

## Notes

Documentation-only change. No Extension Development Host launch needed.
