# Test Protocol: wsl2-username-fallback

**Change Document:** [wsl2-username-fallback.md](wsl2-username-fallback.md)
**Verification Report:** [val-wsl2-username-fallback.md](val-wsl2-username-fallback.md)
**Branch:** `feature/wsl2-username-fallback`
**UAT Specs:** `SPEC_MSG_SESSIONLOOKUP` (modified)
**Tester:** Automated (vitest)
**Date:** 2026-06-27

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core` — must be clean (0 errors).
2. Unit tests executable: `npx vitest run` — baseline green.

---

## Group A — WSL2 Username Fallback (Unit Tests)

### TC-1 — WSL2 detected, USERNAME set, returns Windows path

*UAT ref: SPEC_MSG_SESSIONLOOKUP / REQ_MSG_SESSIONLOOKUP*

**Pre-condition:** Mock `/proc/version` containing "microsoft"; set `process.env.USERNAME = 'TestUser'`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `resolveUserDataPath(globalStorageUri)` | Returns `/mnt/c/Users/TestUser/AppData/Roaming/Code/User` | |

---

### TC-2 — WSL2 detected, USERNAME unset, USER set, returns Windows path

*UAT ref: SPEC_MSG_SESSIONLOOKUP / REQ_MSG_SESSIONLOOKUP*

**Pre-condition:** Mock `/proc/version` containing "microsoft"; delete `process.env.USERNAME`; set `process.env.USER = 'testuser'`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `resolveUserDataPath(globalStorageUri)` | Returns `/mnt/c/Users/testuser/AppData/Roaming/Code/User` | |

---

### TC-3 — WSL2 detected, both USERNAME and USER unset, falls back to globalStorageUri

*UAT ref: SPEC_MSG_SESSIONLOOKUP / REQ_MSG_SESSIONLOOKUP*

**Pre-condition:** Mock `/proc/version` containing "microsoft"; delete both `process.env.USERNAME` and `process.env.USER`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `resolveUserDataPath(globalStorageUri)` | Returns `path.resolve(globalStorageUri.fsPath, '../..')` | |
| 2 | Verify warning logged | `_log.warn` called with "USERNAME/USER env vars are undefined" | |

---

### TC-4 — Non-WSL2 environment, returns globalStorageUri path

*UAT ref: SPEC_MSG_SESSIONLOOKUP / REQ_MSG_SESSIONLOOKUP*

**Pre-condition:** Mock `/proc/version` without "microsoft" (e.g., "Linux version 5.15.0-generic").

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `resolveUserDataPath(globalStorageUri)` | Returns `path.resolve(globalStorageUri.fsPath, '../..')` | |

---

## Summary of Test Coverage

| Group | TCs | Method | Coverage |
|-------|-----|--------|----------|
| A — WSL2 Username Fallback | TC-1..TC-4 | Unit (vitest) | SPEC_MSG_SESSIONLOOKUP |