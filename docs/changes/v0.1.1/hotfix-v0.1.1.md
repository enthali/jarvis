# Change Document: hotfix-v0.1.1

**Status**: approved
**Branch**: feature/hotfix-v0.1.1
**Created**: 2026-04-09
**Author**: Jarvis Developer

---

## Summary

Post-release hotfix for v0.1.0 addressing three issues found during first productive use:

1. **`.vscodeignore` excludes `node_modules`** — no bundler exists, so runtime dependencies (`js-yaml`, `sql.js`) are missing from the `.vsix` package, causing the extension to fail on activation.
2. **Internal commands visible in Command Palette** — `jarvis.openAgentSession` is a tree-item-only action that crashes when invoked without an element argument.
3. **README.md outdated** — still describes v0.0.1 dummy data; needs to reflect v0.1.0 feature set.

---

## Fixes

### Fix 1: `.vscodeignore` — include `node_modules`

Remove `node_modules/**` line from `.vscodeignore` so runtime dependencies are packaged into the `.vsix`.

**Impacted**: `REQ_REL_VSCEPKG` (new AC-4), `SPEC_REL_VSCEPKG` (new `.vscodeignore` constraints section)

### Fix 2: `package.json` — hide internal commands

Add `menus.commandPalette` entry to hide `jarvis.openAgentSession` with `"when": "false"`.

**Impacted**: `REQ_EXP_AGENTSESSION` (new AC-5), `SPEC_EXP_AGENTSESSION` (new `commandPalette` registration block)

### Fix 3: `README.md` — update to v0.1.0 feature set

Rewrite README to describe current capabilities: YAML-based data, subfolder tree, filters, heartbeat scheduler, message queue, session tools, LM tools.

**Impacted**: None (README is not covered by any spec/req)
