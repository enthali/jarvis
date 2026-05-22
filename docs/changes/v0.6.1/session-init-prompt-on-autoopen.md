# Change Document: session-init-prompt-on-autoopen

**Status:** pending-merge-approval
**Mode:** autonomous
**Branch:** `feature/session-init-prompt-on-autoopen`
**Source:** PM Change Request (2026-05-22, 15:57Z)
**Target release:** v0.6.1 (hotfix for v0.6.0 regression)
**Priority:** HIGH
**Change Manager:** Jarvis CM session
**Base commit (develop):** `4153363` (Merge branch 'main' into develop, after v0.6.0 release `af1c7c7`)

---

## CR Intent (from PM, verbatim — extended 2026-05-22 16:11Z)

> **WAS (Intent — erweitert):** Beim Öffnen einer Session — egal über welchen
> Weg (Tree-Klick, Auto-Delivery via Message) — soll die Session zuverlässig
> im in `session.yaml` gebundenen Agent-Mode starten **und** den Init-Prompt
> erhalten.
>
> **WARUM (Motivation):**
> - v0.6.0 hat Agent-Awareness eingeführt, aber die beiden Open-Pfade
>   verhalten sich unterschiedlich
> - Auto-geöffnete Sessions starten ohne Rollen-Kontext und können ihre
>   Aufgabe nicht korrekt wahrnehmen
> - **Zweites Symptom (added 16:11Z):** Wenn alle Sessions im VS Code Chat
>   gelöscht und per Tree-Klick neu geöffnet werden, öffnen sie alle im
>   aktuell aktiven Agent-Mode (statt im in `session.yaml` gebundenen).
>   Reproduziert mit 3 Sessions in `c:\workspace\syspilot` — alle starten
>   als `syspilot.pm` (= aktuell aktive User-Mode) statt im jeweils
>   gebundenen Agent.
> - User-Erwartung: Eine Session ist eine Session — unabhängig davon, wie
>   sie geöffnet wurde

### User-visible Acceptance Criteria (extended)

1. Session per **Tree-Klick** öffnen (neue Session) → öffnet im korrekten
   Agent-Mode aus `session.yaml` ✓ **und** mit Init-Prompt ✓
2. Session per **Tree-Klick** öffnen (existierende Session) → öffnet
   existierende Session unverändert (kein Re-Apply, D-6 wie schon
   dokumentiert)
3. **Message** an gelöschte/nicht-existierende Session → öffnet neue
   Session im korrekten Agent-Mode ✓ **und** mit Init-Prompt ✓
4. Verhalten beider Open-Pfade (Tree-Klick + Auto-Delivery) ist
   identisch (Agent + Init-Prompt)
5. **(added 2026-05-22 20:35Z, PM superseding direction)** Agent picker
   (`pickAgentMode`) zeigt jeden `*.agent.md` File aus
   `<workspace>/.github/agents/`, dessen YAML-Frontmatter den Key
   `user-invocable` NICHT explizit auf `false` setzt. Default bei
   fehlendem Key: **included**. Nur explizites `user-invocable: false`
   excludiert.

### PM-Hypothese zum Root-Cause (NICHT Implementierungsvorgabe)

Selber Code-Pfad-Klasse wie der ursprüngliche Auto-Open-Bug: der
mehrstufige Chat-Open-Pfad (Editor öffnen → rename → query+mode senden)
wendet den `mode`-Parameter nicht zuverlässig auf einen bereits
fokussierten Chat an. Designer hat zu klären, ob diese Hypothese trägt
und welcher Mechanismus den Mode zuverlässig setzt.

### Spec-Defekt entdeckt während User-UAT (2026-05-22 20:35Z)

User-UAT-Lauf gegen `tst-session-init-prompt-on-autoopen` blockiert
durch leeren Agent-Picker im testdata Workspace.

**Befund:**
- `US_SES_AGENTBINDING` AC-1 sagt "lists all user-invocable agents
  discovered from the workspace" — definiert aber NICHT, wie ein Agent
  zu "user-invocable" qualifiziert
- `REQ_SES_AGENT_DISCOVERY` AC-2 hat self-invented (nicht aus US
  abgeleitet): "missing oder false → exclude" (default-deny)
- `SPEC_SES_AGENT_DISCOVERY` Algorithm + `readFrontmatterBool`
  implementieren das defensiv
- Konsequenz: jede `*.agent.md`-Datei ohne explizit gesetztes
  `user-invocable: true` Frontmatter-Field verschwindet stillschweigend
  aus dem Picker — UX-hostile, blockiert UAT-Verifizierbarkeit

