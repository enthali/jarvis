# Jarvis

A VS Code extension for personal project and event management.

## Overview

Jarvis provides a dedicated sidebar in VS Code with two tree views:

- **Projects** — Lists your active projects
- **Events** — Lists your upcoming events

Currently displays hardcoded dummy data. Future versions will load real data from YAML files in configurable folders.

## Installation

**Via GitHub Releases** (recommended):
1. Go to [Releases](https://github.com/enthali/Jarvis/releases)
2. Download `jarvis-<version>.vsix`
3. In VS Code: `Extensions` → `...` → `Install from VSIX...`

**From source**:
```bash
npm install
npm run package
# Then install the generated jarvis-*.vsix via VS Code
```

## Status

**v0.0.1** — Hello World Explorer with dummy data.

## Development

```bash
npm install        # Install dependencies
npm run compile    # TypeScript build
npm run watch      # Watch mode
npm run package    # Build .vsix
```

Press **F5** in VS Code to launch the Extension Development Host.

## Documentation

This project uses [syspilot](https://github.com/enthali/syspilot) for requirements engineering.
Published at: https://enthali.github.io/Jarvis

- User Stories: `docs/userstories/`
- Requirements: `docs/requirements/`
- Design Specs: `docs/design/`
- Change Documents: `docs/changes/`

## License

MIT
