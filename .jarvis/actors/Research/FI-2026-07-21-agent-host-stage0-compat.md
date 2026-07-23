# FI-2026-07-21 — Agent Host (VS Code 1.129.1) × Jarvis: Stage-0-Kompatibilität

**Status:** Empirischer Spike abgeschlossen — Live-Messung in einer laufenden Agent-Host-Session (lokales Modell Qwen 3.6 35B, ~25 tok/s), nicht aus dem Gedächtnis. Code-Belege aus `microsoft/vscode` (1.129-Zweig) ergänzt.

**Update 2026-07-23 (VS Code 1.130):** Namenskollision-Bug bestätigt. User hatte
`chat.agentHost.enabled` (Editor Sessions, experimentell) kurz aktiv unter 1.130 —
VS Code legte eine AHP-Session namens **„Syspilot Setup Engineer"** in `state.vscdb` an,
exakt identisch mit einem Jarvis-Actor-Namen. Jarvis' `lookupSessionUUID()` findet
beide Einträge, warnt ("multiple sessions named…") und nimmt den ersten — das ist die
nicht-löschbare AHP-Session, nicht der echte Actor. VS Code bietet keine saubere
Delete-API für AHP-Sessions (bekannter Platform-Gap). Workaround: AHP für Editor
Sessions deaktiviert; Stuck-Session bleibt bis VS Code Session-Deletion implementiert.
**Konsequenz:** Jar has kein Code-Fix möglich solange VS Code das Problem nicht löst.
Verwandter GH-Issue kandidat: ggf. vscode#issue melden re "no way to delete AHP sessions".

**Trigger:** Themenwechsel „schau, was VS Code 1.129.1 liefert" — Microsoft hat in 1.129 den **Agent Host** + **AHP** ausgeliefert. Frage: überlebt Jarvis' Session-/Messaging-Layer die neue Prozessgrenze?
**Verwandt:** [FI-2026-05-23-ahp-foundation.md](FI-2026-05-23-ahp-foundation.md) (AHP-Foundation), [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) (Hook-Verdacht falsifiziert), [FIND-2026-04-16-background-agent-sessions.md](FIND-2026-04-16-background-agent-sessions.md) (Provider-Sackgasse), [FI-2026-07-01-editor-group-placement.md](FI-2026-07-01-editor-group-placement.md).

---

## Setup

- VS Code 1.129.1, `chat.agentHost.enabled` aktiv (beim Tester user-toggelbar, laut Release Notes teils org-gated).
- Harness-Dropdown → **„Copilot"** („Run a Copilot SDK agent in the local agent host process"). Ambient-Connection heißt wörtlich **„Local"**.
- **Lokale Modelle wählbar** (BYOK) — die Agent-Host-Session lief mit Qwen 3.6 35B, kein Cloud-Zwang.
- Baseline vor Start: 13 klassische syspilot-Actor-Sessions (`jarvis_listChatSessions`).

## Die vier Messungen

