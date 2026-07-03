# Jarvis Message Flow

An interactive D3 chord-diagram visualization of inter-agent message traffic, sourced from the Jarvis message queue (most recent 500 entries).

## Features

- Open via the icon button on the Messages tree-view title bar, or **Jarvis: Open Message Flow** in the Command Palette
- Nodes are sessions/actors, edges are message counts between them
- **Fog of Time** slider fades older activity so recent patterns stand out
- Hover an edge for message count, time range, and a sample message
- Click an actor node to open that actor's chat session

The diagram opens as an editor tab in the same fixed column used for entity docs (`context.md`, YAML config, agent files) — if you only have 2 editor columns open, the diagram and entity docs share that second column until you open a third.

## Requirements

- `enthali.jarvis-core` (Jarvis Core) must be installed, with `jarvis.messages.enabled` set to `true`.
