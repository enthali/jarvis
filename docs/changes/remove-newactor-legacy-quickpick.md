# Change Document: remove-newactor-legacy-quickpick

**Status**: complete
**Branch**: feature/remove-newactor-legacy-quickpick
**Created**: 2026-09-30
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

The `jarvis.newActor` command still shows a "New Entry" QuickPick with
the single option "Create Actor" — a remnant of the old entity-type
picker that offered Actor, Project, and Event. After the
`one-kind-consolidation` and `retire-legacy-actor-kinds` changes removed
all non-Actor entity kinds, this picker is dead UI: one choice, no
branching, a pointless click before the name InputBox. Remove the
QuickPick step so the command goes straight to the name InputBox.

**Intake verification (CM, 2026-09-30):** All PM intake claims verified
against code and specs:

- `extension.ts` lines 1176–1179: `showQuickPick([{ label: 'Create
  Actor' }], { title: 'New Entry', ... })` + `if (!chosen) { return; }`
  guard confirmed present.
- `SPEC_ACTOR_CREATE` flow step 1 describes the QuickPick; step 2 is the
  name InputBox.
- `REQ_ACTOR_CREATE` AC-1 mandates the QuickPick; AC-8 references
  cancelling the "New Entry" QuickPick.
- No test in `src/tests/` asserts the QuickPick step.
  `newactor-creation-flow.test.ts` checks other handler properties
  (no trim, existingActorFolder, writeActorAgent) but not the QuickPick.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACTOR_CREATE | Create Actor | modified | QuickPick step removed from the creation flow; the `+` icon now opens the name InputBox directly |

### New User Stories

_(none)_

### Decisions

- D-1: This is a pure removal of dead UI. No new User Story needed;
  US_ACTOR_CREATE is modified to reflect the simplified flow.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — no gaps; removal only

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACTOR_CREATE | US_ACTOR_CREATE | modified | AC-1 reworded: remove QuickPick description; `+` icon triggers command and opens name InputBox directly. AC-8 reworded: remove "New Entry" QuickPick cancel reference; name InputBox cancel remains. |

### New Requirements

_(none)_

### Conflicts Detected

_(none)_

### Decisions

- D-2: AC-1 currently states "It SHALL open a 'New Entry' QuickPick with
  a 'Create Actor' choice; selecting it SHALL proceed to AC-2." After
  this CR, AC-1 states the `+` icon triggers `jarvis.newActor` (not in
  Command Palette) and opens the name InputBox directly (proceeds to
  AC-2's name validation). The QuickPick description is removed.
- D-3: AC-8 currently states "If the user cancels the 'New Entry'
  QuickPick or the name InputBox, the command SHALL exit without side
  effects." After this CR, AC-8 states "If the user cancels the name
  InputBox, the command SHALL exit without side effects (no folder, no
  file written)." The QuickPick cancel reference is removed.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All modified REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACTOR_CREATE | REQ_ACTOR_CREATE | modified | Flow step 1 (QuickPick) removed; former step 2 (name InputBox) becomes step 1. Remaining steps renumbered. Steps 1 and 8 in the flow currently reference AC-1/AC-8 for the QuickPick cancel; these references are updated. |

### New Design Elements

_(none)_

### Conflicts Detected

_(none)_

### Decisions

- D-4: SPEC_ACTOR_CREATE flow is currently 8 steps. Step 1 (QuickPick)
  is removed. Former step 2 (InputBox for name) becomes step 1. The
  remaining steps shift down by one. The AC references in step 1 (was
  AC-1, AC-8) and step 2 (was AC-2, AC-8) are updated to reflect the new
  AC wording. The shared-module contract, file contents, and
  package.json sections are unchanged.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All modified SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACTOR_CREATE | REQ_ACTOR_CREATE | SPEC_ACTOR_CREATE | ✅ |

### Artefakt-Removal-Check

This CR removes the "New Entry" QuickPick from `jarvis.newActor`.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `showQuickPick` in `newActor` handler | `packages/core/src/extension.ts` lines 1176–1179 (fixed) | `docs/design/spec_actor.rst` SPEC_ACTOR_CREATE flow step 1 (fixed); `docs/requirements/req_actor.rst` REQ_ACTOR_CREATE AC-1/AC-8 (fixed) | `docs/changes/v0.28.0/one-kind-consolidation.md`, `docs/changes/v0.28.0/retire-legacy-actor-kinds.md` — historic references to the QuickPick in ADR-10 context (acceptable stranding) |

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

_(none)_

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
**Review date:** 2026-09-30

#### Findings

No findings. QM CLEAR.

#### PM Decisions

Clear for merge. User-validated in Extension Development Host: `+` icon opens name InputBox directly, no QuickPick. QM CLEAR, VE PASSED.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
