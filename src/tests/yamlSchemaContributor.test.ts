import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
    registerJarvisYamlSchemaContributor,
    resolveJarvisYamlSchema,
} from '../../packages/core/src/engine/core/yamlSchemaContributor';

const extensionUri = vscode.Uri.file('C:/extensions/jarvis-core');

describe('REQ_ACTOR_SCHEMA AC-5: YAML schema contributor fallback', () => {
    it('resolves the Actor schema globally by basename', () => {
        expect(resolveJarvisYamlSchema('file:///workspace/one/actor.yaml', extensionUri))
            .toContain('/schemas/actor.schema.json');
        expect(resolveJarvisYamlSchema('file:///workspace/nested/archive/actor.yaml', extensionUri))
            .toContain('/schemas/actor.schema.json');
        expect(resolveJarvisYamlSchema('file:///workspace/one/project.yaml', extensionUri))
            .toBeUndefined();
        expect(resolveJarvisYamlSchema('file:///workspace/one/ACTOR.YAML', extensionUri))
            .toBeUndefined();
    });

    it('registers one stable contributor with the supported YAML API', async () => {
        const requestSchema = vi.fn();
        const registerContributor = vi.fn((_id, resolver) => {
            requestSchema.mockImplementation(resolver);
            return true;
        });
        const activate = vi.fn(async () => ({ registerContributor }));
        const warn = vi.fn();

        await registerJarvisYamlSchemaContributor(extensionUri, { warn }, () => ({ activate }));

        expect(activate).toHaveBeenCalledOnce();
        expect(registerContributor).toHaveBeenCalledOnce();
        expect(registerContributor.mock.calls[0][0]).toBe('enthali.jarvis-core');
        expect(requestSchema('file:///any/depth/actor.yaml')).toContain('/schemas/actor.schema.json');
        expect(requestSchema('file:///any/depth/event.yaml')).toBeUndefined();
        expect(warn).not.toHaveBeenCalled();
    });

    it('keeps missing, unsupported, and failing YAML extensions nonfatal', async () => {
        const missingWarn = vi.fn();
        await expect(registerJarvisYamlSchemaContributor(extensionUri, { warn: missingWarn }, () => undefined))
            .resolves.toBeUndefined();

        const unsupportedWarn = vi.fn();
        await expect(registerJarvisYamlSchemaContributor(
            extensionUri,
            { warn: unsupportedWarn },
            () => ({ activate: async () => ({}) }),
        )).resolves.toBeUndefined();

        const failureWarn = vi.fn();
        await expect(registerJarvisYamlSchemaContributor(
            extensionUri,
            { warn: failureWarn },
            () => ({ activate: async () => { throw new Error('activation failed'); } }),
        )).resolves.toBeUndefined();

        expect(missingWarn).toHaveBeenCalledOnce();
        expect(unsupportedWarn).toHaveBeenCalledOnce();
        expect(failureWarn).toHaveBeenCalledOnce();
    });
});