# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** recorder-redesign (feature/recorder-redesign)
- **Status:** D-56 (close means exit) implemented, QM R2; earlier QM R1 fixes 9484f9d. Shared-tree warning: packages/recorder/package.json had foreign uncommitted pre-redesign content (not mine) - never stage it. Open: EDH checks, 1 h run, D-28 licence
- **Prior:** remove-newactor-legacy-quickpick (93426c0) done

## Decisions

- Audio tests (speakers/mic/loopback) are audible and capture whatever plays: ask the user first — a Teams call was running during the recorder spikes. Delete captured audio/text afterwards.
- foundry-local-sdk 2.1.0 is ESM-only: the worker loads it with dynamic `import()`, not `require` (SPEC_REC_ENGINE text says require — told CM).

- Multi-session concurrency hazard: this workspace has multiple Jarvis chat sessions (CM/PM/QM/Designer/Dev) editing the SAME working directory. Always re-read a file immediately before editing if it was read >1 tool-call ago.
- Use `jarvis_sendMessage`/`jarvis_receiveMessage` tools exclusively for cross-session messaging — never edit `.jarvis/messages.json` directly (past mistake, corrected 2026-07-01).
- SPEC_EXP_ENTITY_FILE_CHILDREN implemented in the engine's shared GenericTreeDataProvider (packages/core/src/engine/core/treeFactory.ts) — NOT per-kind providers as the CD assumed, since Project/Event/Session already unified via EntityKindConfig.
- Rejected a "same-CR bug fix" request from CM when the fix actually required changing the spec's documented algorithm (agent-file path resolution) — routed back to System Designer instead of patching code against a wrong spec. Correct call; don't cave to pragmatic "just fix it" pressure when spec and required behavior diverge.
- agentDiscovery.ts (new module) holds discoverAgentModes()/resolveAgentFileChild() instead of extension.ts as the amended spec said — avoids an extension.ts→treeFactory.ts→yamlScanner.ts→extension.ts import cycle. Flagged as implementation-level deviation in RESPOND, not a spec violation (same algorithm, different module).

## Next

- Write unit tests for hook-engine-mvp migrate.ts (mock vscode APIs) — carried over, not yet done
- Verify full E2E in Extension Dev Host per test protocols (retire-jarvis-legacy Group F, entity-files-tree T-1..T-10)

