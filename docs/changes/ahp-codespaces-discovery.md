# Change Contract: ahp-codespaces-discovery

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-18<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-18 | 21:36 CET | Project Manager | Architect | User approved the Contract release (autonomous). Scope is K73 Codespaces discovery plus K74 Linux test fix; Research findings and spike `a21fba6` are the basis. |
| 2026-11-18 | 21:55 CET | Architect | Developer | Spec done, changed needs are `draft` until User approval via PM. Implement per `SPEC_COM_AHPDISCOVERY`/`SPEC_COM_CLIENTMODULE`; spike `a21fba6` is a usable basis (cherry-pick or rewrite). K74: `folderKey` must normalise the drive letter on Linux too (`SPEC_COM_BINDING`). |
| 2026-11-18 | 22:05 CET | Developer | Quality | Implemented spike basis (cherry-picked `a21fba6`) plus K74 `folderKey` fix; needs are approved. Three other Linux failures remain outside this scope (see Implementation). Not live-verified in a Codespace. |
| 2026-11-18 | 22:30 CET | Quality | Project Manager | Blocked on one intent finding only: Outcome promises a green Linux suite, Scope covers K74 only, three unrelated failures remain. Code, spec and live client connection are clean; proceed follows your ruling. |
| 2026-11-18 | 21:57 CET | Project Manager | Developer | User widened the scope: the three further Linux failures belong to this Change (Intent and Scope updated). Rows for Documentation, Test design and Infrastructure are still unfilled; decide each and route to its owner before Quality. |
| 2026-11-18 | 22:15 CET | Developer | Admin | Fixed the three Linux failures at their cause (see Implementation); suite is green on Linux (701 passed). Rows Infrastructure, Documentation and Test design are undecided: each owner decides its own (Admin, Technical Writer and Tester are all asked); the last to finish returns the Contract to Quality. |
| 2026-11-18 | 22:45 CET | Tester | Quality | Test design complete: 8 new black-box tests pass, no finding; the live Codespace send scenario stays a User validation procedure. Infrastructure and Documentation are decided (not applicable), so all rows are filled. |
| 2026-11-18 | 22:36 CET | Quality | Project Manager | Judgment `proceed` @ a439ffa, Open Findings `None`: suite 709/709, compile/lint, strict Sphinx and `npm run package` pass; MECE and Trace clean. Packaging ran on Linux only (User-approved exception). Not verified: message arrival in a Codespace and on the Windows desktop; both procedures are in Validation For The User. |
| 2026-11-18 | 22:52 CET | Project Manager | Quality | User accepted (Windows and Mac check deferred to the release validation). The needs check fails: `REQ_COM_AGENTHOST`, `SPEC_COM_AHPDISCOVERY`, `SPEC_COM_CLIENTMODULE`, `SPEC_COM_BINDING` are `approved`. Ontology: your `proceed` names the evidence for `verified`; set them and hand back for closure. |
| 2026-11-18 | 22:58 CET | Quality | Project Manager | Needs set to `verified` on my `proceed` at `a439ffa`: `REQ_COM_AGENTHOST`, `SPEC_COM_AHPDISCOVERY`, `SPEC_COM_CLIENTMODULE`, `SPEC_COM_BINDING` (reason in the Quality section; no code changed since). `check_contract_needs.py` result is recorded in my message. Ready for closure. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-18, on bundling K73 and K74 and running the change in Codespaces: “ja”; scope widened by the User on 2026-11-18 to include the three further Linux test failures, decision “widen” on Quality's intent finding.

### Goal

Jarvis finds and connects to the Agent Host when VS Code runs in a GitHub Codespace (Linux, VS Code Server), just as it does on the Windows desktop. Jarvis's own test suite passes on Linux.

### Value

The User works with Jarvis actors in Codespaces. Today Jarvis never connects there, so actor chats lack their tools and messaging. A green test suite on Linux lets every actor verify its work in the Codespace.

### Scope

- Agent Host discovery and connection for the Codespace setup: the host VS Code Server starts there, in the user-data location VS Code Server uses (backlog K73).
- The Windows desktop behavior stays as it is.
- The `folderKey` test in `ahp-message-path.test.ts`, which fails on Linux (backlog K74).
- The three further tests that fail on Linux, so the suite is green there: `recorder-io` (`pickShell`), `sessionLookup-wsl2`, and `extension-readiness-disclosure` AC-2 (a test that went stale when the Syspilot package was removed). Each is fixed at its cause, without weakening what the test protects.
- Out of scope, as follow-ups after validation: the reply direction of messaging and opening an actor chat in the Codespace, plus Tunnels and the Agents window in a client connected to the Codespace.
- Basis: Research findings `FI-2026-11-18-ahp-codespaces-discovery.md` (actor-context, Research) and spike `a21fba6` on branch `research-codespaces-ahp`.

