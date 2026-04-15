# Quality Manager Review Matrix — User Stories

Diese Übersicht zeigt auf einen Blick, welche User Stories bereits im QA-Review als vollständige Review-Einheit geprüft wurden.

Eine Review-Einheit umfasst:
- Feature-US
- verlinkte REQs
- SPECs
- Code-vs-Spec-Prüfung
- UAT-Abdeckung
- Doku-Aktualitätsprüfung

## Feature User Stories

| User Story | Letzte Prüfung | Report | Doku-Check |
|---|---|---|---|
| `US_AUT_HEARTBEAT` | 2026-04-10 | [qr-2026-04-10.md](reports/qr-2026-04-10.md) | offen (vor Regel) |
| `US_CFG_PROJECTPATH` | — | — | — |
| `US_CFG_HEARTBEAT` | — | — | — |
| `US_CFG_MSG` | — | — | — |
| `US_DEV_MANUALTEST` | — | — | — |
| `US_DEV_CONVENTIONS` | — | — | — |
| `US_DEV_LOGGING` | — | — | — |
| `US_PIM_TASKS` | 2026-04-15 | [qr-2026-04-15-outlook-tasks.md](reports/qr-2026-04-15-outlook-tasks.md) | geprüft |
| `US_EXP_SIDEBAR` | — | — | — |
| `US_EXP_PROJECTFILTER` | — | — | — |
| `US_EXP_EVENTFILTER` | — | — | — |
| `US_EXP_OPENYAML` | — | — | — |
| `US_EXP_NEWENTITY` | — | — | — |
| `US_EXP_SCANREFRESH` | — | — | — |
| `US_EXP_CONTENTDETECT` | — | — | — |
| `US_EXP_NAMESORT` | — | — | — |
| `US_MSG_CHATQUEUE` | — | — | — |
| `US_MSG_OPENSESSION` | — | — | — |
| `US_MSG_LISTSESSIONS` | — | — | — |
| `US_EXP_AGENTSESSION` | — | — | — |
| `US_MSG_MCPSERVER` | — | — | — |
| `US_OLK_TASKS` | 2026-04-15 | [qr-2026-04-15-outlook-tasks.md](reports/qr-2026-04-15-outlook-tasks.md) | geprüft |
| `US_REL_DOCS` | — | — | — |
| `US_REL_RELEASE` | — | — | — |
| `US_REL_VERSION` | — | — | — |
| `US_REL_GITWORKFLOW` | — | — | — |
| `US_REL_SELFUPDATE` | — | — | — |

## UAT User Stories

| User Story | Letzte Prüfung | Report | Doku-Check |
|---|---|---|---|
| `US_UAT_SAMPLEDATA` | — | — | — |
| `US_UAT_HEARTBEAT` | — | — | — |
| `US_UAT_HEARTBEATVIEW` | — | — | — |
| `US_UAT_JOBREG` | — | — | — |
| `US_UAT_LOGGING` | — | — | — |
| `US_UAT_MSG` | — | — | — |
| `US_UAT_MCPSERVER` | — | — | — |
| `US_UAT_OUTLOOK_TASKS` | — | — | — |
| `US_UAT_NEWENTITY` | — | — | — |
| `US_UAT_SIDEBAR` | — | — | — |
| `US_UAT_EVENTFILTER` | — | — | — |
| `US_UAT_SCANREFRESH` | — | — | — |
| `US_UAT_CONTENTDETECT` | — | — | — |
| `US_UAT_NAMESORT` | — | — | — |
| `US_UAT_SELFUPDATE` | — | — | — |
| `US_UAT_OPENSESSION` | — | — | — |
| `US_UAT_LISTSESSIONS` | — | — | — |
| `US_UAT_AGENTSESSION` | — | — | — |

## Nutzung

- Nach jedem vollständigen US-basierten QA-Review die betroffene Feature-US mit Datum und Report eintragen.
- Den Doku-Check pro Review-Einheit mitpflegen: `geprüft`, `offen` oder kurzer Statushinweis.
- UAT-Stories werden nur dann eingetragen, wenn sie selbstständig als Prüfgegenstand betrachtet wurden.
- Die nächste Review-Einheit wird aus den noch nicht geprüften Feature-US ausgewählt.