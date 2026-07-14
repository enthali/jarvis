# Change Document: actor-tool-rename

**Status**: in-progress
**Branch**: feature/actor-tool-rename
**Created**: 2026-07-13
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Phase 5 (final phase) of the "Consequent Actor Renaming" initiative. Renames the two LM/MCP tool names that still contain "Session" and genuinely refer to the Actor entity kind — `jarvis_createSession` → `jarvis_createActor`, `jarvis_listSessions` → `jarvis_listActors` — completing the rename at the layer where the original agent-facing confusion actually lives (agents call tools, not UI labels). This is a HARD cutover, decided deliberately (2026-07-13): unlike the earlier `sendToSession`/`readMessage` rename (which went through a soft-then-hard deprecation cycle because those tools were in frequent active use and agents kept ignoring soft warnings), `jarvis_createSession`/`jarvis_listSessions` see only light, occasional use (mainly the Jarvis VSE tooling itself, rarely an agent). The old tool names are REMOVED entirely — not kept as deprecated/inert stubs. Scope is limited to this repository (jarvis.vse) only: internal adoption pass (agent frontmatter `allowed_tools`, `syspilot.orchestration-jarvis/SKILL.md`, any other in-repo references) is in scope; the separate syspilot installer project (different repository, different machine) is explicitly OUT of scope and will be updated by the user independently. Two tool names are explicitly and correctly NOT touched: `jarvis_sendToSession` (already hard-deprecated/disabled by an earlier CR, already points to `jarvis_sendMessage` — nothing further to do here) and `jarvis_listChatSessions` (refers to the genuine, distinct VS Code chat-session concept, not the Actor entity kind — out of scope by design, same as every prior phase of this initiative).

---

## Level 0: User Stories

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_abc | ... | modified | ... |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_xxx | As a..., I want..., so that... | mandatory |

### Decisions

- Decision 1: No new User Story is introduced. This CR modifies the LM/MCP
  tool names referenced by two existing stories (`US_ACT_ACTORS` AC-5,
  `US_ACT_CREATETOOL`) — the user-facing capability (list Actors, create an
  Actor programmatically) is unchanged; only the tool's own name changes.
  Both stories were amended in place with "renamed from ... by the
  actor-tool-rename CR, Phase 5" notes.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — n/a, purely a rename

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_LISTTOOL | US_ACT_ACTORS | modified | Retitled "jarvis_listActors LM+MCP Tool"; AC-4 `toolReferenceName` updated to `listActors`; new rationale paragraph documents the hard-cutover decision. |
| REQ_ACT_CREATETOOL | US_ACT_CREATETOOL | modified | Retitled "jarvis_createActor LM+MCP Tool"; AC-4 sender string, AC-7 `toolReferenceName`, AC-9 error-message prefix all updated to the new tool name. |
| REQ_ACT_AGENT_CREATETOOL | US_ENT_ENTITYPARITY | modified | Retitled "jarvis_createActor Agent Parameter"; body updated to reference the new tool name. |
| REQ_ACT_AGENT_VALIDATION | US_ENT_ENTITYPARITY | modified | Description updated to reference `jarvis_createActor` instead of `jarvis_createSession`. |
| REQ_ACT_DUALPATH_SCANNER | US_ACT_DUALPATH_STORAGE | modified | AC-4 cross-reference updated (`jarvis_createActor` tool). |
| REQ_ACT_MIGRATIONCOMMAND | US_ACT_MIGRATIONCOMMAND | modified | AC-6's precedent-sender list updated (`jarvis_createActor`'s initial-message enqueue). |
| REQ_ACT_TREE | US_ACT_ACTORS | modified | AC-10's note extended with a Phase-5-addendum confirming the tool-name portion of the historically-deferred concern is now resolved; `kind`/`contextValue` explicitly remain unchanged and are not a further-deferred item. |
| REQ_ENT_OPENCONTEXT (and neighboring ent/prj reqs) | US_ENT_ENTITY | modified | Cross-references to `jarvis_createSession` updated to `jarvis_createActor`. |
| REQ_PRJ_LISTPROJECTS, REQ_PRJ_CREATEPROJECT | US_PRJ_LISTPROJECTS, US_PRJ_CREATEPROJECT | modified | Response-shape and name-validation cross-references updated. |
| req_eng.rst, req_msg.rst | (various) | modified | Cross-references to the old tool names updated to the new ones. |
| All `req_uat_*.rst` files listed in the Artefact-Removal-Check below | (various UAT reqs) | modified | Manual-test prompts/scenarios rewritten to invoke the new tool names — these are literal reproduction steps a tester types, so they must match the actual (renamed) tool. |

