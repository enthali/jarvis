# FI-2026-07-01 — EXP/SES Theme-Boundary-Inkonsistenz

**Auftraggeber:** Project Manager (Research-Request, asynchron, nicht blockierend)  
**Scope:** Analyse der Theme-Struktur EXP vs. SES im Spec-Tree. Kein Code, keine Spec-Änderung — dieses Finding speist eine spätere Housekeeping-CR.  
**Trigger:** System Designer flaggte beim `entity-files-tree`-CR, dass die drei Entity-Kinds (Project, Event, Session) auf US-Ebene nicht als Gleiche behandelt werden.

---

## TL;DR

Der Spec-Tree trägt **drei Epochen** desselben Konzepts „Entity im Explorer":

1. **EXP** (älteste) — Project + Event, Explorer-zentriert.
2. **SES** (mittlere) — Session als Peer-Kind, aber in eigenem Theme.
3. **ENG** (neueste) — kind-agnostische Engine (`registerEntityKind`), **aber nur REQ/SPEC, keine US**.

Folge: **generische, kind-übergreifende Konzepte sind über EXP, SES und ENG fragmentiert** — teils sogar **doppelt gespect** (Agent-Picker, Scanner, Tree-Click, New-Entity existieren als SPEC in *zwei* Themes). Verstärkt durch eine **Naming-Kollision**: „Session" meint gleichzeitig (a) das Entity-Kind und (b) die generische „Agent Session"-Interaktion, die für *alle* Kinds gilt.

**Empfehlung (konvergiert 2026-07-01, mit User):** Root-Fix statt Symptom-Pflege. **Umbrella = Jarvis Entity** (schon der Code-Begriff). **Kinds = Project, Event, Actor** — das bisherige „Session"-Kind wird zu **Actor** (Hewitt-Aktormodell, s.u.). **„Session" wird als Jarvis-Konzept retired** (Plattform-Wort: VS Code / Copilot). Theme-Mapping: **generisch-user-facing → ENT**, **Engine-Plumbing → ENG**, **kind-spezifisch → PRJ/EVT/ACT**, **EXP → Sidebar-Rahmen + Nicht-Entity-Views**. Migration **gestuft in einem einzigen spec-only CR** (kein Code).

---

## Konvergierte Entscheidung (2026-07-01) — Entity-Modell + „Actor"

Die Analyse unten führte zu Option B (generisch↔kind-spezifisch trennen). Die Diskussion mit dem User trieb es an die **Wurzel**: die Ursache ist die **Dreifach-Buchung des Wortes „Session"** — (1) Umbrella, (2) Kind, (3) Live-Chat-Interaktion.

**Auflösung:**

| Rolle | Name | Begründung |
|---|---|---|
| **Umbrella** | **Jarvis Entity** | steht schon so im Code (`EntityKind`, `registerEntityKind`) — kein neues Wort |
| **Kind 1** | **Project** | unverändert |
| **Kind 2** | **Event** | unverändert |
| **Kind 3** | **Actor** | war „Session"; ist real ein persistenter, agent-gebundener Kontext (Research, PM, CM, QM) |
| **Live-Chat** | (Plattform) | „Session" gehört VS Code / Copilot — Jarvis beansprucht es **nicht** |

**Warum „Actor" (nicht Role/Persona/Profile/Instance):**
- **Role** = generisch (das ist die **Agent-Spec**, Layer 2 = die Klasse). Das Kind ist die *Instanz* — „**DER** PM", singulär, mit Kontinuität über `context.md`.
- **Actor (Hewitt)** trifft Wort *und* Architektur. Klasse/Instanz: **Agent-Spec = Rolle/Skript**, **Actor = der, der sie dauerhaft spielt**.

**Actor ↔ Hewitt-Aktormodell (Red-Team bestanden):**

| Aktormodell | Jarvis | 
|---|---|
| **send** (Nachrichten an andere Actors) | `jarvis_sendToSession` → Queue |
| **create** (neue Actors) | `jarvis_createSession` / createEntity |
| **designate** (State/Verhalten für nächste Nachricht) | `context.md`-Update + `agent`-Binding |
| Address / Mailbox | Entity-Name / Message-Queue |
| asynchron, fire-and-forget | **das „Ping-Problem" IST die Aktor-Asynchronität** (modell-korrekt) |
| privater State, kein Shared State | `context.md` privat, nur per Nachricht erreichbar |
| serialisierte Verarbeitung (1 Nachricht/Zeit) | Single-Writer-Constraint (Experiment 4) |
| **Virtual Actor / Grain** (Orleans): immer adressierbar, on-demand aktiviert, State persistent | Entity ruht als Ordner, Mailbox nimmt trotzdem an → **Heartbeat + Auto-Delivery = Aktivator** |
| **Supervision** (Akka/Erlang: Liveness + Restart/Health) | **Heartbeat = Supervisor** (überwacht, reaktiviert) — schließt den letzten Red-Team-Punkt |
| Location-Transparency | Docking-Vision (Layer 1): „PM-Actor" per Name, egal ob VS Code / Copilot CLI / Claude Code |

