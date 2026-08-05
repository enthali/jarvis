# Change Document: jarvis-messages-dir-grouping

**Status**: merged
**Branch**: feature/jarvis-messages-dir-grouping
**Created**: 2026-07-29
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

`.jarvis/` root currently mixes persistent team knowledge (`actors/`) with
flat, transient runtime state, and three of those root files —
`messages.json`, `message-log.json`, `autodelivery.json` — are all
message-related but nothing in their names or location says so;
`state/touched-files/` already shows the grouped-and-well-named pattern this
change extends. This change introduces `.jarvis/messages/` and moves those
three files into it (`messages/queue.json`, `messages/log.json`,
`messages/autodelivery.json`), leaving single-file categories
(`reminders.yaml`, `heartbeat.yaml`, `syspilot-state.json`) at the root
un-grouped — scope is deliberately messages-only, not a full one-folder-per-category
reorg, since only the message trio currently suffers from misleading flat
naming. Migration must be loss-free under version skew across separately
upgraded packages (`core`/`flow`/`syspilot`), not a one-time move owned by a
single package (activation- and upgrade-order dependent). **CM confirmed
(2026-07-29):** the CD's original "try new, fall back to old, always write
new" is insufficient — once a newer package creates the new path, an older
sibling still writing the legacy path produces silent non-delivery; fallback
also never removes the old file (contradicts `US_CFG_WORKSPACEFILES` AC-4).
Normative mechanism is therefore `REQ_CFG_STATEMIGRATION` /
`SPEC_CFG_STATEMIGRATION`: **union on read**, **write only the current path**,
**remove the superseded file only after a union write has persisted**.
Read-only consumers (e.g. flow data service) union-read and never remove.
Writers in every package that mutates queue state run the full
union-write-remove cycle. This change also eliminates dual path resolution
for files that were required to sit "beside messages.json" and for
`reminders.yaml` (sibling derivation vs `configPaths.getRemindersPath()`) —
single-source path resolution via `configPaths` everywhere. SD finding: the
reminders dual path was a **spec contradiction** (both call sites conformed
to different approved requirements), not a Dev code defect. This change also
resolves a pre-existing story contradiction as part of Level 0: `US_CFG_MSG`
and `US_MSG_CHATQUEUE` AC-1 vs `US_CFG_FIXEDPATHS` — `US_CFG_MSG` /
`REQ_CFG_MSGPATH` deprecated. Acceptance criteria: (1) the three message
files live under `.jarvis/messages/` with the new names; (2) every consuming
package implements the union-read / write-current / remove-after-persist
rules per `SPEC_CFG_STATEMIGRATION` (writers full cycle; read-only consumers
union only); (3) `reminders.yaml` and other former siblings resolve only via
`configPaths` single-source helpers — no sibling-of-messages derivation;
(4) `US_CFG_MSG`/`US_MSG_CHATQUEUE` AC-1 no longer contradict
`US_CFG_FIXEDPATHS`; (5) the final layout is documented in the same
"Workspace File Layout & VCS Visibility" `spec_cfg.rst` section #58
introduced. GitHub Issue: #59.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impact analysis (performed before element selection)

Project-wide grep for `messages.json`, `message-log.json`, `autodelivery.json`,
`reminders.yaml` (277 matches / 60 files), for the removed settings
`jarvis.messagesFile` / `jarvis.heartbeatConfigFile` (90 matches / 36 files),
and for `path.dirname(` across `packages/**/*.ts`.

| Class | Where | Handling |
|---|---|---|
| Active source — path resolution | `packages/core/.../configPaths.ts`, `messageQueue.ts`, `reminders.ts`, `remindersTreeProvider.ts`, `packages/flow/src/extension.ts`, `packages/syspilot/src/versionCheck.ts` | L2 scope |
| Active repo config | `.gitignore` L29–31 (three files enumerated individually) | L2 scope — see finding 3 |
| Active spec — paths | `req_cfg.rst`, `req_msg.rst`, `req_exp.rst`, `req_flow.rst`, `spec_cfg.rst`, `spec_msg.rst`, `spec_exp.rst`, `spec_flow.rst`, `spec_mod.rst` | L1/L2 scope |
| Active spec — UAT | `us_uat_*`, `req_uat_*`, `spec_uat_*` for autodelivery, flow, messagelogging, msgqueue, reminders, settings_cleanup, spl, sessioninitprompt, chateditorreuse, tree_node_open_file | **Not modified — see Decision 5** |
| Stale spec — removed settings | `US_CFG_HEARTBEAT`, `REQ_CFG_HEARTBEATPATH`, `REQ_EXP_*`, `REQ_MSG_*` view gating, `SPEC_CFG_SETTINGS`, `SPEC_EXP_FEATURETOGGLE`, `README.md` L70 | **Out of scope — escalated, see finding 4** |
| Historic Change Docs | `docs/changes/v0.1.0/*`, `v0.4.0/*`, `v0.5.*`, `v0.6.*`, `v0.14.0/*`, `v0.16.0/*`, `v0.19.0/*`, `v0.20.1/*` | Acceptable historic stranding |
| Actor memory | `.jarvis/actors/**` | Other actors' memory — out of scope |

### Four findings that change the framing

**Finding 1 — the sibling-derivation defect is not one bug, it is four call
sites, and this CR turns some of them silently right and one silently wrong.**
The CD names one instance: `reminders.ts`. Grep for `path.dirname(` found the
same pattern at four places, all deriving a runtime path from `messagesPath`:

| Call site | Derives | Result after the move |
|---|---|---|
| `core/.../reminders.ts:25` | `reminders.yaml` | `.jarvis/messages/reminders.yaml` — **silently wrong** |
| `core/.../messageQueue.ts:33` | `autodelivery.json` | `.jarvis/messages/autodelivery.json` — **accidentally right** |
| `core/.../messageQueue.ts:37` | `message-log.json` | `.jarvis/messages/message-log.json` — **wrong name**, spec says `log.json` |
| `syspilot/src/versionCheck.ts:102` | `autodelivery.json` | `.jarvis/messages/autodelivery.json` — **accidentally right** |

The accidentally-right cases are the dangerous ones. They will pass every test,
and they encode the false invariant *"a runtime file lives next to the queue"*
— which is exactly what breaks the next time any of these files moves.
`configPaths.ts` already exposes `getAutoDeliveryPath()` and
`getMessageLogPath()`; the choke point exists and is bypassed. So the fix is
not "remove one derivation" but **"no runtime path may be derived from another
runtime path"** — a property, stated once, that binds all four sites and any
future one.

