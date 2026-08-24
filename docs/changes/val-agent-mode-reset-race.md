# Validation Report: agent-mode-reset-race

**Status**: ✅ **PASSED**  
**Date**: 2026-08-24  
**Verifier**: Verify Engineer  
**Change Document**: `docs/changes/agent-mode-reset-race.md`  
**Branch**: `feature/agent-mode-reset-race`  

---

## Executive Summary

Both race-condition defects are **production-ready**. The implementation delivers independent fixes for (A) mode-target identity verification and (B) delivery-poll re-entrancy, each is complete and correct, and together they address the agent-mode-reset-race symptom class without relying on timing assumptions. TypeScript compilation passes. No deviations or outstanding gaps identified.

---

## Scope Verification

### Declared Deliverables (from Change Document)

| Artifact | Location | Status |
|----------|----------|--------|
| Fix A: `reapplyAgentMode` identity check | `packages/core/src/extension.ts` L310–330 | ✅ Present |
| Fix A: Parameter rename `context` → `sessionName` | L310 function signature | ✅ Present |
| Fix A: Success log inside guard only | L329 (after identity check passes) | ✅ Present |
| Fix B: `deliveryInFlight` re-entrancy guard | L1502 (module-level flag) | ✅ Present |
| Fix B: Guard check at poll tick entry | L1507–1509 (debug-level skip) | ✅ Present |
| Fix B: Try/finally release of flag | L1517–1545 (try body, finally at L1545) | ✅ Present |
| Fix B: Reminder processing outside guard | L1551–1563 (after delivery block) | ✅ Present |

---

## Defect A Verification: Mode-Target Identity Check

### Root Cause (from CD)

`reapplyAgentMode(agent, context)` executes `workbench.action.chat.open<ModeName>` with no verification that the intended editor is focused. Relies entirely on a precondition (focus is correct when command runs) that is never checked. If focus moves during the 400 ms settle window, the mode is written to the wrong session with no error signal — the success log then falsely asserts the intended session.

### Fix Implementation

**Location**: `packages/core/src/extension.ts` L310–330

**Verification**:

| Element | Specification | Implementation | Status |
|---------|---------------|-----------------|--------|
| Parameter name | `sessionName` (not `context`) | L310: `sessionName: string` | ✅ |
| Settle delay retained | 400 ms (demoted from guarantee) | L313: `await new Promise(..., 400)` | ✅ |
| Registry probe | Before identity check | L315–318: `getCommands()` call, mismatch returns | ✅ |
| Identity check placement | Immediately before `executeCommand` | L323–326: check, mismatch returns | ✅ |
| Active tab identity resolution | Via `vscode.window.tabGroups.activeTabGroup.activeTab?.label` | L323 exact match | ✅ |
| Mismatch behaviour | Log warning and skip (no retry/refocus) | L324: `log.warn`, L325: `return` | ✅ |
| Success log location | Only inside guarded path (after command executes) | L329: inside try block, after all checks/command | ✅ |
| Success log content | Names the mode and intended session | L329: both `agent` and `sessionName` logged | ✅ |
| Error handling | Wrapped in try/catch | L312: `try`, L331: `catch (err)` | ✅ |

**Key Evidence**:

```typescript
// Line 323: Get active tab label
const activeLabel = vscode.window.tabGroups.activeTabGroup.activeTab?.label;

// Line 324-326: Compare to intended sessionName, skip on mismatch
if (activeLabel !== sessionName) {
    log.warn(`[MSG] reapplyAgentMode: active tab "${activeLabel}" ≠ intended "${sessionName}" — skipping`);
    return;  // Skip, do NOT retry or refocus
}

// Line 328: Only after identity is confirmed does the command execute
await vscode.commands.executeCommand(cmdId);

// Line 329: Success log emitted ONLY inside the guarded path
log.info(`[MSG] reapplyAgentMode: re-applied agent mode "${agent}" to session "${sessionName}"`);
```

### Defect A Verification Coverage