→ „Actor" ist nicht nur ein Name, sondern das **korrekte mentale Modell** — es *erklärt* bestehende Reibungen (Ping-Problem = Async, Single-Writer = serialisierte Verarbeitung) nachträglich. Technisch genau genommen ein **Grain/Virtual Actor**; „Actor" gewinnt als Wort (bewusste Entscheidung des Users).

**Constraints, die die Aktor-Brille aufdeckt (in den CR mitnehmen):**
- **Globale Adress-Eindeutigkeit:** Entity-Namen müssen **über Kinds hinweg** eindeutig sein (oder Adressierung kind-qualifiziert), sonst `sendToSession`-Kollision (Project vs. Actor gleichen Namens).
- **Cross-Instance-Messaging:** „Die Welt" = aktuell **ein VS-Code-Workspace**. Actor-Kommunikation über VS-Code-Instanzen hinweg geht per MCP, ist aber **brittle**. Das Messaging-System muss reifen. Asset: geparktes **A2A-Projekt** (ex-`session2session`/S2S; evtl. „Actor-to-Actor" umzubenennen) adressiert genau das — liegt brach.
- **`.jarvis/sessions/`-Pfad:** bleibt vorerst als Legacy-Storage; Konzeptname (Actor) und Pfad **entkoppeln**, Pfad-Migration ist eine spätere Code-CR.

---

## Methode

Vollständige Inventur der `:id:`-Elemente in `us_/req_/spec_ {exp,ses}.rst` plus Abgleich mit `namingconventions.rst` und der ENG-Theme (`us/req/spec_eng.rst`). Klassifikation jedes Elements: **single-kind** (nur Project *oder* Event *oder* Session) vs. **cross-kind** (gilt für ≥2 Kinds bzw. generisch).

---

## Befund 0: SES fehlt in den Naming-Conventions

Die Theme-Tabelle in `namingconventions.rst` listet EXP, DEV, CFG, **PRJ**, **EVT**, REL, OLK, PIM, MOD, ENG, HOOK, UAT — **aber kein SES**. Das Session-Theme ist **undokumentiert** eingeführt worden. Gleichzeitig sind **PRJ** („Project data & YAML") und **EVT** („Event data & YAML") als Themes *deklariert*, werden aber kaum genutzt — fast alles Projekt/Event-bezogene liegt unter EXP. Es gibt also eine **latente PRJ/EVT/SES-Triade**, die nie konsistent verwendet wurde.

---

## Befund 1: Inventar + Single-kind vs. Cross-kind

### EXP-Theme (`us_exp.rst`, 22 US)

| ID | Betrifft | Klasse |
|---|---|---|
| US_EXP_SIDEBAR | Sidebar-Shell (Projects/Events/Messages/Heartbeat) | Rahmen (cross, inkl. Nicht-Entity) |
| US_EXP_PROJECTFILTER | Projects | single (Project) |
| US_EXP_EVENTFILTER | Events | single (Event) |
| US_EXP_OPENYAML | Project+Event | cross |
| US_EXP_NEWENTITY | Project+Event | cross |
| US_EXP_SCANREFRESH | Project+Event | cross |
| US_EXP_CONTENTDETECT | Project+Event | cross |
| US_EXP_NAMESORT | Project+Event | cross |
| US_EXP_AGENTSESSION | „Agent Session" für Project+Event | **cross + JAS-Begriff** |
| US_EXP_LISTPROJECTS | Projects | single (Project) |
| US_EXP_FEATURETOGGLE | Sidebar-Views (inkl. Messages/Heartbeat) | Rahmen |
| US_EXP_CONTEXTACTIONS | Project+Event | cross |
| **US_EVT_DATESORT** | Events | **single + Theme-Fehlablage (EVT-Prefix in EXP-Datei)** |
| US_EXP_OPENFILE | Heartbeat/Message-Nodes | Nicht-Entity |
| US_EXP_TREESEARCH | Project+Event | cross |
| US_EXP_OPENCONTEXT | Project+Event | cross |
| US_EXP_AGENTSESSION_PROMPT | alle drei Kinds (nennt project/event/session) | **cross-3 + JAS** |
| US_EXP_LISTEVENTS | Events | single (Event) |
| US_EXP_CREATEPROJECT | Projects | single (Project) |
| US_EXP_CREATEEVENT | Events | single (Event) |
| US_EXP_ENTITYPARITY | **alle drei** (Project/Event = Session) — links US_SES_* | **cross-3** |
| US_EXP_ENTITY_FILES_TREE | **alle drei** (Session/Project/Event) — links US_SES_* | **cross-3** |

