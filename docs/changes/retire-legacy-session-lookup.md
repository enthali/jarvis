# Change Contract: retire-legacy-session-lookup

**Status:** active<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-23<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-23 | 21:54 CET | Project Manager | Architect | User pre-authorized Contract release (autonomous). Scope covers K75 (retire dead `state.vscdb`/WSL2 session lookup and `sql.js`/`sql-wasm.wasm`, preserving `getValidDestinations` / `combineValidDestinations`) and K64 (align `jarvis_createActor` tool description with `jarvis.actors.folder`). |
| 2026-11-23 | 21:58 CET | Architect | Admin | Specification complete: three Needs deprecated, eight modified, strict Sphinx build clean; the Developer moves the approved Needs to `implemented`. Your files and the removal list are in Product Specification, row "For Admin". |
| 2026-11-23 | 22:00 CET | Admin | Developer | `sql.js`, the WASM copy step, `.vscodeignore` entry, `sql.js.d.ts` and the lockfile entries are removed. `tsc` fails at `sessionLookup.ts:7` until you remove that import; details in Infrastructure Impact. |
| 2026-11-23 | 22:20 CET | Developer | Technical Writer | Dead lookup code, `sql.js` import and the WSL2 test are removed; `jarvis_createActor` description now names `jarvis.actors.folder`; seven Needs are `implemented`. `getValidDestinations` and `combineValidDestinations` stay in `sessionLookup.ts`. |
| 2026-11-23 | 22:40 CET | Technical Writer | Tester | One guide line adjusted (default actor folder, jarvis_createActor follows jarvis.actors.folder); no user-facing document mentions sql.js, WASM or the session lookup; strict docs build passes; Test design row is yours. |
| 2026-11-23 | 22:30 CET | Tester | Quality | Static tests for `SPEC_REL_VSCEPKG` AC-6, the validator-only `sessionLookup` and `SPEC_ACTOR_CREATETOOL` AC-6 added, 9 pass; the no-`.wasm` VSIX check is only possible in your clean-tree build row. |
| 2026-11-23 | 22:15 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`; the clean-tree VSIX check shows no `.wasm` in any package. The Needs check exits 0. Nothing in User Validation needs a live run; the Observable Outcome is covered by build, packaging and tests. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-23 21:52 CET (scope settled and pre-authorized for immediate start).

### Goal

Jarvis Core no longer ships dead pre-AHP `state.vscdb` / WSL2 session-lookup code or the `sql.js` WebAssembly bundle, and the `jarvis_createActor` tool description accurately states that actor folders follow the configured `jarvis.actors.folder` setting rather than a hardcoded `<workspace>/.jarvis/actors/` path.

### Value

Retiring unused SQLite session-store lookup removes platform-fragile desktop/WSL2 path assumptions (`K75`), drops the `sql.js` dependency and `sql-wasm.wasm` binary from `jarvis-core`, and brings the specification into alignment with Agent Host session routing. Correcting the `jarvis_createActor` description (`K64`) prevents actors from assuming `.jarvis/actors/` when a workspace configures a custom actor directory (such as `../actor-context/...`).

### Scope

- **Retire dead `state.vscdb` session lookup & `sql.js` (backlog K75):**
  - Remove the unreferenced `state.vscdb` / WSL2 lookup functions (`resolveUserDataPath`, `initSessionLookup`, `setSessionLookupLogger`, `lookupSessionUUID`, `getAllSessions`, `filterNamedSessions`, `SessionInfo`) from `packages/core/src/engine/sessions/sessionLookup.ts`, along with unused imports/calls in `packages/core/src/extension.ts` and `packages/core/src/apps/session/heartbeat.ts`, and obsolete `sessionLookup` tests that tested `state.vscdb` / WSL2 lookup.
  - Keep `getValidDestinations` and `combineValidDestinations` (used by Core and Heartbeat destination validation, and asserted by `actorRuntime.test.ts` and `entity-parity.test.ts`).
  - Remove the `sql.js` dependency, `packages/core/src/sql.js.d.ts`, the `sql-wasm.wasm` copy step in `packages/core/build.js`, and `!out/sql-wasm.wasm` in `packages/core/.vscodeignore` (verifying no other package or module uses `sql.js`).
  - Reconcile/deprecate obsolete specification artifacts (`REQ_MSG_SESSIONLOOKUP`, `SPEC_MSG_SESSIONLOOKUP`, `REQ_MSG_SESSIONFILTER`, and any `US_MSG_EDITORPLACEMENT` / `REQ_MSG_EDITORPLACEMENT` / `SPEC_REL_*` references that still describe `state.vscdb` or `sql-wasm.wasm`).
- **Align `jarvis_createActor` tool description with `jarvis.actors.folder` (backlog K64):**
  - Update `packages/core/package.json` (`languageModelTools` entry for `jarvis_createActor`) and any matching specification/documentation (`REQ_ACTOR_CREATETOOL`, `SPEC_ACTOR_*`, guides/READMEs if affected) so the description reflects placement under the configured `jarvis.actors.folder` (default `.jarvis/actors`) rather than hardcoding `<workspace>/.jarvis/actors/<name>/`.
- **Candidate impact starting point (`MOD_MESSAGING`, `MOD_ACTOR`, `MOD_DISTRIBUTION`):** `REQ_MSG_SESSIONLOOKUP`, `SPEC_MSG_SESSIONLOOKUP`, `REQ_MSG_SESSIONFILTER`, `US_MSG_EDITORPLACEMENT`, `REQ_MSG_EDITORPLACEMENT`, `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`, `REQ_ACTOR_CREATETOOL`, `US_ACTOR_CREATETOOL`, and `SPEC_REL_*` bundle descriptions.

### Observable Outcome

- `packages/core` compiles, bundles, packages into a VSIX without `sql.js` or `sql-wasm.wasm`, and passes lint, the full Vitest suite, and strict Sphinx build.
- `getValidDestinations` / `combineValidDestinations` continue to validate unique Actor destinations in Core and Heartbeat.
- `packages/core/package.json` describes `jarvis_createActor` as creating the Actor folder under the configured `jarvis.actors.folder` (with `.jarvis/actors` only as default), matching runtime behavior.
- Obsolete `state.vscdb` lookup Needs are cleanly deprecated/reconciled and `scripts/check_contract_needs.py` exits 0 at closure.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-23 21:52 CET) |
| Version control | yes | Project Manager | Local branch `feature/retire-legacy-session-lookup`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts (`package.json`, `package-lock.json`, `build.js`, `.vscodeignore`) are updated or reviewed | complete |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated, or none is affected | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (2026-11-24 00:54 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

All changed Needs are `approved` or `deprecated`; the Developer moves the approved ones to `implemented`.

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_MSG_SESSIONLOOKUP` | retire (`deprecated`) | No code calls `lookupSessionUUID`; body reduced to a retirement note, links kept for history |
| `REQ_MSG_SESSIONFILTER` | retire (`deprecated`) | Its only consumer was the retired `getAllSessions`/`filterNamedSessions` heartbeat resolver |
| `SPEC_MSG_SESSIONLOOKUP` | retire (`deprecated`) | Describes the `state.vscdb`/`sql.js` mechanism that is removed |
| `REQ_MSG_EDITORPLACEMENT`, `SPEC_MSG_EDITORPLACEMENT`, `SPEC_MSG_TREEPROVIDER` | modify | Drop `lookupSessionUUID` and the removed `jarvis.openMessageSession` command; the group-node click is `jarvis.openMessageActorChat` |
| `REQ_FLOW_WEBVIEWPANEL` AC-5 | modify, `draft` → `approved` | Drop the `lookupSessionUUID` mention |
| `REQ_AUT_HEARTBEAT_RESOLVER_REUSE`, `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE` | modify, `draft` → `approved` | The module keeps only `getValidDestinations` and `combineValidDestinations`; links to the retired Needs removed |
| `SPEC_REL_VSCEPKG` | modify, `draft` → `approved` | No `sql.js` inlining, no WASM copy step; new AC-6: no `.wasm` in the VSIX, no `sql.js` dependency |
| `SPEC_ACTOR_CREATETOOL` | modify | K64: `modelDescription` names `jarvis.actors.folder` (default `.jarvis/actors`); new AC-6 |

