# Jarvis Message Flow

Jarvis Message Flow (`enthali.jarvis-flow`) is an interactive D3 chord diagram of message traffic between actors and sessions, plus a message log viewer. Both read the Jarvis message log, so it requires [Jarvis Core](core.md) with `jarvis.messages.enabled` set to `true` and `jarvis.messages.logging` on (the default). If no log exists yet, the diagram shows an empty state instead of an error.

## Open the diagram

Use the icon button **Jarvis: Open Message Flow** in the title bar of the Messages view, or run **Jarvis: Open Message Flow** from the Command Palette. The diagram opens as an editor tab in the same column that holds entity documents (`context.md`, YAML files, agent files).

## Read the diagram

- Nodes are sessions and actors; edges are message counts between them.
- Hover an edge or a node for the message count, the time range, and a shortened sample of the message text. A node counts the messages it sent and received and samples the newest one; an edge covers the messages between its two nodes.
- Click an Actor node to open its existing Agent Host chat. A missing chat is not created by this click; open the Actor from ACTORS to create it.
- The diagram loads the most recent 30 messages from the log. The **+30** button loads 30 older ones at a time (30, 60, 90, ...); the larger load is forgotten when you close the diagram.
- The **time lens** is a two-handle range slider indexed by message rank (newest = rank 1). It narrows the diagram to a window of messages; dragging a handle shows the timestamp of that message. The handles never cross: moving one past the other moves the other along. You can move them with the mouse or the keyboard. While the start handle stays at rank 1, the view follows new messages; moving it anchors the window to a specific message.

## Read the message log

Use the icon button **Jarvis: Open Message Log** next to it in the title bar of the Messages view, or run **Jarvis: Open Message Log**. The log viewer lists every entry of the message log, newest first, with sender, recipient, date and time, and the full message text.

- While the list is scrolled to the top, new entries appear by themselves. Scrolling down freezes the list so nothing shifts while you read; **Jump to Top** (shown only when you are not at the top) scrolls back and resumes updating.
- **Requeue** on an entry copies that message back into the live message queue for its original recipient, with the original sender and timestamp. It is a redelivery, not a new send, so the log gets no new entry. You can requeue the same entry more than once. A notification confirms the requeue, or reports the error if it could not be written (for example, when no workspace is open).

## Configuration

This package has no settings of its own. It depends on `jarvis.messages.enabled` and `jarvis.messages.logging` from [Jarvis Core](core.md).
