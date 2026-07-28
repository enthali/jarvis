# syspilot.qm — Jarvis Project Tailoring

## Heartbeat Report Persistence

In addition to sending the periodic heartbeat findings report to PM via
`jarvis_sendMessage`, save a copy of each report as a file under:

`.jarvis/sessions/Quality Manager/reports/<date>-heartbeat.md`

(e.g. `.jarvis/sessions/Quality Manager/reports/2026-07-17-heartbeat.md`)

This lets the user review past reports directly on disk instead of only
in chat history. The message to PM stays the primary trigger for
fix/defer/accept decisions; the file is a durable copy for reference.

## Bug-Fix CRs: No Per-CR UAT Finding

Per PM decision 2026-07-27 (see `syspilot.cm.tailoring.md`), bug-fix CRs
intentionally skip the Test Designer UAT-chain step — automated test
coverage is accepted as sufficient per CR, with manual verification batched
before release instead. Do not raise "no UAT scenario" as a recurring
finding for bug-fix CRs; this is a standing decision, not an open item.
Feature CRs (new user-facing behavior) are unaffected and still expect a
full UAT chain.
