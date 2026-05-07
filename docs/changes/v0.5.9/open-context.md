# Change Document: open-context

**Branch:** develop  
**Status:** approved  
**Date:** 2026-05-05

## Summary

Add an inline button on project/event tree nodes to open the entity's `context.md`
file directly in the VS Code text editor.

## Artifacts

| Level | ID | File |
|-------|----|------|
| US | `US_EXP_OPENCONTEXT` | `docs/userstories/us_exp.rst` |
| REQ | `REQ_EXP_OPENCONTEXT` | `docs/requirements/req_exp.rst` |
| SPEC | `SPEC_EXP_OPENCONTEXT_CMD` | `docs/design/spec_exp.rst` |
| UAT US | `US_UAT_OPENCONTEXT` | `docs/userstories/us_uat_opencontext.rst` |
| UAT REQ | `REQ_UAT_OPENCONTEXT` | `docs/requirements/req_uat_opencontext.rst` |
| UAT SPEC | `SPEC_UAT_OPENCONTEXT` | `docs/design/spec_uat_opencontext.rst` |

## Scope

**New Command:** `jarvis.openContext`

- Opens `context.md` from the entity's folder (`path.dirname(element.id)`)
- Shows info message if the file does not exist
- Registered in `extension.ts` and contributed to `package.json`

**Pattern:** Same inline-button pattern as `SPEC_EXP_AGENTSESSION` (open agent session).

## Design Decisions

- D-1: Same pattern as `openAgentSession` — inline button on leaf nodes using `contextValue`
- D-2: Uses `fs.existsSync` check before opening — graceful fallback with info message
- D-3: No new tree provider changes — purely a command + menu contribution

## Out of Scope

- Creating `context.md` if missing
- Opening `context.md` for categories or tasks

## MECE Analysis

No gaps or contradictions found. The new command follows the established pattern of
inline buttons (`SPEC_EXP_OPENYAML_CMD`, `SPEC_EXP_AGENTSESSION`) and does not
conflict with any existing command. The `$(notebook)` icon is distinct from the
existing `$(go-to-file)` and `$(comment-discussion)` icons already used on leaf nodes.

## Implementation Notes

Files changed:
- `src/extension.ts` — register `jarvis.openContext` command
- `package.json` — contribute command, inline menu entries, palette hide
