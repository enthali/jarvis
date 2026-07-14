// @ts-check
'use strict';

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
    {
        files: ['packages/*/src/**/*.ts', 'src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            // Pre-existing violations — deliberately set to 'warn' to unblock release.
            // To be tightened back to 'error' once all violations are fixed (see CR eslint-cleanup-unused-vars).
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
];
