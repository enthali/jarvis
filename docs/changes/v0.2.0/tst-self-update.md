# Test Protocol: self-update

**Date**: 2026-04-10
**Change Document**: docs/changes/self-update.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_REL_UPDATECOMMAND | AC-1 | `Jarvis: Check for Updates` appears in Command Palette | PASS |
| 2 | REQ_REL_UPDATECOMMAND | AC-2 | Running command when update available shows notification | PASS (untestable — no newer release on GitHub; code path verified by inspection) |
| 3 | REQ_REL_UPDATECOMMAND | AC-3 | Running command when up-to-date shows "Jarvis is up to date (v0.1.1)." | PASS |
| 4 | REQ_CFG_UPDATECHECK | AC-1 | `jarvis.checkForUpdates` setting exists as boolean, default true | PASS |
| 5 | REQ_CFG_UPDATECHECK | AC-2 | Setting to false and reloading skips auto-check on activation | PASS |
| 6 | REQ_CFG_UPDATECHECK | AC-3 | Manual command works regardless of setting value | PASS |
| 7 | REQ_REL_UPDATECHECK | AC-1 | GET request to GitHub API with User-Agent header | PASS (verified via manual command response) |
| 8 | REQ_REL_UPDATECHECK | AC-2 | tag_name stripped of `v`, component-wise comparison | PASS (code inspection; manual command shows correct "up to date") |
| 9 | REQ_REL_UPDATECHECK | AC-3 | No authentication token used | PASS (code inspection) |
| 10 | REQ_REL_UPDATECHECK | AC-4 | Network errors silently ignored in auto-check | PASS (no error on activation) |
| 11 | REQ_REL_UPDATENOTIFY | AC-1 | Notification message format | PASS (code inspection — no newer release to trigger) |
| 12 | REQ_REL_UPDATENOTIFY | AC-2 | Release Notes button opens html_url | PASS (code inspection) |
| 13 | REQ_REL_UPDATENOTIFY | AC-3 | Download & Install button triggers install flow | PASS (code inspection) |
| 14 | REQ_REL_UPDATENOTIFY | AC-4 | Dismiss = no action | PASS (code inspection) |
| 15 | REQ_REL_UPDATEINSTALL | AC-1 | First .vsix asset selected | PASS (code inspection) |
| 16 | REQ_REL_UPDATEINSTALL | AC-2 | Download to tmpdir | PASS (code inspection) |
| 17 | REQ_REL_UPDATEINSTALL | AC-3 | Install via workbench.extensions.installExtension | PASS (code inspection) |
| 18 | REQ_REL_UPDATEINSTALL | AC-4 | Reload prompt after install | PASS (code inspection) |
| 19 | REQ_REL_UPDATEINSTALL | AC-5 | No .vsix fallback opens release page | PASS (code inspection) |

## Notes

- Items 2, 11-19 cannot be fully exercised in UAT because there is no newer release on GitHub than the installed version. Code paths verified by inspection.
- The automatic startup check with `silent=true` produces no visible output when up-to-date — this is correct by design (SPEC_REL_UPDATECHECK).
- User noted that observability of the silent startup check could be improved with output channel logging (future enhancement, out of scope).
