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

      function loadJobs(
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

      async function executeJob(
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
   :links: REQ_AUT_OUTPUT; SPEC_AUT_EXECUTOR

   **Description:**
   The Output Channel is created once at activation and passed through to all
   execution functions. Failure notification is centralised in ``notifyFailure``.

   .. code-block:: typescript

      // Created once in activateHeartbeat():
      const outputChannel = vscode.window.createOutputChannel('Jarvis Heartbeat');
      context.subscriptions.push(outputChannel);

      function notifyFailure(job: HeartbeatJob, result: ExecResult): void {
        vscode.window.showErrorMessage(
          `Jarvis: job "${job.name}" failed — ${result.stepType} ${result.error}`
        );
        outputChannel.appendLine(
          `[Heartbeat] ERROR job "${job.name}" failed — ${result.stepType} ${result.error}`
        );
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
