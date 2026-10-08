// Throwaway PoC, step 4: classes = ALL Outlook Inbox subfolders (project folders and Eisenhower folders alike), vectors = folder mails only.
// No project documents. Output: markdown file OUTSIDE the repo (contains mail subjects). Vectors in RAM only.
// Usage: node compare3.mjs [--per-folder=30] [--inbox=21] [--eisenhower="1 Sofort,2 Wichtig,3 Prüfen,4 Unwichtig"] [--out=...] [--labels=...]
import fs from 'node:fs';
import path from 'node:path';
import { embed, prepareMail, pwsh, q, ms, now, dot, HERE, PANTHEON, MODEL } from './run.mjs';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3) || d;
const PER_FOLDER = Number(arg('per-folder', 30));
const TOP = Number(arg('top', 3));
const OUT_DIR = arg('out', 'C:\\workspace\\jarvis-email-poc-out');
const LABELS = arg('labels', path.join(OUT_DIR, 'labels.json'));
const EIS = arg('eisenhower', '1 Sofort,2 Wichtig,3 Prüfen,4 Unwichtig').split(',').map(s => s.trim()).filter(Boolean);
const CANON = { 'Project AIDV': 'Project XC AIDV', 'Project-CRAFT': 'Project CRAFT' };
const AUTO = /^\s*((re|aw|wg|fw|fwd)\s*:\s*)*(automatic reply|automatische antwort|auto-?reply|out of office|abwesenheits)/i;
const MODES = ['mails3', 'mails', 'mails3-noEis', 'mails-noEis'];
const labels = fs.existsSync(LABELS) ? JSON.parse(fs.readFileSync(LABELS, 'utf8')) : {};
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

const t0 = now();
console.log(`Model ${MODEL}`);
const folders = pwsh(path.join(HERE, 'list-folders.ps1'), '');
console.log(`Inbox subfolders: ${folders.length} (${folders.filter(f => f.Count > 0).length} with mails)`);

// canonical class -> items
const classes = new Map(); const toEmbed = []; let skippedAuto = 0; let tm = now();
for (const f of folders) {
  if (!f.Count) continue;
  const name = CANON[f.Name] ?? f.Name;
  const raw = pwsh(path.join(HERE, 'read-folder.ps1'), `-Folder ${q(f.Name)} -Top ${PER_FOLDER + 10}`);
  const cls = classes.get(name) ?? { name, items: [], total: 0 }; classes.set(name, cls); cls.total += f.Count;
  const sorted = raw.sort((a, b) => b.ReceivedTime.localeCompare(a.ReceivedTime));
  const mails = sorted.filter(m => !AUTO.test(m.Subject ?? '')).slice(0, PER_FOLDER);
  skippedAuto += sorted.length - sorted.filter(m => !AUTO.test(m.Subject ?? '')).length;
  for (const m of mails) toEmbed.push({ cls, subject: (m.Subject ?? '').replace(/^\s*((re|aw|wg|fw|fwd)\s*:\s*)+/i, '').trim(), date: m.ReceivedTime.slice(5, 10), text: prepareMail(m.Subject, m.Body) });
}
const readMs = now() - tm; tm = now();
const { vectors } = await embed(toEmbed.map(e => e.text));
toEmbed.forEach((e, i) => e.cls.items.push({ subject: e.subject, date: e.date, vec: vectors[i] }));
const all = [...classes.values()].filter(c => c.items.length);
console.log(`Folder mails: ${toEmbed.length} in ${all.length} classes (auto-replies skipped: ${skippedAuto}) read in ${ms(readMs)}, embedded in ${ms(now() - tm)}`);
const missing = EIS.filter(n => !classes.has(n) || !classes.get(n).items.length);
if (missing.length) console.log(`WARNING: Eisenhower folders without mails/not found: ${missing.join(', ')}`);

function rankAll(qv) {
  const rows = all.map(c => {
    const sims = c.items.map(s => ({ s, sim: dot(s.vec, qv) })).sort((a, b) => b.sim - a.sim);
    return { name: c.name, m: sims[0].sim, m3: mean(sims.slice(0, 3).map(x => x.sim)), via: sims[0].s };
  });
  const by = (key, list) => list.map(r => ({ name: r.name, score: r[key], via: r.via })).sort((a, b) => b.score - a.score);
  const proj = rows.filter(r => !EIS.includes(r.name));
  return { mails3: by('m3', rows), mails: by('m', rows), 'mails3-noEis': by('m3', proj), 'mails-noEis': by('m', proj) };
}

