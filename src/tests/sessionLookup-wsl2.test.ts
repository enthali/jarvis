/**
 * Unit tests for resolveUserDataPath (WSL2-aware resolution).
 * Validates SPEC_MSG_SESSIONLOOKUP WSL2 branch.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as path from 'path';

vi.mock('vscode', () => ({
    Uri: { file: (p: string) => ({ fsPath: p }) },
}));

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return { ...actual, readFileSync: vi.fn() };
});

import { readFileSync } from 'fs';
import { resolveUserDataPath } from '../../packages/core/src/engine/sessionLookup';

const mockedReadFileSync = vi.mocked(readFileSync);

describe('resolveUserDataPath', () => {
    const globalStorageUri = { fsPath: '/home/user/.vscode-server/data/User/globalStorage/enthali.jarvis' } as any;
    const expectedFallback = path.resolve(globalStorageUri.fsPath, '../..');
    const originalUsername = process.env.USERNAME;

    afterEach(() => {
        mockedReadFileSync.mockReset();
        if (originalUsername === undefined) {
            delete process.env.USERNAME;
        } else {
            process.env.USERNAME = originalUsername;
        }
    });

    it('returns WSL2 path when /proc/version contains "microsoft" and USERNAME is set', () => {
        mockedReadFileSync.mockReturnValue('Linux version 5.15.90.1-microsoft-standard-WSL2');
        process.env.USERNAME = 'georgdoll';

        const result = resolveUserDataPath(globalStorageUri);
        expect(result).toBe('/mnt/c/Users/georgdoll/AppData/Roaming/Code/User');
    });

    it('returns fallback path when /proc/version does NOT contain "microsoft"', () => {
        mockedReadFileSync.mockReturnValue('Linux version 5.15.0-generic (buildd@host)');

        const result = resolveUserDataPath(globalStorageUri);
        expect(result).toBe(expectedFallback);
    });

    it('returns fallback path when /proc/version is missing (throws)', () => {
        mockedReadFileSync.mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
        });

        const result = resolveUserDataPath(globalStorageUri);
        expect(result).toBe(expectedFallback);
    });

    it('returns fallback path when WSL2 detected but USERNAME is undefined', () => {
        mockedReadFileSync.mockReturnValue('Linux version 5.15.90.1-microsoft-standard-WSL2');
        delete process.env.USERNAME;

        const result = resolveUserDataPath(globalStorageUri);
        expect(result).toBe(expectedFallback);
    });
});
