/**
 * REQ_PIM_CATVIEW AC-4 / SPEC_PIM_CATVIEW: jarvis.pim.showCategories defaults to false in the manifest;
 * the Categories view stays gated by showCategories and outlook.enabled.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'packages', 'pim', 'package.json'), 'utf-8'));

describe('REQ_PIM_CATVIEW: the Categories view is off by default', () => {
    it('AC-4: the manifest declares jarvis.pim.showCategories as boolean with default false', () => {
        const props = manifest.contributes.configuration.flatMap((c: any) => Object.entries(c.properties));
        const setting = (props.find(([k]: [string, unknown]) => k === 'jarvis.pim.showCategories') as any)[1];
        expect(setting.type).toBe('boolean');
        expect(setting.default).toBe(false);
    });

    it('the view when clause still requires showCategories and outlook.enabled', () => {
        const views = Object.values(manifest.contributes.views).flat() as { when?: string }[];
        const when = views.map(v => v.when ?? '').find(w => w.includes('jarvis.pim.showCategories'));
        expect(when).toBe('config.jarvis.pim.showCategories == true && config.jarvis.outlook.enabled == true');
    });
});
