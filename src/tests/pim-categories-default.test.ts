/**
 * REQ_OLK_CATENABLE / SPEC_OLK_CATENABLE: jarvis.outlook.categories.enabled (default false, "Outlook" group)
 * gates the Categories view together with jarvis.outlook.enabled; jarvis.pim.showCategories and the "PIM"
 * settings group are gone. SPEC_PIM_CATTOOL: the no-provider error names both settings.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const pimDir = path.resolve(__dirname, '..', '..', 'packages', 'pim');
const manifest = JSON.parse(fs.readFileSync(path.join(pimDir, 'package.json'), 'utf-8'));
const extensionSrc = fs.readFileSync(path.join(pimDir, 'src', 'extension.ts'), 'utf-8');

describe('SPEC_OLK_CATENABLE: the Categories integration is off by default', () => {
    it('the "Jarvis PIM" group declares jarvis.outlook.categories.enabled as boolean with default false', () => {
        const group = manifest.contributes.configuration.find((c: any) => c.title === 'Jarvis PIM');
        const setting = group.properties['jarvis.outlook.categories.enabled'];
        expect(setting.type).toBe('boolean');
        expect(setting.default).toBe(false);
    });

    it('jarvis.pim.showCategories and the "PIM" settings group are not contributed', () => {
        expect(manifest.contributes.configuration.some((c: any) => c.title === 'PIM')).toBe(false);
        expect(JSON.stringify(manifest.contributes)).not.toContain('jarvis.pim.showCategories');
    });

    it('the view when clause requires jarvis.outlook.enabled and jarvis.outlook.categories.enabled', () => {
        const views = Object.values(manifest.contributes.views).flat() as { id: string; when?: string }[];
        const view = views.find(v => v.id === 'jarvisCategories');
        expect(view?.when).toBe('config.jarvis.outlook.enabled == true && config.jarvis.outlook.categories.enabled == true');
    });

    it('the provider is added only when the master switch and the categories setting are both true', () => {
        expect(extensionSrc).toMatch(/if \(cfg\.get<boolean>\('outlook\.enabled', false\)\) \{\s+if \(cfg\.get<boolean>\('outlook\.categories\.enabled', false\)\) \{\s+categoryService\.addProvider\(new OutlookCategoryProvider\(log\)\)/);
    });

    it('the category tool error names both settings', () => {
        expect(extensionSrc).toContain('No category providers configured. Enable jarvis.outlook.enabled and jarvis.outlook.categories.enabled.');
    });
});
