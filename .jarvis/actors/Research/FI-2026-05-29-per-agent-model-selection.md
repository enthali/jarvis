# FI-2026-05-29 — Per-Agent Model Selection (BYOK-Era)

**Trigger:** VS Code 1.122.1 — BYOK ohne GitHub-Sign-In + Custom Endpoint Provider in Stable.

---

## Idee

Heute laufen alle syspilot-Agents gegen das aktive Copilot-Modell. Mit BYOK + Ollama/Custom-Endpoint kann jeder Agent sein passendes Modell deklarieren — analytische Agents lokal & klein, kreative/coding-Agents weiter Frontier.

---

## Modell-Zuordnung (Vorschlag)

| Agent | Aufgabentyp | Modell-Kandidat |
|---|---|---|
| `syspilot.mece` | strukturierte Spec-Analyse | lokal (z.B. Qwen3-30B-A3B, fallback Qwen2.5-7B) |
| `syspilot.trace` | ID-Pattern-Matching über Specs | lokal, klein (7B reicht) |
| `syspilot.verify` | Regel-basiertes Checken | lokal, klein–mittel |
| `syspilot.docu` | Doku-Synchronisation | lokal, mittel |
| `syspilot.design` | RST-Specs schreiben | Frontier |
| `syspilot.implement` | TypeScript-Code | Frontier (Coding-Modell) |
| `syspilot.cm` / `syspilot.pm` | Orchestrierung / Strategie | Frontier |

---

## Vorteile

- **Kosten/Quota** — kleine analytische Agents fressen heute Copilot-Calls für Aufgaben, die das nicht rechtfertigen
- **Latenz** — lokales Modell antwortet in 1–2 s, kein Netzwerk
- **Privacy** — interne Spec-Inhalte gehen bei sensiblen Projekten nicht mehr raus
- **Air-gapped Einsatzfähigkeit** für regulierte Branchen

---

## Voraussetzungen / offene Fragen

1. **Agent-Frontmatter-Schema** um `model:` + `fallback:` erweitern (greift VS Code das überhaupt? oder muss Custom-Endpoint-Proxy das routen?)
2. **Custom-Endpoint-Proxy** (kleiner Express-Server, Chat-Completions-Format) als saubere Routing-Variante prüfen
3. **BYOK-Onboarding** in `syspilot.setup` integrieren
4. **Utility-Models** (`chat.utilityModel`, `chat.utilitySmallModel`) brauchen separate Config — UX-Friktion
5. **NES/Inline-Suggestions** brauchen weiterhin GitHub-Sign-In — kein "vollständig GitHub-frei"

---

## Persönlicher Datenpunkt

Qwen3-30B-A3B leistet zuhause gute Dienste; 7B sollte für MECE/Trace genügen.

---

## Status

Strategisch, nicht akut. Slot suchen, wenn Tech-Debt-Welle abgeebbt ist.

---

## Referenzen

- [VS Code BYOK Documentation](https://code.visualstudio.com/docs/copilot/byok)
- [Custom Endpoint Provider](https://code.visualstudio.com/docs/copilot/custom-endpoint)