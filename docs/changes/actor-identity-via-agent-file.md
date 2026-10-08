# Change Document: actor-identity-via-agent-file

**Status**: in-progress
**Branch**: feature/actor-identity-via-agent-file
**Created**: 2026-10-03
**Author**: PM
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

**Design-phase exception**: Level 0/1/2 (System Designer) runs **user-guided** — the user wants to work through the specs in detail together before they're finalized. Every other step in this change runs autonomous.

---

## Summary

Every Actor SHALL reliably know who it is and where its memory lives, in every chat session, without depending on agent hooks. Motivation: today an Actor learns its identity by calling `jarvis_whoAmI`, which only works while agent hooks are available. In the user's current VS Code instance they no longer are, and adopting the Agent Host Protocol is deferred to about 2027-01, so Actors presently cannot identify themselves, and identity is easily lost when a conversation is compacted. Intent: identity is delivered with every request through the Actor's own chat agent instead of through a lookup. The Actor's name is the one link: each Actor has exactly one agent of that name, Jarvis creates it when it is missing and keeps the Actor's name and the location of its `context.md` in it, and the Actor's persona is no longer chosen in Jarvis but referenced from its `context.md`. Acceptance criteria (user-visible): (1) a new or existing Actor session knows its name and the location of its `context.md` without any tool call and without hooks; (2) this still holds after the conversation was compacted (re-reading and remembering the content of the memory stays subject to Copilot's compaction behaviour and is not part of this change); (3) every Actor, including those created before this change, has its agent without any action by the user, and existing Actors keep working; (4) `jarvis_whoAmI` is no longer offered, and tools that act on an Actor's behalf, such as the Kanban tools, take the Actor's name explicitly; (5) choosing a persona is no longer part of creating an Actor in Jarvis. Out of scope: removing agent hooks altogether (PM backlog #35) and adopting the Agent Host Protocol. The settled concept and the open design questions are recorded in PM backlog #42. This change runs in parallel with an independent Recorder change on another machine; the areas are separate and PM checks the merge when it comes.

---

## Level 0: User Stories

**Status**: ✅ completed — user-approved 2026-10-03, MECE PASS

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACTOR_WHOAMI | Actor Identity (was: Actor Identity Recovery) | rewritten | ID kept for traceability. Now: the Actor knows its name and the workspace-relative path of its `context.md` in every session, without a tool call, without hooks, also after compaction (AC-1..4). |
| US_ACTOR_ACTORS | The Actor | modified | AC-1: a legacy `agent:` is ignored. AC-6: every Actor has exactly one agent of its own, named like the Actor, created by Jarvis when missing; persona is referenced from `context.md`. AC-7: session opens in the Actor's own agent. |
| US_ACTOR_CREATE | Create an Actor from the ACTORS Tree | modified | AC-3: no `agent:`. AC-4: agent picker removed. |
| US_ACTOR_CREATETOOL | Programmatic Actor Creation | modified | AC-2: no `agent`. AC-3: an `agent` input is not rejected and has no effect. |
| US_ACTOR_LISTTOOL | List Actors Programmatically | modified | AC-2: `agent` is the Actor's own agent, named like the Actor. |
| US_ACTOR_FILES_TREE | Actor File Children in the ACTORS Tree | modified | "Agent" category depends on the Actor's own agent file, not on the `agent` field. |
| US_KAN_TOOLS | Kanban Board Tools | modified | AC-4: tools take `ownerName` explicitly; no `jarvis_whoAmI`. |
| US_KAN_SKILL | Kanban Skill and Instructions Content | modified | AC-4: skill documents that `ownerName` is always supplied. Link to US_ACTOR_WHOAMI added. |
| US_UAT_KAN_SKILL | Kanban Skill and Text-Field Acceptance Tests | modified | AC-11 (T-11): test checks that the skill says `ownerName` is always supplied, no `jarvis_whoAmI`. |

Raw impact candidates examined and left unchanged at L0: US_MSG_STABLESESSION, US_MSG_MODETARGET, US_MOD_ACTORRULES, US_SPL_LIFECYCLE, US_ACTOR_TREE. Their requirement and design consequences are assessed at L1/L2.

### New User Stories

Added later by the Test Designer (`ae9c5190`, "design actor identity user validation"), not part of the design pass above; six retained, all `draft`. US_ACTOR_WHOAMI itself was rewritten in place.

| ID | Title | Priority |
|----|-------|----------|
| US_UAT_ACTOR_IDENTITY | Actor Identity User Test | required |
| US_UAT_ACTOR_AGENT | Actor Agent User Test | required |
| US_UAT_ACTOR_CREATE | Create Actor User Test | required |
| US_UAT_ACTOR_CREATETOOL | Create Actor Tool User Test | required |
| US_UAT_ACTOR_LISTTOOL | List Actor Tool User Test | required |
| US_UAT_ACTOR_FILES_TREE | Actor Agent File User Test | required |

### Decisions

Decided with the user 2026-10-03:

- US_ACTOR_WHOAMI is kept and rewritten; identity is stated as a need of the Actor, the mechanism (own agent file, two Jarvis-maintained lines) is not an L0 concern.
- Actor names are unique, so no separate AC for ambiguous names is needed in US_ACTOR_WHOAMI; the name is the link to the agent.
- The `context.md` path is workspace-relative.
- A legacy `agent:` in `actor.yaml` is ignored (schema keeps the field as deprecated, no effect: decided direction, specified at L1/L2).
- A caller of `jarvis_createActor` that still passes `agent` is not rejected; the value has no effect.
- `jarvis_listActors` still returns `agent`, now the Actor's own agent (same as the Actor name).
- QM Round 1, decided with the user 2026-10-08: the word "kindless" is dropped from active text (kinds no longer exist, so the qualifier says nothing; US_ACTOR_ACTORS AC-5, REQ_ACTOR_SCHEMA AC-7, REQ_ACTOR_ACTIVATION AC-3, REQ_AUT_HEARTBEAT_RESOLVER_REUSE AC-3). US_ACTOR_ACTORS AC-5 no longer lists "identity recovery": that was the `jarvis_whoAmI` lookup. It now says the Actor's identity (US_ACTOR_WHOAMI) uses the same discovery, because `injectPrompt` finds the Actor through the scanner before `ensureActorAgent` runs. Wording only; element statuses are unchanged.
- Kanban tools take `ownerName` explicitly; the Kanban skill and its acceptance test change accordingly.
- Open and deferred to L1/L2: when agent files are created (activation/rescan vs. first open), tracked or git-ignored, rename behaviour, existing agent file whose `name:` differs, wording of the compaction hint.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed — drafted with the user 2026-10-03, MECE PASS after one wording fix

### Impacted Requirements

Found via links from User Stories above, plus a content search for `jarvis_whoAmI`, `agent`, `ownerName`.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACTOR_WHOAMI | US_ACTOR_WHOAMI | rewritten | ID kept. Identity via the Actor's own agent: lookup by front matter `name` (AC-1), create when missing (AC-2), two Jarvis-maintained lines (AC-3), one shared ensure routine at create / open / delivery (AC-4), ambiguous name (AC-5), mismatched file (AC-6), no deletion on rename (AC-7), no persona copied (AC-8), VCS-neutral (AC-9), `jarvis_whoAmI` not registered (AC-10), kernel instructions (AC-11). |
| REQ_ACTOR_SCHEMA | US_ACTOR_ACTORS | modified | AC-2: legacy `agent` accepted, deprecated, ignored. AC-7: no `whoAmI`; agent file maintenance refuses an ambiguous name. |
| REQ_ACTOR_BINDING | US_ACTOR_ACTORS | modified | AC-3: replacement session knows its Actor through the Actor's agent. |
| REQ_ACTOR_CREATE | US_ACTOR_CREATE | modified | AC-5: no `agent`. AC-6: no picker, ensures the agent. |
| REQ_ACTOR_CREATETOOL | US_ACTOR_CREATETOOL | modified | AC-1: no `agent` input, a passed value is ignored. AC-2: no `agent` in `actor.yaml`. AC-6: ensures the agent. |
| REQ_ACTOR_LISTTOOL | US_ACTOR_LISTTOOL | modified | AC-2: `agent` is the Actor's own agent, equal to `name`. |
| REQ_ENG_ACTORLIST | US_ACTOR_LISTTOOL | modified | AC-4: same. |
| REQ_ACTOR_AGENT_DISCOVERY | US_ACTOR_CREATE; US_ACTOR_CREATETOOL; US_ACTOR_FILES_TREE | modified | Purpose: find an Actor's agent by name instead of offering a picker. Links now US_ACTOR_ACTORS; US_ACTOR_FILES_TREE. `user-invocable: false` stays excluded (parked). |
| REQ_ACTOR_INITPROMPT | US_ACTOR_ACTORS | modified | AC-6: ensure the agent, then use it as mode; no mode when it could not be ensured. |
| REQ_ACTOR_FILES_TREE | US_ACTOR_FILES_TREE | modified | AC-4: "Agent" category depends on the Actor's own agent file. |
| REQ_INJ_PRIMITIVE | US_INJ_INJECT (content search) | modified | AC-2: no-guess rule cited from REQ_ACTOR_SCHEMA AC-7. AC-4: ensure the agent, then prime its mode. |
| REQ_HOOK_INTAKE | US_HOOK_OBSERVE (content search) | modified | AC-9 retired: the ordering contract existed only for `jarvis_whoAmI`. |
| REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_UPDATE, REQ_KAN_ADD, REQ_KAN_DELETE, REQ_KAN_LIST, REQ_KAN_FIELDS | US_KAN_TOOLS; US_KAN_QUERY | modified | `ownerName` is required; no `jarvis_whoAmI` fallback. REQ_KAN_CREATE AC-3: required input and `{ error: "ownerName required" }`. |
| REQ_KAN_SKILLCONTENT | US_KAN_SKILL | modified | AC-4: `ownerName` is always supplied. |
| REQ_UAT_KAN_SKILL | US_UAT_KAN_SKILL | modified | AC-5: tester passes the Actor's own name. |
| REQ_SPL_ACTOR | US_ACTOR_ACTORS | modified | AC-2: persona named in the `summary`, no `agent` input. |
| REQ_SPL_NOTIFY | REQ_SPL_ACTOR | modified | AC-5 (new): the message names the persona file for Actors created before this CR. |
| REQ_ACTOR_ACTIVATION | US_ACTOR_ACTORS | modified (wording only) | AC-3: "kindless" removed (QM Round 1, `fe19edde`). Status unchanged. |
| REQ_AUT_HEARTBEAT_RESOLVER_REUSE | content search | modified (wording only) | AC-3: "kindless" removed (QM Round 1, `fe19edde`). Was `draft` before this CR and stays `draft`. |

Examined by content search and left unchanged: REQ_ACTOR_OPENSESSION, REQ_CFG_FOLDERPATHS, REQ_KAN_MODULE, REQ_KAN_WRITEVALID, REQ_KAN_INSTRUCTIONS, REQ_MOD_ACTORRULES (its asset content changes, see REQ_ACTOR_WHOAMI AC-11), REQ_MSG_* agent-mode requirements (they concern the mode command, not the `agent` field).

### New Requirements

Added later by the Test Designer (`ae9c5190`); six retained, all `draft`. REQ_ACTOR_WHOAMI itself was rewritten in place.

| ID | Title | Links |
|----|-------|-------|
| REQ_UAT_ACTOR_IDENTITY | Actor Identity Test Data | US_UAT_ACTOR_IDENTITY |
| REQ_UAT_ACTOR_AGENT | Actor Agent Test Data | US_UAT_ACTOR_AGENT |
| REQ_UAT_ACTOR_CREATE | Tree Creation Test Data | US_UAT_ACTOR_CREATE |
| REQ_UAT_ACTOR_CREATETOOL | Tool Creation Test Data | US_UAT_ACTOR_CREATETOOL |
| REQ_UAT_ACTOR_LISTTOOL | Actor Listing Test Data | US_UAT_ACTOR_LISTTOOL |
| REQ_UAT_ACTOR_FILES_TREE | Agent File Tree Test Data | US_UAT_ACTOR_FILES_TREE |

### Conflicts Detected

None.

### Decisions

Decided with the user 2026-10-03:

- The agent is created and checked lazily, not at extension startup (startup cost): at Actor creation, session open and message delivery, through one shared routine, immediately before the agent mode is set.
- Line 2 of the agent file carries the compaction hint, in the user's wording: "Read it and the files it links if you did not do that already or after a compaction."
- If `<Actor name>.agent.md` exists with a different `name`, Jarvis leaves it alone, does not treat it as the Actor's agent and warns.
- Version control of the agent files is the project's concern; Jarvis restores its two lines whenever the check runs.
- Renaming an Actor leaves the old agent file behind; Jarvis never deletes agent files.
- `user-invocable: false` agents stay excluded from discovery; parked, only user-invocable agents are in use.
- The legacy `agent` property stays in the schema as deprecated and ignored (no rejection of the 12 existing `actor.yaml`).
- REQ_HOOK_INTAKE AC-9 is retired together with `jarvis_whoAmI`.
- Syspilot Setup Engineer: the persona reference goes into the `summary` at creation and the notification message names the persona file for existing Actors.
- Added by the System Designer, not discussed separately: the shared routine also runs at Actor creation, so a new Actor has its agent even with `jarvis.actors.openSessionOnCreate` off.
- Consequence accepted: an existing Actor that was never opened has no agent file yet, so its "Agent" tree category appears only after the first open or delivery.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

MECE found one wording ambiguity (US_ACTOR_FILES_TREE AC-1a said the agent file "exists", REQ_ACTOR_FILES_TREE AC-4 said "found by the Actor name"). Fixed: US_ACTOR_FILES_TREE intro and AC-1a, REQ_ACTOR_FILES_TREE AC-4 and SPEC_ACTOR_FILES AC-1 now say the Actor's own agent is found by the Actor name.

---

## Level 2: Design

**Status**: ✅ completed — user-approved 2026-10-03 ("let us implement it and gather experience in the Extension Development Host"), MECE PASS

### Impacted Design Elements

Found via links from Requirements above, plus a content search.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACTOR_WHOAMI | REQ_ACTOR_WHOAMI | rewritten | ID kept. New module `engine/actors/actorAgent.ts` with one function `ensureActorAgent(actor)`: find by identity, create when missing, restore the two lines, serialized per Actor name. Removes the tool, its `package.json` entry and the hook correlation buffer. The kernel instructions' identity section (section 0) is removed (user decision 2026-10-08, PM backlog #46). |
| SPEC_INJ_INJECT | REQ_INJ_PRIMITIVE | modified | New step 1b calls `ensureActorAgent`; 3a/3b use its result for the mode. Covers open, delivery, injection tool and command. |
| SPEC_ACTOR_CREATE | REQ_ACTOR_CREATE | modified | No picker, no `writeActorAgent`, no `agent` in `actor.yaml`; step 5 calls `ensureActorAgent`. |
| SPEC_ACTOR_CREATETOOL | REQ_ACTOR_CREATETOOL | modified | `agent` input removed from the schema and ignored if passed; step 5 calls `ensureActorAgent`. |
| SPEC_ACTOR_SCANNER | REQ_ACTOR_SCHEMA | modified | `ActorEntry.agent` removed; legacy key not read; agent file maintenance refuses by precondition. |
| SPEC_ACTOR_SCHEMA | REQ_ACTOR_SCHEMA | modified | `agent` stays as deprecated and ignored. |
| SPEC_ACTOR_LISTTOOL, SPEC_ENG_ACTORLIST, SPEC_ENG_API | REQ_ACTOR_LISTTOOL; REQ_ENG_ACTORLIST | modified | `agent` is projected as the Actor name. |
| SPEC_ACTOR_FILES | REQ_ACTOR_FILES_TREE | modified | "Agent" category found by Actor name. |
| SPEC_ACTOR_AGENT_DISCOVERY | REQ_ACTOR_AGENT_DISCOVERY | modified | Picker and `pickAgentMode` removed; discovery stays. |
| SPEC_ACTOR_INITPROMPT | REQ_ACTOR_INITPROMPT | modified | Mode priming uses the Actor name when the agent check returned `ready`. |
| SPEC_MSG_OPENCHAT | REQ_ACTOR_INITPROMPT (via SPEC_INJ_INJECT) | modified | `reapplyAgentMode` and the mode-prime snippet use the agent check result. |
| SPEC_HOOK_INTAKE | REQ_HOOK_INTAKE | modified | Dispatch-before-response ordering retired as a contract (AC-6). |
| SPEC_KAN_CREATE, SPEC_KAN_VERIFY, SPEC_KAN_OPEN, SPEC_KAN_UPDATE, SPEC_KAN_ADD, SPEC_KAN_DELETE, SPEC_KAN_LIST, SPEC_KAN_FIELDS | REQ_KAN_* | modified | `ownerName` required; SPEC_KAN_CREATE step 1 defines `{ error: "ownerName required" }`, the others point to it. |
| SPEC_KAN_SKILLCONTENT | REQ_KAN_SKILLCONTENT | modified | Owner Resolution section and AC-3. |
| SPEC_UAT_KAN_SKILL, SPEC_UAT_KAN_MGMT | REQ_UAT_KAN_SKILL | modified | T-11 rewritten; management scenarios pass `ownerName`. |
| SPEC_SPL_ACTOR, SPEC_SPL_NOTIFY | REQ_SPL_ACTOR; REQ_SPL_NOTIFY | modified | Persona named in the `summary` and in the notification; no `agent` input. |
| SPEC_DEV_DISPOSAL | content search | modified | `jarvis_whoAmI` removed from the disposable list. |

Examined and left unchanged: SPEC_ACTOR_OPENSESSION, SPEC_ACTOR_TREE, SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL (both reach the Actor through `injectPrompt`), SPEC_CFG_MANIFEST, SPEC_UAT_MSGQUEUE (its `agent: ""` fixtures are legacy keys with no effect).

### New Design Elements

Added later by the Test Designer (`ae9c5190`); six retained, all `draft`. The new module `ensureActorAgent` is specified inside SPEC_ACTOR_WHOAMI.

| ID | Title | Links |
|----|-------|-------|
| SPEC_UAT_ACTOR_IDENTITY | Actor Identity User Outcomes | REQ_UAT_ACTOR_IDENTITY |
| SPEC_UAT_ACTOR_AGENT | Actor Agent User Outcomes | REQ_UAT_ACTOR_AGENT |
| SPEC_UAT_ACTOR_CREATE | Tree Creation User Outcomes | REQ_UAT_ACTOR_CREATE |
| SPEC_UAT_ACTOR_CREATETOOL | Tool Creation User Outcomes | REQ_UAT_ACTOR_CREATETOOL |
| SPEC_UAT_ACTOR_LISTTOOL | Actor Listing User Outcomes | REQ_UAT_ACTOR_LISTTOOL |
| SPEC_UAT_ACTOR_FILES_TREE | Agent File Tree User Outcomes | REQ_UAT_ACTOR_FILES_TREE |

### Conflicts Detected

None.

### Decisions

Decided with the user (L1, applied here):

- One function, `ensureActorAgent`, called from three places: `injectPrompt` step 1b, `jarvis.newActor`, `createActorHandler`.
- Lazy check, not at startup, immediately before the agent mode is set.

Decided by the System Designer in this draft, for the user to confirm:

- The routine has no scanner parameter. Its precondition is that the caller established exactly one Actor: `injectPrompt` resolves the name first, creation checks `existingActorFolder` first.
- Jarvis recognises its own two lines by the fixed prefixes `You act as Actor ` and `Your context memory is `, replaces them when different and inserts them directly after the front matter; the file's line ending is kept and an unchanged file is not written. No blank line is added.
- Two agent files with the Actor's name: nothing is touched, one warning, no mode (treated like the mismatched-file case). This case was not in L1.
- A given warning (file and reason) shows once per window session, because the check runs on every delivery.
- After creating a new agent file the routine waits up to 3 s for VS Code to register `workbench.action.chat.open<Actor name>`; on timeout it still returns `ready` and the next open applies the mode. Unverified assumption: whether VS Code registers a new agent's command within that time must be confirmed in the Extension Development Host.
- The agent file is created in `.github/agents/` of the first workspace folder.
- `ActorEntry.agent` is removed; `jarvis_listActors` and `listActors()` project `agent` as the Actor name.
- The kernel instructions have no identity section. The first design kept a rewritten one with an escalation rule; the user decided on 2026-10-08 (PM backlog #46) to remove section 0 entirely, because the Actor's agent carries the identity. Sections 1 to 4 keep their numbers, and the kernel no longer says what an Actor does when its two agent lines are missing. Design check: only SPEC_ACTOR_WHOAMI described the section and is reworded; REQ_ACTOR_WHOAMI AC-11 stays satisfied, and REQ_MOD_ACTORRULES, SPEC_MOD_ACTORRULES, US_MOD_ACTORRULES and the UAT specs for the rule set describe delivery and the file set, not section content, so they need no change. SPEC_ACTOR_WHOAMI goes from `implemented` back to `approved` until the asset is changed and re-verified.
- The previous manual UAT scenarios for Kanban pass `ownerName`; their fixture text for `agent: ""` is left as is.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

### MECE advisory — 2026-10-03

Advisory only; this entry does not complete the horizontal-check boxes.

- **L0 on 9ff1acb5: PASS.** The rewritten and impacted stories are mutually exclusive and collectively exhaustive for the user-visible intent: identity and post-compaction persistence belong to `US_ACTOR_WHOAMI` AC-1..AC-4; exactly one per-Actor agent, lazy creation, ignored legacy `agent:`, and session mode belong to `US_ACTOR_ACTORS` AC-6/AC-7; tree representation belongs to `US_ACTOR_FILES_TREE`; explicit `ownerName` and skill wording belong to `US_KAN_TOOLS`/`US_KAN_SKILL`/`US_UAT_KAN_SKILL`. “Without any action by the user” is consistent with lazy creation on first open or delivery.
- **L1 on 3acdfa1a: PARTIAL — one wording ambiguity; no functional gap.** The single shared ensure routine is correctly scoped at `REQ_ACTOR_WHOAMI` AC-4 and normatively restated without conflict at `REQ_ACTOR_INITPROMPT` AC-6 and `REQ_INJ_PRIMITIVE` AC-4; exactly those three entry points are covered. All Kanban requirements uniformly require `ownerName` and route resolution through the unique-name rule. Ambiguity: `US_ACTOR_FILES_TREE` AC-1a conditions the “Agent” category on the Actor’s own agent file existing, but `REQ_ACTOR_FILES_TREE` AC-4 interprets that as “found by the Actor name.” A path named `<Actor>.agent.md` whose front-matter `name` differs satisfies file existence but not identity discovery. Recommend wording that says the Actor’s agent is found by identity under its name; do not leave “file exists” as if existence alone were sufficient.
- **L2 on e876b885: PASS.** `SPEC_ACTOR_WHOAMI` AC-1 makes `ensureActorAgent` the sole mutator and fixes exactly three callers, and `SPEC_INJ_INJECT` step 1b, `SPEC_ACTOR_CREATE` step 5, and `SPEC_ACTOR_CREATETOOL` step 5 match that model without variants. The duplicate-agent case is an additive L2 refinement, not an overlap with the L1 mismatch case; both return `skipped`, leave files untouched, and warn once per reason/window session. `SPEC_MSG_OPENCHAT` and `SPEC_ACTOR_INITPROMPT` consistently use `ready` for mode priming/reapply and leave mode untouched after `skipped`. The 3 s wait for `workbench.action.chat.open<Actor name>` remains the disclosed open assumption in CD L2 decision 3 and is not a defect.

**Verdicts:** L0 PASS, L1 PARTIAL (suggestion to clarify “found by name”), L2 PASS.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACTOR_WHOAMI | REQ_ACTOR_WHOAMI, REQ_ACTOR_BINDING | SPEC_ACTOR_WHOAMI | ✅ |
| US_ACTOR_ACTORS | REQ_ACTOR_SCHEMA, REQ_ACTOR_INITPROMPT, REQ_ACTOR_AGENT_DISCOVERY, REQ_SPL_ACTOR | SPEC_ACTOR_SCANNER, SPEC_ACTOR_SCHEMA, SPEC_ACTOR_INITPROMPT, SPEC_ACTOR_AGENT_DISCOVERY, SPEC_INJ_INJECT, SPEC_MSG_OPENCHAT, SPEC_SPL_ACTOR | ✅ |
| US_ACTOR_CREATE | REQ_ACTOR_CREATE | SPEC_ACTOR_CREATE | ✅ |
| US_ACTOR_CREATETOOL | REQ_ACTOR_CREATETOOL | SPEC_ACTOR_CREATETOOL | ✅ |
| US_ACTOR_LISTTOOL | REQ_ACTOR_LISTTOOL, REQ_ENG_ACTORLIST | SPEC_ACTOR_LISTTOOL, SPEC_ENG_ACTORLIST, SPEC_ENG_API | ✅ |
| US_ACTOR_FILES_TREE | REQ_ACTOR_FILES_TREE | SPEC_ACTOR_FILES | ✅ |
| US_KAN_TOOLS | REQ_KAN_CREATE, _VERIFY, _OPEN, _UPDATE, _ADD, _DELETE, _LIST, _FIELDS | SPEC_KAN_CREATE, _VERIFY, _OPEN, _UPDATE, _ADD, _DELETE, _LIST, _FIELDS | ✅ |
| US_KAN_SKILL | REQ_KAN_SKILLCONTENT | SPEC_KAN_SKILLCONTENT | ✅ |
| US_UAT_KAN_SKILL | REQ_UAT_KAN_SKILL | SPEC_UAT_KAN_SKILL, SPEC_UAT_KAN_MGMT | ✅ |
| US_HOOK_OBSERVE (content) | REQ_HOOK_INTAKE (AC-9 retired) | SPEC_HOOK_INTAKE | ✅ |
| US_UAT_ACTOR_IDENTITY | REQ_UAT_ACTOR_IDENTITY | SPEC_UAT_ACTOR_IDENTITY | ✅ |
| US_UAT_ACTOR_AGENT | REQ_UAT_ACTOR_AGENT | SPEC_UAT_ACTOR_AGENT | ✅ |
| US_UAT_ACTOR_CREATE | REQ_UAT_ACTOR_CREATE | SPEC_UAT_ACTOR_CREATE | ✅ |
| US_UAT_ACTOR_CREATETOOL | REQ_UAT_ACTOR_CREATETOOL | SPEC_UAT_ACTOR_CREATETOOL | ✅ |
| US_UAT_ACTOR_LISTTOOL | REQ_UAT_ACTOR_LISTTOOL | SPEC_UAT_ACTOR_LISTTOOL | ✅ |
| US_UAT_ACTOR_FILES_TREE | REQ_UAT_ACTOR_FILES_TREE | SPEC_UAT_ACTOR_FILES_TREE | ✅ |

Status after merging `development` (2026-10-08), counted from the diff of every need against the new merge-base `2e543531` (the tip of `development`, so the diff is what this change alone adds); a need counts as amended when any hunk of that diff lies inside its block. 81 needs are amended or new, the same 81 as before the merge. The retained UAT design has six chains (6 US + 6 REQ + 6 SPEC), nine scenarios (T-1..T-8 and T-10), and two stories with the persona "As an Actor":

- 18 are new: the UAT elements retained after removing the three T-9 elements, all `draft`.
- 45 were `approved` or `implemented` at the merge-base and are amended. 32 are now `implemented` (30 were `approved` and 2, SPEC_DEV_DISPOSAL and SPEC_HOOK_INTAKE, were `implemented` at the merge-base; Verify, report `28f54275`). 13 are `approved`: REQ_ACTOR_ACTIVATION, REQ_UAT_KAN_SKILL, SPEC_ENG_API, SPEC_UAT_KAN_MGMT, SPEC_UAT_KAN_SKILL, US_ACTOR_ACTORS, US_ACTOR_CREATE, US_ACTOR_CREATETOOL, US_ACTOR_FILES_TREE, US_ACTOR_LISTTOOL, US_ACTOR_WHOAMI, US_KAN_SKILL, US_UAT_KAN_SKILL.
- SPEC_ENG_API stays `approved` (it was the 33rd `implemented` before the merge). Two things are kept apart here. (a) Verify's integration check (section "Integration verification after merging development", `87d12f94`) compared the combined contract with the code: `JarvisActor` with `agent` equal to `name`, `HeartbeatStep` vendor/model, `markActor` (AC-10, REQ_ENG_ACTORMARK) and `version` 2 all exist, `markActor` is additive, and the code behaves as AC-10 and SPEC_ENG_ACTORMARK say; Verify did not judge the wording and set no status. (b) Not promoting it is my own choice: the combined contract has not been through a status-promotion review of this change, and SPEC_ENG_ACTORMARK is still `approved` on `development`. An element is `implemented` only after that review, so it waits. I read the combined text (AC-1 to AC-10, the types, the links) as a whole and found no disagreement between the two sides; neither text nor links changed.
- 18 were `draft` at the merge-base, are amended and stay `draft`. Their other, earlier changes are not mine to approve (PM decision below): US_KAN_TOOLS, REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_UPDATE, REQ_HOOK_INTAKE, REQ_INJ_PRIMITIVE, REQ_SPL_ACTOR, REQ_SPL_NOTIFY, REQ_AUT_HEARTBEAT_RESOLVER_REUSE, SPEC_INJ_INJECT, SPEC_MSG_OPENCHAT, SPEC_KAN_CREATE, SPEC_KAN_VERIFY, SPEC_KAN_OPEN, SPEC_KAN_UPDATE, SPEC_SPL_ACTOR, SPEC_SPL_NOTIFY.

Correction: an earlier version of this paragraph said "47 elements ... approved again" and "the others stay `approved`" (14). The 47 was stated without counting my own list and cannot be reproduced; QM's count of 45 is right. Of the 45, 44 were set to `draft` by the design edits and approved again at the end of the design phase; REQ_ACTOR_ACTIVATION was reworded in `fe19edde` without a status change.

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `jarvis_whoAmI` (tool, handler, hook correlation buffer, `package.json` entry) | `packages/core/src/extension.ts` (26), `packages/core/package.json` (2), `packages/core/src/engine/actors/actorCreation.ts` (2), `packages/core/assets/instructions/jarvis-actor.kernel.instructions.md` (1), `packages/kanban/src/extension.ts` (4), `packages/kanban/package.json` (11), `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` (1), `src/tests/whoami-session-id-resolution.test.ts` (38), `src/tests/newactor-creation-flow.test.ts` (4); provisioned copies `.github/skills/jarvis-kanban.board/SKILL.md` and `testdata/.github/skills/jarvis-kanban.board/SKILL.md` (1 each). Open: Dev Engineer. | `README.md` (1), `packages/core/README.md` (1): open, Doc Engineer. In `docs/**` the remaining mentions (specs, requirements, stories) are deliberate notes on the former tool. | 23 files in `docs/changes/` plus 9 mentions in `docs/releasenotes.md`: historic, accepted |
| `agent` field (`ActorEntry.agent`, `writeActorAgent`, `pickAgentMode`, `agent` input of `jarvis_createActor`) | `packages/core/src/engine/actors/actorCreation.ts`, `actorRuntime.ts`, `actorScanner.ts`, `actorFiles.ts`, `actorTreeProvider.ts`, `packages/core/src/extension.ts`, `packages/syspilot/src/versionCheck.ts`, `packages/core/schemas/actor.schema.json` and `schemas/actor.schema.json` (property stays, text becomes "deprecated"). Open: Dev Engineer. | none beyond the specs | historic, accepted |
| `REQ_HOOK_INTAKE` AC-9 ordering contract | `packages/core/src/engine/hooks/` (the order may stay, the contract is gone). Open: Dev Engineer. | none | historic, accepted |

The class (a) and (b) items are implementation and documentation work; this CR's design phase only records them.

- [x] All class (a) active code/workflow references fixed in this CR (Dev `6c84f096`, `7261dcca`, `c54de45d`, `6d229faa`, `6e9c0668`, `1622caf4`; Verify re-verify PASSED `28f54275`: clean in tracked code; the gitignored provisioned copy of the kernel instructions in `.github/instructions/` was already stale before this CR (missing the Identity section) and is not tracked, so it is not part of this CR's commits)
- [x] All class (b) active documentation references fixed in this CR (Doc Engineer: root, core and Kanban READMEs updated; remaining spec mentions describe removal)
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue: the 3 s wait for VS Code to register the mode command of a new agent is unverified; confirm in the Extension Development Host (CD L2 decision).
- [x] Issue: 18 amended elements are still `draft` because they were `draft` before this CR (see Traceability Verification; the 18th is REQ_AUT_HEARTBEAT_RESOLVER_REUSE, reworded in `fe19edde`). **PM decision (2026-10-04): accept-as-is for this change.** Rationale (written for 17; PM confirmed it holds for the 18th): all were already `draft` on `development` before this CR (PM checked each), an element not reviewed in this change keeps its status, and neither PM nor CM changes spec status here. The wider question of who approves long-standing drafts and when is PM backlog #43 and not part of this CR.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

**Backlog numbering (PM, 2026-10-08):** the backlog numbers #43 to #47 in this document were the numbers of PM's backlog on this machine when the findings were written. When `origin/development` was merged in, the other machine's PM backlog had already used #43 to #54, so these five items were renumbered: #43 is now #55, #44 is #56, #45 is #57, #46 is #58, #47 is #59 (same texts). Numbers #43 to #54 in the backlog now mean the other machine's items. Wording in the findings below is left as written.

### Round 1

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `5b038346` (worktree clean at start and end; every build and test ran on a `git archive HEAD` export with its own `npm ci`, so no workspace link pointed at the live tree)
**Scope:** the 61 element IDs this CD declares as impacted (9 L0, 24 L1, 28 L2), the 21 UAT elements found in the branch but not declared (Finding 1), the code behind `SPEC_ACTOR_WHOAMI`, `SPEC_INJ_INJECT`, `SPEC_ACTOR_CREATE`, `SPEC_ACTOR_CREATETOOL`, and the Kanban `ownerName` contract.
**Method note:** QM read the specifications and code directly and did not dispatch MECE or Trace Engineer for this round, because the MECE advisory of 2026-10-03 and the Verify report already cover those levels and this round re-derives their claims from the export. No Extension Development Host run; User UAT is NOT RUN and no verdict is inferred.

#### Verdict

No blocking finding. Four Low findings below wait for PM disposition. QM does not grant merge-readiness.

#### Independently reproduced (export of `5b038346`)

| Check | Result |
|---|---|
| `tsc -p` core, pim, recorder, mcp, flow, kanban, syspilot | all exit 0 |
| `vitest run` | 47 files / 371 tests passed (equals Dev and Verify) |
| strict Sphinx `-W --keep-going` | exit 0, no warnings |
| `eslint` (unfiltered, from the archive) | 0 errors, 176 warnings. Equals Verify's 176; Dev's 152 does not reproduce. Merge-base `d1ee7592` gives 168, so this change adds 8: `src/tests/actorAgent.test.ts` +7, `actorRuntime.test.ts` +2, `injectprompt-ensureactoragent-wiring.test.ts` +1, `packages/kanban/src/extension.ts` +1, `packages/core/src/extension.ts` −3. The 3 "generated Kanban" errors do not occur in the archive, because the generated `packages/kanban/out/` is not tracked. |
| Trace chain for the 61 declared IDs (script over the export) | all exist; every `:links:` target resolves; every REQ has a parent US, every SPEC a REQ, every US a REQ, every REQ a SPEC. The 17 elements still `draft` are exactly the 17 the CD lists. The 33 `implemented` elements match Verify's "33 status edits". |
| `ensureActorAgent` callers | exactly three: `injectPrompt.ts:163`, `extension.ts:1087`, `actorRuntime.ts:81`; none at activation or in a rescan |
| `jarvis_whoAmI` | no occurrence in tracked code, manifests, assets or READMEs; the only code hits are the negative assertions in `actorAgent.test.ts` and `kanban-ownername-required.test.ts` |
| Kanban tools | all eight `inputSchema` list `ownerName` as required; core `jarvis_createActor` has no `agent` property |

#### Findings

The Round 1 counts below describe the reviewed baseline before the T-9 chain
was removed. The current graph has six chains and 81 changed needs, as counted
in the Final Consistency Check above; historical counts are not current scope.

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L0/L1/L2, CD | `US_UAT_ACTOR_*`, `REQ_UAT_ACTOR_*`, `SPEC_UAT_ACTOR_*` (7 + 7 + 7, all `draft`) | The CD states "None" under New User Stories, New Requirements and New Design Elements, and its traceability table lists none of them. Commit `ae9c5190` (Test Designer) added 21 elements in `us_uat_actor_identity.rst`, `req_uat_actor_identity.rst`, `spec_uat_actor_identity.rst` and registered them in `us_uat.rst`, `req_uat.rst`, `spec_uat.rst`. The CD text contains no mention of them (0 hits for `UAT_ACTOR`); the Test Protocol links to the design file, the validation report mentions it once. The elements themselves are consistent (my chain check: each SPEC → REQ → US → product story; every AC and T-number they cite exists), so the defect is the CD's scope statement: a reader trusting "None" has no pointer to 21 new elements. The same CD also still says amended elements "are `approved` again"; at HEAD 33 of them are `implemented` (Verify promoted them). Reason this matters: the CD is what PM and CM read to decide what the change contains. Suggested: list the 21 as new elements by Test Designer and correct the status sentence. | low |
| 2 | L0 (SC-001) | `US_UAT_ACTOR_CREATETOOL`, `US_UAT_ACTOR_LISTTOOL`, `US_UAT_ACTOR_KAN_OWNER`; `US_ACTOR_WHOAMI` | Three of the new UAT stories use "**As an** Actor" as persona, which is not one of Jarvis User, Jarvis Developer, Jarvis Test Engineer. `US_ACTOR_WHOAMI`, rewritten in this CR, keeps "Jarvis Actor operating in a chat session" (flagged 2026-09-25, already in the count). Same pattern as the known set under GH #33; PM confirmed 2026-10-02 that #33 is its home. Reported only so the #33 count is right: 14 findings become 17 when this merges. No change requested in this CR unless PM wants the three new stories fixed while they are still new. | low |
| 3 | L2 + code | `SPEC_ACTOR_WHOAMI` steps 2–3; `actorAgent.ts` L123–137 | Derived from reading, not executed: `discoverAgentModes()` scans `.github/agents/` of every workspace folder and returns `filePath` relative to the folder where it found the file, but `_ensureActorAgent` resolves that path against `getWorkspaceRoot()` (the first folder) and computes the `context.md` path against it too. If the only agent carrying the Actor's name sits in a second workspace folder, the restore reads a path in the first folder, fails, and returns `skipped / writeFailed`; the Actor opens without its mode, logged only. The specification names the first folder as the creation target but is silent about candidates from other folders, and no test uses more than one folder. Spec-layer root cause: the multi-folder case is undefined; the code follows the spec's single-root wording. Suggested: either state that only the first folder is searched (and discover accordingly) or resolve the path against the folder it came from. | low |
| 4 | Wording | `packages/core/src/extension.ts` L269–270; `US_ACTOR_ACTORS` AC-5 | Two phrases still describe the removed model. The `reapplyAgentMode` doc comment says the agent name is "as stored on the entity's `agent` field" (the field is gone). `US_ACTOR_ACTORS` AC-5 lists "identity recovery" among the things that use kindless discovery; this CR renamed the story from "Identity Recovery" to "Actor Identity" and identity no longer comes from a lookup. The second may be intended (identity from the file system, AC-4); I could not tell from the text, so it is a question for the owner. | low |

#### Observations (not findings; no action requested)

- **Persona consequence for existing Actors in this repository** (verified against `.github/agents/` and the 14 `actor.yaml`): 11 Actors already have an agent of exactly their name (the tracked `syspilot.*.agent.md` files, e.g. `syspilot.qm.agent.md` is `name: "Quality Manager"`); on their first check Jarvis inserts the two identity lines into those tracked files, which will show as a diff in every project that tracks them (CD AC-9: the project's concern). `Syspilot Setup Engineer` has `agent: "syspilot.setup"` and `syspilot.setup.agent.md` has no `name:`; it, `Repo Maintainer` and `Research` get a new bare `<name>.agent.md`. For Syspilot Setup Engineer that drops the `syspilot.setup` persona until its `context.md` references it (its `context.md` has no persona reference today). This is the decided design (US_ACTOR_ACTORS AC-6, UAT T-3), written here so the consequence is concrete.
- **3 s wait for a new agent's mode command:** still unverified; the code polls every 100 ms for at most 3 s and returns `ready` on timeout, exactly as `SPEC_ACTOR_WHOAMI` step 5 says. Only the Extension Development Host can settle it.
- **Stale provisioned kernel instructions** (gitignored `.github/instructions/jarvis-actor.kernel.instructions.md`) still tell Actors to call `jarvis_whoAmI` in this workspace. The CD already records that copy as stale and untracked. `provisionModuleAssets` overwrites a differing file whenever provisioning is enabled, so only workspaces with `jarvis.actor.autoProvision` off keep the old text until the user re-provisions.
- **Multi-agent files:** an Actor whose name equals an existing persona agent's name gets the two lines written into that persona file (`REQ_ACTOR_WHOAMI` AC-1/AC-3 as written).

#### PM Decisions

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | CD scope statement says "None" for new elements, although `ae9c5190` added 21 UAT elements; "approved again" sentence stale (33 are `implemented`) | fix-now | The CD is what PM and CM read to learn what the change contains, so a wrong scope statement misleads them; the elements themselves are consistent (QM chain check), so only the CD text changes. Routed to CM: list the 21 as new elements by Test Designer, correct the status sentence. |
| 2 | Three new UAT stories use the persona "As an Actor" (GH #33 count 14 → 17) | accept-as-is | These UAT stories are in the old format that PM backlog #40 replaces with a new test ontology; fixing their wording now is effort on material that is about to be redone. GH #33 stays the home of the persona question. |
| 3 | Multi-root: agent found in a second workspace folder is resolved against the first folder and ends in `writeFailed` (derived from reading, not executed) | defer | The spec is silent on multi-root workspaces, so this is a design question and not a defect of this change; the user decides whether multi-root is supported at all. Tracked as PM backlog #45, whose notes now carry QM's analysis. |
| 4a | Comment in `packages/core/src/extension.ts` L269–270 still says "the entity's `agent` field" | fix-now | The field is gone, and this change promises no dangling references to the removed model. A comment-only edit. Routed to Dev via CM. |
| 4b | `US_ACTOR_ACTORS` AC-5 lists "identity recovery" although identity no longer comes from a lookup | fix-now, owner confirms | QM could not tell whether the wording is intended. Routed to System Designer: confirm the intent and, if it is stale, reword it and show the user, since design is user-guided. |

After 1, 4a and 4b: a short re-verification by Verify, then a targeted QM re-check of the fix commits only. Merge stays withheld until User validation and the open 3 s assumption are settled; the retained scenarios are T-1..T-8 and T-10 (Ctrl+F5).

### Round 2

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `7d21ac55` (worktree clean at start; built and tested on a `git archive HEAD` export with its own `npm ci`). Fix commits re-checked: `01eea212` (Dev) and `fe19edde` (System Designer), against `5b038346` and the merge-base `d1ee7592`.
**Scope:** Round 1 findings 1 and 4 as disposed by PM, plus a regression check across the whole needs graph. Findings 2 and 3 are accepted/deferred by PM (backlog #40, #45) and were not re-checked. No Extension Development Host run; User UAT is NOT RUN and no verdict is inferred.

#### Verdict

Findings 1 and 4 are resolved. One new Low finding (R2-1) is a leftover of the same CD text. No regression found. QM does not grant merge-readiness.

#### Independently reproduced (export of `7d21ac55`)

| Check | Result |
|---|---|
| `tsc -p` x7 | all exit 0 |
| `vitest run` | 47 files / 371 tests passed (unchanged) |
| strict Sphinx `-E -W --keep-going` | exit 0, no warnings |
| `eslint` unfiltered from the archive | 0 errors, 176 warnings (unchanged) |
| All 573 needs, `5b038346` against HEAD (status and `:links:`) | 0 changes, 0 added, 0 removed, 0 unresolved links. The wording edits touched no status and no link. |
| Code and tests, `5b038346` against HEAD | only `packages/core/src/extension.ts` changed, and the diff is the doc comment alone; no test file changed |

#### Re-check of Round 1 findings

| # | Result | Evidence |
|---|---|---|
| 1 | Resolved for the 21 elements; residual in R2-1 | The three "New ..." sections now list the 21 UAT elements as added later by the Test Designer (`ae9c5190`). I compared all 21 rows with the `.rst` files: IDs, titles, priorities (US) and links (REQ, SPEC) match exactly, and the traceability table has the 7 new rows. The "33 `implemented`" statement is correct (33 at HEAD, Verify's number). |
| 4a | Resolved | The `reapplyAgentMode` comment now says the mode name equals the Actor name found by agent-file identity (`SPEC_ACTOR_WHOAMI`) and that `ActorEntry` has no `agent` field; no executable line changed. |
| 4b | Resolved | `US_ACTOR_ACTORS` AC-5 now reads "the Actor's identity (`US_ACTOR_WHOAMI`) ... use this discovery". That matches `SPEC_ACTOR_WHOAMI` AC-5 (the Actor is resolved through the scanner in `injectPrompt` step 1 before `ensureActorAgent` runs). "kindless" is gone from `REQ_ACTOR_SCHEMA` AC-7, `REQ_ACTOR_ACTIVATION` AC-3, `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-3; no `kindless` remains in any `.rst`. |

Side effect worth recording for the next Friday cycle: AC-5 no longer says the Actor "does not require any kind registration, kind-driven scanner, or multi-tree-root infrastructure". That sentence was the open SC-002 finding on `US_ACTOR_ACTORS` AC-5, so SC-002 drops from 4 findings to 3.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| R2-1 | CD text | status sentence and L1 "Examined" line | Three statements in the CD no longer match the tree, all consequences of the 2026-10-08 edits. (a) The list of 17 amended elements that stay `draft` omits `REQ_AUT_HEARTBEAT_RESOLVER_REUSE`: it was `draft` before this CR, `fe19edde` reworded its AC-3, so 18 `draft` elements are amended, not 17 (diff of every need against the merge-base). (b) `REQ_ACTOR_ACTIVATION` is still listed at L1 as "examined and left unchanged" (line 105), although its AC-3 was reworded and the Decisions section says so (line 65); `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` appears in the Decisions but not in the L1 impacted table. (c) The sentence "the 47 elements ... were approved again" cannot be reproduced: a text diff against `d1ee7592` gives 45 amended elements that were not `draft` (33 `implemented` + 12 `approved`, hence "the others stay `approved`" is 12, not 14). The 47 may have been counted differently, for example including elements whose text did not change; I could not tell. Reason this matters is the same as Round 1 finding 1: PM and CM read these counts as the scope of the change. Suggested: add the two requirements to the L1 impacted table as wording-only, add the 18th draft, and restate the counts from the diff or say how 47 was counted. | low |

#### PM Decisions

| # | Finding | Decision | Rationale |
|---|---------|----------|-----------|
| R2-1 | CD text: draft count, L1 "left unchanged" line, "47 approved again" | fix-now | Same reason as Round 1 finding 1: PM and CM read these counts as the scope of the change, and a wrong count misleads them. PM checked (a) itself: `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` was `draft` on `development` before this CR and still is, so 18 amended elements stay `draft`, not 17. PM's own accept-as-is decision of 2026-10-04 names 17, and its rationale is unchanged for the 18th; the number is corrected in PM backlog #43. Owner System Designer (his tables and sentences): add the 18th draft and correct the count in the Issues Found line, list `REQ_ACTOR_ACTIVATION` and `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` in the L1 impacted table as wording-only, and restate the "approved again" counts from the diff against the merge-base or say how 47 was counted. CD text only, no status or code change; QM then reads the CD only. |

Merge stays withheld until User validation and the open 3 s assumption are settled; the retained scenarios are T-1..T-8 and T-10 (Ctrl+F5).

### Round 3

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `04daf15c`, CD text only (CM asked for no gates; none were run). Compared with `d1ee7592` (merge-base) and my Round 2 commit `25ce52ba`; between those two, `04daf15c` and `5041a1cd` changed only this CD and PM's own memory and backlog files, so no specification, code or test file moved.
**Scope:** Finding R2-1 only. UAT/EDH T-1..T-10 are NOT RUN with no verdict; the 3 s wait is OPEN.

#### Verdict

R2-1 is resolved: all three points hold against the tree. No new finding. QM does not grant merge-readiness.

#### Re-check of R2-1

| Point | Result | Evidence (my own count, same method as Round 2: text diff of every need against `d1ee7592`, status field excluded) |
|---|---|---|
| (a) 18th draft | Resolved | The 18 amended needs that were `draft` at the merge-base and are `draft` now equal, as a set, the 18 names in the CD (compared programmatically); `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` is among them. The Issues Found line says 18 and keeps PM's 2026-10-04 accept-as-is rationale. |
| (b) L1 table | Resolved | `REQ_ACTOR_ACTIVATION` and `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` are rows in the L1 impacted table, "modified (wording only)", status unchanged. `REQ_ACTOR_ACTIVATION` is gone from the "left unchanged" line. The first row's "Linked From" entry `US_ACTOR_ACTORS` is in the requirement's `:links:`; the second row says "content search", which fits (its links point to `US_AUT_HEARTBEAT_VALIDATION`, a story this CR does not amend). |
| (c) counts | Resolved | 21 new (all `draft`) + 45 amended that were not `draft` + 18 amended that were `draft` = 84, as the CD says. Of the 45: 33 `implemented` and 12 `approved`, and the 12 equal the CD's list as a set. The CD's sub-claims also hold: 31 of the 33 were `approved` at the merge-base and 2 (`SPEC_DEV_DISPOSAL`, `SPEC_HOOK_INTAKE`) were already `implemented`; and 44 of the 45 were `draft` at some commit on this branch (history scan over the 24 commits touching `docs/`) while `REQ_ACTOR_ACTIVATION` never was, which is the CD's correction paragraph. |

#### Findings

None.

#### PM Decisions

None pending.

### User Validation (Extension Development Host, 2026-10-08, partial)

Observed by the user in a disposable EDH started with `Ctrl+F5`. This is not the scripted UAT run (now T-1..T-8 and T-10): no scenario is marked PASS or FAIL, and there is no verdict.

- Session 1, an existing session without a mode: no mode set, accepted because it predates its agent.
- Ping from session 1 to session 2 (message delivery into an Actor session): the agent file of session 2 was created and its mode set. Worked.
- Reply from session 2 back to session 1: worked.
- Session 3: the Actor had no chat session any more, so opening it created a new session with the session-start prompt, but **without the mode**.

**Reading (PM, from the code, not proven):** every path that creates or opens an Actor session calls `ensureActorAgent` first (`injectPrompt.ts`). For a new session the mode is primed before the chat opens, and for a freshly created agent the code waits at most 3 s for VS Code to know the mode (`waitForModeCommand`), then continues anyway. Two causes would give the observed picture: the 3 s wait ran out (the open assumption of the Test Protocol), or priming the mode on a new session does not work at all. They are told apart by opening a new session for an Actor whose agent file already exists. Whether the agent file of session 3 was created by that same call is not confirmed.

**Deviation:** `US_ACTOR_ACTORS` AC-7 says a session opens in the Actor's own agent; for this case it did not. User's view: not serious, because the session-start prompt carries the Actor's name and the path of its `context.md`, and the next message delivery sets the mode (the accepted limitation, backlog #42 point 8).

**Follow-up (user, 2026-10-08):** the user reports the clean case: with the Actor's session deleted, the `agent` entry removed from `actor.yaml` and the agent file deleted, clicking the Actor in Jarvis creates the agent file and sets the mode. So priming a new session works, and the 3 s wait was enough in that run (one sample on the user's machine, reached over RDP; supported, not settled). The user attributes the Session 3 miss to a VS Code effect, an open chat tab left behind after its session was deleted, which the user has seen before and does not count as a Jarvis problem. It was not reproduced and not investigated further.

**Decision (user):** no change for the Session 3 miss.

**Kernel instructions, Identity section (user decision, 2026-10-08): option A, remove the whole section 0 "Identity" from the Jarvis actor kernel instructions, in this change.** Reason (user): from now on the Actor's agent file carries the identity, so the kernel section is redundant; the name also stands in the session-start prompt and in every delivered message, and the user never saw a name lost after a compaction. PM had recommended leaving it, because it fails safe, and follows the user's decision. Consequences: the kernel no longer says what to do when the two identity lines are missing; sections 1 to 4 keep their numbers; `REQ_ACTOR_WHOAMI` AC-11 stays satisfied (it only forbids naming `jarvis_whoAmI`); `actorAgent.test.ts` asserts that the kernel asset contains "your own agent file" and must change. Routed to CM: System Designer checks whether a spec describes the section, Dev changes the asset and the test, Verify re-verifies, QM reads the result. Tracked as PM backlog #46 until merged.

**Kanban and compaction (user, 2026-10-08, later in the same EDH):** the user asked Session 1 to create a Kanban board and a test item through the tools. Session 1 created `kanban.yaml` and item 1 "Test Issue", passing `ownerName: "Session 1"`, which resolved to `.jarvis/actors/Session 1/` for both calls; the user asked whether `ownerName` caused a problem, the answer in the chat was no, and the user's reading is that Session 1 knows its own name and the board was created cleanly under it. This was not the former T-9: board opening with a different Actor's file focused and the refusal without `ownerName` were not exercised; no UAT PASS is recorded. The user decided not to run T-2 (compaction): the mode is now set, and the user has never seen a name lost after compaction. T-2 stays NOT RUN in the Test Protocol; the risk of a session without its mode (QM Round 4) is carried knowingly.

**Former T-9 removed (user decision, 2026-10-08).** With `jarvis_whoAmI` and the hooks gone, a Kanban tool cannot infer a focused Actor, so testing that the focused editor does not decide the board no longer tests existing behavior; `ownerName` is mandatory (`US_KAN_TOOLS` AC-4). The positive explicit-owner case was already observed in the EDH, and missing-owner refusal is covered by Engineering tests. The former Kanban owner US/REQ/SPEC UAT chain and T-9 protocol row are retired; T-10 retains its number.

### Round 4

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `ae2a344f`, compared with my Round 3 commit `c25b385e`. Built and tested on a `git archive HEAD` export with its own `npm ci`.
**Scope:** the removal of `## 0. Identity` from the kernel instructions asset (user decision 2026-10-08, PM backlog #46): `b64a39c2` (System Designer), `4a7a527d` (Dev), `ae2a344f` (Verify), plus the whole-graph check that nothing else moved. Everything else in Round 3 stays valid. User UAT and the scripted EDH scenarios T-1..T-10 are NOT RUN; the user's partial EDH observation above is recorded evidence, not a verdict; the 3 s wait stays OPEN.
**Stale file at start (reported to PM):** at 21:58:46 the working copy of this CD was modified and equal to the earlier committed version `c25b385e` (worktree blob `84718029334071f77985e91592e10e2237c6ddbc`, HEAD blob `c70838f37b27358e553c7e8c955cd54eb5f5e9d3`); it was written 21:58:38, three seconds after the CM message I received (stamped 21:58:35 local). Per the agreed practice I saved the diff to `%TEMP%\qm-stale-cd-20261008-2158.diff` and restored the file with `git restore`; afterwards its blob equalled HEAD. `testdata/.vscode/settings.json` also shows as modified (written 21:50:49) but its blob equals HEAD (line-ending touch), so I left it.

#### Verdict

No blocking finding. One Low finding (R4-1) for PM disposition, and a judgment on Verify's two observations below. QM does not grant merge-readiness.

#### Checked against the tree (export of `ae2a344f`)

| Check | Result |
|---|---|
| Asset has no `## 0.`; `## 1.` to `## 4.` intact | Yes. Headings in the asset: `# The Jarvis Actor Kernel`, `## 1. Local Memory`, `## 2. Messaging` (with `### End your turn with a clean tree`), `## 3. Escalation`, `## 4. Culture`. The diff against `c25b385e` removes exactly the five lines of section 0 and nothing else. |
| Nothing else points at the removed section | Searched the export (code, assets, manifests, READMEs, specs, stories; excluding archived historic change documents and release notes) for "identity section", "section 0", "## 0.", "0. Identity", kernel/identity pairs, "actor-owned writes" and "two agent lines". Remaining hits are descriptive only: `SPEC_ACTOR_WHOAMI` (text and AC-10), this CD, the validation report, PM's backlog. `REQ_MOD_ACTORRULES` names a content baseline of two things the asset still contains ("End your turn with a clean tree", the scope-escalation paragraph) and no section list, so the CD's statement that the actor-rules requirements and specs describe delivery, not section content, holds. |
| Tests match the specification | `actorAgent.test.ts` asserts the asset does not contain `jarvis_whoAmI` (`SPEC_ACTOR_WHOAMI` AC-8; also covers `REQ_ACTOR_WHOAMI` AC-11, which only forbids that tool) and, new, that it has no `## 0.` and no `Identity` and still contains the four section headings (AC-10). The old assertion "contains `your own agent file`" is removed, as it must be. |
| Statuses and links | All 573 needs, `c25b385e` against HEAD: 0 status changes, 0 link changes, 0 added or removed, 0 unresolved links; the only need whose text changed is `SPEC_ACTOR_WHOAMI` (AC-10 added, the kernel paragraph reworded). It went `implemented` → `approved` (`b64a39c2`) → `implemented` (`ae2a344f`), so net unchanged since Round 3; 33 `implemented` as before. |
| Gates | `tsc` x7 exit 0; Vitest 47 files / 372 tests passed (one more than Round 3: the AC-10 test); strict Sphinx `-E -W` exit 0; unfiltered lint 0 errors / 176 warnings (unchanged). Equal to Verify's report. |

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| R4-1 | L1/L2 trace, test | `SPEC_ACTOR_WHOAMI` AC-10; `REQ_ACTOR_WHOAMI` AC-11; `actorAgent.test.ts` L227–237 | Verify's observation (1) is a real gap in the chain, not only a style point. AC-10 states a user decision ("the kernel has no identity section") at design level, but no requirement above it carries that decision: `REQ_ACTOR_WHOAMI` AC-11 only forbids naming `jarvis_whoAmI`. A later kernel that adds a differently worded identity section satisfies the requirement and fails the design and the test; a reader of the requirements alone would not know the decision exists. Reason it matters: the decision lives only in AC-10, the CD and backlog #46, and the one place a requirement-level reader looks does not say it. In addition the test is broader than its AC: `not.toContain('Identity')` rejects the capitalised word anywhere in the asset, not only a section, so an unrelated future sentence would fail it. Suggested: either one added sentence at L1 (`REQ_ACTOR_WHOAMI` AC-11: the kernel instructions SHALL NOT contain an identity section) so AC-10 traces to a requirement, or accept AC-10 as a pure design pin and say so; and narrow the test to the heading (`## Identity` or `## 0.`). Design is user-guided, so the choice is PM's and the System Designer's. | low |

#### Judgment on Verify's two observations

1. **AC-10 stricter than AC-11:** see R4-1.
2. **The dropped escalation rule** ("if the two agent lines are missing, stop actor-owned writes and ask the user"): not a defect against the specification; the spec records it as a decided consequence of the user's decision, and the CD records the user's reason (the agent carries the identity; the name is also in the session-start prompt and delivered messages). I would not reopen it. For the record, two facts bear on the residual risk, so the user decided with them in view and PM can confirm: (a) the situation the rule covered is a designed state, not an exotic one. `ensureActorAgent` returns `skipped` for four reasons (`nameMismatch`, `duplicateAgent`, `noWorkspace`, `writeFailed`), and in each the Actor opens in the default agent, without the two lines; sessions that predate their agent also have no mode, which the user's own EDH run showed twice (Session 1 accepted, Session 3 not reproduced). (b) In such a session the only identity source left is the session-start prompt, because the agent body reaches a request only when the mode is set, so `US_ACTOR_WHOAMI` AC-2 (identity after a compaction) is carried by the agent only in sessions that have the mode; the removed kernel text was the instruction that told the Actor not to guess a name from titles or folders in the other case. The user judged this acceptable because they never saw a name lost after compaction; I have no evidence against that, only that the scripted EDH scenario that would test it (T-2 on a session without the mode) has not been run. Suggested, not required: when T-1..T-10 are run, add T-2 on a session opened without its mode, so the accepted risk has one observation behind it.

#### PM Decisions

| # | Decision | Reason |
|---|----------|--------|
| R4-1 | **Defer**, tracked as PM backlog #47 (Low). | No behaviour is wrong today: the asset has no identity section, and the test fails loudly, never silently, if the word `Identity` appears anywhere in it. Fixing now costs another run through System Designer, Dev, Verify and QM, with a requirement wording the user guides, before the user's validation and the merge. The gap itself is accepted as stated by QM: the decision lives in `SPEC_ACTOR_WHOAMI` AC-10, this CD and backlog #46, not in a requirement. Open for the System Designer and the user: one L1 sentence in `REQ_ACTOR_WHOAMI` AC-11, or AC-10 declared a pure design pin; then narrow the test to the heading. |
| Verify observation 2 (dropped escalation rule) | **Accept as-is.** | The user decided it with the reason recorded above; QM sees no defect against the specification. The residual risk (an Actor in a session without its mode relies on the session-start prompt alone) is carried knowingly. QM's suggestion is adopted for the validation: when the retained scenarios T-1..T-8 and T-10 are run, T-2 (compaction) is also run on a session opened without its mode. |

### Round 5

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `af84efda`; reviewed committed files from a `git archive HEAD` export. Removal commit: `c343773c`; Verify report: `ba2b0fd4`.
**Scope:** removal of the former T-9 scenario and its US/REQ/SPEC chain, the resulting counts, and Test Protocol wording. Earlier rounds and PM dispositions are not reopened. No code gates or EDH scenarios were run.

#### Verdict

No new finding in this scope. The T-9 removal is consistent with the recorded user decision. QM does not grant merge-readiness. Retained User UAT remains NOT RUN with no verdict; the 3 s mode-command wait remains OPEN.

#### Per-Level Results

| Level | Result | Evidence |
|---|---|---|
| L0 | PASS | `US_UAT_ACTOR_KAN_OWNER` is removed, not replaced. Six actor-identity UAT stories remain; exactly two use "As an Actor" (`CREATETOOL`, `LISTTOOL`), under the existing accepted disposition. `US_KAN_TOOLS` remains a product story but has no User scenario in this protocol, explicitly disclosed. |
| L1 | PASS | `REQ_UAT_ACTOR_KAN_OWNER` is removed; the six retained UAT requirements remain. Product ownerName requirements are unchanged. |
| L2 | PASS | `SPEC_UAT_ACTOR_KAN_OWNER`, its T-9 procedure and the header instruction to enable Kanban for T-9 are removed. The retained design has nine scenarios: T-1 through T-8 and T-10; T-10 retains its number. |
| Trace / Schema | PASS | No removed-chain ID remains anywhere in active RST text, links or toctrees. The retained needs graph has no unresolved link targets. The only removed status lines since Round 4 belong to the three deleted draft elements; no surviving element's status changed. Strict Sphinx (`-E -W --keep-going`) on the export passed. |

#### Independent Counts

Parsed each need block from the exported RST files, compared its text against merge-base `d1ee7592` with the status field excluded, and counted new IDs separately: 18 new (6 US, 6 REQ, 6 SPEC, all draft) + 63 amended = 81. The amended set splits into 45 previously approved/implemented (33 implemented now: 31 promoted from approved and two already implemented, `SPEC_DEV_DISPOSAL` and `SPEC_HOOK_INTAKE`; 12 approved) and 18 previously draft (all still draft). These match the updated CD and Verify's counts.

#### Evidence Judgments

1. **Missing-owner refusal:** the Test Protocol's engineering-coverage statement is supported only at the static/unit level. `kanban-ownername-required.test.ts` inspects the real resolveOwner source for the error text and absence of the former fallback, checks all eight required-input schemas, and exercises a local copy of the resolver logic. It does not invoke a registered tool at runtime. This is not User UAT or live integration evidence; no such result is inferred. No new finding, because the protocol makes no runtime-tool or UAT PASS claim.
2. **Nine scenarios versus T-11:** nine refers specifically to the actor-identity design. The protocol additionally lists the existing Kanban skill T-11 and explicitly links to its separate design. There are ten listed protocol rows, all NOT RUN; the CD's nine-scenario statement names its scope and numbers, so it does not conflict with that extra row.

#### Findings And PM Decisions

No new findings or decisions requested. Earlier accepted/deferred findings remain under their existing dispositions.

### Round 6

**Reviewed by:** QM
**Review date:** 2026-10-08
**Baseline:** `5eafbb83`, read from a `git archive HEAD` export; merge `5be25935` joins our Round 5 baseline `5cf537f4` and development `2e543531`.
**Scope:** merge preservation, revised counts/status attribution, and the combined `SPEC_ENG_API` rationale. Rounds 1 to 5 and their dispositions remain valid. Direct checks follow QM's transitional rule; no new engineer dispatch or code gates.

#### Verdict

No blocking merge defect found. One Low documentation finding, R6-1, for PM disposition. No merge-readiness or User UAT verdict is granted. T-1 through T-8 and T-10 remain NOT RUN; the 3 s wait remains OPEN.

#### Per-Level Results

| Level | Result | Evidence |
|---|---|---|
| L0 | PASS | Our retained six UAT stories and T-9 retirement survive; incoming recorder/heartbeat story changes match development. The only surviving story status difference from Round 5 is `US_REC_CAPTURE` (implemented to approved), exactly development's status. |
| L1 | PASS | Our requirements and ownerName contract survive. `REQ_AUT_JOBEXEC`, `REQ_REC_BUTTON`, and `REQ_REC_STATUSBAR` move from implemented to approved exactly as in development. Incoming Actor-mark/model requirements remain present; no exclusive requirement change was lost. |
| L2 | PASS with Low finding | Kernel section 0 removal, T-9 retirement, and actor-agent design survive. `SPEC_AUT_AGENTEXEC` moves implemented to approved and `SPEC_MOD_REC_PKG` approved to implemented exactly as in development. Keeping `SPEC_ENG_API` approved is coherent; its CD evidence claim needs correction (R6-1). |
| Trace / Schema | PASS | Independent need parsing finds no duplicate IDs or unresolved link targets. The combined API links preserve our Actor contract and add the incoming Actor-mark requirement. Verify's strict exported Sphinx PASS remains the integration schema evidence; no reason to repeat its full gates. |

#### Counts And Attribution

Independent block-text comparison against the new merge-base `2e543531`, excluding the status field, reproduces 81 = 18 new (6/6/6, all draft) + 63 amended. Of the amended needs, 45 were approved/implemented: 32 implemented now (30 promoted, two already implemented at base) and 13 approved; 18 were and remain draft. `SPEC_ENG_API` is the sole difference from the former 33/12 split. All seven surviving status differences from Round 5 are listed in the level results and are explained; no unexplained status change was found.

#### Preservation And API Judgment

- Compared changes from common ancestor `d1ee7592` on both parents: every product/spec file changed on only one side matches that parent's content after the merge. The incoming recorder package and heartbeat executor match development exactly. Overlapping core files retain our actor-name projection/agent resolution and the incoming marks/model functionality; the three `ensureActorAgent` callers remain, all eight Kanban tool schemas require ownerName, and the kernel/T-9 removals remain intact.
- `SPEC_ENG_API` combines our `JarvisActor.agent == name` projection with incoming `markActor`/AC-10 and `HeartbeatStep.vendor`/`model`; version 2 is retained. Approved is a conservative, coherent status for the whole combined contract while `SPEC_ENG_ACTORMARK` is still approved on development. That status decision must be distinguished from what Verify inspected: its integration section explicitly checks the combined API members against the code. See R6-1; QM does not request a status promotion.
- Verify's integration report (`87d12f94`, export of `a24b8106`) records seven compiles, bundles, 53 files / 500 tests, strict Sphinx PASS and source lint 0 errors / 182 warnings; three known generated-bundle lint errors remain disclosed. These are Verify's results, not independently rerun gates in this round.

#### Findings And PM Decisions

| # | Level | Element / artifact | Finding | Severity |
|---|---|---|---|---|
| R6-1 | L2 documentation | `SPEC_ENG_API`; this CD's merged-status paragraph | The reason says "no Verify of this change judged" the incoming `markActor` and `HeartbeatStep` fields, but the integration report's `SPEC_ENG_API against the code` section explicitly verifies those members and says the code behaves as AC-10 and `SPEC_ENG_ACTORMARK` specify. This is an evidence-description discrepancy, not an implementation defect or demand to promote the status. Suggested: retain approved if intended, but state that integration verification covered the combined code while SD chose not to promote the incoming design element; distinguish that decision from lack of verification. PM/SD decide the final wording. | low |

R6-1 awaits PM disposition. Existing accepted/deferred findings and UAT limitations are unchanged.

**PM decision R6-1 (2026-10-08): fix now, done.** Reason: the CD is the record the next reader trusts, the correction is one sentence, and a wrong evidence statement is cheaper to correct before the squash than after. System Designer corrected the `SPEC_ENG_API` bullet in the merged-status paragraph in `64076650`: it now keeps apart (a) Verify's integration check of the combined contract against the code and (b) System Designer's own choice not to promote `SPEC_ENG_API`, which stays `approved`. No status or count changed, and neither Verify nor QM ran again for this line. The cause of the wrong sentence: Verify's message said the incoming parts were not part of its scope, and each relay made that statement stronger than Verify's report supports. The finding text above is QM's wording and stays as written, as the history of the discrepancy.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