**User-Position (validiert):** Default soll `true` sein. Existierende
Orchestration-Agents (`syspilot.implement`, `syspilot.mece`,
`syspilot.docu`, `syspilot.uat`, `syspilot.trace`, `syspilot.verify`,
`syspilot.release`, `syspilot.design`) haben bereits explizit
`user-invocable: false` → Default-Wechsel ändert für sie nichts, nur
neue Files ohne Key werden sichtbar.

**PM superseding direction (2026-05-22 20:35Z):** Fix in diesem CR (kein
separater CR). User hat CR nicht abgenommen, der Defekt betrifft die
spezifizierte Verhaltens-Ebene (SPEC/UAT-Verifizierbarkeit), nicht eine
neue Produktidee.

### Out of Scope (CM read)

- Refactor von `SPEC_MSG_OPENCHAT` oder zugehörigen Helpers (separater CR
  `spec-helper-orphan-cleanup` ist next im Backlog).
- Verhalten für Sessions, die bereits existieren und nur fokussiert werden
  (kein Re-Apply von Agent oder Init-Prompt — bestehende Sessions haben
  bereits Mode + Kontext, AC-2).
- Auto-delivery poll loop's Notification-Stub-Verhalten (Notification
  selbst ist nicht Scope, nur Mode-Application + Init-Prompt).

### Sequential-CR Rule

Dies ist der einzige offene CR. Backlog danach:
1. `session-init-prompt-on-autoopen` (DIESER, v0.6.1)
2. `spec-helper-orphan-cleanup` (post-v0.6.1)

---

## Intent Gate

CR ist intent-only. WAS / WARUM / AC sauber getrennt. Keine
Implementierungs-Prescriptions. Pfad-Bezeichnungen ("Session-Tree-Click",
"Message an gelöschte Session") sind User-Sichten, keine Code-Spec.
Proceed direkt zum standard syspilot.cm-Workflow.

---

## Workflow

Standard syspilot.cm-Chain (kein Tailoring — Code-Change, nicht doc-only):

1. **Impact Analysis** (Impact Skill) — Welche US/REQ/SPEC sind betroffen?
2. **System Designer** — Level-by-Level Analyse + RST-Updates
3. **MECE advisory** per Level
4. **Test Engineer** — UAT-Artefakte
5. **Dev Engineer** — Implementation + Tests
6. **MECE final**
7. **Documentation Engineer**
8. **Notify PM + QM**
9. **PM Merge Approval** (mit explizitem "merge jetzt OK?"-Check, Lesson
   Learned aus letztem CR)