### New Requirements

None. This CR is a rename of two existing requirements' subject tools, not a new capability.

### Conflicts Detected

None.

### Decisions

- Decision 1: The internal helper function name `createSession` (in
  `packages/core/src/extension.ts`) is NOT renamed — only the externally
  visible tool name (`jarvis_createSession` → `jarvis_createActor`),
  `toolReferenceName`, log-message prefixes referencing the tool by name,
  and user-facing strings (error prefix, sender string) are renamed. This
  keeps the diff scoped to what CM's dispatch actually asked for (tool
  names) without triggering a larger internal refactor.
- Decision 2: The JSON response key `"sessions"` (returned by
  `jarvis_listActors`) and the response payload string
  `"session \"<name>\" already exists; no action taken"` (returned by
  `jarvis_createActor`) are explicitly NOT changed by this CR — they are
  wire-format/storage-layer details, analogous to why `jarvis.sessions.enabled`
  and `.jarvis/sessions/` paths were previously left alone during the
  terminology-rename phases. Renaming response payload shapes was not part
  of CM's dispatch and would be a breaking change for any existing caller
  parsing the JSON — out of scope here.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories — n/a, no new REQs

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_TOOLS | REQ_ACT_LISTTOOL | modified | Retitled "jarvis_listActors Tool Registration"; handler variable renamed `listActorsTool`, tool-name string, log-message prefixes, and `package.json` manifest entry (`name`, `displayName`, `modelDescription`, `toolReferenceName`) all updated. |
| SPEC_ACT_CREATETOOL | REQ_ACT_CREATETOOL | modified | Retitled "jarvis_createActor: LM+MCP Tool Registration"; registration variable renamed `createActorTool`, tool-name string, error-message prefix, sender string, log-message prefixes, and `package.json` manifest entry all updated. Internal `createSession` helper function name explicitly left unrenamed (Level 1 Decision 1). |
| SPEC_ACT_AGENT_CREATETOOL | REQ_ACT_AGENT_CREATETOOL | modified | Retitled "jarvis_createActor Agent Parameter"; `package.json` input-schema cross-reference updated. |
| SPEC_ACT_MIGRATIONCOMMAND | REQ_ACT_MIGRATIONCOMMAND | modified | Precedent-sender list and "no auto-open, unlike jarvis_createSession" note updated to the new tool name. |
| SPEC_ENT_* (entity-parity spec) | REQ_ENT_* | modified | Cross-reference to the create-tool updated. |
| SPEC_UAT_CREATESESSIONTOOL, SPEC_UAT_LISTSESSIONENTITIESGATING, and other `spec_uat_*.rst` files listed below | Corresponding `REQ_UAT_*` | modified | Test-scenario prompts/expected-outcome text rewritten to invoke the new tool names. |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: File titles for the two dedicated create-tool UAT documents
  (`spec_uat_createsessiontool.rst`, `req_uat_createsessiontool.rst`) were
  updated in their heading text (now read "jarvis_createActor Tool UAT...")
  even though their filenames retain the old name (`createsessiontool`).
  Renaming the physical files was judged out of scope for this design pass
  — it would touch the Sphinx toctree/index and any cross-file `:doc:`
  references, a larger mechanical change than the tool-name rename itself
  calls for. Flagged for Dev Engineer/Documentation Engineer as an optional
  follow-up cleanup, not required for this CR's completion.
