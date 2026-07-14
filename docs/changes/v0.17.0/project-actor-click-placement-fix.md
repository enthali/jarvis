# Change Document: project-actor-click-placement-fix

**Status**: in-progress
**Branch**: feature/project-actor-click-placement-fix
**Created**: 2026-07-07
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

**Root cause found during impact analysis (differs from the original bug report's framing) — confirmed reproducible by PM after re-testing:** the divergence is **not** about Project vs. Actor/Event, and there is no literal "Actor entity nested as a file-child under Project" node in the tree (Project/Event/Actor file-children are context.md, the entity YAML, and the agent file — all three kinds share the exact same generic click-handling code, `jarvis.openEntityFile`/`GenericTreeDataProvider`, with no kind-specific branching). The real, consistently-reproducible split is **first-open vs. repeat-open**, identical across all three entity kinds:

- **Existing chat session** (repeat open): `jarvis.openAgentSession` resolves a UUID via `lookupSessionUUID` and calls `openAtMain()`, which always passes `viewColumn: MAIN_COLUMN` — deterministically correct.
- **No chat session yet** (first open — the shared `openChatForEntity()` helper, called by both `jarvis.openAgentSession`'s create-branch and the entity-creation commands): creates the chat via `openNewChatEditor()` → `workbench.action.openChat`, an **internal VS Code command with no public/stable option to force a target column**. The new session is born wherever VS Code's default chat-open behavior puts it (typically the last-active editor group) — not reliably Main.

This exact limitation was already known and explicitly documented as an accepted gap by the `editor-group-placement` CR (v0.15.0): `REQ_MSG_EDITORPLACEMENT` AC-1 ("best-effort... VS Code exposes no API to force the view column of a chat editor at creation time") and `REQ_ENT_AGENTSESSION` AC-7 (same). That CR's own implementation report states: *"Fresh-session-creation branches (openChatForEntity, poll loop's no-UUID branch) intentionally left unchanged per design — no prior tab to place relative to."*

**Decision (user-directed, 2026-07-07):** even though this is documented/accepted behavior, it is bad behavior from a user experience standpoint — chats a user actively opens should always land at Main. Since VS Code provides no reliable way to influence *where* a new chat editor is created, the fix is deterministic **relocation after creation**: once `openChatForEntity()` finishes creating, renaming, and initializing the new session, resolve its (now-existing) UUID and apply the exact same Main-target close+reopen mechanism (`openAtMain()`) already used for the existing-session branch — the same pattern already used elsewhere in this codebase for "tab open in the wrong place, relocate it." This closes the gap using only already-proven mechanisms, without depending on any undocumented VS Code command option.

**Scope:** `openChatForEntity()` has exactly two call sites in `packages/core/src/extension.ts` (`jarvis.openAgentSession`'s create-branch; the entity-creation commands' create-and-open flow) — both are user-initiated "open/create a chat" actions where Main is unconditionally the correct target, so the fix applies safely inside the shared helper itself with no per-caller special-casing needed. Not in scope: Auto-Delivery's poll loop (uses Secondary target, a different code path entirely, untouched by this fix).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_EDITORPLACEMENT | Predictable Editor-Group Placement with Focus Restore | unchanged | Already establishes the Main/Docs/Secondary placement need; this CR closes a gap in fulfilling it, not a new need |
| US_ENT_AGENTSESSION | Open Agent Session from Explorer | unchanged | Same — the "click always opens at Main" expectation was already the intent; this CR makes the implementation actually deliver on it in the fresh-session case |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|

### Decisions

- No new US needed — this is a bug fix closing a known, previously-accepted implementation gap in an already-specified user need ("clicking an entity node opens its chat at a predictable place"), not a new capability.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — the gap was the previously-accepted "best-effort" carve-out for fresh sessions; this CR closes it

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_EDITORPLACEMENT | US_MSG_EDITORPLACEMENT | modified | AC-1 rewritten (Main now guaranteed for both existing AND newly-created sessions, no more best-effort carve-out); new AC-12 (follow-up relocate-step mechanism) and AC-13 (sequencing + silent-no-op edge case) |
| REQ_ENT_AGENTSESSION | US_ENT_AGENTSESSION | modified | AC-7 rewritten from "best-effort, not guaranteed" to "guaranteed via follow-up relocate", cross-referencing REQ_MSG_EDITORPLACEMENT AC-12/AC-13; old text struck through and kept for traceability of what changed and why |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|

### Conflicts Detected

- None — the amendment is a pure strengthening of an existing, already-approved guarantee (from "best-effort" to "guaranteed"), not a contradiction with any other requirement. The Secondary-target (auto-delivery) and Docs-target (file children) requirements are untouched and unaffected.

### Decisions

- **Investigated and confirmed, not assumed:** `workbench.action.openChat`'s lack of a public/stable placement option is unchanged (already documented in `SPEC_MSG_OPENCHAT` as "a VS Code internal command with no public stability guarantee") — re-confirmed via VS Code API documentation lookup before committing to the relocate-after-creation design, rather than the alternative (attempting to pass an undocumented option to the internal command and hoping it works).
- The relocate step is placed **after** the init-prompt submission (AC-13), not before — moving the tab mid-sequence would risk disrupting the "currently focused chat" that the rename/init-prompt commands operate on.
- Silent no-op if the UUID still fails to resolve after rename (rare edge case) — consistent with this codebase's established pattern of graceful degradation over hard failure for placement mechanics (e.g. `REQ_MSG_SESSIONLOOKUP` AC-3's `undefined`-on-miss contract).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (no new REQs — only existing amended)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_AGENTSESSION | REQ_ENT_AGENTSESSION | modified | Code sample's fresh-session-creation branch gains the relocate step (lookupSessionUUID + openAtMain after rename/init-prompt); Design notes rewritten from "best-effort, no re-placement step" to describe the new guarantee; added a note disclosing the pre-existing spec/code naming drift (this spec inlines what the real code factors into a shared `openChatForEntity()` helper) |
| SPEC_ACT_NEWENTITY | REQ_ENT_AGENTSESSION (transitively, via shared helper) | modified | Added a cross-reference note: this creation flow shares the same `openChatForEntity()` helper, so it inherits the Main-placement guarantee automatically — no separate implementation needed here |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|

