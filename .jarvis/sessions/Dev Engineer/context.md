# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** entity-files-tree (feature/entity-files-tree)
- **Status:** Implementation + bugfix committed — expandable file children, agent-file resolution fixed
- **Commits:** `8d73d35` (initial), `4fe0bdc` (agent-file resolution fix per amended SPEC_EXP_ENTITY_FILE_CHILDREN)

## Decisions

- Multi-session concurrency hazard: this workspace has multiple Jarvis chat sessions (CM/PM/QM/Designer/Dev) editing the SAME working directory. Always re-read a file immediately before editing if it was read >1 tool-call ago.
- Use `jarvis_sendToSession`/`jarvis_readMessage` tools exclusively for cross-session messaging — never edit `.jarvis/messages.json` directly (past mistake, corrected 2026-07-01).
- SPEC_EXP_ENTITY_FILE_CHILDREN implemented in the engine's shared GenericTreeDataProvider (packages/core/src/engine/core/treeFactory.ts) — NOT per-kind providers as the CD assumed, since Project/Event/Session already unified via EntityKindConfig.
- Rejected a "same-CR bug fix" request from CM when the fix actually required changing the spec's documented algorithm (agent-file path resolution) — routed back to System Designer instead of patching code against a wrong spec. Correct call; don't cave to pragmatic "just fix it" pressure when spec and required behavior diverge.
- agentDiscovery.ts (new module) holds discoverAgentModes()/resolveAgentFileChild() instead of extension.ts as the amended spec said — avoids an extension.ts→treeFactory.ts→yamlScanner.ts→extension.ts import cycle. Flagged as implementation-level deviation in RESPOND, not a spec violation (same algorithm, different module).

## Next

- Write unit tests for hook-engine-mvp migrate.ts (mock vscode APIs) — carried over, not yet done
- Verify full E2E in Extension Dev Host per test protocols (retire-jarvis-legacy Group F, entity-files-tree T-1..T-10)