- Decision 2: `spec_uat_listsessionentitiesgating.rst`'s own title/directive
  title were left as `jarvis_listSessionEntities` (the tool's name from
  *before* the tool was even renamed to `jarvis_listSessions`) — this is a
  fully historical, `implemented`-status test protocol from an earlier CR;
  only the in-body cross-references needed for its symmetry-check test case
  were updated to the current tool names, with an explanatory note added at
  the top of the file rather than a full retitle, to keep the diff minimal
  for an already-executed historical protocol.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements — n/a, no new SPECs

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_ACTORS | REQ_ACT_LISTTOOL | SPEC_ACT_TOOLS | ✅ |
| US_ACT_CREATETOOL | REQ_ACT_CREATETOOL, REQ_ACT_AGENT_CREATETOOL | SPEC_ACT_CREATETOOL, SPEC_ACT_AGENT_CREATETOOL | ✅ |

Confirmed via `get_need_links.py REQ_ACT_LISTTOOL --direction both` and
`get_need_links.py REQ_ACT_CREATETOOL --direction both` — clean bidirectional
links, no dangling references introduced by this rename.

### Artefakt-Removal-Check

Removed artefacts: the LM/MCP tool identifiers `jarvis_createSession` and
`jarvis_listSessions` (hard cutover — no deprecated stub kept). CM
pre-classified the blast radius from a project-wide grep (101 refs / 30
files for `jarvis_createSession`; 99 refs / 48 files for
`jarvis_listSessions`); this design pass fixed all Class (b) active-doc
references found in `docs/` (a superset of CM's initial list — additional
files were discovered during the actual sweep, listed below). Class (a)
active code/workflow references are Dev Engineer's implementation
responsibility (not touched by this design-only pass); Class (c) historical
Change Documents are accepted stranding.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `jarvis_createSession` | `packages/core/src/extension.ts` (tool registration + handler), `packages/mcp/` (MCP tool registration), `packages/core/package.json` (`languageModelTools` entry), `.github/agents/*.agent.md` (`allowed_tools` arrays — all agent files must be checked), `.github/skills/syspilot.orchestration-jarvis/SKILL.md` (tool-name references) — **all deferred to Dev Engineer**, not fixed in this design-only pass | Fixed in this CR: `docs/requirements/req_act.rst`, `docs/design/spec_act.rst`, `docs/requirements/req_ent.rst`, `docs/design/spec_ent.rst`, `docs/requirements/req_prj.rst`, `docs/design/spec_prj.rst`, `docs/requirements/req_eng.rst`, `docs/design/spec_eng.rst`, `docs/requirements/req_msg.rst`, `docs/design/spec_msg.rst`, `docs/design/spec_uat_createsessiontool.rst`, `docs/requirements/req_uat_createsessiontool.rst`, `docs/design/spec_uat_listsessionentitiesgating.rst`, `docs/requirements/req_uat_listsessionentitiesgating.rst`, `docs/requirements/req_uat_sessions_feature.rst`, `docs/design/spec_uat_sessions_feature.rst`, `docs/userstories/us_uat_sessions_feature.rst`, `docs/design/spec_uat_chateditorreuse.rst`, `docs/requirements/req_uat_chateditorreuse.rst`, `docs/userstories/us_uat_chateditorreuse.rst`, `docs/design/spec_uat_sessiontreeclick.rst`, `docs/requirements/req_uat_sessiontreeclick.rst`, `docs/userstories/us_uat_sessiontreeclick.rst`, `docs/userstories/us_uat_createsessiontool.rst`, `docs/userstories/us_uat_listsessionentitiesgating.rst`, `docs/userstories/us_act.rst` | `docs/changes/v*/` (all historical CR documents mentioning the old name) — acceptable historic stranding, not edited |
| `jarvis_listSessions` | Same code locations as above — **all deferred to Dev Engineer** | Fixed in this CR: same file set as above (both tool names co-occur in most of these files), plus `docs/design/spec_uat_devcontainer_sessionlookup.rst`, `docs/requirements/req_uat_listsessions_swap.rst`, `docs/design/spec_uat_listsessions_swap.rst`, `docs/userstories/us_uat_listsessions_swap.rst`, `docs/design/spec_uat_mcpserver.rst`, `docs/userstories/us_uat_mcpserver.rst`, `docs/userstories/us_msg.rst`, `docs/userstories/us_prj.rst`, `docs/userstories/us_uat_devcontainer_sessionlookup.rst` | `docs/changes/v*/` — acceptable historic stranding, not edited |

