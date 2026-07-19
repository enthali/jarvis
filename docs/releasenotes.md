# Release Notes

## v0.20.2 — Remove Auto-Delivery Focus Gate

*2026-07-19*

### Changes

- **remove-autodelivery-focus-gate** (GH #38): Removes the focus gate from message auto-delivery. Previously, auto-delivery was silently suppressed when the target session's chat tab had UI focus — this caused delivery deadlocks in parallel-pipeline scenarios where multiple actors ran concurrently (only one can be "last active", so the focused one would never receive its messages). The focus gate is now gone; messages are delivered unconditionally on the poll tick regardless of tab focus. The per-session enable/disable toggle (`jarvis.enableAutoDelivery` / `jarvis.disableAutoDelivery`) is unchanged as an explicit opt-out mechanism.
  *(REQ_MSG_AUTODELIVER_POLL; US_MSG_AUTODELIVERY_OPTOUT deprecated)*

---

## v0.20.1 — TouchStore Race Fix + Pagination

*2026-07-19*

### Fixes

- **touched-files-write-race** (GH #35): Fixes a data-loss race in the Recently Touched Files store. Under concurrent tool calls (multiple `PostToolUse` events firing simultaneously for the same entity), touched-file entries were silently dropped — whichever async write completed last would overwrite the others' mutations. Fixed by switching `TouchStore` I/O to synchronous `fs.readFileSync`/`writeFileSync` so each read-mutate-write cycle is an uninterruptible event-loop turn. No change to the feature's observed behavior beyond correctness.
  *(SPEC_ENT_TOUCHEDFILES AC-6a)*

- **flow-message-pagination** (GH #36): Message Flow Diagram initial load and load-more increment reduced from 500 to 30 entries. The default cap and the "+500" button are now "+30", keeping the diagram responsive in large workspaces. The time-lens default window and lens-handle behavior are otherwise unchanged.
  *(REQ_FLOW_DATASOURCE; REQ_FLOW_LOADMORE; REQ_FLOW_TIMELENS)*

---

## v0.20.0 — Recently Touched Files

*2026-07-17*

### Features

- **actor-touched-files** (GH #18): Each Actor/Project/Event node now shows a **Recently Touched Files** subtree listing files the AI read or wrote during that entity's session. Touch events are captured by the Hook Engine on `PostToolUse` (any write tool touch is recorded regardless of success/failure). Files render as a workspace-root-relative hierarchy with last-read/last-edited tooltips. Click a `.md` file to open it as rendered Markdown Preview; all other files open in VS Code preview mode. Context menu: Copy Path, Copy Full Path, Reveal in Explorer, and an inline trash icon to remove an entry. Persisted in `.jarvis/state/touched-files/<kind>-<name>.json` and survives VS Code reload. Storage key correctly distinguishes Actor entities from Session entities even though the underlying scanner kind is shared.
  *(US_ENT_TOUCHEDFILES; REQ_ENT_TOUCHEDFILES; SPEC_ENT_TOUCHEDFILES)*

---

## v0.19.0 — Message Log Viewer + Actor Activity Indicator

*2026-07-17*

### Features

- **message-log-viewer** (GH #31): Adds a scrollable `WebviewPanel` to jarvis-flow (`packages/flow`) that displays all messages from `message-log.json` as a list (newest first) with sender, recipient, date/time, and word-wrapped content. A **Requeue** button on each entry re-delivers the original message to its recipient (no new audit-log entry is written). Auto-refresh is scroll-position-driven: the list polls every 5 s when at the top and freezes when scrolled down; a "Jump to Top" button restores auto-refresh. Opened via command `jarvis.openMessageLog` and an icon button in the jarvis-flow `view/title` contribution point.
  *(US_FLOW_LOGVIEWER; REQ_FLOW_LOGVIEWER; REQ_FLOW_REQUEUE; SPEC_FLOW_LOGVIEWER; SPEC_FLOW_REQUEUE)*

- **actor-activity-indicator** (GH #28): Adds a two-state (Active / Inactive) activity indicator to every entity node (Actor, Project, Event) in the Jarvis Entities tree, driven by the Hook Engine. A green `circle-filled` ThemeIcon marks the node whose session is currently processing; all idle nodes revert to their normal icon (no indicator asserted). Updates in real time — any hook event sets the entity Active; a `Stop` event returns it to Inactive. Also fixes a prerequisite bug in `hookIntake.ts` where `session_id` was extracted as camelCase `parsed.sessionId` instead of the actual snake_case payload field `parsed.session_id`, causing `event.sessionId` to always be `undefined`.
  *(US_HOOK_ACTIVITY; REQ_HOOK_ACTIVITY; REQ_HOOK_INTAKE; SPEC_HOOK_ACTIVITY; SPEC_HOOK_INTAKE)*

### Infrastructure

- **release.yml fix**: Removed invalid `update_existing` input from the GitHub Actions release workflow (no CD — direct infrastructure fix).

---

## v0.18.0 — Recursive Entity File Tree + Dynamic Tree Title

*2026-07-16*

### Features

- **actor-owned-files-tree** (GH #15): Replaces the fixed 3-file MVP (context.md/YAML/agent file) under each entity node with a two-category subtree — **Agent** (conditional: single node for the resolved agent file, only when the entity has one configured) and **Files** (always: recursive listing of all files in the entity's own folder, alphabetical, hidden files included, subfolders expandable). `.md` files (including `*.agent.md`) open as rendered Markdown Preview; all other files open in VS Code preview mode. Right-click Copy Path/Copy Full Path is available on all file and folder children. Provider-local node types intentionally kept out of the shared `TreeNode` union in `yamlScanner.ts`, avoiding the v0.15.1 `collectLeaves()` regression class.
  *(US_ENT_ENTITY_FILES_TREE; REQ_ENT_ENTITY_FILE_CHILDREN; SPEC_ENT_ENTITY_FILE_CHILDREN)*

- **dynamic-tree-title**: The Jarvis Entities tree view now shows the first workspace folder's name in its title (e.g. "my-repo Entities") instead of the static "Jarvis Entities", making it immediately clear which project's entities are displayed in multi-project environments. Falls back to "Jarvis Entities" when no workspace folder is available.

---

## v0.17.3 — jarvis-flow Self-Update Fix

*2026-07-15*

### Fixes

- **flow-updater-fix** (GH #30): Fixes a silent omission in the "Download & Install" self-update flow where `enthali.jarvis-flow` was missing from the extension-ID → VSIX-filename mapping in `updateCheck.ts`. Users who clicked "Download & Install" after an update notification had jarvis-core/pim/mcp/recorder updated but jarvis-flow silently skipped. Also adds the missing `jarvis-flow` row to `SPEC_REL_UPDATENOTIFY`'s VSIX mapping table.

---

## v0.17.2 — Entity File Children Regression Fix + Bold Category Labels

*2026-07-14*

### Fixes

- **unified-entity-tree regression**: Restores context.md/session-yaml/agent-file children under entity nodes in the Jarvis Entities tree — these file children were silently lost in the v0.17.0 unified-entity-tree refactor due to `getChildren` not correctly passing through async results for leaf nodes. No CD (Infrastructure Changes — direct spec-adjacent fix, user-approved).
- **bold category node labels** (GH #29): Category headers (Actors/Projects/Events) in the unified tree now render in bold via Unicode Mathematical Sans-Serif Bold character substitution (`REQ_EXP_UNIFIEDTREE` AC-13, `SPEC_EXP_UNIFIEDTREE` amended). No CD (Infrastructure Changes — user-approved direct fix).

---

## v0.17.1 — Agent Mode Persistence After Window Reload

*2026-07-14*

### Fixes

- **agent-mode-persistence**: Fixes GitHub Issue #25 — GitHub Copilot Chat could silently lose the selected Agent Mode for an already-open chat session/tab, most reliably after a VS Code window reload. Since most agents are addressed via the async messaging system (`jarvis_sendMessage`/`jarvis_receiveMessage`), a chat tab that silently lost Agent Mode could respond as a generic assistant instead of running its intended workflow, with no obvious signal anything was wrong. Adds a defensive patch that re-applies the agent's mode via VS Code's undocumented per-mode command (`workbench.action.chat.open<ModeName>`), working around the upstream limitation tracked at microsoft/vscode#317276. User live-tested and confirmed.

---

## v0.17.0 — Consequent Actor Renaming (Phases 1–5) + Pre-Release Polish

*2026-07-14*

Ships the full "Consequent Actor Renaming" initiative end-to-end — the "Session" entity kind (already renamed at the spec level in v0.15.0's `entity-taxonomy-rename`) is now also renamed throughout the UI, code, storage convention, and tool API to **Actor**.

### Breaking Changes

- **actor-tool-rename** (Phase 5, final): Renames the LM/MCP tools `jarvis_createSession` → `jarvis_createActor` and `jarvis_listSessions` → `jarvis_listActors`. Hard cutover — the old tool names are **removed entirely**, no deprecated stubs or aliases (light/occasional usage made a soft-deprecation cycle unnecessary, unlike the earlier `sendToSession`/`readMessage` rename). `jarvis_sendToSession` (already hard-deprecated) and `jarvis_listChatSessions` (a distinct, genuine VS Code concept) are unaffected.

### Features

- **actor-terminology-rename** (Phase 1): Renames all user-facing UI labels, command titles, and remaining spec/skill prose from "Session" to "Actor" for the entity kind — genuine VS Code "chat session" terminology is unaffected.
- **actor-internal-identifiers-rename** (Phase 1b): Renames the remaining internal code identifiers (tree view ID, `jarvis.newSession` command ID, TypeScript class/type names) to their Actor equivalents. Includes a bundled fix to the shared `jarvis.openAgentSession` command title, which Phase 1 had incorrectly relabeled for its Project/Event menu entries too.
- **actor-dualpath-scanner** (Phase 2): Introduces the new on-disk naming convention (`.jarvis/actors/*/actor.yaml`) alongside the existing one (`.jarvis/sessions/*/session.yaml`); the scanner reads and merges both. Old-named actors remain fully supported indefinitely — no forced migration, no end date.
- **unified-entity-tree** (Phase 3): Collapses the three separate Actors/Projects/Events Explorer trees into one unified "Jarvis Entities" tree, with category sub-groups shown only when more than one entity kind is present, plus a cross-category live-filter search.
- **actor-migration-command** (Phase 4): Adds an opt-in, Command Palette-only "Jarvis: Migrate Session to Actor" command to migrate one old-convention actor at a time to the new convention; sends a fire-and-forget notification to the migrated actor's inbox afterward.
- **project-actor-click-placement-fix**: Fixes first-open (not just repeat-open) chat sessions to reliably land at the Main editor column across all three entity kinds, closing a gap previously accepted as a VS Code API limitation in `editor-group-placement` (v0.15.0).

### Fixes

- **entity-category-icon-order**: Aligns the inline icon order on category nodes in the unified tree — Filter, then New — consistently for both Projects and Events.

### Infrastructure

- **eslint-flat-config**: Adds the previously-missing `eslint.config.js` (ESLint 9 flat config), unblocking the release validation lint gate. Pre-existing `no-unused-vars`/`no-explicit-any` violations are demoted to warnings pending a follow-up cleanup pass.

---

## v0.16.0 — Message Flow Diagram, Canonical Message API, Time Lens

*2026-07-03*

### Features

- **message-flow-diagram**: Adds a new package (`jarvis-flow`, "Jarvis Message Flow") with an interactive D3 chord-diagram visualization of inter-agent message traffic, sourced from `.jarvis/message-log.json`. Ships as a VS Code Webview Panel, opened via an icon button on the Messages tree-view title bar. Nodes are sessions/actors, edges are directional message counts, with a "Fog of Time" age-based opacity fade and hover tooltips (message count, time range, sample text). Refreshes via a 5s poll of the log file. Clicking an actor node opens that actor's chat at Main; the diagram itself occupies the shared "Content Tab" (column 2) alongside entity docs.

- **flow-time-lens**: Replaces the Fog-of-Time single fade slider in the Message Flow Diagram with a two-handle message-index range lens (start/end, indexed by message rank from the newest loaded message). The start handle live-tracks the newest message at rank 1 and anchors-by-identity elsewhere; the end handle always anchors-by-identity. Adds a "+500" cap-expansion button to load further history, a drag tooltip showing the message timestamp, and lowers the minimum opacity floor from 15% to 5%.

### Breaking Changes

- **message-api-rename**: Introduces canonical `jarvis_sendMessage`/`jarvis_receiveMessage` tools (LM + MCP), replacing `jarvis_sendToSession`/`jarvis_readMessage`. The old tool names remain registered (for discoverability) but are now **hard-deprecated** — every invocation throws `"This tool is deprecated and no longer functional. Use jarvis_sendMessage/jarvis_receiveMessage instead."` with no fallback behavior. Full removal of the old registrations is tracked separately (GitHub Issue #13, earliest 2026-09-30). The new `jarvis_sendMessage` also requires `senderSession` (no more silent fallback to the active editor tab, which produced incorrect sender attribution, e.g. after Focus-Snapshot/Restore) — validated against the same session list used for `destination`. All `.github/agents/*.agent.md` files and the `syspilot.orchestration-jarvis` skill were updated to pass `senderSession` explicitly.
  *(Supersedes the standalone `sendtosession-required-sender` CR, folded into this one per PM decision — "better now and hard than later and soft".)*

### Infrastructure

- Added missing package READMEs for `pim`, `recorder`, and `flow`.
- `release.yml` now packages and publishes `flow` and `suite` alongside the existing packages.

---

## v0.15.2 — Entity Context Menu, Log-Level Cleanup, UI Conveniences & venv Autodetect

*2026-07-03*

### Features

- **entity-tree-context-menu**: Removes the 2 inline icon buttons (`jarvis.openContext`, `jarvis.openYamlFile`) on Project/Event/Actor root tree nodes — redundant since `entity-files-tree` already exposes these as file children. Adds a right-click context menu (Open / Copy Path / Copy Full Path) on both file-children nodes and entity root nodes, giving quick access to absolute filesystem paths.
  *(US_ENT_ENTITYPARITY; US_ENT_ENTITY_FILES_TREE; US_ENT_OPENCONTEXT)*

- **ui-improvements**: Five additive tree-view conveniences — copy category name from grouping nodes; "Copy File Name" entry on file-child nodes; `context.md` now opens in VS Code's rendered Markdown preview instead of raw text; "Collapse All" title-bar button on all 6 Jarvis tree views; clicking a session/actor group node's label in the Messages tree now opens that actor's chat at Main.

### Fixes

- **heartbeat-venv-autodetect**: Fixes GitHub Issue #20 — Python heartbeat steps now auto-detect a workspace virtual environment (`.venv`/`venv`) before falling back to bare `python` on PATH, fixing silent failures caused by the system interpreter lacking project dependencies. Failure notifications now include a stderr tail so the real error (e.g. `ModuleNotFoundError`) is visible without opening the debug-level output channel.
  *(US_AUT_HEARTBEAT)*

### Infrastructure

- **hook-log-level-reduction**: Hook event logging at the default `info` level is reduced to event-name-only (`[Hook] PreToolUse`); the full JSON payload moves to `trace` level, only visible when trace logging is explicitly enabled. Pure log-verbosity change, no functional impact.
  *(REQ_HOOK_LOG; SPEC_HOOK_LOG)*

- **repo hygiene**: Stopped tracking workspace-runtime/scratch files (`.jarvis/messages.json`, `.jarvis/heartbeat.yaml`, `testdata/.jarvis/{messages.json,autodelivery.json,heartbeat.yaml}`) — `.gitignore` + `git rm --cached` only, not a functional change.

---

## v0.15.1 — collectLeaves() TreeNode Exhaustiveness Hotfix

*2026-07-02*

### Fixes

- **pim-treenode-filenode-fix**: Fixes an urgent full-package-suite build break where `collectLeaves()` in `packages/pim/src/extension.ts` failed to compile because `TreeNode` (`packages/core`) gained a third union variant, `FileNode`, when `entity-files-tree` (v0.15.0) added file-tree-children support. `collectLeaves()` now exhaustively handles all 3 `TreeNode` variants (leaf/folder/file) — a pure type-narrowing correctness fix, no behavior change. Also adds the missing `SPEC_ENT_ENTITY_FILE_CHILDREN` ↔ `SPEC_PRJ_LISTPROJECTS` spec cross-link so this class of gap surfaces during future impact analysis instead of recurring.
  *(SPEC_ENT_ENTITY_FILE_CHILDREN; SPEC_PRJ_LISTPROJECTS)*

---

## v0.15.0 — Editor Placement, Entity File Tree, Taxonomy & Context Cleanup

*2026-07-02*

### Features

- **editor-group-placement**: Introduces a three-target editor-group placement model (Main / Docs / Secondary) with no new state — targets are derived at runtime from the current editor layout. Clicking an Actor in the tree always opens at Main (closing and reopening if the tab is open elsewhere); `context.md`/YAML/agent-file opens land at Docs; deliveries to not-yet-open sessions land at the last existing column (Secondary). Adds a Focus-Snapshot/Restore mechanism around system-initiated (Auto-Delivery) deliveries so the user's focus is automatically restored afterward, and an opt-out for Auto-Delivery on sessions actively being used. The manual Play-button (`jarvis.sendMessages`) entry point is also routed to Main, closing a gap found during joint manual testing where it had no assigned placement target.
  *(REQ_MSG_EDITORPLACEMENT; REQ_MSG_SEND; SPEC_MSG_SENDCOMMAND; REQ_UAT_CHATEDITORREUSE)*

- **entity-files-tree**: Session, Project, and Event tree nodes are now expandable, showing their 3 core files (`context.md`, YAML config, agent file if configured) as clickable children with tooltips showing the full file path. Purely additive — existing inline tool-icon shortcuts are unchanged.
  *(US_EXP_ENTITY_FILES_TREE; US_EXP_SIDEBAR; US_SES_SESSIONS; US_SES_TREECLICK; US_EXP_ENTITYPARITY)*

### Cleanup

- **entity-open-context-cleanup**: Unifies `jarvis.openContext` as the single command for opening `context.md` across Project, Event, and Actor entity kinds, retiring the dead, unreachable `jarvis.openSessionContext` command (and its stale `REQ_ACT_TREECLICK` description). Standardizes on the `$(notebook)` icon and `preview: false` across all 3 kinds; discovery-only behavior (no auto-create) is kept uniform.
  *(REQ_ACT_TREECLICK; REQ_ENT_OPENCONTEXT; REQ_ACT_OPENCONTEXT; REQ_ACT_CONTEXTMENU)*

- **entity-taxonomy-rename**: Spec-only cleanup establishing a consistent entity taxonomy — the "Session" kind is renamed to **Actor** (Hewitt actor model: mailbox=queue, state=context.md, heartbeat=activator+supervisor), joining Project and Event as the three peer entity kinds under the umbrella concept **Jarvis Entity**. Realigns theme boundaries: generic cross-kind concepts move to a new **ENT** theme, plumbing stays in **ENG**, kind-specific concepts live in **PRJ/EVT/ACT**, and **EXP** narrows to the sidebar UI frame only. Consolidates duplicate specs and fixes several mis-filed items. No code changes — pure specification/documentation.
  *(namingconventions.rst theme table; US_EXP_SIDEBAR and dependents)*

---

## v0.13.3 — WSL2 Username Fallback

*2026-06-27*

### Fixes

- **wsl2-username-fallback**: Fixes WSL2 compatibility where `USERNAME` environment variable is often unset while `USER` is available. Added consistent fallback pattern `process.env.USERNAME ?? process.env.USER ?? 'unknown'` across all username-dependent code paths. Session lookup now correctly resolves Windows user paths in WSL2 environments. When both `USERNAME` and `USER` are unavailable, falls back to `globalStorageUri` path instead of throwing. Closes GitHub Issue #7.
  *(US_MSG_REMOTECOMPAT; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP)*

### Infrastructure

- **release-agent-prevalidate**: Adds a pre-release Sphinx validation step to the Release Engineer workflow. Before any version bump or document move, the agent runs `python -m sphinx -b html docs docs/_build/html -W --keep-going`. If the build fails (warnings or errors), the release is aborted immediately. This prevents broken documentation from being released (e.g., malformed tables in RST files).
  *(SYSPILOT_US_NEW_1; SYSPILOT_REQ_NEW_1; SPEC_xxx)*

---

## v0.13.2 — Release Agent Patch + Sphinx Validation

*2026-06-27*

### Infrastructure

- **release-agent-patch**: Patches the Jarvis Release Agent to work correctly with the monorepo
  setup instead of syspilot-specific hardcoded paths. The agent now discovers the current version
  by scanning the `docs/changes/<version>/` directory. Version bumps now cover all 6 `package.json`
  files (root, `packages/core`, `packages/pim`, `packages/recorder`, `packages/mcp`,
  `packages/core-gh`). `npm install` is run after the version bump to regenerate
  `package-lock.json`, fixing the `npm ci` blocker that broke the release pipeline after v0.13.0.

- **release-agent-sphinx-validate**: Adds a pre-release Sphinx validation step to the Jarvis Release
  Agent. The agent now runs `python -m sphinx -b html docs docs/_build/html -W --keep-going`
  before starting the release process. If the build fails (warnings or errors), the agent aborts
  the release and returns the error via RESPOND. This prevents broken documentation from being
  released (as happened in v0.13.1 where malformed tables in RST files caused the Doc-CI to fail
  after the release was already tagged).

---

## v0.13.1 — Release Agent Patch

*2026-06-27*

### Infrastructure

- **release-agent-patch**: Patches the Jarvis Release Agent to work correctly with the monorepo
  setup. Removes syspilot-specific hardcoded paths; the agent now discovers the current version
  by scanning the `docs/changes/<version>/` directory. Version bumps now cover all 6 `package.json`
  files (root, `packages/core`, `packages/pim`, `packages/recorder`, `packages/mcp`,
  `packages/core-gh`). `npm install` is run after the version bump to regenerate
  `package-lock.json`, fixing the `npm ci` blocker that broke the release pipeline after v0.13.0.

---

## v0.13.0 — Legacy Retirement Shim + Icon Alignment

*2026-06-26*

### Migration

- **retire-jarvis-legacy**: Final release of the legacy `enthali.jarvis` extension (formerly
  distributed via GitHub Releases as the original Jarvis). This release converts the legacy
  extension into a migration-only shim: on startup, if `enthali.jarvis-core` is already installed,
  the shim immediately uninstalls itself and surfaces no duplicate views, heartbeat, or message
  processing (preventing concurrent operation on shared `.jarvis` project data). If
  `enthali.jarvis-core` is not installed, the shim offers a direct Marketplace install; if the
  Marketplace is unreachable (corporate environments), it offers a GitHub Releases `.vsix` fallback.
  If both channels fail, the shim stays active, shows a manual-install link, and retries on next
  startup — no dead-end state. Migration is automatic (notify-then-proceed). This is the final
  `enthali.jarvis` release; no further legacy releases follow.
  *(US_REL_RETIRELEGACY; REQ_REL_RETIRELEGACY; SPEC_REL_RETIRELEGACY)*

### UX

- **icon-alignment**: Aligns the VS Code activity bar icon with the marketplace "J" icon.
  Previously the activity bar showed a generic circle/play SVG while the marketplace displayed
  the serif-J monogram. A single-source `resources/jarvis.svg` (monochromatic, `currentColor`)
  now serves as the canonical icon. A `scripts/generate-icons.mjs` generation script regenerates
  all five package `resources/jarvis-128.png` files (128×128) from that SVG. All `package.json`
  files reference the icon field. Consistent branding across both surfaces.
  *(US_REL_PKGCONTRACT; REQ_REL_ICONALIGN; SPEC_REL_ICONALIGN)*

---

## v0.12.0 — Selective Self-Updater + Add-on Marketplace Icons

*2026-06-24*

### Features

- **selective-updater**: Replaces the "first `.vsix` wins" auto-updater with an extension-aware
  selective installer. The updater now detects which `enthali.jarvis*` extensions the user has
  installed, maps each to its expected VSIX filename in the GitHub Release, and downloads and
  installs only the matching assets. A single *Reload Now* prompt is offered after all matched
  VSIXs are installed. Fixes the regression where `enthali.jarvis-core` users received the
  legacy `jarvis-*.vsix` instead of `jarvis-core-*.vsix` from the auto-updater.
  *(US_REL_SELFUPDATE AC-6/AC-7; REQ_REL_UPDATEINSTALL rewritten)*

### UX

- **addon-icons**: Adds marketplace icons for the Jarvis PIM, Recorder, and MCP add-on
  extensions. Each add-on now carries the `jarvis-128.png` icon and an `icon` field in its
  `package.json`, replacing the generic grey placeholder on the VS Code Marketplace. Closes
  the spec gap by adding AC-8 to `SPEC_REL_PKGCONTRACT` and `REQ_REL_PKGCONTRACT`.

### Spec

- **lockfile-sync-ac**: Adds AC-7 to `REQ_REL_PKGCONTRACT` and `SPEC_REL_PKGCONTRACT`
  requiring that the root `package-lock.json` is updated whenever any workspace package
  dependency changes, and that `npm ci` passes locally before any release tag is pushed.
  Makes lock-file hygiene an enforceable pre-release gate.

## v0.11.2 — Lockfile Sync Acceptance Criterion

*2026-06-24*

### Spec

- **lockfile-sync-ac**: Closes the spec gap exposed by the v0.11.1 CI failure. Adds AC-7
  to `REQ_REL_PKGCONTRACT` and `SPEC_REL_PKGCONTRACT` requiring that the root
  `package-lock.json` is updated (via `npm install` at the workspace root) whenever any
  workspace package dependency changes, and that `npm ci` is verified to pass locally before
  any release tag is pushed. This makes lock-file hygiene an enforceable pre-release gate,
  not a manual convention.

## v0.11.1 — Extension Package Contract + CI Fix

*2026-06-24*

### Fixes

- **extension-pkg-contract**: Fixes the broken v0.11.0 CI caused by missing `build.js` scripts
  in the `jarvis-pim`, `jarvis-recorder`, and `jarvis-mcp` add-on packages. Each add-on now
  has an esbuild `build.js` that satisfies the new `SPEC_REL_PKGCONTRACT` spec element.
  `vsce package --no-dependencies` succeeds for all add-ons and the CI release pipeline
  completes end-to-end without error.

### Spec

- **extension-pkg-contract**: Introduces `SPEC_REL_PKGCONTRACT` — a reusable specification
  element that defines the mandatory structural prerequisites for every publishable Jarvis
  extension package: an esbuild `build.js`, a `.vscodeignore`, a `vscode:prepublish` script
  invoking compile + bundle, and the required VS Code Marketplace `package.json` fields.
  All per-package specs (`SPEC_MOD_CORE_PKG`, `SPEC_MOD_PIM_PKG`, `SPEC_MOD_REC_PKG`,
  `SPEC_MOD_MCP_PKG`) link to this contract. Future packages are spec-compliant from day one.

- **extension-rename** *(retroactive archive)*: The `extension-rename` change document was
  not removed from the `docs/changes/` root after the v0.11.0 back-merge. It is archived
  here as a housekeeping action; no functional change.

## v0.11.0 — Dual-VSIX CI + Marketplace Identity

*2026-06-24*

### New Features

- **extension-rename**: `enthali.jarvis-core` is now the official VS Code Marketplace identity
  for the Jarvis core extension. This is the first release where `jarvis-core` and all
  add-ons (`jarvis-pim`, `jarvis-recorder`, `jarvis-mcp`) are published to the marketplace
  via CI automatically on every release tag push. The CI release workflow is split:
  `enthali.jarvis` (core-gh) vsix → GitHub Releases only; `enthali.jarvis-core` + add-ons →
  `vsce publish` to marketplace. The add-on packages update their `extensionDependencies`
  to reference `enthali.jarvis-core` so that marketplace users get the correct dependency
  resolved automatically. Existing users of `enthali.jarvis` via GitHub Releases and the
  auto-update mechanism are unaffected.

## v0.10.0 — VS Code Marketplace Publishing

*2026-06-23*

### New Features

- **marketplace-publish / extension-rename**: `enthali.jarvis-core` is now published to the VS Code
  Marketplace. Users can find and install Jarvis directly from the Extensions
  view without visiting GitHub or downloading a `.vsix` manually. The extension
  page shows a description, icon, keywords, and a link to the repository.
  The CI release workflow now runs `vsce publish` automatically after each
  release tag is pushed — every future release reaches the marketplace without
  manual intervention. The existing GitHub Releases auto-update path (`enthali.jarvis`)
  is unchanged.

## v0.9.0 — CI Fix + WSL2 Session Lookup

*2026-06-23*

### Improvements

- **ci-core-bundle**: Fixes the broken CI pipeline introduced by v0.8.0
  modularization. `packages/core` is now bundled with esbuild, inlining all
  third-party runtime dependencies (`cron-parser`, `js-yaml`, `sql.js`).
  Packaging uses `vsce package --no-dependencies`, eliminating the
  `../../node_modules/…` path errors from npm-workspaces hoisting. The
  resulting vsix is ~425 KB.

- **wsl2-session-lookup**: `lookupSessionUUID` now correctly resolves the
  session database in WSL2 remote environments. When running in WSL2, the
  extension detects the remote via `/proc/version` and maps the Windows host
  path through `/mnt/c/Users/<USERNAME>/AppData/Roaming/Code/User/` instead
  of the unreachable Linux `globalStorageUri` path. Prevents duplicate sessions
  on `sendToSession` calls from WSL2.

## v0.8.0 — Modular Install

*2026-06-22*

Jarvis is now delivered as a lean core extension with optional add-ons. Install
only what you need — the core (`enthali.jarvis`) ships sessions, messaging,
reminders, and heartbeat with zero PIM or recorder surface. PIM and the
meeting-minutes recorder are independent add-ons. Existing users keep all data
and workflows with no manual migration.

### New Features

- **modular-install**: Jarvis ships as 4 independent VS Code extensions:
  `enthali.jarvis` (core), `enthali.jarvis-pim` (email/tasks/calendar),
  `enthali.jarvis-recorder` (meeting minutes), and `enthali.jarvis-mcp` (MCP
  server). Each extension contributes only its own views, settings, commands,
  and tools. The core alone provides a fully functional session/messaging/
  heartbeat workspace with zero PIM or recorder clutter. A convenience
  `enthali.jarvis-suite` extension pack installs all four.

### Improvements

- **listprojects-shape-parity**: `jarvis_listProjects` now returns `summary`
  and `agent` alongside `name` and `folder`, giving all three entity list
  tools a consistent output shape. Closes F-18 from the v0.7.0 backlog.
  Change is additive/backward-compatible.

- **initprompt-extract-overflow**: Default agent-session initialization prompt
  extended with a sixth discipline bullet — when a topic grows past ~5 bullets
  in `context.md`, the agent moves it to a dedicated file and leaves a one-line
  summary with a relative link. Provides a sanctioned path for knowledge that
  deserves to persist but is too large for a single bullet.

- **remove-open-recording-icon**: Dead `jarvis.openRecording` tree-item icon
  and its `+recording` contextValue suffix removed from project, event, and
  session tree items. The icon suggested a per-entity recording artifact that
  does not exist; its removal reduces visual clutter. Recording start/stop
  inline icons and the active-recording highlight are unchanged.

---

## v0.7.0 — Entity Parity (BREAKING)

*2026-06-03*

YAML is the source of truth; the chat session is an ephemeral view. This
release delivers full feature parity across the three YAML-backed entity
types (Sessions, Projects, Events), a breaking tool-surface swap, KISS
folder-naming, schema strictness, uniform UX, and a shared destination
validator.

### Breaking Changes

- **tool-surface-swap**: `jarvis_listSessions` now returns **YAML-entity
  objects** (was: chat-tab title strings). The old string-list behaviour is
  now exposed as `jarvis_listChatSessions`. Agents that relied on
  `jarvis_listSessions` returning plain title strings must be updated to call
  `jarvis_listChatSessions` instead.

### New Features

- **jarvis_listEvents**: New MCP tool returning the list of YAML-backed event
  entities, analogous to `jarvis_listSessions` for sessions.

- **jarvis_createProject / jarvis_createEvent**: New MCP tools for creating
  projects and events programmatically, analogous to `jarvis_createSession`.
  Folder names are stored verbatim (raw name 1:1, KISS — no kebab/slug
  transformation). `validateInput` enforces the same name rules as sessions.
  Existing kebab-named project/event folders remain readable without
  migration.

- **schema-strictness-option-c**: `agent` is now a required field on project
  and event schemas. `summary` is required on event schemas. Legacy YAML
  files that omit these fields **fail-open** with a warn-log rather than
  crashing — backward compatibility is preserved at runtime.

- **ux-parity**: Tree-click opens the chat in the assigned agent mode for all
  three entity types (Sessions, Projects, Events). Inline action icons (YAML,
  context.md, Recording) are now uniform across all entity tree items. The
  lazy-bind picker has been removed (user decision v11): clicking an unbound
  entity opens the default chat directly without mutating the YAML.

- **unified-openChatForEntity**: A shared `openChatForEntity()` helper
  consolidates the four chat-open call sites (`openAgentSession`, `newProject`,
  `newEvent`, `newSession`), eliminating code duplication.

- **destination-validation-union**: `jarvis_sendToSession` now accepts
  destinations from the union of {YAML-backed entities (Session/Project/Event)}
  ∪ {active VS Code chat-session titles}. Auto-delivery poll opens the chat on
  first inbound message (same path as v0.6.1).

- **shared-destination-validator**: `jarvis_sendToSession` and heartbeat job
  registration (`jarvis_registerJob`) now share a single destination-validation
  function — drift between the two validation paths is eliminated by design.

- **prompt-templates-settings-group**: Session and message prompt-template
  settings are now grouped under a dedicated "Prompt Templates" settings
  group (previously scattered under "Sessions" / "Messages").

- **3-state-agent-scanner**: The agent-mode scanner now operates in three
  states (unset / set / no-agent), making agent-binding semantics explicit and
  preventing the empty-string → undefined coercion that caused a double-prompt
  regression in v0.6.x.

- **context-menu-regex-anchored**: The `view/item/context` menu contribution
  regex is now anchored (`/^jarvis(Project|Event|Session)(\+recording)?$/`)
  to prevent Messages-Tree items from inheriting entity inline icons or
  context-menu entries.

### Known Limitations / Future Work (deferred backlog)

The following items were found during this CR and accepted by PM as
non-blocking for v0.7.0. They will be addressed in follow-up CRs:

- **F-2, F-5, F-10, F-12, F-13, F-14, F-15** — Documentation,
  cosmetic, and scanner-warning gaps. (F-18 closed by v0.7.1.)
- **B-1** — Recording-icon is a dead feature (no underlying implementation).
- **B-2** — Chat-burst race condition (edge case, low frequency).
- **B-7** — UAT: destination-disappeared edge case in auto-delivery.
- **F-17** — Positive finding: agent-validation against available chat-modes
  works correctly; tracked for a follow-up hardening CR.

---

## v0.6.1 — Agent-mode and init-prompt reliability hotfix

*2026-05-23*

Fix: agent-mode and init-prompt now applied reliably on all session-open paths.
Agent picker now uses **default-include opt-out** policy for agent discovery.

### Bug Fixes

- **session-init-prompt-on-autoopen**: Regression in v0.6.0 where auto-delivered
  sessions and tree-click-opened sessions did not pick up the agent-mode bound in
  `session.yaml`. Root cause: `workbench.action.openChat` creates a session using
  the user's currently-active mode; the post-creation `chat.open { mode }` call
  cannot retroactively change a session's mode. Fixed with the **mode-primed
  creation pattern**: the caller primes `workbench.action.chat.open { mode:
  entity.agent }` + 300 ms settle before `openNewChatEditor()`, so the new session
  is born in the bound agent mode. All three call sites patched: `openAgentSession`,
  `sendMessages` (new-session branch), and the auto-delivery poll loop (new-session
  branch). Init-prompt submission unchanged.

- **agent-discovery-default-include**: Agent picker (`pickAgentMode`) previously
  excluded any `*.agent.md` file that did not have `user-invocable: true` explicitly
  set — silently hiding newly created agent files. Policy changed to **default-include
  opt-out**: a file is included unless `user-invocable: false` is explicitly present.
  Orchestration agents (`syspilot.*` with `user-invocable: false`) are unaffected.
  Implemented via `isExplicitlyExcluded()` helper in `src/extension.ts`.

- **agent-identity-unification**: Agent identity is now resolved as
  `name?.trim() || filename-stem`, where `name` comes from the YAML frontmatter of
  the `*.agent.md` file. The picker displays and stores the frontmatter name (e.g.
  `Change Manager`) rather than the filename stem (e.g. `syspilot.cm`) when a
  `name:` key is present. Existing `session.yaml` files that store a filename-stem
  value continue to resolve correctly (backward compatible).

- **session-folder-verbatim-naming**: Session folders are now created with the
  exact name entered by the user — no slug or kebab-case transformation is applied.
  Names containing spaces (e.g. `Change Manager`) produce a folder with a literal
  embedded space. Invalid names (containing path separators, control characters, or
  Windows reserved device names) are rejected via real-time inline validation in the
  name InputBox; the OK button is disabled until a valid name is entered.


---

## v0.6.0 — Agent-aware Sessions

*2026-05-22*

Session–agent binding, heartbeat destination validation, and a spec-debt cleanup round.

### New Features

- **session-agent-binding**: Sessions can now be bound to a specific agent (chat mode) at creation time. An optional agent picker — populated from `.github/agents/*.agent.md` files with `user-invocable: true` in frontmatter — appears in the `jarvis.newSession` UI. The chosen agent is persisted as an optional `agent` field in `session.yaml`. When the session is opened, the chat editor switches directly to that agent mode. `jarvis_createSession` accepts an optional `agent` parameter; unknown agent names produce an error listing available agents. Existing `session.yaml` files without an `agent` field continue to work unchanged. Schema updated with optional `agent` field.

### Bug Fixes / Improvements

- **validate-session-destination**: `jarvis_sendToSession` now validates the destination session name before writing to the queue. Calling it with an unknown session name fails immediately with an error that includes the supplied name and the list of currently valid destination names. Valid destinations behave as before.
- **validate-heartbeat-queue-destination**: Heartbeat `queue` steps are now validated at `heartbeat.yaml` load time and at `jarvis_registerJob` invocation. Invalid destinations surface a visible notification and log warning containing job name, step index, and the invalid value. At fire time the invalid step is skipped (soft skip — remaining steps continue). `jarvis_registerJob` returns an error and refuses to persist a job with an invalid destination.

### Internal / Notes

- **spec-timing-cleanup**: Doc-only. Closed all 9 deferred MECE advisories from `chat-editor-reuse-on-session-open` (6) and `list-session-entities-gating-bug` (3). Sphinx build clean. No source changes.

## v0.5.11 — Sessions stack v1

*2026-05-20*

Sessions as a first-class entity type, reminders, a suite of new LM/MCP tools, and a disciplined agent init-prompt. Includes a **breaking settings reorganisation** — see migration notes below.

### ⚠ Breaking Changes — Settings Migration Required

The `settings-cleanup` change reorganised all Jarvis settings into logical feature groups. The following settings have been **removed or renamed**:

| Old setting | Replacement | Notes |
|---|---|---|
| `jarvis.heartbeatConfigFile` | *(removed)* | Fixed path: `.jarvis/heartbeat.yaml` in workspace root |
| `jarvis.messagesFile` | *(removed)* | Fixed path: `.jarvis/messages.json` in workspace root |
| `jarvis.mcpEnabled` | `jarvis.mcp.enabled` | Consistent dotted-group naming |
| `jarvis.outlookEnabled` | `jarvis.outlook.enabled` | Consistent dotted-group naming |
| `jarvis.projectsFolder` | `jarvis.projects.folder` | Consistent dotted-group naming |
| `jarvis.eventsFolder` | `jarvis.events.folder` | Consistent dotted-group naming |

**Default changes:**
- `jarvis.messages.logging` default flips from `false` → `true` (opt-out, not opt-in).
- `jarvis.projects.enabled` defaults to **off** (was implicitly on via empty path).
- `jarvis.events.enabled` defaults to **off** (was implicitly on via empty path).

**Action required:** Open VS Code Settings (`Ctrl+,`), search for `jarvis`, and verify your configured values. All runtime files now live under `.jarvis/` in the workspace root — add `.jarvis/` to `.gitignore` if desired.

### New Features

- **sessions-feature**: New entity type **Sessions** — a lightweight alternative to Projects for Copilot-agent and dev-session workflows. `session.yaml` schema (`name` + `summary`), `SessionTreeProvider` in the sidebar, `jarvis.sessions.enabled` toggle (default on), fixed path `.jarvis/sessions/`, `jarvis.newSession` command, and full context-menu parity. Sessions are independent of the Projects/Events toggles.
- **reminders**: New Reminders feature. `jarvis_setReminder({ text, session, deliverAt })` schedules a future message delivery via the auto-delivery pipeline. `jarvis_listReminders()` lists open reminders with remaining time. `jarvis_cancelReminder({ id })` cancels before delivery. A dedicated **Reminders** sidebar view shows open reminders. Reminders persist across restarts via `.jarvis/reminders.yaml`.
- **list-jobs-tool**: New LM/MCP tool `jarvis_listJobs()` — returns all registered heartbeat jobs with `name`, `schedule`, `enabled`, and `nextFire` (ISO timestamp or `null` for manual/paused jobs). Registered via the standard `registerDualTool` pattern.
- **agent-prompt-tuning**: Disciplined default init-prompt for new agent sessions: forces `context.md` read on open, restricts entries to Decision/Finding/Next bullets, enforces a 2-week relevance gate, and prohibits raw tool output/transient chatter. Prompt is user-configurable via `jarvis.agentSession.initPromptTemplate` (`${kind}`, `${name}`, `${contextPath}` placeholders). Auto-delivery notification is now English by default and user-configurable via `jarvis.messages.notificationTemplate` (`${count}`, `${destination}` placeholders).
- **create-session-tool**: New LM/MCP tool `jarvis_createSession` — programmatically creates a session folder with `session.yaml` and `context.md`, optionally seeds an initial message, and auto-opens the agent chat. Idempotent: existing sessions are detected and returned as success without overwriting. Gated by `jarvis.sessions.enabled`.
- **session-tree-click-behavior**: Sessions Tree default click now opens the agent-chat editor (not `context.md`). A dedicated inline `$(book)` icon on each session item opens `context.md` directly. Aligns click semantics with primary session purpose.

### Bug Fixes

- **list-session-entities-gating-bug**: `jarvis_listSessionEntities` was registered unconditionally even when `jarvis.sessions.enabled=false`. It is now gated inside the same `if (sessions.enabled)` block as `jarvis_createSession`, consistent with the static-gating ADR.
- **chat-editor-reuse-on-session-open**: Opening a new Jarvis session now always produces a fresh, dedicated chat editor. Previously `vscode-chat-session://local/new` was reused across calls, causing init-prompt and conversation to land in the wrong chat. Fixed by replacing all three call sites with `workbench.action.openChat`.

### Internal / Notes

- **tool-deregistration (rejected)**: Runtime LM tool add/remove is not achievable with the current VS Code API — `dispose()` on a tool registration does not remove it from the Tool Picker. Retained as an ADR. Static gating at activation (with reload) remains the project standard.
- **Pre-existing ESLint issue**: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file` — ESLint v9 vs `.eslintrc.*` config mismatch. Pre-existing, not introduced in this release. Deferred.
- **6 deferred MECE advisories** from `chat-editor-reuse-on-session-open`: minor spec/wording improvements noted during MECE final pass; deferred to a future maintenance CR.

## v0.5.10

*2026-05-18*

Context-file auto-discovery with QuickPick, and heartbeat job pause/resume.

### New Features

- **context-file-discovery**: `jarvis.openContext` now auto-discovers `context.md` one level deep when none exists at the entity root. If multiple matches are found, a QuickPick lets the user choose. Direct hits take precedence (no picker). Hidden folders are ignored.
- **heartbeat-pause-resume**: Heartbeat jobs can be paused and resumed without removing them from `heartbeat.yaml`. Active jobs show a `$(debug-pause)` inline button; paused jobs show `$(debug-continue)` (resume + immediate run). Pause state is persisted as `enabled: false` in YAML and survives restarts. The manual `$(play)` trigger works on both active and paused jobs independently of pause state.

## v0.5.9

*2026-05-07*

Inline context.md button on tree nodes, devcontainer-compatible session lookup, and heartbeat play-button feedback toast.

### New Features

- **open-context**: New `jarvis.openContext` command adds an inline `$(notebook)` button on project and event leaf nodes. Opens `context.md` from the entity's folder directly in the VS Code text editor. Shows an info message when the file does not exist.
- **heartbeat-feedback-toast**: An info toast is shown immediately when the user manually triggers a heartbeat job via the play button, confirming the job has started.

### Fixes

- **devcontainer-session-lookup**: Session lookup now derives the `state.vscdb` path from `globalStorageUri` instead of a hard-coded relative path. Fixes an off-by-one segment error (`../..` instead of `../../..`) that broke session lookup on Windows and in Remote/Devcontainer environments.

## v0.5.8

*2026-05-05*

Hotfix: auto-delivery notification no longer resets agent/mode selection of target sessions.

### Fixes

- **auto-delivery**: Use `workbench.action.chat.open` instead of `openAgent` for notification delivery — preserves session agent mode
- **session-rename**: New sessions created by auto-delivery or manual send are `/rename`d to the destination name for future lookup

## v0.5.7

*2026-05-05*

Stable session opening and initialization.

### New Features

- **stable-session-open**: Three new helpers (`openPinnedResource`, `openNewChatEditor`, `sendPromptToFocusedAgentChat`), `/rename` after session creation, context.md initialization prompt. Replaces fragile `vscode-chat-session://local/new` approach.

## v0.5.6

*2026-05-02*

Optional audit logging for the message queue.

### New Features

- **message-logging**: New setting `jarvis.messages.logging` (boolean, default `false`). When enabled, `appendMessage()` also writes each message to an append-only `message-log.json` file (sibling to `messages.json`). The log is never cleaned up by read or delete operations, providing a persistent audit trail.

## v0.5.5

*2026-05-01*

Direct Delivery mode for message sessions — auto-deliver notifications without manual Play-button clicks.

### New Features

- **auto-delivery**: AutoDeliver-Sessions receive notifications automatically via a 5-second poll loop. New `autodelivery.json` config file (sibling to `messages.json`) stores the list of enabled session names. Messages gain a `notified` flag to prevent duplicate delivery (max 1 message per tick). The Messages tree adds an "Auto Delivery" group (⚡ icon) at root level. Enable/disable via context menu commands (`jarvis.enableAutoDelivery` / `jarvis.disableAutoDelivery`).

## v0.5.0

*2026-04-15*

Outlook Tasks and Categories integration with a generic PIM layer, auto-category creation for new entities, and spec alignment fixes.

### New Features

- **outlook-categories**: Generic PIM category layer (`ICategoryProvider`, `DomainCache<T>`, `CategoryService`, `jarvis_category` LM+MCP tool, Categories sidebar view, `jarvis.pim.showCategories` setting). Outlook COM provider (`OutlookCategoryProvider`) plugs in as the first concrete provider, gated by `jarvis.outlookEnabled`. Architecture decouples generic PIM (theme `PIM`) from Outlook-specific code (theme `OLK`) for future provider extensibility.
- **outlook-tasks**: Outlook Tasks integration inline in the Project/Event tree (`ITaskProvider`, `TaskService`, `DomainCache<Task[]>`, `OutlookTaskProvider`, inline task nodes, `TaskEditorProvider` Custom Editor, `jarvis_task` LM+MCP tool). Tasks linked to projects/events via Outlook `categories` field. Gated by `jarvis.outlookEnabled === true` AND `jarvis.outlook.tasks.enabled === true`. "Uncategorized Tasks" section at top of tree for unlinked tasks.
- **new-entity-category**: When creating a new project or event via `jarvis.newEntity`, an Outlook category is automatically created using the pattern `"Project: <name>"` / `"Event: <name>"`, guarded by `jarvis.outlookEnabled` and `categoryService.hasProviders()`. Errors never block entity creation.

### Fixes & Docs

- **outlook-tasks-spec-fix**: Docs-only alignment of `REQ_PIM_TASKEDITOR` and `SPEC_PIM_TASKEDITOR` with the actual implemented Task Editor UI — auto-save replaces explicit Save button, "Open in Outlook" button removed. `val-outlook-tasks.md` updated accordingly.

## v0.4.0

*2026-04-13*

New user features: grouped settings, feature-toggled sidebar views, context menu actions, chronological event sorting, and a new listProjects tool.

### New Features

- **list-projects**: New `jarvis_listProjects` LM+MCP tool — exposes all scanned projects via `registerDualTool()`, available to both VS Code language models and MCP clients.
- **settings-grp**: Settings reorganized into 6 categories (Projects, Events, Heartbeat, Messages, MCP Server, Updates). Sidebar views for Events, Messages, and Heartbeat are now feature-toggled — hidden when their corresponding setting is empty. `populateDefaultPaths()` writes defaults at activation so Messages and Heartbeat appear automatically.
- **context-actions**: Three context menu actions on project and event nodes — Reveal in Explorer, Reveal in File Explorer, and Open in Terminal. Delegates to VS Code built-in commands.
- **event-sort**: Events are sorted chronologically by `dates.start` instead of alphabetically. Labels show date prefix: `2025-06-24 — Event Name`.

### Fixes

- Zod `.describe()` added to all MCP tool parameter schemas for better client-side documentation.
- MCP client config moved to `testdata/.vscode/mcp.json`.

### Docs & Infra

- Role renaming: Developer → Change Manager, QA-Engineer → Quality Manager.
- QA doc improvements: new REQ/SPEC artifacts (`REQ_DEV_ACTIVATION`, `REQ_DEV_DISPOSAL`, `SPEC_EXP_RESCANBRIDGE`), 21 link hygiene fixes.
- Git workflow updated to develop-based squash-merge strategy.

## v0.3.1

*2026-04-11*

Bugfixes, new heartbeat tools, and documentation corrections.

### New Features

- **heartbeat-job-tools**: Two new LM+MCP tools (`jarvis_registerJob`, `jarvis_unregisterJob`) — exposes the existing heartbeat job registration API via `registerDualTool()`, making it available to both VS Code language models and MCP clients.

### Fixes

- **sender-fix**: `jarvis_sendToSession` now prioritises the explicit `senderSession` parameter over the ambient active-tab label, fixing agent-to-agent sender identification.
- **qa-fix-critical**: Fixed `session` → `destination` field name in REQ_AUT_JOBCONFIG AC-5; updated sidebar section count from 3 to 4 in US_UAT_SAMPLEDATA T-1.
- **qa-doc-cleanup**: Corrected `OutputChannel` → `LogOutputChannel` in 5 SPECs, moved US_EXP_AGENTSESSION to the correct file (`us_exp.rst`), clarified UAT scope overlap in US_UAT_EXPLORER.

## v0.3.0

*2026-04-10*

Six new features: scanner improvements, heartbeat UI and registration API, pull-based message inbox, structured logging, and an embedded MCP server.

### New Features

- **scanner-refresh**: Fix YAML content-change detection (tree refresh now triggers on entity data changes, not just structure), add rescan button to Projects and Events title bars, and sort tree nodes by entity `name` instead of filesystem folder name.
- **heartbeat-view**: Add a 4th tree view "Heartbeat" to the Jarvis sidebar — visualizes all jobs from `heartbeat.yaml` with job name + next execution time, step details, inline play button per job, and view-title actions to run all non-manual jobs and refresh.
- **heartbeat-register**: Job registration API (`registerJob`/`unregisterJob`) for the heartbeat scheduler — extension modules register heartbeat jobs instead of managing their own timers. `jarvis.scanInterval` changes from seconds to minutes (0 = disabled).
- **message-inbox**: Replace push-based message delivery with a pull-based inbox pattern — the Play-Button sends a single notification stub; the target session reads messages one-by-one via the new `jarvis_readMessage` LM Tool.
- **unified-logging**: Replace the heartbeat-only `OutputChannel` with a single shared `LogOutputChannel` ("Jarvis") — structured log levels (trace/debug/info/warn/error) and module tags (`[Heartbeat]`, `[MSG]`, `[Scanner]`, `[Update]`, `[MCP]`).
- **mcp-server**: Embed an MCP (Model Context Protocol) HTTP server — all existing LM Tools (`jarvis_sendToSession`, `jarvis_listSessions`, `jarvis_readMessage`) are also exposed as MCP Tools via HTTP/SSE on localhost. Dual-registration wrapper registers each tool with both `vscode.lm` and MCP simultaneously.

## v0.2.0

*2026-04-10*

Three new features: convention-file scanning model, entity creation commands, and self-update checks.

### New Features

- **proj-folders**: Switch project and event scanners to a folder-convention model — a folder containing `project.yaml` (or `event.yaml`) becomes a leaf node. EventTreeProvider gains empty-branch pruning when the future-only filter hides all events in a grouping folder.
- **new-entity**: Add `Jarvis: New Project` and `Jarvis: New Event` commands — create a convention-file folder with YAML template, trigger immediate scanner refresh, and open an agent session for the new entity.
- **self-update**: Self-update check via GitHub Releases API — queries for newer versions on activation (and via manual command), with options to view release notes or download and install the `.vsix` directly.

## v0.1.1

*2026-04-09*

Hotfix for v0.1.0 — extension failed to activate due to missing runtime dependencies.

- **Fix**: Include `node_modules/` in `.vsix` package (no bundler configured)
- **Fix**: Hide `jarvis.openAgentSession` from Command Palette (tree-item-only command)
- **Fix**: Exclude `testdata/` and `.jarvis/` from `.vsix` package
- **Fix**: Add `repository` field to `package.json`
- **Updated**: README.md rewritten to reflect v0.1.0 feature set
- **Specs**: `SPEC_REL_VSCEPKG` (`.vscodeignore` constraints), `SPEC_EXP_AGENTSESSION` (`commandPalette` hide)
- **Reqs**: `REQ_REL_VSCEPKG` AC-4, `REQ_EXP_AGENTSESSION` AC-5

## v0.1.0

*2026-04-09*

First productive release — Jarvis is now a fully functional tool to build personal assistants. It can now support to manage projects and events in VS Code.

### New Features

- **subfolder-view**: Hierarchical folder tree — projects and events in subfolders appear as collapsible folder nodes with unlimited nesting
- **folder-filter**: Project folder filter — toggle folder visibility via QuickPick, filter state persists across sessions
- **event-filter**: Future events toggle — one-click filter to show only upcoming events (end date ≥ today)
- **open-yaml**: Open YAML from tree — inline `$(go-to-file)` button on project/event items opens the YAML file in the editor
- **heartbeat**: Heartbeat scheduler — cron-based job scheduling via YAML config, supports Python scripts, PowerShell scripts, and VS Code commands
- **background-agent**: Agent step type — single-shot LLM calls via `vscode.lm` API as heartbeat job steps, reads prompts from files
- **send-to-chat**: Message queue — messages from heartbeat jobs are queued and displayed in a new Messages tree view, with manual delivery to named chat sessions via `state.vscdb` session lookup
- **session-tools**: Session management — Open Session QuickPick command, `#listSessions` LM tool for session discovery, inline agent session button on project/event items

### Infrastructure

- **persona-cleanup**: Standardized persona names across all User Stories (Jarvis User / Jarvis Developer)
- **test-data**: Versioned test dataset in `testdata/` for reproducible UAT
- **sphinx-compat**: Sphinx config migrated to sphinx-needs 8.0.0 API
- **project-scan**: Load real YAML data with background scanner (replaced dummy data)
- **syspilot-update**: Updated syspilot tooling v0.2.3 → v0.3.0 → v0.3.1 → v0.4.0

## v0.0.1

*2026-04-01*

- **hello-explorer**: Minimal VS Code extension with Activity Bar icon, sidebar panel, and two TreeView groups (Projects & Events) with dummy data
- **manual-test**: Manual UAT step in Implement Agent workflow — launches Extension Development Host, presents test checklist, persists test protocols
- **release-setup**: Release pipeline — GitHub Pages deployment for Sphinx docs, GitHub Release with `.vsix` package on `v*` tag push
- **theme-cleanup**: Reorganize syspilot IDs — move Developer Tooling specs from `EXP` to new `DEV` theme
