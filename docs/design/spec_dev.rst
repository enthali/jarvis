Developer Tooling Design Specifications
=========================================

.. spec:: Launch Configuration File
   :id: SPEC_DEV_LAUNCHCONFIG
   :status: implemented
   :links: REQ_DEV_LAUNCHCONFIG; SPEC_MOD_MONOREPO

   **Description:**
   ``.vscode/launch.json`` provides one progressive multi-root
   ``extensionHost`` configuration per install combination, each pairing
   ``--extensionDevelopmentPath`` args (one per package) with a matching
   ``outFiles`` glob and a ``preLaunchTask`` from ``.vscode/tasks.json``
   that compiles exactly that combination's packages in dependency order.
   Rewritten across the modular-delivery CRs (PIM/Recorder/MCP) and,
   as of ``message-flow-diagram``, extended to include ``packages/flow``
   — this rewrite also reconciles the spec text with the monorepo reality
   for the first time since those earlier CRs (a pre-existing drift,
   flagged and closed here rather than deferred, since the same file is
   already being touched by this CR).

   .. code-block:: json

      {
        "version": "0.2.0",
        "configurations": [
          {
            "name": "Run Core (enthali.jarvis)",
            "type": "extensionHost",
            "args": ["--extensionDevelopmentPath=${workspaceFolder}/packages/core"],
            "outFiles": ["${workspaceFolder}/packages/core/out/**/*.js"],
            "preLaunchTask": "compile core"
          },
          {
            "name": "Run Core + PIM",
            "args": [
              "--extensionDevelopmentPath=${workspaceFolder}/packages/core",
              "--extensionDevelopmentPath=${workspaceFolder}/packages/pim"
            ],
            "preLaunchTask": "compile core+pim"
          },
          {
            "name": "Run Core + PIM + Recorder",
            "args": ["...core", "...pim", "...recorder"],
            "preLaunchTask": "compile core+pim+recorder"
          },
          {
            "name": "Run Core + Syspilot",
            "args": [
              "--extensionDevelopmentPath=${workspaceFolder}/packages/core",
              "--extensionDevelopmentPath=${workspaceFolder}/packages/syspilot"
            ],
            "preLaunchTask": "compile core+syspilot"
          },
          {
            "name": "Run All (Core + PIM + Recorder + MCP + Flow + Syspilot)",
            "args": ["...core", "...pim", "...recorder", "...mcp", "...flow", "...syspilot"],
            "preLaunchTask": "compile all"
          },
          {
            "name": "Run Extension (monolith — retired, S4b)",
            "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
            "outFiles": ["${workspaceFolder}/out/**/*.js"],
            "preLaunchTask": "npm: compile"
          }
        ]
      }

   (``type``/``request``/full ``outFiles`` arrays omitted above for
   brevity — see ``.vscode/launch.json`` for the literal file.)

   **``.vscode/tasks.json`` compile-task chain:**

   Each launch config's ``preLaunchTask`` is a ``shell`` task chaining
   ``npx tsc -p packages/<pkg>`` invocations in dependency order (core
   first, always), one task per progressive combination — ``compile
   core``, ``compile core+pim``, ``compile core+pim+recorder``,
   ``compile all``. As of this CR, ``compile all`` also chains a
   post-``tsc`` bundling step for ``packages/flow`` — the first package
   requiring more than ``tsc`` to produce a runnable ``out/``, since its
   webview script is esbuild-bundled rather than emitted 1:1 by ``tsc``:

   .. code-block:: text

      npx tsc -p packages/core && npx tsc -p packages/pim &&
      npx tsc -p packages/recorder && npx tsc -p packages/mcp &&
      npx tsc -p packages/flow &&
      cd packages/flow && node build.js && node webview-build.js && cd ../.. &&
      npx tsc -p packages/syspilot

   The original ``npm: compile``/``npm: watch`` tasks remain for the
   retired monolith (S4b) config only.

   **Acceptance Criteria:**

   * AC-1: One ``extensionHost`` launch configuration exists per supported
     install combination (currently: Core; Core+PIM; Core+PIM+Recorder;
     Run All).
   * AC-2: Each configuration's ``preLaunchTask`` compiles/builds exactly
     the packages it launches — no more, no fewer — in dependency order
     (core first); for a package whose build requires steps beyond
     ``tsc`` (e.g. ``packages/flow``'s ``build.js``/``webview-build.js``
     esbuild bundling), those steps SHALL be chained immediately after
     that package's own ``tsc`` invocation.
   * AC-3: "Run All" SHALL always include every package added by a
     subsequent add-on CR (PIM → Recorder → MCP → Flow → Syspilot, in that
     order); each new add-on package SHALL both (a) get its own progressive
     configuration if it introduces a meaningfully distinct debugging
     combination, and (b) always be added to "Run All"/``compile all``.
   * AC-4: The retired monolith configuration/task (S4b) remains present
     for compatibility but is not extended with new packages — it targets
     the pre-split root build only.
   * AC-5: This spec's code sample SHALL be kept in sync with the literal
     ``.vscode/launch.json``/``.vscode/tasks.json`` content whenever either
     file is modified by a CR — the drift closed by this CR (spec had not
     been updated since before the PIM/Recorder/MCP splits) SHALL NOT
     recur.


