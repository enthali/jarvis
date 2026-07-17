# syspilot.qm — Jarvis Project Tailoring

## Heartbeat Report Persistence

In addition to sending the periodic heartbeat findings report to PM via
`jarvis_sendMessage`, save a copy of each report as a file under:

`.jarvis/sessions/Quality Manager/reports/<date>-heartbeat.md`

(e.g. `.jarvis/sessions/Quality Manager/reports/2026-07-17-heartbeat.md`)

This lets the user review past reports directly on disk instead of only
in chat history. The message to PM stays the primary trigger for
fix/defer/accept decisions; the file is a durable copy for reference.
