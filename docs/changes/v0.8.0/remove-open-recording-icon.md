# Change Document: remove-open-recording-icon

**Status**: completed
**Branch**: feature/remove-open-recording-icon
**Created**: 2026-06-08
**Author**: PM
**Test Protocol:** [tst-remove-open-recording-icon.md](tst-remove-open-recording-icon.md)

---

## Summary

Remove the dead `jarvis.openRecording` tree-item icon and its `+recording` contextValue suffix from project, event, and session tree items. Motivation: the icon suggests a per-entity recording artifact that does not exist — recordings are stored centrally under the configured whisper input/output folders and transcripts surface via session notifications, not via a tree-side "open" affordance. The icon irritates users, adds visual clutter, and gates on a `recording/` subfolder that is never written there. Acceptance: the "Open Recording" icon no longer appears on any entity tree item (regardless of whether a `recording/` subfolder exists); start/stop recording inline icons remain unchanged; active-recording highlight on the current entity remains unchanged; existing `recording/` subfolders are not touched (no migration, no deletion); the recording start → whisper input → transcript → session notification workflow is unaffected.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_ENTITYPARITY | Entity Feature Parity (Projects & Events) | modified | AC-4: removed `$(record)` from the uniform inline icons list — now 2 icons (YAML + context.md) instead of 3 |
| US_UAT_ENTITY_PARITY | Entity Feature Parity Acceptance Tests | modified | AC-5/AC-6 rewritten: icon count 3→2; T-36 inverted (icon absent); T-33/T-37 updated to 2 icons |

### New User Stories

_None._ The change removes dead functionality from existing stories; no new user need is introduced.

### Decisions

