# FI-2026-06-28 — JarvisAgents (Spec-Assembled Agent Framework)

**Status:** **Bewusst zurückgestellt** (Regret-Sortierung, System Designer 2026-06-28) — erst bauen, wenn (a) Hook-Logs zeigen, dass Session-Linking trägt, und (b) geklärt ist, was VS Codes native Agent-Features schon abdecken.  
**Layer:** 2 von 3 (**separates Modul** — nicht Core)  
**Verwandt:** [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) (Layer 1, Voraussetzung), [FI-2026-06-28-jarvisagent-consumers.md](FI-2026-06-28-jarvisagent-consumers.md) (Layer 3, Consumer)

---

## Trigger

Wiederkehrende Probleme mit der Agent-Mode-Auswahl. Agenten leben statisch in `.github/agents/*.md`. Das Hin-und-Her-Gehüpfe zwischen Agenten, `sendToSession`-Overhead, wiederholtes Vertrag-Lesen — alles Symptome derselben Wurzel: **der Prozess steckt nicht im Context, er wird ständig neu eingelesen.**

## Idee

**JarvisAgents** — ein generisches Agent-Framework als **separates Modul** (nicht Core), das auf der Hook Engine (Layer 1) aufsetzt und Agenten zur Laufzeit **aus der Spec zusammenbaut** statt sie statisch zu deklarieren.

### Mechanik

- **`SessionStart`** + **`UserPromptSubmit`**: Engine injiziert Rolle, Duties und den **aktuellen Workflow-Schritt** vor den User-Prompt. Wir kennen die Session-ID → wir wissen, wo im Prozess die Session steht.
- **Init über `SessionStart` statt initialem Prompt:** Die Init-Information (Rolle/Duties/Start-Step) geht **bei Session-Create** über den `SessionStart`-Hook rein — kein separater „initialer Prompt schicken"-Schritt mehr. Core macht nur noch *Session erstellen + SessionStart emittieren*; JarvisAgents (Subscriber) legt den Init-Context rein. Verkleinert Core, hält die Dependency-Richtung sauber (siehe ADR unten).
- Agent-Definition = speziell formatiertes **rst-File** (Location konfigurierbar), über sphinx-needs formalisierbar/maschinenlesbar.
- **Eine Session durch den ganzen Change** in einem Context-Window: nicht 15 Agenten, sondern **15 Agent-Specs**, die der einen Session sequenziell mitgegeben werden.
- Kein `sendToSession`, kein wiederholtes Vertrag-Lesen — der Vertrag ist im Context. Im Workflow steht immer wieder „jetzt Change Document aktualisieren".

### Customization (wird trivial)

Spec = **generischer Prozess** + **Customization-Layer**.

- Hook findet **keinen** customized Workflow → gibt dem Agenten den generischen und fordert ihn auf, mit dem User den customized Agent anzulegen.
- Hook findet einen customized Workflow → wird der Session übergeben.
- User kann **eigene Agenten und Workflows** bauen, ohne Code.

### Context-Lifecycle (`PreCompact`)

- Vor dem Compact: Engine fordert den Agenten auf, **alles Wissen abzulegen** (Memory/Change-Doc).
- Dann **gezielt compacten** — z.B. am Ende eines Agent-Laufs. Kontrolliertes Context-Reset statt unkontrolliertem Auto-Compact mitten im Schritt.

### Skills verschwinden

Skills müssen nicht mehr separat beschrieben werden → sie werden Teil der Spec. Ein Beschreibungsformat weniger.

### Der leere JarvisAgent (die Shell) 🔥

Der Kern-Trick: Ein **JarvisAgent ist eine leere Hülle** — eine `.agent.md` mit **nur Frontmatter** (Name, Display, ggf. Model), **kein Verhalten im Body**. Das Verhalten (Rolle, Duties, Workflow-Step) wird zur Laufzeit aus der **Spec** über die Hooks injiziert.

> **Ein leerer Agent, der magisch nach Spec läuft.**

- **Warum die Hülle überhaupt:** VS Code braucht *etwas* für den Agent-Picker — eine Anzeige + Frontmatter. Die leere Shell liefert genau diese Oberfläche, trägt aber keine Logik.
- **Koexistenz:** Klassische Agenten (`.github/agents/*.md` mit echtem Body) bleiben **weiterhin über Core zuweisbar**. JarvisAgents sind der *zusätzliche*, spec-getriebene Modus — kein Ersatz.
- **Boundary-konform:** Die Shell ist genau das **opaque Label**, das Core sieht (Frontmatter). Der Inhalt ist Policy → kommt vom Modul. Perfekt deckungsgleich mit der ADR unten.
- **Offen:** Eine generische `JarvisAgent`-Shell für alle (Identität kommt aus der gebundenen Spec) — *oder* pro Agent-Family eine eigene Shell (eigene Anzeige im Picker)? Und: Prompt-Manipulation am bestehenden Agenten vs. wirklich leere Shell bereitstellen.

