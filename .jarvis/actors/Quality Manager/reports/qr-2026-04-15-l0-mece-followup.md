# Quality Report — L0-MECE Follow-up

**Datum:** 2026-04-15  
**Quality Manager:** Quality Manager Session  
**Scope:** fokussierter Dokumentations- und Traceability-Review auf Basis der frischen L0-MECE-Befunde  
**Methode:** direkte Quellprüfung in US/REQ/SPEC/UAT-Dokumentation; kein neuer Code-vs-Spec-Review in diesem Lauf

---

## Executive Summary

Der gestrige `outlook-tasks`-Report bleibt fachlich gültig, ist aber für die aktuelle QA-Lage nicht mehr ausreichend, weil auf L0-Ebene zwei echte Widersprüche und mehrere Traceability-Lücken in den kanonischen Artefakten sichtbar sind.

| Severity | Count |
|---|---:|
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 2 |

**Bewertung:** kein Release-Blocker im Sinn eines neu gefundenen Codefehlers, aber ein klarer Dokumentations- und Governance-Blocker für saubere Planung, Traceability und künftige Verifikation. Die beiden HIGH-Befunde sollten als Change behandelt werden.

---

## Befunde

### HIGH-1 — `US_EXP_FEATURETOGGLE` ist in sich selbst und gegen die REQ-Ebene widersprüchlich

**Fundstellen:** `docs/userstories/us_exp.rst`, `docs/requirements/req_exp.rst`, `docs/requirements/req_cfg.rst`

**Beobachtung**

- `US_EXP_FEATURETOGGLE` AC-3 und AC-4 sagen, dass Messages- und Heartbeat-View nur sichtbar sind, wenn `jarvis.messagesFile` bzw. `jarvis.heartbeatConfigFile` nicht leer sind.
- Dieselbe Story sagt in AC-5 gleichzeitig, dass Messages und Heartbeat beim ersten Aktivieren automatisch erscheinen, also ohne manuelle Konfiguration.
- `REQ_EXP_FEATURETOGGLE` übernimmt nur die "nicht-leer"-Logik und enthält keine Anforderung für das automatische Erscheinen aus AC-5.
- `REQ_CFG_DEFAULTPATHS` existiert zwar als indirekte Brücke, aber der eigentliche Story-Text bleibt damit widersprüchlich und die Ebenen sind nicht sauber aligned.

**Auswirkung**

Diese Story ist als Planungs- und Review-Grundlage unzuverlässig. Ein Leser kann daraus sowohl "nur bei gesetztem Pfad sichtbar" als auch "auf First Start automatisch sichtbar" ableiten. Das erzeugt unnötige Folgearbeit in REQ, SPEC, UAT und Change-Dokumenten.

**Empfohlene Korrektur**

Die Story explizit auflösen, zum Beispiel:

1. AC-3/4 als Sichtbarkeitsregel belassen,
2. AC-5 als abhängige First-Start-Initialisierung via Default-Population umformulieren,
3. danach Story, REQ und ggf. UAT wieder sprachlich synchronisieren.

---

### HIGH-2 — `US_EXP_NAMESORT` widerspricht weiterhin `US_EVT_DATESORT` und der abgeleiteten REQ/SPEC-Ebene

**Fundstellen:** `docs/userstories/us_exp.rst`, `docs/requirements/req_exp.rst`, `docs/design/spec_exp.rst`, `docs/changes/v0.4.0/event-sort.md`

**Beobachtung**

- `US_EXP_NAMESORT` sagt weiterhin: Projekte und Events sollen alphabetisch nach YAML-`name` sortiert werden.
- `US_EVT_DATESORT` sagt dagegen explizit: Events sollen chronologisch nach `dates.start` sortiert werden.
- `REQ_EVT_DATESORT` und `SPEC_EXP_SCANNER` setzen diese Datums-Sortierung ebenfalls klar fest.
- Das Change-Dokument `event-sort.md` behauptet ausdrücklich, es gebe **keinen** Widerspruch mehr, weil `US_EXP_NAMESORT` nur noch für Projekte gelte. Genau diese Einschränkung steht aber in der kanonischen Story nicht.

**Auswirkung**

Der Widerspruch liegt auf der obersten Story-Ebene weiterhin offen vor. Damit ist jede spätere MECE-, Trace- oder Verifikationsarbeit an dieser Stelle unnötig fragil, obwohl REQ, SPEC und Implementierung offenbar bereits dem Event-Sort-Modell folgen.

**Empfohlene Korrektur**

`US_EXP_NAMESORT` textlich einschränken, sodass klar ist:

1. Projekte folgen Namenssortierung,
2. Events folgen `US_EVT_DATESORT`,
3. die Story-Verlinkung zwischen beiden Stories bleibt erhalten, aber ohne semantischen Konflikt.

---

### MEDIUM-1 — Für mehrere eingeführte Features fehlt eine dauerhafte UAT-Story im User-Story-Baum

**Fundstellen:** `docs/userstories/us_exp.rst`, `docs/userstories/us_uat_*.rst`

**Beobachtung**

Für mehrere produktive Stories gibt es im dauerhaften UAT-Story-Bestand keine eigene UAT-Story:

