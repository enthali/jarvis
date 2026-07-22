# MECE Verification Report: msg-notify-default-text-fix

**Change Document:** docs/changes/msg-notify-default-text-fix.md  
**Branch:** feature/msg-notify-default-text-fix  
**Issue:** Follow-up fix to GH #40 (msg-notify-sender-id)  
**Scope:** Correct literal default notification template text at all 3 declaration sites to include `Sender(s): ${sender}` line and use canonical tool name `jarvis_receiveMessage`

**Verification Date:** 2026-07-21  
**Verified By:** MECE Engineer  
**Verdict:** ✅ **QUALITY PASS**

---

## Summary

This CR closes a critical gap in GH #40 where the `${sender}` substitution variable was wired into `applyTemplate()` at all three default-notification-text declaration sites, but the literal default text itself was never updated to include the `Sender(s): ${sender}` line. Additionally, one site (manual command fallback) still referenced either the deprecated `jarvis_readMessage` or a nonexistent `enthali.jarvis-core/receiveMessage` tool name instead of the canonical `jarvis_receiveMessage` (per REQ AC-7). 

A regression test (`src/tests/msg-notify-default-text.test.ts`) was added to assert the literal text at all three sites, which immediately caught the gaps and drove the fix.

**Test Suite:** 257/257 passing (245 base + 9 syspilot + 3 regression tests)  
**All Tests Passing:** ✅ 257/257  
**TypeScript:** ✅ 0 errors  
**Sphinx:** ✅ 0 warnings

---

## Verification Against AC-3 and AC-7

### REQ_MSG_NOTIFICATION_TEMPLATE AC-3

**Spec (L1):**
> "Before submission, the template SHALL have `${count}` replaced with the number of pending messages, `${destination}` replaced with the target session name, and `${sender}` replaced with the comma-separated distinct sender names from the pending message batch."

**Verification:**

All three sites now include `${sender}` in the literal default text:

**1. packages/core/package.json setting default:**
```
[Jarvis Message Service] You have ${count} new message(s) in your inbox.
Sender(s): ${sender}
Read them with the jarvis_receiveMessage tool (destination: "${destination}") until remaining = 0.
```
✅ Contains: `${count}`, `${destination}`, `${sender}`

**2. extension.ts ~line 682 (manual jarvis.sendMessages fallback):**
```typescript
const defaultNotifTemplate =
    `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\n` +
    `Sender(s): \${sender}\n` +
    `Read them with the jarvis_receiveMessage tool (destination: "\${destination}") until remaining = 0.`;
```
✅ Contains: `${count}`, `${destination}`, `${sender}` (NOW FIXED)

**3. extension.ts ~line 1448 (auto-delivery poll fallback):**
```typescript
const defaultNotifTemplate = `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\nSender(s): \${sender}\nRead them with the jarvis_receiveMessage tool (destination: "\${destination}") until remaining = 0.`;
```
✅ Contains: `${count}`, `${destination}`, `${sender}` (NOW FIXED)

**Result:** ✅ AC-3 fully implemented across all three sites. All three placeholders present in literal default text.

---

### REQ_MSG_NOTIFICATION_TEMPLATE AC-7

**Spec (L1):**
> "(message-api-rename CR) The built-in default text SHALL reference `jarvis_receiveMessage` (the canonical tool) rather than the deprecated `jarvis_readMessage` — this is a one-time default-text update; the setting's substitution logic (AC-1 through AC-6) is otherwise unaffected. Users with a customized (non-default) template are unaffected — the built-in default only changes for users who have never overridden it."

**Verification:**

**1. package.json setting default:**
✅ References `jarvis_receiveMessage` (correct)

**2. extension.ts ~line 682 (manual command fallback):**
- ❌ **Before:** `Read them with the enthali.jarvis-core/receiveMessage tool (destination: ...)`
- ✅ **After:** `Read them with the jarvis_receiveMessage tool (destination: ...)`

**3. extension.ts ~line 1448 (auto-delivery poll fallback):**
- ✅ **Already correct:** `Read them with the jarvis_receiveMessage tool (destination: ...)`

**Result:** ✅ AC-7 fully implemented. All three sites now reference `jarvis_receiveMessage` consistently (not deprecated `jarvis_readMessage` or nonexistent `enthali.jarvis-core/receiveMessage`).

---

## MECE Completeness Check

### Mutually Exclusive (ME)
✅ **PASS**

- Three distinct declaration sites (package.json, manual command, auto-delivery poll)
- Each site serves a different fallback purpose (config default, command fallback, polling fallback)
- No overlapping responsibilities

### Collectively Exhaustive (CE)
✅ **PASS**

- All three default-text declaration sites verified:
  1. ✅ `packages/core/package.json` setting default
  2. ✅ `packages/core/src/extension.ts` line ~682 (manual command)
  3. ✅ `packages/core/src/extension.ts` line ~1448 (auto-delivery poll)
- No other sites with hardcoded default text found
- Both missing elements fixed at each site:
  1. ✅ `Sender(s): ${sender}` line added
  2. ✅ Tool name corrected to `jarvis_receiveMessage`

### Contradictions
✅ **PASS** — No contradictions found:

