# Change Document: new-entity-category

**Status**: implemented
**Branch**: feature/new-entity-category
**Created**: 2026-04-13
**Author**: Change Agent (syspilot.change)

---

## Summary

When a new project or event is created via the `jarvis.newEntity` command, automatically
create an Outlook category using the conventional naming pattern (`"Project: <name>"` /
`"Event: <name>"`), guarded by `jarvis.outlookEnabled === true` and
`categoryService.hasProviders()`. Errors during category creation must NOT block entity
creation (try/catch, log only). The naming convention is enforced at the command handler
level, not inside `CategoryService` or any provider.

**Scope**: Minimal addition to `src/extension.ts` — no new files, no schema changes.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_OLK_AUTOCATEGORY | Auto-Create Outlook Category on New Entity | optional |

### Impacted User Stories (existing, not modified)

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_NEWENTITY | Create New Project or Event | context | New US links here; no AC change needed |
| US_OLK_COMBRIDGE | Outlook COM Integration (PIM Provider) | context | Provides the guard mechanism (outlookEnabled) |
| US_PIM_CATTOOL | Category Management Tool (LM/MCP) | context | AC-7 confirms: tool does NOT enforce naming convention; caller is responsible |

### Decisions

- D-1: Convention enforcement ("Project: " / "Event: " prefix) lives in the command handler, not in `CategoryService`. This aligns with `US_PIM_CATTOOL` AC-7: the tool is convention-agnostic.
- D-2: New US `US_OLK_AUTOCATEGORY` is created (not extending `US_EXP_NEWENTITY`) because this is a distinct user goal about Outlook sync, not about entity creation scaffolding.
- D-3: Guard is double: `outlookEnabled === true` AND `categoryService.hasProviders()` — belt-and-suspenders to avoid COM calls when provider is absent.

### Horizontal Check (MECE)

- ✅ No contradiction with `US_OLK_COMBRIDGE` (which covers COM bridge architecture, not auto-sync)
- ✅ No redundancy with `US_PIM_CATTOOL` (which provides the tool for manual/agent use)
- ✅ No redundancy with `US_PIM_CATEGORIES` (which covers the provider architecture)
- ✅ Gap covered: no previous US captured "auto-sync on entity creation"

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_OLK_AUTOCAT_NEWENTITY | Auto-Create Outlook Category on New Entity | US_OLK_AUTOCATEGORY | optional |

### Impacted Requirements (existing, not modified)

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_NEWPROJECT | US_EXP_NEWENTITY | context | Implementation point; new REQ augments behavior |
| REQ_EXP_NEWEVENT | US_EXP_NEWENTITY | context | Implementation point; new REQ augments behavior |
| REQ_OLK_ENABLE | US_OLK_COMBRIDGE | context | `outlookEnabled` guard already specified |
| REQ_PIM_SERVICE | US_PIM_CATEGORIES | context | `setCategory` and `hasProviders()` already specified |

### Decisions

- D-4: A new standalone REQ (`REQ_OLK_AUTOCAT_NEWENTITY`) is created rather than adding ACs to `REQ_EXP_NEWPROJECT`/`REQ_EXP_NEWEVENT`. Rationale: the category behavior is Outlook-specific and belongs in the OLK requirements layer.
- D-5: The category call uses `color: 0` — the `OutlookCategoryProvider` applies the color heuristic (blue for "Project:", pink for "Event:") automatically when color=0. No hardcoded color needed at call site.
- D-6: Category creation happens after entity files are written but before `scanner.rescan()` — not a hard ordering requirement, but ensures the category exists before the sidebar refreshes.

### Horizontal Check (MECE)

- ✅ No overlap with `REQ_OLK_COMBRIDGE` (COM bridge implementation, not call site)
- ✅ No overlap with `REQ_OLK_ENABLE` (setting definition; we read this setting, not redefine it)
- ✅ No redundancy with `REQ_PIM_SERVICE` (service capabilities; we use them, not redefine them)
- ✅ All new REQs link to a User Story

---

## Level 2: Design

**Status**: ✅ completed

### New Design Elements

| ID | Title | Links | Notes |
|----|-------|-------|-------|
| SPEC_OLK_AUTOCAT_NEWENTITY | Auto-Create Outlook Category in New-Entity Commands | REQ_OLK_AUTOCAT_NEWENTITY | Code pattern for both handlers |

### Impacted Design Elements (existing, not modified as separate elements)

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| SPEC_EXP_NEWPROJECT_CMD | New Project Command | referenced | Step 8.5 added via SPEC_OLK_AUTOCAT_NEWENTITY |
| SPEC_EXP_NEWEVENT_CMD | New Event Command | referenced | Step 10.5 added via SPEC_OLK_AUTOCAT_NEWENTITY |

### Decisions

- D-7: `categoryService` is already in scope in the `activate()` closure (line 148 of `extension.ts`) — no parameter passing needed.
- D-8: The `outlookEnabled` config is read fresh inside the handler (not hoisted) to reflect current state without requiring a reload at the time of entity creation.
- D-9: Both handlers share the same guard+try/catch pattern, specified once in `SPEC_OLK_AUTOCAT_NEWENTITY` and referenced by both.
- D-10: `log.info` on success, `log.warn` on error — consistent with existing logging conventions in the extension.

### Horizontal Check (MECE)

- ✅ No overlap with `SPEC_OLK_COMBRIDGE` (COM bridge implementation details)
- ✅ No overlap with `SPEC_OLK_SETTINGS` (activation guard; new spec uses the same guard pattern inline)
- ✅ All new SPECs link to a REQ
- ✅ The `categoryService` closure reference is valid (verified in extension.ts line 148)

---

## UAT Artifacts

**Status**: ✅ completed

| ID | Type | Title |
|----|------|-------|
| US_UAT_AUTOCAT | User Story | Auto-Category on New Entity Acceptance Tests |
| REQ_UAT_AUTOCAT_TESTDATA | Requirement | Auto-Category Test Data |
| SPEC_UAT_AUTOCAT_FILES | Design Spec | Auto-Category Test Procedures |

Test scenarios: T-27, T-28, T-29

---

## Final Consistency Check

- ✅ `US_OLK_AUTOCATEGORY` → `REQ_OLK_AUTOCAT_NEWENTITY` → `SPEC_OLK_AUTOCAT_NEWENTITY` (full traceability chain)
- ✅ UAT chain: `US_UAT_AUTOCAT` → `REQ_UAT_AUTOCAT_TESTDATA` → `SPEC_UAT_AUTOCAT_FILES`
- ✅ US intent (auto-sync on creation) → REQ behavior (setCategory call with guard + error resilience) → SPEC implementation (code pattern in both handlers)
- ✅ No DEPRECATED markers remaining
- ✅ All elements set to `status: approved`
