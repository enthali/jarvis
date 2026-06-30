# Test Protocol: hook-autoinstall-setting

**Change Document:** [hook-autoinstall-setting.md](hook-autoinstall-setting.md)
**Verification Report:** [val-hook-autoinstall-setting.md](val-hook-autoinstall-setting.md)
**Branch:** `feature/hook-autoinstall-setting`
**UAT Specs:** `SPEC_HOOK_AUTOINST` (AC-1–AC-7)
**Tester:** Manual (VS Code Extension Development Host)
**Date:** 2026-06-29

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core` — must be clean (0 errors).
2. A test workspace with a `.vscode/settings.json` file for setting overrides.
3. VS Code Extension Development Host launched via **F5** from the repository root.
4. For runtime-change tests (Groups D, E): start with the extension already active in the Dev Host window.

---

## Group A — Setting Declaration (Static)

### TC-1 — `package.json` declares `jarvis.hooks.autoInstall`

*UAT ref: SPEC_HOOK_AUTOINST AC-1*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open `package.json` at the repository root. Locate `contributes.configuration.properties`. | `jarvis.hooks.autoInstall` is present. | |
| 2 | Inspect the `type` field. | `"boolean"` | |
| 3 | Inspect the `default` field. | `true` | |
| 4 | Inspect the `scope` field. | `"resource"` | |
| 5 | Open VS Code Settings UI (Ctrl+,) in the Dev Host; search for `jarvis hooks`. | `Jarvis › Hooks: Auto Install` appears with the checkbox checked by default. | |

---

## Group B — Activation Gate

### TC-2 — `autoInstall = true` (default): self-install and listener start unchanged

*UAT ref: SPEC_HOOK_AUTOINST AC-2*

**Test data:**
- Workspace settings: `jarvis.hooks.autoInstall` not set (defaults to `true`).
- Clean workspace: `.github/hooks/` directory absent.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open the test workspace in the Extension Development Host (F5). | Extension activates without errors. | |
| 2 | Inspect the workspace filesystem. | `.github/hooks/jarvis-hooks.json` exists. | |
| 3 | Inspect the workspace filesystem. | `.github/hooks/bridge.mjs` exists. | |
| 4 | Inspect `.github/hooks/port`. | File exists and contains a non-empty port number (e.g. `54321`). | |
| 5 | Check the "Jarvis" Output Channel. | No teardown messages; no hook-install errors. | |

---

### TC-3 — `autoInstall = false` at activation: teardown runs, listener not started

*UAT ref: SPEC_HOOK_AUTOINST AC-3*

**Test data:**
- Workspace settings: `"jarvis.hooks.autoInstall": false` in `.vscode/settings.json`.
- Pre-condition: `.github/hooks/jarvis-hooks.json`, `.github/hooks/bridge.mjs`, and `.github/hooks/port` all exist (from a prior activation with `autoInstall = true`).
- Prior listener port recorded from `.github/hooks/port` (e.g. `54321`).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Set `"jarvis.hooks.autoInstall": false` in `.vscode/settings.json`. Reload the Dev Host window (`Developer: Reload Window`). | Extension activates without throwing. | |
| 2 | Inspect `.github/hooks/`. | `jarvis-hooks.json` does not exist. | |
| 3 | Inspect `.github/hooks/`. | `bridge.mjs` does not exist. | |
| 4 | Inspect `.github/hooks/`. | `port` does not exist. | |
| 5 | Attempt a TCP connection to the previously recorded listener port (e.g. `curl http://127.0.0.1:54321/hooks`). | Connection refused — the intake listener is not running. | |

---

### TC-4 — `.github/hooks/` directory is never removed by teardown

*UAT ref: SPEC_HOOK_AUTOINST AC-4*

**Test data:**
- Same setup as TC-3.
- An additional user-managed file `my-hook.sh` placed in `.github/hooks/` before activation.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Place `my-hook.sh` (any content) in `.github/hooks/` before activating with `autoInstall = false`. | File is present before reload. | |
| 2 | Reload Dev Host window (activate with `autoInstall = false`). Teardown runs. | `.github/hooks/jarvis-hooks.json`, `bridge.mjs`, and `port` are removed. | |
| 3 | Inspect the directory. | `.github/hooks/` directory still exists. | |
| 4 | Inspect the directory. | `my-hook.sh` is still present and its contents are unchanged. | |

---

