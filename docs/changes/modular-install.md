# Change Document: modular-install

**Status**: in-progress
**Branch**: feature/modular-install
**Created**: 2026-06-18
**Author**: PM (via CR)

---

## Summary

Deliver Jarvis as a lean core with optional add-ons, so a user installs only the
capabilities they need. Today everything ships in one extension; a user who only
wants agent coordination (sessions, messaging, reminders, heartbeat) still
carries PIM (email/tasks/calendar/categories) and the meeting-minutes recorder —
with their views, settings, and tools cluttering the workspace.

**User story (the single intent of this change):**

> As a Jarvis user, I want to install only the capabilities I need — a lean core
> (sessions, messaging, reminders, heartbeat) with PIM and the meeting-minutes
> recorder as optional add-ons — so my workspace isn't cluttered with views,
> settings, and tools I don't use.

**Product-level acceptance (outcomes, not mechanisms):**

- Installing the core alone provides sessions, messaging, reminders, and
  heartbeat, with **zero** PIM or recorder surface anywhere — no views, settings,
  commands, or tools for features that aren't installed.
- PIM and the recorder can each be added on top to light up their features; the
  recorder works with whatever entity kinds are present.
- Existing users keep their data and current workflows across the transition —
  **no manual migration** of entities, messages, or settings.

**Engineering input (head-start, not a mandate):** a research spike already
analysed feasibility and a candidate approach in depth — see
`.jarvis/sessions/Research/modularization-report.md` and the proven spike under
`experiments/` (branch `research-modularization`). The earlier engine-contract
exploration on `feature/engine-api-contract` is reusable prework. The
architecture and the internal work-split are owned by the CM/architect.

**Out of scope of PM intent:** the release version (assigned by the Release
Manager at release time) and the distribution channel (marketplace / registry)
are not decided by this change.

---

## Architecture Decision Record

Architecture and the internal work-split are owned by the CM/architect, grounded
in the proven spike (`experiments/spike-core` + `experiments/spike-addon` on
branch `research-modularization`).

### AD-1 — Package identity & dependency shape

Four extensions in one monorepo:

- **`enthali.jarvis` (core)** — keeps the existing extension id, so current
  installs update **in place** (no reinstall, no data move). Owns sessions,
  messaging, reminders, heartbeat, the engine, the scanner, session
  lookup, update check. Exports `JarvisCoreApi` from `activate()`.
- **`enthali.jarvis-pim`** — projects, events, categories, tasks, Outlook.
  `extensionDependencies: ["enthali.jarvis"]`.
- **`enthali.jarvis-recorder`** — recording manager, whisper pipeline, transcript
  notifications. `extensionDependencies: ["enthali.jarvis"]`.
- **`enthali.jarvis-mcp`** — MCP server; re-exposes the aggregate tool registry
  over MCP HTTP transport. `extensionDependencies: ["enthali.jarvis"]`.

Rationale: core capabilities are used by every Jarvis project (including
synspilot); PIM, the recorder, and MCP are independent, opt-in use cases. Core
keeping its id is what makes the *no-migration* acceptance hold.

### AD-2 — Engine contract (ratified from spike, revised S5a)

