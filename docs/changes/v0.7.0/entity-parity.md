# Change Document: entity-parity

**Status:** in-progress
**Mode:** user-guided
**Branch:** `feature/entity-parity`
**Source:** PM Change Request (2026-05-29, 05:08Z)
**Target release:** v0.7.0 (Breaking)
**Priority:** HIGH
**Change Manager:** Jarvis CM session
**Base commit (develop):** `7ec65b0` (Merge branch ''main'' into develop)

---

## CR Intent (from PM, verbatim)

> **Ziel-Release:** v0.7.0 (Breaking)
> **Priorität:** HIGH
>
> **Motivation:** Konzept-Klarheit. YAML = Wahrheit, ChatSession = ephemerer
> View. Projects + Events sollen das gleiche Feature-Set wie Sessions haben.
> Plus: konsistente Destination-Validierung.
>
> **Acceptance Criteria:**
>
> 1. **Tool-Surface** (Breaking, akzeptiert):
>    - `jarvis_listSessions` → liefert Session-YAMLs (heutiges `listSessionEntities`)
>    - `jarvis_listChatSessions` → liefert VS-Code-Chat-Tab-Titel (heutiges `listSessions`)
>    - `jarvis_listEvents` → neu
>    - `jarvis_createProject`, `jarvis_createEvent` → neu, analog `createSession`
>
> 2. **Folder-Naming (KISS):** `jarvis.newProject` + `jarvis.newEvent` analog
>    zu Sessions — raw name 1:1, `validateInput`, alte kebab-Folder bleiben
>    lesbar, keine Migration.
>
> 3. **Schema:** Projects/Events bekommen `agent` als **required**; Events
>    bekommen `summary` als **required**. Backward-Compat-Strategie für
>    existierende YAMLs ohne `agent` ist vom Designer zu klären.
>
> 4. **UX-Parity:** Tree-Klick öffnet bei allen drei Entity-Typen den Chat im
>    zugewiesenen Agent. Inline-Icons für YAML, context.md, Recording.
>
> 5. **Destination-Validierung:** `jarvis_sendToSession` akzeptiert Ziele aus
>    der Vereinigungsmenge {YAML-Entities (Session/Project/Event)} ∪
>    {aktive Chat-Session-Titel}. Auto-Delivery-Poll öffnet den Chat beim
>    ersten Eingang (gleicher Pfad wie v0.6.1).
>
> 6. **Konsolidierung:** `jarvis_sendToSession` und Heartbeat-Job-Registration
>    nutzen dieselbe Destination-Validierungslogik. Drift ist nicht erlaubt.
>
> **Out-of-Scope (Backlog):**
> - `spec-helper-orphan-cleanup`
> - `fs-watcher-session-folder-rename`
>
> Workflow: Standard syspilot.cm. Vor Merge bitte explizit „merge jetzt OK?" —
> Lesson Learned bleibt gültig.

---

## Intent Gate

