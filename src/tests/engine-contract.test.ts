/**
 * Engine contract unit tests (S0+S1).
 *
 * Validates SPEC_ENG_API, SPEC_ENG_REGISTER_KIND, SPEC_ENG_REGISTER_TOOL,
 * REQ_ENG_CONTRACT, REQ_ENG_TOOLNS via a minimal mock implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { EntityKindConfig, JarvisCoreApi, ToolHandler, TreeItemDecorator } from '../../packages/core/src/engine/types';

// --- Minimal mock engine implementation for contract verification -----------

function createMockEngine(): JarvisCoreApi {
    const kinds = new Map<string, EntityKindConfig>();
    const tools = new Map<string, { description: string; handler: ToolHandler }>();

    return {
        version: 1,

        registerEntityKind(config: EntityKindConfig) {
            kinds.set(config.kind, config);
            return { dispose: () => { kinds.delete(config.kind); } };
        },

        registerTool(name: string, description: string, handler: ToolHandler) {
            if (!name.startsWith('jarvis_')) {
                throw new Error(`Tool name must start with 'jarvis_', got: '${name}'`);
            }
            if (tools.has(name)) {
                throw new Error(`Tool '${name}' is already registered`);
            }
            tools.set(name, { description, handler });
            return { dispose: () => { tools.delete(name); } };
        },

        registerDecorator(_kind: string, _decorator: TreeItemDecorator) {
            return { dispose: () => {} };
        },
    };
}

// --- Tests ------------------------------------------------------------------

describe('SPEC_ENG_API: JarvisCoreApi contract', () => {
    let engine: JarvisCoreApi;

    beforeEach(() => {
        engine = createMockEngine();
    });

    it('version is the literal 1', () => {
        expect(engine.version).toBe(1);
    });

    it('registerEntityKind returns a Disposable', () => {
        const config: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name: string) => name,
        };
        const disposable = engine.registerEntityKind(config);
        expect(disposable).toBeDefined();
        expect(typeof disposable.dispose).toBe('function');
    });

    it('registerEntityKind disposal removes the kind', () => {
        const config: EntityKindConfig = {
            kind: 'project',
            viewId: 'jarvisProjects',
            folderSettingKey: 'jarvis.projects.folder',
            label: (name: string) => `Project: ${name}`,
        };
        const disposable = engine.registerEntityKind(config);
        // Re-registering same kind succeeds (overwrite)
        const disposable2 = engine.registerEntityKind(config);
        disposable2.dispose();
        // Can register again after disposal
        const disposable3 = engine.registerEntityKind(config);
        expect(typeof disposable3.dispose).toBe('function');
        disposable.dispose();
        disposable3.dispose();
    });
});

describe('SPEC_ENG_REGISTER_TOOL: registerTool validation', () => {
    let engine: JarvisCoreApi;
    const dummyHandler: ToolHandler = async () => ({ content: [] } as any);

    beforeEach(() => {
        engine = createMockEngine();
    });

    it('accepts names starting with jarvis_', () => {
        const disposable = engine.registerTool('jarvis_listSessions', 'List sessions', dummyHandler);
        expect(disposable).toBeDefined();
        expect(typeof disposable.dispose).toBe('function');
    });

    it('accepts pim-namespaced names (jarvis_pim_*)', () => {
        const disposable = engine.registerTool('jarvis_pim_listProjects', 'List projects', dummyHandler);
        expect(typeof disposable.dispose).toBe('function');
    });

    it('accepts recorder-namespaced names (jarvis_rec_*)', () => {
        const disposable = engine.registerTool('jarvis_rec_startRecording', 'Start recording', dummyHandler);
        expect(typeof disposable.dispose).toBe('function');
    });

    it('rejects names not starting with jarvis_', () => {
        expect(() => engine.registerTool('listSessions', 'List sessions', dummyHandler))
            .toThrow(/must start with 'jarvis_'/);
    });

    it('rejects empty name', () => {
        expect(() => engine.registerTool('', 'Empty', dummyHandler))
            .toThrow(/must start with 'jarvis_'/);
    });

    it('rejects duplicate names', () => {
        engine.registerTool('jarvis_doThing', 'First', dummyHandler);
        expect(() => engine.registerTool('jarvis_doThing', 'Second', dummyHandler))
            .toThrow(/already registered/);
    });

    it('duplicate rejection leaves original intact (disposal still works)', () => {
        const original = engine.registerTool('jarvis_doThing', 'First', dummyHandler);
        expect(() => engine.registerTool('jarvis_doThing', 'Second', dummyHandler)).toThrow();
        // Original can still be disposed without error
        original.dispose();
        // After disposal, re-registration succeeds
        const fresh = engine.registerTool('jarvis_doThing', 'Third', dummyHandler);
        expect(typeof fresh.dispose).toBe('function');
    });

    it('disposal allows re-registration with same name', () => {
        const d = engine.registerTool('jarvis_tool1', 'Tool 1', dummyHandler);
        d.dispose();
        const d2 = engine.registerTool('jarvis_tool1', 'Tool 1 again', dummyHandler);
        expect(typeof d2.dispose).toBe('function');
    });
});
