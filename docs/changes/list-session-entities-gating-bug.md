# Change: list-session-entities-gating-bug

**Status:** completed pending merge to develop
**Mode:** autonomous
**Source:** PM (Jarvis message 2026-05-19T16:11:56Z)
**Branch:** `feature/list-session-entities-gating-bug` (from `develop` @ `1f286da`)

## Intent

The LM+MCP tool `jarvis_listSessionEntities` is currently registered unconditionally in `src/extension.ts`, even when the Sessions feature is disabled via `jarvis.sessions.enabled=false`. This is inconsistent with `jarvis_createSession`, which is correctly gated inside `if (cfg.get<boolean>('sessions.enabled', true))` (lines 1297–1427).

Pull `jarvis_listSessionEntities` into the same gated block so that disabling the Sessions feature removes **all** session-related LM/MCP tools from the catalog.

Static-gating only — ADR `tool-deregistration.md` remains in effect (no runtime add/remove; users reload the window to apply config changes).

## Acceptance Criteria (user-visible)

1. With `jarvis.sessions.enabled=false` after Extension Host reload: `jarvis_listSessionEntities` is **NOT** in the LM tool catalog.
2. With `jarvis.sessions.enabled=true` (default) after reload: `jarvis_listSessionEntities` IS in the LM tool catalog (behavior unchanged from today).
3. Analogous MCP behavior: tool is registered in `startMcpServer()` only when feature is on.
4. Gating pattern and reload semantics identical to `jarvis_createSession` (statically gated per ADR `tool-deregistration.md`).

## Scope

- `src/extension.ts`: pull the `listSessionEntitiesTool` `registerDualTool()` call into the existing `if (cfg.get<boolean>('sessions.enabled', true))` block that already houses `createSessionTool`.
- Update the `subscriptions.push(...)` block at line ~2132 to also conditionally push `listSessionEntitiesTool` (mirror the `createSessionTool` pattern).
- Update `REQ_SES_LISTENTITIES` and `SPEC_SES_LISTENTITIES` to document the gating (currently silent on gating, hence the drift).

## Out of Scope

- Runtime add/remove (ADR `tool-deregistration` remains valid)
- Gating of other tools (only `jarvis_listSessionEntities`)
- Architectural changes to the dual-registration pattern

## Process Log

- 2026-05-19: Received CR from PM via Jarvis message queue (autonomous mode).
- 2026-05-19: Bug confirmed via grep — `listSessionEntitiesTool` at line 1269 is outside the gated block; `createSessionTool` at line 1297 is inside.
- 2026-05-19: Change Document created. Workflow starting.

## Process Log — System Designer

**Date:** 2026-05-19

**Impact analysis result** (`REQ_SES_LISTTOOL --direction both --depth 2 --flat`):

Affected elements (gating-relevant):
- `US_SES_SESSIONS` — parent US; AC-1 already covers "when disabled, no tools are active". No change.
- `REQ_SES_LISTTOOL` — AC-2 existed but was silent on reload semantics and ADR reference. **Updated.**
- `SPEC_SES_TOOLS` — description mentioned `if (sessions.enabled)` in passing; no dedicated Gating section. **Updated.**

Note: CR referenced `REQ_SES_LISTENTITIES` / `SPEC_SES_LISTENTITIES` — these IDs do not exist. The actual elements are `REQ_SES_LISTTOOL` and `SPEC_SES_TOOLS` (established in the sessions-feature CR). Updated those instead.

**Spec changes summary:**

- `docs/requirements/req_ses.rst` — `REQ_SES_LISTTOOL` AC-2: expanded to include reload semantics and static-gating ADR reference.
- `docs/design/spec_ses.rst` — `SPEC_SES_TOOLS`: description updated to name the explicit `cfg.get<boolean>('sessions.enabled', true)` guard; added dedicated **Gating** section with ADR `tool-deregistration.md` reference.

**Traceability check:**
- `REQ_SES_LISTTOOL` links: parent `US_SES_SESSIONS` ✓, child `SPEC_SES_TOOLS` ✓
- `SPEC_SES_TOOLS` links: parent `REQ_SES_LISTTOOL` ✓

**Sphinx build:** clean (`build succeeded`, 0 warnings).

## Process Log — Test Engineer

**Date:** 2026-05-19

**UAT files created:**

- `docs/userstories/us_uat_listsessionentitiesgating.rst` (`US_UAT_LISTSESSIONENTITIESGATING`)
- `docs/requirements/req_uat_listsessionentitiesgating.rst` (`REQ_UAT_LISTSESSIONENTITIESGATING`)
- `docs/design/spec_uat_listsessionentitiesgating.rst` (`SPEC_UAT_LISTSESSIONENTITIESGATING`)

**Index files updated:** `us_uat.rst`, `req_uat.rst`, `spec_uat.rst` (one toctree entry each).