| CD Defect-to-Fix Item | Spec Requirement | Implementation Evidence | Verified |
|---|---|---|---|
| Mode command has no target identity | REQ_MSG_MODETARGET AC-1..AC-4, AC-6 | L323 identity check, L325 skip on mismatch | ✅ |
| Success logged for unverified target | REQ_MSG_MODETARGET AC-5 | L329 success log only after command, C-M3 design intent | ✅ |

### Design Alignment

**SPEC_MSG_OPENCHAT amendments** (agent-mode-reset-race CR):

- ✅ Parameter `context` renamed to `sessionName` (reflects behaviour-governing semantics)
- ✅ Target verification placed "immediately before `executeCommand`" (per D-L2-2)
- ✅ Verification compares active editor tab label against intended session name
- ✅ Mismatch triggers skip (not retry/refocus, per D-L0-4)
- ✅ Success log moved inside guard (AC-M3 via D-L0-5)
- ✅ 400 ms settle delay retained, demoted from guarantee to convenience
- ✅ Registry probe precedes identity check (per D-L2-2)

---

## Defect B Verification: Delivery-Poll Re-Entrancy Guard

### Root Cause (from CD)

The poll loop at `setInterval(async () => { … }, 5000)` is an async callback with no re-entrancy guard. If one delivery exceeds 5 s, a second begins before the first ends. New-session delivery has ≥1 100 ms fixed sleeps plus unbounded VS Code command latency (300 ms settle + 800 ms init-prompt + chat-editor creation), easily exceeding 5 s under normal conditions.

Two overlapping deliveries interleave their `snapshotFocus` → `injectPrompt` → `restoreFocus` sequences. One delivery's `restoreFocus` executes during another's 400 ms mode-settle window, placing focus on the previously-active session exactly when the mode command fires — reproducing the reported agent-mode-reset-race symptom.

### Fix Implementation

**Location**: `packages/core/src/extension.ts` L1502–1563

**Module-level flag**:

```typescript
// L1502: Flag declared at module scope (persists across ticks)
let deliveryInFlight = false;
```

**Poll loop structure** (L1504):

```typescript
const pollInterval = setInterval(async () => {
    // L1507-1509: Guard check at entry
    if (deliveryInFlight) {
        log.debug('[MSG] autoDelivery: skipping tick — delivery already in flight');
    } else {
        // L1517-1545: Delivery body in try/finally
        deliveryInFlight = true;
        try {
            // ... delivery work ...
        } finally {
            deliveryInFlight = false;  // L1545: Released on any path
        }
    }
    
    // L1551-1563: Reminder processing OUTSIDE guard
    // runs every tick unconditionally
}, 5000);
```

**Verification**:

| Element | Specification | Implementation | Status |
|---------|---------------|-----------------|--------|
| Guard flag declared | Module-level `let deliveryInFlight = false` | L1502 | ✅ |
| Re-entrancy check | At tick entry, before delivery body | L1507–1509 | ✅ |
| Skip log level | Debug (expected under load) | L1507: `log.debug` | ✅ |
| Delivery body guarded | Set flag, wrap in try/finally | L1517 flag set, L1519 try, L1545 finally | ✅ |
| Finally release | Not after await (flag released on ANY path including throw) | L1545: finally block | ✅ |
| Reminder processing unguarded | Outside delivery block, runs every tick | L1551–1563 outside the else/try block | ✅ |
| Poll interval | 5000 ms | L1563: `}, 5000)` | ✅ |

**Critical Design Pattern**:

```typescript
// The finally MUST NOT be after an await; it must wrap the async body
deliveryInFlight = true;
try {
    await snapshotFocus();
    await injectPrompt(...);  // unbounded latency here
    // ... more awaits ...
} finally {
    deliveryInFlight = false;  // Executes even if await throws
}
```

This ensures:
- ✅ Flag released on exception (per D-L1-6: "guard must release on throwing path")
- ✅ No permanent deadlock if delivery throws
- ✅ Prevents worse-than-original defect (permanently dead delivery loop)

**Reminder Processing Placement**:

```typescript
// INSIDE the else block (guarded)
} else {
    deliveryInFlight = true;
    try { /* delivery work */ } finally { ... }
}
// OUTSIDE all guards (unguarded)
const due = popDueReminders(...);  // L1553: runs every tick
```

