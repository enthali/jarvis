# Test Protocol: agent-mode-reset-race

**Change Request**: agent-mode-reset-race  
**Branch**: `feature/agent-mode-reset-race`  
**UAT Spec**: [SPEC_UAT_MSG_MODETARGET](../design/spec_uat_msg_modetarget.rst)  
**Date**: 2026-08-24

---

## Execution Note

This protocol was executed as a **code-based static analysis** against
`packages/core/src/extension.ts` on commit `781d22b`. All seven scenarios
were explicitly designed for static verification (structural code properties);
no Extension Development Host run is required.

Module integration (compile/package/CI) is not covered here — verified by
the Verify Engineer in `val-agent-mode-reset-race.md`.

---

## Test Scope

**Defect A + A2** — `reapplyAgentMode` identity check (T-1..T-4):

1. T-1: Target matches — command executes, success log inside guard
2. T-2: Target mismatch — command skipped, warning names both sessions
3. T-3: No active editor — treated as mismatch, skip + warn
4. T-4: Skipped mode does not abort delivery

**Defect B** — delivery poll loop re-entrancy guard (T-5..T-7):

5. T-5: In-flight guard blocks second tick (debug log, no message consumed)
6. T-6: Guard released in `finally` on throwing delivery
7. T-7: Reminder processing outside the delivery guard

---

## Test Scenarios

### T-1 — Target matches: command executes, success log inside guard

**AC**: `REQ_MSG_MODETARGET` AC-1..AC-2, AC-5; `SPEC_MSG_OPENCHAT` AC-M1, AC-M3

**Code evidence** — `packages/core/src/extension.ts` L310-332:

```typescript
async function reapplyAgentMode(agent: string, sessionName: string): Promise<void> {
    ...
    // Identity check: verify the active tab is still the intended session
    const activeLabel = vscode.window.tabGroups.activeTabGroup.activeTab?.label;
    if (activeLabel !== sessionName) {
        log.warn(`[MSG] reapplyAgentMode: active tab "${activeLabel}" ≠ intended "${sessionName}" — skipping`);
        return;
    }
    await vscode.commands.executeCommand(cmdId);
    ...
    log.info(`[MSG] reapplyAgentMode: re-applied agent mode "${agent}" to session "${sessionName}"`);
}
```

When `activeLabel === sessionName`: the `if` condition is false → the `return`
is not reached → `executeCommand` is called → `log.info` is emitted. Both
`executeCommand` and the success `log.info` are on the same code path, inside
the identity guard. `sessionName` (the new, behaviour-governing parameter) is
interpolated — no stale `context` label. The 400 ms settle delay precedes the
check; the command-registry probe precedes it too (AC-M5 preserved).

**Result**: ✅ PASS (static)

---

### T-2 — Target mismatch: command skipped, warning names both sessions

**AC**: `REQ_MSG_MODETARGET` AC-3..AC-4; `SPEC_MSG_OPENCHAT` AC-M1, AC-M2

**Code evidence** — same function, L323-326:

```typescript
const activeLabel = vscode.window.tabGroups.activeTabGroup.activeTab?.label;
if (activeLabel !== sessionName) {
    log.warn(`[MSG] reapplyAgentMode: active tab "${activeLabel}" ≠ intended "${sessionName}" — skipping`);
    return;
}
```

When `activeLabel !== sessionName`: the warning is emitted naming both the
actual focused tab (`activeLabel`) and the intended session (`sessionName`),
and the function returns. `executeCommand` at L329 is not reached. No
`log.info` success entry on this path.

**Result**: ✅ PASS (static)

---

### T-3 — No active editor: treated as mismatch, skip + warn

**AC**: `REQ_MSG_MODETARGET` AC-6; `SPEC_MSG_OPENCHAT` AC-M1, AC-M2

**Code evidence**: Optional chaining `activeTabGroup.activeTab?.label` yields
`undefined` when no tab is active. `undefined !== sessionName` evaluates true
→ same mismatch branch as T-2 is taken → `log.warn` emitted (logs
`"undefined"` for the actual tab label) → `return`. `executeCommand` not
called.

**Result**: ✅ PASS (static)

---

