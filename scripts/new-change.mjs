#!/usr/bin/env node
// Scaffolds a new Change: branches off develop and copies the CD template
// into docs/changes/<name>.md, renamed and with {NAME}/{DATE} filled in.
//
// Usage: npm run new-change -- <change-name>
//   <change-name> must be kebab-case, e.g. notification-template-empty-fallback

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(repoRoot, '.github', 'templates', 'change-document.md');
const changesDir = join(repoRoot, 'docs', 'changes');

const name = process.argv[2];
if (!name) {
    console.error('Usage: npm run new-change -- <change-name>');
    console.error('  <change-name> must be kebab-case, e.g. notification-template-empty-fallback');
    process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    console.error(`Error: "${name}" is not kebab-case (lowercase letters, digits, hyphens only).`);
    process.exit(1);
}

const cdPath = join(changesDir, `${name}.md`);
if (existsSync(cdPath)) {
    console.error(`Error: docs/changes/${name}.md already exists.`);
    process.exit(1);
}
if (!existsSync(templatePath)) {
    console.error(`Error: template not found at ${templatePath}`);
    process.exit(1);
}

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
}

// 1. Branch off develop
run('git checkout develop');
run('git pull');
run(`git checkout -b feature/${name}`);

// 2. Copy the template, renamed, with mechanical placeholders filled
mkdirSync(changesDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const template = readFileSync(templatePath, 'utf8');
const filled = template.replaceAll('{NAME}', name).replaceAll('{DATE}', today);
writeFileSync(cdPath, filled, 'utf8');

console.log(`\nCreated docs/changes/${name}.md on branch feature/${name}.`);
console.log('Next: fill in Status, Author, Operation Mode, and Summary (root cause / fix direction / acceptance criteria / GitHub Issue).');
console.log('Leave Level 0/1/2, Final Consistency Check, and QM Findings as the template skeleton for System Designer/QM.');
