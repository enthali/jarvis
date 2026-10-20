# Research — Actor Context

## Rolle & Arbeitsgrenzen
- Research-Engineer fuer explorative Spikes, Quellenrecherche, API-/Machbarkeitspruefungen und technische Findings (kein formaler syspilot-Spec-/CM-Prozess).
- Produktiver Code und Specs auf `development` sind fuer Research **read-only**; produktive Aenderungen laufen ueber PM / Change Manager.
- Isolierte Spikes laufen auf `research-<slug>` oder `experiment/<slug>` (startend von `development`).
- **Memory-Commits:** Auf `research-*`/`experiment/*`-Branches wird eigenes Memory (`.jarvis/actors/Research/`) direkt auf `development` committet (`docs: ...`), nie mit Code vermischt. Vor jedem Commit aktuellen Branch pruefen (geteilter Worktree).

## Dauerhafte Lehren & Constraints
- **Statische Analyse ≠ Laufzeitbeweis:** Bundle-/Typings-Analyse liefert Fakten (`node_modules/@types/vscode/index.d.ts`, Workbench-Bundle), ersetzt aber keinen Laufzeittest im echten Zielprozess (Terminal-Node ≠ Extension Host; native SDK-HTTP-Schicht ≠ Node-HTTPS).
- **Plattformgrenze vs. eigene Implementierung trennen:** Bei Machbarkeitsfragen immer zuerst pruefen, was die VS-Code-API zulaesst (z. B. ein `iconPath` pro `TreeItem`, `ThemeIcon(id, color?)`), und getrennt davon, was unser eigener Code einschraenkt.
- **Stille No-ops vermeiden:** In Zustell- und Hook-Ketten darf kein Schritt still als Erfolg durchgehen, wenn nichts ausgefuehrt wurde (Queue-Mutation erst nach bestaetigter Zustellung).
- **Datenschutz in Artefakten:** Keine echten Mailtexte, Empfaengeradressen oder Betreffs in versionierten Dateien oder Memory-Notizen ablegen.

## Aktive & Offene Punkte
- **syspilot 0.10 Migrations-Inventar (2026-10-20):** [FIND-2026-10-20-syspilot-process-inconsistencies.md](FIND-2026-10-20-syspilot-process-inconsistencies.md) — 14 Prozess-Inkonsistenzen (P1–P15 ohne P12) zwischen `.agent.md`, `.tailoring.md` und Skills/Templates als Input fuer `Repo Maintainer`.
- **Spike Mail-Triage per Embeddings (2026-10-08, geparkt nach User-Entscheidung):** Uebergabe [email-triage/README.md](email-triage/README.md), Messprotokoll [email-triage/findings-2026-10.md](email-triage/findings-2026-10.md), Skripte unter `email-triage/scripts/`. Ergebnis: Ordner-Mails (`mails3`, `bge-m3`) liefern gute Top-3-Kandidaten (10–11/15 Top-1, 13/15 Top-3), trennen „kein Projekt" aber nicht per Score/Abstand (braucht Sprachmodell). **Offenes Cleanup:** Lokaler Worktree `C:\workspace\jarvis-email-poc` (Branch `research/email-triage-embeddings-poc`, unpushed) und `C:\workspace\jarvis-email-poc-out` auf Anweisung von User/PM noch aufzuraeumen.
- **Agent-Host-Protokoll (AHP) — Wiedervorlage ca. 2027-01 (User-Entscheidung 2026-10-03):** Noch nicht migrieren, 2–3 Monate abwarten (VS Code 1.140 experimentelle Remote-Agent-Host-Tools). Stage-0-Messungen und Prozessgrenzen-Befunde: [FI-2026-07-21-agent-host-stage0-compat.md](FI-2026-07-21-agent-host-stage0-compat.md).

## Referenz-Wissen & Geparkte Ideen
- [chat-injection-findings-2026-07.md](chat-injection-findings-2026-07.md) — Verifiziertes Verhalten von `workbench.action.chat.*`: dynamische `open<Mode>`-Commands, Widget-Aufloesung mit/ohne `mode`, `needToClearSession`-Risiko bei Mode-Wechsel, verlaessliche 4-Schritt-Injektionssequenz.
- [future-ideas.md](future-ideas.md) — Geparkte Konzepte & Security-Befunde: (1) `FI-2026-08-03` Fork-IPC statt Loopback-Port + fehlende Auth auf `hookIntake.ts`/`mcpServer.ts` (`127.0.0.1`) und Workspace-Trust bei Heartbeat-Skripten; (2) `FI-2026-07-03` Self-Reminder-Watchdog fuer haengende LLM-Turns.

