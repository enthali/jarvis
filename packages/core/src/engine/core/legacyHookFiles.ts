// Implementation: SPEC_CFG_HOOKCLEANUP
// Requirements: REQ_CFG_HOOKCLEANUP

import * as fs from 'fs';
import * as path from 'path';

/** Hook files that earlier Jarvis versions generated, relative to the workspace root; the list is closed, never a pattern. */
export const LEGACY_HOOK_FILES: readonly string[] = [
    '.github/hooks/jarvis-hooks.json',
    '.github/hooks/jarvis-bridge.mjs',
    '.github/hooks/jarvis-port',
    '.github/hooks/bridge.mjs',
    '.github/hooks/port',
];

export interface LegacyHookLog {
    info(message: string): void;
    warn(message: string): void;
}

/** Removes the listed files; an absent file is normal, any other failure is logged and never thrown. */
export async function removeLegacyHookFiles(workspaceRoot: string, log: LegacyHookLog): Promise<void> {
    const removed: string[] = [];
    for (const rel of LEGACY_HOOK_FILES) {
        try {
            await fs.promises.unlink(path.join(workspaceRoot, ...rel.split('/')));
            removed.push(rel);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') { continue; }
            log.warn(`[CFG] Cannot remove the old hook file ${rel}: ${err instanceof Error ? err.message : err}`);
        }
    }
    if (removed.length > 0) { log.info(`[CFG] Removed old hook files: ${removed.join(', ')}`); }
}