## Handoff-Kontinuität — das stärkste Wert-Argument (System Designer 2026-06-28)

Der eigentliche Wert von Layer 2 ist **nicht** die Agent-Definition, sondern **Workflow-Kontinuität über Rollen-Handoffs hinweg**. Konkret am syspilot-Flow (CM→Designer→CM→Implementer→Verifier):

**Problem heute (getrennte Sessions):** Bei *jedem* Agentenwechsel **kalter Start** — Change Doc + Specs + Vertrag neu lesen; das Reasoning der vorigen Session ist weg (nur Platten-Artefakte überleben).

**Vorschlag:** **Eine Session, die durch die Rollen morpht.** Der Hook injiziert am Workflow-Schritt die nächste Rollen-Spec (UserPromptSubmit/SessionStart). Akkumulierter Kontext bleibt **live**. „Nicht 15 Agenten, sondern 15 Agent-Specs in einer Session."

**Warum es zahlt (quantifizierbar):**

- **Rebuild-Häufigkeit:** Handoff-Rebuilds (bei *jedem* Wechsel) ≫ Compaction-Rebuilds (nur an Fenstergrenzen).
- **Rebuild-Qualität:** kalt von Platte — vs. aus **kuriertem PreCompact-Dump**.
- **KV-Cache (der harte Systemwinkel):** kalter Handoff = **Prefill neu rechnen**. Lokal (Qwen 3.6, keine RZ-GPUs) ist **Prefill der teure Teil**. Durchlaufende Session = **warmer Cache** für Vertrag/Specs. Compaction invalidiert den Cache zwar — aber **gezielt an einer Rollen-Naht** statt zufälligem Auto-Compact mitten im Reasoning. Du wählst **Timing *und* Inhalt** des Cache-Resets.
- **Plattform-Differentiator:** native Custom Agents sind separate-Session-pro-Agent → liefern **nicht** den einen durchlaufenden, rollen-wechselnden Kontext. **Layer 2s echter Mehrwert überlebt die Plattform-Konkurrenz** — das ist die direkte Antwort auf die Skepsis unten.

## Tradeoffs (ehrlich)

- **Tool-Gating:** Die Rollen-Spec hält den Agenten **verhaltensseitig** in der Lane (Framing genügt für den Normalfall). Harte Gates nur für **irreversible** Aktionen (push to main, `reset --hard`).
- **Recovery:** `context.md` (pro Session) + Change Doc sind das **Wiederaufbau-Substrat**; der Vertrag muss gepflegt sein.

## Skepsis: Plattform-Konkurrenz (System Designer 2026-06-28)

Ehrlicher Gegenwind — nicht alles an Layer 2 ist neu:

- **VS Code hat inzwischen agent-scoped Hooks** (`hooks:` im `.agent.md`-Frontmatter, `chat.useCustomAgentHooks`) **+ Custom Agents nativ.** Ein Teil von Layer 2 (per-Agent-Lifecycle-Injection) könnte **nativ abgedeckt** sein → Spec-Assembly-Engine evtl. teilweise Reinvention.
- **Aber:** Native Custom Agents sind aktuell **flaky** (Setting verschwindet sporadisch, evtl. prozess-start-abhängig) → Jarvis' **in-repo-versionierter** Weg evtl. *robuster*. Nicht voreilig auf „Plattform deckt's ab" wetten.
- **Wo spec-driven für Agenten wirklich zahlt:** nicht die Agent-*Definition* (kleine Files — das kann die Plattform), sondern **Workflow-Orchestrierung über lange, mehrstufige Change-Flows** + kontrollierter Context-Reset (PreCompact-Knowledge-Dump). **Wert skaliert mit Workflow-Länge & Handoff-Anzahl** — genau syspilots eigener Use-Case. Bei kurzen Tasks Overkill.

→ **Konsequenz:** Layer 2 schärfen auf das, was die Plattform *nicht* kann — Multi-Step-Workflow-Orchestrierung & Context-Lifecycle — statt Agent-Definition nachzubauen.

## ADR: Core/Modul-Boundary (2026-06-28)

**Entscheidung:** JarvisAgents bleibt **separates Modul**, nicht Core. Diskutiert mit Designer; Sorge war „Core bekommt Abhängigkeiten zur Agent Engine".

**Begründung:** Die Abhängigkeit verschwindet beim Mergen nicht — sie wird nur unsichtbar und unpoliziert. Ein expliziter Boundary erzwingt die Richtung. Reale Core-only-Consumer existieren (Memory, Event-/Project-Flows, PIM ohne Agent-Maschinerie) → Trennung zahlt Miete, kein YAGNI.

**Mechanismus vs. Policy:**

