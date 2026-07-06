# Idea: Session Watchdog / Non-Responding Session Ping

**Status:** Idea / unscoped (parked from a Nemotron/OpenRouter-via-MECE/Trace/QM
experiment)

## Problem

Rate limits occasionally cause a session to hang mid-turn, with no automatic
recovery.

## Idea

Some kind of watchdog that pings a session that's had the ball for a while
without responding.

## Why parked

NOT ready to implement — deliberately no active intervention into sessions
yet. Natural follow-on once `/freshmind`/`/housekeeping` (GH #3) has its first
working version; revisit then, not now.
