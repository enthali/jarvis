---
name: syspilot.orchestration_jarvis
group: orchestration
description: "Implements the SEND/RECEIVE/RESPOND orchestration vocabulary using Jarvis session-messaging tools. USE FOR: any agent that passes work to another session (SEND), obtains its triggering instructions (RECEIVE), or returns results to the initiator (RESPOND)."
---

# Skill: Agent Orchestration (Jarvis Variant)

This is the **asynchronous** variant: SEND/RECEIVE map to Jarvis session
messaging. It runs each orchestrating agent as its own persistent session.

## SEND
Pass work to another agent. The installed variant decides whether this is asynchronous message delivery or a synchronous call

```
jarvis-core_sendToSession("<session>", "<message>")
```

## RECEIVE
Obtain the instructions that triggered this run — a pending inbox message or the task the agent was started with.

```
jarvis-core_readMessage("<your session name>")
```

## RESPOND

Deliver your result to whoever sent you the triggering message:

```
jarvis-core_sendToSession("<original sender>", "<result>")
```