- [ ] All class (a) active code/workflow references fixed in this CR — **NOT YET**: this is a design-only pass (System Designer's role); Dev Engineer must perform the actual code/agent-frontmatter/SKILL.md rename as the implementation step. Flagged explicitly so it is not missed.
- [x] All class (b) active documentation references fixed in this CR — confirmed via exhaustive `grep_search` sweep of `docs/**/*.rst`; every remaining occurrence of the old tool names is intentional historical/"renamed from" phrasing (verified individually, not just pattern-matched).
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above (all `docs/changes/v*/` entries — not edited).

### Issues Found

- [x] Issue 1: CM's initial Class (b) list undercounted the actual blast radius — the real sweep found tool-name references in `req_eng.rst`/`spec_eng.rst`, `req_msg.rst`/`spec_msg.rst`, `spec_prj.rst`, and numerous `req_uat_*`/`spec_uat_*`/`us_uat_*` files beyond the ones CM explicitly listed (e.g. `spec_uat_chateditorreuse.rst`, `spec_uat_devcontainer_sessionlookup.rst`, `spec_uat_listsessions_swap.rst`, `spec_uat_mcpserver.rst`, `spec_uat_sessiontreeclick.rst`, and their `req_uat_*`/`us_uat_*` counterparts). This was not escalated as a "genuine product decision" — it's the same rename applied more thoroughly than CM's illustrative (not claimed-exhaustive) list; CM's dispatch said "Other req_uat_* files mentioning the old names" anticipating this. Full sweep completed; final grep confirms zero non-historical occurrences remain in `docs/`.
- [x] Issue 2: The physical filenames of the two dedicated create-tool UAT documents (`spec_uat_createsessiontool.rst`, `req_uat_createsessiontool.rst`) still contain the old name in the filename itself (only the in-document titles were updated). Judged out of scope for this design pass (would require toctree/cross-reference updates) — flagged as an optional follow-up, not a blocker (see Level 2 Decision 1).

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining as *unintentional* — none introduced by this CR; the two renamed REQs keep `:status:` unchanged from before)
- [x] All conflicts resolved
- [x] Traceability verified
- [ ] Ready for implementation — **design complete**; Class (a) code/workflow rename (extension.ts, MCP package, package.json manifest, agent frontmatter, SKILL.md) is the explicit next step for Dev Engineer, not yet done.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-13

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Hard cutover verified (extension.ts + package.json):**
   - `jarvis_createActor` present in extension.ts (lines 1059/1084/1100) and package.json (line 254) ✓
   - `jarvis_listActors` present in extension.ts (line 902) and package.json (line 275) ✓
   - `jarvis_createSession` / `jarvis_listSessions`: absent from packages/core entirely (grep confirms zero matches) — hard cutover complete ✓
   - No stubs, no deprecated aliases ✓

2. **Build** (`npx tsc -p packages/core`): clean (0 errors) ✓

3. **Tests** (`npx vitest run`): 213/213 passed ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_ACT_CREATETOOL: links = [US_ACT_CREATETOOL], linked_from = [SPEC_ACT_CREATETOOL, REQ_ACT_AGENT_CREATETOOL, REQ_UAT_CREATESESSIONTOOL, REQ_UAT_ACT_DUALPATH_SCANNER] — 0 dangling ✓

**Pending (non-blocking):** Documentation Engineer work is still in progress per CM's message. UAT protocol is present (commit d3783eb). QM review proceeds without blocking on Documentation since CM indicated it as optional for this round.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