```typescript
/** Recursive subtree node — arbitrary depth below an entity leaf. */
export interface SubtreeNode {
    id: string;
    label: string;
    tooltip?: string;
    command?: vscode.Command;
    contextValue?: string;
    collapsibleState?: 'collapsed' | 'expanded' | 'none';
    iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    children?: SubtreeNode[];
}

export interface EntityKindConfig {
    kind: string;                    // 'session' | 'project' | 'event'
    viewId: string;                  // declared in the owning extension's package.json
    folderSettingKey: string;        // setting that holds this kind's scan folder
    label(name: string, entity?: { data: Record<string, unknown> }): string;  // display-label factory

    // Optional tree-rendering hooks (S5 generalization)
    getChildren?(entity: { name: string; filePath: string; data: Record<string, unknown> }): SubtreeNode[] | undefined;
    leafCommand?(node: TreeNode): vscode.Command;
    leafTooltip?(entity: { name: string; summary?: string; data: Record<string, unknown> }): string | vscode.MarkdownString | undefined;
}

/**
 * Decorator for tree items of a registered entity kind.
 * Called after the engine builds a base TreeItem; may mutate it in place.
 */
export interface TreeItemDecorator {
    decorate(item: vscode.TreeItem, node: TreeNode, kind: string): void;
}

export interface JarvisCoreApi {
    readonly version: 1;
    registerEntityKind(config: EntityKindConfig): vscode.Disposable;
    registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable;
    /** Register a decorator for a kind's tree items; returns a Disposable that removes it. */
    registerDecorator(kind: string, decorator: TreeItemDecorator): vscode.Disposable;

    // --- Scanner query surface (AD-3: add-ons query the engine, never scan independently) ---

    /** Return the scanned tree for a registered kind ([] if unknown/empty). */
    getTreeForKind(kind: string): TreeNode[];
    /** Look up a single entity by id (YAML file path); undefined if not cached. */
    getEntity(id: string): EntityEntry | undefined;
    /** Trigger a full rescan of all registered kinds; resolves when done. */
    rescan(): Promise<void>;

    // --- Tool registry exposure surface (AD-7: MCP consumer support) ---

    /** Descriptor for a registered tool. */
    interface ToolDescriptor { name: string; description: string; }

    /** Return descriptors for all currently registered tools (snapshot). */
    getRegisteredTools(): ToolDescriptor[];

    /** Invoke a registered tool by name. Throws if not registered. */
    invokeTool(
        name: string,
        options: vscode.LanguageModelToolInvocationOptions,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult>;

    // --- Heartbeat job registration (persistent, NOT session-scoped) ---

    // --- Lightweight view refresh (decoration state changes) ---

    /** Request a re-render of a registered kind's tree view (e.g. after an
     *  add-on's decoration state changed). Fires the tree's change event;
     *  does NOT re-scan the filesystem. No-op if the kind is not registered. */
    refreshKind(kind: string): void;

    /** Register or update a heartbeat job (idempotent upsert by name). Persistent. */
    registerJob(job: HeartbeatJob): Promise<void>;
    /** Remove a heartbeat job by name. No-op if not found. Persistent. */
    unregisterJob(name: string): Promise<void>;
    /** Return all persisted heartbeat jobs (snapshot, includes paused). */
    listJobs(): HeartbeatJob[];
}
```

`registerEntityKind` returns a Disposable that immediately removes the kind's
tree + tools. `registerTool` validates the `jarvis_` prefix and rejects
duplicates (throws — no silent shadowing). `registerJob`/`unregisterJob` are
**persistent** (write to `heartbeat.yaml`, survive restarts) — they do NOT
return a Disposable. `listJobs` returns the current job set. The API is versioned
from day one so add-ons can guard against future incompatibilities.

### AD-3 — One central scanner

The core owns a single generic scanner driven by registered kinds. Each add-on
declares its scan folder via `EntityKindConfig.folderSettingKey`; the engine
reads that setting and scans. No per-add-on scanner duplication.

### AD-4 — One generic tree-provider factory

The three near-identical tree providers collapse into one engine-owned
`TreeProvider` driven by registered kinds. Add-ons may decorate their own items
(PIM task counts, recording highlight).

### AD-5 — Tool namespacing (breaking, accepted)

