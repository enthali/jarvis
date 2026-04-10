# Change Document: new-entity

**Status**: approved
**Branch**: feature/new-entity
**Created**: 2026-04-09
**Author**: Jarvis Developer

---

## Summary

Add two new commands — `Jarvis: New Project` and `Jarvis: New Event` — that create a convention-file folder (with `project.yaml` / `event.yaml`), trigger an immediate scanner refresh, and open an agent session for the new entity. Depends on the convention-file model from `proj-folders`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | check only | New items appear via scanner refresh |
| US_EXP_AGENTSESSION | Open Agent Session | check only | Reused for post-creation session open |
| US_CFG_PROJECTPATH | Configurable Folder Paths | check only | Folder roots unchanged |

### New User Stories

- US_EXP_NEWENTITY: Create New Project or Event — AC-1..AC-6
- US_UAT_NEWENTITY: UAT — Create New Project or Event (12 test scenarios)

### UAT Artifacts

- US_UAT_NEWENTITY (docs/userstories/us_uat_newentity.rst)
- REQ_UAT_NEWENTITY_TESTDATA (docs/requirements/req_uat_newentity.rst)
- SPEC_UAT_NEWENTITY_FILES (docs/design/spec_uat_newentity.rst)

### Decisions

- D-0-1: Single US for both commands (same pattern, differ only in inputs/template)
- D-0-2: Commands only via title bar `+` icon, NOT in Command Palette (like openAgentSession)
- D-0-3: Event folder placed directly in eventsFolder root, no auto-nesting in year subfolder

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| REQ_EXP_REACTIVECACHE | Background Cache | modified | AC-6: public rescan method |
| REQ_EXP_YAMLDATA | YAML-based Data | check only | Convention file model unchanged |
| REQ_EXP_AGENTSESSION | Open Agent Session | check only | Reused AC-3 (new session path) |

### New Requirements

- REQ_EXP_NEWPROJECT: AC-1..AC-8 — create project folder, scanner refresh, agent session
- REQ_EXP_NEWEVENT: AC-1..AC-10 — create event folder with date, scanner refresh, agent session

### Decisions

- D-1-1: Two separate REQs (different inputs/templates justify separation)
- D-1-2: Scanner refresh via new public method on REQ_EXP_REACTIVECACHE AC-6
- D-1-3: Agent session open delegates to existing openAgentSession logic
- D-1-4: G-1 → Duplicate folder guard: error notification + abort (AC-9 / AC-11)
- D-1-5: G-2 → Date validation: inline error + re-prompt (NEWEVENT AC-3)
- D-1-6: Links added: NEWPROJECT/NEWEVENT → REQ_EXP_YAMLDATA

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_SCANNER | REQ_EXP_REACTIVECACHE | modified | Added public `rescan()` + stored folder paths |
| SPEC_EXP_EXTENSION | REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT | modified | Added manifest entries for new commands |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_NEWPROJECT_CMD | New Project Command | REQ_EXP_NEWPROJECT, REQ_EXP_REACTIVECACHE, REQ_EXP_AGENTSESSION, SPEC_EXP_SCANNER, SPEC_EXP_EXTENSION, SPEC_EXP_AGENTSESSION |
| SPEC_EXP_NEWEVENT_CMD | New Event Command | REQ_EXP_NEWEVENT, REQ_EXP_REACTIVECACHE, REQ_EXP_AGENTSESSION, SPEC_EXP_SCANNER, SPEC_EXP_EXTENSION, SPEC_EXP_AGENTSESSION |

### Decisions

- D-2-1: `toKebabCase()` as local helper in extension.ts (not exported)
- D-2-2: `rescan()` stores folder paths from `start()` call — no-op if start not called
- D-2-3: Agent session opened via `vscode.commands.executeCommand('jarvis.openAgentSession', leafNode)` — full delegation
- D-2-4: Date validation via `validateInput` callback on InputBox (regex + calendar check)
- D-2-5: Duplicate folder guard via `fs.existsSync` before mkdir

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] No redundancies
- [x] All new SPECs link to Requirements
- [x] MECE-clean (advisory passed)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_NEWENTITY | REQ_EXP_NEWPROJECT | SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_EXTENSION | ✅ |
| US_EXP_NEWENTITY | REQ_EXP_NEWEVENT | SPEC_EXP_NEWEVENT_CMD, SPEC_EXP_EXTENSION | ✅ |
| US_EXP_NEWENTITY | REQ_EXP_REACTIVECACHE (AC-6) | SPEC_EXP_SCANNER | ✅ |

### Cross-Level Consistency

- US_EXP_NEWENTITY AC-1 (title bar +) → REQ AC-1 ($(add) icon) → SPEC_EXP_EXTENSION (view/title menu) ✅
- US_EXP_NEWENTITY AC-2 (name input) → REQ AC-2 (InputBox) → SPEC steps 2-3 ✅
- US_EXP_NEWENTITY AC-3 (convention file) → REQ AC-4/AC-6 (folder + yaml) → SPEC steps 7-8/9-10 ✅
- US_EXP_NEWENTITY AC-4 (scanner refresh) → REQ_EXP_REACTIVECACHE AC-6 → SPEC_EXP_SCANNER rescan() ✅
- US_EXP_NEWENTITY AC-5 (agent session) → REQ AC-6/AC-8 → SPEC steps 10-11/12-13 ✅
- US_EXP_NEWENTITY AC-6 (cancellation) → REQ AC-7/AC-9 → SPEC steps 3/5 ✅

### Issues Found

- None

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
