# Change Document: retire-legacy-actor-kinds

**Status**: in-progress
**Branch**: feature/retire-legacy-actor-kinds
**Created**: 2026-09-25
**Author**: PM
**Operation Mode**: autonomous

**Design-phase exception**: Level 0/1/2 (System Designer) runs
**user-guided** — the user wants to work through the specs in detail
together before they're finalized. Every other step in this change runs
autonomous.

---

## Summary

This is Phase 2 of the one-kind-consolidation initiative. The user wants
the old, separate Project/Event/legacy-Actor kinds retired and removed —
from both specification and codebase, not merely deprecated in place —
now that Phase 1 delivered a single consolidated Actor kind that the user
has accepted for continued work. Motivation: running the old kind-based
system and the new single-kind system side by side is confusing and costly
to maintain, and the user's stated goal for this initiative was always to
end up with one kind, not two living in parallel, nor legacy remnants left
behind for later cleanup.

**Scope update (2026-09-25, supersedes the original gap handling)**: the
user is still in architecture review with the System Designer and has not
finished enumerating every old-kind function that must be carried into the
new Actor kind. Decision: any such function must be **ported to the new
Actor kind first**, and only then may its old-kind spec/code be deleted —
not the other way around. This supersedes the earlier "delete now,
redevelop later" call, and applies retroactively to backlog items #31 and
#32 as well: both are now in scope for this change (port before removing
the corresponding old-kind spec/code), not deferred follow-ups. The full
list of functions to port is expected to grow as the architecture review
continues; System Designer/CM should hold off deleting any old-kind
spec/code whose functionality has not yet been confirmed ported.
Acceptance criteria (user-visible): creating, finding, and opening an
entity only offers the new Actor kind — the old separate
Project/Event/legacy-Actor creation and browsing paths, and any
specification describing them as current, are gone; every function the old
kinds provided is available through the new Actor kind with no regression
(including backlog #31 and #32); no dangling old-kind UI, commands, specs,
or code remain that could
confuse a user or future contributor into thinking the old kinds still
exist.

---

## Level 0: User Stories

**Status**: ✅ completed with the user; MECE focused re-review PASS on
`2be298c`..`568b735` with one recorded PIM deferral (US_UAT_TASKS).
QM review outstanding.

**Porting rule applied:** each old-kind story was either ported into the
Actor stories (`us_actor.rst`) before its removal, or removed because the
user explicitly decided its function is not carried forward. The "Port /
reason" column states which.

### Impacted User Stories

**Removed — function ported to the Actor:**

| ID | Port / reason |
|----|---------------|
| US_ACT_CREATETOOL | → US_ACTOR_CREATETOOL (rewritten for `actor.yaml`, no `jarvis.sessions.enabled` gate) |
| US_ACT_WHOAMI | → US_ACTOR_WHOAMI (session-only answer and no-guess carried as AC-5/AC-6) |
| US_ACT_ACTORS | tree → US_ACTOR_TREE; schema → US_ACTOR_ACTORS AC-1; open context → US_ACTOR_FILES_TREE; context menu → US_ACTOR_CONTEXTACTIONS; identity prompt → US_ACTOR_ACTORS AC-7; `jarvis_listActors` (AC-5) → US_ACTOR_LISTTOOL. Its feature toggle (AC-1) is dropped: the user decided Actors need no toggle. |
| US_ENT_OPENYAML | Not ported as an inline button (L1 review correction): a prior CR deliberately retired inline open icons in favour of the file children and right-click Open; `actor.yaml` is opened from US_ACTOR_FILES_TREE. |
| US_ENT_OPENCONTEXT | Not ported as an inline button (same reason); `context.md` is opened from US_ACTOR_FILES_TREE. |
| US_ENT_CONTEXTACTIONS | → US_ACTOR_CONTEXTACTIONS (plus Copy Path / Copy Full Path and right-click Open) |
| US_ENT_ENTITY_FILES_TREE | → US_ACTOR_FILES_TREE (backlog #32, now in scope) |
| US_ENT_TOUCHEDFILES | → US_ACTOR_TOUCHEDFILES (backlog #32, now in scope) |
| US_ENT_SCANREFRESH | → US_ACTOR_TREE AC-11 (rescan button, needed for manual testing) |
| US_ENT_CONTENTDETECT | → US_ACTOR_TREE AC-12 |
| US_ENT_NAMESORT | → US_ACTOR_TREE AC-10 |
| US_ENT_AGENTSESSION | already covered by US_ACTOR_TREE AC-6 (click opens the session) |
| US_ENT_AGENTSESSION_PROMPT | → US_ACTOR_ACTORS AC-7; details go to L1 (see Decisions) |
| US_HOOK_ACTIVITY | → US_ACTOR_ACTIVITY (Actor nodes only; mechanism-neutral, hook event list moves to L1) |

**Removed — function not carried forward (user decision):**

| ID | Reason |
|----|--------|
| US_ACT_DUALPATH_STORAGE, US_ACT_MIGRATIONCOMMAND | Former migration stories; obsolete. `.jarvis/sessions/`/`session.yaml` is no longer supported. |
| US_ENT_ENTITY, US_ENT_ENTITYPARITY, US_ENT_NEWENTITY | Cross-kind premise gone; creation is US_ACTOR_CREATE. |
| US_EXP_TREESEARCH | Little value for a flat ACTORS tree. |
| US_EXP_FEATURETOGGLE | Based on `jarvis.messagesFile`/`jarvis.heartbeatConfigFile`, which no longer exist; view visibility follows US_CFG_FEATURETOGGLES. |
| US_PRJ_PROJECT, US_PRJ_PROJECTFILTER, US_PRJ_LISTPROJECTS, US_PRJ_CREATEPROJECT | Project kind retired without replacement. |
| US_EVT_EVENT, US_EVT_DATESORT, US_EVT_EVENTFILTER, US_EVT_LISTEVENTS, US_EVT_CREATEEVENT | Event kind retired without replacement. |
| US_OLK_AUTOCATEGORY | Category creation for new Projects/Events; categories will not be supported. |
| US_CFG_PROJECTPATH | `jarvis.projectsFolder`/`jarvis.eventsFolder` go with the kinds; `jarvis.scanInterval` is kept and now specified in US_ACTOR_TREE AC-7 (MECE finding 3). |
| US_MSG_JARVISSESSIONS | Cross-kind listing is redundant with one kind (US_ACTOR_LISTTOOL). |
| UAT stories of the removed stories | US_UAT_WHOAMI, US_UAT_ACT_WHOAMI_MULTIKINDS, US_UAT_ACT_SESSIONS, US_UAT_LISTSESSIONENTITIESGATING, US_UAT_ENTITY_PARITY, US_UAT_CREATESESSIONTOOL, US_UAT_EXP_TREESEARCH, US_UAT_APT_INITPROMPT, US_UAT_CHATEDITORREUSE, US_UAT_ENTITY_CONTEXTMENU, US_UAT_ENTITY_FILES_TREE, US_UAT_SAMPLEDATA, US_UAT_NEWENTITY, US_UAT_NEWENTITY_PICKER, US_UAT_OPENCONTEXT, US_UAT_SCANREFRESH, US_UAT_CONTENTDETECT, US_UAT_NAMESORT, US_UAT_SESSIONINITPROMPT, US_UAT_AGENTSESSION, US_UAT_SESSIONTREECLICK, US_UAT_CREATEPROJECT, US_UAT_CREATEEVENT, US_UAT_LISTEVENTS, US_UAT_SIDEBAR, US_UAT_EVENTFILTER, US_UAT_AUTOCAT, US_UAT_COLLAPSEALL (six-view scope of the old tree; Actor Collapse All is US_ACTOR_TREE AC-13, Messages/Reminders/Heartbeat Collapse All goes with their own tree stories, PM backlog) |

**Modified:**

| ID | Impact | Notes |
|----|--------|-------|
| US_ACTOR_ACTORS | modified | Phase-1 wording removed; old AC-6 (legacy coexistence) dropped, so agent binding is AC-6; new AC-7 init prompt. |
| US_ACTOR_TREE | modified | AC-1 title "<workspace name> Actors" (backlog #31, now in scope); AC-4/AC-7 reference the periodic scan interval; new AC-10..AC-13 (AC-13: Collapse All, needed now that Actor nodes expand). |
| US_ACTOR_CREATE | modified | Optional summary; pre-filled `context.md`; old AC-6/AC-7 (Phase-1 transition) dropped; new AC-6 open session under `jarvis.actors.openSessionOnCreate` (default on). |
| US_ACTOR_WHOAMI | modified | AC-5/AC-6 from US_ACT_WHOAMI; Phase-1 wording removed. |
| US_EXP_SIDEBAR | modified | Slimmed to container: icon, panel, ACTORS / Messages / Heartbeat sections; visibility via US_CFG_FEATURETOGGLES. |
| US_CFG_FEATURETOGGLES | modified | Project/Event toggles removed. |
| US_MSG_STABLESESSION | modified | AC-3/AC-4 rewritten from Project/Event to Actor; AC-1/2/5 kept. AC-4 references the init prompt via US_ACTOR_ACTORS AC-7 rather than repeating its content (MECE finding 1). |
| US_KAN_TOOLS, US_MOD_ACTORRULES, US_SPL_LIFECYCLE, US_MSG_EDITORPLACEMENT | links | Retargeted from removed US_ACT_*/US_ENT_* to US_ACTOR_*. |
| US_FLOW_CHORDVIEW | modified | AC-5 "entity tree" → "ACTORS tree". |
| US_ACTOR_TOUCHEDFILES | modified | Context made mechanism-neutral; link to US_HOOK_ROUTE removed. |
| US_PIM_TASKS | modified | "Per project/event in the explorer" removed; task display under Project/Event nodes goes with those kinds. Where tasks reappear in the tree and how the editor is reached from there is open for the separate PIM change. |
| US_MSG_EDITORPLACEMENT | modified | AC-1/AC-2 "entity tree" → "ACTORS tree" (MECE finding 2). |
| US_CFG_GROUPS | modified | Nine groups: Actors, Messages, Heartbeat, Reminders, MCP, PIM, Outlook, Recording, Updates (MECE finding 4). Further code groups not in the list (Prompt Templates, Gitignore, Hooks) are left to PM backlog #37. |
| US_KAN_DISCOVER | modified | Actor-only wording; new AC-6 "Add Kanban Board" on Actor nodes, ported from the old Session/Project/Event node menu, which had no story (MECE follow-up finding 6). |
| US_UAT_JOBREG | links | US_CFG_PROJECTPATH → US_ACTOR_TREE. |
| US_REC_CAPTURE, US_REC_ENABLE, US_REC_DISPATCH | modified (note) | Recorder is Project/Event-bound (found in the MECE follow-up; not in the original impact list). User decision: not ported. Triggers (CAPTURE AC-1, ENABLE AC-3) and the transcript target (DISPATCH AC-1) are marked not in force; the recorder is redesigned in a separate change (PM backlog). Until then recording cannot be started from the tree. |

**Reviewed, unchanged:** US_DEV_LOGGING (no kind reference; a broader
logging consistency review is not part of this change), US_FLOW_LOGVIEWER,
US_PIM_CATVIEW (category feature, left to the separate PIM change),
US_MSG_CHATQUEUE (no kind reference; moving the Messages view out of
US_EXP_SIDEBAR into `us_msg.rst` would be a separate change),
US_EXP_OPENFILE (no kind reference).

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ACTOR_CREATETOOL | Programmatic Actor Creation | required |
| US_ACTOR_LISTTOOL | List Actors Programmatically | required |
| US_ACTOR_CONTEXTACTIONS | Context Actions on Actor Nodes | optional |
| US_ACTOR_FILES_TREE | Actor File Children in the ACTORS Tree | mandatory |
| US_ACTOR_TOUCHEDFILES | Recently Touched Files per Actor | optional |
| US_ACTOR_ACTIVITY | Activity Indicator on Actor Nodes | optional |

### Decisions

- `.jarvis/sessions/`/`session.yaml` is not retained as an Actor convention; only `jarvis.actors.folder`/`actor.yaml` remains.
- One creation path: the ACTORS "+" and `jarvis_createActor` produce the same files (`context.md` pre-filled with name heading and summary). L2 intent: the file logic lives only in `actorCreation.ts`; `extension.ts` only wires dialogs, tool registration and session opening.
- New setting `jarvis.actors.openSessionOnCreate` (default on): beginners land in the new Actor's chat; experienced users can keep focus when creating several Actors. An already existing Actor is neither changed nor opened by the tool.
- The init prompt is a consequence of priming the Actor's session, not a separate story: L0 anchor US_ACTOR_ACTORS AC-7, details in L1 (`REQ_ACTOR_INITPROMPT`).
- Feature on/off is centrally US_CFG_FEATURETOGGLES; Actors get no toggle, so `jarvis.sessions.enabled` goes in L1/L2.
- Status (user decision): every story written or reworked together in this review is `approved` — all new US_ACTOR_* stories, US_EXP_SIDEBAR, US_CFG_FEATURETOGGLES and US_CFG_GROUPS (previously `implemented`, now changed and not yet implemented), and US_KAN_DISCOVER. Stories only link-retargeted or with a single term replaced (US_FLOW_CHORDVIEW) keep their status.
- Backlog #31 and #32 are in scope and ported (see above).
- Agent hooks stay in this change: they are today's only source for `jarvis_whoAmI` session resolution, touched files and activity. Actor stories are written mechanism-neutral so AHP can replace the source without an L0 change; removing the hooks entirely is a separate change once AHP supplies these signals.

### Open items

- **Raw candidates:** all reviewed.
- **User UAT:** not included in this change. The L0 decision moves UAT redesign and its new test ontology to PM backlog #40; Test Designer owns those static User-validation specs when that change is initiated. No user UAT is implied here. Engineering owns autonomous unit, integration, regression, and absence-of-legacy verification. Known stale artefacts are handled by the redesign: `us_uat_spl.rst` T-6 ("Jarvis Entities" tree, `sessions/`) and `spec_uat_actor_create` (cites US_ACTOR_CREATE "AC-3 through AC-7"; ACs renumbered).
- **Testability:** US_ACTOR_TOUCHEDFILES and US_ACTOR_ACTIVITY depend on agent-activity signals (today: hooks) and can be specified and ported now, but only user-tested after AHP (backlog #32 note). US_ACTOR_FILES_TREE has no such dependency.
- **Out of scope:** retiring the whole PIM category feature (US_PIM_CATEGORIES, CATTOOL, CATVIEW, US_OLK_COMBRIDGE) is a separate PIM change.
- **Carried to L1:** fold the base behaviour of REQ_ACT_WHOAMI into REQ_ACTOR_WHOAMI; REQ_ACTOR_INITPROMPT; REQ_CFG_TOGGLES/REQ_CFG_GROUPS clean-up; decide REQ_CFG_DEFAULTPATHS (writes the non-existent path settings).
- **Build state:** no dead links from user stories; the remaining Sphinx link warnings come from L1/L2 elements that still point to removed stories.

### Horizontal Check (MECE)

MECE Engineer advisory on `21d9091`: **FAIL**. Core US_ACTOR_* stories
distinct; ADR-12 consistent. Findings and dispositions:

1. US_MSG_STABLESESSION AC-4 repeated the init-prompt content → now a reference only.
2. US_MSG_EDITORPLACEMENT AC-1/2 "entity tree" → ACTORS tree.
3. US_CFG_PROJECTPATH still required Project/Event folders → removed; scan interval moved to US_ACTOR_TREE AC-7.
4. US_CFG_GROUPS required Projects/Events/Sessions groups → list revised.
5. UAT stories still using old-kind fixtures → **resolved (user decision)**: UAT stories are test specifications in story format, not user promises; user acceptance testing is redesigned in a separate change with a new ontology (user test vs. user test spec; PM backlog). Deleted now: US_UAT_SETTINGS_CLEANUP, US_UAT_MODULAR_INSTALL, US_UAT_MSG_STABLESESSION, US_UAT_REC_ENABLE, US_UAT_REC_CONFIG, US_UAT_REC_CAPTURE, US_UAT_LOGGING, US_UAT_SPL, US_UAT_MSG_REMOTECOMPAT. Kept: US_UAT_TASKS (PIM; left to the separate PIM change, known-stale tree assertions, not acceptance evidence). Also decided: the Phase-1 Actor UAT specs (`docs/design/spec_uat_actor_*.rst`, U-1..U-6) are deleted in the L2 pass.
6. System Designer follow-up: "Add Kanban Board" existed only on old-kind nodes → ported (US_KAN_DISCOVER AC-6).

MECE focused re-review on `2be298c`..`568b735`: **PASS**. Findings 1–4
resolved; US_KAN_DISCOVER AC-6 and the recorder "not in force" notes are
consistent; no further unaccounted function or contradiction. Accepted
exception: US_UAT_TASKS still asserts task nodes under Project/Event trees;
it is retained as known-stale for the separate PIM change and is not
acceptance evidence.

- [x] No contradictions with existing User Stories (except the accepted US_UAT_TASKS deferral)
- [x] No redundancies (finding 1 fixed)
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ all L1 files dispositioned with the user; no L0/L1 dead links
remain. MECE L1 review PASS on `59fba21`.
REQ_ACTOR_ACTIVITY approved by the user.

### Impacted Requirements

**`req_act.rst` (file removed):**

| ID | Impact | Target / reason |
|----|--------|-----------------|
| REQ_ACT_TOGGLE | removed | Actors have no feature toggle (L0). |
| REQ_ACT_SCHEMA, REQ_ACT_AGENT_FIELD, REQ_ACT_AGENT_COMPAT | removed | `session.yaml` convention dropped; `actor.yaml` is REQ_ACTOR_SCHEMA. |
| REQ_ACT_TREE, REQ_ACT_TREECLICK | removed | Old tree; sorting, expandable nodes and click → REQ_ACTOR_TREE. |
| REQ_ACT_DUALPATH_SCANNER, REQ_ACT_MIGRATIONCOMMAND | removed | Dropped at L0. |
| REQ_ACT_NEWENTITY, REQ_ACT_AGENT_PICKER | removed | Old creation command; rescan button → REQ_ACTOR_TREE AC-8, auto-open → REQ_ACTOR_CREATE AC-9, picker → REQ_ACTOR_CREATE AC-6. |
| REQ_ACT_LISTTOOL | ported | → REQ_ACTOR_LISTTOOL |
| REQ_ACT_CONTEXTMENU | ported | → REQ_ACTOR_CONTEXTACTIONS |
| REQ_ACT_AGENTPROMPT, REQ_ACT_AGENT_OPEN | ported | → REQ_ACTOR_INITPROMPT |
| REQ_ACT_OPENCONTEXT | removed | Already retired historical record. |
| REQ_ACT_CREATETOOL, REQ_ACT_AGENT_CREATETOOL, REQ_ACT_AGENT_VALIDATION | ported | → REQ_ACTOR_CREATETOOL |
| REQ_ACT_AGENT_DISCOVERY | ported | → REQ_ACTOR_AGENT_DISCOVERY |
| REQ_ACT_WHOAMI | ported | Base behaviour folded into REQ_ACTOR_WHOAMI; collision AC and Phase notes dropped. |

**`req_ent.rst` (file removed):**

| ID | Impact | Target / reason |
|----|--------|-----------------|
| REQ_ENT_AGENTSESSION | ported | → REQ_ACTOR_OPENSESSION (inline button dropped; click and right-click Open) |
| REQ_ENT_AGENTPROMPT_TEMPLATE | ported | → REQ_ACTOR_INITPROMPT |
| REQ_ENT_SCANREFRESH, REQ_ENT_NAMESORT | ported | → REQ_ACTOR_TREE AC-8 / AC-4 |
| REQ_ENT_CONTEXTACTIONS | ported | → REQ_ACTOR_CONTEXTACTIONS |
| REQ_ENT_ENTITY_CONTEXTMENU | ported | Root-node Open/Copy Path/Copy Full Path → REQ_ACTOR_CONTEXTACTIONS; file-child Open/Copy Path/Copy Full Path/Copy File Name → REQ_ACTOR_FILES_TREE AC-8. Folder-node "Copy" not ported: it only exists on grouping folders (`jarvisFolder`), which the ACTORS tree does not have. |
| REQ_ENT_ENTITY_FILE_CHILDREN | ported | → REQ_ACTOR_FILES_TREE |
| REQ_ENT_TOUCHEDFILES | ported | → REQ_ACTOR_TOUCHEDFILES; storage file `actor-<name>.json`, as the code already writes for Actors. |
| REQ_ENT_OPENYAML, REQ_ENT_OPENCONTEXT, REQ_ENT_ENTITY_ICONS | removed | Retired inline icons; not reintroduced (see Decisions). |
| REQ_ENT_ENTITY_AGENT, REQ_ENT_ENTITY_TREECLICK | removed | Project/Event only. |

**Modified:** REQ_ACTOR_SCHEMA, REQ_ACTOR_ACTIVATION, REQ_ACTOR_BINDING
(Phase-1 wording removed), REQ_ACTOR_TREE, REQ_ACTOR_CREATE,
REQ_ACTOR_WHOAMI (rewritten), eight REQ_KAN_* (link REQ_ACT_WHOAMI →
REQ_ACTOR_WHOAMI).

**Other L1 files:**

| ID / file | Impact | Target / reason |
|-----------|--------|-----------------|
| `req_prj.rst`, `req_evt.rst` | removed | Project/Event kinds retired (L0). |
| 29 `req_uat_*.rst` files; REQ_UAT_APT_INITPROMPT, REQ_UAT_AGENTSESSION_TESTDATA, REQ_UAT_AUTOCAT_TESTDATA | removed | Their UAT stories were retired at L0. |
| REQ_HOOK_ACTIVITY | ported | → REQ_ACTOR_ACTIVITY (Actor-only; hook events kept as today's source). |
| REQ_OLK_AUTOCAT_NEWENTITY, REQ_MSG_JARVISSESSIONS | removed | Stories retired at L0. |
| REQ_EXP_TREEVIEW | rewritten | Sidebar views ACTORS/Messages/Heartbeat/Categories; Collapse All for ACTORS/Messages/Reminders/Heartbeat. |
| REQ_EXP_REACTIVECACHE | modified | AC-7 compares Actor data instead of `datesEnd`. |
| REQ_EXP_DUMMYDATA, _YAMLDATA, _FEATURETOGGLE, _TASKTREE, _UNIFIEDTREE, _SEARCHPROJECTS, _SEARCHEVENTS, _SEARCHENTITIES | removed | Old tree, Project/Event data, search, task display under Project/Event nodes (L0). |
| REQ_CFG_FOLDERPATHS | rewritten | Now specifies `jarvis.actors.folder` — the setting had no requirement although REQ_ACTOR_TREE referenced this one. |
| REQ_CFG_SCANINTERVAL | links | US_CFG_PROJECTPATH → US_ACTOR_TREE. |
| REQ_CFG_DEFAULTPATHS | removed | Wrote `jarvis.heartbeatConfigFile`/`jarvis.messagesFile`, which exist in no `package.json` and no code any more. |
| REQ_CFG_TOGGLES, REQ_CFG_GROUPS | modified | Project/Event toggles removed; nine settings groups. |
| REQ_REC_ENABLE AC-4, REC_BUTTON, REC_STATUSBAR, REC_SUBPROCESS, REC_DISPATCH, REC_SIDECAR | not in force | Bound to Project/Event nodes or Project names; recorder redesign (PM backlog #41). |
| REQ_ENG_SESSIONLIST | replaced | → REQ_ENG_ACTORLIST: `JarvisCoreApi.listActors()` replaces `listJarvisSessions()` (user decision); used by `kanban` and `syspilot`. |
| REQ_MSG_SEND, REQ_MSG_AUTODELIVER_POLL, REQ_MSG_AGENTSESSION, REQ_SPL_ACTOR, REQ_UAT_APT_CFG, REQ_UAT_TASKS_TESTDATA | links | Retargeted to REQ_ACTOR_* / US_ACTOR_ACTORS or dead link removed. |
| REQ_EXP_HEARTBEAT_OPENFILE, REQ_EXP_MESSAGE_OPENFILE | modified | AC-2/AC-6 named the removed settings `jarvis.heartbeatConfigFile`/`jarvis.messagesFile`; now the fixed paths from the central resolver, as the code already does (user decision to fix in this change). |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ACTOR_CREATETOOL | Programmatic Actor Creation Tool | US_ACTOR_CREATETOOL | required |
| REQ_ACTOR_LISTTOOL | List Actors Tool | US_ACTOR_LISTTOOL | required |
| REQ_ACTOR_AGENT_DISCOVERY | Agent Discovery | US_ACTOR_CREATE, US_ACTOR_CREATETOOL, US_ACTOR_FILES_TREE | required |
| REQ_ACTOR_OPENSESSION | Open Actor Session | US_ACTOR_TREE, US_ACTOR_CONTEXTACTIONS, US_MSG_STABLESESSION, US_MSG_EDITORPLACEMENT | required |
| REQ_ACTOR_INITPROMPT | Actor Session Initialization Prompt | US_ACTOR_ACTORS, US_MSG_STABLESESSION | required |
| REQ_ACTOR_CONTEXTACTIONS | Actor Node Context Menu | US_ACTOR_CONTEXTACTIONS | optional |
| REQ_ACTOR_FILES_TREE | Actor File Children | US_ACTOR_FILES_TREE | mandatory |
| REQ_ACTOR_TOUCHEDFILES | Recently Touched Files per Actor | US_ACTOR_TOUCHEDFILES | optional |
| REQ_ACTOR_ACTIVITY | Actor Activity Indicator | US_ACTOR_ACTIVITY | optional |
| REQ_ENG_ACTORLIST | Platform Actor List API | US_ACTOR_LISTTOOL | required |

### Conflicts Detected

- ⚠️ US_ACTOR_OPENYAML / US_ACTOR_OPENCONTEXT (L0) vs. the earlier `entity-tree-context-menu` decision (PM, 2026-07-02) that deliberately retired inline open icons in favour of file children and right-click Open.
  - Resolution (user): the two L0 stories are removed; `actor.yaml` and `context.md` are opened from US_ACTOR_FILES_TREE.
- ⚠️ `+` command wrote `summary: ""`/`agent: ""` always; the tool omitted blank fields.
  - Resolution: shared creation routine always writes `name`, `summary`, `agent` (`""` when absent), consistent with REQ_ACTOR_SCHEMA AC-2.

### Decisions

- `jarvis_listActors` responds with `{ "actors": [...] }` (was `"sessions"`) — user decision; callers are mainly Jarvis's own agents.
- `jarvis_createActor` messages use "actor": `"invalid actor name: …"`, `"actor \"<name>\" already exists; no action taken"` — user decision.
- The `${kind}` placeholder is removed from the init-prompt template; an old template using it shows `${kind}` literally (unknown-placeholder rule) — user decision.
- Actor tools (`createActor`, `listActors`, `whoAmI`) are registered whenever `jarvis.actors.folder` is resolvable; `jarvis.sessions.enabled` no longer gates them.
- Platform API `listJarvisSessions()` is replaced by `listActors()` (user decision a): consistent with the tool and the retired "Session" term; `kanban` and `syspilot` callers move with it.

### Horizontal Check (MECE)

MECE Engineer advisory on `b060839`..`178dff6`: **FAIL**. Actor slice
coherent (coverage, traceability, CREATE vs CREATETOOL consistent); live
REQs outside the Actor files still promised retired kinds. Dispositions
(user-approved, commit recording this section):

1. REQ_AUT_HEARTBEAT_RESOLVER_REUSE AC-3 → canonical destination set = chat session titles ∪ Actors; REQ_MSG_SENDMESSAGE AC-3/AC-6 and REQ_MSG_SENDER_ERROR AC-3 now point to it (they pointed to the inert REQ_MSG_SENDTOSESSION AC-5).
2. REQ_KAN_DISCOVER, REQ_KAN_UX AC-1/AC-6 → Actor-only; discovery via REQ_ENG_ACTORLIST.
3. REQ_DEV_ACTIVATION AC-1/AC-2 → `jarvisActors`; Actor scanner in boot order.
4. Engine kind machinery removed (user decision A): REQ_ENG_SCANNER and REQ_ENG_TREEFACTORY deleted; REQ_ENG_CONTRACT without `registerEntityKind`/`EntityKindConfig`, `version` 2; REQ_ENG_TOOLREGISTRY and REQ_ENG_TOOLNS cleaned. REQ_MOD_NOMIGRATION AC-1/AC-3 → Actor folders / `jarvis.actors.folder`.
5. REQ_CFG_RENAMES Project/Event rows removed; REQ_CFG_IGNOREPATTERNS AC-2 without `.jarvis/sessions/`.
6. REQ_MSG_AGENTSESSION removed (duplicate of REQ_ACTOR_OPENSESSION/INITPROMPT, `projects/<kebab-name>` path); REQ_MSG_EDITORPLACEMENT AC-1/AC-2 → ACTORS tree, REQ_ACTOR_FILES_TREE; REQ_MSG_LISTSESSIONS AC-1 note fixed.
7. See 1.
8. Collapse All for ACTORS only in REQ_ACTOR_TREE AC-9; REQ_EXP_TREEVIEW AC-6 covers the other views.
9. Stale UAT contracts (user decision B): US_UAT_INJECTPROMPT, US_UAT_KANBAN, US_UAT_LISTSESSIONS_SWAP, US_UAT_SAFE_SEND_UNION, US_UAT_HEARTBEAT_DEST_VALID and their REQ files removed (L2 specs in the L2 pass).

Remaining, accepted: recorder REQs marked "not in force"; US_PIM_CATEGORIES wording ("by project or event") and US_UAT_TASKS belong to the separate PIM change.

MECE re-check on `139a389`: **FAIL**, two findings. Dispositions:

1. Injection ported to Actor-only (same principle as the rest of the change, no new decision): US_INJ_INJECT AC-1/2/4/5/7, REQ_INJ_PRIMITIVE AC-1/2/3/4/9, REQ_INJ_TOOL AC-2/4/5, REQ_INJ_COMMAND AC-2/3. Resolution via kindless Actor discovery (REQ_ACTOR_SCHEMA AC-7); init prompt and mode priming via REQ_ACTOR_INITPROMPT.
2. Literal references to deleted IDs retargeted: REQ_MSG_EXPLORER AC-5 → REQ_ACTOR_TREE AC-10; REQ_MSG_SEND AC-8 → REQ_ACTOR_INITPROMPT AC-5; REQ_MSG_EDITORPLACEMENT AC-13 → REQ_ACTOR_OPENSESSION AC-3; REQ_MSG_NOTIFICATION_TEMPLATE AC-9 → REQ_ACTOR_INITPROMPT AC-3; REQ_HOOK_INTAKE AC-9 → REQ_ACTOR_WHOAMI AC-7.

Found by the same sweep (every US_/REQ_ token in L0/L1 checked against the defined IDs): US_MSG_SAFE_SEND AC-6 said "sessions, projects, events", now says Actor names. US_UAT_FLOW / REQ_UAT_FLOW AC-4 claimed coverage by the deleted US_UAT_MODULAR_INSTALL / US_UAT_CHATEDITORREUSE; that coverage is now stated as open and is decided by the UAT redesign (#40). The sweep now finds no dead IDs. Not yet swept: SPEC_ IDs cited in L1 text (e.g. REQ_ACTOR_INITPROMPT AC-1 → SPEC_ENT_AGENTSESSION_INITPROMPT); these are retargeted in the L2 pass.

MECE re-check on `49aeb16`: **FAIL**, two findings. Dispositions:

1. Session creation had two owners (REQ_ACTOR_OPENSESSION AC-3 and REQ_INJ_PRIMITIVE AC-4). The code already has one: `jarvis.openAgentSession` only calls `injectPrompt(name, '', { placement: 'main' })` (`extension.ts`), and `injectPrompt.ts` alone primes, renames and sends the init prompt. The REQs now say so: OPENSESSION AC-2/AC-3 delegate to the primitive; INITPROMPT AC-5 names the primitive's new-session branch as the only sender, reached by every creating path; INJ_PRIMITIVE AC-4 states it; EDITORPLACEMENT AC-13 → REQ_INJ_PRIMITIVE AC-4.
2. Ambiguous Actor name: REQ_INJ_PRIMITIVE AC-2 now rejects multiple matches with a user-visible error and never picks one, the same no-guess rule as REQ_ACTOR_WHOAMI AC-8. This changes behaviour: the code currently takes the first match (`_scanner.entities.find`), so it is implementation work.

Also fixed: 17 literal `\uXXXX` escapes that my L1 commits wrote into `req_actor.rst` and `req_eng.rst`; the HTML showed them as text. Older ones in `spec_cfg`, `spec_exp` and `spec_msg` are left for the L2 pass.

L2 notes: `InjectPromptOptions.skipInitPrompt` has no caller; `injectPrompt` reapplies agent mode on existing sessions (`_reapplyAgentMode`). Check both against REQ_INJ_PRIMITIVE AC-8 and REQ_ACTOR_INITPROMPT AC-6.

MECE re-check on `59fba21`: **PASS**. No active retired-kind paths or removed REQ IDs remain in L1; implementation parity is outside that review.

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed with the user; MECE L2 PASS on `259809f`

### Impacted Design Elements

Found via links from Requirements above and by a content sweep (retired-kind terms and every `US_`/`REQ_`/`SPEC_` token checked against the defined IDs).

| ID / file | Impact | Notes |
|-----------|--------|-------|
| `spec_act.rst`, `spec_ent.rst`, `spec_prj.rst`, `spec_evt.rst` | removed | Actor parts ported to `spec_actor.rst`; the rest belonged to removed REQs. |
| SPEC_HOOK_ACTIVITY | moved | → SPEC_ACTOR_ACTIVITY (no decorator; the provider sets the icon). |
| SPEC_ENG_API | modified | `version: 2`; kind registration, decorators, scanner queries, `listJarvisSessions`, `rescan`, `refreshKind`, `openActorSession`, `getTreeDataProvider` and filter methods removed; `listActors()` added. |
| SPEC_ENG_REGISTER_KIND, SPEC_ENG_SCANNER, SPEC_ENG_TREEFACTORY, SPEC_ENG_SESSIONLIST | removed | Kind machinery (decision A); SESSIONLIST → SPEC_ENG_ACTORLIST. |
| SPEC_ENG_TOOLREGISTRY, SPEC_ENG_HEARTBEAT_JOBAPI | modified | Version-1 and kind references removed. |
| SPEC_EXP_EXTENSION, SPEC_EXP_COLLAPSEALL | modified | The current views only; the boot order is single-sourced in SPEC_DEV_ACTIVATION. |
| SPEC_EXP_HEARTBEAT_OPENFILE, SPEC_EXP_MESSAGE_OPENFILE | modified | Fixed paths from the central resolver (as REQ_EXP_* at L1). |
| SPEC_EXP_PROVIDER, SPEC_EXP_UNIFIEDTREE, SPEC_EXP_SEARCH_*, SPEC_EXP_FEATURETOGGLE, SPEC_EXP_TASKTREE, SPEC_EXP_RESCANBRIDGE | removed | REQs removed at L1; the rescan bridge was replaced by the scanner timer. |
| SPEC_INJ_INJECT, SPEC_INJ_TOOL, SPEC_INJ_COMMAND | modified | Actor resolution via `resolveName`, ambiguity error, single init-prompt owner, `skipInitPrompt` removed. |
| SPEC_MSG_SENDCOMMAND, AUTODELIVER_POLL, EDITORPLACEMENT, OPENCHAT, SENDPROMPT, NOTIFICATION_RESOLVE, SENDMESSAGE, TREEPROVIDER, PINNED | modified | Actor wording and links; `openAtDocs` preview option; the destination source is the Actor scanner. |
| SPEC_MSG_JARVISSESSIONS, SPEC_MSG_AGENTSESSION | removed | REQs removed at L1. |
| SPEC_KAN_DISCOVER, SPEC_KAN_UX, SPEC_KAN_CREATE | modified | Discovery via `listActors()` with no decorator; no inline button; "Add Kanban Board" on `jarvisActor`. |
| SPEC_KAN_VERIFY/OPEN/UPDATE/ADD/DELETE/LIST/FIELDS/FILEOPEN/SKILLCONTENT | links | → SPEC_ACTOR_WHOAMI / SPEC_ACTOR_FILES; Actor wording. |
| SPEC_CFG_MANIFEST, PATHRESOLVER, TOGGLEGUARDS, VIEWGATING, WORKSPACEFILES, IGNOREMANAGER | modified | Shipped core groups; `getActorsDir()` resolves `jarvis.actors.folder`; `.jarvis/sessions/` and the Projects/Events blocks removed. |
| SPEC_CFG_DEFAULTPATHS | removed | REQ removed at L1. |
| SPEC_AUT_HEARTBEAT_LOAD_VALIDATION, SPEC_AUT_HEARTBEAT_RESOLVER_REUSE | modified | Destination source: the Actor scanner; ambiguous names are invalid. |
| SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR, SPEC_AUT_REGISTERJOB_VALIDATION | modified | Fire-time and `registerJob` validation use `getValidDestinations(actorScanner)` instead of chat titles (MECE L2 finding 7). |
| SPEC_DEV_ACTIVATION, SPEC_DEV_DISPOSAL, SPEC_DEV_LOGCHANNEL | modified | Actor boot order (the single statement), disposables, logging. |
| SPEC_MOD_PIM_PKG, SPEC_MOD_REC_PKG, SPEC_MOD_SPL_PKG, SPEC_SPL_ACTOR | modified | No kinds; version 2; `listActors()`. |
| SPEC_PIM_OPENACTORSESSION, SPEC_OLK_AUTOCAT_NEWENTITY | removed | Their Project/Event creation commands are gone. |
| `spec_rec.rst` | note | Not in force (as at L1); builds on API v2 without decorator/`getEntity`/`refreshKind`. |
| 40 `spec_uat_*` files | removed | L2 of UAT stories removed at L0/L1, plus `spec_uat_actor_*` (user decision) and `spec_uat_explorer` (Project/Event test data). |
| SPEC_UAT_JOBREG_PROCEDURES, KAN_UPDATE_VALID, AGENT_PROMPT_SCENARIOS, TASKS_FILES, FLOW_PROCEDURES, sessiontools, outlookcategories | modified | Follow L1; coverage that belonged to removed UATs is stated as open (#40). |
| SPEC_UAT_MSG_FILES, HEARTBEAT_FILES, MSG_AUTODELIVERY_SCENARIOS, REMINDERS_SCENARIOS, MCPSERVER_FILES, MSG_LOGGING_FILES, AGENT_PROMPT_SCENARIOS | modified | Actor fixtures `TestTarget`/`TestSender`/`TestSession`; current messaging tools (MECE L2 finding 8). |
| SPEC_SPL_* (`spec_spl.rst`) | fixed | Dead reference SPEC_MSG_REMINDERS_POLL → SPEC_MSG_REMINDERSLOOP. |

### New Design Elements

| ID | Title | Links (REQ) |
|----|-------|-------------|
| SPEC_ACTOR_SCANNER | Actor Scanner | REQ_ACTOR_SCHEMA, ACTIVATION, TREE; REQ_EXP_REACTIVECACHE; REQ_CFG_SCANINTERVAL |
| SPEC_ACTOR_SCHEMA | Actor Schema | REQ_ACTOR_SCHEMA |
| SPEC_ACTOR_TREE | ACTORS Tree Provider | REQ_ACTOR_TREE; REQ_EXP_TREEVIEW |
| SPEC_ACTOR_FILES | Actor File Children | REQ_ACTOR_FILES_TREE |
| SPEC_ACTOR_TOUCHEDFILES | Recently Touched Files per Actor | REQ_ACTOR_TOUCHEDFILES |
| SPEC_ACTOR_ACTIVITY | Actor Activity Indicator | REQ_ACTOR_ACTIVITY |
| SPEC_ACTOR_CONTEXTMENU | Actor Context Menus | REQ_ACTOR_CONTEXTACTIONS, FILES_TREE, TOUCHEDFILES |
| SPEC_ACTOR_CREATE | Actor Creation | REQ_ACTOR_CREATE, CREATETOOL, SCHEMA |
| SPEC_ACTOR_CREATETOOL | jarvis_createActor Tool | REQ_ACTOR_CREATETOOL |
| SPEC_ACTOR_LISTTOOL | jarvis_listActors Tool | REQ_ACTOR_LISTTOOL |
| SPEC_ACTOR_WHOAMI | jarvis_whoAmI Tool | REQ_ACTOR_WHOAMI, BINDING |
| SPEC_ACTOR_AGENT_DISCOVERY | Agent Discovery and Picker | REQ_ACTOR_AGENT_DISCOVERY, CREATE, CREATETOOL, FILES_TREE |
| SPEC_ACTOR_OPENSESSION | Open Actor Session Command | REQ_ACTOR_OPENSESSION |
| SPEC_ACTOR_INITPROMPT | Actor Session Initialization Prompt | REQ_ACTOR_INITPROMPT |
| SPEC_ENG_ACTORLIST | Platform Actor List API | REQ_ENG_ACTORLIST |

### Conflicts Detected

- ⚠️ SPEC_EXP_EXTENSION and SPEC_DEV_ACTIVATION both described the boot order.
  - Resolution: SPEC_DEV_ACTIVATION is the single statement; SPEC_EXP_EXTENSION only references it.
- ⚠️ REQ_ACTOR_AGENT_DISCOVERY AC-6 (no persistent cache) vs the code's module-level `getAgentModesCached`.
  - Resolution: SPEC_ACTOR_FILES and SPEC_ACTOR_AGENT_DISCOVERY drop the cache; this is implementation work.
- ⚠️ `reapplyAgentMode` on existing sessions vs REQ_ACTOR_INITPROMPT AC-6 (the mode is not changed afterwards).
  - Resolution (MECE L2 finding 2, user decision): the re-apply is intentional. VS Code can drop the Actor mode, so Jarvis resets the bound agent every time it opens or delivers into an existing session, even if the user switched modes on purpose. AC-6 is reworded to say so; Jarvis never selects any other mode.
- ⚠️ `configPaths.getActorsDir()` returned a fixed `.jarvis/actors` while `jarvis.actors.folder` is a setting (REQ_CFG_FOLDERPATHS).
  - Resolution: SPEC_CFG_PATHRESOLVER makes `getActorsDir()` resolve the setting and replaces `resolveActorsFolder()` in `extension.ts`.
- ⚠️ Deleting the kanban and modular-install UATs (decision B / L0) removed coverage that `spec_uat_kanban_update_valid` (BC-3) and `spec_uat_flow` relied on.
  - Resolution: stated as open, decided by the UAT redesign (#40).

### Implementation-facing removal list

Artefacts the specs no longer contain. The class (a)/(b)/(c) grep results are filled in by the Final Consistency Check.

- **Settings:** `jarvis.sessions.enabled`; PIM `jarvis.projects.enabled`/`.folder` and `jarvis.events.enabled`/`.folder`.
- **Views:** `jarvisEntities`.
- **Commands:** legacy `jarvis.newActor`; `jarvis.newEntity`; `jarvis.searchEntities`; `jarvis.migrateSessionToActor`; `jarvis.copyCategoryName`; PIM `jarvis.newProject`, `jarvis.newEvent` and the filter commands.
- **Renames:** `jarvis.openAgentSession` → `jarvis.openActorSession`, `jarvis.newActorSimple` → `jarvis.newActor`, `jarvis.openEntityFile` → `jarvis.openActorFile`, `jarvisEntityFile*` → `jarvisActorFile*`.
- **Tools:** `jarvis_pim_listProjects`, `jarvis_pim_listEvents`, `jarvis_pim_createProject`, `jarvis_pim_createEvent`.
- **API members:** `registerEntityKind`, `registerDecorator`, `getTreeForKind`, `getEntity`, `listJarvisSessions`, `rescan`, `refreshKind`, `openActorSession`, `getTreeDataProvider`, hidden-folder/future filter methods; types `EntityEntry`, `JarvisSession`, `TreeNode`, `SubtreeNode`, `EntityKindConfig`, `TreeItemDecorator`.
- **Code modules:**
  - `engine/core/treeFactory.ts`, `engine/core/unifiedEntityTreeProvider.ts`, `engine/sessions/yamlScanner.ts`
  - `engine/hooks/activityDecorator.ts`, `createActorEntitySource`, `resolveTouchStorageKind`
  - `configPaths.getSessionsDir`/`ensureSessionsDir`, `syncRescanJob`, `InjectPromptOptions.skipInitPrompt`, `getAgentModesCached`
  - PIM `projectKind.ts`, `eventKind.ts`, task badge decorator
  - the kanban decorator; the recorder decorator/`getEntity`/`refreshKind` use
- **Schemas:** `session.schema.json` (core and root copy), PIM `project.schema.json`/`event.schema.json` and their `yamlValidation` entries.
- **Heartbeat:** the "Jarvis: Rescan" job (removed from existing `heartbeat.yaml` at heartbeat start).
- **Scanner / resolver:** `ActorScanner.findByName` (replaced by `resolveName`); `getAllSessions`/`filterNamedSessions` in the heartbeat validators.
- **Test data:** `testdata/sessions-engine-test/TestSession/session.yaml`. The Actor fixtures `TestTarget`, `TestSender` and `TestSession` are to be added under `testdata/.jarvis/actors/`, and the queue steps in `testdata/heartbeat/heartbeat.yaml` retargeted from `Test Session` to `TestTarget` (SPEC_UAT_MSG_FILES, SPEC_UAT_HEARTBEAT_FILES).

### Decisions

- The Actor code from Phase 1 (`engine/actors/`) had no L2 specs. A new `spec_actor.rst` specifies it with one spec per responsibility, ported from SPEC_ACT_*/SPEC_ENT_*. `spec_act`, `spec_ent`, `spec_prj` and `spec_evt` are removed.
- File children, touched files and the activity indicator live in `ActorTreeProvider` (`engine/actors/`). The generic tree factory, decorator API and `getTreeDataProvider` go with the kind machinery; no generic extension point replaces them (user decision).
- "Entity" is dropped as a name, including in code and command IDs, because it only exists at L2 and would leave readers asking what an entity is (user decision):
  - `jarvis.openEntityFile` → `jarvis.openActorFile`
  - contextValues `jarvisEntityFile*` → `jarvisActorFile*`
  - `jarvis.openAgentSession` → `jarvis.openActorSession`
  - `jarvis.newActorSimple` → `jarvis.newActor` (the legacy `jarvis.newActor` is removed)
  - L0/L1 wording was aligned in the same step.
- There is no manifest spec. Each spec states its own `package.json` contributions; what is removed is recorded in this CD (Artefakt-Removal-Check), because specs describe what is (user decision).
- REQ_EXP_REACTIVECACHE AC-2 (scan only while the view is visible) is removed; AC numbers are kept. The code never gated on visibility. The Actor cache is also the destination list for messages, heartbeat and reminders, so a paused scan would reject a manually added Actor until the view is opened (user decision).
- The decorator API is also used by kanban and the recorder, but neither use survives. Kanban's `,kanban` contextValue marker is read by no when-clause, so it is dead code. The recorder decorates only Project/Event nodes, and its tree-node requirements are "not in force". The decision to remove the decorator API holds.
- The periodic Actor rescan becomes an internal `setInterval` owned by `ActorScanner` and is no longer the heartbeat job "Jarvis: Rescan" (user decision, taken into this change). It is hidden from the user and keeps running when `jarvis.heartbeat.enabled` is off; previously the Actor list went stale in that case. A leftover "Jarvis: Rescan" entry in `heartbeat.yaml` is removed when the heartbeat feature starts. Changes at L0/L1:
  - US_ACTOR_TREE AC-7, REQ_ACTOR_TREE AC-7
  - REQ_CFG_SCANINTERVAL (AC-2/3 rewritten, AC-4/5 new, now approved)
  - REQ_REC_WATCHERJOB AC-1: its schedule is now derived from `jarvis.scanInterval` directly
  - US_UAT_JOBREG and REQ_UAT_JOBREG: T-14 to T-16 now use `jarvis_registerJob` instead of the rescan job as the test vehicle
  - At L2, SPEC_EXP_RESCANBRIDGE is replaced by the timer in SPEC_ACTOR_SCANNER.
- The kanban inline board button (REQ_KAN_UX AC-1..3, US_KAN_DISCOVER AC-3/4) is dropped; AC numbers are kept (user decision). It was never contributed: the decorator set a `,kanban` contextValue marker that no menu read. An add-on can no longer mark individual Actor nodes, and a board is already opened from the Actor's "Files" category (REQ_KAN_FILEOPEN) or the palette. "Add Kanban Board" (AC-6) remains; the kanban decorator is removed.
- REQ_CFG_GROUPS / US_CFG_GROUPS are aligned with the groups that ship (user decision):
  - core, in this order: Actors, Messages, Prompt Templates, Heartbeat, Reminders, Gitignore, Updates, Hooks; each add-on contributes its own groups.
  - `jarvis.scanInterval` moves from Heartbeat to Actors, because it is the Actor scan now.
  - The init template stays in Prompt Templates, so REQ_ACTOR_INITPROMPT AC-1 now says so.
  - The requirement had prescribed nine groups that never matched the shipped manifest.

### Horizontal Check (MECE)

MECE L2 review on `e8e3852`: **FAIL**, six findings. Dispositions:

1. Messages to plain chat titles could be queued but not delivered, because the primitive resolves Actors only. **User decision:** destinations and senders are Actors only.
   - L0: US_MSG_SAFE_SEND AC-6, US_MSG_SENDER_REQUIRED AC-2, US_AUT (heartbeat) wording
   - L1: REQ_AUT_HEARTBEAT_RESOLVER_REUSE AC-3, REQ_MSG_SENDMESSAGE, REQ_MSG_DEST_ERROR AC-3/4, REQ_MSG_SENDER_ERROR AC-2
   - L2: `getValidDestinations()` returns Actor names only and no longer reads `state.vscdb`
   - A chat session that is not an Actor can no longer send messages.
2. Mode re-apply on existing sessions: see Conflicts. REQ_ACTOR_INITPROMPT AC-6 is reworded and SPEC_MSG aligned (user decision).
3. SPEC_MSG_AUTODELIVER_POLL: the obsolete direct-creation prose is removed. SPEC_MSG_OPENCHAT now names `injectPrompt` step 3b as its only caller.
4. Touched-file key / duplicate names. **User decision:** Actor names must be unique; REQ_ACTOR_SCHEMA AC-7 is reworded (a duplicate is a misconfiguration; name-based functions refuse it; the view still shows both folders). `actor-<name>.json` stays.
   - Accepted gap (user decision): a hand-written name with characters that are illegal in a file name cannot be stored; the write fails and is not specially handled.
5. SPEC_MSG_LISTSESSIONS and SPEC_KAN_MODULE summaries aligned.
6. SPEC_UAT_AGENT_PROMPT_SCENARIOS: T-1..T-6 and T-14 are marked retired (not to be run; replacement #40).

MECE L2 re-check on `2cfc630`: **FAIL**. Findings 1–3, 5 and 6 are confirmed as fixed; two new findings. Dispositions:

7. The duplicate-name refusal (REQ_ACTOR_SCHEMA AC-7) did not reach every name-based consumer. `jarvis_sendMessage` tested membership only, and Kanban owner resolution only handled "not found".
   - Fix: `ActorScanner.resolveName()` (`found` / `unknown` / `ambiguous`) is the one unique-name rule in core, together with `ambiguousActorMessage()`.
   - Its core callers are `injectPrompt`, `whoAmI`, touched files and `jarvis_sendMessage` (destination and sender). `findByName` is removed.
   - `getValidDestinations()` leaves out ambiguous names, so the heartbeat validators refuse them without a check of their own.
   - Kanban sees only `listActors()` and requires exactly one match; otherwise it returns `actor unknown`. No API member was added for this, because the rule is a count over data the add-on already has.
   - L1: REQ_ACTOR_SCHEMA AC-7 names the consumers; REQ_KAN_CREATE AC-4 drops the "entities in the scanner" wording.
   - Also fixed: SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR and SPEC_AUT_REGISTERJOB_VALIDATION still read chat titles (`getAllSessions`); they now use `getValidDestinations(actorScanner)`.
   - Also fixed: SPEC_ENG_API used the type name `ActorInfo`, but the approved REQ_ENG_ACTORLIST AC-1 says `JarvisActor`. The spec now follows the REQ.
8. Active messaging UATs addressed plain chat titles or used the disabled `jarvis_sendToSession`/`jarvis_readMessage`.
   - Fix: SPEC_UAT_MSG_FILES defines Actor fixtures under `testdata/.jarvis/actors/` (`TestTarget`, `TestSender`, `TestSession`), each name carried by exactly one Actor. The legacy `testdata/sessions-engine-test/TestSession/session.yaml` is to be removed during implementation (see 8c).
   - Heartbeat, message-queue, auto-delivery, reminders, notification-template, MCP and message-logging procedures now address those Actors and use `jarvis_sendMessage`/`jarvis_receiveMessage`.
   - T-15 now uses the existing `Test Manager` Actor as its second sender instead of `Project Manager`, which has no fixture.
   - SPEC_UAT_AGENT_PROMPT_SCENARIOS T-12 now lists only `${name}`/`${contextPath}` (SPEC_ACTOR_INITPROMPT AC-1).
   - L0/L1: US_UAT_MSG, US_UAT_MSG_AUTODELIVERY, US_UAT_REMINDERS, US_UAT_MCPSERVER, US_UAT_MSG_LOGGING, US_UAT_APT_NOTIFICATION wording; REQ_UAT_MSG_TESTDATA AC-1 and new AC-4 (every addressed name is an Actor fixture); REQ_UAT_REMINDERS_TESTENV AC-1/4, REQ_UAT_MSG_AUTODELIVERY_TESTDATA AC-1, REQ_UAT_MCPSERVER_TESTDATA AC-1, REQ_UAT_MSG_LOGGING_TESTDATA AC-1, REQ_UAT_APT_NOTIFICATION test data.
   - Also fixed: literal `\n` escapes in the SPEC_UAT_MSG_AUTODELIVERY_SCENARIOS setup, and the dead reference `SPEC_MSG_REMINDERS_POLL` in `spec_spl.rst` (it should be SPEC_MSG_REMINDERSLOOP).

Open, not part of this change (predates the branch; a separate cleanup):
- Literal `\u2014`/`\u00b7` escapes remain in `spec_cfg.rst` (1), `spec_kan.rst` (1) and `spec_msg.rst` (8). MECE classifies them as an authoring cleanup, not a contract conflict.

MECE L2 re-check on `6bd897c`: **FAIL**. Finding 7 PASS; finding 8 partial. Dispositions:

8a. The US_UAT_MSG / SPEC_UAT_MSG_FILES contradiction (T-6 expects `jarvis_readMessage` to return a message, T-12 expects the hard-deprecation error) is fixed in this change instead of staying open. T-6 is retired, T-10 carries the read expectation itself, and US_UAT_MSG AC-6 now tests `jarvis_receiveMessage` on its own.
8b. SPEC_UAT_HEARTBEAT T-19 now inspects `TestTarget`.
8c. SPEC_UAT_MSG_FILES and SPEC_UAT_HEARTBEAT_FILES now state the fixtures as required test data (SHALL), and say that the fixtures are still missing, the legacy `session.yaml` is still present and `heartbeat.yaml` still targets `Test Session`. All three are implementation work (removal list).
- Kanban `actor unknown` for an ambiguous name is kept. MECE suggested a distinct error as clearer but not blocking; a distinct error would change REQ_KAN_CREATE AC-5 and the skill text, and a duplicate name is a misconfiguration the ACTORS view already shows.

MECE L2 re-check on `259809f`: **PASS**. Finding 8 is closed at specification level. The one remaining CD sentence that said the legacy `session.yaml` "is removed" now says it is to be removed during implementation.

- [x] No contradictions with existing Designs (MECE PASS on `259809f`)
- [x] All new SPECs link to Requirements

After the PASS, every element that this change created or reopened is set to `approved`, 39 in all:
- the 14 SPEC_ACTOR_* specs and SPEC_ENG_ACTORLIST;
- SPEC_ENG_API, SPEC_EXP_EXTENSION/COLLAPSEALL/HEARTBEAT_OPENFILE/MESSAGE_OPENFILE, SPEC_CFG_MANIFEST/PATHRESOLVER, SPEC_DEV_ACTIVATION, SPEC_MOD_PIM_PKG, SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR/REGISTERJOB_VALIDATION;
- the messaging UAT specs (SPEC_UAT_MSG_FILES, HEARTBEAT_FILES, MSG_AUTODELIVERY_SCENARIOS, REMINDERS_SCENARIOS, MCPSERVER_FILES, AGENT_PROMPT_SCENARIOS);
- REQ_ACTOR_SCHEMA, REQ_UAT_MSG_TESTDATA/REMINDERS_TESTENV/MSG_AUTODELIVERY_TESTDATA/MCPSERVER_TESTDATA/APT_NOTIFICATION, and US_UAT_MSG.

Elements that were already `draft` before this branch keep their status even where this change edited them, for example SPEC_INJ_*, SPEC_KAN_*, SPEC_MSG_SENDMESSAGE, REQ_KAN_*, REQ_MSG_* and SPEC_UAT_MSG_LOGGING_FILES. Their approval belongs to the change that opened them.

---

## Final Consistency Check

**Status**: ✅ passed (design level; class (a) code references are implementation work)

### Traceability Verification

Checked on the built `needs.json` (103 US, 243 REQ, 221 SPEC): every SPEC links to a REQ, every REQ is covered by a SPEC, and every US is covered by a REQ. The only REQ without a US link is REQ_SPL_STATE (draft). It is unchanged since before this branch and is outside this change. Strict Sphinx build green; dead-ID sweep clean, except for the deliberate mention of the removed REQ_UAT_APT_INITPROMPT.

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACTOR_ACTORS | REQ_ACTOR_SCHEMA, ACTIVATION, BINDING, INITPROMPT; REQ_CFG_FOLDERPATHS; REQ_SPL_ACTOR | SPEC_ACTOR_SCANNER, SCHEMA, CREATE, INITPROMPT, WHOAMI; SPEC_CFG_MANIFEST, PATHRESOLVER; SPEC_MSG_SENDMESSAGE, SENDCOMMAND, AUTODELIVER_POLL; SPEC_SPL_ACTOR | ✅ |
| US_ACTOR_TREE | REQ_ACTOR_TREE, OPENSESSION; REQ_CFG_FOLDERPATHS, SCANINTERVAL | SPEC_ACTOR_TREE, SCANNER, OPENSESSION; SPEC_CFG_*; SPEC_EXP_EXTENSION | ✅ |
| US_ACTOR_CREATE | REQ_ACTOR_CREATE, AGENT_DISCOVERY | SPEC_ACTOR_CREATE, AGENT_DISCOVERY | ✅ |
| US_ACTOR_CREATETOOL | REQ_ACTOR_CREATETOOL, AGENT_DISCOVERY | SPEC_ACTOR_CREATETOOL, CREATE, AGENT_DISCOVERY | ✅ |
| US_ACTOR_LISTTOOL | REQ_ACTOR_LISTTOOL; REQ_ENG_ACTORLIST | SPEC_ACTOR_LISTTOOL; SPEC_ENG_ACTORLIST, API | ✅ |
| US_ACTOR_WHOAMI | REQ_ACTOR_WHOAMI | SPEC_ACTOR_WHOAMI | ✅ |
| US_ACTOR_FILES_TREE | REQ_ACTOR_FILES_TREE, AGENT_DISCOVERY | SPEC_ACTOR_FILES, CONTEXTMENU, AGENT_DISCOVERY | ✅ |
| US_ACTOR_TOUCHEDFILES | REQ_ACTOR_TOUCHEDFILES | SPEC_ACTOR_TOUCHEDFILES, CONTEXTMENU | ✅ |
| US_ACTOR_ACTIVITY | REQ_ACTOR_ACTIVITY | SPEC_ACTOR_ACTIVITY | ✅ |
| US_ACTOR_CONTEXTACTIONS | REQ_ACTOR_CONTEXTACTIONS, OPENSESSION | SPEC_ACTOR_CONTEXTMENU, OPENSESSION | ✅ |
| US_UAT_MSG (+ messaging UATs) | REQ_UAT_MSG_TESTDATA and the UAT test-data REQs | SPEC_UAT_MSG_FILES and the messaging UAT specs | ✅ |

### Artefakt-Removal-Check

The grep is case-sensitive and runs over three groups:
- class (a): `packages/`, `src/`, `schemas/`, `testdata/`, `.github/` and `package.json`, without build output;
- class (b): the active specs plus `README.md`, `docs/index.rst` and `docs/namingconventions.rst`;
- class (c): `docs/changes/**`, without this CD.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| Settings `jarvis.sessions.enabled`, `jarvis.projects.enabled`/`.folder`, `jarvis.events.enabled`/`.folder` | 1 / 3 / 6 / 4 / 4 files, including `testdata/test.code-workspace`; open, implementation | none | 25 / 4 / 2 / 6 / 1 |
| View `jarvisEntities` | 6 files; open | spec_exp AC-1 only, as a statement that the view is not contributed (intended) | 3 |
| Commands `jarvis.newEntity`, `searchEntities`, `migrateSessionToActor`, `copyCategoryName`, `newProject`, `newEvent` | 2 / 2 / 2 / 5 / 2 / 2 files; open | none | 6 / 3 / 2 / 1 / 10 / 9 |
| Renames `jarvis.openAgentSession`, `newActorSimple`, `openEntityFile`, `jarvisEntityFile*` | 11 / 3 / 7 / 6 files; open | none | 26 / 1 / 6 / 8 |
| PIM tools `jarvis_pim_listProjects`/`listEvents`/`createProject`/`createEvent` | 3 / 2 / 2 / 2 files; open | none | 1 / 0 / 0 / 0 |
| API members `registerEntityKind`, `registerDecorator`, `getTreeForKind`, `getEntity`, `listJarvisSessions`, `refreshKind`, `getTreeDataProvider` | 6–13 files each; open | Only the removal ACs (REQ_ENG_CONTRACT AC-2/3, REQ_ENG_ACTORLIST AC-5, SPEC_ENG_API AC-4, SPEC_ENG_ACTORLIST AC-4) and the spec_rec "not in force" note (intended) | 0–8 each |
| Types `EntityEntry`, `JarvisSession`, `EntityKindConfig`, `TreeItemDecorator` | 6 / 8 / 14 / 9 files; open | Only the same removal ACs (intended) | 12 / 7 / 5 / 1 |
| Modules `treeFactory`, `unifiedEntityTreeProvider`, `yamlScanner`, `activityDecorator`, `projectKind`, `eventKind` | 12 / 1 / 15 / 1 / 3 / 3 files; open | Fixed here: spec_msg (`yamlScanner.ts` → `actorScanner.ts`) | 22 / 4 / 29 / 2 / 1 / 1 |
| Helpers `createActorEntitySource`, `resolveTouchStorageKind`, `getSessionsDir`/`ensureSessionsDir`, `syncRescanJob`, `skipInitPrompt`, `getAgentModesCached` | 1–4 files each; open | Only "is removed" statements in spec_actor, spec_cfg and spec_inj (intended). Fixed here: the `syncRescanJob()` analogies in spec_pim and spec_rec | 0–7 each |
| Scanner `findByName` | 0 | 0 | 0 |
| Schemas `session.schema.json`, `project.schema.json`, `event.schema.json` | 3 / 1 / 1 files; open | Fixed here: spec_kan (the pattern reference is now `actor.schema.json`) | 3 / 4 / 4 |
| Heartbeat job "Jarvis: Rescan" | 4 files; open | Intended: the leftover-cleanup requirement, specs and UAT (REQ_CFG_SCANINTERVAL AC-5, SPEC_DEV_ACTIVATION, SPEC_ACTOR_SCANNER, heartbeat UAT T-14..T-18), plus the `jarvis.rescan` command title "Jarvis: Rescan" | 4 |
| Test data `sessions-engine-test/TestSession/session.yaml`; old `Test Session` queue targets in `testdata/heartbeat/heartbeat.yaml` | present; open | Only as "to be removed / retargeted" in SPEC_UAT_MSG_FILES and SPEC_UAT_HEARTBEAT_FILES (intended) | — |

- [ ] All class (a) active code/workflow references fixed in this CR. Open: the design phase changes docs only, and the implementation removes these references (implementation-facing removal list above).
- [x] All class (b) active documentation references fixed in this CR. What remains states the removal or the leftover cleanup on purpose.
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: literal `\u2014`/`\u00b7` escapes in `spec_cfg.rst` (1), `spec_kan.rst` (1) and `spec_msg.rst` (8). They predate this branch and are an authoring cleanup, not a contract conflict (MECE); they are outside this change.
- [ ] Issue 2: REQ_SPL_STATE has no US link. It predates this branch and is outside this change.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-09-27
**Trigger:** CM-triggered targeted check (CM dispatch citing VE's FAILED validation report, `val-retire-legacy-actor-kinds.md` @ `a07969e`)
**Method:** Independent verification, not acceptance of VE's classifications at face value — direct source/spec inspection by QM plus scoped sub-agent dispatch: MECE Engineer (three separate invocations, L0/L1/L2) and Trace Engineer (one invocation), each limited to the elements this CD declares. QM independently re-ran the full `compile all` build (PASS, matches VE); QM did not independently re-run the full Vitest/lint/Sphinx suite, relying instead on direct inspection of every source file and specification passage VE and the sub-agents cited, all of which were confirmed accurate on inspection.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L0 | US_ACTOR_TREE, US_MSG_STABLESESSION | CD's Modified User Stories table lists each of these IDs twice (separate rows with different notes). MECE Engineer (L0 invocation) confirms: entries are compatible but not mutually exclusive. Recommend consolidating into one row per ID. QM-discovered; not in VE's report. | low |
| 2 | L0 / L1 / L2 (spec gap) | US_ACTOR_ACTORS AC-1; US_ACTOR_CREATE AC-2; REQ_ACTOR_CREATE AC-3; REQ_ACTOR_CREATETOOL AC-7; REQ_ACTOR_SCHEMA AC-7; SPEC_ACTOR_CREATE AC-3; SPEC_ACTOR_CREATETOOL step 4; SPEC_ACTOR_SCANNER | No specification level ever requires a creation-time scanner-wide YAML-`name` uniqueness check. Every creation-path AC at every level checks only target-folder-path existence (`<actorsFolder>/<name>` does not exist). REQ_ACTOR_SCHEMA AC-7 declares names "SHALL be unique" as a general invariant, and the design-phase MECE Finding 7 fix (recorded elsewhere in this CD) closed the gap for *read/refusal* consumers (touched files, `injectPrompt`, `whoAmI`, `jarvis_sendMessage`, Kanban owner resolution) — but never for the creation path that lets a duplicate come into existence in the first place. Independently confirmed by QM direct inspection, MECE Engineer (all three L0/L1/L2 invocations), and Trace Engineer. **Root cause: specification gap, not implementation slip** — `packages/core/src/extension.ts` `jarvis.newActor` and `actorRuntime.ts` faithfully implement exactly what SPEC_ACTOR_CREATE/SPEC_ACTOR_CREATETOOL specify. VE's Issue 2 attributes this to code; QM's independent assessment is that System Designer must first add an explicit pre-write `ActorScanner.resolveName()` check to the creation specs (and a corresponding AC on REQ_ACTOR_CREATE/REQ_ACTOR_CREATETOOL) before Dev Engineer can correctly re-implement it. | high |
| 3 | Code (implementation) | REQ_KAN_CREATE AC-4; `packages/kanban/src/extension.ts` `resolveOwnerByName` (~L52) | Uses `.find()`, returning the first Actor with a matching name instead of rejecting ambiguity. REQ_KAN_CREATE AC-4 is unambiguous ("exactly one Actor owner"), and the design-phase Finding 7 fix already specified this exact consumer ("Kanban sees only `listActors()` and requires exactly one match; otherwise it returns `actor unknown`"). **Root cause: pure implementation slip** — the spec is clear and was already fixed at design time for this exact case; the code does not match it. This is VE's Issue 1; QM's independent assessment confirms VE's classification. | high |
| 4 | L1 / L2 (spec wording) | REQ_ACTOR_SCHEMA AC-7; SPEC_ENG_API AC-8 | SPEC_ENG_API AC-8 ("`sendMessage` ... bypassing actor/session-name validation") is worded more broadly than its own TypeScript interface contract (`packages/core/src/engine/core/types.ts`, `JarvisCoreApi.sendMessage` JSDoc: "does not require `sender` to be an existing actor/session name" — silent on destination). As approved, AC-8's prose does not explicitly preserve the destination-ambiguity refusal that REQ_ACTOR_SCHEMA AC-7 requires of "message destination ... validation". Independently confirmed by QM and MECE Engineer (L2 invocation). **Root cause: specification wording imprecision** — recommend System Designer narrow AC-8 to state the bypass applies to sender-name validation only, with destination ambiguity still refused, consistent with REQ_ACTOR_SCHEMA AC-7. This refines VE's Issue 4 (VE also recommended CM/System Designer reconciliation; QM agrees but narrows the fix to a wording correction, since the code's own already-documented interface contract already draws the correct line — see finding 5). | medium |
| 5 | Code (implementation) | `packages/core/src/engine/core/coreApi.ts` `JarvisEngine.sendMessage()` (~L110) | Independent of finding 4's spec-wording gap, the implementation does not even honor its own narrower documented interface contract: it performs zero destination validation (no `resolveName`/`getValidDestinations` call) before queuing, contradicting its own `types.ts` JSDoc, which exempts only *sender* validation. **Root cause: pure implementation slip**, distinct from finding 4. `packages/syspilot/src/versionCheck.ts`'s `ensureActor()` `.some(...)` check is a separate, correctly-scoped existence probe (for auto-provisioning one fixed Actor) and is not itself a destination-ambiguity check — QM does not treat it as a defect. | medium |
| 6 | L1 / L2 (spec gap, VE-acknowledged) | REQ_ACTOR_TOUCHEDFILES; SPEC_ACTOR_TOUCHEDFILES; `packages/core/src/engine/actors/actorTreeProvider.ts` (~L98, ~L121) | `SPEC_ACTOR_TOUCHEDFILES` governs the write/record path only (`actorScanner.resolveName(title)`, ignore unless `found` — confirmed already correctly implemented). The read/display query path (`actorTreeProvider.ts`, keyed by `actor.name`) is unspecified at any level for duplicate-name disambiguation. Confirmed by QM and Trace Engineer. Root cause: specification gap on the read path only; the write path is spec-compliant. This is the touched-files half of VE's Issue 3; QM's independent assessment narrows it to the read path specifically. | medium |
| 7 | L0 / L1 / L2 (spec gap, confirmed) | REQ_ACTOR_ACTIVITY; SPEC_ACTOR_ACTIVITY; `packages/core/src/engine/hooks/activityTracker.ts` (~L31) | No level (US/REQ/SPEC) states expected behavior for duplicate Actor names; `REQ_ACTOR_ACTIVITY` has no link to `REQ_ACTOR_SCHEMA` AC-7's consumer list, and `SPEC_ACTOR_ACTIVITY` does not call or require `resolveName`. Confirmed by QM and Trace Engineer ("unresolved cross-spec ambiguity"). This is the activity half of VE's Issue 3; VE already correctly declined to treat it as an AC failure ("contract gap") — QM's independent assessment agrees with VE's own framing here. | medium |
| 8 | Code (implementation) | SPEC_ACTOR_CREATE (shared-module contract, flow steps 5–6); REQ_ACTOR_SCHEMA AC-6; `packages/core/src/extension.ts` `jarvis.newActor` (~L1179, ~L1187, ~L1191) | The command trims the entered name (`nameInput.trim()`) before use, and performs a second full `writeActorFiles()` call after the agent picker instead of the specified `writeActorAgent()` helper (which rewrites only the `agent` field). Both deviate from an explicit, unambiguous spec. **Root cause: pure implementation slip.** Minor spec-precision note: REQ_ACTOR_SCHEMA AC-6's "verbatim" wording names "no slug transformation, no lower-casing" as examples but does not explicitly enumerate "no trimming" — intent is already clear from "verbatim", but recommend adding it for future clarity. This is VE's Issue 5; QM's independent assessment confirms VE's classification. | medium |
| 9 | Code (implementation) | SPEC_ACTOR_SCANNER (context.subscriptions requirement); `packages/core/src/extension.ts` (~L386); `packages/core/src/engine/core/coreApi.ts` `JarvisEngine.dispose()` | `ActorScanner`'s periodic-rescan timer is never disposed on deactivation: `extension.ts` only pushes `{ dispose: () => engine.dispose() }` to `context.subscriptions`, and `JarvisEngine.dispose()` disposes only registered tools and its own private `_subscriptions` array — it never cascades to `actorScanner.dispose()`. This directly contradicts SPEC_ACTOR_SCANNER's explicit, unambiguous statement that "the scanner is pushed to `context.subscriptions`". **Root cause: pure implementation slip.** This is VE's Issue 6; QM's independent assessment confirms VE's classification. | medium |
| 10 | Implementation-phase execution | CD's own Artefakt-Removal-Check (class (a)), "Ready for implementation" sign-off | Retired Project/Event artifacts remain active (PIM README, test workspace settings, project/event fixtures, characterization/contract/entity-parity tests, touch-tracker traceability comments); old characterization/contract tests are included in the passing 339-test Vitest run. The CD's own removal checklist explicitly assigned class (a) cleanup to the implementation phase ("the implementation removes these references") and the CD was signed off "Ready for implementation" on that basis. **Root cause: implementation-phase execution gap against an explicit, already-approved CD commitment — not a spec gap.** This is VE's Issue 7; QM's independent assessment confirms VE's classification and adds that the commitment was already unambiguous at sign-off, so no design rework is implied — only completion of already-scoped work. | medium |
| 11 | Test/tooling (unchanged) | `npm run lint` vs. generated `packages/kanban/out/extension.js` | Unfiltered lint fails on three missing-rule errors in generated output; source-only lint is clean. Root cause: build/tooling scope (lint command scans generated bundles), not a spec-layer issue. This is VE's Issue 8; QM's independent assessment confirms VE's classification. | low |
| 12 | Verified — no finding | `packages/recorder/package.json` (Documentation Engineer's separately raised note) | Independently verified by QM and found **not to be an issue**: `ActorTreeProvider.getTreeItem()` assigns only `contextValue = 'jarvisActor'` to every Actor node — `jarvisProject`/`jarvisEvent` are never emitted — so the recorder's `when: "viewItem =~ /^jarvis(Project|Event)/"` clauses can never match. This already realizes the CD's own "not in force" disposition (recorder redesign deferred to PM backlog #41) with no further code change required. Recommend closing this note without action. | info |

#### PM Decisions

**Cross-cutting principle (user, 2026-09-27):** duplicate Actor names SHALL
NOT occur; the only path to one is a manual `actor.yaml` edit outside
Jarvis's own creation tooling, which is itself a misconfiguration. Because
it is preventable, Jarvis SHALL positively prevent it at creation (finding
2) rather than only refuse it afterward. Should it occur anyway, every
name-based function SHALL refuse to act on the ambiguous name — no message
delivered, no Actor shown Active, no touched-file data attributed to
either folder — **and the user SHALL be told via an explicit error
notification**, not left to silently discover a feature isn't working.
This raises the bar set by REQ_ACTOR_ACTIVITY AC-8 ("silent no-op, not an
error") to a user-visible error, and closes findings 6/7 the same way.

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Cosmetic consolidation of the duplicate Modified-story rows; no content change. Routed to CM for a one-line CD edit. |
| 2 | 2 | fix-now — spec addition required first | Per the cross-cutting principle: the creation path SHALL positively prevent a duplicate name, not only check target-folder-path existence. System Designer to add an explicit pre-write `ActorScanner.resolveName()` check (reject creation when the name already resolves anywhere in the scanner) to SPEC_ACTOR_CREATE/SPEC_ACTOR_CREATETOOL and the corresponding REQ_ACTOR_CREATE/REQ_ACTOR_CREATETOOL ACs. Routed to System Designer; Dev Engineer implements once the AC exists. |
| 3 | 3 | fix-now | REQ_KAN_CREATE AC-4 is already unambiguous and was already fixed for this exact consumer at design time; `resolveOwnerByName` simply doesn't match it. Pure implementation fix, no spec change. Routed to Dev Engineer. |
| 4 | 4 | fix-now | Narrow SPEC_ENG_API AC-8 wording to state the bypass applies to sender-name validation only, destination ambiguity still refused — aligns the prose with its own already-correct TypeScript contract and with REQ_ACTOR_SCHEMA AC-7. Routed to System Designer as a wording-only fix. |
| 5 | 5 | fix-now | `sendMessage()` SHALL perform the destination-ambiguity refusal its own interface contract already promises (`resolveName`/`getValidDestinations` before queuing) — exactly the "no message delivered on an ambiguous name" behavior the cross-cutting principle states. Pure implementation fix, no spec change beyond finding 4's wording narrowing. Routed to Dev Engineer. |
| 6 | 6 | fix-now — spec addition required first | Per the cross-cutting principle: the Recently Touched Files read/display path is the one consumer REQ_ACTOR_SCHEMA AC-7's refusal list did not reach. System Designer to add an explicit AC to REQ_ACTOR_TOUCHEDFILES/SPEC_ACTOR_TOUCHEDFILES: the display query SHALL call `resolveName` and show nothing for an ambiguous name (not attribute touches to either folder). Routed to System Designer; Dev Engineer implements once the AC exists. |
| 7 | 7 | fix-now — spec addition required first | Per the cross-cutting principle: no Actor is shown Active on an ambiguous name (already AC-8's outcome) AND the user SHALL now see an explicit error notification naming the misconfiguration, replacing "silent no-op, not an error." System Designer to add the error-notification AC to REQ_ACTOR_ACTIVITY and decide whether one shared surfacing point covers all refusal paths (message send, touched files, whoAmI) or each needs its own. Routed to System Designer. |
| 8 | 8 | fix-now | Both deviations (name trimming, wrong write helper) contradict an explicit, unambiguous spec. Pure implementation fix; the minor "no trimming" wording addition to REQ_ACTOR_SCHEMA AC-6 is a trivial clarity edit, not a behavior change. Routed to Dev Engineer (code) and CM (wording edit). |
| 9 | 9 | fix-now | SPEC_ACTOR_SCANNER already explicitly requires the scanner to be pushed to `context.subscriptions`; `JarvisEngine.dispose()` simply doesn't cascade to it. Pure implementation fix. Routed to Dev Engineer. |
| 10 | 10 | fix-now | Completion of already-scoped, already-approved implementation work ("the implementation removes these references"), not new scope or a spec question. Routed to Dev Engineer to finish before re-submitting to QM. |
| 11 | 11 | accept-as-is | Build/tooling scope (lint command scans generated bundles), not a spec or product defect; source-only lint is clean. Logged as a follow-up tooling item, not blocking this change. |
| 12 | 12 | accept-as-is | Independently verified by QM as not an issue — the CD's own "not in force" recorder disposition is already fully realized; no code change needed. Closed without action. |

#### System Designer spec amendments (findings 2, 4, 6, 7)

The following were decided with the user (design-phase exception) on 2026-09-27:

- **Where the error shows (user decision, answers PM decision 7):** an ambiguous name is reported to the user in one place only, message sending. Creation already prevents duplicates, so a duplicate can only come from a manual `actor.yaml` edit, and an error notification at `jarvis_sendMessage` / `JarvisCoreApi.sendMessage` is enough.
  - Activity, touched files, `whoAmI`, prompt injection and Kanban still refuse the name, but show no notification. Activity and touched files are driven by hook events, so a notification there would fire on every tool call.
  - This replaces the PM's proposed error AC on REQ_ACTOR_ACTIVITY.
- **No match is not an error (user decision):** a chat title that matches no Actor only means that chat's activity cannot be attributed to an Actor. REQ_ACTOR_ACTIVITY AC-8 stays as it is; the new AC-10 treats an ambiguous title the same way.
- **Finding 2:** both creation paths now rescan and refuse a name already carried by any Actor, not only an existing target folder.
  - Rescanning first catches a hand edit made since the last scan.
  - L0: US_ACTOR_ACTORS AC-1, US_ACTOR_CREATE AC-2, US_ACTOR_CREATETOOL AC-5.
  - L1: REQ_ACTOR_CREATE AC-3, REQ_ACTOR_CREATETOOL AC-7, REQ_ACTOR_SCHEMA AC-7.
  - L2: new `existingActorFolder()` in `actorCreation.ts`, used by SPEC_ACTOR_CREATE step 3 and SPEC_ACTOR_CREATETOOL step 4; the tool's `path` is the blocking folder.
- **Finding 6:** REQ_ACTOR_TOUCHEDFILES AC-22 and SPEC_ACTOR_TOUCHEDFILES AC-9: the display shows the category only when the name resolves to `found`.
- **Finding 7:** REQ_ACTOR_ACTIVITY AC-10 and SPEC_ACTOR_ACTIVITY: `ActivityTracker` resolves the title with `resolveName` and ignores anything but `found`, with no notification.
- **Finding 4 (user decision on scope):** `JarvisCoreApi.sendMessage` skips sender validation only.
  - An ambiguous destination shows the error notification and throws.
  - An unknown destination is still queued, so module senders keep working before their Actor exists.
  - Changed: SPEC_ENG_API JSDoc and AC-8.
- **Error notification on message send:** SPEC_MSG_SENDMESSAGE shows `Jarvis: <ambiguousActorMessage>` in addition to throwing. REQ_ACTOR_SCHEMA AC-7 states the rule.
- SPEC_ACTOR_SCANNER lists all consumers, including the creation check and the activity tracker.

**MECE re-check on `3e8db7f`:** PARTIAL. L0 and L1 PASS. L2 raised two residual issues:
1. `isActive()` could still report an Actor Active under a name that became ambiguous after a manual `actor.yaml` edit, since the in-memory set was only updated by hook events.
2. SPEC_ACTOR_SCANNER's "only message sending notifies" sentence read as if it also covered SPEC_ACTOR_CREATE's own already-exists notification, which fires on any blocking result (`found` or `ambiguous`), not only for a unique collision.

Both fixed in `e2f53c1`: SPEC_ACTOR_ACTIVITY AC-2a makes `isActive(actorName)` consult `scanner.resolveName` at query time, independent of the retained set; SPEC_ACTOR_SCANNER now states the creation notification is a separate case, exempt from the "silent for ambiguous names" list.

**MECE re-check on `e2f53c1`:** PASS for both amended elements. Cross-level result: name-uniqueness prevention is aligned across L0/L1/L2; touched-file and activity ambiguity stay silent and un-attributed; message-send ambiguity shows an error; the creation-time already-exists notification is confirmed as the one exception to "creation-side refusals are silent". All 14 elements amended for findings 2/4/6/7 (`US_ACTOR_ACTORS`, `US_ACTOR_CREATE`, `US_ACTOR_CREATETOOL`, `REQ_ACTOR_SCHEMA`, `REQ_ACTOR_CREATE`, `REQ_ACTOR_CREATETOOL`, `REQ_ACTOR_TOUCHEDFILES`, `REQ_ACTOR_ACTIVITY`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_TOUCHEDFILES`, `SPEC_ACTOR_ACTIVITY`, `SPEC_ACTOR_CREATE`, `SPEC_ACTOR_CREATETOOL`, `SPEC_ENG_API`) are set back to `:status: approved`.

### Round 2

**Reviewed by:** Quality Manager
**Review date:** 2026-09-27
**Trigger:** CM-completion notification (Dev implementation of PM's Round 1 fix-now dispositions)
**Scope:** Implementation HEAD `2da0ae4` (fix commit `787bdf1` + follow-up `2da0ae4`) against specs approved at `98a744d`. Re-verification is independent of Dev's and VE's own claims — each item below is QM's own re-derivation from the diff and current source/spec text, not an acceptance of the commit message's account.

**Findings 2/4/6/7 (spec-gated, now approved) — verified against the exact amended contracts:**

| Finding | Amended contract | Code checked | Result |
|---|---|---|---|
| 2 | REQ_ACTOR_CREATE AC-3 / REQ_ACTOR_CREATETOOL AC-7: rescan and refuse a name carried by any Actor, not only an existing target folder | New `existingActorFolder()` in `actorCreation.ts` (rescans, checks disk path, then `scanner.resolveName`, treats `found`/`ambiguous` as blocking); wired into both `jarvis.newActor` (`extension.ts`) and `jarvis_createActor` (`actorRuntime.ts`) | Matches contract exactly |
| 4 | SPEC_ENG_API AC-8 (narrowed): sender-validation skipped; ambiguous destination shown as error notification and thrown; unknown destination still queued | `coreApi.ts` `sendMessage()`: `resolveName(destination)`, on `ambiguous` shows `Jarvis: <ambiguousActorMessage>` and throws before `appendMessage`; no sender check added; unresolved/unknown falls through to `appendMessage` unchanged | Matches contract exactly |
| 6 | REQ_ACTOR_TOUCHEDFILES AC-22 / SPEC_ACTOR_TOUCHEDFILES AC-9: touched-files category shown only when the name resolves to `found` | `actorTreeProvider.ts`: category push now gated on `this._scanner.resolveName(actor.name).status === 'found'` in addition to the existing non-empty-window check | Matches contract exactly |
| 7 | REQ_ACTOR_ACTIVITY AC-10 (silent ignore, no notification) / AC-2a (`isActive` resolves at query time) | `activityTracker.ts`: constructor now takes `ActorScanner`; `_handle()` returns silently when `resolveName(title).status !== 'found'`; `isActive()` returns `false` immediately when `resolveName(entityName).status !== 'found'`, independent of the retained in-memory set | Matches contract exactly |

**Findings 1/3/5/8/9 (pure implementation fixes) — re-verified:**

| Finding | Result |
|---|---|
| 1 | CM's consolidation applied: `US_ACTOR_TREE` and `US_MSG_STABLESESSION` each now appear as a single row in the Modified User Stories table (previously duplicated). Confirmed by direct read of the current table. |
| 3 | `packages/kanban/src/extension.ts` `resolveOwnerByName` replaced `.find()` with `actors.filter(a => a.name === name)` + `matches.length !== 1` rejection. Matches REQ_KAN_CREATE AC-4. |
| 5 | Same code path verified under finding 4 above (`coreApi.ts` `sendMessage()`). |
| 8 | `jarvis.newActor`: `nameInput` no longer `.trim()`'d; the post-picker agent write now calls the new `writeActorAgent(targetPath, ...)` instead of a second full `writeActorFiles()` call, so a manual `context.md` edit between the two writes is no longer clobbered. Matches REQ_ACTOR_SCHEMA AC-6 and the SPEC_ACTOR_CREATE flow amendment. |
| 9 | `JarvisEngine.dispose()` in `coreApi.ts` now calls `this._actorScanner.dispose()` after draining `_subscriptions`, cascading the periodic-rescan-timer teardown on deactivation. |

All five are backed by new, behavior-exercising tests (`kanban-owner-ambiguity.test.ts`, `coreApi.test.ts` sendMessage/dispose blocks, `newactor-creation-flow.test.ts`) that were read and confirmed to assert the actual amended behavior, not just the absence of the old one.

**Finding 10 (class (a) artifact removal) — mostly complete, one new residual gap found:**

Verified removed/clean: `testdata/.vscode/settings.json` (no `jarvis.projectsFolder`/`jarvis.eventsFolder`), all `testdata/projects/**` and `testdata/events/**` fixtures, `packages/pim/README.md`, `src/tests/engine-contract.test.ts` (deleted), `src/tests/characterization.test.ts` and `src/tests/entity-parity.test.ts` (trimmed to current-scope-only content), and the four source files (`touchTracker.ts`, `touchStore.ts`, `injectPrompt.ts`, `extension.ts`) whose traceability comments were retargeted from `REQ_ENT_*`/`SPEC_ENT_*` to `REQ_ACTOR_*`/`SPEC_ACTOR_*`.

**New finding (QM-discovered, Round 2):** the retargeting did not extend to test-file traceability comments. Five active, currently-passing test files still tag *current* functionality with now-removed spec IDs instead of their renamed replacements:

- `src/tests/actor-touched-files.test.ts` — file docblock and two `describe()` titles reference `SPEC_ENT_TOUCHEDFILES` (should be `SPEC_ACTOR_TOUCHEDFILES`).
- `src/tests/touched-files-cleanup.test.ts` — file comment references `SPEC_ENT_TOUCHEDFILES`.
- `src/tests/touched-files-write-race.test.ts` — file comment and `describe()` title reference `SPEC_ENT_TOUCHEDFILES`.
- `src/tests/ui-improvements.test.ts` — `describe()` titles reference `SPEC_ENT_ENTITY_CONTEXTMENU` and `SPEC_ENT_ENTITY_FILE_CHILDREN`.

Confirmed via `docs/design/*.rst` grep that none of these IDs exist anywhere in the current spec tree — they are genuinely retired, not merely renamed-but-still-present. This is distinct from `src/tests/entity-tree-context-menu.test.ts` and `src/tests/coreApi.test.ts`, where the same old IDs appear intentionally, to name a test that asserts the old surface is *gone* — those are not stale references and are not included in this finding. Severity: low — cosmetic/traceability-hygiene only, no functional or behavioral impact, all tests still pass; but it leaves dangling references to non-existent spec IDs in the active suite, undermining traceability for anyone following the comment back to a spec.

**Findings 11/12 — reconfirmed unchanged, still correctly `accept-as-is`:** no source changes touched `packages/kanban/out/**` (still tooling-scope-excluded) or the Recorder manifest (still `contextValue: 'jarvisActor'` only). Not blockers.

**Test-quality observation (informational, not a blocker):** `src/tests/kanban-owner-ambiguity.test.ts` verifies `resolveOwnerByName` (private, unexported) via a source-text substring assertion (`.find(` absent, `.filter(` present) plus a hand-replicated copy of the logic under test, rather than invoking the real function directly. This follows an established precedent elsewhere in the suite (cited: `editor-group-placement.test.ts`) and the real code was independently confirmed correct by direct reading in this round, so it is not raised as a finding — noted only because a future edit to the real function would not be caught by the replicated-logic assertion.

**Independent re-verification of Dev's claimed evidence (own run, this round, at `2da0ae4`):**

| Check | Dev's claim | QM's independent result |
|---|---|---|
| `compile all` task | green | Green — all 7 packages + Flow/Kanban bundle builds succeeded |
| Vitest | 339/339, 41 files | Reproduced exactly: 339 passed / 339, 41 files passed / 41 |
| Source-scoped ESLint (`--ignore-pattern packages/kanban/out/**`) | 0 errors / 157 warnings | 0 errors / 160 warnings — pre-existing `no-explicit-any`/`no-unused-vars` style warnings in test files; the +3 is immaterial (new test files), no new error-level issues |
| Fresh strict Sphinx (`-E -b html -W --keep-going`) | 0 warnings | Reproduced: `build succeeded`, exit code 0 |

**Out-of-scope note:** commit `2da0ae4` itself (workspace-relative path fix for `jarvis_createActor`, per a separate CM-approved follow-up on REQ_ACTOR_CREATETOOL AC-2/AC-7) is unrelated to Round 1's 12 findings. It is already covered by the passing Vitest run above and introduces no conflict with this round's findings; no new finding raised for it.

**Round 2 verdict:** Findings 1–9 are resolved and verified correct against their (amended, where applicable) specs, with behavior-exercising test coverage. Finding 10 is resolved for all class (a) artifacts except a residual test-comment traceability gap, captured above as a new low-severity item. Findings 11/12 remain correctly accepted-as-is. All four independently-reproduced build/test/lint/doc gates are green. QM does not grant merge-readiness — that determination runs through Verify Engineer, whose validation report at `val-retire-legacy-actor-kinds.md` still reflects the Round 1 FAILED status at `a07969e` and has not yet been re-run against `2da0ae4`.

#### PM Decisions (Round 2)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | New (Round 2): stale `SPEC_ENT_*` traceability comments in 4 active test files | fix-now | Same class as the rest of Finding 10's already-approved removal scope; cosmetic/traceability-only, no behavior change, trivial to complete alongside it. Routed to Dev Engineer: retarget `src/tests/actor-touched-files.test.ts`, `touched-files-cleanup.test.ts`, `touched-files-write-race.test.ts`, `ui-improvements.test.ts` from `SPEC_ENT_TOUCHEDFILES`/`SPEC_ENT_ENTITY_CONTEXTMENU`/`SPEC_ENT_ENTITY_FILE_CHILDREN` to their `SPEC_ACTOR_*` equivalents. Leave `entity-tree-context-menu.test.ts` and `coreApi.test.ts` untouched — their old-ID references are intentional (asserting the old surface is gone). |

VE's validation report is stale relative to `2da0ae4` regardless of this finding's fix — routed to Verify Engineer for a fresh validation pass once the fix above lands.

### Verify Engineer Findings (`val-retire-legacy-actor-kinds.md` @ `e035f66`, FAILED)

Fresh validation confirmed all Round 1/2 fixes correct and found two new implementation mismatches against already-approved contracts, plus two minor completeness gaps.

#### PM Decisions (VE Round)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | Canonical `jarvis_sendMessage` LM/MCP handler (`extension.ts`) uses `validNames.includes()` and a generic "does not exist" error for ambiguous sender/destination, bypassing `resolveName()` and the notification `JarvisEngine.sendMessage()` already implements | fix-now | Pure implementation gap against already-approved REQ_ACTOR_SCHEMA AC-7 / SPEC_MSG_SENDMESSAGE — the fixed behavior exists in `JarvisEngine.sendMessage()` but the canonical tool handler has its own, unfixed code path. No spec change. Routed to Dev Engineer: route the handler through `resolveName()`, show the specified ambiguity notification and throw for `ambiguous` sender/destination, leave `unknown` as a distinct, non-notifying error, add focused tests for both branches. |
| 2 | `agentDiscovery.ts` still defines and calls `_agentModesCache`/`getAgentModesCached()` in the live file-child resolver, contrary to already-approved REQ_ACTOR_AGENT_DISCOVERY AC-6 / SPEC_ACTOR_FILES (on-demand, no persistent cache); same file also has stale `SPEC_EXP_ENTITY_FILE_CHILDREN`/`getEntityFileChildren`/`yamlScanner` comments | fix-now | Pure implementation gap — SPEC_ACTOR_FILES already states the cache is removed. No spec change. Routed to Dev Engineer: remove the module-level cache, update the stale comments, add a refresh-behavior test showing a subsequent resolution observes current agent files. |
| 3 | Stale `ui-improvements.test.ts` header still names `jarvis.openEntityFile` (test body already targets `jarvis.openActorFile`); no focused test asserts the legacy `Jarvis: Rescan` heartbeat job is removed at startup | fix-now, folded into the same pass | Both are trivial completions of already-decided, already-approved scope (the `openEntityFile` → `openActorFile` rename; the Rescan-job-becomes-internal-timer decision), not new decisions. Routed to Dev Engineer alongside findings 1–2: fix the stale header comment, add a startup-cleanup regression test for the Rescan job removal. |

Once Dev Engineer completes all three, re-submit directly to Verify Engineer for a fresh validation pass — do not wait for another QM round, since these are VE-discovered implementation gaps against contracts QM already verified.

### Verify Engineer Findings, Round 2 (`val-retire-legacy-actor-kinds.md` @ `3b2e580`, PARTIAL)

Both prior implementation gaps (canonical `sendMessage` ambiguity notification, agent discovery cache) now PASS. Prior QM findings 1–9, the class-(a) removal audit, and the eight traceability retargets all pass. One new low-severity gap remains.

#### PM Decisions (VE Round 2)

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | `rescan-job-cleanup.test.ts` exercises `HeartbeatScheduler.unregisterJob()` directly but would not fail if extension activation stopped invoking it; the production startup call exists but is untested at the wiring level | fix-now | Cheap, focused completion of already-approved startup-cleanup scope (the "Jarvis: Rescan" job removal decided earlier in this change) — not a new decision, no spec change. Routed to Dev Engineer: add a focused activation-wiring test asserting `unregisterJob()` is actually invoked during extension activation, not just that the scheduler method works in isolation. |

Once done, re-submit directly to Verify Engineer for a fresh validation pass.

### Verify Engineer Findings, Round 3 ([validation report](val-retire-legacy-actor-kinds.md) @ `0f7e99c`, PASSED)

Fresh verification at `52263ec` confirms the focused activation-wiring assertion closes the remaining Rescan cleanup test gap. The earlier implementation findings also pass; the generated Kanban lint errors remain accepted as non-blocking. See the validation report for engineering checks and limits. User UAT remains NOT RUN, with no verdict.

### Round 3

**Reviewed by:** Quality Manager
**Review date:** 2026-09-27
**Trigger:** CM-completion notification, on top of VE's fresh PASS at `52263ec` (validation report `0f7e99c`)
**Scope:** everything landed since QM Round 2 (`c67d361`): commits `e035f66`, `3105bc8`, `52263ec`, plus VE's own three-finding round and its follow-on round. Independent re-derivation from the diffs and current source, not an acceptance of VE's or Dev's account.

**QM Round 2 finding (stale `SPEC_ENT_*` test comments) — verified fixed in `e035f66`:** all four named files retargeted exactly as disposed: `actor-touched-files.test.ts` (3 refs), `touched-files-cleanup.test.ts` (1 ref), `touched-files-write-race.test.ts` (2 refs, including the `AC-6a` suffix), `ui-improvements.test.ts` (2 refs, `SPEC_ACTOR_CONTEXTMENU` / `SPEC_ACTOR_FILES`). `entity-tree-context-menu.test.ts` and `coreApi.test.ts` correctly left untouched. Re-grepped `docs/design/*.rst` and the four files directly — no `SPEC_ENT_`/`REQ_ENT_` text remains outside the two intentional retirement-assertion files.

**VE finding 1 (canonical `jarvis_sendMessage` bypassed `resolveName`) — verified fixed in `3105bc8`:** `extension.ts`'s `jarvis_sendMessage` handler now calls `actorScanner.resolveName()` for both `session` and `senderSession`, branches `ambiguous` to `ambiguousActorMessage()` + `showErrorMessage` + throw (no queuing), and keeps `unknown` as the pre-existing non-notifying "does not exist" error. Confirmed `getValidDestinations()` (used only for the unknown-error's name list) and `resolveName()` both operate over the same Actor-only, ambiguity-excluded name set — no regression against non-Actor destinations, since none were ever supported by this path.

**VE finding 2 (`agentDiscovery.ts` persistent cache) — verified fixed in `3105bc8`:** `_agentModesCache`, `getAgentModesCached()`, and the dead `resolveAgentFileChild()` are deleted; the module header no longer references the retired `SPEC_EXP_ENTITY_FILE_CHILDREN`/`yamlScanner.ts` design. `actorFiles.ts`'s `resolveAgentFile()` remains the sole live resolver and already calls `discoverAgentModes()` fresh each time — confirmed by direct read, not just the commit message's claim.

**VE finding 3 (stale `ui-improvements.test.ts` header) — verified fixed in `3105bc8`:** header now reads `jarvis.openActorFile`.

**VE Round 2 finding (Rescan activation-wiring test) — verified fixed in `52263ec`, and cross-checked against production code:** the new source-shape assertion in `rescan-job-cleanup.test.ts` checks that `extension.ts`'s heartbeat-enabled branch contains `scheduler.unregisterJob('Jarvis: Rescan')` between `scheduler = activateHeartbeat(` and the following `} else {`. Read `extension.ts` directly at lines 438–447: the call is present, inside the `if (cfg.get<boolean>('heartbeat.enabled', true))` branch, immediately after `activateHeartbeat()`. VE's own report already discloses this is a source-shape assertion that doesn't execute activation — QM agrees that disclosure is accurate and the residual risk (a change to the *string literal* `'Jarvis: Rescan'` on both sides staying in sync without a real activation test) is acceptably low for a one-time migration cleanup, not a new finding.

**Independent re-verification of the four engineering gates (own run, this round, at `a4eff41`):**

| Check | VE's claim | QM's independent result |
|---|---|---|
| `compile all` task | green | Green — all 7 packages + Flow/Kanban bundle builds succeeded |
| Vitest | 352/352, 44 files | Reproduced exactly: 352 passed / 352, 44 files passed / 44 |
| Source-scoped ESLint (`--ignore-pattern packages/kanban/out/**`) | 0 errors / 164 warnings | Reproduced exactly: 0 errors / 164 warnings |
| Fresh strict Sphinx (`-E -b html -W --keep-going`) | 0 warnings | Reproduced: `build succeeded`, exit code 0 |

**Findings 11/12 — reconfirmed unchanged, still `accept-as-is`:** no commit since Round 2 touched `packages/kanban/out/**` or the Recorder manifest.

**Round 3 verdict — no new findings.** All items QM was asked to re-check (the Round 2 traceability fix, VE's three fresh findings, VE's own follow-on wiring-test finding) are independently confirmed correctly resolved against their contracts, with genuine behavior-exercising or source-shape test coverage read directly rather than taken on trust. All four independently-reproduced engineering gates match VE's report exactly. QM has no outstanding quality concerns on the declared scope. As always, QM does not grant merge-readiness itself; VE's `PASSED` verdict at `52263ec` stands independently confirmed, and User UAT remains NOT RUN / no verdict, per backlog #40.

### User Validation Finding (2026-09-27, post QM CLEAR / VE PASSED)

**Found by:** user, manual Extension Development Host test ("Run All") at HEAD `a4eff41`/`2efd3d7`.

**Result of manual test:** Actor creation, sending messages between Actors, auto-delivery on/off, and changing the Actor path all worked without issue — these are treated as user-validated.

**New defect found:** opening either Flow function (`jarvis.openMessageFlow` — Message Flow, `jarvis.openMessageLog` — Message Log) fails: `Error running command jarvis.openMessageLog: command 'jarvis.openMessageLog' not found.` Root cause, confirmed by direct source read: `packages/flow/src/extension.ts`'s activation guard hard-codes `rawApi.version !== 1` and returns before registering either command. This change (Round design decision A) intentionally raised `JarvisCoreApi.version` to `2` after removing the kind-registration machinery — `SPEC_MOD_PIM_PKG`, `SPEC_MOD_REC_PKG`, and `SPEC_MOD_SPL_PKG` were each updated to check `version === 2` accordingly, but `SPEC_MOD_FLOW_PKG` was never included in that sweep and still describes no version check at all, matching the still-unfixed code. Flow silently fails closed (only a log-channel error, no thrown activation exception), which is why this escaped every automated gate (`compile all`, Vitest, lint, Sphinx) and every QM/VE/MECE/Trace pass — none of them activate the actual extensions. This is exactly the class of defect the user-validation merge gate exists to catch.

#### PM Decision

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | `packages/flow` activation guard checks `version !== 1`; never updated for this change's `version: 2` bump; Flow does not activate, so neither of its two commands registers | fix-now, blocking merge | Genuine regression breaking an entire add-on, not a documented "not in force" exception like the Recorder. Same class as the already-fixed PIM/Recorder/Syspilot consumers — a missed sibling, not a new design question. Routed to System Designer: update `SPEC_MOD_FLOW_PKG` to state the `api.version === 2` check (parity with `SPEC_MOD_PIM_PKG` AC), and confirm no other Flow behavior depends on removed API surface (e.g. `listJarvisSessions`, kind registration) while there. Then routed to Dev Engineer: update `packages/flow/src/extension.ts`'s guard to `rawApi.version !== 2`, add/extend a Flow activation test, and re-verify both commands register in a manual smoke check description in the CD. Re-submit to QM/VE before the next merge attempt — this is new scope (Flow package) that neither reviewed yet. |

Merge remains withheld until this is fixed and re-verified.

#### System Designer spec fix (finding 1, User Validation)

Fixed in `b564554`: `SPEC_MOD_FLOW_PKG` gained AC-5, stating the `api.version === 2` activation check (parity with `SPEC_MOD_PIM_PKG` AC), and that Flow calls none of the API members `SPEC_ENG_API` AC-4 removed (`listJarvisSessions`, entity-kind registration, tree/decorator access) — confirmed by reading `spec_flow.rst`, which has no such calls. `SPEC_ENG_API` AC-2's enumerated add-on list was itself missing `flow` — a second instance of the same missed-sibling gap, one level up — so it now reads "PIM, kanban, syspilot, MCP, recorder, flow". `SPEC_ENG_API` set back to `draft` pending MECE re-check (`SPEC_MOD_FLOW_PKG` was already `draft`, not part of the earlier approval sweep). Strict Sphinx build green. Handing to CM/Dev Engineer to fix `packages/flow/src/extension.ts`'s guard (`rawApi.version !== 2`), add/extend the activation test, and re-submit to QM/VE.

**MECE re-check on `b564554`:** PARTIAL. No functional/contradiction issue — SPEC_ENG_API AC-2's six-add-on list is complete and SPEC_MOD_FLOW_PKG AC-5 is consistent with it. Two secondary notes: (1) my hand-off message said "parity with SPEC_MOD_PIM_PKG's AC", but PIM's version check lives in its Description, not an AC — the committed spec text itself correctly cites `SPEC_ENG_API` AC-2, not PIM, so no text was wrong; (2) Kanban/Recorder/MCP/Syspilot package specs don't restate the version-2 guard as their own AC the way Flow now does, which is a package-spec traceability/consistency question, not a contradiction of SPEC_ENG_API AC-2 (which already covers all six).

Resolved in `5a505da`: added a sentence to `SPEC_ENG_API` AC-2 stating it is the sole normative statement of the guard, that a package spec MAY restate it as its own AC (as Flow now does, precisely because its guard was found stale) but need not, and that its absence elsewhere is not a gap. This keeps the fix scoped to the User Validation finding (Flow) without reopening the other four already-approved add-on package specs. Re-requested MECE re-check.

**MECE re-check on `5a505da`** (via CM, report `ddb1aec`): PARTIAL — confirms the six-add-on list and that AC-5 agrees with `SPEC_ENG_API` AC-2/AC-4, but flags a contract ambiguity: the Description said the runtime `api.version === 2` check gates the title-bar button ("only then, contributes..."), while AC-2 says the button/command are static `package.json` contributions and AC-5 only gates *runtime command registration*. Static manifest contributions cannot be conditionally gated by a runtime check.

Checked every sibling add-on's `package.json` (`packages/pim`, `packages/kanban`, `packages/recorder`, `packages/flow`): none ties a `menus`/`view/title` contribution's visibility to a runtime version check — only `config.*`/`view ==`/`viewItem` `when` clauses are used anywhere in this workspace, and no such context-key mechanism exists. This is a spec-wording fix, not a new product decision: no behavior changes, no new infrastructure is introduced.

Resolved in `4432cea`: rewrote the Description so the button/commands are static manifest contributions shown independent of activation success; the version guard (AC-5) only gates the two command-handler registrations. New AC-2 clause states the button's presence does not depend on activation or the guard. New AC-6 states the resulting failure mode explicitly: on a version mismatch the button still shows, but invoking it now fails with VS Code's own "command not found" error (the exact symptom of the original defect) — an accepted, documented limitation shared by every add-on in this workspace, not something Flow newly introduces or needs to solve. Strict Sphinx build green. Re-requesting MECE re-check.

**MECE final re-check on `0799882`/`4432cea`:** PASS (recorded `cb2cf7f`). Manifest/runtime distinction resolved; six-add-on list complete; removed-API prohibition consistent with `SPEC_ENG_API` AC-4 and `SPEC_FLOW`. No further specification changes required. `SPEC_MOD_FLOW_PKG` and `SPEC_ENG_API` set back to `approved`. Handing to CM for Verify/Dev Engineer to fix `packages/flow/src/extension.ts`'s guard against the now-settled contract.

**Verify graph re-check (`2881c12`):** MECE PASS / Traceability PARTIAL. `SPEC_MOD_FLOW_PKG` cited `SPEC_ENG_API` AC-2/AC-4 only in prose, without a formal `:links:` edge — `SPEC_MOD_PIM_PKG` is the local precedent with a formal `SPEC_ENG_API` edge. Fixed in `440ce0d`: added `SPEC_ENG_API` to `SPEC_MOD_FLOW_PKG`'s `:links:`. Status set back to `draft` pending Verify's graph re-check. Strict Sphinx build green.

**Verify graph re-check (`e48357b`):** clear — `SPEC_MOD_FLOW_PKG` → `SPEC_ENG_API` → `REQ_ENG_CONTRACT` AC-3 confirmed, MECE PASS, strict Sphinx clean. `SPEC_MOD_FLOW_PKG` set back to `approved` (no content change). The Flow version-2 gap (User Validation finding) is now fully spec-complete and approved end to end; Dev Engineer's implementation can proceed.

**Verify graph re-check (`94a3452`):** PASS. A fresh strict Sphinx build and Sphinx-Needs query confirm the formal path `SPEC_MOD_FLOW_PKG` → `SPEC_ENG_API` → `REQ_ENG_CONTRACT`; AC-3 of that requirement defines API version 2. The Flow package node is still `draft`, as set for this review; Verify made no specification-status or implementation changes. The AC-2/AC-5/AC-6 MECE result remains PASS. No User UAT was run.

**MECE re-check on `5a505da`:** PARTIAL. `SPEC_ENG_API` AC-2 and `SPEC_MOD_FLOW_PKG` AC-5 agree on the version-2 guard and error behavior; the six-add-on list is complete, and the new AC-2 wording makes local guard restatements optional, so no sibling package omission remains. `SPEC_MOD_FLOW_PKG` AC-5's removed-API prohibition is consistent with `SPEC_ENG_API` AC-4 and the Flow design in `SPEC_FLOW`, which describes no use of those removed members.

**Finding — conditional contribution ambiguity:** `SPEC_MOD_FLOW_PKG`'s Description says the runtime guard gates contribution of the title-bar button, while AC-2 says the button and command are contributed from `package.json`; AC-5 only describes withholding runtime command registration. A runtime guard cannot conditionally suppress static manifest contributions, so the contract does not say whether the button remains visible when the API version mismatches. System Designer should distinguish manifest contributions from runtime handler registration and state the intended mismatch UI. No specification or implementation changes were made by MECE.

**MECE re-check on `0799882` / `4432cea`:** PASS. The ambiguity is resolved. `SPEC_MOD_FLOW_PKG` Description now states the button/commands are static `package.json` contributions shown independent of activation success; AC-2 explicitly says their presence does not depend on activation or the version guard; AC-5 gates only the two command-handler registrations; new AC-6 states the resulting mismatch behavior explicitly (button visible, "command not found" on invoke). The six-add-on list in `SPEC_ENG_API` AC-2 remains complete, the optional local guard restatement wording stands, and `SPEC_MOD_FLOW_PKG` AC-5's removed-API prohibition is consistent with `SPEC_ENG_API` AC-4 and `SPEC_FLOW`. No further specification changes required.

### Verify Engineer MECE/Trace Review (`4e2e649`)

**MECE: PASS.** The Flow package's static manifest contributions are distinct from activation-time command-handler registration. `SPEC_ENG_API` AC-2 remains the API-wide guard; `SPEC_MOD_FLOW_PKG` AC-5 applies it to Flow handlers and AC-6 documents the mismatch behavior. `SPEC_FLOW_WEBVIEW` and `SPEC_FLOW_LOGVIEWER` continue to define the command/panel behavior without introducing a competing version guard.

**Traceability: PARTIAL.** The rebuilt Sphinx-Needs graph shows `SPEC_MOD_FLOW_PKG` links to `REQ_FLOW_PACKAGE`, `REQ_MOD_ADDONS`, `REQ_MOD_ZEROTRACE`, and `SPEC_REL_PKGCONTRACT`, but not to `SPEC_ENG_API`, although its Description and AC-5/AC-6 cite that API spec. `SPEC_ENG_API` links to `REQ_ENG_CONTRACT` (whose AC-3 requires API version 2); inline citations do not create a graph edge. The feature-level chains remain intact: `SPEC_FLOW_WEBVIEW` links to `REQ_FLOW_WEBVIEWPANEL`, and `SPEC_FLOW_LOGVIEWER` links to `REQ_FLOW_LOGVIEWER`. `SPEC_MOD_PIM_PKG` formally links to `SPEC_ENG_API`, providing a local package-spec precedent.

**Finding:** Add a formal `SPEC_ENG_API` link to `SPEC_MOD_FLOW_PKG` (or record an approved alternative trace convention) so the Flow-specific guard has an explicit graph path to `REQ_ENG_CONTRACT`. Verify Engineer made no specification or implementation edits. Route this trace-link gap to the System Designer/CM before dispatching implementation work.

#### Dev Engineer implementation (finding 1, User Validation)

Fixed in `6df1b5e`, against the approved contract baseline (`SPEC_MOD_FLOW_PKG` AC-5/AC-6 in `b564554`/`4432cea`, formal `SPEC_ENG_API` edge in `440ce0d`, Verify graph PASS in `e48357b`, re-approval in `ab73f3e`): `packages/flow/src/extension.ts`'s activation guard now checks `rawApi.version !== 2`, matching `SPEC_MOD_FLOW_PKG` AC-5. Added `src/tests/flow-activation-guard.test.ts`, calling the real `activate()` with a mocked core-extension export: version 2 registers both `jarvis.openMessageFlow` and `jarvis.openMessageLog`; version 1 (the retired guard value) registers neither and logs the `AC-6` mismatch error; an absent core export also registers neither. `compile all` green, `vitest` 355/355 passing (45 files), source-scoped ESLint 0 errors.

**Manual smoke-check procedure — executed by the user 2026-09-27, PASS:**

1. Launch the Extension Development Host with a workspace folder open (`Ctrl+F5` / "Run Without Debugging" — `F5` hit an unrelated local debug-attach issue, see PM context.md; not a code or profile defect).
2. Open the Command Palette and run **Jarvis: Open Message Flow** (`jarvis.openMessageFlow`).
   - Expected: a Message Flow webview panel opens in the Content column (no "command not found" error). **Confirmed by the user: opened successfully.**
3. Open the Command Palette and run **Jarvis: Open Message Log** (`jarvis.openMessageLog`).
   - Expected: a Message Log webview panel opens in the Content column (no "command not found" error). **Confirmed by the user: opened successfully.**
4. Check the "Jarvis Flow" output channel: no `version mismatch` error line should be present.

This closes the User Validation finding that started this Flow investigation. This is a targeted smoke-check of the Flow fix specifically, not the formal, scripted User UAT protocol — that remains NOT RUN / no verdict per backlog #40 (UAT redesign), unchanged by this result.

**Fresh Verify result ([report](val-retire-legacy-actor-kinds.md) @ `524b401`):** PASSED at Flow baseline `2f57da2`. The API-v2 guard registers both Flow commands; the retired v1 guard and missing core export register neither. The manual smoke check above was not executed, and User UAT remains NOT RUN with no verdict.

### Round 4

**Reviewed by:** Quality Manager
**Review date:** 2026-09-27
**Trigger:** CM-completion notification for the blocking Flow API-v2 activation regression (User Validation finding), on top of VE's fresh PASS at `524b401`
**Scope:** the Flow guard fix only — implementation `6df1b5e`, approved spec `ab73f3e`, Dev CD/manual-check procedure `2f57da2`, Verify PASS `524b401`, doc completion `63dbe76`. Independent re-derivation from spec text, source, and test, not an acceptance of Dev's/VE's/System Designer's account.

**Spec text read directly (not the narrative summary):**
- `SPEC_MOD_FLOW_PKG` AC-5: activation checks `api.version === 2`, logs an error and skips registering `jarvis.openMessageFlow`/`jarvis.openMessageLog` on mismatch, calls none of the removed API members. AC-6: mismatch still shows the title-bar button (AC-2 — static manifest contribution, independent of activation/guard); invoking it then fails with VS Code's own "command not found".
- `SPEC_ENG_API` AC-2: `version` is the literal `2`; every add-on activates only when it reads `version === 2` — add-on list now reads "PIM, kanban, syspilot, MCP, recorder, flow" (flow present, closing the sibling-omission gap).
- Formal trace edge confirmed in the `:links:` metadata, not just prose: `SPEC_MOD_FLOW_PKG` → `SPEC_ENG_API` → `REQ_ENG_CONTRACT` (`req_eng.rst`, AC-3 defines API version 2).

**Code read directly:**
- `packages/core/src/engine/core/coreApi.ts`: `readonly version = 2 as const;` — matches AC-2's literal.
- `packages/flow/src/extension.ts`: guard is `if (!rawApi || rawApi.version !== 2) { log.error('[Flow] Jarvis core API not available or version mismatch — Flow will not activate.'); return; }`, gating exactly the two `registerCommand` calls. Matches AC-5 exactly (both the version literal and the two-command scope).
- Grepped `packages/flow/src/**` for `listJarvisSessions`, `registerEntityKind`, `registerDecorator`, `EntityKindConfig`, `treeFactory` — no matches. Confirms AC-5's removed-API-member prohibition holds, independently of the commit message's claim.
- `packages/flow/package.json`: `jarvis.openMessageFlow`/`jarvis.openMessageLog` commands and their `view/title` entries are static manifest contributions gated only by `config.jarvis.messages.enabled`/`view ==` — no runtime version check anywhere in the manifest. Matches AC-2/AC-6 exactly (button visible regardless of the guard).

**Test read directly:** `src/tests/flow-activation-guard.test.ts` imports and calls the real `activate()` from `packages/flow/src/extension.ts` (not a source-text assertion or a replicated-logic copy, unlike some earlier Round tests in this change) — genuinely exercises version 2 (both commands registered), version 1 (neither registered, error logged with "version mismatch"), and absent core export (neither registered). This is stronger coverage than the class of test QM flagged as an informational observation in Round 2.

**Manual smoke-check procedure — correctly distinguished from execution:** both the CD's procedure block and the validation report explicitly and consistently state it was *not executed* and that User UAT remains NOT RUN / no verdict. No language in either document could be misread as claiming a user-observed result for the Flow fix itself.

**Prior findings/removal/trace — reconfirmed sound:** the fix commit (`6df1b5e`) touches only `packages/flow/src/extension.ts` (one-character guard change), `src/tests/__mocks__/vscode.ts` (additive: `extensions.getExtension`, `ViewColumn`, `createOutputChannel().error`), and the new test file — no file from Rounds 1–3's scope was touched, so nothing there was put at risk. Confirmed by direct `git show --stat`.

**Independent re-verification of the four engineering gates (own run, this round, at `63dbe76`):**

| Check | Verify's claim | QM's independent result |
|---|---|---|
| `compile all` task | green | Green — all 7 packages + Flow/Kanban bundle builds succeeded |
| Vitest | 355/355, 45 files | Reproduced exactly: 355 passed / 355, 45 files passed / 45 |
| Source-scoped ESLint (`--ignore-pattern packages/kanban/out/**`) | 0 errors / 168 warnings | Reproduced exactly: 0 errors / 168 warnings |
| Fresh strict Sphinx (`-E -b html -W --keep-going`) | 0 warnings | Reproduced: `build succeeded`, exit code 0 |

**Round 4 verdict — no new findings.** The Flow API-v2 activation guard matches `SPEC_MOD_FLOW_PKG` AC-5 exactly, in both version-literal and command scope; the static-manifest-vs-runtime-guard distinction (AC-2/AC-6) holds in the actual `package.json`; the trace edge to `REQ_ENG_CONTRACT` is formal, not prose-only; the regression test genuinely exercises the real `activate()` across all three cases; the manual smoke-check procedure is correctly labeled as not executed everywhere it appears; and nothing from Rounds 1–3 was touched or put at risk. All four engineering gates independently reproduced exactly. QM has no outstanding quality concerns on this scope. QM does not grant merge-readiness itself; that remains PM's/the user's call, and User UAT for the Flow fix specifically (the manual smoke-check procedure above) remains NOT RUN / no verdict.

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
