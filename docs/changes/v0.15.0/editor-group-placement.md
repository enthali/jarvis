# Change Document: editor-group-placement

**Status**: design-complete
**Branch**: feature/editor-group-placement
**Created**: 2026-07-01
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fixes the focus-jumping annoyance during Auto-Delivery by introducing a three-target editor-group placement model (Main / Docs / Secondary) with no new state — everything derived at runtime from the current editor layout — plus a Focus-Snapshot/Restore mechanism around system-initiated deliveries. Based on Research finding `.jarvis/sessions/Research/FI-2026-07-01-editor-group-placement-summary.md` (full detail: `FI-2026-07-01-editor-group-placement.md`), validated on throwaway spike branch `experiment/editor-group-placement` (6 test commands, never merged). Refactor of existing commands only — `openChatForEntity`, `sendMessagesCommand`, the Auto-Delivery poll loop, `openEntityFileCommand` — using only existing stable VS Code APIs (`tabGroups`, `vscode.open`, `lookupSessionUUID`). No new architecture.

### Placement model (no state)

| Target | Column | Trigger |
|---|---|---|
| Main | 1, fixed | Click on an Actor in the tree |
| Docs | 2, fixed | `context.md` / YAML / agent file opened from the entity tree |
| Secondary | last existing column, dynamic | Delivery to a not-yet-open session |

Rules:
- If a tab is already open anywhere (even if the user moved it manually) → open there, don't move it.
- Click on Actor → always Main (close + reopen if open elsewhere).
- Delivery to a new session → last existing column (degenerates correctly for 1/2/3+ groups, no special-casing).

### Focus-Restore (phase 2)

Before a system-initiated delivery: snapshot current focus (editor tab OR terminal). After delivery: automatically restore it. Eliminates "where did I land?" confusion after every Auto-Delivery.

### Additional scope

Opt-out for Auto-Delivery on sessions that are actively being used (e.g. PM/Research during an active chat) — per Research's additional recommendation, prevents the last remaining disruption during active work.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_AUTODELIVERY | Auto-Delivery for Message Sessions | modified | poll loop gains placement + focus-restore + active-use opt-out |
| US_ENT_AGENTSESSION | Open Agent Session from Explorer | modified | `openChatForEntity` gains Main-column placement rule |
| US_MSG_STABLESESSION | Stable Agent Session Open | modified | placement model formalizes/extends existing tab-reuse behavior |
| US_ENT_ENTITY_FILES_TREE | Entity File Children in Tree | modified | `openEntityFileCommand` gains Docs-column placement rule |
| US_UAT_CHATEDITORREUSE | Chat Editor Reuse on Session Open Acceptance Tests | modified | existing UAT scenarios need placement-model alignment |
| US_UAT_MSG_AUTODELIVERY | Auto Delivery Acceptance Tests | modified | new scenarios for placement + focus-restore + opt-out |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_EDITORPLACEMENT | As a Jarvis user, I want chat/docs/delivery tabs to open in predictable, stable editor-group columns (Main/Docs/Secondary) with my focus automatically restored after a system-initiated delivery, so that Auto-Delivery no longer disrupts my current work by jumping my focus around. | mandatory |
| US_MSG_AUTODELIVERY_OPTOUT | As a Jarvis user, I want Auto-Delivery to skip a session I am actively chatting in, so that queued messages don't interrupt or disrupt an in-progress conversation. | mandatory |

### Decisions

