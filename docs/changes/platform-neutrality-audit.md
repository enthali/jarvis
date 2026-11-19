# Change Contract: platform-neutrality-audit

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-18<br>
- **Operation Mode**: autonomous (User, 2026-11-19 20:15 CET; unattended from 2026-11-18 23:34 CET until then) - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered. The User's validation and the closure wait until Quality's `proceed`; the Windows-only features stay untouched.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-18 | 23:17 CET | Project Manager | Architect | User approved the Contract release (autonomous). Phase 1 only records: search your own artifacts for platform assumptions and record each finding in your section, classified as intended and declared, intended but undeclared, or accidental. Windows-only features stay as they are. |
| 2026-11-18 | 23:40 CET | Architect | Project Manager | Ten rows in my section: declared 1-4; undeclared 5, 7, 8; accidental 6 (`state.vscdb` lookup) and 10 (CRLF rule, Admin); row 9 no finding. No spec changed. Cards proposed: 5, 6, 8 (7 stays a spec note). |
| 2026-11-18 | 23:18 CET | Project Manager | Developer | Architect's findings are in; route is Developer, Tester, Technical Writer, Admin, Quality. Search code and unit tests for platform assumptions and record them in your section. |
| 2026-11-18 | 23:35 CET | Developer | Tester | 15 rows in my section: declared 1-3, 9, 10; accidental 4 (`powershell` step runs only `pwsh`, contradicting the spec's fallback), 5 (`resolveUserDataPath` WSL2 path), 13 (readiness AC-2 reads the working tree); undeclared 6, 7; no finding 8, 11, 12, 14, 15. No code or test changed. Cards proposed: 4, 5, 13. |
| 2026-11-18 | 23:55 CET | Tester | Technical Writer | 10 rows in my section: declared 1, 6, 10; undeclared 2, 7; accidental 3 (no system test runs the `powershell` step, so Developer row 4 stays unseen), 4, 5 (ride on Developer rows 5 and 13); no finding 8, 9. No test or procedure changed. Cards proposed: 2+3 together, 7. |
| 2026-11-18 | 23:21 CET | Technical Writer | Admin | 5 rows in my section: declared 1, 2; undeclared 3 (PowerShell prerequisite), 4 (Python interpreter); accidental 5 (Agent Host docs omit the Codespaces scope and can read as excluding all remotes). No user-facing file changed. Cards proposed: 3+4 together with Developer row 4, 5. Committed by Admin at the Technical Writer's request: the stale `syspilot.branching` rule blocked the Technical Writer's own commit. |
| 2026-11-18 | 23:45 CET | Admin | Quality | 9 rows in my section: accidental 1 (Windows-only packaging step in `change.md`), fixed with the six-VSIX recipe; `Build-Vsix.ps1` header now says Sandbox tool; undeclared 5, 6; declared 2, 8; no finding 3, 4, 7. No behaviour change. |
| 2026-11-18 | 23:26 CET | Quality | Project Manager | Judgment `proceed` @ 066afe8, Open Findings `None`. Admin's wording fixes are correct and the six-VSIX recipe in `change.md` runs on Linux (six packages built). 5 rows in my section: accidental 1, 2 (my own memory, fixed); undeclared 4, 5; none 3. Two small corrections for your overview (Architect row 10 location, `SPEC_AUT_EXECUTOR` for the `powershell` fallback) are under Observations. |
| 2026-11-18 | 23:33 CET | Project Manager | Architect | User widened the scope (phase 2, items A, C, D, F, H; see Scope and the Consolidated Overview). Quality's `proceed` @ 066afe8 covered phase 1 only. A needs your decision on `SPEC_AUT_EXECUTOR` / `REQ_AUT_JOBEXEC` AC-2 (spec already says fallback `powershell`; the code does not). Then Developer, Tester, Technical Writer, Admin (H), Quality. |
| 2026-11-18 | 23:50 CET | Architect | Developer | Spec decided: `SPEC_AUT_EXECUTOR` keeps `pwsh` then `powershell` and adds a clear error naming both when neither starts; process start injectable (`REQ_AUT_JOBEXEC` AC-2). Needs are `draft` pending User approval. Items C and H need no spec; D, F go to the Technical Writer after you and the Tester. |
| 2026-11-18 | 00:10 CET | Developer | Tester | Items A and C implemented (see Implementation): `runPowerShellStep(scriptPath, channel, spawnFn)` is the injectable entry for your system test; readiness AC-2 now checks tracked files. Suite 713 passed. Needs stay `draft` (spec approval is the User's). |
| 2026-11-18 | 00:25 CET | Tester | Technical Writer | Phase 2 test for item A added: 5 system tests pass, mutation-checked, no finding; one `EACCES` expectation is flagged USER REVIEW REQUIRED in my section. Item C needs no further test. |
| 2026-11-18 | 00:40 CET | Technical Writer | Admin | Items A, D, F documented and built (strict Sphinx passes); F's Codespaces groupings are prerequisite guidance, not live results (USER REVIEW REQUIRED in my section). Committed by Admin: the stale `syspilot.branching` rule still blocks my session. |
| 2026-11-18 | 00:55 CET | Admin | Quality | Item H done: `_patch_pkg.py` and `sphinx_out.txt` removed; no repository file referenced them. The Technical Writer's phase 2 work is committed as `9b9efc1`. |
| 2026-11-18 | 23:58 CET | Quality | Tester | Phase 2 @ 902208f is `blocked` on one test finding: reverting `runStep` to the old `spawnStep('pwsh', ...)` keeps all 718 tests green, so no test shows that a heartbeat `powershell` step reaches the fallback. Please add one `executeJob` test with `child_process` mocked (pattern: `heartbeat-step-output-vars.test.ts`), then hand back to me. Everything else is verified (suite 718/718, lint, Sphinx, six VSIX, docs against code, items C and H). The two draft needs await User approval (USER REVIEW REQUIRED). |
| 2026-11-19 | 20:08 CET | Tester | Quality | Wiring test added for your finding: `heartbeat-powershell-job.test.ts`, 2 tests, both fail when `runStep` is reverted. |
| 2026-11-19 | 20:12 CET | Quality | Project Manager | Phase 2 judgment is `proceed` @ 08d12ee, Open Findings `None`: the wiring test kills mutant M1, suite 720/720. USER REVIEW REQUIRED: `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` stay `draft`, so the needs check fails until the User approves them and the Developer sets `implemented`; Quality sets `verified` after that. |
| 2026-11-19 | 20:15 CET | Project Manager | Architect | User approved `REQ_AUT_JOBEXEC` (AC-2) and `SPEC_AUT_EXECUTOR` as drafted, 2026-11-19; mode is autonomous again. Set both to `approved`; then Developer `implemented`, Quality `verified`, back to me for User validation and closure. |
| 2026-11-19 | 20:20 CET | Architect | Developer | `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` set to `approved`; you set `implemented` when the code matches. |
| 2026-11-19 | 20:20 CET | Developer | Quality | `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` set to `implemented`; code unchanged since `78c1741` (matches the approved text). Please set `verified`. |
| 2026-11-19 | 20:25 CET | Quality | Project Manager | `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` set to `verified` on the `proceed` @ 08d12ee (suite 720/720, M1 killed, docs against code); the approved text differs from the draft only in status and the code is unchanged since 08d12ee. Open: User validation and closure. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User approved the intent and outcome in chat, 2026-11-18, 23:16 CET. User widened the scope to phase 2 (items A, C, D, F, H; B, E and G become backlog cards), 2026-11-18, 23:33 CET.

### Goal

The project knows where it depends on one platform without saying so. Every actor has searched its own artifacts and recorded each finding, classified as intended Windows-only (declared) or accidental. The small accidental findings the User selected are fixed in this Change.

### Value

Jarvis runs on Windows, Mac, Linux, Codespaces and WSL. Today platform-specific assumptions surface by chance, as in `ahp-codespaces-discovery` (three failing Linux tests, a drive-letter rule, a Windows-only packaging step in the Contract, a Windows path created as a literal folder on Linux). An overview lets the User decide what to fix, in which order.

### Scope

- Windows stays the primary development platform. Features that are Windows-only by nature stay as they are, for example Outlook COM, the Recorder, and the Windows Sandbox test (`test-environments/windows-sandbox`). Each is recorded once as intended, with the place where it is declared, or as undeclared.
- Each artifact owner searches its own artifacts and records its findings in its own section of this Contract, one row per finding with location, what is assumed, the classification (intended and declared, intended but undeclared, accidental) and a proposed disposition: Architect (specifications), Developer (code and unit tests), Tester (system and validation tests), Technical Writer (user-facing documents), Admin (build, CI, scripts, templates, instructions, Contract and role-card wording), Quality (its review recipe and tooling).
- Phase 1 recorded the findings and fixed wording in Contract templates, role cards and instructions (Admin): the platform-neutral packaging rule. Done and reviewed.
- Phase 2 (widened by the User, 2026-11-18) fixes these accidental findings of the consolidated overview, each by its artifact owners: A, the `powershell` job step (`SPEC_AUT_EXECUTOR`: code falls back from `pwsh` to `powershell` and reports a missing PowerShell clearly; a system test with an injected spawner; the PowerShell prerequisite in the Core guide and in `ac_heartbeat.rst`); C, the readiness test `extension-readiness-disclosure` AC-2 (tracked files instead of the working tree); D, documentation (verified Codespaces scope of the Agent Host without claiming unverified Windows, Mac, WSL or SSH checks; the Python interpreter prerequisite and lookup order; Outlook's Windows requirement in the root README feature summary); F, the platform of each acceptance procedure in `docs/acceptance/index.rst`; H, removal of the tracked leftovers `_patch_pkg.py` and `sphinx_out.txt`.
- Not in this Change, each becomes a backlog card: B, the `state.vscdb` and WSL2 session lookup; E, discovery verification in WSL, SSH and on a Mac after the release; G, a CI workflow that runs the test suite on Linux and Windows.
- Follow-up work beyond these items becomes backlog cards that the Project Manager prioritises with the User.

### Observable Outcome

- Every artifact owner's section lists its findings, or states that it found none, with the places it searched.
- One consolidated overview, compiled by the Project Manager, groups the findings by classification.
- The Admin wording fixes are in place and reviewed by Quality.
- A `powershell` job step runs with `pwsh`, else `powershell`, and fails with a clear message when neither exists; a system test shows it without PowerShell installed.
- `extension-readiness-disclosure` AC-2 passes with an untracked leftover folder in the working tree.
- The documents and acceptance index named above state the platform facts of items D and F; `_patch_pkg.py` and `sphinx_out.txt` are gone.
- The full suite passes on Linux and Quality has recorded `proceed` on the widened scope.
- The Project Manager has created backlog cards for B, E and G.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (User, 2026-11-18 23:17 CET, operation mode autonomous) |
| Version control | yes | Project Manager | Local branch `feature/platform-neutrality-audit`; squash-integrated into `development` at closure; the branch is retained | merged (SQUASH) |
| Product specification | yes | Architect | Phase 1 findings recorded; phase 2: `REQ_AUT_JOBEXEC` AC-2 and `SPEC_AUT_EXECUTOR` changed, approved by the User (2026-11-19) and now `verified`; strict Sphinx build passed | complete |
| Infrastructure impact | yes | Admin | Findings recorded in the Admin section; wording fixed in `change.md` (packaging sentence) and the `Build-Vsix.ps1` header; no build, CI or code change | complete |
| Documentation impact | yes | Technical Writer | Phase 1 findings recorded; phase 2 documentation for A, D and F updated and built | complete |
| Implementation and unit verification | yes | Developer | Phase 1: findings recorded in the Developer section. Phase 2: `runPowerShellStep` in `heartbeat.ts` (pwsh, then powershell on ENOENT, clear error), `heartbeat-powershell-step.test.ts` (new), readiness AC-2 test on tracked files; `npx vitest run` @ 78c1741: 65 files, 713 passed; `npm run lint` 0 errors; `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` set `implemented` @ 1013f0f | complete |
| Test design | yes | Tester | Phase 1: findings recorded in the Tester section. Phase 2: system tests `src/tests/heartbeat-powershell-system.test.ts` (5) and `src/tests/heartbeat-powershell-job.test.ts` (2, executeJob wiring) pass and are mutation-checked | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete (`proceed` @ 08d12ee; Open Findings `None`) |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (User, 2026-11-19; the live `pwsh`/`powershell` run is moved to the release validation) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

Phase 1 changed no specification; phase 2 changes are in the table below. Searched: `docs/userstories`, `docs/requirements`, `docs/design` for Windows, WSL, Linux, macOS, Codespace, PowerShell, `.exe`, `%VAR%`, drive letters, backslash paths, case rules, and platform branches; every hit read in context. Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental.

| # | Location | Assumption | Class | Proposed disposition |
|---|---|---|---|---|
| 1 | `US_OLK_COMBRIDGE`, `US_OLK_TASKS`, `REQ_OLK_COMBRIDGE` AC-4, `SPEC_OLK_COMBRIDGE`, `REQ_ACTOR_MAIL` AC-10 | Outlook Classic via PowerShell COM; Windows only | D | None. States "Windows + Outlook Classic only" and the non-Windows rejection. |
| 2 | `REQ_REC_SPEECH` AC-7 | Recorder supports Windows only; other platforms refuse with a notice | D | None. |
| 3 | `REQ_ACTOR_CREATETOOL` AC-5, `US_ACTOR_CREATE` AC-1 | Windows reserved device names rejected on every platform | D | None. Deliberate: Actor folders must stay portable across machines. |
| 4 | `REQ_AUT_JOBEXEC` AC-1 | Virtual environment lookup names `Scripts/python.exe` (Windows) and `bin/python` (POSIX) | D | None. |
| 5 | `REQ_AUT_JOBEXEC` AC-2, `US_AUT_HEARTBEAT` AC-2, `US_AUT_*` job types | Step type `powershell` runs `pwsh`, falling back to `powershell`; stories and requirements do not say that the step needs PowerShell on the machine (not installed by default on Linux or in Codespaces) | U | Add one sentence to `REQ_AUT_JOBEXEC` AC-2: the step fails with a clear error when no PowerShell is found. Backlog card, small. |
| 6 | `REQ_MSG_SESSIONLOOKUP` AC-10, `SPEC_MSG_SESSIONLOOKUP` | `state.vscdb` lookup derives the user data folder as `globalStorage/../..`; WSL2 branch hardcodes `/mnt/c/Users/<USERNAME>/AppData/Roaming/Code/User` (drive `c`, user name from env, product `Code` only, no Insiders) | A | A VS Code Server (Codespaces, SSH) has no `state.vscdb` below that folder and the WSL2 path breaks for another drive or Insiders. Candidate: retire with the legacy placement lookup (already open for the PM: it does not see Agent Host sessions), else derive the folder like `SPEC_COM_AHPDISCOVERY` does. Backlog card. |
| 7 | `SPEC_COM_AHPDISCOVERY` step 1 | Default registry folder is verified on Windows (Codespace/Linux now through `ahp-codespaces-discovery`); macOS and the `nameShort` for non-`Code` products are unverified | U | The spec marks macOS "To confirm". Keep; verify on a Mac when one is available. No card. |
| 8 | `SPEC_COM_CLIENTMODULE` (`userDataDir` from `globalStorage`), `REQ_COM_AGENTHOST` | Local desktop and VS Code Server covered; WSL and SSH remote windows covered only through the fallback folders, not verified | U | Verification card with the Tester (one WSL and one SSH run); the spec already says "to confirm". |
| 9 | `docs/design/spec_msg.rst`, `spec_rel.rst`, `spec_aut.rst` (code examples) | Examples use `path.resolve`, `path.sep`, `vscode.commands`; none hard-codes `\` or drive letters outside the findings above | none | No finding. |
| 10 | `docs/Jarvis Actors/Architect.md`, Architect `context.md` | The rule "keep CRLF line endings" is a Windows habit; files in the Codespace working tree are LF | A | Admin: state "keep the line endings a file already has". I replace the bullet in my own `context.md` now. |

Not searched here, owned by others: code, tests, build scripts, README and user guides.

Phase 2, item A (the `powershell` job step):

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_AUT_JOBEXEC` AC-2 (verified) | modify | Testable outcome: the step runs where PowerShell is installed; without it the step fails with a message naming the missing PowerShell. |
| `SPEC_AUT_EXECUTOR` (verified) | modify: `powershell` dispatch | Decision: the spec keeps its fallback (`pwsh`, then `powershell` on spawn `ENOENT`) and adds the clear error naming both; the process start is injectable for a system test. The code must follow the spec; the code is the gap. |

| Decision or check | Evidence |
|---|---|
| Phase 1 records only | No `.rst` file touched in phase 1. |
| Items C, D, F, H | No specification wording needed: C is a test fix, D and F are user-facing documents and the acceptance index, H removes two files. |
| Consistency | `python -m sphinx -b html docs /tmp/sphx -W --keep-going` passes. |
| Approval | User approved both needs as drafted (via PM, 2026-11-19); status `approved`. Cheapest to revert: the change is one AC clause and one spec bullet. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

Wording fixes applied; no build, CI or code behaviour changed. Searched: `.github/workflows`, root and package `package.json` scripts, `scripts/`, `.vscode/`, `test-environments/windows-sandbox`, `.gitignore`, the Contract templates and the role cards in `docs/Jarvis Contracts` and `docs/Jarvis Actors`, `.github/instructions` and `copilot-instructions.md`, for platform names, shells, `.exe`/`.cmd`/`.ps1`, drive letters, backslash paths, line-ending rules and `python` versus `python3`. Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental.

| # | Location | Assumption | Class | Disposition |
|---|---|---|---|---|
| 1 | `docs/Jarvis Contracts/change.md`, Test Execution | Quality's required packaging step was `Build-Vsix.ps1`: PowerShell, `node.exe`, `npm.cmd`, so it cannot run in a Codespace or on Linux | A | Fixed: the sentence now names the platform-neutral six-VSIX recipe. Archived Contracts stay unchanged. |
| 2 | `test-environments/windows-sandbox/` (`Build-Vsix.ps1`, `Start-Sandbox.ps1`, `guest/`) | Windows Sandbox, PowerShell, `.cmd` shims; `README.md` declares Windows 11 Pro or Enterprise, but `Build-Vsix.ps1` did not say it is the Sandbox tool and not a general packaging step | D / U | The environment is Windows-only by nature and stays. Fixed: header of `Build-Vsix.ps1` now describes it as the Sandbox tool (called by `Start-Sandbox.ps1`, writes `build-manifest.json`, `core-gh` is built by `release.yml`). |
| 3 | `.github/workflows/docs.yml`, `release.yml` | Both run on `ubuntu-latest`; steps use `npm`, `node`, `vsce`, `python`; no Windows step | none | No finding. |
| 4 | root and package `package.json` scripts, `scripts/*.py`, `scripts/*.mjs` | `tsc`, `vsce`, `node clean.js`, `sys.executable`, `process.execPath`; no shell, drive-letter or backslash assumption | none | No finding. |
| 5 | `.vscode/tasks.json` (`compile core+pim+flow` and the longer chains) | `a && b && cd x && node y && cd ../..` runs in bash, cmd and PowerShell 7 but not in Windows PowerShell 5.1; not run here | U | No card. If a Windows terminal profile defaults to PowerShell 5.1, replace the chains with `npm` scripts. |
| 6 | `docs/Jarvis Contracts/release.md` Preflight, `copilot-instructions.md` | `python -m sphinx ...` assumes a `python` command; a Linux host may only have `python3` | U | No card; the Codespace has both. |
| 7 | Role cards, Contract templates, `.github/instructions` | No Windows, PowerShell, drive-letter, backslash or line-ending rule apart from row 1. The CRLF rule from Architect row 10 is not in any versioned role card or instruction; it was in the Architect's `context.md`, which the Architect has replaced. | none | No finding. |
| 8 | Admin `context.md` and `memory/` | The Vitest uppercase drive letter rule and the Sandbox notes are labelled Windows | D | Keep. |
| 9 | Repository root `_patch_pkg.py`, `sphinx_out.txt` | Tracked leftovers from v0.4.0 and v0.13.2, not platform related | none | Phase 2 item H: removed both files; nothing in the repository referenced them. |

No Admin item remains for a behaviour-changing card. Phase 2 item H is done: `_patch_pkg.py` and `sphinx_out.txt` are removed in the same commit as this note.

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

Phase 1 records only; no code or test changed. Searched `packages/*/src` and `src/tests` for `process.platform`, `win32`, `.exe`, `powershell`/`pwsh`, `cmd.exe`, `%VAR%`, `APPDATA`/`USERPROFILE`, `/mnt/c`, backslash and drive-letter literals, case folding, `\r\n`, and the `scripts` of all `package.json` files; every hit read in context. Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental.

| # | Location | Assumption | Class | Proposed disposition |
|---|---|---|---|---|
| 1 | `packages/pim/src/outlookIntegration/OutlookCategoryProvider.ts`, `OutlookTaskProvider.ts`, `packages/core/src/engine/actors/actorMail.ts` (`runReadScript`) | Outlook Classic through `powershell` COM; guarded by `process.platform !== 'win32'` with a rejection | D | None (Architect rows 1; `jarvis.outlook.*` setting text says "Windows + Outlook Classic"). |
| 2 | `packages/recorder/src/session.ts`, `capture.ts` (`pickShell` looks for `pwsh.exe`), `extension.ts` | Recorder is Windows only, refuses elsewhere with a notice | D | None (Architect row 2; setting text "Windows only"). |
| 3 | `packages/core/src/apps/session/heartbeat.ts` (`resolvePythonInterpreter`) | Virtual environment lookup `Scripts/python.exe` on win32, `bin/python` otherwise | D | None (Architect row 4). |
| 4 | `packages/core/src/apps/session/heartbeat.ts` (step type `powershell`) | Spawns `pwsh` only, with no fallback to `powershell` and no check that it exists; on a machine without PowerShell the step fails with the raw spawn error. The spec says "falls back to `powershell`" | A | Code does not match `REQ_AUT_JOBEXEC` AC-2 as the Architect reads it (row 5). Card: fall back to `powershell` on win32 and report "PowerShell not found" clearly elsewhere. Small. |
| 5 | `packages/core/src/engine/sessions/sessionLookup.ts` (`resolveUserDataPath`) | WSL2 branch hardcodes `/mnt/c/Users/<USERNAME or USER>/AppData/Roaming/Code/User`: drive `c`, product `Code`; wrong for another drive, Insiders or a VS Code Server | A | Same as Architect row 6; one card for spec and code (retire with the legacy placement lookup or derive like `desktopUserDataDir`). |
| 6 | `packages/core/src/engine/ahp/registry.ts` (`desktopUserDataDir`), `extension.ts` (`desktopRegistryDirs`) | macOS path and `nameShort` for non-`Code` products are implemented but never run on a Mac | U | Same as Architect row 7: verify on a Mac; no card. |
| 7 | `packages/core/src/engine/ahp/protocol.ts` (`folderKey`) | Drive letter lower-cased on every platform; rest of path case-folded unless `process.platform === 'linux'`. macOS (case-insensitive by default) is folded, which is right; a case-sensitive volume on Windows or macOS is folded too | U | Behaviour follows `SPEC_COM_BINDING` ("only where the file system is"), but the code tests the platform, not the file system. Accept; no card. |
| 8 | `packages/core/src/engine/ahp/connection.ts` (`socket` endpoint) | Named pipe on Windows, Unix socket elsewhere through `net.createConnection(path)`; the same call serves both | none | No finding; covered by `ahp-client.test.ts` on Linux and by Windows runs. |
| 9 | `src/tests/recorder-components.test.ts`, `recorder-session.test.ts`, `recorder-io.test.ts` | Windows literals (`C:\evil`, `win32-x64` prebuilds, `platform: 'win32'` injected) in tests of the Windows-only Recorder; pass on Linux because the platform is injected | D | None. |
| 10 | `src/tests/actor-mail.test.ts`, `src/tests/ahp-client.test.ts`, `ahp-message-path.test.ts` | Platform is faked (`setPlatform('win32')`) or branched (`process.platform === 'win32'` pipe vs socket path; `desktopUserDataDir` cases skipped on win32) | D | None. The Windows skip means the `desktopUserDataDir` cases run on Linux and macOS only. |
| 11 | `src/tests/gitignore-manager.test.ts`, `actorAgent.test.ts`; `gitignoreManager.ts` (`detectEol`) | Code keeps the line ending a file already has; tests write `\r\n` and `\n` explicitly, so they do not depend on the checkout's line endings | none | No finding. |
| 12 | `src/tests/kanban-tool-handlers.test.ts`, `kanban-comment-preservation.test.ts`, `acceptance-criteria-format.test.ts` | Read fixtures and specs with `.replace(/\r\n/g, '\n')`: tolerant of both endings | none | No finding. |
| 13 | `src/tests/extension-readiness-disclosure.test.ts` AC-2 | Test reads the working tree (`exists('packages/syspilot')`), so an ignored leftover folder fails it on any platform; it failed in the Codespace and is not a Linux issue | A | Card (small): test the tracked files (`git ls-files`) instead of the working tree, or ignore untracked folders. |
| 14 | `package.json` scripts of all packages, `packages/recorder/clean.js` | No `rmdir`, `del`, `copy`, `.ps1` or shell-specific syntax; cleaning goes through Node. `npm ci` and `compile:packages` run on Linux | none | No finding. Packaging with `test-environments/windows-sandbox/Build-Vsix.ps1` is Admin's row. |
| 15 | Codespace setup | `ws` was not installed after the clone; `npm ci` fixed it | none | Not a code finding; Admin may note `npm ci` in the Codespace setup. |

| Decision or check | Evidence |
|---|---|
| Phase 1 records only | `git diff --stat` shows only this Contract. |
| Linux baseline | `npx vitest run` @ `cf95f2a`: all files pass on Linux (701 at the last run). |

Phase 2 (items A and C):

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| A: injectable process start | Exported `runPowerShellStep(scriptPath, channel, spawnFn = cp.spawn)`; `spawnStep` takes the same optional `spawnFn` and reports the spawn error code in `ExecResult.code` | Mock `child_process` module-wide | The Tester can run the step without PowerShell installed; no module mocking. |
| A: fallback trigger | `pwsh` then `powershell` only on spawn `ENOENT`; a script that starts and fails does not trigger the fallback | Pick by `process.platform` or PATH probe | Matches `SPEC_AUT_EXECUTOR`; no PATH logic to maintain. |
| C: readiness AC-2 | Test asks `git ls-files packages/syspilot` | Delete the folder in the test | The requirement concerns the repository, not the working tree. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/apps/session/heartbeat.ts` | `runPowerShellStep`, `spawnFn` parameter, `ExecResult.code`, clear missing-PowerShell error | `npx vitest run` @ HEAD: 65 files, 713 passed |
| `src/tests/heartbeat-powershell-step.test.ts` (new) | pwsh used; fallback on ENOENT; error names both when neither starts; no fallback when the script fails | included above |
| `src/tests/extension-readiness-disclosure.test.ts` | AC-2 checks tracked files | included above; `npm run lint` 0 errors |


## Test Design

**Owner:** Tester<br>
**Status:** complete

Phase 1 records only; no test or procedure changed. Searched: all `src/tests/*.ts` (system and unit) for `process.platform`, `win32`, `.exe`, `powershell`/`pwsh`, `cmd.exe`, drive letters, `/mnt/c`, `APPDATA`/`USERPROFILE`, `\r\n`, `execSync`/`spawnSync`; `docs/acceptance/*.rst` (validation procedures) for PowerShell, `.ps1`, drive paths, `%VAR%`, Outlook, Windows; `testdata/` fixtures; `test-environments/windows-sandbox/README.md`. Every hit read in context. Developer rows 9-12 (test files already read there) are not repeated. Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental. Linux baseline: `npx vitest run` passes; no `pwsh` or `powershell` is installed in this Codespace.

| # | Location | Assumption | Class | Proposed disposition |
|---|---|---|---|---|
| 1 | `docs/acceptance/ac_outlookcategories.rst`, `ac_actor_mail.rst` (Outlook parts) | Live Outlook Classic on Windows | D | None. Setup line says "Windows with Outlook Classic installed and running". |
| 2 | `docs/acceptance/ac_heartbeat.rst`, `testdata/heartbeat/heartbeat.yaml`, `testdata/heartbeat/scripts/*.ps1` | Step type `powershell` with `.ps1` fixtures; the procedure does not say it needs PowerShell on the machine; on Linux without `pwsh` it fails (Developer row 4: only `pwsh` is spawned) | U | Name PowerShell in the Setup of `ac_heartbeat.rst` (Technical Writer/Tester, one line), or add a `shell` step fixture once the Architect decides the spec (Architect row 5). Card with Developer row 4. |
| 3 | `src/tests/heartbeat-*.test.ts`, `coreApi.test.ts`, `rescan-job-cleanup.test.ts` | No automated test runs a `powershell` step; they mock or stop before spawn. So the step's behaviour (and Developer row 4: no fallback, raw spawn error) is covered by no system test on any platform | A (gap) | Add a system test for `REQ_AUT_JOBEXEC` AC-2 with an injected spawner (fallback `pwsh`, then `powershell`, clear error when neither exists); it runs on Linux without PowerShell. Belongs to the card of Developer row 4. |
| 4 | `src/tests/sessionLookup-wsl2.test.ts` | Asserts the hard-coded `/mnt/c/Users/<name>/AppData/Roaming/Code/User` (drive `c`, product `Code`); it pins Developer row 5 as the expected behaviour, so a fix will change the test | A | Same card as Developer row 5; the test is rewritten with the fix. |
| 5 | `src/tests/extension-readiness-disclosure.test.ts` AC-2 | Reads the working tree, not the tracked files (Developer row 13) | A | Same card as Developer row 13: use `git ls-files`. |
| 6 | `src/tests/ahp-session-state.test.ts:76`, `ahp-client.test.ts`, `ahp-message-path.test.ts` | Named pipe path on win32, Unix socket elsewhere; so the Windows named-pipe path runs only where the suite runs on Windows, the Unix path only on Linux/macOS; `desktopUserDataDir` cases are skipped on Windows | D | None. Both are covered when the suite runs on both platforms; no CI proves it (Admin row for CI). |
| 7 | `docs/acceptance/*.rst` (all except Outlook) and `test-environments/windows-sandbox/` | Validation runs on the Windows Sandbox or a Windows host; no procedure states the Codespace/Linux equivalent, and `Build-Vsix.ps1`, `Start-Sandbox.ps1` need Windows. Only `ahp-codespaces-discovery` carries a Codespace procedure | U | Declare in `docs/acceptance/index.rst` which procedures run on Linux/Codespaces (most Kanban, Flow, MCP, messaging ones) and which need Windows; Technical Writer or Tester after the User's decision. Card, small. |
| 8 | `docs/acceptance/*.rst`, `testdata/test.code-workspace` | Paths in procedures use `/` or workspace-relative names; no `\` or drive-letter literal outside the Outlook setup | none | No finding. |
| 9 | `src/tests/*` system tests (`ahp-interface-surface`, `ahp-session-state`, `tool-reference-namespace`, kanban and spec-format tests) | Platform-neutral: temp folders through `os.tmpdir()`, `path.join`, line-ending-tolerant reads | none | No finding. |
| 10 | `src/tests/ahp-codespaces-discovery.test.ts` (own) | Linux-only branch for case-sensitive path (`process.platform === 'linux'`); the IPv6 case skips when `::1` is missing; the rest runs everywhere | D | None. |

| Decision or check | Evidence |
|---|---|
| Phase 1 records only | `git diff --stat` shows only this Contract. |
| Cards proposed | Row 2 and 3 together (powershell step), row 7 (platform declaration of procedures). Rows 4 and 5 ride on Developer rows 5 and 13. |

**Phase 2 (items A, C):** The gap of row 3 is closed by `src/tests/heartbeat-powershell-system.test.ts` (Tester, 5 tests, injected spawner, runs on Linux without PowerShell): script path and `-NonInteractive` reach PowerShell and stdout is captured; the fallback `powershell` gets the same arguments and output handling; a script failure on the fallback is not reported as "not found"; both missing gives one clear error after one try each; a `pwsh` that fails with `EACCES` is its own error and does not read as missing PowerShell. Evidence: 5 of 5 pass; mutation (fallback on any spawn error instead of only `ENOENT`) fails the `EACCES` test; restored, `git status` shows only the new test file. Item C is covered by the Developer's change of the readiness AC-2 test, not retested. **USER REVIEW REQUIRED:** the `EACCES` expectation is my reading (`REQ_AUT_JOBEXEC` AC-2 speaks only of "no PowerShell installed"); revert by deleting that one test. Not covered: a real `pwsh` run (not installed in the Codespace); the Windows Sandbox `ac_heartbeat.rst` procedure stays the live check.

**Quality finding (wiring):** `src/tests/heartbeat-powershell-job.test.ts` (Tester, 2 tests, `child_process` mocked, through `executeJob`): a `powershell` job step runs `powershell` when `pwsh` is missing, and the job fails with "PowerShell not found" when neither exists. Evidence: 2 of 2 pass; reverting `runStep` to `spawnStep('pwsh', ...)` fails both (restored, `git status` shows only the new file).

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

Phase 1 records only. Searched the root README, all package READMEs and user guides, and the current Agent Host release-note entry for platform names, paths, shell commands and runtime prerequisites. Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental.

| # | Location | Assumption | Class | Proposed disposition |
|---|---|---|---|---|
| 1 | `docs/user guides/recorder.md`, `packages/recorder/README.md`, root `README.md` | Meeting recording is Windows-only; the guide and package README also describe the PowerShell versions | D | Keep unchanged. |
| 2 | `docs/user guides/pim.md`, `packages/pim/README.md`, root `README.md` | Outlook integration needs Windows with Outlook Classic; the guide and package README declare this in the `jarvis.outlook.enabled` setting, but the root feature summary omits it | D | Keep the setting text; surface the limit in the feature summary when revising that section. |
| 3 | `docs/user guides/core.md` (Heartbeat), root `README.md` | PowerShell steps need PowerShell in the environment where Jarvis runs; the docs list the step type without naming the prerequisite | U | Add the prerequisite to the Core guide after the command/fallback decision. Same card as Developer row 4, Architect row 5 and Tester rows 2–3. |
| 4 | `docs/user guides/core.md` (Heartbeat), root `README.md` | Python steps need an interpreter; the docs list Python without stating that Jarvis uses a configured interpreter, a workspace virtual environment or `python` on `PATH` | U | Document the interpreter prerequisite and lookup order alongside the PowerShell note; do not imply Python is bundled. |
| 5 | `docs/user guides/core.md`, `docs/user guides/getting-started.md`, `packages/core/README.md` | Agent Host notes reflect the earlier Windows checks and omit the accepted Codespaces discovery and outbound messaging result from `ahp-codespaces-discovery`; “Remote windows … are not served” can be read as a blanket exclusion | A | Document the verified Codespaces scope and distinguish it from unverified or excluded paths. Do not claim Codespaces chat creation, replies, Tunnels or the Agents window, or preempt the Windows/macOS release checks. |

MCP and Flow user guides and package READMEs contain no Agent Host discovery or platform support claims. Acceptance procedure prerequisites remain in Tester rows 2 and 7; propose one coordinated update rather than duplicate cards. No user-facing document was edited.

Phase 2 documentation:

| Item | Documents and evidence |
|---|---|
| A | `docs/user guides/core.md` documents the PowerShell prerequisite and fallback; `docs/acceptance/ac_heartbeat.rst` names the runtime prerequisites in setup. No acceptance criterion changed. |
| D | Core guide, Getting Started and `packages/core/README.md` distinguish verified Codespaces discovery and sending from the unverified paths, based on the accepted `ahp-codespaces-discovery` Contract. The Core guide documents Python interpreter lookup; the root README names Windows with Outlook Classic for PIM. |
| F | `docs/acceptance/index.rst` groups all 20 procedure pages by platform prerequisites; each page is linked exactly once. **USER REVIEW REQUIRED:** The Linux/Codespaces groupings describe prerequisites, not results from live runs. Full Actor journeys stay on a desktop setup with working Actor chats until verified in Codespaces. |

Documentation verification: `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` passed without warnings. No live acceptance procedure was run.

## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` @ `08d12ee` (phase 2, items A, C, D, F, H); Open Findings `None`. Phase 1 `proceed` @ `066afe8`. Verified at HEAD: full suite 720 of 720, compile and lint (0 errors), strict Sphinx; the code follows `SPEC_AUT_EXECUTOR`; the readiness test passes with an ignored leftover folder in the working tree; the documents match the code; `_patch_pkg.py` and `sphinx_out.txt` are gone and nothing references them. The earlier finding (`runStep` wiring uncovered, mutant M1) is closed: `src/tests/heartbeat-powershell-job.test.ts` runs a `powershell` job step through `executeJob` and both its tests fail under M1. **USER REVIEW REQUIRED** (flagged, not blocking my judgment): `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` are still `draft` until the User approves them, so `check_contract_needs.py` fails (see Test Execution); I set them to `verified` only after the User approves them and the Developer sets them `implemented`.

### Phase 1 Review Methods (@ 066afe8)

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Diff audit | `development...066afe8` | Three files; `change.md` Test Execution sentence and `Build-Vsix.ps1` header read against `Start-Sandbox.ps1` (line 128 calls the script and reads `build-manifest.json`) and `release.yml` (builds `core-gh`) | The header is accurate: Sandbox tool, called by `Start-Sandbox.ps1`, writes `build-manifest.json`, `core-gh` built by `release.yml`, Windows only. The `change.md` sentence names the six packages and the recipe correctly. | The header is a comment block before `[CmdletBinding()]`; no `pwsh` here, so the script was not parsed. A comment block there is valid PowerShell. |
| Claim spot-check | Architect rows 5, 6, 10; Developer rows 4, 5, 13; Admin rows 5, 6, 9; Technical Writer row 5 | Read the cited lines: `heartbeat.ts:421` spawns only `pwsh`; `sessionLookup.ts:34` hardcodes `/mnt/c/Users/.../Code/User`; `extension-readiness-disclosure.test.ts:31` reads the working tree; `.vscode/tasks.json` chains with `&&` and `cd`; `release.md:120` uses `python -m sphinx`; `_patch_pkg.py` and `sphinx_out.txt` are tracked; `core.md:51` says remote windows (WSL, SSH, Dev Tunnels) are not served | Those rows are accurate as to location and assumption. Two small inaccuracies, see Observations. | Not every row was re-read: Architect 1-4, 7-9, Developer 1-3, 6-15, Tester, the other Admin and Technical Writer rows rest on the owners' own evidence. |
| MECE / Trace | not run | No Need or other impacted object changed in this Change | none | Not applicable; the analyzers start from impacted objects. |
| Phase 2 diff audit | `066afe8..902208f` (15 files): `heartbeat.ts`, `extension-readiness-disclosure.test.ts`, two new test files, `REQ_AUT_JOBEXEC` AC-2, `SPEC_AUT_EXECUTOR`, docs, acceptance index, removals | Code read against the spec bullet and AC-2: `pwsh`, then `powershell` only on spawn `ENOENT`, one clear error naming both; a script that starts and fails does not trigger the fallback; `spawnFn` injectable. Docs read against code: PowerShell fallback, Python lookup order (`python.defaultInterpreterPath`, `.venv`, `venv`, `python`) and Codespaces scope match `heartbeat.ts` and the accepted `ahp-codespaces-discovery` Contract. Acceptance index: 20 pages, each linked once. | Code and docs are correct. One test gap: Open Findings row 1. | The docs' Linux and Codespaces groupings are prerequisites, not live results (Technical Writer's flag); not run. |
| Mutation checks (restored, `git status` clean) | `heartbeat.ts` | M1: `runStep` calls `spawnStep('pwsh', ...)` again, as before the change: all 718 tests then passed (survived). M2: `code: err.code` removed from the spawn-error result: 5 of the 9 new tests fail. Item C: an ignored folder `packages/syspilot/out/x` created in the working tree: `extension-readiness-disclosure` passes 7 of 7. | M1 (phase 2 first round, @ 902208f) was the finding that led to `heartbeat-powershell-job.test.ts`; rerun @ 08d12ee: both new job tests fail under M1 (killed), file restored, `git status` clean. | Mutants run by hand against the new tests only. |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| VSIX packaging (the new recipe, Linux Codespace) | `npm ci`, `npm run compile`, `node packages/core/build.js --minify`, `npx vsce package --no-dependencies --out /tmp/vsix/<name>.vsix` per package @ 066afe8 | pass: six VSIX at 0.33.0 (core 60 files, pim 26, recorder 12, mcp 10, flow 18, kanban 21); every manifest declares `repository`, so `--allow-missing-repository` was not used; `git status` clean afterwards. The sentence in `change.md` works as written. This Change touches no package, so the run checks the recipe, not the change. |
| Strict docs build | `python -m sphinx -b html docs /tmp/sphx4 -W --keep-going` @ 066afe8 | pass |
| Needs check | `python scripts/check_contract_needs.py` @ 066afe8 | pass; exit 0 |
| Whitespace | `git diff --check development...HEAD` @ 066afe8 | pass |
| Full suite | not run | No code or test changed (diff above); the Developer's baseline is `npx vitest run` green @ `cf95f2a`. |
| Full suite (phase 2) | `npx vitest run --testTimeout 15000` @ 902208f | pass; 718 of 718 in 66 files |
| Full suite (phase 2, after Tester) | `npx vitest run --testTimeout 15000` @ 08d12ee | pass; 720 of 720 in 67 files; lint 0 errors; `git diff --check` clean |
| Compile / lint (phase 2) | `npm run compile:packages`, `npm run lint` @ 902208f | pass; 0 errors |
| Docs, whitespace (phase 2) | `python -m sphinx -b html docs /tmp/sphx5 -W --keep-going`, `git diff --check development...HEAD` @ 902208f | pass |
| Needs check (phase 2) | `python scripts/check_contract_needs.py` @ 902208f | fail, exit 1 (superseded: exit 0 @ 1013f0f, see the next row): `REQ_AUT_JOBEXEC` and `SPEC_AUT_EXECUTOR` are `draft` (AC-3 needs at least `implemented`). Expected until the User approves them; USER REVIEW REQUIRED. |
| Needs check (phase 2, after approval) | `python scripts/check_contract_needs.py` @ 1013f0f, then @ the `verified` commit | exit 0 @ 1013f0f (`implemented` is enough) and exit 0 on the commit that sets `verified`; strict Sphinx passes. |
| VSIX packaging (phase 2) | `npm run compile`, `node packages/core/build.js --minify`, `npx vsce package --no-dependencies --out /tmp/vsix2/<name>.vsix` per package @ 902208f | pass: six VSIX at 0.33.0 (core 60 files, pim 26, recorder 12, mcp 10, flow 18, kanban 21); the core bundle contains the `PowerShell not found` message once and the packaged core README names the Codespaces scope; `git status` clean. Run without `npm ci`: dependencies unchanged since the phase 1 run. |

### Quality Findings

Quality's own artifacts: the Quality role card, `memory/review-lessons.md`, `context.md`, the review recipe, and the tools it runs (analyzers, `vitest`, packaging). Classes: **D** intended and declared, **U** intended but undeclared, **A** accidental.

| # | Location | Assumption | Class | Disposition |
|---|---|---|---|---|
| 1 | Quality `context.md`, `memory/review-lessons.md` | Named `Build-Vsix.ps1` as Quality's required packaging step: Windows PowerShell and `.cmd` shims | A | Fixed in my memory now: the six-VSIX recipe of `change.md`; `Build-Vsix.ps1` stays the Sandbox tool. |
| 2 | `memory/review-lessons.md` (mutation runs) | Suggests running mutants from a temporary `.ps1` through `pwsh -NoProfile -File` | A | Fixed in my memory now: use a script of the platform's shell (bash here). |
| 3 | `docs/Jarvis Actors/Quality.md` | No Windows, PowerShell, drive-letter, backslash or line-ending rule | none | No finding. |
| 4 | Review environment (Codespace) | Quality can run the suite and packaging on Linux but cannot exercise the Windows named pipe, Outlook COM or the Recorder, so those paths are covered only by User validation on Windows. The Contract does not say which OS a Test Execution row ran on | U | No card. Quality records the OS of each run and lists what the environment could not exercise (as in `ahp-codespaces-discovery`). If the User wants it written down, one line in the Test Execution template; Admin. |
| 5 | `analyze_mece.py`, `analyze_trace.py` | Invoked with `python`; the repo's own `docs/_build` is absent in a fresh clone, so needs data is built under `/tmp` first | U | Same as Admin row 6 (`python` versus `python3`); no extra card. |

### Observations For The Project Manager's Overview

- Architect row 10 puts the CRLF rule in `docs/Jarvis Actors/Architect.md`; `git grep` finds no CRLF or line-ending rule in any versioned role card or instruction. Admin row 7 says the same. The finding concerned only the Architect's replaced `context.md`; treat it as closed, no Admin wording needed.
- Architect row 5 and Developer row 4 cite `REQ_AUT_JOBEXEC` AC-2 for the `powershell` fallback. AC-2 says only "via a PowerShell process"; the `pwsh` with fallback `powershell` is in `SPEC_AUT_EXECUTOR` (`docs/design/spec_aut.rst`). The code-versus-spec conflict stands, in the spec; the card should name `SPEC_AUT_EXECUTOR`.
- `npm ci` prints an `install-scripts` warning for `esbuild`; the build still passed. Not a finding.

### Observations For The Project Manager (Phase 2)

- The gate rows of Developer and Tester still read "no code or test changed (phase 1 records only)", and the Developer and Tester sections open with the same sentence, although both changed code or tests in phase 2. The facts are in their phase 2 tables; the completion evidence in the gate rows should say so before closure.
- `check_contract_needs.py` will keep failing until the User approves the two draft needs. Order: User approves (`approved`), the Developer sets `implemented` (the code exists), Quality sets `verified` on `proceed`. The unattended mode does not change that: a Need does not move without its evidence.
- `extension-readiness-disclosure` AC-2 now runs `git ls-files`, so it needs a git checkout; in a source archive without `.git` it would throw. Acceptable for this repository; not a finding.

Quality communicates its judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

None

## Consolidated Overview

**Owner:** Project Manager<br>
**Status:** complete

Compiled from the owner sections, with Quality's two corrections applied. 62 rows: Architect 10, Developer 15, Tester 10, Technical Writer 5, Admin 9, Quality 5, minus rows with no finding.

| Class | Finding | Source rows | Proposed card |
|---|---|---|---|
| Accidental | `powershell` job step spawns only `pwsh`, no fallback, raw spawn error; `SPEC_AUT_EXECUTOR` says it falls back to `powershell`; no system test runs the step | Architect 5, Developer 4, Tester 2-3, Technical Writer 3 | Card A: spec decision on `SPEC_AUT_EXECUTOR` and `REQ_AUT_JOBEXEC` AC-2, code fallback and clear error, system test with an injected spawner, PowerShell prerequisite in the Core guide and in `ac_heartbeat.rst` |
| Accidental | `state.vscdb` lookup assumes the desktop layout; WSL2 branch hardcodes `/mnt/c/Users/<name>/AppData/Roaming/Code/User` | Architect 6, Developer 5, Tester 4 | Card B: retire with the legacy placement lookup (spec and code), or derive the folder like `desktopUserDataDir`; the test is rewritten with it |
| Accidental | `extension-readiness-disclosure` AC-2 reads the working tree, so an ignored leftover folder fails it on any platform | Developer 13, Tester 5 | Card C: test the tracked files (`git ls-files`) |
| Accidental | Agent Host notes in the Core guide, Getting Started and the core README omit the verified Codespaces scope and read as excluding all remotes | Technical Writer 5 | Card D: update after the release validation of Windows and Mac; claim only what is verified |
| Intended, undeclared | Python job steps: documentation does not name the interpreter prerequisite and lookup order | Technical Writer 4 | Part of Card D |
| Intended, undeclared | Root README feature summary omits "Windows with Outlook Classic" for the Outlook integration | Technical Writer 2 | Part of Card D |
| Intended, undeclared | Discovery verified for Windows (user) and Codespaces; WSL, SSH and macOS (path, `nameShort` for non-`Code` products) never run | Architect 7-8, Developer 6 | Card E: verification runs after the release (WSL first, then SSH and Mac when available) |
| Intended, undeclared | Acceptance procedures do not say which run on Linux or in a Codespace and which need Windows | Tester 7 | Card F, small: declare it in `docs/acceptance/index.rst` |
| Intended, undeclared | `folderKey` tests the platform, not the file system, for case folding (a case-sensitive volume on Windows or macOS is folded) | Developer 7 | Accept; no card |
| Intended, undeclared | `.vscode/tasks.json` chains fail in Windows PowerShell 5.1; `python` versus `python3` in the Preflight; Quality's review environment cannot exercise Windows paths | Admin 5-6, Quality 4-5 | No card |
| Intended, declared | Outlook COM, Recorder, reserved Windows device names for Actor folders, virtual environment lookup, Windows Sandbox environment, Windows-faked tests | Architect 1-4, Developer 1-3, 9-10, Tester 1, 6, 10, Technical Writer 1, Admin 2, 8 | None; stays as it is |
| Fixed in this Change | Windows-only packaging step in `change.md` (six-VSIX recipe); `Build-Vsix.ps1` header says Sandbox tool; Quality's own memory | Admin 1-2, Quality 1-2 | Done |
| Closed | CRLF rule: not in any versioned file | Architect 10, Admin 7 | None |
| Open question | No CI workflow runs the test suite, so nothing proves it on Windows and Linux together | Tester 6 | For the User: card G, a test workflow on Linux and Windows? |
| Aside | Tracked leftovers `_patch_pkg.py`, `sphinx_out.txt` in the repository root | Admin 9 | Card H, small: remove |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Phase 1 overview, platform-neutral packaging rule, phase 2 items A, C, D, F, H (no `US_*` or `AC_*` need changed) | The User accepted on the automatic evidence: suite 720 of 720, lint 0 errors, strict Sphinx, needs check exit 0, six VSIX at 0.33.0, mutation-checked system and wiring tests. The live `pwsh`/`powershell` run of `ac_heartbeat.rst` was not executed and moves to the release validation. | 2026-11-19 |

**Decision:** accepted.

## Closure

**Owner:** Project Manager<br>
**Status:** closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [x] The feature branch is squash-integrated into `development`.
- [x] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [x] Current blocker is `none`.
- [x] Header Status is `closed`.

**Final outcome:** Accepted by the User on 2026-11-19. Every actor searched its own artifacts for platform assumptions and the findings are consolidated in this Contract; the platform-neutral packaging rule is in `change.md`; the `powershell` job step falls back from `pwsh` to `powershell` with a clear error (`REQ_AUT_JOBEXEC` AC-2, `SPEC_AUT_EXECUTOR` verified); the readiness AC-2 test uses tracked files; documentation and the acceptance index state the platform facts; `_patch_pkg.py` and `sphinx_out.txt` are removed. Squash SQUASH on `development`; the feature branch is retained. Not released. Backlog cards: K75 (session lookup), K76 (discovery in WSL, SSH, Mac), K77 (CI test workflow). Statistics record in `.syspilot/stats/`.
