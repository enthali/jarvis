// Implementation: SPEC_REL_RETIREINSTALL, SPEC_REL_RETIREUNINSTALL, SPEC_REL_RETIREFALLBACK
// Requirements: REQ_REL_RETIREINSTALL, REQ_REL_RETIREUNINSTALL, REQ_REL_RETIREFALLBACK

import * as vscode from 'vscode';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const CORE_ID = 'enthali.jarvis-core';
const LEGACY_ID = 'enthali.jarvis';

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    assets: { name: string; browser_download_url: string }[];
}

function fetchLatestRelease(): Promise<GitHubRelease> {
    const options = {
        hostname: 'api.github.com',
        path: '/repos/enthali/jarvis/releases/latest',
        headers: { 'User-Agent': 'Jarvis-VSCode-Extension' }
    };
    return new Promise((resolve, reject) => {
        https.get(options, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                res.resume();
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function downloadToTmp(url: string): Promise<string> {
    const dest = path.join(os.tmpdir(), `jarvis-core-${Date.now()}.vsix`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (downloadUrl: string) => {
            https.get(downloadUrl, { headers: { 'User-Agent': 'Jarvis-VSCode-Extension' } }, res => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const location = res.headers.location;
                    if (location) {
                        res.resume();
                        request(location);
                        return;
                    }
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => {});
                    reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                    res.resume();
                    return;
                }
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(dest); });
            }).on('error', err => {
                file.close();
                fs.unlink(dest, () => {});
                reject(err);
            });
        };
        request(url);
    });
}

async function ensureCoreInstalled(): Promise<boolean> {
    // Already present?
    if (vscode.extensions.getExtension(CORE_ID)) {
        return true;
    }
    // 1) Marketplace install (by extension ID)
    try {
        await vscode.commands.executeCommand(
            'workbench.extensions.installExtension', CORE_ID
        );
        return true;
    } catch { /* fall through to GitHub */ }

    // 2) GitHub Releases .vsix fallback (corporate/private marketplace)
    try {
        const release = await fetchLatestRelease();
        const asset = release.assets.find(a =>
            a.name === `jarvis-core-${release.tag_name.replace(/^v/, '')}.vsix`);
        if (!asset) { return false; }
        const tmp = await downloadToTmp(asset.browser_download_url);
        await vscode.commands.executeCommand(
            'workbench.extensions.installExtension', vscode.Uri.file(tmp)
        );
        fs.unlink(tmp, () => {});
        return true;
    } catch {
        return false;
    }
}

async function retireSelf(): Promise<void> {
    await vscode.commands.executeCommand(
        'workbench.extensions.uninstallExtension', LEGACY_ID
    );
    const reload = await vscode.window.showInformationMessage(
        'Jarvis has migrated to Jarvis Core. Reload to complete.',
        'Reload Now'
    );
    if (reload === 'Reload Now') {
        void vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}

export async function migrate(_ctx: vscode.ExtensionContext): Promise<void> {
    const ok = await ensureCoreInstalled();
    if (ok) {
        await retireSelf();
        return;
    }
    // Failure path: keep the shim installed, guide the user, retry next startup.
    const MKT = 'https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-core';
    const GH = 'https://github.com/enthali/jarvis/releases/latest';
    const pick = await vscode.window.showWarningMessage(
        'Could not install Jarvis Core automatically. Please install it manually.',
        'Open Marketplace', 'Open GitHub Releases'
    );
    if (pick === 'Open Marketplace') {
        void vscode.env.openExternal(vscode.Uri.parse(MKT));
    } else if (pick === 'Open GitHub Releases') {
        void vscode.env.openExternal(vscode.Uri.parse(GH));
    }
    // No uninstall — migration is re-attempted on the next activation.
}