### T-4 — Skipped mode does not abort delivery

**AC**: `REQ_MSG_MODETARGET` AC-7; `SPEC_MSG_OPENCHAT` AC-M4

**Code evidence**: The mismatch branch at L324-326 ends with `return`, not
`throw`. The caller (delivery path) invokes `await reapplyAgentMode(...)`
without gating delivery on its outcome — the function resolves normally on
both the match and mismatch paths. The session open and message injection
that precede or follow the call are unaffected.

**Result**: ✅ PASS (static)

---

### T-5 — In-flight guard: second tick is a no-op at debug level

**AC**: `REQ_MSG_DELIVERY_REENTRANCY` AC-1..AC-2, AC-4; `SPEC_MSG_AUTODELIVER_POLL`

**Code evidence** — L1502 and L1505-1509:

```typescript
let deliveryInFlight = false;  // L1502 — module scope, survives across ticks
const pollInterval = setInterval(async () => {
    ...
    // Message delivery — guarded against re-entrancy
    if (deliveryInFlight) {
        log.debug('[MSG] autoDelivery: skipping tick — delivery already in flight');
    } else {
        ...  // delivery block
    }
```

When `deliveryInFlight` is `true` (a previous tick is still running), the
`else` block is skipped entirely. Only a single `log.debug` entry is emitted
(not `warn` — does not flood normal operation). No message is consumed, no
`notified` flag is set.

**Result**: ✅ PASS (static)

---

### T-6 — Guard released in `finally` on throwing delivery

**AC**: `REQ_MSG_DELIVERY_REENTRANCY` AC-3; `SPEC_MSG_AUTODELIVER_POLL`

**Code evidence** — L1517-1545:

```typescript
deliveryInFlight = true;
try {
    const focus = await snapshotFocus();
    try {
        await injectPrompt(sessionName, stub, { placement: 'secondary' });
        ...
    } catch (err) { log.warn(`[MSG] autoDelivery: delivery failed...`); }
} finally {
    deliveryInFlight = false;
}
```

`deliveryInFlight = false` is in the `finally` block of the outer `try`,
which wraps both `snapshotFocus()` and the delivery. Whether the inner
delivery succeeds, throws (caught by the inner `catch`), or the outer scope
throws (e.g. `snapshotFocus()`), the `finally` releases the flag. The loop
is never permanently blocked by a failed delivery.

**Result**: ✅ PASS (static)

---

### T-7 — Reminders unaffected by delivery guard

**AC**: `REQ_MSG_DELIVERY_REENTRANCY` AC-5; `SPEC_MSG_AUTODELIVER_POLL`

**Code evidence** — L1551 onward (immediately after the `if/else` delivery block):

```typescript
    }  // closes the if/else delivery guard

    // Reminder delivery (SPEC_MSG_REMINDERSLOOP)
    const remindersPath = configPaths.getRemindersPath() ?? '';
    const due = popDueReminders(remindersPath, new Date());
    ...
}  // closes setInterval callback
```

The reminder processing block begins after the closing brace of the
`if (deliveryInFlight) { ... } else { ... }` structure. It is not inside
either the guard's `if` or `else` branch, and not inside any `try/finally`.
It executes on every tick regardless of `deliveryInFlight`'s value.

**Result**: ✅ PASS (static)

---

## Execution Summary

| # | Defect | Scenario | Result |
|---|--------|----------|--------|
| T-1 | A+A2 | Target matches: command executes, success log inside guard | ✅ PASS (static) |
| T-2 | A+A2 | Target mismatch: command skipped, warning names both sessions | ✅ PASS (static) |
| T-3 | A+A2 | No active editor: treated as mismatch, skip + warn | ✅ PASS (static) |
| T-4 | A+A2 | Skipped mode does not abort delivery | ✅ PASS (static) |
| T-5 | B | In-flight guard: second tick is no-op at debug level | ✅ PASS (static) |
| T-6 | B | Guard released in `finally` on throwing delivery | ✅ PASS (static) |
| T-7 | B | Reminders outside guard — run on every tick | ✅ PASS (static) |

**Overall: 7 / 7 PASS**

All scenarios verified against commit `781d22b`.
Line-level citations provided per scenario.
