# Mail-Zuordnung per Embeddings — Uebergabe (Stand 2026-10-07)

Fuer: Pantheon-Admin (Entscheidung ueber Umbau der Pantheon-Skripte liegt beim User). Von: Research-Aktor, Spike `email-triage-embeddings-poc` (Auftrag PM).
Messprotokoll mit allen Zahlen: [findings-2026-10.md](findings-2026-10.md). Code: [scripts/](scripts/). Keine Mailtexte, Adressen oder Betreffs in diesem Ordner; Labels und Ausgaben mit Betreffs liegen beim User ausserhalb des Repos.

## Kurzfassung
- Frage: Findet man das Projekt einer eingehenden Mail per Bedeutungsaehnlichkeit (Embeddings)? Antwort aus den Messungen: ja, als **Kandidatenliste**; mit **Mails aus den Projektordnern als Vektoren** deutlich besser als mit `actor.yaml`+`context.md`.
- Live gegen 15 vom User gelabelte Inbox-Mails (30 Ordner-Mails je Projekt, `bge-m3`): Platz 1 richtig 11/15, in den Top 3 13/15 (Verfahren `mails3`). Mit nur `actor.yaml`+`context.md`: 4/15 und 9/15. Kleine Stichprobe, Labels nach Ansicht der Ergebnisse; Groessenordnung, kein Beleg fuer eine Quote.
- **Nicht** loesbar per Score: "gehoert zu keinem Projekt". Score und Abstand zu Platz 2 trennen es nicht (Messung in findings). Dafuer braucht es Regeln, ein Pseudo-Projekt oder einen Dispatcher (siehe unten).
- Laeuft komplett aus Skripten (Outlook-COM, Ollama), ohne Jarvis-Extension; ohne Cache 4 bis 5,5 Minuten je Lauf. Fuer Kalibrierung ausreichend.

## Voraussetzungen (so lief es)
- Ollama 0.40.0 lokal (`http://127.0.0.1:11434`), Modell `bge-m3:latest` (ID 790764642607, 1,2 GB, 1024 Dimensionen). Laeuft zu 100 % auf der CPU (`ollama ps`), nur Intel-Grafik vorhanden.
- Node v26.7.0 (eingebautes `fetch`, ESM, keine npm-Abhaengigkeiten; aeltere Versionen nicht getestet), pwsh 7.6.6, Outlook per COM.
- Pantheon-Skripte unveraendert und nur lesend: `jarvis-email/scripts/get-mail.ps1` (Liste, `-Top N -Days 3650`) und `get-mail-by-id.ps1` (Volltext). Ein eigenes Skript `read-folder.ps1` liest die neuesten Mails **eines Unterordners** der Inbox; ein solches Skript fand ich in Pantheon nicht (gelesen: nur die drei genannten Skripte angesehen).
- Pfade sind in den Skripten fest eingetragen (`PROJECTS_DIR` fuer die Projektordner, `PANTHEON`, Ausgabe `C:\workspace\jarvis-email-poc-out`); anpassen.

## Methode (was die Skripte tun)
1. **Docs-Index:** je Projektordner `actor.yaml` plus `context.md` (an Ueberschriften geteilt, <80 Zeichen zusammengelegt, >1500 geteilt, Praefix `Projekt: <Name>`) einbetten. 26 Projekte, 113 Abschnitte.
2. **Mail-Vektoren je Projekt:** die neuesten N Mails aus dem gleichnamigen Outlook-Unterordner der Inbox (Alias-Tabelle fuer abweichende Ordnernamen) einbetten. Auto-Replies (Betreff beginnt mit "Automatic reply", "Automatische Antwort", "Out of office", "Abwesenheits...") werden vorher per Regel ausgelassen.
3. **Mailtext aufbereiten** (`prepareMail`): Betreff ohne RE/AW/WG/FW, Text ohne HTML, zitierte Historie, Signatur, URLs; `Betreff: ...` plus Text, max. 2000 Zeichen. Embedding per `POST /api/embed` (Batches zu 8, `truncate: true`, Vektoren normiert).
4. **Ranking einer neuen Mail:** Cosinus gegen alle Vektoren eines Projekts. Verfahren `mails3` (bestes im Test): Mittel der 3 aehnlichsten Ordner-Mails je Projekt. Weitere Verfahren im Code: `docs`, `mails` (beste einzelne Mail), `fuse`, `rrf`.
5. **Ausgabe:** Top 3 je Mail in eine Markdown-Datei ausserhalb des Repos, Auswertung gegen `labels.json` (Schluessel `MM-DD HH:mm|Betreff-Praefix`, Wert Projektliste, `["none"]` oder `null`).

