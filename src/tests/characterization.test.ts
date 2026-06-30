/**
 * Characterization tests (S0+S1): pin current extension behaviour.
 *
 * These tests document "what works today" so regressions are caught during
 * the modular cut (S2). They import directly from current source — no engine
 * indirection.
 *
 * Focus areas:
 * - Tree rendering (scanner produces expected items)
 * - Entity creation paths (YAML creation, scanner discovery)
 * - Recording chain (start/stop lifecycle shape via static analysis)
 * - MCP tool registration shape
 * - Tree provider class existence (via source inspection)
 *
 * NOTE: Modules that import `vscode` cannot be directly imported in vitest.
 * For those we use static source analysis (same approach as entity-parity tests).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Tree rendering characterization
// ---------------------------------------------------------------------------

describe('Characterization: YamlScanner tree structure', () => {
    it('scanner exports TreeNode types (FolderNode and LeafNode)', async () => {
        const scannerModule = await import('../../packages/core/src/engine/sessions/yamlScanner');
        expect(scannerModule.YamlScanner).toBeDefined();
        const scanner = new scannerModule.YamlScanner(() => {});
        expect(typeof scanner.getProjectTree).toBe('function');
        expect(typeof scanner.getEventTree).toBe('function');
        expect(typeof scanner.getSessionTree).toBe('function');
        expect(typeof scanner.getEntity).toBe('function');
    });

    it('scanner produces empty trees before start()', async () => {
        const { YamlScanner } = await import('../../packages/core/src/engine/sessions/yamlScanner');
        const scanner = new YamlScanner(() => {});
        expect(scanner.getProjectTree()).toEqual([]);
        expect(scanner.getEventTree()).toEqual([]);
        expect(scanner.getSessionTree()).toEqual([]);
    });

    it('scanner discovers YAML entities in test folders after rescan()', async () => {
        const { YamlScanner } = await import('../../packages/core/src/engine/sessions/yamlScanner');
        const scanner = new YamlScanner(() => {});

        const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');
        const projectsDir = path.join(testdataDir, 'projects');
        const eventsDir = path.join(testdataDir, 'events');

        if (fs.existsSync(projectsDir) && fs.existsSync(eventsDir)) {
            scanner.start(projectsDir, eventsDir);
            // start() fires async scan; await rescan() to ensure completion
            await scanner.rescan();
            const projectTree = scanner.getProjectTree();
            const eventTree = scanner.getEventTree();
            expect(Array.isArray(projectTree)).toBe(true);
            expect(Array.isArray(eventTree)).toBe(true);
            expect(projectTree.length).toBeGreaterThan(0);
        }
    });

    it('entities have expected shape (name, kind, folder)', async () => {
        const { YamlScanner } = await import('../../packages/core/src/engine/sessions/yamlScanner');
        const scanner = new YamlScanner(() => {});

        const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');
        const projectsDir = path.join(testdataDir, 'projects');
        const eventsDir = path.join(testdataDir, 'events');

        if (fs.existsSync(projectsDir) && fs.existsSync(eventsDir)) {
            scanner.start(projectsDir, eventsDir);
            await scanner.rescan();
            const entities = scanner.entities;
            expect(entities.length).toBeGreaterThan(0);
            for (const entity of entities) {
                expect(entity).toHaveProperty('name');
                expect(entity).toHaveProperty('kind');
                expect(entity).toHaveProperty('folder');
                expect(['project', 'event', 'session']).toContain(entity.kind);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Entity creation paths (YAML file structure)
// ---------------------------------------------------------------------------

describe('Characterization: Entity YAML structure', () => {
    it('project YAML has expected fields (name)', () => {
        const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');
        const projectsDir = path.join(testdataDir, 'projects');

        if (!fs.existsSync(projectsDir)) { return; }
        const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
        const projectDirs = entries.filter(e => e.isDirectory());

        let validCount = 0;
        for (const dir of projectDirs) {
            // Skip intentionally invalid testdata
            if (dir.name.startsWith('invalid')) { continue; }
            const yamlFile = path.join(projectsDir, dir.name, 'project.yaml');
            if (fs.existsSync(yamlFile)) {
                const content = fs.readFileSync(yamlFile, 'utf-8');
                const doc = yaml.load(content) as Record<string, unknown>;
                if (doc && typeof doc === 'object') {
                    expect(doc).toHaveProperty('name');
                    validCount++;
                }
            }
        }
        expect(validCount).toBeGreaterThan(0);
    });

    it('event YAML has expected fields (name)', () => {
        const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');
        const eventsDir = path.join(testdataDir, 'events');

        if (!fs.existsSync(eventsDir)) { return; }
        const entries = fs.readdirSync(eventsDir, { withFileTypes: true });
        const eventDirs = entries.filter(e => e.isDirectory());

        let validCount = 0;
        for (const dir of eventDirs) {
            const yamlFile = path.join(eventsDir, dir.name, 'event.yaml');
            if (fs.existsSync(yamlFile)) {
                const content = fs.readFileSync(yamlFile, 'utf-8');
                const doc = yaml.load(content) as Record<string, unknown>;
                if (doc && typeof doc === 'object') {
                    expect(doc).toHaveProperty('name');
                    validCount++;
                }
            }
        }
        expect(validCount).toBeGreaterThan(0);
    });
});

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

// ---------------------------------------------------------------------------
// Tree provider classes shape — old bespoke providers deleted in S5b-2 (Part B).
// Coverage replaced by projectTreeExpectation.test.ts and eventTreeExpectation.test.ts
// which assert the kind-config + decorator output against known expected literals.
// Session tree provider shape still verified via sessionTreeEquivalence.test.ts.
// ---------------------------------------------------------------------------
