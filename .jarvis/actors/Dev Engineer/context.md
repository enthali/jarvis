# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** prompt-injection-tool (feature/prompt-injection-tool)
- **Status:** Committed `29dd7f3` + `6a8420f` + `f3da959` — SPEC_PIM_OPENACTORSESSION replaces injectPrompt on API
- **SPECs:** SPEC_INJ_INJECT, SPEC_INJ_TOOL, SPEC_INJ_COMMAND, SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_ENT_AGENTSESSION, SPEC_ACT_NEWENTITY, SPEC_PIM_OPENACTORSESSION, SPEC_ENG_API

## Decisions

- Multi-session concurrency hazard: this workspace has multiple Jarvis chat sessions (CM/PM/QM/Designer/Dev) editing the SAME working directory. Always re-read a file immediately before editing if it was read >1 tool-call ago.
- Use `jarvis_sendMessage`/`jarvis_receiveMessage` tools exclusively for cross-session messaging — never edit `.jarvis/messages.json` directly (past mistake, corrected 2026-07-01).
- SPEC_EXP_ENTITY_FILE_CHILDREN implemented in the engine's shared GenericTreeDataProvider (packages/core/src/engine/core/treeFactory.ts) — NOT per-kind providers as the CD assumed, since Project/Event/Session already unified via EntityKindConfig.
- Rejected a "same-CR bug fix" request from CM when the fix actually required changing the spec's documented algorithm (agent-file path resolution) — routed back to System Designer instead of patching code against a wrong spec. Correct call; don't cave to pragmatic "just fix it" pressure when spec and required behavior diverge.
- agentDiscovery.ts (new module) holds discoverAgentModes()/resolveAgentFileChild() instead of extension.ts as the amended spec said — avoids an extension.ts→treeFactory.ts→yamlScanner.ts→extension.ts import cycle. Flagged as implementation-level deviation in RESPOND, not a spec violation (same algorithm, different module).

## Next

- Write unit tests for hook-engine-mvp migrate.ts (mock vscode APIs) — carried over, not yet done
- Verify full E2E in Extension Dev Host per test protocols (retire-jarvis-legacy Group F, entity-files-tree T-1..T-10)