### SES-Theme (`us_ses.rst`, 4 US)

| ID | Betrifft | Klasse |
|---|---|---|
| US_SES_SESSIONS | Session-Kind (`.jarvis/sessions/`, Minimal-Schema) | single (Session) — **aber AC-9 „agent session for any entity kind" = cross** |
| US_SES_CREATETOOL | `jarvis_createSession` | single (Session) |
| US_SES_AGENTBIND | Agent-Binding (später via EXP_ENTITYPARITY generalisiert) | **ursprünglich single, konzeptionell cross** |
| US_SES_TREECLICK | Tree-Click→Chat (später generalisiert) | **ursprünglich single, konzeptionell cross** |

**Schlüsselbeobachtung (US-Ebene):** Die *generischen* Entity-Verhalten (Agent-Binding, Tree-Click-to-Chat, File-Children, Parität, Agent-Session-Prompt) sind **über beide Themes verstreut** — die Originale unter SES, die Generalisierungen unter EXP. Kein einziger Ort für „gilt für jedes Kind".

### REQ-Ebene

- `req_exp.rst` (21): u.a. ACTIVITYBAR, TREEVIEW, YAMLDATA, REACTIVECACHE, PROJECTFILTER, EVENTFILTER, OPENYAML, AGENTSESSION, NEWPROJECT, NEWEVENT, RESCAN_BTN, NAMESORT, **REQ_EVT_DATESORT (Fehlablage)**, LISTPROJECTS, FEATURETOGGLE, CONTEXTACTIONS, TASKTREE, HEARTBEAT_OPENFILE.
- `req_ses.rst` (17): TOGGLE, SCHEMA, TREE, NEWENTITY, LISTTOOL, CONTEXTMENU, **AGENTPROMPT**, OPENCONTEXT, CREATETOOL, TREECLICK, **AGENT_FIELD/PICKER/DISCOVERY/CREATETOOL/VALIDATION/OPEN/COMPAT** (der ganze Agent-Cluster). Viele davon (AGENT_DISCOVERY, AGENT_PICKER, AGENT_OPEN, AGENTPROMPT) sind **generisch**, tragen aber SES-Prefix.

### SPEC-Ebene — die Duplikation (Kern-Befund)

Dieselben generischen Konzepte sind **in beiden Themes** als SPEC-Element vorhanden:

| Konzept | in EXP | in SES | zusätzlich in ENG |
|---|---|---|---|
| Scanner | SPEC_EXP_SCANNER | SPEC_SES_SCANNER | SPEC_ENG_SCANNER |
| Agent-Picker | SPEC_EXP_AGENT_PICKER | SPEC_SES_AGENT_PICKER | — |
| Tree-Click | SPEC_EXP_ENTITY_TREECLICK | SPEC_SES_TREECLICK | — |
| New-Entity | SPEC_EXP_NEWPROJECT/NEWEVENT_CMD | SPEC_SES_NEWENTITY | — |
| Agent-Binding | SPEC_EXP_ENTITY_AGENT | SPEC_SES_AGENT_SCHEMA/OPEN | — |
| Tree-Factory | (SPEC_EXP_PROVIDER) | SPEC_SES_TREE | SPEC_ENG_TREEFACTORY |

→ **Das ist die Redundanz/Drift, die der Designer gespürt hat.** Ein generisches Verhalten wird mehrfach, potenziell divergent, gespect. ENG hat teils schon konsolidiert (Scanner, Tree-Factory, `registerEntityKind`), aber EXP und SES ziehen nicht nach.

---

## Befund 2: Naming-Ambiguität „Session" — treibt die Drift

„Session" wird in **zwei** Bedeutungen benutzt:

1. **Session-das-Kind** — `session.yaml`, `.jarvis/sessions/`, Minimal-Schema (`name`+`summary`).
2. **„Agent Session"-die-Interaktion (JAS)** — das Öffnen eines Agent-Chats für *irgendein* Kind.

