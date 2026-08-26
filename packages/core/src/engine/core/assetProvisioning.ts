// Implementation: SPEC_MOD_SKILL_PROVISION, SPEC_MOD_SKILL_MANIFEST
// Requirements: REQ_MOD_SKILL_PROVISION, REQ_MOD_SKILL_ORPHAN, REQ_MOD_SKILL_OPTOUT

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from './configPaths';
import type { ModuleAssetConfig } from './types';

const MANIFEST_KEY_PREFIX = 'jarvis.provisioned.';

let log: vscode.LogOutputChannel | undefined;

export function setAssetProvisioningLogger(logger: vscode.LogOutputChannel): void {
    log = logger;
}

/** Workspace-relative POSIX path from an absolute path. */
function toRelPosix(absPath: string, root: string): string {
    return path.relative(root, absPath).split(path.sep).join('/');
}

/** Compare two files byte-for-byte. */
function filesEqual(a: string, b: string): boolean {
    try {
        const bufA = fs.readFileSync(a);
        const bufB = fs.readFileSync(b);
        return bufA.equals(bufB);
    } catch {
        return false;
    }
}

/** Recursively copy a directory, writing only files that differ. */
function copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            if (!filesEqual(srcPath, destPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

/** Recursively remove a directory (rm -rf). */
function rmDirSync(dir: string): void {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch { /* best-effort */ }
}

/** Enumerate immediate subdirectories of a directory. Returns [] if missing. */
function listSubdirs(dir: string): string[] {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name);
    } catch {
        return [];
    }
}

/** Enumerate immediate files of a directory. Returns [] if missing. */
function listFiles(dir: string): string[] {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => e.isFile())
            .map(e => e.name);
    } catch {
        return [];
    }
}

export async function provisionModuleAssets(
    ctx: vscode.ExtensionContext,
    config: ModuleAssetConfig
): Promise<void> {
    // Step 1: workspace root
    const root = getWorkspaceRoot();
    if (!root) {
        log?.warn(`[AssetProvisioning] No workspace folder open — skipping provisioning for "${config.namespace}".`);
        return;
    }

    const manifestKey = MANIFEST_KEY_PREFIX + config.namespace;
    const previousManifest: string[] = ctx.workspaceState.get(manifestKey, []);

    // Step 2: enabled === false → de-provision
    if (config.enabled === false) {
        for (const rel of previousManifest) {
            const abs = path.join(root, rel.split('/').join(path.sep));
            try {
                const stat = fs.statSync(abs);
                if (stat.isDirectory()) {
                    rmDirSync(abs);
                } else {
                    fs.unlinkSync(abs);
                }
            } catch {
                // Target already gone — fine (AC-5)
            }
        }
        await ctx.workspaceState.update(manifestKey, []);
        log?.info(`[AssetProvisioning] De-provisioned ${previousManifest.length} asset(s) for "${config.namespace}".`);
        return;
    }

    // Step 3: enumerate the bundle
    const prefix = config.namespace + '.';
    const currentManifest: string[] = [];

    const skillsTargetDir = path.join(root, '.github', 'skills');
    const instrTargetDir = path.join(root, '.github', 'instructions');

    // -- Skills (subdirectories) --
    const skillEntries = config.skillsSourceDir ? listSubdirs(config.skillsSourceDir) : [];
    for (const name of skillEntries) {
        // Step 4: validate namespace prefix
        if (!name.startsWith(prefix)) {
            log?.warn(`[AssetProvisioning] Skipping skill "${name}" — does not start with "${prefix}".`);
            continue;
        }
        const srcDir = path.join(config.skillsSourceDir!, name);
        const destDir = path.join(skillsTargetDir, name);
        const relPosix = toRelPosix(destDir, root);
        try {
            copyDirSync(srcDir, destDir);
            currentManifest.push(relPosix);
        } catch (e) {
            log?.warn(`[AssetProvisioning] Failed to provision skill "${name}": ${e}`);
        }
    }

    // -- Instructions (files) --
    const instrEntries = config.instructionsSourceDir ? listFiles(config.instructionsSourceDir) : [];
    for (const name of instrEntries) {
        if (!name.startsWith(prefix)) {
            log?.warn(`[AssetProvisioning] Skipping instruction "${name}" — does not start with "${prefix}".`);
            continue;
        }
        const srcFile = path.join(config.instructionsSourceDir!, name);
        const destFile = path.join(instrTargetDir, name);
        const relPosix = toRelPosix(destFile, root);
        try {
            fs.mkdirSync(instrTargetDir, { recursive: true });
            if (!filesEqual(srcFile, destFile)) {
                fs.copyFileSync(srcFile, destFile);
            }
            currentManifest.push(relPosix);
        } catch (e) {
            log?.warn(`[AssetProvisioning] Failed to provision instruction "${name}": ${e}`);
        }
    }

    // Step 6: cleanup orphans — entries in previous manifest not in current
    const currentSet = new Set(currentManifest);
    for (const rel of previousManifest) {
        if (currentSet.has(rel)) { continue; }
        const abs = path.join(root, rel.split('/').join(path.sep));
        try {
            const stat = fs.statSync(abs);
            if (stat.isDirectory()) {
                rmDirSync(abs);
            } else {
                fs.unlinkSync(abs);
            }
        } catch {
            // Already gone — fine (AC-5)
        }
    }

    // Persist manifest
    await ctx.workspaceState.update(manifestKey, currentManifest);
    log?.info(`[AssetProvisioning] Provisioned ${currentManifest.length} asset(s) for "${config.namespace}".`);
}