Aufrufe (Beispiele): `node scripts\run.mjs [--filed] [--skip-inbox]` (Schritt 1, Docs-Index, optional Gegenprobe auf abgelegten Mails); `node scripts\compare.mjs`; `node scripts\compare2.mjs --inbox=21 --per-folder=30 --labels=<datei>`.

## Ergebnisse in Kuerze (Details in findings)
| Messung | Ergebnis |
|---|---|
| Docs allein, 81 abgelegte Mails (Ordner = Wahrheit) | Platz 1 44 %, Top 3 58 %, Top 5 64 % (`max`) |
| Docs allein, 15 live gelabelte Inbox-Mails | 4/15 Platz 1, 9/15 Top 3 |
| `mails` (30 je Ordner), gleiche 15 | 10/15 Platz 1, 13/15 Top 3 |
| `mails3` (30 je Ordner), gleiche 15 | 11/15 Platz 1, 13/15 Top 3 |
| `fuse`, `rrf` (Docs+Mails gemischt, nicht abgestimmt) | 8/15 Platz 1 (beide), Top 3: 10/15 bzw. 11/15 |
| Zeit | Modell laden 2,2 s; Docs-Index 65-93 s; ca. 0,5-1 s je Mail; Lauf gesamt 211-325 s |

## Erkenntnisse, die beim Umbau zaehlen (jeweils mit Grund)
- **Abwesenheitsnotizen und andere Vorlagen-Mails per Regel behandeln, nicht per Modell.** Beobachtung: eine Auto-Reply zog mit Score 0,78 auf HR; die Quelle war eine Abwesenheitsnotiz im HR-Ordner. Mechanismus (Vorlagentext dominiert die kurze Mail) ist Hypothese.
- **Testmails nicht im Index halten.** Eine Kopie derselben Mail im Ordner ergibt Score 1,000. Fuer Messungen die Testmail ausschliessen.
- **Threads wirken stark.** Eine neue Mail zu einer abgelegten Reihe erreicht hohe Scores mit grossem Abstand (bis 0,82/0,23). Das taeuscht bei Messungen mit Ordner-Mails eine bessere Trefferquote vor als bei einem neuen Thema.
- **Projekte mit wenig oder keinen Mails im Ordner koennen kaum gewinnen** (im Test 6 von 26 Projekten ohne Mail, mehrere mit 1). Docs als Rueckfall fuer solche Projekte ist eine Idee, nicht getestet.
- **Score/Abstand taugen nicht als "kein Projekt"-Schwelle** (Messung: Mails ohne Projekt 0,57-0,66, richtige Treffer 0,52-0,82).
- **Unscharfe Projektschnitte begrenzen jede Methode:** Grenzfaelle zwischen zwei Projekten (z. B. ein wanderndes Thema) sind ein MECE-Problem der Projekte, kein Embedding-Fehler (Einschaetzung des Users, von mir geteilt).

