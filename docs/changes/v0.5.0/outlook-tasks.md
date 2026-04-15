# Change Document: outlook-tasks

**Status**: implemented
**Branch**: feature/outlook-tasks
**Created**: 2026-04-14
**Author**: Change Agent

---

## Summary

Outlook Tasks integration inline in the Project/Event tree. Introduces a generic
`ITaskProvider` strategy interface, `TaskService` with `DomainCache<Task[]>`,
an `OutlookTaskProvider` (COM bridge, same pattern as `OutlookCategoryProvider`),
inline task nodes in the existing project/event tree, a `TaskEditorProvider`
Custom Editor, and a `jarvis_task` LM/MCP tool. Tasks are linked to
projects/events via their Outlook `categories` field. The feature is gated by
`jarvis.outlookEnabled === true` AND `jarvis.outlook.tasks.enabled === true`.

**Architecture split:** Generic PIM layer (theme `PIM`) — Task/ITaskProvider/
TaskService/DomainCache usage/TaskEditorProvider — is decoupled from the
Outlook-specific code (theme `OLK`) — OutlookTaskProvider + setting. Future
providers (Gmail Tasks, etc.) only need to implement `ITaskProvider`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | modified | AC-3: add inline task nodes under project/event nodes + Uncategorized Tasks top-level section |

### New User Stories

| ID | Title | Priority | Theme |
|----|-------|----------|-------|
| US_PIM_TASKS | Task Sync via Exchangeable Task Providers | mandatory | PIM |
| US_OLK_TASKS | Outlook Tasks Integration (COM Bridge) | mandatory | OLK |

### Decisions

- D-1: New theme `PIM` (tasks layer) mirrors category pattern — `ITaskProvider`, `TaskService`, `DomainCache<Task[]>`, `TaskEditorProvider`, `jarvis_task` tool
- D-2: Theme `OLK` for Outlook-only code: `OutlookTaskProvider` + `jarvis.outlook.tasks.enabled` setting
- D-3: `jarvis.outlookEnabled` remains the master toggle; `jarvis.outlook.tasks.enabled` is a sub-toggle
- D-4: Tasks appear inline in the existing project/event tree — no separate sidebar view
- D-5: "Uncategorized Tasks" section at the TOP of the projects tree (before all projects) — inbox/warning area for tasks not linked to any Jarvis project or event
- D-6: Tree reads from cache ONLY — no COM calls in tree refresh path
- D-7: Heartbeat integration: `TaskService.refresh()` via `syncTaskRefreshJob()` — same pattern as `syncCategoryRefreshJob()`
- D-8: `TaskEditorProvider` is a Custom Editor (NOT a Webview) — opens from task node click
- D-9: `completedDate` is never directly writable — it is a side-effect of setting `isComplete: true`
- D-10: Badge logic on project node: no color — only `⚠` / `(n)` / `(n !)` text signals
- D-11: `US_AUT_HEARTBEAT` not modified — already generic enough
- D-12: `US_MSG_MCPSERVER` not modified — `registerDualTool()` pattern already established
- D-13: `US_PIM_CATEGORIES` not modified — only a pattern reference
- D-14: "Open in Outlook" button in editor — only shown when `source === "outlook"`

### Horizontal Check (MECE)

- [x] No contradiction between US_PIM_TASKS and US_OLK_TASKS — generic vs. provider-specific split mirrors category layer exactly
- [x] US_EXP_SIDEBAR modified (not a new story) — inline tasks are an extension of the existing tree, not a new view
- [x] No gap: editor story folded into US_PIM_TASKS under AC — consistent with design request
- [x] No overlap with US_PIM_CATEGORIES — tasks and categories are separate PIM domains

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

| ID | Title | Priority | Theme | Links |
|----|-------|----------|-------|-------|
| REQ_PIM_TASKPROVIDER | Task Provider Interface (Strategy Pattern) | mandatory | PIM | US_PIM_TASKS |
| REQ_PIM_TASKSERVICE | Task Service + Domain Cache | mandatory | PIM | US_PIM_TASKS; REQ_PIM_TASKPROVIDER; REQ_PIM_CACHE |
| REQ_PIM_TASKEDITOR | Task Editor (Custom Editor) | mandatory | PIM | US_PIM_TASKS; REQ_PIM_TASKSERVICE |
| REQ_PIM_TASKTOOL | Task Management Tool (LM/MCP) | mandatory | PIM | US_PIM_TASKS; REQ_PIM_TASKSERVICE; REQ_MSG_MCPSERVER |
| REQ_EXP_TASKTREE | Inline Task Nodes in Project/Event Tree | mandatory | EXP | US_EXP_SIDEBAR; REQ_PIM_TASKSERVICE; REQ_EXP_TREEVIEW |
| REQ_OLK_TASKPROVIDER | Outlook Task Provider (COM Bridge) | mandatory | OLK | US_OLK_TASKS; REQ_PIM_TASKPROVIDER |
| REQ_OLK_TASKENABLE | Tasks Feature Sub-Toggle | mandatory | OLK | US_OLK_TASKS; REQ_OLK_ENABLE; REQ_CFG_SETTINGSGROUPS |

### Decisions