CR is intent-level for a breaking v0.7.0 change. Tool names, command IDs and
schema-field decisions ARE intent here (public API surface). Internal
references ("heutiges `listSessionEntities`", "`validateInput`", "gleicher
Pfad wie v0.6.1") read as behavior pointers, not code prescriptions. Schema
backward-compat strategy is explicitly delegated to designer.

**Decision:** Pass. Proceed to standard syspilot.cm workflow under
`user-guided` mode.

---

## Operation Mode

`user-guided` (PM-confirmed 2026-05-29 05:13Z). CM requests user approval
after each spec level (design, UAT, implement, MECE, docu). Pre-merge
"merge jetzt OK?" check is mandatory (Lesson Learned).

---

## Workflow

Standard syspilot.cm-Chain:

1. **Impact Analysis** (CM) — done, see below
2. **System Designer** — Level-by-Level (US/REQ/SPEC) + RST updates
3. **MECE advisory** per level
4. **Test Engineer** — UAT artefacts (`tst-entity-parity.md`)
5. **Dev Engineer** — Implementation + tests
6. **MECE final**
7. **Documentation Engineer** — releasenotes (v0.7.0), val-doc
8. **Notify PM + QM** with Change Document path
9. **PM Merge Approval** (explicit "merge jetzt OK?")
10. **Squash-merge** `feature/entity-parity` → `develop`
11. **Post-merge confirmation** to PM (commit hash + branch)

---

## Impact Analysis (initial)

Run via `syspilot.impact-python` skill against `docs/_build/html/needs.json`
(2026-05-23 build; no doc changes on develop since). Seed USes traversed
`--direction in --depth 2`.

### Affected element clusters (designer to assess + extend)

**A. Tool Surface (AC-1)** — seeds: `US_SES_SESSIONS`, `US_MSG_LISTSESSIONS`, `US_SES_CREATETOOL`
- US: `US_MSG_LISTSESSIONS`, `US_MSG_MCPSERVER`, `US_EXP_LISTPROJECTS`,
      `US_UAT_LISTSESSIONS`, `US_UAT_LISTSESSIONENTITIESGATING`,
      `US_UAT_CREATESESSIONTOOL`, `US_UAT_MCPSERVER`
- REQ: `REQ_MSG_LISTSESSIONS`, `REQ_MSG_MCPSERVER`, `REQ_SES_LISTTOOL`,
       `REQ_SES_CREATETOOL`, `REQ_SES_AGENT_CREATETOOL`,
       `REQ_UAT_LISTSESSIONENTITIESGATING`, `REQ_UAT_SES_TOOL`
- SPEC: `SPEC_MSG_LISTSESSIONS`, `SPEC_SES_TOOLS`, `SPEC_SES_CREATETOOL`,
        `SPEC_SES_AGENT_CREATETOOL`
- NEW (anticipated): listEvents tool spec, createProject tool spec,
  createEvent tool spec, listChatSessions rename spec

**B. Folder Naming (AC-2)** — seeds: `US_EXP_NEWENTITY`, `US_SES_SESSIONS`
- US: `US_UAT_NEWENTITY`, `US_UAT_AUTOCAT`, `US_OLK_AUTOCATEGORY`
- REQ: `REQ_EXP_NEWENTITY`, `REQ_EXP_NEWPROJECT`, `REQ_EXP_NEWEVENT`,
       `REQ_SES_NEWENTITY`, `REQ_OLK_AUTOCAT_NEWENTITY`,
       `REQ_UAT_NEWENTITY_TESTDATA`
- SPEC: `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD`,
        `SPEC_EXP_EXTENSION`, `SPEC_SES_NEWENTITY`

**C. Schema (AC-3)** — seeds: `US_SES_AGENTBIND`, `US_SES_SESSIONS`
- REQ: `REQ_SES_SCHEMA`, `REQ_SES_AGENT_FIELD`, `REQ_SES_AGENT_COMPAT`,
       `REQ_SES_AGENT_VALIDATION`
- SPEC: `SPEC_SES_SCHEMA`, `SPEC_SES_AGENT_SCHEMA`
- Schema files: `schemas/project.schema.json`, `schemas/event.schema.json`
  (designer must locate / extend governing SPECs)
- **Open question:** backward-compat for YAMLs missing `agent` — designer
  to propose strategy

**D. UX Parity (AC-4)** — seeds: `US_SES_TREECLICK`, `US_EXP_CONTEXTACTIONS`
- US: `US_UAT_SESSIONTREECLICK`, `US_EXP_OPENFILE`
- REQ: `REQ_SES_TREECLICK`, `REQ_EXP_CONTEXTACTIONS`, `REQ_SES_AGENT_OPEN`,
       `REQ_UAT_SESSIONTREECLICK`
- SPEC: `SPEC_SES_TREECLICK`, `SPEC_EXP_CONTEXTACTIONS`, `SPEC_SES_AGENT_OPEN`,
        `SPEC_EXP_EXTENSION`

**E. Destination Validation (AC-5)** — seeds: `US_MSG_SAFE_SEND`, `US_MSG_AUTODELIVERY`
- US: `US_MSG_OPENSESSION`, `US_UAT_MSG_AUTODELIVERY`, `US_UAT_CHATEDITORREUSE`
- REQ: `REQ_MSG_SENDTOSESSION`, `REQ_MSG_DEST_ERROR`,
       `REQ_MSG_SESSIONFILTER`, `REQ_MSG_SESSIONLOOKUP`,
       `REQ_MSG_OPENSESSION`, `REQ_MSG_AUTODELIVER_POLL`,
       `REQ_MSG_AUTODELIVER_TAG`, `REQ_MSG_AUTODELIVER_TREE`
- SPEC: `SPEC_MSG_SENDTOSESSION`, `SPEC_MSG_OPENSESSION`,
        `SPEC_MSG_SENDCOMMAND`, `SPEC_MSG_AUTODELIVER_TAG`,
        `SPEC_MSG_AUTODELIVER_STORE`

**F. Consolidation (AC-6)** — seeds: `US_AUT_HEARTBEAT_VALIDATION`, `US_MSG_SAFE_SEND`
- REQ: `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` (consolidation hook),
       `REQ_AUT_REGISTERJOB_VALIDATION`,
       `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION`,
       `REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR`,
       `REQ_AUT_HEARTBEAT_LOAD_VALIDATION`
- SPEC: `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`,
        `SPEC_AUT_REGISTERJOB_VALIDATION`,
        `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION`,
        `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR`

### Anticipated NEW IDs (designer to instantiate)

- `US_*_EVENT_ENTITY` parity (events as first-class entity with agent)
- REQ/SPEC for `jarvis_listEvents` tool
- REQ/SPEC for `jarvis_createProject`, `jarvis_createEvent` tools
- REQ/SPEC for `jarvis_listChatSessions` (renamed from current listSessions)
- REQ/SPEC for unified destination validator shared by `sendToSession` +
  `registerJob`
- REQ for Project/Event schema `agent` required + Event `summary` required
  + backward-compat policy

### Notes

- File list in CR (tool names, command IDs) is input hint only — Impact
  Analysis above defines actual scope. Designer extends candidates as needed.
- v0.6.1 init-prompt path is in-place; AC-5 "gleicher Pfad" means
  Designer reuses that mechanism, no re-invention.

---

## Engineer Reports

### System Designer Report (2026-05-29)

**Decisions made (agreed with PM via askQuestions):**

1. **Schema backward-compat (AC-3):** Option (b) — graceful default at load.
   `agent` is added to project/event schemas as **optional**. Existing YAMLs
   without `agent` load fine; `EntityEntry.agent` is `undefined` at runtime
   (same semantics as sessions). No migration required.

2. **Event `summary` required:** Yes — added to `event.schema.json` `required`
   array. Test data updated. Scanner still loads events without `summary`
   (fail-open at runtime; schema is for editor-time validation only).

3. **Folder naming:** Projects + Sessions = verbatim raw name (no slug).
   Events = `<date>_<raw name>` (underscore separator, raw name verbatim).
   Old kebab-case folders remain readable (no migration).

4. **Inline icons:** `$(go-to-file)` for YAML, `$(notebook)` for context.md,
   `$(record)` for recording (conditional). Consistent across all entity types.

**New IDs created:**

| Level | IDs |
|-------|-----|
| US | `US_EXP_LISTEVENTS`, `US_EXP_CREATEPROJECT`, `US_EXP_CREATEEVENT`, `US_EXP_ENTITYPARITY` |
| REQ | `REQ_EXP_LISTEVENTS`, `REQ_EXP_CREATEPROJECT`, `REQ_EXP_CREATEEVENT`, `REQ_EXP_ENTITY_AGENT`, `REQ_EXP_EVENT_SUMMARY`, `REQ_EXP_ENTITY_TREECLICK`, `REQ_EXP_ENTITY_ICONS` |
| SPEC | `SPEC_EXP_LISTEVENTS`, `SPEC_EXP_CREATEPROJECT`, `SPEC_EXP_CREATEEVENT`, `SPEC_EXP_ENTITY_AGENT`, `SPEC_EXP_ENTITY_TREECLICK`, `SPEC_EXP_ENTITY_ICONS` |

**Extended IDs (status → draft):**

| Level | IDs |
|-------|-----|
| US | `US_MSG_LISTSESSIONS`, `US_SES_SESSIONS`, `US_MSG_SAFE_SEND`, `US_EXP_NEWENTITY`, `US_AUT_HEARTBEAT_VALIDATION` |
| REQ | `REQ_MSG_LISTSESSIONS`, `REQ_MSG_SENDTOSESSION`, `REQ_SES_LISTTOOL`, `REQ_EXP_NEWPROJECT`, `REQ_EXP_NEWEVENT`, `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` |
| SPEC | `SPEC_MSG_LISTSESSIONS`, `SPEC_MSG_SENDTOSESSION`, `SPEC_SES_TOOLS`, `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`, `SPEC_EXP_NEWPROJECT_CMD`, `SPEC_EXP_NEWEVENT_CMD` |

**MECE advisory:** (deferred — to be run by CM after commit)

**Open issues / risks:**

1. `SPEC_EXP_ENTITY_ICONS` recording icon conditional visibility: exact
   mechanism (per-item context key vs. `getTreeItem()` check) is left to
   dev engineer — both approaches are valid.
2. `getValidDestinations()` takes `scanner` as parameter — requires wiring
   change in extension.ts (minor, but dev engineer should note).
3. The `jarvis.openYaml` command currently exists as an inline action only
   for projects/events. Sessions use `jarvis.openSessionContext` for
   context.md but may not have an explicit YAML open command yet — dev
   engineer should verify.

**Recommendation:** UAT engineer can proceed. Design is complete and
cross-level consistent. No design fix-pass needed.

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/entity-parity` from `develop@7ec65b0` |
| 1. Change Document | in-progress | CM | this file |
| 2. Impact Analysis | done | CM | clusters A-F above; needs.json @ 2026-05-23 (no doc changes since) |
| 3. System Designer | done | syspilot.design | US/REQ/SPEC complete, see Engineer Report above |
| 3a. Design fix-pass | done | syspilot.design | PM checkpoint resolutions encoded — see Fix-Pass Report below |
| 3b. Design fix-pass v2 | done | syspilot.design | MECE-light consistency fixes (5 findings) — see Fix-Pass v2 Report below |
| 4. Test Engineer | pending | syspilot.uat | `tst-entity-parity.md` |
| 5. Dev Engineer | pending | syspilot.implement | code + tests |
| 6. MECE final | pending | syspilot.mece | |
| 7. Documentation | pending | syspilot.docu | releasenotes v0.7.0 + val-doc |
| 8. Notify | pending | CM | PM + QM with Change Document path |
| 9. PM Merge Approval | pending | PM | explicit "merge jetzt OK?" |
| 10. Squash-merge | pending | CM | feature → develop |
| 11. Post-merge | pending | CM | commit hash + branch name to PM |

---

## MECE Advisory — Design Pass (2026-05-29)

**Run by:** CM (designer deferred per agent report)
**Source:** `syspilot.mece` subagent over commit `db72298`
**Verdict:** **PASS-WITH-ADVISORIES** — no HIGH blockers, UAT may proceed after PM checkpoint resolves the agent-field decision.

### Findings

| # | Severity | Area | Finding | Action owner |
|---|----------|------|---------|--------------|
| 1 | MEDIUM | `SPEC_EXP_ENTITY_ICONS` | Recording icon visibility uses `jarvis.hasRecording` context key, but **when/how** the key is set is not specified. Recommend formalizing folder-scan rule (recording/ subfolder present → true) in SPEC AC. | Designer (fix-pass) or Dev engineer (formalize at implementation). |
| 2 | MEDIUM | `REQ_EXP_ENTITY_AGENT` | CR text says `agent` **required**; designer made it **optional** in schema with graceful default (per delegated backward-compat decision). PM must confirm. | PM checkpoint (this round). |
| 3 | LOW | `SPEC_EXP_NEWPROJECT_CMD` / `SPEC_EXP_NEWEVENT_CMD` | Interactive new-Project/Event commands omit the agent picker (which exists for sessions). Asymmetry is intentional but should be documented as design rationale. | Designer (advisory, optional). |
| 4 | LOW | `REQ_EXP_ENTITY_AGENT` vs. `REQ_SES_AGENT_FIELD` | Agent-field semantics duplicated across two REQs. Future-refactor candidate (consolidate to shared architecture spec). | Backlog. |

### Cross-level MECE checks (PASS)

- Tool surface clarity (listSessions / listChatSessions / listEvents) — no name collision, semantics disambiguated.
- Create-tool symmetry — one tool per entity type, identical patterns.
- Tree-click parity — entity-level REQ inherits session behavior cleanly.
- Destination validation alignment — `REQ_MSG_SENDTOSESSION` and `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` both reference the same shared resolver in `sessionLookup.ts` (drift prevention enforced).

### CM disposition

- Finding 1 (icons mechanism): defer to dev engineer to formalize as `jarvis.hasRecording` context-key wiring in implementation. SPEC AC update can ride along in dev commit. **Not blocking UAT** if test plan explicitly covers recording-icon visibility.
- Finding 2 (agent required vs. optional): **blocks PM checkpoint** — escalating now.
- Findings 3, 4: accepted as advisories; finding 3 may be addressed in docu phase, finding 4 goes to backlog.

---

## Design Fix-Pass Report (2026-05-29)

**Trigger:** PM checkpoint resolved MECE findings #2 and #3; CM invoked
designer fix-pass to encode PM decisions.

### Changes summary

**PM decision #1 — Schema strictness (Option C):**
- `agent` added to `"required"` arrays in `schemas/project.schema.json` and
  `schemas/event.schema.json`.
- `REQ_EXP_ENTITY_AGENT` rewritten: ACs now cover (a) schema required,
  (b) scanner fail-open, (c) unbound marker (`undefined`), (d) warn log line.
- `SPEC_EXP_ENTITY_AGENT` rewritten: specifies `console.warn()` log line,
  unbound semantics in `EntityEntry`, backward-compat via fail-open scanner +
  lazy-bind.

**PM decision #2 — Lazy-on-demand migration (Option i + Lazy):**
- New `REQ_EXP_ENTITY_LAZYBIND` — lazy-bind requirement for unbound entities.
- New `SPEC_EXP_ENTITY_LAZYBIND` — flow: detect unbound → invoke picker →
  write YAML → rescan → continue open. Cancel and "No agent" semantics
  specified.
- `SPEC_EXP_ENTITY_TREECLICK` extended with unbound delegation paragraph.
- `US_EXP_ENTITYPARITY` AC-7 added for lazy-bind UX.

**PM decision #3 — Agent-picker consolidation (mandatory):**
- New `SPEC_EXP_AGENT_PICKER` — formalizes `pickAgentMode()` as shared
  component with anti-drift rule; enumerates all 5 consumers.
- `SPEC_EXP_NEWPROJECT_CMD` — agent-picker step 4 added after name prompt.
- `SPEC_EXP_NEWEVENT_CMD` — agent-picker step 6 added after date prompt.
- `REQ_EXP_NEWPROJECT` AC-11/AC-12 added for picker + YAML write.
- `REQ_EXP_NEWEVENT` AC-13/AC-14 added for picker + YAML write.
- `US_EXP_ENTITYPARITY` AC-8 added for newProject/newEvent picker.

**Testdata:** Added `agent` field to 7 valid project fixtures and 4 valid
event fixtures. Invalid fixtures (`invalid-bad-name`, `invalid-no-name`,
`invalid-empty`, `invalid-bad-status`) left without `agent` — they are
intentional "invalid" fixtures and also test scanner fail-open behavior.

### New IDs

| Level | ID | Status |
|-------|----|--------|
| REQ | `REQ_EXP_ENTITY_LAZYBIND` | draft |
| SPEC | `SPEC_EXP_AGENT_PICKER` | draft |
| SPEC | `SPEC_EXP_ENTITY_LAZYBIND` | draft |

### Extended IDs (status unchanged, content updated)

| Level | ID | Change |
|-------|----|--------|
| US | `US_EXP_ENTITYPARITY` | AC-7, AC-8 added |
| REQ | `REQ_EXP_ENTITY_AGENT` | Rewritten: required + fail-open + unbound + warn log |
| REQ | `REQ_EXP_NEWPROJECT` | AC-11, AC-12 added (agent-picker) |
| REQ | `REQ_EXP_NEWEVENT` | AC-13, AC-14 added (agent-picker) |
| SPEC | `SPEC_EXP_ENTITY_AGENT` | Rewritten: required schema + warn log + unbound semantics |
| SPEC | `SPEC_EXP_NEWPROJECT_CMD` | Steps renumbered; agent-picker at step 4 |
| SPEC | `SPEC_EXP_NEWEVENT_CMD` | Steps renumbered; agent-picker at step 6 |
| SPEC | `SPEC_EXP_ENTITY_TREECLICK` | Unbound delegation added |

### Schema diff

- `schemas/project.schema.json`: `"required": ["name", "summary"]` → `["name", "summary", "agent"]`
- `schemas/event.schema.json`: `"required": ["name", "location", "status", "dates", "summary"]` → `["name", "location", "status", "dates", "summary", "agent"]`

### Picker-component extraction decision

Decided to **reuse existing** `pickAgentMode()` from `SPEC_SES_AGENT_PICKER`
rather than extracting a new `SPEC_EXP_AGENT_PICKER_COMPONENT`. The new
`SPEC_EXP_AGENT_PICKER` spec is a consolidation/linkage spec that formalizes
the shared nature and enumerates all 5 consumers with an anti-drift rule.
No code duplication.

### askQuestions process note

PM confirmed retrospectively: subagents cannot write into other sessions'
message queues. The designer correctly consulted the user directly via
`vscode_askQuestions` during the first design pass. No process correction
needed — this is documented here for the record.

---

## Design Fix-Pass v2 Report (2026-05-29)

**Trigger:** MECE-light found 1 HIGH + 3 MEDIUM + 1 LOW consistency issues
in fix-pass v1. CM invoked designer for within-design consistency fixes only
(no substance changes — PM already approved Option C + lazy-bind + mandatory
picker).

### Fixes applied

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | `SPEC_EXP_ENTITY_LAZYBIND` wrote `agent: ""` on "No agent" but all other specs omit | Aligned to omit pattern: "No agent" → entity stays unbound, command aborts, next tree-click re-fires picker |
| 2 | MEDIUM | `SPEC_EXP_ENTITY_AGENT` AC-2 left empty-string ambiguous between cases | Made explicit: empty string treated as unbound alongside missing/undefined/non-string |
| 3 | MEDIUM | `SPEC_EXP_ENTITY_LAZYBIND` used `writeFileSync()` without error handling | Added try/catch AC: catch → warn log → abort, no partial state |
| 4 | MEDIUM | `EntityEntry` in `SPEC_EXP_SCANNER` missing `agent`, `kind`, `folder` fields | Added all three optional fields with origin comments; added union note |
| 5 | LOW | `SPEC_EXP_AGENT_PICKER` conflated interactive and programmatic consumers under one anti-drift rule | Split into two subsections: interactive (4 consumers, anti-drift applies) and programmatic (2 LM tools, `discoverAgents()`, no anti-drift) |

### Files touched

- `docs/design/spec_exp.rst` — all 5 fixes
- `docs/changes/v0.7.0/entity-parity.md` — process log + this report

### No substance changed

All edits are within-design consistency fixes. No requirements changed, no
new IDs introduced, no schema changes. All edited IDs remain `:status: draft`.
