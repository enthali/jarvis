# Validation Report: Retire Legacy Actor Kinds

**Date**: 2026-09-27

**Change Document**: [retire-legacy-actor-kinds.md](retire-legacy-actor-kinds.md)

**Branch / verification baseline**: `feature/retire-legacy-actor-kinds` / `2f57da2`
**Implementation commit**: `6df1b5e`
**Approved spec baseline**: `ab73f3e`
**Status**: PASSED

## Summary

The prior Actor-retirement scope remains PASSED. Fresh verification of the Flow activation/version guard against approved `SPEC_MOD_FLOW_PKG` confirms that API v2 registers both commands; retired API v1 logs the mismatch and registers neither; and a missing core export registers neither. Flow's manifest still contributes the commands and title-bar entries independently of the runtime guard, matching AC-2/AC-6. The manual smoke-check procedure recorded in the Change Document was not executed; User UAT remains NOT RUN with no verdict. All six `SPEC_MOD_FLOW_PKG` ACs were checked, and its status is now `implemented`.

The following totals preserve the prior implementation verification; the current Flow guard trace result is itemized separately.

| Category | Total | Verified | Issues |
| -------- | ----- | -------- | ------ |
| Requirements (prior implementation) | 3 | 3 | 0 |
| Flow API guard requirement | 1 | 1 | 0 |
| Designs (prior implementation) | 3 | 3 | 0 |
| Flow package design criteria | 6 | 6 | 0 |
| Implementations, including QM Round 1 findings 1–9 and Flow guard | 12 | 12 | 0 |
| Focused regression files | 5 | 5 | 0 |
| Retargeted references | 8 | 8 | 0 |
| Flow guard trace path | 1 | 1 | 0 |

## Requirements Coverage

