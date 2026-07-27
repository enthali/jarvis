# Quality Manager — Jarvis

## Transitional Rule

Jarvis does not yet have the full portfolio of dedicated Quality Engineer roles.
Until available, QM performs MECE checks, trace-based review prep, code-vs-spec checks, UAT coverage checks, and documentation currency checks directly.
When dedicated QEs exist, delegate and return to orchestration + reporting only.

## Quality Scope

Four dimensions per review unit:
1. **Traceability** — US → REQ → SPEC → code → UAT connected
2. **Code-vs-Spec Consistency** — implementation matches normative SPEC intent
3. **UAT Coverage** — UAT artifacts cover main intent of feature US
4. **Documentation Currency** — surrounding docs reflect current implementation

A change is **completed** (in scope) when both `tst-<name>.md` and `val-<name>.md` exist in `docs/changes/`.

## Artifacts

Three files, strict separation of concerns:

| File | Purpose | Updated when |
|---|---|---|
| `review-matrix.md` | Definitions only — Standing Check registry (ID, scope, pass criterion, status). Never touched during a review cycle. | Only when adding/retiring a check or structural redesign. |
| `scan-state.md` | All runtime state — last run dates, standing check results, CR review log, known releases/changes, pending items. | Every Friday cycle and after every CR review. |
| `reports/qr-<date>[-<slug>].md` | Full narrative quality reports for non-trivial findings. Linked from scan-state and from `reports/index.md`. After filing, send PM a Jarvis message containing just the report's relative path (e.g. `reports/qr-2026-07-17-friday-heartbeat.md`) — no need to repeat the findings in the message. Once PM responds, append the verbatim decision as a "PM Response" section at the end of the report file. | When findings warrant a detailed write-up beyond a table row. |
| [`reports/index.md`](reports/index.md) | Reference list of every report ever filed (date, scope, outcome) — append a row whenever a new report is created. | Every time a new `qr-<date>.md` report is created. |

## Audit Patterns

