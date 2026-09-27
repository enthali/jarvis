/**
 * Focused activation test for packages/flow (SPEC_MOD_FLOW_PKG,
 * REQ_MOD_ZEROTRACE): the core-API version guard must gate on the current
 * contract version (2), not the retired v1. On a matching version, both
 * jarvis.openMessageFlow and jarvis.openMessageLog are registered; on a
 * mismatch or absent core export, neither is registered and Flow logs an
 * error instead of activating.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../packages/flow/src/extension';

function makeContext(): vscode.ExtensionContext {
    return { subscriptions: [] } as unknown as vscode.ExtensionContext;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SPEC_MOD_FLOW_PKG / REQ_MOD_ZEROTRACE: core API version guard', () => {
    it('registers both jarvis.openMessageFlow and jarvis.openMessageLog when core reports version 2', () => {
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: { version: 2 } } as any);
        const registerSpy = vi.spyOn(vscode.commands, 'registerCommand');

        activate(makeContext());

        const registeredIds = registerSpy.mock.calls.map(call => call[0]);
        expect(registeredIds).toContain('jarvis.openMessageFlow');
        expect(registeredIds).toContain('jarvis.openMessageLog');
    });

    it('registers neither command and logs an error when core reports the retired version 1', () => {
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue({ exports: { version: 1 } } as any);
        const registerSpy = vi.spyOn(vscode.commands, 'registerCommand');
        const errorLog = vi.fn();
        vi.spyOn(vscode.window, 'createOutputChannel').mockReturnValue({ dispose: () => {}, info: () => {}, warn: () => {}, error: errorLog } as any);

        activate(makeContext());

        expect(registerSpy).not.toHaveBeenCalled();
        expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('version mismatch'));
    });

    it('registers neither command when the core extension export is absent', () => {
        vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(undefined);
        const registerSpy = vi.spyOn(vscode.commands, 'registerCommand');

        activate(makeContext());

        expect(registerSpy).not.toHaveBeenCalled();
    });
});
