import * as fs from 'fs';
import * as path from 'path';

export interface SimpleActorHandlerDependencies {
    chooseEntry(): Promise<boolean>;
    promptName(): PromiseLike<string | undefined>;
    resolveActorsFolder(): string | undefined;
    showNoWorkspace(): void;
    showAlreadyExists(name: string): void;
    pickAgentMode(): Promise<string | undefined>;
    rescanLegacyActors(): Promise<void>;
    rescanActors(): Promise<void>;
    yamlString(value: string): string;
    logCreated(name: string, folder: string): void;
}

export function createSimpleActorHandler(
    dependencies: SimpleActorHandlerDependencies,
): () => Promise<void> {
    return async () => {
        if (!await dependencies.chooseEntry()) { return; }

        const name = await dependencies.promptName();
        if (name === undefined) { return; }

        const actorsFolder = dependencies.resolveActorsFolder();
        if (!actorsFolder) {
            dependencies.showNoWorkspace();
            return;
        }
        const targetFolder = path.join(actorsFolder, name);
        if (fs.existsSync(targetFolder)) {
            dependencies.showAlreadyExists(name);
            return;
        }

        await fs.promises.mkdir(targetFolder, { recursive: true });
        const actorFile = path.join(targetFolder, 'actor.yaml');
        const writeActor = (agent: string) => fs.promises.writeFile(
            actorFile,
            [`name: ${dependencies.yamlString(name)}`, 'summary: ""', `agent: ${dependencies.yamlString(agent)}`, ''].join('\n'),
            'utf8'
        );
        await writeActor('');
        await fs.promises.writeFile(path.join(targetFolder, 'context.md'), `# ${name}\n\n`, 'utf8');

        const agent = await dependencies.pickAgentMode();
        await writeActor(agent ?? '');
        await Promise.all([dependencies.rescanLegacyActors(), dependencies.rescanActors()]);
        dependencies.logCreated(name, targetFolder);
    };
}