// Implementation: SPEC_REL_UPDATECHECK, SPEC_REL_UPDATENOTIFY, SPEC_REL_UPDATECOMMAND
// Requirements: REQ_REL_UPDATECHECK, REQ_REL_UPDATENOTIFY, REQ_REL_UPDATEINSTALL, REQ_REL_UPDATECOMMAND

import * as vscode from 'vscode';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

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

function isNewer(remote: string, local: string): boolean {
    const r = remote.replace(/^v/, '').split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((r[i] || 0) > (l[i] || 0)) { return true; }
        if ((r[i] || 0) < (l[i] || 0)) { return false; }
    }
    return false;
}

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (downloadUrl: string) => {
            https.get(downloadUrl, { headers: { 'User-Agent': 'Jarvis-VSCode-Extension' } }, res => {
                // Follow redirects (GitHub uses 302 for asset downloads)
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
                file.on('finish', () => { file.close(); resolve(); });
            }).on('error', err => {
                file.close();
                fs.unlink(dest, () => {});
                reject(err);
            });
        };
        request(url);
    });
}

export async function checkForUpdates(
    context: vscode.ExtensionContext,
    silent: boolean,
    log?: vscode.LogOutputChannel
): Promise<void> {
    log?.info('[Update] checking for updates...');
    let release: GitHubRelease;
    try {
        release = await fetchLatestRelease();
    } catch (e) {
        log?.error(`[Update] failed: ${e}`);
        if (!silent) {
            vscode.window.showErrorMessage('Jarvis: Unable to check for updates.');
        }
        return;
    }

    const currentVersion: string = context.extension.packageJSON.version;
    const newVersion = release.tag_name.replace(/^v/, '');

    log?.info(`[Update] latest: v${newVersion}, current: v${currentVersion}`);

    if (!isNewer(release.tag_name, currentVersion)) {
        log?.info('[Update] up to date');
        if (!silent) {
            vscode.window.showInformationMessage(
                `Jarvis is up to date (v${currentVersion}).`
            );
        }
        return;
    }

    log?.info(`[Update] new version available: v${newVersion}`);

    // Show notification with action buttons
    const action = await vscode.window.showInformationMessage(
        `Jarvis v${newVersion} is available (current: v${currentVersion})`,
        'Release Notes',
        'Download & Install'
    );

    if (action === 'Release Notes') {
        vscode.env.openExternal(vscode.Uri.parse(release.html_url));
    } else if (action === 'Download & Install') {
        // Find .vsix asset
        const vsixAsset = release.assets.find(a => a.name.endsWith('.vsix'));
        if (!vsixAsset) {
            vscode.window.showErrorMessage(
                'Jarvis: No .vsix asset found in the release. Opening release page instead.'
            );
            vscode.env.openExternal(vscode.Uri.parse(release.html_url));
            return;
        }

        const tmpPath = path.join(os.tmpdir(), vsixAsset.name);
        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Jarvis: Downloading update…' },
                async () => { await downloadFile(vsixAsset.browser_download_url, tmpPath); }
            );

            await vscode.commands.executeCommand(
                'workbench.extensions.installExtension',
                vscode.Uri.file(tmpPath)
            );

            // Clean up temp file
            fs.unlink(tmpPath, () => {});

            const reload = await vscode.window.showInformationMessage(
                `Jarvis has been updated. Reload to activate v${newVersion}.`,
                'Reload Now'
            );
            if (reload === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } catch {
            vscode.window.showErrorMessage('Jarvis: Failed to download or install update.');
            fs.unlink(tmpPath, () => {});
        }
    }
}
