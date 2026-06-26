# Test Protocol: retire-jarvis-legacy

**Change Document:** [retire-jarvis-legacy.md](retire-jarvis-legacy.md)
**Verification Report:** [val-retire-jarvis-legacy.md](val-retire-jarvis-legacy.md)
**Branch:** `feature/retire-jarvis-legacy`
**UAT Specs:** `SPEC_REL_RETIRESHIM` (AC-1, AC-2, AC-3), `SPEC_REL_RETIREINSTALL` (AC-1–AC-4), `SPEC_REL_RETIREUNINSTALL` (AC-1–AC-3), `SPEC_REL_RETIREFALLBACK` (AC-1–AC-3), `SPEC_REL_COREGH` (AC-1–AC-6)
**Tester:** Automated (vitest) + Manual (VS Code extension host)
**Date:** 2026-06-26

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core-gh` — must be clean (0 errors).
2. Unit tests executable: `npx vitest run` — baseline green.
3. VS Code Extension Development Host (F5) available for manual integration tests.
4. A test workspace with no `enthali.jarvis-core` installed (clean slate).

---

## Group A — Shim Activation (Unit Tests)

### TC-1 — Shim registers no Jarvis surfaces on activation

*UAT ref: SPEC_REL_RETIRESHIM AC-1 / REQ_REL_RETIRESHIM AC-1*

**Pre-condition:** `packages/core-gh/src/extension.ts` is the shim entry point.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Import and call `activate(context)` on the shim. | No tree views registered. | |
| 2 | Verify no heartbeat scheduler is created. | No `setInterval`/`setTimeout` for heartbeat. | |
| 3 | Verify no message-queue processing is started. | No message consumer loop. | |
| 4 | Verify no Jarvis commands are registered. | `context.subscriptions` contains no `registerCommand` for Jarvis commands. | |

---

### TC-2 — Shim shows migration notification on activation

*UAT ref: SPEC_REL_RETIRESHIM AC-2 / REQ_REL_RETIRESHIM AC-2*

**Pre-condition:** Shim `activate()` called.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `activate(context)` with a mock `vscode.window`. | `showInformationMessage` is called. | |
| 2 | Verify the notification message contains "Jarvis has moved" or "jarvis-core". | User-facing migration message displayed. | |
| 3 | Verify `activate()` delegates to `migrate()` and returns. | `migrate()` is invoked; `activate()` does not block. | |

---

## Group B — Migration Install with Channel Fallback (Unit Tests)

### TC-3 — `ensureCoreInstalled()` returns true when jarvis-core already present

*UAT ref: SPEC_REL_RETIREINSTALL AC-1 / REQ_REL_RETIREINSTALL AC-1*

**Pre-condition:** Mock `vscode.extensions.getExtension('enthali.jarvis-core')` returns a non-null extension object.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `ensureCoreInstalled()`. | Returns `true` immediately. | |
| 2 | Verify no Marketplace install command is invoked. | `workbench.extensions.installExtension` not called. | |
| 3 | Verify no GitHub API call is made. | `fetchLatestRelease()` not called. | |

---

### TC-4 — `ensureCoreInstalled()` succeeds via Marketplace install

*UAT ref: SPEC_REL_RETIREINSTALL AC-2 / REQ_REL_RETIREINSTALL AC-2*

**Pre-condition:** Mock `vscode.extensions.getExtension('enthali.jarvis-core')` returns `undefined`. Mock `vscode.commands.executeCommand('workbench.extensions.installExtension', 'enthali.jarvis-core')` resolves successfully.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `ensureCoreInstalled()`. | Marketplace install command is invoked with the extension ID. | |
| 2 | Verify the command resolves without error. | Returns `true`. | |
| 3 | Verify no GitHub fallback path is executed. | `fetchLatestRelease()` not called. | |

---

### TC-5 — `ensureCoreInstalled()` falls back to GitHub .vsix when Marketplace fails

*UAT ref: SPEC_REL_RETIREINSTALL AC-3 / REQ_REL_RETIREINSTALL AC-3*

**Pre-condition:** Mock `vscode.extensions.getExtension('enthali.jarvis-core')` returns `undefined`. Mock Marketplace install command rejects. Mock `fetchLatestRelease()` returns a release with a `jarvis-core-{version}.vsix` asset. Mock `downloadToTmp()` returns a valid temp path. Mock `installExtension` with the file URI resolves.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `ensureCoreInstalled()`. | Marketplace install is attempted first. | |
| 2 | Verify Marketplace install rejection triggers GitHub fallback. | `fetchLatestRelease()` is called. | |
| 3 | Verify the correct VSIX asset is selected (`jarvis-core-{version}.vsix`). | Asset name matches expected pattern. | |
| 4 | Verify the VSIX is downloaded to a temp path and installed via `installExtension`. | File URI passed to `installExtension`. | |
| 5 | Verify the function returns `true`. | Migration proceeds. | |

---

### TC-6 — `ensureCoreInstalled()` returns false when both channels fail

*UAT ref: SPEC_REL_RETIREINSTALL AC-4 / REQ_REL_RETIREFALLBACK AC-1*

**Pre-condition:** Mock Marketplace install rejects. Mock `fetchLatestRelease()` rejects or returns no matching asset.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `ensureCoreInstalled()`. | Both channels attempted. | |
| 2 | Verify the function returns `false`. | Migration does not proceed. | |

---

## Group C — Self-Uninstall and Reload (Unit Tests)

### TC-7 — `retireSelf()` uninstalls legacy extension and shows reload prompt

*UAT ref: SPEC_REL_RETIREUNINSTALL AC-1, AC-2 / REQ_REL_RETIREUNINSTALL AC-1, AC-2*

**Pre-condition:** Mock `vscode.commands.executeCommand('workbench.extensions.uninstallExtension', 'enthali.jarvis')` resolves. Mock `vscode.window.showInformationMessage` returns `'Reload Now'`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `retireSelf()`. | `uninstallExtension('enthali.jarvis')` is invoked. | |
| 2 | Verify a reload prompt is shown with "Reload Now" button. | `showInformationMessage` called with reload message. | |
| 3 | Verify user selects "Reload Now". | `workbench.action.reloadWindow` is executed. | |

---

### TC-8 — `retireSelf()` is only called when jarvis-core is confirmed present

*UAT ref: SPEC_REL_RETIREUNINSTALL AC-3 / REQ_REL_RETIREUNINSTALL AC-3*

**Pre-condition:** `migrate()` orchestration logic.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `migrate()` with `ensureCoreInstalled()` returning `true`. | `retireSelf()` is invoked. | |
| 2 | Call `migrate()` with `ensureCoreInstalled()` returning `false`. | `retireSelf()` is NOT invoked. | |

---

## Group D — Migration Failure Fallback (Unit Tests)

### TC-9 — Both channels fail: shim stays installed, shows manual link

*UAT ref: SPEC_REL_RETIREFALLBACK AC-1, AC-2, AC-3 / REQ_REL_RETIREFALLBACK AC-1, AC-2, AC-3*

**Pre-condition:** Mock `ensureCoreInstalled()` returns `false`. Mock `vscode.window.showWarningMessage` returns `'Open Marketplace'`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `migrate()` with both channels failing. | `retireSelf()` is NOT called. | |
| 2 | Verify a warning notification is shown with manual-install links. | `showWarningMessage` called with "Open Marketplace" and "Open GitHub Releases" options. | |
| 3 | Verify user selects "Open Marketplace". | `vscode.env.openExternal` called with Marketplace URL. | |
| 4 | Verify user selects "Open GitHub Releases". | `vscode.env.openExternal` called with GitHub Releases URL. | |
| 5 | Verify the shim remains installed (no uninstall triggered). | `uninstallExtension` not called. | |

---

## Group E — core-gh Self-Contained Build (Integration Tests)

### TC-10 — core-gh builds its own bundle without copying from core

*UAT ref: SPEC_REL_COREGH AC-2, AC-3 / REQ_REL_RETIRENORELEASE AC-1*

**Pre-condition:** Clean build environment.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run `cd packages/core-gh && npm run bundle`. | Bundle succeeds (0 errors). | |
| 2 | Verify `packages/core-gh/out/extension.js` exists. | Shim bundle produced. | |
| 3 | Verify `packages/core-gh/out/` was NOT copied from `packages/core/out/`. | File timestamps differ; no `cp` command in build output. | |
| 4 | Run `cd packages/core-gh && npx vsce package --no-dependencies`. | VSIX produced successfully. | |

---

### TC-11 — core-gh package.json has minimal contributes

*UAT ref: SPEC_REL_COREGH AC-2 / REQ_REL_RETIRENORELEASE AC-1*

**Pre-condition:** `packages/core-gh/package.json` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Parse `core-gh/package.json`. | `name` is `"jarvis"`. | |
| 2 | Verify `contributes.viewsContainers` is absent or empty. | No activity bar view container. | |
| 3 | Verify `contributes.views` is absent or empty. | No tree views. | |
| 4 | Verify `contributes.commands` is absent or empty. | No Jarvis commands. | |
| 5 | Verify `contributes.yamlValidation` is absent. | No schema validation. | |
| 6 | Verify `activationEvents` is `["onStartupFinished"]`. | Minimal activation. | |
| 7 | Verify `main` points to `./out/extension.js`. | Points to shim bundle. | |

---

### TC-12 — CI does not publish `enthali.jarvis` to Marketplace

*UAT ref: SPEC_REL_COREGH AC-5 / REQ_REL_RETIRENORELEASE AC-1*

**Pre-condition:** `.github/workflows/release.yml` exists.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Search `release.yml` for Marketplace publish step. | No `vsce publish` targeting `enthali.jarvis`. | |
| 2 | Verify `enthali.jarvis-core` IS published to Marketplace. | `vsce publish` for core present. | |
| 3 | Verify `enthali.jarvis` IS uploaded to GitHub Release. | `gh release upload` or `vsce publish --no-publish` for core-gh present. | |

---

## Group F — End-to-End Manual Tests (VS Code Extension Host)

### TC-13 — E2E: Shim activates, detects jarvis-core, self-uninstalls

*UAT ref: SPEC_REL_RETIRESHIM AC-1, AC-2 / SPEC_REL_RETIREUNINSTALL AC-1, AC-2*

**Pre-condition:** VS Code Extension Development Host (F5) with `packages/core-gh` as the active extension. `enthali.jarvis-core` is pre-installed in the test profile.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Launch VS Code Dev Host with the shim active. | No Jarvis surfaces appear (no sessions view, no heartbeat, no messages). | |
| 2 | Verify a notification appears: "Jarvis has moved to jarvis-core". | Migration notification displayed. | |
| 3 | Verify `enthali.jarvis` is uninstalled. | Extension list no longer contains `enthali.jarvis`. | |
| 4 | Verify a reload prompt is shown. | "Reload Now" prompt displayed. | |
| 5 | Click "Reload Now". | Window reloads; `enthali.jarvis-core` is active. | |

---

### TC-14 — E2E: Shim activates, jarvis-core absent, offers Marketplace install

*UAT ref: SPEC_REL_RETIREINSTALL AC-2 / REQ_REL_RETIREINSTALL AC-2*

**Pre-condition:** VS Code Dev Host with shim active. `enthali.jarvis-core` is NOT installed.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Launch VS Code Dev Host with the shim active. | No Jarvis surfaces appear. | |
| 2 | Verify a notification appears: "Jarvis has moved to jarvis-core". | Migration notification displayed. | |
| 3 | Verify Marketplace install is attempted. | `workbench.extensions.installExtension('enthali.jarvis-core')` called. | |
| 4 | Verify the shim uninstalls itself after successful install. | `enthali.jarvis` removed from extension list. | |
| 5 | Verify reload prompt is shown. | "Reload Now" prompt displayed. | |

---

### TC-15 — E2E: Shim activates, both channels fail, shows manual link

*UAT ref: SPEC_REL_RETIREFALLBACK AC-1, AC-2 / REQ_REL_RETIREFALLBACK AC-1, AC-2*

**Pre-condition:** VS Code Dev Host with shim active. `enthali.jarvis-core` is NOT installed. Network is blocked or Marketplace/GitHub endpoints are unreachable (e.g. via mock or firewall rule).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Launch VS Code Dev Host with the shim active. | No Jarvis surfaces appear. | |
| 2 | Verify a warning notification appears with manual-install links. | "Open Marketplace" and "Open GitHub Releases" options shown. | |
| 3 | Verify `enthali.jarvis` is NOT uninstalled. | Extension remains in the list. | |
| 4 | Reload the window. | Shim activates again; migration is retried. | |

---

## Group G — Release Policy (Manual Verification)

### TC-16 — No `enthali.jarvis` release after the shim

*UAT ref: SPEC_REL_COREGH AC-6 / REQ_REL_RETIRENORELEASE AC-1, AC-2*

**Pre-condition:** GitHub Releases page for `enthali/jarvis`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Check GitHub Releases for `enthali.jarvis` assets. | The shim release is the latest `enthali.jarvis` release. | |
| 2 | Verify the shim release remains downloadable. | `jarvis-{version}.vsix` asset is present. | |

---

## Summary of Test Coverage

| Group | TCs | Method | Coverage |
|-------|-----|--------|----------|
| A — Shim Activation | TC-1, TC-2 | Unit | SPEC_REL_RETIRESHIM AC-1, AC-2, AC-3 |
| B — Install + Fallback | TC-3, TC-4, TC-5, TC-6 | Unit | SPEC_REL_RETIREINSTALL AC-1–AC-4 |
| C — Self-Uninstall | TC-7, TC-8 | Unit | SPEC_REL_RETIREUNINSTALL AC-1–AC-3 |
| D — Failure Fallback | TC-9 | Unit | SPEC_REL_RETIREFALLBACK AC-1–AC-3 |
| E — core-gh Build | TC-10, TC-11, TC-12 | Integration | SPEC_REL_COREGH AC-1–AC-6 |
| F — E2E Manual | TC-13, TC-14, TC-15 | Manual | Full migration flow |
| G — Release Policy | TC-16 | Manual | SPEC_REL_COREGH AC-6 |
