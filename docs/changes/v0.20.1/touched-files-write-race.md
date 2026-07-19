# Change Document: touched-files-write-race

**Status**: merged
**Branch**: feature/touched-files-write-race (merged to develop)
**Created**: 2026-07-18
**Author**: PM
**Operation Mode**: user-guided
**GitHub Issue(s)**: #35

---

## Summary

Fix a data-loss race condition in the "Recently Touched Files" feature
(actor-touched-files, GH #18). When a session issues multiple
file-touching tool calls within the same turn, `TouchTracker` dispatches
each `PostToolUse` event fire-and-forget (no await/queue), and
`TouchStore.recordTouches()` does an unserialized read-modify-write
(`_load` → mutate → `_save`) per call. Concurrent calls race on the same
JSON file — the last writer to finish wins and silently overwrites
everyone else's changes, including previously-persisted entries. Observed
in practice: 6 near-simultaneous `read_file` calls in one turn caused
previously-visible touched files to disappear and only 3 of 6 new entries
to survive. See GH #35 for full repro evidence (extension log timestamps
showing 6 `PreToolUse` then 6 `PostToolUse` firing within ~76ms).

User-visible acceptance criterion: when a session performs multiple
file-touching tool calls within the same turn, all resulting touched-file
entries must be recorded — no prior entries lost, no new entries dropped,
regardless of call ordering/concurrency.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ENT_TOUCHEDFILES | Recently Touched Files per Entity | none (no rewording) | The story's existing promise ("so I can see at a glance what the agent actually touched") is what this bug silently breaks. This CR restores that promise; it does not change scope, add a capability, or need a new AC at the story level — the concurrency guarantee is an implementation-correctness property, not a new user-facing behavior. |

### New User Stories

None. This is a pure bugfix against an already-approved story; no new user-facing capability is introduced.

### Impact Analysis (bug scope + related-risk check)

