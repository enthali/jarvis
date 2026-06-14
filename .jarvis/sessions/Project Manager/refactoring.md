# Refactoring Plan: extension.ts Modularization

*Draft: 2026-05-29 (PM working note, not a CR yet)*

## Why

`src/extension.ts` is **~2289 lines** today and growing with every CR. It mixes:

- Helpers (toKebabCase, frontmatter parsers, applyTemplate, …)
- Tree providers wiring
- 15+ VS Code commands (`jarvis.*`)
- ~20 dual tools (`jarvis_*`) — LM + MCP registrations
- Auto-delivery poll loop
- Configuration toggles + scanner lifecycle
- Activate/deactivate orchestration

Smells:

- Single-file diffs in every CR → merge-conflict risk, hard reviews
- MECE/QM cannot scan the file "at a glance"
- Helpers leak across domain boundaries (e.g. frontmatter parsers used only by agent discovery sit at file top)

## Goal Architecture (proposed)

Strict **domain modules** with a uniform contract:

```
src/
  extension.ts                  // thin: activate(), deactivate(), wiring only
  core/
    paths.ts                    // existing configPaths.ts moves here
    logging.ts                  // log channel
    yamlScanner.ts              // existing, moves here
    sessionLookup.ts            // existing, moves here
  ui/
    projectTree.ts              // existing tree provider files move here
    eventTree.ts
    sessionTree.ts
    messageTree.ts
    heartbeatTree.ts
    remindersTree.ts
  commands/
    sessionCommands.ts          // jarvis.newSession, openAgentSession, openSessionContext, …
    projectCommands.ts          // jarvis.newProject, openYamlFile, revealInExplorer, …
    eventCommands.ts            // jarvis.newEvent, filterFutureEvents, …
    treeCommands.ts             // jarvis.rescan, jarvis.searchProjects, jarvis.searchEvents, …
    fileCommands.ts             // jarvis.openYamlFile, revealInExplorer, revealInOS, openInTerminal
  tools/
    messageTools.ts             // sendToSession, readMessage
    sessionTools.ts             // listSessions, listChatSessions, createSession, listSessionEntities
    projectTools.ts             // listProjects, createProject  (post-entity-parity)
    eventTools.ts               // listEvents, createEvent      (post-entity-parity)
    heartbeatTools.ts           // registerJob, unregisterJob, listJobs
    reminderTools.ts            // setReminder, listReminders, cancelReminder
    pimTools.ts                 // category, task
  agents/
    discovery.ts                // discoverAgentModes, frontmatter helpers, getAgentIdentity, isExplicitlyExcluded
    openSession.ts              // openNewChatEditor, renameFocusedChatSession, init-prompt assembly
  delivery/
    autoDeliver.ts              // poll loop
    messageQueue.ts             // existing, moves here
  helpers/
    templates.ts                // applyTemplate, yamlString
    treeUtils.ts                // findLeafNode
```

Each module exports a single `register(context, deps)` (or `start(deps)` for non-disposable services) and returns `Disposable[]` collected by `extension.ts`.

## Module Contract (uniform)

```typescript
// example
export function registerSessionCommands(
    context: vscode.ExtensionContext,
    deps: { scanner: YamlScanner; log: vscode.LogOutputChannel; … }
): vscode.Disposable[] { … }
```

Benefits:

- `extension.ts` becomes a 100-line orchestrator
- Each new feature touches 1–2 modules max
- MECE-Review per module possible
- Unit-test boundaries become natural

## Migration Strategy (incremental)

Order matters — start where coupling is lowest. Roughly:

| Step | What | Why first / last |
|------|------|------------------|
| 1 | `helpers/` extraction (toKebabCase, applyTemplate, yamlString, findLeafNode, frontmatter parsers) | Zero behaviour change, builds confidence |
| 2 | `agents/discovery.ts` + `agents/openSession.ts` | Highest cohesion already, recently churned (F-1) |
| 3 | `commands/*` extraction one domain at a time (sessions → projects → events → tree → file) | Each step ~100–300 LoC moved, reviewable diff |
| 4 | `tools/*` extraction one domain at a time | Same pattern, ~50–150 LoC per tool group |
| 5 | `delivery/autoDeliver.ts` extraction | Self-contained, can be isolated cleanly |
| 6 | `ui/*tree.ts` co-location (move existing files into `ui/`) | Cosmetic, no real refactor |
| 7 | Final: clean `extension.ts` activate() to pure wiring | Verification step — file should be < 200 LoC |

Each step = **one CR**, each CR fully green (build + UAT smoke), each CR mergeable independently.

## Risks & Guardrails

- **Big-bang temptation**: explicitly avoid. One step per CR.
- **Spec drift**: SPEC IDs reference `extension.ts` — Designer must update `:Implementation:` lines per move. Trace updates per step.
- **Imports cascade**: VS Code Extension API stays in commands/tools modules; pure logic helpers in `helpers/`. No circular imports.
- **Test gap**: project today has no unit tests. Each refactor step requires a manual UAT pass on touched commands/tools.

## Open Questions (for future CR)

1. Adopt a DI container (heavyweight) or stay with manual `deps` parameter (recommended, KISS)?
2. Convert `registerDualTool` to a class or stays as factory?
3. Split `package.json` `contributes.languageModelTools` per module via a build step, or keep monolithic manifest?

## Sequencing With Feature Backlog

- **NOT before** `entity-parity` merges (would cause massive conflicts)
- Step 1 (helpers) is safe to interleave even with feature work
- Steps 2–7 should run as their own backlog stream, prioritized between feature CRs

## Status

Draft. Not a CR yet. When ready: PM creates intent-only CR per step.
