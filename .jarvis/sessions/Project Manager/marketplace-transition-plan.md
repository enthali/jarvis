# Marketplace Transition Plan — enthali.jarvis → enthali.jarvis-core

*Created: 2026-06-23*
*Status: **COMPLETED** (v0.13.0)*

## Background

`enthali.jarvis` cannot be published to the VS Code Marketplace because the name
`jarvis` is globally taken. The extension ID must change. Since no public user
base exists yet (only ~2 external users), this is the right moment to make the
change cleanly.

## Name Decision — RESOLVED ✓

New extension name family (all verified free on the marketplace 2026-06-23):

| Package | Old ID | New ID |
|---------|--------|--------|
| core | `enthali.jarvis` | `enthali.jarvis-core` |
| pim | `enthali.jarvis-pim` | `enthali.jarvis-pim` *(unchanged)* |
| recorder | `enthali.jarvis-recorder` | `enthali.jarvis-recorder` *(unchanged)* |
| mcp | `enthali.jarvis-mcp` | `enthali.jarvis-mcp` *(unchanged)* |

Only `core` needs renaming (`jarvis` → `jarvis-core`). All add-ons already have
unique names and publish without conflict.

`displayName` stays "Jarvis" (also verified free on marketplace).

## Transition Steps

### Step 1 — Rename & publish new extension (new CR) ✅ **DONE v0.10.0+**
- Change `name` in `packages/core/package.json` from `jarvis` to `<newname>`
- New marketplace ID: `enthali.<newname>`
- Update all internal references to the extension ID
- Publish to marketplace — clean slate, no existing user conflicts
- Test: install `enthali.<newname>` in a fresh project
- **Icon alignment** — handled in separate CR (see Pending CRs)

### Step 2 — `.jarvis` folder compatibility (part of rename CR) ✅ **DONE**
- New installations use `.<newname>` as root folder **OR** keep `.jarvis`
- Decision: keep `.jarvis` as the canonical folder name forever
  (it's a user data folder convention, not tied to extension ID)
- No migration needed for existing `.jarvis` directories

### Step 3 — EOL `enthali.jarvis` (separate CR, after Step 1 confirmed working) ✅ **DONE v0.13.0**
Final release of `enthali.jarvis` via GitHub Releases (auto-update delivers it):
- On VS Code window load: check if `enthali.<newname>` is installed
  - **Not installed:** show notification "Jarvis has moved to the marketplace"
    with button → opens `vscode:extension/enthali.<newname>`
  - **Installed:** show "Migration complete — uninstall old Jarvis?"
    with button → triggers uninstall of `enthali.jarvis`
- No new features in this release — migration prompt only
- After this release, `enthali.jarvis` GitHub Releases stops permanently

### Step 4 — Cleanup ✅ **PARTIAL** (Issue #8 - WON'T FIX)
- `enthali.<newname>` never publishes vsix to GitHub Releases (marketplace only)
- **Keep GitHub Releases auto-update mechanism** — REQUIRED for corporate/private marketplace environments where public marketplace is inaccessible
- Archive `enthali.jarvis` GitHub repository README with EOL notice
</parameter=enthali.jarvis-core

## What Does NOT Need Migration
- `.jarvis/` directory contents — folder name is independent of extension ID ✓
- Agent session files, project YAMLs, event YAMLs — all path-based, unaffected ✓
- syspilot workflows — reference session names, not extension IDs ✓

## Risks
- The 2 external users need to manually install the new extension once
- If the Bosch user has shared `enthali.jarvis` further, those installs will get
  the EOL notification and prompted to migrate

## Pending CRs (in order) — **ALL COMPLETED**
1. Icon alignment (J icon consistency) — independent, can go anytime ✅ **v0.12.0**
2. WSL2 fix (`USERNAME ?? USER`) — small, independent, can go anytime → **Issue #7**
3. Extension rename + marketplace publish — blocked on name decision ✅ **v0.10.0+**
4. EOL `enthali.jarvis` migration prompt — after Step 1 confirmed working ✅ **v0.13.0**
5. Remove GitHub Releases updater from new extension — after user base migrated → **Issue #8**
