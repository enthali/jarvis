# Change Document: entity-taxonomy-rename

**Status**: in-progress
**Branch**: feature/entity-taxonomy-rename
**Created**: 2026-07-01
**Author**: PM
**Operation Mode**: user-guided (default)

---

## Summary

Spec-only cleanup resolving the EXP/SES theme boundary drift identified during entity-files-tree review (see Research Finding `.jarvis/sessions/Research/FI-2026-07-01-exp-ses-theme-boundary.md`). Establishes a consistent entity taxonomy: umbrella concept renamed to **Jarvis Entity**, the three entity kinds become **Project / Event / Actor** (the "Session" kind is retired in favor of **Actor**, per the Hewitt actor model — mailbox=queue, state=context.md, heartbeat=activator+supervisor). Theme realignment: generic user-facing cross-kind concepts move to a new **ENT** theme, plumbing/infrastructure concepts stay in **ENG**, kind-specific concepts live in **PRJ/EVT/ACT**, and **EXP** narrows to the sidebar UI frame only. Also consolidates duplicate SPECs (Scanner, Agent-Picker, Tree-Click, New-Entity — each currently specced twice across EXP/SES) and fixes stray items (SES missing from naming conventions, unused PRJ/EVT theme declarations, misplaced US_EVT_DATESORT). No code changes in this CR — pure specification/documentation. Executed as a single CR with multiple internal work steps (rename → dedup → EXP thinning), each step verified internally before the CR goes to QM as a whole — no half-finished state is sent for review.

**Not in scope:** renaming the `.jarvis/sessions/` folder path or any runtime code — that is a separate future code CR, decoupled from this spec-only rename.
---

## Level 0: User Stories

**Status**: 🔄 in progress

### Impacted User Stories

