# Change Contract: uat-status-model-cleanup

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-17<br>
- **Operation Mode**: autonomous — artifact owners decide within approved scope; the Architect resolves ontology, status-semantics, and migration-scope decisions interactively with the User and pauses specification completion until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-17 | 13:33 CET | Project Manager | Architect | Contract release approved; product Root, all Story Needs, module model, and UAT/status model are in scope; details remain open. |
| 2026-11-18 | 00:54 CET | Architect | Admin | Ontology moved to `docs/Jarvis Ontology/` with Root, modules and `ac`; 103 `ac` replace the 60 UAT Needs; Needs check specified; the skills and `change.md` still name the old ontology. |
| 2026-11-18 | 01:20 CET | Admin | Developer | Skills work unchanged with `--ontology` on the new types and links; `change.md` updated; no CI wiring, because feature branches stay local and CI never sees them. Needs check script is yours. |
| 2026-11-18 | 01:35 CET | Developer | Tester | `scripts/check_contract_needs.py` and its 13 unit tests done; a real run against `development` works (16 s) and flags 106 Needs, as expected. Documentation Impact (Technical Writer) is still pending. |
| 2026-11-18 | 02:10 | Tester | Developer | Test design done; 3 new Needs-check tests fail on F-1 (a Decision containing "delegat" counts as delegation, even "did not delegate"); fix `validation_is_settled`. Technical Writer's Documentation Impact is still pending; 103 `ac` are well-formed but not executed. |
| 2026-11-18 | 01:05 CET | Developer | Technical Writer | F-1 fixed: only a value opening with `accepted` or `explicit User delegation` settles User Validation; 21 script tests pass. Documentation Impact is the remaining open row before Quality. |
| 2026-11-18 | 01:20 CET | Technical Writer | Quality | Removed the dead `US_UAT_MSG` T-22 mention from the Core guide and Core README; no other user-facing document cites UAT IDs; Quality review is open. |
| 2026-11-18 | 01:30 CET | Technical Writer | Quality | F-1 fixed: Documentation Impact Status set to `complete`. |
| 2026-11-18 | 01:40 CET | Quality | Project Manager | Quality Review is `proceed`, Open Findings `None`, at 73732168. The 103 `ac` are `approved` and unexecuted and the Needs check exits 1 until statuses are set and User validation names or delegates them; the User decides that at validation. |
| 2026-11-18 | 01:30 CET | Quality | Technical Writer | Review at cb39f5ff is `blocked` by one Contract inconsistency: the Documentation Impact section `Status` still reads `pending` (F-1). Everything else passes; set it to `complete` and hand back. |
| 2026-11-18 | 19:15 CET | Project Manager | Architect | User agreed to technical verification for scenario 2 and personal validation for scenarios 1 and 3. Align the specification and test design with that split. The Needs-check migration rule is still open. |
| 2026-11-18 | 19:30 CET | Architect | Developer | Needs-check rule settled with the User: `ac` is `verified` only when the Contract names it, else `approved`; `story` named in User validation; delegation wording fixed (`REQ_REL_NEEDSCHECK` AC-3 to AC-8). 103 `ac` merged into 38 journeys, minus what tests already assert. The script and its tests still implement the old rule. Tester's Test Design rows and Quality's `proceed` predate this change. |
| 2026-11-18 | 19:45 CET | Developer | Tester | Script and tests follow `REQ_REL_NEEDSCHECK` AC-3 to AC-6; 24 tests pass; the real run flags 8 lines, as predicted. I changed one expectation in your adversarial file (draft story: AC-3 and AC-4, no longer AC-5). Phase-1 execution and your Test Design rows for the 38-journey split are open. |
| 2026-11-18 | 20:00 CET | Tester | Quality | Test Design rows updated for the 38 journeys; format test and 24 script tests pass. `AC_ACTOR_PHASE1_SECOND` is not executed: it needs a live EDH, Quality runs it for Test Execution. Scenarios 1 and 3 stay with the User. |
| 2026-11-18 | 20:30 CET | Quality | Project Manager | Review at c7653a88 is `blocked` by F-2 only: `AC_ACTOR_PHASE1_SECOND` needs a live Extension Development Host session that Quality cannot drive; it is not executed and not named in Test Execution. Everything else passes. Decide who runs it (User at validation, or someone with an EDH) or move it to User validation. |
| 2026-11-18 | 20:43 CET | Project Manager | Quality | The User ran F-2 as the desktop operator and reported all four checks passed on VS Code 1.146.0; the exact tested commit was not confirmed. This is technical test evidence, not User acceptance. |
| 2026-11-18 | 21:00 CET | Quality | Project Manager | Quality Review is `proceed`, Open Findings `None`, at d540e3ef. F-2 is closed on the User's reported desktop run (tested commit unconfirmed, but the branch changes no extension code against its merge base). The Architect sets `AC_ACTOR_PHASE1_SECOND` to `verified` because the Contract now names it in Test Execution; the Needs check stays red until then and until User validation of scenarios 1 and 3. |
| 2026-11-18 | 20:50 CET | Project Manager | Architect | User confirmed scenarios 1 and 3 passed. Quality accepted the technical evidence for scenario 2. Need statuses and the integration check remain open. |
| 2026-11-18 | 21:15 CET | Architect | Project Manager | Needs set to `verified` at ea28f07d (Needs-check Needs, three Phase-1 `ac`). The check now exits 1 on one line only: `US_REL_GITWORKFLOW` is a changed story the User has not named in User Validation. Ask the User to name it or decide a delegation; I do not edit that section. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** The User selected the UAT/status-model bundle, kept PIM categories open, approved Architect-led interactive specification, and chose to include one product-wide Root, a module model, and links from all Story Needs in this Change.