**Finding 2 — the reminders dual-path is not an implementation defect; two
approved spec elements contradict each other and the code follows both.**
`SPEC_MSG_REMINDERSTORE` states the sibling helper "is replaced by this
delegation", while `REQ_EXP_REMINDER_OPENFILE` AC-2 *requires* the file to be
"resolved by `resolveRemindersPath(messagesPath)`", and
`SPEC_EXP_REMINDER_OPENFILE` writes it into its handler code block — while
linking `SPEC_MSG_REMINDERSTORE`, the spec it contradicts. `extension.ts`
implements the first, `remindersTreeProvider.ts` the second. Both are
conformant. Calling this a code bug would have sent Dev to fix code that
correctly implements an approved requirement, and the contradiction would have
regenerated it.

The reason the contradiction survived is visible in `SPEC_CFG_PATHRESOLVER`:
its usage contract binds "each persistence module (`messageQueue.ts`,
`reminders.ts`, `heartbeat.ts`)". `remindersTreeProvider.ts` is a *view*, so it
was never in scope of a contract that enumerated modules instead of stating a
property.

**Finding 3 — the user cost is already visible in this repository.**
`.gitignore` L29–31 enumerates `.jarvis/message-log.json`,
`.jarvis/autodelivery.json`, `.jarvis/messages.json` as three separate entries.
Nothing in that list says they belong together, and a fourth message file would
silently remain tracked. Same evidence shape as GH #58's finding 2, and again
from a repository that dogfoods Jarvis.

**Finding 4 — `US_CFG_MSG` is not an isolated stale story; it is one of a
cluster, and only its own trace is in scope.** The contradiction the CD names
is real and is fixed here. But `US_CFG_HEARTBEAT` AC-1/AC-2 make the *identical*
false claim for `jarvis.heartbeatConfigFile`, and the removed settings are still
asserted as current in `REQ_CFG_HEARTBEATPATH`, `REQ_EXP_*`/`REQ_MSG_*` view
gating, `SPEC_CFG_SETTINGS`, `SPEC_EXP_FEATURETOGGLE` and `README.md` L70.