### Observable Outcome

- In a Codespace, the Jarvis log shows a connection to the Agent Host, and actor chats receive Jarvis tools.
- A message sent from an actor chat in the Codespace with `jarvis_sendMessage` arrives at the receiving actor.
- On the Windows desktop, Jarvis connects as before.
- The full test suite passes on Linux.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (User, 2026-11-18, operation mode autonomous) |
| Version control | yes | Project Manager | Local branch `feature/ahp-codespaces-discovery`; squash-integrated into `development` at closure; the branch is retained | merged (`9925bd6`) |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete (strict Sphinx build passes; all changed needs `draft`) |
| Infrastructure impact | not applicable: the diff `development...HEAD` touches no manifest, lockfile, workflow, build script or configuration; `ws` is already declared in `packages/core/package.json`; the Linux suite runs with the existing `npm ci` and `npx vitest run` | Admin | Affected infrastructure artifacts are updated, or none is affected | not applicable |
| Documentation impact | not applicable: no user-facing statement becomes false; guides and READMEs name only Windows evidence and the unserved remote windows (WSL, SSH, Dev Tunnels), not Codespaces; no Codespaces support is claimed before User validation | Technical Writer | Core, Getting Started, MCP and Flow guides and READMEs reviewed; none changed | not applicable |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete (section Test Design; live Codespace scenario is a User validation procedure, not run) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete (`proceed` @ a439ffa; Open Findings `None`) |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (User, 2026-11-18; Windows and Mac check deferred to the release validation) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_COM_AGENTHOST` (draft) | modify: AC-6 | The client also finds the Agent Host when VS Code runs as VS Code Server (Codespaces). Desktop unchanged. |
| `SPEC_COM_AHPDISCOVERY` (draft) | modify: steps 1-4 | Fallback user data folders; `standalone` entries and `tcp` endpoints accepted, `editor` preferred; `ws://host:port/?tkn=` transport. |
| `SPEC_COM_CLIENTMODULE` (draft) | modify: `fallbackUserDataDirs` argument | The extension derives the desktop user data folder of the product like the server does. |
| `SPEC_COM_BINDING` (draft) | modify: folder comparison | Drive-letter normalisation on every platform (K74: the `folderKey` test fails on Linux); rest of the path case-insensitive only off Linux. |

| Decision or check | Evidence |
|---|---|
| Basis | `FI-2026-11-18-ahp-codespaces-discovery.md`, spike `a21fba6` (registry, client, connection, extension). |
| Impact | Changes confined to the `COM` theme; no story changes (`US_COM_SEND` already covers the outcome). |
| Consistency | `python -m sphinx -b html docs /tmp/sphx -W --keep-going` passes. |
| Open, outside this Contract | Lazy host start (no entry before a renderer connects) is covered by the existing Retry; reply direction, opening a chat, Tunnels and the Agents window stay follow-ups. The `SPEC_COM_BINDING` Linux rule is my reading; the Developer may report a better one. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Basis | Cherry-pick of spike `a21fba6`, checked against `SPEC_COM_AHPDISCOVERY` steps 1-4 and `SPEC_COM_CLIENTMODULE`. | Rewrite. | The spike already matches the approved spec (fallback folders, `standalone`/`tcp`, editor first, `ws://host:port/?tkn=`). |
| K74 `folderKey` | Lower-case the drive letter on every platform; lower-case the rest only off Linux. | Lower-case the whole path everywhere. | Matches `SPEC_COM_BINDING`; Linux paths stay case-sensitive. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/ahp/registry.ts`, `client.ts`, `connection.ts`, `index.ts` | `standalone` and `tcp` entries, `fallbackUserDataDirs`, `desktopUserDataDir`, tcp WebSocket | `npx vitest run`: `ahp-client.test.ts` passes |
| `packages/core/src/extension.ts` | passes the desktop user data folder of the product as fallback | `npm run compile:packages` passes |
| `packages/core/src/engine/ahp/protocol.ts` | `folderKey` drive-letter normalisation on Linux | `ahp-message-path.test.ts` passes (new case `c:/` = `C:/`) |

Three further Linux failures, fixed at their cause (scope widened by the User, 2026-11-18):

| Test | Cause | Fix |
|---|---|---|
| `extension-readiness-disclosure` AC-2 | Untracked, git-ignored leftover `packages/syspilot` (`node_modules`, `out`) in the Codespace working tree; the package is removed from the repository. | Removed the leftover folder; no test change. |
| `recorder-io` `pickShell` | The test built the PATH from `C:\a:C:\b`; `:` is the PATH delimiter on Linux and split the drive letters. | Test uses drive-less folders. |
| `sessionLookup-wsl2` USERNAME undefined | The test deleted `USERNAME` only; `USER` is set in a Codespace and is a fallback of the code. | Test also clears and restores `USER`. |

Full run on Linux: `npx vitest run` 701 passed, 0 failed; lint 0 errors. The Codespace needed `npm ci` (`ws` was not installed). Live connection in a Codespace is not verified by me.

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Desktop unchanged: a live own-folder entry wins, fallback host never contacted | system | REQ_COM_AGENTHOST AC-6; SPEC_COM_AHPDISCOVERY step 1 | `src/tests/ahp-codespaces-discovery.test.ts` (Tester) |
| Fallback folders walked in order, empty one skipped | system | REQ_COM_AGENTHOST AC-6; SPEC_COM_CLIENTMODULE `fallbackUserDataDirs` | same file |
| `editor` entry preferred to a newer `standalone` one; `standalone` used when the editor entry does not answer | system | SPEC_COM_AHPDISCOVERY steps 2-3 | same file |
| Wrong token on `ws://host:port/?tkn=` is refused; no token in the log | system | SPEC_COM_AHPDISCOVERY step 4 | same file |
| IPv6 loopback endpoint connects (skipped where `::1` is unavailable) | system | SPEC_COM_AHPDISCOVERY step 4 | same file |
| Entries dropped: unknown `type`, `tcp` without usable port, unknown endpoint type | system | SPEC_COM_AHPDISCOVERY step 2 | same file |
| Drive letter case-insensitive everywhere; Linux path case-sensitive | system | SPEC_COM_BINDING (K74) | same file |
| Registry scan, fallback connection, desktop folder derivation, recording, retry, restart | unit (Developer, cited) | REQ_COM_AGENTHOST AC-1 to AC-6 | `src/tests/ahp-client.test.ts`, `ahp-message-path.test.ts` |
| In a Codespace the Jarvis log shows the Agent Host connection, actor chats get Jarvis tools, and `jarvis_sendMessage` from one actor chat arrives at the receiving actor | validation (manual, live Codespace) | REQ_COM_AGENTHOST AC-6; US_COM_SEND | not run; User validation procedure: open the Codespace, read the Jarvis log for the connection line, send with `jarvis_sendMessage`, receive with `jarvis_receiveMessage` |

