# FI-2026-07-01 — Editor-Group-Placement für Actor-Sessions

**Status:** Konzeptionell validiert, empirisch getestet (Spike-Branch `experiment/editor-group-placement`). Bereit für eine reguläre CR.  
**Scope:** UI/Runtime-Feature (kein Spec-Debt) — betrifft, wie Jarvis Actor-Chat-Editoren beim Öffnen/Deliver platziert.

---

## Trigger

Der aktuelle Auto-Delivery-Modus ist UI-seitig störend: Nachrichten werden per „Hack" in eine Session injiziert (`workbench.action.chat.open`/`vscode.open` ohne Platzierungslogik), was zu **Fokus-Hüpfen** führt — jede Delivery reißt den Fokus dorthin, wo gerade zufällig „aktiv" ist. Ein sauberer Fix wäre AHP — aber **AHP deckt aktuell nur CLI-Sessions ab, nicht VS-Code-Chat-Editor-Tabs** (unser tatsächliches Substrat hier). Bis das reift, brauchen wir einen eigenständigen Zwischen-Mechanismus.

## Das Modell: drei semantische Ziele, keine feste Spalten-Anzahl

| Ziel | Spalte | Regel |
|---|---|---|
| **Main** | Spalte 1 | **fest** — Klick auf einen Actor im Tree öffnet immer hier |
| **Docs** | Spalte 2 | **fest** — `context.md`/YAML/Agent-File aus der Entity-Tree (`SPEC_ENT_ENTITY_FILE_CHILDREN`) |
| **Secondary** | **letzte existierende Spalte** | **dynamisch** — Delivery an eine noch nicht offene Session |

**Kein State nötig.** Jede Entscheidung wird zur Laufzeit aus „existiert gerade ein Tab, und wo" abgeleitet — keine YAML-Flags, keine Runtime-Maps.

### Placement-Regeln

**Bei Klick (User-initiiert):**
1. Tab existiert bereits **links** → nur fokussieren.
2. Tab existiert **anderswo** → **schließen, dann frisch links öffnen** (Close+Reopen).
3. Kein Tab → frisch links öffnen.

**Bei Delivery (System-initiiert, Auto-Delivery/Play-Button):**
1. Tab existiert **irgendwo** (egal wo, auch manuell vom User verschoben) → **dort öffnen/injizieren, nicht bewegen**.
2. Kein Tab → frisch an der **aktuell letzten existierenden Spalte** öffnen.

### Degenerierte Fälle (kein Sonderfall-Code nötig)

- **1 Group offen** (nur Main) → „letzte Spalte" = Spalte 1 = Main selbst. Alles landet dort. Passt.
- **2 Groups offen** (Main + Docs) → „letzte Spalte" = Spalte 2 = Docs' Spalte. Secondary und Docs teilen sich die Group (gemischte Tabs, normales VS-Code-Verhalten).
- **3+ Groups offen** → Secondary bekommt eine **eigene, stabile** Spalte, die für alle weiteren neuen Sessions **wiederverwendet** wird (keine wachsende Spaltenzahl pro Delivery).
- **User zieht eine Session manuell** in eine andere Group → bleibt dort, bis ein expliziter „Main"-Klick sie zurückholt (Close+Reopen).

## Warum „Files" kein Systemkonzept ist

Ursprünglich wurde erwogen, eine Spalte fest für „Dateien" zu reservieren und dynamisch zwischen „Datei-Viewer" und „Secondary Actors" umzuschalten — das wurde verworfen: **Dual-Identität einer Spalte ist unerklärbar** und ein schlechter Kompromiss. Stattdessen: **Docs** (unsere eigenen Entity-Files) bekommen eine feste Spalte, **beliebige andere Dateien**, die der User manuell öffnet, sind komplett außerhalb des Systemvertrags — unsere Logik rührt nur Tabs an, deren Label auf einen bekannten Actor-Namen matcht.

## Validierte technische Bausteine

