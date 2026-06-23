# Test Protocol: wsl2-session-lookup

**Change Document:** [wsl2-session-lookup.md](wsl2-session-lookup.md)
**Verification Report:** [val-wsl2-session-lookup.md](val-wsl2-session-lookup.md)
**Branch:** `feature/wsl2-artifacts`
**UAT Specs:** `SPEC_MSG_SESSIONLOOKUP` (AC-10, AC-11), `REQ_MSG_SESSIONLOOKUP`, `US_MSG_REMOTECOMPAT` (AC-5)
**Tester:** Automated (vitest) + Manual (WSL2 environment-conditional)
**Date:** 2026-06-23

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core` — must be clean (0 errors).
2. Unit tests executable: `npx vitest run` — baseline green.
3. For manual WSL2 test (TC-4): a WSL2 environment with VS Code Remote - WSL extension active.

---

## Group A — WSL2 Path Resolution (Unit Tests)

### TC-1 — WSL2 detected: `lookupSessionUUID` resolves via Windows host path

*UAT ref: SPEC_MSG_SESSIONLOOKUP AC-10, AC-11 / US_MSG_REMOTECOMPAT AC-5*

**Pre-condition:** Unit test mocks `/proc/version` containing "microsoft" (case-insensitive) and `USERNAME` env var set.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Mock `/proc/version` to return a string containing "microsoft". | WSL2 detection returns `true`. | |
| 2 | Set `process.env.USERNAME` to `"TestUser"`. | Username resolved for path construction. | |
| 3 | Call `lookupSessionUUID('My Session')` with a mock `state.vscdb` at the constructed `/mnt/c/Users/TestUser/AppData/Roaming/Code/User/...` path. | Returns the correct UUID from the mock database. | |
| 4 | Verify the resolved path uses `/mnt/c/Users/TestUser/AppData/Roaming/Code/User` as base. | Path matches expected Windows-host-via-WSL2 pattern. | |

---

### TC-2 — Non-WSL2 fallback: standard `globalStorageUri` path used

*UAT ref: SPEC_MSG_SESSIONLOOKUP AC-10 (negative case)*

**Pre-condition:** Unit test mocks `/proc/version` without "microsoft" substring (e.g. generic Linux kernel string).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Mock `/proc/version` to return `"Linux version 5.15.0-generic"`. | WSL2 detection returns `false`. | |
| 2 | Call `lookupSessionUUID('My Session')` with standard `globalStorageUri` path. | Returns UUID via standard (non-WSL2) code path. | |
| 3 | Verify no `/mnt/c/` path is constructed. | Path does not contain `/mnt/c/Users/`. | |

---

### TC-3 — Error fallback: `/proc/version` missing or `USERNAME` unset

*UAT ref: SPEC_MSG_SESSIONLOOKUP AC-10 (error resilience)*

**Pre-condition:** Unit test simulates missing `/proc/version` (ENOENT) or unset `USERNAME`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Mock `fs.readFile('/proc/version')` to throw ENOENT. | WSL2 detection returns `false` (graceful fallback). | |
| 2 | Call `lookupSessionUUID('My Session')` with standard path. | Returns UUID via standard code path (no crash). | |
| 3 | Mock `/proc/version` containing "microsoft" but `process.env.USERNAME` is `undefined`. | WSL2 path construction falls back to standard path (no crash). | |
| 4 | Call `lookupSessionUUID('My Session')`. | Returns `undefined` or falls back gracefully — no unhandled exception. | |

---

## Group B — Live WSL2 Host Validation (Manual, Environment-Conditional)

### TC-4 — End-to-end: `lookupSessionUUID` returns correct UUID in WSL2 remote mode

*UAT ref: SPEC_MSG_SESSIONLOOKUP AC-11 / US_MSG_REMOTECOMPAT AC-5*

**Pre-condition:** WSL2 environment active; VS Code connected via Remote - WSL; a named session exists on the Windows host.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open VS Code in WSL2 remote mode (Remote - WSL extension). | Extension host runs on Linux (WSL2). | |
| 2 | Verify `/proc/version` contains "microsoft". | WSL2 correctly detected. | |
| 3 | Create or confirm a named Jarvis session on the Windows host (e.g. "Test WSL Session"). | Session exists in Windows-side `state.vscdb`. | |
| 4 | Invoke `sendToSession` targeting "Test WSL Session" from within the WSL2 extension host. | Message delivered successfully; `lookupSessionUUID` resolved the UUID via `/mnt/c/` path. | |
| 5 | Check Jarvis Output Channel for errors. | No `[ERROR]` entries related to session lookup. | |

**Note:** This test requires a WSL2 environment and cannot be automated in CI. Mark as **environment-conditional**.

---

## Execution Summary

| TC | Title | Method | Status |
|----|-------|--------|--------|
| TC-1 | WSL2 detected: resolves via Windows host path | Unit test (vitest) | |
| TC-2 | Non-WSL2 fallback: standard path used | Unit test (vitest) | |
| TC-3 | Error fallback: graceful degradation | Unit test (vitest) | |
| TC-4 | Live WSL2 end-to-end | Manual (environment-conditional) | |