### Conflicts Detected

- None.

### Decisions

- The fix is documented once, in `SPEC_ENT_AGENTSESSION` (the spec that owns the fresh-session-creation code sample), with a cross-reference from `SPEC_ACT_NEWENTITY` rather than duplicating the same code block in two places — both callers go through the one real shared helper function.
- Did not attempt to "fix" the pre-existing spec/code drift (this spec's inlined code sample vs. the real `openChatForEntity()` factoring) beyond disclosing it — out of scope for a placement bug fix; flagged for awareness only.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (no new SPECs — only existing amended)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_EDITORPLACEMENT (unchanged) | REQ_MSG_EDITORPLACEMENT (AC-1 rewritten, AC-12/AC-13 new) | SPEC_ENT_AGENTSESSION, SPEC_ACT_NEWENTITY (cross-ref) | ✅ |
| US_ENT_AGENTSESSION (unchanged) | REQ_ENT_AGENTSESSION (AC-7 rewritten) | SPEC_ENT_AGENTSESSION | ✅ |

`get_need_links.py --direction both` spot-checked on `REQ_MSG_EDITORPLACEMENT` — link structure unchanged (content-only amendment), no dangling references. Sphinx build 0 warnings.

### Artefakt-Removal-Check

_Not applicable — no artefacts removed. This CR strengthens an existing guarantee; nothing is deprecated or deleted._

### Issues Found

- None blocking. The original bug report's framing ("Actor node nested as file-child under Project") turned out to be an imprecise description of the real, simpler, and more general root cause (first-open vs. repeat-open, uniform across all 3 entity kinds) — confirmed directly with PM/user before finalizing scope, avoiding a wasted design pass chasing a non-existent Project-specific code path.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Generation

**Status**: ✅ completed

**Performed by**: Test Designer

### Coverage Summary

Extended the existing Stable Session Open UAT chain (`US_UAT_MSG_STABLESESSION` / `REQ_UAT_MSG_STABLESESSION_TESTDATA` / `SPEC_UAT_MSG_STABLESESSION_OUTCOMES`) with five new test scenarios (T-6 through T-10) covering the fresh-session Main-column placement fix and regression guards:

| Scenario | Coverage |
|----------|----------|
| **T-6: Fresh session from Project tree** | Verifies that a new session created from a Project tree node opens and lands in column 1 (Main) via the relocate step (fix coverage). |
| **T-7: Fresh session from Event tree** | Verifies that a new session from Event lands at Main/column 1 (regression guard — same helper, should already work). |
| **T-8: Fresh session from Actor/Session tree** | Verifies that a new session from Actor lands at Main/column 1 (regression guard — shares same helper). |
| **T-9: Repeat-open from all 3 entity kinds** | Verifies that existing sessions open at Main/column 1 when reopened from Project/Event/Actor nodes, consistently across all kinds (regression guard — unchanged behavior). |
| **T-10: Silent no-op edge case** | Verifies that if UUID resolution fails during the relocate step (rare edge case per AC-13), the session remains usable and no error is shown to the user. |

### Amended Acceptance Criteria

- **AC-6 (US_UAT_MSG_STABLESESSION)**: Added coverage requirement for T-6 through T-9 (fresh session and repeat-open Main placement across all 3 entity kinds)
- **AC-7 (US_UAT_MSG_STABLESESSION)**: Added coverage requirement for T-10 (silent no-op edge case)
- **AC-6 (REQ_UAT_MSG_STABLESESSION_TESTDATA)**: Extended to require test data (Project leaves "beta"/"gamma", Event leaf "event-2024", Actor/Session "test-actor-xyz") for T-6 through T-9
- **AC-7 (REQ_UAT_MSG_STABLESESSION_TESTDATA)**: Added coverage requirement for T-10

### Test Data

- Existing `testdata/projects/alpha/` reused for T-1 through T-5
- New leaves required: `testdata/projects/beta/`, `testdata/projects/gamma/` (each with `project.yaml` and `context.md`)
- New event: `testdata/events/event-2024/` (with `event.yaml` and `context.md`)
- New session: `testdata/.jarvis/sessions/test-actor-xyz/` (with `session.yaml` and `context.md`)

### Verification

- **Sphinx build**: 0 warnings; all links valid
- **Traceability**: `get_need_links.py --direction both` on `REQ_UAT_MSG_STABLESESSION_TESTDATA` confirms links clean (outgoing: `US_UAT_MSG_STABLESESSION`; incoming: `SPEC_UAT_MSG_STABLESESSION_OUTCOMES`)
- **UAT chain extended**: All new scenarios added to user story (AC-6/AC-7), requirements (AC-6/AC-7), and design outcomes table (T-6 through T-10 rows)

### Handoff Note

The fresh-session relocation mechanism is described in the design specs via updated code samples and cross-references to `REQ_MSG_EDITORPLACEMENT` AC-12/AC-13. Test scenarios document expected user-observable behavior (new session appears in Main/column 1, repeat-opens land at Main, silent degradation on UUID failure). Implementation verification is the Verify Engineer's responsibility.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-07

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed:

1. **Code-vs-Spec** (packages/core/src/extension.ts):
   - `openChatForEntity()` (lines 327–385): relocate step present after init-prompt submission (AC-12/AC-13 per REQ_MSG_EDITORPLACEMENT)
   - Mechanism: `lookupSessionUUID(name)` → `Buffer.from(uuid).toString('base64')` → `openAtMain(newUri, name)` ✓
   - Silent no-op branch: `if (newUuid) { ... }` — missing UUID is handled gracefully, no throw (AC-13) ✓
   - Existing-session path (`openAtMain` at lines 523, 584, 623): unchanged ✓
   - Both call sites (line 627 `jarvis.openAgentSession` create-branch, line 1096 entity-creation) inherit the fix via shared helper — no duplicated logic ✓

2. **Build** (`npx tsc -p packages/core`): clean (0 errors) ✓

3. **Tests** (`npx vitest run`): 214/214 passed (22 test files, 0 failures) ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check):
   - `REQ_MSG_EDITORPLACEMENT` bidirectional: links to [US_MSG_EDITORPLACEMENT, ...], linked from [SPEC_MSG_EDITORPLACEMENT, REQ_ENT_AGENTSESSION, ...] — 0 dangling ✓
   - `REQ_ENT_AGENTSESSION` confirmed in `linked_from` of `REQ_MSG_EDITORPLACEMENT` ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