Scope rule applied: **fix what this CR's own trace makes incoherent, escalate
what is merely adjacent.** `REQ_CFG_MSGPATH` hangs directly under `US_CFG_MSG`
and is therefore fixed here; the heartbeat and view-gating cluster is reported
to CM for a separate cleanup CR. Escalated rather than silently extended.

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_CFG_FIXEDPATHS` | Fixed Runtime File Paths | **modified** | AC-4 and AC-7 named the three moving files by path. Updated to `messages/queue.json`, `messages/log.json`, `messages/autodelivery.json`. AC-3/AC-5 (heartbeat, reminders) unchanged — they do not move |
| `US_CFG_MSG` | Message Queue Storage Location | **deprecated** | Superseded by `US_CFG_FIXEDPATHS`. Both ACs became false at the settings-cleanup CR and stayed `approved` for over a year |
| `US_MSG_CHATQUEUE` | Chat Message Queue | **modified** | AC-1 named `context.storageUri/messages.json` and `jarvis.messagesFile`. Now defers the location to `US_CFG_FIXEDPATHS` AC-4 instead of restating it — see Decision 3. `:links:` retargeted from `US_CFG_MSG` to `US_CFG_FIXEDPATHS` |
| `US_CFG_WORKSPACEFILES` | Identifiable Jarvis-Owned Workspace Files | **unchanged, but see Decision 2** | Its AC-4 forbids orphans under superseded names — which the CD's migration mechanism would produce. Resolved by strengthening the mechanism, not by weakening the story |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| `US_CFG_RUNTIMELAYOUT` | Comprehensible Runtime File Layout | required |

**As a** Jarvis user who inspects or maintains the `.jarvis/` directory in my
workspace, **I want** runtime files that belong to the same feature to be
grouped together and named for what they hold, **so that** I can understand,
back up, ignore, or clear a feature's state as one unit, without first learning
which of several flat files belong together.

Seven ACs: AC-1 group discoverable from the listing alone; AC-2 addressable as
one unit, forward-compatible; AC-3 names describe content within the group;
AC-4 no data lost or duplicated; AC-5 AC-4 holds under any activation order
**and under version skew**; AC-6 no manual user step; AC-7 no regrouping where
no confusion exists.

### Decisions

**Decision 1 — a new story is needed; this is a third axis, not a variant of an
existing one.** Three stories now govern `.jarvis/`, and they are orthogonal:
`US_CFG_FIXEDPATHS` answers *where* (fixed, not configurable),
`US_CFG_WORKSPACEFILES` answers *whose and how visible to VCS*, and
`US_CFG_RUNTIMELAYOUT` answers *how organised*. No AC of any of the three is
falsified or restated by the others. Folding grouping into `US_CFG_FIXEDPATHS`
would have merged a claim about configurability with a claim about
comprehensibility.

**Decision 2 — AC-5 (version skew) is deliberately stronger than the CD, and it
invalidates the CD's stated migration mechanism.** This is the one place where
I did not follow the CD, so the reasoning is set out in full.

The CD prescribes a tolerant fallback read: *"try the new path, fall back to the
old path, always write to the new path"*, and justifies it by noting that
`core`, `flow` and `syspilot` are separate VS Code extensions with no activation
order guarantee. That justification is sound and I have kept it. But separately
installed extensions are also separately *upgraded*: a user may run a new `core`
next to an older `syspilot`, and `syspilot` has its own version-check machinery
precisely because versions can differ.

Under that condition, "fall back only if the new path is absent" loses data. Once
`core` has written `messages/queue.json`, an older `syspilot` that still writes
`messages.json` becomes invisible: the new path exists, so the old one is never
read again. The queued message is not delivered and nothing reports an error —
it fails silently and plausibly.

The mechanism that is actually safe under the CD's own premise is **merge, not
fallback**: read both locations, combine, write the combined state to the new
path, and remove the old file only once its content is safely at the new path.
All three files are mergeable — the queue and the log are append-ordered lists,
the auto-delivery list is a set.

Merge also resolves the conflict with `US_CFG_WORKSPACEFILES` AC-4 ("upgrading
SHALL NOT leave generated files behind under names a previous version used").
Pure fallback-read never removes the old file, so it would have left
`.jarvis/messages.json` in place permanently, holding stale but plausible data —
the very orphan GH #58 was written to prevent. Merge-then-remove satisfies both
stories, so neither has to be weakened.

**This changes the CD's acceptance criterion 2 and needs PM/CM confirmation.**
It is carried through L1/L2 as specified, and raised explicitly in the RESPOND.

**Decision 3 — `US_MSG_CHATQUEUE` AC-1 defers the location instead of restating
it.** The AC's job is that a `queue` step appends a message with `session` and
`text`. The path was incidental, and restating it is what made the AC go stale
and contradict `US_CFG_FIXEDPATHS` for a year. One owner per fact:
`US_CFG_FIXEDPATHS` owns locations. This also means the story needs no edit the
next time a path changes.

**Decision 4 — `US_CFG_MSG` is deprecated, not corrected.** Correcting it to
"the queue lives at a fixed path" would duplicate `US_CFG_FIXEDPATHS` AC-4 and
leave two owners for one fact. Its user goal — *choosing* the location — was
deliberately abandoned by the settings-cleanup CR. The honest record is a
superseded story whose ACs are marked historic, not a rewritten story that
pretends the goal still exists.

**Decision 5 — the UAT specs are not modified here.** Roughly ten UAT story /
requirement / spec triples reference the moving filenames in their setup and
verification steps. They are Test Designer's artefacts and they describe manual
test procedures, not product behaviour; rewriting them from the System
Designer's chair would both cross a role boundary and risk invalidating step
sequences I cannot execute. They are listed in the impact table and handed to CM
for the Test Designer, and the Final Consistency Check records them as a known,
disclosed gap rather than an overlooked one.

**Decision 6 — `reminders.yaml` and `heartbeat.yaml` stay at the root.**
`US_CFG_RUNTIMELAYOUT` AC-7 makes this explicit rather than leaving it as an
omission. A single-file category gains nothing from a folder, and moving files
that cause no confusion would add migration risk with no user-visible benefit.
The story is written so that a later CR can group them if a second file ever
joins them — the criterion is "files that belong together", not "one folder per
category".

### Horizontal Check (MECE)

- [x] **No contradictions with existing User Stories.** Two were found; both
      are resolved rather than inherited. (a) `US_CFG_MSG` / `US_MSG_CHATQUEUE`
      AC-1 vs `US_CFG_FIXEDPATHS` — the contradiction the CD named, fixed by
      deprecation plus deferral. (b) `US_CFG_WORKSPACEFILES` AC-4 vs the CD's
      fallback-read mechanism — found during this check, resolved by
      strengthening the mechanism (Decision 2). The second is the more serious
      of the two: it would have shipped a CR that violated a story approved one
      CR earlier.
- [x] **No redundancies.** The three `.jarvis/` stories were checked
      pairwise against each other (Decision 1). `US_MSG_CHATQUEUE` AC-1 no
      longer restates a location owned by `US_CFG_FIXEDPATHS` — one owner per
      fact.
- [x] **Gaps identified and addressed.** The gap is that no story described
      Jarvis's runtime layout as something a user reads and maintains; the
      three files were governed only as individual paths, so nothing made their
      relationship a requirement. `US_CFG_RUNTIMELAYOUT` fills it. Two further
      gaps are disclosed rather than filled: the stale removed-settings cluster
      (finding 4) and the UAT specs (Decision 5).

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_CFG_FIXEDPATHS` | `US_CFG_FIXEDPATHS` | **modified** | Path list updated to `messages/queue.json`, `messages/log.json`, `messages/autodelivery.json`. AC-1 extended to subdirectories. New AC-5 binds resolution to `REQ_CFG_PATHSINGLESOURCE` |
| `REQ_CFG_MSGPATH` | `US_CFG_MSG` | **deprecated** | Follows its parent story. Its ACs asserted `jarvis.messagesFile`, removed by `REQ_CFG_RENAMES` — yet it was still `implemented` and still the named authority for the queue location |
| `REQ_MSG_QUEUE` | `US_MSG_CHATQUEUE` | **modified** | AC-4 delegated the location to `REQ_CFG_MSGPATH`. Retargeted to `REQ_CFG_FIXEDPATHS`; `:links:` likewise |
| `REQ_MSG_AUTODELIVER_CONFIG` | `US_MSG_AUTODELIVERY` | **modified** | Description + AC-2 mandated derivation from the queue path. Now an absolute path via the resolver |
| `REQ_MSG_AUDITLOG` | `US_MSG_LOGGING` | **modified** | AC-1 mandated the name `message-log.json` and co-location. Now `messages/log.json` via the resolver |
| `REQ_MSG_REMINDERS_PERSIST` | `US_MSG_REMINDERS` | **modified** | Description + AC-2 mandated co-location with the queue; `:links:` pointed at the deprecated `REQ_CFG_MSGPATH`. This is the requirement-level root cause of the reminders defect |
| `REQ_MSG_AUTODELIVER_POLL` | `US_MSG_AUTODELIVERY` | **modified** | AC-2 named the two files; now names the concepts |
| `REQ_EXP_REMINDER_OPENFILE` | `US_MSG_REMINDERS` | **modified** | AC-2 required `resolveRemindersPath(messagesPath)` — see Conflict 1 |
| `REQ_FLOW_PACKAGE` | `US_FLOW_CHORDVIEW` | **modified** | Named `message-log.json` in its description |
| `REQ_FLOW_DATASOURCE` | `US_FLOW_CHORDVIEW` | **modified** | Path updated; read-only-consumer obligation added (`REQ_CFG_STATEMIGRATION` AC-7) |
| `REQ_FLOW_WEBVIEWPANEL`, `REQ_FLOW_LOGVIEWER`, `REQ_FLOW_REQUEUE` | `US_FLOW_*` | **modified** | Filename mentions replaced by references to the owning requirement |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| `REQ_CFG_MSGDIR` | Message Runtime Files Grouped in .jarvis/messages/ | `US_CFG_RUNTIMELAYOUT`; `REQ_CFG_FIXEDPATHS` | required |
| `REQ_CFG_PATHSINGLESOURCE` | Single-Source Runtime Path Resolution | `US_CFG_FIXEDPATHS`; `REQ_CFG_FIXEDPATHS` | required |
| `REQ_CFG_STATEMIGRATION` | Runtime State Relocation Without Loss | `US_CFG_RUNTIMELAYOUT`; `US_CFG_WORKSPACEFILES`; `REQ_CFG_MSGDIR`; `REQ_CFG_FILEMIGRATION` | required |

