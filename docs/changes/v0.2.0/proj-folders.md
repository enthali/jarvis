# Change Document: proj-folders

**Status**: approved
**Branch**: feature/proj-folders
**Created**: 2026-04-09
**Author**: Jarvis Developer

---

## Summary

Switch both project and event scanners from flat-file recognition (any `.yaml` with `name` field) to a folder-convention model: a folder containing `project.yaml` (or `event.yaml`) becomes a LeafNode, folders without it remain FolderNodes for grouping. The `_buildTree()` method receives a `conventionFile` parameter (`'project.yaml'` or `'event.yaml'`). Testdata is restructured accordingly. The EventTreeProvider gains empty-branch pruning when the future-only filter hides all events in a grouping folder.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-4: folder convention for both trees |
| US_EXP_EVENTFILTER | Future Event Filter | modified | AC-6: empty-branch pruning |
| US_CFG_PROJECTPATH | Configurable Folder Paths | check only | Settings unchanged |
| US_EXP_PROJECTFILTER | Project Folder Filter | check only | Root FolderNode filter unchanged |
| US_EXP_OPENYAML | Open YAML from Tree Item | check only | element.id now points to project.yaml/event.yaml |
| US_EXP_AGENTSESSION | Open Agent Session | check only | entity.name unchanged |

### Modified User Stories

- US_EXP_SIDEBAR: AC-4 rewritten — convention file logic for both project and event trees
- US_EXP_EVENTFILTER: AC-6 added — empty-branch pruning when filter hides all events in a folder

### Decisions

- D-0-1: Same convention for projects AND events — only filename differs (project.yaml / event.yaml)
- D-0-2: No new User Stories needed — this is scanner implementation detail
- D-0-3: Empty-branch pruning required for EventTreeProvider future-only filter

### UAT IDs

- US_UAT_SIDEBAR, REQ_UAT_SIDEBAR_TESTDATA, SPEC_UAT_SIDEBAR_FILES
- US_UAT_EVENTFILTER, REQ_UAT_EVENTFILTER_TESTDATA, SPEC_UAT_EVENTFILTER_FILES

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| REQ_EXP_YAMLDATA | YAML-based Data | modified | AC-1/AC-2: convention file model |
| REQ_EXP_TREEVIEW | Tree Views | modified | AC-4/AC-6: convention semantics |
| REQ_EXP_EVENTFILTER | Future Event Filter | modified | AC-6: empty-branch pruning |
| REQ_EXP_REACTIVECACHE | Background Cache | check only | No change |
| REQ_EXP_ACTIVITYBAR | Activity Bar | check only | No change |
| REQ_EXP_OPENYAML | Open YAML | check only | element.id = convention file path |
| REQ_EXP_AGENTSESSION | Open Agent Session | check only | entity.name unchanged |
| REQ_EXP_EVENTFILTERPERSIST | Event Filter Persist | check only | No change |

### Modified Requirements

- REQ_EXP_YAMLDATA: AC-1 rewritten — project.yaml convention; AC-2 rewritten — event.yaml convention
- REQ_EXP_TREEVIEW: AC-4 rewritten — grouping nodes = folders without convention file; AC-6 rewritten — leaf = folder with convention file
- REQ_EXP_EVENTFILTER: AC-6 added — empty-branch pruning when filter hides all descendants

### Decisions

- D-1-1: Three REQs modified, no new REQs needed
- D-1-2: REQ_EXP_OPENYAML unchanged — element.id naturally points to convention file
- D-1-3: G-1 → Invalid convention file: leaf with folder name as fallback label (REQ_EXP_YAMLDATA AC-4)
- D-1-4: G-2 → General empty-branch pruning added to REQ_EXP_TREEVIEW AC-9
- D-1-5: Links added: REQ_EXP_YAMLDATA → REQ_EXP_TREEVIEW, REQ_EXP_EVENTFILTER → REQ_EXP_TREEVIEW

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Specs

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| SPEC_EXP_SCANNER | YAML Scanner Service | modified | _buildTree() convention file parameter + new scan logic |
| SPEC_EXP_PROVIDER | Tree Data Providers | modified | Fallback label = folder name |
| SPEC_EXP_EVENTFILTER_CMD | Future Event Filter Cmd | check only | Toggle logic unchanged |
| SPEC_EXP_EXTENSION | Extension Manifest | check only | No change |

### Modified Design Specs

- SPEC_EXP_SCANNER: Scan Logic rewritten — `_buildTree(folder, entities, conventionFile)`, convention file detection, fallback entity on parse failure, no-descent on leaf
- SPEC_EXP_PROVIDER: getTreeItem LeafNode fallback label = `path.basename(path.dirname(element.id))` instead of raw path

### Decisions

- D-2-1: Two SPECs modified, no new SPECs needed
- D-2-2: Empty-branch pruning already implemented in scanner (`children.length > 0` check) and EventTreeProvider (`_filterFuture` recursion) — no code change needed for AC-9
- D-2-3: `_scan()` callers pass `'project.yaml'` / `'event.yaml'` as conventionFile argument
- D-2-4: G-1 → Pruning-Klausel zu SPEC_EXP_PROVIDER future-filter hinzugefügt (rekursives empty-branch pruning)
- D-2-5: G-2 → SPEC_UAT_TESTDATA_FILES auf Convention-File-Modell aktualisiert (Ordnerstruktur statt Flat-Files)
- D-2-6: Links L-1..L-4 hinzugefügt: PROVIDER→SCANNER, FILTERCOMMAND→SCANNER+PROVIDER, EVENTFILTER_CMD→PROVIDER
