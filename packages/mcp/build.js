// Bundles the Jarvis MCP extension into a single out/extension.js so the
// @modelcontextprotocol/sdk runtime dependency is inlined and the package can be
// built with `vsce package --no-dependencies` inside the npm-workspaces monorepo.
// `vscode` is always provided by the host; `jarvis` is imported type-only (erased
// at compile), so neither needs bundling.

const esbuild = require('esbuild');
const path = require('path');

const options = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'out', 'extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

esbuild.build(options).catch((e) => { console.error(e); process.exit(1); });
