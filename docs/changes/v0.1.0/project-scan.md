# Change Document: project-scan

**Status**: in-progress
**Branch**: feature/project-scan
**Created**: 2026-04-01
**Author**: Jarvis Team

---

## Summary

Replace the dummy project/event data in the Jarvis sidebar with real data loaded from
YAML files in user-configured folder paths. A background scanner keeps a cache fresh
at a configurable interval; the tree view updates reactively via `onDidChangeTreeData`
whenever the cache changes. The user stays in control via two VS Code settings:
`jarvis.projectsFolder` and `jarvis.scanInterval`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_EXP_SIDEBAR` | Project & Event Explorer | modified | AC-4 updated: "actual projects and events from my project and event locations" |

```rst
.. story:: Project & Event Explorer
   :id: US_EXP_SIDEBAR
   :status: implemented
   :priority: mandatory

   **As a** project manager,
   **I want** a dedicated sidebar in VS Code that lists my projects and events in two separate groups,
   **so that** I can quickly see and navigate to my active projects and upcoming events without leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A "Jarvis" icon appears in the VS Code Activity Bar
   * AC-2: Clicking the icon opens a sidebar panel
   * AC-3: The sidebar contains two collapsible sections: "Projects" and "Events"
   * AC-4: Each section displays the actual projects and events from my project and event locations
```

### New User Stories

```rst
.. story:: Configurable Project and Event Folder Paths
   :id: US_CFG_PROJECTPATH
   :status: draft
   :priority: mandatory

   **As a** project manager,
   **I want** to configure the folder paths where Jarvis looks for project and event YAML files,
   **so that** I can point the extension to my own storage locations.

   **Acceptance Criteria:**

   * AC-1: A VS Code setting ``jarvis.projectsFolder`` accepts an absolute folder path for projects
   * AC-2: A VS Code setting ``jarvis.eventsFolder`` accepts an absolute folder path for events
   * AC-3: A VS Code setting ``jarvis.scanInterval`` controls background refresh interval (default: 30s)
   * AC-4: Changing a folder setting immediately triggers a rescan
```

### Decisions

- No scan-specific US: scanning is HOW (REQ/SPEC), not WHY (US)
- `US_CFG_PROJECTPATH` covers both projects and events folder — one setting US per concern
- `US_CFG_PROJECTPATH` lives in new `docs/userstories/us_cfg.rst` (Theme: CFG)

### Horizontal Check (MECE)

- ✅ `US_EXP_SIDEBAR` (extended) covers what the user sees
- ✅ `US_CFG_PROJECTPATH` covers how the user controls the data sources — no overlap
- ✅ No existing US touched beyond AC-4 update on `US_EXP_SIDEBAR`

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_EXP_DUMMYDATA` | `US_EXP_SIDEBAR` | deprecated | Replaced by real YAML data; set status to `deprecated` |

### New Requirements