.. spec:: Implement Agent Manual Test Step
   :id: SPEC_DEV_IMPLTEST
   :status: implemented
   :links: REQ_DEV_TESTSUMMARY

   **Description:**
   Add a new step to ``syspilot.implement.agent.md`` between "Quality Gates" and
   "Update Documentation":

   **Step: Manual User Acceptance Test**

   1. Compile the extension: ``npm run compile``
   2. Launch the Extension Development Host:
      ``code --extensionDevelopmentPath="${workspaceFolder}"``
   3. Present the user with a test checklist using ``ask_questions``:

      * Derive items from the Change Document's REQ acceptance criteria
      * Format as a confirmation prompt with pass/fail

   4. If user confirms: proceed to commit
   5. If user rejects: go back to fix issues

   The test summary format:

   .. code-block:: text

      ## Manual Test — {Change Name}

      Extension Development Host launched. Please verify:

      - [ ] {AC from REQ_1}
      - [ ] {AC from REQ_2}
      - ...

      Confirm all items pass?


.. spec:: Test Protocol Format
   :id: SPEC_DEV_TESTPROTOCOL
   :status: implemented
   :links: REQ_DEV_TESTPROTOCOL

   **Description:**
   After the manual test ``ask_questions`` step, the Implement Agent creates
   ``docs/changes/tst-<change-name>.md`` with the following format:

   .. code-block:: markdown

      # Test Protocol: <change-name>

      **Date**: YYYY-MM-DD
      **Change Document**: docs/changes/<change-name>.md
      **Result**: PASSED | FAILED

      ## Test Results

      | # | REQ ID | AC | Description | Result |
      |---|--------|-----|-------------|--------|
      | 1 | REQ_xxx | AC-1 | ... | PASS |
      | 2 | REQ_xxx | AC-2 | ... | FAIL |

      ## Notes

      {Optional user freeform notes from ask_questions}

   **Verify Agent integration:**
   The Verify Agent SHALL read ``docs/changes/tst-<change-name>.md`` and:

   * Check that the file exists
   * Check that the overall result is PASSED
   * Include test protocol status in the verification report


.. spec:: Verify Agent Protocol Check
   :id: SPEC_DEV_VERIFYPROTOCOL
   :status: implemented
   :links: REQ_DEV_TESTPROTOCOL

   **Description:**
   Update ``syspilot.verify.agent.md`` to include a test protocol check step.
   Before marking specs as implemented, the Verify Agent SHALL:

   1. Check if ``docs/changes/tst-<change-name>.md`` exists
   2. Read the file and verify the overall ``**Result**`` is ``PASSED``
   3. Check that no row in the test results table contains ``FAIL``
   4. Include a "Test Protocol" section in the verification report:

      * ✅ Protocol found, result: PASSED → proceed
      * ⚠️ Protocol missing → note in report, ask user to clarify
      * ❌ Protocol found, result: FAILED → stop, do not mark as implemented

   The check is placed after code verification and before updating statuses.


