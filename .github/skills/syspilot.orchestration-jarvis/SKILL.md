---
name: syspilot.orchestration_jarvis
group: orchestration
description: "Implements the SEND/RECEIVE/RESPOND orchestration vocabulary using Jarvis session-messaging tools. USE FOR: any agent that passes work to another session (SEND), obtains its triggering instructions (RECEIVE), or returns results to the initiator (RESPOND)."
---

# Skill: Agent Orchestration (Jarvis Variant)

This is the **asynchronous** variant: SEND/RECEIVE map to Jarvis session
messaging. It runs each orchestrating agent as its own persistent session.

## SEND
Pass work to another agent. Always provide the **senderSession** parameter explicitly — do not rely on the active editor tab.

```typescript
jarvis_sendMessage({
  senderSession: "<your session name>",
  session: "<destination session>",
  text: "<message>"
})
```

**Deprecated:** The old `jarvis_sendToSession` tool is still available but deprecated. It will be removed in a future release. Use `jarvis_sendMessage` instead.

## RECEIVE
Obtain the instructions that triggered this run — read from your inbox until remaining = 0.

```typescript
jarvis_receiveMessage({
  destination: "<your session name>"
})
```

Returns `{ message: { sender, text, timestamp } | null, remaining: number }`. Call repeatedly until `remaining === 0`.

**Deprecated:** The old `jarvis_readMessage` tool is still available but deprecated. It will be removed in a future release. Use `jarvis_receiveMessage` instead.

## RESPOND

Deliver your result to whoever sent you the triggering message. Always pass your session name explicitly as **senderSession**.

```typescript
jarvis_sendMessage({
  senderSession: "<your session name>",
  session: "<original sender>",
  text: "<result>"
})
```
