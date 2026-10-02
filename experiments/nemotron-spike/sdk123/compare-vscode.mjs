// Compare the official SDK 1.2.3 pieces (assembled by ext-asm into the extension storage) with the copy VS Code ships:
// SDK JS inside resources/app/node_modules.asar, native pieces in %APPDATA%\Code\chatDictationRuntime\1.2.3.
// Usage: node compare-vscode.mjs <assembled sdk dir> [VS Code app dir]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const official = process.argv[2];
const appDir = process.argv[3] ?? 'C:\\Program Files\\Microsoft VS Code\\2242ebbb54\\resources\\app';
const runtime = path.join(process.env.APPDATA, 'Code', 'chatDictationRuntime', '1.2.3');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).replaceAll('\\', '/')]);

// --- read the SDK folder out of node_modules.asar
const asarPath = path.join(appDir, 'node_modules.asar');
const fd = fs.openSync(asarPath, 'r');
const head = Buffer.alloc(8); fs.readSync(fd, head, 0, 8, 0);
const headerSize = head.readUInt32LE(4);
const hb = Buffer.alloc(headerSize); fs.readSync(fd, hb, 0, headerSize, 8);
const header = JSON.parse(hb.toString('utf8', 8, 8 + hb.readUInt32LE(4)));
const base = 8 + headerSize;
const sdkNode = header.files['foundry-local-sdk'];
const vscodeFiles = new Map();
(function collect(node, prefix) {
    for (const [name, n] of Object.entries(node.files ?? {})) {
        const p = prefix ? `${prefix}/${name}` : name;
        if (n.files) { collect(n, p); continue; }
        let buf;
        if (n.unpacked) { buf = fs.readFileSync(path.join(appDir, 'node_modules.asar.unpacked', 'foundry-local-sdk', p)); }
        else { buf = Buffer.alloc(n.size); fs.readSync(fd, buf, 0, n.size, base + Number(n.offset)); }
        vscodeFiles.set(p, { size: n.size, hash: sha(buf), buf });
    }
})(sdkNode ?? { files: {} }, '');
console.log(`VS Code bundles foundry-local-sdk in node_modules.asar: ${sdkNode ? vscodeFiles.size + ' files' : 'NOT FOUND'}`);
const vsPkg = vscodeFiles.get('package.json'); if (vsPkg) { const j = JSON.parse(vsPkg.buf.toString()); console.log(`  VS Code SDK package.json: name=${j.name} version=${j.version} main=${j.main}`); }

// --- JS and metadata files
const offFiles = walk(official).filter(f => f.startsWith('dist/') || ['package.json', 'deps_versions.json', 'LICENSE.txt'].includes(f));
let same = 0; const diff = [], missing = [];
for (const f of offFiles) {
    const o = fs.readFileSync(path.join(official, f)); const v = vscodeFiles.get(f);
    if (!v) { missing.push(f); } else if (sha(o) === v.hash) { same++; } else { diff.push({ f, official: o.length, vscode: v.size }); }
}
const onlyVs = [...vscodeFiles.keys()].filter(f => (f.startsWith('dist/') || ['package.json', 'deps_versions.json', 'LICENSE.txt'].includes(f)) && !offFiles.includes(f));
console.log(`SDK JS/metadata: official ${offFiles.length} files; identical ${same}; different ${diff.length}; missing in VS Code ${missing.length}; only in VS Code ${onlyVs.length}`);
diff.forEach(d => console.log(`  DIFFERENT ${d.f}: official ${d.official} B, VS Code ${d.vscode} B`));
for (const d of diff) {
    const a = fs.readFileSync(path.join(official, d.f), 'utf8').split(/\r?\n/), b = vscodeFiles.get(d.f).buf.toString('utf8').split(/\r?\n/);
    const onlyO = a.filter(l => !b.includes(l)), onlyV = b.filter(l => !a.includes(l));
    if (process.env.SHOWDIFF) { console.log(`--- ${d.f}\n  only official (${onlyO.length}): ${onlyO.slice(0, 3).map(l => l.trim().slice(0, 110)).join(' | ')}\n  only VS Code (${onlyV.length}): ${onlyV.slice(0, 12).map(l => l.trim().slice(0, 130)).join(' | ')}`); }
}
missing.forEach(f => console.log(`  not in VS Code: ${f}`)); onlyVs.forEach(f => console.log(`  only in VS Code: ${f}`));
const listOther = [...vscodeFiles.keys()].filter(f => !f.startsWith('dist/') && !['package.json', 'deps_versions.json', 'LICENSE.txt'].includes(f));
console.log(`  other files VS Code keeps in that folder: ${listOther.join(', ') || '-'}`);

// --- native pieces vs chatDictationRuntime
const pairs = [['prebuilds/win32-x64/foundry_local_napi.node', 'prebuilds/win32-x64/foundry_local_napi.node']];
for (const f of fs.readdirSync(path.join(official, 'foundry-local-core', 'win32-x64'))) { if (f !== 'package.json') { pairs.push([`foundry-local-core/win32-x64/${f}`, `foundry-local-core/win32-x64/${f}`]); } }
for (const [o, r] of pairs) {
    const op = path.join(official, o), rp = path.join(runtime, r);
    if (!fs.existsSync(rp)) { console.log(`  native ${o}: official ${fs.statSync(op).size} B; NOT in VS Code runtime`); continue; }
    const same2 = sha(fs.readFileSync(op)) === sha(fs.readFileSync(rp));
    console.log(`  native ${o}: ${same2 ? 'IDENTICAL' : 'DIFFERENT'} (official ${fs.statSync(op).size} B, VS Code runtime ${fs.statSync(rp).size} B)`);
}
const rtFiles = walk(runtime).filter(f => !f.startsWith('.'));
const extra = rtFiles.filter(f => !pairs.some(([, r]) => r === f));
console.log(`  files in VS Code runtime not in the official set: ${extra.join(', ') || '-'}`);
