# Jarvis

A VS Code extension for personal project and event management.

## Overview

Jarvis provides a dedicated sidebar in VS Code with two tree views:

- **Projects** — Lists your active projects
- **Events** — Lists your upcoming events

Currently displays hardcoded dummy data. Future versions will load real data from YAML files in configurable folders.

## Status

**v0.0.1** — Hello World Explorer with dummy data (US_EXP_SIDEBAR).

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Build documentation
python -m sphinx -b html docs docs/_build/html
```

## Documentation

This project uses [syspilot](https://github.com/enthali/syspilot) for requirements engineering.

- User Stories: `docs/userstories/`
- Requirements: `docs/requirements/`
- Design Specs: `docs/design/`
- Change Documents: `docs/changes/`

## License

MIT
