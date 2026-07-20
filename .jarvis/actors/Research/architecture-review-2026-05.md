# Architecture Review — Jarvis (2026-05)

**Date**: 2026-05-22
**Author**: Develop session (Copilot)
**Scope**: All non-UAT design specs under `docs/design/` (spec_aut, spec_cfg,
spec_dev, spec_exp, spec_msg, spec_olk, spec_pim, spec_rec, spec_rel, spec_ses).
UAT specs explicitly excluded.
**Purpose**: Pre-CR analysis — findings to be discussed and turned into individual
Change Requests for the PM in the following days.

---

## Strengths (architectural foundations to keep)

- **Strategy Pattern** in PIM (`ICategoryProvider`, `ITaskProvider`) + `DomainCache<T>` —
  clean extension points; new providers can be added without touching service logic.
- **Single `LogOutputChannel`** passed through all modules — avoids scattered logging.
- **`configPaths.ts` as single source of truth** for `.jarvis/` paths — the
  consolidation away from 5 deprecated config keys was the right call.
- **`registerDualTool()`** wrapper for LM + MCP — boilerplate well-contained.
- **Feature-toggle architecture** (`jarvis.<feature>.enabled`) consistent across
  activation guards and `when`-clauses for views — clear and traceable.

---

## Findings (prioritized)

### F1 — Heartbeat is becoming a "polling bus for everything" *(top priority)*

**Observation:** `Heartbeat` was originally a **user-facing job scheduler**
(cron-based agent/python/queue steps, visible in the tree, manually triggerable).
It now also runs:

- `Jarvis: Rescan` (internal scanner refresh)
- `Jarvis: Category Refresh` (PIM cache)
- `Jarvis: Task Refresh` (PIM cache)
- `Jarvis: Check Transcripts` (recording watcher)

**Problem:** Four system jobs appear in the same tree as user-defined jobs.
The user did not configure them, has no business with them — but can pause,
delete, or manually trigger them. Semantic confusion between system and user jobs.

**Second problem:** Cron only allows minute-level resolution. So a **second
polling mechanism** runs in parallel — `setInterval(5s)` for auto-delivery
in `extension.ts`. Two polling systems now coexist.

**Challenge to REQ_AUT_\***:
`REQ_AUT_JOBCONFIG` / `REQ_AUT_HEARTBEATVIEW` address *user-defined* jobs. But
`SPEC_EXP_RESCANBRIDGE`, `SPEC_PIM_SERVICE` (`syncCategoryRefreshJob`),
`SPEC_REC_WATCHERJOB` use Heartbeat as implementation convenience. **Was this
intended, or are these spec-level decisions that were never challenged at REQ level?**

**Proposal:**

1. Separate **system jobs** (internal, hidden, non-editable) from **user jobs**
   (in tree, editable). Either via `system: true` flag in YAML or via filter
   in the TreeProvider.
2. Better: introduce a separate **`InternalScheduler`** for pure polling tasks
   that wraps `setInterval` and attaches to the extension disposal lifecycle.
   Heartbeat stays the user-facing tool.
3. The auto-delivery `setInterval(5s)` would also live there.

---

### F2 — Tree-provider coupling: Projects/Events know about Tasks

**Observation:** `ProjectTreeProvider` and `EventTreeProvider` render Task
children under each leaf (`SPEC_EXP_TASKTREE`). Three otherwise independent
features (Projects, Events, PIM/Tasks) are hard-wired. The "cache-only contract"
(synchronous `getTasks()` in `getChildren`) is a workaround for VS Code's
async limitation in TreeDataProvider.

**Proposal:** Decoration pattern via event bus. `PIM/TaskService` emits
`onTasksChanged`; the tree provider decides on its own whether to render
badges / children. Currently the tree class directly depends on TaskService,
costing reusability (e.g. the later-added Sessions view simply has no task
rendering, with the asymmetry unjustified anywhere).

---

### F3 — Race-condition workarounds frozen into specs *(fragility risk)*

**Observation:** The "mode-prime pattern" for agent sessions contains explicit
timing magic:

- `300 ms settle` after `workbench.action.chat.open({ mode })`
- `800 ms settle` in `openNewChatEditor()`

This appears in multiple specs (`SPEC_EXP_AGENTSESSION`,
`SPEC_MSG_AUTODELIVER_POLL`, `SPEC_MSG_SENDCOMMAND`). It works — but it's a
description of a workaround, not architecture.

