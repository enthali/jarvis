import { describe, expect, it, vi } from 'vitest';
import { openActorChat, type ActorChatOpenPort } from '../../packages/core/src/engine/sessions/openActorChat';

function port(): ActorChatOpenPort {
    return {
        connected: vi.fn(() => true),
        offline: vi.fn(),
        isActor: vi.fn(() => true),
        find: vi.fn(async () => 'copilotcli:/chat'),
        ensure: vi.fn(async () => 'copilotcli:/chat'),
        groups: vi.fn(() => []),
        firstColumn: 1,
        open: vi.fn(async () => {}),
        log: vi.fn(),
    };
}

describe('SPEC_COM_OPEN', () => {
    it.each([true, false])('offline shows information and does not look up or open (create=%s)', async create => {
        const deps = port();
        vi.mocked(deps.connected).mockReturnValue(false);
        await openActorChat('Actor', create, deps);
        expect(deps.offline).toHaveBeenCalledOnce();
        expect(deps.isActor).not.toHaveBeenCalled();
        expect(deps.find).not.toHaveBeenCalled();
        expect(deps.ensure).not.toHaveBeenCalled();
        expect(deps.open).not.toHaveBeenCalled();
    });

    it('Actor tree finds or creates; Messages only finds and does nothing on a miss', async () => {
        const deps = port();
        await openActorChat('Actor', true, deps);
        expect(deps.ensure).toHaveBeenCalledWith('Actor');
        expect(deps.open).toHaveBeenCalledWith('agent-host-copilotcli:/chat', 1);
        vi.mocked(deps.open).mockClear();
        vi.mocked(deps.find).mockResolvedValue(undefined);
        await openActorChat('Actor', false, deps);
        expect(deps.find).toHaveBeenCalledWith('Actor');
        expect(deps.ensure).toHaveBeenCalledOnce();
        expect(deps.open).not.toHaveBeenCalled();
    });

    it('reuses the group whose tab shows the editor resource of the session, not its host address', async () => {
        const deps = port();
        vi.mocked(deps.groups).mockReturnValue([
            { viewColumn: 2, uris: ['copilotcli:/chat'] },
            { viewColumn: 3, uris: [undefined, 'agent-host-copilotcli:/chat'] },
        ]);
        await openActorChat('Actor', false, deps);
        expect(deps.open).toHaveBeenCalledWith('agent-host-copilotcli:/chat', 3);
    });

    it('ignores a Messages group that is not a uniquely resolved Actor', async () => {
        const deps = port();
        vi.mocked(deps.isActor).mockReturnValue(false);
        await openActorChat('Unknown', false, deps);
        expect(deps.find).not.toHaveBeenCalled();
        expect(deps.open).not.toHaveBeenCalled();
    });
});