- D-L1-1: `REQ_PIM_CACHE` already covers generic `DomainCache<T>` — `REQ_PIM_TASKSERVICE` reuses it (links to it), no new cache REQ needed
- D-L1-2: `REQ_EXP_TASKTREE` covers both inline task nodes AND the Uncategorized Tasks section — single cohesive tree-display requirement
- D-L1-3: Heartbeat scheduling of TaskService.refresh() is covered in `REQ_PIM_TASKSERVICE` AC — no separate AUT REQ needed (same pattern as CategoryService)
- D-L1-4: `REQ_OLK_TASKENABLE` requires `jarvis.outlookEnabled === true` as prerequisite — the tasks feature is a sub-toggle within the Outlook gate
- D-L1-5: Custom Editor (not Webview) — `REQ_PIM_TASKEDITOR` specifies this explicitly
- D-L1-6: `REQ_EXP_TREEVIEW` linked but NOT modified — `REQ_EXP_TASKTREE` extends it via a downstream link

### Horizontal Check (MECE)

- [x] All new REQs link to at least one user story
- [x] No contradiction with REQ_PIM_PROVIDER or REQ_PIM_SERVICE — tasks are a separate domain, same pattern
- [x] REQ_EXP_TREEVIEW not modified — REQ_EXP_TASKTREE is an additive extension
- [x] No overlap between REQ_OLK_TASKPROVIDER and REQ_OLK_COMBRIDGE — separate providers (categories vs. tasks)
- [x] REQ_OLK_TASKENABLE correctly references REQ_OLK_ENABLE as the master toggle

---

## Level 2: Design

**Status**: ✅ completed

### New Design Specs

| ID | Title | Theme | Links |
|----|-------|-------|-------|
| SPEC_PIM_ITASKPROVIDER | ITaskProvider Interface + Task Model | PIM | REQ_PIM_TASKPROVIDER |
| SPEC_PIM_TASKSERVICE | TaskService Orchestrator | PIM | REQ_PIM_TASKSERVICE; SPEC_PIM_ITASKPROVIDER; SPEC_PIM_CACHE |
| SPEC_PIM_TASKEDITOR | TaskEditorProvider (Custom Editor) | PIM | REQ_PIM_TASKEDITOR; SPEC_PIM_TASKSERVICE; SPEC_PIM_IFACE |
| SPEC_PIM_TASKTOOL | jarvis_task LM/MCP Tool | PIM | REQ_PIM_TASKTOOL; SPEC_PIM_TASKSERVICE |
| SPEC_EXP_TASKTREE | Inline Task Nodes + Badge Logic | EXP | REQ_EXP_TASKTREE; SPEC_PIM_TASKSERVICE; SPEC_EXP_PROVIDER |
| SPEC_OLK_TASKPROVIDER | OutlookTaskProvider (COM Bridge) | OLK | REQ_OLK_TASKPROVIDER; SPEC_PIM_ITASKPROVIDER; SPEC_OLK_COMBRIDGE |
| SPEC_OLK_TASKENABLE | Tasks Sub-Toggle Setting | OLK | REQ_OLK_TASKENABLE; SPEC_EXP_EXTENSION |

### Decisions

- D-L2-1: `SPEC_PIM_ITASKPROVIDER` defines both `Task` model and `ITaskProvider` interface in `src/pim/ITaskProvider.ts`
- D-L2-2: `SPEC_PIM_TASKSERVICE` defines `TaskService` in `src/pim/TaskService.ts` + `syncTaskRefreshJob()` pattern in extension.ts
- D-L2-3: `SPEC_PIM_TASKEDITOR` defines `TaskEditorProvider` in `src/pim/TaskEditorProvider.ts` — Custom Editor registered on a virtual `task://` scheme
- D-L2-4: `SPEC_EXP_TASKTREE` defines tree structure: Uncategorized Tasks (top), project/event inline nodes, badge encoding — tree reads from TaskService cache only
- D-L2-5: `SPEC_OLK_TASKPROVIDER` maps Outlook Task COM object to `Task` interface; color field not used; `isComplete: true` triggers Outlook's native DateCompleted
- D-L2-6: `SPEC_OLK_TASKENABLE` defines `jarvis.outlook.tasks.enabled` in package.json with explicit `== true` when-clause guards
- D-L2-7: `SPEC_EXP_EXTENSION` not re-written — `SPEC_OLK_TASKENABLE` adds the manifest delta only

### Horizontal Check (MECE)

- [x] All SPEC link to at least one REQ
- [x] SPEC_PIM_ITASKPROVIDER parallels SPEC_PIM_IFACE cleanly
- [x] SPEC_PIM_TASKSERVICE parallels SPEC_PIM_SERVICE cleanly
- [x] SPEC_OLK_TASKPROVIDER parallels SPEC_OLK_COMBRIDGE cleanly
- [x] SPEC_EXP_TASKTREE is the sole owner of tree rendering logic — no overlap with SPEC_EXP_PROVIDER
- [x] SPEC_PIM_TASKEDITOR is the sole owner of task editing UI — no overlap with other editors

---

## UAT Artifacts

| Level | ID | Title |
|-------|----|-------|
| L0 | US_UAT_OUTLOOK_TASKS | UAT User Story — Outlook Tasks Integration |
| L1 | REQ_UAT_OUTLOOK_TASKS | UAT Requirements — Outlook Tasks Integration |
| L2 | SPEC_UAT_OUTLOOK_TASKS | UAT Design — Outlook Tasks Integration |

---

## Final Consistency Check

- [x] Every new REQ links to a US ✅
- [x] Every new SPEC links to a REQ ✅
- [x] No orphaned elements ✅
- [x] US intent → REQ behavior → SPEC implementation: consistent ✅
- [x] All SPEC status set to `approved` ✅
- [x] Change Document status: `approved` ✅
