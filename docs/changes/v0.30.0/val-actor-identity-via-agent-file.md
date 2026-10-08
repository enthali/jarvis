# Validation Report: Actor Identity via Own Agent File

**Date**: 2026-10-08

**Change Document**: [actor-identity-via-agent-file.md](actor-identity-via-agent-file.md)

**Branch / verification baseline**: `feature/actor-identity-via-agent-file` / `a24b8106` (first pass: `6d229faa`; second: `1622caf4`; third: `fe19edde`; fourth: `4a7a527d`; fifth: `c343773c`; integration: `a24b8106`, merge commit `5be25935`)
**Approved spec baseline**: `69e2329b` (Test Protocol: `dee558c9`)
**Implementation commits**: `6c84f096` (core), `7261dcca` (kanban), `c54de45d` (syspilot), `6d229faa` (tests); gap closure `6e9c0668` (code), `1622caf4` (tests)
**Status**: PASSED (first pass PARTIAL; re-verified five times, latest 2026-10-08 on the integration merge `a24b8106`)

## Summary

The implementation matches the approved specifications. No code deviation from a specification was found, and both points CM asked about are confirmed (below). The first pass at `6d229faa` was PARTIAL because the automated evidence had gaps (Issues 1 to 3, all test-only). Dev closed them in `6e9c0668` and `1622caf4`; the re-verification below confirms each one, so the verdict is now PASSED and the verified `approved` elements were set to `implemented`.

User UAT and the manual Extension Development Host scenarios are NOT RUN, with no verdict. The 3 s wait for VS Code to register a new agent's mode command remains an OPEN assumption; `SPEC_ACTOR_WHOAMI` is marked `implemented` for the code it specifies, not for that assumption.

