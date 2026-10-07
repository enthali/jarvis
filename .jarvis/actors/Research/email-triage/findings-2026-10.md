# Spike email-triage-embeddings-poc (2026-10-07) - Messprotokoll

Uebergabe-Einstieg: [README.md](README.md). Dieses Papier ist das Messprotokoll der drei Schritte (Stand 2026-10-07).

Auftrag PM: Laesst sich das Projekt einer eingehenden Mail per Bedeutungsaehnlichkeit (Embeddings der Projektdokumente gegen die Mail) finden — gut genug fuer Jarvis PIM?

Code: Kopie in [scripts/](scripts/); Original auf Branch `research/email-triage-embeddings-poc` (lokal, nicht gepusht), `experiments/email-triage-embeddings/`. Keine Mailtexte/Adressen/Betreffs in Dateien oder Notizen.

Schritt 1 = nur `actor.yaml` + `context.md` als Projektvektoren (`run.mjs`). Schritt 2 = zusaetzlich die 10 neuesten Ordner-Mails je Projekt (`compare.mjs`). Schritt 3 = 30 je Ordner, Auto-Reply-Regel, Fusion, Labels-Auswertung (`compare2.mjs`). Schritte 2 und 3 laufen gegen die 20 neuesten Inbox-Mails und die Labels des Users (live, nicht eingefroren).

## Aufbau (gelesen = Code, den ich selbst geschrieben und gelaufen habe)
- Modell: `bge-m3` (Ollama 0.40.0, 1024-d, schon installiert). **Nur dieses eine Modell** — der User ist ueber Handy verbunden, kein Download. Der geforderte Zwei-Modelle-Vergleich ist damit **nicht gemacht**; stattdessen Vergleich von drei Aggregationen auf demselben Modell.
- Index: 26 Projekt-/Aktor-Ordner, 113 Abschnitte (actor.yaml-Block plus `context.md` je Ueberschrift; <80 Zeichen zusammengelegt, >1500 geteilt; Praefix `Projekt: <Name>`). Vektoren nur im RAM.
- Mail: Betreff + Text; RE/AW/FW, HTML, zitierte Historie, Signatur, URLs entfernt (Text danach 67–1723 Zeichen).
- Aggregation je Projekt: `max` (bester Abschnitt, primaer), `top2` (Mittel der zwei besten), `centroid` (normierter Mittelvektor).
- Ausgabe: Konsole, Top 10 + Abstand Platz 1/2, keine Zuordnungslogik.

## Zeiten (belegt, 2 bis 3 Laeufe)
- Modell kalt laden: 2,2–2,4 s.
- Index 113 Abschnitte: 65–71 s (~0,6 s je Abschnitt). `ollama ps`: **100 % CPU**, Kontext 4096, nur Intel-Grafik — GPU nicht genutzt. Ursache fuer Tempo daher wahrscheinlich CPU (Hypothese, kein Gegenversuch).
- Mail: Liste 1,2 s (20 Mails), Volltext je Mail ~0,9 s (Outlook-COM), Embedding+Ranking ~0,5 s im Mittel (0,1 s bei 70 Zeichen bis 1,3 s bei 1400 Zeichen).
- 106 Mails embedden: 74 s (~0,7 s je Mail).

## Test A: 20 neueste Inbox-Mails (ohne Ground Truth)
- Abstand Platz 1/2 bei `max`: Median 0,014, von 0,000 bis 0,077; 13 von 20 unter 0,03. Spitzen-Score 0,47–0,64.
- Dieselben Projekte erscheinen in den Top 3 fuer fachlich verschiedene Mails: Jarvis, GenAI, Compliance, Customer GM, Event 2026-10-09 Summit, Project XC TRM. Hypothese: breit formulierte Projektdokumente werden von vielen Mails "angezogen" (Hubness); nicht geprueft.
- Sehr kurze oder formelhafte Mails (Abwesenheitsnotiz, Freigabe-Benachrichtigung) liefern beliebige Top 1 mit kleinem Abstand — Inhalt fehlt.
- Treffer, die plausibel wirken (Einschaetzung durch mich, nicht vom User bestaetigt): "Exchange with NE-TE | MCP Server Setup in SDV.Suite" -> Project XC SDV (0,574, Abstand 0,030); "Bosch:AWS Sync" -> Event Summit (Abstand 0,053); "Incubation and PMT workshop" -> Customer GM (Abstand 0,077). **Bewertung top-1/top-3 durch den User steht aus.**

## Test B: bereits abgelegte Mails (nur gelesene, Ordner = Wahrheit; read-only)
81 gelesene Mails aus 18 Projektordnern (max. 6 je Ordner), dazu 25 gelesene Mails aus `4 Unwichtig` als "kein Projekt".

| Variante | top1 | top3 | top5 | Score Top1 richtig / falsch / kein Projekt (Median) | Abstand richtig / falsch (Median) |
|---|---|---|---|---|---|
| `max` | 44 % | 58 % | 64 % | 0,631 / 0,557 / 0,523 | 0,042 / 0,012 |
| `top2` | 46 % | 59 % | 69 % | 0,590 / 0,547 / 0,501 | 0,025 / 0,012 |
| `centroid` | 44 % | 62 % | 70 % | 0,658 / 0,599 / 0,556 | 0,031 / 0,018 |

