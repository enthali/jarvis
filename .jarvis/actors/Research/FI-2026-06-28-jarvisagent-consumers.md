# FI-2026-06-28 — JarvisAgent Consumers (syspilot · PIM · …)

**Status:** Idee / unausgegoren  
**Layer:** 3 von 3 (die Consumer-Projekte)  
**Verwandt:** [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) (Layer 1, Core), [FI-2026-06-28-jarvisagents.md](FI-2026-06-28-jarvisagents.md) (Layer 2, Voraussetzung)

---

## Trigger

Wenn Hook Engine (Layer 1, Core) und JarvisAgents (Layer 2, Modul) stehen, wird **jedes Projekt zum Consumer**: es bringt seine eigenen Agent-Families als Spec mit und lässt sie vom Framework zusammenbauen und steuern. syspilot ist **ein** Consumer — nicht der einzige.

## Die saubere Trennung

- **Jarvis** liefert die Engine: Hook Engine (Core) + JarvisAgents (Modul).
- **Das Projekt** liefert die **Agenten und Skills** als Spec (Customization).
- Jede `JarvisAgentSession` weiß, welchen `JarvisAgent` sie hat → beliebig viele Agent-Families **parallel**, projektübergreifend, kein Konflikt.

## Consumer-Beispiele

### syspilot — 3 parallele Agenten

| Session | Übernimmt heute | Begründung der Trennung |
|---------|-----------------|------------------------|
| **Projekt-Koordinator** | Research + Roadmap + Release | Planung läuft parallel zur Umsetzung |
| **Systems Engineer** | alles vom heutigen Change Manager | der Durchführungs-Strang des Change |
| **Quality Manager** | alles vom heutigen QM | **darf den Change-Context NICHT kennen** — muss sich kritisch erarbeiten, gezielt nach Löchern suchen |

syspilot kann mehr als nur Spec-Driven-Development — es ist nur das erste, am besten verstandene Family-Set.

### PIM — eigene Agent-Family

> **Near-term:** PIM wird demnächst zuhause produktiv eingesetzt → erster realer Consumer neben syspilot, kein hypothetisches Beispiel.

| Session | Aufgabe |
|---------|---------|
| **Inbox** | Triage eingehender Items → Notifications/Tasks |
| **Project Manager** | Projekt-Flow |
| **Event Manager** | Event-Flow |
| **Travel Manager** | Reise-Planung/-Koordination |

Alle **highly customizable** — PIM-Agenten nutzen exakt das **Jarvis-Format** wie syspilot. Über die Specs existieren beide Sets absolut parallel.

**Killer-Use-Case: spec-driven Email.** Der Inbox-Agent triagiert **spec-driven Gmail** und **spec-driven Outlook** — die Triage-Regeln, Prioritäten und Routing-Schritte (Item → Notification → Task) stehen in der Spec, nicht im Code. Greift direkt in Jarvis' bestehende Outlook-/Notification-Infrastruktur (`spec_olk`, Inbox-Triage-Kette aus Layer 1).

## Customization-Modell (gilt für alle Consumer)

`core workflow = Produkt-Blueprint (JarvisAgents)` **+** `customization spec im Projekt`.

- Wir liefern mit JarvisAgents den **Blueprint**, wie Agenten zu schreiben sind (Produkt-Struktur).
- Die Produkt-Struktur übernehmen/entwickeln wir **mit syspilot zusammen im Ping-Pong-OSS-Release**.
- Jedes Projekt schreibt nur seine Customization — keine Engine-Arbeit nötig.

## Nutzen (warum das die Kernprobleme löst)

- Kein `sendToSession`-Hin-und-Her → der Vertrag bleibt im Context.
- Kein wiederholtes Vertrag-Lesen.
- Customization ohne Code — der User baut eigene Agenten/Workflows.
- Agent-Hopping verschwindet — eine Session pro Family.
- Kontrolliertes Compact am Ende eines Agent-Laufs (Layer 2).
- Worktree-Parallelität: zweiter Agent auf eigenem Worktree easy, weil eine Session = ein Kontext = ein Worktree.

## Offene Fragen / Risiken

- **„Au weia das wird spannend":** Migration bestehender `.github/agents/*.md` + Skills → Agent-Specs ist ein großer Umbau. Reihenfolge und Rückfallebene definieren.
- **QM-Context-Isolation:** Wie stellt die Engine sicher, dass die QM-Session den Change-Context *nicht* injiziert bekommt? (Gegenteil des Normalverhaltens.)
- syspilot-Projekt-Koordinator vereint Research + Roadmap + Release — zu breit? (Heute schon 3 Hüte.)
- Abhängigkeit: ohne Layer 1 + 2 nicht baubar. Erst Engine, dann Consumer.
- Projekt-Spec-Format muss Agent-Assembly-tauglich werden (Schema-Arbeit pro Consumer).

## Referenzen

- syspilot „agent families"-Konzept
- [architecture-review-2026-05.md](architecture-review-2026-05.md) — F5 (Frontend/Core-Split) berührt Session-Modell