10. **Squash-merge zu develop**
11. **Post-merge Confirmation**

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/session-init-prompt-on-autoopen` from `develop@4153363` |
| 1a. Change Document | done | CM | this file — commit `dddf6c1` |
| 2. Impact Analysis | done | CM | run Impact Skill (initial scope: auto-open paths). Re-run after CR extension covered tree-click + mode-apply reliability. |
| 3. System Designer (initial) | done | syspilot.design | commit `b21f197` + report `ccf5978` — covers sendMessages + auto-delivery poll new-session paths; init-prompt + entity-lookup |
| 3b. System Designer (delta) | done | syspilot.design | commit `9215387` (after `22bce4b` CR extension) — mode-apply mechanism + tree-click symptom fully designed; design fix-pass `d266d14` |
| 4. MECE advisory | done | syspilot.mece | HIGH advisories resolved in design fix-pass `d266d14` |
| 5. UAT | done | syspilot.uat | commit `197d67a` — `tst-session-init-prompt-on-autoopen.md`; T-1..T-5 + T-E1..T-E5 covering all 4 ACs + edge cases |
| 6. Implementation | done | syspilot.implement | commit `3d41d6a` — mode-primed creation at 3 call sites (openAgentSession, sendMessages, autoDeliver); `npm run compile` clean; sphinx clean |
| 7. MECE final | done | syspilot.mece | commit `0e6b6b0` — PASS-WITH-ADVISORIES; 2 LOW advisories accepted by CM |
| 8. Documentation | done | syspilot.docu | `val-session-init-prompt-on-autoopen.md` + `tst-session-init-prompt-on-autoopen.md` created; releasenotes.md updated (v0.6.1); process log updated |
| 9. Notify | done | CM | PM + QM via Jarvis; QM PASS-Review erhalten |
| 10. User-UAT round 1 | done | User | T-2/T-5/T-E1/T-E2 PASS; T-1 FAIL; T-4 partial (Mode nicht verifizierbar); blocked by spec defect (leerer Agent-Picker) |
| 11. Scope extension (CR AC-5) | done | CM | scope extended in `ae591a4`; PM superseding direction (20:35Z) |
| 12. Designer (scope ext) | done | syspilot.design | commit `3578c7b` — US/REQ/SPEC rewrite for default-include opt-out policy |
| 13. Dev (scope ext) | done | syspilot.implement | commit `6143eb2` — `isExplicitlyExcluded()` helper + algorithm switch; `npm run compile` clean |
| 14. UAT (scope ext) | done | syspilot.uat | commit `0967af3` — T-E6 added (default-include for missing user-invocable key, covers AC-5) |
| 15. MECE reload | done | syspilot.mece | PASS-WITH-ADVISORIES (3 LOW advisories; none blocking; addressed in this docu sync) |
| 16. Docu sync | done | syspilot.docu | val-doc updated (AC-5 + T-E6 + new advisories); releasenotes.md v0.6.1 updated; Process Log closed |
| 17. Scope extension (F-1 + F-2) | done | CM | F-1 agent identity (frontmatter name-first) + F-2 session folder naming (verbatim, no slug); PM direction 2026-05-23 |
| 18. Designer (F-1 + F-2) | done | syspilot.design | commit `55f1bf5` — SPEC_SES_AGENT_DISCOVERY + SPEC_SES_NEWENTITY + SPEC_SES_AGENT_PICKER + SPEC_SES_AGENT_CREATETOOL; REQ_SES_AGENT_DISCOVERY + REQ_SES_AGENT_PICKER + REQ_SES_AGENT_CREATETOOL + REQ_SES_NEWENTITY; US_SES_AGENTBIND |
| 19. Dev (F-1 + F-2) | done | syspilot.implement | commit `43c9055` (F-1 + F-2 impl) + `1d8f590` (fix-pass: validateInput + MECE F-FAIL-1 fix); `npm run compile` clean |
| 20. UAT (F-1 + F-2) | done | syspilot.uat | commit `d58bc35` — T-F1-1..T-F1-5 (agent identity) + T-S1..T-S4 (folder naming) added |
| 21. MECE (F-1 + F-2) | done | syspilot.mece | MECE FAIL — F-FAIL-1 (validateInput missing checks) + F-FAIL-2 (spec/test text misaligned to showErrorMessage); both fixed: F-FAIL-1 in `1d8f590` (code), F-FAIL-2 in this docu sync |
| 22. Docu sync (F-1 + F-2) | done | syspilot.docu | SPEC_SES_NEWENTITY step 5 + REQ_SES_NEWENTITY AC-9 + T-S3 aligned to validateInput mechanism; SPEC_SES_AGENT_SCHEMA agent example extended (A-2); REQ_SES_AGENT_COMPAT backward-compat note added (A-3); val-doc updated; releasenotes updated |
| 22b. MECE re-verify | pending | syspilot.mece | final MECE PASS check after docu sync |
| 23. User-UAT round 2 | pending | User | full retest including T-E6 + F-1/F-2 cases |
| 24. Merge approval | pending | PM | explicit "merge jetzt OK?" after User PASS |
| 25. Squash-merge | pending | CM | feature → develop |
| 26. Post-merge | pending | CM | commit hash + branch name to PM |

---

## Engineer Reports

### syspilot.design — 2026-05-22

**Commit:** `b21f197` — spec(design): session-init-prompt-on-autoopen — level 0/1/2 specs

---

#### 1. New IDs

None. The entity-by-name lookup (`scanner.entities.find(e => e.name === destination)`)
reuses the existing `scanner.entities` public getter — no new SPEC or method required.

---

#### 2. Extended IDs

| ID | Level | What was added |
|----|-------|----------------|
| `US_EXP_AGENTSESSION_PROMPT` | US | AC-6: init prompt also fires on sendMessages / poll new-session paths (entity-matched); no-match → skip |
| `REQ_MSG_SEND` | REQ | AC-8: entity lookup + init prompt in new-session branch, before notification stub; link to `REQ_EXP_AGENTPROMPT_TEMPLATE` added |
| `REQ_EXP_AGENTPROMPT_TEMPLATE` | REQ | AC-5 extended: all 4 trigger paths now listed (openAgentSession, newSession, sendMessages new-session, poll new-session) |
| `REQ_MSG_AUTODELIVER_POLL` | REQ | AC-8: same as REQ_MSG_SEND AC-8 for the poll loop; link to `REQ_EXP_AGENTPROMPT_TEMPLATE` added |
| `SPEC_EXP_AGENTSESSION_INITPROMPT` | SPEC | Trigger points section extended with sendMessages new-session + poll new-session (both entity-matched, entity-miss → skip) |
| `SPEC_MSG_SENDCOMMAND` | SPEC | Else-branch extended: `scanner.entities.find` + init prompt block before notification stub; links updated |
| `SPEC_MSG_AUTODELIVER_POLL` | SPEC | Else-branch extended: same pattern as SPEC_MSG_SENDCOMMAND; links updated |

All extended elements changed from `:status: implemented` → `:status: draft`.

---

#### 3. Auto-Delivery Poll Loop Scope

**Decision: IN scope** — both `jarvis.sendMessages` (user-initiated) and the auto-delivery
poll loop are covered by this CR.

**Rationale:** PM's "Eine Session ist eine Session" principle is unambiguous. The poll loop
creating a new session is mechanically identical to sendMessages creating one — in both cases
Jarvis is responsible for the session's birth and owes it the same initialization. Deferring
the poll fix to a follow-up CR would leave a known regression alive in v0.6.1. The design
cost is zero (same three lines, same helper call).

---

#### 4. Edge Case Decision

**Decision: Option (a) — skip init prompt if no entity matches the destination name.**

**Rationale:** AC-2 ("Message an gelöschte/nicht-existierende Session → neue Session öffnet
sich und erhält den Init-Prompt") presupposes a Jarvis entity behind the session name.
A session named "Atlas" without a matching project/event folder is not a Jarvis entity;
sending an init prompt with empty `kind`/`contextPath` placeholders would be misleading.
The safe and correct behaviour is: rename + stub only, no init prompt.

---

#### 5. Sequencing Decision

**Decision: Init prompt BEFORE notification stub.**

**Rationale:** Mirrors the manual `jarvis.openAgentSession` flow exactly. The init prompt
establishes "who I am and where my memory is"; the notification stub is the first work task.
An agent that reads the stub before knowing its identity may handle it incorrectly.
Order: `openNewChatEditor` → `renameFocusedChatSession` → init prompt → notification stub.

---

#### 6. Sphinx Build

Full rebuild (`-W --keep-going -E -q`): **clean** — zero warnings, zero errors.
needs.json updated 15:19:43 → 18:09:26.

---

#### 7. Open Questions for CM

None. All design decisions have been made and documented above.

---

### syspilot.design — 2026-05-22 (delta: mode-apply reliability + tree-click symptom)

**Commit:** `d0df161` — spec(design): session-init-prompt-on-autoopen delta — mode-apply reliability + tree-click symptom

---

#### 1. PM Hypothesis Validation

**CONFIRMED.** Evidence:

- `workbench.action.openChat` (the `openNewChatEditor()` implementation) does NOT
  accept a `mode` parameter. It creates a session using the user's currently-active
  VS Code Chat mode selector setting.
- `workbench.action.chat.open { mode: X }` called on an already-focused/active
  session does NOT retroactively change that session's mode. Mode is a per-session
  attribute bound at creation time; post-creation `chat.open` with `mode` is a
  navigation/focus command, not a mode-switch command.
- The pre-delta sequence (create → rename → `chat.open { query, mode }`) was therefore
  always silently discarding the `mode` parameter on the final call.
- The tree-click symptom (all 3 sessions open in `syspilot.pm` after deletion) is
  exactly what this root cause predicts: every call to `openNewChatEditor()` inherits
  the user's current mode setting; no bound `entity.agent` mode is ever applied.
- AC-2 scope note: the symptom occurs exclusively in the **new-session** branch
  (`lookupSessionUUID` returns null for all 3 after VS Code chat sessions are
  deleted). The existing-session branch (`uuid` found) is NOT affected and correctly
  stays out of scope per CR AC-2.

---

#### 2. Chosen Mode-Apply Mechanism

**Mode-primed creation pattern.** For new-session branches where `entity.agent` is
set, the caller calls `workbench.action.chat.open { mode: entity.agent }` + 300 ms
settle *before* `openNewChatEditor()`. This primes the VS Code Chat mode selector
so the new session is born in the bound agent mode. The final init-prompt submission
uses `workbench.action.chat.open { query: initPrompt }` without a mode parameter.
`openNewChatEditor()` itself is unchanged.

**Why not post-creation switching?** `workbench.action.chat.open { mode }` on an
already-active session is a focus/navigation command; it cannot change a session's
mode after birth. This is the root cause of the PM-reported symptom.

**Why not a new `openNewChatEditorWithMode(mode?)` helper?** Callers can inline the
mode-prime step before calling `openNewChatEditor()` with no signature change.
`SPEC_MSG_OPENCHAT` now documents the pattern; `openNewChatEditor()` stays mode-agnostic.
No CM flag required.

---

#### 3. Extended IDs (delta)

| ID | Level | What was added |
|----|-------|----------------|
| `US_EXP_AGENTSESSION_PROMPT` | US | AC-7: agent-bound mode applied at session birth, not via post-creation switching, across all trigger paths |
| `REQ_EXP_AGENTPROMPT_TEMPLATE` | REQ | AC-6: mode-primed creation pattern — caller primes `workbench.action.chat.open { mode }` + 300 ms before `openNewChatEditor()`; post-creation mode-set forbidden |
| `REQ_MSG_SEND` | REQ | AC-8 updated: mode-prime before `openNewChatEditor()` added to new-session branch |
| `REQ_MSG_AUTODELIVER_POLL` | REQ | AC-8 updated: same as REQ_MSG_SEND AC-8 |
| `SPEC_EXP_AGENTSESSION` | SPEC | Status→draft; link `SPEC_EXP_AGENTSESSION_INITPROMPT` added; new-session branch handler: mode-prime step + entity-lookup + init-prompt; broken `chatOpenOptions.mode` pattern removed |
| `SPEC_EXP_AGENTSESSION_INITPROMPT` | SPEC | Status→draft; trigger-points extended: sendMessages + poll new-session; mode-apply sequencing section added |
| `SPEC_MSG_SENDCOMMAND` | SPEC | Status→draft; extended links; new-session branch: mode-prime before `openNewChatEditor()`, entity-lookup, init-prompt (no mode in final call) |
| `SPEC_MSG_AUTODELIVER_POLL` | SPEC | Status→draft; extended links; new-session branch: same mode-prime + entity-lookup + init-prompt pattern |
| `SPEC_MSG_OPENCHAT` | SPEC | Mode-primed creation pattern design note added (no status change — pattern is documented, not a new requirement) |
| `SPEC_MSG_AGENTSESSION` | SPEC | New-session sequence updated: step 2 = mode-prime (conditional on `entity.agent`), step 3 = `openNewChatEditor()`, removed stale `sendPromptToFocusedAgentChat` references from sequence |

---

#### 4. AC-2 Scope Discovery

**Not a scope-creep case.** The tree-click symptom is reproducible in the
**new-session** branch only (all VS Code chat sessions were deleted before re-opening
via tree-click, so `lookupSessionUUID` returned null for all). The existing-session
path (`uuid` found → `openPinnedResource(uri)`) does not apply mode and is correctly
out of scope per CR AC-2. No recommendation to CM for AC-2 scope change.

---

#### 5. MECE Advisories

**US level:**
- M-1: `US_EXP_AGENTSESSION` (parent story) does not yet mention mode reliability
  explicitly. `US_EXP_AGENTSESSION_PROMPT` AC-7 now fills this gap. Advisory to
  MECE engineer: check if `US_EXP_AGENTSESSION` AC-3 ("Session opens in the bound
  agent mode") needs strengthening to reference AC-7 of the child story.

**REQ level:**
- M-2: `REQ_EXP_AGENTPROMPT_TEMPLATE` AC-5 mentions "same template, placeholder
  substitution, and agent-mode binding" but previously said nothing about HOW the
  binding is applied. New AC-6 closes this gap. Advisory: MECE engineer verify
  all four trigger-path REQs reference AC-6.

**SPEC level:**
- M-3: `SPEC_MSG_SENDPROMPT` still contains a stale code block showing the old
  3-step sequence (create → rename → prompt). This is historical reference only,
  per the spec's own note. Advisory to MECE engineer: `SPEC_MSG_SENDPROMPT` Callers
  list mentions `jarvis.openAgentSession` — verify this is still accurate after
  `openAgentSession` now uses `workbench.action.chat.open` directly (not
  `sendPromptToFocusedAgentChat`) for the init prompt.

---

#### 6. Sphinx Build (delta)

Full rebuild (`-W --keep-going -E -q`): **clean** — zero warnings, zero errors.

---

#### 7. Open Questions for CM (delta)

None. All design decisions documented above. AC-2 scope analysis complete (not scope creep).
Awaiting MECE advisory (step 4) and UAT engineer (step 5).