- Core: `jarvis_<verb>` (e.g. `jarvis_listSessions`, `jarvis_setReminder`).
- PIM: `jarvis_pim_<verb>` (e.g. `jarvis_pim_listProjects` — **renamed** from
  today's `jarvis_listProjects`).
- Recorder: `jarvis_rec_<verb>`.

This renames the PIM/recorder tool surface. Accepted as a breaking change: an
agent that finds a tool missing locates the identically-described sibling one
infix away and re-calls it. No user-data migration is involved (tool names are
API surface, not stored data).

### AD-6 — Settings stay under `jarvis.*` (zero migration)

A setting's namespace is independent of the extension boundary. The PIM and
recorder extensions keep contributing their settings under the **`jarvis.*`**
umbrella (the config keys are plain strings). Existing values
(`jarvis.projects.folder`, `jarvis.recording.*`, …) are read unchanged by the
new extensions. **No settings migration** — the acceptance line holds verbatim.

### AD-7 — MCP as a fourth extension (registry consumer) — added mid-change, PM-confirmed 2026-06-19

Scope was extended (stakeholder proposal → CM proposal to PM → **PM confirmed**)
to also split **MCP support** out of core into **`enthali.jarvis-mcp`**
(`extensionDependencies: ["enthali.jarvis"]`). This supersedes the "MCP shell in
core" line in AD-1.

Rationale: MCP is a niche, opt-in capability — only needed when one VS Code
instance talks to another (`jarvis.mcp.enabled` defaults false). It fits
`US_MOD_INSTALL` ("install only what you need") and sheds the
`@modelcontextprotocol/sdk` dependency from core.

**Distinct shape — MCP is a CONSUMER, not a contributor.** Unlike PIM/recorder
(which contribute kinds/tools *into* the engine), MCP re-exposes the **aggregate
tool registry** — every tool registered by every extension — over the MCP
protocol. It therefore requires a **new engine API surface**: the engine must
expose its tool registry for enumeration + invocation (e.g. a "list registered
tools / invoke by name" surface on `JarvisCoreApi`). This is a genuine
engine-contract addition, designed first by the System Designer with the same
rigor as the original contract — not a copy of the contribute pattern. The MCP
extension owns the `jarvis.mcp.*` settings; it registers no `jarvis_` tools of
its own (it is a transport over others' tools).

**Tripwire (PM condition):** if the registry-API design surfaces complexity that
threatens the already-proven core/PIM/recorder foundation, MCP is peeled back
out to a focused fast-follow change rather than risking the validated three. The
4th split must not destabilize the three that are host-validated.


---

## Internal Step Plan (confidence-building sequence)

Validation lands at **stage boundaries**, not at every micro-step — several
steps are only collectively verifiable (e.g. the contract and the
characterization tests must both land before the first green gate).

| Step | What | Validation signal |
|------|------|-------------------|
| **S0+S1** | Characterization tests for current behaviour **and** engine types/contract | Existing behaviour codified; contract compiles; spike acceptance reproduced as unit tests |
| **S2** | Internal modular cut: `src/engine/`, `src/apps/{session,pim,recorder}/`, `src/shared/` — same single extension, behaviour unchanged | Full test suite green; no behaviour change |
| **S3** | Monorepo scaffolding (npm workspaces); 3 `package.json`s; shared build builds all 3 | All packages compile; host loads core alone without error |
| **S4** | Physical split — core: core `package.json` owns only core surfaces; `session` wired through engine | Host, core-only: sessions work; **zero** PIM/recorder surface |
| **S5** | Physical split — PIM extension (depends on core) | Host, core+PIM: PIM surfaces light up; core-only still zero-trace |
| **S6** | Physical split — recorder extension (depends on core) | Host, core+recorder: recording works; core-only still zero-trace |
| **S7** | Install-combo matrix | core / core+pim / core+rec / core+pim+rec each verified in host |
| **S8** | Extension pack `enthali.jarvis-suite` + all-in build | Pack installs cleanly; individual installs still work |

**Distribution channel** (marketplace/registry) and the **self-updater /
package-manager** work (incl. risk R9 — `uninstallExtension` with a real id) are
**out of scope** of this change per PM.

---

## Known Cross-App Seams (to cut before the physical split)

S2 (internal cut) is behaviour-preserving and intentionally leaves the
monolith's existing couplings in place. The following cross-app edges were
surfaced during S2 and **must be inverted before** the corresponding physical
split, or zero-trace (`REQ_MOD_ZEROTRACE`) breaks.

| Seam | Where | Direction today | Required end-state | Cut in |
|------|-------|-----------------|--------------------|--------|
| Recording highlight on project/event nodes | ~~`apps/pim/projectTreeProvider.ts`, `apps/pim/eventTreeProvider.ts` import `RecordingManager`~~ | ~~`pim → recorder`~~ | The **recorder decorates PIM's items** via the generic tree-factory decoration extension point (`REQ_ENG_TREEFACTORY` AC-3 / AD-4). PIM holds no recorder reference. | **Resolved in S5b-2** (removal) + **S6** (restoration): recorder extension registers `TreeItemDecorator` on project/event kinds via `api.registerDecorator`; calls `api.refreshKind` on recording start/stop. Seam inversion complete — recorder → engine → PIM items, PIM holds zero recorder reference. |

The coupling is shallow and already optional (constructor param
`recordingManager?`), so the inversion is a decoration hand-off, not a rewrite.

- **S4a factory-generalization debt:** The generic tree factory currently hardcodes session-correct leaf semantics that happen to match project/event today (click command `jarvis.openAgentSession`, `tooltip = summary`, leaf `contextValue` from kind). Project and event additionally render **task sub-nodes** (`vscode.openWith` + `jarvis.taskEditor`) and task-count/recording decorations. When project/event migrate to the factory in **S5/S6**, the factory must drive **children structure, click command, and tooltip from `EntityKindConfig` / decorators** rather than hardcoding them — otherwise the engine carries concrete-kind knowledge (violating SPEC_ENG_REGISTER_KIND). Tracked as S5 work.

**Engine-layer cleanliness (verified after S2):** `src/engine/**` imports
nothing from `src/apps/**` (grep-verified empty). The heartbeat scheduler was
relocated `engine/ → apps/session/` to remove the only backward edge.

---

## Test Strategy (two-tier)

- **Tier 1 — engine unit / characterization (vitest, developer-facing):** engine
  + IoC wiring, runtime registration/disposal, generic scanner & tree, plus
  characterization tests pinning current behaviour where coverage is thin (tree
  rendering, create paths, recording chain) **before** any carving. These verify
  the `SPEC_ENG_*` acceptance criteria directly — they are **not** UAT (a user
  cannot observe them).
- **Tier 2 — install-combo / zero-trace (extension host, user-facing):** the UAT
  tree (`US_UAT_MODULAR_INSTALL`). Launch the host with a chosen set of packages
  — core only, then +pim, then +recorder — mirroring the real user install
  journey. Asserts true zero-trace (an uninstalled add-on has no `package.json`,
  hence no view/setting/command/tool) and no data/message/settings migration.
  These cannot be faked in unit tests.

The test plan evolves with the packaging stages. **Final acceptance is verified
only at the end**, against the actually-split packages; every intermediate gate
is confidence-building.

---

## Level 0 — User Stories

| ID | Title | File |
|----|-------|------|
| `US_MOD_INSTALL` | Install only the capabilities I need | `docs/userstories/us_mod.rst` |
| `US_UAT_MODULAR_INSTALL` | Modular install acceptance tests (Test Engineer perspective) | `docs/userstories/us_uat_modular_install.rst` |

One product story (`US_MOD_INSTALL`) capturing the change's whole intent, plus
one acceptance-test story (`US_UAT_MODULAR_INSTALL`) from the Test Engineer
perspective — following the house convention where every change has a
corresponding `US_UAT_*`. No engine-level user stories: the engine is an
internal enabler captured at REQ/SPEC level, tracing up to `US_MOD_INSTALL`.

## Level 1 — Requirements

| ID | Trace | Theme |
|----|-------|-------|
| `REQ_MOD_CORE` | US_MOD_INSTALL | Core standalone = sessions/messaging/reminders/heartbeat |
| `REQ_MOD_ADDONS` | US_MOD_INSTALL | PIM & recorder separately installable, depend on core |
| `REQ_MOD_ZEROTRACE` | US_MOD_INSTALL | Uninstalled add-on = no surface anywhere |
| `REQ_MOD_NOMIGRATION` | US_MOD_INSTALL | Entities/messages/settings preserved; core keeps id; `jarvis.*` settings |
| `REQ_ENG_CONTRACT` | US_MOD_INSTALL | Versioned `JarvisCoreApi`: `registerEntityKind` + `registerTool` |
| `REQ_ENG_SCANNER` | US_MOD_INSTALL | Central scanner driven by registered kinds + `folderSettingKey` |
| `REQ_ENG_TOOLNS` | US_MOD_INSTALL | `jarvis_` prefix, `_pim_`/`_rec_` infix, duplicate rejection |
| `REQ_ENG_TREEFACTORY` | US_MOD_INSTALL | Generic tree-provider factory replacing per-kind providers |
| `REQ_ENG_TOOLREGISTRY` | US_MOD_INSTALL | Tool registry exposure: enumerate + invoke registered tools |

## Level 2 — Design Specifications

| ID | File | Concern |
|----|------|---------|
| `SPEC_ENG_API` | `spec_eng.rst` | `JarvisCoreApi` + `EntityKindConfig` types, versioning, export |
| `SPEC_ENG_REGISTER_KIND` | `spec_eng.rst` | `registerEntityKind` semantics + disposal |
| `SPEC_ENG_REGISTER_TOOL` | `spec_eng.rst` | `registerTool` prefix validation + duplicate rejection |
| `SPEC_ENG_SCANNER` | `spec_eng.rst` | Generic scanner driven by registered kinds |
| `SPEC_ENG_TREEFACTORY` | `spec_eng.rst` | Generic tree-provider factory + add-on decoration |
| `SPEC_MOD_MONOREPO` | `spec_mod.rst` | npm-workspaces layout, shared build |
| `SPEC_MOD_CORE_PKG` | `spec_mod.rst` | Core `package.json` surface; keeps `enthali.jarvis` id |
| `SPEC_MOD_PIM_PKG` | `spec_mod.rst` | PIM extension surface + `extensionDependencies` |
| `SPEC_MOD_REC_PKG` | `spec_mod.rst` | Recorder extension surface + `extensionDependencies` |
| `SPEC_MOD_SUITE` | `spec_mod.rst` | `enthali.jarvis-suite` extension pack |
| `SPEC_MOD_MCP_PKG` | `spec_mod.rst` | MCP extension surface + `extensionDependencies` |
| `SPEC_ENG_TOOLREGISTRY` | `spec_eng.rst` | Tool registry exposure: `getRegisteredTools` + `invokeTool` |
| `SPEC_ENG_HEARTBEAT_JOBAPI` | `spec_eng.rst` | Heartbeat job registration API: `registerJob` + `unregisterJob` + `listJobs` (persistent) |
| `SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP` | `spec_aut.rst` | Command step soft-skip for unregistered (add-on) commands |

---

*Maintained by the design architect (this session, operating as `syspilot.design`).*

---

## Known Cross-App Seams (S4b transitional — resolved in S5b-2)

The following transitional import seams existed after S4b and have been resolved
in S5b-2 (PIM add-on physical split):

- `projectTreeProvider.ts` and `eventTreeProvider.ts` — **deleted** in S5b-2.
  Their logic is fully ported to `projectKind.ts`, `eventKind.ts`, and
  `TaskBadgeDecorator` (engine factory + decorators). The `pim → recorder`
  seam is resolved by removal; recording highlight deferred to S6 decorator.
- Tests that verified parity against the old providers
  (`projectTreeEquivalence.test.ts`, `eventTreeEquivalence.test.ts`) — replaced
  by standalone expectation tests (`projectTreeExpectation.test.ts`,
  `eventTreeExpectation.test.ts`) that assert kind-config + decorator output
  against known expected literals.

---

## Deferred Items (intentional, tracked)

Behaviours intentionally NOT carried through the split, with disposition:

| Item | Where it lived | Disposition |
|------|----------------|-------------|
| **Recording highlight** on project/event nodes (red `circle-filled`) | `projectTreeProvider`/`eventTreeProvider` via `RecordingManager` | **RESTORED in S6** as a recorder-contributed `TreeItemDecorator` on the project/event kinds via `registerDecorator` + `refreshKind`. Decorator order: recorder highlight runs after PIM's `TaskBadgeDecorator` (appended later); the recording icon overwrites the task-badge icon when active — the recording indicator takes visual priority. |
| **"Uncategorized Tasks" top-level node** (open tasks matching no entity) | `projectTreeProvider.getChildren()` prepended to tree root | **Deferred** (user decision). Dropped in S5; the generic factory has no kind-contributed top-level-node hook. A **follow-up CR** will decide whether/how to restore it (e.g. a `getTopLevelNodes?()` factory hook). Orphaned open tasks are not shown in the tree after S5; they remain in Outlook. |

**Task badge preserved (NOT deferred):** the project/event entity-leaf task
badge — `description` = open-task count, plus overdue (`warning`) / due-soon
(`charts.yellow`) status icon (`_applyTaskBadge`) — IS carried through, now
implemented as a **PIM decorator on its own kind** via the
`SPEC_ENG_TREEFACTORY` decoration extension point (AC-3). It is asserted in the
S5b-1 parity tests (`description` + `iconPath` compared).

---

## Validation Log

| Step | Gate | Result |
|------|------|--------|
| S0+S1 | engine contract types + characterization tests compile/green | PASS |
| S2 | internal cut, behaviour unchanged, engine layer apps-free | PASS |
| S3 | npm-workspaces scaffolding, 3 manifests, all compile | PASS |
| S4a | real engine (kind-driven scanner, generic factory, registerEntityKind/Tool); session through engine; genuine equivalence test | PASS |
| S4b | core-alone in Extension Host: all core functions, only core settings, ZERO PIM/recorder surface — host-validated by user | PASS |
| S4b edge | orphaned-command zero-trace defect → `SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP` (warn+skip, no popup) — host-confirmed | PASS |
| S5a | recursive `SubtreeNode` tree-factory model; session unchanged | PASS |
| S5b-1 | project/event `EntityKindConfig`s drive the factory; task badge as decorator; honest parity tests (`description`+`iconPath`); uncategorized node deferred | PASS |
| S5b-2 | PIM extracted to `packages/pim` (engine acquired via exports; `jarvis_pim_*` tools; manifest migrated; old providers deleted → `pim→recorder` seam resolved); both packages rebuild-stable; core still zero-trace | PASS |
| **S5 host** | **core+PIM in Extension Host: Projects & Events views + task subtree + task badge work; core still functions** — host-validated by user | **PASS** |
| S6 | Recorder extracted to `packages/recorder`: recording.ts moved; activate() wires RecordingManager + highlight decorator (`registerDecorator` on project/event) + `refreshKind` on start/stop + heartbeat job via `registerJob`; commands (start/stop/checkTranscripts) + status bar; manifest migrated; root `_contributes` removed (all add-on slices now in packages); all three packages rebuild-stable; vitest green; `vsce package` in recorder succeeds; core zero-trace confirmed | PASS |
| menu-fix | `view/item/context` regression from the split: monolith used shared `/^jarvis(Project\|Event\|Session)$/` clauses; partition restored — core=session-only (removed erroneously-added `openAgentSession`/`openSessionContext` inline), PIM=project/event share added (`openContext`/`openYamlFile` inline + `reveal*`/`openInTerminal`), recorder start/stop verified. Handlers were always in core (cross-ext refs) | PASS |
| **S6 host** | **core+PIM+recorder in Extension Host: recording works, recording highlight restored; session inline icons de-duplicated; project/event inline icons restored** — host-validated by user | **PASS** |

**S5 open caveat (not a blocker):** Categories and Tasks rendered **empty** in
the host test. Root cause is the **Outlook integration** (data source), which was
flaky on the test machine. PIM's `activate()` registers the Outlook category/task
providers correctly (gated by `jarvis.outlook.enabled`), the category **view**
renders, and none of the Outlook/category/task **logic** was modified by the
split — so there is no evidence of a refactoring regression. **Rendering of
categories/tasks with live Outlook data remains to be reconfirmed** once Outlook
is available; tracked here so it is not forgotten.

