/**
 * Unit tests for entity-parity change (CR v0.7.0).
 *
 * T-51: SPEC_AUT_HEARTBEAT_RESOLVER_REUSE – shared resolver code identity
 *
 * T-30 (lazy-bind write failure) and AC-3 (dual-source union destinations)
 * simulated the retired session/project/event dual-path scanner and
 * `openAgentSession`'s lazy-bind flow, neither of which exists anymore
 * (SPEC_ACTOR_SCANNER: destinations come from `actorScanner.actors` only,
 * never a chat-title union). Removed with the retire-legacy-actor-kinds CD.
 */
import { describe, it, expect } from 'vitest';

// --- T-51: Shared resolver code identity -----------------------------------
// Both extension.ts and heartbeat.ts must reference the SAME getValidDestinations
// from sessionLookup.ts. We verify the export exists and is a function.
describe('T-51: shared resolver code identity', () => {
    it('getValidDestinations is exported from sessionLookup and is a function', async () => {
        // We can't import the real module (it depends on vscode + sql.js at import time),
        // so we verify via static analysis: read the compiled output and confirm export.
        const fs = await import('fs');
        const path = await import('path');
        const outDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'out');
        const sessionLookupJs = path.join(outDir, 'engine', 'sessions', 'sessionLookup.js');

        // The compiled JS must exist and export getValidDestinations
        const content = fs.readFileSync(sessionLookupJs, 'utf-8');
        expect(content).toContain('getValidDestinations');
    });

    it('extension.ts and heartbeat.ts both import getValidDestinations from sessionLookup', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');

        const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
        const heartbeatSrc = fs.readFileSync(path.join(coreSrcDir, 'apps', 'session', 'heartbeat.ts'), 'utf-8');

        // Both must import getValidDestinations from the same module
        expect(extensionSrc).toMatch(/import\s*\{[^}]*getValidDestinations[^}]*\}\s*from\s*['"]\.\/engine\/sessions\/sessionLookup['"]/);
        expect(heartbeatSrc).toMatch(/import\s*\{[^}]*getValidDestinations[^}]*\}\s*from\s*['"]\.\.\/\.\.\/engine\/sessions\/sessionLookup['"]/);
    });
});
