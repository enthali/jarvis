# Change Document: jarvis-syspilot

**Status**: complete
**Branch**: feature/jarvis-syspilot
**Created**: 2026-07-20
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Add an optional Jarvis module **`jarvis-syspilot`** that manages the install
and update lifecycle of [syspilot](https://github.com/enthali/syspilot) from
within VS Code. The module detects a new syspilot version and hands off to
syspilot's own Setup Agent — it never asks the user whether to install and
never installs. This keeps syspilot fully usable without Jarvis.

**Contract (corrected from GH #39):** the interface between Jarvis and syspilot
is the **Frontmatter version in `syspilot.setup.agent.md`** — NOT
`bootstrap.json`. `bootstrap.json` is syspilot-internal; we only copy it blindly
along with the agent. The upstream agent is fetched from a **pinned syspilot
Release Tag** (typically head of `main`) at `syspilot/agents/syspilot.setup.agent.md`.

**Flow:**
1. On VS Code **startup**: if `.github/agents/syspilot.setup.agent.md` is
   absent, copy the current (release-tag-pinned) agent + bootstrap.json and
   send an "update / initial setup available" message. If present, read its
   Frontmatter version and compare with upstream.
2. **Versions differ** → ensure the **"Syspilot Setup Engineer"** actor exists
   (create if missing) → send it a message.
3. **Message = our injected prompt** (not syspilot behaviour): "A new syspilot
   version is available. Install it, suspend for X days, or skip this version?"
   - Suspend → agent calls **`jarvis.delaySyspilotUpdate(<days>)`**, aborts setup.
   - Skip → agent calls **`jarvis.SyspilotSkipThisVersion()`**; we remember the
     version and stop notifying for it.
4. **Manual trigger**: command **`jarvis.syspilotUpdate`** forces a re-check and
   **ignores both** suspend and skip state.
5. **Weekly**: user optionally configures a heartbeat job on the command. The
   module itself only does startup + command — no internal scheduler.

**Opt-out:** complete opt-out = uninstall the module. No separate "don't manage"
state.

**Supply-chain requirement:** the agent is fetched only from a pinned syspilot
Release Tag (trusted source), never from an unverified location.

**GitHub Issue(s)**: #39

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

_(none modified — existing US_MOD_INSTALL and US_ACT_ACTORS are referenced but unchanged)_

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_SPL_LIFECYCLE | Syspilot Version Detection and Handoff | optional |

### Decisions

- Decision 1: Single US covers the entire feature scope (detection + handoff + suspend/skip + manual). The feature is atomic — partial delivery doesn't make sense.
- Decision 2: Priority is `optional` — the module is an add-on, not required for core Jarvis functionality.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (US_MOD_INSTALL covers packaging generically; US_SPL covers the syspilot-specific lifecycle feature)
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

_(none modified)_

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_SPL_PACKAGE | Syspilot Module Package | US_SPL_LIFECYCLE | optional |
| REQ_SPL_STARTUP_CHECK | Startup Version Check | US_SPL_LIFECYCLE | optional |
| REQ_SPL_ACTOR | Actor Provisioning | US_SPL_LIFECYCLE | optional |
| REQ_SPL_NOTIFY | Notification Message | US_SPL_LIFECYCLE | optional |
| REQ_SPL_SUSPEND | Suspend Tool | US_SPL_LIFECYCLE | optional |
| REQ_SPL_SKIP | Skip Version Tool | US_SPL_LIFECYCLE | optional |
| REQ_SPL_MANUAL | Manual Update Command | US_SPL_LIFECYCLE | optional |
| REQ_SPL_SUPPLY_CHAIN | Supply-Chain Integrity | US_SPL_LIFECYCLE | optional |
| REQ_SPL_STATE | State Persistence | US_SPL_LIFECYCLE | optional |

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: Tools are registered as LM tools (via `registerTool`) so the Setup Agent can call them conversationally — no special tool namespace infix needed since these are core-level commands in an add-on (the `jarvis_` prefix is sufficient per REQ_ENG_TOOLNS).
- Decision 2: State file lives in `.jarvis/syspilot-state.json` (workspace-level, not global) — each workspace can track its own syspilot state independently.
- Decision 3: The module uses `fetch()` (Node 18+ native) rather than adding an HTTP dependency.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

_(none modified — existing SPEC_MOD_MONOREPO and SPEC_MOD_CORE_PKG are referenced but unchanged)_

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_SPL_PACKAGE | Syspilot Module Package Structure | REQ_SPL_PACKAGE |
| SPEC_SPL_STARTUP | Startup Version Check Flow | REQ_SPL_STARTUP_CHECK, REQ_SPL_SUPPLY_CHAIN, REQ_SPL_STATE |
| SPEC_SPL_ACTOR | Actor Provisioning | REQ_SPL_ACTOR |
| SPEC_SPL_NOTIFY | Notification Message Construction | REQ_SPL_NOTIFY |
| SPEC_SPL_SUSPEND | Suspend Command | REQ_SPL_SUSPEND, REQ_SPL_STATE |
| SPEC_SPL_SKIP | Skip Version Command | REQ_SPL_SKIP, REQ_SPL_STATE |
| SPEC_SPL_MANUAL | Manual Update Command | REQ_SPL_MANUAL |
| SPEC_SPL_STATE | State File | REQ_SPL_STATE |

### Conflicts Detected

_(none)_

### Decisions

- Decision 1: The module uses `packages/syspilot/` following the established monorepo layout pattern.
- Decision 2: Actor provisioning uses the core API's `createActor` (not direct filesystem manipulation), ensuring consistency with the actor framework.
- Decision 3: Message delivery relies entirely on the existing auto-delivery mechanism — no custom delivery or polling in this module.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_UAT_SPL | REQ_UAT_SPL_TESTDATA, REQ_UAT_SPL_TESTS | SPEC_UAT_SPL, SPEC_UAT_SPL_FILES | ✅ |

### Artefakt-Removal-Check

*Not applicable — this CR adds a new module, removes no artefact.*

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [x] Issue 1: QM Round 1 medium finding — SPEC_SPL_ACTOR AC-3 wrong actor path (`.jarvis/sessions/` → `.jarvis/actors/`). Fix-now, corrected in spec + val report.
- [x] Issue 2: QM Round 1 low finding — CD boilerplate unfilled, Status stale. Fix-now, closed by this finalisation.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with the rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-20

#### Scope

Scoped review per CM notification: the new `packages/syspilot` module, the `JarvisCoreApi.sendMessage()` API addition, actor provisioning, and the supply-chain fetch path.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L2 | SPEC_SPL_ACTOR (AC-3) | States "The actor folder is placed under `.jarvis/sessions/Syspilot Setup Engineer/` (standard actor storage path)." This is factually wrong: `configPaths.getActorsDir()`/`ensureActorsDir()` (established since v0.17.0's actor-dualpath-scanner CR, and independently confirmed in `extension.ts`'s `jarvis_createActor` handler) resolve to `.jarvis/actors/`, not `.jarvis/sessions/`. The actual runtime call path (`ensureActor` → `api.invokeTool('jarvis_createActor', ...)` → core's handler) is correct at the code level; only the spec's prose description of the storage path is stale/wrong. The val report repeats the same incorrect path verbatim, so Trace did not catch it. | medium |
| 2 | CD (process) | jarvis-syspilot.md | Same recurring pattern flagged in the immediately-preceding msg-notify-sender-id review: the CD's own **Final Consistency Check** section is still the unfilled template (Status placeholder, `US_xxx/REQ_xxx/SPEC_xxx` example row, empty Artefakt-Removal-Check, unchecked Issues Found / Sign-off boxes), and the header `Status:` field still reads `in-progress`, despite L0/L1/L2 being fully completed and the val report showing QUALITY PASS. This is now the second consecutive autonomous-mode CR with this exact gap — suggests a systemic step being skipped in the CD-closing workflow, not a one-off. | low |

#### Independent Verification (for the record)

- `packages/syspilot/src/versionCheck.ts` — confirmed `ensureActor()` uses `api.listJarvisSessions()` for the idempotency check and `api.invokeTool('jarvis_createActor', ...)` for creation; `notifyActor()` uses the new `api.sendMessage(ACTOR_NAME, 'jarvis-syspilot', text)`. Matches CD's design-deviation note and val report exactly.
- `packages/core/src/extension.ts` (`jarvis_createActor` handler, ~line 1186) — confirmed the actual folder is created via `configPaths.ensureActorsDir()` → `.jarvis/actors/${name}`, contradicting SPEC_SPL_ACTOR AC-3's `.jarvis/sessions/...` claim (Finding #1).
- The new `JarvisCoreApi.sendMessage()` method and its `engine.setMessaging()` wiring were not independently re-read line-by-line in this round (accepted MECE's line-referenced verification as sufficient given the small, additive surface).

**Verdict: CLEAR for merge** — Finding #1 is a documentation-accuracy defect, not a functional regression (the code itself uses the correct, current actor-storage convention). Finding #2 is process-only. Neither blocks merge; both are routed to PM for fix-now / defer / accept-as-is disposition.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Spec prose is factually wrong (`.jarvis/sessions/` vs the established `.jarvis/actors/` convention since v0.17.0). Code is correct, but stale spec misleads future readers and evaded Trace because the val report repeated it. Quick spec+val fix prevents recurrence. |
| 2 | 2 | fix-now | Process-only (CD boilerplate unfilled, Status stale) — same gap as #40. Trivial to close; keeps the CD internally consistent for the Release Engineer's archival step. |
| 1 | 1 | | |
| 2 | 2 | | |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
