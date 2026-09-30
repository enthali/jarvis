/**
 * Characterization tests (S0+S1): pin current extension behaviour.
 *
 * These tests document "what works today" so regressions are caught during
 * the modular cut (S2). They import directly from current source — no engine
 * indirection.
 *
 * Focus areas:
 * - Recording chain (start/stop lifecycle shape via static analysis)
 * - MCP tool registration shape
 *
 * NOTE: Modules that import `vscode` cannot be directly imported in vitest.
 * For those we use static source analysis (same approach as entity-parity tests).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Recording chain shape (static analysis — vscode not available in vitest)
// ---------------------------------------------------------------------------

describe('Characterization: RecordingManager lifecycle shape', () => {
    it('recording.ts exports RecordingManager class with start/stop methods', () => {
        const srcDir = path.resolve(__dirname, '..', '..', 'packages', 'recorder', 'src');
        const src = fs.readFileSync(path.join(srcDir, 'recording.ts'), 'utf-8');
        expect(src).toContain('export class RecordingManager');
        expect(src).toMatch(/async start\(/);
        expect(src).toMatch(/async stop\(/);
        expect(src).toContain('currentProject');
        expect(src).toContain('onDidChange');
    });
});

// ---------------------------------------------------------------------------
// MCP server shape (static analysis — moved to packages/mcp)
// ---------------------------------------------------------------------------

describe('Characterization: MCP server (packages/mcp)', () => {
    it('mcpServer.ts exports startMcpServer and stopMcpServer', () => {
        const srcDir = path.resolve(__dirname, '..');
        const src = fs.readFileSync(path.join(srcDir, '..', 'packages', 'mcp', 'src', 'mcpServer.ts'), 'utf-8');
        expect(src).toContain('export async function startMcpServer');
        expect(src).toContain('export async function stopMcpServer');
    });

    it('core has zero MCP/modelcontextprotocol references', () => {
        const srcDir = path.resolve(__dirname, '..');
        const coreSrc = path.join(srcDir, '..', 'packages', 'core', 'src');
        const files = fs.readdirSync(coreSrc, { recursive: true, withFileTypes: false }) as string[];
        for (const rel of files) {
            if (!rel.toString().endsWith('.ts')) { continue; }
            const content = fs.readFileSync(path.join(coreSrc, rel.toString()), 'utf-8');
            expect(content).not.toContain('mcpServer');
            expect(content).not.toContain('@modelcontextprotocol');
        }
    });
});