.. spec:: Git Workflow Section in namingconventions.rst
   :id: SPEC_DEV_CONVENTIONS
   :status: implemented
   :links: REQ_DEV_CONVENTIONS

   **Description:**
   Add a "Git Workflow" section to `docs/namingconventions.rst` covering the four
   conventions: branch naming, squash merge strategy, branch retention, and no direct
   commits to `main`.

   The section is already documented as a list-table in `namingconventions.rst`.

   .. code-block:: rst

     .. list-table:: Git Workflow
        :header-rows: 1
        :widths: 30 70

        * - Convention
          - Rule
        * - Branch naming
          - `feature/<change-name>` where name matches the Change Document filename
        * - Merge strategy
          - Squash merge into `main` — one clean commit per feature
        * - Branch retention
          - Keep locally after merge; do NOT push to origin
        * - No direct commits
          - All changes including hotfixes go through the syspilot Change process

   <!-- Implementation: SPEC_DEV_CONVENTIONS -->
   <!-- Requirements: REQ_DEV_CONVENTIONS -->


.. spec:: Unified LogOutputChannel
   :id: SPEC_DEV_LOGCHANNEL
   :status: implemented
   :links: REQ_DEV_LOGGING

   **Description:**
   Create a single ``LogOutputChannel`` in ``activate()`` and pass it to every module.

   **Channel creation** (``src/extension.ts``, inside ``activate()``):

   .. code-block:: typescript

      const log = vscode.window.createOutputChannel('Jarvis', { log: true });
      context.subscriptions.push(log);

   **Module wiring:**

   * ``activateHeartbeat(context, messageProvider, resolveMessagesPath, log, actorScanner)``
     — new fourth parameter (log) and fifth parameter (Actor scanner);
     ``activateHeartbeat`` no longer creates its own channel.
   * ``checkForUpdates(context, silent, log)``
     — new third parameter.
   * ``new ActorScanner(resolveRoot, onDidChange)`` — the scanner logs through
     the shared ``log`` passed to ``extension.ts`` helpers.
   * Inline logging in ``extension.ts`` for ``[MSG]``, ``[Scanner]``, ``[Update]``
     commands uses the same ``log`` reference.

   **heartbeat.ts type changes:**

   All functions and the ``HeartbeatScheduler`` class that previously accepted
   ``vscode.OutputChannel`` now accept ``vscode.LogOutputChannel``.

   * ``loadJobs()``: ``channel.error(...)`` instead of ``channel.appendLine(...)``
   * ``spawnStep()``: collect stdout/stderr per-line, call ``channel.info(...)``
     instead of ``channel.append(...)``
   * ``executeAgentStep()``: ``channel.debug(...)`` for prompt/model/response-length,
     ``channel.info(...)`` for write-to-file
   * ``executeQueueStep()``: ``channel.info(...)``
   * ``notifyFailure()``: ``channel.error(...)``
   * ``HeartbeatScheduler.tick()``: ``channel.trace(...)`` for tick marker (optional)

   **updateCheck.ts changes:**

   ``checkForUpdates(context, silent, log)`` gains a third parameter
   ``log: vscode.LogOutputChannel``:

   * ``log.info('[Update] Checking for updates…')`` at start
   * ``log.info('[Update] Current: vX.Y.Z, latest: vA.B.C')`` after fetch
   * ``log.info('[Update] Up to date')`` or ``log.info('[Update] New version available: vA.B.C')``
   * ``log.error('[Update] …')`` on fetch/download failures
   * ``log.info('[Update] Downloaded and installed vA.B.C')`` on success

   **Actor scanner logging:**

   * ``log.info('[Scanner] manual rescan triggered')`` in ``jarvis.rescan``
   * ``log.info('[Scanner] N Actor(s)')`` when a scan changed the cache

   **extension.ts inline logging:**

   * ``log.info('[MSG] sendToSession: …')`` in sendToSession LM tool
   * ``log.info('[MSG] readMessage: …')`` in readMessage LM tool
   * ``log.info('[MSG] sendMessages: delivering to …')`` in sendMessages command
   * ``log.info('[Scanner] Manual rescan triggered')`` in rescan command
   * ``log.info('[Update] Automatic update check on activation')`` at startup