- `US_EXP_FEATURETOGGLE`
- `US_EXP_LISTPROJECTS`
- `US_EXP_CONTEXTACTIONS`
- `US_EVT_DATESORT`

Es existieren teils Change-spezifische Testprotokolle, aber keine stabile UAT-Story im regulären User-Story-Satz.

**Auswirkung**

Die Änderung mag einmalig getestet worden sein, bleibt aber im langfristigen Story/REQ/SPEC/UAT-Modell unvollständig. Das erschwert Regression-Planung und führt bei L0/L1-MECE zu wiederkehrenden "Gap"-Befunden.

**Empfohlene Korrektur**

Entweder für diese Features dauerhafte UAT-Stories ergänzen oder die Projektregel explizit dokumentieren, wann Change-spezifische Testprotokolle eine fehlende UAT-Story ersetzen dürfen.

---

### MEDIUM-2 — Outlook-Tasks-UAT wird unter zwei unterschiedlichen Story-IDs geführt

**Fundstellen:** `docs/userstories/us_uat_outlookcategories.rst`, `docs/changes/outlook-tasks.md`

**Beobachtung**

- Die kanonische UAT-Story heißt `US_UAT_TASKS`.
- Das Change-Dokument `outlook-tasks.md` referenziert auf L0 aber `US_UAT_OUTLOOK_TASKS`.

**Auswirkung**

Das ist keine reine Kosmetik. Sobald Reviews, MECE oder Traceability auf exakte IDs angewiesen sind, entstehen künstliche Gaps oder Dubletten.

**Empfohlene Korrektur**

Alle Outlook-Tasks-UAT-Referenzen auf die tatsächlich kanonische Story-ID vereinheitlichen.

---

### MEDIUM-3 — `US_REL_RELEASE` und `US_REL_VERSION` sind fachlich gekoppelt, aber auf Story-Ebene nicht direkt verbunden

**Fundstellen:** `docs/userstories/us_rel.rst`

**Beobachtung**

- `US_REL_RELEASE` fordert, dass die Version in `package.json` zum Git-Tag passt.
- `US_REL_VERSION` definiert genau das dazugehörige Versionierungsmodell.
- Zwischen beiden Stories fehlt aber ein direkter `:links:`-Zusammenhang.
- `US_REL_SELFUPDATE` verlinkt beide bereits gemeinsam, was die fachliche Kopplung zusätzlich bestätigt.

**Auswirkung**

Kein Laufzeitproblem, aber unnötig schwache Traceability an einer zentralen Release-Schnittstelle.

**Empfohlene Korrektur**

Direkte Story-Verlinkung ergänzen oder begründet dokumentieren, warum die Kopplung nur indirekt laufen soll.

---

### LOW-1 — `US_UAT_MSG` hat eine inkonsistente Szenario-Reihenfolge

**Fundstellen:** `docs/userstories/us_uat_msgqueue.rst`

**Beobachtung**

Die Testfälle sind als `T-1` bis `T-4`, dann `T-6`, dann `T-5` notiert.

**Auswirkung**

Kein inhaltlicher Fehler, aber unnötig unpräzise für ein Testprotokoll und ein wiederkehrender Auslöser für QA-Rückfragen.

**Empfohlene Korrektur**

Szenarionummern in eindeutige Reihenfolge bringen.

---

### LOW-2 — `event-sort.md` behauptet bereits Widerspruchsfreiheit, obwohl die kanonische Storylage das noch nicht trägt

**Fundstellen:** `docs/changes/v0.4.0/event-sort.md`, `docs/userstories/us_exp.rst`

**Beobachtung**

Das Change-Dokument hält fest, dass `US_EXP_NAMESORT` nur noch für Projekte gelte und kein Widerspruch mehr bestehe. Diese Aussage ist im kanonischen Storytext aktuell nicht nachvollziehbar.

**Auswirkung**

Historische Change-Dokumentation wirkt sauberer als der tatsächliche Soll-Stand. Das erhöht das Risiko, dass Review-Entscheidungen auf der falschen Ebene getroffen werden.

**Empfohlene Korrektur**

Entweder die Storys an das dokumentierte Zielbild anpassen oder die historische Aussage im Change-Dokument relativieren.

---

## Einordnung des Scopes

Dieser Lauf war bewusst **kein** vollständiger Feature-Review mit neuem Code-vs-Spec-Abgleich, sondern ein fokussierter Folge-Review auf Dokumentations- und Traceability-Ebene nach den frischen L0-MECE-Befunden.

Deshalb wurde die Review-Matrix für vollständig geprüfte Feature-US in diesem Lauf **nicht** erweitert.

---

## Empfehlung an den Project Manager

1. Einen kleinen Doku-/Traceability-Change für die beiden HIGH-Befunde einplanen.
2. Die UAT-/Namespace-Lücken gebündelt in einem zweiten kleinen Hygiene-Change bereinigen.
3. Erst danach einen weiteren übergreifenden QA-Lauf auf Story/REQ/SPEC-Ebene ansetzen, damit dieselben L0-Befunde nicht erneut auftauchen.