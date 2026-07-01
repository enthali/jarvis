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
- **CR intent gate applies in every mode** — autonomous does not skip clarification
  when a CR contains implementation details; clarify with the user first
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