## Offene Fragen (Entscheider jeweils genannt)
1. **Mails, die zu keinem Projekt gehoeren** (viele, v. a. Eisenhower Q4) — Entscheider: User mit Pantheon-Admin. Die Messung zeigt, dass Score allein nicht trennt. Optionen aus meiner Sicht, **nicht gemessen**: (a) Regeln vor dem Modell (Auto-Replies sind schon so geloest; Benachrichtigungen, Newsletter nach Absender/Betreff-Mustern); (b) den Ordner "4 Unwichtig" (und weitere Q4-Ordner) wie ein Projekt mit eigenen Mail-Vektoren behandeln, dann ist "unwichtig" ein normales Ranking-Ergebnis; (c) Rueckfrage an einen Dispatcher bei unsicherem Ergebnis. Vorschlag zum Pruefen von (b): die 25 gelesenen Mails aus "4 Unwichtig" als Testklasse in die Auswertung aufnehmen und zaehlen, wie viele dort landen und wie viele Projekt-Mails faelschlich dort landen.
   - **Position des Users (2026-10-07):** Die Eisenhower-Ordner ("1 Sofort" bis "4 Unwichtig") enthalten schon abgelegte Mails, teils zu viele in "4"; das Lernen aus den Ordnern soll das abfangen, ein Sonderbau sei nicht noetig. Technisch ist das richtig: die Ordner sind nur weitere Klassen in der Ordnerliste der Skripte. Meine Einschraenkung (Hypothese, nicht gemessen): diese Ordner trennen nach Prioritaet, nicht nach Thema, und eine Mail liegt in Outlook nur in einem Ordner. Mails mit Projektbezug in "4" wuerden damit als "unwichtig" gelernt und koennten Projekt-Treffer wegziehen. Ein Lauf mit den Ordnern in der Liste zeigt das; Entscheidung ueber den Lauf: User.
2. **Umorganisation (Projekt wird geteilt, neues Projekt)** — Entscheider: User. Der Index ist nur eine Ableitung der Ordnerinhalte; Verschieben von Mails aendert ihn sofort. Alte Mails im alten Projekt stoeren, solange sie unter den neuesten N liegen und das neue Projekt noch kaum Mails hat. Vorschlaege (ungetestet): passende alte Mails einmal in die neuen Ordner verschieben; oder Stichtag je Projekt; bei Neuanlage Docs als Rueckfall.
3. **Korrekturen und KPIs im Betrieb** — Entscheider: User. Vorschlag: bei Eintreffen je Mail Kennung, Datum, Top-3-Vorschlag loggen (kein Mailtext); taeglicher Scan, in welchem Ordner die Mail jetzt liegt. KPIs: Treffer Platz 1/Top 3, Relabel-Rate (nach erster Ablage noch verschoben), unabgelegte Mails nach N Tagen, gleitend ueber 7/30 Tage. Zusaetzlich ein eingefrorener Referenzsatz zum Vergleichen von Verfahren (er sagt nichts ueber die Zukunft aus).
4. **Parameter** (noch nicht variiert): Mails je Ordner (10, 30, alle, neueste plus einige aeltere), k bei `mails3`, Docs als Rueckfall, Textlaenge, Absender/Thread als Zusatzsignal.
5. **Weitere Embedding-Modelle** (z. B. `qwen3-embedding:0.6b`, `embeddinggemma`): nicht verglichen, Download war wegen langsamer Verbindung nicht moeglich.
6. **Mail-Suche per Embedding** ("Mail zum Thema xyz"): technisch dieselbe Grundlage, aber eigene Funktion; braucht dauerhaft gespeicherte Vektoren aller Mails und lokalen Schutz (abgeleitete Mailinhalte). Nicht getestet; Entscheider: User.
7. **Spaeter eine Jarvis-Mail-Extension** mit eigenem Modell und Vektorcache (Wunsch des Users, erst nach Stabilisierung); in-process-Modell nicht untersucht.

## Grenzen dieser Uebergabe
- Alle Zahlen stammen aus **einem** Postfach und einem Tag; die Labels sind nach Ansicht der Ergebnisse entstanden.
- Kein Cache, keine Persistenz (Vorgabe des Spikes). Skripte sind Wegwerf-Code zum Messen, nicht fuer den Dauerbetrieb gebaut.
- Der Branch `research/email-triage-embeddings-poc` ist lokal und nicht gepusht; die Skripte liegen deshalb zusaetzlich hier.
