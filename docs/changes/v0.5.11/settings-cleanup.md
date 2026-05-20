# Change: settings-cleanup

**Status:** in-progress
**Branch:** feature/settings-cleanup
**Mode:** autonomous
**Origin:** PM CR 2026-05-18

## Summary

Reorganize Jarvis settings so every feature has a clear `jarvis.<feature>.enabled`
toggle, and where a path was needlessly configurable it becomes a fixed default
under `.jarvis/` in the workspace root. Reduce out-of-the-box configuration
burden; align all settings into logical groups.

## Why

User feedback: too many folders and files must be configured before Jarvis is
useful. Goal: out-of-the-box, the important features work without
configuration.

## Acceptance Criteria

1. Projects feature is on/off (`jarvis.projects.enabled`, default: **off**).
   Folder configuration only visible/relevant when enabled.
2. Events feature is on/off (`jarvis.events.enabled`, default: **off**).
   Folder configuration only visible/relevant when enabled.
3. Heartbeat feature is on/off (`jarvis.heartbeat.enabled`, default: **on**).
   Path is fixed: `.jarvis/heartbeat.yaml` in workspace root — not configurable.
4. Messages feature is on/off (`jarvis.messages.enabled`, default: **on**).
   Path is fixed: `.jarvis/messages.json` in workspace root. Message logging
   default **on**, fixed path `.jarvis/message-log.json`.
5. Reminders feature is on/off (`jarvis.reminders.enabled`, default: **on**).
   Path is fixed: `.jarvis/reminders.yaml`.
6. MCP server default **off** (`jarvis.mcp.enabled`, default: false).
7. Existing configurable path settings for Heartbeat/Messages are removed
   (breaking change — migration note in release notes).
8. Settings are organized into logical groups: Projects, Events, Sessions,
   Messages, Heartbeat, Reminders, MCP, PIM, Outlook, Recording, Updates.
   (CM note: `Updates` is an 11th group retained from the existing manifest —
   houses the `jarvis.checkForUpdates` self-update flag, no natural home in
   the other 10 groups.)

## Out of Scope

- The Sessions feature itself is **CR 2** (`sessions-feature`). This CR only
  reserves the `Sessions` settings group as a placeholder for AC-8.
- Tool de-registration when a feature is disabled is **CR 3**
  (`tool-deregistration`). This CR adds the toggles only; deactivation in
  this CR means "the feature short-circuits at activation" — not full
  runtime de-registration.

## Breaking Changes

Removed settings:
- `jarvis.heartbeatConfigFile` → replaced by fixed `.jarvis/heartbeat.yaml`
- `jarvis.messagesFile` → replaced by fixed `.jarvis/messages.json`
- `jarvis.mcpEnabled` → renamed to `jarvis.mcp.enabled` (consistent dotted-group naming)
- `jarvis.outlookEnabled` → renamed to `jarvis.outlook.enabled`
- `jarvis.messages.logging` default flips from `false` to `true`

Defaults flipped:
- Projects default off (was on via empty path)
- Events default off (was on via empty path)

Renamed for group consistency:
- `jarvis.projectsFolder` → `jarvis.projects.folder`
- `jarvis.eventsFolder` → `jarvis.events.folder`

## Affected Specs

