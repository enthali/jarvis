# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** wsl2-username-fallback (feature/wsl2-username-fallback)
- **Status:** Fix committed — `resolveUserDataPath()` falls back to `process.env.USER`
- **Commit:** `7e72852` — 1 file changed, 3 insertions(+), 3 deletions(-)

## Decisions

- Shim reuses fetchLatestRelease/downloadToTmp pattern from core's updateCheck.ts (copied, not imported — core-gh is self-contained)
- Pre-existing test failure (entity-parity T-51 expects root out/) unrelated to this CR

## Next

- Write unit tests for migrate.ts (mock vscode APIs)
- Verify full E2E in Extension Dev Host (test group F from test protocol)

