# Test Protocol: sessions-feature

**Date:** 2026-05-19
**Branch:** `feature/sessions-feature`
**Tester:** User (manual UAT in Extension Development Host, F5)
**Build:** TypeScript clean (`npm run compile`), Sphinx clean (`-W --keep-going -E`)

## Setup

- Workspace: `testdata/test.code-workspace`
- Test data: `testdata/.jarvis/sessions/copilot-cm/` and `testdata/.jarvis/sessions/dev-feature-x/`
  (both with `session.yaml` + `context.md`, force-added via `git add -f`).
- All scenarios per `docs/design/spec_uat_sessions_feature.rst` (SPEC_UAT_SES_SCENARIOS).

## Results

| ID | Description | Result |
|---|---|---|
| T-1 | `jarvis.sessions.enabled` toggle hides/shows Sessions view immediately (no reload) | **PASS** |
| T-2 | Sessions tree shows `copilot-cm` and `dev-feature-x` from `.jarvis/sessions/`, alphabetical | **PASS** |
| T-3 | Single-click on session node opens `context.md` in the editor | **PASS** |
| T-4 | Right-click on session node shows full context menu (Open Context, Open Agent Session, Reveal in Explorer/OS, Open in Terminal) | **PASS** |
| T-5 | `Jarvis: New Entity` → Session creates `session.yaml` + `context.md`, node appears, agent chat auto-opens | **PASS** |
| T-5a | `+` button in Sessions view title bar creates a new session with same outcome as T-5 | **PASS** |
| T-6 | Schema validation reports missing `name` in Problems panel for invalid `session.yaml` | **PASS** |
| T-7 | `#listSessionEntities` LM tool returns both sessions with correct absolute folder paths | **PASS** |
| T-8 | MCP call `jarvis_listSessionEntities` returns identical session list as T-7 | **PASS** |
| T-9 | `jarvis.sessions.enabled=false` + reload removes `listSessionEntities` from LM tool autocomplete | **PASS** |
| T-10 | Sessions feature works independently with Projects/Events disabled | **PASS** |
| T-11 | Auto-opened agent chat shows identity-style prompt `You are the session "<name>"` with absolute `context.md` path in backticks | **PASS** |

## UAT Iterations

- **Iteration 1** (2026-05-18): Default path was `${workspace}/sessions` — user requested `.jarvis/sessions/`. Pivot: removed `jarvis.sessions.folders` setting, added `configPaths.getSessionsDir()`. Fixed in `c61ef75`.
- **Iteration 2** (2026-05-19): Missing `+` button and `Open Agent Session` context entry on Sessions view. Added `jarvis.newSession`, view/title buttons, full context-menu parity. Fixed in `89e4439`.
- **Iteration 3** (2026-05-19): Init prompt too generic. Added identity-style kind-aware prompt with absolute `context.md` path; auto-open on create. Fixed in `c5ace8a`.

## Summary

All 12 acceptance tests (T-1..T-11 plus T-5a) **PASS** after 3 UAT iterations.
QM verdict: **PASS** (advisory only: `toKebabCase` is ASCII-only — non-blocking edge case).
Feature ready for merge to `develop`.
