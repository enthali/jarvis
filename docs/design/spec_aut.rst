Automation Design Specifications
=================================

.. spec:: YAML Job Schema and TypeScript Interfaces
   :id: SPEC_AUT_JOBSCHEMA
   :status: implemented
   :links: REQ_AUT_JOBCONFIG

   **Description:**
   Define TypeScript interfaces for the heartbeat YAML structure and implement the
   job loader using the already-present ``js-yaml`` dependency.

   **TypeScript interfaces** (``src/heartbeat.ts``):

   .. code-block:: typescript

      interface HeartbeatStep {
        type: 'python' | 'powershell' | 'command' | 'agent' | 'queue';
        run?: string;       // script path or VS Code command ID (omitted for agent/queue)
        prompt?: string;    // agent: path to prompt file
        outputFile?: string; // agent: path to write LLM response
        append?: boolean;   // agent: append to outputFile instead of overwrite
        destination?: string; // queue: target chat tab label
        sender?: string;    // queue: originating session or component
        text?: string;      // queue: message content
      }

      interface HeartbeatJob {
        name: string;
        schedule: string;   // 5-field cron string or "manual"
        steps: HeartbeatStep[];
        enabled?: boolean;  // default true; false = paused (scheduler skips this job)
      }

   **Job loader**:

   .. code-block:: typescript

      export function loadJobs(
        filePath: string,
        outputChannel: vscode.LogOutputChannel
      ): HeartbeatJob[] {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = yaml.load(raw) as { jobs: HeartbeatJob[] };
          return data?.jobs ?? [];
        } catch (e) {
          outputChannel.error(`[Heartbeat] Failed to load config: ${e}`);
          return [];
        }
      }


.. spec:: Scheduler Timer and Cron Dispatch
   :id: SPEC_AUT_SCHEDULERLOOP
   :status: implemented
   :links: REQ_AUT_SCHEDULER; REQ_AUT_JOBCONFIG; SPEC_CFG_HEARTBEATSETTINGS

   **Description:**
   Background scheduler implemented as a class in ``src/heartbeat.ts``. Cron
   matching uses an inline micro-matcher (no new dependency).

   **Inline cron micro-matcher** (5-field, minute resolution):

   .. code-block:: typescript

      function matchesCronField(field: string, value: number): boolean {
        if (field === '*') return true;
        if (field.startsWith('*/')) return value % parseInt(field.slice(2)) === 0;
        if (field.includes('-')) {
          const [a, b] = field.split('-').map(Number);
          return value >= a && value <= b;
        }
        if (field.includes(',')) {
          return field.split(',').map(Number).includes(value);
        }
        return parseInt(field) === value;
      }

      function matchesCron(expr: string, now: Date): boolean {
        const [min, hour, dom, month, dow] = expr.split(' ');
        return matchesCronField(min,   now.getMinutes())
            && matchesCronField(hour,  now.getHours())
            && matchesCronField(dom,   now.getDate())
            && matchesCronField(month, now.getMonth() + 1)
            && matchesCronField(dow,   now.getDay());
      }

   **Scheduler class**:

   .. code-block:: typescript

      class HeartbeatScheduler {
        private timer: NodeJS.Timeout | undefined;
        private lastFired = new Map<string, number>();  // jobName → minute timestamp

        start(context: vscode.ExtensionContext): void { /* see dispose + restart */ }

        tick(jobs: HeartbeatJob[]): void {
          const now = new Date();
          const minuteKey = Math.floor(now.getTime() / 60000);
          for (const job of jobs) {
            if (job.enabled === false) continue;  // paused — skip entirely
            if (job.schedule === 'manual') continue;
            if (!matchesCron(job.schedule, now)) continue;
            if (this.lastFired.get(job.name) === minuteKey) continue;
            this.lastFired.set(job.name, minuteKey);
            // dispatch – silent idle: no else-branch log
            executeJob(job, outputChannel).then(result => {
              if (!result.success) { notifyFailure(job, result); }
            });
          }
          updateStatusBar(jobs, now);
        }

        dispose(): void { if (this.timer) { clearInterval(this.timer); } }
      }

   Timer restart on configuration change is handled by ``SPEC_CFG_HEARTBEATSETTINGS``.

   **Job registration** (see ``SPEC_AUT_JOBREG``):

   ``registerJob()`` and ``unregisterJob()`` are public methods on this class
   that read–modify–write the heartbeat YAML file and call ``reload()`` +
   tree refresh. They enable extension modules to contribute periodic jobs
   without managing their own timers.