### Conflicts Detected

**⚠️ Conflict 1 — `REQ_EXP_REMINDER_OPENFILE` AC-2 vs `SPEC_MSG_REMINDERSTORE`, and the code implements both.**

`SPEC_MSG_REMINDERSTORE` states that the sibling-derivation helper "is replaced
by this delegation" to `configPaths.getRemindersPath()`.
`REQ_EXP_REMINDER_OPENFILE` AC-2 *requires* the file to be "resolved by
`resolveRemindersPath(messagesPath)`", and `SPEC_EXP_REMINDER_OPENFILE` writes
that call into its handler code — while linking `SPEC_MSG_REMINDERSTORE`.
`extension.ts` follows the first, `remindersTreeProvider.ts` the second.

The CD describes this as a latent bug found during investigation. It is not a
code defect: **both implementations are conformant to an approved element.** The
distinction matters, because filing it as a code bug would have sent the
Developer to change code that correctly implements an approved requirement,
leaving the contradiction in place to regenerate it.

Today the two paths agree, so nothing is observable. `REQ_CFG_MSGDIR` makes them
disagree permanently: the view would open `.jarvis/messages/reminders.yaml`,
which nothing writes. It would appear empty, with no error.

**Resolution:** AC-2 is rewritten to require the file the reminder store
persists to, obtained from the resolver. The requirement is amended rather than
the code, because the requirement is the thing that is wrong.

**⚠️ Conflict 2 — three requirements mandate the derivation that `REQ_CFG_PATHSINGLESOURCE` forbids.**

`REQ_MSG_AUTODELIVER_CONFIG` AC-2, `REQ_MSG_AUDITLOG` AC-1 and
`REQ_MSG_REMINDERS_PERSIST` AC-2 each require a file to sit "in the same
directory as `messages.json`", two of them naming
`resolveMessagesPath()`-with-filename-replaced explicitly. This is the
requirement-level source of the four derivation call sites: the code is
conformant.

**Resolution:** all three ACs are rewritten to state an absolute path obtained
from the resolver, and `REQ_CFG_PATHSINGLESOURCE` AC-5 forbids the construction
generally — no requirement may locate a file by reference to another file's
location. Without AC-5 the wording would return the next time a file is added.

**⚠️ Conflict 3 — the CD's migration mechanism vs `US_CFG_WORKSPACEFILES` AC-4 and its own premise.**

Carried down from L0 Decision 2 and specified here as `REQ_CFG_STATEMIGRATION`.
**Resolution:** merge-then-remove instead of fallback-read. Needs PM/CM
confirmation, as it changes the CD's acceptance criterion 2.

### Decisions

**Decision 1 — three new requirements, split by what can fail independently.**
`US_CFG_RUNTIMELAYOUT` yields two: its AC-1/2/3/7 (layout) become
`REQ_CFG_MSGDIR`, its AC-4/5/6 (no loss, any activation order or version, no
user action) become `REQ_CFG_STATEMIGRATION`. The split is not cosmetic — the
layout is verified by looking at a directory, the migration by simulating an
interrupted upgrade. A single requirement would have hidden the second behind
the first, which is the one that is trivially satisfiable.

**Decision 2 — `REQ_CFG_PATHSINGLESOURCE` is a separate requirement, not an AC
on `REQ_CFG_FIXEDPATHS`.** They have different subjects: `FIXEDPATHS` states
*what the paths are*, `PATHSINGLESOURCE` states *how they must be obtained*.
The evidence that this is a real distinction is that `FIXEDPATHS` has been
`implemented` throughout, while four call sites and three requirements violated
it — stating the values did not constrain the resolution. It links
`US_CFG_FIXEDPATHS` because a derived path is precisely a path that is not
"always resolved as" the stated one.

**Decision 3 — AC-3 forbids expressing the obligation as a list of modules.**
`SPEC_CFG_PATHRESOLVER` binds "each persistence module (`messageQueue.ts`,
`reminders.ts`, `heartbeat.ts`)". `remindersTreeProvider.ts` is a view, so it
fell outside — not by oversight but by construction, and any enumeration will
exclude the next case the same way. The requirement names the property and
records the enumeration failure as its reason, so a future editor can see why
the list form was rejected rather than restoring it as a clarification.

