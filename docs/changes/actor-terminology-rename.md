# Change Document: actor-terminology-rename

**Status**: in-progress
**Branch**: feature/actor-terminology-rename
**Created**: 2026-07-06
**Author**: PM
**Operation Mode**: user-guided (default) | autonomous

---

## Summary

Renames all user-facing and code-level terminology from "Session" to "Actor" wherever it refers to the Jarvis actor entity kind — the concept was already renamed at the spec level in `entity-taxonomy-rename` (v0.15.0), but the VS Code UI label, command titles, and various remaining prose in specs/skills/agent files still say "Session". This covers the tree view title, command titles/menu entries, and any user-visible or spec-level text still referring to the entity kind as "Session"/"Sessions". Motivation: "Session" is overloaded — it means both the entity kind and a VS Code chat session/tab — which confuses users and agents alike (e.g. an agent guessing `listSessions` would return a Project). This is Phase 1 of a larger 4-phase idea (see PM's `ideas/actor-renaming.md`): storage paths (`.jarvis/sessions/`, `session.yaml`) and any dual-path scanner support are explicitly OUT of scope here — no storage change, no migration, no back-compat mechanism, purely cosmetic/terminology. Acceptance: no remaining user-visible or spec-level occurrence of "Session"/"Sessions" where it means the Actor entity kind; genuine VS Code "chat session" terminology (which is a real, distinct concept) is unaffected and stays as-is.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_ACTORS | Actor Entity Type | unchanged | Already uses "Actor" terminology — this CR fulfills its intent at the UI level (the US anticipated a future rename of the visible labels, per its own note: "the word 'Session' is retired as a Jarvis concept name") |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|

### Decisions

- No new US needed — `US_ACT_ACTORS` already names the entity kind "Actor" and its existing ACs already describe the target state (e.g. AC-2: "An Actors tree view appears in the Jarvis Explorer sidebar"). This CR is a pure fulfillment of that already-specified intent at the implementation level (command titles, tree view display name, settings-group label).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — the gap was the UI not yet matching the spec; this CR closes it

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_TREE | US_ACT_ACTORS | modified | New AC-7 (tree view display name "Actors"), AC-8 (command titles "New Actor"/"Open Actor Chat"), AC-9 (settings-group title "Actors") |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|

### Conflicts Detected

- None. The internal IDs (`jarvisSessions`, `jarvis.newSession`, `jarvis.sessions.enabled`) are explicitly documented as unchanged (Phase 2+ scope) in the new ACs, so no contradiction with the existing AC-2/AC-3 setting-key references.

### Decisions

- Command titles chosen to be clear about what each command does with the new terminology: "New Actor" (creates an actor entity, not a chat session) and "Open Actor Chat" (opens the chat bound to an actor — "Chat" disambiguates from opening the YAML/context.md file, which is "Open" in the context menu). Neither introduces a new command ID.
- Settings-group title "Actors" aligns with the tree view display name; the setting key `jarvis.sessions.enabled` description changes from "Enable the Sessions feature" to "Enable the Actors feature" — cosmetic only.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (no new REQs — only existing amended)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_TREE | REQ_ACT_TREE | modified | Amendment note added: package.json display name "Actors", command titles per AC-7/8/9, internal IDs unchanged |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|

### Conflicts Detected

- None. The SPEC amendment is purely additive (a note describing the title changes); the existing code samples/notes about `SessionTreeProvider` class name, `jarvisSessions` view ID, and file paths remain accurate and unchanged.

### Decisions

- No new SPEC element needed — the change is a package.json string substitution, not a new module or architectural change. A note on the existing `SPEC_ACT_TREE` is sufficient for traceability, same approach used in entity-taxonomy-rename for prose-only amendments.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (no new SPECs)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_ACTORS (unchanged) | REQ_ACT_TREE (AC-7/8/9 added) | SPEC_ACT_TREE (amendment note) | ✅ |

### Artefakt-Removal-Check

_Not applicable — no artefacts removed. Only user-visible string labels change; internal IDs, file paths, and setting keys are all preserved._

### Issues Found

- None.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Generation (Test Designer, 2026-07-06)

Extended the existing `US_UAT_ACT_SESSIONS` chain (`us_uat_sessions_feature.rst`
/ `req_uat_sessions_feature.rst` / `spec_uat_sessions_feature.rst`, T-1..T-11)
rather than creating a new UAT chain — this is the story that already owns
`REQ_ACT_TREE` coverage (via `REQ_UAT_ACT_TREE`), making it the natural home
for the new terminology-verification scenarios.

**New elements:**
- `US_UAT_ACT_SESSIONS`: new AC-11; new test scenarios T-12/T-13
- `REQ_UAT_ACT_TREE`: new AC-6 (positive — "Actor" labels), AC-7 (negative —
  internal identifiers unchanged)
- `SPEC_UAT_ACT_SCENARIOS`: description updated (ten → thirteen scenarios);
  new T-12/T-13 rows

**Coverage added:**
- T-12: tree view display name "Actors", command titles "Jarvis: New Actor"/
  "Jarvis: Open Actor Chat", settings-group title "Actors" + "Actor"-worded
  setting descriptions
- T-13 (negative test): view ID (`jarvisSessions`), command IDs
  (`jarvis.newSession`/`jarvis.openAgentSession`), setting key
  (`jarvis.sessions.enabled`), and storage path (`.jarvis/sessions/`) all
  verified unchanged — guards against an accidental Phase-2+ scope creep
  into this cosmetic-only CR

No new test-data files were needed — T-12/T-13 reuse the T-2 setup
(existing `copilot-cm`/`dev-feature-x` fixtures already present for this
chain).

**Verification:** `sphinx-build -b html docs docs/_build/html -W --keep-going -E`
— 0 warnings. `get_need_links.py --direction both` spot-checked on
`US_UAT_ACT_SESSIONS`, `REQ_UAT_ACT_TREE` — no dangling links.

No coverage ambiguities encountered.

---

## Documentation Update (Documentation Engineer, 2026-07-06)

Reviewed root `README.md`, `packages/core/README.md`, `packages/suite/README.md`, `.github/copilot-instructions.md`, `.github/skills/*/SKILL.md`, and `.jarvis/sessions/*/context.md` for human-facing "Session"/"Sessions" references meaning the Actor entity kind.

**Changes made:**
- `README.md`: "Project, Event, and Session nodes are expandable..." → "Project, Event, and Actor nodes are expandable...".
- `packages/core/README.md`: Features bullet "**Sessions** — Track your Copilot chat sessions..." → "**Actors** — Track your Copilot chat sessions...".
- `packages/suite/README.md`: "Core — sessions, messaging, reminders, heartbeat, engine" → "Core — actors, messaging, reminders, heartbeat, engine".

**No changes needed:**
- `.github/copilot-instructions.md`, `.github/skills/*/SKILL.md` — no matching references found.
- `.jarvis/sessions/*/context.md` — no matching references found.
- Root `README.md`'s "Message Queue & Session Tools" section, "Open Session"/"Jarvis: Open Chat Session" bullet, and `#listSessions`/`jarvis_createSession` tool references — these describe the genuine VS Code chat-session command (`jarvis.openSession`, unchanged) and internal LM tool names, not the Actor entity kind; correctly out of scope per this CR.
- `jarvis.sessionsFolder`/`jarvis.sessions.enabled` setting-key references in READMEs — internal keys, unchanged per design (Phase 2+).

Sphinx build: 0 warnings.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-06

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed:

1. **Code-vs-Spec** (packages/core/package.json):
   - AC-7 (tree view display name): `views.jarvisActivityBar[0].name = "Actors"` ✓
   - AC-8 (command titles): `jarvis.openAgentSession` title = `"Jarvis: Open Actor Chat"`, `jarvis.newSession` title = `"Jarvis: New Actor"` ✓
   - AC-9 (settings): configuration group title = `"Actors"`, setting description = `"Enable the Actors feature."` ✓
   - Internal identifiers unchanged: view ID `jarvisSessions`, command IDs `jarvis.newSession`/`jarvis.openAgentSession`, setting key `jarvis.sessions.enabled` ✓ (T-13 negative constraint satisfied)
   - Only 5 human-facing strings changed; no functional code touched ✓

2. **Build** (full 5-package TypeScript suite):
   - `npx tsc -p packages/core ; … ; npx tsc -p packages/flow`
   - Result: 0 errors (silent output = clean build)

3. **Tests** (vitest):
   - `npx vitest run`
   - Result: 222/222 tests passed (23 test files), 0 failures

4. **Sphinx**:
   - `python -m sphinx -b html docs docs/_build/html -W --keep-going`
   - Result: "build succeeded" with 0 warnings

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_ACT_TREE: links out = [US_ACT_ACTORS], linked from = [SPEC_ACT_TREE, SPEC_ACT_MANIFEST, SPEC_ACT_TREECLICK, REQ_UAT_ACT_TREE] — bidirectional, 0 dangling ✓
   - Trace Engineer's full 6-element verification (zero dangling links per CM handover): independently confirmed accurate ✓

6. **Documentation**:
   - README.md, packages/core/README.md, packages/suite/README.md all updated to "Actors" ✓
   - No internal key or storage path references changed ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