| Decision or check | Evidence |
|---|---|
| The lookup code is dead | `lookupSessionUUID`, `getAllSessions`, `filterNamedSessions`, `resolveUserDataPath` have no caller outside `sessionLookup.ts`; `extension.ts:19` and `apps/session/heartbeat.ts:23` import functions they do not use |
| Deprecate rather than delete | Repo convention (`spec_cfg.rst`); the Needs check accepts `deprecated` as terminal; older Contracts under `docs/changes` still reference these IDs |
| K64 is a conformance gap in code, not a missing requirement | `REQ_ACTOR_CREATETOOL` and `SPEC_ACTOR_CREATETOOL` already say "configured actors folder"; `packages/core/package.json:262` still says `<workspace>/.jarvis/actors/<name>/`. Closed by tightening the spec (AC-6) |
| File name `sessionLookup.ts` is kept | Tests import its path (`actorRuntime.test.ts`, `entity-parity.test.ts`); the name is now misleading, a rename is outside this scope |
| Needs links | `get_need_links.py`: retiring the three Needs orphans no story; `US_COM_FIND`, `US_COM_NAME`, `US_COM_SEND` keep other covering requirements |
| Build | `python -m sphinx -W --keep-going -b html . <tmp> -q` exit 0; `acceptance-criteria-format.test.ts` 5/5 pass |
| For Admin | `sql.js` in `packages/core/package.json:58` and root `package.json:47` (check whether the root entry is needed), `build.js` `copySqlWasm`, `.vscodeignore:7`, `src/sql.js.d.ts`, `package-lock.json` |
| For Developer | Remove dead functions and unused imports in `sessionLookup.ts`, `extension.ts`, `heartbeat.ts`; remove `sessionLookup-wsl2.test.ts`; keep the `getValidDestinations` tests; fix the `jarvis_createActor` description at `packages/core/package.json:262` (`SPEC_ACTOR_CREATETOOL` AC-6) |
| For Technical Writer | README and guides: no `sql.js`/WASM mention found outside specs and `releasenotes.md` (history, left); check the `jarvis_createActor` wording |
| Not touched, outside this Contract | `US_MSG_EDITORPLACEMENT` and `REQ_MSG_EDITORPLACEMENT` are partly stale from ahp-mvp (chat parts); `releasenotes.md` mentions are history |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `packages/core/package.json`, root `package.json` | `sql.js` is a runtime dependency of core only; no other package, script or test imports it (search of `packages/`, `src/`, `scripts/`: only `sessionLookup.ts` and `sql.js.d.ts`). The root entry served only the hoisted core import, so it goes too | removed `sql.js` from both |
| `package-lock.json` | root and `packages/core` dependency lists and the `node_modules/sql.js` entry | regenerated with `npm install --package-lock-only --ignore-scripts`; diff is only the three `sql.js` entries (1 insertion, 9 deletions), a second run leaves it unchanged, 0 `sql.js` matches |
| `packages/core/build.js` | `copySqlWasm()` and its call, the `fs` import and the sql.js comments | removed; `node packages/core/build.js --minify` exits 0, no `sql-wasm.wasm` is produced (extension.js 314.0 kb) |
| `packages/core/.vscodeignore` | `!out/sql-wasm.wasm` | removed |
| `packages/core/src/sql.js.d.ts` | declaration for the removed module | deleted |
| `.github/workflows/release.yml` | none: core is still packaged with `vsce package --no-dependencies` | none |
| Left untouched | `node_modules/sql.js` in the working tree; `docs/releasenotes.md:761` (history); `src/tests/entity-parity.test.ts:19` (comment, Developer) | `npm ci`/`npm install` removes the folder |