- **Confirmed root cause:** `TouchTracker._handle()` (per `PostToolUse` event) is dispatched fire-and-forget (`void this._handle(event)`, `HookEngine.on()`'s dispatch model — `SPEC_HOOK_ROUTE`). Each call independently awaits `getEntityNameForSessionId()` then calls `TouchStore.recordTouches()`, whose body is `_load()` (async `fs.promises.readFile` + `JSON.parse`) → mutate in memory → `_save()` (async `fs.promises.writeFile`). Because both `_load`/`_save` are `async` (contain `await`), the event loop can interleave two overlapping `recordTouches()` calls for the *same* entity's JSON file between their own load and save — both read the same pre-mutation snapshot, both mutate their own in-memory copy, and whichever `_save()` finishes last silently overwrites the other's mutations (data loss), exactly matching GH #35's repro (6 near-simultaneous tool calls → only 3/6 survived, plus pre-existing entries lost).
- **Existing precedent already in the codebase for this exact race class:** `packages/core/src/engine/sessions/messageQueue.ts`'s `readQueue()`/`writeQueue()` use fully **synchronous** `fs.readFileSync`/`fs.writeFileSync` (no `await`, no yield point) for the same read-modify-write shape against a shared JSON file (`autodelivery.json`/message queue files) called from multiple sites in `extension.ts`. Because Node.js is single-threaded and synchronous `fs` calls never yield control back to the event loop, a synchronous read-mutate-write critical section cannot be interleaved by another queued callback — this is *why* `messageQueue.ts` doesn't have this bug despite doing conceptually the same kind of operation.
- **Other consumers checked for the same race class (per CM's request):** grepped the codebase for JSON read-modify-write patterns under `.jarvis/state/` and more broadly for `JSON.parse(await fs.promises.readFile(...))`-shaped code. `touchStore.ts` is the **only** consumer of `.jarvis/state/` and the only place using the async-`fs.promises` variant of this read-modify-write shape; `messageQueue.ts` is the only other read-modify-write-over-JSON consumer in the codebase and it already uses the race-free synchronous form. **No other latent instance of this bug class was found.**

### Decisions

- Decision 1: No new/modified User Story — this is a correctness bugfix against `US_ENT_TOUCHEDFILES`'s existing, already-approved promise, not a new capability.
- Decision 2: Proposed fix direction (to be finalized at L1/L2): convert `TouchStore`'s internal read-modify-write to fully **synchronous** `fs` calls (mirroring `messageQueue.ts`'s established, race-free precedent) rather than introducing a new per-key promise-chain/queue mechanism. This is simpler, reuses an already-proven pattern in this exact codebase, and requires no new abstraction — the write is small (per-entity JSON, at most low hundreds of entries) and infrequent enough (bounded by agent tool-call rate) that briefly blocking the event loop is an accepted, precedented tradeoff here (same tradeoff `messageQueue.ts` already makes on every message-queue read/write, including from `extension.ts` command handlers).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed (the related-risk check above satisfies CM's "flag similar consumers" request)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ENT_TOUCHEDFILES | US_ENT_TOUCHEDFILES | modified | New AC-6a added — the persistence mechanism (AC-6) SHALL guarantee no lost/overwritten entries under concurrent same-turn tool calls, regardless of ordering/timing. |

### New Requirements

None. Per the approved L0 decision, this is folded into the existing requirement as an amendment, not a new dedicated element.

### Conflicts Detected

None. AC-6a is additive to AC-6 (the persistence AC it strengthens) and does not contradict any other AC on `REQ_ENT_TOUCHEDFILES` or any other requirement.

### Decisions

- Decision 1: Folded into `REQ_ENT_TOUCHEDFILES` as new AC-6a (concurrency guarantee), immediately following AC-6 (the persistence-file AC it strengthens) — consistent with the L0-approved plan to amend, not create a new element, since this is a correctness property of the existing persistence mechanism, not a new feature surface.
- Decision 2: AC-6a is worded as an outcome guarantee ("every resulting touch SHALL be recorded... regardless of ordering or timing"), not as a mechanism prescription (e.g. "SHALL use synchronous I/O") — the *how* (sync fs calls, mirroring `messageQueue.ts`) belongs in `SPEC_ENT_TOUCHEDFILES` at L2; the REQ level states the guaranteed behavior only, consistent with how other REQs in this file separate outcome (REQ) from mechanism (SPEC).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (n/a — no new REQ, existing links unchanged)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_TOUCHEDFILES | REQ_ENT_TOUCHEDFILES | modified | `TouchStore` code sample's `_load`/`_save` switched from async `fs.promises` to synchronous `fs.readFileSync`/`writeFileSync`/`mkdirSync`; new AC (renumbered list item 5) documenting the concurrency guarantee; new Design Note explaining why synchronous I/O was chosen over a per-key promise-chain/queue abstraction, citing the `messageQueue.ts` precedent; new bugfix narrative paragraph (root cause + fix mechanism) placed directly after the code sample. |

### New Design Elements

None. Per the approved L0/L1 scope, this is folded into the existing `SPEC_ENT_TOUCHEDFILES` as an amendment, not a new dedicated element.

### Conflicts Detected

None. The updated code sample and new AC are additive/corrective to the existing spec's persistence mechanism description; no other AC, node type, or command in `SPEC_ENT_TOUCHEDFILES` is affected.

### Decisions

- Decision 1: `TouchStore.recordTouches()`/`removeEntry()`/`getEntries()` keep their existing `async`/`Promise`-returning signatures (interface compatibility with all call sites in `touchTracker.ts`, `treeFactory.ts`, `extension.ts`) — only the *internal* `_load`/`_save` become synchronous. An `async` function with no internal `await` still executes its entire body as one uninterruptible synchronous turn before returning, so the read-mutate-write critical section is fully atomic with respect to Node's single-threaded event loop; only the external `Promise` wrapper remains for call-site compatibility.
- Decision 2 (rejected alternative, documented as a Design Note): a per-entity-key promise-chain/queue (each call awaits the prior in-flight call for the same storage file) was considered and rejected — it fixes the same race but introduces a new abstraction (in-flight-promise map, its own lifecycle/cleanup) for a problem `messageQueue.ts` already solves in this codebase with plain synchronous I/O. Reusing the existing pattern is simpler and consistent with project KISS bias.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (n/a — no new SPEC, existing links unchanged)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_TOUCHEDFILES | REQ_ENT_TOUCHEDFILES (AC-6a added) | SPEC_ENT_TOUCHEDFILES (concurrency AC added, code sample fixed, Design Note added) | ✅ |

### Artefakt-Removal-Check

This CR adds ACs and amends an existing code sample/design note only. No user stories, requirements, or design elements removed. Check not applicable.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-18

#### Scope

Scoped review per CM notification: REQ_ENT_TOUCHEDFILES AC-6a, SPEC_ENT_TOUCHEDFILES's amended `TouchStore` code sample, and the sync-fs fix in `touchStore.ts`.

#### Findings

None.

#### Independent Verification (for the record)

- `touchStore.ts` independently re-read in full: `_load()`/`_save()` are fully synchronous (`fs.readFileSync`/`writeFileSync`/`mkdirSync`), with no `await` between load and save inside `recordTouches()`/`removeEntry()` — matches CD/val report exactly.
- `resolveTouchStorageKind()` (the actor-touched-files Round 1 storage-key fix) is untouched by this change — confirmed no regression to that mechanism.
- `src/tests/touched-files-write-race.test.ts` genuinely exercises the bug class: each `recordTouches()` call's body contains no `await`, so `Promise.all()` over multiple calls only proves race-freedom because the fix removed the yield point — this test would have failed against the pre-fix async implementation, making it a real regression test, not a tautology.
- GH #35 F5 verification (C-4, concurrent burst on live tree UI) already confirmed PASS and issue closed per terminal history — no outstanding UAT gap for this CR.

**Verdict: CLEAR.** No findings. Ready for merge.

---
