// Bundles the Jarvis MCP add-on into a single out/extension.js.
// MCP has @modelcontextprotocol/sdk as a production dependency. In the
// npm-workspaces monorepo this dep is hoisted to the root node_modules, making
// `vsce package --no-dependencies` the only viable packaging strategy. Bundling
// inlines @modelcontextprotocol/sdk so the VSIX is fully self-contained.

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'out', 'extension.js'),
    // vscode is always provided by the host; jarvis-core is the workspace peer
    // acquired at runtime via vscode.extensions.getExtension('enthali.jarvis-core').
    // @modelcontextprotocol/sdk is bundled (inlined).
    external: ['vscode', 'jarvis-core'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

esbuild.build(options).catch((e) => { console.error(e); process.exit(1); });
