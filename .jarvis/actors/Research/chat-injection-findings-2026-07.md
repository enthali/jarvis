# Chat-Injection: API-Verhalten von `workbench.action.chat.*`

Ermittelt im Spike `research-message-delivery-noop` (2026-07-27/28) gegen **VS Code 1.130.0**.
Quellen: statische Analyse von `out/vs/workbench/workbench.desktop.main.js` (minifiziert) plus
Laufzeit-Experimente im Extension Development Host. Jede Aussage unten ist entweder aus dem
Bundle belegt oder live reproduziert — spekulative Punkte sind als solche markiert.

## 1. Command-Inventar und Namenskonvention

- 209 statisch registrierte `workbench.action.chat.*` IDs, davon 52 zur Laufzeit als `chat.open*`.
- Die Per-Mode-Commands heissen `workbench.action.chat.open<Mode>` und werden **dynamisch** erzeugt.
- Built-in-Modi sind kleingeschrieben: `openagent`, `openask`, `openedit`.
- Custom Agents behalten ihren Anzeigenamen inkl. Leerzeichen: `openTest Manager`, `openChange Manager`, `opensyspilot.setup`.
- **`workbench.action.chat.openAgent` existiert nicht.** Der historische "command not found" war eine
  geaenderte Namenskonvention, kein entfernter Command. Wer auf CamelCase-Built-ins baut, faellt still um.

## 2. Wie `chat.open` sein Ziel-Widget waehlt

`workbench.action.chat.open` ist mit **einem** Konstruktorargument registriert → `this.mode === undefined`.
Die Per-Mode-Commands bekommen ein zweites Argument und tragen darum `this.mode`.

Die Widget-Aufloesung im Bundle:

```js
let b = n.lastFocusedWidget;
if ((!this.mode || !b || !Ls(b.domNode)) && (b = await n.revealWidget()), !b) return;
```

`Ls` prueft, ob das aktive DOM-Element innerhalb des Widget-Knotens liegt.

- **Ohne `mode`**: `lastFocusedWidget` wird genommen, ohne DOM-Fokusprobe. Genau das macht die Variante
  robust fuer Injektion in einen bereits geoeffneten Chat-Editor.
- **Mit `mode`**: Es wird zusaetzlich DOM-Fokus verlangt; scheitert die Probe, greift `revealWidget()`,
  das auf die Sidebar-Chat-View ausweichen kann — also potenziell ein *anderes* Ziel.

## 3. Risiko: Mode-Wechsel kann die Session leeren

`handleSwitchToMode` endet mit:

```js
c.needToClearSession && await n.executeCommand(fg)   // fg = "workbench.action.chat.newChat"
```

Einen **fremden** Modus an eine bestehende Session zu uebergeben, kann diese also leeren.
Konsequenz: Fuer Bestandssessions niemals `mode` mitgeben. Der Modus der Session bleibt ohnehin erhalten,
wenn man ihn nicht anfasst.

## 4. Weitere Bundle-Fakten

- Submit-Pfad: `b.viewModel || await z.toPromise(b.onDidChangeViewModel)` — **ohne Timeout**, kann bei
  einem frisch geoeffneten Widget still haengen. Danach `oxn(...)` mit 60 s Timeout, dann `setInput(query)`
  und `acceptInput()`.
- `workbench.action.chat.focusInput` ruft lediglich `lastFocusedWidget?.focusInput()`. Es kann den Fokus
  **nicht** auf ein anderes Widget umlenken — taugt also nicht zur Zielsteuerung.
- `openSessionWithPrompt.<type>` existiert nur fuer *contributed* Session-Typen (claude-code,
  copilot-cloud-agent, copilotcli) und nutzt `chatService.sendRequest(resource, prompt, ...)`.
  Fuer lokale Sessions nicht verwendbar.

## 5. Live validiert: Injektion in eine bereits offene Session

`chat.open` **ohne** `mode` submittet zuverlaessig in eine offene Session — viermal reproduziert,
darunter zweimal ueber den echten Zustellpfad. Command kehrt nach 12–19 ms zurueck, der Hook
`UserPromptSubmit` mit der Ziel-Session-UUID folgt rund 0,5 s spaeter.

Auch dann korrekt, wenn beim Start ein **fremder** Tab aktiv war: `vscode.open` wechselt den Tab vorher,
und die Zustellung landet trotzdem in der richtigen Session. Der Sitzungsfokus des Senders ist damit
als Fehlerquelle ausgeschlossen.

### Minimale verlaessliche Sequenz (Bestandssession)

1. `vscode.open` auf `vscode-chat-session://local/<base64(uuid)>`
2. optional Agent-Modus reaktivieren: `workbench.action.chat.open<Agent>` **ohne Argumente**
3. `workbench.action.chat.focusInput`
4. `workbench.action.chat.open` mit `{ query, isPartialQuery: false }` — **ohne `mode`**

Schritt 2 stoert Schritt 4 nachweislich nicht (eigene Probe-Variante dafuer gefahren).

## 6. Nicht abschliessend geprueft

- `chat.open` **mit** `mode` gegen eine Bestandssession wurde live nicht durchgespielt; das
  `needToClearSession`-Risiko ist nur statisch belegt. Da der produktive Pfad `mode` fuer Bestandssessions
  nicht braucht, war die Messung entbehrlich — vor einer Umstellung waere sie nachzuholen.

## 7. Methodische Lehre

Die statische Bundle-Analyse lieferte korrekte **Fakten**, aber eine falsche **Schlussfolgerung**
(„`chat.open` ohne mode trifft den Editor nie"). Erst die Laufzeitexperimente haben diskriminiert, und
das entscheidende Signal war ausschliesslich der Hook `UserPromptSubmit` mit der Session-UUID —
nicht der optische Eindruck und nicht der angezeigte Agent-Modus.
