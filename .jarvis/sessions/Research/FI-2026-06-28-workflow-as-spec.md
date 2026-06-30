# FI-2026-06-28 — Workflow-as-Spec (der selbst-auditierende Prozess)

**Status:** Idee — graduiert aus der Meta-Notiz in [Layer 2](FI-2026-06-28-jarvisagents.md)  
**Verwandt:** [FI-2026-06-28-jarvisagents.md](FI-2026-06-28-jarvisagents.md) (Layer 2, liefert den Mechanismus), [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) (Layer 1)

---

## Kernidee

Nicht nur das **Produkt** ist spec-driven, sondern der **Prozess selbst**. Der Workflow/Vertrag jedes Agenten liegt als rst / sphinx-needs vor — mit derselben Struktur wie Produkt-Specs: **US (Why) → REQ (What) → SPEC (How)**. Damit gelten **Impact-Analyse, MECE und Traceability auch für die Workflow-Definition selbst.**

> Der Prozess wird ein auditierbares, versioniertes, selbst-verbesserndes Artefakt — kein Tribal Knowledge in `.agent.md`-Dateien.

## syspilot ist schon fast da

syspilot hat **heute** für jeden Agent:
- eine **User Story** (Why),
- einen **Requirement-Layer** (What),
- eine **Spec** (How).

Es fehlt nur **ein** Schritt: das „Dev von Spec nach `.agent.md`". Genau den **spart JarvisAgents** (Layer 2) — die leere Shell läuft die Spec direkt, statt sie vorher in ein `.agent.md` zu übersetzen. Der manuelle Übersetzungs-Schritt (und seine Drift) entfällt.

→ **Das ist der eigentliche Treiber**, warum syspilot überhaupt weiterentwickelt wird: nicht „noch ein Agent-Framework", sondern ein **prüfbarer Prozess**.

## Der Killer-Use-Case: Functional-Safety-Audit

In einem QA-Audit nach **ISO 26262** oder **DO-178C** kann man sich zurücklehnen:

> „Gut, dann schauen wir uns doch mal den **Prozess** an — wo hat der Lücken?"

Weil der Prozess im Spec-Tree liegt, läuft **Impact + MECE auf die Prozess-Definition** genauso wie auf das Produkt. **BAM.** Lückenlosigkeit des Prozesses wird *nachweisbar*, nicht behauptet. (Verbindet sich mit air-gapped/BYOK für regulierte Branchen → [FI-2026-05-29](future-ideas.md).)

## Der selbst-schließende Kreis

1. **Audit findet eine Lücke** im Prozess (per MECE/Impact auf den Workflow-Spec).
2. **„Hey PM, mach nen Change, close die Lücke."**
3. Der Fix läuft durch **denselben Change-Workflow** wie ein Produkt-Change — **Prozess-Update als Spec**.
4. Das Update fließt zurück in den Workflow → der nächste Lauf nutzt den verbesserten Prozess.

> Der Prozess verbessert sich **über seine eigene Maschinerie**. Traceability + Impact gelten auch für die Verbesserung selbst.

## Warum das mehr ist als „nett"

- **Selbstreferenz ohne Magie:** dieselben Tools (Impact-Analyzer, MECE, Traceability), die das Produkt absichern, sichern den Prozess ab. Kein Sondermechanismus.
- **Drift-frei:** kein `.agent.md`-Zwischenartefakt, das vom Spec abweichen kann.
- **Regulatorisch verwertbar:** ein versionierter, lückengeprüfter Prozess ist genau das, was 26262/DO-178-Audits sehen wollen.

## Offene Fragen

- rst/sphinx-needs-Schema für Workflow-Steps (Verhältnis zu Produkt-US/REQ/SPEC — eigene Namespaces?).
- Wie unterscheidet der Impact-Analyzer Produkt-Impact von Prozess-Impact (oder bewusst gemeinsam)?
- Bootstrapping: Der Change-Workflow, der Prozess-Updates fährt, ist selbst Teil des Prozesses — Henne/Ei sauber definieren.
- Minimal-Schritt: Reicht es, die bestehenden syspilot-Agent-Specs als „Workflow-Specs" zu deklarieren, oder braucht es ein eigenes Doc-Tier?

## Referenzen

- syspilot Spec-Tree (`docs/userstories`, `docs/requirements`, `docs/design`) — bereits US/REQ/SPEC pro Agent
- syspilot Impact-Analyzer (sphinx-needs Dependency-Traversal)
- [FI-2026-06-28-jarvisagents.md](FI-2026-06-28-jarvisagents.md) — eliminiert den `.agent.md`-Übersetzungsschritt