Belege für die real entstehende Verwirrung:
- **US_EXP_AGENTSESSION** („Open Agent Session from Explorer") betrifft **Project/Event**, heißt aber „…Session" und lebt in EXP.
- **US_SES_SESSIONS AC-9**: „Opening a new agent session for **any entity kind**" — der JAS-Begriff, gespect unter dem Kind-Theme SES.
- **Tool-Disambiguierung existiert bereits**: `jarvis_listSessions` (Session-Entities) vs. `jarvis_listChatSessions` (VS-Code-Chat-Tabs) — der Code musste den Begriff schon entzerren.

**Mechanismus der Drift:** Weil die generische Interaktion „Agent Session" heißt und es ein „Session"-Kind gibt, gravitieren generische Agent-Session-Features **mal nach SES** (Wortverwandtschaft) **mal nach EXP** (Explorer-Ursprung) — je nachdem, wann/wo sie zuerst gespect wurden. Die Kollision ist ein **aktiver Treiber** der Theme-Fragmentierung, nicht nur kosmetisch.

---

## Befund 3: Architektur ist schon weiter als die Specs

`REQ_ENG_CONTRACT` / `SPEC_ENG_API`: die Session-Kind ist „registered through `registerEntityKind` as the core's own reference application — **the engine has no kind-specific branches**." Der **Code behandelt alle Kinds generisch**; nur die **Feature-Specs** sind nach historischem Zufall in EXP (alt) und SES (später) gespalten. Die Spec-Struktur **hinkt der Architektur hinterher**.

Zusatz-Asymmetrie: **ENG hat REQ+SPEC, aber keine US** — die generische Engine hat kein „Why"-Level. Cross-kind-Features haben damit heute *nirgends* eine natürliche US-Heimat.

---

## Optionen

### Option A — SES in EXP mergen (ein Explorer-Theme für alles)
- **Pro:** ein Ort für alle Sidebar/Entity-Features; „Explorer" ist ja die gesamte Sidebar.
- **Contra:** EXP ist schon riesig (22 US / 29 SPEC); ignoriert, dass ENG die generische Schicht ist; **löst die Naming-Ambiguität nicht**; macht EXP zum Catch-all. Verschiebt das Problem, statt es zu strukturieren.

### Option B — Cross-kind vs. kind-spezifisch als Muster; ENG = generische Heimat *(empfohlen)*
- **Generisch → ENG:** Scanner, Tree-Factory, New-Entity, Agent-Binding, Agent-Picker, Agent-Discovery, Tree-Click-to-Chat, Entity-File-Children, Agent-Session-Init-Prompt, List-Tool-Shape, Entity-Parität.
- **Kind-spezifisch → PRJ / EVT / SES** (die drei Peer-Themes, PRJ/EVT existieren schon in den Conventions): Project-Filter; Event-Filter + Date-Sort; Session-`.jarvis`-Fixpfad + Minimal-Schema + `jarvis.sessions.enabled`.
- **EXP schrumpft** auf echten Sidebar-Rahmen + Nicht-Entity-Views: Activity-Bar, View-Container, Feature-Toggle, Tree-Search, Öffnen von Heartbeat/Message/Reminder-Source-Files.
- **Pro:** Spec-Struktur spiegelt die reale Architektur (ENG generisch + Kind-Register); beseitigt die SPEC-Duplikation (ein Agent-Picker-Spec statt zwei); gibt cross-kind-Features endlich eine Heimat.
- **Contra:** größere Migration; ENG braucht dann ein US-Level (heute keins).

### Option C — SES/Begriffe umbenennen, Split beibehalten
- „Agent Session" (JAS) als generischen Interaktionsbegriff festschreiben; „Session" nur noch fürs Kind. Themes bleiben, aber Platzierungsregel + Begriffe werden geschärft.
- **Pro:** kleinster Eingriff; adressiert die Ambiguität direkt.
- **Contra:** behebt die **SPEC-Duplikation nicht**; die drei Epochen bleiben strukturell nebeneinander.

---

## Empfehlung

**Konvergiertes Zielbild (siehe oben), umgesetzt in *einem* gestuften spec-only CR.**

**Platzierungsregel (ab sofort für neue Elemente):**
> **Generisch/user-facing** (gilt für ≥2 Kinds, was der User erlebt) → **ENT**. **Engine-Plumbing** (kind-agnostische Mechanik) → **ENG**. **Genau ein Kind** → **PRJ / EVT / ACT**. **Sidebar-Rahmen / Nicht-Entity-Views** → **EXP**.

**Begriffsregel:**
> **Jarvis Entity** = Umbrella. **Actor** = das agent-gebundene persistente Kind (ex-„Session"). **„Session"** = Plattform-Wort, in Jarvis-Specs **nicht** verwenden. **Agent-Spec** = die Rolle (Klasse), **Actor** = die Instanz.

**ENT vs. ENG (löst die frühere „braucht ENG ein US-Level?"-Frage):**
- **ENT** = user-facing generisch, **hat US** — inkl. der Parent-US: *„Als User möchte ich verschiedene Entity-Typen, die sich auf ihre Funktion fokussieren — Project (Arbeitskörper), Event (terminlich), Actor (stehende Funktion)."* PRJ/EVT/ACT-US linken hoch auf diese Parent-US (macht die Kind-Symmetrie **traceable + MECE-prüfbar**).
- **ENG** = Plumbing (`registerEntityKind`, Scanner, Tree-Factory, Tool-Registry), **kein US-Level nötig** — der User erlebt es nicht.

### Rationale
- Die **Architektur hat die Antwort schon vorgegeben** (`registerEntityKind`, keine kind-spezifischen Branches). Specs sollen dem folgen, nicht dagegen.
- Beseitigt die **konkret nachgewiesene SPEC-Duplikation** (Scanner/Picker/Tree-Click/New-Entity doppelt).
- Entkoppelt die **Naming-Kollision**: sobald „Agent Session" nach ENG wandert, verschwindet der Grund, generische Features unter SES abzulegen.

### Migrationspfad (ID-Kosten respektieren)
sphinx-needs-IDs sind in **Code-Kommentaren** (`Implementation: SPEC_…`), **Change-Docs** und **Traceability** referenziert → Umbenennen hat **Blast-Radius**. Daher gestaffelt:

1. **Billig & sofort (eigene kleine CR):** Begriffs-/Platzierungsregel in `namingconventions.rst` dokumentieren; **SES als Theme eintragen**; die offensichtlichen **Fehlablagen** bereinigen (US_EVT_DATESORT / REQ_EVT_DATESORT — entweder in eine EVT-Datei ziehen *oder* zu EXP-Prefix korrigieren, konsistent).
2. **Mittel:** **neue/`:status: draft`-Elemente** nach Regel platzieren (z.B. ENTITY_FILES_TREE, ENTITYPARITY, AGENTSESSION_PROMPT → ENG statt EXP). Draft-Umbenennung ist günstig (wenig Referenzen).
3. **Groß & optional:** implementierte EXP/SES-Duplikate gegen ENG konsolidieren — nur wenn der Traceability-Nutzen die Umbenennungs-Kosten rechtfertigt. Kann auch als „eingefroren, dokumentiert" belassen werden (Regel gilt vorwärts).

→ **Vorwärts-gerichtete Regel + Draft-Migration** holen 80 % des Nutzens bei 20 % der Kosten. Vollständige Retro-Umbenennung ist optional.

---

## Offene Fragen (für die Housekeeping-CR)

- **Globale Adress-Eindeutigkeit** der Entity-Namen (Aktormodell-Constraint): global unique oder kind-qualifiziert adressieren? Betrifft `jarvis_sendToSession`.
- **Cross-Instance-Messaging:** heute „Welt" = ein VS-Code-Workspace; MCP-übergreifend brittle. A2A-Projekt (ex-S2S) reaktivieren? — eigener Research/Change-Strang, nicht Teil dieses Theme-CR.
- **`.jarvis/sessions/` → `.jarvis/actors/`**: Pfad-Migration ist Code (spätere CR); der spec-only CR benennt nur das Konzept. Temporäre Spec↔Code-Namensdrift bewusst terminieren.
- **PRJ/EVT/ACT aktivieren** (die Kind-Themes) vs. Project/Event-Spezifika noch unter EXP belassen? PRJ/EVT stehen in den Conventions, sind aber leer; ACT muss neu rein (SES war nie eingetragen).
- Grenze **Sidebar-Rahmen (EXP)** vs. **generische Entity-Features (ENT)** exakt ziehen — z.B. Tree-Search: Rahmen oder pro-Kind?
- `jarvis_listProjects/Events/Sessions` → generisches `jarvis_listEntities(kind)` (passt zur ENT/ENG-Linie; entfernt zugleich die `listSessions`/`listChatSessions`-Krücke).

## Referenzen

- `docs/namingconventions.rst` — Theme-Tabelle (SES fehlt; PRJ/EVT deklariert, ungenutzt)
- `docs/{userstories,requirements,design}/{us,req,spec}_{exp,ses,eng}.rst`
- `REQ_ENG_CONTRACT` / `SPEC_ENG_API` — kind-agnostische Registrierung (die Architektur-Vorgabe)
- Auslöser: `docs/changes/entity-files-tree.md` (US_EXP_ENTITY_FILES_TREE, cross-3)
