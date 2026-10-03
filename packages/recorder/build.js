// Bundles the Jarvis Recorder add-on into out/extension.js and the recognition worker into
// out/engineWorker.js (SPEC_REC_ENGINE). The recognition SDK is not bundled: the worker loads it
// at run time from the directory SPEC_REC_COMPONENTS prepares.
// Recorder has no npm production dependencies beyond the workspace peer (jarvis-core),
// which is provided at runtime by the VS Code extension host. Bundling ensures
// the VSIX is self-contained and avoids hoisted-dep path issues in the
// npm-workspaces monorepo when packaged with `vsce package --no-dependencies`.

const esbuild = require('esbuild');
const path = require('path');

// Only the two bundles ship: output of removed sources and tsc by-products are removed first.
require('./clean.js');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: {
        extension: path.join(__dirname, 'src', 'extension.ts'),
        engineWorker: path.join(__dirname, 'src', 'engineWorker.ts'),
    },
    bundle: true,
    outdir: path.join(__dirname, 'out'),
    // vscode is always provided by the host; jarvis-core is the workspace peer
    // acquired at runtime via vscode.extensions.getExtension('enthali.jarvis-core')
    external: ['vscode', 'jarvis-core'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

esbuild.build(options).catch((e) => { console.error(e); process.exit(1); });