| Level | ID | File | Change |
|---|---|---|---|
| US | `US_CFG_FEATURETOGGLES` (new) | `docs/userstories/us_cfg.rst` | new story |
| US | `US_CFG_FIXEDPATHS` (new) | `docs/userstories/us_cfg.rst` | new story |
| REQ | `REQ_CFG_TOGGLES` (new) | `docs/requirements/req_cfg.rst` | per-feature enabled toggles |
| REQ | `REQ_CFG_FIXEDPATHS` (new) | `docs/requirements/req_cfg.rst` | fixed `.jarvis/` paths |
| REQ | `REQ_CFG_GROUPS` (new) | `docs/requirements/req_cfg.rst` | settings group structure |
| REQ | `REQ_CFG_MCPDEFAULTOFF` (new) | `docs/requirements/req_cfg.rst` | MCP off by default |
| SPEC | `SPEC_CFG_MANIFEST` (new) | `docs/design/spec_cfg.rst` | package.json configuration block |
| SPEC | `SPEC_CFG_PATHRESOLVER` (new) | `docs/design/spec_cfg.rst` | central path resolver + ensure .jarvis dir |
| SPEC | `SPEC_CFG_TOGGLEGUARDS` (new) | `docs/design/spec_cfg.rst` | activation gating for disabled features |
| SPEC | `SPEC_CFG_VIEWGATING` (new) | `docs/design/spec_cfg.rst` | views/menus when-clauses gating |
| Existing affected | `SPEC_MSG_QUEUESTORE` | `docs/design/spec_msg.rst` | path resolution changes |
| Existing affected | `SPEC_MSG_REMINDERSTORE` | `docs/design/spec_msg.rst` | path resolution changes |
| Deprecated | `SPEC_CFG_SETTINGS` | `docs/design/spec_cfg.rst` | superseded by SPEC_CFG_MANIFEST |
| Deprecated | `SPEC_CFG_SETTINGSGROUPS` | `docs/design/spec_cfg.rst` | superseded by SPEC_CFG_MANIFEST |
| Deprecated | `SPEC_CFG_UPDATECHECK` | `docs/design/spec_cfg.rst` | superseded by SPEC_CFG_MANIFEST |
| Deprecated | `SPEC_CFG_HEARTBEATSETTINGS` | `docs/design/spec_cfg.rst` | superseded by SPEC_CFG_MANIFEST + SPEC_CFG_PATHRESOLVER |
| Deprecated | `SPEC_CFG_DEFAULTPATHS` | `docs/design/spec_cfg.rst` | superseded by SPEC_CFG_PATHRESOLVER (lazy creation) |
| Deprecated | `US_CFG_SETTINGSGROUPS` | `docs/userstories/us_cfg.rst` | superseded by US_CFG_GROUPS |
| Deprecated | `REQ_CFG_SETTINGSGROUPS` | `docs/requirements/req_cfg.rst` | superseded by REQ_CFG_GROUPS |

## Design Decisions

- **`.jarvis/` directory** in workspace root holds all runtime files
  (`heartbeat.yaml`, `messages.json`, `reminders.yaml`, `message-log.json`,
  `autodelivery.json`). One directory, easy to gitignore, easy to reset.
- **Created on first write**, not on activation. Read paths return empty
  results until first write — no startup side-effects.
- **No workspace?** Features that require `.jarvis/` are gracefully disabled
  with a one-time log warning. No errors thrown.
- **Toggle effect in this CR**: when `enabled = false`, the feature's
  activation block is skipped entirely (`if (!enabled) return;`). Tool
  registration is part of the activation block, so tools are not registered
  when off. Runtime toggle (changing setting without reload) is **CR 3**.
- **Sessions placeholder**: AC-8 names the `Sessions` group; the group
  appears empty in this CR. CR 2 fills it.

## Migration

Release notes will state:
- Move existing `heartbeat.yaml` to `.jarvis/heartbeat.yaml` in workspace root.
- Move existing `messages.json` to `.jarvis/messages.json` in workspace root.
- Remove old `jarvis.heartbeatConfigFile`, `jarvis.messagesFile` settings (Jarvis
  ignores them now).
- Rename `jarvis.mcpEnabled` → `jarvis.mcp.enabled`,
  `jarvis.outlookEnabled` → `jarvis.outlook.enabled`,
  `jarvis.projectsFolder` → `jarvis.projects.folder`,
  `jarvis.eventsFolder` → `jarvis.events.folder` in user `settings.json`.

## Process Log

- 2026-05-18: PM submitted CR. CM accepted (autonomous mode).
- 2026-05-18: Branch `feature/settings-cleanup` created from `develop`.
- 2026-05-18: Change document created.
- 2026-05-18: System Designer wrote 3 US, 5 REQ, 4 new SPEC + updates to
  affected SPEC_MSG_* specs. Sphinx clean. CM autonomous decisions:
  * **Updates group**: kept as 11th settings group (houses
    `jarvis.checkForUpdates`).
  * **`SPEC_CFG_HEARTBEATSETTINGS`, `SPEC_CFG_DEFAULTPATHS`,
    `SPEC_EXP_FEATURETOGGLE`** (existing `status: implemented` specs): will
    be marked `superseded` by the Implement Engineer with a link to the new
    SPEC_CFG_* set.
  * **`jarvis.heartbeatInterval`**: NOT renamed in this CR (separate concern).
  * **`jarvis.outlook.enabled`** default stays `false`.