**Evidence:** `npx vitest run src/tests/ahp-codespaces-discovery.test.ts`: 8 of 8 pass on Linux. Mutation checks (restored, `git status` clean): removing the `editor` rank fails the editor-preference test; removing Linux case-sensitivity in `folderKey` fails the folder test.

**Findings:** None. Not covered: live host start in a Codespace (lazy start) and the `desktopRegistryDirs()` derivation from `product.json`, which only a live run exercises.

## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` @ `a439ffa` (second round). The first-round intent finding is closed: the Scope was widened, the three Linux failures are fixed at their cause, and the full suite passes on Linux (709 of 709). Code matches `SPEC_COM_AHPDISCOVERY` steps 1-4, `SPEC_COM_CLIENTMODULE` and `SPEC_COM_BINDING`; all upstream gates are decided; Open Findings is `None`. Not verified, and not a pass: the arrival of `jarvis_sendMessage` on the Windows desktop and on Mac (moved by the User to the release validation).

**Status of the Needs (2026-11-18, after the User's acceptance):** `REQ_COM_AGENTHOST`, `SPEC_COM_AHPDISCOVERY`, `SPEC_COM_CLIENTMODULE` and `SPEC_COM_BINDING` are set to `verified` on this `proceed`. Evidence, from Test Execution and the Test Design table: the full suite passes (709 of 709 @ a439ffa), including the 8 Tester tests that trace to `AC-6`, discovery steps 1-4, `fallbackUserDataDirs` and the `folderKey` rule (two mutation checks fail as intended); the review is clean (diff audit, MECE, Trace, no open finding). The derivation of the fallback folder in `extension.ts` has no unit test; the live Codespace run that the User accepted exercised it in the extension host. `verified` is technical evidence only; the Windows and Mac check stays with the release validation. The only change since `a439ffa` is the Contract itself (`git diff a439ffa..HEAD` touches this file only).

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Diff audit | `136167d..3369737` (`packages/`, `src/`, docs) | One implementation commit; code read against spec steps 1-4, `SPEC_COM_CLIENTMODULE`, `SPEC_COM_BINDING`, `REQ_COM_AGENTHOST` AC-6 | No defect. Fallback only when own folder has no live entry; editor ranked before standalone, then newest; IPv6 host bracketed; token not logged (tested). | `desktopRegistryDirs()` in `extension.ts` (product.json/appName) has no unit test; residual risk. IPv6 bracket branch untested. |
| Live check | `AhpClient` from compiled `packages/core/out` in this Codespace | Own folder `~/.vscode-remote/data` has no registry; fallback `~/.config/Code` held a `standalone` `tcp 127.0.0.1:19519` entry; client connected, negotiated 1.2.0, listed 9 sessions | Pass at client level | Not run inside the extension host; the message `jarvis_sendMessage` arrival is not exercised (validation). |
| MECE (`syspilot.mece`, `same-document`) | `REQ_COM_AGENTHOST`, `SPEC_COM_AHPDISCOVERY`, `SPEC_COM_CLIENTMODULE`, `SPEC_COM_BINDING`; exact same-type peer sets of `docs/requirements/req_com.rst` and `docs/design/spec_com.rst` read in full | Analyzer output plus a semantic read of every peer | No new overlap, contradiction or gap. The earlier tension `REQ_MSG_EDITORPLACEMENT` versus `REQ_COM_OPEN` predates this change. | `semantic-content-review-required` and `structured-coverage-data-unavailable` (analyzer limits); the semantic read is Quality's own judgment. |
| Trace (`syspilot.trace`, `both`, depth 2) | The same four needs; 55 peer and neighbor needs read | Analyzer output plus a semantic read of every resolved neighbor | No unresolved target and no inconsistent edge. | `semantic-content-review-required`; links not changed by this Change were read, not re-judged. |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite (first round) | `npx vitest run --testTimeout 15000` @ 3369737 | 698 pass, 3 fail: `recorder-io` pickShell, `sessionLookup-wsl2`, `extension-readiness-disclosure` AC-2; none touched the diff; the Scope was then widened |
| Full suite | `npx vitest run --testTimeout 15000` @ a439ffa | pass; 709 of 709, including the 8 new Tester tests |
| Compile / lint | `npm run compile:packages`, `npm run lint` @ a439ffa | pass; 0 errors |
| Docs | `python -m sphinx -b html docs /tmp/sphx -W --keep-going` @ a439ffa | pass |
| VSIX packaging | `npm run package` @ a439ffa; `Build-Vsix.ps1` not run | pass; `jarvis-core-0.33.0.vsix`, 60 files. User-approved exception, 2026-11-18: no `pwsh` in the Codespace, the Linux package build suffices for this Change. Only the core VSIX was built. |

### Validation For The User

Linux verification (709 of 709) is not User validation. No automated test exercises the real Windows named-pipe path. Procedure on the Windows desktop with the VSIX of this branch:
1. Open a Jarvis workspace. In the Jarvis log the line `registry ... trying editor` shows the own registry folder and a socket or named pipe, with no `standalone` or TCP attempt; protocol version and sessions are logged. A `fallback` mention in the `client started` line is expected.
2. Send a message with `jarvis_sendMessage` between two actor chats and check that it arrives.
3. Optional: reload the window and check the reconnect.

Codespace: the procedure in the Test Design table (read the connection line in the Jarvis log, then send and receive a message).

Residual risks, recorded and not blocking: `desktopRegistryDirs()` (reads `product.json` `nameShort`) has no unit test; the IPv6 bracket branch is covered only by the Tester's conditional test; lazy host start in a Codespace is not covered.

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

None

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Codespace: Jarvis connects to the Agent Host and `jarvis_sendMessage` arrives (no `US_*` or `AC_*` need changed) | The User accepted Research's live run of the identical code (`a21fba6`) in this Codespace, where `jarvis_sendMessage` works, together with Quality's live `AhpClient` check (fallback `~/.config/Code`, `standalone` `tcp`, protocol 1.2.0, 9 sessions). The only production difference to the spike is the K74 `folderKey` line. | 2026-11-18 |
| Windows desktop and Mac: connection unchanged (named pipe or socket, no `standalone`/TCP attempt) | Deferred to the release validation by the User. PM code review of `development...HEAD`: the pipe and socket path is unchanged, `folderKey` lower-cases the whole path on Windows and Mac as before; the fallback differs only with a custom `--user-data-dir`. | 2026-11-18 |

**Decision:** accepted, with the Windows and Mac check moved to the release validation.

## Closure

**Owner:** Project Manager<br>
**Status:** closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [x] The feature branch is squash-integrated into `development`.
- [x] Current blocker is `none`.
- [x] Header Status is `closed`.

**Final outcome:** Accepted by the User on 2026-11-18. Jarvis finds and connects to the Agent Host in a Codespace (fallback user data folder, `standalone` hosts, `tcp` endpoints), `folderKey` normalises the drive letter on every platform, and the full suite passes on Linux (709 of 709). Squash `9925bd6` on `development`; the feature branch is retained. Not released. Open for the release validation: the Windows and Mac check that the connection is unchanged. Follow-ups: reply direction, opening an actor chat in the Codespace, Tunnels, Agents window.
