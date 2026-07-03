// Bundles the Jarvis Flow webview-side chord renderer (packages/flow/webview/chord.ts)
// into a single out/webview/chord.js. D3 is a devDependency bundled directly
// into this file (esbuild `bundle: true`, no `external`) — this is the
// "vendored locally" requirement (SPEC_FLOW_CHORDRENDER): the webview's CSP
// only allows scripts from its own resource root, never a CDN, and this
// single self-contained IIFE bundle satisfies that without a manual
// webview/vendor/d3.min.js copy.

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [path.join(__dirname, 'webview', 'chord.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'out', 'webview', 'chord.js'),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

esbuild.build(options).catch((e) => { console.error(e); process.exit(1); });
