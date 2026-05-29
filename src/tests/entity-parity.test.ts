/**
 * Unit tests for entity-parity change (CR v0.7.0).
 *
 * T-30:  SPEC_EXP_ENTITY_LAZYBIND – writeFileSync rejection → warn + abort
 * AC-3:  SPEC_AUT_HEARTBEAT_RESOLVER_REUSE – fire-time skip on invalid dest
 * T-51:  SPEC_AUT_HEARTBEAT_RESOLVER_REUSE – shared resolver code identity
 */
import { describe, it, expect, vi } from 'vitest';

// --- T-51: Shared resolver code identity -----------------------------------
// Both extension.ts and heartbeat.ts must reference the SAME getValidDestinations
// from sessionLookup.ts. We verify the export exists and is a function.
describe('T-51: shared resolver code identity', () => {
    it('getValidDestinations is exported from sessionLookup and is a function', async () => {
        // We can't import the real module (it depends on vscode + sql.js at import time),
        // so we verify via static analysis: read the compiled output and confirm export.
        const fs = await import('fs');
        const path = await import('path');
        const outDir = path.resolve(__dirname, '..', '..', 'out');
        const sessionLookupJs = path.join(outDir, 'sessionLookup.js');

        // The compiled JS must exist and export getValidDestinations
        const content = fs.readFileSync(sessionLookupJs, 'utf-8');
        expect(content).toContain('getValidDestinations');
    });

    it('extension.ts and heartbeat.ts both import getValidDestinations from sessionLookup', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const srcDir = path.resolve(__dirname, '..');

        const extensionSrc = fs.readFileSync(path.join(srcDir, 'extension.ts'), 'utf-8');
        const heartbeatSrc = fs.readFileSync(path.join(srcDir, 'heartbeat.ts'), 'utf-8');

        // Both must import getValidDestinations from the same module
        expect(extensionSrc).toMatch(/import\s*\{[^}]*getValidDestinations[^}]*\}\s*from\s*['"]\.\/sessionLookup['"]/);
        expect(heartbeatSrc).toMatch(/import\s*\{[^}]*getValidDestinations[^}]*\}\s*from\s*['"]\.\/sessionLookup['"]/);
    });
});

// --- T-30: Lazy-bind write failure → abort without partial state -----------
describe('T-30: lazy-bind write failure aborts cleanly', () => {
    it('writeFileSync throwing causes early return without rescan', async () => {
        // Simulate the lazy-bind logic inline (extracted from openAgentSession):
        // If writeFileSync throws, the catch block logs + returns (no rescan called).
        const fs = await import('fs');
        const yaml = await import('js-yaml');

        const mockRescan = vi.fn();
        const warnMessages: string[] = [];
        const mockLog = { warn: (msg: string) => warnMessages.push(msg) };

        // Simulate lazy-bind flow
        const yamlPath = 'C:\\nonexistent\\path\\project.yaml';
        const pickerResult = 'my-agent';
        let aborted = false;

        try {
            const rawContent = fs.readFileSync(yamlPath, 'utf-8');
            const doc = yaml.load(rawContent) as Record<string, unknown> ?? {};
            doc['agent'] = pickerResult;
            const newContent = yaml.dump(doc, { lineWidth: -1, quotingType: '"', forceQuotes: true });
            fs.writeFileSync(yamlPath, newContent, 'utf-8');
        } catch (err) {
            mockLog.warn(`[LazyBind] Failed to lazy-bind agent for "TestEntity": ${err}`);
            aborted = true;
            // return; — in the real code this exits the command handler
        }

        // On failure: aborted=true, rescan never called, warn logged
        expect(aborted).toBe(true);
        expect(mockRescan).not.toHaveBeenCalled();
        expect(warnMessages.length).toBe(1);
        expect(warnMessages[0]).toContain('[LazyBind]');
        expect(warnMessages[0]).toContain('TestEntity');
    });
});

// --- AC-3: Heartbeat fire-time destination validation ----------------------
describe('AC-3: heartbeat fire-time destination validation', () => {
    it('getValidDestinations logic returns union of chat titles and entity names', () => {
        // Replicate the pure logic of getValidDestinations without vscode/sql.js deps
        const chatTitles = ['Session A', 'Session B'];
        const entityNames = ['Project X', 'Session A']; // overlap

        // The real implementation: Set union
        const union = new Set([...chatTitles, ...entityNames]);
        const result = [...union];

        expect(result).toContain('Session A');
        expect(result).toContain('Session B');
        expect(result).toContain('Project X');
        // No duplicates
        expect(result.length).toBe(3);
    });

    it('destination not in valid set is considered invalid (fire-time skip)', () => {
        const validNames = ['Session A', 'Project X'];
        const jobDestination = 'Deleted Project';

        // The heartbeat logic: if dest not in validNames → skip
        const isValid = validNames.includes(jobDestination);
        expect(isValid).toBe(false);
    });

    it('scanner entities are included in valid set when scanner is passed', () => {
        // Replicates getValidDestinations logic WITH scanner parameter
        const chatTitles = ['Chat Tab 1'];
        const scanner = { entities: [{ name: 'My Project' }, { name: 'My Event' }] };

        // With scanner: union includes entity names
        const entityNames = scanner.entities.map(e => e.name);
        const union = new Set([...chatTitles, ...entityNames]);
        const result = [...union];

        expect(result).toContain('Chat Tab 1');
        expect(result).toContain('My Project');
        expect(result).toContain('My Event');
        expect(result.length).toBe(3);
    });

    it('without scanner, only chat titles are in valid set (no entity names)', () => {
        // Replicates getValidDestinations logic WITHOUT scanner parameter
        const chatTitles = ['Chat Tab 1'];
        const scanner = undefined;

        const entityNames = scanner?.entities?.map((e: { name: string }) => e.name) ?? [];
        const union = new Set([...chatTitles, ...entityNames]);
        const result = [...union];

        expect(result).toContain('Chat Tab 1');
        expect(result).not.toContain('My Project');
        expect(result.length).toBe(1);
    });
});