- All three sites now use identical placeholder set: `${count}`, `${destination}`, `${sender}`
- All three sites now reference canonical tool: `jarvis_receiveMessage`
- No conflicting tool names or missing placeholders across any site
- Literal text matches specification (REQ_MSG_NOTIFICATION_TEMPLATE built-in default verbatim)

### Regressions
✅ **PASS** — No regressions detected:

- Test count: 257/257 (245 base + 9 syspilot + 3 msg-notify-default-text) all passing
- TypeScript: 0 errors (tsc -p packages/core clean)
- Existing message delivery behavior unaffected (only literal text corrected)
- Custom templates without `${sender}` still work unchanged (unknowns left as-is by applyTemplate)
- Existing tests still passing (no breaking changes)

### Gaps
✅ **PASS** — No gaps identified:

- All three default-text sites updated (CE verified)
- Both AC-3 and AC-7 requirements fully implemented
- Regression test added to prevent recurrence
- Tool name consistent across all sites
- Placeholder set consistent across all sites

---

## Code Quality Summary

| Metric | Result | Details |
|--------|--------|---------|
| **Completeness** | ✅ 3/3 sites | All default-text declarations updated |
| **AC-3 (placeholders)** | ✅ CORRECT | ${count}, ${destination}, ${sender} at all sites |
| **AC-7 (tool name)** | ✅ CORRECT | jarvis_receiveMessage at all sites (not deprecated/nonexistent names) |
| **Regression test** | ✅ ADDED | 3 new tests specifically verifying literal text content |
| **Test coverage** | ✅ 257/257 | All tests passing, including 3 new ones |
| **TypeScript** | ✅ 0 errors | Clean build |
| **No breaking changes** | ✅ YES | Literal text corrected; logic and API unchanged |

---

## Issues Identified and Fixed

### Issue #1: Missing Sender(s) Line (Both Sites)

**Problem:** 
- Line 682 (manual command): Literal default text missing `Sender(s): ${sender}` line
- Line 1448 (auto-delivery poll): Literal default text missing `Sender(s): ${sender}` line
- Yet `${sender}` was being passed to `applyTemplate()` at both sites, so the placeholder was wired but the literal text never included it

**Impact:** 
- Default notifications incomplete (missing sender info even when substitution code present)
- Contradicts GH #40 spec and AC-3 requirement

**Fix:** 
- Added `Sender(s): ${sender}` as third line in both default templates
- Now consistent with package.json setting default (which was already correct)

### Issue #2: Wrong Tool Name (Line 682 Only)

**Problem:** 
- Line 682 (manual command): Referenced `enthali.jarvis-core/receiveMessage` (does not exist in LM tool registry)
- Should reference `jarvis_receiveMessage` (canonical, registered tool)
- Per AC-7, this was supposed to be corrected during message-api-rename CR (v0.16.0)

**Impact:** 
- Users following instructions would use wrong/nonexistent tool name
- Violates AC-7 requirement

**Fix:** 
- Changed to `jarvis_receiveMessage` to match package.json and line 1448

---

## Test Verification

**Regression Test File:** `src/tests/msg-notify-default-text.test.ts`

**Test 1:** packages/core/package.json setting default
- ✅ PASSED: Contains `Sender(s): ${sender}`
- ✅ PASSED: References `jarvis_receiveMessage`
- ✅ PASSED: Does not reference `jarvis_readMessage`

**Test 2:** jarvis.sendMessages manual command fallback (line ~682)
- ✅ PASSED (after fix): Contains `Sender(s): ${sender}`
- ✅ PASSED (after fix): References `jarvis_receiveMessage`
- ✅ PASSED (after fix): Does not reference `enthali.jarvis-core/receiveMessage`

**Test 3:** auto-delivery poll loop fallback (line ~1448)
- ✅ PASSED: Contains `Sender(s): ${sender}`
- ✅ PASSED: References `jarvis_receiveMessage`

**Full Test Suite:**
- Before fix: 255/257 passing (2 failed in msg-notify-default-text)
- After fix: 257/257 passing (all green)

---

## Sign-off

**MECE Compliance:**
- ✅ **Mutually Exclusive:** Three sites are distinct and non-overlapping
- ✅ **Collectively Exhaustive:** All three default-text sites verified; no missed sites; both issues fixed at each site
- ✅ **No contradictions:** Consistent placeholders and tool names across all sites; matches spec
- ✅ **No regressions:** 257/257 tests passing; 0 TypeScript errors; no breaking changes
- ✅ **No gaps:** AC-3 fully implemented (all three placeholders at all sites); AC-7 fully implemented (canonical tool name at all sites)

**Explicit AC Verification (per PM request):**
- ✅ **REQ_MSG_NOTIFICATION_TEMPLATE AC-3:** All three placeholders (`${count}`, `${destination}`, `${sender}`) present at all three declaration sites
- ✅ **REQ_MSG_NOTIFICATION_TEMPLATE AC-7:** All three sites reference `jarvis_receiveMessage` (canonical) instead of deprecated `jarvis_readMessage` or nonexistent `enthali.jarvis-core/receiveMessage`

**Formal Verdict:** ✅ **QUALITY PASS**

---

**MECE Engineer**  
2026-07-21
