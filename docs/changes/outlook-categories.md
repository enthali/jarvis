# Change Document: outlook-categories

**Status**: in-progress
**Branch**: feature/outlook-categories
**Created**: 2026-04-13
**Author**: Change Agent

---

## Summary

First Outlook Integration feature for Jarvis. Introduces a Strategy-Pattern-based Category Provider (ICategoryProvider) with an Outlook COM implementation, a generic DomainCache\<T\> for RAM caching, a CategoryService for provider management, a `jarvis_outlookCategory` MCP/LM Tool, a Categories sidebar tree view, and supporting settings (`jarvis.outlookEnabled`, `jarvis.outlook.showCategories`). This lays the foundation for all subsequent Outlook features (Tasks, Calendar, Contacts, Inbox).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-3: add Categories as 5th sidebar section |
| US_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | modified | Add AC for Categories view visibility rule |
| US_CFG_SETTINGSGROUPS | Grouped Settings Categories | modified | Add "Outlook" settings group |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_OLK_CATEGORIES | Outlook Category Sync | mandatory |
| US_OLK_CATTOOL | Outlook Category Management Tool (LM/MCP) | mandatory |
| US_OLK_CATVIEW | Categories Sidebar View | optional |

### Decisions

- D-1: New theme `OLK` (Outlook) — short, consistent with existing 3-char themes
- D-2: Master toggle `jarvis.outlookEnabled` lives in US_OLK_CATEGORIES (first Outlook feature owns it); subsequent Outlook features reference the same toggle
- D-3: US_AUT_HEARTBEAT NOT modified — already generic enough to cover cache refresh jobs
- D-4: US_DEV_LOGGING NOT modified — already generic enough to cover new module tags
- D-5: US_MSG_MCPSERVER NOT modified — dual-registration pattern already established; US_OLK_CATTOOL references it via link
- D-6: Naming convention enforcement is caller responsibility (per architecture), NOT part of the category tool

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies (OLK is a new domain, no overlap with existing EXP/CFG/MSG/AUT)
- [x] Gaps identified and addressed (see MECE advisory after RST write)

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

| ID | Title | Priority | Links |
|----|-------|----------|-------|
| REQ_OLK_PROVIDER | Category Provider Interface (Strategy Pattern) | mandatory | US_OLK_CATEGORIES |
| REQ_OLK_CACHE | Generic Domain Cache | mandatory | US_OLK_CATEGORIES, REQ_AUT_SCHEDULER |
| REQ_OLK_COMBRIDGE | Outlook Category Provider (COM Bridge) | mandatory | US_OLK_CATEGORIES, REQ_OLK_PROVIDER |
| REQ_OLK_SERVICE | Category Service | mandatory | US_OLK_CATEGORIES, REQ_OLK_PROVIDER, REQ_OLK_CACHE |
| REQ_OLK_ENABLE | Outlook Master Toggle | mandatory | US_OLK_CATEGORIES, REQ_CFG_SETTINGSGROUPS |
| REQ_OLK_CATTOOL | Category Management Tool (LM/MCP) | mandatory | US_OLK_CATTOOL, REQ_OLK_SERVICE, REQ_OLK_ENABLE, REQ_MSG_MCPSERVER |
| REQ_OLK_CATVIEW | Categories Sidebar Tree View | optional | US_OLK_CATVIEW, REQ_OLK_SERVICE, REQ_OLK_ENABLE, REQ_EXP_TREEVIEW |

### Modified Requirements

| ID | Title | Change |
|----|-------|--------|
| REQ_EXP_TREEVIEW | Project and Event Tree Views | AC-10: added Categories as 5th view; updated description from "three" to "five" views |
| REQ_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | AC-6: added Categories view when-clause rule |
| REQ_CFG_SETTINGSGROUPS | Grouped Settings Categories | AC-2: added "Outlook" to the groups list |

### Decisions

- D-L1-1: Separated ICategoryProvider (REQ_OLK_PROVIDER) from OutlookCategoryProvider (REQ_OLK_COMBRIDGE) — interface is reusable for future providers (Gmail Labels, etc.)
- D-L1-2: DomainCache is generic (REQ_OLK_CACHE) — reusable for Tasks, Calendar, Contacts domains
- D-L1-3: Cache refresh via dedicated heartbeat job (reuses scanInterval), not coupled to YamlScanner
- D-L1-4: outlookEnabled change requires window reload — providers are instantiated once at activation
- D-L1-5: Tool does NOT validate naming conventions — per architecture decision (D-6 in L0)
- D-L1-6: Categories when-clause uses compound condition (outlookEnabled AND showCategories) — differs from other views which use non-empty-string checks

