# Change Document: subfolder-view

**Status**: in-progress
**Branch**: feature/subfolder-view
**Created**: 2026-04-02
**Author**: Jarvis Developer

---

## Summary

Projects and events can be organized in subfolders. Subfolders shall be visible in the Explorer as collapsible folder nodes, with YAML files as leaf items beneath them. Folder nesting is unlimited.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-4 refined: hierarchical subfolder display |

### Decisions

- Decision 1: Subfolders shown as collapsible folder nodes (Option B — hierarchical), not flattened
- Decision 2: Unlimited depth — all subfolder levels are displayed recursively

### Modified User Stories

#### US_EXP_SIDEBAR: AC-4 update

```rst
   * AC-4: Each section displays items hierarchically — subfolders appear as collapsible
     folder nodes, YAML files within them as leaf items. The full folder tree is shown recursively.
```

### Horizontal Check (MECE)

- ✅ No conflict with other User Stories
- ✅ US_UAT_SAMPLEDATA compatible — testdata has no subfolders currently, that's fine

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Title | Impact |
|----|-------|--------|
| REQ_EXP_TREEVIEW | Project and Event Tree Views | modified — add AC-4/5/6 for folder nodes |
| REQ_EXP_YAMLDATA | YAML-based Project and Event Data | modified — AC-1/AC-2 updated for subfolder nodes |
| REQ_UAT_VALID_SAMPLES | Valid Sample Files | modified — add AC-5 for subfolder test coverage |

### Modified Requirements

#### REQ_EXP_TREEVIEW: add AC-4, AC-5, AC-6

```rst
   * AC-4: Subfolders within projectsFolder/eventsFolder appear as collapsible folder nodes
     labeled with the folder name
   * AC-5: Folder nodes can be nested to any depth
   * AC-6: YAML files are leaf items under their parent folder node
```

#### REQ_EXP_YAMLDATA: replace AC-1 and AC-2

```rst
   * AC-1: Subfolders in ``jarvis.projectsFolder`` are represented as collapsible folder nodes;
     YAML files within them appear as named leaf items beneath their parent folder node
   * AC-2: Same behaviour applies for ``jarvis.eventsFolder``
```
(AC-3 and AC-4 unchanged)

#### REQ_UAT_VALID_SAMPLES: add AC-5

```rst
   * AC-5: ``testdata/projects/`` and ``testdata/events/`` each contain at least one subfolder
     with at least one valid YAML file to enable subfolder-display testing
```

### Horizontal Check (MECE)

- ✅ REQ_EXP_REACTIVECACHE unchanged — cache structure is a SPEC concern
- ✅ REQ_UAT_INVALID_SAMPLES unchanged — invalid files stay in root folder
- ✅ No conflicts between the three modified REQs

---

## Level 2: Design

**Status**: ✅ completed

### Design Decision: Two-Layer Cache Architecture

The scanner produces two layers:
1. **Object Store** — flat map of entities per type (keyed by id). For now: `Map<string, { name: string }>`. Future: summary, openTasks, unread emails, etc.
2. **UI Tree** — precomputed navigation tree. Folder nodes reference children (folders or leaf refs). Leaf nodes reference an entity in the Object Store by id.

The TreeProvider has zero logic — it just traverses the UI Tree and looks up entities from the Object Store. This keeps the UI instant.

### Impacted Specs

| ID | Title | Impact |
|----|-------|--------|
| SPEC_EXP_SCANNER | YAML Scanner Service | major — returns tree + entity store instead of string[] |
| SPEC_EXP_PROVIDER | Tree Data Providers | major — traverses tree nodes, renders folders and leaves |
| SPEC_UAT_TESTDATA_FILES | Test Data File Set | modified — add subfolders with YAML files |

### Modified SPEC_EXP_SCANNER

```rst
.. spec:: YAML Scanner Service
   :id: SPEC_EXP_SCANNER
   :status: draft
   :links: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   File ``src/yamlScanner.ts`` — background scanner service with two-layer output.

   **Data Types:**

   .. code-block:: typescript

      interface EntityEntry {
          name: string;
      }

      interface FolderNode {
          kind: 'folder';
          name: string;              // folder name
          children: TreeNode[];
      }

      interface LeafNode {
          kind: 'leaf';
          id: string;                // key into entity store
      }

      type TreeNode = FolderNode | LeafNode;

   **Public Interface:**

   * ``constructor(onCacheChanged: () => void)``
   * ``start(projectsFolder, eventsFolder, intervalSec): void``
   * ``stop(): void``
   * ``getProjectTree(): TreeNode[]`` — returns root-level children for projects
   * ``getEventTree(): TreeNode[]`` — returns root-level children for events
   * ``getEntity(id: string): EntityEntry | undefined`` — looks up entity by id

   **Scan Logic:**

   * Recursively reads folders. For each subfolder → ``FolderNode`` with children.
   * For each ``.yaml``/``.yml`` file → parse, extract ``name``; if valid →
     ``LeafNode`` + store ``EntityEntry`` in entity map (keyed by absolute path).
   * Compares new tree + entity map against cached versions;
     fires ``onCacheChanged()`` only when diff detected.

   **Design note:** Leaf nodes carry only ``name`` for now. Future changes will
   enrich ``EntityEntry`` with additional fields (summary, tasks, emails).
```

### Modified SPEC_EXP_PROVIDER

```rst
.. spec:: Tree Data Providers
   :id: SPEC_EXP_PROVIDER
   :status: draft
   :links: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   Two classes implement ``vscode.TreeDataProvider<TreeNode>``:

   * ``ProjectTreeProvider`` — renders the project tree
   * ``EventTreeProvider`` — renders the event tree

   **getChildren(element?):**

   * If no element (root) → return ``scanner.getProjectTree()`` / ``scanner.getEventTree()``
   * If element is ``FolderNode`` → return ``element.children``
   * If element is ``LeafNode`` → return ``[]``

   **getTreeItem(element):**

   * ``FolderNode`` → ``TreeItem`` with label = folder name,
     ``collapsibleState = Collapsed``, ``contextValue = 'folder'``
   * ``LeafNode`` → look up ``scanner.getEntity(element.id)`` →
     ``TreeItem`` with label = entity name,
     ``collapsibleState = None``, ``contextValue = 'project'`` or ``'event'``

   **Both providers share no state** — all data comes from the scanner.
```

### Modified SPEC_UAT_TESTDATA_FILES

```rst
   Add to existing testdata structure:

   testdata/projects/active/
     project-delta.yaml — valid project in a subfolder (name: "Project: Delta Operations")

   testdata/events/conferences/
     event-iot-summit.yaml — valid event in a subfolder (name: "Event: IoT Summit")
```

### Horizontal Check (MECE)

- ✅ SPEC_EXP_EXTENSION: no changes needed — it already wires scanner ↔ providers
- ✅ SPEC_EXP_SCANNER + SPEC_EXP_PROVIDER: complementary, no overlap
- ✅ SPEC_UAT_TESTDATA_FILES: minimal addition, consistent with REQ_UAT_VALID_SAMPLES AC-5
- ✅ Future extensibility documented: EntityEntry will grow, tree structure stays stable
