Modular Delivery UAT Design Specifications
==========================================

.. spec:: Modular Install Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_MODULAR_INSTALL
   :status: approved
   :links: REQ_UAT_MODULAR_INSTALL

   **Description:**
   Step-by-step procedures and expected outcomes for the modular-install
   acceptance scenarios, executed in an Extension Development Host launched with
   a chosen set of packages. Final product acceptance is verified only at the
   end, against the actually-split packages; intermediate runs are confidence
   checks. Engine internals are verified separately by unit tests against the
   ``SPEC_ENG_*`` acceptance criteria.

   **Test Setup:**

   * Extension host launched from a built workspace with a selected package set
     (core only / core+pim / core+recorder / all three).
   * Workspace: ``testdata/test.code-workspace`` with existing entity fixtures.
   * Jarvis Output Channel open (View → Output → Jarvis).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Core only: core features work

          *AC: REQ_MOD_CORE 1*
        - Launch host with core only. Exercise sessions, messaging, reminders,
          heartbeat.
        - All four function fully.

      * - T-2

          Core only: zero PIM/recorder trace

          *AC: REQ_MOD_ZEROTRACE 1-4*
        - With core only: open Settings UI, Command Palette; enumerate views and
          registered tools.
        - No PIM/recorder setting, command, view, or ``jarvis_pim_*`` /
          ``jarvis_rec_*`` tool exists anywhere.

      * - T-3

          Core + PIM lights up

          *AC: REQ_MOD_ADDONS 1-2*
        - Add PIM to the host. Check trees and tools.
        - Project/event trees, categories, tasks, Outlook appear;
          ``jarvis_pim_*`` tools callable.

      * - T-4

          Core + recorder without PIM

          *AC: SPEC_MOD_REC_PKG 3*
        - Add recorder (no PIM). Start/stop a recording.
        - Recording works against present kinds; ``jarvis_rec_*`` tools callable;
          no PIM required.

      * - T-5

          Full combination

          *AC: REQ_MOD_ADDONS 1-4*
        - Host with core+pim+recorder.
        - All surfaces coexist; no duplicate-tool errors; trees render correctly.

      * - T-6

          No migration after update

          *AC: REQ_MOD_NOMIGRATION 1-4*
        - Start from monolith-era entities/messages/settings; update to core
          (+ add-ons).
        - Entities, message queues, and ``jarvis.*`` settings read unchanged; no
          reinstall, no data move, no key rename.

      * - T-7

          Add-on requires core

          *AC: REQ_MOD_ADDONS 1-2*
        - Attempt to activate an add-on without the core installed.
        - ``extensionDependencies`` blocks activation without ``enthali.jarvis-core``.

      * - T-8

          Core + PIM + recorder WITHOUT MCP: zero MCP trace

          *AC: REQ_MOD_ZEROTRACE 1-4*
        - Host with core+pim+recorder (no ``enthali.jarvis-mcp``). Open Settings
          UI, Command Palette; check status bar.
        - No ``jarvis.mcpPort`` setting, no MCP status bar item, no MCP-related
          command exists anywhere.

      * - T-9

          Core + MCP: MCP server starts

          *AC: REQ_MOD_ADDONS 5*
        - Host with core + MCP (no PIM, no recorder). Check Settings UI, status
          bar, Output channel.
        - MCP server starts; ``jarvis.mcpPort`` setting present and visible;
          MCP status bar item appears.

      * - T-10

          Core + PIM + recorder WITHOUT flow: zero flow trace

          *AC: REQ_MOD_ZEROTRACE 6*
        - Host with core+pim+recorder (no ``enthali.jarvis-flow``). Open the
          ``jarvisMessages`` view title bar and Command Palette.
        - No diagram icon button on the view title bar, no
          ``jarvis.openMessageFlow`` command in the palette, no "Message
          Flow" webview can be opened.

      * - T-11

          Core + flow: diagram lights up

          *AC: REQ_MOD_ADDONS 6*
        - Host with core + ``enthali.jarvis-flow`` (no PIM, no recorder, no
          MCP). Open the ``jarvisMessages`` view; click the diagram icon
          button.
        - Diagram icon button appears on the view title bar;
          ``jarvis.openMessageFlow`` opens the "Message Flow" webview panel.

      * - T-12

          Flow add-on requires core

          *AC: REQ_MOD_ADDONS 6*
        - Attempt to activate ``enthali.jarvis-flow`` without
          ``enthali.jarvis`` installed.
        - ``extensionDependencies`` blocks activation without
          ``enthali.jarvis``.

      * - T-13

          Core (no syspilot): zero syspilot trace

          *AC: SPEC_DEV_LAUNCHCONFIG AC-3, REQ_MOD_ZEROTRACE*
        - Launch host using "Run Core (enthali.jarvis)" (no syspilot).
          Open Command Palette, search ``syspilot``. Open Settings UI,
          search ``jarvis.syspilot``.
        - No ``jarvis.syspilotUpdate``, ``jarvis.delaySyspilotUpdate``, or
          ``jarvis.SyspilotSkipThisVersion`` commands found. No
          ``jarvis.syspilot.releaseTag`` setting found. No syspilot
          Output Channel log entries.

      * - T-14

          "Run Core + Syspilot" config: syspilot activates

          *AC: SPEC_DEV_LAUNCHCONFIG AC-3*
        - Select "Run Core + Syspilot" in ``.vscode/launch.json`` and
          press F5. Once the Extension Development Host launches, open
          the Command Palette and search ``syspilot``.
        - ``jarvis.syspilotUpdate``, ``jarvis.delaySyspilotUpdate``, and
          ``jarvis.SyspilotSkipThisVersion`` appear in the palette.
          ``jarvis.syspilot.releaseTag`` visible in Settings UI. Core
          features (Entities tree, Messages) function normally. No
          activation errors in Output Channel.

      * - T-15

          ``compile all`` task chain includes packages/syspilot

          *AC: SPEC_DEV_LAUNCHCONFIG AC-3, AC-2*
        - Run the "compile all" VS Code task (or execute the equivalent
          ``npx tsc -p packages/syspilot`` chain manually). Observe
          the terminal output.
        - Task completes with exit code 0. The ``npx tsc -p packages/syspilot``
          step is included in the chain and completes without TypeScript
          errors. No compile errors in any package.

      * - T-16

          packages/syspilot in release.yml packaging step

          *AC: REQ_UAT_MODULAR_INSTALL AC-7, SPEC_REL_COREGH*
        - Static structural check (no runtime). Open
          ``.github/workflows/release.yml`` and inspect the packaging
          and upload steps.
        - ``packages/syspilot`` is listed as a packaged target. The
          GitHub Release upload step includes a syspilot VSIX pattern
          (``packages/syspilot/enthali.jarvis-syspilot-*.vsix`` or
          equivalent) alongside the other packages. No separate manual
          packaging step is needed for syspilot.

      * - T-17

          Suite extension pack shows deprecated notice

          *AC: REQ_UAT_MODULAR_INSTALL AC-7, SPEC_MOD_SUITE AC-1*
        - Static check. Open ``packages/suite/package.json`` and
          ``packages/suite/README.md``.
        - ``packages/suite/package.json`` description includes
          "deprecated". ``packages/suite/README.md`` states deprecated
          and directs users to install individual components.
          The ``extensionPack`` array does NOT include
          ``enthali.jarvis-syspilot``.
