// Bundles the Jarvis Kanban add-on's extension-host code into a single
// out/extension.js. Mirrors packages/flow/build.js. jarvis-core is
// the workspace peer, acquired at runtime via
// vscode.extensions.getExtension('enthali.jarvis-core') — never bundled.

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Prebuild: sync schema from monorepo root into package-local schemas/
const srcSchema = path.join(__dirname, '..', '..', 'schemas', 'kanban.schema.json');
const dstDir = path.join(__dirname, 'schemas');
const dstSchema = path.join(dstDir, 'kanban.schema.json');
fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(srcSchema, dstSchema);
console.log(`Copied schema → ${dstSchema}`);

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