### Goal

Define a coherent UAT model and status vocabulary, reconcile the relevant existing UAT artifacts and status evidence, and establish one product-wide Root for the Jarvis VS Code extension with a defined representation of its modules and a membership link from every Story Need.

### Value

Actors can create, review, and interpret UAT artifacts consistently, distinguish Quality's technical verification from the User's validation, and navigate complete product and module coverage from one traceable Root.

### Scope

Use the completed Syspilot process migration as the baseline and address the remaining UAT/status-model work in #40, #48, and #69, coordinating #55. Build a reviewed inventory of still-relevant legacy UAT artifacts and record an explicit disposition for each; use the approved migration mapping to make targeted status updates. Treat the rejected scripted UAT cases as historical, non-acceptance evidence, and validate the agreed Phase-1 Actor procedure: create an Actor, delete its chat session, reopen it and confirm a special word from `context.md`; create a second Actor; send a message between them.

Establish one Root for the full Jarvis VS Code extension, decide how its modules are represented, and connect every existing Story Need to that Root. The current source inventory contains 100 Story Needs, including 30 `US_UAT_*` Needs; confirm the inventory before migration. Keep PIM category decision #23 in its separate open track. Specify each status's meaning, owner, required evidence, and allowed transitions, explicitly distinguishing Quality's `verified` technical evidence from the User's validation decision. The Architect and User settle the exact Root, module, link, and UAT model, and approve any new status or migration mapping before implementation.

Use the Example Ontology as a design reference and adopt only the product Root/membership model and UAT-specific modeling required for these outcomes; assess additional graph-wide types, relation families, or validation rules separately with explicit rationale and approval.

### Observable Outcome

The approved specification records the UAT artifact model, status semantics and ownership, evidence for each transition, module representation, and the product Root's membership relationship. Every existing Story Need is linked according to the approved model, every in-scope legacy UAT artifact has an explicit disposition, and focused tests and Quality review verify conformance before the User validates the Actor UAT procedure.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User explicitly approved Contract release via the approval form on 2026-11-17; set by the User only | approved |
| Version control | yes | Project Manager | Needs check passed at `16a458c9`; squash-integrated into `development` at `6e8352c0`; the feature branch is retained | merged |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes | User | User confirmed Phase-1 scenarios 1 and 3 passed; see User Validation. | accepted |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

Structure, statuses and validation were settled with the User in an interactive session. The Jarvis Ontology (`docs/Jarvis Ontology/ontology.toml`, described in `ontology.md`) is the normative result; this section lists what changed and why.

