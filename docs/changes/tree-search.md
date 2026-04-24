# Change: tree-search

**Status**: Implemented  
**Branch**: feature/tree-search  
**Date**: 2026-04-24  

## Summary

Adds a QuickPick-based search command to the Projects and Events tree views.
Users with 20+ items can now press the search icon in the title bar to open a
filtered list (fuzzy match, like the VS Code Command Palette), select an entry,
and have the tree reveal and focus that item immediately — without any
persistent filter or tree re-render.

## Specifications

| Level | ID | Title |
|---|---|---|
| US | `US_EXP_TREESEARCH` | Tree Quick Search |
| REQ | `REQ_EXP_SEARCHPROJECTS` | Search Projects via QuickPick |
| REQ | `REQ_EXP_SEARCHEVENTS` | Search Events via QuickPick |
| SPEC | `SPEC_EXP_SEARCH_MANIFEST` | Tree Search — Manifest |
| SPEC | `SPEC_EXP_SEARCH_CMD` | Tree Search — Command Handlers |

## Implementation Notes

- Two new commands: `jarvis.searchProjects` and `jarvis.searchEvents`
- Each wired to a `$(search)` icon button in the respective tree title bar
  (`view/title` menu, `navigation` group)
- Both commands hidden from the Command Palette (`when: "false"`)
- Uses `vscode.window.createQuickPick<T>()` — VS Code handles fuzzy filtering
  built-in; no `onDidChangeValue` handler required
- Items sourced from `scanner.getProjectTree()` / `scanner.getEventTree()` via
  a local `flattenLeaves()` helper in `extension.ts`
- Event labels follow the existing `datesStart — name` convention
  (matching `EventTreeProvider` label format)
- After selection: `TreeView.reveal(leaf, { select: true, focus: true, expand: true })`
- The QuickPick intentionally shows **all** items from the scanner cache —
  folder filter (projects) and future-only filter (events) are not applied,
  so hidden items remain searchable
- No changes to `yamlScanner.ts`, `projectTreeProvider.ts`, or
  `eventTreeProvider.ts` — all new code lives in `extension.ts`