| # | Messung | Ergebnis |
|---|---------|----------|
| A | Taucht die Agent-Host-Session in `state.vscdb` (`chat.ChatSessionStore.index`) auf? | ✅ **JA** — als 14. Eintrag („Agent host session assistance", auto-titel). |
| — | Schreibt ein `/rename` in der Agent-Host-Session in denselben Index durch? | ✅ **JA** — Eintrag wurde zu „AHP-Session". |
| B1 | Akzeptiert `jarvis_sendMessage` die Agent-Host-Session als **Ziel** (Adressierung)? | ✅ **JA** — „Message queued for destination 'AHP-Session'". |
| B2 | Erreicht Jarvis' **autonome Zustellung** den Agent-Host-**Prozess**? | ❌ **NEIN** — `chat.open` spawnte eine **neue klassische Session** („Read messages in Jarvis"), nicht der Agent-Host bekam den Turn. |
| C | Feuern Jarvis' **Lifecycle-Hooks** für die Agent-Host-Session? | ✅ **JA** — `UserPromptSubmit` mit `session_id=f7780f7d-…` (= AHP-Session) im Jarvis-Trace-Log; via `.github/hooks/` + `bridge.mjs`, cross-process. |
| D | Zeigt der **VS-Code-Editor** einen **von außen** (CLI) getriebenen Turn an? | ❌ **NEIN** — CLI-Turn („Regenbogenfarben") war im wiederhergestellten VS-Code-Editor **unsichtbar**, aber im `/remote`-View (GitHub-Mobile) **komplett** sichtbar. Inhalt round-trippt nicht in den Editor. |

## Der Kern-Befund

**Adressebene kompatibel, Transportebene nicht.**

- **Koexistenz (Stage 0): PASS.** Agent-Host- und klassische Sessions teilen sich `state.vscdb`. Jarvis' `sessionLookup.ts` sieht Agent-Host-Sessions **heute, ohne Codeänderung**. Lookup + Rename funktionieren cross-process.
- **Adressierung (Stage 1): PASS.** Namen von Agent-Host-Sessions lösen als `jarvis_sendMessage`-Ziel auf.
- **Autonome Zustellung (Stage 2): FAIL.** Jarvis' `chat.open`-basierte Notification-Injection zielt auf einen **klassischen Chat-Editor** und kann die **Prozessgrenze** zum Agent-Host nicht überschreiten. Ergebnis: eine parasitäre Duplikat-Session, die zwar die richtige *Inbox* (`destination = "AHP-Session"`) bedient, aber **nicht das adressierte Agent** ist. Der echte Agent-Host-Prozess (lokales Qwen) bekam nie einen Turn.

Beweis-Artefakt: nach dem Test enthält der Index **beide** nebeneinander — `"AHP-Session"` (echt) **und** `"Read messages in Jarvis"` (Duplikat aus `chat.open`).

## Tool-Verfügbarkeit vs. Trigger — zwei trennbare Probleme

Nachgelagerte Beobachtung (2026-07-21): Die Agent-Host-Session (lokales Qwen) hat die **Jarvis-Extension-Tools selbst gebunden** — Jarvis' Language-Model-Tools werden **in den Agent-Host-Prozess hineingereicht**, nicht nur in klassische Sessions.

**Empirisch verifiziert (nicht Selbstreport):** Auf Bitte des Testers hat Qwen **selbst** in der laufenden AHP-Session `jarvis_sendMessage(session="Research", senderSession="AHP-Session", …)` ausgeführt; die Nachicht („Hallo ich bin die AHP-Session") kam bei Research an — **kein neu gespawntes Fenster**. Damit ist der **Outbound-Pfad echt bewiesen**: der Agent-Host-Prozess kann Jarvis-Tools tatsächlich aufrufen und über die Prozessgrenze nach draußen zustellen.

**Methodik-Vorbehalt:** Der Tool-Selbstreport des Modells ist **keine** Ground Truth. Qwen mischte echte Jarvis-Tools (`jarvis_sendMessage`, `jarvis_receiveMessage`, `jarvis_listChatSessions`, `jarvis_listActors`, `jarvis_listJobs`, `registerJob`, `setReminder`) mit vermutlich halluzinierten/fremden Einträgen (`get_current_session`, `create_session`, `create_chat`, `send_message`, `list_sessions`, `delete_session`, `task`, `skill` — teils Agent-Host-eigene Tools, teils nur plausibel). Verlässlich ist nur, was durch echten Toolaufruf bestätigt wurde.

**Konsequenz — die Zustell-Lücke ist enger als in der Tabelle oben:**

| Richtung | Mechanismus | Status |
|---|---|---|
| **Outbound** (Agent-Host → Jarvis) | Qwen ruft `jarvis_sendMessage` selbst | ✅ **echt bewiesen** |
| **Inbound Adressierung** (Jarvis → Ziel akzeptiert) | `jarvis_sendMessage` queued | ✅ |
| **Inbound Trigger** (Jarvis weckt Agent-Host, Inbox zu lesen) | `chat.open`-Injection | ❌ spawnt Fremd-Session |

→ Die **einzige** verbleibende Lücke ist der **eingehende Trigger** über die Prozessgrenze — **nicht** die Tool-Bindung. Qwen *könnte* selbst zustellen; es wurde nur nie geweckt. Deshalb spawnte `chat.open` eine Fremd-Session, statt Qwen anzustoßen. Das ist exakt Stage 5 (Resource-URI-`openEditor` / AHP-Client statt `chat.open`).

## Falsifiziertes Prior (context.md Finding #3)

Prior: „Agent-Host-Sessions leben nur in `~/.copilot/session-store.db`, `state.vscdb`/`sessionLookup` sieht sie nicht." → **Falsch.** Sie erscheinen sehr wohl in `state.vscdb`.

**Aber** — verfeinert durch die CLI-Gegenprobe (`copilot --resume`):

- `state.vscdb` (VS-Code-Index) → **„AHP-Session"** (der lokale Rename).
- `~/.copilot/session-store.db` (SDK/CLI-Store) → **Originalname** („Agent host session assistance").

→ **Zwei lose gekoppelte Stores für dieselbe Session; die Namen können driften.** Der VS-Code-Rename ist ein **lokaler Index-Overlay** und wird **nicht** in den Copilot-SDK-Store zurückgeschrieben. **Konsequenz für Jarvis' Identitätsmodell: Name ≠ stabile Identität — die Session-URI/UUID ist der verlässliche Anker.**

## Display-/Attach-Lücke: VS-Code-Editor ≠ Remote-Session-State (Messung D, 2026-07-21)

Gegenprobe des Testers:

1. Session in VS Code **geschlossen**.
2. Per **CLI** (`copilot`) wieder geöffnet, dort nach „Farben des Regenbogens" gefragt → Antwort kam in der CLI.
3. Session in VS Code **wieder geöffnet** → **vom Regenbogen keine Spur.** Der von außen getriebene Turn taucht im VS-Code-Editor **nicht** auf.
4. **Aber:** In der `/remote`-Ansicht der **GitHub-Mobile-App** ist der **komplette** Verlauf (inkl. Regenbogen) sichtbar.

→ **Der Konversationsinhalt round-trippt nicht in den VS-Code-Editor.** Der lokale Editor-View ist eine möglicherweise **stale** Sicht; autoritativ ist der Remote-/Cloud-Session-State (den die Mobile-App liest). Deckt sich mit der Local-vs-Remote-Transporttrennung (message-port lokal vs. AHP/WS remote): der CLI-Turn lief gegen die **Remote**-Session, der wiederhergestellte VS-Code-Editor hängt an einer **anderen (lokalen)** Verbindung und zieht den Remote-Verlauf nicht nach.

**`/remote on` schlug fehl** — genau der Mechanismus, der den VS-Code-Editor an die laufende Remote-Session anhängen würde. Solange das nicht klappt, sind Editor-View und Remote-Session **disjunkt**. (Würde es klappen, wären PM/Research eines Tages auch remote erreichbar — aber davon sind wir weit entfernt.)

**Rekalibrierung der „Koexistenz PASS"-Aussage (Messung A):** PASS gilt für **Index/Metadaten** (Name, Existenz in `state.vscdb`) — **nicht** für **Konversationsinhalt**. Ein von außen (CLI/Heartbeat/anderer Actor) getriebener Turn wird im VS-Code-Editor der Session **nicht garantiert angezeigt**. Das ist eine **zweite, vom Inbound-Trigger getrennte Lücke**: selbst wenn wir Qwen erfolgreich *wecken*, ist offen, ob der Mensch das Ergebnis im **VS-Code-Editor** sieht.

**Strategische Folge — „nur die Session-Runtime austauschen" ist kein rein kosmetischer Swap.** Heute ist Jarvis-Messaging ein **VS-Code-UI-Hack** — und *gerade deshalb* im Editor sichtbar. Wir tauschten ihn gegen eine AHP-Runtime, deren **Editor-Sichtbarkeit für extern getriebene Turns noch unbewiesen** ist. Der Gewinn (lokale Modelle, Prozess-Isolation, MS-Substrat) bleibt real — aber die **Display-/Attach-Frage** rückt **neben** den Inbound-Trigger als **zweiter Blocker** auf die Stage-Liste. Zwei Unbekannte, nicht eine.

### Update 2026-07-23 — VS Code 1.130 adressiert Messung D (Vorhersage bestätigt)

Release 1.130 (22.07.2026, **ein Tag** nach diesem Spike) liefert **genau** die Multi-Host-Fähigkeit, deren Fehlen der Regenbogen-Test zeigte. Wörtlich aus den Release Notes:

> „Because a session lives in its own process, the same session can be connected to and **rendered from multiple VS Code windows at once**."

→ **Blocker #2 (Display/Attach) ist architektonisch adressiert.** Session-State lebt im Prozess, mehrere VS-Code-Fenster rendern ihn live — der Grund, warum der CLI-Regenbogen im Editor fehlte, entfällt im Design. **Noch nicht empirisch re-getestet** (Feature rollt „progressively" aus, org-gated via `chat.agentHost.enabled`); Messung D bleibt bis zum Re-Test formal FAIL, aber die Trajektorie ist bestätigt.

Weitere 1.130-Punkte mit direktem Jarvis-Bezug:

- **Worktree für *alle* Harnesses** (Copilot/Claude/Codex) — „New Worktree" nicht mehr Copilot-only. Relevant für parallele Actor-Sessions.
- **Assisted tool approvals** (`chat.assistedPermissions.enabled`): das LM bewertet Tool-Call-Risiko und entscheidet über Approval → Hebel für **Risk #3 (Confirmation-Guardrail)**, weniger Interrupts in autonomen Läufen.
- **AHP jetzt öffentlich spezifiziert:** `microsoft.github.io/agent-host-protocol/`; Architektur-Doku `code.visualstudio.com/docs/agents/concepts/agent-host`.

**Fazit:** „Der Code hat nicht gelogen." Die Trajektorie-Einschätzung (AHP läuft auf Multi-Host zu) traf im nächsten Release ein.

## Code-Beleg: der richtige Weg (widerlegt den `chat.open`-Hack)

Aus `microsoft/vscode` (1.129), `src/vs/workbench/contrib/chat/browser/widget/chatWidgetService.ts`:

```ts
// Open in chat editor
const pane = await this.editorService.openEditor({ resource: sessionResource /* … */ });
// …
getWidgetByInputUri(uri: URI): IChatWidget | undefined {
  return this._widgets.find(w => isEqual(w.input.inputUri, uri));
}
```

→ Eine (Agent-Host-)Session öffnet man **per Resource-URI** via `editorService.openEditor({ resource })` — **nicht** per `chat.open` + Query-String (der spawnt einen neuen Chat = unser Duplikat-Bug). `getWidgetByInputUri()` liefert obendrein die Idempotenz („fokussiere existierendes Widget statt duplizieren").

Weitere belegte Fakten (1.129-Code):

- **Session-URIs:** Schema `agenthost-content:///sessionId/…` (`src/vs/platform/agentHost/common/agentHostUri.ts`). Provider-IDs `local-agent-host` / `agenthost-*` (`src/vs/sessions/common/agentHostSessionsProvider.ts`). → stabile, adressierbare Identität.
- **Eigener Prozess:** `--type=agentHost` (`node/nodeAgentHostStarter.ts`), WebSocket-Server (`node/agentHostMain.ts`, „WebSocket server listening on …"). Bestätigt die AHP-Prozessgrenze (Local = message port, Remote = AHP/WS).
- **Lokale Modelle first-class:** `agentHost/agentHostByokLmHandler.ts` (BYOK LM) + „Manage Models" für Agent-Host-Sessions.
- **AHP-Wire-Log existiert:** `AgentHostAhpJsonlLoggingSettingId` + `chatDebug/chatDebugWireLogView.ts` — VS Code schneidet AHP-Protokoll-Frames als JSONL mit. → **fertiger Beobachtungskanal für Stage 2**, evtl. besser als unsere Hook-Bridge.

## Öffnen/Trigger — die offizielle API (code-belegt, 1.129)

Beim Ausführen der Jarvis-MCP-Tools **innerhalb** der AHP-Session (Qwen) tauchte im „current session"-Output ein entscheidendes Feld auf:

```
"session":  "copilotcli:/f7780f7d-…"
"openLink": "agent-host-session://copilotcli/f7780f7d-…"
"status":   "inputNeeded"
"changesets":[ …uriTemplate: "copilotcli:/…/changeset/{branch|uncommitted|session|turn|compare}" ]
"git": { branch, baseBranch, ahead, uncommittedChanges }
```

**Der `agent-host-session://`-Opener ist die dokumentierte Tür** (löst Stage 4/5 auf API-Ebene, ersetzt den `chat.open`-Hack):

- `sessionServerTools.ts` → `buildOpenSessionLinkUri(session)` erzeugt den Link; die Session-Tools (`create_session`/`create_chat`) geben ihn als `openLink` zurück.
- `chatSessionCreatedResultSubPart.ts`: „opens the session through the `agent-host-session://` opener — **registered in the Agents window and (for editor-window chat) by the workbench**", via
  ```ts
  openerService.open(URI.parse(openLink), { fromUserGesture: true, allowContributedOpeners: true });
  ```
- Chat-Granularität möglich: Test zeigt `agent-host-session://copilot/s1?chat=<chatId>`.

→ **Trigger-Fix für Jarvis: `chat.open` raus → `openerService.open("agent-host-session://…")` rein.** Kein eigener AHP-Client nötig, um zu öffnen/fokussieren.

**Monitoring-Signal frei Haus:** `status: "inputNeeded"` ist ein Attention/Liveness-Signal direkt aus der AHP-Session; die `changesets[]`-`uriTemplate`s + `git`-Stats liefern eine strukturierte Änderungssicht, die Jarvis heute nicht hat.

## Warum die Session NICHT im Agents-Window steht (kein Bug)

Beobachtung: die per Editor-Window-Harness gestartete `copilotcli:`-Session erscheint in Sidebar/Jarvis, aber **nicht** im Agents-Window. Ursache code-belegt in `agentService.ts`:

```ts
shouldSurfaceLocalAgentHostProvider(provider, configurationService, isSessionsWindow): boolean
```

Sichtbarkeit ist **pro Oberfläche × pro Provider × per Setting** gated (`isSessionsWindow` = Agents- vs. Editor-Window; plus `…PreferAgentHost(Editor|Agents)`). Editor-Window-Sessions surfen mit Default-Settings **nicht** automatisch im Agents-Window. Intrikate, **im Fluss befindliche** Sichtbarkeits-Matrix (Claude/Codex/CopilotCLI × zwei Fenster).

**Lektion (verstärkt die Proposed-API-Sackgassen-Lehre):** Auf den **dokumentierten `agent-host-session://`-Opener + die Session-Tools** bauen — **nicht** auf „welches Fenster listet welche Session" (bewegliches internes Ziel).

## Hooks feuern für Agent-Host-Sessions (Messung C, 2026-07-21)

Ohne Capture-Tap — direkt aus dem laufenden Jarvis-Trace-Log belegt:

```
[Hook] UserPromptSubmit session=f7780f7d-5e29-4e8b-8bab-87669813f58a
{"hook_event_name":"UserPromptSubmit","session_id":"f7780f7d-…","cwd":"c:\\workspace\\jarvis","prompt":"das finde ich spannend"}
```

`session_id` = exakt die AHP-Session (`copilotcli:/f7780f7d-…`). → **Jarvis' Lifecycle-Hooks feuern für Agent-Host-Sessions**, über dieselbe `.github/hooks/`-Config + `bridge.mjs`, **über die Prozessgrenze**. Der Copilot-SDK-Agent-Host respektiert die Hook-Config wie eine klassische Session (konsistent mit „Copilot CLI & Claude teilen dieselbe Hook-API", [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md)).

**Strategische Folge:** Das größte Umstell-Risiko (Memory-Layer via `PreCompact`/`SessionStart` bricht weg) ist **widerlegt** — die Hook-Engine trägt für AHP-Actors. Verifiziert für `UserPromptSubmit`; die übrigen 7 Events sind mechanisch identisch (dieselbe Bridge), aber noch nicht einzeln gemessen.

## Konsequenzen für die Roadmap („Bridge statt Bruch")

1. **Stage 4/5 ist auf API-Ebene gelöst.** Der Duplikat-Bug ist kein AHP-Client-Problem, sondern ein **falscher Command**: `chat.open` → **`openerService.open(URI.parse("agent-host-session://…"))`** (offizieller Opener, workbench-registriert; optional `?chat=<id>`). Fallback/Alternative: `editorService.openEditor({ resource: <session-uri> })` + `getWidgetByInputUri` für Idempotenz. „Open-in-VS-Code" (Stage 4) ist damit ein **Command-Swap**, kein Neubau.
2. **Echte Zustellung in den Agent-Host-Prozess (Stage 2)** = derselbe Opener als Träger (weckt/fokussiert die Session), damit der Agent-Host seine Inbox liest. Der `chat.open`-Hack ist hier definitiv am Ende; ein eigener AHP-Client ist zum reinen Öffnen **nicht** nötig.
3. **Identität auf URI/UUID umstellen** (`copilotcli:/<uuid>` / `agent-host-session://…`), nicht auf den (drift-fähigen) Anzeigenamen.
4. **Beobachtung/Monitoring:** `status`-Feld (z. B. `inputNeeded`) + `changesets`/`git`-Metadaten der Session als Signalquelle nutzen; zusätzlich AHP-Wire-Log-JSONL evaluieren, bevor wir eigene Hooks über die Grenze zwingen.
5. **Jarvis bleibt vorne**, wo es zählt: Message-Log, Monitoring, Autonomie/Heartbeat-Routing hat der Agent Host (noch) nicht. Native Session-CRUD + Opener als **Transport** adoptieren, Jarvis' Mehrwert oben drauf. Vollmigration bleibt PM/CM-Entscheidung.

### Priorität hochgestuft — Zeitdruck durch absehbare Local-Deprecation (2026-07-23)

Empfehlung an PM/CM: Die **Umstellung der Message-Zustellung auf AHP** (`chat.open` → `openerService.open("agent-host-session://…")`, Blocker #1) von „nice to have" auf **zeitkritisch** hochstufen. Begründung aus der Evidenz dieses Findings:

- **VS Code migriert erkennbar vollständig auf AHP.** Signale: `Default To Copilot Harness` macht neue Sessions AHP; per-Harness-`preferAgentHost`-Schalter; 1.130-RN: „some features might only be available … on the agent host". Realistische Prognose (nicht zugesagt): in **2–3 Releases** wird der klassische „local"/Extension-Host-Pfad **deprecated**.
- **Unser Zustellhack koppelt Logik an UI** — dasselbe Anti-Pattern, das AHP behebt. Sobald `chat.open` flächig auf AHP auflöst, bricht der Duplikat-Bug **im Feld** auf, ohne dass wir etwas ändern (siehe 1.130-Zwangs-Migration beim `jarvis-syspilot`-Install).
- **Der Fix ist klein** (Command-Swap, code-belegt) und **entkoppelt** Jarvis sauber (Coordination-Plane vs. Rendering-Plane). Kein eigener AHP-Host nötig.

→ **Fenster nutzen, solange `Agent Host: Enabled` noch opt-in ist**, statt zu warten, bis Default-on den Hack unangekündigt bricht. Research liefert Fix-Pfad + Messprogramm; Scheduling/Umsetzung = PM/CM.

**Vereinbartes Vorgehen (2026-07-23):** *Erst Beweis, dann Prozess.* Nach der nächsten Release (wenn das Projekt frei ist) bauen Georg + Research einen **Wegwerf-Spike (nicht spec-driven)**. Ziel: zeigen, dass der **Extension-Host** Jarvis-`send` **und** `receive` gegen eine **AHP-Session** fahren kann. Der kritische Nachweis = **Inbound über die Prozessgrenze** (AHP-Session wecken, Inbox lesen, **ohne** `chat.open`-Duplikat) — Outbound ist bereits belegt. **Nur bei grünem Beweis** geht es mit einem Artefakt zum PM (dann spec-driven).

## 1.130 Settings-Inventar — die AHP-Schalter (2026-07-23)

Aus dem Settings-UI unter 1.130 (mehr als in den Release Notes; alle **Experimental**). IDs aus Labels abgeleitet, im Zweifel verifizieren:

| Setting (Label) | Wirkung | Bezug |
|---|---|---|
| **Chat › Agent Host: Enabled** (Advanced) | „some agents run in a separate agent host process." | Master-Switch, Voraussetzung für alle folgenden |
| **Chat: Default To Copilot Harness** | „new editor and panel chat sessions **default to the Agent Host Copilot CLI** instead of default." | ⭐ **erklärt die Zwangs-Migration** — unser unveränderter `chat.open` landet dadurch auf AHP |
| **Chat › Editor › Codex: Prefer Agent Host** | Codex-Sessions aus dem regulären Workbench (Sidebar-Chat) laufen im Agent Host (per Window). | benötigt `Agent Host: Enabled` |
| **Chat › Agents › Claude: Prefer Agent Host** | Claude-Sessions aus dem Agents-Window laufen im Agent-Host-Prozess (per Window). | benötigt `Agent Host: Enabled` |
| **Chat › Agents › Copilot Cli: Hide Extension Host** | Blendet den Extension-Host-Copilot-CLI-Eintrag aus dem Agents-Window-Picker aus. | Kosmetik/Picker |

→ **Ursache der Install-AHP-Session ist ein Setting, nicht unser Code.** `Default To Copilot Harness` (evtl. Default-on im Rollout) macht neue Editor/Panel-Sessions AHP. **Gegenmittel für „jetzt nicht":** `Agent Host: Enabled` bzw. `Default To Copilot Harness` off. Die `preferAgentHost`-Schalter sind **per-Harness** (Codex/Claude getrennt) — d. h. die Migration ist **granular steuerbar**, nicht alles-oder-nichts.

## Offen (nächste Spikes)

- **Confirmation-Guardrail:** Umgehen Jarvis' eigene Tools (`jarvis_sendMessage`) die native „bestätige jeden Send"-Abfrage? Erster Hinweis: Qwen sendete ohne VS-Code-Dialog → wahrscheinlich ja, aber sauber verifizieren (sonst killt eine Bestätigungspflicht die Heartbeat-Autonomie).
- **Restliche 7 Hook-Events** einzeln bestätigen (nur `UserPromptSubmit` gemessen; Mechanik identisch).
- **Display-/Attach-Lücke (Messung D):** Warum schlägt `/remote on` fehl, und gibt es einen Weg, den VS-Code-Editor an eine laufende (extern getriebene) Session **anzuhängen**, sodass der Verlauf sichtbar wird? Unter 1.130 (Multi-Window-Attach) neu zu messen.
- **1.130 Zwangs-Migration (Breadcrumb, 2026-07-23):** Beim `jarvis-syspilot`-Install unter 1.130 öffnete sich **automatisch eine AHP-Session** — unser unveränderter `workbench.action.chat.open` löst mit aktivem `chat.agentHost.enabled` jetzt auf den Agent Host auf (nicht unser Code, VS Codes Auflösung). Die Session zeigte **Einstellungen für „remote control" / „interactive"** (nicht im Detail erfasst, Session wieder gelöscht). → Nächster Spike: diese Session-Settings inventarisieren; prüfen, ob `chat.open`-Zustellung unter 1.130 noch dupliziert oder nativ die AHP-Session trifft.
- Ist der `agent-host-session://`-Opener bzw. `openerService.open` aus einer **Extension** stabil/öffentlich triggerbar (vs. nur workbench-intern)?
- Stellt der AHP-Client (message-port lokal) darüber hinaus einen Weg bereit, einer bereits offenen Session **ohne UI-Öffnen** einen Turn zu injizieren (headless delivery)?

## Referenzen

- Test-Session-Titel-Artefakte: `AHP-Session` (echt) + `Read messages in Jarvis` (Duplikat) — beide gleichzeitig in `state.vscdb`.
- Live-Session-Objekt (aus AHP-Session): `session="copilotcli:/f7780f7d-…"`, `openLink="agent-host-session://copilotcli/f7780f7d-…"`, `status="inputNeeded"`, changesets+git-Metadaten.
- `microsoft/vscode` 1.129: `chatWidgetService.ts`, `agentHostUri.ts`, `agentHostSessionsProvider.ts`, `nodeAgentHostStarter.ts`, `agentHostMain.ts`, `agentHostByokLmHandler.ts`, `chatDebugWireLogView.ts`, `sessionServerTools.ts` (`buildOpenSessionLinkUri`), `chatSessionCreatedResultSubPart.ts` (Opener), `agentService.ts` (`shouldSurfaceLocalAgentHostProvider`).
- [Agent Host Protocol](https://microsoft.github.io/agent-host-protocol/) · [Repo](https://github.com/microsoft/agent-host-protocol) · [AHPX (TS-Client)](https://github.com/tylerleonhardt/ahpx)
