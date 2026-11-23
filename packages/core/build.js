// Bundles the Jarvis core extension into a single out/extension.js.
// Rationale: in the npm-workspaces monorepo, vsce cannot collect hoisted
// production deps (they resolve to ../../node_modules and are rejected). Bundling
// inlines the runtime dependencies so the extension ships as one file and
// can be packaged with `vsce package --no-dependencies`.

const esbuild = require('esbuild');
const path = require('path');

const outdir = path.join(__dirname, 'out');

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(outdir, 'extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    minify: process.argv.includes('--minify'),
    logLevel: 'info',
};

async function main() {
    await esbuild.build(options);
}

main().catch((e) => { console.error(e); process.exit(1); });
