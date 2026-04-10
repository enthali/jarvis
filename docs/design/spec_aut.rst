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
      }

   **Job loader**:

   .. code-block:: typescript

      export function loadJobs(
        filePath: string,
        outputChannel: vscode.OutputChannel
      ): HeartbeatJob[] {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = yaml.load(raw) as { jobs: HeartbeatJob[] };
          return data?.jobs ?? [];
        } catch (e) {
          outputChannel.appendLine(`[Heartbeat] Failed to load config: ${e}`);
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
        outputChannel: vscode.OutputChannel
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

   - ``python``: resolve executable via
     ``vscode.workspace.getConfiguration('python').get('defaultInterpreterPath')``;
     fall back to ``'python'`` if the setting is absent or empty.
     Run via ``child_process.spawn``; stdout/stderr appended to Output Channel
     line-by-line; resolve on ``close`` event; non-zero exit code →
     ``{ success: false, stepType: 'python', error: \`exit \${code}\` }``
   - ``powershell``: same ``child_process.spawn`` pattern with ``pwsh`` (fallback
     ``powershell``) as the executable
   - ``command``: ``await vscode.commands.executeCommand(step.run)`` wrapped in
     try/catch; thrown exception → ``{ success: false, stepType: 'command', error: message }``
   - ``agent``: delegated to ``executeAgentStep()`` (see ``SPEC_AUT_AGENTEXEC``)
   - ``queue``: delegated to ``executeQueueStep()`` (see ``SPEC_AUT_QUEUEEXEC``)


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
        outputChannel: vscode.OutputChannel
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
   :links: REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT; SPEC_AUT_EXECUTOR

   **Description:**
   ``executeAgentStep`` sends a prompt file to the VS Code LM API and optionally
   writes the response to a file. Implemented in ``src/heartbeat.ts``.

   .. code-block:: typescript

      async function executeAgentStep(
        step: HeartbeatStep,
        outputChannel: vscode.OutputChannel,
        configDir: string
      ): Promise<ExecResult> {
        const promptPath = resolveScriptPath(step.prompt!, configDir);
        outputChannel.appendLine(`[Heartbeat] agent: prompt=${promptPath}`);
        try {
          const promptText = fs.readFileSync(promptPath, 'utf8');
          const models = await vscode.lm.selectChatModels(
            { vendor: 'copilot', family: 'gpt-4o' }
          );
          if (models.length === 0) {
            return { success: false, stepType: 'agent', error: 'no LM model available' };
          }
          const model = models[0];
          outputChannel.appendLine(`[Heartbeat] agent: model=${model.id}`);
          const messages = [vscode.LanguageModelChatMessage.User(promptText)];
          const response = await model.sendRequest(messages, {});
          let text = '';
          for await (const chunk of response.text) { text += chunk; }
          outputChannel.appendLine(
            `[Heartbeat] agent: response length=${text.length}`
          );
          if (step.outputFile) {
            const outPath = resolveScriptPath(step.outputFile, configDir);
            if (step.append) {
              fs.appendFileSync(outPath, text);
            } else {
              fs.writeFileSync(outPath, text);
            }
            outputChannel.appendLine(`[Heartbeat] agent: written to ${outPath}`);
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
   :links: REQ_AUT_JOBEXEC; REQ_MSG_QUEUE; SPEC_AUT_EXECUTOR; SPEC_MSG_QUEUESTORE

   **Description:**
   ``executeQueueStep`` appends a message to the queue file and refreshes the
   Messages tree. Implemented in ``src/heartbeat.ts``, following the same pattern
   as ``SPEC_AUT_AGENTEXEC``.

   .. code-block:: typescript

      async function executeQueueStep(
        step: HeartbeatStep,
        outputChannel: vscode.OutputChannel,
        queuePath: string,
        messageTreeProvider: MessageTreeProvider
      ): Promise<ExecResult> {
        try {
          appendMessage(queuePath, step.destination!, step.sender || 'heartbeat', step.text!);
          messageTreeProvider.reload();
          outputChannel.appendLine(
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
     ``contextValue = 'heartbeatJob'``.
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
   :links: REQ_AUT_RUNJOB; REQ_AUT_HEARTBEATVIEW; SPEC_AUT_EXECUTOR

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
   - Activation event: ``onView:jarvisHeartbeat``


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
