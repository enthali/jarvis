// Bundles the Jarvis Flow add-on's extension-host code into a single
// out/extension.js. Mirrors packages/recorder/build.js. jarvis-core is
// the workspace peer, acquired at runtime via
// vscode.extensions.getExtension('enthali.jarvis-core') — never bundled.

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'out', 'extension.js'),
    external: ['vscode', 'jarvis-core'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

esbuild.build(options).catch((e) => { console.error(e); process.exit(1); });