| Gehört wohin | Was |
|---|---|
| **Core (Primitive)** | Session starten, initialen Prompt schicken, `injectPrompt()`, Hook-Dispatch, Memory-Store |
| **JarvisAgents (Policy)** | welcher Prompt, aus welcher Spec, an welchem Workflow-Step |

→ Session-Start + initialer Prompt laufen über die Hook Engine **ganz ohne** Agent Engine. Bestätigt.

**Dependency-Regel (eine Richtung):**

> Core **emittiert** Hooks (SessionStart, UserPromptSubmit). JarvisAgents **subscribed**. Core ruft JarvisAgents **nie** direkt.

**Zwei Litmus-Tests (CI-fähig):**

1. **Opaque-Label-Regel:** Core darf wissen, *dass* eine Session ein `agent`-Label hat — nie *was* der Agent tut. `agent:` ist ein opaker String, den Core nur in den SessionStart-Payload durchreicht. Alle Interpretation in JarvisAgents.
2. **Seam-Test:** Core kompiliert + alle Core-Tests grün, **wenn man JarvisAgents entfernt**. Bricht das → Boundary ist faul.

**Wenn die Hooks nicht reichen:** öffentliche API der Core-Primitive erweitern (`injectPrompt`, `getSessionMeta`) — **nicht** die Richtung umdrehen. Primitive aufbohren = ok. Core ruft Policy = Bruch.

## Blueprint = Produkt + Customization

JarvisAgents liefert den **Blueprint**: die Struktur, *wie* ein Agent geschrieben wird (das **Produkt**). Jedes Consumer-Projekt liefert seine **Customization**: die konkreten Agenten als Spec.

- **Produkt (JarvisAgents):** Agent-Spec-Schema, Workflow-Step-Format, Assembly-Engine, Steuerung. Wir definieren die Struktur — übernommen von syspilot bzw. **mit syspilot zusammen im Ping-Pong-OSS-Release** entwickelt.
- **Customization (Projekt):** `core workflow = Produkt-Blueprint` + `customization spec im Projekt`.
- Jede `JarvisAgentSession` weiß, welchen `JarvisAgent` sie hat → beliebig viele Agent-Families **parallel**, kein Konflikt.

Consumer (Layer 3): syspilot, PIM, … → [FI-2026-06-28-jarvisagent-consumers.md](FI-2026-06-28-jarvisagent-consumers.md)

## Offene Fragen

- **`SessionStart`-Semantik (im MVP beobachtbar):** Injiziert SessionStart **pre-turn Context** (Rolle geladen, Agent wartet auf User) oder triggert es einen **Turn**? Für „Rolle laden" ist Ersteres erwünscht. Soll der Workflow beim Start *selbst aktiv* werden, braucht es trotzdem einen Trigger-Prompt. Über die `hook-engine-mvp`-Logs sieht man, wann SessionStart feuert und was im Payload steht.
- **Token-Budget:** Workflow-Step bei *jedem* Prompt injizieren kostet Tokens. Nur Delta / aktuellen Schritt injizieren statt vollem Vertrag?
- `compact` programmatisch auslösbar? (Abhängigkeit zu Layer 1.)
- rst-Agent-Format: Schema definieren (sphinx-needs-Typen für Rolle/Duties/Workflow-Steps).
- Wie wird der „aktuelle Schritt" persistiert (Session-State-File? Change-Doc-Status?)?

## Parallelisierung: Worktrees + Impact-Analyzer (System Designer 2026-06-28)

- **Eine-Session-pro-Change ↔ ein-Worktree-pro-Change** — kein Agent-Hopping zwischen Worktrees.
- Changes laufen **seriell**; **parallel** nur, wenn die **Impact-Sets disjunkt** sind — und das **beweist der Impact-Analyzer**. Disjunkt → parallele Worktree-Pfade; überlappend → serialisieren.
- Analogie: verschiedene SWPs auf einem Steuergerät — kein gemeinsamer Impact → parallel fahrbar.

## Meta-Idee: Workflow-as-Spec (eigene FI)

Der Prozess selbst spec-driven (US/REQ/SPEC pro Agent) → Impact + MECE + Traceability gelten auch für die Workflow-Definition. syspilot ist schon fast da; JarvisAgents spart den `.agent.md`-Übersetzungsschritt. Selbst-schließender Kreis: Audit findet Lücke → PM-Change → Prozess-Update als Spec.

→ **graduiert zu** [FI-2026-06-28-workflow-as-spec.md](FI-2026-06-28-workflow-as-spec.md)

## Referenzen

- [FIND-2026-05-23-custom-agent-and-architecture.md](FIND-2026-05-23-custom-agent-and-architecture.md) — Agent-Binding per YAML, `workbench.action.chat.open { mode }`
- syspilot Spec-Tree (`docs/userstories`, `docs/requirements`, `docs/design`)
