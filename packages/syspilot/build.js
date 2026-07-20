// Bundles the Jarvis Syspilot add-on into a single out/extension.js.
// No production dependencies beyond the workspace peer (jarvis-core),
// which is provided at runtime by the VS Code extension host.

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
