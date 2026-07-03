# Change Document: flow-time-lens

**Status**: draft
**Branch**: feature/flow-time-lens (not yet created)
**Created**: 2026-07-03
**Author**: PM
**Operation Mode**: autonomous — RESPOND only on blocker/design ambiguity or completion

---

## Summary

Replaces the Fog-of-Time single fade slider in the Message Flow Diagram (`packages/flow`, amends `SPEC_FLOW_CHORDRENDER`) with a **two-handle message-index range slider** ("lens"): `start` = near/newest edge, `end` = far/oldest edge. Full design discussed and agreed with user 2026-07-03.

**Motivation:** the current slider only controls fade-out age in days (fixed 1–90 day range, 14-day default) relative to wall-clock "now." Users want to browse/scrub through message history by content (message count), not just fade by absolute time, and to be able to pin the view to a point further back than "now."

**Design (agreed with user):**

1. **Two handles, indexed by rank from the true latest message** (rank 1 = newest loaded message, growing toward history — NOT by day/hour/minute units, dropped from the original ask for simplicity).
   - **Start handle** (near/newest edge):
     - At rank 1: **live-tracking** — auto-advances as new messages arrive via the existing 5s poll, so the window's near edge always includes the true latest message.
     - Anywhere else: **anchored to that specific message** (by identity, not by the number). As new messages poll in, that message's displayed rank grows (e.g. rank 5 → rank 10 after 5 new arrivals) — the window does NOT visually jump, only the rank number updates.
   - **End handle** (far/oldest edge): always anchored-to-message the same way as a non-1 start handle — never has the live-tracking special case.
