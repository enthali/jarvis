// Bundles the Jarvis legacy migration shim into out/extension.js.
// Implementation: SPEC_REL_COREGH, SPEC_REL_PKGCONTRACT

const esbuild = require('esbuild');
const path = require('path');

/** @type {import('esbuild').BuildOptions} */
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

async function main() {
    await esbuild.build(options);
}

main().catch((e) => { console.error(e); process.exit(1); });
