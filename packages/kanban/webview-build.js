// Bundles the Jarvis Kanban webview-side scripts (packages/kanban/webview/*.ts)
// into out/webview/*.js. No third-party dependency — follows the same
// bundling pattern as packages/flow for consistency and CSP compliance.

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
const baseOptions = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

const builds = [
    {
        ...baseOptions,
        entryPoints: [path.join(__dirname, 'webview', 'kanban.ts')],
        outfile: path.join(__dirname, 'out', 'webview', 'kanban.js'),
    },
];

Promise.all(builds.map(options => esbuild.build(options)))
    .catch((e) => { console.error(e); process.exit(1); });