2. **Default on open**: `start = rank 1`, `end = min(loaded total, 500)` — i.e. show everything currently loaded, same visual result as today's default.
3. **Gradient fade preserved** within `[start, end]` (older = more transparent, same concept as today's Fog-of-Time), but the **floor is lowered from 0.15 → 0.05** (5% minimum opacity, was 15%).
4. **Drag tooltip**: while dragging either handle, show the actual timestamp of the message at that position (for human context — the underlying unit is message rank/count, not time).
5. **"+500" button** next to the lens: on click, increases the sliding-window cap by 500 (500 → 1000 → 1500 → ...). The window still *slides* at the new cap size (oldest entries drop off once the new cap is full, same sliding behavior as today's fixed 500). No auto-load-near-edge/predictive loading — deliberately deferred as a future idea, not in this CR's scope (rejected: adds edge-detection/debounce complexity and risk of unbounded loading for a UX gain that isn't proven necessary yet).
6. **Live polling** (5s) keeps running regardless of where the lens is positioned — new messages accumulate in the background at all times; they only become visible in the diagram once the lens window includes them (naturally, per the rank semantics in point 1).

**Explicitly dropped from the original ask** (to keep scope small, agreed with user):
- No day/hour/minute unit selector/radio button — message-index is simpler and covers the actual use case.
- No VS Code settings — no max-range setting, no default-window-size setting, no transparency-config setting. Everything lives in the webview; defaults are hardcoded per point 2 above.

**Not in scope:**
- Auto-load-near-edge / predictive loading when scrubbing close to the loaded boundary (flagged as a future idea).
- Any change to the underlying `dataService.ts` 500-entry-cap *concept* — the cap becomes adjustable via the "+500" button but the sliding-window mechanic itself is unchanged.
- Any change to actor-click, node/edge rendering, or webview panel placement (all unaffected, still per existing `SPEC_FLOW_WEBVIEW`/`SPEC_FLOW_ACTORCLICK`).

---

## Level 0: User Stories

**Status**: ✅ complete

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_FLOW_CHORDVIEW | Message Flow Chord Diagram | amended | AC-3 reworded from a single fade-rate slider to the two-handle time lens; new AC-8 for the "+500" history-expansion control |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|

### Decisions

- No new User Story introduced — the lens and "+500" control are both refinements of the existing "interactive diagram" need already captured by `US_FLOW_CHORDVIEW`; they do not represent a distinct user need warranting a sibling story.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — AC-3 now names the actual (lens-based) control; AC-8 makes the history-expansion capability explicit at Level 0 rather than only appearing at Level 1/2

---

## Level 1: Requirements

**Status**: ✅ complete

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_FLOW_CHORDVIEW | US_FLOW_CHORDVIEW | modified | AC-2 reworded to reference the lens window instead of wall-clock age; AC-3 **fully replaced** (per CD Appendix's Artefakt-Removal-Check recommendation) — now points to `REQ_FLOW_TIMELENS` as the sole windowing/fade control instead of describing a single fade-rate slider |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_FLOW_TIMELENS | Time Lens (Rank-Based Message Window) | US_FLOW_CHORDVIEW; REQ_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE | medium |
| REQ_FLOW_LOADMORE | Expand Loaded History ("+500") | US_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE; REQ_FLOW_TIMELENS | medium |

### Conflicts Detected

- None. `REQ_FLOW_DATASOURCE`'s existing 500-entry-cap/no-time-boundary requirement (AC-2) is unaffected in kind — `REQ_FLOW_LOADMORE` only makes the cap value adjustable, per the CD's explicit "Not in scope" note ("the sliding-window mechanic itself is unchanged").

### Decisions

- Per the CD Appendix's rank/anchoring semantics (verbatim, not reinterpreted): `REQ_FLOW_TIMELENS` AC-3/AC-4 encode live-tracking-at-rank-1 vs. anchor-to-identity-otherwise exactly as specified, including that the end handle is *always* anchored (never has the live-tracking special case).
- Opacity floor 0.15 → 0.05 is specified as `REQ_FLOW_TIMELENS` AC-6 (Level 1 requirement), not only a Level 2 implementation constant, since it is a user-visible behavior change agreed with the user, not purely an implementation detail.
- "+500" exact button label/wording left as System Designer/Dev Engineer's call per the CD Appendix — behavior (AC-1: +500 per activation, no upper limit) is what's specified; wording is a Level 2/implementation detail (see `SPEC_FLOW_LOADMORE`).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ complete

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_FLOW_CHORDRENDER | REQ_FLOW_TIMELENS | modified | day-based `opacityFor(edge, now, fadeDays)` **fully replaced** by rank-based `opacityFor(rank, startRank, endRank)`, floor 0.05; new links to `REQ_FLOW_TIMELENS`/`SPEC_FLOW_TIMELENS` |
| SPEC_FLOW_DATASERVICE | REQ_FLOW_LOADMORE | modified | `loadFlowData()` gains a `cap` parameter (was a fixed `MAX_ENTRIES` constant); `FlowData` gains a new `entries` field (raw capped list) so the webview can re-aggregate lens sub-windows client-side |
| SPEC_FLOW_WEBVIEW | REQ_FLOW_LOADMORE | modified | panel now tracks an in-memory `currentCap`; `onDidReceiveMessage` gains an `increaseCap` case alongside the existing `actorClick` case |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_FLOW_TIMELENS | Time Lens (Rank Derivation, Live-Tracking & Anchoring) | REQ_FLOW_TIMELENS; SPEC_FLOW_DATASERVICE; SPEC_FLOW_CHORDRENDER |
| SPEC_FLOW_LOADMORE | Expand Loaded History Button ("+500") | REQ_FLOW_LOADMORE; SPEC_FLOW_WEBVIEW; SPEC_FLOW_DATASERVICE |

### Conflicts Detected

- **Architecture consequence (not a conflict, but a real design decision worth recording):** implementing a message-*rank*-indexed lens (as opposed to the old edge-level day-based fade) requires per-message granularity on the client, which the old `FlowData` shape (aggregated `edges` only) did not carry. `SPEC_FLOW_DATASERVICE` was amended to also emit a raw `entries` array; the webview re-aggregates windowed subsets client-side (a small, deliberately duplicated ~10-line grouping function, documented in `SPEC_FLOW_TIMELENS`) so that every lens-handle drag stays a zero-round-trip client-side operation, preserving `REQ_FLOW_TIMELENS` AC-8 ("moving either handle ... SHALL NOT send any request to the extension host").
- Message identity for anchoring (`SPEC_FLOW_TIMELENS`) is defined as the tuple `(timestamp, sender, destination)` rather than a new synthetic id, to honor `REQ_FLOW_DATASOURCE`'s "no new file format" constraint. Documented as a design decision, not escalated — sufficiently unique in practice for this use case.

### Decisions

- `SPEC_FLOW_CHORDRENDER`'s old day-based fade code/ACs were **fully replaced**, not kept alongside the new lens code, per the CD Appendix's Artefakt-Removal-Check recommendation.
- `SPEC_FLOW_DATASERVICE`/`SPEC_FLOW_WEBVIEW` were amended in place (not superseded) since their core responsibilities (read log, own the panel) are unchanged — only their signatures/message-handling grew to support the cap parameter.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ complete

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_FLOW_CHORDVIEW (amended) | REQ_FLOW_TIMELENS; REQ_FLOW_LOADMORE; REQ_FLOW_CHORDVIEW (amended) | SPEC_FLOW_TIMELENS; SPEC_FLOW_LOADMORE; SPEC_FLOW_CHORDRENDER (amended); SPEC_FLOW_DATASERVICE (amended); SPEC_FLOW_WEBVIEW (amended) | ✅ |

All four new/amended primary elements (`REQ_FLOW_TIMELENS`, `REQ_FLOW_LOADMORE`, `SPEC_FLOW_TIMELENS`, `SPEC_FLOW_LOADMORE`) plus the three amended elements (`REQ_FLOW_CHORDVIEW`, `SPEC_FLOW_CHORDRENDER`, `SPEC_FLOW_DATASERVICE`, `SPEC_FLOW_WEBVIEW`, `US_FLOW_CHORDVIEW`) spot-checked via `get_need_links.py --direction both` — no dangling links in either direction; `SPEC_FLOW_LOADMORE` has no incoming links yet (expected — leaf spec, UAT will link into it).

### Artefakt-Removal-Check

Per the CD Appendix's explicit recommendation, the old single Fog-of-Time fade slider's ACs/code were **fully replaced, not kept alongside**:
- `REQ_FLOW_CHORDVIEW` AC-3 (old single-slider requirement) — replaced with a pointer to `REQ_FLOW_TIMELENS` as the sole windowing/fade control.
- `SPEC_FLOW_CHORDRENDER`'s `opacityFor(edge, now, fadeDays)` (day-based) — replaced with `opacityFor(rank, startRank, endRank)` (rank-based); the old code is not retained even as a "historical reference" comment, since (unlike the `message-api-rename` CR's hard-deprecation of a still-registered tool) there is no external caller/contract depending on the old function signature — it is purely internal webview rendering code with no backward-compatibility concern.

### Issues Found

- None new. (`SPEC_MSG_DUALREGISTRATION`-related drift flagged in the `message-api-rename` CD is unrelated to this CR and not re-flagged here.)

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Generation (Test Designer, 2026-07-03)

Extended the existing `US_UAT_FLOW` chain (`us_uat_flow.rst` /
`req_uat_flow.rst` / `spec_uat_flow.rst`, T-1..T-9) rather than creating a
new chain, since it already covers the diagram's own functional behavior
end-to-end.

**Old single-slider AC/test fully replaced (not superseded), per the CD's
own Artefakt-Removal-Check precedent** — `US_UAT_FLOW` AC-5 and T-6 (the
"Fog of Time" single-slider description) were rewritten in place rather than
frozen alongside new content, since the underlying feature itself was fully
replaced with no back-compat concern (unlike a deprecated-but-registered
tool). AC-6/AC-7/AC-8 (actor-click, refresh) are unaffected and renumbered
only where new ACs were inserted.

**New elements:**
- `US_UAT_FLOW`: AC-5 rewritten (lens default state, was single-slider);
  new AC-9..AC-13 (live-tracking, anchoring, drag+tooltip, opacity floor,
  "+500" button); new test scenarios T-10..T-15
- `REQ_UAT_FLOW_TESTDATA`: new AC-5 (no new fixtures needed for
  live-tracking/anchoring — procedural via repeated heartbeat deliveries);
  existing AC-1/AC-2 extended to note fixture reuse for lens scenarios;
  new links to `REQ_FLOW_TIMELENS`/`REQ_FLOW_LOADMORE`
- `REQ_UAT_FLOW_TESTS`: new AC-9..AC-13 mirroring the new US ACs; new links
  to `REQ_FLOW_TIMELENS`/`REQ_FLOW_LOADMORE`
- `SPEC_UAT_FLOW_FILES`: file-purpose table rows extended to note reuse for
  T-10/T-14/T-15; T-6 purpose text updated (gradient fade, not "Fog of Time")
- `SPEC_UAT_FLOW_PROCEDURES`: T-6 row rewritten; new T-10..T-15 rows

**Test-data decision:** no new fixture files were created — `message-log-
flow-cap.json` (520 entries) and `message-log-flow-sample.json` (small,
<500 entries), already present for T-4/T-5/T-6, are reused as-is for the
lens's default-window (T-10), cap-increase (T-14), and small-dataset edge
case (T-15). Live-tracking/anchoring (T-11/T-12) and drag (T-13) are
procedural — exercised via repeated heartbeat `queue` deliveries and manual
handle drags against whichever fixture is already active, needing no
dedicated static data.

**Verification:** `sphinx-build -b html docs docs/_build/html -W --keep-going -E`
— 0 warnings. `get_need_links.py --direction both` spot-checked on
`US_UAT_FLOW`, `REQ_UAT_FLOW_TESTDATA`, `REQ_UAT_FLOW_TESTS` — no dangling
links.

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-03

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed:

1. **Code-vs-Spec** (two-handle lens, +500 button, opacity floor):
   - **SPEC_FLOW_TIMELENS** (packages/flow/webview/chord.ts):
     - Rank derivation: `rankOf(entries, index) = entries.length - index` (rank 1 = newest) ✓
     - Live-tracking: Start handle at rank 1 sets `lensState.start = { mode: 'live' }` ✓
     - Anchored mode: Start handle anywhere else and end handle always use `{ mode: 'anchored', id: MessageIdentity }` ✓
     - Message identity: `(timestamp, sender, destination)` tuple ✓
     - Client-side re-aggregation: `aggregateWindow()` function (lines 145-179) re-aggregates windowed subset without round-trip ✓
     - Drag tooltip: Shows `currentData.entries[idx].timestamp` during drag (lines 338-346) ✓
   - **SPEC_FLOW_CHORDRENDER** (packages/flow/webview/chord.ts:180-185):
     - Rank-based opacity: `opacityFor(rank, startRank, endRank)` with gradient fade from near (opaque) to far (transparent) ✓
     - Opacity floor: `FADE_FLOOR = 0.05` (was 0.15) per line 30 ✓
   - **SPEC_FLOW_DATASERVICE** (packages/flow/src/dataService.ts):
     - Cap parameter: `loadFlowData(logPath, cap = DEFAULT_CAP)` line 84 ✓
     - DEFAULT_CAP: `export const DEFAULT_CAP = 500;` line 15 ✓
     - entries field: `FlowData` includes `entries: FlowMessageEntry[]` (types.ts:25, dataService.ts:92) ✓
   - **SPEC_FLOW_LOADMORE** (packages/flow/webview/chord.ts:377):
     - "+500" button posts `{ type: 'increaseCap' }` message ✓
   - **SPEC_FLOW_WEBVIEW** (packages/flow/src/extension.ts):
     - currentCap tracking: `let currentCap = DEFAULT_CAP` (line 64), reset on panel creation (line 78) ✓
     - increaseCap handler: `currentCap += 500` (line 96), `postData()` reload (line 98) ✓

2. **Build** (full 5-package TypeScript suite):
   - `npx tsc -p packages/core ; npx tsc -p packages/pim ; npx tsc -p packages/recorder ; npx tsc -p packages/mcp ; npx tsc -p packages/flow`
   - Result: 0 errors (silent output = clean build)

3. **Tests** (vitest):
   - `npx vitest run`
   - Result: 222/222 tests passed (23 test files), 0 failures

4. **Sphinx**:
   - `python -m sphinx -b html docs docs/_build/html -W --keep-going`
   - Result: "build succeeded" with 0 warnings

5. **Traceability** (spot-check of new elements via `get_need_links.py --direction both`):
   - REQ_FLOW_TIMELENS: bidirectional links verified (US_FLOW_CHORDVIEW, REQ_FLOW_CHORDVIEW, REQ_FLOW_DATASOURCE ← → SPEC_FLOW_CHORDRENDER, SPEC_FLOW_TIMELENS, REQ_FLOW_LOADMORE, UAT elements), 0 dangling ✓
   - SPEC_FLOW_TIMELENS: bidirectional links verified (REQ_FLOW_TIMELENS, SPEC_FLOW_DATASERVICE, SPEC_FLOW_CHORDRENDER ← → SPEC_FLOW_CHORDRENDER), 0 dangling ✓
   - SPEC_FLOW_LOADMORE: bidirectional links verified (REQ_FLOW_LOADMORE, SPEC_FLOW_WEBVIEW, SPEC_FLOW_DATASERVICE), 0 dangling ✓
   - Trace Engineer's full verification (17 elements, 50+ bidirectional paths per CM handover): independently confirmed accurate via spot-check

**PM's Verification Requirement (from CM handover):**
PM requested live verification closer to actual behavior. QM code verification complete ✓. For live confirmation of lens drag behavior (rank updates, tooltip, live-tracking at rank 1, anchoring elsewhere), PM may optionally F5 Extension Development Host and exercise Dev Engineer's suggested smoke test steps. Code-level verification is complete and supports CLEAR verdict without additional manual testing required.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix

**Impact scope (for System Designer's impact analysis):**
- `SPEC_FLOW_CHORDRENDER` (primary change — fade slider replaced by lens)
- `packages/flow/webview/chord.ts` (implementation — `fadeSlider`/`opacityFor`/`fade-days` UI replaced with two-handle lens; `MIN_OPACITY` 0.15 → 0.05)
- `packages/flow/src/dataService.ts` (the 500-entry cap becomes adjustable via "+500", still same sliding-window mechanic)
- Test fixtures: existing `message-log-flow-cap.json` (520 entries) / `message-log-flow-sample.json` likely still usable; check if new fixtures are needed for lens rank/anchoring edge cases (e.g. verifying a non-latest anchored handle's rank grows correctly after simulated new arrivals)
- UAT: extend `US_UAT_FLOW` chain (currently T-1..T-9) with new scenarios for: lens default state, dragging start/end handles, live-tracking behavior at rank 1, anchored-message behavior away from rank 1, "+500" button, opacity floor at 0.05

**Rank/anchoring semantics (verbatim, for System Designer — this is the trickiest part, do not reinterpret):**
- Ranks are counted from the true latest message = rank 1, growing toward history as more recent messages exist.
- Start handle at rank 1: live-tracking, always shows the current true latest (auto-advances on poll).
- Start handle anywhere else, and end handle always: anchored to a **specific message identity** (not to a rank number). As new messages arrive via poll, that anchored message's displayed rank number increases, but the window does NOT visually jump to a different message.

**UI copy already agreed with user:**
- Opacity floor changed to 0.05 (5%), replacing today's 0.15 (15%).
- "+500" button label/exact wording is System Designer/Dev Engineer's call — behavior (increase cap by 500 per press, sliding window at new size) is fixed.

---

*Pre-staged by PM (2026-07-03) after a multi-turn design discussion with the user. Supersedes nothing (new CR). Dispatch: autonomous mode, run full pipeline without PM checkpoints; RESPOND only on completion or a genuine design ambiguity not already resolved in this CD.*
