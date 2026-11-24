# Change Contract: settle-draft-specifications

**Status:** active<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-24<br>
- **Operation Mode**: unattended - the user is away. When unsure, the actor flags `USER REVIEW REQUIRED` in this document, takes the simplest KISS path that is cheapest to reverse or amend, and keeps the change moving. The PM reviews flagged points once reachable again; decision ownership remains with the actor that made the decision.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-24 | 22:56 CET | Project Manager | Architect | User approved Contract release (autonomous, zero runtime code changes expected). Scope audits all 68 remaining `draft` Needs against shipped code to settle them cleanly (`K55`, zero `draft`/`open` Needs remaining), and records the User's 2026-11-24 macOS verification pass in Core documentation (`core.md`, `packages/core/README.md`, and `getting-started.md` if applicable). |
| 2026-11-24 | 23:37 CET | Architect | Admin | All Needs settled to `approved` (zero `draft`/`open`); target-behaviour Needs (chord tooltip, lens clamp/keyboard, requeue feedback, heartbeat scanner/validation) need runtime fixes, so scope is widened per User choice: PM aligns Intent/Scope/Outcome. |
| 2026-11-24 | 23:41 CET | Admin | Developer | No infrastructure change needed; release specs match `release.yml`. Needs check stays red until the 74 `approved` Needs are `implemented` and the PM names the 7 stories in User Validation. |
| 2026-11-24 | 23:50 CET | Developer | Technical Writer | Four runtime fixes made (flow tooltip/lens/requeue, heartbeat scanner/validation); 74 Needs `implemented`; `packages/flow` README wording for the tooltip and notifications is yours. Tests and VSIX build still to come. |
| 2026-11-24 | 23:59 CET | Technical Writer | Tester | macOS wording done in the Core guide and Core README; Flow guide and README rewritten for the log source, node tooltip, lens keyboard/clamp, requeue notification and the previously undocumented log viewer; Kanban entry-point and legacy log-path claims corrected; strict docs build passes. Test design row is yours, ## Test Design heading may be missing again. |
| 2026-11-24 | 23:59 CET | Tester | Quality | Test design complete: 16 new tests in two files (`settle-draft-specifications.test.ts`, `flow-webview-chord.test.ts`), all mutation-checked; suite 820 pass, lint 0 errors. Webview logic is proven against a fake DOM, not a real browser. |
| 2026-11-25 | 00:20 CET | Quality | Project Manager | Verification is `blocked` on F-1 only: align Intent Scope and Observable Outcome with the runtime changes. Everything else passes (820 tests, six clean-tree VSIXs). Name the 7 stories in User Validation; tooltip and lens need a real browser. |
| 2026-11-24 | 23:55 CET | Project Manager | Quality | F-1 resolved: Intent, Scope and Observable Outcome now reflect the User's pre-23:34 CET decision to extend this Contract with the four Flow and Heartbeat runtime fixes (approval evidence recorded). Handing back for `proceed` and removal of F-1. |
| 2026-11-25 | 00:40 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`; F-1 is closed by the aligned Intent. Name the 7 stories in User Validation; tooltip and lens need a real browser. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-24 22:54 CET (initial audit-and-settle of all `draft` Needs + macOS verified documentation update approved); widened directly by the User in the Architect chat before 23:34 CET ("extend this Contract to fix the runtime code" for the 8 Flow/Heartbeat target-behavior Needs) and confirmed to PM at 23:34 CET when switching to `unattended` mode overnight.

### Goal

Zero specification Needs in the repository remain stuck in `draft` or `open` — every one of the 68+ `draft` Needs across Kanban, Flow, Release/Migration-Shim, Reminders, Heartbeat/Explorer, and Actor/Module is audited against shipped code, reconciled where wording/path drift exists, backed by targeted runtime fixes for the 8 Flow and Heartbeat target-behavior Needs per the User's decision, and settled to `implemented` — and Core user documentation reflects that macOS Agent Host operation was verified on 2026-11-24.

### Value

Leaving 68 shipped-feature Needs in `draft` weakens `check_contract_needs.py` and hides stale paths or claims until an unrelated Change touches them (`K55`). Auditing each Need against the actual codebase brings the entire specification baseline to a truthful `implemented`/`verified` state, while updating the macOS status in Core docs removes an outdated "macOS unverified" caveat after the User's successful live Mac run on 2026-11-24.

### Scope

- **Audit and settle all remaining `draft` Needs (`K55` — no blanket status flip, plus User-approved Flow & Heartbeat runtime fixes):**
  1. **Kanban baseline (17+ Needs):** `US_KAN_TOOLS`, `REQ_KAN_CREATE`, `REQ_KAN_DISCOVER`, `REQ_KAN_FILEOPEN`, `REQ_KAN_MODULE`, `REQ_KAN_OPEN`, `REQ_KAN_SCHEMA`, `REQ_KAN_UPDATE`, `REQ_KAN_UX`, `REQ_KAN_VERIFY`, `SPEC_KAN_CREATE`, `SPEC_KAN_DISCOVER`, `SPEC_KAN_MODULE`, `SPEC_KAN_OPEN`, `SPEC_KAN_SCHEMA`, `SPEC_KAN_UPDATE`, `SPEC_KAN_UX`, `SPEC_KAN_VERIFY`.
  2. **Flow add-on (19 Needs):** `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER`, `REQ_FLOW_ACTORCLICK`, `REQ_FLOW_CHORDVIEW`, `REQ_FLOW_DATASOURCE`, `REQ_FLOW_LOADMORE`, `REQ_FLOW_LOGVIEWER`, `REQ_FLOW_PACKAGE`, `REQ_FLOW_REQUEUE`, `REQ_FLOW_TIMELENS`, `SPEC_FLOW_ACTORCLICK`, `SPEC_FLOW_CHORDRENDER`, `SPEC_FLOW_DATASERVICE`, `SPEC_FLOW_LOADMORE`, `SPEC_FLOW_LOGVIEWER`, `SPEC_FLOW_REQUEUE`, `SPEC_FLOW_TIMELENS`, `SPEC_FLOW_WEBVIEW`.
  3. **Release & legacy migration shim (16+ Needs):** `US_REL_MARKETPLACE`, `US_REL_RETIRELEGACY`, `REQ_REL_MKTMETA`, `REQ_REL_MKTPUBLISH`, `REQ_REL_VSCEPKG`, `REQ_REL_RETIREFALLBACK`, `REQ_REL_RETIREINSTALL`, `REQ_REL_RETIRENORELEASE`, `REQ_REL_RETIRESHIM`, `REQ_REL_RETIREUNINSTALL`, `SPEC_REL_COREGH`, `SPEC_REL_MKTMETA`, `SPEC_REL_MKTPUBLISH`, `SPEC_REL_RETIREFALLBACK`, `SPEC_REL_RETIREINSTALL`, `SPEC_REL_RETIRESHIM`, `SPEC_REL_RETIREUNINSTALL` (note: `packages/core-gh` is still built by `release.yml` as the 7th VSIX).
  4. **Reminders (5 Needs):** `US_MSG_REMINDERS`, `REQ_MSG_REMINDERS_PERSIST` (fix stale `src/reminders.ts` path to `src/apps/session/reminders.ts` if present), `SPEC_MSG_REMINDERSLOOP`, `SPEC_MSG_REMINDERSTORE`, `SPEC_MSG_REMINDERSVIEW`.
  5. **Heartbeat, Config & Explorer (8 Needs):** `US_AUT_HEARTBEAT_VALIDATION`, `REQ_AUT_STEP_OUTPUT_VARS`, `SPEC_AUT_STEP_OUTPUT_VARS`, `REQ_CFG_HOOKCLEANUP`, `SPEC_CFG_HOOKCLEANUP`, `REQ_EXP_REMINDER_OPENFILE`, `SPEC_EXP_REMINDER_OPENFILE`.
  6. **Actor & Module (3 Needs):** `SPEC_ACTOR_MAIL`, `SPEC_ACTOR_SCANNER`, `SPEC_MOD_ADDON_ONBOARDING`.
  - **Audit & widened runtime-fix rule (User decision, 2026-11-24 23:34 CET):** Architect reads each Need against the shipped code in `packages/`, `scripts/`, and `.github/workflows/`. Where the Need matches the code, approve it so the Developer sets `implemented`; where minor wording/file-path drift exists against shipped code, align the Need text (and manifest description strings such as `jarvis.messages.logging`); and for the 8 Flow and Heartbeat target-behavior Needs identified during the audit (`US_FLOW_CHORDVIEW` / `REQ_FLOW_CHORDVIEW` / `SPEC_FLOW_CHORDRENDER` chord node tooltip & 80-char sample, `REQ_FLOW_TIMELENS` / `SPEC_FLOW_TIMELENS` handle clamping & keyboard commit, `REQ_FLOW_REQUEUE` / `SPEC_FLOW_REQUEUE` success/error host notifications, and `US_AUT_HEARTBEAT_VALIDATION` / `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` / `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` / `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` startup validation & passing `scanner` on interval change and resume), implement the matching runtime fixes in `packages/flow/` and `packages/core/src/apps/session/heartbeat.ts` with tests.
- **Record verified macOS status in Core documentation (User, 2026-11-24):**
  - Update `docs/user guides/core.md` and `packages/core/README.md` (and `docs/user guides/getting-started.md` or `REQ_COM_AGENTHOST` / `SPEC_COM_*` notes if they state macOS is unverified) to state that Jarvis worked without issues on macOS (verified 2026-11-24), leaving only WSL and SSH listed as unverified.

### Observable Outcome

- Zero Needs in the built `needs.json` carry `:status: draft` or `:status: open` (asserted by a regression test so future Changes do not leave accidental `draft` leftovers behind on `development`).
- The four User-approved Flow and Heartbeat runtime fixes (chord node tooltip + 80-char sample, time-lens handle clamping + keyboard commit, requeue success/error notifications, and heartbeat startup validation + `scanner` on interval-change/resume) are implemented and covered by unit/system tests.
- `docs/user guides/core.md` and `packages/core/README.md` accurately state that both Windows and macOS are verified while WSL and SSH remain unverified, and Flow/Kanban docs match the settled specifications.
- Strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py` (with all touched `US_*` stories named in User Validation), `npm run lint`, the full Vitest suite, and clean-tree VSIX packaging pass.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-24 22:54 CET) |
| Version control | yes | Project Manager | Local branch `feature/settle-draft-specifications`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | All 68 `draft` Needs audited against shipped code, minor text/path drifts reconciled, and approved for `implemented` | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | `docs/user guides/core.md`, `packages/core/README.md` (and `getting-started.md` if affected) updated for macOS verification | complete |
| Implementation and unit verification | yes | Developer | Audited `approved` `story`/`req`/`spec` Needs set to `implemented`, runtime fixes made and suite verified | complete |
| Test design | yes | Tester | Regression test asserting zero `draft`/`open` `story`/`req`/`spec` Needs in built/parsed docs + macOS doc wording check | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` (incl. clean-tree VSIX build for `packages/core/README.md`) | complete |
| User validation | not applicable: explicit User delegation (2026-11-24 22:55 CET & 23:34 CET, unattended overnight instruction) to accept on automated evidence and chain directly into the next Release once `settle-draft-specifications` passes Quality review | User | Observable outcome is accepted or changes are requested | accepted (explicit User delegation, 2026-11-24 22:55 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

All 68 `draft` Needs plus one found outside the Scope list are settled: zero `:status: draft|open` remain in `docs/` (grep over `*.rst`), the strict Sphinx build and `acceptance-criteria-format.test.ts` (5 tests) pass. Settled Needs are `approved`; the Developer sets `implemented`.

**USER REVIEW REQUIRED (scope widened, unattended mode):** the Architect asked the User before 23:34 CET how to settle 8 Needs whose specification the shipped code does not meet (chord tooltip, time-lens clamp and keyboard, requeue feedback, heartbeat scanner/validation). The User chose "Extend this Contract to fix the runtime code". Intent, Scope and the Observable Outcome "zero runtime files modified" are PM-owned and still say the opposite; the PM aligns them. The runtime fixes are listed below for the Developer.

| Artifact | Change | Rationale |
|---|---|---|
| Kanban group (`US_KAN_TOOLS`, `REQ_KAN_*`, `SPEC_KAN_*`; 18 Needs) | modify, all `approved` | `US_KAN_TOOLS` rewritten as outcomes; `engine.registerTool` corrected to `api.registerTool` and other path/name drift aligned to `packages/kanban` |
| Release group (`US_REL_*`, `REQ_REL_*`, `SPEC_REL_*`; 17 Needs) | modify, all `approved` | `US_REL_MARKETPLACE` and `US_REL_RETIRELEGACY` aligned; `SPEC_REL_COREGH` and `SPEC_REL_MKTPUBLISH` rewritten to the workflow in `.github/workflows` |
| `REQ_REL_RETIRENORELEASE` | modify (title "Legacy Shim Distribution Policy", ID kept) | the shim is rebuilt on every tag, so "no release" was false; the ID is kept to keep links stable |
| `SPEC_REL_UPDATENOTIFY` | modify, `approved` | added the `enthali.jarvis-kanban` → `jarvis-kanban-{version}.vsix` row that `updateCheck.ts` already has |
| `REQ_MOD_ADDONS` | add AC-9 | kanban declares `extensionDependencies: ["enthali.jarvis-core"]` (checked in `packages/kanban/package.json`); `SPEC_MOD_ADDON_ONBOARDING` approved on it |
| Reminders and hooks (`US_MSG_REMINDERS`, `REQ/SPEC_MSG_REMINDERS*`, `REQ/SPEC_CFG_HOOKCLEANUP`, `REQ/SPEC_EXP_REMINDER_OPENFILE`, `REQ/SPEC_AUT_STEP_OUTPUT_VARS`) | modify, `approved` | paths moved to `src/apps/session/`; story rewritten as outcomes; hook-cleanup code and tests exist |
| `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_MAIL`, `SPEC_MOD_ADDON_ONBOARDING` | modify, `approved` | scanner spec: reminders target is not scanner-validated, disposal through `JarvisEngine.dispose()`; mail spec matches `actorMail.ts` (read after every scan, attach-only, exit code as failure signal) |
| Flow group (11 of 18: log viewer, data source, load-more, actor click, package, webview) | modify, `approved` | matched shipped code after corrections (D3 bundled at build time, not vendored) |
| `US_FLOW_CHORDVIEW` AC-4, `REQ_FLOW_CHORDVIEW` AC-4, `SPEC_FLOW_CHORDRENDER` (new AC-5) | modify, `approved` | target: node and edge tooltip with count, time range and a sample of at most 80 characters; the code shows edge tooltips only and clears `sample` in lens re-aggregation (`webview/chord.ts:160`) |
| `REQ_FLOW_TIMELENS` AC-2, `SPEC_FLOW_TIMELENS` (new AC-6, AC-7) | modify, `approved` | target: handles clamp so start never passes end, keyboard moves commit; the code uses two unclamped range inputs and mouse-only commit |
| `REQ_FLOW_REQUEUE` AC-4/AC-5, `SPEC_FLOW_REQUEUE` (new AC-6) | modify, `approved` | target: host shows an information notification on success and an error notification on failure; the code only logs and ignores `ok` |
| `US_AUT_HEARTBEAT_VALIDATION` AC-1/AC-5, `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-4, `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-4, `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` | modify, `approved` | target: validate once at start; scanner passed on interval change and on resume. The code omits the scanner there (empty valid set, every queue step soft-skipped) and validates only in `reload()` |

| Decision or check | Evidence |
|---|---|
| Deletions | none; no Need was obsolete |
| Zero `draft`/`open` | grep `:status: (draft\|open)` over `docs/**/*.rst` returns nothing; no `**Open (decision` note left |
| Strict build and format | `python -m sphinx -W --keep-going -E -b html . ` clean; `npx vitest run src/tests/acceptance-criteria-format.test.ts` 5 passed |
| Changed stories for User Validation | `US_AUT_HEARTBEAT_VALIDATION`, `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER`, `US_KAN_TOOLS`, `US_MSG_REMINDERS`, `US_REL_MARKETPLACE`, `US_REL_RETIRELEGACY` |
| Developer: runtime fixes | (1) `packages/flow/src/types.ts` and `dataService.ts`: add `text` to `FlowMessageEntry`; `packages/flow/webview/chord.ts`: node tooltip, keep entry text through re-aggregation, 80-char sample; (2) same file: clamp handles, commit on `change` (keyboard); (3) `packages/flow/src/extension.ts`: success and error notifications after `requeue`; (4) `packages/core/src/apps/session/heartbeat.ts`: pass `scanner` in the `jarvis.heartbeatInterval` handler and in `jarvis.resumeHeartbeatJob`, call `validateLoadedJobs` once after the first `start()` in `activateHeartbeat`; the `FlowMessageEntry` change is under (1). Then set the changed `req`/`spec` Needs to `implemented` |
| Tester: tests | zero-`draft`/`open` regression test; tests for the four runtime fixes (flow has no tests for log viewer or lens; heartbeat scanner on interval change and resume; start-time validation warns once) |
| Technical Writer | macOS-verified wording in `docs/user guides/core.md` and `packages/core/README.md`; also `packages/flow/README.md` says "+30 loads older messages into the queue" and sources the log from the "message queue" |
| Observations for the PM, outside this Contract | `REQ_FLOW_WEBVIEWPANEL` AC-3 says reveal works in any column, the code reveals `DOCS_COLUMN`; `requeueWithMigration` deletes an unparsable legacy `messages.json` and overwrites an unparsable `queue.json` (check against `REQ_CFG_STATEMIGRATION`, `SPEC_FLOW_REQUEUE` AC-3 states this as tolerance); `REQ_REL_PKGCONTRACT` AC-1 to AC-3 are wrong for core (`vscode:prepublish`, esbuild externals, `.vscodeignore` ships `out/*.js`); `jarvis_updateKanbanItem` and `jarvis_deleteKanbanItem` return inconsistent not-found errors; the kanban "Add Kanban Board" `when` clause has a dead `jarvisSession|Project|Event` part pinned by `kanban-actor-menu-when.test.ts`; `SPEC_KAN_FILEOPEN` AC-4 mentions a tree button that no longer exists; the reminder tick runs although `messages.enabled` is false; `SPEC_CFG_PATHRESOLVER` still has stale reminders paths; `packages/core-gh/src/migrate.ts` has no tests; `scripts/generate-icons.mjs` may not cover the flow and kanban icons |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Docs build, Needs check, CI, manifests | none | Branch touches only `docs/`; `git diff development...HEAD` lists no file under `packages`, `src`, `.github`, `.vscode`, `scripts`. Strict Sphinx build exits 0. `check_contract_needs.py` exits 1 as designed with 81 hits: 74 changed `req`/`spec`/`story` Needs are `approved` (Developer sets `implemented`) and 7 changed stories are not named in User Validation (`US_AUT_HEARTBEAT_VALIDATION`, `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER`, `US_KAN_TOOLS`, `US_MSG_REMINDERS`, `US_REL_MARKETPLACE`, `US_REL_RETIRELEGACY`; Project Manager). |
| Release specs against `.github/workflows/release.yml` | none | `SPEC_REL_MKTPUBLISH` and `SPEC_REL_COREGH` match the workflow: 7 packages, core bundled first with `node packages/core/build.js --minify`, Release step uploads `packages/{core,core-gh,pim,recorder,mcp,flow,kanban}/*.vsix` before 6 Marketplace publish steps, no publish step for `enthali.jarvis`. `SPEC_REL_MKTMETA` matches `packages/core/package.json` (icon, keywords, categories, galleryBanner); `core-gh` has `contributes` `{}` and version 0.34.0 equal to core; kanban declares `extensionDependencies` `enthali.jarvis-core`. |
| `scripts/generate-icons.mjs` | none now, latent gap | The script regenerates the icon for core, core-gh, mcp, pim and recorder but not flow and kanban. All 7 `resources/jarvis-128.png` are byte-identical today, so nothing is stale; the gap bites only when the icon source changes. Not fixed here (script is outside this Contract's scope); Admin follow-up, Project Manager decides whether to schedule it. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Requeue feedback location | Notifications inside `handleRequeue` in `packages/flow/src/extension.ts` | Show them from the `requeue` message handler | `handleRequeue` is the single place that knows success vs failure, so both notifications live there; the webview `requeueResult` is unchanged. |
| Node tooltip data | Node tooltip computed from the windowed `entries` slice; `FlowMessageEntry.text` carried through `loadFlowData` and `aggregateWindow` | Add per-node aggregates to `FlowData` | Keeps the lens a zero-round-trip client operation (`SPEC_FLOW_TIMELENS`); text is HTML-escaped in tooltips. |
| Lens clamp and commit | One `commitHandles()` reads both sliders; the moved handle drags the other along on `input`; commit on `mouseup`/`mouseleave` while dragging and on `change` otherwise | Keep per-handle commit | A keyboard move emits `change` without a mouse release; committing both handles keeps `startRank <= endRank` in `LensState`. |
| Heartbeat validation | `scanner` passed in the interval-change and resume handlers; one `validateLoadedJobs` call after the first `start()` | Validate inside `start()` | `start()` also runs on interval change, which would validate repeatedly; `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` asks for once. |
| Status change | The 74 `approved` Needs from the Needs check set to `implemented` | none | `python scripts/check_contract_needs.py` listed them; each edit changes only the `:status:` line (diff: 74 insertions, 74 deletions across 22 files). |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/flow/src/types.ts`, `dataService.ts` | `FlowMessageEntry.text` added and filled | `npx vitest run` @ working tree: 71 files, 804 tests pass, incl. a new `message-flow-dataservice.test.ts` case for `entries[].text` |
| `packages/flow/webview/chord.ts` | Node tooltip, 80-character sample, text kept in re-aggregation, handle clamp, keyboard commit | `npx tsc -p packages/flow --noEmit`: clean. No unit test: the webview has no DOM test harness; Tester designs coverage |
| `packages/flow/src/extension.ts` | Information and error notifications after requeue | `npx tsc -p packages/flow --noEmit`: clean; Tester designs coverage |
| `packages/core/src/apps/session/heartbeat.ts` | `scanner` passed on interval change and resume; validation once after first start | `npx tsc -p packages/core --noEmit`: clean; Tester designs coverage |
| `docs/requirements`, `docs/design`, `docs/userstories` (22 files) | 74 Needs `approved` to `implemented` | Needs check after commit: see handover log |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| No Need in `docs/**/*.rst` (outside `docs/changes`) is `draft` or `open` | validation | Contract intent (settled specifications) | `src/tests/settle-draft-specifications.test.ts` |
| macOS verified 2026-11-24, WSL and SSH unverified, no residual "macOS not verified" in Core guide and README | validation | Contract wording | `src/tests/settle-draft-specifications.test.ts` |
| Successful requeue shows information message; failed requeue shows error message with reason (driven through the real extension and log-viewer message) | system | `REQ_FLOW_REQUEUE` AC-4/AC-5, `SPEC_FLOW_REQUEUE` AC-6 | `src/tests/settle-draft-specifications.test.ts` |
| Heartbeat start warns once per invalid queue destination, none when valid | system | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-4, `US_AUT_HEARTBEAT_VALIDATION` AC-1 | `src/tests/settle-draft-specifications.test.ts` |
| Valid queue step still delivered after a `jarvis.heartbeatInterval` change and after resume | system | `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-4, `US_AUT_HEARTBEAT_VALIDATION` AC-5 | `src/tests/settle-draft-specifications.test.ts` |
| Node tooltip shows newest message text, 80 characters, escaped; ribbon sample survives re-aggregation | system | `SPEC_FLOW_CHORDRENDER` AC-5, `REQ_FLOW_CHORDVIEW` AC-4 | `src/tests/flow-webview-chord.test.ts` |
| Lens handles never invert; keyboard `change` commits | system | `SPEC_FLOW_TIMELENS` AC-6/AC-7, `REQ_FLOW_TIMELENS` AC-2 | `src/tests/flow-webview-chord.test.ts` |

Method: `chord.ts` has no exports, so it runs against a fake DOM and a recording d3 stub; this proves the logic, not the real SVG rendering or browser slider events. Real-webview behaviour stays unchecked until a manual run. Each assertion was mutation-checked against the runtime code and caught. Full suite 73 files, 820 tests pass; lint 0 errors.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/core.md`, `packages/core/README.md` | macOS: 'not verified' replaced by the User's 2026-11-24 verification (Jarvis worked without issues); only WSL and SSH stay unverified. No detail beyond the Contract's wording is claimed (no VS Code version, no scope) | this commit |
| `docs/user guides/flow.md`, `packages/flow/README.md` | The message queue was named as the source; the diagram and log viewer read the audit log (`REQ_FLOW_DATASOURCE`), so `jarvis.messages.logging` matters. `+30` loads older log entries, not 'into the queue', and is not kept after closing. Hover now covers nodes and edges (count, range, shortened sample; `REQ_FLOW_CHORDVIEW` AC-4); lens handles never cross and work by keyboard (`REQ_FLOW_TIMELENS` AC-2); new section for the log viewer (`US_FLOW_LOGVIEWER`, never in the user documents before) incl. Requeue and its notifications (`REQ_FLOW_REQUEUE` AC-4/AC-5) | this commit; behaviour rests on the Needs and the Developer's runtime fixes, I did not run the webview |
| `docs/user guides/core.md` Messaging, Reminders | Log path `.jarvis/message-log.json` is the superseded one; current is `.jarvis/messages/log.json` (`configPaths.ts`, `REQ_FLOW_DATASOURCE`). Reminders: restart survival, view content and click-to-open added from `US_MSG_REMINDERS` AC-6 to AC-8 | this commit |
| `docs/user guides/kanban.md`, root `README.md` | 'A board button appears in the explorer tree next to the actor' is false (`SPEC_KAN_UX`: no inline board button; `package.json` has only the Actor context menu 'Add Kanban Board'). Now: open from the Actor's Files category or the Command Palette; create by context menu or command | this commit |
| `docs/user guides/core-gh.md` | none: matches `SPEC_REL_RETIRE*` | checked |
| Root `README.md` 'Version 0.34.0' Codespaces bullet | still says macOS unverified: it records the 0.34.0 release state, so left as history | not edited |
| Heartbeat fixes (scanner on interval change and resume, validate once at start) | no user document describes validation; candidate bug-fix line for the release notes | Release decides |

**For the Developer (not edited by me):** the `jarvis.messages.logging` description in `packages/core/package.json` line 209 still names `.jarvis/message-log.json`; the Core guide settings table is a copy of it and now says `.jarvis/messages/log.json`, so they differ until the manifest is corrected.
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `4627128a`. Open Findings is `None`. F-1 is resolved: Intent, Scope and Observable Outcome now state the User's decision to include the four Flow and Heartbeat runtime fixes. The delta from `ec26a0e9` is the Contract file only (`git diff` of `packages` and `src` is empty), so the runtime and VSIX evidence below still holds. The Needs check leaves only the seven stories the Project Manager names in User Validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | `git diff development...HEAD -- packages src` | Runtime: `heartbeat.ts` (scanner on interval change and resume, one validation after first start), `flow/src/{types,dataService,extension}.ts`, `flow/webview/chord.ts`; manifest description of `jarvis.messages.logging` (the Technical Writer's open point is fixed); READMEs; three test files | F-1: Intent and Observable Outcome contradict the runtime changes | Webview logic is proven against a fake DOM only; tooltip and lens in a real browser go to User Validation |
| Fixes against Needs | read the diff against `SPEC_FLOW_CHORDRENDER` AC-5, `SPEC_FLOW_TIMELENS` AC-6/AC-7, `SPEC_FLOW_REQUEUE` AC-6, `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` | Node tooltip with 80-character escaped sample, handles clamp with the other following, commit on `change`, information and error notifications, scanner passed on interval change and resume, one validation after the first start | No deviation | Edge tooltip still interpolates `edge.source` and `edge.target` unescaped (unchanged by this Change) |
| Zero `draft` or `open` | `git grep` for `:status: draft` or `open` in `docs` outside `docs/changes` | 0 hits | No finding | |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ ec26a0e9 | pass |
| Lint | `npm run lint` @ ec26a0e9 | pass: 0 errors, 204 warnings (172 on the previous Contract) |
| Full suite | `npx vitest run --testTimeout 15000` @ ec26a0e9 | pass: 73 files, 820 tests |
| Script tests | `python -m unittest discover scripts` @ ec26a0e9 | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ ec26a0e9 | pass |
| Needs check | `python scripts/check_contract_needs.py` @ ec26a0e9 | exit 1: only `US_AUT_HEARTBEAT_VALIDATION`, `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER`, `US_KAN_TOOLS`, `US_MSG_REMINDERS`, `US_REL_MARKETPLACE`, `US_REL_RETIRELEGACY` AC-4 (not named in User Validation); expected, the Project Manager names them |
| VSIX packaging, clean tree | detached worktree at ec26a0e9: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, pim, recorder, mcp, flow, kanban | pass: six VSIXs at 0.34.0, engine `^1.144.0`, no `.wasm`; Core VSIX holds the macOS wording, the corrected log path and the heartbeat code; Flow VSIX holds `commitHandles` and the requeue notification |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** not applicable: explicit User delegation on automated evidence

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Automated verification and clean-tree VSIX inspection for `US_AUT_HEARTBEAT_VALIDATION`, `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER`, `US_KAN_TOOLS`, `US_MSG_REMINDERS`, `US_REL_MARKETPLACE`, and `US_REL_RETIRELEGACY` | Explicit User delegation (2026-11-24 22:55 CET & 23:34 CET): 73 test files / 820 tests pass (including 16 mutation-checked tests for zero `draft`/`open` Needs, Heartbeat startup/interval/resume validation, Flow requeue notifications, and fake-DOM chord tooltip & time-lens clamping/keyboard behavior), 24 script tests pass, lint 0 errors, strict Sphinx build clean, and six clean-tree VSIXs verified; live browser rendering of the Flow chord tooltip and lens was not manually exercised overnight. | 2026-11-24 |

**Decision:** explicit User delegation on automated evidence (2026-11-24 22:55 CET)

## Closure

**Owner:** Project Manager<br>
**Status:** pending

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.
- [ ] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [ ] Header Status is `closed`.

**Final outcome:** {accepted result and integration commit}
