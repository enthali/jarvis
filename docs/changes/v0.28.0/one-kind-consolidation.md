# Change Document: one-kind-consolidation

**Status**: in-progress
**Branch**: feature/one-kind-consolidation
**Created**: 2026-09-20
**Author**: Project Manager
**Operation Mode**: user-guided

---

## Summary

Replace the three-entity-kind system (Actor / Event / Project) with a single,
simple **Actor** entity built in parallel to the old system — Strangler-Fig
style. Phase 1 (this CR) adds the new "ACTORS" tree root, a simple Actor with
only a configurable root path (`jarvis.actors.folder`), full feature parity
with the current Actor (agent binding, messaging, whoAmI, context.md,
`jarvis_createActor`), and the kind-registration API from core. The old
Actor/Project/Event stack keeps working untouched. Phase 2 (separate CR)
removes the old stack: kind machinery, old tree roots, old settings
(`jarvis.projectsFolder`, `jarvis.eventsFolder`), old LM tools
(`jarvis_listProjects`, `jarvis_createProject`, `jarvis_listEvents`,
`jarvis_createEvent`).

**Why:** the kind distinction is unused in practice — all users except the
maintainer work with Actors only. The new ACTORS root discovers only direct
child Actor folders; moving a folder away from that level or deleting it is
ordinary filesystem management, not a Jarvis archive feature. The `ENT`
abstraction layer ("at least two kinds")
has no purpose once a single kind exists.

**No auto-migration.** The maintainer migrates existing Projects/Events by
hand; there are no other users (user decision 2026-09-20).

**Follow-up (separate CRs):**
- Phase 2: removal of the old architecture (breaking)
- ID rename `ENT` → `ACT` across the spec graph (pure rename, no behavior)
- syspilot workflow consolidation (Change Contract as central artifact)
- AHP (Agent Host Protocol) — hookless session management, native Activity/WhoAmI

---

## Architecture Decision Records

*Decisions made during the user-guided L0 walkthrough, recorded as they are
settled, with the reason a reviewer is being asked to challenge.*

### ADR-1: Two-phase Strangler-Fig (parallel build, then removal)

**Decision:** This CR is **additive only**. The new Actor system lives
side-by-side with the old (Actor/Event/Project) system in a separate "ACTORS"
tree root. A second, separate CR removes the old system once the new one has
been validated.

**Reason:** removing the old kinds in the same CR that adds the replacement
would produce a version that must be validated and then immediately torn down.
Building in parallel means Phase 1 is a stable, shippable increment; Phase 2
becomes a pure removal CR (no new behavior to design or validate — only
cleanup). Both phases are independently reviewable.

**Alternative rejected:** single two-commit CR (add + remove in one branch).
Rejected because the removal must not land before the new system is proven in
use, and a merged additive phase gives us that evidence window.

### ADR-2: No automatic migration of existing Projects/Events

**Decision:** There is no auto-migration. Migration of the maintainer's
existing Projects/Events is manual work, outside this CR.

**Reason:** auto-migration requires knowledge of all legacy folder/file
structures (`project.yaml`, `event.yaml`, naming conventions like
`<date>_<name>/`), encodes that knowledge in code permanently, and serves
exactly one human: the maintainer. Hand migration is cheaper and the code
never needs to know about the old shapes.

**Alternative rejected:** `US_ENT_MIGRATE` + `REQ_ENT_MIGRATE` +
`SPEC_ENT_MIGRATE` (pre-filled by the Architect). Retired during the L0
walkthrough per user decision 2026-09-20.

### ADR-3: The `ENT` (Entity) abstraction layer is retired, not reused

**Decision:** The cross-kind "Entity" abstraction (`US_ENT_*` / `REQ_ENT_*` /
`SPEC_ENT_*`, justified as "behavior shared by at least two of the three
kinds") is retired. With a single kind there is no cross-kind behavior to
abstract over; the US tree ends in one `ACT` subtree.

**Consequence:** a follow-up CR performs the pure ID rename `ENT` → `ACT`
across the spec graph (hundreds of `:links:` references). It is deliberately
not part of this CR — see ADR-4.

**Reason:** reusing `ENT`-themed IDs for a single-kind system would leave a
meaningless abstraction in the ID space; the rename is mechanical once
behavior is settled.

### ADR-4: The ID rename is a separate CR, not part of this one

**Decision:** Renaming all `US_ENT_*`, `REQ_ENT_*`, `SPEC_ENT_*` (and their
inbound `:links:` references across the whole spec graph) is a separate CR,
dispatched after this one.

**Reason:** (a) this CR already contains a large behavior change; mixing in a
graph-wide mechanical rename would make the diff unreviewable. (b) a
two-step approach gives a stable intermediate step: behavior is settled and
validated before IDs change, so the rename CR is verifiable by link-count
conservation alone (every broken link = an error, no semantic review needed).

### ADR-5: No kind-specific filter UI (root scope revised 2026-09-23)

**Decision:** No per-kind filter UI (project folder filter, future-events
filter). For the new ACTORS root, only folders directly under
`jarvis.actors.folder` containing `actor.yaml` are discovered as Actors.
Nested folders are not scanned or displayed as Actor groups. There is no
Jarvis archive feature, workflow, or separate archive requirement: a user
may move a folder out of the root's direct children (including into a
nested `archive/` folder, which is not scanned) or delete it through the
filesystem. This decision does not change the legacy tree in Phase 1.

**Reason (revised):** The user explicitly limited Actor discovery to direct
children of the configured root. The previous recursive archive-under-root
model would make a moved Actor remain discoverable, contrary to that rule.
Filesystem moves need no Jarvis archival behavior; kind-specific filters
remain unnecessary in a single-kind collection.

**Supersedes:** ADR-5's earlier promise of recursive Actor organization
and an in-root archive group. The direct-child rule applies to the new
ACTORS root only; L1 and UAT revisions follow after L0 review.

**Consequence (L0):** `US_PRJ_PROJECTFILTER` and `US_EVT_EVENTFILTER` are
marked `:status: deprecated` in place (removed in Phase 2).

### ADR-6: Deprecated in place, removed in Phase 2 (revised 2026-09-21)

**Decision (revised):** User stories whose features no longer exist in the
new simple-Actor model are **not deleted** from `us_prj.rst` / `us_evt.rst`.
Instead, they are marked `:status: deprecated` in place, with a Note
recording the retirement. The files remain in the toctree. Physical removal
of the files and their stories happens in the Phase 2 follow-up CR, together
with the rest of the legacy stack.

**Reason (for the revision):** The original "delete and remove files"
approach was implemented in commit `7fe7751`. On 2026-09-21 the user
decided that Phase 1 must be strictly additive — no file deletions, no
story removals — because the old system must remain fully documented and
buildable until Phase 2 removes it. A `:status: deprecated` story that
remains in the Sphinx graph is the correct status: it is visible, it is
traceable, it does not break any inbound `:links:` references, and it will
be cleaned up together with its implementation in Phase 2. Inbound
`:links:` in L1 requirements (`req_prj.rst`, `req_evt.rst`) also remain
valid because the story IDs still exist.

**Supersedes:** the original ADR-6 (delete + remove files), implemented in
commit `7fe7751`, reverted in commit `66af836`.

### ADR-7: L2 (Design) is out of scope for this CR — KISS exception

**Decision:** This CR writes L0 (User Stories) and L1 (Requirements) only.
No RST design specs. The implementation is "simple": one tree root, one
scanner, one configurable path, reuse of the existing actor machinery.