- **Close+Reopen ist robust** — überlebt sogar ungesendeten Chat-Entwurfstext (empirisch getestet: Tab mit halbem Satz geschlossen, neu geöffnet, Entwurf war noch da).
- **`vscode.open(chatSessionUri, { viewColumn, preserveFocus })`** funktioniert zuverlässig für existierende Sessions.
- **Fehlende Spalten werden von VS Code automatisch materialisiert** (Auto-Split) — `viewColumn: Two` bei nur 1 offener Group erzeugt zuverlässig eine zweite Group. Bestätigt über alle getesteten Ausgangslagen (1/2/3/4/5+ Groups).
- **Auxiliary Windows** (via „Move Editor/Chat into New Window") sind **weiterhin Teil von `vscode.window.tabGroups.all`** — unsere Close/Reuse-Logik funktioniert transparent auch über Fenstergrenzen hinweg (keine Sonderbehandlung nötig).

## Zwei echte Bugs während der Validierung gefunden + behoben

1. **Konfundierter Sidebar-Test:** Ein früher Testversuch feuerte 3 Varianten in einer Schleife, jede als neue Chat-Query — erzeugte 3 neue Sessions statt eine gezielt zu testen. Lehre: **ein sauberer Versuch pro Test**, nicht mehrere in Serie.
2. **Runaway-Column-Creation:** `expSecondaryColumn()` berechnete `Anzahl-Groups + 1` (bewusst eine NEUE Spalte pro Delivery) statt „letzte **existierende** Spalte" — das erzeugte bei jeder neuen Session eine weitere Spalte nach rechts (6 Tabs nach ein paar Tests). Fix: kein `+1`, einfach `Math.max(1, tabGroups.all.length)`. Nach dem Fix: stabil, Sessions stapeln sich als Tabs in derselben Secondary-Group.

## Exploriert und verworfen

### Sidebar Chat View als Secondary-Ziel — verworfen
Keine belastbare Möglichkeit gefunden, eine **bestimmte, benannte** Session gezielt in die Sidebar-Chat-View zu routen. Der `location`-Parameter von `workbench.action.chat.open` zeigte in allen getesteten Varianten **keinen Effekt** — die Query landete immer im zuletzt aktiven Editor-Tab (konfundiert durch „injiziere in aktiven Chat"-Verhalten). Die Sidebar hat zudem keinen scriptbaren Session-Adressierungs-Mechanismus (ihr History-Picker ist rein manuelle UI).

### Auxiliary Window als dediziertes „Secondary" — technisch möglich, aber zurückgestellt
„Chat: Move Chat into New Window" funktioniert und bleibt für uns adressierbar (s.o.). Aber:
- **Kein Minimize-Command** über die Extension-API auffindbar (`get_vscode_api`-Recherche ohne Treffer) — Fenster-Chrome-Operationen sind vermutlich keine Extension-API-Fläche.
- **Move-Operation hinterlässt einen leeren Chat-Tab** an der Ursprungsposition (dieselbe Nebenwirkung wie Split) — zusätzlicher Aufräumbedarf.

→ Reibung summiert sich ohne klaren Gewinn gegenüber dem simplen In-Window-Modell. Nicht empfohlen für v1, könnte bei besseren VS-Code-Window-APIs später revisited werden.

## Phase 1 / Phase 2 — bewusste Grenze

- **Phase 1 (dieses Finding, validiert):** **Wo** ein Tab landet. Vollständig getestet und stabil.
- **Phase 2 (empirisch probiert, s.u.):** **Wohin der Fokus zurückkehrt** nach einer System-initiierten Delivery. **AHP könnte das lösen, aber nur für CLI-Sessions** — für unser Editor-Tab-Substrat bleibt der Snapshot/Restore-Ansatz.

## Phase 2 — Fokus-Snapshot/Restore, empirisch getestet

**Methodik-Problem gelöst:** Ein manuell in der Command Palette ausgeführter Test-Command würde den Fokus schon durch den Palette-Aufruf selbst verfälschen. Lösung: ein **verzögerter Test** (`setTimeout`, 6s) — Command einmal auslösen, dann in Ruhe den Fokus manuell setzen (Editor-Tab oder Terminal), erst nach Ablauf feuert der Snapshot/Disrupt/Restore-Zyklus **ohne** eigene Palette-Interaktion. Simuliert realistisch, wie ein echter Heartbeat/Auto-Delivery unangekündigt feuern würde.

**Snapshot-Mechanismus (ein Bug gefunden + behoben):** `tab.input` liefert bei **Chat-Editor-Tabs keine `.uri`** (anders als normale Datei-Tabs — empirisch bestätigt: `uri=n/a` für einen Chat-Tab). Fix: Fallback auf **`lookupSessionUUID(tab.label)`** — exakt derselbe Mechanismus, der in Phase 1 für Click-Open/Deliver schon funktioniert, hier nur auch für den Restore-Snapshot angewendet.

**Ergebnis: Restore funktioniert.** Snapshot (Chat-Tab, Spalte 1) → Disruptive Open (Test-Doc, Spalte 2) → Restore via `vscode.open(snapshotUri, { viewColumn, preserveFocus:false })` — Fokus kehrte sauber zur ursprünglichen Session zurück.

**Timing-Korrektur (wichtig):** Der erste Testlauf enthielt eine **künstliche** `setTimeout(800ms)`-Pause vor dem Restore (defensiv eingebaut, „damit sich die Disruptive Action sichtbar setzt" — unnötig, da `showTextDocument()`/`vscode.open()` bereits awaited Promises sind). Nach Entfernen dieser Pause:

| | Mit künstlicher Pause | Ohne (real) |
|---|---|---|
| Snapshot → Restore-Ende | **839ms** | **520ms** |
| Tastatur-Leck bei aktivem Tippen | **23 Zeichen** | **1 Zeichen** |

Das bestätigt die Hypothese direkt: das Leck skaliert proportional mit der Fenstergröße. Die verbleibenden ~520ms sind **keine künstliche Wartezeit mehr**, sondern die reale Extension-Host↔Renderer-IPC-Zeit für zwei `open()`-Aufrufe (Disrupt ~247ms + Restore ~273ms) — das ist vermutlich die **praktische Untergrenze** für einen UI-basierten Restore-Mechanismus.

**Echte, akzeptierte Limitation: minimales Tastatur-Leck bei exakt getimtem aktivem Tippen (~1 Zeichen im besten Fall).** Wird im ~520ms-Fenster aktiv getippt, landet das Zeichen **physikalisch im falschen Fenster** (dort, wohin die Disruptive Action den OS-Tastatur-Fokus kurzzeitig verschoben hat) — Restore repariert danach den *Zustand*, aber nicht das währenddessen fehlgeleitete Zeichen. Das ist **keine Frage der Restore-Geschwindigkeit** (die haben wir jetzt auf ihr Minimum reduziert), sondern eine grundsätzliche Eigenschaft von OS-Input-Routing: eine Extension kann Tastatureingaben nicht puffern/umleiten, während sie im Hintergrund den Fokus verschiebt. **Einzige vollständige Lösung: den Fokus nie stehlen** (fokus-freie Injection, z. B. via AHP) — aber AHP deckt aktuell nur CLI-Sessions ab, nicht dieses Editor-Tab-Substrat. Für v1 als akzeptierte, jetzt sehr kleine Grenze dokumentiert (1 Zeichen Restrisiko statt 23).

### Stresstest: Keyboard-Repeat (Autofire) — zwei getrennte, unabhängige Probleme entdeckt

Weiterer Test mit gehaltener Taste (Autofire) statt manuellem Tippen, direkt **in die aktive Session-Chat-Eingabe** hinein (nicht ins Test-Doc). Streuung über mehrere Läufe:

| Testlauf | Methode | Ergebnis |
|---|---|---|
| Manuelles Tippen, künstliche 800ms-Pause | — | 23 Zeichen (gefühlt) |
| Manuelles Tippen, Pause entfernt (~520ms) | — | 1 Zeichen |
| Volle Tippgeschwindigkeit, ohne Pause | — | 0 Zeichen (nur Blip) |
| Keyboard-Autofire (Dauerlast) | — | `editor.edit()` **komplett verworfen** (Doc-Versions-Konflikt, s.u.) |
| Keyboard-Autofire (erneut) | — | 6 Zeichen eingefügt, dann Fehler |

**Wichtige Korrektur/Klarstellung nach Nutzer-Feedback — das sind zwei unabhängige Probleme, nicht eines:**

1. **Der Fokus-Wechsel selbst funktioniert einwandfrei** (bestätigt) — Restore landet korrekt zurück. Das ist genau das, was Phase 2 lösen soll: die **„wo bin ich jetzt gelandet?"-Orientierungslosigkeit** nach einer Delivery eliminieren. Ohne diese Lösung muss man **heute schon** nach jeder Delivery manuell nachschauen, wohin der Fokus gesprungen ist — das stellt Phase 2 ab.
2. **Input-Korruption beim aktiven Tippen in einer Session** (z. B. `editor.edit()` wird durch konkurrierende Doc-Version-Änderung abgelehnt, `false` zurückgegeben) ist ein **bereits existierender, unabhängiger Bug** — er existiert **genauso** in der heutigen Produktivlösung (jeder `chat.open`/`vscode.open`-Call ohne Fokus-Bewusstsein trägt dieses Risiko) und wird **nicht** durch unser Experiment oder den Fokus-Switch verursacht. Er tritt „normalerweise" nur nicht auf, weil man selten exakt im Moment einer Delivery aktiv tippt.

**Architektonische Resilienz, die den Blast-Radius von Problem 2 klein hält:** Produktiv-Delivery injiziert **nicht** den vollen Nachrichteninhalt als Prompt — nur einen kurzen Trigger-Stub („du hast N neue Nachrichten, lies sie mit `jarvis_readMessage`"). Die eigentliche Nachricht liegt sicher in der JSON-Queue. Selbst wenn der **Trigger-Stub** durch eine Race-Condition beschädigt/verloren geht, ist die **Nachricht selbst nicht verloren** — sie wird beim nächsten Heartbeat-Zyklus oder manuellen Poll trotzdem gefunden. Diese Entkopplung von „Nachricht" und „Hinweis, sie zu lesen" ist eine bereits vorhandene, wertvolle Robustheits-Eigenschaft — kein Ergebnis dieser Untersuchung, aber ein wichtiger Kontext dafür, warum Problem 2 in der Praxis unkritisch bleibt.

### Finaler Test: echte Chat-Injection statt Datei-Edit — deutlich robuster

Sechster Spike-Command (`chatInjectRetryTest`): Disruptive Action injiziert nicht mehr in eine Testdatei, sondern via `workbench.action.chat.open({ query })` als **echte Chat-Query** in eine Ziel-Session — genau der Mechanismus, den die Produktivlösung tatsächlich nutzt (nicht `editor.edit()`, das nur als Datei-Stellvertreter diente).

**Ergebnis über mehrere Läufe, inkl. voller Keyboard-Autofire-Last:** Die Injection kam **jedes Mal sauber an**, kein einziges Mal ein Fehler oder Rejection wie beim Datei-Test. Ein Zusatztest mit **manuellem, schnellem Tippen** von `1234`-Wiederholungen (~2 Zeichen/Sek.) in die **eigene** Session zeigte lokal 2 Vertauschungen + 1 Verschiebung, konzentriert genau um den ~520ms-Fokus-Wechsel-Moment — passt exakt zur gemessenen Fenstergröße.

**Wichtige Erkenntnis:** Die zuvor gefundene `editor.edit()`-Rejection (Doc-Versions-Konflikt) ist ein **Artefakt des Datei-Edit-Test-Stellvertreters** — sie überträgt sich **nicht** auf die echte Produktiv-Mechanik (Chat-Query-Submission ist vermutlich kein Buffer-Edit, sondern ein diskreter „Send"-Vorgang ohne dieselbe Versionskonflikt-Logik). Die reale Delivery-Mechanik ist damit **robuster als der Test-Stellvertreter vermuten ließ**.

**Der entscheidende pragmatische Punkt:** Das verbleibende Mini-Risiko (1–2 vertauschte/verschluckte Zeichen im ~520ms-Fenster bei exakt gleichzeitigem Tippen) ist für den echten Anwendungsfall **praktisch irrelevant** — der Konsument ist ein **LLM in einem Chat**, kein starres Textformat. Ein LLM korrigiert kleine Tippfehler in natürlicher Sprache trivial weg; das wäre bei einem Dateipfad, Command oder Code fatal, hier nicht. Das Restrisiko ist real, aber **kontextuell harmlos**.

**Fazit Phase 2 (final):** Fokus-Restore funktioniert zuverlässig. Die echte Injection-Mechanik (Chat-Query) ist robuster als der Datei-Test vermuten ließ. Verbleibendes Mini-Risiko ist durch den LLM-Konsumenten praktisch neutralisiert. Kein weiterer Optimierungsbedarf für v1.

## Referenzen

- Spike-Branch: `experiment/editor-group-placement` (6 Test-Commands: Click-Open, Deliver, Open-in-Sidebar, Open-Doc-Col2, Delayed-Focus-Test, Chat-Inject-Retry-Test) — throwaway, nicht für Merge vorgesehen.
- `SPEC_ENT_ENTITY_FILE_CHILDREN` — die Docs-Spalten-Zielsetzung betrifft diesen bestehenden Produktiv-Command (`jarvis.openEntityFile`), der aktuell **kein** Group-Targeting hat.
- [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) — AHP/CLI-Limitation, Docking-Vision
- [FIND-2026-04-17-experiments-terminal-inject.md](FIND-2026-04-17-experiments-terminal-inject.md) — frühere Fokus-/Injection-Experimente

## Nächste Schritte (für eine künftige CR)

1. Produktiv-Code (`openChatForEntity`, `sendMessagesCommand`, Poll-Loop, `openEntityFileCommand`) auf die drei Placement-Regeln umstellen.
2. Konfigurierbarkeit prüfen (z.B. `jarvis.editorLayout.secondaryColumn` falls User-Anpassung gewünscht) — aktuell hart im Spike, nicht nötig für v1.
3. Phase 2 (Fokus-Restore) **kann jetzt in dieselbe CR wie Phase 1**, da beide Mechanismen validiert sind (Snapshot/Restore nutzt exakt dieselben Werkzeuge wie Phase 1: `tabGroups` + `lookupSessionUUID` + `vscode.open`). Tastatur-Leck-Limitation im Change-Doc als bekannte, akzeptierte Grenze dokumentieren.
