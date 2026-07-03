/**
 * Unit tests for hook-log-level-reduction change.
 *
 * Validates SPEC_HOOK_LOG AC-1/AC-2/AC-5: HookEngine's private _sink(event)
 * now emits two log entries per received HookEvent — a reduced `info`-level
 * entry (event name + session id, no payload) and an unchanged `trace`-level
 * entry (event name + session id + full JSON payload) — a pure log-level
 * split with no other functional change.
 */
import { describe, it, expect, vi } from 'vitest';
import { HookEngine, HookEvent } from '../../packages/core/src/engine/hooks/hookEngine';

function createMockLogger() {
    return {
        info: vi.fn(),
        trace: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    };
}

describe('SPEC_HOOK_LOG: _sink log-level split', () => {
    it('AC-1/AC-2: emits one trace entry (full payload) and one info entry (name + session id only)', () => {
        const logger = createMockLogger();
        const engine = new HookEngine(logger as any);
        const event: HookEvent = {
            eventName: 'SessionStart',
            sessionId: 'abc-123',
            payload: { hook_event_name: 'SessionStart', cwd: '/tmp' },
        };

        engine.receive(event);

        expect(logger.trace).toHaveBeenCalledTimes(1);
        expect(logger.trace).toHaveBeenCalledWith(
            '[Hook] SessionStart session=abc-123 — {"hook_event_name":"SessionStart","cwd":"/tmp"}'
        );

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('[Hook] SessionStart session=abc-123');
    });

    it('AC-2: info entry omits the payload even when trace entry includes it', () => {
        const logger = createMockLogger();
        const engine = new HookEngine(logger as any);
        engine.receive({
            eventName: 'PostToolUse',
            sessionId: 'sess-1',
            payload: { tool_name: 'replace_string_in_file', secret: 'should-not-leak-at-info-level' },
        });

        const infoCall = logger.info.mock.calls[0][0] as string;
        expect(infoCall).not.toContain('secret');
        expect(infoCall).not.toContain('tool_name');
        expect(infoCall).toBe('[Hook] PostToolUse session=sess-1');
    });

    it('handles events with no sessionId (omits " session=..." segment in both entries)', () => {
        const logger = createMockLogger();
        const engine = new HookEngine(logger as any);
        engine.receive({ eventName: 'Ping', payload: {} });

        expect(logger.info).toHaveBeenCalledWith('[Hook] Ping');
        expect(logger.trace).toHaveBeenCalledWith('[Hook] Ping — {}');
    });

    it('AC-5: pure log-level split — no dispatch/bus/side effects beyond the two log calls', () => {
        const logger = createMockLogger();
        const engine = new HookEngine(logger as any);
        const handler = vi.fn();
        engine.on('SessionStart', handler);

        engine.receive({ eventName: 'SessionStart', payload: {} });

        // Registered handler still fires exactly once (dispatch unaffected by the sink split)
        expect(handler).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
    });
});
