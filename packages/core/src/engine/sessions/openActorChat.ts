export interface ActorChatOpenPort {
    connected(): boolean;
    offline(): void;
    isActor(name: string): boolean;
    find(name: string): Promise<string | undefined>;
    ensure(name: string): Promise<string>;
    groups(): { viewColumn: number | undefined; uris: (string | undefined)[] }[];
    firstColumn: number;
    open(editorResource: string, viewColumn: number): Promise<void>;
    log(text: string): void;
}

/** The editor addresses a session of the local Agent Host as `agent-host-<provider>:/<id>`; `<provider>:/<id>` belongs to another chat provider. */
export function editorResource(session: string): string {
    return `agent-host-${session}`;
}

export async function openActorChat(name: string, create: boolean, port: ActorChatOpenPort): Promise<void> {
    const how = create ? 'find or create' : 'find only';
    if (!port.connected()) { port.log(`open chat of "${name}" (${how}): not connected`); port.offline(); return; }
    if (!create && !port.isActor(name)) { port.log(`open chat of "${name}" (${how}): not a unique Actor, nothing opened`); return; }
    const session = create ? await port.ensure(name) : await port.find(name);
    if (!session) { port.log(`open chat of "${name}" (${how}): no chat, nothing opened`); return; }
    const resource = editorResource(session);
    const group = port.groups().find(candidate => candidate.uris.includes(resource));
    const column = group?.viewColumn ?? port.firstColumn;
    port.log(`open chat of "${name}" (${how}): ${resource} in column ${column}${group ? ' (tab of this session exists)' : ' (no tab of this session)'}`);
    await port.open(resource, column);
}