| Artifact | Change | Rationale |
|---|---|---|
| `docs/Jarvis Ontology/ontology.toml`, `ontology.md` | modify, move (from `docs/jarvis-ontology.toml`) | Follows the Syspilot convention of one ontology folder with a hand-written reference. New types `root`, `mod`, `ac`; links `tracked_by`, `relates_to`, `validates`; three warnings and six link schemas. The status enum is unchanged. |
| `docs/conf.py`, `.gitignore` | modify | New ontology path; the `needs.deprecated` warning is suppressed because extra links raise it under `-W` (Syspilot does the same). The old `.gitignore` exception is removed. |
| `ROOT_JARVIS`, `MOD_ACTOR`, `MOD_MESSAGING`, `MOD_AUTOMATION`, `MOD_CONFIG`, `MOD_KANBAN`, `MOD_PIM`, `MOD_RECORDER`, `MOD_FLOW`, `MOD_DISTRIBUTION`, `MOD_DEV` (`docs/product/index.rst`) | add | One product Root and ten modules, so impact analysis can start at a module instead of the whole story list. The type directive is `mod` because `module` collides with the Sphinx Python domain. |
| 70 feature `US_*` Needs in 14 `docs/userstories/us_*.rst` files | modify | Each carries `:tracked_by:` to exactly one module. A story needs no `ac`. |
| 38 `AC_*` Needs in `docs/acceptance/ac_*.rst` (+ `index.rst`) | add | Journeys, not single checks: one `ac` is a Given plus numbered When/Then steps that a person walks in one sitting. They were merged from 103 single criteria after a coverage check (no one of the 103 was fully covered by an existing test, about half were partly covered at component level) and after dropping every observation a unit or requirement test already asserts (the dropped items are listed in the Quality-relevant notes below). Each `:validates:` the feature stories it touches. Status `approved`. |
| 30 `US_UAT_*`, 20 `REQ_UAT_*`, 20 `SPEC_UAT_*` Needs (60 files incl. their indexes) | remove | The User confirmed they are test specifications written in story format. Deterministic checks and corner cases belong to requirement-level tests; the removed Needs stay in git history and the disposition table below. |
| `US_REL_GITWORKFLOW` AC-6, `REQ_REL_NEEDSCHECK`, `SPEC_REL_NEEDSCHECK` | add (AC-6), add | The pre-merge check: changed Needs must have the status their type requires; a changed `story` is named in the Contract's User validation; a changed `ac` is `verified` when the Contract names it (User validation or Quality's Test Execution) and `approved` otherwise. `US_REL_GITWORKFLOW` went from `implemented` to `approved` while AC-6 was unimplemented and is `verified` since ea28f07d. |
| `docs/namingconventions.rst`, `docs/index.rst`, `userstories/`, `requirements/`, `design/` indexes | modify | `UAT` theme replaced by `AC`; new product and acceptance pages; legacy toctree entries removed. |

| Decision or check | Evidence |
|---|---|
| Structure is Root → Module → Story, a tree. A cross-module dependency is a `relates_to` from the dependent story to the story it depends on, with no back-link. | `ontology.md`; no `relates_to` links were added now because no dependency was found that story→req→spec links do not already carry. |
| User validation is recorded only in this Contract, not as a status. Sphinx statuses end at `verified`; `verified` is technical evidence only (for an `ac`: Tester or Quality executed the scenario and recorded the result). | `ontology.md` Statuses table; the User chose no new status. |
| The Contract is transactional, so a script checks the Needs against it before merge. A changed `ac` must be `verified` only if the Contract names it; otherwise it stays `approved` (defined, not run). A changed `story` is named in User validation. | `REQ_REL_NEEDSCHECK` AC-3 to AC-6, `SPEC_REL_NEEDSCHECK` steps 4 and 5, `ontology.md` Validation. Reason: requiring every `ac` to be run for every change makes the check unreachable (the User saw this with 103 criteria); the Contract decides what it executes, and the check only refuses a `verified` that the Contract does not back. |
| "Explicit delegation" | The User Validation status line, or a `Status:` or `Decision:` line of that section, opens with `accepted` or `explicit User delegation`, after an optional `not applicable:`. A value that opens otherwise (`pending`, `changes requested`, "did not delegate") does not count. | `REQ_REL_NEEDSCHECK` AC-6, `SPEC_REL_NEEDSCHECK` step 4. Settles the Developer's wording and Tester F-1; the Developer's implementation already matches. |
| Phase-1 split | Scenarios 1 and 3 (`AC_ACTOR_PHASE1_MEMORY`, `AC_ACTOR_PHASE1_MESSAGE`) are named in User validation; scenario 2 (`AC_ACTOR_PHASE1_SECOND`) is technical verification by Tester or Quality and is named in Quality's Test Execution. Creating Beta is the Given of scenario 3. | `ac_actor_phase1.rst`. |
| Merge of 103 into 38 journeys | Done after a read-only coverage check of the 103 against the 63 test files and after removing observations already asserted by tests. | See the table of dropped observations below. |
| Strict build `python -m sphinx -W --keep-going -b html . <tmp> -q` in `docs/` | exit 0, no warnings, at the commit named in the handover. |
| Dangling references to removed UAT IDs | None in the specification. Plain-text mentions remain in `docs/user guides/core.md:58` and `packages/core/README.md:55` (Documentation impact), `docs/releasenotes.md` and `docs/changes/**` (history, unchanged). |

Disposition of the 30 legacy `US_UAT_*` stories (all removed; per-story left-out lists were reported by the migration and every item was either folded into an `ac`, named as owned by an existing `REQ_`/`SPEC_`, or retired):

