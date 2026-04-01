# Test Protocol: release-setup

**Date**: 2026-04-01
**Change Document**: docs/changes/release-setup.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_REL_VSCEPKG | AC-3 | publisher = "enthali" in package.json | PASS |
| 2 | REQ_REL_VSCEPKG | AC-1 | @vscode/vsce listed in devDependencies | PASS |
| 3 | REQ_REL_VSCEPKG | AC-2 | npm run package produces jarvis-0.0.1.vsix (12 files, 7.92 KB) | PASS |
| 4 | REQ_REL_DOCSWORKFLOW | AC-1 | .github/workflows/docs.yml exists | PASS |
| 5 | REQ_REL_DOCSWORKFLOW | AC-2 | Trigger: push to branch main | PASS |
| 6 | REQ_REL_RELEASEACTION | AC-1 | .github/workflows/release.yml exists | PASS |
| 7 | REQ_REL_RELEASEACTION | AC-2 | Trigger: push tags v* | PASS |
| 8 | REQ_REL_SEMVER | AC-1 | version 0.0.1 follows MAJOR.MINOR.PATCH | PASS |

## Notes

CI/CD-only change — no Extension Development Host launch needed.
.vscodeignore added (not in specs) to exclude docs/ from vsix package (was 2.69 MB, now 7.92 KB).
REQ_REL_DOCSWORKFLOW AC-4 (pages accessible at URL) and REQ_REL_RELEASEACTION AC-3/4 (GitHub Release created)
can only be verified after merging to main and pushing a tag — deferred to post-deploy check.