**Risk:** Breaks with VS Code updates or on faster/slower machines. Tests
become flaky (test protocols likely already show this).

**Proposal:**

- Extract these settle delays into a **central constant** `CHAT_API_SETTLE_DELAYS`,
  so they don't live in three specs/code sites independently.
- File a **VS Code issue** (if not yet): "Allow `workbench.action.chat.open` to
  atomically set mode + create session." That's the real fix.
- Mark in the specs as **"Known Fragility (R-1)"** so it's clear: workaround,
  not design.

---

### F4 — Auto-delivery: init prompt + notification template as mini-DSL

**Observation:** `applyTemplate()` with `${kind}`, `${name}`, `${contextPath}`,
`${count}`, `${destination}` placeholders, configurable via two settings.
Silent passthrough semantics for unknown placeholders. Default texts are
long and discipline-oriented.

**Challenge to `REQ_EXP_AGENTPROMPT_TEMPLATE` / `REQ_MSG_NOTIFICATION_TEMPLATE`**:

- **Has anyone ever changed the default?** If the answer is "no", a mini-DSL
  was built for non-existent use cases.
- The user story behind it ("user customizes prompt") is plausible, but the
  actual risk is: user customizes it, forgets, agent suddenly behaves
  differently, no one finds the setting.

**Proposal:**

- Move default texts into the repository (e.g. `.jarvis/templates/init-prompt.md`)
  rather than `package.json` settings. Versioned, code-review-friendly, and
  still user-overridable.
- If the setting stays: document that unknown placeholders are silently passed
  through — currently code behavior, not in any spec. A lint warning on
  activation would be gold.

---

### F5 — Three asymmetric ways to create sessions *(active — already bit us in front of a customer)*

**Observation:** Three creation paths exist today:

1. `jarvis.newSession` UI command → **slugs** the name for the folder
   (`my-session`)
2. `jarvis_createSession` MCP/LM tool → uses the **verbatim** name as folder
   (`My Session`)
3. Auto-create-on-send (when a session in `sendMessages` does not exist)

The asymmetry between (1) and (2) is explicitly documented in
[spec_ses.rst](../design/spec_ses.rst) with a pointer to a CR Decision entry.
Even so, it violates "one way to do it".

