# Jarvis Message Flow

An interactive D3 chord-diagram visualization of inter-agent message traffic, sourced from the Jarvis message queue (loads the most recent 30 entries by default, expandable via the **+30** button).

## Features

- Open via the icon button on the Messages tree-view title bar, or **Jarvis: Open Message Flow** in the Command Palette
- Nodes are sessions/actors, edges are message counts between them
- **Time lens**: a two-handle range slider indexed by message rank (newest = rank 1) narrows the diagram to a window of messages. Dragging a handle shows a tooltip with the message's timestamp. Leaving the start handle at rank 1 keeps the view live-tracking new messages; moving it anchors the window to a specific message instead
- **+30** button loads another 30 older messages into the queue (30 → 60 → 90 → ...) so the lens can reach further back
- Hover an edge for message count, time range, and a sample message
- Click an actor node to open that actor's chat session

The diagram opens as an editor tab in the same fixed column used for entity docs (`context.md`, YAML config, agent files) — if you only have 2 editor columns open, the diagram and entity docs share that second column until you open a third.

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed, with `jarvis.messages.enabled` set to `true`.