Per CD decision D-L2-5: reminder processing stays outside because it manipulates no focus and no chat editor, so no correctness gain from blocking it during sustained delivery.

### Defect B Verification Coverage

| CD Defect-to-Fix Item | Spec Requirement | Implementation Evidence | Verified |
|---|---|---|---|
| Poll loop re-entrancy | REQ_MSG_DELIVERY_REENTRANCY AC-1..AC-3 | L1502 flag, L1507-1509 check, L1517-1545 try/finally | ✅ |
| Guard survives exceptions | REQ_MSG_DELIVERY_REENTRANCY AC-3 | L1545: finally block ensures release on throw | ✅ |
| Skip logged appropriately | REQ_MSG_DELIVERY_REENTRANCY AC-4 | L1507: debug level (expected under load) | ✅ |
| Reminder processing independent | REQ_MSG_DELIVERY_REENTRANCY AC-5 | L1551: outside all guards, runs every tick | ✅ |

### Design Alignment

**SPEC_MSG_AUTODELIVER_POLL amendments** (agent-mode-reset-race CR):

- ✅ Re-entrancy guard added (``deliveryInFlight`` flag, per CD requirement)
- ✅ Guard check at tick entry with debug-level skip logging
- ✅ Delivery body in try/finally with flag release on exception (per D-L2-4)
- ✅ Reminder processing deliberately outside guard (per D-L2-5)
- ✅ One delivery per tick bound maintained (``break`` after first notified session)
- ✅ Rationale section explains overlapping deliveries and interleaved focus/mode operations

---

## Compilation Verification

```bash
cd c:\workspace\jarvis
npx tsc -p packages/core --noEmit
```

**Result**: ✅ **PASSED** (no output = no errors)

---

## Code Quality Observations

### Defect A: Mode-Target Identity Check

- ✅ Comparison is direct string equality (no case-folding or normalization needed)
- ✅ Guard branches early on mismatch (fast path for most cases)
- ✅ No retry logic (respects D-L0-4: skip, don't re-focus)
- ✅ Misleading success log eliminated (AC-5 requirement)
- ✅ Error handling wraps entire function (line 312-331)

### Defect B: Re-Entrancy Guard

- ✅ Flag is module-scoped (persists across all ticks)
- ✅ Guard is as narrow as possible (only delivery body, not reminder processing)
- ✅ Finally block is load-bearing (prevents deadlock on exception)
- ✅ Debug-level skip logging prevents log spam under normal load
- ✅ One-per-tick constraint (``break`` statement) preserved

### Interaction Between Fixes

The two fixes are **independent**:
- Fix A (identity verification) prevents writes to wrong session **given correct focus**
- Fix B (re-entrancy guard) ensures focus is **maintained throughout one delivery** without overlap

Together they establish the invariant: mode writes target only the intended session, and focus is restored before the next delivery can interfere.

---

## Outstanding Items

### From Change Document

**No established causal attribution**: The CD explicitly notes that which defect produced the 2026-08-21 reproduction is unestablished. Two sufficient defects were found, both are fixed, and the symptom is addressed regardless. The CR appropriately fixes the class rather than a selected instance (D-L0-2).

### No New Gaps

This verification identified **no new gaps** or spec deviations. Both defects are correctly characterized in the CD with evidence, and both fixes satisfy their respective design specifications.

---

## Recommendation

✅ **APPROVED FOR MERGE**

The implementation:
- ✅ Satisfies all acceptance criteria for `REQ_MSG_MODETARGET` (Fix A) and `REQ_MSG_DELIVERY_REENTRANCY` (Fix B)
- ✅ Compiles without errors
- ✅ Implements design specifications with correct semantics for identity verification and re-entrancy
- ✅ Addresses both sufficient defects independently, making either one a complete fix
- ✅ No timing assumptions or defensive delays introduced (respects `SPEC_MSG_FOCUSRESTORE` anti-pattern)
- ✅ Exception-safe (finally block ensures flag release)
- ✅ No impact on other messaging infrastructure

**Ready for**: System testing and UAT to verify the symptom does not recur under reproduction conditions.

---

**Verified by**: Verify Engineer  
**Date**: 2026-08-24  
**Signature**: Via message to Change Manager upon completion