Full inventory performed by Research (`FI-2026-07-01-exp-ses-theme-boundary.md`). Scope: all 22 US in `us_exp.rst`, all 4 US in `us_ses.rst`, plus `namingconventions.rst` theme table.

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Sidebar Shell | retained in EXP | true sidebar frame, cross-kind but non-entity-specific |
| US_EXP_PROJECTFILTER | Project Folder Filter | moves to PRJ | single-kind (Project) |
| US_EXP_EVENTFILTER | Future Event Filter | moves to PRJ→EVT | single-kind (Event) |
| US_EXP_OPENYAML | Open YAML from tree | moves to ENT | cross-kind, generic |
| US_EXP_NEWENTITY | Create New Project or Event | moves to ENT | cross-kind, generic; renamed scope to include Actor |
| US_EXP_SCANREFRESH | Manual Rescan Button | moves to ENT | cross-kind, generic |
| US_EXP_CONTENTDETECT | YAML Content Change Detection | moves to ENT | cross-kind, generic |
| US_EXP_NAMESORT | Sort Tree by Entity Name | moves to ENT | cross-kind, generic |
| US_EXP_AGENTSESSION | Open Agent Session from Explorer | moves to ENT | cross-kind + JAS term cleanup |
| US_EXP_LISTPROJECTS | List Projects (LM Tool) | stays PRJ-adjacent | single-kind (Project), tool-shape parity noted |
| US_EXP_FEATURETOGGLE | Feature-Toggled Sidebar Views | retained in EXP | sidebar-frame level, includes non-entity views |
| US_EXP_CONTEXTACTIONS | Context Actions on Project and Event Nodes | moves to ENT | cross-kind, generic |
| US_EVT_DATESORT | Chronological Event Sorting | moves to EVT (already correctly prefixed, just filed in wrong .rst) | single-kind (Event); mislocation fix |
| US_EXP_OPENFILE | Open Source File from Tree Node | retained in EXP | non-entity views (heartbeat/messages) |
| US_EXP_TREESEARCH | Tree Quick Search | retained in EXP | sidebar-frame level |
| US_EXP_OPENCONTEXT | Open Context File from Tree Node | moves to ENT | cross-kind, generic |
| US_EXP_ENTITYPARITY | Entity Feature Parity (Projects & Events) | superseded by new ENT parent US | cross-kind-3, becomes historical/rescoped |
| US_EXP_ENTITY_FILES_TREE | Entity File Children in Tree | moves to ENT | cross-kind-3, generic |
| US_SES_SESSIONS | Sessions Entity Type | renamed → US_ACT_ACTORS | single-kind (Actor, ex-Session) |
| US_SES_CREATETOOL | jarvis_createSession tool | renamed → US_ACT_CREATETOOL | single-kind (Actor) |
| US_SES_AGENTBIND | Agent Binding | superseded by ENT generic (already generalized via ENTITYPARITY) | cross-kind, generic |
| US_SES_TREECLICK | Tree-Click Opens Chat | superseded by ENT generic | cross-kind, generic |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ENT_ENTITY | As a Jarvis user, I want distinct entity kinds that each focus on their function — Project (work body), Event (time-bound), Actor (standing function) — so that each kind's behavior matches its real-world role. | mandatory |
| US_ACT_ACTORS | (renamed from US_SES_SESSIONS) As a Jarvis user, I want an Actor entity kind — a persistent, agent-bound context (mailbox=queue, state=context.md, heartbeat=activator+supervisor) — so that standing functions (PM, CM, QM, Research) have durable identity. | mandatory |
| US_PRJ_PROJECT | (added — QM Round 1 Finding #5, PM reconsidered) Thin kind-definition story mirroring `US_ACT_ACTORS`'s role: kind identity + link to `US_ENT_ENTITY`, restoring 3-kind symmetry. Does not duplicate `US_PRJ_PROJECTFILTER`/`US_PRJ_LISTPROJECTS`/`US_PRJ_CREATEPROJECT` feature content. | required |
| US_EVT_EVENT | (added — same rationale) Thin kind-definition story for Event, mirroring `US_ACT_ACTORS`. Does not duplicate `US_EVT_DATESORT`/`US_EVT_EVENTFILTER`/`US_EVT_LISTEVENTS`/`US_EVT_CREATEEVENT` feature content. | required |

### Decisions

- **Umbrella = "Jarvis Entity"** — already the code term (`EntityKind`, `registerEntityKind`); no new word introduced
- **Kinds = Project / Event / Actor** — "Session" kind retired in favor of **Actor** (Hewitt actor model: mailbox=queue, state=context.md, heartbeat=activator+supervisor); rationale documented in Research Finding
- **"Session" retired as a Jarvis concept** — the word belongs to the platform (VS Code / Copilot chat sessions); Jarvis specs no longer use it for the entity kind
- **Theme realignment**: generic/user-facing cross-kind concepts → **ENT** (new theme, has US level); engine-plumbing (kind-agnostic mechanics) → **ENG** (no US level, not user-facing); single-kind → **PRJ / EVT / ACT**; **EXP** narrows to sidebar frame + non-entity views (Activity Bar, view containers, feature toggle, tree search, heartbeat/message/reminder file-open)
- **SPEC deduplication in scope**: Scanner, Agent-Picker, Tree-Click, New-Entity — each currently specced twice (EXP + SES, some also ENG) — consolidate to one authoritative SPEC per concept, in ENT or ENG per the rule above
- **Stray fixes in scope**: add SES/ACT to `namingconventions.rst` theme table; resolve unused PRJ/EVT theme declarations (now they get real content); relocate `US_EVT_DATESORT`/`REQ_EVT_DATESORT` out of the EXP file into the correct EVT file
- **Out of scope**: `.jarvis/sessions/` folder path rename, any runtime code change — deferred to a future code CR
- **Staged execution, single CR**: (1) mechanical rename SES→ACT + naming-conventions fix, (2) dedup duplicate SPECs, (3) EXP thinning + new ENT theme — verified internally after each internal step, sent to QM only once as a fully consistent end state (per PM instruction)

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — verified via sphinx build + link-check
- [x] No redundancies — dedup executed for Agent-Picker and Tree-Click contracts (SPEC level); Scanner deprecated in favor of existing SPEC_ENG_SCANNER
- [x] Gaps identified and addressed — ENT theme created with `US_ENT_ENTITY` parent US, satisfying the missing generic-US-level gap

---

## Execution Summary (System Designer, commit `ec9a936`)

**Status: Steps 1–3 executed with one disclosed scope reduction — see "Deferred to follow-up" below.**

### Step 1 — Mechanical rename (complete)

- `SES` theme renamed to `ACT` across all US/REQ/SPEC/UAT files and IDs (`us/req/spec_ses.rst` → `us/req/spec_act.rst`)
- `US_ACT_SESSIONS` renamed to `US_ACT_ACTORS` (title + body updated to Actor framing; storage-layer terms — `.jarvis/sessions/`, `session.yaml`, `jarvis.sessions.enabled`, `jarvis_listSessions` — deliberately left unchanged per CD scope, with an explicit decoupling note added to `us_act.rst`)
- `namingconventions.rst`: added `ACT` and `ENT` theme rows, fixed duplicate/stale `PRJ`/`EVT` rows, marked `ENG` as plumbing-only (no US level)
- `US_EVT_DATESORT` / `REQ_EVT_DATESORT` relocated out of `us_exp.rst`/`req_exp.rst` into new `us_evt.rst`/`req_evt.rst`

### Step 2 — SPEC dedup (partial — highest-value cases done)

- `SPEC_EXP_SCANNER` and `SPEC_ACT_SCANNER` marked `:status: deprecated`, pointing to the already-existing generic `SPEC_ENG_SCANNER` (ground truth per the engine architecture)
- `SPEC_EXP_AGENT_PICKER` → renamed to `SPEC_ENT_AGENT_PICKER` (the cross-cutting contract: return semantics, 3-consumer list, chat-open gate)
- `SPEC_EXP_ENTITY_TREECLICK` → renamed to `SPEC_ENT_TREECLICK` (the generic `TreeItem.command` wiring pattern for all 3 kinds)
- `SPEC_ACT_AGENT_PICKER` (concrete `pickAgentMode()` implementation) and `SPEC_ACT_TREECLICK` (Actor-specific `jarvis.openSessionContext` addition) kept as-is — genuinely non-duplicate content, cross-referenced to the new `SPEC_ENT_*` contracts
- New-Entity specs (`SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD`, `SPEC_ACT_NEWENTITY`) intentionally **not** merged — each implements a distinct command with different YAML shape/folder convention; forcing a merge would lose kind-specific detail without removing real duplication (they already cross-reference each other's shared patterns)

### Step 3 — ENT theme + EXP thinning (US-level complete; REQ/SPEC-level deferred)

- New `us_ent.rst` created with parent `US_ENT_ENTITY` (the 3-kind taxonomy US) plus 11 cross-kind generic User Stories relocated and renamed from `us_exp.rst`: `US_ENT_OPENYAML`, `US_ENT_NEWENTITY`, `US_ENT_SCANREFRESH`, `US_ENT_CONTENTDETECT`, `US_ENT_NAMESORT`, `US_ENT_AGENTSESSION`, `US_ENT_CONTEXTACTIONS`, `US_ENT_OPENCONTEXT`, `US_ENT_AGENTSESSION_PROMPT`, `US_ENT_ENTITYPARITY`, `US_ENT_ENTITY_FILES_TREE`
- `US_ACT_AGENTBIND` and `US_ACT_TREECLICK` marked `:status: deprecated` — superseded by the generic `US_ENT_ENTITY`/`US_ENT_ENTITYPARITY` concept, kept for historical traceability
- All downstream `:links:` references across the entire live spec tree updated to the new IDs (verified via bulk grep — zero stale references remain)
- `req_ent.rst` and `spec_ent.rst` created with theme headers, scope description, and explicit interim-state notes

### Verification (Steps 1–3)

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors** (clean end state)
- Traceability: `get_need_links.py US_ENT_ENTITY --direction in --depth 1` confirms all 11 expected downward links, no orphans, no dangling references
- Bulk grep confirms zero remaining references to any renamed/relocated ID under its old name

**Commit:** `ec9a936` on `feature/entity-taxonomy-rename`

---

## Execution Summary Part 2 — Full physical relocation (System Designer, commits `2d40f98` + follow-on)

**PM decision:** the deferred items above were not acceptable as a "half-finished state" — full physical relocation completed in this same CR, per PM's explicit follow-up instruction.

### Completed

1. **REQ-level physical relocation**: all 11 `REQ_ENT_*` requirements (`OPENYAML`, `AGENTSESSION`, `SCANREFRESH`, `NAMESORT`, `CONTEXTACTIONS`, `OPENCONTEXT`, `AGENTPROMPT_TEMPLATE`, `ENTITY_AGENT`, `ENTITY_TREECLICK`, `ENTITY_ICONS`, `ENTITY_FILE_CHILDREN`) physically moved from `req_exp.rst` into `req_ent.rst`. `REQ_EVT_EVENT_SUMMARY` (single-kind, Event) moved into `req_evt.rst`.
2. **SPEC-level physical relocation**: `SPEC_ENT_AGENT_PICKER`, `SPEC_ENT_TREECLICK`, `SPEC_ENT_OPENYAML_CMD`, `SPEC_ENT_AGENTSESSION`, `SPEC_ENT_AGENTSESSION_INITPROMPT`, `SPEC_ENT_RESCAN_CMD`, `SPEC_ENT_ENTITY_AGENT`, `SPEC_ENT_ENTITY_ICONS`, `SPEC_ENT_ENTITY_FILE_CHILDREN`, `SPEC_ENT_CONTEXTACTIONS`, `SPEC_ENT_OPENCONTEXT_CMD` physically moved from `spec_exp.rst` into `spec_ent.rst`. Interim-state notes in both `req_ent.rst` and `spec_ent.rst` removed/updated now that relocation is complete.
3. **PRJ/EVT population**: new theme files created and populated with physically relocated + renamed content:
   - `us_prj.rst` (new): `US_PRJ_PROJECTFILTER`, `US_PRJ_LISTPROJECTS`, `US_PRJ_CREATEPROJECT`
   - `us_evt.rst` (extended): `US_EVT_EVENTFILTER`, `US_EVT_LISTEVENTS`, `US_EVT_CREATEEVENT` (alongside existing `US_EVT_DATESORT`)
   - `req_prj.rst` (new): `REQ_PRJ_PROJECTFILTER`, `REQ_PRJ_FILTERPERSIST`, `REQ_PRJ_LISTPROJECTS`, `REQ_PRJ_CREATEPROJECT`
   - `req_evt.rst` (extended): `REQ_EVT_EVENTFILTER`, `REQ_EVT_EVENTFILTERPERSIST`, `REQ_EVT_LISTEVENTS`, `REQ_EVT_CREATEEVENT`, `REQ_EVT_EVENT_SUMMARY` (alongside existing `REQ_EVT_DATESORT`)
   - `spec_prj.rst` (new): `SPEC_PRJ_FILTERCOMMAND`, `SPEC_PRJ_LISTPROJECTS`, `SPEC_PRJ_CREATEPROJECT`
   - `spec_evt.rst` (new): `SPEC_EVT_EVENTFILTER_CMD`, `SPEC_EVT_LISTEVENTS`, `SPEC_EVT_CREATEEVENT`
4. Toctree entries added for `us_prj`, `req_prj`, `spec_prj`, `spec_evt` in the respective `index.rst` files.

### Deliberately not moved (documented, not a gap)

- `REQ_EXP_NEWPROJECT` / `REQ_EXP_NEWEVENT` and `SPEC_EXP_NEWPROJECT_CMD` / `SPEC_EXP_NEWEVENT_CMD` — the "New Project"/"New Event" `+`-button commands were not in PM's explicit relocation list (ProjectFilter, EventFilter, ListProjects, ListEvents, CreateProject, CreateEvent); left in `EXP` for now. Their parent US (`US_ENT_NEWENTITY`) is correctly in `ENT` since the `+`-button pattern itself is cross-kind generic — only the two concrete command REQs/SPECs remain kind-specific-but-unmoved. Flagged as a small remaining item if full purity is desired later, but explicitly out of the instructed scope for this pass.
- New-Entity SPEC consolidation (`SPEC_PRJ_NEWPROJECT_CMD`-style merge with `SPEC_ACT_NEWENTITY`) remains not-merged — confirmed non-duplicate content (distinct YAML shapes/folder conventions per kind).

### Verification (Part 2 — full physical relocation)

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors** after all physical relocations (verified after each relocation batch, not just at the end)
- Traceability: `get_need_links.py` spot-checks on `US_ENT_ENTITY` (11 downward links intact), `US_PRJ_PROJECTFILTER` (upward link to `US_EXP_SIDEBAR` intact) confirm no breakage
- Method: relocations performed via a small local Python script (`_relocate_blocks.py`, deleted after use — not committed) that parsed `.. story::`/`.. req::`/`.. spec::` blocks by `:id:` and cut/appended them to destination files, verified by rebuild after every batch

**Commits:** `2d40f98` (bulk ID rename checkpoint) + `e75bae0` (full physical relocation)

---

## Execution Summary Part 3 — No-permanent-stubs cleanup (System Designer)

**Trigger:** CM policy clarification — a deprecated stub kept "so links don't break" is circular; if a live element still points to a superseded ID, repoint the reference and delete the stub, don't keep it. Trace found the deprecated Scanner/AgentBind/TreeClick stubs were NOT orphaned — they still had real active consumers that were never migrated.

### Fixed: Scanner consolidation (Trace finding, high)

- **Content-preservation check first**: before deleting, confirmed the two deprecated Scanner stubs (`SPEC_EXP_SCANNER`, `SPEC_ACT_SCANNER`) contained real algorithmic detail not yet present in `SPEC_ENG_SCANNER` — the convention-file scan steps, alphabetical + event-date-sort-override sort logic, and the entity-map diff/change-detection algorithm. Merged this detail into `SPEC_ENG_SCANNER` (new "Scan algorithm", "Sort order", "Change detection" subsections + 2 new ACs) before deleting the stubs, so no technical content was lost — only the duplication.
- Repointed all 14 active consumers of `SPEC_EXP_SCANNER` (`SPEC_ENT_RESCAN_CMD`, `SPEC_ENT_ENTITY_AGENT`, `SPEC_EVT_LISTEVENTS`, `SPEC_EVT_CREATEEVENT`, `SPEC_EXP_RESCANBRIDGE`, `SPEC_EXP_PROVIDER`, `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD`, `SPEC_EXP_SEARCH_CMD`, `SPEC_PRJ_FILTERCOMMAND`, `SPEC_PRJ_LISTPROJECTS`, `SPEC_PRJ_CREATEPROJECT`, `SPEC_UAT_NEWENTITY_FILES`, `SPEC_UAT_SCANREFRESH_FILES`) and the 1 active consumer of `SPEC_ACT_SCANNER` (`SPEC_ACT_AGENT_SCHEMA`) directly to `SPEC_ENG_SCANNER`.
- Deleted both deprecated stub blocks (`SPEC_EXP_SCANNER` from `spec_exp.rst`, `SPEC_ACT_SCANNER` from `spec_act.rst`) after verifying zero remaining incoming links via `get_need_links.py`.

### Fixed: US_ACT_AGENTBIND / US_ACT_TREECLICK consolidation (Trace finding, high)

- Repointed the 7 active `REQ_ACT_AGENT_*` requirements (`FIELD`, `PICKER`, `DISCOVERY`, `CREATETOOL`, `VALIDATION`, `OPEN`, `COMPAT`) from `US_ACT_AGENTBIND` to `US_ENT_ENTITYPARITY`.
- Repointed `REQ_ACT_TREECLICK` from `US_ACT_TREECLICK` to `US_ENT_ENTITYPARITY`.
- Pruned the now-circular self-references: `US_ENT_ENTITYPARITY`'s and `US_ENT_ENTITY_FILES_TREE`'s own `:links:` fields previously cross-referenced `US_ACT_AGENTBIND`/`US_ACT_TREECLICK` as historical pointers — removed (would have been dangling/self-referential after deletion).
- Fixed 2 UAT-level `:links:` fields (`us_uat_entity_parity.rst`, `us_uat_sessiontreeclick.rst`) and 2 prose test-mapping citations (`us_uat_newentity_picker.rst`, `spec_uat_newentity_picker.rst`) pointing at the deleted IDs.
- Deleted both deprecated story blocks from `us_act.rst` after verifying zero remaining incoming links.

### Fixed: MECE finding 1 — missing `:links:` on US_ACT_* stories

- Added `:links: US_EXP_SIDEBAR; US_ENT_ENTITY` to `US_ACT_ACTORS`.
- Added `:links: US_ACT_ACTORS` to `US_ACT_CREATETOOL`.

### Fixed: MECE finding 2 — "session" terminology drift in ENT/EXP prose (4 of 5 locations)

- `REQ_ENT_ENTITY_ICONS` description + AC-4: "project, event, session" / "Session nodes" → "Project, Event, Actor" / "Actor nodes"
- `REQ_ENT_ENTITY_FILE_CHILDREN` description + AC-1: "Session, Project, and Event" / "project, event, and session leaf node" → "Actor, Project, and Event" / "project, event, and actor leaf node"
- `REQ_EXP_TREEVIEW` AC-11: "(project, event, session)" → "(project, event, actor)"
- `us_uat_entity_files_tree.rst` AC-1: "Project, Event, and Session leaf node" → "Project, Event, and Actor leaf node"

**Not fixed, flagged back to CM for a decision:** `REQ_ENT_AGENTPROMPT_TEMPLATE` AC-2 documents the `${kind}` placeholder's substituted value as the literal type union ``'project' | 'event' | 'session'`` — this is the same category of runtime code-level type literal CM said to leave as-is elsewhere (matches `EntityEntry.kind` in `spec_eng.rst`/`SPEC_ENG_API`). Renaming the prose here to say "actor" would assert a runtime string value (`${kind}` substituting to `"actor"`) that the actual code does not yet produce (the underlying `EntityEntry.kind` discriminator is still the literal string `'session'` — a runtime/code migration, out of scope for this spec-only CR). Left as `'session'` pending CM's call on whether this is intentional (spec accurately describes current runtime behavior) or should be updated in anticipation of a future code migration.

### Verification (Part 3)

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors**
- `get_need_links.py --direction in` confirms zero remaining incoming links to all 4 deleted IDs (`SPEC_EXP_SCANNER`, `SPEC_ACT_SCANNER`, `US_ACT_AGENTBIND`, `US_ACT_TREECLICK`) before their deletion
- `get_need_links.py SPEC_ENG_SCANNER --direction in` confirms all 15 consumers (14 + 1) now correctly repointed
- `get_need_links.py US_ACT_ACTORS --direction out` confirms the new `:links:` field resolves correctly

### PM decision on REQ_ENT_AGENTPROMPT_TEMPLATE AC-2

Confirmed by CM: leave as-is. It documents current runtime behavior (the `EntityEntry.kind` type literal `'project' | 'event' | 'session'`), not the Jarvis-facing taxonomy name — changing it now would make the spec inaccurate about what the code actually produces. Same category as other code-level type literals, correctly left alone.

### Execution Summary Part 4 — MECE re-check residual (one level down)

**Trigger:** final MECE+Trace re-check before QM send found the session→Actor terminology fix from Part 3 hadn't fully propagated one level down, from REQ prose into the corresponding SPEC prose (same drift, same pattern, deeper in the tree).

Fixed in `spec_ent.rst`:
- `SPEC_ENT_TREECLICK`: "apply uniformly to projects, events, and sessions" → "...and actors"; AC-1 "project, event, and session leaf nodes" → "...and actor leaf nodes"; AC-7 "(project, event, session)" → "(project, event, actor)"
- `SPEC_ENT_ENTITY_ICONS`: "(project, event, session) SHALL display" → "(project, event, actor)"; AC-7 "(project, event, session)" → "(project, event, actor)"; AC-8 "Session nodes already have these icons" → "Actor nodes already have these icons"
- `SPEC_ENT_ENTITY_FILE_CHILDREN`: description "project, event, and session leaf node" → "...and actor leaf node"; "several Session entities bound to agent:" → "several Actor entities bound to agent:"

Fixed in `us_uat_entity_files_tree.rst`:
- Intro paragraph: "(Session, Project, and Event nodes expanding..." → "(Actor, Project, and Event nodes expanding..."
- Test scenario T-2 label: "Session node (`copilot-cm`, agent bound) expands" → "Actor node (`copilot-cm`, agent bound) expands"

Also fixed for consistency (same T-2 drift pattern, sibling file, not explicitly listed but same root cause): `spec_uat_entity_files_tree.rst` T-2 label "Session node expands" → "Actor node expands". Left "Sessions Tree" (the literal current VS Code view/UI label) unchanged per the storage/UI-decoupling rule — that is the actual current UI text, not the entity-kind concept name.

### Verification (Part 4)

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors**
- Manual grep sweep for `project, event, session` / `Session node` / `Session, Project` patterns across `spec_ent.rst`, `us_uat_entity_files_tree.rst`, `spec_uat_entity_files_tree.rst`, `req_uat_entity_files_tree.rst` confirms no further drift remaining

---

**Status**: ✅ completed

### Impacted Requirements

Full detail in "Execution Summary Part 1-4" above; summarized by theme migration:

| ID(s) | Linked From | Impact | Notes |
|-------|-------------|--------|-------|
| All `REQ_SES_*` (17) | `US_SES_*` | renamed | Theme prefix `SES` → `ACT` (mechanical, files + IDs) |
| `REQ_EXP_OPENYAML`, `REQ_EXP_AGENTSESSION`, `REQ_EXP_RESCAN_BTN`→`REQ_ENT_SCANREFRESH`, `REQ_EXP_NAMESORT`, `REQ_EXP_CONTEXTACTIONS`, `REQ_EXP_OPENCONTEXT`, `REQ_EXP_AGENTPROMPT_TEMPLATE`, `REQ_EXP_ENTITY_AGENT`, `REQ_EXP_ENTITY_TREECLICK`, `REQ_EXP_ENTITY_ICONS`, `REQ_EXP_ENTITY_FILE_CHILDREN` (11) | `US_ENT_*` (relocated siblings) | renamed + relocated | `EXP` → `ENT` prefix; physically moved `req_exp.rst` → `req_ent.rst` |
| `REQ_EXP_EVENT_SUMMARY` | `US_ENT_ENTITYPARITY` | renamed + relocated | `EXP` → `EVT` (single-kind); moved into `req_evt.rst` |
| `REQ_EXP_PROJECTFILTER`, `REQ_EXP_FILTERPERSIST`, `REQ_EXP_LISTPROJECTS`, `REQ_EXP_CREATEPROJECT` (4) | `US_PRJ_*` | renamed + relocated | `EXP` → `PRJ`; new `req_prj.rst` |
| `REQ_EXP_EVENTFILTER`, `REQ_EXP_EVENTFILTERPERSIST`, `REQ_EXP_LISTEVENTS`, `REQ_EXP_CREATEEVENT` (4) | `US_EVT_*` | renamed + relocated | `EXP` → `EVT`; merged into existing `req_evt.rst` |
| `REQ_ACT_AGENT_FIELD`, `REQ_ACT_AGENT_PICKER`, `REQ_ACT_AGENT_DISCOVERY`, `REQ_ACT_AGENT_CREATETOOL`, `REQ_ACT_AGENT_VALIDATION`, `REQ_ACT_AGENT_OPEN`, `REQ_ACT_AGENT_COMPAT`, `REQ_ACT_TREECLICK` (8) | `US_ENT_ENTITYPARITY` | relinked | Parent repointed from deleted `US_ACT_AGENTBIND`/`US_ACT_TREECLICK` |
| `REQ_EXP_NEWPROJECT`, `REQ_EXP_NEWEVENT` | `US_ENT_NEWENTITY` | unchanged (deliberate) | Kept in `EXP`; not in PM's explicit relocation list — see "Deliberately not moved" note above |

### New Requirements

None. This CR renames/relocates existing Requirements to correct themes; it does not derive new requirements from new User Stories (the one new US, `US_ENT_ENTITY`, is the parent taxonomy US and does not itself require a dedicated new REQ — its children ARE the existing, now-relocated `REQ_ENT_*` set).

### Conflicts Detected

None — see "Execution Summary Part 3" for the one substantive conflict resolved during execution (Scanner content-preservation: merged real algorithmic detail into `SPEC_ENG_SCANNER` before deleting duplicates, rather than silently losing it).

### Decisions

- Rename-only theme migrations (`SES`→`ACT`) use a straight ID/file rename with no content change.
- Relocation migrations (`EXP`→`ENT`/`PRJ`/`EVT`) physically move the REQ block to the destination file, updating all `:links:` tree-wide.
- Two REQs (`NEWPROJECT`/`NEWEVENT`) deliberately not relocated — out of PM's explicit list, disclosed as accepted remaining stranding.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — confirmed by independent QM/MECE L1 pass (Round 1)
- [x] No redundancies — Scanner/Agent-Picker/Tree-Click duplication resolved
- [x] All new REQs link to User Stories — N/A (no new REQs; all relocated REQs retain/repoint their upward `:links:`)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Full detail in "Execution Summary Part 1-4" above; summarized by theme migration:

| ID(s) | Linked From | Impact | Notes |
|-------|-------------|--------|-------|
| All `SPEC_SES_*` (~24) | `REQ_ACT_*` | renamed | Theme prefix `SES` → `ACT` (mechanical, files + IDs) |
| `SPEC_ENT_AGENT_PICKER`, `SPEC_ENT_TREECLICK`, `SPEC_ENT_OPENYAML_CMD`, `SPEC_ENT_AGENTSESSION`, `SPEC_ENT_AGENTSESSION_INITPROMPT`, `SPEC_ENT_RESCAN_CMD`, `SPEC_ENT_ENTITY_AGENT`, `SPEC_ENT_ENTITY_ICONS`, `SPEC_ENT_ENTITY_FILE_CHILDREN`, `SPEC_ENT_CONTEXTACTIONS`, `SPEC_ENT_OPENCONTEXT_CMD` (11) | `REQ_ENT_*` | renamed + relocated | `EXP` → `ENT`; physically moved `spec_exp.rst` → `spec_ent.rst`; `SPEC_ENT_AGENT_PICKER`/`SPEC_ENT_TREECLICK` additionally **consolidated** (were duplicated across `EXP`+`ACT`) |
| `SPEC_EXP_FILTERCOMMAND`→`SPEC_PRJ_FILTERCOMMAND`, `SPEC_EXP_LISTPROJECTS`→`SPEC_PRJ_LISTPROJECTS`, `SPEC_EXP_CREATEPROJECT`→`SPEC_PRJ_CREATEPROJECT` (3) | `REQ_PRJ_*` | renamed + relocated | `EXP` → `PRJ`; new `spec_prj.rst` |
| `SPEC_EXP_EVENTFILTER_CMD`→`SPEC_EVT_EVENTFILTER_CMD`, `SPEC_EXP_LISTEVENTS`→`SPEC_EVT_LISTEVENTS`, `SPEC_EXP_CREATEEVENT`→`SPEC_EVT_CREATEEVENT` (3) | `REQ_EVT_*` | renamed + relocated | `EXP` → `EVT`; new `spec_evt.rst` |
| `SPEC_ENG_SCANNER` | `REQ_ENG_SCANNER` | enriched | Absorbed real algorithmic detail (scan steps, sort order incl. event-date override, change-detection diff algorithm) from the 2 deleted duplicates — 2 new ACs added |
| `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD` | `REQ_EXP_NEWPROJECT`/`NEWEVENT` | unchanged (deliberate) | Kept in `EXP`, matching their un-relocated parent REQs |

### New Design Elements

None. Same rationale as Level 1 — no new SPECs derived; existing SPECs renamed/relocated/consolidated.

### Conflicts Detected

- ⚠️ `SPEC_EXP_SCANNER` vs `SPEC_ACT_SCANNER` vs `SPEC_ENG_SCANNER`: three specs describing the scanner, two stale/duplicated, one the current ground truth.
  - Resolution: merged the two stale specs' unique algorithmic content into `SPEC_ENG_SCANNER`, repointed all 15 consumers, deleted both duplicates (see Execution Summary Part 3).
- ⚠️ `SPEC_EXP_AGENT_PICKER` vs `SPEC_ACT_AGENT_PICKER`; `SPEC_EXP_ENTITY_TREECLICK` vs `SPEC_ACT_TREECLICK`: cross-cutting contract duplicated per-theme.
  - Resolution: the generic contract (return semantics, consumer list) renamed/relocated to `SPEC_ENT_*`; the concrete Actor-specific implementation detail retained in `SPEC_ACT_*` (confirmed non-duplicate content — see Execution Summary Part 1 Step 2).

### Decisions

- Same rename-vs-relocate pattern as Level 1.
- Scanner, Agent-Picker, Tree-Click dedup decisions documented in full in Execution Summary Part 1 (Step 2) and Part 3.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — confirmed by independent QM/MECE L2 pass (Round 1); 2 low/medium findings raised (dual-command naming asymmetry, prose drift) both addressed (see below)
- [x] All new SPECs link to Requirements — N/A (no new SPECs)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_ENTITY (+ 11 children) | 11× REQ_ENT_* | 11× SPEC_ENT_* (2 consolidated from EXP+ACT dupes) | ✅ |
| US_ACT_ACTORS, US_ACT_CREATETOOL | REQ_ACT_SCHEMA/TREE/TOGGLE/CREATETOOL etc. | SPEC_ACT_* | ✅ |
| US_PRJ_PROJECT (thin kind-definition, links → US_ENT_ENTITY) | — (definitional; no dedicated REQ, per its thin scope) | — | ✅ |
| US_PRJ_PROJECTFILTER/LISTPROJECTS/CREATEPROJECT | REQ_PRJ_* (4) | SPEC_PRJ_* (3) | ✅ |
| US_EVT_EVENT (thin kind-definition, links → US_ENT_ENTITY) | — (definitional; no dedicated REQ, per its thin scope) | — | ✅ |
| US_EVT_EVENTFILTER/LISTEVENTS/CREATEEVENT/DATESORT | REQ_EVT_* (6) | SPEC_EVT_* (3) | ✅ |

Verified via `get_need_links.py` spot-checks (see Execution Summary Parts 2-3) and independent QM Round 1 Trace dispatches on 3 sampled chains (`US_ENT_ENTITY`, `US_ACT_ACTORS`, `SPEC_ENG_SCANNER`) — all PASS, zero dangling links, zero orphans. `US_PRJ_PROJECT`/`US_EVT_EVENT` are intentionally leaf-level in the traceability graph (thin, symmetry-restoring peers to `US_ACT_ACTORS`, which itself has no dedicated "definition" REQ either — the kind's behavior is fully specified by its feature-level USes' REQ/SPEC chains).

### Artefakt-Removal-Check

This CR removes 4 spec elements (superseded, not orphaned — consumers repointed first, per the no-permanent-stubs policy):

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|-------------------|-------------------------------|----------------------|----------------------------------|
| `SPEC_EXP_SCANNER` | **1 active reference found, NOT fixed**: `packages/core/src/engine/sessions/yamlScanner.ts` line 1 (`// Implementation: SPEC_EXP_SCANNER`) and its stale `// Requirements:` comment line (still lists `REQ_EXP_EVENTFILTER`, `REQ_EXP_NAMESORT` — also since relocated to `EVT`/`ENT`). Same content duplicated in 2 compiled `.js` output files. **Out of Designer's role to fix (code change, not spec) — flagged for Dev Engineer as a tiny follow-up: update the header comment to `// Implementation: SPEC_ENG_SCANNER` + corrected REQ list.** | None outside this CD (all remaining `.rst` references confirmed clean via `sphinx-build`) | ~15 references across `v0.1.0`/`v0.2.0` historic Change Docs (`folder-filter.md`, `open-yaml.md`, `subfolder-view.md`, `event-filter.md`, `project-scan.md`, `proj-folders.md`, `new-entity.md`, `session-tools.md`) — accepted historic stranding, frozen records |
| `SPEC_ACT_SCANNER` | None found | None outside this CD | Minimal — this ID was introduced only recently (SES→ACT rename in this same CR's Step 1); no pre-existing historic Change Docs reference it |
| `US_ACT_AGENTBIND` | None found | None outside this CD | None — introduced recently (session-agent-binding CR, v0.6.0), historic docs there reference the original `US_SES_AGENTBIND` name which is out of scope (pre-dates this CR's rename) |
| `US_ACT_TREECLICK` | None found | None outside this CD | None — same as above, historic docs reference `US_SES_TREECLICK` (pre-dates this CR) |

- [ ] All class (a) active code/workflow references fixed in this CR — **NO, 1 reference in `yamlScanner.ts` remains, explicitly flagged above for a follow-up (comment-only, non-functional fix; outside Designer's role)**
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Known/Accepted Retained Differences (disclosure)

- **`jarvis.openContext` (Project/Event, icon `$(notebook)`) vs `jarvis.openSessionContext` (Actor, icon `$(book)`)**: two different commands open `context.md` for different entity kinds, with different icons and different resolution logic (3-step discovery + QuickPick for Project/Event vs. on-the-fly file creation for Actor). This asymmetry is historically explained (Actor's primary click action was repurposed for chat, requiring a new inline command) but was never unified. Accepted as an unaddressed, pre-existing naming/icon inconsistency — not introduced or worsened by this CR, and out of scope for a spec-only taxonomy rename. Flagged as a candidate for a future dedicated cleanup CR.

### Issues Found

- [x] Issue 1: `yamlScanner.ts` header comment stale (see Artefakt-Removal-Check, class (a)) — flagged for Dev Engineer, not fixed here (code change)
- [x] Issue 2: `openContext`/`openSessionContext` naming asymmetry — disclosed above as accepted, unaddressed

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining — all 4 deprecated elements deleted outright per no-permanent-stubs policy)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation — no runtime code changes required by this CR itself; the one flagged `yamlScanner.ts` comment fix is optional cleanup, not a blocker

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 (Independent QM Review)

**Reviewed by:** Quality Manager (dispatched MECE Engineer × L0/L1/L2 over the full ENT/ACT/PRJ/EVT/EXP scope, Trace Engineer × 3 chains: US_ENT_ENTITY, US_ACT_ACTORS, SPEC_ENG_SCANNER consolidation)
**Review date:** 2026-07-01

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | — (CD structure) | This Change Document | The formal "Impacted Requirements" (L1) / "Impacted Design Elements" (L2) tables and the "Final Consistency Check" section (incl. Artefakt-Removal-Check) still contain unfilled template placeholders (`REQ_xxx`, `SYSPILOT_REQ_NEW_1`, empty checkboxes), even though the actual work is fully described in the narrative "Execution Summary Part 1-4" sections. The template explicitly requires an Artefakt-Removal-Check table when artefacts are removed — this CR deletes 4 spec elements (SPEC_EXP_SCANNER, SPEC_ACT_SCANNER, US_ACT_AGENTBIND, US_ACT_TREECLICK) and that table is empty. Independent verification (below) confirms the underlying work is correct — this is an audit-trail/CD-completeness gap, not a content defect. | medium |
| 2 | L2 | SPEC_ENT_OPENCONTEXT_CMD vs. SPEC_ACT_TREECLICK | Two different commands open context.md for different kinds: `jarvis.openContext` (Project/Event, icon `$(notebook)`, 3-step discovery + QuickPick) vs. `jarvis.openSessionContext` (Actor, icon `$(book)`, on-the-fly creation). SPEC_ACT_TREECLICK's own history explains *why* (Actor's primary click action was repurposed for chat, so a new inline command was needed) — this is not a defect, but unlike other retained "session"-named code artifacts (`.jarvis/sessions/`, `EntityEntry.kind`), this command name is not listed in the CD's explicit out-of-scope/deferred disclosure. Recommend adding one line to the CD noting this is an accepted, unaddressed naming/icon asymmetry (or a future cleanup candidate), consistent with how other retained "session" references are disclosed. | medium |
| 3 | L2 | SPEC_ENT_TREECLICK | Description prose (~line 579) still reads "project, event, and session leaf nodes" — missed by the Part 4 terminology mop-up. Contradicts its own AC-1/AC-7, which correctly say "actor". Quick text fix. | low |
| 4 | L0 | US_ENT_ENTITY | Parent taxonomy US has no explicit downward `:links:` enumerating its 11 children (relies on sphinx-needs back-links only). Not a defect — reduces at-a-glance parent-role transparency. Optional. | low |
| 5 | L0 | (design choice) | No dedicated kind-definition USs (e.g. `US_PRJ_PROJECT`, `US_EVT_EVENT`) exist — the 3-kind taxonomy is centralized only in `US_ENT_ENTITY`. Acceptable by design (breadth-at-umbrella vs. depth-at-kind trade-off); flagged for awareness only. | low |

#### Independent Checks Confirming No Regressions

- **MECE L0** (US_ENT_ENTITY + 11 children, US_ACT_ACTORS/CREATETOOL, PRJ/EVT/EXP retained set): PASS — complete coverage (22 US), mutually exclusive theme partition, "Session" terminology fully retired from Jarvis-facing prose, zero orphaned US_SES_*/US_ACT_AGENTBIND/US_ACT_TREECLICK references.
- **MECE L1** (11 REQ_ENT_*, 17 REQ_ACT_*, 4 REQ_PRJ_*, 6 REQ_EVT_*): PASS — full US→REQ coverage, no dangling links to deleted USs, REQ_ENT_AGENTPROMPT_TEMPLATE AC-2's retained `'session'` code-literal confirmed as the *only* remaining literal and clearly intentional.
- **MECE L2** (11 SPEC_ENT_*, SPEC_ACT_* pair, SPEC_ENG_SCANNER, spec_prj.rst/spec_evt.rst): PASS on structure/dedup/consumer-repointing; 2 findings above (dual command, prose drift).
- **Trace US_ENT_ENTITY** (3 sampled chains: ENTITYPARITY, ENTITY_FILES_TREE, AGENTSESSION): PASS — all 11 children resolve, physical relocation confirmed (not just ID-renamed), zero dangling references; 1 prose-drift finding (#3 above).
- **Trace US_ACT_ACTORS**: PASS — clean rename+relocation, zero remaining references to any of the 6 old IDs, concept-storage decoupling note is clear and unambiguous, generic-vs-concrete SPEC split (ENT/ACT) is semantically sound.
- **Trace SPEC_ENG_SCANNER**: PASS — both deleted specs (SPEC_EXP_SCANNER, SPEC_ACT_SCANNER) confirmed fully removed (not stubs), all 15 consumers correctly repointed, merged algorithm content (scan/sort/change-detection) coherent and complete, no content lost.

**QM Verdict:** No blocking defects. Findings are documentation-completeness (#1, CD's own formal sections) and a UX-naming disclosure gap (#2) plus a small residual prose miss (#3). The taxonomy rename itself — theme realignment, physical relocation, dedup, no-permanent-stubs cleanup, terminology migration — is independently verified sound and complete. Recommend fix-now for #3 (one-line text fix); #1 and #2 are PM's call (fix-now to backfill CD tables / add disclosure line, or accept-as-is given the narrative sections already carry the substance).

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Backfill the formal L1/L2/Artefakt-Removal-Check tables from the Execution Summary content — quick, keeps the CD's audit trail consistent with the template for future readers |
| 2 | 2 | fix-now | Add one disclosure line noting the `openContext`/`openSessionContext` naming/icon asymmetry as an accepted, unaddressed retained-difference — consistent with how other "session" artifacts are disclosed |
| 3 | 3 | fix-now | 1-line prose fix, trivial and contradicts the SPEC's own ACs if left |
| 4 | 4 | fix-now (reconsidered) | Missing links are a completeness gap, not something to defer — fix now while the taxonomy structure is fresh. Add explicit `:links:` on `US_ENT_ENTITY` to all 11 downward children |
| 5 | 5 | fix-now | Reconsidered: this CR's explicit goal is a consistent taxonomy across all 3 kinds — an Actor-only definition US without Project/Event equivalents is exactly the asymmetry we set out to fix. Add US_PRJ_PROJECT and US_EVT_EVENT as thin definition stories mirroring US_ACT_ACTORS's role (kind identity + link to US_ENT_ENTITY), without duplicating the existing feature-level USes' content |

---

## Execution Summary Part 5 — Findings #4 and #5 (System Designer)

### Fixed: Finding #4 — US_ENT_ENTITY missing downward `:links:`

Added explicit `:links:` on `US_ENT_ENTITY` to all 11 of its children (`US_ENT_OPENYAML`, `US_ENT_NEWENTITY`, `US_ENT_SCANREFRESH`, `US_ENT_CONTENTDETECT`, `US_ENT_NAMESORT`, `US_ENT_AGENTSESSION`, `US_ENT_CONTEXTACTIONS`, `US_ENT_OPENCONTEXT`, `US_ENT_AGENTSESSION_PROMPT`, `US_ENT_ENTITYPARITY`, `US_ENT_ENTITY_FILES_TREE`), alongside the existing `US_EXP_SIDEBAR` link. Previously the parent-child relationship existed only via each child's upward `:links:` to `US_ENT_ENTITY`; now declared reciprocally on the parent. Verified via `get_need_links.py US_ENT_ENTITY --direction out` — all 11 + `US_EXP_SIDEBAR` resolve correctly, no cycle warnings from `sphinx-needs`.

### Fixed: Finding #5 — US_PRJ_PROJECT / US_EVT_EVENT thin kind-definition stories

See Execution Summary Part 4-adjacent commit (`8608392`): added both stories, updated CD Level 0 and Traceability Verification.

### Verification (Part 5)

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors**
- `get_need_links.py US_ENT_ENTITY --direction out --depth 1` confirms all 11 children + `US_EXP_SIDEBAR` resolve

### Round 2 (QM Final Sign-off)

**Reviewed by:** Quality Manager
**Review date:** 2026-07-01

Independently verified both remaining fix-now items directly against the files (not just CM's report):
- `US_ENT_ENTITY` (`us_ent.rst`) now declares `:links:` to all 11 children + `US_EXP_SIDEBAR` — confirmed by direct read.
- `US_PRJ_PROJECT` and `US_EVT_EVENT` (`us_prj.rst`/`us_evt.rst`) exist as thin kind-definition stories, correctly link to `US_EXP_SIDEBAR; US_ENT_ENTITY`, and explicitly disclaim duplicating their sibling feature-level stories' content — no redundancy introduced, closes the L0 gap cleanly.

**QM Verdict: CLEAR — all 5 Round 1 findings resolved. Signed off for merge.**

---

## Follow-up (post-merge): relocate US_ENT_NEWENTITY's remaining EXP-resident children

**Trigger:** PM decision — the original CR deliberately left `REQ_EXP_NEWPROJECT`, `REQ_EXP_NEWEVENT`, `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD` in `EXP` (disclosed at the time as "not in PM's explicit relocation list"). PM now wants full consistency — these 4 elements physically relocated to `PRJ`/`EVT`, matching the kind-specific relocation pattern used everywhere else in this CR.

### Impact analysis

`get_need_links.py US_ENT_NEWENTITY --direction in --depth 1` confirmed the link graph: `REQ_EXP_NEWPROJECT`, `REQ_EXP_NEWEVENT` (direct children) plus their own downstream consumers (`REQ_OLK_AUTOCAT_NEWENTITY`, `REQ_PRJ_CREATEPROJECT`, `REQ_UAT_*`, `SPEC_ENT_AGENT_PICKER`, `SPEC_EXP_EXTENSION`, `SPEC_EXP_NEWPROJECT_CMD`/`NEWEVENT_CMD`) — no surprises, no additional consumers outside the expected set.

### Executed

1. Renamed (tree-wide, matching the established `PRJ`/`EVT` pattern already used for every other single-kind element in this CR):
   - `REQ_EXP_NEWPROJECT` → `REQ_PRJ_NEWPROJECT`
   - `REQ_EXP_NEWEVENT` → `REQ_EVT_NEWEVENT`
   - `SPEC_EXP_NEWPROJECT_CMD` → `SPEC_PRJ_NEWPROJECT_CMD`
   - `SPEC_EXP_NEWEVENT_CMD` → `SPEC_EVT_NEWEVENT_CMD`
2. Physically relocated: `REQ_PRJ_NEWPROJECT` moved `req_exp.rst` → `req_prj.rst`; `REQ_EVT_NEWEVENT` moved `req_exp.rst` → `req_evt.rst`; `SPEC_PRJ_NEWPROJECT_CMD` moved `spec_exp.rst` → `spec_prj.rst`; `SPEC_EVT_NEWEVENT_CMD` moved `spec_exp.rst` → `spec_evt.rst`.
3. All downstream `:links:` references (consumers listed above) updated automatically by the tree-wide rename pass — no dangling links.

This closes the one remaining disclosed gap from the original CR; `EXP` now contains only true sidebar-frame + non-entity-view elements, with zero single-kind command specs remaining.

### Verification

- `sphinx-build -W --keep-going`: **0 warnings, 0 errors**
- `get_need_links.py US_ENT_NEWENTITY --direction in --depth 1` re-run post-relocation: confirms `REQ_PRJ_NEWPROJECT`/`REQ_EVT_NEWEVENT` (renamed) resolve correctly as direct children, all other consumers intact

**Status:** Spec-only physical relocation complete. Per CM, this needs a MECE + Trace verification pass before QM sign-off — CM to dispatch.

### Round 3 (QM Review — Follow-up)

**Reviewed by:** Quality Manager (dispatched MECE Engineer + Trace Engineer, scoped to the 4 relocated elements and their consumers)
**Review date:** 2026-07-01

**Result: PASS, cleared.**

- Physical relocation confirmed (not duplicated): all 4 IDs present in `req_prj.rst`/`req_evt.rst`/`spec_prj.rst`/`spec_evt.rst`, absent from `req_exp.rst`/`spec_exp.rst`.
- Zero dangling references to the 4 old IDs anywhere in `docs/` (only appear in this CD's own narrative, as expected).
- All claimed consumers (`REQ_OLK_AUTOCAT_NEWENTITY`, `REQ_PRJ_CREATEPROJECT`, `REQ_UAT_*`, `SPEC_ENT_AGENT_PICKER`, `SPEC_EXP_EXTENSION`, plus `SPEC_OLK_AUTOCAT_NEWENTITY`/`SPEC_UAT_*` for the SPEC pair) correctly repointed; upward chain to `US_ENT_NEWENTITY` intact for both new REQs; zero orphans.
- `NEWPROJECT`/`NEWEVENT` (UI `+`-button commands) vs. `CREATEPROJECT`/`CREATEEVENT` (LM/MCP tools) confirmed as genuinely distinct concepts (different entry points, registration mechanisms, ACs) — not a redundant pair, coherent alongside each other in the same theme files.
- **Minor, non-blocking observation:** the CD's claim "EXP now contains zero single-kind command specs" is technically imprecise — `REQ_EXP_SEARCHPROJECTS`/`REQ_EXP_SEARCHEVENTS` (and their SPEC counterparts) are single-kind but are tree-navigation/sidebar-frame infrastructure, not entity-creation commands, so they were correctly out of scope for this follow-up. No action needed; noted for wording precision only if the claim is ever restated elsewhere.

**QM Verdict: CLEAR.**

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
