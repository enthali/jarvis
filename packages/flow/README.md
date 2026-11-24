# Jarvis Message Flow

An interactive D3 chord-diagram visualization of inter-agent message traffic, plus a message log viewer. Both are sourced from the Jarvis message log (the diagram loads the most recent 30 entries by default, expandable via the **+30** button).

## Features

- Open the diagram via the icon button on the Messages tree-view title bar, or **Jarvis: Open Message Flow** in the Command Palette
- Nodes are sessions/actors, edges are message counts between them
- **Time lens**: a two-handle range slider indexed by message rank (newest = rank 1) narrows the diagram to a window of messages. The handles never cross and can be moved with mouse or keyboard. Dragging a handle shows a tooltip with the message's timestamp. Leaving the start handle at rank 1 keeps the view live-tracking new messages; moving it anchors the window to a specific message instead
- **+30** button loads another 30 older messages from the log (30 → 60 → 90 → ...) so the lens can reach further back; the larger load is not kept when the diagram is closed
- Hover an edge or a node for message count, time range, and a shortened sample of the message text
- Click an Actor node to open its existing Agent Host chat; this does not create a missing chat (open the Actor from ACTORS for that)
- **Message log viewer** (**Jarvis: Open Message Log**, or the icon button next to the diagram button on the Messages title bar): every logged message, newest first, refreshing while scrolled to the top. **Requeue** on an entry copies that message back into the live queue for its original recipient (same sender and timestamp, no new log entry) and shows a notification on success or failure
- Click an Actor node to open its existing Agent Host chat; this does not create a missing chat (open the Actor from ACTORS for that)

The diagram opens as an editor tab in the same fixed column used for entity docs (`context.md`, YAML config, agent files) — if you only have 2 editor columns open, the diagram and entity docs share that second column until you open a third.

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed, with `jarvis.messages.enabled` set to `true` and `jarvis.messages.logging` on (the default), because the diagram and the log viewer read the message log.
