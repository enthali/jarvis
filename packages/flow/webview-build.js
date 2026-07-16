// Bundles the Jarvis Flow webview-side scripts (packages/flow/webview/*.ts)
// each into their own single out/webview/*.js. D3 is a devDependency bundled
// directly into chord.js (esbuild `bundle: true`, no `external`) — this is
// the "vendored locally" requirement (SPEC_FLOW_CHORDRENDER): the webview's
// CSP only allows scripts from its own resource root, never a CDN, and this
// self-contained IIFE bundling satisfies that without a manual
// webview/vendor/d3.min.js copy. logviewer.ts (SPEC_FLOW_LOGVIEWER) has no
// third-party dependency but follows the same bundling pattern for
// consistency and CSP compliance.

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
        entryPoints: [path.join(__dirname, 'webview', 'chord.ts')],
        outfile: path.join(__dirname, 'out', 'webview', 'chord.js'),
    },
    {
        ...baseOptions,
        entryPoints: [path.join(__dirname, 'webview', 'logviewer.ts')],
        outfile: path.join(__dirname, 'out', 'webview', 'logviewer.js'),
    },
];

Promise.all(builds.map(options => esbuild.build(options)))
    .catch((e) => { console.error(e); process.exit(1); });
