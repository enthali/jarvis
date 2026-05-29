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

(populated by engineers as they complete their steps)

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/entity-parity` from `develop@7ec65b0` |
| 1. Change Document | in-progress | CM | this file |
| 2. Impact Analysis | done | CM | clusters A-F above; needs.json @ 2026-05-23 (no doc changes since) |
| 3. System Designer | pending | syspilot.design | per-level + checkpoint after each |
| 4. Test Engineer | pending | syspilot.uat | `tst-entity-parity.md` |
| 5. Dev Engineer | pending | syspilot.implement | code + tests |
| 6. MECE final | pending | syspilot.mece | |
| 7. Documentation | pending | syspilot.docu | releasenotes v0.7.0 + val-doc |
| 8. Notify | pending | CM | PM + QM with Change Document path |
| 9. PM Merge Approval | pending | PM | explicit "merge jetzt OK?" |
| 10. Squash-merge | pending | CM | feature → develop |
| 11. Post-merge | pending | CM | commit hash + branch name to PM |