- Decision 1: No new US required — the removal is a bug-fix/cleanup within the scope of existing `US_EXP_ENTITYPARITY`. The original AC-4 over-specified by including a non-functional icon.
- Decision 2: `US_REC_CAPTURE` and its UAT stories (`US_UAT_REC_ENABLE`, `US_UAT_REC_CAPTURE`) are **not impacted** — they cover Start/Stop recording buttons, not the dead "Open Recording" icon.
- Decision 3: The `US_EXP_ENTITYPARITY` status remains `draft` (it was already `draft`). The AC modification does not change its lifecycle.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_REC_CAPTURE` still mandates Start/Stop buttons (unchanged); only the dead "Open Recording" shortcut is removed
- [x] No redundancies — no other US references an "open recording" capability
- [x] Gaps identified and addressed — the acceptance criteria in `US_UAT_ENTITY_PARITY` now explicitly tests icon absence (T-36 inverted) rather than testing conditional visibility

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_ENTITY_ICONS | US_EXP_ENTITYPARITY | modified | Removed AC-3 (conditional `$(record)` icon) and AC-4 (icon order including `$(record)`); renumbered remaining ACs; added AC-5 explicitly forbidding the icon; updated description text |
| REQ_UAT_ENTITY_PARITY | US_UAT_ENTITY_PARITY | modified | AC-5: 3→2 icons, removed `$(record)` from verification list; AC-6: inverted — now verifies icon absence rather than context-key gating |

### New Requirements

_None._ The change removes functionality specified in existing requirements; no new capability is introduced.

### Conflicts Detected

_None._ `REQ_REC_ENABLE` and `REQ_REC_BUTTONS` (from `req_rec.rst`) govern Start/Stop recording buttons, which are unrelated to the per-entity "Open Recording" inline icon. No overlap.

### Decisions

- Decision 1: `REQ_EXP_ENTITY_ICONS` retains its ID and `:status: draft` — the AC set is narrowed, not replaced.
- Decision 2: The new AC-5 in `REQ_EXP_ENTITY_ICONS` is a negative requirement ("SHALL NOT appear") to make the removal testable at REQ level.
- Decision 3: `REQ_UAT_ENTITY_PARITY` stays `:status: draft` — its AC-5/AC-6 wording is updated to match the new icon set.
- Decision 4: No impact on `REQ_SES_CONTEXTMENU`, `REQ_SES_TREECLICK`, or `REQ_EXP_OPENYAML` — they do not reference `$(record)` or the `+recording` contextValue.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — `REQ_REC_ENABLE` / `REQ_REC_BUTTONS` still mandate Start/Stop buttons; only the dead "Open Recording" per-entity icon is removed
- [x] No redundancies — no other REQ specifies a per-entity recording-folder inline icon
- [x] All modified REQs link to User Stories (`US_EXP_ENTITYPARITY`, `US_UAT_ENTITY_PARITY`)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_ENTITY_ICONS | REQ_EXP_ENTITY_ICONS | modified | Removed `jarvis.openRecording` command, `+recording` contextValue suffix, recording icon visibility mechanism, and `fs.existsSync` check; reduced icon set 3→2; renumbered inline groups; added negative ACs |
| SPEC_UAT_ENTITY_PARITY | REQ_UAT_ENTITY_PARITY | modified | T-33: 3→2 icons; T-36: inverted (icon absent regardless of folder); T-37: 3→2 icons |

### New Design Elements

_None._ The change removes functionality specified in existing design elements; no new design is introduced.

### Conflicts Detected

_None._ `SPEC_EXP_CONTEXTACTIONS` (right-click context menu) is unaffected — it registers `revealInExplorer`, `revealInOS`, `openInTerminal` and does not reference `openRecording`. `SPEC_REC_*` specs (recording capture/playback) cover start/stop buttons which are unrelated.

### Decisions

- Decision 1: `SPEC_EXP_ENTITY_ICONS` retains its ID and is set to `:status: draft` — the spec is narrowed (icon set reduced), not replaced.
- Decision 2: The inline group numbering is renumbered: `inline@1` → `jarvis.openContext`, `inline@2` → `jarvis.openYaml`. No gap left.
- Decision 3: `SPEC_UAT_ENTITY_PARITY` stays `:status: draft` — test scenarios T-33, T-36, T-37 updated in-place.
- Decision 4: `SPEC_EXP_PROVIDER` is NOT modified — the `contextValue` assignment in `getTreeItem()` is specified in `SPEC_EXP_ENTITY_ICONS` and the provider spec only references the base values.
- Decision 5: `SPEC_EXP_EXTENSION` is NOT modified — the command registration list in the manifest spec will be updated by removing `jarvis.openRecording` from the `contributes.commands` array during implementation; the design-level impact is captured in `SPEC_EXP_ENTITY_ICONS`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Design Specs — `SPEC_REC_CAPTURE`, `SPEC_REC_BUTTONS` still mandate Start/Stop recording buttons; only the dead "Open Recording" per-entity icon is removed
- [x] No redundancies — no other SPEC references a per-entity recording-folder inline icon
- [x] All modified SPECs link to Requirements (`REQ_EXP_ENTITY_ICONS`, `REQ_UAT_ENTITY_PARITY`)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_ENTITYPARITY | REQ_EXP_ENTITY_ICONS | SPEC_EXP_ENTITY_ICONS | ✅ |
| US_UAT_ENTITY_PARITY | REQ_UAT_ENTITY_PARITY | SPEC_UAT_ENTITY_PARITY | ✅ |

### MECE Final Check (Quality Engineer)

**Verdict:** ✅ PASS — no redundancies, no gaps, no contradictions, full test coverage.

- Code: no live references to `jarvis.openRecording`, `+recording` contextValue, or `$(record)` icon — only test assertions that verify absence
- Active docs: only spec-level descriptions of the removal (US/REQ/SPEC and Change Document)
- Tests: T-1..T-9 cover all acceptance criteria; T-6..T-9 require manual UAT in EDH

### Artefakt-Removal-Check

Project-wide grep on `openRecording`, `Open Recording`, `+recording`, `$(record)` classified per CM Artefakt-Removal Rule:

- **(a) Active code/workflow references** → CLEAN (only verification tests in `src/tests/remove-open-recording-icon.test.ts` that assert absence)
- **(b) Active documentation references** → CLEAN (all hits are spec-level descriptions of the removal in US/REQ/SPEC + this Change Document + its test protocol)
- **(c) Historical Change Documents and append-only release record** → **acceptable historic stranding**, disclosed here:
  - `docs/changes/v0.7.0/tst-entity-parity.md` (T-33, T-36, T-37, T-37b reference the prior 3-icon set + `+recording` regex)
  - `docs/changes/v0.7.0/val-entity-parity.md` (F-16 finding references the old optional `(\+recording)?` regex group)
  - `docs/releasenotes.md` L67 (`context-menu-regex-anchored` entry in v0.7.0 section references the old `/^jarvis(Project|Event|Session)(\+recording)?$/` regex — release notes are append-only historical record, not modified)

### Issues Found

_None._

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

*Generated by syspilot Change Agent*
