import * as path from 'path';
import * as vscode from 'vscode';

const YAML_EXTENSION_ID = 'redhat.vscode-yaml';
const CONTRIBUTOR_ID = 'enthali.jarvis-core';

interface YamlExtensionApi {
    registerContributor(
        id: string,
        requestSchema: (resource: string) => string | undefined,
    ): boolean | void;
}

interface ExtensionLike {
    activate(): Thenable<unknown>;
}

interface WarningLogger {
    warn(message: string): void;
}

type ExtensionLookup = (id: string) => ExtensionLike | undefined;

export function resolveJarvisYamlSchema(resource: string, extensionUri: vscode.Uri): string | undefined {
    const fileName = path.posix.basename(vscode.Uri.parse(resource).path);
    if (fileName === 'actor.yaml') {
        return vscode.Uri.joinPath(extensionUri, 'schemas', 'actor.schema.json').toString();
    }
    return undefined;
}

export async function registerJarvisYamlSchemaContributor(
    extensionUri: vscode.Uri,
    log: WarningLogger,
    getExtension: ExtensionLookup = id => vscode.extensions.getExtension(id),
): Promise<void> {
    const extension = getExtension(YAML_EXTENSION_ID);
    if (!extension) {
        log.warn('[YAML] Red Hat YAML extension unavailable; manifest schema associations remain active.');
        return;
    }

    try {
        const api = await extension.activate() as Partial<YamlExtensionApi> | undefined;
        if (typeof api?.registerContributor !== 'function') {
            log.warn('[YAML] Red Hat YAML extension does not support schema contributors; manifest schema associations remain active.');
            return;
        }

        const registered = api.registerContributor(
            CONTRIBUTOR_ID,
            resource => resolveJarvisYamlSchema(resource, extensionUri),
        );
        if (registered === false) {
            log.warn('[YAML] Jarvis schema contributor was already registered.');
        }
    } catch (error) {
        log.warn(`[YAML] Schema contributor registration failed; manifest schema associations remain active: ${error}`);
    }
}