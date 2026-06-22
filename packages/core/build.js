// Bundles the Jarvis core extension into a single out/extension.js.
// Rationale: in the npm-workspaces monorepo, vsce cannot collect hoisted
// production deps (they resolve to ../../node_modules and are rejected). Bundling
// inlines cron-parser, js-yaml and sql.js so the extension ships as one file and
// can be packaged with `vsce package --no-dependencies`.
//
// sql.js loads a WebAssembly binary (sql-wasm.wasm) at runtime. esbuild does not
// carry that .wasm automatically, so we copy it next to the bundle and the source
// passes a `locateFile` that resolves to it (see engine/sessionLookup.ts).

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const outdir = path.join(__dirname, 'out');

function copySqlWasm() {
    const src = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    const dest = path.join(outdir, 'sql-wasm.wasm');
    fs.mkdirSync(outdir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[esbuild] copied sql-wasm.wasm -> ${path.relative(__dirname, dest)}`);
}

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
    if (watch) {
        const ctx = await esbuild.context(options);
        copySqlWasm();
        await ctx.watch();
        console.log('[esbuild] watching…');
    } else {
        await esbuild.build(options);
        copySqlWasm();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
