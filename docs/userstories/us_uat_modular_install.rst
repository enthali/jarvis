Modular Delivery Acceptance Tests
=================================

.. story:: Modular Install Acceptance Tests
   :id: US_UAT_MODULAR_INSTALL
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **As a** Jarvis Test Engineer,
   **I want** extension-host install-combination acceptance scenarios for the
   core/add-on split,
   **so that** I can verify each capability bundle installs and runs
   independently, uninstalled add-ons leave zero trace, and no user data is
   migrated.

   These are user-observable acceptance scenarios executed in the Extension
   Development Host. The engine internals (kind registration, tool injection,
   generic scanner, generic tree) are verified by unit tests against the
   ``SPEC_ENG_*`` acceptance criteria, not here.

   **Acceptance Criteria:**

   * AC-1: Scenarios cover every install combination in the extension host:
     core, core+pim, core+recorder, core+pim+recorder, core+mcp.
   * AC-2: At least one scenario proves zero-trace (no view/setting/command/tool)
     when an add-on is absent.
   * AC-3: At least one scenario proves no migration (existing entities, messages,
     and ``jarvis.*`` settings honoured after update).
   * AC-4: At least one scenario proves an add-on cannot activate without the
     core.
   * AC-5: At least one scenario proves MCP zero-trace when ``enthali.jarvis-mcp``
     is absent.
   * AC-6: At least one scenario proves MCP lights up when ``enthali.jarvis-mcp``
     is installed alongside core.
   * AC-7 (``message-flow-diagram`` CR): At least one scenario proves
     ``enthali.jarvis-flow`` zero-trace when absent.
   * AC-8 (``message-flow-diagram`` CR): At least one scenario proves
     ``enthali.jarvis-flow`` lights up when installed alongside core, and
     that it cannot activate without the core.
   * AC-9 (``dev-launchconfig-syspilot`` CR): A scenario verifies that the
     "Run Core + Syspilot" launch configuration in ``.vscode/launch.json``
     starts an Extension Host with both ``packages/core`` and
     ``packages/syspilot`` active and that the syspilot commands are
     reachable (T-14).
   * AC-10 (``dev-launchconfig-syspilot`` CR): A scenario verifies that
     "Run All" (``compile all`` task) includes ``packages/syspilot`` and
     completes without TypeScript errors (T-15).
   * AC-11 (``dev-launchconfig-syspilot`` CR): A scenario verifies zero
     syspilot trace when ``enthali.jarvis-syspilot`` is absent from the
     host (T-13).

   **Test Scenarios (install combinations, extension host):**

   **T-1 — Core only: core features work**
     Setup: host launched with the core package only.
     Expected: sessions, messaging, reminders, and heartbeat function fully.

   **T-2 — Core only: zero PIM/recorder trace**
     Setup: host with core only.
     Expected: no PIM/recorder view, no PIM/recorder setting in the Settings UI,
     no PIM/recorder command in the palette, no ``jarvis_pim_*`` / ``jarvis_rec_*``
     tool registered.

   **T-3 — Core + PIM: PIM lights up**
     Setup: host with core + PIM.
     Expected: project/event trees, categories, tasks, and Outlook features
     appear; ``jarvis_pim_*`` tools are callable.

   **T-4 — Core + recorder: recording works without PIM**
     Setup: host with core + recorder (no PIM).
     Expected: recording start/stop works against present kinds;
     ``jarvis_rec_*`` tools are callable.

   **T-5 — Core + PIM + recorder: full combination**
     Setup: host with all three.
     Expected: all surfaces coexist; no duplicate-tool errors; trees render.

   **T-6 — No migration after update**
     Setup: existing entities/messages/settings from a monolith install; update
     to core (+ add-ons).
     Expected: entities, message queues, and ``jarvis.*`` settings are read
     unchanged; no reinstall, no data move, no key rename.

   **T-7 — Add-on requires core**
     Setup: attempt to install/activate an add-on without the core.
     Expected: ``extensionDependencies`` prevents activation without
     ``enthali.jarvis``.

   **T-8 — Core + PIM + recorder WITHOUT MCP: zero MCP trace**
     Setup: host with core + PIM + recorder (no ``enthali.jarvis-mcp``).
     Expected: no ``jarvis.mcpPort`` setting in the Settings UI, no MCP status
     bar item, no MCP-related command in the palette.

   **T-9 — Core + MCP: MCP server starts**
     Setup: host with core + MCP (no PIM, no recorder).
     Expected: MCP server starts; ``jarvis.mcpPort`` setting is present and
     visible in the Settings UI; MCP status bar item appears.

   **T-10 — Core + PIM + recorder WITHOUT flow: zero flow trace (``message-flow-diagram`` CR)**
     Setup: host with core + PIM + recorder (no ``enthali.jarvis-flow``).
     Expected: no diagram icon button on the ``jarvisMessages`` view title
     bar, no ``jarvis.openMessageFlow`` command in the palette, no
     "Message Flow" webview can be opened.

   **T-11 — Core + flow: diagram lights up (``message-flow-diagram`` CR)**
     Setup: host with core + ``enthali.jarvis-flow`` (no PIM, no recorder,
     no MCP).
     Expected: the diagram icon button appears on the ``jarvisMessages``
     view title bar; ``jarvis.openMessageFlow`` opens the diagram panel.

   **T-12 — Flow add-on requires core (``message-flow-diagram`` CR)**
     Setup: attempt to activate ``enthali.jarvis-flow`` without
     ``enthali.jarvis`` installed.
     Expected: ``extensionDependencies`` blocks activation.

   **T-13 — Core (no syspilot): zero syspilot trace (``dev-launchconfig-syspilot`` CR)**
     Setup: Launch the Extension Development Host using "Run Core (enthali.jarvis)" —
     i.e. without ``enthali.jarvis-syspilot``.
     Action: Open the Command Palette and search ``syspilot``; open VS Code
     Settings UI and search ``jarvis.syspilot``.
     Expected: No ``jarvis.syspilotUpdate``, ``jarvis.delaySyspilotUpdate``, or
     ``jarvis.SyspilotSkipThisVersion`` commands present. No
     ``jarvis.syspilot.releaseTag`` setting present. No background syspilot
     check fires (no Output Channel log entries from the syspilot module).

   **T-14 — "Run Core + Syspilot" config: syspilot activates (``dev-launchconfig-syspilot`` CR)**
     Setup: In ``.vscode/launch.json`` select the "Run Core + Syspilot" launch
     configuration and press F5.
     Action: Once the Extension Development Host launches, open the Command
     Palette and search ``syspilot``.
     Expected: The syspilot commands appear (``jarvis.syspilotUpdate``,
     ``jarvis.delaySyspilotUpdate``, ``jarvis.SyspilotSkipThisVersion``).
     The ``jarvis.syspilot.releaseTag`` setting is visible in the Settings
     UI. The Jarvis Entities tree and Messages tree function normally
     (core also active). No activation errors in the Output Channel.

   **T-15 — "compile all" task includes syspilot (``dev-launchconfig-syspilot`` CR)**
     Setup: Ensure all packages are present and dependencies installed
     (``npm install`` at workspace root). Open the VS Code Terminal.
     Action: Run the "compile all" task (Terminal → Run Task… → "compile all"),
     or equivalently execute:
     ``npx tsc -p packages/core && npx tsc -p packages/pim && npx tsc -p packages/recorder && npx tsc -p packages/mcp && npx tsc -p packages/flow && ... && npx tsc -p packages/syspilot``
     Action: Observe the task output.
     Expected: The task completes with exit code 0. All packages including
     ``packages/syspilot`` compile without TypeScript errors. The terminal
     shows the final ``npx tsc -p packages/syspilot`` step completing
     successfully.
