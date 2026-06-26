# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** retire-jarvis-legacy (feature/retire-jarvis-legacy)
- **Status:** Implementation committed — all 4 new SPECs + COREGH mod done
- **Commit:** `8668db2` — migration shim in packages/core-gh

## Decisions

- Shim reuses fetchLatestRelease/downloadToTmp pattern from core's updateCheck.ts (copied, not imported — core-gh is self-contained)
- Pre-existing test failure (entity-parity T-51 expects root out/) unrelated to this CR

## Next

- Write unit tests for migrate.ts (mock vscode APIs)
- Verify full E2E in Extension Dev Host (test group F from test protocol)