```rst
.. req:: YAML-based Project and Event Data
   :id: REQ_EXP_YAMLDATA
   :status: draft
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   The tree views SHALL load project and event names from YAML files in the
   configured folder paths. Invalid or unreadable files SHALL be skipped silently.

   **Acceptance Criteria:**

   * AC-1: All ``.yaml`` / ``.yml`` files in ``jarvis.projectsFolder`` are read for projects
   * AC-2: All ``.yaml`` / ``.yml`` files in ``jarvis.eventsFolder`` are read for events
   * AC-3: The ``name`` field value is used as the tree item label
   * AC-4: Files that cannot be parsed or are missing the ``name`` field are skipped without crashing


.. req:: Background Cache with Reactive Tree Update
   :id: REQ_EXP_REACTIVECACHE
   :status: draft
   :priority: mandatory
   :links: US_EXP_SIDEBAR

   **Description:**
   A background scanner SHALL maintain an in-memory cache and update the tree view
   reactively via ``onDidChangeTreeData``. The scanner SHALL only run while the
   tree view is visible.

   **Acceptance Criteria:**

   * AC-1: The UI thread never performs file I/O — all reads happen in the background scanner
   * AC-2: The scanner starts when the tree view becomes visible and pauses when hidden
   * AC-3: The scanner runs at the interval defined by ``jarvis.scanInterval``
   * AC-4: After each scan, the result is compared to the current cache — ``onDidChangeTreeData``
     is fired only if the cache actually changed
   * AC-5: On first scan the cache is empty and the tree shows nothing; after the first scan
     completes the cache is populated and the event is fired


.. req:: Configurable Folder Paths
   :id: REQ_CFG_FOLDERPATHS
   :status: draft
   :priority: mandatory
   :links: US_CFG_PROJECTPATH

   **Description:**
   The extension SHALL provide VS Code settings for the project and event folder paths.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.projectsFolder`` accepts an absolute folder path for project YAML files
   * AC-2: ``jarvis.eventsFolder`` accepts an absolute folder path for event YAML files
   * AC-3: Changing either folder setting immediately triggers a new scan cycle


.. req:: Configurable Scan Interval
   :id: REQ_CFG_SCANINTERVAL
   :status: draft
   :priority: mandatory
   :links: US_CFG_PROJECTPATH

   **Description:**
   The extension SHALL provide a VS Code setting to control the background scanner interval.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.scanInterval`` accepts integer seconds, minimum 20, default 120
   * AC-2: A change to the interval takes effect at the start of the next scan cycle
```

### Decisions

- `REQ_EXP_DUMMYDATA` → `deprecated` (not deleted — stays in RST for history)
- Config-triggered rescan only on folder path change (explicit user action); interval change just takes effect next cycle
- Minimum scan interval: 20s to avoid hammering VS Code

### Horizontal Check (MECE)

- ✅ `REQ_EXP_YAMLDATA` (what to load) ↔ `REQ_EXP_REACTIVECACHE` (how to keep fresh) — complementary, no overlap
- ✅ `REQ_CFG_FOLDERPATHS` ↔ `REQ_CFG_SCANINTERVAL` — separate concerns, no overlap
- ✅ All new REQs link to a US

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_EXP_PROVIDER` | `REQ_EXP_TREEVIEW`, `REQ_EXP_DUMMYDATA` | modified | Remove dummy data; receive cache from YamlScanner; update links |
| `SPEC_EXP_EXTENSION` | `REQ_EXP_ACTIVITYBAR` | modified | Add scanner lifecycle, config listener, visibility gating |

### New Design Elements

```rst
.. spec:: VS Code Settings for Folder Paths and Scan Interval
   :id: SPEC_CFG_SETTINGS
   :status: draft
   :links: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

   **Description:**
   Add a ``contributes.configuration`` block to ``package.json``:

   .. code-block:: json

      "jarvis.projectsFolder": {
        "type": "string",
        "default": "",
        "description": "Absolute path to the folder containing project YAML files."
      },
      "jarvis.eventsFolder": {
        "type": "string",
        "default": "",
        "description": "Absolute path to the folder containing event YAML files."
      },
      "jarvis.scanInterval": {
        "type": "number",
        "default": 120,
        "minimum": 20,
        "description": "Background scan interval in seconds (minimum 20)."
      }

   New file: ``docs/design/spec_cfg.rst`` (Theme: CFG).


