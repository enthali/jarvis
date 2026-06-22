import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
    test: {
        include: ['src/tests/**/*.test.ts'],
        alias: {
            'vscode': path.resolve(__dirname, 'src/tests/__mocks__/vscode.ts'),
        },
    },
    resolve: {
        alias: {
            // Transitional aliases: engine and session moved to packages/core (S4b)
            '@engine': path.resolve(__dirname, 'packages/core/src/engine'),
            '@session': path.resolve(__dirname, 'packages/core/src/apps/session'),
        },
    },
});
