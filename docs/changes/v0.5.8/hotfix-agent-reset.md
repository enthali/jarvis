# v0.5.8 Hotfix — Loss of Agent Selection

*2026-05-05*

## Problem
Auto-delivery notification resets the agent/mode selection of target sessions.
sendPromptToFocusedAgentChat() uses workbench.action.chat.openAgent which
overwrites the session's agent mode on every notification.

## Fix
Auto-delivery poll loop now uses workbench.action.chat.open with
isPartialQuery: false instead of sendPromptToFocusedAgentChat().
This sends the notification stub without altering the session's agent mode.

## Scope
- src/extension.ts: auto-delivery poll loop (~line 1455)
- docs/design/spec_msg.rst: SPEC_MSG_AUTODELIVER_POLL updated