## Group C — Teardown Idempotency

### TC-5 — Teardown when files are already absent produces no errors

*UAT ref: SPEC_HOOK_AUTOINST AC-6*

**Test data:**
- `"jarvis.hooks.autoInstall": false` in workspace settings.
- `.github/hooks/` directory exists but is empty — no Jarvis-managed files present.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Confirm `jarvis-hooks.json`, `bridge.mjs`, and `port` are absent. Reload the Dev Host (activate with `autoInstall = false`). | Activation completes without any exception. | |
| 2 | Check the "Jarvis" Output Channel. | No error entries relating to teardown (no surfaced `ENOENT` or similar). | |
| 3 | Reload the Dev Host window a second time (`autoInstall = false` still set). | Same result — clean activation, no errors on second run. | |

---

## Group D — Runtime Configuration Change Listener

### TC-6 — Runtime change `true` → `false`: listener stopped, teardown executed

*UAT ref: SPEC_HOOK_AUTOINST AC-5*

**Test data:**
- Extension active with `autoInstall = true` (default); `.github/hooks/` fully installed; intake listener running.
- Listener port recorded from `.github/hooks/port` (e.g. `54321`).
- Verify listener is reachable: `curl -X POST http://127.0.0.1:<port>/hooks -d "{}"` returns `200`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open `.vscode/settings.json`; add `"jarvis.hooks.autoInstall": false`. Save the file. | VS Code fires `onDidChangeConfiguration`; no window reload required. | |
| 2 | Inspect `.github/hooks/`. | `jarvis-hooks.json`, `bridge.mjs`, and `port` are all gone. | |
| 3 | Attempt to POST to the previously recorded port. | Connection refused — the listener has been stopped. | |
| 4 | Check the "Jarvis" Output Channel. | No error entries; optional info log confirming teardown. | |

---

### TC-7 — Runtime change `false` → `true`: self-install runs, listener starts

*UAT ref: SPEC_HOOK_AUTOINST AC-5*

**Test data:**
- Extension active with `autoInstall = false`; `.github/hooks/` is empty; no listener running.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open `.vscode/settings.json`; change `jarvis.hooks.autoInstall` from `false` to `true`. Save. | VS Code fires `onDidChangeConfiguration`; no window reload required. | |
| 2 | Inspect `.github/hooks/`. | `jarvis-hooks.json` and `bridge.mjs` are created. | |
| 3 | Inspect `.github/hooks/port`. | File exists with a valid non-empty port number. | |
| 4 | POST a sample hook event to the new port: `curl -X POST http://127.0.0.1:<port>/hooks -d '{"event":"SessionStart"}'`. | Response status `200`; body `{"continue":true}`. | |

---

## Group E — Workspace Scope

### TC-8 — Setting is workspace-scoped: two workspaces are independent

*UAT ref: SPEC_HOOK_AUTOINST AC-7*

**Test data:**
- **Workspace A:** `.vscode/settings.json` with `"jarvis.hooks.autoInstall": true`.
- **Workspace B:** `.vscode/settings.json` with `"jarvis.hooks.autoInstall": false`.
- Both workspaces open in separate VS Code windows, each running the Extension Development Host.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Activate the Dev Host on workspace A. | `.github/hooks/` files installed; listener running; port file present. | |
| 2 | Activate the Dev Host on workspace B. | `.github/hooks/` files NOT installed; listener not running. | |
| 3 | Re-inspect workspace A's `.github/hooks/`. | Files are still present — workspace B's setting had no effect on workspace A. | |
| 4 | Open Settings UI in each window; search for `jarvis hooks`. | Window A shows `Auto Install` checked; window B shows it unchecked. | |

---

## Summary of Test Coverage

| Group | TCs | Method | Coverage |
|-------|-----|--------|----------|
| A — Setting Declaration | TC-1 | Static | SPEC_HOOK_AUTOINST AC-1 |
| B — Activation Gate | TC-2, TC-3, TC-4 | Manual | SPEC_HOOK_AUTOINST AC-2, AC-3, AC-4 |
| C — Teardown Idempotency | TC-5 | Manual | SPEC_HOOK_AUTOINST AC-6 |
| D — Runtime Config Change | TC-6, TC-7 | Manual | SPEC_HOOK_AUTOINST AC-5 |
| E — Workspace Scope | TC-8 | Manual | SPEC_HOOK_AUTOINST AC-7 |
