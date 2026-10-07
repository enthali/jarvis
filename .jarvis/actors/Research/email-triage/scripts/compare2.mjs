// Throwaway PoC, step 3: more folder mails per project, auto-replies filtered by rule, fused docs+mails rankings, optional labels.
// Output: markdown file OUTSIDE the repo (contains mail subjects). Vectors in RAM only.
// Usage: node compare2.mjs [--per-folder=30] [--top=3] [--out=C:\workspace\jarvis-email-poc-out] [--labels=<labels.json>]
// labels.json: { "MM-DD HH:mm|first 30 chars of subject": ["Project", ...] | ["none"] | null } ; null = hard to say, skipped
import fs from 'node:fs';
import path from 'node:path';
import { embed, buildIndex, prepareMail, pwsh, q, ms, now, dot, HERE, PANTHEON, MODEL } from './run.mjs';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3) || d;
const PER_FOLDER = Number(arg('per-folder', 30));
const TOP = Number(arg('top', 3));
const OUT_DIR = arg('out', 'C:\\workspace\\jarvis-email-poc-out');
const LABELS = arg('labels', path.join(OUT_DIR, 'labels.json'));
const ALIASES = { 'Project XC AIDV': ['Project AIDV'], 'Project CRAFT': ['Project-CRAFT'] };
const MODES = ['docs', 'mails', 'mails3', 'fuse', 'rrf'];
const AUTO = /^\s*((re|aw|wg|fw|fwd)\s*:\s*)*(automatic reply|automatische antwort|auto-?reply|out of office|abwesenheits)/i;
const RRF_K = 10;
const labels = fs.existsSync(LABELS) ? JSON.parse(fs.readFileSync(LABELS, 'utf8')) : {};

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const z = a => { const m = mean(a), sd = Math.sqrt(mean(a.map(x => (x - m) ** 2))) || 1; return a.map(x => (x - m) / sd); };

function rankAll(projects, qv) {
  const rows = projects.map(p => {
    const d = Math.max(...p.items.filter(s => s.kind === 'doc').map(s => dot(s.vec, qv)));
    const ms_ = p.items.filter(s => s.kind === 'mail').map(s => ({ s, sim: dot(s.vec, qv) })).sort((a, b) => b.sim - a.sim);
    return { name: p.name, d, m: ms_[0]?.sim ?? null, m3: ms_.length ? mean(ms_.slice(0, 3).map(x => x.sim)) : null, via: ms_[0]?.s };
  });
  const withMail = rows.filter(r => r.m !== null);
  const zd = z(rows.map(r => r.d)); const zm = z(withMail.map(r => r.m));
  rows.forEach((r, i) => { r.zd = zd[i]; r.zm = r.m === null ? 0 : zm[withMail.indexOf(r)]; });
  const rankOf = (arr, key) => { const o = [...arr].sort((a, b) => b[key] - a[key]); return new Map(o.map((r, i) => [r.name, i + 1])); };
  const rd = rankOf(rows, 'd'), rm = rankOf(withMail, 'm');
  const sorted = (key, list = rows) => list.map(r => ({ name: r.name, score: key(r) })).sort((a, b) => b.score - a.score);
  return {
    docs: sorted(r => r.d),
    mails: withMail.map(r => ({ name: r.name, score: r.m, via: r.via })).sort((a, b) => b.score - a.score),
    mails3: sorted(r => r.m3, withMail),
    fuse: sorted(r => r.zd + r.zm),
    rrf: sorted(r => 1 / (RRF_K + rd.get(r.name)) + (rm.has(r.name) ? 1 / (RRF_K + rm.get(r.name)) : 0)),
  };
}

const t0 = now();
const idx = await buildIndex();
console.log(`Model ${MODEL}; docs index: ${idx.projects.length} projects, ${idx.sectionCount} sections, ${ms(idx.total)}`);
for (const p of idx.projects) p.items = p.sections.map(s => ({ kind: 'doc', vec: s.vec }));

let tm = now(); const added = {}; const toEmbed = []; let skippedAuto = 0;
for (const p of idx.projects) {
  const folders = [p.name, ...(ALIASES[p.name] ?? [])];
  const raw = folders.flatMap(f => pwsh(path.join(HERE, 'read-folder.ps1'), `-Folder ${q(f)} -Top ${PER_FOLDER + 10}`))
    .sort((a, b) => b.ReceivedTime.localeCompare(a.ReceivedTime));
  const mails = raw.filter(m => !AUTO.test(m.Subject ?? '')).slice(0, PER_FOLDER);
  skippedAuto += raw.slice(0, PER_FOLDER + 10).filter(m => AUTO.test(m.Subject ?? '')).length;
  for (const m of mails) toEmbed.push({ p, subject: (m.Subject ?? '').replace(/^\s*((re|aw|wg|fw|fwd)\s*:\s*)+/i, '').trim(), date: m.ReceivedTime.slice(5, 10), text: prepareMail(m.Subject, m.Body) });
  added[p.name] = mails.length;
}
const readMs = now() - tm; tm = now();
const { vectors } = await embed(toEmbed.map(e => e.text));
toEmbed.forEach((e, i) => e.p.items.push({ kind: 'mail', subject: e.subject, date: e.date, vec: vectors[i] }));
console.log(`Folder mails: ${toEmbed.length} (auto-replies skipped: ${skippedAuto}) read in ${ms(readMs)}, embedded in ${ms(now() - tm)}`);