**Re-verification (2026-10-08, `1622caf4`).** Two code lines changed since the first pass, and both were read: the `duplicateAgent` warning key is now `duplicateAgent:<name>:<file list>` ([actorAgent.ts](../../packages/core/src/engine/actors/actorAgent.ts#L114)), which closes Issue 4 and matches `SPEC_ACTOR_WHOAMI` AC-6 ("per file and reason"); `DEFAULT_INIT_PROMPT` is exported ([injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L45)), additive. Each Issue was checked against the new tests (see Issues Found).

| Category | Total | Verified | Issues |
| -------- | ----- | -------- | ------ |
| `approved` SPEC elements compared with code (see Requirements Coverage) | 18 | 18 | 0 |
| `draft` SPEC elements compared with code (status left to PM) | 8 | 8 | 0 |
| Class (a) artefact groups in the Removal Check | 3 | 3 | 0 |
| Engineering gates (tests, builds, source lint, strict Sphinx) | 4 | 4 | 0 |
| Test-evidence issues | 5 | 5 closed | 0 open |
| Other Low issues (code, fixture text) | 2 | 2 closed | 0 open |

The two `approved` UAT design specs (`SPEC_UAT_KAN_SKILL`, `SPEC_UAT_KAN_MGMT`) describe manual scenarios that were not run; they are outside this table.

## Points CM asked to confirm

### 1. `ActorEntry.agent` removed; `agent` kept on the public projection

**Matches the specification; not a deviation.** The two statements are about two different types:

- `ActorEntry` (internal scanner entry) has no `agent`: [actorScanner.ts](../../packages/core/src/engine/actors/actorScanner.ts#L9) (fields `id`, `name`, `summary`, `folder`); the legacy key is not read in `readActor()`. This is `SPEC_ACTOR_SCANNER` AC-9 ([spec_actor.rst](../design/spec_actor.rst#L172)).
- `JarvisActor` (public projection) keeps `agent`, always equal to `name`: [coreApi.ts](../../packages/core/src/engine/core/coreApi.ts#L64) and [actorRuntime.ts](../../packages/core/src/engine/actors/actorRuntime.ts#L28) project `agent: a.name`. The type documents it in [types.ts](../../packages/core/src/engine/core/types.ts#L45). `SPEC_ACTOR_LISTTOOL` ([spec_actor.rst](../design/spec_actor.rst#L959)) and `SPEC_ENG_ACTORLIST`/`SPEC_ENG_API` (`agent: string; // the Actor's own agent, equal to name`, AC-1: exactly five fields) specify exactly this projection.
- Consumers that used `ActorEntry.agent` now use the Actor name: [actorTreeProvider.ts](../../packages/core/src/engine/actors/actorTreeProvider.ts#L68) and [actorTreeProvider.ts](../../packages/core/src/engine/actors/actorTreeProvider.ts#L92) call `resolveAgentFile(actor.name)`; `injectPrompt` uses the `ensureActorAgent` result. No other package reads `.agent` (searched `packages/{kanban,syspilot,pim,flow,recorder,mcp,suite,core-gh}/src`).

### 2. `DEFAULT_INIT_PROMPT` and its `package.json` default

**Confirmed.** Both read `You are the Actor "${name}".` followed by the unchanged memory paragraphs, word for word as in `SPEC_ACTOR_INITPROMPT` ([spec_actor.rst](../design/spec_actor.rst#L1198)): [injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L45) and [package.json](../../packages/core/package.json#L230). The previous `package.json` default still contained `${kind}`, which the specification does not substitute (AC-1); that is now gone. No `${kind}` or "agent session for the" text remains in `packages/` or `src/`. Comparison was by reading both texts side by side; no test pins the manifest default to the constant (Low issue 6).

### 3. `REQ_HOOK_INTAKE` AC-9 needed no code change

**Confirmed.** `packages/core/src/engine/hooks/` is unchanged since the approved spec baseline (empty `git diff --stat`). [hookIntake.ts](../../packages/core/src/engine/hooks/hookIntake.ts#L35) still calls `hookEngine.receive(event)` before `res.end()`, but no comment, test or consumer asserts that order. The specification says the implementation "need not keep that order" (`SPEC_HOOK_INTAKE` AC-6), so keeping it is permitted. The only consumer that needed it, the `PreToolUse` correlation buffer in `extension.ts`, is removed.

## Requirements Coverage

| Requirement / contract | Design | Implementation evidence | Result |
| ---------------------- | ------ | ----------------------- | ------ |
| REQ_ACTOR_WHOAMI AC-1..AC-9 | SPEC_ACTOR_WHOAMI | [actorAgent.ts](../../packages/core/src/engine/actors/actorAgent.ts#L103) `_ensureActorAgent`: identity lookup through `discoverAgentModes()` (L108-L110), duplicate guard (L112), restore path (L123), `<name>.agent.md` mismatch guard and create (L139-L157), per-name serialization (L26, L90), warn-once set (L29, L143) | PASS |
| REQ_ACTOR_WHOAMI AC-4: exactly three callers, one routine | SPEC_ACTOR_WHOAMI AC-1/AC-4 | Callers: [injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L163), [extension.ts](../../packages/core/src/extension.ts#L1087), [actorRuntime.ts](../../packages/core/src/engine/actors/actorRuntime.ts#L81); no call at activation or in a rescan | PASS |
| REQ_ACTOR_WHOAMI AC-5 | SPEC_ACTOR_WHOAMI AC-5 | `injectPrompt` throws on `unknown`/`ambiguous` before step 1b; creation paths call after `existingActorFolder` returned nothing | PASS |
| REQ_ACTOR_WHOAMI AC-10, AC-11 | SPEC_ACTOR_WHOAMI AC-8 | Tool registration, `languageModelTools` entry, correlation buffer and `whoAmITool` disposal removed ([extension.ts](../../packages/core/src/extension.ts#L993)); kernel asset's identity section rewritten, no mention of the tool | PASS |
| REQ_ACTOR_SCHEMA AC-2/AC-7; REQ_ACTOR_TREE AC-3 | SPEC_ACTOR_SCANNER AC-9; SPEC_ACTOR_SCHEMA AC-1 | `ActorEntry` has no `agent`; both schema copies describe `agent` as deprecated and ignored ([actor.schema.json](../../packages/core/schemas/actor.schema.json#L17), [actor.schema.json](../../schemas/actor.schema.json#L17)); the scanner test pins it | PASS |
| REQ_ACTOR_CREATE AC-5/AC-6; REQ_ACTOR_CREATETOOL AC-1/AC-2/AC-6 | SPEC_ACTOR_CREATE; SPEC_ACTOR_CREATETOOL | `writeActorFiles` writes only `name` and `summary` ([actorCreation.ts](../../packages/core/src/engine/actors/actorCreation.ts#L42)); picker and `writeActorAgent` removed; the tool schema has no `agent` property ([package.json](../../packages/core/package.json#L296)); a passed `agent` is destructured away ([actorRuntime.ts](../../packages/core/src/engine/actors/actorRuntime.ts#L56)) | PASS |
| REQ_ACTOR_LISTTOOL AC-2; REQ_ENG_ACTORLIST AC-4 | SPEC_ACTOR_LISTTOOL; SPEC_ENG_ACTORLIST; SPEC_ENG_API | See point 1 | PASS |
| REQ_ACTOR_AGENT_DISCOVERY; REQ_ACTOR_FILES_TREE AC-4 | SPEC_ACTOR_AGENT_DISCOVERY AC-4; SPEC_ACTOR_FILES | `pickAgentMode` removed from `extension.ts`; "Agent" category found by Actor name | PASS |
| REQ_ACTOR_INITPROMPT AC-6; REQ_INJ_PRIMITIVE AC-2/AC-4; REQ_ACTOR_BINDING AC-3 | SPEC_ACTOR_INITPROMPT; SPEC_INJ_INJECT step 1b/3a/3b; SPEC_MSG_OPENCHAT | Mode set only when `agentResult.status === 'ready'`, in both the existing-session ([injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L181)) and the new-session branch ([injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L188)); `reapplyAgentMode` still skips with a logged warning when the command is not registered ([extension.ts](../../packages/core/src/extension.ts#L281)) | PASS |
| REQ_HOOK_INTAKE AC-9 retired | SPEC_HOOK_INTAKE AC-6 | See point 3 | PASS |
| REQ_KAN_CREATE/VERIFY/OPEN/UPDATE/ADD/DELETE/LIST/FIELDS: `ownerName` required | SPEC_KAN_CREATE AC-5 and the seven pointing specs | [resolveOwner](../../packages/kanban/src/extension.ts#L59) returns `{ error: "ownerName required" }` for a missing value and `{ error: "actor unknown" }` for an unknown or ambiguous name; all eight tool handlers call it; all eight `inputSchema` entries list `ownerName` as required ([package.json](../../packages/kanban/package.json)) | PASS |
| REQ_KAN_SKILLCONTENT AC-4; REQ_UAT_KAN_SKILL AC-5 | SPEC_KAN_SKILLCONTENT; SPEC_UAT_KAN_SKILL | [SKILL.md](../../packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md#L19) "Owner Resolution": `ownerName` always supplied, no mention of the removed tool | PASS |
| REQ_SPL_ACTOR AC-2; REQ_SPL_NOTIFY AC-5 | SPEC_SPL_ACTOR AC-1; SPEC_SPL_NOTIFY | [versionCheck.ts](../../packages/syspilot/src/versionCheck.ts#L12) summary names `.github/agents/syspilot.setup.agent.md`; creation input has no `agent`; the notification starts with the persona sentence ([versionCheck.ts](../../packages/syspilot/src/versionCheck.ts#L79)), text identical to the specification template | PASS |
| SPEC_DEV_DISPOSAL | REQ_DEV_DISPOSAL | `whoAmITool` removed from the disposable list | PASS |

### Notes on `ensureActorAgent` (SPEC_ACTOR_WHOAMI)

- Two lines are restored by `restoreLines()` ([actorAgent.ts](../../packages/core/src/engine/actors/actorAgent.ts#L55)): the file's line ending is detected and kept, line 1 and line 2 are replaced when they carry the fixed prefixes and inserted otherwise, and the file is written only when the result differs. This matches AC-3 (verified by reading; CRLF behaviour is not covered by a test, Low issue 5).
- Warning texts match the specification character for character.
- A given warning is shown once per window session. `nameMismatch` is keyed by file path as specified; `duplicateAgent` is keyed by Actor name rather than by file list (Low issue 4).

## Class (a) Artefakt-Removal-Check

| Removed artefact | Result at `6d229faa` |
| ---------------- | -------------------- |
| `jarvis_whoAmI` (tool, handler, buffer, manifest entries, Kanban fallback, kernel asset, Kanban skill) | No match for `jarvis_whoAmI`, `whoAmI`, `takeCallingSessionId`, `pickAgentMode`, `writeActorAgent` in tracked `packages/`, `src/`, `schemas/`, `scripts/`, `resources/` or `.github/` code and manifests; the only other hit is the fixture text in Issue 7. `getEntityNameForSessionId` stays by design: `activityTracker.ts` and `touchTracker.ts` still use it. The gitignored provisioned copies of the Kanban skill are already current; the gitignored kernel instructions copy is stale before and after this change (out of scope per CM). |
| `agent` field and picker (`ActorEntry.agent`, `writeActorAgent`, `pickAgentMode`, `agent` tool input) | Removed; schema property kept as deprecated. See point 1. |
| `REQ_HOOK_INTAKE` AC-9 ordering | See point 3. |

Class (b), open for the Documentation Engineer: [README.md](../../README.md#L30) lists `#whoAmI` among the LM tools; [packages/core/README.md](../../packages/core/README.md#L30) says `jarvis_listActors` and `jarvis_whoAmI` return `id`. The remaining mentions under `docs/` (specifications, requirements, stories and Test designs) are deliberate statements about the removed tool. One class (a) leftover of no functional effect: the fixture summary in [actor.yaml](../../testdata/.jarvis/actors/Shared%20Name/actor.yaml#L2) reads "multi-match whoAmI test" (Low issue 7).

## MECE and Traceability

- **MECE: PASS.** `ensureActorAgent` is the single writer and has three callers; `SPEC_ACTOR_SCANNER` AC-9 (internal entry) and `SPEC_ACTOR_LISTTOOL`/`SPEC_ENG_ACTORLIST` (public projection) are disjoint statements about two types. `SPEC_INJ_INJECT`, `SPEC_ACTOR_INITPROMPT` and `SPEC_MSG_OPENCHAT` use the same `ready`/`skipped` model without a competing rule. No contradiction found between requirement, design and implementation.
- **Traceability: PASS.** Strict Sphinx on an export of committed `HEAD` docs built with zero warnings (see Engineering Checks). The needs graph shows every affected `SPEC_*` linked to its `REQ_*`, `SPEC_ACTOR_WHOAMI` linked to `REQ_ACTOR_WHOAMI`/`REQ_ACTOR_BINDING`, and all Kanban specs linked to `SPEC_ACTOR_WHOAMI`. The 17 elements that were `draft` before this change (including `SPEC_INJ_INJECT`, `SPEC_MSG_OPENCHAT`, `SPEC_SPL_ACTOR`, `SPEC_SPL_NOTIFY`, `SPEC_KAN_CREATE/VERIFY/OPEN/UPDATE`) stay `draft` by the PM decision of 2026-10-04.

## Test Protocol

**File**: [tst-actor-identity-via-agent-file.md](tst-actor-identity-via-agent-file.md)
**Result**: NOT RUN (T-1..T-8, T-10 and Kanban T-11 are manual User scenarios; no verdict)

| # | Story / AC | Description | Result |
| - | ---------- | ----------- | ------ |
| T-1..T-8, T-10 | US_ACTOR_WHOAMI, US_ACTOR_ACTORS, US_ACTOR_CREATE, US_ACTOR_CREATETOOL, US_ACTOR_LISTTOOL, US_ACTOR_FILES_TREE | Manual scenarios in an Extension Development Host; none executed | NOT RUN |
| Kanban T-11 | US_KAN_SKILL AC-4; US_UAT_KAN_SKILL AC-11 | Covered by the existing Kanban skill test design; not run here | NOT RUN |

`US_KAN_TOOLS` has no User scenario in this change: the former T-9 was removed by user decision (see the last re-verification below). The open 3 s assumption stays open. The engineering checks do not establish any User verdict.

## Engineering Checks

Run independently on `6d229faa` (first pass) and again on `1622caf4` (re-verification). In the first pass the worktree held two stale editor copies (`spec_msg.rst`, `spec_uat_kanban_mgmt.rst`); specifications were then read from `HEAD` and Sphinx ran on an export of committed `HEAD` docs. For the re-verification the worktree was clean (PM had restored both files), so Sphinx ran in place.

| Check | Result `6d229faa` | Result `1622caf4` | Evidence |
| ----- | ----------------- | ----------------- | -------- |
| `npm test -- --reporter=dot` | PASS | PASS | 44 files / 344 tests, then 47 files / 371 tests (equals Dev's count) |
| TypeScript compile of core, PIM, recorder, MCP, Flow, Kanban, Syspilot; Flow/Kanban bundles | PASS | PASS | All seven compiles and both bundle sequences completed |
| `npm run lint -- --ignore-pattern 'packages/kanban/out/**'` | PASS | PASS | 0 errors; 173, then 176 warnings. Dev reported 152; I measured 176 with the same command, a difference I did not trace |
| `npm run lint` | FAIL, known and accepted earlier | FAIL, same | 3 errors, all missing rules in generated `packages/kanban/out/extension.js`; 173, then 179 problems in total |
| `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` | PASS | PASS | Build succeeded, no warnings; re-run after the 33 status edits is recorded in the Status Update section |

## Issues Found

### Issue 1: Valid test coverage deleted with the obsolete picker test
- **Severity**: Medium
- **Category**: Test
- **Description**: [newactor-creation-flow.test.ts](../../src/tests/newactor-creation-flow.test.ts) (deleted in `6d229faa`) held three assertions. Only the third (`writeActorAgent` after `pickAgentMode`) became obsolete. The other two still describe live behaviour: `jarvis.newActor` uses the entered name verbatim (`SPEC_ACTOR_CREATE`, `REQ_ACTOR_SCHEMA` AC-6) and checks `existingActorFolder` before any write (`SPEC_ACTOR_CREATE` AC-3). They were added for QM Round 1 finding 8 of the previous change.
- **Expected**: The two assertions survive, retargeted to the new handler.
- **Actual**: No test references them. The code is correct: [extension.ts](../../packages/core/src/extension.ts#L1076) has `const name = nameInput;` and [extension.ts](../../packages/core/src/extension.ts#L1079) calls `existingActorFolder` before `writeActorFiles`.
- **Recommendation**: Restore those two assertions and replace the third with "calls `ensureActorAgent` after `writeActorFiles` and shows no picker".
- **Resolution (CLOSED, `1622caf4`)**: [newactor-creation-flow.test.ts](../../src/tests/newactor-creation-flow.test.ts) is back with the verbatim-name and `existingActorFolder` assertions, plus "`ensureActorAgent(` after `writeActorFiles(`, no `pickAgentMode`, no `writeActorAgent(`". Source-assertion tests, the same pattern as before; they pin the handler text, not its runtime behaviour.

### Issue 2: No test for required `ownerName` in the Kanban tools
- **Severity**: Medium
- **Category**: Test
- **Description**: `REQ_KAN_CREATE` AC-3 and `SPEC_KAN_CREATE` AC-5 (missing or empty `ownerName` returns `{ error: "ownerName required" }`; schema marks it required) are new behaviour and no test mentions `ownerName required`. The existing [kanban-owner-ambiguity.test.ts](../../src/tests/kanban-owner-ambiguity.test.ts) covers only `resolveOwnerByName`.
- **Recommendation**: Source-level or handler-level test in the style of that file: `resolveOwner` returns the error for a missing value, all eight `inputSchema` entries list `ownerName` as required, and no handler references the removed tool.
- **Resolution (CLOSED, `1622caf4`)**: [kanban-ownername-required.test.ts](../../src/tests/kanban-ownername-required.test.ts) asserts that the real `resolveOwner` source returns `'ownerName required'`, has no tool-fallback, and that all eight tool names list `ownerName` in `required` (exactly eight Kanban tools). Its behavioural check (missing, empty, unknown, resolvable name) runs on a copy of the logic, as in `kanban-owner-ambiguity.test.ts`, so the source assertion is what ties it to the real function.

### Issue 3: No test for the `injectPrompt` agent-check wiring
- **Severity**: Medium
- **Category**: Test
- **Description**: `SPEC_INJ_INJECT` step 1b and `REQ_ACTOR_INITPROMPT` AC-6 are the central new behaviour: the check runs after name resolution and before the session lookup, `ready` sets the mode (both branches), `skipped` sets none. The changed `injectPrompt.ts` has no test of this. Existing `injectPrompt` tests are source assertions that do not mention it.
- **Recommendation**: A source-order assertion at least, or a behavioural test with a stubbed `ensureActorAgent` returning `ready` and `skipped`.
- **Resolution (CLOSED, `1622caf4`)**: [injectprompt-ensureactoragent-wiring.test.ts](../../src/tests/injectprompt-ensureactoragent-wiring.test.ts) calls the real `injectPrompt` with a stubbed `ensureActorAgent` and a real `ActorScanner`: the call happens with the resolved Actor name before `lookupSessionUUID`; in the existing-session branch `ready` calls `reapplyAgentMode('Test Actor', 'Test Actor')` and `skipped` does not; in the new-session branch `ready` executes `workbench.action.chat.open` with `{ mode }` and `skipped` does not.

### Issue 4: Duplicate-agent warning keyed by Actor name
- **Severity**: Low
- **Category**: Code
- **Description**: `SPEC_ACTOR_WHOAMI` shows a warning "for a given file and reason" once per window session. The `nameMismatch` key includes the file path; the `duplicateAgent` key ([actorAgent.ts](../../packages/core/src/engine/actors/actorAgent.ts#L114)) is `duplicateAgent:<Actor name>`, so a different pair of duplicate files for the same Actor later in the session is not announced.
- **Recommendation**: Include the file list in the key, or state the Actor-name key in the specification. Either is acceptable.
- **Resolution (CLOSED, `6e9c0668`)**: Key is now `duplicateAgent:<name>:<files>`. No test varies the file list; the once-per-session behaviour is covered by the `nameMismatch` test (Issue 5).

### Issue 5: Untested specification branches in `ensureActorAgent`
- **Severity**: Low
- **Category**: Test
- **Description**: Not covered by [actorAgent.test.ts](../../src/tests/actorAgent.test.ts): line-ending preservation for CRLF files (AC-3), a file without front matter, the once-per-session warning (the tests call each warning case once), leaving every file unchanged in the mismatch case, and `REQ_ACTOR_WHOAMI` AC-10/AC-11 (tool absent from the manifest; kernel asset text).
- **Recommendation**: Add as small cases to the same file.
- **Resolution (CLOSED, `1622caf4`)**: [actorAgent.test.ts](../../src/tests/actorAgent.test.ts) now covers mismatch leaves the file byte-identical, one warning for two calls, CRLF preserved (every `\n` preceded by `\r`), a file without front matter (lines inserted at the start), absence of the tool from `languageModelTools`, and the kernel asset (no mention of the tool, contains "your own agent file").

### Issue 6: Manifest default not pinned to `DEFAULT_INIT_PROMPT`
- **Severity**: Low
- **Category**: Test
- **Description**: The `${kind}` text in the manifest default survived the earlier change unnoticed. Nothing prevents the two texts diverging again.
- **Recommendation**: One assertion that `package.json` default equals the constant's text.
- **Resolution (CLOSED, `6e9c0668`, `1622caf4`)**: `DEFAULT_INIT_PROMPT` is exported and TC-6 in [initprompt-extract-overflow.test.ts](../../src/tests/initprompt-extract-overflow.test.ts) asserts the manifest default equals it.

### Issue 7: Fixture summary mentions the removed tool
- **Severity**: Low
- **Category**: Code (fixture text)
- **Description**: [actor.yaml](../../testdata/.jarvis/actors/Shared%20Name/actor.yaml#L2) says "Actor fixture for multi-match whoAmI test". No effect on behaviour.
- **Resolution (CLOSED, `1622caf4`)**: The summary now reads "Actor fixture for multi-match ambiguous-name test".

### Observations outside this change (no action requested here)
- `SPEC_ACTOR_FILES` describes the agent child's label as `Agent File: <basename>`; the tree provider uses the bare basename. This text predates this change (commit `1a303267`).
- In a multi-root workspace, `discoverAgentModes()` returns paths relative to each folder, while `ensureActorAgent` and `resolveAgentFile` join them to the first folder. Both follow the specification's "first workspace folder" rule, which does not mention multi-root; an agent found only in a second folder would end in `writeFailed`.
- The 3 s mode-command wait is unverified (OPEN assumption, recorded in the Change Document).

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
| ----------- | ------ | -------------- | ---- | -------- |
| REQ_ACTOR_WHOAMI | SPEC_ACTOR_WHOAMI | `actorAgent.ts`, three callers, `extension.ts`, kernel asset | `actorAgent.test.ts` (ready, skipped x3, restore, idempotence, serialization, CRLF, no front matter, warn-once, mismatch unchanged, AC-10/11) | Yes |
| REQ_ACTOR_SCHEMA AC-2/AC-7 | SPEC_ACTOR_SCANNER AC-9; SPEC_ACTOR_SCHEMA | `actorScanner.ts`; schema copies | `actorScanner.test.ts` (legacy key ignored) | Yes |
| REQ_ACTOR_CREATE; REQ_ACTOR_CREATETOOL | SPEC_ACTOR_CREATE; SPEC_ACTOR_CREATETOOL | `actorCreation.ts`, `actorRuntime.ts`, `extension.ts` | `actorCreation.test.ts`, `actorRuntime.test.ts` (ignored `agent` input), `newactor-creation-flow.test.ts` (verbatim name, pre-write check, `ensureActorAgent` after write) | Yes |
| REQ_ACTOR_LISTTOOL; REQ_ENG_ACTORLIST | SPEC_ACTOR_LISTTOOL; SPEC_ENG_ACTORLIST; SPEC_ENG_API | `actorRuntime.ts`, `coreApi.ts`, `types.ts` | `actorRuntime.test.ts`, `coreApi.test.ts` (`agent` equals `name`) | Yes |
| REQ_ACTOR_FILES_TREE; REQ_ACTOR_AGENT_DISCOVERY | SPEC_ACTOR_FILES; SPEC_ACTOR_AGENT_DISCOVERY | `actorTreeProvider.ts`, `actorFiles.ts` | `agentdiscovery-refresh.test.ts` | Yes |
| REQ_ACTOR_INITPROMPT; REQ_INJ_PRIMITIVE; REQ_ACTOR_BINDING | SPEC_ACTOR_INITPROMPT; SPEC_INJ_INJECT; SPEC_MSG_OPENCHAT | `injectPrompt.ts`, package default | `injectprompt-ensureactoragent-wiring.test.ts`; constant, fallback and manifest-default pin in `initprompt-extract-overflow.test.ts` | Yes |
| REQ_HOOK_INTAKE (AC-9 retired) | SPEC_HOOK_INTAKE | Hook code unchanged; buffer removed | Old whoAmI test deleted with its subject | Yes |
| REQ_KAN_* (eight tools); REQ_KAN_SKILLCONTENT | SPEC_KAN_* ; SPEC_KAN_SKILLCONTENT | `kanban/src/extension.ts`, `kanban/package.json`, skill asset | `kanban-ownername-required.test.ts` (source assertion, replicated logic, eight `required` entries) | Yes |
| REQ_SPL_ACTOR; REQ_SPL_NOTIFY | SPEC_SPL_ACTOR; SPEC_SPL_NOTIFY | `versionCheck.ts` | `syspilot-versioncheck.test.ts` (notification text); creation input untested | Yes (draft elements) |
| REQ_UAT / Test Protocol scenarios | SPEC_UAT_ACTOR_IDENTITY | n/a | Manual, NOT RUN | Open by decision |

## Status Update

Set `:status: implemented` (previously `approved`) on 33 elements whose amended acceptance criteria were verified against the code above; the diff is exactly 33 one-line status changes. Strict Sphinx passed after the edit.

- Requirements (15): `REQ_ACTOR_WHOAMI`, `REQ_ACTOR_SCHEMA`, `REQ_ACTOR_BINDING`, `REQ_ACTOR_CREATE`, `REQ_ACTOR_CREATETOOL`, `REQ_ACTOR_LISTTOOL`, `REQ_ACTOR_AGENT_DISCOVERY`, `REQ_ACTOR_INITPROMPT`, `REQ_ACTOR_FILES_TREE`, `REQ_ENG_ACTORLIST`, `REQ_KAN_ADD`, `REQ_KAN_DELETE`, `REQ_KAN_LIST`, `REQ_KAN_FIELDS`, `REQ_KAN_SKILLCONTENT`.
- Designs (18): `SPEC_ACTOR_WHOAMI`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_SCHEMA`, `SPEC_ACTOR_CREATE`, `SPEC_ACTOR_CREATETOOL`, `SPEC_ACTOR_LISTTOOL`, `SPEC_ACTOR_FILES`, `SPEC_ACTOR_AGENT_DISCOVERY`, `SPEC_ACTOR_INITPROMPT`, `SPEC_HOOK_INTAKE`, `SPEC_ENG_API`, `SPEC_ENG_ACTORLIST`, `SPEC_DEV_DISPOSAL`, `SPEC_KAN_ADD`, `SPEC_KAN_DELETE`, `SPEC_KAN_LIST`, `SPEC_KAN_FIELDS`, `SPEC_KAN_SKILLCONTENT`.

Not changed: elements that were `draft` before this change (PM decision of 2026-10-04: `SPEC_INJ_INJECT`, `SPEC_MSG_OPENCHAT`, `SPEC_SPL_ACTOR`, `SPEC_SPL_NOTIFY`, `SPEC_KAN_CREATE/VERIFY/OPEN/UPDATE`, `REQ_INJ_PRIMITIVE`, `REQ_HOOK_INTAKE`, `REQ_KAN_CREATE/VERIFY/OPEN/UPDATE`, `REQ_SPL_ACTOR`, `REQ_SPL_NOTIFY`, `US_KAN_TOOLS`); user stories; and the UAT elements, whose scenarios were not run. `SPEC_ACTOR_WHOAMI` and `SPEC_ACTOR_INITPROMPT` are `implemented` for their code; the 3 s registration wait they mention stays an open assumption.

## Re-verification after QM Round 1 (`fe19edde`)

Scope: the three fix-now items PM disposed after QM Round 1 (CD `dfe8850b`), in `01eea212` (Dev, code comment) and `fe19edde` (System Designer, CD and wording). Working tree clean at start; at the end only `.jarvis/actors/Project Manager/context.md` showed as modified, which belongs to the PM actor and was not touched. Documentation was checked and built from a `git archive HEAD` export; compile, tests and lint ran in the working tree, which was clean and therefore equal to `HEAD` (no `npm ci` on the export).

| Check | Result | Evidence |
| ----- | ------ | -------- |
| 33 `implemented` statuses still in place | PASS | Read from the `HEAD` export: all 33 elements listed under Status Update are `implemented`, each found exactly once. The `fe19edde` diff of requirement and story files contains no status line. |
| CD lists the 21 UAT elements as new | PASS | [CD](actor-identity-via-agent-file.md) lists 7 stories, 7 requirements and 7 designs added by the Test Designer in `ae9c5190`, adds them to the traceability table, and states all 21 are `draft`. At `HEAD` each of the three UAT files holds 7 elements, all `draft`. |
| CD status statement truthful | PASS | It says 47 amended elements were approved again, 33 of them `implemented` by `28f54275`, the 21 UAT elements `draft`, and the 17 pre-existing drafts `draft`. 47 minus 33 leaves 14 `approved`, which the text implies but does not number. |
| Class (a)/(b) checkboxes in the CD | PASS | Class (a) matches this report (clean in tracked code; provisioned kernel copy stale and untracked). Class (b): `git grep whoAmI` over the three package READMEs and the root README finds nothing at `HEAD`; the core README now says each Actor's own agent file carries its identity and the Kanban README lists no optional `ownerName`. |
| `US_ACTOR_ACTORS` AC-5 wording | PASS, no contract change | The rule that an Actor is discovered only as a direct child folder of `jarvis.actors.folder` is unchanged. Removed: a negative sentence about kind registration, kind-driven scanner and multi-tree-root infrastructure, none of which exists after the earlier retirement change. Changed: "identity recovery" is replaced by "the Actor's identity (`US_ACTOR_WHOAMI`)" using the same discovery. That is what the code does: `injectPrompt` resolves the name through the scanner before `ensureActorAgent` runs ([injectPrompt.ts](../../packages/core/src/engine/sessions/injectPrompt.ts#L163)). |
| "kindless" removed | PASS, no contract change | The word is gone from `REQ_ACTOR_SCHEMA` AC-7, `REQ_ACTOR_ACTIVATION` AC-3 and `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-3 (no hit in `docs/design`, `docs/requirements`, `docs/userstories` or code at `HEAD`). In each case only the qualifier or the "not from kind registration" clause was dropped; the source of Actors (direct-child discovery) and the destination rule (the unified resolver includes this source, no parallel enumeration) are unchanged. |
| Code comment in `extension.ts` | PASS | The `reapplyAgentMode` doc comment now says the mode name equals the Actor name (`SPEC_ACTOR_WHOAMI`) and that `ActorEntry` has no `agent` field. The diff touches only comment lines. |
| `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` on the `HEAD` export | PASS | Build succeeded, no warnings |
| `tsc -p` for the seven packages | PASS | All exit 0 |
| `npm test -- --reporter=dot` | PASS | 47 files / 371 tests |
| `npm run lint -- --ignore-pattern 'packages/kanban/out/**'` | PASS | 0 errors, 176 warnings (same as before) |

No issue found in this pass. QM's four Low findings are disposed by PM and need nothing from Verify: finding 2 (persona wording, accepted), finding 3 (multi-root path, deferred as PM backlog #45; it matches the multi-root observation above), findings 1, 4a and 4b are the items re-verified here. The unfiltered lint error count differs by environment: QM measured 0 errors from an archive (generated `packages/kanban/out/` is untracked), while the working tree shows the same three errors in that generated folder; I did not re-run the unfiltered lint in this pass.

## Re-verification after the kernel identity section was removed (`4a7a527d`)

Scope: the user decision of 2026-10-08 (recorded in the CD under QM Findings > User Validation, PM backlog #46) to remove `## 0. Identity` from the delivered kernel instructions. System Designer reworded `SPEC_ACTOR_WHOAMI` in `b64a39c2` (no identity section, sections 1 to 4 keep their numbers, new AC-10) and set it from `implemented` back to `approved`; Dev removed the section in `4a7a527d` and changed `actorAgent.test.ts`. Documentation, builds, tests, lint and Sphinx ran on a `git archive` export of `HEAD` with its own `npm ci`. `HEAD` moved twice while I worked (`45447bd5`, `8c989d06`, a PM memory commit and a testdata fixture commit); neither touches the verified files.

Working tree: at the start `docs/design/spec_actor.rst` was a stale editor copy (its blob hash `a38b2f5d` equals the committed version at `28f54275`, last written 21:55:08) and two `testdata` files were modified. I did not restore or stage any of them; by the time I edited the status, `spec_actor.rst` equalled `HEAD` again (hash `20edbe43`, written 21:55:33, by someone else). `testdata/.vscode/settings.json` stays modified and is not part of my commit.

| Check | Result | Evidence |
| ----- | ------ | -------- |
| (1) Asset has no `## 0.`; `## 1.` to `## 4.` intact; no leftover reference | PASS | [kernel asset](../../packages/core/assets/instructions/jarvis-actor.kernel.instructions.md) headings at `HEAD`: `# The Jarvis Actor Kernel`, `## 1. Local Memory`, `## 2. Messaging` (with `### End your turn with a clean tree`), `## 3. Escalation`, `## 4. Culture`. The diff since `7d21ac55` removes exactly the five lines of the old section and nothing else. No `Identity`, `section 0` or `jarvis_whoAmI` text in the asset, and no code, test or manifest refers to the removed section; the only `docs/` mentions are the deliberate statements in `SPEC_ACTOR_WHOAMI`. |
| (2) Assertions match the specifications | PASS | `SPEC_ACTOR_WHOAMI` AC-8 ("the kernel instructions asset does not mention [`jarvis_whoAmI`]") is asserted by [actorAgent.test.ts](../../src/tests/actorAgent.test.ts#L220); AC-10 (no identity section, `## 1.` to `## 4.` keep their numbers) by the new test at [actorAgent.test.ts](../../src/tests/actorAgent.test.ts#L227) (no `## 0.`, no `Identity`, the four headings present). `REQ_ACTOR_WHOAMI` AC-11 (the kernel SHALL NOT tell an Actor to call the tool) holds because the asset no longer mentions it. The removed "points to the agent file" assertion belonged to the retired wording and is correctly gone. |
| (3) `SPEC_ACTOR_WHOAMI` back to `implemented` | DONE | One-line status change in [spec_actor.rst](../design/spec_actor.rst#L981). Its text now matches the asset and the code. |
| (4) The other 32 statuses | PASS | In the `HEAD` export: 32 of the 33 elements listed under Status Update are `implemented`, each found once; the 33rd was `SPEC_ACTOR_WHOAMI` (`approved`) and is now `implemented` again. No other status line changed. |
| `tsc -p` for the seven packages (export) | PASS | All exit 0 |
| `vitest run` (export) | PASS | 47 files / 372 tests (Dev's count) |
| `npm run lint` (export, unfiltered) | PASS | 0 errors, 176 warnings; the generated Kanban output is not in an export |
| `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` (export) | PASS | Build succeeded, no warnings; run before my status edit and again on the export of my commit |

Two observations, neither blocking:
- `SPEC_ACTOR_WHOAMI` AC-10 is a design-level rule that is stricter than `REQ_ACTOR_WHOAMI` AC-11, which only forbids pointing to the removed tool. A kernel with a differently worded identity section would satisfy the requirement and break the design; that is the System Designer's choice and matches the user decision.
- The removal also drops the rule "if the two agent lines are missing, stop actor-owned writes and escalate". The specification says so explicitly ("The kernel no longer says what an Actor does when the two lines of its agent are missing"), so it is a decided consequence, not a gap. Workspaces whose provisioned kernel copy is stale keep the old text until re-provisioned (the gitignored copy in `.github/instructions/` is not part of any commit).

UAT/EDH scenarios T-1..T-10 are NOT RUN by Verify; the user's partial Extension Development Host run is recorded in the CD and is not a Verify verdict. The 3 s mode-command wait stays OPEN.

## Re-verification after the T-9 scenario was removed (`c343773c`)

Scope: the user decision of 2026-10-08 (CD, QM Findings > User Validation, `b39651e0`) to remove the Kanban owner scenario T-9 from this change, done by the Test Designer in `c343773c`. The reason recorded there: with `jarvis_whoAmI` and the hooks gone, a Kanban tool cannot know which Actor is focused, so a scenario about the focused editor tests something that no longer exists; the useful half (an explicit `ownerName` lands in that Actor's own folder) was already observed in the user's EDH run. No code changed, so no code gates were run. Everything below was read from a `git archive` export of `c343773c`. `HEAD` has since moved to `a5f825f8` (a PM memory commit). Working tree at start and end: only `testdata/.vscode/settings.json` modified (line-ending noise, not mine); `docs/design/spec_uat_kanban_mgmt.rst` was reported dirty by CM, I did not read it from disk, stage or restore it, and it is not in my commit.

| Check | Result | Evidence |
| ----- | ------ | -------- |
| (1) Nothing of the removed chain remains in active text, links or toctrees | PASS | Search of the whole export (excluding PM actor memory under `.jarvis/`): `US_UAT_ACTOR_KAN_OWNER`, `REQ_UAT_ACTOR_KAN_OWNER`, `SPEC_UAT_ACTOR_KAN_OWNER` occur once, in the dated QM Round 1 finding table of the CD, which CM allows. The need parser finds none of the three IDs. T-9 appears in the actor-identity artefacts only in dated or explanatory CD text and in this report; the Test Protocol and the three UAT files no longer mention it. Strict Sphinx reports no unknown link, so no element still links to a removed ID. The three UAT files lost exactly the `T-9` need blocks and the sentence about enabling Kanban for T-9; `spec_uat.rst`, `req_uat.rst` and `us_uat.rst` are unchanged. |
| (2) Counts reproduce | PASS | Parsing every `story`/`req`/`spec` block of the export against the merge-base `d1ee7592`: 18 new (6 stories, 6 requirements, 6 designs, all `draft`) and 63 amended, total 81. The 63 are 45 that were `approved` or `implemented` at the merge-base (31 `approved` to `implemented`, 2 `implemented` unchanged, 12 `approved` unchanged) plus 18 `draft` at the merge-base and still `draft`. That matches the CD's "18 + 45 + 18 = 81". The UAT design has nine scenarios (T-1..T-8 and T-10; T-10 kept its number), and exactly two retained UAT stories use the persona "As an Actor" (`US_UAT_ACTOR_CREATETOOL`, `US_UAT_ACTOR_LISTTOOL`). |
| (3) Test Protocol truthful | PASS | [tst-actor-identity-via-agent-file.md](tst-actor-identity-via-agent-file.md): header "User UAT result: NOT RUN (no User/PM verdict)"; rows T-1..T-8 and T-10 plus Kanban T-11, each `NOT RUN` / pending; the T-9 row is gone; it states the change to `US_KAN_TOOLS` has no User scenario and that the 3 s wait is an open assumption. It says the explicit-owner board creation "was already observed by the User in the EDH", which the CD records (user's later EDH session, 2026-10-08) as an observation without a verdict. It says missing-owner refusal is covered by Engineering verification: [kanban-ownername-required.test.ts](../../src/tests/kanban-ownername-required.test.ts) asserts the error text in the real `resolveOwner` source and the schemas, and exercises the behaviour on a copy of the logic; no test calls the registered tool at runtime. |
| (4) Strict Sphinx and traceability | PASS | `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` on the export: build succeeded, no warnings. The six remaining UAT chains have one story, one requirement and one design each; no dangling link. |
| (4) My `implemented` statuses | PASS | All 33 elements listed under Status Update are `implemented` in the export, each found once, including `SPEC_ACTOR_WHOAMI`. |

Two notes, neither blocking: `US_KAN_TOOLS` is `draft` and now has no User scenario by decision, so its only evidence is engineering evidence (the unit tests above, and the user's EDH observation recorded in the CD). The CD text counts "nine scenarios" for the UAT design; the Test Protocol additionally lists Kanban skill T-11, which belongs to the existing Kanban skill design and is not part of those nine.

UAT/EDH scenarios remain NOT RUN by Verify, with no verdict; the 3 s mode-command wait stays OPEN.

## Integration verification after merging `development` (`5be25935`)

Scope: PM's request, with the user's OK to merge. `development` (merge `2e543531` of `origin/development` `760c8dde`) was merged into the feature branch: 31 commits from the other machine's recorder redesign and the heartbeat agent-model-selection change. PM resolved six conflicts by keeping both sides (PM backlog, PM and Change Manager `context.md`, `README.md`, `.vscode/jarvis.code-workspace`) and set `SPEC_ENG_API` provisionally to `approved` with the other side's links. Nothing is squashed or pushed. Everything below was run or read from a `git archive` export of `a24b8106` with its own `npm ci` (`a24b8106` is `5be25935` plus a Change Manager memory commit); the working tree was clean at start and end. No file was fixed; findings go to the owners.

### Gates

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `tsc -p` core, PIM, recorder, MCP, Flow, Kanban, Syspilot; Flow and Kanban bundles | PASS | No compile failure; both bundle sequences completed |
| `vitest run` | PASS | 53 files / 500 tests (before the merge 47 / 372). The six new files are `actor-mark`, `heartbeat-agent-model`, `recorder-build`, `recorder-components`, `recorder-io`, `recorder-session`. |
| `npm run lint` unfiltered | 3 errors, known | All three are "rule definition not found" in the generated `packages/kanban/out/extension.js`, which exists in the export only because I ran the Kanban bundle build before linting; 182 warnings (176 before the merge). |
| `npm run lint -- --ignore-pattern 'packages/kanban/out/**'` | PASS | 0 errors, 182 warnings |
| `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` | PASS | Build succeeded, no warnings |

### No test of ours was lost

File-by-file comparison of `src/tests` between my last verified line (`ba2b0fd4`) and `HEAD`: no file is missing; the only additions are the six files above. The count of `it()` cases changed in one file, `characterization.test.ts` (3 to 2): the other line removed the "RecordingManager lifecycle shape" test together with `packages/recorder/src/recording.ts`, which its recorder redesign deleted (`development` carries the same deletion, commit `2980be1c`). All of this change's tests pass: `actorAgent`, `injectprompt-ensureactoragent-wiring`, `kanban-ownername-required`, `newactor-creation-flow`, `initprompt-extract-overflow` among them.

### Statuses

Parsed every `story`/`req`/`spec` block of `HEAD`, `development` and `ba2b0fd4`:

- Needs: 595 at `HEAD`, 577 in `development`, 585 on our line. Every `development` need is present at `HEAD`. Nine needs of our line are absent at `HEAD` (`SPEC_REC_SUBPROCESS`, `SPEC_REC_SIDECAR`, `SPEC_REC_WATCHER`, `SPEC_REC_WATCHERJOB`, `REQ_REC_CONFIG`, `REQ_REC_SUBPROCESS`, `REQ_REC_SIDECAR`, `REQ_REC_WATCHERJOB`, `US_REC_CONFIG`); they existed at the merge-base `d1ee7592` and are absent in `development`, so they were removed by the other line's recorder redesign, not by the merge.
- Our 33 `implemented` statuses: 32 are `implemented` at `HEAD`. The 33rd is `SPEC_ENG_API`, `approved` at `HEAD` and in `development`, as PM set it provisionally; System Designer decides it next.
- Statuses that differ from my last verified line are the other machine's: `SPEC_AUT_AGENTEXEC`, `REQ_AUT_JOBEXEC`, `REQ_REC_BUTTON`, `REQ_REC_STATUSBAR`, `US_REC_CAPTURE` (`implemented` to `approved`), `SPEC_MOD_REC_PKG` (`approved` to `implemented`) and `SPEC_ENG_API`. Each equals its status in `development`. The other machine's new elements keep their own statuses (for example `REQ_ENG_ACTORMARK` is `implemented`, `SPEC_ENG_ACTORMARK` is `approved`).
- Text: the only need block that differs from both sides is `SPEC_ENG_API`, the real textual merge. Our wording changes survive: the word "kindless" has no hit in `docs/design`, `docs/requirements`, `docs/userstories`, `packages` or `src`; `US_ACTOR_ACTORS` AC-5 and `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-3 keep the reworded text.

### Semantic read of the files that merged without conflict

| File | Result | Evidence |
| ---- | ------ | -------- |
| `packages/core/src/engine/actors/actorTreeProvider.ts` | No clash | The other line added the icon mark map and `mark()`; our `resolveAgentFile(actor.name)` calls are unchanged. A mark takes precedence over the activity icon, as `SPEC_ACTOR_TREE` and `SPEC_ENG_ACTORMARK` say. |
| `packages/core/src/engine/core/coreApi.ts`, `types.ts` | No clash | Added `markActor`/`setMarker` and the `markActor` member; `version` stays `2` ([coreApi.ts](../../packages/core/src/engine/core/coreApi.ts#L17)). `JarvisActor.agent` (equal to `name`, our change) and `HeartbeatStep.vendor`/`model` (their change, defined in `heartbeat.ts` and re-exported) are both present and match the combined `SPEC_ENG_API`. |
| `packages/core/src/extension.ts` | No clash | Added `engine.setMarker(...)` after the tree provider is created and the `jarvis_listModels` tool and `jarvis.listModels` command, both registered into the disposables. Our `ensureActorAgent` call in `jarvis.newActor` and the removal of the identity tool are intact. |
| `packages/core/package.json` | No clash | Added the `jarvis.listModels` command, the `jarvis_listModels` tool and `vendor`/`model` in the job step schema. Our `jarvis_createActor` schema without `agent` is intact and `jarvis_whoAmI` is absent. |
| `packages/kanban/package.json` | No clash | Only the version changed (`0.28.0` to `0.29.0`); eight `required` lists still contain `ownerName`. |
| `docs/design/spec_actor.rst` | No clash | The other line added `SPEC_ENG_ACTORMARK` to the links and text of `SPEC_ACTOR_TREE` and to `SPEC_ACTOR_ACTIVITY` AC-4; our `SPEC_ACTOR_WHOAMI` text, AC-10 and statuses are untouched. |
| `docs/requirements/req_eng.rst` | No clash | Adds `REQ_ENG_ACTORMARK` (`implemented`). |
| `docs/requirements/req_aut.rst` | No clash | Adds `REQ_AUT_AGENTMODEL` and `REQ_AUT_LISTMODELS` and moves `REQ_AUT_JOBEXEC` to `approved`; our `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-3 wording is intact. |
| Recorder add-on against our API changes | No clash | [extension.ts](../../packages/recorder/src/extension.ts#L106) uses only `listActors()` fields `id`, `name`, `folder`, `summary`, and `markActor` guarded by `typeof api.markActor !== 'function'` ([extension.ts](../../packages/recorder/src/extension.ts#L81)). It does not read `agent`. |

### `SPEC_ENG_API` against the code

No code-level clash with the combined text PM left at `approved`. Each member the text lists exists in the code: `JarvisActor` with `agent` equal to `name`; `HeartbeatStep` with `vendor` and `model`; `markActor`; `version: 2`. The text adds `REQ_ENG_ACTORMARK` to the links and AC-10 for `markActor`; the code behaves as AC-10 and `SPEC_ENG_ACTORMARK` say. I did not judge the wording; that is System Designer's step. After he sets the status, the verified elements of this change that `SPEC_ENG_API` covers (`SPEC_ENG_ACTORLIST`, `REQ_ENG_ACTORLIST`) are unaffected.

### Removed names

`git grep` over the whole tracked tree except `docs/changes`, `.jarvis` and `docs/releasenotes.md` finds `jarvis_whoAmI`, `whoAmI`, `pickAgentMode`, `writeActorAgent` and `takeCallingSessionId` only in the deliberate statements of the specifications and in this change's negative test assertions. No code, manifest, README or recorder file uses them.

No finding in this integration. UAT/EDH scenarios T-1..T-8 and T-10 remain NOT RUN by Verify, with no verdict; the 3 s mode-command wait stays OPEN.

## Conclusion

**PASSED.** Every approved specification element reviewed matches its implementation, and both of CM's questions were answered as "conforms". The first pass was PARTIAL for missing test evidence only; all of Issues 1 to 7 are now closed with tests or small code changes that I read and ran (371/371 tests, all builds, source lint with 0 errors, strict Sphinx). The accepted lint caveat is unchanged: unfiltered lint keeps three missing-rule errors in generated Kanban output. Class (b) README mentions of `whoAmI` were fixed by the Documentation Engineer after the first pass and are gone at `fe19edde`. The two observations outside this change (label wording, multi-root paths) are not blocking. User UAT and the manual Extension Development Host scenarios were not run and carry no verdict; the 3 s mode-command wait remains an open assumption. Verify made no implementation changes.
