# Jarvis

A VS Code extension for personal project and event management.

## Overview

Jarvis provides a project overview in the VS Code Explorer sidebar, displaying your active projects and their status at a glance. It connects to an MCP server for live data from Outlook (tasks, emails, contacts) and project YAML files.

## Status

**Early Development** — Starting with the Explorer tree view for project overview.

## Architecture

```
VS Code Extension (Jarvis)
    └── MCP Server (existing, port 8191)
            └── Outlook COM / Project YAML / Events
```

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Package
npx vsce package
```

## License

MIT
