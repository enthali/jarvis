/**
 * Engine tool registry API unit tests (SPEC_ENG_TOOLREGISTRY).
 *
 * Validates: getRegisteredTools snapshot, invokeTool dispatch, invokeTool error on missing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import { GenericTreeFactory } from '../../packages/core/src/engine/core/treeFactory';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';
import { LanguageModelToolResult, LanguageModelTextPart } from '../tests/__mocks__/vscode';

describe('SPEC_ENG_TOOLREGISTRY: engine tool registry API', () => {
    let engine: JarvisEngine;

    beforeEach(() => {
        const scanner = new KindDrivenScanner(() => {}, () => '');
        const treeFactory = new GenericTreeFactory(scanner);
        engine = new JarvisEngine(scanner, treeFactory);
    });

    it('getRegisteredTools returns empty when no tools registered', () => {
        expect(engine.getRegisteredTools()).toEqual([]);
    });

    it('getRegisteredTools includes tool after registerTool', () => {
        const handler = vi.fn().mockResolvedValue(new LanguageModelToolResult([new LanguageModelTextPart('ok')]));
        engine.registerTool('jarvis_test', 'A test tool', handler);
        const tools = engine.getRegisteredTools();
        expect(tools).toEqual([{ name: 'jarvis_test', description: 'A test tool' }]);
    });

    it('getRegisteredTools reflects multiple tools', () => {
        const handler = vi.fn().mockResolvedValue(new LanguageModelToolResult([]));
        engine.registerTool('jarvis_alpha', 'Alpha', handler);
        engine.registerTool('jarvis_beta', 'Beta', handler);
        const names = engine.getRegisteredTools().map(t => t.name);
        expect(names).toContain('jarvis_alpha');
        expect(names).toContain('jarvis_beta');
    });

    it('getRegisteredTools excludes tool after disposal', () => {
        const handler = vi.fn().mockResolvedValue(new LanguageModelToolResult([]));
        const disposable = engine.registerTool('jarvis_gone', 'Gone', handler);
        disposable.dispose();
        expect(engine.getRegisteredTools()).toEqual([]);
    });

    it('invokeTool calls the handler and returns its result', async () => {
        const result = new LanguageModelToolResult([new LanguageModelTextPart('hello')]);
        const handler = vi.fn().mockResolvedValue(result);
        engine.registerTool('jarvis_echo', 'Echo tool', handler);

        const options = { toolInvocationToken: undefined, input: { text: 'hi' } } as any;
        const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() } as any;
        const actual = await engine.invokeTool('jarvis_echo', options, token);

        expect(handler).toHaveBeenCalledWith(options, token);
        expect(actual).toBe(result);
    });

    it('invokeTool throws for unregistered tool name', () => {
        const options = {} as any;
        const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() } as any;
        expect(() => engine.invokeTool('jarvis_missing', options, token))
            .toThrow("Tool 'jarvis_missing' is not registered");
    });
});
