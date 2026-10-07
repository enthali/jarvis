# Spike email-triage-embeddings-poc (2026-10-07)

Auftrag PM: Laesst sich das Projekt einer eingehenden Mail per Bedeutungsaehnlichkeit (Embeddings der Projektdokumente gegen die Mail) finden — gut genug fuer Jarvis PIM?

Code: Branch `research/email-triage-embeddings-poc` (lokal, nicht gepusht), `experiments/email-triage-embeddings/` (`run.mjs`, `read-folder.ps1`). Keine Mailtexte/Adressen in Dateien oder Notizen.

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

## Schwellen-Idee "kein Projekt" (nicht gemessen als Treffer/Fehlalarm, nur aus Verteilungen)
- `max`-Top-1-Score: "kein Projekt" Median 0,523 (p90 0,602); richtig zugeordnete Median 0,631 (p10 0,566). Die Verteilungen ueberlappen deutlich; ein Score-Schwellenwert um ~0,60 liesse etwa 10 % der Unwichtig-Mails durch und wuerde grob ein Drittel der richtigen verlieren (zwischen p10 und Median interpoliert, nicht ausgezaehlt).
- Zweites Kriterium Abstand Platz 1/2: richtig Median 0,042 vs. falsch 0,012; ein Mindestabstand von ~0,03 trennt besser als Score allein (Vermutung, nicht ausgewertet).
- Fazit: als Vorschlag brauchbar ("Score >= ~0,60 UND Abstand >= ~0,03, sonst Rueckfrage/kein Vorschlag"), aber Praezision/Recall muesste mit einem Zaehllauf gemessen werden. Das Modell allein trennt "kein Projekt" nicht sicher.

## Einordnung
- Wirkt als **Kandidatenliste** (top3 ~60 %, top5 ~65–70 %), nicht als automatische Zuordnung (top1 ~45 %).
- Ohne Kontext (Absender, bisherige Ablage, Thread) fuer kurze Mails zu duenn; Absender-/Thread-Signale waeren die naheliegende Ergaenzung — nicht getestet.

## Was nicht ging / nicht gemacht
- Zweites Modell (`qwen3-embedding:0.6b` oder `embeddinggemma` als Kandidaten): Download wegen langsamer Verbindung nicht gemacht.
- Kein GPU-Test; kein Feintuning von Abschnittsgroesse/Praefix; kein Reranking per Chat-Modell; keine Absender-/Thread-Signale.
- In-Process-Einbettung (ONNX) in Jarvis nicht untersucht — Ollama liefe als externe Abhaengigkeit. Naechste Frage, nicht gebaut.