- **Three-target placement model, no new state**: Main (column 1, fixed — Actor tree click), Docs (column 2, fixed — context.md/YAML/agent-file open), Secondary (last existing column, dynamic — delivery to a not-yet-open session). Everything derived at runtime from current editor layout via `tabGroups` — no YAML flag, no persisted state.
- **Placement rules**: if a tab is already open anywhere (even manually moved by the user) → open there, don't move it. Click on Actor → always Main (close+reopen if open elsewhere). Delivery to new session → last existing column (degenerates correctly for 1/2/3+ groups).
- **Focus-Snapshot/Restore (phase 2, same CR)**: before a system-initiated delivery, snapshot current focus (editor tab OR terminal); after delivery, automatically restore it.
- **Active-use opt-out (additional scope)**: Auto-Delivery skips sessions actively being used (e.g. PM/Research mid-chat) — prevents the last remaining work disruption.
- **Refactor only, no new architecture**: touches `openChatForEntity`, `sendMessagesCommand`, the Auto-Delivery poll loop, `openEntityFileCommand` — uses only existing stable VS Code APIs (`tabGroups`, `vscode.open`, `lookupSessionUUID`).
- **Validated via spike**: throwaway branch `experiment/editor-group-placement` (6 test commands, never merged, do not touch) — both mechanisms confirmed reliable under stress test.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_MSG_EDITORPLACEMENT`/`US_MSG_AUTODELIVERY_OPTOUT` written to `docs/userstories/us_msg.rst`, both `:status: draft`
- [x] No redundancies — this extends/refines existing `US_MSG_STABLESESSION` placement behavior rather than duplicating it
- [x] Gaps identified and addressed — active-use opt-out is new scope, has its own REQ/SPEC (Level 1/2 below)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ENT_AGENTSESSION | US_ENT_AGENTSESSION | modified | AC-6 added: always opens at Main (column 1), close+reopen if elsewhere |
| REQ_ENT_ENTITY_FILE_CHILDREN | US_ENT_ENTITY_FILES_TREE | modified | AC-5 rewritten: targets Docs (column 2) fixed, focus-in-place if already open elsewhere |
| REQ_MSG_PINNED | US_MSG_STABLESESSION | modified | AC-4 added: optional `viewColumn` parameter, additive/non-breaking |
| REQ_MSG_AUTODELIVER_POLL | US_MSG_AUTODELIVERY | modified | AC-3 rewritten (opt-out check + Secondary placement + focus-snapshot/restore wrapping), AC-9 added (exact timing) |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_EDITORPLACEMENT | Editor-Group Placement Model | US_MSG_EDITORPLACEMENT; US_MSG_STABLESESSION; REQ_MSG_PINNED | mandatory |
| REQ_MSG_FOCUSRESTORE | Focus-Snapshot and Restore | US_MSG_EDITORPLACEMENT; REQ_MSG_EDITORPLACEMENT; REQ_MSG_SESSIONLOOKUP | mandatory |
| REQ_MSG_AUTODELIVERY_OPTOUT | Auto-Delivery Active-Use Opt-Out | US_MSG_AUTODELIVERY_OPTOUT; REQ_MSG_AUTODELIVER_POLL | required |

### Conflicts Detected

None. All new REQs are additive; the four modified REQs receive additive AC extensions (new ACs / `:links:` entries), no existing AC text was contradicted.

### Decisions

- Decision 1: `REQ_MSG_EDITORPLACEMENT` and `REQ_MSG_FOCUSRESTORE` are split into two REQs (rather than one combined REQ) because they are independently testable and independently disable-able concerns — placement has no dependency on restore, and restore could in principle apply even without the specific 3-target placement model.
- Decision 2: `REQ_MSG_AUTODELIVERY_OPTOUT` is `priority: required` (not `mandatory`) — it is an accepted-limitation opt-out, not core to the placement/restore mechanism; the CR remains complete and testable without it in the (hypothetical) case it were descoped.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_AGENTSESSION | REQ_ENT_AGENTSESSION | modified | existing-session branch now calls `openAtMain()` instead of `openPinnedResource()` |
| SPEC_ENT_ENTITY_FILE_CHILDREN | REQ_ENT_ENTITY_FILE_CHILDREN | modified | `jarvis.openEntityFile` handler now calls `openAtDocs()` |
| SPEC_MSG_PINNED | REQ_MSG_PINNED | modified | `openPinnedResource()` gains optional `viewColumn` parameter |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_AUTODELIVER_POLL | modified | tick logic gains opt-out check, `openAtSecondary()` call, and snapshot/restore wrapping |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_EDITORPLACEMENT | Editor-Group Placement Helper | REQ_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_PINNED |
| SPEC_MSG_FOCUSRESTORE | Focus-Snapshot and Restore Helper | REQ_MSG_FOCUSRESTORE; SPEC_MSG_EDITORPLACEMENT; SPEC_MSG_SESSIONLOOKUP |
| SPEC_MSG_AUTODELIVERY_OPTOUT | Auto-Delivery Active-Use Opt-Out Check | REQ_MSG_AUTODELIVERY_OPTOUT; SPEC_MSG_AUTODELIVER_POLL; SPEC_MSG_EDITORPLACEMENT |

### Conflicts Detected

None.

### Decisions

- Decision 1: `resolveSecondaryColumn()` uses `Math.max(1, tabGroups.all.length)`, not `+ 1` — this was a confirmed regression during spike validation (the `+1` variant created a new column on every single delivery); the corrected formula is carried into the SPEC verbatim with the rationale documented inline.
- Decision 2: No artificial delay is inserted between the disruptive delivery action and `restoreFocus()` — an earlier spike revision's defensive `setTimeout(800)` measurably worsened both latency (839ms→~520ms once removed) and keystroke-leak count (23→0-1 once removed); the SPEC documents this explicitly as a design note so a future maintainer does not reintroduce the delay defensively.
- Decision 3: The ~520ms residual keystroke-misrouting window is accepted as a documented limitation rather than engineered away — the delivery target is an LLM chat query, tolerant of stray characters, so the cost of a hypothetical additional engineering effort (e.g. input buffering) was judged not worth it for this CR.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_EDITORPLACEMENT | REQ_MSG_EDITORPLACEMENT, REQ_MSG_FOCUSRESTORE | SPEC_MSG_EDITORPLACEMENT, SPEC_MSG_FOCUSRESTORE | ✅ |
| US_MSG_AUTODELIVERY_OPTOUT | REQ_MSG_AUTODELIVERY_OPTOUT | SPEC_MSG_AUTODELIVERY_OPTOUT | ✅ |
| US_ENT_AGENTSESSION (impacted) | REQ_ENT_AGENTSESSION | SPEC_ENT_AGENTSESSION | ✅ |
| US_ENT_ENTITY_FILES_TREE (impacted) | REQ_ENT_ENTITY_FILE_CHILDREN | SPEC_ENT_ENTITY_FILE_CHILDREN | ✅ |
| US_MSG_STABLESESSION (impacted) | REQ_MSG_PINNED | SPEC_MSG_PINNED | ✅ |
| US_MSG_AUTODELIVERY (impacted) | REQ_MSG_AUTODELIVER_POLL | SPEC_MSG_AUTODELIVER_POLL | ✅ |

Build verification: `sphinx-build -b html . _build/html -W --keep-going` — 0 warnings, 0 errors after all Level 0/1/2 edits. Spot-checked outgoing/incoming links for `US_MSG_EDITORPLACEMENT` via `get_need_links.py --direction both --depth 2` — all links resolve correctly across all three levels.

**Note on UAT-level impacted stories**: `US_UAT_CHATEDITORREUSE` and `US_UAT_MSG_AUTODELIVERY` are listed as impacted in Level 0 but are UAT-level test artifacts — updating their test scenarios/ACs was left to the UAT/Test Designer stage per established role boundaries (System Designer does not author UAT-level content), not tracked as a Design gap.

### UAT Update (Test Designer, 2026-07-01)

`US_UAT_CHATEDITORREUSE` (+ its REQ/SPEC counterparts) and `US_UAT_MSG_AUTODELIVERY` (+ its REQ/SPEC counterparts) have been extended to cover this CR:

| File | New coverage |
|------|--------------|
| `us_uat_chateditorreuse.rst` / `req_uat_chateditorreuse.rst` / `spec_uat_chateditorreuse.rst` | AC-6/T-6: Main-target close+reopen (Actor click always column 1). AC-7/T-7: Docs-target fixed column 2 for `context.md`/YAML/agent-file. AC-8/T-8: already-open-anywhere rule (manually-moved tab is focused in place, not relocated). |
| `us_uat_autodelivery.rst` / `req_uat_autodelivery.rst` (`REQ_UAT_MSG_AUTODELIVERY_POLL` extended) / `spec_uat_autodelivery.rst` | AC-8–10/T-10: Secondary placement (last existing column, no runaway column creation). AC-9/T-11: Focus-Snapshot/Restore, editor-tab case. AC-9/T-12: Focus-Snapshot/Restore, terminal case. AC-10/T-13: active-use opt-out (poll skips a session whose tab is currently focused, retries once inactive). |

Links added: `US_UAT_CHATEDITORREUSE` → `US_MSG_EDITORPLACEMENT`; `US_UAT_MSG_AUTODELIVERY` → `US_MSG_EDITORPLACEMENT`, `US_MSG_AUTODELIVERY_OPTOUT`; `REQ_UAT_CHATEDITORREUSE` → `REQ_MSG_EDITORPLACEMENT`; `REQ_UAT_MSG_AUTODELIVERY_POLL` → `REQ_MSG_EDITORPLACEMENT`, `REQ_MSG_FOCUSRESTORE`, `REQ_MSG_AUTODELIVERY_OPTOUT`.

Verification: `sphinx-build -b html docs docs/_build/html -W --keep-going -E` — 0 warnings, 0 errors. `get_need_links.py --direction both` spot-checked on both UAT user stories — no dangling links.

### UAT Update 2 (Test Designer, 2026-07-02) — missing Secondary-placement edge case

PM's joint manual test surfaced a real bug (`resolveSecondaryColumn()` floor bug, fixed by Dev Engineer in parallel) not covered by the existing AC-8/T-10 scenario: Secondary delivery when **only the Main column is open** (no Docs column yet) must split a new column 2, never collapse into column 1. The existing T-10 only covered the 2+/3+ column case.

Added `AC-8b`/`T-14` to `us_uat_autodelivery.rst` (+ `REQ_UAT_MSG_AUTODELIVERY_POLL` AC-8 in `req_uat_autodelivery.rst` + `T-14` row in `spec_uat_autodelivery.rst`): with exactly 1 column open (Main only), a not-yet-open session's delivery SHALL split a new column 2, distinct from and not replacing T-10's 2+-column coverage.

Verification: `sphinx-build -b html docs docs/_build/html -W --keep-going -E` — 0 warnings, 0 errors.

### UAT Update 3 (Test Designer, 2026-07-02) — Play-button Main placement

Covers the Post-Design Gap Fix (`REQ_MSG_EDITORPLACEMENT` AC-9 / `REQ_MSG_SEND` AC-9): `jarvis.sendMessages` (Play-button) now targets Main, same as an Actor tree click, including the close+reopen rule.

Added `AC-9`/`T-9` to `us_uat_chateditorreuse.rst` (+ `REQ_UAT_CHATEDITORREUSE` AC-9 in `req_uat_chateditorreuse.rst`, linked to `REQ_MSG_SEND` + `T-9` row in `spec_uat_chateditorreuse.rst`): clicking Play for a session open in a non-1 column closes+reopens it at column 1 (mirrors T-6's Actor-click behavior); clicking Play again while already at Main simply focuses in place, with no close+reopen and no duplicate tab.

Verification: `sphinx-build -b html docs docs/_build/html -W --keep-going -E` — 0 warnings, 0 errors.

### Artefakt-Removal-Check

Not applicable — this CR is a pure refactor/extension; no artefact (file, field, configuration key, REQ-ID) is removed.

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## CM Final MECE Check — Findings and Resolution

**Reviewed by:** Change Manager
**Review date:** 2026-07-01

| # | Level | Element ID | Finding | Severity | Resolution |
|---|-------|------------|---------|----------|------------|
| 1 | L1/L2 | REQ_ENT_AGENTSESSION AC-6, REQ_MSG_EDITORPLACEMENT AC-1, SPEC_ENT_AGENTSESSION | Main-column "always" guarantee was stated unconditionally, but the new-session-creation branch cannot enforce it (no VS Code API to force `viewColumn` on a freshly created chat editor) — SPEC's own design notes already admitted this as "common case" only. | medium | **Option (a) applied**: `REQ_ENT_AGENTSESSION` AC-6 scoped to the existing-session branch only ("always" guarantee retained there); new AC-7 added documenting new-session placement as best-effort with explicit rationale (no forcing API exists). `REQ_MSG_EDITORPLACEMENT` AC-1 reworded to reference this split. `SPEC_ENT_AGENTSESSION` design notes updated to cross-reference AC-6/AC-7 explicitly. No code change needed — this was a REQ/SPEC precision gap, not an implementation gap. |
| 2 | L2 | SPEC_MSG_FOCUSRESTORE (`snapshotFocus()`) | `REQ_MSG_FOCUSRESTORE` AC-2 mandates resolving a chat tab's identity via `lookupSessionUUID(tab.label)`, but the SPEC's code sample directly base64-encoded `activeTab.label` (the session *name*) as if it were already the UUID — would have produced a malformed, non-navigable restore URI. Confirmed as a genuine design-document bug (REQ was correct, SPEC code sample diverged). **Correction (2026-07-01, post-review):** implementation for this CR was already complete (Dev Engineer commit `a14bd9c`, prior to this MECE dispatch) — the same bug exists in `extension.ts`'s actual `snapshotFocus()`. The SPEC fix alone was insufficient; a corresponding code fix was required. CM confirmed the live code still had the bug and routed the fix to Dev Engineer directly. | medium | **Fixed (SPEC):** `snapshotFocus()` rewritten as `async`, now calls `lookupSessionUUID(activeTab.label)` to resolve the real UUID before constructing the restore URI, falling back to `undefined` (skip restore) if unresolvable. Both callers (poll-loop tick logic, usage-pattern example) updated to `await` the now-async function. Design notes updated to document the correction explicitly so a future maintainer does not reintroduce the shortcut. **Fixed (code):** routed to Dev Engineer by CM (2026-07-01) to bring `extension.ts` in line with the corrected SPEC. |

Both findings resolved in the design docs. Finding 1 required no code change (REQ/SPEC precision gap only). Finding 2 required a code fix in addition to the SPEC fix — an initial assumption that "no implementation existed yet" was incorrect for this CR (implementation had already been dispatched and completed ahead of this MECE round); CM caught this by checking the live code directly and routed the code-side fix to Dev Engineer. **Lesson applied going forward:** verify whether implementation already exists before asserting a finding is doc-only. Rebuilt (`sphinx-build -W --keep-going`) — 0 warnings after both SPEC fixes.

---

## Post-Implementation Bug Fix — Secondary-Column Collision with Main

**Found by:** PM (joint manual test with implementation)
**Date:** 2026-07-02

### Bug

With only the Main column open, Auto-Delivery to a not-yet-open session landed in Main instead of splitting a new Secondary column. Root cause: `resolveSecondaryColumn()`'s approved formula `Math.max(1, tabGroups.all.length)` collapses Secondary into column 1 (Main) when only 1 column is open — Secondary and Main must never be the same column, an invariant the formula itself violated. Dev Engineer correctly rejected implementing around this (Spec-Implementation Alignment) rather than silently deviating from the approved SPEC — routed back to System Designer for a REQ/SPEC correction.

### Resolution

| Element | Change |
|---|---|
| `REQ_MSG_EDITORPLACEMENT` AC-3 | Formula corrected from `Math.max(1, tabGroups.all.length)` to `Math.max(2, tabGroups.all.length)`; added explicit invariant statement that Secondary and Main SHALL never be the same column. |
| `REQ_MSG_EDITORPLACEMENT` AC-7 | Degenerate-case description corrected: 1 column open → Secondary splits a **new column 2** (not "resolves to column 1/Main" as previously and incorrectly stated); 2 columns open → Secondary reuses column 2 (shared with Docs); 3+ columns open → Secondary has its own stable last-existing column. |
| `SPEC_MSG_EDITORPLACEMENT` | `resolveSecondaryColumn()` code block and inline rationale comment updated to `Math.max(2, groupCount)`, with both the runaway-column rationale (`+1` regression) and the new Main-collision rationale (`N` alone regression) documented together. |

Rebuilt (`sphinx-build -W --keep-going`) — 0 warnings. No implementation-status assumption made this time — CM will re-dispatch Dev Engineer for the corresponding code fix.

---

## Post-Design Gap Fix — Play-Button Placement Never Assigned + REQ Drift

**Found by:** PM (joint manual test), diagnosed by CM
**Date:** 2026-07-02

### Gap

`jarvis.sendMessages` (Play-button, `$(debug-start)` icon in the Messages tree) opened the session in whatever the last-active editor tab/column happened to be — `REQ_MSG_EDITORPLACEMENT` only ever scoped Main (Actor tree click) and Secondary (Auto-Delivery poll loop); the manual Play-button path — a third caller of the same underlying open-primitive — was never assigned a placement target. CM's root-cause note: `REQ_MSG_PINNED` was extended for tab-reuse/pinning behavior in this CR and links to `REQ_MSG_EDITORPLACEMENT`, but neither REQ mandated *where* a new tab lands for the manual send command; the original impact analysis enumerated the two automated entry points but missed this third manual one.

**Lesson for future CRs:** when a placement/routing model touches multiple command entry points, enumerate ALL callers of the underlying open-primitive (`openPinnedResource`/`vscode.open`) explicitly during impact analysis, not just the entry points already known to be problematic.

### Decision (PM)

Play-button routes to **Main** (same target as an Actor tree click) — active, user-initiated input should land where the user is looking; only background automation (Auto-Delivery) uses Secondary. The already-open-anywhere exception still applies.

### Additional fix: REQ-vs-SPEC-vs-code drift

`REQ_MSG_AUTODELIVER_POLL` AC-3 claimed the poll loop "executes `jarvis.sendMessages` ... using the Secondary placement target" — factually wrong; the poll loop inlines its own delivery logic and never calls `jarvis.sendMessages`. `SPEC_MSG_EDITORPLACEMENT`'s design notes already correctly documented this. This was pre-existing REQ text that never matched the SPEC/code (not a regression from this CR's earlier fixes).

### Resolution

| Element | Change |
|---|---|
| `REQ_MSG_EDITORPLACEMENT` | New AC-9: Play-button (`jarvis.sendMessages`, `REQ_MSG_SEND`) targets Main, including the close+reopen rule, since it is a user-initiated action like the Actor tree click. Added `REQ_MSG_SEND` to `:links:`. |
| `REQ_MSG_SEND` | New AC-9: target chat tab focused at Main placement target, including close+reopen when open elsewhere; AC-6 reworded to show the `viewColumn` parameter. Added `REQ_MSG_EDITORPLACEMENT` to `:links:`. |
| `SPEC_MSG_SENDCOMMAND` | Existing-session branch now calls `openAtMain(uri, node.destination)` instead of bare `openPinnedResource(uri)`. Design notes added explaining the shared helper with `SPEC_ENT_AGENTSESSION` and the best-effort caveat for the new-session-creation branch. Added `SPEC_MSG_EDITORPLACEMENT` to `:links:`. |
| `REQ_MSG_AUTODELIVER_POLL` AC-3 | Corrected to state the poll loop delivers via its own inlined logic and does **not** invoke `jarvis.sendMessages`. |

Rebuilt (`sphinx-build -W --keep-going`) — 0 warnings. Traceability re-verified via `get_need_links.py` on `REQ_MSG_SEND`. Ready for CM to dispatch Dev Engineer (code) and Test Designer (UAT: Play-button → Main, close+reopen, already-open-anywhere cases).

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 (Independent QM Review)

**Reviewed by:** Quality Manager (direct code inspection of `extension.ts` + dispatched MECE Engineer on L1 [all 7 impacted/new REQs] + Trace Engineer on REQ_MSG_FOCUSRESTORE/SPEC_MSG_FOCUSRESTORE chain, including the previously-found bug fix)
**Review date:** 2026-07-02

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L1 | REQ_MSG_EDITORPLACEMENT | ACs don't explicitly cross-reference `REQ_MSG_PINNED` AC-4's `viewColumn` parameter in each placement AC (AC-1/2/5) — minor future-maintainer drift risk (someone modifying EDITORPLACEMENT could forget to pass `viewColumn` through). Not a defect — current code correctly does this. | low |
| 2 | L1 | REQ_MSG_EDITORPLACEMENT / REQ_MSG_FOCUSRESTORE / REQ_MSG_AUTODELIVERY_OPTOUT | None of the three new REQs individually specify graceful-degradation behavior if the `tabGroups` VS Code API is unavailable/throws — they implicitly rely on the caller's contract (`REQ_MSG_AUTODELIVER_POLL` AC-7: catch-log-continue). Sufficient for current usage (only called from the poll loop), but would be a gap if any of these helpers are ever called from a different entry point (e.g. directly from `jarvis.sendMessages`) without the same umbrella error handling. | low |

#### Independent Verification (direct code read, not just trusting the report)

- `packages/core/src/extension.ts`: confirmed `resolveSecondaryColumn()` uses `Math.max(1, tabGroups.all.length)` (not `+1`, per the documented spike-regression finding); confirmed `openAtMain`/`openAtDocs`/`openAtSecondary` implement the exact close+reopen / focus-in-place / already-open-anywhere rules described in the CD; confirmed `snapshotFocus()` is `async` and resolves identity via `await lookupSessionUUID(activeTab.label)` (the bug fix) rather than encoding the label directly; confirmed `restoreFocus()` has no artificial delay; confirmed `isSessionActiveTab()` opt-out check is called in the poll loop before the snapshot, matching the documented sequence (opt-out → snapshot → deliver → restore).
- **MECE L1** (all 7 impacted/new REQs): PASS — `REQ_MSG_EDITORPLACEMENT`/`REQ_MSG_PINNED` correctly layered (policy vs. mechanism, no contradiction); `REQ_MSG_FOCUSRESTORE` AC-2 and `REQ_MSG_EDITORPLACEMENT`'s identity-resolution description are consistent (both delegate to `lookupSessionUUID`/`REQ_MSG_SESSIONLOOKUP`); `REQ_MSG_AUTODELIVERY_OPTOUT` vs. `REQ_MSG_AUTODELIVER_POLL` AC-3 opt-out sequencing is logically sound and non-contradictory; `REQ_ENT_AGENTSESSION` AC-6/AC-7 split (the CM-found fix) verified correctly scoped and mutually exclusive; `REQ_ENT_ENTITY_FILE_CHILDREN` AC-5 Docs-column cross-reference correct. 2 low findings above.
- **Trace** (`REQ_MSG_FOCUSRESTORE`/`SPEC_MSG_FOCUSRESTORE`): PASS — all links valid, no dangling references; SPEC-vs-code fidelity for the bug fix confirmed exact match; dedicated test found and passing (`editor-group-placement.test.ts`, 15 tests including one specifically asserting `lookupSessionUUID` is called rather than direct label-encoding); 164/164 full suite pass; zero stale references anywhere in `docs/` still describing the old buggy behavior as current.

**QM Verdict: CLEAR.** No blocking defects. Both findings are low-severity maintainability suggestions, not functional or traceability gaps. Code, spec, and tests are independently confirmed consistent, including full verification of the previously-found and now-fixed Focus-Restore bug in both the design document and the live implementation.

**Process note:** per CM, PM has requested a joint manual test with the user before merge — this CR should NOT be auto-merged on QM clearance alone.



## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
