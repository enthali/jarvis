# Change Document: outlook-categories

**Status**: in-progress
**Branch**: feature/outlook-categories
**Created**: 2026-04-13
**Author**: Change Agent

---

## Summary

PIM (Personal Information Management) category layer with exchangeable providers.
Introduces a generic ICategoryProvider interface, DomainCache\<T\> for RAM caching,
CategoryService for provider management, a `jarvis_category` MCP/LM Tool, a
Categories sidebar tree view, and a `jarvis.pim.showCategories` setting.
The Outlook COM provider (`OutlookCategoryProvider`) plugs into this layer as
the first concrete provider, gated by `jarvis.outlookEnabled`.

**Architecture split (v2):** Generic PIM layer (theme `PIM`) is decoupled from
Outlook-specific code (theme `OLK`). Future providers (Gmail Labels, etc.) only
need to implement `ICategoryProvider` — no Outlook dependency.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-3: add Categories as 5th sidebar section |
| US_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | modified | AC-6: Categories when-clause → `config.jarvis.pim.showCategories` (decoupled from outlookEnabled) |
| US_CFG_SETTINGSGROUPS | Grouped Settings Categories | modified | Add "Outlook" + "Categories" settings groups |

### New User Stories

| ID | Title | Priority | Theme |
|----|-------|----------|-------|
| US_PIM_CATEGORIES | Category Sync via Exchangeable Providers | mandatory | PIM |
| US_PIM_CATTOOL | Category Management Tool (LM/MCP) | mandatory | PIM |
| US_PIM_CATVIEW | Categories Sidebar View | optional | PIM |
| US_OLK_COMBRIDGE | Outlook COM Integration (PIM Provider) | mandatory | OLK |

### Decisions

- D-1: New theme `PIM` (Personal Information Management) — generic category layer, provider-agnostic
- D-2: Theme `OLK` narrowed to Outlook-specific code only (COM bridge, outlookEnabled toggle)
- D-3: `jarvis.outlookEnabled` stays in OLK — gates only the Outlook COM provider, NOT the Categories view/tool
- D-4: Categories when-clause: `config.jarvis.pim.showCategories` — decoupled from outlookEnabled so future providers work without Outlook
- D-5: Tool name: `jarvis_category` (not `jarvis_outlookCategory`) — provider-agnostic
- D-6: `jarvis.pim.showCategories` replaces `jarvis.outlook.showCategories` — lives in new "Categories" settings group
- D-7: US_AUT_HEARTBEAT NOT modified — already generic enough
- D-8: US_DEV_LOGGING NOT modified — already generic enough
- D-9: US_MSG_MCPSERVER NOT modified — dual-registration pattern already established
- D-10: Naming convention enforcement is caller responsibility (per architecture)
- D-11: `rename` action added to `jarvis_category` tool — requires `oldName` + `newName`
- D-12: Context menu on category tree nodes: Rename Category + Delete Category
- D-13: Outlook COM rename = delete old + create new with preserved color (COM has no native rename)
- D-14: Optional `id?: string` on Category interface for provider-specific unique IDs (e.g. Outlook CategoryID); operations prefer `id` over `name` when available; `jarvis_category` tool does NOT expose `id` — it's an internal implementation detail

### Horizontal Check (MECE)

- [x] No contradictions between PIM and OLK user stories
- [x] No redundancies — PIM is generic layer, OLK is Outlook-specific provider
- [x] Complete separation: US_PIM_CATEGORIES owns architecture, US_OLK_COMBRIDGE owns COM bridge
- [x] US_PIM_CATVIEW independent of any specific provider

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

| ID | Title | Priority | Theme | Links |
|----|-------|----------|-------|-------|
| REQ_PIM_PROVIDER | Category Provider Interface (Strategy Pattern) | mandatory | PIM | US_PIM_CATEGORIES |
| REQ_PIM_CACHE | Generic Domain Cache | mandatory | PIM | US_PIM_CATEGORIES, REQ_AUT_SCHEDULER |
| REQ_PIM_SERVICE | Category Service | mandatory | PIM | US_PIM_CATEGORIES, REQ_PIM_PROVIDER, REQ_PIM_CACHE |
| REQ_PIM_CATTOOL | Category Management Tool (LM/MCP) | mandatory | PIM | US_PIM_CATTOOL, REQ_PIM_SERVICE, REQ_MSG_MCPSERVER |
| REQ_PIM_CATVIEW | Categories Sidebar Tree View | optional | PIM | US_PIM_CATVIEW, REQ_PIM_SERVICE, REQ_EXP_TREEVIEW |
| REQ_OLK_COMBRIDGE | Outlook Category Provider (COM Bridge) | mandatory | OLK | US_OLK_COMBRIDGE, REQ_PIM_PROVIDER |
| REQ_OLK_ENABLE | Outlook Master Toggle | mandatory | OLK | US_OLK_COMBRIDGE, REQ_CFG_SETTINGSGROUPS |

