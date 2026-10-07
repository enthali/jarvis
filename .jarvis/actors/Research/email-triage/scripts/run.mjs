// Throwaway PoC: can the project of an incoming mail be found by meaning (embeddings)?
// Reads only. Vectors live in RAM. Console output only; mail text/addresses are never printed (subjects of the 20 inbox mails are).
// Usage: node run.mjs [--model=bge-m3] [--filed] [--skip-inbox]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3) || d;
const MODEL = arg('model', 'bge-m3');
const OLLAMA = 'http://127.0.0.1:11434';
const PROJECTS_DIR = 'C:\\Users\\DOE4SI\\OneDrive - Bosch Group\\Projekte';
const PANTHEON = 'C:\\workspace\\Pantheon\\.github\\skills\\jarvis-email\\scripts';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VARIANTS = ['max', 'top2', 'centroid'];
const ms = t => `${Math.round(t)} ms`;
const now = () => performance.now();

// ---------- vector helpers
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const unit = v => { const n = Math.sqrt(dot(v, v)) || 1; return v.map(x => x / n); };
async function embed(texts) {
  const out = []; const times = [];
  for (let i = 0; i < texts.length; i += 8) {
    const t0 = now();
    const r = await fetch(`${OLLAMA}/api/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: MODEL, input: texts.slice(i, i + 8), truncate: true, keep_alive: '10m' }) });
    if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json(); times.push({ n: texts.slice(i, i + 8).length, ms: now() - t0 });
    j.embeddings.forEach(e => out.push(unit(e)));
  }
  return { vectors: out, times };
}

// ---------- projects: actor.yaml + context.md, one vector per section
function sectionsOf(name, dir) {
  const sections = [];
  const actor = path.join(dir, 'actor.yaml');
  if (fs.existsSync(actor)) {
    const lines = fs.readFileSync(actor, 'utf8').split(/\r?\n/).filter(l => l.trim() && !/https?:|email:|^\s*(agent|team_channel|id):/i.test(l));
    sections.push({ kind: 'actor', heading: 'actor.yaml', text: `Projekt: ${name}\n${lines.join('\n')}`.slice(0, 1800) });
  }
  const ctx = path.join(dir, 'context.md');
  if (fs.existsSync(ctx)) {
    const raw = fs.readFileSync(ctx, 'utf8').replace(/\r/g, '');
    const blocks = []; let cur = { heading: '', body: [] };
    for (const line of raw.split('\n')) {
      if (/^#{1,3} /.test(line)) { if (cur.heading || cur.body.join('').trim()) blocks.push(cur); cur = { heading: line.replace(/^#+\s*/, ''), body: [] }; } else cur.body.push(line);
    }
    blocks.push(cur);
    let carry = '';
    for (const b of blocks) {
      let text = `${b.heading}\n${b.body.join('\n')}`.trim(); if (!text) continue;
      if (carry) { text = `${carry}\n${text}`; carry = ''; }
      if (text.length < 80) { carry = text; continue; }
      for (let i = 0; i < text.length; i += 1500) sections.push({ kind: 'context', heading: b.heading, text: `Projekt: ${name}\n${text.slice(i, i + 1500)}` });
    }
    if (carry) sections.push({ kind: 'context', heading: '', text: `Projekt: ${name}\n${carry}` });
  }
  return sections;
}
async function buildIndex() {
  const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => ({ name: d.name, sections: sectionsOf(d.name, path.join(PROJECTS_DIR, d.name)) })).filter(p => p.sections.length);
  const all = projects.flatMap(p => p.sections);
  const t0 = now(); const { vectors, times } = await embed(all.map(s => s.text)); const total = now() - t0;
  all.forEach((s, i) => { s.vec = vectors[i]; });
  for (const p of projects) { const c = new Array(p.sections[0].vec.length).fill(0); p.sections.forEach(s => s.vec.forEach((x, i) => { c[i] += x; })); p.centroid = unit(c); }
  return { projects, sectionCount: all.length, total, times };
}
function rank(projects, q, variant) {
  return projects.map(p => {
    const sims = p.sections.map(s => dot(s.vec, q)).sort((a, b) => b - a);
    const score = variant === 'max' ? sims[0] : variant === 'top2' ? (sims[0] + (sims[1] ?? sims[0])) / 2 : dot(p.centroid, q);
    return { name: p.name, score };
  }).sort((a, b) => b.score - a.score);
}

// ---------- mail text: subject + new text, no quoted history, signature, HTML
const CUT_QUOTE = [/^\s*(Von|From|Gesendet|Sent|Absender):\s/i, /^\s*-{2,}\s*(Original Message|Ursprüngliche Nachricht|Urspr)/i, /^\s*Am .{5,200} schrieb .{0,200}:\s*$/i, /^\s*On .{5,200} wrote:\s*$/i, /^\s*>/, /^_{5,}\s*$/];
const CUT_SIGNATURE = [/^--\s*$/, /^\s*(Mit freundlichen Gr|Freundliche Gr|Viele Gr|Beste Gr|Herzliche Gr|Best regards|Kind regards|Regards|Many thanks|Thanks and regards|Gruß|Gruss|Cheers)/i];
function prepareMail(subject, body) {
  const subj = (subject ?? '').replace(/^\s*((re|aw|wg|fw|fwd)\s*:\s*)+/i, '').trim();
  let lines = (body ?? '').replace(/\r/g, '').replace(/<[^>]+>/g, ' ').split('\n'); const keep = [];
  for (const l of lines) { if (CUT_QUOTE.some(r => r.test(l)) || CUT_SIGNATURE.some(r => r.test(l))) break; keep.push(l); }
  const text = keep.join('\n').replace(/\[cid:[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return `Betreff: ${subj}\n${text}`.slice(0, 2000);
}

// ---------- PowerShell glue (read-only Pantheon scripts, plus my own read-folder.ps1)
function pwsh(script, args) {
  const cmd = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); & '${script}' ${args}`;
  const r = spawnSync('pwsh', ['-NoProfile', '-Command', cmd], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`pwsh ${path.basename(script)} failed: ${(r.stderr || '').slice(0, 300)}`);
  const j = JSON.parse(r.stdout || '[]'); return Array.isArray(j) ? j : [j];
}
const q = s => `'${String(s).replace(/'/g, "''")}'`;

async function main() {
  console.log(`Model: ${MODEL}   Ollama: ${(await (await fetch(`${OLLAMA}/api/version`)).json()).version}`);
  spawnSync('ollama', ['stop', MODEL], { encoding: 'utf8' });
  let t0 = now(); await embed(['warm up']); console.log(`Model load (cold, incl. first tiny embed): ${ms(now() - t0)}`);

  const idx = await buildIndex();
  const per = idx.times.reduce((a, t) => a + t.ms, 0) / idx.sectionCount;
  console.log(`Project index: ${idx.projects.length} projects, ${idx.sectionCount} sections, total ${ms(idx.total)}, ${ms(per)} per section (batches of 8)`);
  console.log(`Sections per project: ${idx.projects.map(p => p.sections.length).sort((a, b) => a - b).join(' ')}`);

  if (!process.argv.includes('--skip-inbox')) {
    t0 = now(); const list = pwsh(`${PANTHEON}\\get-mail.ps1`, '-Top 20 -Days 3650'); const listMs = now() - t0;
    console.log(`\nInbox: ${list.length} mails listed in ${ms(listMs)} (get-mail.ps1); fetching full text with get-mail-by-id.ps1 ...`);
    const mailTimes = [];
    list.forEach((m, k) => { m._k = k; });
    for (const m of list) {
      t0 = now();
      const full = pwsh(`${PANTHEON}\\get-mail-by-id.ps1`, m.MessageId ? `-MessageId ${q(m.MessageId)} -Mailbox ${q(m.Mailbox)}` : `-EntryId ${q(m.EntryId)} -StoreId ${q(m.StoreId)}`)[0];
      const fetchMs = now() - t0; t0 = now();
      const text = prepareMail(m.Subject, full.Body); const { vectors } = await embed([text]); const embMs = now() - t0;
      mailTimes.push({ fetchMs, embMs });
      const date = m.ReceivedTime.slice(5, 16).replace('T', ' ');
      console.log(`\n#${String(m._k + 1).padStart(2)}  ${date}  ${(m.Subject ?? '').slice(0, 78)}   [text ${text.length} chars, embed ${ms(embMs)}]`);
      const r = rank(idx.projects, vectors[0], 'max');
      r.slice(0, 10).forEach((x, i) => console.log(`   ${String(i + 1).padStart(2)}  ${x.score.toFixed(3)}  ${x.name}`));
      console.log(`   gap 1st-2nd: ${(r[0].score - r[1].score).toFixed(3)}   | top3 top2-mean: ${rank(idx.projects, vectors[0], 'top2').slice(0, 3).map(x => `${x.name} ${x.score.toFixed(2)}`).join(' / ')}   | top3 centroid: ${rank(idx.projects, vectors[0], 'centroid').slice(0, 3).map(x => `${x.name} ${x.score.toFixed(2)}`).join(' / ')}`);
    }
    const avg = k => mailTimes.reduce((a, t) => a + t[k], 0) / mailTimes.length;
    console.log(`\nPer mail: fetch via get-mail-by-id.ps1 ${ms(avg('fetchMs'))} (mean), embed+rank ${ms(avg('embMs'))} (mean)`);
  }

  if (process.argv.includes('--filed')) await filedCheck(idx);
}

// ---------- read-only check on mails already filed in project folders (folder = known truth)
const FOLDER_TO_PROJECT = { 'Project AIDV': 'Project XC AIDV', 'Project-CRAFT': 'Project CRAFT' };
async function filedCheck(idx) {
  const names = new Set(idx.projects.map(p => p.name));
  const outlookFolders = ['GenAI', 'Jarvis', 'HR', 'SteeringCommittees', 'Partner-ETAS', 'Compliance', 'Org NE-TE', 'Event 2026-10-14 ELIV', 'Event 2026-11-17 AIC', 'Event 2026-10-21 TechCon', 'Event 2026-10-22 Microsoft AI Tour', 'Project CRAFT', 'Project-CRAFT', 'Project AIDV', 'Project XC AIDV', 'Project XC LEC', 'Project XC RD Performance Program', 'Project Micro-App Framework', 'Project XC Archtecture SC', 'Event 2026-10-09 XC Engineering Summit', 'Trip 2026-19-25 Detroit', 'Project China goes global'];
  const perFolder = 6; const samples = [];
  for (const f of outlookFolders) {
    const truth = FOLDER_TO_PROJECT[f] ?? f; if (!names.has(truth)) continue;
    const mails = pwsh(path.join(HERE, 'read-folder.ps1'), `-Folder ${q(f)} -Top ${perFolder} -ReadOnly`);
    mails.forEach(m => samples.push({ truth, text: prepareMail(m.Subject, m.Body) }));
  }
  const negatives = pwsh(path.join(HERE, 'read-folder.ps1'), `-Folder ${q('4 Unwichtig')} -Top 25 -ReadOnly`).map(m => prepareMail(m.Subject, m.Body));
  console.log(`\n=== Filed-mail check (read mails only): ${samples.length} mails in ${new Set(samples.map(s => s.truth)).size} project folders, plus ${negatives.length} mails from '4 Unwichtig' as "no project" samples`);
  const t0 = now(); const sv = (await embed(samples.map(s => s.text))).vectors; const nv = (await embed(negatives)).vectors;
  console.log(`Embedding of ${samples.length + negatives.length} mails: ${ms(now() - t0)}`);
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
  for (const v of VARIANTS) {
    let h1 = 0, h3 = 0, h5 = 0; const okTop = [], badTop = [], okGap = [], badGap = []; const ranks = [];
    sv.forEach((vec, i) => { const r = rank(idx.projects, vec, v); const pos = r.findIndex(x => x.name === samples[i].truth); ranks.push(pos + 1); if (pos === 0) h1++; if (pos < 3) h3++; if (pos < 5) h5++; (pos === 0 ? okTop : badTop).push(r[0].score); (pos === 0 ? okGap : badGap).push(r[0].score - r[1].score); });
    const negTop = nv.map(vec => rank(idx.projects, vec, v)[0].score);
    const n = samples.length;
    console.log(`\n[${v}] top1 ${h1}/${n} (${Math.round(100 * h1 / n)}%)  top3 ${h3}/${n} (${Math.round(100 * h3 / n)}%)  top5 ${h5}/${n} (${Math.round(100 * h5 / n)}%)  median rank ${pct(ranks, 0.5)}`);
    console.log(`   top1 score  correct: median ${pct(okTop, 0.5).toFixed(3)} (p10 ${pct(okTop, 0.1).toFixed(3)}, p90 ${pct(okTop, 0.9).toFixed(3)})   wrong: median ${pct(badTop, 0.5).toFixed(3)}   no-project mails: median ${pct(negTop, 0.5).toFixed(3)} (p10 ${pct(negTop, 0.1).toFixed(3)}, p90 ${pct(negTop, 0.9).toFixed(3)})`);
    console.log(`   gap 1st-2nd correct: median ${pct(okGap, 0.5).toFixed(3)}   wrong: median ${pct(badGap, 0.5).toFixed(3)}`);
  }
  const perProject = {}; sv.forEach((vec, i) => { const r = rank(idx.projects, vec, 'max'); const p = (perProject[samples[i].truth] ??= { n: 0, top1: 0, top3: 0 }); p.n++; const pos = r.findIndex(x => x.name === samples[i].truth); if (pos === 0) p.top1++; if (pos < 3) p.top3++; });
  console.log('\nPer folder (max variant): ' + Object.entries(perProject).map(([k, v]) => `${k}: ${v.top1}/${v.n} top1, ${v.top3}/${v.n} top3`).join(' | '));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
export { embed, buildIndex, rank, prepareMail, pwsh, q, ms, now, dot, HERE, PANTHEON, MODEL, OLLAMA };
