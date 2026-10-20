/**
 * Mutation check for the kanban query logic (kanban-list-details, QM F-1 and the VE checks).
 *
 * Usage (from the repository root):   node scripts/mutate-kanban-boardquery.mjs
 *
 * What it does: for each mutation it copies the repository's `packages/kanban/src/boardQuery.ts` and the
 * tests it needs into a TEMPORARY directory (repo files are never written), applies ONE mutation to the copy,
 * runs `src/tests/kanban-board-query.test.ts` there with the repository's vitest, and reports which tests fail.
 * A mutation that no test catches is printed as SURVIVED and the script exits with code 1.
 *
 * It is a check of the tests, not a test: it is not part of `npm test`.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(repo, 'packages/kanban/src/boardQuery.ts'), 'utf8');

/** `from` must occur exactly once in the current boardQuery.ts; otherwise the mutation is reported as STALE. */
const mutations = [
    { id: 'M1', name: 'labels sorted with localeCompare', from: 'compareCodePoints(a.name, b.name)', to: 'a.name.localeCompare(b.name)' },
    { id: 'M2', name: 'labels sorted by UTF-16 code unit', from: 'compareCodePoints(a.name, b.name)', to: '(a.name < b.name ? -1 : a.name > b.name ? 1 : 0)' },
    { id: 'M3', name: 'details null accepted', from: 'details === undefined ||', to: 'details == null ||' },
    { id: 'M4', name: 'details false treated as full', from: 'if (filter.details === true) {', to: 'if (filter.details !== undefined) {' },
    { id: 'M5', name: 'projection leaks notes', from: 'status: i.status, labels: labelsOf(i) }', to: 'status: i.status, labels: labelsOf(i), notes: i.notes }' },
    { id: 'M6', name: 'non-string label counted', from: "if (typeof l === 'string') { onCard.add(l); }", to: 'onCard.add(l as string);' },
    { id: 'M7', name: 'duplicate label on one card counted twice', from: 'for (const l of onCard) {', to: 'for (const l of labelsOf(item)) {' },
    { id: 'M8', name: 'labels filter any instead of every', from: 'filter.labels!.every(', to: 'filter.labels!.some(' },
    { id: 'M9', name: 'details leaves labels undefined when absent', from: '({ ...i, labels: labelsOf(i) })', to: '({ ...i })' },
    { id: 'M10', name: 'empty declared column omitted', from: 'const statuses = (statusField.options ?? []).map(', to: 'const statuses = (statusField.options ?? []).filter(o => items.some(i => i.status === o.name)).map(' },
    // QM F-1: which cards feed the label counts
    { id: 'F1-A', name: 'all items feed the labels (the F-1 defect)', from: 'for (const item of counted) {', to: 'for (const item of items) {' },
    { id: 'F1-B', name: 'any string status feeds the labels', from: "typeof i.status === 'string' && declared.has(i.status)", to: "typeof i.status === 'string'" },
    { id: 'F1-C', name: 'any truthy status feeds the labels', from: "typeof i.status === 'string' && declared.has(i.status)", to: '!!i.status' },
    { id: 'F1-D', name: 'only undeclared cards feed the labels', from: "typeof i.status === 'string' && declared.has(i.status)", to: "typeof i.status === 'string' && !declared.has(i.status)" },
    { id: 'F1-E', name: 'status counts over all items', from: 'count: items.filter(i => i.status === o.name).length,', to: 'count: items.length,' },
    { id: 'F1-F', name: 'declared set built from item statuses', from: 'new Set((statusField.options ?? []).map(o => o.name))', to: 'new Set(items.map(i => i.status as string))' },
];

function occurrences(text, part) { return text.split(part).length - 1; }

const work = mkdtempSync(path.join(tmpdir(), 'mutate-boardquery-'));
try {
    // Only what the pure-module test imports; the repository stays untouched.
    mkdirSync(path.join(work, 'packages/kanban/src'), { recursive: true });
    mkdirSync(path.join(work, 'src/tests'), { recursive: true });
    cpSync(path.join(repo, 'src/tests/kanban-board-query.test.ts'), path.join(work, 'src/tests/kanban-board-query.test.ts'));
    // The test also reads the skill asset, the README and the manifest; copy them so those tests are not mutation noise.
    for (const rel of ['packages/kanban/assets', 'packages/kanban/README.md', 'packages/kanban/package.json', 'packages/kanban/src/extension.ts']) {
        const from = path.join(repo, rel);
        if (existsSync(from)) { cpSync(from, path.join(work, rel), { recursive: true }); }
    }

    // No config file in the temp directory: it could not resolve 'vitest/config' from outside the repository.
    const vitest = path.join(repo, 'node_modules/vitest/vitest.mjs');
    function run(label) {
        const out = path.join(work, 'result.json');
        rmSync(out, { force: true });
        const r = spawnSync(process.execPath, [vitest, 'run', '--root', work, 'src/tests/kanban-board-query.test.ts', '--reporter=json', `--outputFile=${out}`], { cwd: work, encoding: 'utf8' });
        if (!existsSync(out)) { throw new Error(`vitest wrote no result for ${label}:\n${r.stdout}\n${r.stderr}`); }
        const json = JSON.parse(readFileSync(out, 'utf8'));
        const failed = json.testResults.flatMap(f => f.assertionResults).filter(t => t.status === 'failed').map(t => t.title);
        return { total: json.numTotalTests, failed, label };
    }

    const target = path.join(work, 'packages/kanban/src/boardQuery.ts');
    writeFileSync(target, source);
    const baseline = run('baseline');
    console.log(`baseline: ${baseline.total} tests, ${baseline.failed.length} failed`);
    if (baseline.failed.length > 0) { console.log('baseline is not green; mutation results would mean nothing'); process.exitCode = 2; }
    else {
        let survived = 0; let stale = 0;
        for (const m of mutations) {
            if (occurrences(source, m.from) !== 1) { console.log(`${m.id} ${m.name}: STALE (anchor occurs ${occurrences(source, m.from)} times)`); stale++; continue; }
            writeFileSync(target, source.replace(m.from, m.to));
            const r = run(m.id);
            if (r.failed.length === 0) { console.log(`${m.id} ${m.name}: SURVIVED`); survived++; }
            else { console.log(`${m.id} ${m.name}: caught by ${r.failed.length} of ${r.total}`); }
        }
        console.log(`summary: ${mutations.length} mutations, ${survived} survived, ${stale} stale`);
        if (survived > 0 || stale > 0) { process.exitCode = 1; }
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