### Modified Requirements

| ID | Title | Change |
|----|-------|--------|
| REQ_EXP_TREEVIEW | Project and Event Tree Views | AC-10: "Categories" ref → REQ_PIM_CATVIEW (was REQ_OLK_CATVIEW) |
| REQ_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | AC-6: when-clause → `jarvis.pim.showCategories` (decoupled from outlookEnabled) |
| REQ_CFG_SETTINGSGROUPS | Grouped Settings Categories | AC-2: added "Outlook" + "Categories" groups |

### Decisions

- D-L1-1: ICategoryProvider (REQ_PIM_PROVIDER) in PIM theme — interface is provider-agnostic
- D-L1-2: DomainCache (REQ_PIM_CACHE) in PIM theme — reusable for all PIM domains
- D-L1-3: Cache refresh via dedicated heartbeat job (reuses scanInterval), not coupled to YamlScanner
- D-L1-4: outlookEnabled change requires window reload — provider instantiated once at activation
- D-L1-5: Tool does NOT validate naming conventions — per architecture decision
- D-L1-6: REQ_PIM_CATTOOL guard: checks for providers (not outlookEnabled) — tool works with any provider
- D-L1-7: REQ_PIM_CATVIEW when-clause: `config.jarvis.pim.showCategories` — single boolean, no compound condition
- D-L1-8: REQ_OLK_ENABLE scoped to Outlook provider only — no longer gates view or tool
- D-L1-9: `renameCategory()` added to ICategoryProvider and CategoryService
- D-L1-10: Context menu on category nodes: rename + delete — hidden from Command Palette
- D-L1-11: Outlook COM rename: delete old + create new with preserved color (AC-6 on REQ_OLK_COMBRIDGE)
- D-L1-12: Optional `id` field on Category (AC-7 on REQ_PIM_PROVIDER); Outlook fills with CategoryID (AC-7 on REQ_OLK_COMBRIDGE)

### Horizontal Check (MECE)

- [x] No overlap between PIM and OLK requirements — PIM is generic, OLK is Outlook-specific
- [x] REQ_PIM_CATTOOL links to REQ_MSG_MCPSERVER for dual registration — no duplication
- [x] REQ_OLK_ENABLE is scoped to Outlook provider only — clean separation
- [x] No contradiction with REQ_AUT_SCHEDULER (heartbeat is generic)
- [x] All US_PIM_CATEGORIES ACs covered by PIM requirements
- [x] All US_OLK_COMBRIDGE ACs covered by OLK requirements

---

## Level 2: Design

**Status**: ✅ completed

### New Design Specs

| ID | Title | Theme | Links |
|----|-------|-------|-------|
| SPEC_PIM_IFACE | ICategoryProvider Interface | PIM | REQ_PIM_PROVIDER |
| SPEC_PIM_CACHE | DomainCache\<T\> Implementation | PIM | REQ_PIM_CACHE |
| SPEC_PIM_SERVICE | CategoryService Orchestrator | PIM | REQ_PIM_SERVICE, SPEC_PIM_IFACE, SPEC_PIM_CACHE |
| SPEC_PIM_CATTOOL | jarvis_category Dual Tool | PIM | REQ_PIM_CATTOOL, SPEC_PIM_SERVICE, SPEC_MSG_DUALREGISTRATION |
| SPEC_PIM_CATVIEW | CategoryTreeProvider | PIM | REQ_PIM_CATVIEW, SPEC_PIM_SERVICE |
| SPEC_OLK_COMBRIDGE | OutlookCategoryProvider (COM Bridge) | OLK | REQ_OLK_COMBRIDGE, SPEC_PIM_IFACE |
| SPEC_OLK_SETTINGS | Outlook Settings and Activation Guard | OLK | REQ_OLK_ENABLE, REQ_CFG_SETTINGSGROUPS, SPEC_CFG_SETTINGSGROUPS |

### Modified Design Specs

| ID | Title | Change |
|----|-------|--------|
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | Categories when-clause → `config.jarvis.pim.showCategories` |
| SPEC_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | Categories when-clause updated |
| SPEC_CFG_SETTINGSGROUPS | Grouped Settings Configuration | "Outlook" group: only `outlookEnabled`; added "Categories" group with `pim.showCategories` |

### Decisions

