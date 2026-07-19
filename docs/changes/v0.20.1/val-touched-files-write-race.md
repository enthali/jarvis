# MECE Verification Report: touched-files-write-race

**Change Document:** docs/changes/touched-files-write-race.md  
**Branch:** feature/touched-files-write-race  
**Key Commits:**
  - L2 spec amendment: 581587a
  - Test protocol: tst-touched-files-write-race.md
  - Implementation: 5a57901 (bugfix commit)

**Verification Date:** 2026-07-18  
**Verified By:** MECE Engineer  
**Verdict:** ✅ **QUALITY PASS** (bugfix with comprehensive test coverage)

---

## Executive Summary

This CR fixes a confirmed data-loss race condition in the actor-touched-files feature (GH #18) by converting `TouchStore`'s internal read-modify-write I/O from asynchronous (`fs.promises`) to synchronous (`fs.readFileSync`/`writeFileSync`) calls. The fix:

- ✅ Implements REQ_ENT_TOUCHEDFILES AC-6a (concurrency guarantee) — new requirement
- ✅ Adds 10 automated unit tests (Group A/B/D from test protocol); Group C non-regression covered by actor-touched-files.test.ts
- ✅ Mirrors established codebase precedent (messageQueue.ts uses identical synchronous fs pattern)
- ✅ No API signature changes (recordTouches/removeEntry/getEntries keep async/Promise interfaces for call-site compatibility)
- ✅ No contradictions or gaps detected
- ✅ Test suite: 247/247 passing (up from 237, +10 new tests); 0 TS errors; Sphinx clean

**Root Cause (Confirmed):** Multiple PostToolUse events firing without await between them could each load the same entity's JSON, mutate independently, and race on write — last writer wins, silently losing other mutations and pre-existing entries.

**Fix:** Synchronous fs calls ensure read-mutate-write is atomic (never yields to event loop between load and save).

---

## Requirement Verification

### REQ_ENT_TOUCHEDFILES AC-6a (NEW)

**Requirement Text:**
> When multiple file-touching tool calls occur within the same turn (or otherwise overlap in time) and resolve to the same entity, **every** resulting touch SHALL be recorded — no entry from a concurrent call, and no previously-persisted entry, SHALL be silently lost or overwritten, regardless of the calls' relative ordering or timing. This closes a confirmed data-loss race in the read-modify-write persistence mechanism...

**Status:** ✅ **IMPLEMENTED**

**Implementation:**
- **File:** packages/core/src/engine/hooks/touchStore.ts
- **Method:** recordTouches() and removeEntry()
- **Mechanism:** Synchronous fs calls (readFileSync, writeFileSync, mkdirSync)

**Code Evidence:**
```typescript
// touchStore.ts, lines 60–73 (recordTouches)
async recordTouches(kind: string, name: string, relPaths: string[], touchKind: 'read' | 'write'): Promise<void> {
    const file = this._filePath(kind, name);
    const data = this._load(file); // sync — no await between load and save
    const now = new Date().toISOString();
    for (const relPath of relPaths) {
        const entry = data.files[relPath] ?? {};
        if (touchKind === 'write') { entry.lastEdited = now; } else { entry.lastRead = now; }
        data.files[relPath] = entry;
    }
    this._save(file, data); // sync — completes before this call yields
}

// touchStore.ts, lines 85–95 (_load and _save)
private _load(file: string): TouchFile {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return { files: {} }; } // fail-open
}

private _save(file: string, data: TouchFile): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
```

**Verification Mechanism:**
- No `await` between `_load()` and `_save()` → entire read-mutate-write body executes as one uninterruptible turn
- Node.js single-threaded event loop: synchronous calls never yield control
- Result: concurrent fire-and-forget dispatch of multiple recordTouches() calls cannot interleave

**Proof of Correctness:**
- ✅ Test A-1: 6 concurrent touches + 2 pre-existing = 8 total (all survive)
- ✅ Test A-2: 10 concurrent touches + 3 pre-existing = 13 total (all survive)
- ✅ Test A-3: concurrent read+write on same file merge into one consistent entry
- ✅ Test A-4: pre-existing entries preserved under concurrent burst
- ✅ Test A-5: n-path multi_replace concurrent with separate reads (all recorded correctly)

---

## Architectural Consistency

### Consistency with messageQueue.ts Precedent

**Status:** ✅ **CONSISTENT**

The fix mirrors an identical pattern already established in this codebase:

**messageQueue.ts (existing precedent):**
```typescript
// packages/core/src/engine/sessions/messageQueue.ts
export function readQueue(filePath: string): ... {
    const raw = fs.readFileSync(filePath, 'utf8'); // sync
    ...
}

export function writeQueue(filePath: string, queue: ...): void {
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2)); // sync
}

export function readAutoDelivery(adPath: string): ... {
    const raw = fs.readFileSync(adPath, 'utf8'); // sync
    ...
}

export function writeAutoDelivery(adPath: string, list: ...): void {
    fs.writeFileSync(adPath, JSON.stringify(list, null, 2)); // sync
}
```

**Documented Precedent Usage:**
- messageQueue.ts uses synchronous fs for read-modify-write against `.jarvis/state/` JSON files (same directory, same purpose)
- No latent concurrency bugs in messageQueue.ts (sync fs is why)
- Codebase convention: when multiple call sites can fire without queueing, synchronous fs is the right pattern

**Decision Rationale (CR document):**
> *Alternative considered and rejected:* a per-entity-key promise-chain/queue (each call awaits the prior in-flight call for the same storage file) — it fixes the race but introduces a new abstraction for a problem `messageQueue.ts` already solves in this codebase with plain synchronous I/O. Reusing the existing pattern is simpler and consistent with project KISS bias.

**Conclusion:** Architectural consistency confirmed; no new abstraction needed.

---

### Consistency with REQ_ENT_TOUCHEDFILES (AC-1 through AC-5)

**Status:** ✅ **CONSISTENT**

All prior ACs (event subscription, tool classification, session resolution, path handling) remain **unchanged** by this CR:

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | ✅ unchanged | PostToolUse subscription still the only subscription; no change to event filtering |
| AC-2 | ✅ unchanged | TOUCH_RULES allowlist unchanged (read_file, create_file, replace_string_in_file, multi_replace_string_in_file) |
| AC-3 | ✅ unchanged | Success/failure tracking decision unchanged (not tracked) |
| AC-4 | ✅ unchanged | Session_id correlation mechanism unchanged; still uses getEntityNameForSessionId() |
| AC-5 | ✅ unchanged | Path relativization unchanged; same cwd-relative calculation |
| **AC-6** | ✅ **strengthened** | Persistence mechanism now guaranteed atomic under concurrency (AC-6a) |
| AC-7–AC-14 | ✅ unchanged | Tree rendering, UI, context menu, remove action — all unchanged |

**Conclusion:** CR is purely a bugfix to the persistence layer; all spec-visible behavior preserved.

---

### Consistency with actor-activity-indicator

**Status:** ✅ **CONSISTENT** (no interaction)

The two features operate on completely independent subsystems:
- **activity-indicator:** Hook event subscription (ACTIVE_EVENTS), state tracking, tree decorator (iconPath)
- **touched-files:** Hook event subscription (PostToolUse), file path classification, persistence (JSON), tree rendering (hierarchy)

No shared state, no shared commands, no decorator collision. No interaction possible.

---

### Consistency with actor-owned-files-tree

**Status:** ✅ **CONSISTENT** (no interaction)

The two features operate on independent file-source types:
- **owned-files-tree:** Files live on the entity's own folder (recursive fs scan of `entity.folder`)
- **touched-files:** Files touched during agent execution (persisted as JSON, workspace-root-relative paths)

Both render as separate category nodes on the same entity leaf; no collision or interference.

---

## MECE Compliance Analysis

### Mutually Exclusive (ME)
✅ **PASS**

**Within REQ_ENT_TOUCHEDFILES:**
- AC-6 (persistence mechanism) and AC-6a (concurrency guarantee) are sequential, not overlapping
- AC-6 defines *what* is persisted; AC-6a defines the *concurrency property* of the persistence
- No overlapping scope; distinct concerns

**Across requirements:**
- touched-files-write-race fixes a bug in the actor-touched-files feature; it does not add new user-facing behavior
- AC-6a is purely internal (a correctness guarantee on existing AC-6 mechanism)
- No user-story-level change; existing US_ENT_TOUCHEDFILES unchanged

---

### Collectively Exhaustive (CE)
✅ **PASS**

**All aspects of the concurrency guarantee covered:**
- Root cause identified (unserialized async read-modify-write)
- Fix mechanism specified (synchronous fs calls)
- Test coverage: 10 automated cases (Group A/B/D) + F5 non-regression (Group C, via actor-touched-files.test.ts)
- Atomic-critical-section guarantee: read-mutate-write now executes as one uninterruptible turn

**No gaps in test coverage:**
- A-1 through A-5: Core concurrency scenarios (same entity, overlapping calls, pre-existing entries, n-path multi_replace)
- B-1, B-2: Cross-entity independence (separate JSON files, no shared lock)
- D-1 through D-3: Fail-open behavior (missing/corrupt file, missing directory)
- C-1 through C-6: Non-regression (single/sequential/read+write-merge, tree UI, remove, reload) — covered by actor-touched-files.test.ts + PM F5

---

### Gaps
✅ **PASS** — No gaps detected:

- **Concurrency coverage:** All scenarios from the confirmed GH #35 repro (6 near-simultaneous tool calls, same entity) are tested (A-1) and extended (A-2 with 10 calls)
- **Edge cases:** Same-file read+write (A-3), pre-existing entries (A-4), multi_replace-shaped n-path calls (A-5), cross-entity isolation (B-1/B-2)
- **Fail-open:** Missing/corrupt file handling preserved (D-1/D-2/D-3)
- **Backward compatibility:** API signatures (async/Promise) unchanged; call sites (touchTracker.ts, treeFactory.ts, extension.ts) require no changes

No gaps identified.

---

### Contradictions
✅ **PASS** — No contradictions detected:

- **Within CR:** AC-6 and AC-6a are complementary (AC-6 what, AC-6a how-to-guarantee)
- **With prior AC-1 through AC-5:** All unchanged; pure bugfix to AC-6 mechanism
- **With messageQueue.ts:** Identical pattern, no conflicts
- **With prior actor-touched-files verification:** This CR extends that feature with a correctness guarantee; prior verdicts still hold

No contradictions identified.

---

### Regressions
✅ **PASS** — No regressions detected:

- **Test suite:** 247/247 passing (all 237 prior tests + 10 new tests all pass)
- **TypeScript:** 0 errors
- **Sphinx:** 0 warnings
- **Call-site compatibility:** All callers of recordTouches/removeEntry/getEntries still use await (API signatures unchanged)
- **Tree rendering:** Unchanged
- **Context menu:** Unchanged
- **Remove action:** Unchanged
- **Hook subscription:** Unchanged

No regressions detected.

---

## Code Quality Summary

| Metric | Result | Notes |
|--------|--------|-------|
| **npm test** | ✅ 247/247 pass | 24 test files (+10 new tests for touched-files-write-race; all prior tests still pass) |
| **npx tsc -p packages/core** | ✅ 0 errors | All packages compile clean |
| **Sphinx build** | ✅ 0 warnings | Schema validation passed |
| **Implementation** | ✅ AC-6a verified | Atomic read-mutate-write critical section via synchronous fs calls |
| **Test Protocol** | ✅ 16/16 cases mapped | All groups (A/B/D) covered; Group C (non-regression) via actor-touched-files.test.ts + F5 |
| **Precedent** | ✅ messageQueue.ts | Identical synchronous fs pattern established in codebase; no new abstraction needed |

---

## Issues Found During Verification

✅ **None** — No issues found. AC-6a correctly implemented with comprehensive test coverage, clean architectural precedent, and no regressions.

---

## Sign-off

**MECE Compliance:**
- ✅ Mutually Exclusive: AC-6 and AC-6a sequential, not overlapping
- ✅ Collectively Exhaustive: All concurrency scenarios covered; no gaps
- ✅ No contradictions: Pure bugfix; all prior ACs preserved; precedent established
- ✅ No regressions: 247/247 tests passing, 0 TS errors, 0 Sphinx warnings
- ✅ Precedent validation: Mirrors messageQueue.ts's established synchronous fs pattern

**Scope & Scale:**
- Minimal, focused bugfix to the persistence layer
- No new user-facing behavior (AC-6a is a correctness guarantee on existing feature)
- API signatures unchanged (internal _load/_save become sync, but recordTouches/removeEntry keep async signatures)
- Comprehensive test coverage (10 automated unit tests + F5 non-regression)

**Design Rationale:**
- Synchronous fs calls ensure atomic read-mutate-write (no event-loop yielding between load and save)
- Reuses established codebase pattern (messageQueue.ts), avoiding new abstraction
- Matches Node.js event-loop model: single-threaded, sync calls are uninterruptible
- Mirrors same tradeoff messageQueue.ts already makes (brief synchronous blocking for persistence correctness)

**Formal Verdict:** ✅ **QUALITY PASS**

**Recommendation:** Ready to merge `feature/touched-files-write-race` → `develop` per syspilot workflow.

This bugfix **completes and stabilizes** the actor-touched-files feature (GH #18) by closing the confirmed data-loss race. All 8 features ready for sequential merge:
  1. actor-migration-command ✅
  2. actor-tool-rename ✅
  3. flow-updater-fix ✅
  4. entity-category-icon-order ✅
  5. actor-owned-files-tree ✅
  6. message-log-viewer ✅
  7. actor-activity-indicator ✅
  8. actor-touched-files ✅ (v1: initial feature)
  **9. touched-files-write-race ✅** (GH #35: bugfix, stability hardening)

---

**MECE Engineer**  
2026-07-18