**For the Developer:** `npx tsc -p packages/core --noEmit` fails at this commit with `TS7016` at `sessionLookup.ts:7` (`import initSqlJs from 'sql.js'`), because the declaration file is gone. The error disappears when you remove the dead lookup functions and that import; do not restore the `.d.ts`. `vsce ls --no-dependencies` in `packages/core` lists no `.wasm` file; the full VSIX check stays with Quality.

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Fate of `sessionLookup.ts` | Keep the file and its name; only `getValidDestinations` and `combineValidDestinations` remain | Rename or move the file | Tests import its path; a rename is outside scope (Architect's decision) |
| Unused imports and calls | Removed `initSessionLookup(...)` and `setSessionLookupLogger(log)` from `extension.ts`; reduced imports in `extension.ts` and `heartbeat.ts` to `getValidDestinations` | Leave them | They referenced removed functions; `tsc` is clean |
| K64 wording | `jarvis_createActor` `modelDescription` names `jarvis.actors.folder` (default `.jarvis/actors`) and the `<folder>/<name>/` layout | Keep the hardcoded `<workspace>/.jarvis/actors/` | Matches `SPEC_ACTOR_CREATETOOL` AC-6 |
| Need status | Seven approved modified Needs set to `implemented` | none | `REQ_REL_NEEDSCHECK` AC-3 |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/sessions/sessionLookup.ts` | Removed `resolveUserDataPath`, `initSessionLookup`, `setSessionLookupLogger`, `lookupSessionUUID`, `getAllSessions`, `filterNamedSessions`, `SessionInfo`, the `sql.js` import | `npx tsc -p packages/core --noEmit`: clean |
| `packages/core/src/extension.ts`, `packages/core/src/apps/session/heartbeat.ts` | Dead calls and imports removed | `node packages/core/build.js --minify`: ok, no `.wasm` |
| `packages/core/package.json` | `jarvis_createActor` description (K64) | covered by full test run |
| `src/tests/sessionLookup-wsl2.test.ts` | Deleted | `npx vitest run`: 67 files, 729 tests pass |
| `src/tests/entity-parity.test.ts` | Comment no longer mentions `sql.js` | same run |
| `docs/requirements/req_aut.rst`, `req_flow.rst`, `req_msg.rst`, `docs/design/spec_actor.rst`, `spec_aut.rst`, `spec_msg.rst`, `spec_rel.rst` | `REQ_AUT_HEARTBEAT_RESOLVER_REUSE`, `REQ_FLOW_WEBVIEWPANEL`, `REQ_MSG_EDITORPLACEMENT`, `SPEC_ACTOR_CREATETOOL`, `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`, `SPEC_MSG_EDITORPLACEMENT`, `SPEC_REL_VSCEPKG` set to `implemented` | `scripts/check_contract_needs.py` (see handover commit) |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| No manifest, lockfile, build script, `.vscodeignore` or source import mentions `sql.js` / WebAssembly; `sql.js.d.ts` is gone | system | `SPEC_REL_VSCEPKG` AC-6 | `src/tests/retire-legacy-session-lookup.test.ts` (9 pass in the file) |
| `sessionLookup` exports exactly `getValidDestinations` and `combineValidDestinations`; shared names excluded, unique kept, no scanner gives `[]`; Core and Heartbeat reference none of the retired functions; the WSL2 test file is gone | system | `REQ_AUT_HEARTBEAT_RESOLVER_REUSE`, `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE` | same file |
| `jarvis_createActor` `modelDescription` names `jarvis.actors.folder` and `.jarvis/actors`, states no `<workspace>` path; the setting is declared with that default; input schema unchanged | system | `SPEC_ACTOR_CREATETOOL` AC-6, `REQ_ACTOR_CREATETOOL` AC-2 | same file |
| Core VSIX holds no `.wasm` file | validation | `SPEC_REL_VSCEPKG` AC-6 | Quality's VSIX build row; a `vsce ls` here lists stale untracked `out/` files, so it proves nothing without a clean tree |
| Heartbeat and Core resolve destinations at runtime after the removal | validation | `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` | existing: `actorRuntime.test.ts`, `entity-parity.test.ts`; no live run needed, since no behaviour changed |

No defect found. `docs/requirements` for the retired `REQ_MSG_SESSIONLOOKUP`/`REQ_MSG_SESSIONFILTER` need no test: they are `deprecated`.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/getting-started.md` | 'New actors are created in `.jarvis/actors`' read as fixed; now 'By default', and `#jarvis_core_createActor` uses the configured `jarvis.actors.folder` (K64, `SPEC_ACTOR_CREATETOOL` AC-6) | this commit; `docs/build.ps1 -Clean` succeeded |
| `docs/user guides/core.md`, `packages/core/README.md` | none: `jarvis.actors.folder` is already described as the configurable folder with default `.jarvis/actors` | checked |
| `README.md`, all guides and package READMEs | none: no mention of `sql.js`, `sql-wasm.wasm`, `state.vscdb` or the session lookup (search, case-insensitive); `docs/releasenotes.md` mentions stay as history | checked |
| `docs/releasenotes.md` | Release decides at release time whether the dependency removal (smaller VSIX) is worth an entry | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at `cf5e8f6c`. Open Findings is `None`. The lookup code, `sql.js` and the WASM step are gone with no dangling reference in `packages`, `src`, `scripts` or the root manifest. A clean-tree build of all six VSIXs shows no `.wasm` and no `sql` entry, and the Core `jarvis_createActor` description names `jarvis.actors.folder`. The Needs check exits 0.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | 21 files: sessionLookup, extension, heartbeat, build and manifests, lockfile, 7 spec/requirement files, tests | The kept functions `getValidDestinations` and `combineValidDestinations` are untouched in behaviour; removed imports and calls match the Developer table; lockfile diff is only the `sql.js` entries | No finding | Runtime destination validation relies on the existing `actorRuntime` and `entity-parity` tests; no live run |
| Dangling references | `git grep` for `sql.js`, `sql-wasm`, `lookupSessionUUID`, `state.vscdb` in `packages`, `src`, `scripts`, root `package.json` | Only the new static test mentions them | No finding | `docs/releasenotes.md` history left as the Contract says |
| Mutation check | Appended `sql-wasm.wasm` to `packages/core/build.js` | 1 of 9 tests in `retire-legacy-session-lookup.test.ts` failed; file restored, tree clean | The static test guards the build script | One mutation only |
| Needs check | `scripts/check_contract_needs.py` | exit 0 | No finding | |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ cf5e8f6c | pass |
| Lint | `npm run lint` @ cf5e8f6c | pass: 0 errors, 171 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ cf5e8f6c | pass: 68 files, 738 tests |
| Script tests | `python -m unittest discover scripts` @ cf5e8f6c | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ cf5e8f6c | pass |
| VSIX packaging, clean tree | detached worktree at cf5e8f6c: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, pim, recorder, mcp, flow, kanban | pass: six VSIXs at 0.34.0, engine `^1.144.0`, 0 `.wasm` and 0 `sql` entries in each; core 182175 bytes; `jarvis_createActor` description names `jarvis.actors.folder` |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Automated verification and clean-tree VSIX inspection (no `US_*` or `AC_*` Need changed) | User accepted on the automated evidence: 68 test files / 738 tests pass, lint 0 errors, strict Sphinx build clean, Needs check exit 0, and clean-tree VSIX packaging shows 0 `.wasm` and 0 `sql` entries across all six VSIXs while `jarvis_createActor` names `jarvis.actors.folder`. | 2026-11-24 |

**Decision:** accepted (2026-11-24 00:54 CET)

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
