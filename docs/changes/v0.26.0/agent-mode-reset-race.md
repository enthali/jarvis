# Change Document: agent-mode-reset-race

**Status**: merged
**Branch**: feature/agent-mode-reset-race
**Created**: 2026-08-24
**Author**: Project Manager
**Operation Mode**: user-guided

- **user-guided** — every actor involves the user in its decision-making before proceeding.

---

## Summary

When a new actor session is created and its Agent Mode is set (via the undocumented
`workbench.action.chat.open<ModeName>` command, our workaround for
microsoft/vscode#317276), the mode-set fires a second time and lands on the
previously-active session instead of the new one — e.g. creating a session via
`sendMessage` correctly opens/renames/assigns-mode on the new session, but a
follow-up mode-set command then re-applies to whichever session was focused
before the switch (Project Manager, in the reproduced case). User's working
hypothesis: the editor focus is switched back to the previously-open window/tab
before the new session has fully finished being "delivered" (created, renamed,
prompted), so a mode-set command queued against the new session's identity
fires late and hits whatever is focused by then instead. Reproduced 2026-08-21,
not yet root-caused in code.

Acceptance criteria: creating a new actor session and assigning it an Agent
Mode reliably leaves that mode set on the new session, not on whichever session
was previously focused — verified by creating a session from another active
session and confirming the mode lands correctly on the first attempt, repeated
across a few consecutive creations to rule out a timing race.

Backlog item 8.

---

## Root Cause Analysis

The CR arrived with the root cause unestablished. Two independent defects were
found in code; both are stated with the evidence that establishes them, and the
limit of what that evidence proves is stated with them.

### Defect A — the mode-set command has no target identity

`reapplyAgentMode(agent, context)` at
[packages/core/src/extension.ts](packages/core/src/extension.ts#L310-L326) fires
`workbench.action.chat.open<ModeName>`. `SPEC_MSG_OPENCHAT` already documents
what that command does: it "targets the currently focused chat EDITOR widget and
switches its mode in place". There is no session parameter — `context` is used
for logging only.

So the helper's correctness rests entirely on a precondition it never checks:
that the intended editor is focused when the command runs. The only thing
enforcing that precondition is `await setTimeout(400)`. Nothing verifies the
target before the command, and nothing verifies it after.

Two consequences follow directly:

1. If focus is elsewhere at that instant, the mode is written to the wrong
   session. There is no error — the wrong write is indistinguishable from a
   right one.
2. The success log is emitted unconditionally after the command and interpolates
   `context` — the *intended* session, not the one actually targeted. A
   mis-targeted apply therefore logs `re-applied agent mode "X" to session "Y"`
   naming a session it did not touch. **This is why the bug resisted
   root-causing from logs: the logs actively assert the opposite of what
   happened.**

### Defect B — the delivery poll loop has no re-entrancy guard

The loop at
[packages/core/src/extension.ts](packages/core/src/extension.ts#L1496) is
`setInterval(async () => { … }, 5000)`. An async callback does not defer the
next tick, and no in-flight flag exists. If one delivery exceeds 5 s, a second
begins while the first is still running.

A new-session delivery is the slowest path and contains ≥1 100 ms of fixed
sleeps (300 prime + 800 init-prompt) plus unbounded VS Code command latency for
chat-editor creation, `/rename`, and prompt submission. `REQ_MSG_AUTODELIVER_POLL`
AC-5 bounds work to one session *per tick*, and AC-9 requires restore to run
"before the tick ends" — both are per-tick guarantees that say nothing about two
ticks overlapping.

Overlapping deliveries interleave `snapshotFocus → disrupt → restoreFocus`. One
delivery's `restoreFocus` can therefore execute inside another's 400 ms window,
which places focus on the previously-focused session exactly when the mode
command fires — reproducing the reported symptom precisely.

### What this evidence does and does not establish

Established: both defects exist, and Defect A alone is sufficient to produce the
symptom whenever focus moves during the 400 ms window, from any cause.

**Not established: which defect produced the 2026-08-21 reproduction.** No trace
was captured, and per Defect A the logs from that run would have claimed success
regardless. Attributing the observed instance to a specific one of the two would
be a guess presented as a finding.

This CR therefore fixes the class rather than a selected instance — see D-L0-2.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

Impact analysis run from `US_MSG_STABLESESSION` and `REQ_MSG_AUTODELIVER_POLL`
(`--direction out` to locate parents, then `in`). Raw output in Appendix.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_STABLESESSION | Stable Agent Session Open | not impacted | Covers open/rename/submit mechanics; target verification is a new concern |
| US_MSG_EDITORPLACEMENT | Predictable Editor-Group Placement with Focus Restore | not impacted | AC-5 restore behaviour is unchanged; this CR changes when a *mode* may be written, not when focus is restored |
| US_MSG_AUTODELIVERY | Auto-Delivery | not impacted at US level | Re-entrancy is an implementation guarantee, not new user-facing behaviour |
| US_ENT_AGENTSESSION | Agent Session Lifecycle | not impacted | Session lifecycle unchanged |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_MODETARGET | Agent Mode Changes Only the Session They Target | mandatory |

### Decisions

- D-L0-1: The user-visible harm is framed as damage to the **bystander** session, not failure on the new one. The new session already receives its mode at creation time (`SPEC_INJ_INJECT` 3b primes via `chat.open { mode }` before the editor exists); what the reproduction showed was a *third-party* session having its mode overwritten. Framing this as "the mode did not land" would have specified the wrong fix.
- D-L0-2: Both defects are fixed, rather than picking the more likely one. They are independent, each is a real defect on its own reading of the code, and the diagnostic that would distinguish them does not exist — see Root Cause Analysis. Fixing one and deferring the other would leave a live defect whose symptom is identical, so a recurrence would be read as "the fix did not work".
- D-L0-3: The fix must **not** be longer or better-tuned delays. A delay cannot establish that focus is correct — it can only make a wrong target less frequent, while removing the evidence that it still happens. `SPEC_MSG_FOCUSRESTORE` already carries a measured warning against defensive sleeps in this exact code path ("an earlier spike revision's defensive `setTimeout(800)` measurably worsened both latency and keystroke-leak count … Do not reintroduce it defensively").
- D-L0-4: On an unconfirmed target the mode assignment is **skipped**, not retried by re-focusing. Re-focusing would steal focus back from the user, defeating `US_MSG_EDITORPLACEMENT` AC-5, which exists precisely so background delivery does not move focus. Skipping is also the cheaper error: the bystander keeps its mode, and the intended session keeps the mode it was given at creation.
- D-L0-5: The misleading success log is treated as part of the defect, not cosmetics. A log that asserts an unverified fact is what turned a reproducible bug into an unroot-caused one — AC-4 makes the claim conditional on the check.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_MSG_EDITORPLACEMENT` AC-5 (restore focus after delivery) and `US_MSG_MODETARGET` AC-2 (skip if target unconfirmed) act on different objects: focus placement vs. mode writes. Neither constrains the other.
- [x] No redundancies — `US_MSG_STABLESESSION` AC-5 governs *which command* submits a prompt; this story governs *whether a mode write may proceed at all*.
- [x] Gaps identified and addressed — the bystander-damage framing (D-L0-1) and the false-success log (D-L0-5) were both absent from the intake and are now covered by AC-1 and AC-4.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_AUTODELIVER_POLL | US_MSG_AUTODELIVERY | modified | New AC-10: per-tick guarantees do not imply non-overlap; delegates to the new re-entrancy requirement |
| REQ_MSG_OPENCHAT | US_MSG_STABLESESSION | not impacted | Governs editor creation; the mode helper is specified under it at design level but its ACs are unaffected |
| REQ_MSG_SENDPROMPT | US_MSG_STABLESESSION | not impacted | Mode-setting vs mode-preserving split (GH #54) is correct and untouched |
| REQ_MSG_FOCUSRESTORE | US_MSG_EDITORPLACEMENT | not impacted | Restore semantics unchanged — this CR constrains mode writes, not focus |
| REQ_MSG_EDITORPLACEMENT | US_MSG_EDITORPLACEMENT | not impacted | Placement rules unchanged |
| REQ_INJ_PRIMITIVE | US_INJ_INJECT | not impacted | Branch structure unchanged; only the mode helper's contract tightens |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_MODETARGET | Agent-Mode Target Verification | US_MSG_MODETARGET; REQ_MSG_OPENCHAT | mandatory |
| REQ_MSG_DELIVERY_REENTRANCY | Delivery Poll Loop Re-Entrancy Guard | US_MSG_MODETARGET; REQ_MSG_AUTODELIVER_POLL | mandatory |

### Conflicts Detected

None. `REQ_MSG_MODETARGET` AC-8 explicitly preserves the existing
command-registry probe rather than replacing it — the two guards cover
different failures (mode not registered vs. wrong editor focused).

### Decisions

- D-L1-1: The intended session name becomes a **behaviour-governing parameter**, not a logging label (AC-1). The current signature already accepts `context: string`, which is why the defect is easy to miss on reading: the call sites look as though they identify a target, and they do not.
- D-L1-2: Verification is specified as "compare the active chat editor tab's identity against the intended session name" without naming the API. `snapshotFocus` already establishes that a chat tab's `label` is the session name, so the capability is known to exist; pinning the exact expression at requirement level would put an implementation detail above the design layer.
- D-L1-3: Mismatch is a **skip, not an error** (AC-3, AC-7). The surrounding delivery is still valuable — the session opens and gets its message. Failing the delivery to protect the mode would trade a cosmetic defect for a functional one.
- D-L1-4: No-active-chat-editor is folded into the mismatch path (AC-6) rather than given its own branch. "I cannot confirm the target" and "the target is wrong" warrant identical behaviour, and a separate branch would be a second place for the same rule to drift.
- D-L1-5: The re-entrancy guard is specified as a separate requirement rather than an AC on `REQ_MSG_AUTODELIVER_POLL`. It is a property of the loop's concurrency, testable on its own, and `US_MSG_MODETARGET` AC-5 depends on it — folding it in would hide that dependency from the traceability graph.
- D-L1-6: The guard must release on the throwing path (AC-3). A guard that leaks on failure converts an intermittent delivery bug into a permanently dead delivery loop — strictly worse than the defect being fixed.
- D-L1-7: No new setting (AC-6). Both fixes restore an invariant the system already claims to hold; a setting would imply the wrong behaviour is a supported choice.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_MSG_AUTODELIVER_POLL` AC-4 (mark notified after the delivery action returns) is unaffected: a skipped *tick* performs no delivery and marks nothing (`REQ_MSG_DELIVERY_REENTRANCY` AC-2), while a skipped *mode application* does not abort the delivery (`REQ_MSG_MODETARGET` AC-7).
- [x] No redundancies — target verification governs a mode write; the re-entrancy guard governs delivery concurrency. Each is sufficient on its own for its own failure and neither subsumes the other.
- [x] All new REQs link to User Stories.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_OPENCHAT | REQ_MSG_MODETARGET | modified | `reapplyAgentMode` gains target verification; parameter renamed `context` → `sessionName`; success log moved inside the guard; AC-M1..AC-M5 added |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_DELIVERY_REENTRANCY | modified | `deliveryInFlight` guard added to the tick body with `finally` release; rationale section added |
| SPEC_INJ_INJECT | REQ_INJ_PRIMITIVE | modified | Branch 3a note: `entityName` is now the verified target, not a log label |
| SPEC_MSG_FOCUSRESTORE | REQ_MSG_FOCUSRESTORE | not impacted | Snapshot/restore semantics unchanged — the guard changes when a delivery may *start*, not how focus is restored |
| SPEC_MSG_SENDCOMMAND | REQ_MSG_SEND | not impacted | Call site already passes the entity name; only the parameter's meaning tightens |
| SPEC_MSG_SENDPROMPT | REQ_MSG_SENDPROMPT | not impacted | Mode-setting/preserving split (GH #54) untouched |
| SPEC_MSG_EDITORPLACEMENT | REQ_MSG_EDITORPLACEMENT | not impacted | Placement rules unchanged |

### New Design Elements

None. Both fixes are amendments to existing specs — no new design element is
warranted, since neither introduces a new component or contract, only a
precondition on an existing helper and a guard on an existing loop.

### Conflicts Detected

None.

### Decisions

- D-L2-1: Target identity is the active tab's `label`. This is not a new mechanism — `snapshotFocus` already relies on a chat tab's label being the session name, and resolves it through `lookupSessionUUID(tab.label)`. Reusing the identity the codebase already trusts avoids introducing a second, possibly disagreeing, notion of "which session is this tab".
- D-L2-2: The comparison is placed **after** the command-registry probe and **immediately before** `executeCommand`. Any work between the check and the command widens the window it is meant to close; the registry probe is `await`ed and must therefore precede it.
- D-L2-3: The 400 ms settle delay is **kept**, and demoted in the spec text from guarantee to convenience. Removing it would be an unrelated behavioural change in the same commit; keeping it costs nothing now that correctness no longer rests on it.
- D-L2-4: The guard flag is released in a `finally`, not after the `await`. Called out explicitly in the spec text because it is the difference between a fixed bug and a permanently dead delivery loop, and it is exactly the kind of detail an implementer can reasonably simplify away.
- D-L2-5: Reminder processing stays outside the guard. It manipulates no focus and no chat editor, so including it would delay reminders during sustained delivery for no correctness gain.
- D-L2-6: Skipped ticks log at `debug`, skipped mode applications log at `warn`. A skipped tick is expected under load; a skipped mode application means a mode the system intended to set was not set, which someone should be able to find.
- D-L2-7: No new spec element created. A new element would fragment `reapplyAgentMode`'s contract across two documents, and the helper is already fully specified inside `SPEC_MSG_OPENCHAT`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — `SPEC_MSG_FOCUSRESTORE`'s prohibition on defensive sleeps is honoured: this CR adds no delay and explicitly rejects tuning the existing one (D-L0-3).
- [x] All modified SPECs link to the requirements they realise (`REQ_MSG_MODETARGET`, `REQ_MSG_DELIVERY_REENTRANCY` added to `:links:`).

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_MODETARGET | REQ_MSG_MODETARGET | SPEC_MSG_OPENCHAT | ✅ |
| US_MSG_MODETARGET | REQ_MSG_DELIVERY_REENTRANCY | SPEC_MSG_AUTODELIVER_POLL | ✅ |

Both new requirements trace up to `US_MSG_MODETARGET` and down to an amended
design element. `REQ_MSG_AUTODELIVER_POLL` AC-10 cross-references the new
re-entrancy requirement so the per-tick/per-delivery distinction is discoverable
from the requirement that previously appeared to cover it.

### Defect-to-Fix Coverage

| Defect | Fixed by | Verifiable how |
|---|---|---|
| A — mode command has no target identity | REQ_MSG_MODETARGET AC-1..AC-4, AC-6 | Focus a different session during delivery; the mode must not change on it |
| A2 — success logged for unverified target | REQ_MSG_MODETARGET AC-5, SPEC_MSG_OPENCHAT AC-M3 | A skipped apply produces a warning and no success line |
| B — poll loop re-entrancy | REQ_MSG_DELIVERY_REENTRANCY AC-1..AC-3 | Overlapping deliveries cannot start; guard survives a throwing delivery |

### Artefakt-Removal-Check

Not applicable — this CR removes no artefact. The `context` → `sessionName`
parameter rename is a signature change within a private helper, not an artefact
removal; both call sites already pass the entity name.

### Issues Found

One open residual, disclosed rather than resolved:

- **Causal attribution of the 2026-08-21 reproduction is not established.** Two
  sufficient defects were found; no trace exists that distinguishes which one
  produced the observed instance, and per Defect A the logs from that run would
  have reported success either way. Both are fixed, so the symptom is addressed
  regardless — but this CR should not be recorded as having proven the cause of
  that specific report. Verification should exercise both paths independently
  (see Defect-to-Fix Coverage).

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT

**UAT Spec**: [SPEC_UAT_MSG_MODETARGET](../design/spec_uat_msg_modetarget.rst)  
**Test Protocol**: [tst-agent-mode-reset-race.md](tst-agent-mode-reset-race.md)  
**Execution date**: 2026-08-24  
**Executed by**: Test Designer (static code analysis, commit `781d22b`)

| # | Defect | Scenario | Result |
|---|--------|----------|--------|
| T-1 | A+A2 | Target matches: command executes, success log inside guard | ✅ PASS |
| T-2 | A+A2 | Target mismatch: command skipped, warning names both sessions | ✅ PASS |
| T-3 | A+A2 | No active editor: treated as mismatch, skip + warn | ✅ PASS |
| T-4 | A+A2 | Skipped mode does not abort delivery | ✅ PASS |
| T-5 | B | In-flight guard: second tick is no-op at debug level | ✅ PASS |
| T-6 | B | Guard released in `finally` on throwing delivery | ✅ PASS |
| T-7 | B | Reminders outside guard — run on every tick | ✅ PASS |

**All 7 scenarios PASS.** Both defects verified independently.
Full code evidence with line citations in `tst-agent-mode-reset-race.md`.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Consistency Check

**Reviewed by:** MECE Engineer
**Review date:** 2026-08-24

#### Analysis

**Mutual Exclusivity verification:**

- `US_MSG_MODETARGET` (agent mode lands only on intended session) ⊥ `US_MSG_STABLESESSION`, `US_MSG_EDITORPLACEMENT`, `US_MSG_AUTODELIVERY` — each addresses a distinct delivery concern. This CR fixes correctness of mode targeting; existing stories govern open/rename/placement/focus. No overlap. ✅
- `REQ_MSG_MODETARGET` (target verification before mode apply) ⊥ `REQ_MSG_DELIVERY_REENTRANCY` (guard prevents overlapping deliveries) — they fix independent failure modes: (a) what gets targeted, (b) when overlapping violates the target check. Mutually exclusive. ✅
- Neither defect's fix subsumes the other — either alone is insufficient per Root Cause Analysis. ✅

**Collective Exhaustiveness verification:**

All three documented defects and fixes are covered:
- Defect A (mode command has no target identity check): ✅ Fixed by `REQ_MSG_MODETARGET` AC-1..AC-4, AC-6 + `SPEC_MSG_OPENCHAT` AC-M1..M5
- Defect A2 (success log unconditionally asserts unverified claim): ✅ Fixed by `REQ_MSG_MODETARGET` AC-5 + `SPEC_MSG_OPENCHAT` AC-M3 (success log moved inside guard)
- Defect B (poll loop re-entrancy): ✅ Fixed by `REQ_MSG_DELIVERY_REENTRANCY` + `SPEC_MSG_AUTODELIVER_POLL` re-entrancy guard section

No observable defect aspect left unaddressed. Both independent failures now have structural fixes. ✅

**Traceability verification:**

- `US_MSG_MODETARGET` → `REQ_MSG_MODETARGET`, `REQ_MSG_DELIVERY_REENTRANCY` → `SPEC_MSG_OPENCHAT` (AC-M1..M5), `SPEC_MSG_AUTODELIVER_POLL` (re-entrancy guard section) ✅
- `REQ_MSG_AUTODELIVER_POLL` amended with AC-10 that distinguishes "per-tick" from "per-delivery" and delegates non-overlap guarantee to `REQ_MSG_DELIVERY_REENTRANCY` ✅
- `SPEC_INJ_INJECT` amended: branch 3a note updated to clarify `entityName` is now a verified target, not a log label ✅
- All modified requirements and specs carry forward-links to this CR ✅
- Backward links (from new/modified elements to User Stories) complete ✅

**Contradiction check:**

- `REQ_MSG_MODETARGET` AC-8 explicitly preserves the command-registry probe — no contradiction with existing guard. ✅
- `REQ_MSG_MODETARGET` AC-7 (skipping does not abort delivery) is consistent with `REQ_MSG_AUTODELIVER_POLL` AC-3 (delegate to `REQ_INJ_PRIMITIVE` for full delivery). ✅
- `REQ_MSG_DELIVERY_REENTRANCY` AC-5 (reminders stay outside guard) preserves the 5s reminder tick guarantee. ✅
- `SPEC_MSG_FOCUSRESTORE` prohibition on defensive sleeps (D-L0-3) is honored: no delay added, existing delays explicitly demoted to "convenience" per D-L2-3. ✅
- No contradiction with existing specs. ✅

**Orthogonality with existing specs:**

- vs. `REQ_MSG_FOCUSRESTORE` / `SPEC_MSG_FOCUSRESTORE`: This CR constrains *when* a mode may be written (after verifying target), not how focus is restored. Orthogonal. ✅
- vs. `REQ_MSG_SENDCOMMAND`: Call site already passes entity name; only the parameter's meaning tightens from "logging label" to "behaviour-governing target". No new contract. ✅
- vs. `REQ_INJ_PRIMITIVE` / `SPEC_INJ_INJECT`: The primitive's contract is unchanged; a new note clarifies that the session name passed to it is now verified. ✅

**Implementation coverage verification:**

- Defect A fix: `reapplyAgentMode` signature change (`context` → `sessionName`); target verification code (lines 2047–2054) ✅
- Defect A2 fix: Success log (line 2060) moved inside the equality check ✅
- Defect B fix: Module-scoped `deliveryInFlight` boolean (line 1502) guards the delivery body; released in `finally` (line 1545) ✅
- Both call sites (`SPEC_MSG_SENDCOMMAND` after `openAtMain`, `SPEC_MSG_AUTODELIVER_POLL` after `openAtSecondary`) already pass entity name, no signature changes required ✅

**UAT coverage verification:**

All 7 scenarios pass (static analysis per CD):
- T-1: Target match → command executes, success log inside guard ✅
- T-2: Target mismatch → command skipped, warning names both sessions ✅
- T-3: No active editor → treated as mismatch, skip + warn ✅
- T-4: Skipped mode does not abort delivery ✅
- T-5: Second tick skipped while first in flight (debug log) ✅
- T-6: Guard released in finally on throwing delivery ✅
- T-7: Reminders run on every tick (outside guard) ✅

**Defect-to-Fix mapping verified:**
Each defect independently covered by test scenarios per CD's Defect-to-Fix Coverage table. ✅

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | No MECE issues detected. Both defects are independently addressable, properly traced, and collectively cover all documented failure modes. 7/7 UAT PASS. | — |

---

### Round 2 — QM Independent Review

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

Traceability independently re-verified: `US_MSG_MODETARGET` → `REQ_MSG_MODETARGET`/
`REQ_MSG_DELIVERY_REENTRANCY` → `SPEC_MSG_OPENCHAT`/`SPEC_MSG_AUTODELIVER_POLL`, all
read in full in `req_msg.rst`/`spec_msg.rst` — ACs are precise and match the shipped
behaviour. Read `extension.ts` directly at both defect sites (L300-332, L1501-1560):
the identity check sits immediately before `executeCommand` with nothing in between
(D-L2-2 honoured); `deliveryInFlight` is set/reset around the delivery body and released
in `finally`; reminders run unconditionally after, outside the guard. Full `compile all`
clean; 406/406 tests re-run (40 files); 7/7 UAT independently re-derived from code,
matches test protocol's own line citations exactly.

Two non-blocking documentation-fidelity findings, both external to the actual shipped
logic (the real code is correct and independently verified):

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Design spec | `SPEC_MSG_OPENCHAT`, `SPEC_MSG_AUTODELIVER_POLL` | Both specs present a code block as a literal reflection of `extension.ts` ("Helper — `reapplyAgentMode`", "Tick logic (inlined in extension.ts)"), but neither is byte-identical to the shipped code: (a) `SPEC_MSG_OPENCHAT`'s mismatch-branch `log.warn` text ("skipped — intended … but focused tab is …") differs verbatim from the real code's text ("active tab … ≠ intended … — skipping"); (b) `SPEC_MSG_AUTODELIVER_POLL`'s tick-logic sample has an early `if (autoList.length === 0) { return; }` that is not in the real code — taken literally it would skip reminder processing on every tick with no auto-delivery sessions configured, directly contradicting `REQ_MSG_DELIVERY_REENTRANCY` AC-5 and T-7. The real, shipped `extension.ts` does not return early and reminders do run unconditionally — confirmed independently and by 7/7 UAT — so this is a spec-illustration drift, not a functional defect. Given this CR's own thesis (a claim that isn't checked against reality misleads), the spec's code samples should be corrected to match the real code or clearly marked non-literal. | Medium |
| 2 | Implementation comment | `extension.ts` L308 (`reapplyAgentMode` JSDoc) | The function's docstring still reads `@param context Short label for logging (session name).`, unchanged from before the CR's own `context` → `sessionName` rename (D-L1-1). The comment both names the wrong parameter and describes it as "a label for logging" — exactly the characterization D-L1-1 declares incorrect (it is now a behaviour-governing target). Low risk since the code itself is correct, but a future reader trusting only the docstring would be misled the same way the old success log misled about behaviour. **Fix:** update to `@param sessionName The intended target session; the mode change is skipped if the focused tab does not match it.` | Low |

**Verdict: QM CLEAR** (both findings are documentation/comment fidelity, not functional
defects; real code, build, and tests are correct).

#### PM Decision

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Fix now | Spec code samples must match shipped code — a reader trusting the spec's inlined tick-logic sample would believe reminders are skipped whenever no auto-delivery is configured, the exact opposite of the verified/tested behaviour. Small, low-risk text sync; routing back to CM rather than accepting a known-misleading spec. |
| 2 | Fix now | One-line JSDoc fix, same class of problem this CR itself fixes (a stale label the reader would trust over the real behaviour). Trivial for CM/Dev Engineer to apply alongside finding 1. |

Both findings sent back to CM for a quick fix-and-reverify pass before merge.

---

### Round 3 — QM Independent Re-Verification (commit `41d4a8c`)

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

CM flagged (correctly) that Fix 1's application was not the cosmetic text-sync
PM's Round 2 decision described, and asked for a re-check with that in mind.
Confirmed by diffing `41d4a8c` directly: **the fix went in the opposite
direction to the PM decision**. PM Decision #1 said the *spec's* code sample
must be corrected to match the shipped (verified-correct) code — "routing
back to CM rather than accepting a known-misleading spec." Instead, the
commit changed the *shipped code* to match the spec's code sample. Two
consequences:

1. The actual bug PM asked to have fixed — `SPEC_MSG_AUTODELIVER_POLL`'s
   illustrative `if (autoList.length === 0) { return; }` — is **still present,
   unchanged**, in `docs/design/spec_msg.rst` (~L1200). Re-read the file
   directly to confirm. Nothing was corrected there; the CD's Round 2 finding
   is effectively still open.
2. Synchronizing the code to the spec's sample carried over a second,
   previously-latent defect in that same sample: the spec's "Tick logic" code
   block has never had a `catch` around the delivery body, only
   `try { … } finally { deliveryInFlight = false; }`. `extension.ts` used to
   have an inner `catch (err) { log.warn(...) }` around the delivery body
   (pre-dating this CR) — `41d4a8c` removed it to match the spec block. Read
   the post-fix code directly (L1519-1552): confirmed no `catch` remains
   around `snapshotFocus`/`injectPrompt`/`restoreFocus`. This is a **direct
   violation of `REQ_MSG_AUTODELIVER_POLL` AC-7** ("Errors in a single tick
   SHALL be caught, logged as warnings, and SHALL NOT stop the poll loop") —
   an existing, already-approved-in-substance AC that was not in either
   defect's scope and was working correctly before this fix commit. The
   `finally` still releases `deliveryInFlight` on a throw, so
   `REQ_MSG_DELIVERY_REENTRANCY` AC-3 (loop doesn't permanently block) is
   still satisfied — but the failure is now an unhandled promise rejection
   inside the `setInterval` callback with no `[MSG]`-tagged attribution of
   which session's delivery failed, silently regressing existing, working
   diagnostics.

Root cause is at the **spec layer**, not a pure implementation slip: the
spec's own "Tick logic" code sample never included the AC-7-mandated catch,
so faithfully "syncing code to spec" reproduced the spec's internal
inconsistency (AC-7 prose vs. its own code sample) into the shipped code.
The unconditional `writeQueue`/`reload` change (dropping the `if (changed)`
gate) and moving the guard check inside the `for` loop are behaviourally
inert re-verified by direct reading — no issue with either. JSDoc fix (Fix 2)
is correctly and completely applied — no issue. `compile all`/`vitest run`
still clean (406/406) — no test exercises the failure-catch path, so this
regression is not caught by the automated suite.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 3 | Design spec + Implementation | `SPEC_MSG_AUTODELIVER_POLL` (`spec_msg.rst` ~L1197-1256), `extension.ts` delivery loop (~L1505-1552) | Commit `41d4a8c` fixed Round-2 Finding 1 in the wrong direction: it changed working code to match the spec's sample instead of correcting the spec. Net effect: (a) the spec's early-`return`-on-empty-`autoList` bug flagged in Round 2 is still unfixed; (b) the spec's code sample was missing the `catch` that `REQ_MSG_AUTODELIVER_POLL` AC-7 mandates, and syncing code to spec removed that pre-existing, working `catch (err) { log.warn(...) }` from `extension.ts` — a delivery failure is no longer caught or logged, becoming a silent unhandled promise rejection. `REQ_MSG_DELIVERY_REENTRANCY` AC-3 (guard release) still holds via `finally`, so the loop does not deadlock, but AC-7 is now violated. | High |

**Verdict: NOT CLEAR — re-open.** Recommend: (1) add back a `catch (err) { log.warn(...) }` around the delivery body (keeping the existing `finally` for guard release) so AC-7 is satisfied again; (2) actually correct `SPEC_MSG_AUTODELIVER_POLL`'s code sample per the original PM Round 2 decision — remove the early `return`, add the `catch` the AC-7 prose already requires, so the sample is trustworthy and code can be safely re-synced to it in future.

#### PM Decision

| # | Decision | Rationale |
|---|----------|-----------|
| 3 | Fix now | AC-7 regression (dropped error catch → silent unhandled rejection, lost session attribution) — a real functional defect, not a doc nit. My Round-2 decision was mis-executed (code synced to spec instead of spec corrected to code); QM's recommended fix direction is correct and unambiguous. Route back to CM: (1) restore the `catch (err) { log.warn(...) }` around the delivery body, keep the existing `finally`; (2) actually fix `SPEC_MSG_AUTODELIVER_POLL`'s code sample (remove the early `return`, add the AC-7 `catch`) so future spec-to-code syncs don't repeat this. Re-verify with QM before merge. |

---

### Round 4 — QM Independent Re-Verification (commit `9a30f41`)

**Reviewed by:** Quality Manager
**Review date:** 2026-08-24

#### Analysis

Read `9a30f41`'s diff directly, then re-read both final files in place (not
just the diff) to rule out a partial fix.

`extension.ts` (L1503-1552): the delivery body is now
`try { … } catch (err) { log.warn(...) } finally { deliveryInFlight = false; }`.
The `catch` names the failing `sessionName` and the error — `REQ_MSG_AUTODELIVER_POLL`
AC-7 (errors caught, logged as warnings, loop not stopped) is satisfied again.
The `finally` still unconditionally releases the guard — `REQ_MSG_DELIVERY_REENTRANCY`
AC-3 still holds. No unhandled-rejection path remains.

`spec_msg.rst`'s `SPEC_MSG_AUTODELIVER_POLL` code sample (~L1197-1264): the
early `if (autoList.length === 0) { return; }` is gone, replaced with an
`if (autoList.length > 0) { … }` wrapper — the Round-2 finding (reminders would
be skipped if this were taken literally) is now actually corrected, not just
deferred. A matching `catch (err) { log.warn(...) }` was added to the sample,
and a trailing comment now marks the reminder block as intentionally outside
the guard (`REQ_MSG_DELIVERY_REENTRANCY` AC-5). Compared line-by-line against
the real code: the two are now byte-identical apart from indentation style —
the spec sample is trustworthy again.

`compile all` (core) clean; `vitest run` 406/406 (40 files) — the suite still
does not exercise the catch path directly, so this was a direct-reading
verification rather than a test-observed one, consistent with how the
original regression was introduced and how Round 3 caught it.

#### Findings

None. Round 3 Finding #3 is closed: both the AC-7 regression and the original
Round 2 spec-sample bug are fixed at the root — the spec sample, not just the
code, was corrected.

**Verdict: QM CLEAR.**

---

## Appendix: Link Discovery Results

```
# REQ_MSG_OPENCHAT --direction out --depth 1   (locate parents)
links_to: US_MSG_STABLESESSION, REQ_MSG_PINNED

# SPEC_MSG_AUTODELIVER_POLL --direction out --depth 1
links_to: REQ_MSG_AUTODELIVER_POLL, SPEC_MSG_AUTODELIVER_STORE,
          SPEC_MSG_AUTODELIVER_TAG, SPEC_MSG_SENDCOMMAND,
          REQ_MSG_NOTIFICATION_TEMPLATE, SPEC_MSG_NOTIFICATION_RESOLVE,
          SPEC_MSG_OPENCHAT, REQ_ENT_AGENTPROMPT_TEMPLATE,
          SPEC_ENT_AGENTSESSION_INITPROMPT, SPEC_MSG_EDITORPLACEMENT,
          SPEC_MSG_FOCUSRESTORE, SPEC_INJ_INJECT

# US_MSG_STABLESESSION --direction in --depth 1
linked_from: SPEC_UAT_MSG_STABLESESSION_FILES, REQ_MSG_EDITORPLACEMENT,
             REQ_MSG_PINNED, REQ_MSG_OPENCHAT, REQ_MSG_SENDPROMPT,
             REQ_MSG_AGENTSESSION, US_MSG_EDITORPLACEMENT,
             US_UAT_SESSIONINITPROMPT, US_UAT_MSG_STABLESESSION,
             REQ_ENT_AGENTSESSION
```

---

*Generated by syspilot Change Agent*
