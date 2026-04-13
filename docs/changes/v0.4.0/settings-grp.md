# Change Document: settings-grp

**Status**: approved
**Branch**: feature/settings-grp
**Created**: 2026-04-12
**Author**: Change Agent

---

## Summary

Restructure Jarvis VS Code settings from a flat single `configuration` object
to a grouped array (subcategories in Settings UI) and add `when`-clause
feature-toggles so that sidebar views for Events, Messages, and Heartbeat are
only visible when the corresponding feature is configured.

---

## Level 0: User Stories

**Status**: completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-3: "four sections" -> "Projects always visible; Events, Messages, Heartbeat conditional" |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_CFG_SETTINGSGROUPS | Grouped Settings Categories | mandatory |
| US_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | mandatory |

### Decisions

- D-1: Modify US_EXP_SIDEBAR AC-3 directly to reflect conditional views
- D-2: Option A -- write resolved default paths (messagesFile, heartbeatConfigFile) into settings at activation when empty (no new boolean settings)
- D-3: Events-View hidden until eventsFolder is explicitly set (no fallback default)

### Horizontal Check (MECE)

- No contradictions between US_CFG_SETTINGSGROUPS and US_EXP_FEATURETOGGLE (presentation vs visibility)
- US_CFG_HEARTBEAT / US_CFG_MSG unaffected in content -- default stays the same, just written to setting
- MCP Server not affected (has boolean toggle, no sidebar view)

---

## Level 1: Requirements

**Status**: completed

### New Requirements

| ID | Title | Links To | Rationale |
|----|-------|----------|-----------|
| REQ_CFG_SETTINGSGROUPS | Grouped Settings Categories | US_CFG_SETTINGSGROUPS | Declare the six groups and the constraint that no setting key changes |
| REQ_CFG_DEFAULTPATHS | Default Path Population at Activation | US_EXP_FEATURETOGGLE; REQ_CFG_HEARTBEATPATH; REQ_CFG_MSGPATH | Required so when-clauses evaluate correctly for default-enabled features (Option A) |
| REQ_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | US_EXP_FEATURETOGGLE; REQ_EXP_TREEVIEW; REQ_CFG_DEFAULTPATHS | Express the visibility rules per view as system requirements |

### Decisions

- D-4: REQ_CFG_DEFAULTPATHS targets ConfigurationTarget.Workspace -- keeps settings scoped per project, not global user settings
- D-5: REQ_EXP_FEATURETOGGLE specifies visibility via when-clause on view definition (no runtime code for visibility) -- VS Code evaluates this natively

### Horizontal Check (MECE)

- REQ_CFG_SETTINGSGROUPS is additive (no conflict with REQ_CFG_FOLDERPATHS, REQ_CFG_HEARTBEATPATH, etc.)
- REQ_CFG_DEFAULTPATHS extends REQ_CFG_HEARTBEATPATH / REQ_CFG_MSGPATH without contradiction (same default value, now also persisted)
- REQ_EXP_FEATURETOGGLE extends REQ_EXP_TREEVIEW without overlap (visibility predicate, not tree content)

---

## Level 2: Design

**Status**: completed

### New Specs

| ID | Title | Links To | File |
|----|-------|----------|------|
| SPEC_CFG_SETTINGSGROUPS | Grouped Settings Configuration in package.json | REQ_CFG_SETTINGSGROUPS | docs/design/spec_cfg.rst |
| SPEC_CFG_DEFAULTPATHS | Default Path Population at Activation | REQ_CFG_DEFAULTPATHS | docs/design/spec_cfg.rst |
| SPEC_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | REQ_EXP_FEATURETOGGLE; SPEC_CFG_DEFAULTPATHS; SPEC_EXP_EXTENSION | docs/design/spec_exp.rst |

### Modified Specs

| ID | Title | Change |
|----|-------|--------|
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | Links updated (added REQ_EXP_FEATURETOGGLE, REQ_CFG_DEFAULTPATHS); view list updated with when-clauses |

### Decisions

- D-6: SPEC_CFG_SETTINGSGROUPS is a pure package.json change -- no TypeScript code impact
- D-7: SPEC_CFG_DEFAULTPATHS uses fire-and-forget cfg.update() (no await) to keep activation synchronous
- D-8: SPEC_EXP_FEATURETOGGLE adds when-clauses to three of four views; Projects remains unconditional

### Horizontal Check (MECE)

- SPEC_CFG_SETTINGSGROUPS and SPEC_CFG_HEARTBEATSETTINGS: no overlap -- groups are presentation, HEARTBEATSETTINGS defines the properties
- SPEC_CFG_DEFAULTPATHS and SPEC_CFG_HEARTBEATSETTINGS: DEFAULTPATHS only adds the write-at-activation step; resolution logic in HEARTBEATSETTINGS unchanged
- SPEC_EXP_FEATURETOGGLE and SPEC_EXP_EXTENSION: FEATURETOGGLE owns the when-clause spec; EXTENSION references it -- no duplication
- No spec covers the same manifest section twice

---

## Final Consistency Check

**Status**: passed

### Traceability

| New ID | Type | Linked ID |
|--------|------|-----------|
| US_CFG_SETTINGSGROUPS | US | US_CFG_PROJECTPATH; US_CFG_HEARTBEAT; US_CFG_MSG |
| US_EXP_FEATURETOGGLE | US | US_EXP_SIDEBAR; US_CFG_PROJECTPATH; US_CFG_HEARTBEAT; US_CFG_MSG |
| REQ_CFG_SETTINGSGROUPS | REQ | US_CFG_SETTINGSGROUPS |
| REQ_CFG_DEFAULTPATHS | REQ | US_EXP_FEATURETOGGLE; REQ_CFG_HEARTBEATPATH; REQ_CFG_MSGPATH |
| REQ_EXP_FEATURETOGGLE | REQ | US_EXP_FEATURETOGGLE; REQ_EXP_TREEVIEW; REQ_CFG_DEFAULTPATHS |
| SPEC_CFG_SETTINGSGROUPS | SPEC | REQ_CFG_SETTINGSGROUPS |
| SPEC_CFG_DEFAULTPATHS | SPEC | REQ_CFG_DEFAULTPATHS |
| SPEC_EXP_FEATURETOGGLE | SPEC | REQ_EXP_FEATURETOGGLE; SPEC_CFG_DEFAULTPATHS; SPEC_EXP_EXTENSION |

- Every REQ links to a US
- Every SPEC links to a REQ
- No orphaned elements

---

## Implementation Checklist

- [ ] package.json: Convert contributes.configuration from object to array (6 groups)
- [ ] package.json: Add when-clauses to jarvisEvents, jarvisMessages, jarvisHeartbeat views
- [ ] src/extension.ts: Write default paths into messagesFile and heartbeatConfigFile settings at activation when empty