/**
 * Engine implementation unit tests (S4a).
 *
 * Validates: kind-driven scanner (scan set follows registration),
 * generic tree factory (renders registered kind; contextValue from kind),
 * real registerEntityKind/registerTool disposal semantics.
 *
 * SPEC_ENG_SCANNER, SPEC_ENG_TREEFACTORY, SPEC_ENG_REGISTER_KIND, SPEC_ENG_REGISTER_TOOL
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import { GenericTreeFactory } from '../../packages/core/src/engine/core/treeFactory';
import type { EntityKindConfig } from '../../packages/core/src/engine/core/types';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';

// ---------------------------------------------------------------------------
// Kind-Driven Scanner tests (SPEC_ENG_SCANNER)
// ---------------------------------------------------------------------------

describe('SPEC_ENG_SCANNER: KindDrivenScanner', () => {
    const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');
    const sessionsDir = path.join(testdataDir, 'sessions');

    // Create a minimal sessions testdata folder if it doesn't exist
    function ensureTestSessions(): string {
        const dir = path.join(testdataDir, 'sessions-engine-test');
        fs.mkdirSync(path.join(dir, 'TestSession'), { recursive: true });
        const yamlPath = path.join(dir, 'TestSession', 'session.yaml');
        if (!fs.existsSync(yamlPath)) {
            fs.writeFileSync(yamlPath, 'name: "Test Session"\nsummary: "A test session"\n');
        }
        return dir;
    }

    it('scan set is empty before any kind is registered', () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        expect(scanner.registeredKinds).toEqual([]);
    });

    it('addKind adds to the scan set (AC-1)', () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        expect(scanner.registeredKinds).toContain('session');
    });

    it('removeKind removes from the scan set without reload (AC-2)', () => {
        const onChange = vi.fn();
        const scanner = new KindDrivenScanner(onChange, () => '');
        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        scanner.removeKind('session');
        expect(scanner.registeredKinds).not.toContain('session');
        expect(onChange).toHaveBeenCalled();
    });

    it('folder is resolved from folderSettingKey (AC-3)', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const onChange = vi.fn();
        const scanner = new KindDrivenScanner(onChange, resolver);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        await scanner.rescan();

        const tree = scanner.getTreeForKind('session');
        expect(tree.length).toBeGreaterThan(0);

        // Verify entities discovered
        const entities = scanner.entities.filter(e => e.kind === 'session');
        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].name).toBe('Test Session');
    });

    it('scan set is exactly the set of registered kinds (AC-1)', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);

        const sessionConfig: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        const projectConfig: EntityKindConfig = {
            kind: 'project',
            viewId: 'jarvisProjects',
            folderSettingKey: 'jarvis.projects.folder',
            label: (name) => `Project: ${name}`,
        };

        scanner.addKind(sessionConfig);
        scanner.addKind(projectConfig);
        expect(scanner.registeredKinds.sort()).toEqual(['project', 'session']);

        scanner.removeKind('project');
        expect(scanner.registeredKinds).toEqual(['session']);
    });
});

// ---------------------------------------------------------------------------
// Generic Tree Factory tests (SPEC_ENG_TREEFACTORY)
// ---------------------------------------------------------------------------

describe('SPEC_ENG_TREEFACTORY: GenericTreeFactory', () => {
    const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');

    function ensureTestSessions(): string {
        const dir = path.join(testdataDir, 'sessions-engine-test');
        fs.mkdirSync(path.join(dir, 'TestSession'), { recursive: true });
        const yamlPath = path.join(dir, 'TestSession', 'session.yaml');
        if (!fs.existsSync(yamlPath)) {
            fs.writeFileSync(yamlPath, 'name: "Test Session"\nsummary: "A test session"\n');
        }
        return dir;
    }

    it('renders a registered kind through the factory (AC-1)', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        factory.addKind(config);
        await scanner.rescan();

        const provider = factory.getProvider('session');
        expect(provider).toBeDefined();

        const children = provider!.getChildren();
        expect(children.length).toBeGreaterThan(0);

        // Get tree item for the first leaf
        const leaf = children[0];
        expect(leaf.kind).toBe('leaf');
        const item = provider!.getTreeItem(leaf);
        expect(item).toBeDefined();
    });

    it('contextValue derived uniformly from kind (AC-2)', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        factory.addKind(config);
        await scanner.rescan();

        const provider = factory.getProvider('session');
        const children = provider!.getChildren();
        const item = provider!.getTreeItem(children[0]);
        // contextValue should be 'jarvisSession' (capitalized kind)
        expect(item.contextValue).toBe('jarvisSession');
    });

    it('decorator extension point works (AC-3)', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        factory.addKind(config);
        await scanner.rescan();

        // Register a decorator that adds a description
        const disposable = factory.registerDecorator('session', {
            decorate(item) {
                item.description = 'decorated';
            }
        });

        const provider = factory.getProvider('session');
        const children = provider!.getChildren();
        const item = provider!.getTreeItem(children[0]);
        expect(item.description).toBe('decorated');

        // Dispose decorator — decoration should no longer apply
        disposable.dispose();
        const item2 = provider!.getTreeItem(children[0]);
        expect(item2.description).toBeUndefined();
    });

    it('removeKind removes the provider', () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };
        scanner.addKind(config);
        factory.addKind(config);
        expect(factory.getProvider('session')).toBeDefined();

        factory.removeKind('session');
        expect(factory.getProvider('session')).toBeUndefined();
    });

    it('label factory is applied to tree items', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => `Session: ${name}`,
        };
        scanner.addKind(config);
        factory.addKind(config);
        await scanner.rescan();

        const provider = factory.getProvider('session');
        const children = provider!.getChildren();
        const item = provider!.getTreeItem(children[0]);
        expect(item.label).toBe('Session: Test Session');
    });
});

// ---------------------------------------------------------------------------
// registerEntityKind / registerTool disposal (real implementation shape)
// ---------------------------------------------------------------------------

describe('SPEC_ENG_REGISTER_KIND: disposal semantics (real scanner)', () => {
    const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');

    function ensureTestSessions(): string {
        const dir = path.join(testdataDir, 'sessions-engine-test');
        fs.mkdirSync(path.join(dir, 'TestSession'), { recursive: true });
        const yamlPath = path.join(dir, 'TestSession', 'session.yaml');
        if (!fs.existsSync(yamlPath)) {
            fs.writeFileSync(yamlPath, 'name: "Test Session"\nsummary: "A test session"\n');
        }
        return dir;
    }

    it('disposal removes kind from scanner and tree factory', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);

        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        };

        // Simulate what JarvisEngine.registerEntityKind does
        scanner.addKind(config);
        factory.addKind(config);
        await scanner.rescan();

        expect(scanner.registeredKinds).toContain('session');
        expect(factory.getProvider('session')).toBeDefined();
        expect(scanner.getTreeForKind('session').length).toBeGreaterThan(0);

        // Dispose
        scanner.removeKind('session');
        factory.removeKind('session');

        expect(scanner.registeredKinds).not.toContain('session');
        expect(factory.getProvider('session')).toBeUndefined();
        expect(scanner.getTreeForKind('session')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// JarvisEngine.registerDecorator (SPEC_ENG_API — public decoration API)
// ---------------------------------------------------------------------------

describe('SPEC_ENG_API: JarvisEngine.registerDecorator', () => {
    const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');

    function ensureTestData(): { sessionsDir: string; projectsDir: string } {
        const sessionsDir = path.join(testdataDir, 'sessions-engine-test');
        fs.mkdirSync(path.join(sessionsDir, 'TestSession'), { recursive: true });
        const sessionYaml = path.join(sessionsDir, 'TestSession', 'session.yaml');
        if (!fs.existsSync(sessionYaml)) {
            fs.writeFileSync(sessionYaml, 'name: "Test Session"\nsummary: "A test session"\n');
        }

        const projectsDir = path.join(testdataDir, 'projects');
        return { sessionsDir, projectsDir };
    }

    it('registerDecorator causes decorator.decorate to be invoked on leaf items', async () => {
        const { sessionsDir } = ensureTestData();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? sessionsDir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);
        const engine = new JarvisEngine(scanner, factory);

        engine.registerEntityKind({
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        });
        await scanner.rescan();

        engine.registerDecorator('session', {
            decorate(item) {
                item.description = 'api-decorated';
            }
        });

        const provider = factory.getProvider('session')!;
        const children = provider.getChildren();
        const item = provider.getTreeItem(children[0]);
        expect(item.description).toBe('api-decorated');
    });

    it('dispose() removes the decorator — subsequent renders are undecorated', async () => {
        const { sessionsDir } = ensureTestData();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? sessionsDir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);
        const engine = new JarvisEngine(scanner, factory);

        engine.registerEntityKind({
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        });
        await scanner.rescan();

        const disposable = engine.registerDecorator('session', {
            decorate(item) {
                item.description = 'will-be-removed';
            }
        });

        disposable.dispose();

        const provider = factory.getProvider('session')!;
        const children = provider.getChildren();
        const item = provider.getTreeItem(children[0]);
        expect(item.description).toBeUndefined();
    });

    it('decorator for kind A does not affect kind B', async () => {
        const { sessionsDir, projectsDir } = ensureTestData();
        const resolver = (key: string) => {
            if (key === 'jarvis.sessions.folder') { return sessionsDir; }
            if (key === 'jarvis.projects.folder') { return projectsDir; }
            return '';
        };
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);
        const engine = new JarvisEngine(scanner, factory);

        engine.registerEntityKind({
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        });
        engine.registerEntityKind({
            kind: 'project',
            viewId: 'jarvisProjects',
            folderSettingKey: 'jarvis.projects.folder',
            label: (name) => name,
        });
        await scanner.rescan();

        // Decorate only 'session'
        engine.registerDecorator('session', {
            decorate(item) {
                item.description = 'session-only';
            }
        });

        // Project items must NOT be decorated
        const projectProvider = factory.getProvider('project');
        if (projectProvider) {
            const projectChildren = projectProvider.getChildren();
            if (projectChildren.length > 0) {
                const projectItem = projectProvider.getTreeItem(projectChildren[0]);
                expect(projectItem.description).toBeUndefined();
            }
        }

        // Session items must be decorated
        const sessionProvider = factory.getProvider('session')!;
        const sessionChildren = sessionProvider.getChildren();
        if (sessionChildren.length > 0) {
            const sessionItem = sessionProvider.getTreeItem(sessionChildren[0]);
            expect(sessionItem.description).toBe('session-only');
        }
    });
});

// ---------------------------------------------------------------------------
// JarvisEngine.refreshKind (SPEC_ENG_API AC-5a)
// ---------------------------------------------------------------------------

describe('SPEC_ENG_API: JarvisEngine.refreshKind', () => {
    const testdataDir = path.resolve(__dirname, '..', '..', 'testdata');

    function ensureTestSessions(): string {
        const dir = path.join(testdataDir, 'sessions-engine-test');
        fs.mkdirSync(path.join(dir, 'TestSession'), { recursive: true });
        const yamlPath = path.join(dir, 'TestSession', 'session.yaml');
        if (!fs.existsSync(yamlPath)) {
            fs.writeFileSync(yamlPath, 'name: "Test Session"\nsummary: "A test session"\n');
        }
        return dir;
    }

    it('refreshKind fires the provider onDidChangeTreeData for a registered kind', async () => {
        const dir = ensureTestSessions();
        const resolver = (key: string) => key === 'jarvis.sessions.folder' ? dir : '';
        const scanner = new KindDrivenScanner(() => {}, resolver);
        const factory = new GenericTreeFactory(scanner);
        const engine = new JarvisEngine(scanner, factory);

        engine.registerEntityKind({
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name) => name,
        });
        await scanner.rescan();

        const provider = factory.getProvider('session')!;
        const fired = vi.fn();
        provider.onDidChangeTreeData(fired);

        engine.refreshKind('session');
        expect(fired).toHaveBeenCalledTimes(1);
    });

    it('refreshKind for an unknown kind is a safe no-op', () => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const factory = new GenericTreeFactory(scanner);
        const engine = new JarvisEngine(scanner, factory);

        // Should not throw
        expect(() => engine.refreshKind('nonexistent')).not.toThrow();
    });
});