**Customer-visible symptom (real, not theoretical):** The system behaves
differently depending on which entry point is used. Same intent ("open a
session for X"), different result depending on whether the user clicked a
tree button, ran a UI command, called an LLM tool, or sent a message —
because each path has its own find/create/open logic with subtly different
rules (slugging, ordering, missing init-prompt, missing context.md, …).

**Wider problem:** There are three entity types (projects, events, sessions)
but each currently has its own create-and-open logic. **We do not need
3 × 3 logics for create-and-open.**

**Architectural principle (must drive the CR):**

> **Frontends are frontends.** The Messages tree, the LLM/MCP tools, the
> tree-item commands — all of these are just **frontends** whose only job
> is user interaction (input collection, confirmation, button wiring).
> They MUST NOT contain entity lifecycle logic.
>
> **Core operations are unified.** Exactly three core operations exist,
> shared across all entity kinds (project / event / session):
>
> - `findEntity(kind, name)` — returns the entity (and any associated chat
>   session UUID), or `undefined`
> - `createEntity(kind, name, opts)` — writes convention file + `context.md`,
>   rescans, returns the new entity
> - `openEntity(entity)` — opens (or focuses) the agent chat session bound
>   to that entity, applying agent mode + init prompt
>
> **One canonical call pattern.** Every frontend that wants to "talk to
> entity X" does:
>
> ```ts
> let e = await findEntity(kind, name);
> if (!e) { e = await createEntity(kind, name, opts); }
> await openEntity(e);
> ```
>
> No frontend may shortcut, reorder, or reimplement any of these steps.

**Concrete deduplication targets:**

| Concern | Today (duplicated) | After |
|---|---|---|
| Slug rules | newProject, newEvent, newSession (each different) | `createEntity` only |
| Convention-file write | newProject, newEvent, newSession | `createEntity` only |
| `context.md` creation | newSession (✓), newProject (✗), newEvent (✗) | `createEntity` only (closes F10) |
| Rescan after create | all three new* commands + createSessionTool | `createEntity` only |
| Agent-mode prime + settle | openAgentSession, sendMessages, autoDelivery poll | `openEntity` only |
| Init-prompt template apply | openAgentSession, sendMessages, autoDelivery poll | `openEntity` only |
| Session-name → UUID lookup | sendMessages, autoDelivery poll, openAgentSession | `findEntity` only |

**Frontends that become thin after the refactor:**

- `jarvis.newProject` / `jarvis.newEvent` / `jarvis.newSession` — only collect
  user input, then call the pattern.
- `jarvis_createSession` (and future `jarvis_createProject` / `_createEvent`)
  — only validate args, then call the pattern.
- `jarvis.openAgentSession` (tree button) — only resolves `LeafNode → (kind, name)`,
  then calls the pattern.
- `jarvis.sendMessages` / auto-delivery poll loop — only decide *what message*
  to send; calling the pattern is identical to all other frontends.

**Why this matters beyond cleanup:** every future feature touching entity
lifecycle (the `agent` field for the agent-mode-spike was exactly this — a
single concept that had to be wired into three frontends with three subtly
different effects) gets implemented once instead of three times. The
customer-facing symptom disappears not by patching each frontend but by
removing the divergence at the source.

**Timing / sequencing:**

The customer-visible symptom for **sessions** is being addressed in an
in-flight CR right now — that work serves as the **test balloon** for the
unified frontend / core split. Once the find/create/open pattern has proven
itself on sessions, this F5 CR goes to the PM as the generalization step:
**lift events and projects to the same functional level as sessions**, reusing
the same core operations. So F5 is explicitly *not* a "rebuild everything at
once" CR — it is "apply the already-proven Sessions pattern to the other two
entity kinds and remove the duplicated frontend logic".

---

### F6 — Recording: heavy file-IPC choreography

**Observation:** Whisper sidecar coordinates via:

- `.recording.json` (PID + project)
- `.stop` sentinel file
- `input/<stem>.json` (sidecar with project name)
- `output/<stem>.txt` (Whisper output, polled by heartbeat job every 2 min)

That's **four files** for "record audio → drop transcript in inbox".
Works, but:

**Proposal:**

- `vscode.workspace.createFileSystemWatcher('**/output/*.txt')` instead of
  2-minute polling. Reaction in seconds, no additional heartbeat job needed.
- If `recorder.py` itself got an `--on-complete <command>` option, the entire
  sidecar dance disappears.

**Challenge to `REQ_REC_DISPATCH`**: The AC only says "transcript is delivered
to inbox", not "via polling". An implementation detail has been nailed down
at SPEC level.

---

### F7 — MCP server: is anyone using it?

**Observation:** Every tool is dual-registered (LM + MCP). This doubles the
implementation surface for every tool. The MCP server binds to `127.0.0.1`
in stateless HTTP mode.

**Question:** Which MCP client actually connects today? If the answer is
"none right now", that's dead surface area.

**Proposal:**

- If experimental: `jarvis.mcp.enabled` is already `default: false` — good.
  But `registerDualTool` still forces every developer to write an MCP handler.
- If production-planned: documentation of MCP tool contract stability is
  missing (versioning, breaking-change policy). Today any PR can silently
  change the MCP surface.

---

### F8 — Deprecated specs clutter the active spec file

**Observation:** [spec_cfg.rst](../design/spec_cfg.rst) contains 5 specs with
`status: deprecated` (`SPEC_CFG_SETTINGS`, `_HEARTBEATSETTINGS`,
`_UPDATECHECK`, `_SETTINGSGROUPS`, `_DEFAULTPATHS`). Cleanly annotated with
"Superseded by" notes, but they make the file twice as long as needed and
hinder orientation for new agents.

**Proposal:** Either

- (a) Move to `spec_cfg_archive.rst` (reachable via `:hidden:` toctree,
  not in main index), or
- (b) Remove entirely — Git history preserves them. The `Superseded-by`
  relationship is already captured in the successor spec's `:links:`.

---

### F9 — Multiple specs still `status: draft` despite being implemented

**Observation:** Quick scan shows at least:

- `SPEC_MSG_SENDCOMMAND` — draft, but integrated into auto-delivery per code
- `SPEC_MSG_AUTODELIVER_POLL` — draft
- `SPEC_MSG_SESSIONLOOKUP` — draft
- `SPEC_EXP_AGENTSESSION` — draft
- `SPEC_EXP_AGENTSESSION_INITPROMPT` — draft

The status field is the most important "in sync with reality" signal — if
it lies, sphinx-needs loses much of its value.

**Proposal:** One-time sweep through all draft specs: check if code exists →
flip to `implemented`, or add a real rationale why not yet. Could be a
`syspilot.qm` run.

---

### F10 — `context.md` is assumed everywhere but specified nowhere

**Observation:** The init prompt template tells the agent to "read
`${contextPath}` now". `jarvis.openContext` opens the file. `newSession`
writes a minimal one. But: **there is no REQ and no SPEC that defines what
`context.md` is, what goes in it, who owns it.**

For sessions, creation writes `# <name>\n\n<summary>` — that's it. For
projects/events the architecture expects a `context.md`, but writes none.

**Challenge:** `REQ_SES_AGENTPROMPT` leans on `context.md` as the agent's
"persistent memory" — that is an architecture-relevant contract not formulated
anywhere as a requirement. This is a **gap**, not an inconsistency.

**Proposal:** Dedicated `REQ_SES_CONTEXTMD` (or `REQ_EXP_CONTEXTMD`) that
specifies:

- Who writes it initially (`newSession` ✓, `newProject` ✗, `newEvent` ✗)?
- What structure is expected (Decision / Finding / Next from the init prompt —
  belongs in a SPEC)?
- What happens if it is missing? (today: silently ignored)

This finding ties directly into F5 — when we unify entity creation, `context.md`
creation should become a built-in part of the contract.

---

### F11 — `extension.ts` has grown to 2484 lines *(maintainability red zone)*

**Observation:** `src/extension.ts` is currently **2484 lines** with ~356
top-level registrations (commands, LM tools, MCP tools, tree views,
custom editors, helper functions). It contains:

- The full `activate()` orchestration
- All command handler implementations (newProject, newEvent, newSession,
  openAgentSession, sendMessages, rescan, filter commands, context-actions,
  category/task rename/delete/refresh, enable/disableAutoDelivery, …)
- All LM + MCP tool handlers (`registerDualTool` calls for 14 tools)
- The `applyTemplate` helper and the `DEFAULT_INIT_PROMPT` constant
- The `syncRescanJob`, `syncCategoryRefreshJob`, `syncTaskRefreshJob` bridges
- The auto-delivery 5-second poll loop
- Agent-discovery helpers (`discoverAgentModes`, `pickAgentMode`,
  `readFrontmatterBool`)
- Stable session-open helpers (`openPinnedResource`, `openNewChatEditor`,
  `sendPromptToFocusedAgentChat`)
- Default-path bootstrap (`populateDefaultPaths`)
- Job-destination validation (`validateJobDestinations`)
- All `onDidChangeConfiguration` routing

**Is this normal for a VS Code extension?** **No.** The convention is:

- `extension.ts` stays thin — just `activate()` / `deactivate()` plus
  wiring of feature modules.
- Each feature lives in its own folder (`src/projects/`, `src/sessions/`,
  `src/heartbeat/`, `src/pim/`, …) with its own `register(context, …)`
  entry point that owns its commands, tools, tree views, and disposables.
- Cross-cutting helpers (logging, paths, templates) live in dedicated
  modules (`src/logging.ts`, `src/configPaths.ts` ✓ already, `src/templates.ts`).

The PIM layer already follows this pattern correctly (`src/pim/` with its
own files). The rest of the extension does not.

**Why this is starting to hurt:**

- Every CR that adds or changes a command touches `extension.ts`, increasing
  merge-conflict probability on `develop`.
- Reading `extension.ts` end-to-end takes meaningful time; new contributors
  (and new agents) can't form a mental model of the extension from one file.
- The size masks the F5 problem — duplicated find/create/open logic is
  easier to spot when each feature lives in its own module.
- A 2500-line file with 356 top-level constructs trips most code-quality
  tools (cyclomatic complexity, file-length lint rules) by orders of
  magnitude.

**Proposal — target structure:**

```
src/
  extension.ts                 — activate(), deactivate(), feature wiring only (~100-200 lines)
  core/
    entities.ts                — findEntity / createEntity / openEntity (F5)
    templates.ts               — applyTemplate, DEFAULT_INIT_PROMPT
    agentDiscovery.ts          — discoverAgentModes, pickAgentMode
    chatHelpers.ts             — openPinnedResource, openNewChatEditor, ...
  features/
    projects/index.ts          — register(): commands, tree, tools
    events/index.ts            — register(): commands, tree, tools
    sessions/index.ts          — register(): commands, tree, tools
    messages/index.ts          — register(): commands, tree, tools, poll loop
    heartbeat/index.ts         — already exists; verify boundary
    pim/                       — already correct
    recording/                 — extract from extension.ts
  configPaths.ts               — already correct
  logging.ts                   — extract from extension.ts (currently inline)
```

Each `features/<x>/index.ts` exports a single `register(context, services)`
function that owns all VS Code registrations for that feature and returns
nothing (disposables go straight into `context.subscriptions`).

`extension.ts` reduces to a list of `if (cfg.<feature>.enabled) registerX(...)`
calls — which is *also* what the F1 toggle-architecture refactor wants.

**Synergy with other findings:**

- **F1** (heartbeat conflation): easier to draw the line between user-jobs
  and system-jobs when heartbeat lives in its own module that doesn't see
  scanner-refresh / category-refresh internals.
- **F2** (tree-provider coupling): the project/event tree providers will be
  in `features/projects/` and `features/events/` — they should no longer
  reach across into PIM/TaskService directly. Forces an event-bus or
  decoration pattern.
- **F5** (unified entity lifecycle): `core/entities.ts` becomes the natural
  home for the three core operations; every feature module calls them
  instead of reimplementing.

**Sequencing:** This is **not** a single CR. Proposal: do it as a sequence of
small, low-risk extract-module CRs — one feature at a time, behavior-preserving,
each verifiable on its own. Recommended order: `recording` (smallest, mostly
self-contained), then `messages`, then `projects`/`events`/`sessions` together
(they share the entity lifecycle and benefit from being extracted alongside
the F5 work).

---

### Storage locations are scattered

Four storage sources without a single overview doc:

| Source | Content |
|---|---|
| `.jarvis/` (workspace) | heartbeat.yaml, messages.json, autodelivery.json, message-log.json, reminders.yaml, sessions/ |
| `jarvis.projects.folder` / `jarvis.events.folder` (user-configured) | project.yaml, event.yaml + context.md |
| `workspaceStorage/<hash>/state.vscdb` (VS Code internal) | Chat session UUID lookup |
| `globalStorageUri` (VS Code internal) | Path derivation for Remote/Devcontainer |

**Proposal:** A `docs/design/spec_storage.rst` with this table as single
source of truth. Today one has to read `configPaths.ts` + `sessionLookup.ts`
+ dig in `spec_msg.rst`.

### Where specs say "Decision: trade-off", the trade-off is often missing

Multiple specs reference "CR Decision N in docs/changes/…". The spec text
only contains the result. For someone trying to understand the architecture
now without reading the CR history, the result has no rationale — and is
therefore just a rule, not an understanding. **Proposal:** at least a
one-sentence Rationale in the spec, not a full Decision doc copy, but the core.

---

## What I do NOT propose to change

- The sphinx-needs traceability structure (US → REQ → SPEC). It clearly
  works and is the core of the process.
- The toggle architecture. Very clean.
- The Strategy Patterns in PIM. Exemplary.
- The `LogOutputChannel` through-pass. Exactly right.

---

## Priority (proposed)

| Rank | Finding | Reasoning |
|---|---|---|
| 1 | F5 Unified entity creation | Actively biting in front of customers; affects every entity-related change |
| 2 | F11 `extension.ts` modularization | 2484 lines is maintainability red zone; unblocks F1, F2, F5 cleanly |
| 3 | F1 Heartbeat conflation | Structural risk; grows worse with every new periodic need |
| 4 | F3 Race-condition workarounds | Test flakiness and update breakage will become expensive |
| 5 | F10 `context.md` without contract | Conceptual gap; affects the identity of sessions |
| 6 | F9 Draft-status drift | Preserve trust in the specs |
| 7 | F2 Tree-provider coupling | Becomes relevant when Sessions also get tasks |
| 8 | F7 Clarify MCP question | Either justify doubled surface or simplify |
| 9 | F8 Clean up deprecated specs | Pure hygiene, fast to fix |
| 10 | F4 Reconsider template DSL | Only if setting is actually being configured by users |
| 11 | F6 Simplify recording IPC | Works as is; low |

---

## Next steps

These findings are the source from which individual Change Requests will be
spawned over the coming days, in roughly the order above. The CRs will go
through `syspilot.pm` → `syspilot.cm` per normal workflow. This document
remains the parent reference so the relationship between CRs is traceable.