const list = pwsh(`${PANTHEON}\\get-mail.ps1`, `-Top ${arg('inbox', 20)} -Days 3650`);
const lines = [`# Mail triage PoC step 3 (${MODEL}) - ${new Date().toISOString().slice(0, 16)}`, '',
  `Docs ${idx.sectionCount} sections; folder mails ${toEmbed.length} (newest ${PER_FOLDER} per folder, auto-replies skipped by subject rule). Modes: docs = max over actor.yaml/context sections; mails = best single folder mail; mails3 = mean of the 3 best folder mails per project; fuse = z(docs)+z(mails) over projects; rrf = reciprocal rank fusion docs+mails (k=${RRF_K}). Auto-reply inbox mails are not ranked.`, '',
  'Mails per project: ' + Object.entries(added).map(([k, v]) => `${k} (${v})`).join(', '), ''];
const stats = Object.fromEntries(MODES.map(m => [m, { n: 0, top1: 0, top3: 0 }])); const noneStats = Object.fromEntries(MODES.map(m => [m, []]));
let unlabeled = 0, hard = 0, autoMails = 0;
for (const [k, m] of list.entries()) {
  const key = `${m.ReceivedTime.slice(5, 16).replace('T', ' ')}|${m.Subject ?? ''}`;
  const head = `#${k + 1}  ${m.ReceivedTime.slice(5, 16).replace('T', ' ')}  ${(m.Subject ?? '').slice(0, 90)}`;
  if (AUTO.test(m.Subject ?? '')) { autoMails++; lines.push(`## ${head}`, '', 'Auto-reply: skipped by rule, not ranked.', ''); console.log(`\n${head}\n   auto-reply: skipped by rule`); continue; }
  const full = pwsh(`${PANTHEON}\\get-mail-by-id.ps1`, m.MessageId ? `-MessageId ${q(m.MessageId)} -Mailbox ${q(m.Mailbox)}` : `-EntryId ${q(m.EntryId)} -StoreId ${q(m.StoreId)}`)[0];
  const qv = (await embed([prepareMail(m.Subject, full.Body)])).vectors[0];
  const r = rankAll(idx.projects, qv);
  const lk = Object.keys(labels).find(l => key.startsWith(l)); const hasLabel = lk !== undefined;
  const lab = hasLabel ? labels[lk] : undefined; const target = Array.isArray(lab) ? lab : null;
  const isNone = target && target.length === 1 && target[0] === 'none';
  if (!hasLabel) unlabeled++; else if (lab === null) hard++;
  const mark = (mode, i) => target && !isNone && target.includes(r[mode][i]?.name) ? ' [ok]' : '';
  lines.push(`## ${head}`, '', `Label: ${hasLabel ? (lab === null ? 'hard to say' : lab.join(' / ')) : 'none given'}`, '', `| rank | ${MODES.join(' | ')} |`, `|---|${MODES.map(() => '---').join('|')}|`);
  for (let i = 0; i < TOP; i++) lines.push(`| ${i + 1} | ${MODES.map(mode => r[mode][i] ? `${r[mode][i].name} ${r[mode][i].score.toFixed(3)}${mark(mode, i)}` : '').join(' | ')} |`);
  lines.push(`| best mail | | ${r.mails[0].via ? `${r.mails[0].via.date}: ${r.mails[0].via.subject.slice(0, 50)}` : ''} | | | |`, '');
  console.log(`\n${head}   label: ${hasLabel ? (lab === null ? 'hard' : lab.join(' / ')) : '-'}`);
  for (const mode of MODES) console.log(`   ${mode.padEnd(6)} ${r[mode].slice(0, TOP).map((x, i) => `${x.name} ${x.score.toFixed(3)}${mark(mode, i)}`).join('  |  ')}`);
  for (const mode of MODES) {
    if (isNone) noneStats[mode].push(r[mode][0].score);
    else if (target) { stats[mode].n++; if (target.includes(r[mode][0].name)) stats[mode].top1++; if (r[mode].slice(0, 3).some(x => target.includes(x.name))) stats[mode].top3++; }
  }
}
lines.push('## Summary against labels', '', `Labeled mails with a target: ${stats.docs.n}; "none" mails: ${noneStats.docs.length}; hard: ${hard}; auto-replies skipped: ${autoMails}; unlabeled: ${unlabeled}.`, '', '| mode | top1 | top3 | top1 score of "none" mails (min-max) |', '|---|---|---|---|');
for (const mode of MODES) { const s = stats[mode]; const n = noneStats[mode]; lines.push(`| ${mode} | ${s.top1}/${s.n} | ${s.top3}/${s.n} | ${n.length ? `${Math.min(...n).toFixed(2)}-${Math.max(...n).toFixed(2)}` : ''} |`); }
console.log('\n' + lines.slice(lines.indexOf('## Summary against labels')).join('\n'));
fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `compare2-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`\nTotal ${ms(now() - t0)}. Written: ${file}`);
