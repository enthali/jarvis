// Implementation: bugfix following SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_CFG_MANIFEST
// Requirements: REQ_MSG_NOTIFICATION_TEMPLATE AC-3 (${sender} placeholder), AC-7 (jarvis_receiveMessage)
//
// Regression test for msg-notify-default-text-fix: the ${sender} substitution
// variable was wired into applyTemplate() at all 3 default-notification-text
// declaration sites, but the literal default text itself was never updated to
// include the "Sender(s): ${sender}" line, and one site still referenced the
// deprecated jarvis_readMessage / a nonexistent enthali.jarvis-core/receiveMessage
// tool name instead of the canonical jarvis_receiveMessage. This test asserts
// the literal text (not just the substitution variables) at all 3 sites.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');
const corePackageJson = fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf-8');

describe('REQ_MSG_NOTIFICATION_TEMPLATE AC-3/AC-7: default notification text at all 3 declaration sites', () => {
    it('packages/core/package.json: jarvis.messages.notificationTemplate default includes Sender(s) and jarvis_receiveMessage', () => {
        const pkg = JSON.parse(corePackageJson);
        const sections: any[] = pkg.contributes.configuration;
        let setting: { default: string } | undefined;
        for (const section of sections) {
            if (section.properties && 'jarvis.messages.notificationTemplate' in section.properties) {
                setting = section.properties['jarvis.messages.notificationTemplate'];
                break;
            }
        }
        expect(setting).toBeDefined();
        expect(setting!.default).toContain('Sender(s): ${sender}');
        expect(setting!.default).toContain('jarvis_receiveMessage');
        expect(setting!.default).not.toContain('jarvis_readMessage');
    });

    it('jarvis.sendMessages manual command fallback default includes Sender(s) and jarvis_receiveMessage (not the nonexistent enthali.jarvis-core/receiveMessage)', () => {
        const idx = extensionSrc.indexOf("'jarvis.sendMessages'");
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 6000);
        expect(slice).toContain('Sender(s): \\${sender}');
        expect(slice).toContain('jarvis_receiveMessage');
        expect(slice).not.toContain('enthali.jarvis-core/receiveMessage');
    });

    it('auto-delivery poll loop fallback default includes Sender(s) and jarvis_receiveMessage', () => {
        const idx = extensionSrc.indexOf('Auto-delivery poll loop');
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 8000);
        expect(slice).toContain('Sender(s): \\${sender}');
        expect(slice).toContain('jarvis_receiveMessage');
    });
});