| Legacy stories | Disposition | `ac` file (count) |
|---|---|---|
| ACTOR_IDENTITY, ACTOR_AGENT, ACTOR_CREATE, ACTOR_CREATETOOL, ACTOR_FILES_TREE | migrated | `ac_actor_identity` (3) |
| ACTOR_LISTTOOL | retired: expects an `agent` field the tool no longer returns; the real owner is `US_COM_FIND` | none |
| ACTOR_MAIL | migrated | `ac_actor_mail` (2) |
| EXP_OPENFILE | migrated with the stale setup replaced by the fixed `.jarvis/` paths | `ac_tree_node_open_file` (1) |
| SELFUPDATE | migrated | `ac_selfupdate` (2) |
| (Contract Phase-1 Actor procedure, not a legacy story) | added | `ac_actor_phase1` (3) |
| MSG_AUTODELIVERY | migrated; its "Retired" paragraph describes tests `REQ_COM_OPEN` AC-4 removed | `ac_autodelivery` (1) |
| MSG | partly migrated | `ac_msgqueue` (3) |
| MSG_LOGGING | migrated | `ac_messagelogging` (1) |
| MCPSERVER | migrated | `ac_mcpserver` (1) |
| FLOW | migrated | `ac_flow` (2) |
| HEARTBEAT, HEARTBEATVIEW, JOBREG | migrated | `ac_heartbeat` (4) |
| HEARTBEAT_PAUSE | migrated | `ac_heartbeat_pause` (1) |
| LISTJOBS | migrated | `ac_listjobs` (1) |
| REMINDERS | migrated | `ac_reminders` (2) |
| KAN_MGMT | partly migrated | `ac_kanban_mgmt` (2) |
| KAN_SKILL | partly migrated; the skill-text inspections became one check of the story's outcome (`AC_KAN_SKILL_AUTHOR`) | `ac_kanban_skill` (2) |
| KAN_UPDATE_VALID | partly migrated | `ac_kanban_update_valid` (1) |
| MOD_ACTORRULES | migrated | `ac_mod_actorrules` (1) |
| SKILL_PROVISION | migrated | `ac_skill_provisioning` (1) |
| CATEGORIES, CATTOOL, CATVIEW, COMBRIDGE, TASKS | migrated; task-tree and "Open in Outlook" scenarios retired (the tree nodes were removed with the Project/Event kinds; `REQ_PIM_TASKEDITOR` AC-4 says the button is not in v1) | `ac_outlookcategories` (4) |

Observations removed from the journeys because a test already asserts them (a journey keeps only what needs the real host, chat/LLM, Outlook, notification, tree or webview UI, reload or human judgement):

| Journey | Removed, tested by |
|---|---|
| `AC_ACTOR_*` identity/create/files | `actor.yaml`/`context.md` contents and no `agent:` field: `actorCreation.test.ts`, `actorRuntime.test.ts` |
| `AC_ACTOR_MAIL_*` | setting off, failed read, read-only Outlook access, no icon before next scan, icon precedence: `actor-mail.test.ts` T-10, T-18..T-22, `actor-mark.test.ts` AC-6; whole old `AC_ACTOR_MAIL_DISABLED` dropped |
| `AC_REL_SELFUPDATE_JOURNEY` | unknown extension neither updated nor removed: `update-install-mapping.test.ts` |
| `AC_AUTODELIVERY_JOURNEY`, `AC_MSG_SEND_JOURNEY` | no second announcement, play counts, send/receive store and order, announcement text without sender text: `actor-message-tools.test.ts`, `ahp-message-path.test.ts` |
| `AC_MSG_CHAT_JOURNEY`, `AC_ACTOR_ACTIVITY_JOURNEY`, `AC_MCPSERVER_JOURNEY`, `AC_FLOW_*` | no second chat, activity timing and icons, MCP status bar item, no new chat on click, 30-entry cap: `ahp-message-path.test.ts`, `ahp-session-state.test.ts`, `actor-mark.test.ts`, `mcp-default.test.ts`, `open-actor-chat.test.ts`, `message-flow-dataservice.test.ts` |
| `AC_HEARTBEAT_*`, `AC_REMINDERS_*` | Python venv auto-detect (whole old `AC_HEARTBEAT_PYTHON_VENV`), stderr bound, rescan-job cleanup, reminder id/`deliverAt`, list shape, cancel result (whole old `AC_REMINDERS_LIST`): `heartbeat-venv-autodetect.test.ts`, `rescan-job-cleanup.test.ts`, `reminder-runtime.test.ts` |
| `AC_KAN_MGMT_*`, `AC_MOD_ACTORRULES_JOURNEY` | add/delete/field handler outcomes, filters, statuses and labels, default `true` and opt-out of the three Actor rule files: `kanban-write-handlers.test.ts`, `kanban-tool-handlers.test.ts`, `actor-autoprovision-default.test.ts` |
| `AC_OLK_SWITCH_JOURNEY` | settings declarations and the category tool error text: `pim-categories-default.test.ts` |

