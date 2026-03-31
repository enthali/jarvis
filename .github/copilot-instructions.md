# Jarvis — Project Memory

## Project Overview

Jarvis is a VS Code extension that serves as a personal assistant for managing projects and events.
Projects and events are stored as YAML files in configurable folders.

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Documentation**: Sphinx + sphinx-needs (syspilot v0.2.3)
- **Build**: Node.js / npm

## Naming Conventions (syspilot IDs)

This is a single-project repo — **no family prefix**.

Format: `<TYPE>_<THEME>_<SHORT_SLUG>`

- `US_` = User Story, `REQ_` = Requirement, `SPEC_` = Design Spec
- Themes: `EXP` (Explorer UI), `CFG` (Config), `PRJ` (Projects), `EVT` (Events), `REL` (Release)
- Example: `US_EXP_SIDEBAR`, `REQ_EXP_TREEVIEW`, `SPEC_EXP_PROVIDER`

Full conventions: `docs/namingconventions.rst`

## Specification Structure

```
docs/
  userstories/    — User Stories (WHY)
  requirements/   — Requirements (WHAT)
  design/         — Design Specs (HOW)
  traceability/   — Cross-level tracing
  changes/        — Change Documents
```

## Key Schemas (from ProjectManager)

- **Projects**: `name` ("Project: XYZ"), `summary`, `stakeholders`, `externalStatus`, `internalStatus`
- **Events**: `name` ("Event: XYZ"), `location`, `dates.start/end`, `status`, `role`, `summary`
