# Editor-Group-Placement für Actor-Sessions — Way Forward

**Kontext:** Löst das Fokus-Hüpf-Problem bei Auto-Delivery. Empirisch validiert (Spike-Branch `experiment/editor-group-placement`, 6 Test-Commands, throwaway). Details, Testverlauf und Fehleranalyse: [FI-2026-07-01-editor-group-placement.md](FI-2026-07-01-editor-group-placement.md).

---

## Das Modell — drei Ziele, kein State

| Ziel | Spalte | Trigger |
|---|---|---|
| **Main** | Spalte 1, fest | Klick auf einen Actor im Tree |
| **Docs** | Spalte 2, fest | `context.md` / YAML / Agent-File aus der Entity-Tree |
| **Secondary** | letzte existierende Spalte, dynamisch | Delivery an eine noch nicht offene Session |

**Placement-Regeln:**
- Tab existiert bereits (egal wo, auch manuell vom User verschoben) → **dort öffnen, nicht bewegen**.
- Klick auf Actor → **immer Main** (Close+Reopen falls anderswo offen).
- Delivery an neue Session → **letzte existierende Spalte** (degeneriert korrekt bei 1/2/3+ Groups, ohne Sonderfall-Code).

## Fokus-Restore (Phase 2)

Vor einer System-initiierten Delivery: aktuelle Fokus-Position merken (Editor-Tab **oder** Terminal). Nach der Delivery: automatisch dorthin zurückkehren. Eliminiert die „wo bin ich jetzt gelandet?"-Verwirrung nach jeder Auto-Delivery.

## Bestätigt, produktionsreif

- Beide Mechanismen (Placement + Fokus-Restore) funktionieren zuverlässig, auch unter Stresstest.
- Kein Runtime-State, kein YAML-Flag nötig — alles ergibt sich aus dem aktuellen Editor-Layout zur Laufzeit.
- Nutzt ausschließlich bereits vorhandene, stabile VS-Code-APIs (`tabGroups`, `vscode.open`, `lookupSessionUUID`) — keine neue Infrastruktur.

## Empfehlung

**Eine CR, Placement + Fokus-Restore zusammen** (beide nutzen dieselben Werkzeuge, gehören zusammen):

1. Produktiv-Code umstellen: `openChatForEntity`, `sendMessagesCommand`, Auto-Delivery-Poll-Loop, `openEntityFileCommand` auf die drei Placement-Regeln + Fokus-Snapshot/Restore.
2. **Zusätzliche Empfehlung:** Opt-out für Auto-Delivery auf Sessions, die gerade aktiv genutzt werden (z.B. PM/Research während eines laufenden Chats) — verhindert auch die letzte, minimale Störung während aktiver Arbeit.

**Aufwand:** überschaubar — reine Refactoring-Arbeit auf bestehende Commands, keine neue Architektur.
