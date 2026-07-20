// Implementation: SPEC_SPL_STATE
// Requirements: REQ_SPL_STATE

/** Persisted state for the jarvis-syspilot module (.jarvis/syspilot-state.json). */
export interface SyspilotState {
    /** ISO 8601 timestamp; while in the future, update notifications are suppressed. */
    suspendedUntil?: string;
    /** Upstream version string the user chose to permanently skip. */
    skippedVersion?: string;
    /** The most recently observed upstream version (cached so the skip
     * command can reference it without a re-fetch). */
    lastSeenUpstreamVersion?: string;
}
