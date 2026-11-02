// Implementation: SPEC_COM_INBOX (Announcement)
// Requirements: REQ_COM_NOTIFY, US_COM_DELIVERY
// No `vscode` import: the extension passes the inbox, the delivery and the log as arguments.
//
// Announces waiting messages to the chat of an Actor through the Agent Host: automatically for the Actors
// whose setting asks for it, and by hand for one Actor (the play action). Deliveries run one after the other.

export interface InboxMessage {
    destination: string;
    sender: string;
    text: string;
    timestamp: string;
    notified?: boolean;
}

export interface AnnouncerDeps {
    readQueue(): InboxMessage[];
    writeQueue(messages: InboxMessage[]): void;
    /** Names of the Actors with automatic delivery (US_COM_DELIVERY). */
    autoDelivery(): string[];
    /** Announces to the chat of the Actor, creating the chat first when there is none. Resolves when the announcement was handed to the Agent Host. */
    announce(actorName: string, count: number): Promise<void>;
    changed(): void;
    log(severity: 'debug' | 'info' | 'warn', text: string): void;
}

export interface Announcer {
    /** One pass over the Actors with automatic delivery. */
    runAuto(): Promise<void>;
    /** The User asks for the delivery to one Actor (the play action); throws when the delivery fails. Resolves with the number of messages announced. */
    deliver(actorName: string): Promise<number>;
}

const messageKey = (m: InboxMessage): string => `${m.destination}\x00${m.sender}\x00${m.timestamp}\x00${m.text}`;

export function createAnnouncer(deps: AnnouncerDeps): Announcer {
    let tail: Promise<unknown> = Promise.resolve();
    const serialized = <T>(work: () => Promise<T>): Promise<T> => {
        const run = tail.catch(() => undefined).then(work);
        tail = run;
        return run;
    };

    async function announce(name: string, onlyNew: boolean): Promise<number> {
        const pending = deps.readQueue().filter(m => m.destination === name && (!onlyNew || !m.notified));
        if (pending.length === 0) { return 0; }
        await deps.announce(name, pending.length);
        // Marked only after the announcement was handed over, and only the messages it counted; a message that is marked is not announced again.
        const announced = new Set(pending.map(messageKey));
        const queue = deps.readQueue();
        for (const m of queue) { if (m.destination === name && !m.notified && announced.has(messageKey(m))) { m.notified = true; } }
        deps.writeQueue(queue);
        deps.changed();
        return pending.length;
    }

    return {
        runAuto: () => serialized(async () => {
            for (const name of deps.autoDelivery()) {
                try { await announce(name, true); }
                catch (err) { deps.log('warn', `autoDelivery: delivery failed for "${name}": ${err instanceof Error ? err.message : err}`); }
            }
        }),
        deliver: name => serialized(() => announce(name, false)),
    };
}