.. spec:: Job Step Executor
   :id: SPEC_AUT_EXECUTOR
   :status: implemented
   :links: REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT

   **Description:**
   ``executeJob`` runs a job's steps sequentially, routing output to the Output
   Channel and aborting on the first failure.

   .. code-block:: typescript

      interface ExecResult {
        success: boolean;
        stepType?: HeartbeatStep['type'];
        error?: string;
      }

      export async function executeJob(
        job: HeartbeatJob,
        outputChannel: vscode.LogOutputChannel
      ): Promise<ExecResult> {
        for (const step of job.steps) {
          const result = await runStep(step, outputChannel);
          if (!result.success) return result;
        }
        return { success: true };
      }

   ``executeJob`` and ``runStep`` are closures that capture ``configDir``,
   ``queuePath``, and ``messageTreeProvider`` from their enclosing
   ``activateHeartbeat()`` scope. This avoids widening their signatures for
   every new step type.

   **Step dispatch** (``runStep``):

   - ``python``: resolve executable via ``resolvePythonInterpreter()``
     (``heartbeat-venv-autodetect`` CR — see below); run via ``child_process.spawn``;
     stdout/stderr appended to Output Channel line-by-line; resolve on ``close`` event;
     non-zero exit code →
     ``{ success: false, stepType: 'python', error: \`exit \${code}\` }``
   - ``powershell``: same ``child_process.spawn`` pattern with ``pwsh`` (fallback
     ``powershell``) as the executable
   - ``command``: ``await vscode.commands.executeCommand(step.run)`` wrapped in
     try/catch; thrown exception → ``{ success: false, stepType: 'command', error: message }``.
     If the command is not registered (``getCommands()``), soft-skip with
     ``{ success: true }`` — see ``SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP``.
   - ``agent``: delegated to ``executeAgentStep()`` (see ``SPEC_AUT_AGENTEXEC``)
   - ``queue``: delegated to ``executeQueueStep()`` (see ``SPEC_AUT_QUEUEEXEC``)

   **Python interpreter resolution** (``resolvePythonInterpreter()``,
   ``heartbeat-venv-autodetect`` CR, ``REQ_AUT_JOBEXEC`` AC-1):

   .. code-block:: typescript

      function resolvePythonInterpreter(): string {
        const configured = vscode.workspace
          .getConfiguration('python')
          .get<string>('defaultInterpreterPath', '');
        if (configured) { return configured; }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
          const candidates = process.platform === 'win32'
            ? ['.venv/Scripts/python.exe', 'venv/Scripts/python.exe']
            : ['.venv/bin/python', 'venv/bin/python'];
          for (const rel of candidates) {
            const candidate = path.join(workspaceRoot, rel);
            if (fs.existsSync(candidate)) { return candidate; }
          }
        }

        return 'python';
      }

   Called once per ``python`` step (no caching — venvs are cheap to stat and may
   change between heartbeat ticks, e.g. after a workspace reload). Resolution order
   is strictly sequential: an empty/whitespace-only ``defaultInterpreterPath`` is
   treated as "not set" (falls through to auto-detection), mirroring the prior
   ``|| 'python'`` truthiness check.


.. spec:: Manual Job VS Code Command
   :id: SPEC_AUT_MANUALCOMMAND
   :status: implemented
   :links: REQ_AUT_MANUALRUN; REQ_AUT_JOBEXEC

   **Description:**
   Register ``jarvis.runHeartbeatJob`` in ``extension.ts``. Implementation lives in
   ``src/heartbeat.ts`` as ``runManualJob()``.

   .. code-block:: typescript

      async function runManualJob(
        jobs: HeartbeatJob[],
        outputChannel: vscode.LogOutputChannel
      ): Promise<void> {
        const manual = jobs.filter(j => j.schedule === 'manual');
        if (manual.length === 0) {
          vscode.window.showInformationMessage('Jarvis: no manual jobs configured.');
          return;
        }
        const pick = await vscode.window.showQuickPick(
          manual.map(j => j.name),
          { placeHolder: 'Select a job to run' }
        );
        if (!pick) return;
        const job = manual.find(j => j.name === pick)!;
        const result = await executeJob(job, outputChannel);
        if (!result.success) { notifyFailure(job, result); }
      }

   Registered in ``extension.ts``:

   .. code-block:: typescript

      context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.runHeartbeatJob', () =>
          runManualJob(scheduler.currentJobs, outputChannel)
        )
      );


.. spec:: Status Bar Next-Job Display
   :id: SPEC_AUT_STATUSBARITEM
   :status: implemented
   :links: REQ_AUT_STATUSBAR; SPEC_AUT_SCHEDULERLOOP

   **Description:**
   A single ``StatusBarItem`` updated after every scheduler tick using the inline
   cron micro-matcher to compute the next fire time.

   .. code-block:: typescript

      function nextFireMinutes(expr: string, from: Date): number {
        // Scan forward up to 7 days (10080 minutes) for the next match
        for (let delta = 1; delta <= 10080; delta++) {
          const candidate = new Date(from.getTime() + delta * 60000);
          if (matchesCron(expr, candidate)) return delta;
        }
        return -1;
      }

      function updateStatusBar(
        jobs: HeartbeatJob[],
        now: Date,
        item: vscode.StatusBarItem
      ): void {
        const scheduled = jobs.filter(j => j.schedule !== 'manual');
        if (scheduled.length === 0) {
          item.text = 'Heartbeat: idle';
          return;
        }
        let best: { name: string; delta: number } | undefined;
        for (const job of scheduled) {
          const delta = nextFireMinutes(job.schedule, now);
          if (delta >= 0 && (!best || delta < best.delta)) {
            best = { name: job.name, delta };
          }
        }
        if (best) {
          const fireTime = new Date(now.getTime() + best.delta * 60000);
          const hhmm = fireTime.toTimeString().slice(0, 5);
          item.text = `$(clock) ${best.name} ${hhmm}`;
        } else {
          item.text = 'Heartbeat: idle';  // jobs exist but none fire within 7 days
        }
      }

   ``StatusBarItem`` created with ``StatusBarAlignment.Left`` at activation.


.. spec:: Output Channel and Failure Notification
   :id: SPEC_AUT_OUTPUTCHANNEL
   :status: implemented
   :links: REQ_AUT_OUTPUT; SPEC_AUT_EXECUTOR; SPEC_DEV_LOGCHANNEL

   **Description:**
   The shared ``LogOutputChannel`` is created in ``activate()``
   (see ``SPEC_DEV_LOGCHANNEL``) and passed into ``activateHeartbeat()`` as a
   parameter. ``activateHeartbeat`` no longer creates its own channel.
   Failure notification uses ``channel.error()``.

   **Stderr tail capture** (``heartbeat-venv-autodetect`` CR, ``REQ_AUT_OUTPUT`` AC-5):
   ``spawnStep()`` accumulates stderr chunks into a bounded ring buffer (last 3
   lines) alongside the existing per-line ``outputChannel.debug()`` logging — the
   full stream is still logged in full at debug level, only the last 3 lines are
   retained in memory. On non-zero exit, ``ExecResult.error`` is extended to
   ``\`exit \${code}\${stderrTail ? '\\n' + stderrTail : ''}\`}`` so
   ``notifyFailure()`` (unchanged itself) surfaces the tail via the existing
   ``result.error`` field in the error notification. ``ExecResult`` gains no new
   field — the tail is folded into ``error`` to avoid touching every ``ExecResult``
   producer (``agent``/``command``/``queue`` steps are unaffected and continue to
   report plain messages).

   .. code-block:: typescript

      // activateHeartbeat() receives the shared channel:
      export function activateHeartbeat(
        context: vscode.ExtensionContext,
        messageTreeProvider: MessageTreeProvider,
        resolveMessagesPath: () => string,
        outputChannel: vscode.LogOutputChannel   // ← new parameter
      ): HeartbeatScheduler { ... }

      function notifyFailure(
        job: HeartbeatJob,
        result: ExecResult,
        outputChannel: vscode.LogOutputChannel
      ): void {
        const msg = `Jarvis: job "${job.name}" failed — ${result.stepType} ${result.error}`;
        vscode.window.showErrorMessage(msg);
        outputChannel.error(`[Heartbeat] ${msg}`);
      }


.. spec:: Agent Step Executor
   :id: SPEC_AUT_AGENTEXEC
   :status: implemented
   :links: REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT; SPEC_AUT_EXECUTOR; SPEC_DEV_LOGCHANNEL

   **Description:**
   ``executeAgentStep`` sends a prompt file to the VS Code LM API and optionally
   writes the response to a file. Implemented in ``src/heartbeat.ts``.

   .. code-block:: typescript

      async function executeAgentStep(
        step: HeartbeatStep,
        outputChannel: vscode.LogOutputChannel,
        configDir: string
      ): Promise<ExecResult> {
        const promptPath = resolveScriptPath(step.prompt!, configDir);
        outputChannel.info(`[Heartbeat] agent: prompt=${promptPath}`);
        try {
          const promptText = fs.readFileSync(promptPath, 'utf8');
          const models = await vscode.lm.selectChatModels(
            { vendor: 'copilot', family: 'gpt-4o' }
          );
          if (models.length === 0) {
            return { success: false, stepType: 'agent', error: 'no LM model available' };
          }
          const model = models[0];
          outputChannel.info(`[Heartbeat] agent: model=${model.id}`);
          const messages = [vscode.LanguageModelChatMessage.User(promptText)];
          const response = await model.sendRequest(messages, {});
          let text = '';
          for await (const chunk of response.text) { text += chunk; }
          outputChannel.info(
            `[Heartbeat] agent: response length=${text.length}`
          );
          if (step.outputFile) {
            const outPath = resolveScriptPath(step.outputFile, configDir);
            if (step.append) {
              fs.appendFileSync(outPath, text);
            } else {
              fs.writeFileSync(outPath, text);
            }
            outputChannel.info(`[Heartbeat] agent: written to ${outPath}`);
          }
          return { success: true };
        } catch (e) {
          return { success: false, stepType: 'agent', error: (e as Error).message };
        }
      }

   Called from ``runStep`` as a new branch:

   .. code-block:: typescript

      if (step.type === 'agent') {
        return executeAgentStep(step, outputChannel, configDir);
      }


.. spec:: Queue Step Executor
   :id: SPEC_AUT_QUEUEEXEC
   :status: implemented
   :links: REQ_AUT_JOBEXEC; REQ_MSG_QUEUE; SPEC_AUT_EXECUTOR; SPEC_MSG_QUEUESTORE; SPEC_DEV_LOGCHANNEL; SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR

   .. note::
      As of CR ``validate-heartbeat-queue-destination``, the queue-step executor
      includes a destination-validity guard — see
      ``SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR`` for the updated implementation.

   **Description:**
   ``executeQueueStep`` appends a message to the queue file and refreshes the
   Messages tree. Implemented in ``src/heartbeat.ts``, following the same pattern
   as ``SPEC_AUT_AGENTEXEC``.

   .. code-block:: typescript

      async function executeQueueStep(
        step: HeartbeatStep,
        outputChannel: vscode.LogOutputChannel,
        queuePath: string,
        messageTreeProvider: MessageTreeProvider
      ): Promise<ExecResult> {
        try {
          appendMessage(queuePath, step.destination!, step.sender || 'heartbeat', step.text!);
          messageTreeProvider.reload();
          outputChannel.info(
            `[Heartbeat] queue: destination="${step.destination}" sender="${step.sender || 'heartbeat'}" text="${step.text}"`
          );
          return { success: true };
        } catch (e) {
          return {
            success: false,
            stepType: 'queue',
            error: (e as Error).message
          };
        }
      }

   Called from ``runStep`` as a new branch:

   .. code-block:: typescript

      if (step.type === 'queue') {
        return executeQueueStep(step, outputChannel, queuePath, messageTreeProvider);
      }


.. spec:: Heartbeat Tree Provider
   :id: SPEC_AUT_HEARTBEATPROVIDER
   :status: implemented
   :links: REQ_AUT_HEARTBEATVIEW; SPEC_AUT_JOBSCHEMA; SPEC_AUT_SCHEDULERLOOP

   **Description:**
   New file ``src/heartbeatTreeProvider.ts`` implementing a ``TreeDataProvider``
   that renders heartbeat jobs as a two-level tree: job nodes (Level 1) and step
   nodes (Level 2).

   **Exports:**

   .. code-block:: typescript

      export type HeartbeatTreeNode = JobNode | StepNode;

      export interface JobNode {
          kind: 'job';
          job: HeartbeatJob;
      }

      export interface StepNode {
          kind: 'step';
          step: HeartbeatStep;
      }

      export class HeartbeatTreeProvider
          implements vscode.TreeDataProvider<HeartbeatTreeNode> {

          private _onDidChangeTreeData = new vscode.EventEmitter<void>();
          readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
          private _jobs: HeartbeatJob[] = [];

          setJobs(jobs: HeartbeatJob[]): void {
              this._jobs = jobs;
              this._onDidChangeTreeData.fire();
          }

          getTreeItem(element: HeartbeatTreeNode): vscode.TreeItem { ... }
          getChildren(element?: HeartbeatTreeNode): HeartbeatTreeNode[] { ... }
      }

   **getTreeItem behaviour:**

   - **JobNode**: label = ``job.name``, collapsible. Description = next cron
     fire time formatted as short weekday + time (e.g. ``Mo 08:00``,
     ``13.04. 08:00``) using ``cron-parser``'s ``parseExpression(schedule).next().toDate()``.
     For ``schedule === 'manual'``: description = ``manuell``.
     ``contextValue = 'heartbeatJob'`` when ``job.enabled !== false``;
     ``contextValue = 'heartbeatJobPaused'`` when ``job.enabled === false``.
     Paused jobs MAY additionally set ``description`` to include a ``⏸`` indicator
     (e.g. prepend ``⏸`` + space to the formatted next-run string).
   - **StepNode**: label = ``<type>: <run>`` or ``agent → <prompt>``.
     ``TreeItemCollapsibleState.None``. No context value.

   **Next-time formatting:**

   .. code-block:: typescript

      import { parseExpression } from 'cron-parser';

      function formatNextRun(schedule: string): string {
          if (schedule === 'manual') { return 'manuell'; }
          try {
              const next = parseExpression(schedule).next().toDate();
              const now = new Date();
              const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
              const hhmm = next.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              // Same week: show weekday; otherwise show date
              const diffDays = Math.floor((next.getTime() - now.getTime()) / 86400000);
              if (diffDays < 7) {
                  return `${days[next.getDay()]} ${hhmm}`;
              }
              const dd = String(next.getDate()).padStart(2, '0');
              const mm = String(next.getMonth() + 1).padStart(2, '0');
              return `${dd}.${mm}. ${hhmm}`;
          } catch {
              return '?';
          }
      }

   **Dependency:** ``cron-parser`` (npm package) for reliable cron next-time computation.

   **getChildren behaviour:**

   - No element → return ``JobNode[]`` for all ``_jobs``
   - ``JobNode`` → return ``StepNode[]`` for ``job.steps``
   - ``StepNode`` → return ``[]``


.. spec:: Run Job and Run-All Commands
   :id: SPEC_AUT_RUNJOBCOMMAND
   :status: implemented
   :links: REQ_AUT_RUNJOB; REQ_AUT_HEARTBEATVIEW; SPEC_AUT_EXECUTOR; SPEC_AUT_HEARTBEATPROVIDER

   **Description:**
   Two new VS Code commands registered in ``extension.ts`` via
   ``activateHeartbeat()`` in ``src/heartbeat.ts``. The tree view also refreshes
   automatically on each scheduler tick via ``HeartbeatScheduler.setTreeProvider()``.

   **Commands:**

   1. ``jarvis.runJob`` — run a single job from the tree view (inline ``$(play)``
      on job nodes). Receives a ``JobNode`` as argument from the tree view context.

      .. code-block:: typescript

         context.subscriptions.push(
             vscode.commands.registerCommand('jarvis.runJob', (node: JobNode) => {
                 vscode.window.showInformationMessage(
                     `Heartbeat '${node.job.name}' gestartet...`
                 );
                 executeJob(node.job, outputChannel, configDir, queuePath, messageTreeProvider)
                     .then(result => {
                         if (!result.success) { notifyFailure(node.job, result, outputChannel); }
                     });
             })
         );

   2. ``jarvis.refreshHeartbeat`` — reload config and refresh tree (view-title
      ``$(refresh)``).

      .. code-block:: typescript

         context.subscriptions.push(
             vscode.commands.registerCommand('jarvis.refreshHeartbeat', () => {
                 scheduler.reload();
                 heartbeatTreeProvider.setJobs(scheduler.currentJobs);
             })
         );

   **Cyclic tree refresh:**

   The ``HeartbeatScheduler`` holds a reference to the tree provider via
   ``setTreeProvider()``. At the end of each ``tick()``, after reloading jobs and
   updating the status bar, the scheduler calls
   ``heartbeatTreeProvider.setJobs(this.jobs)`` to refresh next-run times
   automatically.

   **Refactoring in heartbeat.ts:**

   - ``loadJobs()`` → add ``export`` keyword (currently private)
   - ``executeJob()`` → add ``export`` keyword (currently private)
   - Both ``HeartbeatJob`` and ``HeartbeatStep`` interfaces → add ``export``
   - ``HeartbeatScheduler.setTreeProvider()`` — new method to register the provider

   **package.json contributions:**

   - View: ``jarvisHeartbeat`` in ``jarvis-explorer`` container, name "Heartbeat"
   - Commands: ``jarvis.runJob`` (icon ``$(play)``),
     ``jarvis.refreshHeartbeat`` (icon ``$(refresh)``)
   - Menus:

     - ``view/title``: ``jarvis.refreshHeartbeat`` when ``view == jarvisHeartbeat``
     - ``view/item/context``: ``jarvis.runJob`` inline when ``viewItem == heartbeatJob``
       or ``viewItem == heartbeatJobPaused`` (manual one-shot run available
       independent of pause state)
   - Activation event: ``onView:jarvisHeartbeat``

.. spec:: Pause and Resume Heartbeat Job Commands
   :id: SPEC_AUT_PAUSECOMMAND
   :status: implemented
   :links: REQ_AUT_PAUSE; SPEC_AUT_HEARTBEATPROVIDER; SPEC_AUT_RUNJOBCOMMAND; SPEC_AUT_JOBSCHEMA

   **Description:**
   Two new VS Code commands registered via ``activateHeartbeat()`` in
   ``src/heartbeat.ts`` and wired in ``extension.ts``. Both commands call
   ``HeartbeatScheduler.setJobEnabled()`` which atomically read–modifies–writes
   ``heartbeat.yaml`` (same pattern as ``SPEC_AUT_JOBREG``), reloads the
   scheduler, and refreshes the tree.

   **Commands:**

   1. ``jarvis.pauseHeartbeatJob`` — invoked by the ``$(debug-pause)`` inline button
      on active job nodes (``contextValue == heartbeatJob``).

      .. code-block:: typescript

         context.subscriptions.push(
             vscode.commands.registerCommand('jarvis.pauseHeartbeatJob', async (node: JobNode) => {
                 await scheduler.setJobEnabled(node.job.name, false);
                 heartbeatTreeProvider.setJobs(scheduler.currentJobs);
                 vscode.window.showInformationMessage(`Heartbeat '${node.job.name}' pausiert.`);
             })
         );

   2. ``jarvis.resumeHeartbeatJob`` — invoked by the ``$(debug-continue)`` inline button
      on paused job nodes (``contextValue == heartbeatJobPaused``). Resume **and** run.

      .. code-block:: typescript

         context.subscriptions.push(
             vscode.commands.registerCommand('jarvis.resumeHeartbeatJob', async (node: JobNode) => {
                 await scheduler.setJobEnabled(node.job.name, true);
                 heartbeatTreeProvider.setJobs(scheduler.currentJobs);
                 const resumed = scheduler.currentJobs.find(j => j.name === node.job.name);
                 if (resumed) {
                     vscode.window.showInformationMessage(
                         `Heartbeat '${resumed.name}' fortgesetzt und gestartet.`
                     );
                     executeJob(resumed, outputChannel, scheduler.currentConfigDir,
                         scheduler.currentQueuePath, messageTreeProvider)
                         .then(result => {
                             if (!result.success) { notifyFailure(resumed, result, outputChannel); }
                         });
                 }
             })
         );

   **Helper** ``HeartbeatScheduler.setJobEnabled`` (method on the scheduler,
   in ``src/heartbeat.ts``):

   .. code-block:: typescript

      async setJobEnabled(name: string, enabled: boolean): Promise<void> {
          if (!this.context) { return; }
          const configPath = resolveConfigPath(this.context);
          let data: { jobs: HeartbeatJob[] };
          try {
              const raw = fs.readFileSync(configPath, 'utf8');
              data = (yaml.load(raw) as { jobs: HeartbeatJob[] }) ?? { jobs: [] };
              if (!data.jobs) { return; }
          } catch { return; }

          const job = data.jobs.find(j => j.name === name);
          if (!job) { return; }
          if (enabled) {
              delete job.enabled;   // omit field → default true (clean YAML)
          } else {
              job.enabled = false;
          }

          fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
          this.reload();
          this.heartbeatTreeProvider?.setJobs(this.jobs);
      }

   **package.json contributions:**

   - Commands: ``jarvis.pauseHeartbeatJob`` (icon ``$(debug-pause)``, title "Pause
     Heartbeat Job"), ``jarvis.resumeHeartbeatJob`` (icon ``$(debug-continue)``,
     title "Resume Heartbeat Job"). The resume icon ``$(debug-continue)`` is
     visually distinct from the active-mode ``$(play)`` button used by
     ``jarvis.runJob`` so that Resume and one-shot Run remain distinguishable
     on a paused node.
   - Both commands SHALL be hidden from the Command Palette
     (``"commandPalette": [{ "command": "jarvis.pauseHeartbeatJob", "when": "false" }, ...]``)
   - Menus ``view/item/context`` — additions owned by this spec:

     - ``jarvis.pauseHeartbeatJob`` inline when ``viewItem == heartbeatJob``
     - ``jarvis.resumeHeartbeatJob`` inline when ``viewItem == heartbeatJobPaused``

   The ``jarvis.runJob`` inline menu (owned by ``SPEC_AUT_RUNJOBCOMMAND``)
   SHALL be declared for **both** ``viewItem == heartbeatJob`` and
   ``viewItem == heartbeatJobPaused`` so the manual one-shot trigger is
   available independent of pause state. Resulting button layout:

   - Active node: ``[play] [pause]`` (runJob + pauseHeartbeatJob)
   - Paused node: ``[play] [continue]`` (runJob + resumeHeartbeatJob)

.. spec:: Job Registration and Unregistration
   :id: SPEC_AUT_JOBREG
   :status: implemented
   :links: REQ_AUT_JOBREG; SPEC_AUT_SCHEDULERLOOP; SPEC_AUT_JOBSCHEMA

   **Description:**
   Two public methods on ``HeartbeatScheduler`` in ``src/heartbeat.ts``.
   Both operate on the YAML file resolved via ``resolveConfigPath()``.

   .. code-block:: typescript

      async registerJob(job: HeartbeatJob): Promise<void> {
          const configPath = resolveConfigPath(this.context!);
          let data: { jobs: HeartbeatJob[] } = { jobs: [] };
          try {
              const raw = fs.readFileSync(configPath, 'utf8');
              data = (yaml.load(raw) as { jobs: HeartbeatJob[] }) ?? { jobs: [] };
              if (!data.jobs) { data.jobs = []; }
          } catch { /* file missing or unparseable — start fresh */ }

          const idx = data.jobs.findIndex(j => j.name === job.name);
          if (idx >= 0) { data.jobs[idx] = job; } else { data.jobs.push(job); }

          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
          this.reload();
          this.heartbeatTreeProvider?.setJobs(this.jobs);
      }

      async unregisterJob(name: string): Promise<void> {
          const configPath = resolveConfigPath(this.context!);
          let data: { jobs: HeartbeatJob[] };
          try {
              const raw = fs.readFileSync(configPath, 'utf8');
              data = (yaml.load(raw) as { jobs: HeartbeatJob[] }) ?? { jobs: [] };
              if (!data.jobs) { return; }
          } catch { return; }

          const idx = data.jobs.findIndex(j => j.name === name);
          if (idx < 0) { return; }
          data.jobs.splice(idx, 1);

          fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
          this.reload();
          this.heartbeatTreeProvider?.setJobs(this.jobs);
      }

   **YAML serialisation**: ``js-yaml.dump()`` (already a dependency).

   ``mkdirSync({ recursive: true })`` in ``registerJob`` ensures the storage
   directory exists before writing (covers first-run when workspace storage
   hasn't been created yet).

   **Upsert semantics**: ``registerJob`` matches by ``job.name``. If a job with
   the same name exists, it is replaced (schedule and steps may have changed).
   If not, the new job is appended. This allows callers to re-register
   unconditionally on configuration change without checking existence first.

   **No-op semantics**: ``unregisterJob`` returns silently if the name is not
   found or the file cannot be read (safe to call unconditionally).


.. spec:: List Jobs LM+MCP Tool
   :id: SPEC_AUT_LISTJOBS_TOOL
   :status: implemented
   :links: REQ_AUT_LISTJOBS_TOOL; SPEC_AUT_JOBREG; SPEC_AUT_SCHEDULERLOOP

   **Description:**
   Register ``jarvis_listJobs`` via ``registerDualTool()`` in ``extension.ts``
   (next to the existing ``registerJobTool`` / ``unregisterJobTool`` blocks).
   The tool reads ``scheduler.currentJobs`` and returns a JSON array of job
   descriptors.

   **LM handler:**

   .. code-block:: typescript

      // Implementation: SPEC_AUT_LISTJOBS_TOOL
      // Requirements: REQ_AUT_LISTJOBS_TOOL
      const listJobsTool = registerDualTool(
          'jarvis_listJobs',
          async (
              _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
              _token: vscode.CancellationToken
          ) => {
              const jobs = scheduler.currentJobs.map(j => jobDescriptor(j));
              log.info(`[Heartbeat] listJobs: ${jobs.length} job(s)`);
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(jobs))
              ]);
          },
          'Returns all registered heartbeat jobs with name, schedule, enabled state, and next fire time.',
          {},
          async () => {
              const jobs = scheduler.currentJobs.map(j => jobDescriptor(j));
              log.info(`[Heartbeat] listJobs(MCP): ${jobs.length} job(s)`);
              return { jobs };
          }
      );

   **Helper ``jobDescriptor``** (inline closure in ``extension.ts``):

   .. code-block:: typescript

      function jobDescriptor(job: HeartbeatJob): {
          name: string;
          schedule: string;
          enabled: boolean;
          nextFire: string | null;
      } {
          const enabled = job.enabled !== false;
          let nextFire: string | null = null;
          if (enabled && job.schedule !== 'manual') {
              try {
                  nextFire = CronExpressionParser
                      .parse(job.schedule)
                      .next()
                      .toDate()
                      .toISOString();
              } catch {
                  nextFire = null;
              }
          }
          return { name: job.name, schedule: job.schedule, enabled, nextFire };
      }

   **Import** (already present in ``heartbeatTreeProvider.ts``; add to
   ``extension.ts`` if not already imported):

   .. code-block:: typescript

      import { CronExpressionParser } from 'cron-parser';

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listJobs",
        "displayName": "List Heartbeat Jobs",
        "modelDescription": "Returns all registered heartbeat jobs with name, schedule, enabled state, and next scheduled fire time (ISO 8601 or null for manual/paused jobs).",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listJobs",
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * No input parameters — returns all jobs unconditionally
   * ``enabled`` normalises the optional ``job.enabled`` field: ``undefined``
     and ``true`` both map to ``true``; only explicit ``false`` maps to ``false``
   * ``nextFire`` is ``null`` for paused jobs and for ``"manual"`` schedules;
     a try/catch guards against malformed cron expressions without surfacing
     an error to the caller
   * Uses the same ``cron-parser`` import already present in
     ``heartbeatTreeProvider.ts`` — no new dependency required


.. spec:: Heartbeat Load-Time Destination Validation
   :id: SPEC_AUT_HEARTBEAT_LOAD_VALIDATION
   :status: implemented
   :links: REQ_AUT_HEARTBEAT_LOAD_VALIDATION; REQ_AUT_HEARTBEAT_RESOLVER_REUSE; REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION; SPEC_AUT_JOBSCHEMA; SPEC_MSG_SENDTOSESSION

   **Description:**
   Extend ``HeartbeatScheduler.reload()`` in ``src/heartbeat.ts`` to call an
   async validation helper immediately after ``this.jobs = loadJobs(...)``, using
   the shared session resolver.

   **Validation helper (new function in ``heartbeat.ts``):**

   .. code-block:: typescript

      async function validateLoadedJobs(
        jobs: HeartbeatJob[],
        outputChannel: vscode.LogOutputChannel
      ): Promise<void> {
        const allSessions = await getAllSessions();
        const validNames = filterNamedSessions(allSessions).map(s => s.title);
        for (const job of jobs) {
          job.steps.forEach((step, idx) => {
            if (step.type === 'queue' && step.destination) {
              if (!validNames.includes(step.destination)) {
                const msg =
                  `[Heartbeat] Invalid queue destination: ` +
                  `job="${job.name}" step=${idx} destination="${step.destination}"`;
                outputChannel.warn(msg);
                vscode.window.showWarningMessage(`Jarvis: ${msg}`);
              }
            }
          });
        }
      }

   **Call site in ``reload()``** (fire-and-forget — warning MUST NOT block tick):

   .. code-block:: typescript

      reload(): void {
        if (!this.context || !this.outputChannel) { return; }
        const configPath = resolveConfigPath();
        this.configDir = path.dirname(configPath);
        this.jobs = loadJobs(configPath, this.outputChannel);
        // Fire-and-forget load-time validation (SPEC_AUT_HEARTBEAT_LOAD_VALIDATION)
        validateLoadedJobs(this.jobs, this.outputChannel).catch(() => { /* silent */ });
      }

   **Import required in ``heartbeat.ts``:**

   .. code-block:: typescript

      import { getAllSessions, filterNamedSessions } from './sessionLookup';

   **No side effects on job list:** ``validateLoadedJobs`` only emits warnings;
   it does not mutate, filter, or pause any job object.


.. spec:: Queue Step Fire-Time Skip Behavior (D-1)
   :id: SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR
   :status: implemented
   :links: REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR; SPEC_AUT_QUEUEEXEC; SPEC_AUT_HEARTBEAT_RESOLVER_REUSE

   **Description:**
   Modify ``executeQueueStep()`` in ``src/heartbeat.ts`` to re-validate the
   destination immediately before appending.  If the destination is no longer
   valid at fire time, skip the step softly and let the job continue.

   **UX Decision D-1: skip step, continue job (Option C — hybrid)**

   At fire time a queue step with an invalid destination is skipped (no message
   appended, warning logged, ``{ success: true }`` returned).  The job is NOT
   marked as failed and subsequent steps execute normally.

   *Rationale:* Pausing or failing the whole job (Option B) would block all
   other steps in a multi-step job — a Python script or agent step would also
   stop even though the destination misconfiguration is unrelated to them.
   Background automation jobs should maximise useful work.  The load-time
   notification (``SPEC_AUT_HEARTBEAT_LOAD_VALIDATION``) provides earliest
   possible user feedback; the fire-time skip is a defensive safety net
   consistent with the fail-soft character of the existing heartbeat executor.
   This also parallels how ``validate-session-destination`` behaves for the
   interactive ``jarvis_sendToSession`` tool — validation is surfaced early and
   loudly, but the background automation path favours continuity over hard abort.

   **Updated ``executeQueueStep`` (replaces current implementation in
   ``SPEC_AUT_QUEUEEXEC``):**

   .. code-block:: typescript

      async function executeQueueStep(
        step: HeartbeatStep,
        outputChannel: vscode.LogOutputChannel,
        queuePath: string,
        messageTreeProvider: MessageTreeProvider
      ): Promise<ExecResult> {
        // Fire-time destination re-validation (REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR)
        const allSessions = await getAllSessions();
        const validNames = filterNamedSessions(allSessions).map(s => s.title);
        if (step.destination && !validNames.includes(step.destination)) {
          outputChannel.warn(
            `[Heartbeat] queue step skipped — invalid destination: "${step.destination}"`
          );
          return { success: true };  // soft skip: job continues
        }
        try {
          appendMessage(queuePath, step.destination!, step.sender || 'heartbeat', step.text!);
          messageTreeProvider.reload();
          outputChannel.info(
            `[Heartbeat] queue: destination="${step.destination}" ` +
            `sender="${step.sender || 'heartbeat'}" text="${step.text}"`
          );
          return { success: true };
        } catch (e) {
          return {
            success: false,
            stepType: 'queue',
            error: (e as Error).message
          };
        }
      }


.. spec:: ``jarvis_registerJob`` Destination Validation
   :id: SPEC_AUT_REGISTERJOB_VALIDATION
   :status: implemented
   :links: REQ_AUT_REGISTERJOB_VALIDATION; REQ_MSG_DEST_ERROR; SPEC_AUT_JOBREG; SPEC_AUT_HEARTBEAT_RESOLVER_REUSE; SPEC_MSG_SENDTOSESSION

   **Description:**
   Add a pre-persistence validation call to both the LM and MCP handlers of
   ``jarvis_registerJob`` in ``src/extension.ts``.  The shared resolver is used;
   on first invalid destination the tool throws a formatted ``Error`` without
   persisting the job.

   **Validation helper (inline closure in ``extension.ts``):**

   .. code-block:: typescript

      async function validateJobDestinations(
        steps: HeartbeatStep[]
      ): Promise<void> {
        const allSessions = await getAllSessions();
        const validNames = filterNamedSessions(allSessions).map(s => s.title);
        for (const step of steps) {
          if (step.type === 'queue' && step.destination) {
            if (!validNames.includes(step.destination)) {
              const sorted = [...validNames].sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
              );
              const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
              throw new Error(
                `Destination session "${step.destination}" does not exist.\n` +
                `Valid destinations: ${listStr}`
              );
            }
          }
        }
      }

   **Integration in LM handler** (inserted before ``scheduler!.registerJob(job)``):

   .. code-block:: typescript

      await validateJobDestinations(steps);
      await scheduler!.registerJob(job);

   **Integration in MCP handler** (same position):

   .. code-block:: typescript

      await validateJobDestinations(steps);
      await scheduler!.registerJob(job);

   **Error format:** matches ``REQ_MSG_DEST_ERROR`` exactly — the same template
   used in ``SPEC_MSG_SENDTOSESSION``.  The first invalid destination encountered
   causes immediate rejection; subsequent steps are not checked.

   **No persistence on error:** ``scheduler!.registerJob()`` is only reached
   after ``validateJobDestinations`` resolves without throwing.

   **Imports (already present in ``extension.ts`` via SPEC_MSG_SENDTOSESSION):**
   ``getAllSessions`` and ``filterNamedSessions`` are already imported; no new
   import line is required.


.. spec:: Shared Resolver Reuse for Heartbeat Validation
   :id: SPEC_AUT_HEARTBEAT_RESOLVER_REUSE
   :status: draft
   :links: REQ_AUT_HEARTBEAT_RESOLVER_REUSE; SPEC_MSG_SENDTOSESSION; SPEC_MSG_SESSIONLOOKUP

   **Description:**
   All heartbeat destination validation sites (load-time, fire-time,
   ``jarvis_registerJob`` tool) reuse the shared ``getValidDestinations()``
   function from ``src/sessionLookup.ts`` — the same function used by
   ``SPEC_MSG_SENDTOSESSION``.  No parallel session-enumeration logic is
   introduced.

   **Import in ``heartbeat.ts`` (updated):**

   .. code-block:: typescript

      import { getValidDestinations } from './sessionLookup';

   **Import in ``extension.ts`` (updated):**
   ``getValidDestinations`` replaces direct ``getAllSessions`` +
   ``filterNamedSessions`` usage in the sendToSession handler.

   **Valid destination set definition:**
   The union of {named VS Code chat session titles from ``state.vscdb``} ∪
   {YAML entity names from the scanner store (sessions, projects, events)},
   as computed by ``getValidDestinations(scanner)``.

   **Consistency guarantee:** any future change to the resolver propagates
   automatically to all validation sites (``sendToSession``, heartbeat load,
   heartbeat fire, ``registerJob``) without further code changes.


.. spec:: Command Step Soft-Skip for Unregistered Commands
   :id: SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP
   :status: approved
   :links: REQ_MOD_ZEROTRACE; REQ_AUT_JOBEXEC; SPEC_AUT_EXECUTOR; SPEC_AUT_OUTPUTCHANNEL; SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR

   **Description:**
   Modify the ``command`` branch of ``runStep()`` in
   ``packages/core/src/apps/session/heartbeat.ts`` to check whether the target
   command is currently registered before execution. If the command is absent
   from ``vscode.commands.getCommands()``, the step is soft-skipped — mirroring
   the queue-step behaviour established by
   ``SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR``.

   **Rationale (mirrors D-1 for queue steps):**
   In the modular architecture, a persisted heartbeat job may reference commands
   contributed by an add-on that is not (or no longer) installed. This is a
   normal, expected condition — not a programming error. Failing the entire job
   (popup + error log) violates ``REQ_MOD_ZEROTRACE`` (no broken surface from an
   absent add-on) and punishes multi-step jobs whose other steps are unrelated.
   Background automation favours continuity; absence of a command ≠ job failure.

   **Behaviour:**

   - **Command IS registered but throws at runtime:** unchanged — ``catch``
     returns ``{ success: false, stepType: 'command', error }`` and
     ``notifyFailure`` shows a popup.  This remains a real runtime failure.
   - **Command is NOT registered:** soft-skip — log a warning to the output
     channel, return ``{ success: true }`` so subsequent steps execute, and
     raise **no** ``showErrorMessage`` popup.

   **Updated ``command`` branch in ``runStep``:**

   .. code-block:: typescript

      // command step — soft-skip if command not registered (SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP)
      const allCommands = await vscode.commands.getCommands(/* includeInternal */ true);
      if (!allCommands.includes(step.run!)) {
          outputChannel.warn(
              `[Heartbeat] command step skipped — command not registered: "${step.run}"`
          );
          return { success: true };  // soft skip: job continues
      }
      try {
          outputChannel.info(`[Heartbeat] command: ${step.run}`);
          await vscode.commands.executeCommand(step.run!);
          return { success: true };
      } catch (e) {
          return { success: false, stepType: 'command', error: (e as Error).message };
      }

   **Acceptance Criteria:**

   * AC-1: Given a ``command`` step whose ``step.run`` value is absent from the
     set returned by ``vscode.commands.getCommands(true)``, the step is skipped
     and the executor returns ``{ success: true }``.
   * AC-2: The output channel receives a ``warn``-level entry containing the
     unregistered command id and the word "skipped", identifiable as a
     command-step skip (distinct from a command-step success log).
   * AC-3: No ``vscode.window.showErrorMessage`` popup is raised for the
     skipped step (``notifyFailure`` is not called).
   * AC-4: Subsequent steps in the same job continue executing normally after
     the skip.
   * AC-5: A registered command that throws at runtime still returns
     ``{ success: false }`` and triggers ``notifyFailure`` — soft-skip applies
     only to absent commands.
