Automation User Stories
=======================

.. story:: Scheduled and Manual Automation Jobs
   :id: US_AUT_HEARTBEAT
   :status: approved
   :priority: optional
   :links: US_CFG_HEARTBEAT

   **As a** Jarvis User,
   **I want** to configure and run scheduled and manual automation jobs from VS Code,
   **so that** I can automate recurring tasks (scripts, VS Code commands) without
   leaving the editor.

   **Acceptance Criteria:**

   * AC-1: A YAML file defines named jobs with a cron schedule or ``"manual"`` trigger
   * AC-2: Jobs can execute Python scripts, PowerShell scripts, VS Code commands,
     LLM agent prompts, or message queue steps
   * AC-3: Scheduled jobs fire automatically based on their cron expression
   * AC-4: Manual jobs can be triggered on demand from VS Code
   * AC-5: A status bar item shows the next scheduled job and its fire time
   * AC-6: Job output is visible in a dedicated Output Channel
   * AC-7: When a job fails (non-zero exit code or unhandled exception), Jarvis shows a VS Code
     error notification (toast) and logs the error to the Output Channel
   * AC-8: A "Heartbeat" tree view in the Jarvis sidebar shows all configured jobs
     with their next execution time (or ``manuell`` for manual jobs)
   * AC-9: Each job node can be expanded to show its steps (type + run/prompt info)
   * AC-10: A play button on each job node triggers immediate execution of that job
   * AC-11: A refresh button in the view title reloads ``heartbeat.yaml`` and updates
     the tree; the tree also refreshes automatically on each scheduler tick
   * AC-12: Extension modules can programmatically register or remove heartbeat jobs;
     registered jobs appear in the tree view and are persisted in ``heartbeat.yaml``
