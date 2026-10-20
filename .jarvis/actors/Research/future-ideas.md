# Future Ideas — Research Backlog

Strategische Ideen und geparkte Vorarbeiten, die noch keine Change Requests sind.
Sortierung: jüngste oben.

---

## FI-2026-08-03 — Ephemerer, job-gebundener Kanal für `executeCommand` aus gespawnten Prozessen

**Trigger:** Spike-Auftrag PM (2026-08-03). Gesucht: ein Kanal, über den ein von Jarvis gestarteter Node-Prozess für seine Laufzeit `vscode.commands.executeCommand()` im Extension-Host aufrufen kann — ohne Dauerbetrieb-Port wie `jarvis.mcp.enabled`.

**Status:** ⏸️ **Zurückgestellt (User, 2026-08-04)** — Desk-Research erledigt; beim Wiederaufgreifen fehlt nur ein kleiner Fork-IPC-Messbeweis.

- **Lücke kleiner als gedacht:** Heartbeat `type: 'command'` ruft bereits `vscode.commands.executeCommand(step.run)`. Für einfache Fälle reicht ein kleiner CR (`args` + Output-Capture am `command`-Step) ohne neuen IPC-Kanal.
- **Trust-Modell:** Vertrauen folgt aus Erreichbarkeit, nicht aus Spawn-Herkunft. Ein Loopback-Port ist maschinenweit erreichbar (inkl. Browser-POST ohne Preflight / DNS-Rebinding) und `executeCommand` erlaubt Codeausführung mit User-Rechten.
- **Empfehlung:** `cp.fork()` bzw. `stdio: [..., 'ipc']` für Node-Kinder (kein globaler Namensraum, kein Token nötig); Named Pipe / Unix Socket für Python/pwsh. Ephemerer HTTP-Port + Token ist die schlechteste Option.
- **Offener Sicherheitsbefund im Bestand:** Weder `hookIntake.ts` noch `mcpServer.ts` authentifizieren Requests (beide binden nur an `127.0.0.1`), und Heartbeat-`run:`-Skripte sind Workspace-Inhalt (keine `capabilities.untrustedWorkspaces`-Deklaration in `packages/core/package.json`).

---

## FI-2026-07-03 — Actor Monitoring: Self-Reminder-Watchdog (statt Hook-basiert)

**Trigger:** Hängende Agent-Turns durch LLM-Inferenz-Fehler („Response contained no choices") oder lokale Modell-Timeouts.

**Status:** ✅ **Mechanismus live validiert (2026-07-03), Integration geparkt.**

- **Warum Hooks blind sind:** LLM-Inferenz-Fehler passieren zwischen `UserPromptSubmit`/`PostToolUse` und `Stop` in `_provideLanguageModelResponse`; keiner der 8 Lifecycle-Hooks feuert dort.
- **Lösung:** Self-Renewing Reminder-Kette via `jarvis_setReminder` / `jarvis_cancelReminder`. Eine eingehende Reminder-Nachricht triggert einen neuen Turn (Reset-Kick) und weckt den hängenden Aktor; beim Senden von `RESPOND` wird der eigene Reminder gecancelt.
- **Layering:** Der reine Reset-Kick funktioniert bereits generisch über `jarvis.messages.notificationTemplate`; das Canceln gehört in die `RESPOND`-Semantik des Orchestrierungs-Skills.