**Reason:** the user explicitly judged that for this shape of change the
design is the code itself ("specs können wir auch weglassen ganz ehrlich das
kann auch gleich im code passieren"). A full L2 would re-document behavior
that L0/L1 already pin down and that the implementer controls directly. This
exception is recorded here so QM does not flag the missing L2 as a gap.

**Boundary of the exception:** the exception covers *new* design for the new
Actor. Removing the old system (Phase 2) still carries its own Change
Document with its own consistency checks.

### ADR-8: The new Actor is a persona with three unique capabilities (revised 2026-09-21)

**Decision (revised):** The new Actor is defined by three unique capabilities
that distinguish it from a plain Agent persona:

1. **Persistent context** — the Actor owns a `context.md` file that is its
   durable memory; the file persists across sessions and is owned by the
   Actor, not by any single chat session.
2. **Self-activation** — the Actor can be woken by a heartbeat job or a
   reminder without any user interaction; it is not limited to
   user-initiated conversations.
3. **Loose session binding** — the Actor is coupled to a chat session for
   interaction, but the coupling is loose: the session can be closed,
   restarted, or swapped without losing the Actor's identity or memory. The
   Actor outlives any single session.

The goal: **a persona that can adopt a role** — it manages its own context
and can actively interact, without the kind machinery (registration,
multi-tree-root, kind-specific filters) of the legacy Entity system.

**Reason (for the revision):** The original ADR-8 described the new Actor as
"the current Actor minus kind machinery" — a re-labeled version of the
existing legacy Actor. The user clarified (2026-09-21, verbatim): *"ein
actor ist — wenn du so willst — eine erweiterung eines agenten. er hat als
unique differences die möglichkeit seinen context persistent zu speichern,
kann sich über heartbeat oder reminder selbst aktivieren und ist an eine
nicht persistente chat session gekoppelt (wobei das koppeln loose ist die
session kann ja ausgetauscht werden). ... was ich ja will ist eine persona
die eine rolle übernehmen kann."* The persona framing, not the legacy
Actor-minus-machinery framing, is the source of truth.

**Supersedes:** the original ADR-8 (full parity minus kind machinery,
implementer-controlled), implemented in the prior session.

**Scope note:** the 3-capability definition is the L0 source of truth. L1
requirements will expand on each capability (persistent context: what the
file convention is, who owns it; self-activation: heartbeat + reminder
integration; loose binding: session lifecycle). The legacy Actor machinery
(storage paths, `jarvis_whoAmI`, `jarvis_createActor`, messaging, Kanban) is
reused where it fits the 3-capability model; it is not the definition.

**Superseded in part by ADR-12:** Self-activation here was an interpretation
of the 2026-09-21 wording, not a promise that heartbeat or reminders override
message-delivery preferences.

### ADR-9: `jarvis.newActorSimple` is a Phase-3 rename, not a L1 decision

**Decision (2026-09-22):** The L1 requirement `REQ_ACTOR_CREATE` AC-1
nominates `jarvis.newActorSimple` as the command ID for the new simple-Actor
creation flow. This name is **deliberately not final** — it is a working
placeholder. In Phase 3 (a follow-up CR after the ENT→ACT ID rename and
after the new Actor is stable in production) the command ID will be renamed
to the final name appropriate for the single-kind system (likely
`jarvis.newActor` once the legacy `jarvis.newActor` is removed, or a
similarly clean name). The `_TO_BE_RENAMED` marker is not used in the code
itself but is recorded here so implementers and reviewers know the name is
intentionally provisional.

**Reason:** the user (2026-09-22) explicitly deferred the naming decision to
a later phase: "wir könnten es `jarvis.newActor_TO_BE_RENAMED` nennen dann
wissen wir dass wir noch was aufräumen wollten". Recording it as a decision
(ADR) rather than leaving it as an open point keeps the L1 spec complete
and avoids QM flagging it as a gap.

**Consequence:** `REQ_ACTOR_CREATE` AC-1 references `jarvis.newActorSimple`
as the Phase-1 command ID. A Phase-3 CR or an in-phase rename task will
change this to the final name; until then, all code and specs use
`jarvis.newActorSimple`.

### ADR-10: New Entry QuickPick belongs in the new ACTORS tree (2026-09-22)

**Decision:** The new ACTORS root's `+` opens a "New Entry" QuickPick;
its "Create Actor" choice starts the new-Actor name input and creation flow.
The legacy QuickPick remains a parallel path in Phase 1. Phase 2 removes
the legacy tree entry point but keeps the QuickPick in the ACTORS root.
The new root offers no Project, Event, or legacy Session choices.

**Reason:** The user chose to place the New Entry picker in the newly built
Actor tree root, not remove it with the old tree. Limiting the new root to
Actor creation preserves ADR-5's single-kind model while leaving legacy
choices available through the old entry point until Phase 2.

**Consequence:** `US_ACTOR_CREATE` AC-1/AC-6 and `REQ_ACTOR_CREATE`
AC-1/AC-7/AC-8 describe the same QuickPick lifecycle. The Phase-2
remove-versus-redirect conflict is resolved: remove the old *entry point*,
retain the new QuickPick.

### ADR-11: Expose the Actor convention file path in tool responses (2026-09-23)

**Decision:** For new-convention Actors, `id` in `jarvis_listActors` entries
and successful `jarvis_whoAmI` responses is the absolute path to that
Actor's `actor.yaml`, matching the internal scanner key. No `id` is stored
in `actor.yaml`. Existing response fields remain, and legacy Actor responses
are unchanged in Phase 1.

**Reason:** The user needs the path in the tool response to find `actor.yaml`
and rejected an ID field inside that file. A folder or `context.md` path
would not directly identify the convention file.

### ADR-12: Message senders do not select delivery (2026-09-25)

**Decision:** Actors receive messages through the existing message queue.
Heartbeat and reminders only send/queue messages, with no Actor-specific
activation exception. The existing per-destination delivery preference alone
decides whether a notification opens/reuses a chat session automatically or
awaits manual delivery. Disabled auto-delivery is intentional and neither
sender may enable it. An Actor's persistent context is available when the
message-delivery mechanism or user opens its session; the sender does not
resume the Actor directly.

**Reason:** The user clarified that Phase 1 copies existing message behavior,
not a new autonomous-activation workflow. The earlier self-activation claim
in ADR-8 and `US_ACTOR_ACTORS` AC-3 conflated the ability to address a closed
Actor with guaranteed automatic delivery. Heartbeat already queues messages;
the reminder path enabled auto-delivery at the time of this decision, contrary
to the clarified preference boundary. This required a contract/code correction,
not a new opt-out rule.

**Gate:** L0 MECE advisory found no material overlap or contradiction in
`02c86a9`; its clarity and traceability findings were resolved in
`US_ACTOR_ACTORS` AC-3/`:links:`. Strict Sphinx passed. The previously
approved `US_ACTOR_ACTORS` and `US_MSG_AUTODELIVERY` are approved again;
`US_MSG_REMINDERS` retains its pre-existing draft status. L1 draft `edeba2e`
reconciled `REQ_ACTOR_ACTIVATION` AC-1..AC-3,
`REQ_MSG_AUTODELIVER_CONFIG` AC-7, and `REQ_MSG_REMINDERS_DELIVER` AC-3:
senders queue without overriding the target's delivery preference. L1 MECE
advisory found no requirement-level overlap or contradiction; the existing
queue, heartbeat and poll contracts remain consistent. Strict Sphinx passed;
commit `4caf149` approved `REQ_ACTOR_ACTIVATION` and
`REQ_MSG_AUTODELIVER_CONFIG` after review.
`REQ_MSG_REMINDERS_DELIVER` retains its pre-existing draft status.
At the L1 handoff the reminder poll loop still called `addAutoDelivery` and
`SPEC_MSG_REMINDERSLOOP` mandated that call; both required correction.
`SPEC_UAT_REMINDERS` T-2/T-6/T-7 and `REQ_UAT_REMINDERS_DELIVER` AC-1..AC-4
still promise unconditional delivery without an auto-enabled precondition.
Their owners must reconcile design, code and UAT with ADR-12. This L0/L1
specification consistency result is not implementation verification, QM OK,
or User UAT release.

**Existing L2 design reconciliation (2026-09-25):** The draft
`SPEC_MSG_REMINDERSLOOP` now specifies queue-only reminder processing and
preserves the target's existing auto/manual delivery preference, consistent
with `REQ_MSG_REMINDERS_DELIVER` AC-3 and `REQ_MSG_AUTODELIVER_CONFIG` AC-7.
Its example no longer calls `addAutoDelivery` or reports enqueueing as
confirmed delivery; the existing auto-delivery poll notifies only previously
enabled targets, and other messages remain available for manual delivery.
The existing spec ID and links to the reminder requirement, queue, reminder
store and shared delivery design remain unchanged. Strict Sphinx passed.
L2 MECE advisory confirmed the queue-only design, conditional next-tick
notification and existing trace, but identified an L1/L2 removal-order
disagreement: `REQ_MSG_REMINDERS_DELIVER` AC-4 said removal happens after
enqueue, whereas `REQ_MSG_REMINDERS_PERSIST` AC-6 and this design atomically
remove due reminders in `popDueReminders` before queue append. AC-4 now states
that actual order and the no-retry, at-most-once consequence of an append
failure. Strict Sphinx passed after this correction; focused MECE re-review
confirmed the removal order and at-most-once guarantee, but found a narrower
error path: the old `SPEC_MSG_REMINDERSLOOP` example did not catch failures
from `popDueReminders` before the per-reminder append loop, contrary to
`REQ_MSG_REMINDERS_DELIVER` AC-6. The design now specifies a warning and an
early return for that tick (or an empty list from the extracted processor),
without stopping later ticks. Strict Sphinx passed; focused MECE re-review
of `8237ccc` confirmed AC-6, AC-4, and the linked design now agree on pop
errors and at-most-once append failures, with no remaining contradiction in
the reviewed scope. Current `processDueReminders` runtime still calls
`popDueReminders` outside its `try/catch`; Dev owns implementation and
regression evidence. Dev commit `d5b392c` replaced the runtime reminder
enqueue call with `enqueueReminder`, whose helper only appends to the queue;
this is observed code, not independent verification. The reminder requirement
and design retain their pre-existing draft status, and technical Reminder UAT
retirement remains gated on PM's evidence decision. This MECE advisory is not
QM OK or User UAT release.

---

## Level 0: User Stories

**Status**: completed. All four `US_ACTOR_*` stories are approved; the
direct-child revision was approved on 2026-09-23 and the Actor naming
boundary in `US_ACTOR_ACTORS` AC-1 was approved in `c137ed7`.

### Deprecated User Stories (ADR-5, ADR-6 revised — in place, removed in Phase 2)

| ID | File | Reason |
|----|------|--------|
| US_PRJ_PROJECT | us_prj.rst | kind definition — no kind exists in the new model |
| US_PRJ_PROJECTFILTER | us_prj.rst | no kind-specific filtering in the new direct-child ACTORS root (ADR-5 revised) |
| US_PRJ_LISTPROJECTS | us_prj.rst | `jarvis_listProjects` subsumed into `jarvis_listActors` |
| US_PRJ_CREATEPROJECT | us_prj.rst | `jarvis_createProject` subsumed into `jarvis_createActor` |
| US_EVT_EVENT | us_evt.rst | kind definition — no kind exists in the new model |
| US_EVT_DATESORT | us_evt.rst | "events" as a kind no longer exist |
| US_EVT_EVENTFILTER | us_evt.rst | no kind-specific filtering in the new direct-child ACTORS root (ADR-5 revised) |
| US_EVT_LISTEVENTS | us_evt.rst | `jarvis_listEvents` subsumed into `jarvis_listActors` |
| US_EVT_CREATEEVENT | us_evt.rst | `jarvis_createEvent` subsumed into `jarvis_createActor` |

All 9 stories marked `:status: deprecated` in place with a Note; files remain
in the toctree. Physical removal in Phase 2.

### Deprecated UAT Files (in place, removed in Phase 2)

| File | Story | Tested (now deprecated) |
|------|-------|------------------------|
| `us_uat_createproject.rst` | US_UAT_CREATEPROJECT | US_PRJ_CREATEPROJECT — deprecated in place |
| `us_uat_createevent.rst` | US_UAT_CREATEEVENT | US_EVT_CREATEEVENT — deprecated in place |
| `us_uat_listevents.rst` | US_UAT_LISTEVENTS | US_EVT_LISTEVENTS — deprecated in place |

Toctree entries in `docs/userstories/index.rst` and
`docs/userstories/us_uat.rst` restored. The corresponding `req_uat_*.rst`
requirements are marked deprecated in the L1 pass.

### Retired / Modified UAT Stories (in-place, files remain)

| ID | File | Change |
|----|------|--------|
| USE_UAT_SIDEBAR (US_UAT_SIDEBAR) | us_uat_projfolders.rst | **Modified**: Scope extended to cover actor.yaml as the new ACTORS tree's convention file; existing T-1..T-8 (project.yaml / event.yaml detection, grouping, no-descent) remain as the Phase-1 baseline. *No deletion — the convention-file model still exists for the unified tree until Phase 2.* |
| US_UAT_SAMPLEDATA | us_uat_explorer.rst | **Modified**: T-4 (project folder filter), T-5 (filter persistence), T-6 (future-event filter) removed — these test features deprecated with the Project/Event kinds (removed in Phase 2); T-7 (config-change rescan) renumbered as T-4. `:links:` loses `US_PRJ_PROJECTFILTER` and `US_EVT_EVENTFILTER` (now deprecated IDs, still resolvable). |
| US_UAT_EVENTFILTER | us_uat_projfolders.rst | **Retired** (`:status: deprecated`): tested the future-event filter + empty-branch pruning, both removed with US_EVT_EVENTFILTER (Phase 2). Test scenarios kept as historical context; `:links:` keeps only `REQ_EXP_TREEVIEW`. |

### Retired User Story

| ID | Reason |
|----|--------|
| US_ENT_ENTITY | "three distinct entity kinds" is the inverse of this CR; retired in place (`:status: deprecated`, not physically removed) with a pointer to US_ACTOR_TREE (new) as successor. Inbound links from US_ENT_* stories remain valid until the follow-up rename CR retires the whole ENT theme. |

### Deprecated User Stories (this CR's own legacy Actor stories)

| ID | File | Change |
|----|------|--------|
| US_ACT_ACTORS | us_act.rst | Marked `:status: deprecated`, title "Legacy — One-Kind-Consolidation Phase 1"; Note points to us_actor.rst (US_ACTOR_ACTORS). I-want rewritten to persona model. |
| US_ACT_WHOAMI | us_act.rst | Marked `:status: deprecated` — the new `jarvis_whoAmI` for the new simple Actor is US_ACTOR_WHOAMI in us_actor.rst. |

### Modified User Stories

| ID | Change |
|----|--------|
| US_ENT_NEWENTITY | "Create New Project or Event" → "Create New Actor": one `+` button in the ACTORS title bar opens the new Actor-only "New Entry" QuickPick; creation writes to `jarvis.actors.folder`. `:links: US_ACT_CREATE` → `:links: US_ACTOR_CREATE`. *Note: the ID is `ENT`-themed; the rename to `US_ACTOR_*` is the follow-up rename CR (ADR-4).* |
| US_EXP_SIDEBAR | Added a one-line note marking this story as the **legacy** unified tree; Phase 1 adds the separate ACTORS root (US_ACTOR_TREE) in parallel, Phase 2 removes the unified tree's Project/Event categories. ACs unchanged. |
| US_UAT_SAMPLEDATA / US_UAT_SIDEBAR / USE_UAT_EVENTFILTER | In-place UAT modifications/retirement as in the table above. |
| `namingconventions.rst` | PRJ and EVT theme rows: example IDs restored to live IDs (US_PRJ_PROJECT / US_EVT_EVENT) with a "legacy; removed in Phase 2" pointer. ACT row: "Legacy Actor" — "removed in Phase 2". New ACTOR row: "New simple Actor" — live example IDs (US_ACTOR_ACTORS / REQ_ACTOR_TREE / REQ_ACTOR_CREATE). ENT row: retirement pointer for the follow-up rename CR. |

### New User Stories (us_actor.rst — new file, written from scratch)

| ID | Title | Priority |
|----|-------|----------|
| US_ACTOR_ACTORS | The new simple Actor: a persona with persistent context (context.md), message addressability via the existing queue, and loose session binding (swappable chat session). | mandatory |
| US_ACTOR_TREE | Dedicated "ACTORS" tree in the Jarvis Explorer: direct-child scan of `jarvis.actors.folder`, no nested grouping, kind machinery, or Jarvis archive feature. | mandatory |
| US_ACTOR_CREATE | Create an Actor from the ACTORS tree `+` button: "New Entry" QuickPick, name input, creates `actor.yaml` + empty `context.md`, optional agent binding QuickPick, tree refreshes immediately. | mandatory |
| US_ACTOR_WHOAMI | `jarvis_whoAmI` for the new simple Actor: returns name + absolute context.md path; error if not bound to a discoverable Actor; no input parameters. | required |

*File: `docs/userstories/us_actor.rst` (new). Toctree entry added to
`docs/userstories/index.rst`. All four stories are approved.*

### Open Point (L0)

- **OP-L0-1** — Resolved: `US_ENT_ENTITY` retired in place (`:status:
  deprecated`), not deleted. Pointing to US_ACTOR_TREE as successor.
- **OP-L0-2** — Resolved: old-kind US/UAT files restored and deprecated in
  place (not deleted). ADR-6 revised accordingly.

### Decisions

- ADR-1 .. ADR-11 (with ADR-5 revised on 2026-09-23)
- Release version: **TBD** — Phase 1 is additive (minor); Phase 2 breaking
  (major/minor per `namingconventions` release policy). The PM's earlier
  "v0.28.0 breaking" pre-commit is withdrawn: this CR is not breaking yet.

### Horizontal Check (MECE)

- [x] No contradictions among the four new Actor stories; the legacy
   stories remain in place for Phase 1 (ADR-1, ADR-6).
- [x] No duplicated new-Actor creation path: the ACTORS QuickPick leads
   to the same creation flow (ADR-10).
- [x] Three Actor capabilities covered by US_ACTOR_ACTORS; L1 maps each
   capability to a requirement.

---

## Level 1: Requirements

**Status**: completed; all six new requirements approved. The direct-child
and tool-path revision was approved on 2026-09-23; the Actor naming
boundary in `REQ_ACTOR_SCHEMA` AC-6/AC-7 was approved in `80acf93`.

*L1 pass expected to:*
1. Mark `REQ_PRJ_*` and `REQ_EVT_*` in `req_prj.rst` / `req_evt.rst`
   `:status: deprecated` in place (mirrors L0 ADR-6 revised — not deleted).
2. Write new `REQ_ACTOR_*` requirements for the new simple Actor based on
   the 3-capability model in `us_actor.rst` (US_ACTOR_ACTORS,
   US_ACTOR_TREE, US_ACTOR_CREATE, US_ACTOR_WHOAMI).
3. Update `req_uat_*.rst`: mark US_UAT_CREATEPROJECT / US_UAT_CREATEEVENT /
   US_UAT_LISTEVENTS `:status: deprecated` in place.
4. Fix inbound `:links:` in `req_exp.rst` if any REQ links to
   `US_ACT_TREE` / `US_ACT_CREATE` (now replaced by `US_ACTOR_TREE` /
   `US_ACTOR_CREATE`).
5. Fill in the L1 tables below.

**Status (L1 pass result):**

```
REQ_PRJ_* / REQ_EVT_*       deprecated in place (12 REQs)
REQ_UAT_CREATEPROJECT       deprecated in place
REQ_UAT_CREATEEVENT         deprecated in place
REQ_UAT_LISTEVENTS          deprecated in place
req_actor.rst (new)         6 new REQ_ACTOR_* requirements (approved)
req_uat_*.rst               no new UAT requirements added in Phase 1
req_exp.rst inbound links   no changes needed (verified)
```

---

## Level 1: Requirements — Tables

### Level 1: Requirements

**Status**: ✅ completed

#### New Requirements (req_actor.rst — new file)

| ID | Title | Priority | Links (up) | Links (down) |
|----|-------|----------|------------|--------------|
| REQ_ACTOR_SCHEMA | Actor Storage Convention | mandatory | US_ACTOR_ACTORS | — |
| REQ_ACTOR_ACTIVATION | Actor message addressability (title pending L1 revision) | mandatory | US_ACTOR_ACTORS | REQ_ACTOR_SCHEMA; REQ_AUT_HEARTBEAT_RESOLVER_REUSE; REQ_MSG_REMINDERS_DELIVER |
| REQ_ACTOR_BINDING | Actor Session Binding | mandatory | US_ACTOR_ACTORS | REQ_ACTOR_SCHEMA; REQ_ACTOR_WHOAMI |
| REQ_ACTOR_TREE | ACTORS Tree View | mandatory | US_ACTOR_TREE; US_EXP_SIDEBAR | REQ_ACTOR_SCHEMA |
| REQ_ACTOR_CREATE | Create Actor Command | mandatory | US_ACTOR_CREATE; US_ENT_NEWENTITY | REQ_ACTOR_SCHEMA; REQ_ACTOR_TREE |
| REQ_ACTOR_WHOAMI | Actor Identity Recovery Tool | required | US_ACTOR_WHOAMI | REQ_ACTOR_SCHEMA; REQ_ACT_WHOAMI (legacy, parallel) |

*File: `docs/requirements/req_actor.rst` (new). Toctree entry added to
`docs/requirements/index.rst`. All 6 `:status: approved` after user
review and successful validation.*

#### Deprecated Requirements (in place — ADR-6 revised, removed in Phase 2)

| ID | File | Previous status | Note |
|----|------|----------------|------|
| REQ_PRJ_PROJECTFILTER | req_prj.rst | implemented | folder filter — no Project kind in new model |
| REQ_PRJ_FILTERPERSIST | req_prj.rst | implemented | folder filter persistence |
| REQ_PRJ_LISTPROJECTS | req_prj.rst | implemented | `jarvis_listProjects` — subsumed by `jarvis_listActors` |
| REQ_PRJ_CREATEPROJECT | req_prj.rst | draft | `jarvis_createProject` — subsumed by `jarvis_createActor` |
| REQ_PRJ_NEWPROJECT | req_prj.rst | draft | `+` button in Projects title bar — no Projects tree in new model |
| REQ_EVT_DATESORT | req_evt.rst | implemented | event date sorting — no Event kind in new model |
| REQ_EVT_EVENTFILTER | req_evt.rst | implemented | future-event filter |
| REQ_EVT_EVENTFILTERPERSIST | req_evt.rst | implemented | filter state persistence |
| REQ_EVT_LISTEVENTS | req_evt.rst | draft | `jarvis_listEvents` — subsumed by `jarvis_listActors` |
| REQ_EVT_CREATEEVENT | req_evt.rst | draft | `jarvis_createEvent` — subsumed by `jarvis_createActor` |
| REQ_EVT_EVENT_SUMMARY | req_evt.rst | draft | event.yaml summary field |
| REQ_EVT_NEWEVENT | req_evt.rst | draft | `+` button in Events title bar — no Events tree in new model |
| REQ_UAT_CREATEPROJECT | req_uat_createproject.rst | draft | tests `jarvis_createProject` (deprecated) |
| REQ_UAT_CREATEEVENT | req_uat_createevent.rst | draft | tests `jarvis_createEvent` (deprecated) |
| REQ_UAT_LISTEVENTS | req_uat_listevents.rst | draft | tests `jarvis_listEvents` (deprecated) |

**15 REQs deprecated in place** (5 in req_prj.rst, 7 in req_evt.rst,
3 in req_uat_*.rst). All files remain in the
toctree; physical removal in Phase 2.

#### Inbound link audit

| Source REQ file | Inbound `:links:` to deprecated US/REQ IDs | Change |
|-----------------|-------------------------------------------|--------|
| req_prj.rst (internal) | `US_PRJ_PROJECTFILTER`, `US_PRJ_LISTPROJECTS`, `US_PRJ_CREATEPROJECT` | No change — IDs still valid (deprecated in place, not deleted) |
| req_evt.rst (internal) | `US_EVT_DATESORT`, `US_EVT_EVENTFILTER`, `US_EVT_LISTEVENTS`, `US_EVT_CREATEEVENT` | No change — same rationale |
| req_act.rst | `US_ACT_ACTORS` (REQ_ACT_TOGGLE, REQ_ACT_SCHEMA, REQ_ACT_TREE); `US_ACT_WHOAMI` (REQ_ACT_WHOAMI) | No change — legacy `US_ACT_*` IDs still valid (deprecated in place) |
| req_exp.rst | `US_ENT_NEWENTITY` (REQ_ENT_NEWENTITY) | No change — `US_ENT_NEWENTITY` is still valid (not deprecated, only modified at L0) |

**No external link changes required.** Sphinx -W: 0 `needs.*` warnings.

### Open Point (L1)

| ID | Point | Status |
|----|-------|--------|
| OP-L1-1 | Legacy `REQ_ACT_TREE` AC-3 defines `contextValue: jarvisSession` | Resolved against requirement; `REQ_ACTOR_TREE` AC-3 corrected |
| OP-L1-2 | Scanner refresh in Phase 1 vs Phase 2 | Resolved: Phase 1 per `US_ACTOR_TREE` AC-7; `REQ_ACTOR_TREE` AC-7 corrected |
| ~~OP-L1-3~~ | `jarvis.newActorSimple` command naming | ✅ resolved — ADR-9: name is deliberately provisional, to be renamed in Phase 3 |

### Decisions

- ADR-1 .. ADR-11 (above; ADR-5 revised 2026-09-23)

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — new `REQ_ACTOR_*`
      are independent of `REQ_ACT_*` (legacy); no `REQ_ACT_*` is modified
      in L1.
- [x] No redundancies — the six new `REQ_ACTOR_*` cover storage, activation,
   binding, tree, creation, and identity separately.
- [x] All new REQs link to User Stories — verified in table above.

---

## Level 2: Design

**Status**: — out of scope for this CR (ADR-7)

Per ADR-7 this CR writes L0 and L1 only; the new-Actor design is the code.
No new-Actor product `SPEC_*` elements are added; the six static User UAT
`SPEC_UAT_*` artifacts below describe acceptance checks, not product design.

*Architect pre-fill withdrawn:* `SPEC_ENT_KIND` / `SPEC_ENT_MIGRATE`.

- [x] No contradictions with existing Designs (nothing changed — trivially true)
- [x] All new SPECs link to Requirements (n/a — no new SPECs)

---

## Final Consistency Check

**Status**: L0/L1 approved; final implementation consistency pending.
New Actor product L2 remains out of scope (ADR-7).
The 2026-09-23 MECE/QM findings below describe the earlier implementation
baseline; they do not establish verification or QM OK for the revised contract.

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACTOR_ACTORS | REQ_ACTOR_SCHEMA (context/storage); REQ_ACTOR_ACTIVATION (heartbeat/reminder); REQ_ACTOR_BINDING (replaceable session) | — (ADR-7) | ✅ |
| US_ACTOR_TREE | REQ_ACTOR_TREE | — (ADR-7) | ✅ |
| US_ACTOR_CREATE | REQ_ACTOR_CREATE | — (ADR-7) | ✅ (ADR-10 resolves Phase 2 entry-point conflict) |
| US_ACTOR_WHOAMI | REQ_ACTOR_WHOAMI; REQ_ACT_WHOAMI (legacy, parallel) | — (ADR-7) | ✅ |
| US_PRJ_* / US_EVT_* (deprecated) | REQ_PRJ_* / REQ_EVT_* (deprecated) | — (ADR-7) | ✅ |
| US_ENT_NEWENTITY (modified) | REQ_ACTOR_CREATE links to this story; story links to US_ACTOR_CREATE | — (ADR-7) | Phase 1 ✅ |
| US_ACT_ACTORS / US_ACT_WHOAMI (deprecated) | REQ_ACT_TOGGLE / REQ_ACT_SCHEMA / REQ_ACT_TREE / REQ_ACT_WHOAMI (legacy) | — (ADR-7) | ✅ |

*All six new REQs have US links and pass Sphinx -W with the seven existing
`toc.not_included` warnings suppressed; schema validation reports 0 warnings.
No L2 elements are created in this CR under ADR-7. Phase 2 owns its own
design scope; this CR does not commit it to adding any `SPEC_*` elements.*

**Deprecated-node inbound audit (Trace Engineer, 2026-09-23):** Of 30
deprecated IDs, 17 have an inbound link from a non-deprecated need and 13
do not. The 13 are `REQ_EVT_EVENT_SUMMARY`, `US_EVT_CREATEEVENT`,
`US_EVT_DATESORT`, `US_EVT_EVENT`, `US_EVT_EVENTFILTER`, `US_EVT_LISTEVENTS`,
`US_PRJ_CREATEPROJECT`, `US_PRJ_LISTPROJECTS`, `US_PRJ_PROJECT`,
`US_PRJ_PROJECTFILTER`, `US_UAT_CREATEEVENT`, `US_UAT_CREATEPROJECT`, and
`US_UAT_LISTEVENTS`. Three of these (`REQ_EVT_EVENT_SUMMARY`,
`US_EVT_EVENT`, `US_PRJ_PROJECT`) have no inbound links at all; the other
ten have inbound links only from deprecated needs.

**Assessment: accepted, no link changes.** ADR-6 retains deprecated IDs
and files in the Sphinx graph so existing references remain resolvable
until Phase 2; it does not require every retired feature to have an active
consumer. Creating new active links solely to keep these IDs reachable
would misrepresent the Phase-1 design. Phase 2 owns their physical removal
and the associated reference audit.

### Artefakt-Removal-Check

Legacy PRJ, EVT and ACT artefacts remain addressable in Phase 1; their code
removal belongs to Phase 2. The twelve never-approved Actor UAT US/REQ/SPEC
RST files were removed in `9ba9656` rather than deprecated as current Needs.
A project-wide search for their ID and path variants found no active code or
workflow references; the outdated references in this active Change Document
are replaced by the current artifact inventory below. The earlier 23-case
plan is retained only as historical evidence in the Test Protocol.

### Issues Found

- [x] Phase 2: "New Entity" remove-versus-redirect conflict resolved by
   ADR-10. The old tree entry point goes; the ACTORS root retains its own
   Actor-only "New Entry" QuickPick.
- [x] L1: self-activation and replaceable session binding were missing from
   the first four REQs. `REQ_ACTOR_ACTIVATION` and `REQ_ACTOR_BINDING`
   linked to `US_ACTOR_ACTORS`; user approved both on 2026-09-22.
- [x] L1: legacy context value verified as ``jarvisSession`` in
   `REQ_ACT_TREE` AC-3; ACTORS refresh explicitly assigned to Phase 1
   in `REQ_ACTOR_TREE` AC-7.

### Sign-off

- [x] L0 and L1 authored; L2 intentionally out of scope (ADR-7)
- [x] Cross-level QuickPick conflict resolved by user (ADR-10)
- [x] New L0 → L1 links validated; four US and six REQs are `:status: approved`
- [x] Specification ready for CM handoff and implementation planning;
   QM and implementation verification are separate workflow steps

---

## User Acceptance Tests (Phase 1)

**Artifacts:** Six User-approved static UAT specifications were created in
`99043e4`: `docs/design/spec_uat_actor_memory.rst`,
`docs/design/spec_uat_actor_activation.rst`,
`docs/design/spec_uat_actor_tree.rst`,
`docs/design/spec_uat_actor_create.rst`,
`docs/design/spec_uat_actor_names.rst`, and
`docs/design/spec_uat_actor_identity.rst`. The index
`docs/design/spec_uat.rst` and Test Protocol
`docs/changes/tst-one-kind-consolidation.md` were updated. The twelve
never-approved Actor UAT US/REQ/SPEC files and their toctree entries were
removed in `9ba9656`; no new UAT story or requirement was created.

The Test Protocol owns the six U-1..U-6 results and the historical schema
observation. All six remain NOT RUN; User and PM execute and judge them
only after independent QM OK and an explicit execution release. Engineering
verification remains separate.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 — MECE Verification (L0/L1 + Implementation)

**Reviewed by:** MECE Engineer
**Review date:** 2026-09-23

#### Findings Table

| Check | Status | Details |
|-------|--------|---------|
| **Contradictions: new REQ_ACTOR_* vs. deprecated REQ_PRJ_*/REQ_EVT_*** | ✅ **Geprüft — keine Widersprüche** | New requirements live in `req_actor.rst` (ACTOR theme), deprecated requirements remain in `req_prj.rst`/`req_evt.rst` with `:status: deprecated`. No cross-references modified; legacy system continues untouched (ADR-1). The 6 new REQs are independent of the 15 deprecated REQs. |
| **Redundanzen in den 6 neuen REQ_ACTOR_*** | ✅ **Geprüft — keine Redundanzen** | Each REQ covers a distinct capability: SCHEMA (storage/identity), ACTIVATION (heartbeat/reminder), BINDING (session lifecycle), TREE (explorer view), CREATE (creation flow), WHOAMI (identity recovery). No overlapping ACs. |
| **US-REQ-Links vollständig** | ✅ **Geprüft — vollständig** | All 4 new US_ACTOR_* stories link to their REQs: US_ACTOR_ACTORS → 3 REQs (SCHEMA, ACTIVATION, BINDING); US_ACTOR_TREE → REQ_ACTOR_TREE; US_ACTOR_CREATE → REQ_ACTOR_CREATE; US_ACTOR_WHOAMI → REQ_ACTOR_WHOAMI (+ legacy REQ_ACT_WHOAMI). Traceability table in CD verified. |
| **ADR-10 QuickPick-Konflikt** | ✅ **Geprüft — sauber gelöst** | Phase 1: two parallel entry points (legacy "New Entity" + new ACTORS "+"). Phase 2: legacy entry point removed, ACTORS QuickPick retained. ADR-10 explicitly records this resolution; REQ_ACTOR_CREATE AC-8 and AC-1 encode the same. No ambiguity. |
| **Testability caveats (scanner identity key, scheduler/store reuse, tool registration, contextValue)** | ✅ **Dokumentarisch geschlossen** | UAT-Specs (Commit 4e2add4) enthalten nun explizite **Verification Boundary**-Hinweise für: REQ_ACTOR_SCHEMA AC-7 (scanner key / tool response ID), REQ_ACTOR_ACTIVATION AC-3 (scheduler/store reuse), REQ_ACTOR_WHOAMI AC-5 (tool registration), REQ_ACTOR_TREE AC-3 (contextValue). EDH-Prüfung vs. Implementierungs-/Focused-Test-Inspektion sind getrennt; irreführende EDH-Claims entfernt. Sphinx -W und diff --check bestanden. Rest-Risiken: EDH nicht ausgeführt; UI/timing/invalid-leaf fallback noch offen. |

#### Detailed Verification

**Mutual Exclusivity** ✅
- The 6 new REQ_ACTOR_* partition the new Actor's capabilities without overlap
- Deprecated REQ_PRJ_*/REQ_EVT_* remain in their files, unmodified, with `:status: deprecated`
- No requirement appears in both the new and deprecated sets
- ADR-1 (parallel build) ensures the two systems are independent in Phase 1

**Collective Exhaustiveness** ✅
- US_ACTOR_ACTORS (3 capabilities) → 3 REQs (SCHEMA, ACTIVATION, BINDING) — complete
- US_ACTOR_TREE → REQ_ACTOR_TREE — complete
- US_ACTOR_CREATE → REQ_ACTOR_CREATE — complete
- US_ACTOR_WHOAMI → REQ_ACTOR_WHOAMI — complete
- All 4 new US stories have at least one REQ; all 6 new REQs trace to a US
- Deprecated US/REQ pairs remain linked (deprecated in place, not deleted)

**Traceability** ✅
- L0 → L1: All 4 new US_ACTOR_* stories have `:links:` to their REQs
- L1 → L0: All 6 new REQ_ACTOR_* have `:links:` to their US parents
- L1 → L1: Cross-REQ links (e.g., REQ_ACTOR_ACTIVATION → REQ_AUT_HEARTBEAT_RESOLVER_REUSE) are explicit
- No orphaned elements; Sphinx `-W` clean (0 `needs.*` warnings)

**Contradiction Analysis** ✅
- No contradiction between new and deprecated REQs: they govern different entity kinds (new Actor vs. legacy Project/Event) and different tree roots (ACTORS vs. legacy unified tree)
- ADR-3 retires the ENT abstraction; new ACTOR theme replaces it — no semantic overlap
- ADR-10 resolves the QuickPick entry-point conflict explicitly for Phase 1 and Phase 2

**Implementation Coverage: PARTIAL**
- The earlier `c1b7cc1` inspection describes a superseded recursive baseline.
- Dev reports commit `875c192` implements direct-child-only Actor discovery,
   absolute `actor.yaml` IDs for new-convention tool responses, unchanged
   legacy response shapes, and the approved create-name/folder behavior.
- Dev reports 32 focused and 418 full tests passing, Core typecheck passing,
   changed-file lint with 0 errors (45 pre-existing warnings), and clean diff
   check. These are owner-reported results; independent VE review is in
   `val-one-kind-consolidation.md` and remains PARTIAL.

**User UAT artifacts: approved; execution NOT RUN**
- Six current User/PM checks U-1..U-6 map directly to the four product stories.
- The superseded 23-row technical plan is historical evidence only; its
   partial T-1 FAIL and 22 NOT RUN are not current User UAT results.
- No User UAT or QM acceptance is claimed; execution is gated on independent
   QM OK and explicit CM release.

#### MECE Assessment / Offene PM-Entscheidungen

| # | Finding | MECE-Einschätzung | PM-Entscheidung (ausstehend) |
|---|---------|-------------------|------------------------------|
| 1 | Testability gap: some ACs require implementation inspection | **Dokumentarisch geschlossen** — UAT-Specs (Commit 4e2add4) enthalten explizite Verification Boundary-Hinweise für alle vier betroffenen ACs (SCHEMA AC-7, ACTIVATION AC-3, WHOAMI AC-5, TREE AC-3). EDH-Prüfung vs. Implementierungsinspektion getrennt; irreführende Claims entfernt. Sphinx -W clean. Rest-Risiken: EDH nicht ausgeführt; UI/timing/invalid-leaf fallback offen. | **Ausstehend** — PM prüft nach Erhalt der Findings. |

---

### Round 2 — Revised Baseline QM Verification

**Reviewed by:** Quality Manager
**Review date:** 2026-09-25
**Baseline:** `bfad7c1` (implementation `875c192`, VE report `a257747`)

#### Per-Level Results

| Level | Result | Basis |
|-------|--------|-------|
| L0 — User Stories | FAIL | Finding 1: approved AC-5 conflicts with the actual Phase-1 identity/delivery mechanism. |
| L1 — Requirements | PASS with evidence pending | Six approved `REQ_ACTOR_*` requirements partition storage, activation, binding, tree, create, and identity; technical ACs in Findings 2 and 3 are not yet fully verified. |
| L2 — Design | N/A for new product design; UAT design PASS | ADR-7 excludes new product L2. Six approved UAT specs map to the four product stories; execution belongs to User/PM, not QM. |

#### Findings

| # | Level | Element ID | Finding and required disposition | Severity |
|---|-------|------------|----------------------------------|----------|
| 1 | L0 | US_ACTOR_ACTORS AC-5 | AC-5 says the new Actor does not require a kind-driven scanner. Yet the approved REQ_ACTOR_ACTIVATION AC-3 reuses existing delivery, and `extension.ts` registers `jarvis.actors.folder` as an additional `session` kind scan root; `jarvis_listActors`, `jarvis_whoAmI`, and delivery resolve through that registry. The separate ACTORS tree has its own scanner, but identity/delivery depend on the kind-driven scanner. PM/System Designer must reconcile AC-5 with the Phase-1 reuse decision; QM cannot choose an intent. | medium |
| 2 | Verification | REQ_ACTOR_SCHEMA AC-7; REQ_ACTOR_CREATE AC-3/AC-4; REQ_ACTOR_WHOAMI AC-1/AC-4 | VE's PARTIAL report confirms scanner/file tests but not registered-handler results for new/legacy list and whoAmI payloads, collision errors, or duplicate-folder creation side effects. These technical assertions are not covered by User U-1..U-6. Obtain engineering runtime/host evidence before claiming a test-ready technical baseline; no code defect is established by the current evidence. | medium |
| 3 | Schema verification | REQ_ACTOR_SCHEMA AC-1..AC-5 | Static draft-07 schema and manifest pass, and isolated contributor controls show diagnostics, but the historical automatic-association T-1 FAIL is retained and complete no-modeline engineering retest (including extra-property rejection) is open. Record a full current-baseline retest separately before claiming schema verification complete. The historical FAIL is not a verdict on current User UAT. | high |

#### Trace And Validation Boundary

Four approved product stories trace to all six approved requirements and six static UAT specs; ADR-7 intentionally omits new product L2. Sphinx `-W` passed without warnings. The current User U-1..U-6 checks are NOT RUN; their results and acceptance belong to User/PM after CM releases UAT. QM can verify their design and later audit recorded evidence, but does not grant User acceptance or decide merge.

Separate L0/L1/L2 MECE and item-level Trace reviews were requested; their responses had not arrived at this round's filing. The per-level and trace assessments above are QM's direct checks, not attributed specialist sign-offs.

**Verdict: CHANGES REQUIRED; no pre-UAT QM OK for `bfad7c1`.** Resolve Finding 1 at the specification layer, close or explicitly re-scope Findings 2 and 3 with independent engineering evidence, and submit the revised stable baseline for a new QM review. VE remains PARTIAL. QM independently ran the cross-package `compile all` task, Sphinx `-W`, and `git diff --check` successfully; VE reports focused 32/32 and full 418/418 tests, Core typecheck and changed-file lint with zero errors. These passing checks do not resolve the open runtime/schema evidence.

#### PM Decisions

**2026-09-25 — User/PM decision: FIX NOW for Findings 1–3.**

- **Finding 1:** Keep `US_ACTOR_ACTORS` AC-5 strict. New Actors must use
   kindless identity, listing, and activation/delivery in Phase 1 without
   kind registration or a kind-driven scanner. Preserve legacy
   Actor/Project/Event paths in parallel until Phase 2. The existing shared
   heartbeat/reminder delivery machinery may be reused without registering
   new Actors as a legacy kind.
- **Finding 2:** Add independent runtime evidence for registered new/legacy
   tool payloads, name-collision errors, and duplicate-folder creation side
   effects before QM re-review.
- **Finding 3:** Run and record a complete current-baseline no-modeline
   schema retest, including rejection of additional properties. Retain the
   former T-1 FAIL only as historical evidence.

   **Engineering evidence submitted (Dev Engineer, 2026-09-25):** A disposable
   EDH on VS Code 1.139.0 with Red Hat YAML 1.24.0 loaded the freshly compiled
   development Core. All fixtures omitted `$schema` and YAML modelines. The
   contributor returned the packaged Actor schema URI; valid minimal and
   optional-field files had zero diagnostics. Empty/missing `name`, extra
   `kind`, arbitrary extra property, and invalid optional-field types produced
   their expected diagnostics. Raw logs and fixtures are retained under
   `%LOCALAPPDATA%/Temp/jarvis-f3-schema-retest-20260925`; this is engineering
   evidence pending independent VE/QM assessment, not a User UAT verdict.

**System Designer F1 specification reconciliation (2026-09-25):**
`US_ACTOR_ACTORS` AC-5 was clarified in `d6f371f` and approved in
`2173cd5`. `REQ_ACTOR_SCHEMA` AC-7, `REQ_ACTOR_ACTIVATION` AC-3, and
`REQ_ACTOR_WHOAMI` AC-1 were clarified in `5086101` and approved in
`734ba09`. New Actor listing, identity, and heartbeat/reminder destination
resolution use kindless direct-child discovery; shared delivery machinery
does not require registering new Actors in `KindDrivenScanner`. Legacy
Actor/Project/Event paths remain functional in parallel for Phase 1.
L0 MECE advisory found no contradiction. The subsequent L1 advisory found
two cross-requirement gaps: the shared heartbeat resolver's destination set
omitted kindless Actors, and the legacy `whoAmI` registry claimed sole
authority over all Actors. Draft `3b69494` extends the existing unified
resolver with direct-child Actor names, scopes legacy registry authority to
registered entities, and makes `REQ_ACTOR_ACTIVATION` AC-3 require the shared
resolver without parallel enumeration. MECE re-review confirmed both
cross-requirement gaps closed, but identified an AC-1/AC-4 precedence
ambiguity in `REQ_ACTOR_WHOAMI`. Draft `1895240` makes successful new
Actor identity conditional on no cross-convention name collision; AC-4
continues to require an error for that collision. Focused MECE review
confirmed this precedence is unambiguous and the earlier two gaps remain
closed. `6d9c598` approves `REQ_ACTOR_ACTIVATION` and `REQ_ACTOR_WHOAMI`;
all six new Actor requirements are approved. Strict Sphinx `-W` with
`toc.not_included` suppressed passed for this F1 L0/L1 baseline. This is
a specification consistency sign-off, not an F1 implementation result,
QM OK, or User UAT verdict.

**Independent VE implementation review (2026-09-25):** Verify Engineer
independently inspected implementation commits `f2f55b6` and `521279a`
against the approved F1/L1 baseline and updated
`docs/changes/val-one-kind-consolidation.md` in commit `93fce4d` with status
PARTIAL. Focused tests (35/35), full Vitest (424/424), Core typecheck,
changed-file ESLint (0 errors), strict Sphinx, and diff checks passed; VE
also independently inspected the F3 raw schema-retest evidence.

VE found a **High** implementation discrepancy against
`REQ_ACTOR_ACTIVATION` AC-1/AC-2: heartbeat queue execution accepts the
kindless Actor destination but only appends a message; it does not cause
auto-delivery or invoke `injectPrompt`. A closed Actor can therefore remain
unactivated and its `context.md` is not resumed. VE recommends wiring
heartbeat delivery to activate/reuse the Actor session and adding closed-
Actor regression coverage. VE also records a **Medium** verification gap:
registered list/whoAmI tool invocation in a VS Code host and correlated
session-ID integration were not exercised; factory-level payload, identity,
collision, and duplicate-folder behavior were tested.

The Operation Mode is `user-guided`; PM has been asked to decide **Fix now**,
**Defer**, or **Accept as-is** for the High finding. Dev has been asked to
preserve the implementation pending that decision. This VE report is not QM
OK, merge readiness, or User UAT. U-1..U-6 remain NOT RUN, and no UAT release
has been issued.

**ADR-12 follow-up VE review (2026-09-25):** Report commit `8f387be`
independently reviewed reminder runtime correction `d5b392c` against the
reconciled message-delivery contract. Heartbeat queue-only behavior no longer
constitutes the earlier High implementation defect: ADR-12 assigns automatic
or manual notification to Message Delivery, not the sender. The actual
reminder-side preference override was removed; focused tests (12/12), full
Vitest (427/427), Core typecheck, changed-file lint (0 errors), and strict
Sphinx passed. VE remains **PARTIAL**: registered-tool host integration and
reminder timer execution in a VS Code host were not observed. The existing
Reminder design still awaits L2 MECE, the revised U-2 artifact is draft for
User review, and technical Reminder UAT ownership remains with PM for
assignment. This update records later evidence without changing the prior
VE/QM rounds or claiming QM OK or User UAT.

**PM technical-test ownership decision (2026-09-25):** With User approval,
Dev Engineer owns technical Reminder unit/integration coverage and Verify
Engineer independently checks the evidence; Test Designer owns only the
six product-story User-validation checks. The existing technical Reminder
"UAT" story, requirements, and designs may be retired where they duplicate
technical checks, but only after mapping their assertions to executable
coverage and auditing every inbound link and toctree entry. Those assertions
include tool responses, due/overdue timing, persistence across reload,
reminder removal, tree display and click behavior, in addition to delivery
preference. The earlier statement that Test Designer owns this technical
Reminder UAT reconciliation is superseded by this decision. Retirement and
its traceability audit are still pending; this decision does not waive
technical verification or authorize User UAT, QM OK, or merge.

User UAT U-1..U-6 remains NOT RUN until independent QM OK and explicit CM
release; engineering runtime/schema evidence does not produce User verdicts.

---

### Round 3 — VE Follow-Up Assessment

**Reviewed by:** Quality Manager
**Review date:** 2026-09-25
**Evidence:** VE report `93fce4d`; current branch `93fce4d`.

#### Per-Level Results

| Level | Result | Basis |
|---|---|---|
| L0 — User Stories | PASS on revised intent; implementation FAIL | `US_ACTOR_ACTORS` AC-3 requires autonomous activation; no new L0 contradiction identified. Heartbeat-only queueing does not fulfill that intent for a closed Actor. |
| L1 — Requirements | FAIL on cross-boundary completeness | `REQ_ACTOR_ACTIVATION` AC-1/AC-2 requires delivery and context resumption, while its AC-3 reaches the shared destination resolver but does not reconcile the queue-only executor with auto-delivery. |
| L2 — Design | FAIL on affected existing design; new product L2 N/A | ADR-7 excludes new Actor product L2, not review of affected existing `SPEC_AUT_QUEUEEXEC`: it specifies append-and-refresh only, with no link to `REQ_ACTOR_ACTIVATION` or Actor-specific delivery transition. The six User UAT designs remain pending execution, not failed. |

#### Findings

| # | Level | Element ID | Finding and required disposition | Severity |
|---|---|---|---|
| 4 | L1 / existing L2 / code | `REQ_ACTOR_ACTIVATION` AC-1/AC-2; `SPEC_AUT_QUEUEEXEC` | Kindless Actor names now pass heartbeat validation, but `executeQueueStep` only calls `appendMessage` and reloads the tree. The poll loop calls `injectPrompt` only for auto-delivery-listed names, while new Actor creation does not list the Actor; Reminder delivery explicitly adds its target to that list. Therefore a heartbeat to a closed new Actor can succeed without starting its session or resuming `context.md`. The existing queue-only design and its absent link/transition from the new activation requirement made this behavior easy to miss. PM/System Designer must reconcile the affected design and trace before Dev changes the shared queue path; Engineering must verify a closed-Actor heartbeat regression without changing legacy queue behavior unintentionally. | high |
| 5 | Verification | `REQ_ACTOR_SCHEMA` AC-7; `REQ_ACTOR_WHOAMI` AC-1/AC-4 | Factory-level new/legacy payload and collision tests plus duplicate-folder filesystem tests address most of Round-2 Finding 2. VE has not invoked the *registered* tools in a VS Code host with a correlated session ID, so actual JSON rendering and binding are still unproved. Retain a medium host-integration gate; User U-1..U-6 do not substitute for exact technical payload assertions. | medium |

**F3 disposition:** VE independently checked the full no-modeline schema matrix, including valid files and additional-property/type rejection, against the retained raw trace. Round-2 Finding 3's requested engineering retest is satisfied for that tested environment; the historical T-1 FAIL remains historical and is not a verdict on U-1..U-6. This does not close Findings 4 or 5.

**Verdict: CHANGES REQUIRED; no QM OK and no UAT release.** VE's 35 focused and 424 full tests, core compile and strict Sphinx pass, but they do not exercise the broken closed-Actor heartbeat path or registered tool integration. User/PM own U-1..U-6 execution and acceptance after independent QM OK and explicit CM release. PM owns fix/defer/accept decisions for Findings 4 and 5.

**QM addendum (2026-09-25, after User clarification):** The User decided that heartbeat and reminder only send/queue messages; the separate message-delivery policy decides whether delivery is manual or automatic. This conflicts with the current unconditional closed-Actor activation wording in `US_ACTOR_ACTORS` AC-3 and `REQ_ACTOR_ACTIVATION` AC-2. Finding 4 remains open as a specification/trace/UAT discrepancy, but its Round-3 recommendation to change heartbeat execution is **not authorized** by this decision. System Designer is reconciling the contract and Test Designer will revise U-2 after the spec handoff. QM will assess the revised spec, implementation and UAT independently; no QM OK, User-UAT release or merge clearance is implied. PM records the final decision and rationale against the finding.

---

### Round 4 — Reminder UAT Contract Check

**Reviewed by:** Quality Manager
**Review date:** 2026-09-25
**Evidence:** VE report `cca84e1` on implementation `0c9bda1`.

| Level | Result | Basis |
|---|---|---|
| L0 | PASS for ADR-12 intent | Senders queue messages; delivery preference belongs to the destination. The revised Actor U-2 is draft and is not the conflicting approved Reminder UAT. |
| L1 | FAIL | Approved `REQ_UAT_REMINDERS_DELIVER` AC-1/AC-3/AC-4 promises notification without a stated Auto-Delivery precondition; approved Reminder tools AC-2 promises an array unlike draft `REQ_MSG_REMINDERS_TOOLS` AC-2's wrapped response. |
| L2 | FAIL | Approved `SPEC_UAT_REMINDERS` T-2/T-6/T-7 expects automatic notification unconditionally and T-4 expects an array, while the ADR-12 policy and current tool response differ. |

| # | Level | Element ID | Finding and required disposition | Severity |
|---|---|---|---|---|
| 6 | L1 / L2 | `REQ_UAT_REMINDERS_DELIVER` AC-1/AC-3/AC-4; `SPEC_UAT_REMINDERS` T-2/T-6/T-7 | The approved test contract says the message reaches the chat within five seconds without manual action, including after reload and for overdue reminders. ADR-12 and the independently tested queue-only sender leave notification subject to the pre-existing destination preference. The scenarios do not set that preference ON. PM must assign the owning spec/UAT actors to reconcile the approved acceptance contract, its links and test preconditions; do not change sender behavior to satisfy a stale scenario. | medium |
| 7 | L1 / L2 | `REQ_UAT_REMINDERS_TOOLS` AC-2; `SPEC_UAT_REMINDERS` T-4 | Both approved artifacts expect `jarvis_listReminders` to return a bare array; draft `REQ_MSG_REMINDERS_TOOLS` AC-2 and the tested implementation return `{ reminders: [...] }`. Reconcile the approved UAT requirement and expected result to the settled tool contract before using T-4 as acceptance evidence. | medium |

**Verdict: CHANGES REQUIRED; no QM OK.** These are spec/UAT inconsistencies, not evidence that the ADR-12 Reminder implementation is wrong. VE independently reports 19 focused / 434 full tests passing; host registered-tool, timer/reload, click dispatch and MCP behavior remain unverified. User U-1..U-6 are NOT RUN. PM owns fix/defer/accept decisions for Findings 6 and 7 and UAT ownership; QM will reassess the revised artifacts.

**PM dispositions (2026-09-25, following User decision):**

- **Finding 4 — RESOLVED as an implementation finding.** ADR-12 assigns
   heartbeat and reminder only message-queue responsibility; delivery policy
   alone determines manual or automatic notification. No heartbeat wake-up
   implementation is authorized. Any remaining stale Actor story, requirement,
   or U-2 wording must describe addressability and separate delivery preference.
- **Finding 5 — ACCEPT AS-IS.** Live host and transport verification is a
   transparent medium evidence limitation, not a blocker for this change.
   Factory/registry evidence does not become a claim of live host execution.
- **Finding 6 — DEFER to Phase 2 cleanup.** Retire the obsolete technical
   Reminder UAT chain with an assertion/automated-coverage and inbound-link/
   toctree audit in that follow-up. Its unconditional notification scenarios
   remain historically inconsistent with ADR-12; do not modify the sender to
   satisfy them or silently treat those scenarios as current User UAT.
- **Finding 7 — FIX the expectation, not the API.** The current
   `jarvis_listReminders` response is `{ reminders: [...] }`; reconcile the
   stale bare-array technical test/spec assertion within this change while
   retaining the technical artefacts until the Phase 2 removal audit.

**System Designer follow-through (2026-09-25):** `US_ACTOR_ACTORS` AC-3 and
`REQ_ACTOR_ACTIVATION` AC-1..AC-3 already require queue-only heartbeat/reminder
senders and destination-controlled notification; no L0/L1 wording change or
heartbeat wake-up is needed. Draft Actor U-2 likewise tests the existing OFF/ON
delivery preference without sender activation, so it remains with Test Designer
unchanged. Corrected approved technical `REQ_UAT_REMINDERS_TOOLS` AC-2 and
`SPEC_UAT_REMINDERS_SCENARIOS` T-4 to expect the existing
`{ reminders: [...] }` tool response. Their other legacy technical UAT
assertions, files, and toctrees remain for PM-deferred Phase 2 retirement and
its link/coverage audit. Strict Sphinx passes; live host/transport remains
unverified under Finding 5's ACCEPT AS-IS disposition.
MECE's focused review of `e0d5ac9` confirms the list response envelope,
entry fields, L0/L1/L2 links, and functional separation of T-1/T-4/T-5
from delivery and persistence scenarios. No finding on this correction;
the advisory does not assess the other PM-deferred Reminder UAT findings.

These decisions do not grant QM OK, User UAT execution, or merge clearance.
U-1..U-6 remain NOT RUN pending QM OK and explicit CM release.

**Reminder persistence residual (User disposition, 2026-09-25):** VE report
`f638cc3` independently verified the pop-failure containment in `0882e6f`,
but did not establish preservation of `reminders.yaml` after a partial direct
write. The User deferred atomic persistence beyond this change; PM recorded
follow-up item #26, "Make reminder persistence writes atomic", in the Project
Manager backlog (commit `bbc3f7c`). A partial write may still lose due or
future reminders. This known limitation is not a verified atomic-write
guarantee, and its deferral does not grant QM OK or release User UAT.

### Round 5 — Consolidated Pre-UAT Re-Review

**Reviewed by:** Quality Manager, 2026-09-25. **Baseline:** CD `9a35f3e`, VE
`33bc756`; User U-1..U-6 NOT RUN. Separate L0/L1/L2 MECE reviews returned;
item-level Trace review has been requested and remains pending.

| Check | Result | Basis |
|---|---|---|
| L0 — User Stories | PASS in direct QM review | Approved `US_ACTOR_ACTORS` AC-3/AC-5 and the other three `US_ACTOR_*` stories retain queue-only senders, kindless discovery and the Phase-1 legacy parallel path. |
| L1 — Requirements | Phase-1 Actor PASS; broader review FAIL on deferred Reminder contracts | The six approved `REQ_ACTOR_*` and ADR-12 delivery boundary align. Finding 8 concerns the shared draft Reminder-tool registration contract; approved technical Reminder UAT delivery remains historically contradictory. Neither is a demonstrated new-Actor defect. |
| L2 — Design | Actor UAT content aligns with ADR-12; U-2 approval pending; new Actor product L2 N/A (ADR-7); broader review FAIL on deferred Reminder contracts | Revised U-2 content matches OFF/ON delivery but remains draft. Finding 8 concerns draft shared Reminder-tool design; approved technical Reminder delivery scenarios remain historically inconsistent and PM-deferred to Phase 2. |
| Schema / trace | F3 engineering schema check PASS for the tested environment; structural Actor Trace PASS; U-2 approval status needs correction | Trace Engineer confirms four Actor stories link to six requirements, and six UAT artifacts link to their stories; U-2 remains draft. `REQ_ACTOR_BINDING` AC-3 is not explicitly covered, but User clarifies product WhoAmI is a nice-to-have recovery capability, not a Phase-1 core gate. Strict Sphinx `-W` passed. This does not imply User UAT or live-host validation. |
| Implementation / gates | PARTIAL | QM reran full cross-package build, 435/435 Vitest and strict Sphinx successfully. VE's live registered-tool host, timer/reload and UI click evidence remains unexecuted (Finding 5 ACCEPT AS-IS). VE status remains PARTIAL; no technical-verification OK is recorded. This CD does not modify `packages/mcp`; MCP transport is out of this change's scope (Finding 11). |

**Separate MECE and Trace results (read-only):** L0 MECE PASS for the four new Actor stories,
ADR-12 and parallel legacy stories. L1 FAIL only for the historically deferred
`REQ_UAT_REMINDERS_DELIVER` AC-1/AC-3/AC-4 conflict with destination-controlled
notification; otherwise the scoped Actor, queue, failure-order and corrected
list contracts have no horizontal finding. L2 FAIL only for the same deferred
`SPEC_UAT_REMINDERS_SCENARIOS` T-2/T-6/T-7 conflict; scoped current product
designs and six Actor UAT designs are otherwise consistent. MECE noted that
U-2's ON case tests heartbeat but not reminder auto-notification; this does
not negate OFF-mode coverage of both senders, and positive reminder ON-mode
coverage is an open test-design choice for PM. Trace Engineer reports no broken
links and PASS for all four US-to-REQ chains; six UAT artifacts link to their
stories. The Trace review found U-2 is `draft` although the CD inventory calls
all six User-approved. It also found no explicit U-1..U-6 check for
`REQ_ACTOR_BINDING` AC-3. The User clarifies that product `jarvis_whoAmI` is a
nice-to-have recovery capability, not Phase-1 core: the normal new-session
welcome prompt already supplies the Actor name and `context.md` path. Therefore
the AC-3 test omission is not a core readiness blocker; the approved
`US_ACTOR_WHOAMI` / `REQ_ACTOR_WHOAMI` scope should be dispositioned by PM for a
later phase rather than silently treated as core. Finding 10 covers the U-2
status discrepancy only. Finding 8 below is QM's independent code-versus-spec
check, not a MECE finding.

| # | Level | Element ID | Finding and required disposition | Severity |
|---|---|---|---|---|
| 8 | L1 / existing L2 / code | `REQ_MSG_REMINDERS_TOOLS` AC-4; `SPEC_MSG_REMINDERSTOOLS` | Both draft contracts require `registerDualTool()` for the three Reminder tools; the design includes separate LM and MCP handlers. The actual registration uses `engine.registerTool`, which registers the LM handler and exposes that same handler via the Core registry to MCP descriptors. VE's registry test supports reachability, not live transport execution. The registration model is wrong in the requirement and design, not an established missing-MCP code defect. PM should assign the spec owner to reconcile the existing requirement, linked design and examples with the shared-registry architecture; preserve the separately disclosed host-test limitation. | medium |
| 9 | Documentation | Core README, Features | The current "heartbeat activation" and unconditional "VS Code notifications" feature descriptions imply sender-initiated or unconditional notification. ADR-12 and approved `REQ_ACTOR_ACTIVATION` AC-2 make automatic notification conditional on the destination preference; with OFF, senders only queue. PM should assign a documentation correction that states this condition without promising sender activation. | low |
| 10 | Phase-1 Actor UAT artifact status | `SPEC_UAT_ACTOR_ACTIVATION`; CD artifact inventory | Trace Engineer confirms `SPEC_UAT_ACTOR_ACTIVATION` is draft, contradicting the CD's claim that all six Actor UAT specs are User-approved. Correct the inventory and have the artifact owner obtain/record the User's approval before treating U-2 as an approved core acceptance procedure. The separate lack of a test for `REQ_ACTOR_BINDING` AC-3 is non-blocking under the User's scope decision: product WhoAmI is a nice-to-have recovery feature, and the normal new-session welcome prompt supplies the Actor name and context path. PM should move that optional capability/test out of the Phase-1 core baseline explicitly; do not claim AC-3 was verified. | medium |
| 11 | Traceability / evidence scope | VE report status line; CD `Implementation / gates` row | VE's report and this CD's gates row bundled "live VS Code/MCP host integration" into this change's open evidence. Independent check: `git diff --stat main...feature/one-kind-consolidation -- packages/mcp` returns no output — this branch touches zero files under `packages/mcp`. MCP transport is a separate module tested by its own change; attributing its unexecuted live-host coverage to this CD is a scope-attribution error, not a demonstrated Actor defect. PM should have VE restate the open-evidence line without naming MCP transport for this CD; retain "live registered-tool host invocation" only, since that path (`extension.ts`, `actorRuntime.ts`) is genuinely new/changed code here. | medium |
| 12 | UAT test design | `SPEC_UAT_ACTOR_MEMORY` (U-1 exemplar) | The User reports informally performing U-1..U-6, but declines to accept the results as valid PASS evidence. For U-1, the scenario (open Actor, ask it to remember a codeword, close the tab, reopen, ask again) does not isolate the Actor's file-based `context.md` cross-session memory contract (`US_ACTOR_ACTORS` AC-2/AC-4) from ordinary chat/session continuity: an agent can appear to recall a codeword from conversational context alone, without any write ever reaching `context.md`. A PASS under the current script would not demonstrate the contractual mechanism. The protocol artifact's plain "NOT RUN" status does not capture that informal execution occurred and was rejected for this design reason. PM should route this correction into the already-tracked backlog #27 UAT cleanup: redesign scenarios to positively verify the file-based mechanism (e.g. a genuine new window/reload, or independent confirmation that the codeword reached `context.md` before reopening) rather than tab close/reopen alone. | medium |

#### PM Dispositions (2026-09-25)

| Finding | Decision | Rationale and follow-up |
|---|---|---|
| 8 | **DEFER** | User defers the Reminder-tool spec/registry reconciliation beyond this change. Track it in PM backlog #28; align `REQ_MSG_REMINDERS_TOOLS`, `SPEC_MSG_REMINDERSTOOLS`, and examples with the shared registry. This is not an established Phase-1 Actor code defect. |
| 9 | **DEFER** | User defers the Core README wording correction beyond this change. Track it in PM backlog #29; clarify that heartbeat queues messages and automatic notification depends on the destination preference. |
| 10 | **DEFER** | The U-2 draft/inventory discrepancy will be reconciled in the separate UAT cleanup change tracked by backlog #27; U-2 is not relied on for the User's Phase-1 acceptance. The User considers `jarvis_whoAmI` recovery non-core and defers it until AHP. Neither U-2 approval nor WhoAmI behavior is claimed as verified here. |
| 11 | **DEFER** | User defers the VE report scope correction to PM backlog #30. The Change Document excludes MCP transport from this change's verification gap; the follow-up is limited to aligning the VE report wording. VE status remains PARTIAL, and the QM CLEAR is unchanged. |
| 12 | **ACCEPT AS-IS** | User accepts backlog #27's existing separate UAT-cleanup scope as sufficient: create an Actor, delete its chat session, reopen it, and verify a special word from `context.md` in the new session. The old scripted UAT remains invalid PASS evidence; U-1..U-6 are not claimed as passed. |

**Known, already-disposed risks:** The approved technical Reminder T-2/T-6/T-7
delivery claims remain historically inconsistent under Finding 6's Phase-2
retirement decision; T-4's wrapped list response is corrected (Finding 7).
`REQ_MSG_REMINDERS_PERSIST` AC-6 and `SPEC_MSG_REMINDERSTORE` still describe
atomic removal, while direct file writes can partially overwrite the store.
The User explicitly deferred that persistence risk to PM backlog #26; the
pre-mutation exception regression test is not evidence of atomic writes.

**User scope clarification (2026-09-25):** This phase is to demonstrate that
the new kindless Actors work. Unrelated legacy cleanup should move to the
Phase-2 old-Actor removal or, if not part of that removal, Phase-3 final
cleanup. The historical technical Reminder UAT is already deferred to Phase 2.
Findings 8 and 9 are shared Reminder-spec and documentation issues, not
evidence that new Actors malfunction; neither is an automatic Phase-1 blocker.
Finding 8 does not disappear merely by removing old kind-based Actors, so PM
must explicitly assign its reconciliation to a follow-up phase and owner.

**Revised interim verdict: no new-Actor implementation defect established;
scoped QM disposition pending.** The earlier blanket CHANGES REQUIRED verdict
was too broad for the User's Phase-1 goal. PM has recorded DEFER decisions for
Findings 8–10 above and linked follow-up work to backlog items #27–29. The User
considers Phase 1 complete for continued work, but rejects the existing
six-case UAT scripts as valid PASS evidence; their cleanup is separate work.
VE remains PARTIAL with the disclosed host evidence accepted as-is by PM, and
no technical-verification OK is recorded. The 435 passing tests and F3 retest
are not User UAT verdicts. These PM dispositions and the User's decision to
proceed do not change the independent QM verdict or grant QM CLEAR,
technical-verification OK, or merge clearance. A direct QM closeout assessment
remains required before merge.

### Round 6 — QM Closeout Verdict

**Reviewed by:** Quality Manager, 2026-09-25. **Baseline:** CD `18b1595`.

**Specification-quality verdict: QM CLEAR for the Phase-1 new-Actor scope.**
L0 and L1 PASS for the four approved `US_ACTOR_*` stories and six approved
`REQ_ACTOR_*` requirements; structural Trace PASS with no broken links.
Findings 8, 9, and 10 are formally DEFERRED by PM with a named backlog item
(#28, #29, #27) and rationale. Findings 11 and 12 below are new, raised by
the User directly against this Round's draft; neither describes a
demonstrated defect in the new Actor's approved Phase-1 contract. **Findings
11 and 12 are open, PENDING PM disposition** — the PM Dispositions table
below covers only 8/9/10; QM has not recorded and does not assume a #27
routing for 11/12 on PM's behalf. No unresolved MECE, Trace, or schema
contradiction remains in that scope.

**This QM CLEAR is scoped and does not itself establish two separate facts,
both outside QM's mandate:**

- **Technical verification.** VE's independent report remains **PARTIAL**:
  live registered-tool host invocation and VS Code timer/reload behavior
  were not exercised. PM previously accepted this gap as-is (Finding 5); QM
  neither closes nor reopens it. MCP transport execution is **not** part of
  this gap: this branch touches zero files under `packages/mcp` (Finding 11);
  its earlier inclusion here was a scope-attribution error, now corrected.
- **User acceptance.** The User reports informally performing U-1..U-6 but
  declines to accept the results as valid evidence, in part because the
  script itself does not isolate the file-based memory contract from
  ordinary chat continuity (Finding 12, U-1 exemplar). The protocol artifact
  still reads NOT RUN; Finding 12's disposition and script redesign are QM's
  recommendation only — PM disposition is pending, not claimed as a current
  acceptance verdict.

**Merge readiness is a User/PM decision, not a QM gate.** The User has stated
Phase 1 is complete for continued work and given explicit OK to merge on the
current evidence, accepting the above two gaps knowingly. QM's role is to
report that the specification layer is internally consistent and every open
finding is owned and tracked — which it now is. QM does not withhold CLEAR
pending VE PARTIAL or UAT execution once the User has made that call with
full visibility of both gaps; QM also does not reopen the deferred Reminder
or legacy-tree UAT scope per PM's instruction.

**Verdict: QM CLEAR (Phase-1 new-Actor specification scope) — stands at
current HEAD.** VE technical status: PARTIAL, scoped to live registered-tool
host and timer/reload only — MCP transport is out of scope for this CD
(Finding 11). User UAT: protocol reads NOT RUN; User informally exercised
U-1..U-6 but declines them as evidence, partly due to a UAT script design
defect (Finding 12). Findings 11 and 12 are open and PENDING PM disposition;
neither is a demonstrated new-Actor code defect, so neither withholds this
CLEAR. No further QM action is required unless PM's disposition of 11/12
surfaces a new contradiction. Merge proceeds at User/PM discretion with
these facts on record.

**PM disposition update (2026-09-25):** Finding 11 is DEFERRED to backlog #30;
Finding 12 is ACCEPTED AS-IS as addressed by the existing UAT redesign scope
in backlog #27. These decisions do not change the scoped QM CLEAR or claim
valid User UAT PASS evidence.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*