**Scenarios:** 3 (T-1: feature enabled, T-2: feature disabled, T-3: symmetry regression guard).

**Sphinx build:** clean (`build succeeded`, 0 warnings, `-W --keep-going -E`).

## Process Log — Dev Engineer

**Date:** 2026-05-19

**Code change summary:**

- `src/extension.ts`: Removed the unconditional `const listSessionEntitiesTool = registerDualTool(...)` block (was at ~line 1267, outside any feature gate). Declared `let listSessionEntitiesTool: vscode.Disposable | undefined;` before the `if (cfg.get<boolean>('sessions.enabled', true))` block. Moved the `registerDualTool(...)` assignment to the first statement inside that if-block, mirroring `createSessionTool`'s gating pattern. Updated the block's closing comment from `SPEC_SES_CREATETOOL` to `SPEC_SES_CREATETOOL + SPEC_SES_TOOLS`. Added `...(listSessionEntitiesTool ? [listSessionEntitiesTool] : []),` to the `context.subscriptions.push(...)` call immediately before the existing `createSessionTool` spread.
- Combined the two comment banners (`// Implementation: SPEC_SES_TOOLS / SPEC_SES_CREATETOOL`) into one.

**Compile result:** clean (no TypeScript errors).

**Lint result:** pre-existing failure (`ESLint couldn't find an eslint.config.(js|mjs|cjs) file` — ESLint v9 vs `.eslintrc.*` config mismatch). Confirmed pre-existing by stashing the change and reproducing the same error on HEAD `3750b9e`. Not introduced by this CR.

**Sphinx result:** clean (`build succeeded`, 0 warnings, `-W --keep-going -E`).

**Duplicate-spread observation:** The task brief anticipated a possible duplicate `...(createSessionTool ? [createSessionTool] : [])` spread at ~line 2132. Inspection of the actual `subscriptions.push(...)` block showed only one such spread — no duplicate was present. Resolved by inserting `...(listSessionEntitiesTool ? [listSessionEntitiesTool] : []),` directly before the single existing `createSessionTool` spread.

**Status field changes:** `REQ_SES_LISTTOOL` and `SPEC_SES_TOOLS` were already `:status: implemented` (set during the `sessions-feature` / `create-session-tool` CR). No status changes made — not regressed.

## Process Log — MECE Final Check

**Date:** 2026-05-19  
**Verdict:** PASS-WITH-ADVISORIES

### Checks

| # | Check | Result |
|---|-------|--------|
| 1 | No redundancy (REQ vs SPEC gating clause) | PASS — layered refinement, not duplication |
| 2 | No gaps (AC coverage, traceability chain) | PASS — all 3 UAT ACs trace to `REQ_SES_LISTTOOL`; full chain to `US_SES_SESSIONS` |
| 3 | No contradictions (REQ/SPEC/impl agree on gating) | PASS — all three layers consistent |
| 4 | T-3 symmetry vs `createsessiontool` UAT | PASS — `createsessiontool` T-8 (only `jarvis_createSession`) vs this CR's T-3 (both tools, regression guard) — distinct owners |
| 5 | Implementation matches `SPEC_SES_TOOLS` | PASS (with A-1) — gating structure exact match; description sketch string stale |

### Advisories (non-blocking, deferrable)

- **A-1:** `SPEC_SES_TOOLS` handler-sketch description string is stale vs. actual code / `package.json` `modelDescription` (richer in code). No behavioral impact.
- **A-2:** `SPEC_UAT_LISTSESSIONENTITIESGATING` T-2 row labeled `*CR AC: 1*` — should be `*CR AC: 2*` (T-2 tests the Feature DISABLED path which maps to `US_UAT_LISTSESSIONENTITIESGATING` AC-2).
- **A-3:** `SPEC_UAT_LISTSESSIONENTITIESGATING` T-3 row labeled `*CR AC: 3, 4*` — `US_UAT_LISTSESSIONENTITIESGATING` has only AC-1..AC-3; should be `*CR AC: 3*`.

### Decision

No blockers. All three advisories are cosmetic (one stale sketch string, two table labeling typos) and may be deferred without impacting test execution or verification.

## Process Log — PM Merge Approval

**Date:** 2026-05-19
**Decision:** APPROVED (no UAT — micro-scope, pattern validated via create-session-tool).
**MECE Advisories A-1/A-2/A-3:** PM defers — fix opportunistically at next CR touching SPEC_SES_TOOLS or SPEC_UAT_LISTSESSIONENTITIESGATING. No own CR.
**Pre-existing lint issue (ESLint v9 vs .eslintrc.*):** noted, may become separate mini-CR pre-release.
Status bumped: US/REQ/SPEC_UAT_LISTSESSIONENTITIESGATING → implemented. Change Document status → completed pending merge to develop.