- D-L2-1: Generic PIM files in `src/pim/` — ICategoryProvider, DomainCache, CategoryService, CategoryTreeProvider
- D-L2-2: Outlook-specific file stays in `src/outlookIntegration/OutlookCategoryProvider.ts`
- D-L2-3: COM calls via `child_process.execFile('powershell', [...])` with 10s timeout
- D-L2-4: PowerShell injection prevention: single-quote escaping
- D-L2-5: `syncCategoryRefreshJob()` replaces `syncOutlookRefreshJob()` — PIM-level, not OLK-level
- D-L2-6: CategoryService always instantiated; Outlook provider conditionally added
- D-L2-7: Tool registered via `registerDualTool()` as `jarvis_category`
- D-L2-8: CategoryTreeProvider sorts categories alphabetically by name
- D-L2-9: Tool guard checks `categoryService.hasProviders()` instead of `outlookEnabled`
- D-L2-10: `renameCategory` on SPEC_PIM_IFACE — providers implement rename
- D-L2-11: SPEC_PIM_CATTOOL adds `rename` action with `oldName`/`newName` Zod schema params
- D-L2-12: SPEC_PIM_CATVIEW adds `jarvis.renameCategory` + `jarvis.deleteCategory` context menu commands
- D-L2-13: SPEC_OLK_COMBRIDGE rename: delete + re-create with preserved color via PowerShell COM
- D-L2-14: SPEC_PIM_IFACE: `id?: string` on Category; SPEC_PIM_SERVICE: `deleteCategory`/`renameCategory` accept optional `id`, pass to provider; SPEC_OLK_COMBRIDGE: getCategories populates `id` from COM CategoryID, delete/rename scripts use ID-or-name lookup

### Horizontal Check (MECE)

- [x] All REQ_PIM_* covered: PROVIDER→IFACE, CACHE→CACHE, SERVICE→SERVICE, CATTOOL→CATTOOL, CATVIEW→CATVIEW
- [x] All REQ_OLK_* covered: COMBRIDGE→COMBRIDGE, ENABLE→SETTINGS
- [x] No orphan specs — every SPEC links back to a REQ
- [x] SPEC_PIM_CATTOOL uses SPEC_MSG_DUALREGISTRATION — no reinvention
- [x] SPEC_OLK_SETTINGS only gates provider — view/tool are PIM-level
- [x] File structure: generic in `src/pim/`, Outlook in `src/outlookIntegration/`

---

## Rename Mapping

### OLK → PIM (generic layer)

| Old ID | New ID |
|--------|--------|
| US_OLK_CATEGORIES | US_PIM_CATEGORIES |
| US_OLK_CATTOOL | US_PIM_CATTOOL |
| US_OLK_CATVIEW | US_PIM_CATVIEW |
| REQ_OLK_PROVIDER | REQ_PIM_PROVIDER |
| REQ_OLK_CACHE | REQ_PIM_CACHE |
| REQ_OLK_SERVICE | REQ_PIM_SERVICE |
| REQ_OLK_CATTOOL | REQ_PIM_CATTOOL |
| REQ_OLK_CATVIEW | REQ_PIM_CATVIEW |
| SPEC_OLK_IFACE | SPEC_PIM_IFACE |
| SPEC_OLK_CACHE | SPEC_PIM_CACHE |
| SPEC_OLK_SERVICE | SPEC_PIM_SERVICE |
| SPEC_OLK_CATTOOL | SPEC_PIM_CATTOOL |
| SPEC_OLK_CATVIEW | SPEC_PIM_CATVIEW |

### OLK stays (Outlook-specific)

| ID | Notes |
|----|-------|
| US_OLK_COMBRIDGE | NEW — split from old US_OLK_CATEGORIES |
| REQ_OLK_COMBRIDGE | Stays — links updated to REQ_PIM_PROVIDER |
| REQ_OLK_ENABLE | Stays — scoped to Outlook provider only |
| SPEC_OLK_COMBRIDGE | Stays — links updated to SPEC_PIM_IFACE |
| SPEC_OLK_SETTINGS | Stays — only `outlookEnabled`, no `showCategories` |

### Additional renames

| What | Old | New |
|------|-----|-----|
| MCP Tool | `jarvis_outlookCategory` | `jarvis_category` |
| Setting | `jarvis.outlook.showCategories` | `jarvis.pim.showCategories` |
| Source folder (generic) | `src/outlookIntegration/` | `src/pim/` |
| Heartbeat job | "Jarvis: Outlook Refresh" | "Jarvis: Category Refresh" |
| Settings group | "Outlook" (had showCategories) | "Outlook" (only outlookEnabled) + "Categories" (showCategories) |

---

## Final Consistency Check

**Status**: ⏳ not started

---

*Generated by syspilot Change Agent*