- Aggregationen liegen nah beieinander; `max` hat den groessten Abstand zwischen richtig und falsch, `centroid`/`top2` etwas bessere top3/top5. Kein klarer Gewinner.
- Je Ordner (`max`, top1): sehr gut bei Events (Microsoft AI Tour 6/6, AIC 4/4, TechCon 3/3, ELIV 5/6), GenAI 5/6, Org NE-TE 4/6. Null Treffer: Jarvis (0/6, top3 3/6), HR, Partner-ETAS, Compliance, XC LEC, XC RD Performance Program. Hypothese: Events haben eindeutige Eigennamen/Themen in Mail und Dokument; Ordner wie Partner-ETAS/HR/Compliance sind eher nach Absender oder Prozess abgelegt als nach Inhalt, oder ihre Dokumente sind zu duenn. Nicht geprueft.
- Stichprobe klein (81 Mails, 1–6 je Ordner); Prozentwerte nur als Groessenordnung.

## Schwellen-Idee "kein Projekt" (Schritt 1) — durch Schritt 3 nicht gestuetzt
- Aus Schritt 1 (Verteilungen): "kein Projekt"-Mails Median 0,523 (p90 0,602), richtig zugeordnete Median 0,631 (p10 0,566); Abstand Platz 1/2 richtig 0,042 vs. falsch 0,012. Das legte einen Schwellwert um Score ~0,60 und Abstand ~0,03 nahe.
- **Zurueckgenommen:** Live in Schritt 2/3 liegen die Top-1-Scores der Mails ohne Projekt bei 0,57 bis 0,66, mitten im Bereich der richtigen Treffer (0,52 bis 0,82); ein Mail-ohne-Projekt hatte sogar 0,053 Abstand. Score und Abstand trennen "richtig" und "kein Projekt" bei `bge-m3` nicht. Ursache nicht geprueft (Hypothese: beide Verteilungen werden von breiten Projekten und aehnlichen Mails dominiert).
- Folge: "kein Projekt" ist eine eigene Aufgabe (Regeln, Pseudo-Projekt "Unwichtig", Dispatcher), siehe README.

## Einordnung (nach Schritt 1)
- Nur `actor.yaml` + `context.md`: Kandidatenliste (top3 ~60 %), keine automatische Zuordnung (top1 ~45 % auf abgelegten Mails, 4 von 15 auf den live gelabelten Inbox-Mails).

## Schritt 2 und 3: Ordner-Mails als Projektvektoren (live, Labels des Users)
Labels: 15 Inbox-Mails mit Ziel (Grenzfaelle Org NE-TE / GenAI beide akzeptiert), 2 "kein Projekt", 1 "schwer", 2 Auto-Replies per Regel ausgelassen, 1 ohne Label. Labels entstanden nach Ansicht der Ergebnisse; Stichprobe klein, Prozentwerte nur Groessenordnung.

| Verfahren | Platz 1 | Top 3 |
|---|---|---|
| docs (`actor.yaml`+`context.md`, max) | 4/15 | 9/15 |
| mails (beste einzelne Ordner-Mail, bis 30 je Ordner) | 10/15 | 13/15 |
| mails3 (Mittel der 3 besten Ordner-Mails je Projekt) | 11/15 | 13/15 |
| fuse (z(docs)+z(mails)) | 8/15 | 10/15 |
| rrf (Rangfusion docs+mails, k=10) | 8/15 | 11/15 |

- Mail-Vektoren sind klar besser als die Projektdokumente. Ob 30 statt 10 Mails je Ordner hilft, ist nicht sauber getrennt gemessen (Schritt 2 ohne automatische Labels-Auswertung); Beobachtung: eine Mail, die mit 10 Ordner-Mails beim falschen Projekt lag, traf mit 30 das richtige (Score 0,73); ein Einzelfall.
- Docs zur Fusion beizumischen verschlechtert (nicht abgestimmt; Gewichtung/Normalisierung nicht optimiert). Docs helfen nur bei Projekten mit fast keinen Mails (1 Mail im Ordner).
- Auto-Replies (Betreff "Automatic reply"/"Automatische Antwort"/Abwesenheit) per Regel auslassen: vorher zog eine Abwesenheitsnotiz im HR-Ordner Auto-Replies mit Score 0,78 auf HR; Ursache gelesen in der Quellenangabe, Mechanismus (Vorlagentext dominiert kurze Mail) ist Hypothese.
- Exakte Duplikate einer abgelegten Mail liefern Score 1,000; Testmails duerfen nicht selbst im Index liegen.
- Mails derselben Reihe/desselben Threads im Ordner geben hohe Scores mit grossem Abstand (bis 0,82 / 0,23); das ist ein Thread-Effekt, kein Themen-Effekt.
- Projekte mit 0 Mails im Ordner koennen im Mail-Ranking nicht gewinnen.

## Zeiten Schritt 2/3 (belegt)
- 111 Ordner-Mails: Einlesen 20 s, Einbetten 62 s. 179 Ordner-Mails: Einlesen 21-25 s, Einbetten 96-169 s (Lauf-Streuung durch parallele CPU-Last moeglich).
- Gesamtlauf Schritt 3 (Index + 179 Mails + 21 Inbox-Mails): 211-325 s, ohne Cache.

## Was nicht ging / nicht gemacht
- Zweites Modell (`qwen3-embedding:0.6b` oder `embeddinggemma` als Kandidaten): Download wegen langsamer Verbindung nicht gemacht.
- Kein GPU-Test; kein Feintuning von Abschnittsgroesse/Praefix; kein Reranking per Chat-Modell; keine Absender-/Thread-Signale; keine Leave-one-out-/Zeit-Split-Auswertung ueber alle abgelegten Mails; kein Pseudo-Projekt "Unwichtig" gemessen; keine Mail-Suche getestet.
- In-Process-Einbettung (ONNX) in Jarvis nicht untersucht — Ollama ist externe Abhaengigkeit.
