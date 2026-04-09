# Change Document: folder-filter

**Status**: verified
**Branch**: feature/folder-filter
**Created**: 2026-04-02
**Author**: Jarvis Developer

---

## Summary

Add a folder filter for the Projects tree view. A filter icon in the Projects title bar opens a QuickPick with all project folders. Folders can be toggled visible/hidden via multi-select. Filter state persists in workspaceState. Projects-only — event filter (date-based) is a separate future change.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories

#### US_EXP_PROJECTFILTER: Project Folder Filter

```rst
.. story:: Project Folder Filter
   :id: US_EXP_PROJECTFILTER
   :status: draft
   :priority: optional

   **As a** Jarvis User,
   **I want** to show/hide individual folders in the Projects explorer,
   **so that** I can hide archived or irrelevant project folders and focus on active work.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Projects title bar opens a QuickPick listing all project folders
   * AC-2: Folders can be toggled visible/hidden via multi-select
   * AC-3: The filter selection persists across VS Code restarts (workspaceState)
   * AC-4: When a filter is active, the icon visually indicates that filtering is applied
```

### Decisions

- Decision 1: Projects only — event filter (date-based) will be a separate change (US_EXP_EVENTFILTER)
- Decision 2: Named US_EXP_PROJECTFILTER (not US_EXP_FILTER) to keep namespace clear

### Horizontal Check (MECE)

- ✅ No conflict with US_EXP_SIDEBAR (display vs. filtering)
- ✅ US_CFG_PROJECTPATH unaffected — filter doesn't change config paths
- ✅ US_UAT_SAMPLEDATA unaffected — testdata stays as-is, filter is pure UI

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

#### REQ_EXP_PROJECTFILTER: Project Folder Filter

```rst
.. req:: Project Folder Filter
   :id: REQ_EXP_PROJECTFILTER
   :status: draft
   :priority: optional
   :links: US_EXP_PROJECTFILTER

   **Description:**
   The Projects tree view SHALL provide a filter mechanism to show/hide
   individual folders via a QuickPick dialog.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Projects title bar triggers the command ``jarvis.filterProjectFolders``
   * AC-2: The command shows a QuickPick with ``canPickMany: true``, one entry per existing folder
   * AC-3: Pre-selected = visible, deselected = hidden
   * AC-4: After confirmation the tree updates immediately
   * AC-5: The icon changes visually when a filter is active (e.g. filter vs filter-filled)
```

#### REQ_EXP_FILTERPERSIST: Filter Persistence

```rst
.. req:: Filter Persistence
   :id: REQ_EXP_FILTERPERSIST
   :status: draft
   :priority: optional
   :links: US_EXP_PROJECTFILTER

   **Description:**
   The folder filter selection SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: The list of hidden folders is stored in ``workspaceState``
   * AC-2: On extension start the saved filter is applied
   * AC-3: On save only existing folders are persisted — stale entries are implicitly discarded
```

### Horizontal Check (MECE)

- ✅ REQ_EXP_TREEVIEW unchanged — filter is a new layer on top
- ✅ REQ_EXP_YAMLDATA unchanged — scanner delivers everything, filter is provider-side
- ✅ REQ_EXP_REACTIVECACHE unchanged — cache knows no filter, only UI filters
- ✅ REQ_EXP_PROJECTFILTER and REQ_EXP_FILTERPERSIST: complementary (interaction vs. storage), no overlap

---

## Level 2: Design

**Status**: ✅ completed

### Design Decisions

- Filter state lives in `ProjectTreeProvider` as `private _hiddenFolders: Set<string>`
- QuickPick shows only root-level FolderNodes from `scanner.getProjectTree()`
- `extension.ts` registers the command and passes `workspaceState` + provider references
- Icon uses VS Code built-in codicons: `filter` (no filter) / `filter-filled` (filter active)

### Impacted Specs

| ID | Title | Impact |
|----|-------|--------|
| SPEC_EXP_PROVIDER | Tree Data Providers | modified — ProjectTreeProvider gets filter state + filtering in getChildren |
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | modified — new command + menu contribution + workspaceState wiring |

### New SPEC: SPEC_EXP_FILTERCOMMAND

```rst
.. spec:: Project Folder Filter Command
   :id: SPEC_EXP_FILTERCOMMAND
   :status: draft
   :links: REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST

   **Description:**
   A new command ``jarvis.filterProjectFolders`` implements the filter dialog.

   **Flow:**

   1. Collect root-level ``FolderNode`` names from ``scanner.getProjectTree()``
   2. Build QuickPick items: one per folder, pre-selected if NOT in ``_hiddenFolders``
   3. Show ``vscode.window.showQuickPick(items, { canPickMany: true })``
   4. On confirm: compute new hidden set = all folders minus selected folders
   5. Update ``provider._hiddenFolders``
   6. Persist to ``workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenSet])``
   7. Call ``provider.refresh()`` to re-render tree
   8. Update icon via ``vscode.commands.executeCommand('setContext', 'jarvis.projectFilterActive', hidden.size > 0)``

   **Registration in package.json:**

   .. code-block:: json

      {
        "contributes": {
          "commands": [{
            "command": "jarvis.filterProjectFolders",
            "title": "Filter Project Folders",
            "icon": "$(filter)"
          }],
          "menus": {
            "view/title": [{
              "command": "jarvis.filterProjectFolders",
              "when": "view == jarvisProjects",
              "group": "navigation"
            }]
          }
        }
      }

   **Icon toggle** via ``when`` clause with two menu entries:

   .. code-block:: json

      "view/title": [
        {
          "command": "jarvis.filterProjectFolders",
          "when": "view == jarvisProjects && !jarvis.projectFilterActive",
          "group": "navigation"
        },
        {
          "command": "jarvis.filterProjectFolders",
          "when": "view == jarvisProjects && jarvis.projectFilterActive",
          "group": "navigation"
        }
      ]

   Two command registrations with different icons (``$(filter)`` vs ``$(filter-filled)``),
   toggled via the ``jarvis.projectFilterActive`` context key.
```

### Modified SPEC_EXP_PROVIDER (ProjectTreeProvider only)

```rst
   Add to ProjectTreeProvider:

   * ``private _hiddenFolders: Set<string>`` — set of root-level folder names to hide
   * ``setHiddenFolders(folders: Set<string>): void`` — update hidden set + refresh
   * ``getHiddenFolders(): Set<string>`` — return current hidden set

   Modified ``getChildren(element?)``:
   * If no element (root): return ``scanner.getProjectTree().filter(node =>
     !(node.kind === 'folder' && _hiddenFolders.has(node.name)))``
   * All other cases unchanged
```

### Modified SPEC_EXP_EXTENSION

```rst
   Add to activate():

   * Restore hidden folders: ``context.workspaceState.get<string[]>('jarvis.hiddenProjectFolders', [])``
     → pass to ``projectProvider.setHiddenFolders()``
   * Register command ``jarvis.filterProjectFolders`` with QuickPick logic
   * Set initial context: ``setContext('jarvis.projectFilterActive', hidden.length > 0)``
```

### Horizontal Check (MECE)

- ✅ SPEC_EXP_SCANNER: untouched — scanner knows nothing about filters
- ✅ EventTreeProvider: untouched — filter is projects-only
- ✅ SPEC_EXP_FILTERCOMMAND is self-contained — the only new spec
- ✅ SPEC_EXP_PROVIDER change is minimal (one filter line in getChildren)
