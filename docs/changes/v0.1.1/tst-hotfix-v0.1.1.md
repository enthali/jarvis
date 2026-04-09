# Test Protocol: hotfix-v0.1.1

**Date**: 2026-04-09
**Change Document**: docs/changes/hotfix-v0.1.1.md
**Result**: PASSED

## Test Results

| # | Fix | Check | Result |
|---|-----|-------|--------|
| 1 | .vscodeignore | `npm run package` produces .vsix | PASS |
| 2 | .vscodeignore | .vsix contains `node_modules/` (js-yaml, sql.js, argparse) | PASS |
| 3 | .vscodeignore | .vsix does NOT contain `testdata/`, `.jarvis/`, `docs/`, `src/` | PASS |
| 4 | .vscodeignore | .vsix DOES contain `readme.md` | PASS |
| 5 | commandPalette | `jarvis.openAgentSession` not in Command Palette (Ctrl+Shift+P) | PASS (by spec — `"when": "false"`) |
| 6 | commandPalette | Agent session button still works on tree items | PASS (verified in v0.1.0 UAT) |
| 7 | README.md | Describes YAML data, subfolders, filters, heartbeat, messages, session tools | PASS |
| 8 | REQ_REL_VSCEPKG AC-4 | `.vscodeignore` does not exclude `node_modules/**` | PASS |
| 9 | REQ_EXP_AGENTSESSION AC-5 | `commandPalette` entry with `"when": "false"` in package.json | PASS |
| 10 | SPEC_REL_VSCEPKG | `.vscodeignore constraints` section added | PASS |
| 11 | SPEC_EXP_AGENTSESSION | `commandPalette` registration block added | PASS |
