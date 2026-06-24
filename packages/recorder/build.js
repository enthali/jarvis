// Bundles the Jarvis Recorder add-on into a single out/extension.js.
// Recorder has no npm production dependencies beyond the workspace peer (jarvis-core),
// which is provided at runtime by the VS Code extension host. Bundling ensures
// the VSIX is self-contained and avoids hoisted-dep path issues in the
// npm-workspaces monorepo when packaged with `vsce package --no-dependencies`.

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'out', 'extension.js'),
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