.. spec:: YAML Scanner Service
   :id: SPEC_EXP_SCANNER
   :status: draft
   :links: REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   New file ``src/yamlScanner.ts`` — a self-contained background scanner service.

   .. code-block:: typescript

      export class YamlScanner {
        private _projectCache: string[] = [];
        private _eventCache: string[]   = [];
        private _timer: NodeJS.Timeout | undefined;

        constructor(private readonly _onCacheChanged: () => void) {}

        start(projectsFolder: string, eventsFolder: string, intervalSec: number): void {
          this.stop();
          this._timer = setInterval(() => this._scan(projectsFolder, eventsFolder),
                                    Math.max(20, intervalSec) * 1000);
          this._scan(projectsFolder, eventsFolder);  // immediate first run
        }

        stop(): void {
          if (this._timer) { clearInterval(this._timer); this._timer = undefined; }
        }

        getProjects(): string[] { return this._projectCache; }
        getEvents():   string[] { return this._eventCache;   }

        private async _scan(projectsFolder: string, eventsFolder: string): Promise<void> {
          const projects = await this._readNames(projectsFolder);
          const events   = await this._readNames(eventsFolder);
          if (!this._arraysEqual(projects, this._projectCache) ||
              !this._arraysEqual(events,   this._eventCache)) {
            this._projectCache = projects;
            this._eventCache   = events;
            this._onCacheChanged();
          }
        }

        private async _readNames(folder: string): Promise<string[]> {
          // reads all .yaml/.yml files, parses 'name' field via js-yaml,
          // skips files that fail to parse or lack a name field
        }

        private _arraysEqual(a: string[], b: string[]): boolean { ... }
      }

   Dependency: ``js-yaml`` (add to ``package.json`` dependencies).
```

### Modified Design Elements

```rst
.. spec:: Tree Data Providers
   :id: SPEC_EXP_PROVIDER
   :status: draft                          ← was: implemented
   :links: REQ_EXP_TREEVIEW, REQ_EXP_YAMLDATA, REQ_EXP_REACTIVECACHE

   **Description:**
   ``ProjectTreeProvider`` and ``EventTreeProvider`` become reactive cache readers.
   Both classes gain an ``EventEmitter`` and receive data from ``YamlScanner``.

   * ``getChildren()``: returns items built from ``scanner.getProjects()`` /
     ``scanner.getEvents()`` — no file I/O
   * ``refresh()``: fires ``_onDidChangeTreeData`` — called by scanner's ``_onCacheChanged``
   * Dummy data removed entirely


.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: draft                          ← was: implemented
   :links: REQ_EXP_ACTIVITYBAR, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

   **Description:**
   ``activate()`` wires scanner lifecycle to tree view visibility and config changes:

   .. code-block:: typescript

      const scanner = new YamlScanner(() => {
        projectProvider.refresh();
        eventProvider.refresh();
      });

      const startScanner = () => {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        scanner.start(cfg.get('projectsFolder'), cfg.get('eventsFolder'),
                      cfg.get('scanInterval'));
      };

      // visibility gating
      projectView.onDidChangeVisibility(e => e.visible ? startScanner() : scanner.stop());

      // config change → restart with new settings (folder path change = immediate rescan)
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('jarvis')) { startScanner(); }
      });
```

### Decisions

- `js-yaml` used for parsing (already common in VS Code extension ecosystem)
- Visibility gating via `TreeView.onDidChangeVisibility` — requires registering via `vscode.window.createTreeView()` instead of `registerTreeDataProvider()`
- Scanner fires `_onCacheChanged` only on actual cache diff — prevents UI flicker

### Horizontal Check (MECE)

- ✅ `SPEC_EXP_SCANNER` (I/O + cache logic) ↔ `SPEC_EXP_PROVIDER` (UI binding) — cleanly separated
- ✅ `SPEC_CFG_SETTINGS` (package.json schema) ↔ `SPEC_EXP_EXTENSION` (runtime config reading) — complementary
- ✅ All new/modified SPECs link to REQs

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_EXP_SIDEBAR` (AC-4 updated) | `REQ_EXP_YAMLDATA`, `REQ_EXP_REACTIVECACHE` | `SPEC_EXP_SCANNER`, `SPEC_EXP_PROVIDER` (modified), `SPEC_EXP_EXTENSION` (modified) | ✅ |
| `US_CFG_PROJECTPATH` (new) | `REQ_CFG_FOLDERPATHS`, `REQ_CFG_SCANINTERVAL` | `SPEC_CFG_SETTINGS`, `SPEC_EXP_EXTENSION` (modified) | ✅ |
| `REQ_EXP_DUMMYDATA` | deprecated | `SPEC_EXP_PROVIDER` links updated | ✅ |

### Sign-off

- ✅ All levels completed
- ✅ All conflicts resolved
- ✅ Traceability verified
- ✅ Ready for implementation

---

*Generated by syspilot Change Agent*