### Horizontal Check (MECE)

- [x] No overlap between new OLK requirements and existing EXP/CFG/MSG/AUT — OLK is a new domain
- [x] REQ_OLK_CATTOOL correctly links to REQ_MSG_MCPSERVER for dual registration — no duplication of MCP server logic
- [x] REQ_OLK_ENABLE is the single point of control for all Outlook features — consistent guard
- [x] No contradictions with existing REQ_AUT_SCHEDULER (heartbeat is generic, OLK refresh is just another job)
- [x] No gap: all US_OLK_CATEGORIES ACs covered (AC-1→SERVICE+PROVIDER, AC-2→COMBRIDGE, AC-3→CACHE, AC-4→CACHE AC-4, AC-5→SERVICE AC-6, AC-6→ENABLE, AC-7→COMBRIDGE AC-5, AC-8→PROVIDER AC-5)

---

## Level 2: Design

**Status**: ✅ completed

### New Design Specs

| ID | Title | Links |
|----|-------|-------|
| SPEC_OLK_IFACE | ICategoryProvider Interface | REQ_OLK_PROVIDER |
| SPEC_OLK_CACHE | DomainCache\<T\> Implementation | REQ_OLK_CACHE |
| SPEC_OLK_COMBRIDGE | OutlookCategoryProvider (COM Bridge) | REQ_OLK_COMBRIDGE, SPEC_OLK_IFACE |
| SPEC_OLK_SERVICE | CategoryService Orchestrator | REQ_OLK_SERVICE, SPEC_OLK_IFACE, SPEC_OLK_CACHE |
| SPEC_OLK_CATTOOL | jarvis_outlookCategory Dual Tool | REQ_OLK_CATTOOL, SPEC_OLK_SERVICE, SPEC_MSG_DUALREGISTRATION |
| SPEC_OLK_CATVIEW | CategoryTreeProvider | REQ_OLK_CATVIEW, SPEC_OLK_SERVICE |
| SPEC_OLK_SETTINGS | Outlook Settings and Activation Guard | REQ_OLK_ENABLE, REQ_CFG_SETTINGSGROUPS, SPEC_CFG_SETTINGSGROUPS |

### Modified Design Specs

| ID | Title | Change |
|----|-------|--------|
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | Added `onView:jarvisCategories` activation event; "Four views" → "Five views" |
| SPEC_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | Added jarvisCategories entry with compound when-clause |
| SPEC_CFG_SETTINGSGROUPS | Grouped Settings Configuration | Added "Outlook" group with outlookEnabled + showCategories |

### Decisions

- D-L2-1: New files in `src/outlookIntegration/` subdirectory — per architecture reference; isolates Outlook concern from core extension
- D-L2-2: COM calls via `child_process.execFile('powershell', [...])` with 10s timeout — simplest approach, no extra dependency
- D-L2-3: PowerShell injection prevention: single-quote escaping on name parameter before template substitution
- D-L2-4: `syncOutlookRefreshJob()` mirrors `syncRescanJob()` pattern — registers heartbeat job for periodic cache refresh
- D-L2-5: CategoryService._fetchAll() sequential iteration — parallel unnecessary for expected single-provider setup; errors caught per-provider
- D-L2-6: Tool registered via existing `registerDualTool()` wrapper — no new infrastructure needed
- D-L2-7: CategoryTreeProvider sorts categories alphabetically by name — consistent with other tree views

### Horizontal Check (MECE)

- [x] All REQ_OLK_* are covered by at least one SPEC: PROVIDER→IFACE, CACHE→CACHE, COMBRIDGE→COMBRIDGE, SERVICE→SERVICE, ENABLE→SETTINGS, CATTOOL→CATTOOL, CATVIEW→CATVIEW
- [x] No orphan specs — every SPEC links back to a REQ
- [x] SPEC_OLK_CATTOOL uses SPEC_MSG_DUALREGISTRATION — no reinvention of dual tool pattern
- [x] SPEC_OLK_SETTINGS activation guard is consistent with REQ_OLK_ENABLE AC-2 (no COM when disabled)
- [x] No contradiction with SPEC_EXP_EXTENSION activation order — Outlook guard runs after heartbeat init (needs scheduler for syncOutlookRefreshJob)
- [x] File structure matches architecture reference exactly: 5 files in src/outlookIntegration/

---

## Final Consistency Check

**Status**: ⏳ not started

---

*Generated by syspilot Change Agent*