Journeys that are thin after the removal and may be folded by the Tester when it designs the procedure: `AC_KAN_MGMT_READ_JOURNEY` (only the Actor's chat answer remains), `AC_ACTOR_MAIL_OUTLOOK_JOURNEY`, `AC_MOD_ACTORRULES_JOURNEY`, `AC_ACTOR_ACTIVITY_JOURNEY`. `AC_MSGLOG_JOURNEY` expects logging on by default, as `package.json`, `REQ_CFG` and the Core guide say; `REQ_MSG_LOGSETTING` AC-1/AC-2 and `SPEC_MSG` still say default `false` and are stale (for the Project Manager, with the list below).

Behaviour with no requirement or test at its own level. Decision: these are requirement gaps of existing features, not part of the status-model change, so none is specified or retired here. The journeys no longer test them (they were never the point of a journey), and the Project Manager schedules each as its own change with the stale-specification list below:

| Behaviour | Where the gap is |
|---|---|
| Announced message is not announced again; a focused chat tab does not suppress delivery; busy chat waits | `REQ_COM_NOTIFY` AC-4 untested, no requirement for the other two |
| Unknown receiver error; removed tools not offered; Actor files untouched by delivery | `US_COM_SENDER` AC-2 has no `REQ`; only `SPEC_COM_TOOLS` states the others |
| Manual `Update` command on network failure shows no stack trace; release-page fallback | `REQ_REL_UPDATECOMMAND` covers success only; `US_REL_SELFUPDATE` AC-7 has no scenario |
| 3 s wait for the agent-mode command after Actor creation | not stated in a `REQ` |
| `BC-3`: `id` in `changes` rejected | `REQ_KAN_UPDATE` AC-9 has no test (PM card 40) |
| `jarvis_registerJob`/`jarvis_unregisterJob` as tools | no `REQ_AUT_*` for the tool surface |
| Task editor | no UI entry point yet (`US_PIM_TASKS` note) |

Stale specification found during migration, **not changed here** (outside this Contract's scope; for the Project Manager to schedule): `US_CFG_HEARTBEAT` AC-1/AC-2 and `REQ_CFG_HEARTBEATPATH` still describe the removed setting `jarvis.heartbeatConfigFile`; `REQ_MSG_REMINDERS_VIEW` AC-2 gates on the removed `jarvis.messagesFile`; `REQ_MSG_REMINDERS_PERSIST` and the legacy storage wording disagree on the reminders location; `US_MSG_EDITORPLACEMENT` AC-3/AC-5 contradict `REQ_COM_OPEN` AC-4; PIM Needs (`REQ_PIM_CATTOOL`, `SPEC_PIM_CATTOOL`, `REQ_PIM_TASKTOOL`, `REQ_OLK_ENABLE`, `REQ_OLK_TASKENABLE`, `US_OLK_COMBRIDGE`, `US_OLK_TASKS`) use the old names `jarvis_category`, `jarvis_task`, `jarvis.outlookEnabled`; the 14 draft elements of K55 keep their status, unchanged by this work.

Open points:

- Done by the Developer: the script and its tests follow `REQ_REL_NEEDSCHECK` AC-3 to AC-6 (Quality's re-review confirms it).
- Status settings, 2026-11-18 at ea28f07d: `REQ_REL_NEEDSCHECK` and `SPEC_REL_NEEDSCHECK` are `verified` (the script passes its tests and Quality's review is clean); `US_REL_GITWORKFLOW` is `verified` because the Needs that implement it are verified; the three Phase-1 `ac` are `verified` on the User's results (1 and 3) and Quality's Test Execution row (2).
- The Needs check at ea28f07d exits 1 with one line: `US_REL_GITWORKFLOW: REQ_REL_NEEDSCHECK AC-4: not named in the User validation section`. The story is changed (AC-6 added) and the rule requires the User to name every changed story. The User decides: name it in a User Validation row (the observable outcome is that a branch whose changed stories or `ac` are unbacked is refused; the script's red run on this branch before the statuses were set is the evidence), or decide a delegation recorded in that section. The Architect does not edit User Validation.
- The `Jarvis Contracts/change.md` Ontology Binding says the User validation rows name every changed `US_*` and `AC_*` ID; under the rule above they name every changed `story` and the User-validated `ac`, and Test Execution names the technically verified `ac`. The Admin, who owns the template, adjusts the sentence.
- Whether CI runs the Needs check in addition to the Project Manager's gate is left to Admin.

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Skills `syspilot.impact-python`, `syspilot.mece`, `syspilot.trace`, `syspilot.ontology` | The scripts default to `.syspilot/ontology.toml`, which Jarvis does not have, and take the path through `--ontology`; they are Syspilot output, so no edit here. | No change to the skills. Docs built strictly (exit 0, 648 `needs_id` files) at `5479dc8e`; with `--ontology "docs/Jarvis Ontology/ontology.toml" --no-build`: impact on `MOD_KANBAN` lists `ROOT_JARVIS` and six stories via `tracked_by`; impact on `AC_ACTOR_ACTIVITY_ERROR` follows `validates` to `US_ACTOR_ACTIVITY`; MECE `all-type` on `MOD_KANBAN` names the nine other modules, `same-document` on the `ac` its siblings; trace on the `ac` resolves every edge with `source_type`/`target_type`. |
| `docs/Jarvis Contracts/change.md` | Ontology Binding named the old path and no module, `ac` or User-validation rule | Admin owns the contract templates (role card). Binding table now names `root`/`mod`/`story` with `tracked_by`, `ac` in `docs/acceptance/` as validation test, the `--ontology` path and the module as impact start; `User Validation` rows name the changed `US_*`/`AC_*` IDs, as the Needs check parses them (`SPEC_REL_NEEDSCHECK` step 4). |
| CI / merge workflow | `SPEC_REL_NEEDSCHECK` defines a script run before squash integration | Decision: no CI wiring. Feature branches stay local and the only workflows run on `main` (`docs.yml`) and on `v*` tags (`release.yml`), so CI never sees the branch the check needs. The Project Manager runs the script as the last gate. Revisit if feature branches are pushed. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Needs check script | Python `scripts/check_contract_needs.py`, standard library only; Sphinx is called as `python -m sphinx -b needs` | TypeScript tooling | The build is Sphinx and the Needs data is its output; no new dependency. Unit tests use `unittest`, since the repository has no pytest. |
| Same ontology for both builds (`SPEC_REL_NEEDSCHECK` AC-2) | Both builds get `-D needs_from_toml=<head ontology>`, so the merge base builds even though its `conf.py` names the old ontology path | Check out the head ontology into the base worktree | No file in either worktree is edited. |
| Both commits built in temporary git worktrees, Contract read from the head worktree | Uncommitted edits are not seen; worktrees and output are removed on exit | Build the working tree | Matches "documentation of two commits"; the check judges what will be integrated. |
| Exit codes | 0 no violation, 1 violation lines printed as `<ID>: <rule>`, 2 the check could not run | Only 0 and 1 | A broken build must not look like a pass. |
| "Explicit delegation" (`REQ_REL_NEEDSCHECK` AC-6) | The status line, or a `Status:`/`Decision:` line of User Validation, counts when it opens with `accepted` or `explicit User delegation` (optionally after `not applicable:`); a value with `|` or `{...}` is the unfilled template and does not count | Only the status line | Now fixed by `REQ_REL_NEEDSCHECK` AC-6 and `SPEC_REL_NEEDSCHECK` step 4, which also name the `Decision:` line. |
| Rule update (`REQ_REL_NEEDSCHECK` AC-3 to AC-6, 2026-11-18) | `ac` may be `approved`, is `verified` when named in User validation or in the Test Execution subsection and `approved` otherwise; a `story` is named in User validation only; the User validation status is settled whenever a changed `story`/`ac` is named there | Keep the old rule | Architect's settled rule; the Test Execution subsection is parsed up to the next heading, so IDs in other Quality subsections do not count. |
| Behaviour listed under "no requirement or test at its own level" | No code change, no unit test | Add tests | None of them has a requirement at its own level (the table says so), so a unit test would have nothing to trace to. Left for Test design. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `scripts/check_contract_needs.py` | add, then follow the settled rule | `python -m unittest discover scripts` @ this commit: 24 tests pass, one group per rule `REQ_REL_NEEDSCHECK` AC-2 to AC-6 |
| `scripts/test_check_contract_needs.py`, `scripts/test_check_contract_needs_adversarial.py` | rules AC-3 to AC-6 rewritten to the settled rule; in the adversarial file one expectation changed (a draft story unnamed now violates AC-3 and AC-4, no longer AC-5) | as above |
| Real run | `python scripts/check_contract_needs.py` on this branch against `development` | Exit 1, 8 lines, as the Architect predicted: `REQ_REL_NEEDSCHECK`, `SPEC_REL_NEEDSCHECK` (AC-3) and `US_REL_GITWORKFLOW` (AC-3, AC-4) still `approved` and unnamed; `AC_ACTOR_PHASE1_MEMORY` and `AC_ACTOR_PHASE1_MESSAGE` are `approved` but named in User validation (AC-5, AC-6). `AC_ACTOR_PHASE1_SECOND` passes only until it is named in Test Execution, then it needs `verified`. No worktree or temp directory remains. |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| The 38 `AC_*` journeys are complete scenarios: unique `AC_` ids, `:validates:` an existing story, Given/When/Then in order (38 found; the test is count-independent) | system | `docs/acceptance/`, `US_REL_GITWORKFLOW` | `src/tests/acceptance-criteria-format.test.ts` (5 pass) |
| Phase-1 scenario 2 `AC_ACTOR_PHASE1_SECOND` (technical): in a disposable EDH, create Alpha and Beta; both listed in ACTORS, each node opens its own chat, Beta's `context.md` lacks Alpha's special word; record result and date in Quality's Test Execution, then Architect sets `verified` | validation | `AC_ACTOR_PHASE1_SECOND`, `US_ACTOR_CREATE` | `docs/acceptance/ac_actor_phase1.rst`; **not executed**: needs a live Extension Development Host, which I cannot run; Quality executes it |
| Phase-1 scenarios 1 and 3 (`AC_ACTOR_PHASE1_MEMORY`, `_MESSAGE`) | validation | `US_ACTOR_ACTORS`, `US_COM_SEND`, `US_COM_DELIVERY` | User executes and names them in User validation; Tester does not set them `verified` |
| The other 35 journeys | validation | `AC_*` | stay `approved` and unnamed, per `REQ_REL_NEEDSCHECK`; no execution in this Contract |
| Needs check: rules AC-2..AC-6 from the requirement, adversarial cases (delegation wording, `<br>` status line, id prefix, missing section, violation line format) | system | `REQ_REL_NEEDSCHECK` AC-3..AC-6 | `scripts/test_check_contract_needs_adversarial.py`; `python -m unittest discover scripts`: 24 tests pass (F-1 resolved) |
| `id` in `changes` of `jarvis_updateKanbanItem` is rejected and the board is unchanged (BC-3) | system | `REQ_KAN_UPDATE` AC-9, AC-10 | `src/tests/kanban-write-handlers.test.ts` T-6e (26 pass) |
| Announcement never interrupts a running turn | system | `REQ_COM_NOTIFY` AC-4 | already covered: `ahp-message-path.test.ts` "never uses turnStarted" plus the queued kind; that the host holds a queued message until the chat is idle is host behaviour, checked only in an EDH run |

**Finding F-1 (resolved by the Developer, `validation_is_settled`):** a `Status` or `Decision` value counts only when it opens with `accepted` or `explicit User delegation` (optionally after `not applicable:`), so "did not delegate", "no delegation was given" and "not delegated" no longer settle the section. `REQ_REL_NEEDSCHECK` AC-5 leaves "explicit delegation" open, so the Architect should state the accepted wording.

**Gaps with no requirement, so no test can be traced (Architect to specify or retire):** unknown receiver error, removed tools not offered and Actor files untouched by delivery (`US_COM_SENDER` AC-2); manual `Update` on network failure and release-page fallback (`US_REL_SELFUPDATE` AC-7); the 3 s agent-mode wait after Actor creation; `jarvis_registerJob`/`jarvis_unregisterJob` tool surface. The "announced again" and "focused tab" cases of `REQ_COM_NOTIFY` have no requirement either.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/core.md` (line 58), `packages/core/README.md` (line 55) | Mention `US_UAT_MSG` T-22, a removed ID; reword without it | done, this commit; the statement itself (scenarios not run) is unchanged |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at d540e3ef. Open Findings is `None`. F-2 is closed on the User's reported desktop run (below); the rest of the review stands from c7653a88, and no `packages`, `src`, `scripts` or specification file changed after it.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base 05cbbca4 | 11 commits, 117 files: ontology, 103 `ac`, 70 story links, 60 removed UAT files, script, tests, template, docs | Non-document changes are the ontology move, `conf.py`, `.gitignore`, the template, `scripts/` (3 files), 2 test files and one README line; no `packages/*/src` change | None | none |
| Graph integrity from a `needs` build (re-run at c7653a88) | all Needs of types root, mod, story, ac | 1 root, 10 `mod`, 70 stories, 38 `ac`; every story has exactly one `tracked_by`, a `mod`; every `ac` validates only stories, contains Given, When and Then, and is `approved`; no reference to removed UAT IDs outside history | None | Untyped `:links:` between story, requirement and spec are not typed |
| Dangling references to removed IDs | `git grep` for `US_UAT`, `REQ_UAT`, `SPEC_UAT`, `AC_UAT` and the old ontology path outside history | Only `docs/releases/*` and `docs/changes/*` remain (history) | None | none |
| Needs check script against its requirement | `scripts/check_contract_needs.py` against `REQ_REL_NEEDSCHECK` AC-1..AC-7 and `SPEC_REL_NEEDSCHECK` | Code read; rules AC-2..AC-6 match; real run against `development` exits 1 and names 106 Needs, as the Contract expects; no worktree or file left behind | Observation: the script also accepts the `Decision:` line as User validation, which `SPEC_REL_NEEDSCHECK` step 4 does not name (the Developer and Tester already raised it for the Architect) | The 103 `ac` are `approved` and unexecuted; the User decides at validation whether to name or delegate them |
| Mutation checks | `src/tests/kanban-write-handlers.test.ts` T-6e | With the `'id' in values` guard disabled in `packages/kanban/src/extension.ts`, 2 of 26 tests fail; file restored with `git checkout --` | None | none |
| Documentation | Core guide, Core README, Contract Documentation Impact | The dead `US_UAT_MSG` mention is gone; section `Status` is now `complete`, in line with its row and the artifact table | None (F-1 fixed and confirmed at 73732168) | Wording acceptance is User validation |
| Re-review of the 38-journey split and the settled rule | `git diff 13c57cd4 c7653a88`: 20 `ac` files, ontology.md, REQ/SPEC_REL_NEEDSCHECK, `US_REL_GITWORKFLOW`, script and its tests | The script follows `REQ_REL_NEEDSCHECK` AC-3..AC-6 (a changed `ac` is `verified` when the Contract names it in User validation or Test Execution, else `approved`; a changed story is named in User validation; settled wording from the status or Decision line); the dropped observations are tied to named tests | None | The 38 journeys are not executed; the User decides at validation. `AC_ACTOR_PHASE1_SECOND` is named in the next row and so needs `verified` from the Architect |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ cb39f5ff | pass |
| Lint | `npm run lint` @ cb39f5ff | pass: 0 errors, 163 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ cb39f5ff | pass: 63 files, 694 tests |
| Needs-check script unit tests | `python -m unittest discover scripts` @ c7653a88 | pass: 24 tests |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html` @ cb39f5ff | pass |
| Needs check, real run | `python scripts/check_contract_needs.py` @ c7653a88 | exit 1, 8 lines, as predicted: `REQ_REL_NEEDSCHECK`, `SPEC_REL_NEEDSCHECK` (AC-3) and `US_REL_GITWORKFLOW` (AC-3, AC-4) still `approved`; the two Phase-1 journeys named in User validation are `approved` and the validation is `pending` (AC-5, AC-6); expected until User validation and the Architect's statuses |
| VSIX packaging | `Build-Vsix.ps1` @ cb39f5ff | pass: six VSIXs at 0.33.0 (a README line changed) |
| Re-run of build, lint, suite, strict docs | `npm run compile:packages`, `npm run lint`, `npx vitest run --testTimeout 15000`, `python -m sphinx -W --keep-going -b html docs docs/_build/html` @ c7653a88 | pass: 0 lint errors, 163 warnings; 63 files, 694 tests; docs exit 0. `git diff 13c57cd4 c7653a88 -- packages src` is empty, so VSIX packaging at cb39f5ff stands |
| Actor Phase-1 scenario 2, technical verification (`AC_ACTOR_PHASE1_SECOND`) | Reported by the Project Manager, d540e3ef: the User ran it as desktop operator on VS Code 1.146.0 | pass as reported (`AC_ACTOR_PHASE1_SECOND`): creation with "+", both ACTORS entries, the correct chat from each entry, separate `context.md` files. Not run by Quality; the tested Jarvis commit was not confirmed. The branch changes no `packages/*/src` file against its merge base (`git diff 05cbbca4 HEAD -- packages` shows one README line), so any build of this branch or of `development` runs the same extension code. Date 2026-11-18. The Architect sets the Need `verified` on this row |

Quality communicates its judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | | |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

On 2026-11-18, the User confirmed that Phase-1 scenarios 1 and 3 worked. Scenario 2 remains technical verification, recorded in Quality's Test Execution. The other 35 journeys are not part of this validation: they stay `approved` (defined, not run) under the Needs-check rule in the Product Specification.

| Validation | Observation | Date |
|---|---|---|
| `AC_ACTOR_PHASE1_MEMORY` (scenario 1) | User reported pass: the reopened Actor recalled the test word from its context. | 2026-11-18 |
| `AC_ACTOR_PHASE1_MESSAGE` (scenario 3) | User reported pass: Beta received the correct text and sender; the second read was empty. | 2026-11-18 |
| `US_REL_GITWORKFLOW` (AC-6) | User explicitly accepted the new pre-integration check based on the recorded test evidence and the check reporting the missing validation entry. | 2026-11-18 |

**Decision:** accepted for Phase-1 scenarios 1 and 3 and the new integration rule (`US_REL_GITWORKFLOW` AC-6).

## Closure

**Owner:** Project Manager<br>
**Status:** closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [x] The feature branch is squash-integrated into `development`.
- [x] Current blocker is `none`.
- [x] Header Status is `closed`.

**Final outcome:** On 2026-11-18, the User accepted Actor Phase-1 scenarios 1 and 3 and the new integration rule. Quality accepted the technical evidence for scenario 2. The remaining 35 journeys are `approved` and unexecuted. `python scripts/check_contract_needs.py` passed at `16a458c9` before squash integration into local `development` at `6e8352c0`.
