# Change Document: touched-files-created-files

**Status**: closed — not reproducible
**Branch**: feature/touched-files-created-files
**Created**: 2026-08-26
**Author**: Project Manager
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

---

## Summary

Bug (backlog item 9): the "Recently Touched Files" tree only shows files the
agent modified, not files the agent newly created. When a user asks an actor
to create a file and then goes to look at it in that entity's "Recently
Touched Files" category, it is missing — even though the file exists on disk
and was clearly touched (created) during that session. Only files that were
edits to a pre-existing file show up. This breaks the feature's own promise
(US_ENT_TOUCHEDFILES: "so I can see at a glance what the agent actually
touched") for the specific and common case of file creation.

Acceptance criteria (user-visible):
- After an actor creates a new file (not just edits an existing one), that
  file appears in the entity's "Recently Touched Files" category the same
  way an edited file would — same position, same behavior (open, copy path,
  remove, reappear-on-re-touch, etc. per the existing feature's rules).
- No regression to existing tracked-edit behavior for pre-existing files.

---

## Investigation Outcome — NOT REPRODUCIBLE

**Closed 2026-08-26 by System Designer, with the user, after live reproduction
attempts on Windows and WSL2. No specification changes were made — Levels 0/1/2
are deliberately empty because there is nothing to specify.**

### The reported cause does not hold

The CR states that newly created files "never appear" and directs the fix at
"where file-create events are observed (or not)". Both parts are false:

| Claim | Finding |
|---|---|
| Create events are not observed | `create_file` has been in `TOUCH_RULES` since the feature's **original** commit `a9901d8` (`git log -S`). It was never absent. |
| Created files never appear | Verified present in live state for three actors, as write-only entries (`lastEdited` set, `lastRead` empty — the pure-create signature): `testdata/kanban/sample-with-textfield.kanban.yaml`, `packages/kanban/assets/instructions/jarvis-kanban.yaml.instructions.md`, and four `docs/changes/tst-*.md`. |
| The display filters drop them | They do not. `withinWindow` guards missing timestamps (`entry.lastEdited ? … : 0`) and defaults to no limit (`windowDays` 0); `probeEntries` retains anything that exists on disk. |

### Live reproduction

Created `the-brown-fox.md` in the workspace root with `create_file` against an
empty store. The store was recreated containing exactly that file:

```json
"file:///c:/workspace/jarvis/the-brown-fox.md": {
  "rootUri": "file:///c:/workspace/jarvis",
  "relPath": "the-brown-fox.md",
  "lastEdited": "2026-08-26T12:49:48.665Z"
}
```

The user confirmed it rendered in the entity's "Recently Touched Files"
category, and separately confirmed the same works under WSL2. Tracking and
rendering are both sound.

### Corpus check

Every file added to the repository since 2026-08-24 — 35 files — is tracked by
at least one actor. Zero misses.

### Why the report was still worth making

The behaviour is real; the diagnosis was not. `TOUCH_RULES` is a **closed list
of four tool names**, and `REQ_ENT_TOUCHEDFILES` AC-2d deliberately forbids a
path-sniffing fallback for anything else. That is a sound decision. What is not
sound is that the rejection is **silent**: `if (!rule) { return; }` emits no log
at any level. So a write performed by any tool outside the list — an
edit-family tool such as `insert_edit_into_file`/`apply_patch` (present for some
models and VS Code versions but not in this session's tool set), or any
`run_in_terminal` write such as `scripts/new-change.mjs`'s `writeFileSync` — is
discarded with no trace.

A closed allowlist against a tool surface that varies by model and version will
drift. The defect is not the list's contents; it is that the system cannot
report when the list is wrong, which is why this surfaced as a user bug report
instead of a log line.

**Recommended follow-up (PM, new backlog item — not this CR):** log unmatched
`tool_name`s at debug, deduplicated per session, before extending the allowlist.
Observability first is the reversible order: it costs no behaviour change and
produces the evidence needed to extend the list from fact rather than from
guesses at VS Code's tool names, which would go stale again.

### Disposition

- No spec elements created, modified, or approved.
- No code changed.
- `US_ENT_TOUCHEDFILES` is **not** in breach — its promise holds for every
  creation route that is a tracked tool call.
- Backlog item 9 should be closed as not reproducible; the observability gap
  above should be filed separately.

---

## Level 0: User Stories

**Status**: n/a — CR closed as not reproducible, see Investigation Outcome

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_abc | ... | modified | ... |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_xxx | As a..., I want..., so that... | mandatory |

### Decisions

- Decision 1: ...
- Decision 2: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: n/a — CR closed as not reproducible, see Investigation Outcome

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_abc | US_abc | modified | ... |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_xxx | ... | US_xxx | mandatory |

### Conflicts Detected

- ⚠️ REQ_xxx vs REQ_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: n/a — CR closed as not reproducible, see Investigation Outcome

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_abc | REQ_abc | modified | ... |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_xxx | ... | REQ_abc, REQ_xxx |

### Conflicts Detected

- ⚠️ SPEC_xxx vs SPEC_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: n/a — no spec elements were created or modified, so there is nothing to
check for consistency. See Investigation Outcome.

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_xxx | REQ_xxx | SPEC_xxx | ✅ |
...

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `{artefact name}` | {files + lines fixed / none} | {files + lines fixed / none} | {count — acceptable historic stranding} |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: ...
- [ ] Issue 2: ...

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-08-26

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L? | {ID} | {description} | high / medium / low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now / defer / accept-as-is | {rationale} |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