**Decision 4 — `REQ_CFG_STATEMIGRATION` is separate from `REQ_CFG_FILEMIGRATION`
(GH #58), because the two govern different risks.** `FILEMIGRATION` covers
*generated* files: Jarvis authored them and can delete and rewrite them, so its
worst case is an orphan. These files hold *pending user data*, so the worst case
is an undelivered message and no error anywhere. Merging them would apply
delete-and-rewrite semantics to data that cannot be regenerated. It links
`FILEMIGRATION` so the pair is visible as two halves of one topic.

**Decision 5 — AC-8 requires migration support to be retired by an explicit
decision.** Fallback reads are the kind of code that is removed during a tidy-up
because it looks dead. Removing it is a compatibility decision with a release
boundary, so the requirement makes the retirement a recorded decision naming a
release, not a judgement call in a cleanup PR. Same construction as
`SPEC_HOOK_MIGRATE` in GH #58.

**Decision 6 — filename mentions in consumer requirements are replaced by
references, not by updated filenames.** `REQ_FLOW_*` mentioned
`message-log.json` in seven places, none of which needed to know the filename —
they needed to identify *the audit log*. Updating the string in each would have
recreated the same seven stale references at the next move. They now reference
`REQ_MSG_AUDITLOG`, and `REQ_CFG_FIXEDPATHS` remains the single owner of the
path (`REQ_CFG_PATHSINGLESOURCE` AC-5).

### Horizontal Check (MECE)

- [x] **No contradictions with existing Requirements.** Three were found and
      all three are resolved above rather than inherited. Conflict 2 is the
      material one: the derivation the CD treats as a code defect is written
      into three approved requirements, so the analysis had to be redirected
      from the code to the specification.
- [x] **No redundancies.** The three new requirements were checked pairwise
      and against `REQ_CFG_FIXEDPATHS` and `REQ_CFG_FILEMIGRATION`
      (Decisions 1, 2, 4). `REQ_CFG_MSGDIR` AC-6 and `REQ_CFG_FILEPREFIX` AC-6
      state distinct obligations that a single document section satisfies —
      the cross-reference is noted so this is not later mistaken for duplication.
- [x] **All new REQs link to User Stories.** `REQ_CFG_MSGDIR` →
      `US_CFG_RUNTIMELAYOUT`; `REQ_CFG_PATHSINGLESOURCE` →
      `US_CFG_FIXEDPATHS`; `REQ_CFG_STATEMIGRATION` → `US_CFG_RUNTIMELAYOUT`,
      `US_CFG_WORKSPACEFILES`.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_CFG_PATHRESOLVER` | `REQ_CFG_FIXEDPATHS`, `REQ_CFG_MSGDIR`, `REQ_CFG_PATHSINGLESOURCE` | **modified** | `getMessagesDir()`/`ensureMessagesDir()` added; three getters retargeted into `messages/`; three `getLegacy*` read-only getters added; **usage contract restated as a property** — see Decision 2 |
| `SPEC_CFG_WORKSPACEFILES` | `REQ_CFG_MSGDIR` | **extended** | The `.jarvis/` interior table added, as the GH #58 scope note anticipated. Also records the `.gitignore` collapse |
| `SPEC_MSG_QUEUESTORE` | `REQ_MSG_QUEUE`, `REQ_CFG_STATEMIGRATION` | **modified** | Union read, single `writeQueue()` write path with removal-after-write; `:links:` retargeted off the deprecated `REQ_CFG_MSGPATH`; index-stability note added |
| `SPEC_MSG_AUTODELIVER_STORE` | `REQ_MSG_AUTODELIVER_CONFIG` | **modified** | `resolveAutoDeliveryPath(messagesPath)` removed; the three functions now take their own path |
| `SPEC_MSG_LOGSETTING` (audit-log write) | `REQ_MSG_AUDITLOG` | **modified** | `resolveLogPath(messagesPath)` removed; `configPaths.getMessageLogPath()` |
| `SPEC_MSG_REMINDERSTORE` | `REQ_MSG_REMINDERS_PERSIST` | **modified** | Design note restated as a property over all callers instead of naming `extension.ts` — see Decision 2 |
| `SPEC_MSG_REMINDERSLOOP`, `SPEC_MSG_REMINDERSCMDS`, `SPEC_MSG_REMINDERSVIEW` | `SPEC_MSG_REMINDERSTORE` | **modified** | Eight `resolveRemindersPath(messagesPath)` occurrences in code blocks replaced |
| `SPEC_EXP_REMINDER_OPENFILE` | `REQ_EXP_REMINDER_OPENFILE` | **modified** | Handler resolved the path by derivation while linking the element that forbade it |
| `SPEC_FLOW_DATASERVICE` | `REQ_FLOW_DATASOURCE` | **modified** | Union read; read-only consumer never removes |
| `SPEC_FLOW_REQUEUE` | `REQ_FLOW_REQUEUE` | **modified** | A writer in a separate package — full union-write-remove cycle and mirrored resolver |
| `SPEC_FLOW_LOGVIEWER`, `SPEC_FLOW_ACTORCLICK`, `SPEC_MOD_FLOWPACKAGE` | — | **modified** | Filename mentions replaced by references |
| `SPEC_SPL_NOTIFYACTOR` | `REQ_SPL_*` | **modified** | Derived the auto-delivery path from the queue path; now resolves it in its own right. New AC-5 |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| `SPEC_CFG_STATEMIGRATION` | Loss-Free Relocation of Message Runtime State | `REQ_CFG_STATEMIGRATION`, `REQ_CFG_MSGDIR`, `SPEC_CFG_PATHRESOLVER`, `SPEC_MSG_QUEUESTORE` |

### Conflicts Detected

**⚠️ Conflict 4 — `deleteMessage(filePath, index)` addresses entries positionally, and a union read changes what an index means.**

Found while specifying `SPEC_MSG_QUEUESTORE`, not present in the CD. Once
`readQueue` returns the union of two files, an index is only meaningful if every
caller sees the same ordering. Concatenation order would differ depending on
which file each caller read first, so a delete could remove the wrong message —
and only in workspaces that still hold a superseded file, which is precisely
where it would not be noticed in testing.

**Resolution:** `SPEC_CFG_STATEMIGRATION` fixes a deterministic order per file
(`timestamp` ascending for the queue and log, insertion order for the
auto-delivery set), and `SPEC_MSG_QUEUESTORE` records that this is the one place
where the union is not transparent to callers.

**⚠️ Conflict 5 — `SPEC_MSG_AUTODELIVER_STORE`'s design note asserted the derivation as a virtue.**

It read: *"`resolveAutoDeliveryPath` is a pure derivation — no new config key
needed"* and *"All three functions accept the resolved `messages.json` path so
callers use the same `resolveMessagesPath()` source of truth."* The second
sentence is the inversion that made this spread: passing the queue path was
understood as *upholding* single-source resolution, when it makes the queue's
location an input to three unrelated files.

**Resolution:** the functions take their own resolved path. The note now records
why the derivation was replaced even though it would have kept working, so the
argument is not re-made later from the same premise.

### Decisions

**Decision 1 — one new design element, not one per file.** The three files
migrate by the same mechanism, so `SPEC_CFG_STATEMIGRATION` specifies it once
and tabulates what differs per file (entry identity and ordering). Three
elements would have triplicated the ordering argument, and the second copy is
where it stops matching.

**Decision 2 — the resolver's usage contract is restated as a property, and the
reason it was an enumeration is recorded next to it.** The old wording bound
"each persistence module (`messageQueue.ts`, `reminders.ts`, `heartbeat.ts`)".
That is why `remindersTreeProvider.ts` — a view — was never in scope. The
replacement binds every consumer in every package, and states the failure that
produced it, because an enumeration reads as more precise than a property and
will otherwise be restored as a clarification. `SPEC_MSG_REMINDERSTORE` gets the
same treatment: it named `extension.ts` as *the* caller, which is what let a
second caller keep the derivation without contradicting anything.

**Decision 3 — `getLegacy*` accessors, rather than migration code building the
old paths inline.** Otherwise the superseded paths reappear as string literals
in every consumer, and `REQ_CFG_STATEMIGRATION` AC-8's retirement decision would
have no single place to act on. They are read-only by convention, stated in the
design notes: no write path resolves through them.

**Decision 4 — `flow`'s requeue is specified as a full writer, not just
repointed.** It writes the queue from a separately versioned extension, which is
exactly the version-skew case `REQ_CFG_STATEMIGRATION` exists for. Repointing it
at the new path alone would have made it the mechanism's first counterexample.
Its sibling `dataService` is read-only and therefore explicitly must *not*
remove — the two halves of `AC-7` appear in the same package, which is the
clearest place to show that the distinction is about writing, not about who
noticed the file first.

**Decision 5 — `syspilot`'s derivation is replaced although it would keep
working.** After the move, `path.dirname(messagesPath)` yields
`.jarvis/messages/`, so its `autodelivery.json` lands correctly by accident.
Leaving it would ship a passing test over a false invariant, and the next
relocation would break it with no failing test anywhere to say why. The
replacement is stated in the code comment as *not derived*, so the reason
survives the next reader.

**Decision 6 — the `.gitignore` change is specified in `SPEC_CFG_WORKSPACEFILES`
and not performed.** Editing it is Developer scope. It is specified rather than
merely left to the Developer because the collapse from six enumerated entries to
two directory patterns is the user-visible evidence for
`US_CFG_RUNTIMELAYOUT` AC-2, and it belongs in the section that already owns
"what a consuming project should exclude from version control".

### Horizontal Check (MECE)

- [x] **No contradictions with existing Designs.** Two further conflicts were
      found at this level (4 and 5) and resolved above. Conflict 5 matters
      beyond its own fix: the superseded design *argued for* the derivation as
      single-source discipline, so anyone reading it would have reproduced the
      pattern in good faith — which is what the four call sites are.
- [x] **All new SPECs link to Requirements.** `SPEC_CFG_STATEMIGRATION` →
      `REQ_CFG_STATEMIGRATION`, `REQ_CFG_MSGDIR`. Every modified element's
      `:links:` was checked; `SPEC_MSG_QUEUESTORE` was the one still pointing at
      the now-deprecated `REQ_CFG_MSGPATH` and has been retargeted.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_CFG_RUNTIMELAYOUT` (new) | `REQ_CFG_MSGDIR`, `REQ_CFG_STATEMIGRATION` | `SPEC_CFG_WORKSPACEFILES`, `SPEC_CFG_PATHRESOLVER`, `SPEC_CFG_STATEMIGRATION` | ✅ |
| `US_CFG_FIXEDPATHS` (modified) | `REQ_CFG_FIXEDPATHS`, `REQ_CFG_PATHSINGLESOURCE` | `SPEC_CFG_PATHRESOLVER` | ✅ |
| `US_CFG_WORKSPACEFILES` (unchanged) | `REQ_CFG_STATEMIGRATION` (AC-4), `REQ_CFG_FILEPREFIX`, `REQ_CFG_FILEMIGRATION` | `SPEC_CFG_WORKSPACEFILES` | ✅ |
| `US_MSG_CHATQUEUE` (modified) | `REQ_MSG_QUEUE` | `SPEC_MSG_QUEUESTORE` | ✅ |
| `US_MSG_LOGGING` (modified AC-3) | `REQ_MSG_AUDITLOG` | `SPEC_MSG_LOGSETTING` | ✅ |
| `US_MSG_AUTODELIVERY` | `REQ_MSG_AUTODELIVER_CONFIG`, `_POLL` | `SPEC_MSG_AUTODELIVER_STORE` | ✅ |
| `US_MSG_REMINDERS` | `REQ_MSG_REMINDERS_PERSIST`, `REQ_EXP_REMINDER_OPENFILE` | `SPEC_MSG_REMINDERSTORE`, `SPEC_EXP_REMINDER_OPENFILE` | ✅ |
| `US_FLOW_CHORDVIEW`, `US_FLOW_LOGVIEWER` | `REQ_FLOW_PACKAGE`, `_DATASOURCE`, `_LOGVIEWER`, `_REQUEUE` | `SPEC_FLOW_DATASERVICE`, `SPEC_FLOW_REQUEUE`, `SPEC_FLOW_LOGVIEWER` | ✅ |
| `US_CFG_MSG` (deprecated) | `REQ_CFG_MSGPATH` (deprecated) | — | ✅ retained for history |

**Deprecation trace closed downward.** `US_CFG_MSG` → `REQ_CFG_MSGPATH` are
deprecated together, and everything that referenced `REQ_CFG_MSGPATH` as the
*authority for a current path* — `REQ_MSG_QUEUE` AC-4,
`REQ_MSG_REMINDERS_PERSIST`, `SPEC_MSG_QUEUESTORE` — has been retargeted to
`REQ_CFG_FIXEDPATHS`.

**Two inbound links to the deprecated elements are deliberately retained:**
`US_EXP_FEATURETOGGLE` → `US_CFG_MSG` and `SPEC_CFG_HEARTBEATSETTINGS` →
`REQ_CFG_MSGPATH`. Both belong to the stale removed-settings cluster
(L0 finding 4), and both genuinely *do* reference the historic elements —
removing the links would erase the trace that shows why those elements are
stale, which is the evidence a cleanup CR needs. Disclosed here rather than
silently cut.

### Artefakt-Removal-Check

Removed artefacts: the paths `.jarvis/messages.json`, `.jarvis/message-log.json`,
`.jarvis/autodelivery.json`, and the helpers `resolveRemindersPath()`,
`resolveAutoDeliveryPath()`, `resolveLogPath()`.

Grep run project-wide on `messages\.json|message-log\.json|autodelivery\.json|resolveRemindersPath`.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `.jarvis/messages.json` | `configPaths.ts`, `messageQueue.ts`, `flow/extension.ts`, `flow/dataService.ts`, `syspilot/versionCheck.ts`, `.gitignore` L31/L38, `src/tests/*.test.ts` — **specified, handed to Dev** | `req_cfg`, `req_msg`, `req_flow`, `us_cfg`, `us_msg`, `spec_cfg`, `spec_msg`, `spec_flow`, `spec_mod`, `spec_spl` — **fixed** | ~9 CDs under `v0.1.0`–`v0.20.1` — acceptable historic stranding |
| `.jarvis/message-log.json` | `messageQueue.ts`, `flow/extension.ts` L14/17, `.gitignore` L29, `src/tests/message-flow-dataservice.test.ts` — **specified, handed to Dev** | `req_flow` (7), `spec_flow` (14), `spec_mod`, `req_msg`, `us_msg` — **fixed** | as above |
| `.jarvis/autodelivery.json` | `messageQueue.ts` L33, `syspilot/versionCheck.ts` L102, `.gitignore` L30/L39 — **specified, handed to Dev** | `req_msg`, `spec_msg`, `spec_spl` — **fixed** | as above |
| `resolveRemindersPath()` | `reminders.ts` L24–25, `remindersTreeProvider.ts` L5 — **specified, handed to Dev** | `req_exp` AC-2, `spec_exp` handler, `spec_msg` (8 occurrences) — **fixed** | — |
| `resolveAutoDeliveryPath()` / `resolveLogPath()` | `messageQueue.ts` L32–38 — **specified, handed to Dev** | `spec_msg` `SPEC_MSG_AUTODELIVER_STORE`, `SPEC_MSG_LOGSETTING` — **fixed** | — |

- [x] All class (a) active code/workflow references identified. **Not fixed here
      — they are source, and source is Developer scope.** Each is named above
      with file and line so nothing has to be rediscovered; the full list is
      repeated under Sign-off.
- [x] All class (b) active documentation references fixed in this CR — with
      two disclosed exceptions below.
- [x] Class (c) historical Change Documents accepted as acceptable historic
      stranding.

**Disclosed exception 1 — the UAT specs are not updated (L0 Decision 5).**
Roughly ten `us_uat_*` / `req_uat_*` / `spec_uat_*` triples name the superseded
filenames in setup and verification steps: autodelivery, chateditorreuse, flow,
messagelogging, msgqueue, reminders, sessioninitprompt, settings_cleanup, spl,
tree_node_open_file. They are Test Designer artefacts describing manual
procedures. Handed to CM for the Test Designer rather than rewritten from this
chair.

**Disclosed exception 2 — the removed-settings cluster is not updated
(L0 finding 4).** `jarvis.messagesFile` and `jarvis.heartbeatConfigFile` remain
asserted as current in `US_CFG_HEARTBEAT` AC-1/AC-2, `REQ_CFG_HEARTBEATPATH`,
`SPEC_CFG_SETTINGS` (`spec_cfg.rst` L69), `SPEC_EXP_FEATURETOGGLE`
(`spec_exp.rst` L305), view-gating ACs in `req_exp.rst` L149 and
`req_msg.rst` L1028, and `README.md` L70. All predate this CR and none is
reachable from the trace it touches. Escalated for a separate cleanup CR.

**One non-doc observation, reported not fixed:** `.vscode/settings.json` L4–5
still set both removed settings. Local machine configuration, not a project
artefact.

### Issues Found

- [x] **Issue 1 — the CD's migration mechanism is unsafe and is specified
      differently (L0 Decision 2, L1 Conflict 3).** Fallback-read loses messages
      under version skew and violates `US_CFG_WORKSPACEFILES` AC-4. Specified as
      union-read / write-new / remove-old. **CM confirmed 2026-07-29** — Summary
      AC-2 updated to match `REQ_CFG_STATEMIGRATION` / `SPEC_CFG_STATEMIGRATION`.
- [x] **Issue 2 — the sibling-derivation is mandated by three approved
      requirements, not a code defect (L1 Conflict 2).** Fixed at the
      requirement level; the code follows.
- [x] **Issue 3 — the reminders "latent bug" is a spec contradiction
      (L1 Conflict 1).** `REQ_EXP_REMINDER_OPENFILE` AC-2 vs
      `SPEC_MSG_REMINDERSTORE`. Both implementations were conformant.
- [x] **Issue 4 — positional deletion under a union read (L2 Conflict 4).**
      Resolved by fixing deterministic ordering.
- [ ] **Issue 5 — UAT specs need updating.** Open, Test Designer's lane.
- [ ] **Issue 6 — removed-settings cluster.** Open, separate cleanup CR.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (5 conflicts; Conflict 3 / Issue 1 migration
      mechanism confirmed by CM 2026-07-29 — Summary AC-2 updated to match
      REQ_CFG_STATEMIGRATION / SPEC_CFG_STATEMIGRATION)
- [x] Traceability verified
- [x] Sphinx `-W --keep-going` clean at every commit
- [x] All new elements set to `:status: approved`:
      `US_CFG_RUNTIMELAYOUT`, `REQ_CFG_MSGDIR`, `REQ_CFG_PATHSINGLESOURCE`,
      `REQ_CFG_STATEMIGRATION`, `SPEC_CFG_STATEMIGRATION`
- [x] Ready for implementation

#### Implementation scope handed to the Developer

Specification only — no source was modified by the System Designer.

1. `packages/core/src/engine/core/configPaths.ts` — add `getMessagesDir()`,
   `ensureMessagesDir()`, the three `getLegacy*` getters; retarget
   `getMessagesPath()`, `getMessageLogPath()`, `getAutoDeliveryPath()` into
   `messages/`. `getRemindersPath()` unchanged.
2. `packages/core/src/engine/sessions/messageQueue.ts` — delete
   `resolveAutoDeliveryPath` (L32–34) and `resolveLogPath` (L36–38); union read;
   single `writeQueue()` write path with removal-after-write. *Aside: `readQueue`'s
   catch logs `'[Jarvis] autodelivery.json: failed to parse'` — a copy-paste
   defect, unrelated to this CR, worth fixing while the file is open.*
3. `packages/core/src/apps/session/reminders.ts` — delete
   `resolveRemindersPath` (L24–25).
4. `packages/core/src/apps/session/remindersTreeProvider.ts` — use
   `configPaths.getRemindersPath()`; drop the import at L5.
5. `packages/flow/src/extension.ts` L14–17 and `dataService.ts` — new log path,
   union read, **never remove**.
6. `packages/flow` requeue — new queue path, full union-write-remove cycle.
7. `packages/syspilot/src/versionCheck.ts` L95–116 — `resolveMessagesPath()` to
   the new path; replace the derived `adPath` (L102) with an independently
   resolved auto-delivery path; union read.
8. `.gitignore` — replace L29–31 and L38–39 with `.jarvis/messages/` and
   `testdata/.jarvis/messages/`, per `SPEC_CFG_WORKSPACEFILES`.
9. `README.md` L70 — the `jarvis.messagesFile` row documents a removed setting.
   Strictly the cleanup CR's scope; listed because the file is user-facing.
10. `src/tests/message-flow-dataservice.test.ts` L13 and
    `src/tests/syspilot-versioncheck.test.ts` L145 hard-code the old filenames.


---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-30

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Code | SPEC_CFG_STATEMIGRATION | No test anywhere in `src/tests/` exercises the union-read/write-current/remove-after-persist merge mechanism — the highest-risk and most novel part of this CR, and the one part that deviates from the CD's original design (fallback-read → merge, requiring CM confirmation, L0 Decision 2). Nothing tests: dedup-by-identity-tuple, ascending-timestamp reordering after a merge, remove-after-persist (or its ENOENT/best-effort tolerance), on any of `messageQueue.ts`'s `unionReadQueue`/`unionReadAutoDelivery`/`writeAndRemoveLegacy`, `flow/extension.ts`'s `requeueMessage`, or `syspilot/versionCheck.ts`'s `addAutoDelivery`. `message-flow-dataservice.test.ts` and `syspilot-versioncheck.test.ts` were only updated for the new path string, not extended to construct a legacy file and verify union/removal behavior. The CD itself frames this mechanism as governing *pending user data*, not generated files (L1 Decision 4) — an untested merge here fails exactly the way the CD was written to prevent: a message silently never delivered, with nothing erroring. | high |
| 2 | Code | — | Minor: `packages/syspilot/src/versionCheck.ts` carries a commented-out `resolveMessagesPath` function (dead code) left in from drafting. Cosmetic, not functional. | low |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 7 commits, exact match to CM's message, correct order.

Read the CD in full: exceptionally rigorous, on the same bar as GH #58. Two genuinely serious issues were found and resolved by the System Designer before Dev ever touched code: (a) the CD's own proposed migration mechanism (fallback-read) was shown to lose messages under independent package version-skew and to contradict `US_CFG_WORKSPACEFILES` AC-4 — corrected to merge-then-remove, confirmed by CM; (b) a positional-deletion defect (`deleteMessage(filePath, index)`) that a union read would have made ambiguous, caught before it could ship. Two further findings correctly reclassified apparent "code defects" (reminders dual-path, four sibling-derivation call sites) as spec contradictions that the code correctly followed — the CD explicitly declines to send Dev to fix code that was conformant, fixing the requirements instead.

All code independently verified against spec: `configPaths.ts`'s `getMessagesDir`/`ensureMessagesDir`/`getLegacy*` getters and retargeted `getMessagesPath`/`getMessageLogPath`/`getAutoDeliveryPath`; `messageQueue.ts`'s `unionReadQueue`/`unionReadAutoDelivery`/`writeAndRemoveLegacy` — dedup by identity tuple, ascending-timestamp order, remove-only-after-write, matches `SPEC_CFG_STATEMIGRATION`'s prescribed cycle exactly; `reminders.ts`/`remindersTreeProvider.ts` — `resolveRemindersPath` deleted, view now calls `configPaths.getRemindersPath()` directly; `flow/extension.ts`'s `requeueMessage` — full union-write-remove cycle; `flow/dataService.ts`'s `unionReadLog` — read-only, confirmed it never calls unlink; `syspilot/versionCheck.ts`'s `addAutoDelivery` — full union-write-remove cycle, including the "already present but legacy exists" branch that still migrates. `.gitignore` collapsed from six enumerated entries to two directory patterns exactly as specified. `SPEC_CFG_STATEMIGRATION`'s full body (mechanism, identity/ordering table, read-only-consumer rule, retirement clause) read and matches code with zero drift.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 334/334 passed, 32/32 files (same count as CR #58's final state, confirming Finding 1: no test was added for this CR's own logic).

UAT (Issue 5) and the removed-settings cluster (Issue 6) are disclosed, non-blocking, and correctly scoped out per the CD's own Decision 5 / L0 finding 4 — not re-raised as new findings here.

**Overall: CLEAR with one fix-now recommendation.** Finding 1 (no test coverage for the merge-migration mechanism) is the same class of gap as GH #58 R1 — code that deletes/mutates a user's real files, shipped untested — and PM decided fix-now there for lower-stakes logic (generated-file cleanup) than this CR's (pending user data). Recommend the same disposition here.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | Fix now | This mechanism governs pending user data (messages, reminders), not generated files — an untested merge fails silently exactly the way the CD was written to prevent (a message never delivered, nothing errors). Same disposition as GH #58 R1 Finding 1, and higher-stakes here. |
| 2 | 2 | Fix now (bundled) | Trivial, zero-risk one-line deletion; a fix-now round is already going out for Finding 1, so no separate overhead to bundle it in. |

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-30

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. Both Round 1 findings resolved — see verification below. | — |

**Verification of Round 1 findings:**

Git log independently re-checked: 11 commits total, exactly matching CM's disclosure, correct order; two new commits since Round 1 (`e787690`, `132e973`).

**Finding 1 (fix-now, test coverage) — resolved.** Read `message-queue-migration.test.ts` (10 assertions), `syspilot-migration.test.ts`, `flow-migration.test.ts` (4, dataService read-only), and `flow-requeue-migration.test.ts` (5) in full. All are genuine filesystem-behavioral tests against real exported functions in temp directories — not source-text matching: dedup-by-identity-tuple verified by writing overlapping legacy/current arrays and asserting the merged output; ascending-timestamp reordering verified with out-of-order fixtures; remove-after-persist verified by asserting the legacy file no longer exists after the write; the "no legacy → no removal attempted" steady state is also covered. CM correctly held Round 2 open until the `flow` **requeue writer path** specifically was covered (not just `dataService`'s read-only path) — `requeueMessage`'s body was extracted into `packages/flow/src/requeueService.ts`'s `requeueWithMigration()` for testability, and `extension.ts` now delegates to it (confirmed via read: `extension.ts` imports and calls `requeueWithMigration(messagesPath, resolveLegacyMessagesPath(), entry)`, no logic left inline). This closes the gap precisely — Round 1's finding was about missing coverage on this exact writer.

**Finding 2 (fix-now, dead code) — resolved.** Grepped `syspilot/versionCheck.ts` for `resolveMessagesPath` — zero occurrences remain, the commented-out stub is gone.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 355/355 passed, 36/36 files, matching CM's disclosed count exactly (+21 assertions across 4 new test files since Round 1's 334).

**Overall: CLEAR.** Both Round 1 fix-now findings resolved. No new or outstanding findings.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | — |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