| Requirement / contract | Design | Implementation and test evidence | Result |
| --------------------- | ------ | -------------------------------- | ------ |
| REQ_ACTOR_SCHEMA AC-7: refuse ambiguous message sender/destination and notify | SPEC_MSG_SENDMESSAGE | `resolveName()` branches notify and throw in [extension.ts](../../packages/core/src/extension.ts#L841) and [extension.ts](../../packages/core/src/extension.ts#L857); focused tests cover ambiguity and distinct unknown errors in [sendmessage-canonical-ambiguity.test.ts](../../src/tests/sendmessage-canonical-ambiguity.test.ts#L31) | PASS |
| REQ_ACTOR_AGENT_DISCOVERY AC-6: discover on demand without persistent cache | SPEC_ACTOR_AGENT_DISCOVERY; SPEC_ACTOR_FILES | [actorFiles.ts](../../packages/core/src/engine/actors/actorFiles.ts#L27) invokes discovery for each resolution; additions and removals are tested in [agentdiscovery-refresh.test.ts](../../src/tests/agentdiscovery-refresh.test.ts#L22) | PASS |
| REQ_CFG_SCANINTERVAL AC-5: remove the legacy Rescan job when heartbeat starts | SPEC_ACTOR_SCANNER | Production startup calls `unregisterJob()` in [extension.ts](../../packages/core/src/extension.ts#L445); scheduler behavior and the exact call's presence in the heartbeat-enabled activation block are tested in [rescan-job-cleanup.test.ts](../../src/tests/rescan-job-cleanup.test.ts#L31) and [rescan-job-cleanup.test.ts](../../src/tests/rescan-job-cleanup.test.ts#L66) | PASS |
| REQ_ENG_CONTRACT AC-3: versioned API and add-on guard | SPEC_ENG_API AC-2; SPEC_MOD_FLOW_PKG AC-5/AC-6 | Sphinx-Needs confirms `SPEC_MOD_FLOW_PKG` links to `SPEC_ENG_API`, which links to this requirement | PASS |
| REQ_ENG_CONTRACT AC-3: Flow consumes API v2 | SPEC_ENG_API AC-2; SPEC_MOD_FLOW_PKG AC-5 | Core publishes literal version 2 in [coreApi.ts](../../packages/core/src/engine/core/coreApi.ts#L17); Flow checks it in [extension.ts](../../packages/flow/src/extension.ts#L266) | PASS |
| SPEC_MOD_FLOW_PKG AC-1..AC-4, AC-6: package/manifest contract | REQ_FLOW_PACKAGE; REQ_MOD_ZEROTRACE AC-6 | Core-only dependency and static command/title contributions in [package.json](../../packages/flow/package.json#L16), [package.json](../../packages/flow/package.json#L45), and [package.json](../../packages/flow/package.json#L60); mismatch returns before handlers register at [extension.ts](../../packages/flow/src/extension.ts#L266) | PASS |
| SPEC_MOD_FLOW_PKG AC-5: guard and no removed API calls | SPEC_ENG_API AC-2/AC-4 | Version 2 registers both command handlers; version 1 logs and registers neither; absent core export registers neither in [flow-activation-guard.test.ts](../../src/tests/flow-activation-guard.test.ts#L22), [flow-activation-guard.test.ts](../../src/tests/flow-activation-guard.test.ts#L33), and [flow-activation-guard.test.ts](../../src/tests/flow-activation-guard.test.ts#L51); Flow source audit found no removed API references | PASS |

## Flow Guard Spec Review

**MECE: PASS.** `SPEC_ENG_API` AC-2 is the API-wide normative guard; `SPEC_MOD_FLOW_PKG` AC-5 applies it to Flow handler registration. AC-2/AC-6 distinguish static manifest contributions from runtime registration and state the version-mismatch outcome. `SPEC_FLOW_WEBVIEW` and `SPEC_FLOW_LOGVIEWER` define their feature behaviors without a competing guard. All six Flow package ACs match the manifest and implementation.

**Traceability: PASS.** The rebuilt Sphinx-Needs graph confirms `SPEC_MOD_FLOW_PKG` links to `SPEC_ENG_API`, and `SPEC_ENG_API` links to `REQ_ENG_CONTRACT` AC-3. The Flow feature specs still link to `REQ_FLOW_WEBVIEWPANEL` and `REQ_FLOW_LOGVIEWER`. `SPEC_MOD_FLOW_PKG` is marked `implemented` after AC-1..AC-6 verification. See the [Change Document review record](retire-legacy-actor-kinds.md) for the graph query details.

### Prior Findings Rechecked

| Finding | Result | Evidence |
| ------- | ------ | -------- |
| QM Round 1 findings 1–9 | PASS | Story-row consolidation is recorded in [retire-legacy-actor-kinds.md](retire-legacy-actor-kinds.md#L668). Creation uniqueness and UI write behavior are covered by [actorCreation.ts](../../packages/core/src/engine/actors/actorCreation.ts#L69), [actorRuntime.ts](../../packages/core/src/engine/actors/actorRuntime.ts#L77), and [newactor-creation-flow.test.ts](../../src/tests/newactor-creation-flow.test.ts#L27). Kanban rejects non-unique owners at [extension.ts](../../packages/kanban/src/extension.ts#L55). Touch/activity ambiguity is gated in [actorTreeProvider.ts](../../packages/core/src/engine/actors/actorTreeProvider.ts#L101) and [activityTracker.ts](../../packages/core/src/engine/hooks/activityTracker.ts#L35). Core API ambiguity notification and scanner disposal are in [coreApi.ts](../../packages/core/src/engine/core/coreApi.ts#L118) and [coreApi.ts](../../packages/core/src/engine/core/coreApi.ts#L143). |
| Prior message-tool finding | PASS | The canonical LM/MCP handler now handles both ambiguous branches, preserves non-notifying unknown-name errors, and validates destination before sender in [extension.ts](../../packages/core/src/extension.ts#L841). The new focused test checks the handler source and exercises a matching validation flow against a real ActorScanner; it does not invoke the private registered callback directly. |
| Prior agent-discovery finding | PASS | `agentDiscovery.ts` now contains discovery only; the live resolver calls `discoverAgentModes()` at [actorFiles.ts](../../packages/core/src/engine/actors/actorFiles.ts#L29). The test proves a newly added and a removed agent are reflected on the next resolution. The stale `SPEC_EXP_ENTITY_FILE_CHILDREN`, `yamlScanner.ts`, and `getEntityFileChildren()` comments are absent from active code. |
| Prior UI-header finding | PASS | The comment and test now refer to `jarvis.openActorFile` in [ui-improvements.test.ts](../../src/tests/ui-improvements.test.ts#L6). |
| QM Round 2 class-(a) and traceability findings | PASS | All eight requested replacements are present in [actor-touched-files.test.ts](../../src/tests/actor-touched-files.test.ts#L2), [touched-files-cleanup.test.ts](../../src/tests/touched-files-cleanup.test.ts#L1), [touched-files-write-race.test.ts](../../src/tests/touched-files-write-race.test.ts#L2), and [ui-improvements.test.ts](../../src/tests/ui-improvements.test.ts#L45). Retired fixture directories and the old engine-contract test are absent from the tracked tree. The PIM README and test workspace settings contain no retired Project/Event entries. |
| QM finding 11: unfiltered lint | ACCEPTED AS-IS, non-blocking | The remaining errors are missing ESLint rules in generated Kanban output; source-scoped lint passes. |
| QM finding 12: Recorder contribution | PASS / no finding | No active Recorder Project/Event context-value contribution was found; this matches the Change Document's deferred disposition. |

## Class-(a) Artifact Audit

The eight retired traceability references are gone from the four retargeted tests. The only remaining `SPEC_ENT_`/`REQ_ENT_` test IDs are the intentional assertion that retired commands are absent in [entity-tree-context-menu.test.ts](../../src/tests/entity-tree-context-menu.test.ts#L24). `project.yaml` and `event.yaml` occur in [yamlSchemaContributor.test.ts](../../src/tests/yamlSchemaContributor.test.ts#L16) only as negative checks that retired schemas are unsupported. Old API/command names in other tests are negative assertions, not live registration or use.

The `Jarvis: Rescan` value in [heartbeat.yaml](../../testdata/.jarvis/heartbeat.yaml#L2) is the migration input for AC-5; startup unregisters it when the heartbeat feature starts. The `jarvis.rescan` command contribution remains distinct from the removed heartbeat job. No active Project/Event fixture directories, retired schemas, or class-(a) source modules were found. Historical Change Documents are accepted as class-(c) stranding by the Change Document.

## Test Protocol

**File**: [tst-retire-legacy-actor-kinds.md](tst-retire-legacy-actor-kinds.md)

**Result**: NOT RUN (the protocol defines no User UAT cases; no user verdict)

| # | REQ ID | AC | Description | Result |
| - | ------ | -- | ----------- | ------ |
| - | - | - | No User UAT cases are defined; engineering checks are reported separately. | NOT RUN |

## Engineering Checks

Engineering gates were rerun for the Flow implementation baseline `2f57da2`. User UAT and the documented manual Extension Development Host smoke procedure were not executed.

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `src/tests/flow-activation-guard.test.ts` | PASS | 1 file; 3 tests passed for v2, retired v1, and missing core export. |
| Focused regressions: Flow activation, canonical messaging, discovery refresh, Rescan cleanup, UI improvements | PASS | 5 files; 30 tests passed. |
| `npm test -- --reporter=dot` | PASS | 45 files; 355 tests passed. |
| Fail-fast TypeScript compilation for core, PIM, recorder, MCP, Flow, Kanban, Syspilot; Flow/Kanban bundle builds | PASS | All seven package compiles and both bundle sequences completed. |
| `npm run lint -- --ignore-pattern 'packages/kanban/out/**'` | PASS | Zero errors; 168 warnings. |
| `npm run lint` | FAIL, accepted as non-blocking | Three missing-rule errors and 168 warnings; errors are in generated `packages/kanban/out/extension.js`. |
| `python -m sphinx -E -b html docs docs/_build/html -W --keep-going` | PASS | Fresh strict build; schema validation reported zero warnings. |

## Issues Found

No outstanding Flow activation, MECE, or traceability findings. The documented manual smoke-check procedure and formal User UAT remain NOT RUN, with no verdict.

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
| ----------- | ------ | -------------- | ---- | -------- |
| REQ_ACTOR_SCHEMA AC-7 | SPEC_MSG_SENDMESSAGE | Canonical handler resolves both names and notifies on ambiguity | Focused handler-source and validation-flow tests | Yes |
| REQ_ACTOR_AGENT_DISCOVERY AC-6 | SPEC_ACTOR_AGENT_DISCOVERY; SPEC_ACTOR_FILES | Fresh `discoverAgentModes()` call through `resolveAgentFile()` | Addition/removal on next call | Yes |
| REQ_CFG_SCANINTERVAL AC-5 | SPEC_ACTOR_SCANNER | Startup unregisters legacy job when heartbeat starts | Scheduler method and activation-block call presence tested | Yes |
| REQ_ENG_CONTRACT AC-3 | SPEC_ENG_API AC-2 | Flow guard restated in SPEC_MOD_FLOW_PKG AC-5/AC-6 | Formal package-to-API-to-requirement path verified | Yes |
| SPEC_MOD_FLOW_PKG AC-1..AC-6 | REQ_FLOW_PACKAGE; REQ_MOD_ZEROTRACE; REQ_ENG_CONTRACT | Manifest, API guard, no removed API calls, and mismatch behavior verified | Real activate() test covers v2/v1/missing export; UAT not run | Yes |
| QM Round 1 findings 1–9 | Amended Actor/Kanban/API specs | Creation, owner, activity/touched-files, message API, disposal fixes | Focused regressions; full suite | Yes |
| Class-(a) removal / Round 2 traceability | Change Document removal checklist | Active source and test references audited | Eight retargets confirmed; intentional negative assertions retained | Yes |

## Conclusion

**PASSED**. The Flow activation guard matches the approved v2 contract: v2 registers both commands; v1 logs the mismatch and registers neither; missing core exports fail closed. The static manifest contributions remain independent of activation success, and no removed API calls remain in Flow source. All six `SPEC_MOD_FLOW_PKG` ACs were verified, the spec status is `implemented`, and the full test/build/source-lint/Sphinx gates pass. Unfiltered lint retains three accepted generated-output errors. The manual smoke procedure was not executed; User UAT remains NOT RUN with no verdict. Verify made no implementation changes.