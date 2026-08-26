# Lessons Learned — Change Manager

- **Change Document belongs on the feature branch** — never commit it to develop directly
- **Merge only after explicit UAT PASS** — never merge implementation before UAT completes
- **Delegate design to syspilot.design** — CM never writes specs or RST directly
- **Create Change Document before any engineering** — first artifact, captures intent and decisions
- **MECE agent cannot self-commit** — CM appends the MECE log entry via PowerShell `Add-Content`
  and commits it, then continues the workflow
- **Release back-merge may surface stale change-doc paths** — after release, the
  back-merge of `main → develop` can reintroduce paths that were archived on main but
  still live on develop; Release Engineer cleans up with `git rm` + a cleanup commit
- **ESLint v9 lint failure is pre-existing** — known issue, deferred post-release; do
  not block CRs on it
- **CR intent gate applies in every mode** — never skip clarifying raw implementation
  detail into intent. `user-guided`/`autonomous`: agree with the user (direct ask;
  autonomous does not route that ask through CM as middleman). `unattended`: flag
  `USER REVIEW REQUIRED`, KISS reversible formulation in the CD, keep moving
- **Three Operation Modes** (template + agent, 2026-07-31) — `user-guided` (gates),
  `autonomous` (no routine gates; genuine uncertainty → actor asks user directly,
  pauses only own step), `unattended` (user unreachable; flag in CD + KISS path;
  PM reviews flags later; decision ownership stays with the acting actor)
- **Fix small clerical issues directly** — typos, MECE-log appends; full delegation
  is overkill for one-line fixes
- **US→US :links: is an anti-pattern** — sibling User Stories must not cross-link via `:links:`
  (flagged twice by QM: marketplace-publish F-1, extension-pkg-contract F-1)
- **Architecture concept before feature spec** — when implementing a feature, pause and check
  whether the underlying pattern is already captured as an architecture-level spec element.
  If not, create the concept spec (e.g. `SPEC_REL_PKGCONTRACT`) in the same CR so the pattern
  is repeatable and future modules just link to it rather than re-specifying it from scratch.
  Apply this even when the PM CR targets a specific feature — the architecture gap is in scope.
- **Never instruct one engineer to dispatch directly to another** — even when asking System
  Designer to "hand off to Dev Engineer" seems efficient, it breaks Engineer Isolation. When
  this slips through anyway (engineer dispatches directly despite correction), do not send a
  duplicate/conflicting task — wait for the acting engineer's report, then resume normal
  CM-mediated handoff for the next step.
- **Deprecated spec stubs are not a permanent artefact** — "keep a deprecated stub so
  links don't break" is circular: if a live element still points to a superseded ID, that
  reference is the defect to fix (repoint it), not a reason to preserve the old ID. Once all
  consumers are repointed (mandatory in the same CR per the Artefakt-Removal Rule), delete the
  superseded element outright — git history is the record of what used to exist, not a
  deprecated stub in the live spec tree. Only exception: class (c) historic Change Document
  prose (plain text, not a live sphinx-needs directive) — that's accepted stranding already,
  nothing to fix.
- **Verify Engineer runs BEFORE QM, not after** — `val-<name>.md` on the feature branch
  is a CM gate. CM dispatches Verify Engineer after Dev, waits for the report, then notifies
  QM. A missing report is a CM blocker; do not let QM discover it at Release Engineer time.
- **Verification must build the full package suite, not just the touched package** —
  Dev Engineer's single-package check is not sufficient before reporting "verify phase ready".
  Run the full monorepo build (`npm run compile` / "compile all" task) so cross-package type
  breakage is caught before QM, not after. Applies even when the CR only appears to touch
  one package — dependents may still be affected.
- **Package-local schema copy is mandatory — never workspace-relative** — when a new
  package needs a JSON schema for validation or yamlValidation, the schema MUST live inside
  the package (e.g. `packages/kanban/schemas/kanban.schema.json`), not only at the repo root
  `schemas/`. `loadSchema()` must resolve via `context.extensionPath`, not
  `vscode.workspace.workspaceFolders[0]`. Root `schemas/` is for tooling/docs only. SD must
  mandate this in both SPEC_*_SCHEMA and SPEC_*_MODULE. Precedent: `packages/core/schemas/session.schema.json`.
- **Always enumerate commits from git log before each QM round request** — reconstructing
  the commit list from memory leads to incomplete round summaries (missed this twice in CR #46).
  Before sending a QM review request, run `git log <last-qm-commit>..HEAD --oneline` and
  list every commit explicitly. This prevents "undisclosed commit" findings that erode QM trust.
- **SD is the spec's single source of truth — never dictate spec content in a CM message** —
  CM messages to SD must state *what* to investigate (affected spec IDs, bug description,
  desired behavior) but never prescribe AC text, code blocks, or wording. SD reads the
  current specs independently and formulates changes. Dictating spec content in the CM
  message creates drift: SD translates CM's interpretation instead of reasoning from the
  spec itself. Consequence: SD must always finish and commit before Dev starts — no
  parallel SD+Dev dispatch.
- **Always verify intake claims against code + specs before designing** — two of three items in a CR intake were materially wrong (one inverted, one already implemented); SD caught both by reading the code before designing. CM should flag this class of error in the intake so PM's CR formulation path can be improved.
- **Syncing code to a spec sample is wrong when the sample itself is wrong** — when a QM finding says "spec code block doesn't match code", the correct fix is to verify which one is right first. Syncing code to a wrong sample produces a regression. Dev must confirm the spec sample is correct before changing code to match it; if the sample is wrong, fix the sample.
- **Concurrent actors on a shared working tree can silently branch-switch each other** —
  when SD and Dev work in the same repo working tree, a branch checkout by one session
  moves uncommitted edits from the other onto the wrong branch. Sequence actors on the
  same CR strictly (SD done + committed before Dev starts); do not overlap writes to the
  same working tree.
- **Engineers are dispatched via `jarvis_sendMessage`, never `runSubagent`** — SEND
  to a persistent actor session (own identity, memory, isolation) per the CM agent
  file ("you SEND work to specialized engineers"). `runSubagent` is stateless and
  breaks Engineer Isolation and auditability; never use it for CR engineering steps.
