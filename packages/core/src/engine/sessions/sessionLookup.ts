// Implementation: SPEC_AUT_HEARTBEAT_RESOLVER_REUSE, SPEC_ACTOR_SCANNER
// Requirements: REQ_AUT_HEARTBEAT_RESOLVER_REUSE, REQ_ACTOR_SCHEMA

// Shared destination validator — Actor names only; ambiguous names (shared by
// more than one Actor) are excluded, matching resolveName()'s rejection.
export function getValidDestinations(
    scanner?: { actors: { name: string }[] }
): string[] {
    return combineValidDestinations(scanner);
}

export function combineValidDestinations(
    scanner?: { actors: { name: string }[] }
): string[] {
    const counts = new Map<string, number>();
    for (const actor of scanner?.actors ?? []) {
        counts.set(actor.name, (counts.get(actor.name) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count === 1).map(([name]) => name);
}