const list = pwsh(`${PANTHEON}\\get-mail.ps1`, `-Top ${arg('inbox', 20)} -Days 3650`);
const lines = [`# Mail triage PoC step 4 (${MODEL}) - ${new Date().toISOString().slice(0, 16)}`, '',
  `Classes = all Inbox subfolders (${all.length}); vectors = newest ${PER_FOLDER} mails per folder (${toEmbed.length} total), no project documents. Eisenhower folders: ${EIS.join(', ')}. Modes: mails3 = mean of 3 best mails per class; mails = best single mail; "-noEis" = same vectors, Eisenhower classes left out of the ranking (paired baseline in the same run).`, '',
  'Mails per class: ' + all.map(c => `${c.name} (${c.items.length}/${c.total})`).join(', '), ''];
const st = Object.fromEntries(MODES.map(m => [m, { n: 0, top1: 0, top3: 0, none: 0, noneN: 0, lost: 0, eisAll: 0, ranked: 0 }]));
let unlabeled = 0, hard = 0, autoMails = 0;
for (const [k, m] of list.entries()) {
  const key = `${m.ReceivedTime.slice(5, 16).replace('T', ' ')}|${m.Subject ?? ''}`;
  const head = `#${k + 1}  ${m.ReceivedTime.slice(5, 16).replace('T', ' ')}  ${(m.Subject ?? '').slice(0, 90)}`;
  if (AUTO.test(m.Subject ?? '')) { autoMails++; lines.push(`## ${head}`, '', 'Auto-reply: skipped by rule, not ranked.', ''); console.log(`\n${head}\n   auto-reply: skipped by rule`); continue; }
  const full = pwsh(`${PANTHEON}\\get-mail-by-id.ps1`, m.MessageId ? `-MessageId ${q(m.MessageId)} -Mailbox ${q(m.Mailbox)}` : `-EntryId ${q(m.EntryId)} -StoreId ${q(m.StoreId)}`)[0];
  const r = rankAll((await embed([prepareMail(m.Subject, full.Body)])).vectors[0]);
  const lk = Object.keys(labels).find(l => key.startsWith(l)); const hasLabel = lk !== undefined;
  const lab = hasLabel ? labels[lk] : undefined; const target = Array.isArray(lab) ? lab : null;
  const isNone = !!target && target.length === 1 && target[0] === 'none';
  if (!hasLabel) unlabeled++; else if (lab === null) hard++;
  const mark = (mode, i) => target && !isNone && target.includes(r[mode][i]?.name) ? ' [ok]' : (isNone && EIS.includes(r[mode][i]?.name) && i === 0 ? ' [none->Eisenhower]' : '');
  lines.push(`## ${head}`, '', `Label: ${hasLabel ? (lab === null ? 'hard to say' : lab.join(' / ')) : 'none given'}`, '', `| rank | ${MODES.join(' | ')} |`, `|---|${MODES.map(() => '---').join('|')}|`);
  for (let i = 0; i < TOP; i++) lines.push(`| ${i + 1} | ${MODES.map(mode => r[mode][i] ? `${r[mode][i].name} ${r[mode][i].score.toFixed(3)}${mark(mode, i)}` : '').join(' | ')} |`);
  lines.push(`| best mail (mails3) | ${r.mails3[0].via.date}: ${r.mails3[0].via.subject.slice(0, 50)} | | | |`, '');
  console.log(`\n${head}   label: ${hasLabel ? (lab === null ? 'hard' : lab.join(' / ')) : '-'}`);
  for (const mode of MODES) console.log(`   ${mode.padEnd(13)} ${r[mode].slice(0, TOP).map((x, i) => `${x.name} ${x.score.toFixed(3)}${mark(mode, i)}`).join('  |  ')}`);
  for (const mode of MODES) {
    const s = st[mode]; const top1 = r[mode][0].name; s.ranked++; if (EIS.includes(top1)) s.eisAll++;
    if (isNone) { s.noneN++; if (EIS.includes(top1)) s.none++; }
    else if (target) { s.n++; if (target.includes(top1)) s.top1++; else if (EIS.includes(top1)) s.lost++; if (r[mode].slice(0, 3).some(x => target.includes(x.name))) s.top3++; }
  }
}
lines.push('## Summary against labels', '', `Labeled mails with a target: ${st.mails3.n}; "none" mails: ${st.mails3.noneN}; hard: ${hard}; auto-replies skipped: ${autoMails}; unlabeled: ${unlabeled}.`, '',
  '| mode | project mails top1 | top3 | project mails lost to an Eisenhower folder (top1) | "none" mails with top1 in an Eisenhower folder | all ranked mails with top1 in an Eisenhower folder |', '|---|---|---|---|---|---|');
for (const mode of MODES) { const s = st[mode]; lines.push(`| ${mode} | ${s.top1}/${s.n} | ${s.top3}/${s.n} | ${s.lost}/${s.n} | ${s.none}/${s.noneN} | ${s.eisAll}/${s.ranked} |`); }
console.log('\n' + lines.slice(lines.indexOf('## Summary against labels')).join('\n'));
fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `compare3-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`\nTotal ${ms(now() - t0)}. Written: ${file}`);
