# Jarvis — The Actor Harness

## Project Overview

Jarvis is a VS Code extension that turns chat **sessions** and agent
**personas** into **actors** — persistent entities with their own identity,
memory (`context.md`), inter-actor messaging, and scheduling. Jarvis is the
harness, not the assistant itself: the actors it hosts do the actual work.

Entities like projects and events are actor variants — an `actor.yaml` with a
few extra properties — stored as YAML in configurable folders.
