// Throwaway PoC, step 2: add the newest mails of each project folder as extra vectors per project.
// Compares three rankings for the 20 newest inbox mails: docs only / folder mails only / both (best single vector wins).
// Output goes to a markdown file OUTSIDE the repo (it contains mail subjects); vectors live in RAM only.
// Usage: node compare.mjs [--per-folder=10] [--top=3] [--out=C:\workspace\jarvis-email-poc-out]
import fs from 'node:fs';
import path from 'node:path';
import { embed, buildIndex, prepareMail, pwsh, q, ms, now, dot, HERE, PANTHEON, MODEL } from './run.mjs';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3) || d;
const PER_FOLDER = Number(arg('per-folder', 10));
const TOP = Number(arg('top', 3));
const OUT_DIR = arg('out', 'C:\\workspace\\jarvis-email-poc-out');
const ALIASES = { 'Project XC AIDV': ['Project AIDV'], 'Project CRAFT': ['Project-CRAFT'] };
const MODES = ['docs', 'mails', 'both'];

function score(p, qv, mode) {
  let best = null;
  for (const s of p.items) {
    if (mode === 'docs' && s.kind !== 'doc') continue;
    if (mode === 'mails' && s.kind !== 'mail') continue;
    const sim = dot(s.vec, qv);
    if (!best || sim > best.score) best = { score: sim, via: s };
  }
  return best;
}
function rankBy(projects, qv, mode) {
  return projects.map(p => ({ name: p.name, ...score(p, qv, mode) })).filter(x => x.via).sort((a, b) => b.score - a.score);
}
const viaText = x => x.via.kind === 'doc' ? `doc: ${x.via.heading || 'context'}`.slice(0, 40) : `mail ${x.via.date}: ${x.via.subject}`.slice(0, 60);

const t0 = now();
const idx = await buildIndex();
console.log(`Model ${MODEL}; docs index: ${idx.projects.length} projects, ${idx.sectionCount} sections, ${ms(idx.total)}`);
for (const p of idx.projects) p.items = p.sections.map(s => ({ kind: 'doc', heading: s.heading, vec: s.vec }));

// folder mails -> extra vectors
let tm = now(); const added = {}; const toEmbed = [];
for (const p of idx.projects) {
  const folders = [p.name, ...(ALIASES[p.name] ?? [])];
  const mails = folders.flatMap(f => pwsh(path.join(HERE, 'read-folder.ps1'), `-Folder ${q(f)} -Top ${PER_FOLDER}`))
    .sort((a, b) => b.ReceivedTime.localeCompare(a.ReceivedTime)).slice(0, PER_FOLDER);
  for (const m of mails) toEmbed.push({ p, subject: (m.Subject ?? '').replace(/^\s*((re|aw|wg|fw|fwd)\s*:\s*)+/i, '').trim(), date: m.ReceivedTime.slice(5, 10), text: prepareMail(m.Subject, m.Body) });
  added[p.name] = mails.length;
}
const readMs = now() - tm; tm = now();
const { vectors } = await embed(toEmbed.map(e => e.text));
toEmbed.forEach((e, i) => e.p.items.push({ kind: 'mail', subject: e.subject, date: e.date, vec: vectors[i] }));
console.log(`Folder mails: ${toEmbed.length} read in ${ms(readMs)}, embedded in ${ms(now() - tm)}`);
console.log('Mails per project: ' + Object.entries(added).map(([k, v]) => `${k}=${v}`).join(', '));

// the 20 newest inbox mails
const list = pwsh(`${PANTHEON}\\get-mail.ps1`, '-Top 20 -Days 3650');
const lines = [`# Mail triage PoC step 2 (${MODEL}) - ${new Date().toISOString().slice(0, 16)}`, '', `Docs index ${idx.sectionCount} sections; folder mails ${toEmbed.length} (newest ${PER_FOLDER} per folder). Modes: docs = actor.yaml+context.md only, mails = folder mails only, both = best single vector. Score = cosine of the best vector.`, '', 'Mails per project: ' + Object.entries(added).map(([k, v]) => `${k} (${v})`).join(', '), ''];
const summary = [];
for (const [k, m] of list.entries()) {
  const full = pwsh(`${PANTHEON}\\get-mail-by-id.ps1`, m.MessageId ? `-MessageId ${q(m.MessageId)} -Mailbox ${q(m.Mailbox)}` : `-EntryId ${q(m.EntryId)} -StoreId ${q(m.StoreId)}`)[0];
  const qv = (await embed([prepareMail(m.Subject, full.Body)])).vectors[0];
  const r = Object.fromEntries(MODES.map(mode => [mode, rankBy(idx.projects, qv, mode)]));
  const head = `#${k + 1}  ${m.ReceivedTime.slice(5, 16).replace('T', ' ')}  ${(m.Subject ?? '').slice(0, 90)}`;
  lines.push(`## ${head}`, '', '| rank | docs | mails | both (via) |', '|---|---|---|---|');
  for (let i = 0; i < TOP; i++) {
    const c = mode => r[mode][i] ? `${r[mode][i].name} ${r[mode][i].score.toFixed(3)}` : '';
    lines.push(`| ${i + 1} | ${c('docs')} | ${c('mails')} | ${c('both')} (${r.both[i] ? viaText(r.both[i]) : ''}) |`);
  }
  lines.push(`| gap 1-2 | ${(r.docs[0].score - r.docs[1].score).toFixed(3)} | ${(r.mails[0].score - r.mails[1].score).toFixed(3)} | ${(r.both[0].score - r.both[1].score).toFixed(3)} |`, '');
  console.log(`\n${head}`);
  for (const mode of MODES) console.log(`   ${mode.padEnd(5)} ${r[mode].slice(0, TOP).map(x => `${x.name} ${x.score.toFixed(3)}`).join('  |  ')}   gap ${(r[mode][0].score - r[mode][1].score).toFixed(3)}`);
  summary.push(r.both[0].via.kind);
}
lines.push('', `Top1 of "both" came from: mail vector ${summary.filter(x => x === 'mail').length}x, doc vector ${summary.filter(x => x === 'doc').length}x.`);
fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `compare-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`\nTotal ${ms(now() - t0)}. Written: ${file}`);