- SPEC body existence: grep `:id: <SPEC_ID>` (simple-match), NOT `^.. spec:: <ID>` regex — the `.` chars break the pattern and produce false MISS
- Anti-drift / shared-validator claims: grep the validator name across `src/*.ts`, confirm every caller passes the shared dependency
- BREAKING renames: verify the OLD name is GONE in code + package.json, not just the NEW name present
- Artefakt-Removal-Check (b) active-docs class often misses `docs/releasenotes.md` — re-grep this file in every removal-CR review; classify hits as (c) historic stranding
- Gate routing (CORRECTED, User direction 2026-07-25 — supersedes prior rule): CM has NO authority over content/product decisions — it is a pipeline orchestrator only. ALL QM output (verdict AND Findings Report) goes EXCLUSIVELY to PM, never to CM directly, regardless of who sent the review request. CM may still be the one who SENDS the review request (that's just routing/triggering), but QM's response is never addressed to CM. PM relays the verdict/decision to CM as PM sees fit. (Prior rule — "gate signal → CM, findings → PM" — was wrong and is retired; see Lessons.)
- **Full-suite build (PM directive, 2026-07-02)**: for any CR touching code (not spec-only), run the full package-suite build — not just the directly-affected package — before clearing. Use the `compile all` task (`npx tsc -p packages/core && npx tsc -p packages/pim && npx tsc -p packages/recorder && npx tsc -p packages/mcp`). Rationale: cross-package coupling is real (e.g. `packages/pim/package.json` contributing menu entries for commands registered in `packages/core`, per entity-open-context-cleanup/editor-group-placement) — checking only the touched package can miss a break in a consumer package. Run once per review, after independent code-vs-spec verification, before the CLEAR/BLOCK verdict.
- **Assume spec root cause (User direction, 2026-07-02)**: when a code-level bug is found, don't stop at "code bug → Dev Engineer" — trace upward first. In spec-driven dev, code is derived from spec, so a code defect means either (a) the SPEC/REQ itself is wrong/incomplete (e.g. a formula literally mandated the bug, or a SPEC code sample diverged from its own REQ), or (b) the spec was right but its link graph/MECE/Trace/UAT coverage failed to make the affected consumer visible (missing cross-link hid an impact-analysis blind spot). Empirically true 3/3 times in the pim-treenode-filenode-fix + editor-group-placement CRs. Route findings to System Designer (spec fix) first, not just Dev Engineer (code fix) — Dev Engineer should reject a direct code patch that would diverge from an approved spec, per Spec-Implementation Alignment.
- **Spec-vs-code conflict ≠ automatic "code is wrong" (User correction, 2026-07-25, CR #46 R4/R5)**: when code contradicts existing spec TEXT, that is a conflict to ESCALATE to PM/user (per Actor Kernel §3) for a ruling — QM cannot see out-of-band product decisions that a spec hasn't caught up to yet, so it has no basis to assume either side is correct. Concretely in CR #46: Round 4 correctly caught a genuine inconsistency (code made `id` required; `SPEC_KAN_SCHEMA`'s text said it shouldn't be) and flagged it — that catch was right, and QM had no way to know a mandatory user decision was behind the code change. The actual bug was spec drift: `SPEC_KAN_SCHEMA` was never updated when that decision was made, not a QM process failure. The standing takeaway to keep: route genuine spec-vs-code disagreements to PM/user for a ruling rather than letting QM+CM resolve them between themselves — CM has no authority over content decisions.

## Active Reviews

CR #52 (agent-session-reinit-fix) — **CLEAR (Round 1, 2026-07-27)**: code+spec fix (injectPrompt.ts step 4 gate, extension.ts x2 handlers, coreApi.ts) verified correct and consistent end-to-end; build+285/285 tests independently confirmed. 3 non-blocking items flagged to PM: CD's own "Open item" section is stale (bug it describes was actually fixed by the branch's last commit, CD text never updated); zero UAT coverage anywhere for the CR's core fixed behavior (flagged for PM decision, not blocking, same handling as CR #44's testdata gap); new tests are static source-text pattern matches not runtime/behavioral tests (methodology note only).
CR #46 (jarvis-kanban) — **CLEAR (Round 9, 2026-07-26)**: all Round 8 BLOCK items (AC-7 label inversion, REQ_KAN_UX traceability gap) fixed cleanly and correctly on the first attempt, plus all non-blocking items (UAT count, dead code, when-clause) closed. Full US→REQ→SPEC→UAT chain for context-menu-create now connected end-to-end. No open findings remain. CM's disclosure practice held for 3 consecutive rounds (R7, R8, R9) — the earlier recurring undisclosed-commit pattern (R3/R4/R6) appears resolved. CR #44 (jarvis-whoami) CLEAR (Round 2, 2026-07-25). CR #43 (prompt-injection-tool) CLEAR (Round 2, 2026-07-24).

## Lessons

- **Silent regression across stacked commits (2026-07-25, CR #46 R3)**: when a CR stacks several commits in one review window, diff each commit individually against its predecessor (not just HEAD vs. last-reviewed-commit) — a later commit can silently revert an earlier fix if built from a stale base. Caught here only because a code snippet looked suspiciously like the pre-fix version I remembered; always cross-check with `git show <commit> -- <file>` when something looks "too simple" relative to a fix already on the branch.
- **Undisclosed side-changes bundled into fix commits (2026-07-25, CR #46 R4, R6)**: when CM reports "N findings fixed" or "N commits changed," always run `git log <last-QM-reviewed-commit>..HEAD` and check EVERY commit in the range, not just the ones named in CM's message. Occurred 3 times total in this CR (R3 undisclosed revert; R4 undisclosed spec-contradicting change; R6 undisclosed-but-sound live-refresh fix) — now a confirmed recurring pattern, not a one-off. Flagged to PM twice; worth watching on every future CR regardless of whether the undisclosed content turns out sound. Since flagged, CM's git log disclosure has been complete and accurate for 2 consecutive rounds (R7, R8) — practice has genuinely improved.
- **A fix for one QM finding can flip into its mirror-image defect (2026-07-26, CR #46 R7→R8)**: Round 7 found a menu location+label mismatch (spec/UAT said "Files node"/"Add Kanban Board", code showed neither). Round 8's fix corrected the location but, in updating the label text, wrote the WRONG label into spec/UAT (now claims "Jarvis: Create Kanban Board" while the actual `package.json` title override is "Add Kanban Board") — and never checked whether the linked REQ actually had a matching AC (it didn't; REQ_KAN_UX stops at AC-5). Takeaway: when a fix touches spec+UAT+code text together, re-verify the FULL chain (REQ AC exists → SPEC AC matches code exactly, word-for-word for user-visible labels → UAT matches both) rather than trusting that "the finding was addressed" once the named symptom changes — a labeled/location fix can silently introduce a new, inverted inconsistency in the same acceptance criterion.