.. spec:: Activation Events & Boot Sequence
   :id: SPEC_DEV_ACTIVATION
   :status: approved
   :links: REQ_DEV_ACTIVATION; SPEC_EXP_EXTENSION; SPEC_ACTOR_SCANNER

   **Description:**
   Documents the declared activation events and the subsystem initialization order
   in ``activate()``. This is the single statement of the boot order;
   ``SPEC_EXP_EXTENSION`` covers only the manifest.

   **Activation events** (``package.json``):

   .. code-block:: json

      "activationEvents": [
        "onStartupFinished",
        "onView:jarvisActors",
        "onView:jarvisMessages",
        "onView:jarvisReminders",
        "onView:jarvisHeartbeat"
      ]

   ``onStartupFinished`` ensures the extension activates even if no Jarvis view is
   visible. The ``onView:`` events provide faster activation when a view is opened
   before startup completes.

   **Boot sequence** (``src/extension.ts`` ``activate()``):

   1. ``vscode.window.createOutputChannel('Jarvis', { log: true })`` — shared
      LogOutputChannel; ``initSessionLookup(...)``; path resolver; hook engine;
      touch store.
   2. ``new ActorScanner(configPaths.getActorsDir, () => actorTreeProvider.refresh())``,
      ``new ActorTreeProvider(...)``, ``createTreeView('jarvisActors', …)`` with
      the dynamic title (``SPEC_ACTOR_TREE``).
   3. ``initInjectPrompt({ actors: actorScanner, … })`` (``SPEC_INJ_INJECT``).
   4. ``actorScanner.rescan()`` and ``actorScanner.startTimer(jarvis.scanInterval)``
      (``SPEC_ACTOR_SCANNER``).
   5. Heartbeat block (if ``jarvis.heartbeat.enabled``):
      ``activateHeartbeat(context, messageProvider, resolveMessagesPath, log, actorScanner)``,
      then ``scheduler.unregisterJob('Jarvis: Rescan')`` for a leftover job.
   6. Messages and Reminders blocks (each behind its toggle).
   7. ``checkForUpdates(context, true, log)`` — automatic update check (if enabled).
   8. Register commands, Actor tools and the remaining LM tools; configuration
      listeners (``jarvis.actors.folder``, ``jarvis.scanInterval``,
      ``jarvis.touchedFiles.windowDays``, hooks, gitignore).
   9. Push all disposables to ``context.subscriptions``; return the
      ``JarvisCoreApi`` (``SPEC_ENG_API``).


.. spec:: Graceful Deactivation
   :id: SPEC_DEV_DISPOSAL
   :status: implemented
   :links: REQ_DEV_DISPOSAL

   **Description:**
   Documents which disposables are registered in ``context.subscriptions`` and the
   ``deactivate()`` contract.

   **Disposables in context.subscriptions** (``src/extension.ts``):

   * **Commands**: every ``registerCommand`` result in ``activate()``,
     including the Actor commands (``jarvis.newActor``,
     ``jarvis.openActorSession``, ``jarvis.openActorFile``, ``jarvis.rescan``,
     context-menu and touched-files commands) — plus those created in
     ``activateHeartbeat``
   * **LM Tools**: every ``engine.registerTool`` result, including
     ``jarvis_createActor``, ``jarvis_listActors``
   * **Tree Views**: ``actorsView``, ``messageView``, ``remindersView``,
     ``heartbeatView`` (created in ``activateHeartbeat``)
   * **Status Bar Items**: heartbeat status bar item (created in
     ``activateHeartbeat``)
   * **Event Listeners**: ``workspace.onDidChangeConfiguration`` handlers
   * **LogOutputChannel** (1): ``log``
   * **Actor scanner** (1): ``actorScanner`` (its ``dispose()`` stops the
     background timer)
   * **Scheduler wrapper** (1): ``{ dispose: () => scheduler.dispose() }``
     (pushed in ``activateHeartbeat``)

   **deactivate() function:**

   .. code-block:: typescript

      export async function deactivate() {
          await stopMcpServer();
      }

   The MCP server is stopped explicitly because it manages TCP sockets that
   are not tracked by ``context.subscriptions``. All other subsystems are
   cleaned up by VS Code disposing the subscriptions array.
