# Jarvis Message Flow

Jarvis Message Flow (`enthali.jarvis-flow`) is an interactive D3 chord diagram of message traffic between actors and sessions, based on the Jarvis message queue. It requires [Jarvis Core](core.md) with `jarvis.messages.enabled` set to `true`.

## Open the diagram

Use the icon button in the title bar of the Messages view, or run **Jarvis: Open Message Flow** from the Command Palette. The diagram opens as an editor tab in the same column that holds entity documents (`context.md`, YAML files, agent files).

## Read the diagram

- Nodes are sessions and actors; edges are message counts between them.
- Hover an edge for the message count, time range, and a sample message.
- Click an actor node to open that actor's chat.
- The diagram loads the most recent 30 messages. The **+30** button loads 30 older messages at a time (30, 60, 90, ...).
- The **time lens** is a two-handle range slider indexed by message rank (newest = rank 1). It narrows the diagram to a window of messages; dragging a handle shows the timestamp of that message. While the start handle stays at rank 1, the view follows new messages; moving it anchors the window to a specific message.

## Configuration

This package has no settings of its own. It depends on `jarvis.messages.enabled` from [Jarvis Core](core.md).
