// Implementation: SPEC_MSG_NOTIFICATION_RESOLVE, SPEC_INJ_INJECT step 4
// Requirements: REQ_MSG_NOTIFICATION_TEMPLATE AC-8/AC-9/AC-10, REQ_INJ_PRIMITIVE AC-7/AC-9
//
// Tests for notification-template-empty-fallback CR (GH #56):
// 1. resolveNotificationText falls back to DEFAULT_NOTIFICATION when template is empty/whitespace
// 2. resolveNotificationText applies substitution to the fallback
// 3. Both extension.ts call sites use resolveNotificationText (not raw applyTemplate)
// 4. injectPrompt does not silently succeed on empty text (logs info)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Direct import of the resolver and constant from the engine module
import { DEFAULT_NOTIFICATION, resolveNotificationText } from '@engine/sessions/injectPrompt';

describe('SPEC_MSG_NOTIFICATION_RESOLVE: empty template resolves to DEFAULT_NOTIFICATION', () => {

    it('DEFAULT_NOTIFICATION matches the package.json declared default', () => {
        const corePackageJson = fs.readFileSync(
            path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf-8'
        );
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
        expect(DEFAULT_NOTIFICATION).toBe(setting!.default);
    });

    it('resolveNotificationText returns DEFAULT_NOTIFICATION (substituted) when rawTemplate is empty string', () => {
        const result = resolveNotificationText(
            '',
            { count: '3', destination: 'Atlas', sender: 'Change Manager' },
            'Atlas'
        );
        expect(result).toContain('[Jarvis Message Service]');
        expect(result).toContain('3 new message(s)');
        expect(result).toContain('Sender(s): Change Manager');
        expect(result).toContain('jarvis_receiveMessage tool (destination: "Atlas")');
    });

    it('resolveNotificationText returns DEFAULT_NOTIFICATION (substituted) when rawTemplate is whitespace-only', () => {
        const result = resolveNotificationText(
            '   \n\t  ',
            { count: '1', destination: 'Dev', sender: 'PM' },
            'Dev'
        );
        expect(result).toContain('[Jarvis Message Service]');
        expect(result).toContain('1 new message(s)');
        expect(result).toContain('Sender(s): PM');
        expect(result).toContain('jarvis_receiveMessage tool (destination: "Dev")');
    });

    it('resolveNotificationText uses the provided template when non-empty', () => {
        const custom = 'Hey ${destination}, ${count} msgs from ${sender}';
        const result = resolveNotificationText(
            custom,
            { count: '2', destination: 'Bob', sender: 'Alice' },
            'Bob'
        );
        expect(result).toBe('Hey Bob, 2 msgs from Alice');
    });

    it('resolveNotificationText result is never empty when DEFAULT_NOTIFICATION is intact', () => {
        const result = resolveNotificationText(
            '',
            { count: '1', destination: 'X', sender: 'Y' },
            'X'
        );
        expect(result.trim().length).toBeGreaterThan(0);
    });
});

describe('extension.ts call sites use resolveNotificationText', () => {
    const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
    const extensionSrc = fs.readFileSync(path.join(coreSrcDir, 'extension.ts'), 'utf-8');

    it('jarvis.sendMessages uses resolveNotificationText, not raw applyTemplate for notification', () => {
        const idx = extensionSrc.indexOf("'jarvis.sendMessages'");
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 2000);
        expect(slice).toContain('resolveNotificationText(');
        // Should NOT use raw applyTemplate for notification composition
        // (applyTemplate may still appear for other purposes, so check the specific pattern)
        expect(slice).not.toMatch(/const stub = applyTemplate\(/);
    });

    it('auto-delivery poll loop uses resolveNotificationText, not raw applyTemplate for notification', () => {
        const idx = extensionSrc.indexOf('const pollInterval = setInterval');
        expect(idx).toBeGreaterThan(-1);
        const slice = extensionSrc.slice(idx, idx + 3000);
        expect(slice).toContain('resolveNotificationText(');
        expect(slice).not.toMatch(/const stub = applyTemplate\(/);
    });

    it('resolveNotificationText is imported from injectPrompt', () => {
        expect(extensionSrc).toContain("resolveNotificationText");
        expect(extensionSrc).toMatch(/import.*resolveNotificationText.*from.*injectPrompt/);
    });
});

describe('SPEC_INJ_INJECT step 4: empty text is not silently swallowed', () => {
    // This tests the source code pattern — the actual logging is tested via
    // the source text since injectPrompt requires VS Code runtime dependencies.
    const coreSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'src');
    const injectSrc = fs.readFileSync(
        path.join(coreSrcDir, 'engine', 'sessions', 'injectPrompt.ts'), 'utf-8'
    );

    it('uses text.trim() guard instead of truthy check', () => {
        // The guard should be trim-based, not a simple truthy check
        expect(injectSrc).toContain('if (text.trim())');
        // The old pattern should no longer exist (plain `if (text)` at step 4)
        // We check the specific step-4 block, not the whole file
        const step4Idx = injectSrc.indexOf('// 4. Text injection');
        expect(step4Idx).toBeGreaterThan(-1);
        const step4Block = injectSrc.slice(step4Idx, step4Idx + 500);
        expect(step4Block).not.toMatch(/if \(text\)\s*\{/);
    });

    it('logs info when text is empty (not silent)', () => {
        const step4Idx = injectSrc.indexOf('// 4. Text injection');
        const step4Block = injectSrc.slice(step4Idx, step4Idx + 500);
        expect(step4Block).toContain('_log?.info');
        expect(step4Block).toContain('empty text for');
        expect(step4Block).toContain('nothing submitted');
    });
});
