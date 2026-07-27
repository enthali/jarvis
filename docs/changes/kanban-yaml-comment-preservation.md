# Change Document: kanban-yaml-comment-preservation

**Status**: draft
**Branch**: feature/kanban-yaml-comment-preservation
**Created**: 2026-07-27
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fix a bug where `jarvis_updateKanbanItem` silently destroys hand-authored
content in the board YAML file on every call: all comments are deleted, and
formatting is normalized (e.g. `labels: [a, b]` becomes block-style, long
`notes` strings get re-wrapped).

**Root cause**: In `packages/kanban/src/extension.ts`, the tool's write path
is a plain load → merge → dump round trip using the `yaml` package's
data-only API: `yaml.parse(rawContent)` returns a plain JS object (no comment
or formatting metadata), the merge mutates that plain object, and
`yaml.stringify(data)` re-serializes it from scratch with the library's
default formatting. Comments, key order nuances, and flow/block style choices
that existed only in the original text have no representation in the plain
object and are therefore lost unconditionally — this is not a bug in the
`yaml` library, it is a property of using its data-only `parse`/`stringify`
pair for a modify-and-save operation.

For boards used as a hand-authored, git-tracked source of truth (the
local-YAML case in #45), comments are the natural place for context with no
schema field — epic roadmaps, ordering rationale, "don't do X here" warnings.
Losing them on every programmatic update makes it unsafe to mix tool-driven
updates with hand editing, and produces noisy diffs that obscure the actual
change. The current workaround ("don't use the update tool, edit the file
directly") defeats the purpose of having the tool. This will become more
visible with #47 (write-back), where drag-and-drop would trigger a rewrite on
every interaction rather than only on explicit tool calls.

**Fix direction**: Switch `jarvis_updateKanbanItem`'s read/write path from the
data-only `yaml.parse`/`yaml.stringify` pair to the `yaml` package's
round-trip `Document` API (`YAML.parseDocument(rawContent)` /
`document.toString()`), which preserves comments, key order, and per-node
formatting style across a load → modify → dump cycle. Field mutation must
happen on the `Document` (e.g. `document.setIn(path, value)` /
`document.getIn(path)` against the items collection, keyed on the item's
stable `id`), not on a plain object derived from it — mutating a plain object
and re-stringifying it loses the round-trip metadata regardless of which
parse function produced it. The status-value validation already present
(reading `data.fields` to check against valid options) must be re-derived
from the same `Document` (e.g. via `document.toJS()` for read-only lookups)
rather than duplicated by re-parsing.

**Acceptance criteria**:
(a) a board YAML file with a comment header and inline comments retains all
of them, verbatim, after a `jarvis_updateKanbanItem` call that changes an
unrelated field;
(b) the diff produced by an update touches only the field(s) actually
changed — no unrelated reformatting of untouched lines (e.g. flow-style
arrays, wrapped strings);
(c) existing behavior is unchanged apart from serialization: item lookup by
stable `id`, immutable `id` field, status-value validation against
`fields[].options`, error paths (board not found, item not found, invalid
status, read/write failures), and the post-write `refreshKanbanPanel()` call
all behave exactly as before;
(d) existing test suite passes; add/update tests covering comment and
formatting preservation across an update.

**GitHub Issue(s)**: #53

---

## Findings

**Root cause confirmed as stated above.** `packages/kanban/src/extension.ts`
line 558 parses with `yaml.parse` (data-only), mutates the resulting plain
object, and line 595 re-serializes with `yaml.stringify`. Comments and style
have no representation in a plain object, so they are lost unconditionally.

**Scope check — this is the only affected path.** The other YAML touchpoints in
the package are read-only and therefore correct as written: `kanbanPanel.ts:24`,
`kanbanEditorProvider.ts:18`, and `extension.ts:456` (verify) parse but never
write back. `SPEC_KAN_CREATE` writes a fresh file from a literal string
template (`skeletonYaml`), not via `yaml.stringify`, and has no prior authored
content to preserve. Line 595 is the single write-back site in the package.

### Framing: this is a property of the file, not of the tool

The CR asks whether `REQ_KAN_UPDATE` should get a preservation AC. It should —
but stating it *only* there would repeat a mistake this project has already
paid for once.

CR #54 (`notification-agent-mode-reset`) fixed a bug that had already been
fixed in v0.5.8 and then silently regressed, because the original fix was
recorded as a workaround on one code path instead of as a property of the
mechanism. When that path was later consolidated, the fix was flattened away
and nobody noticed.

The same setup exists here. Phase 2 write-back (GH #47) introduces a **second**
write path, driven by drag-and-drop — where this defect would be considerably
worse, rewriting the file on every interaction rather than only on explicit
tool calls. A preservation AC attached solely to `jarvis_updateKanbanItem`
would not bind that path.

So the normative statement lives at `REQ_KAN_SCHEMA` AC-9 as a property of the
board file — *every* write path that modifies an existing board preserves
non-schema content — and `REQ_KAN_UPDATE` AC-6 states the concrete, testable
consequence for this tool.

### The load-bearing design constraint

"Use the `Document` API" is the fix, but it is not the constraint. The
constraint is **where mutation happens**:

> Comments and style exist only in the round-trip representation. Deriving a
> plain object from it, mutating that, and re-serializing loses everything —
> regardless of which parse function produced the document.

An implementation that switches `yaml.parse` → `YAML.parseDocument` and then
does `const data = doc.toJS(); …mutate…; write(YAML.stringify(data))` satisfies
the letter of "use the Document API" and still fails every acceptance
criterion. That trap is why this belongs in the design spec rather than being
left to implementation, and it is written into `SPEC_KAN_UPDATE` explicitly.

Related: status validation currently re-reads `data.fields`. `SPEC_KAN_UPDATE`
step 5 now requires validation to read from the *same* representation being
mutated — not from a second parse — so validation and mutation cannot disagree
about file content.

### Level 0 — User Stories

| ID | Change | Rationale |
|---|---|---|
| `US_KAN_BOARD` | modified | New AC-6: the YAML file is a hand-authored, git-tracked source of truth; hand-written comments and formatting survive programmatic updates, and tool-driven changes produce confined diffs. Supplies the missing WHY — without it, `REQ_KAN_SCHEMA` AC-9 and `REQ_KAN_UPDATE` AC-6 would be unmotivated requirements (the traceability gap QM raised on an earlier CR) |

### Level 1 — Requirements

| ID | Links to | Change | Rationale |
|---|---|---|---|
| `REQ_KAN_SCHEMA` | `US_KAN_BOARD` | modified | New AC-9: non-schema content (comments, key order, per-node style) is first-class file content; every write path modifying an existing board preserves it. Explicitly scoped to exclude `REQ_KAN_CREATE` (no prior content) |
| `REQ_KAN_UPDATE` | `US_KAN_TOOLS`; `REQ_KAN_SCHEMA` | modified | New AC-6 (comments survive verbatim; untouched lines not reformatted; diff confined to the changed field) and AC-7 (everything except serialization unchanged — CD criterion (c) made testable) |

### Level 2 — Design

| ID | Links to | Change | Rationale |
|---|---|---|---|
| `SPEC_KAN_UPDATE` | `REQ_KAN_UPDATE` | modified | Algorithm steps 2/4/5/6 restated in terms of a round-trip representation; new "Round-trip fidelity" section naming the mutation-site constraint as load-bearing; explicit scope statement that read-only paths are NOT to be migrated; note tying the rule to `REQ_KAN_SCHEMA` AC-9 and GH #47; new AC-6/AC-7 |

### Decisions

**Decision 1 — normative text states the required property; the `yaml`
`Document` API is named as the established means, not mandated.**
Per the CR instruction not to prescribe implementation. The choice of accessor
methods (`setIn`/`getIn` vs. navigating nodes directly) is left to Dev — the CD
above suggests them, the spec does not require them. The *mutation site*
constraint is however stated normatively, because it determines whether the ACs
can be met at all; it is a design property, not an implementation preference.

**Decision 2 — read-only paths explicitly excluded from migration.**
Without this, "the kanban package must use the `Document` API" is a natural
over-generalisation, and the renderer, custom editor, and verify tool would be
refactored for no benefit and some risk. `SPEC_KAN_UPDATE` states that
round-trip parsing is required only where a load → modify → save cycle exists.

**Decision 3 — the requirement is placed on the file (`REQ_KAN_SCHEMA` AC-9),
not solely on the tool.** Rationale above. This is a deliberate widening of the
CR's suggested placement. The behaviour delivered by *this* CR is unchanged by
it, but the rule now binds GH #47 when it lands.

**Decision 4 — `US_KAN_BOARD` AC-6 added although the CR named no user story.**
An earlier CR drew a QM finding for a requirement AC with no motivating
user-story AC. Comment preservation is user-visible and user-motivated, so the
WHY level is where it starts.

**Not in scope.** No change to `SPEC_KAN_CREATE`, `SPEC_KAN_RENDERER`,
`SPEC_KAN_VERIFY`, `SPEC_KAN_FILEOPEN`, or the JSON schema
(`schemas/kanban.schema.json`) — comments are a YAML-level concern the JSON
schema neither describes nor can constrain.

## QM Findings

### Round 1 (2026-07-27)

**Verdict: CLEAR**

`git log develop..HEAD` — 4 commits, exactly matching CM's disclosed list.
One of the four (`64d2b56`) is a Change Manager memory-only lesson commit
(`.jarvis/actors/Change Manager/lessons-learned.md`, 5 lines) — confirmed via
`git show --stat`, out of functional scope, correctly disclosed anyway. First
review of this CR.

**Code — verified sound, and avoids the exact trap the CD warned about.**
Read the full `jarvis_updateKanbanItem` handler in `packages/kanban/src/
extension.ts`. `doc = yaml.parseDocument(rawContent)` for the round-trip
representation; `data = doc.toJSON()` is used *only* for read-only lookup
(item find by `id`) and status-option validation — not re-mutated. The
actual mutation happens on `itemNode.set(key, value)` where `itemNode` comes
from `doc.get('items')` → `itemsSeq.get(itemIndex)`, i.e. on the Document's
own node tree, never on the plain `data` object. This is precisely the
distinction the CD's "load-bearing design constraint" section demanded —
confirmed the implementation did not fall into the `toJS()`-mutate-restringify
trap the CD explicitly called out as a plausible near-miss. `id` is skipped
in the mutation loop (immutable guard). Serialization via `doc.toString()`.
Return value is `{ path, updated: true, itemId }` — checked this against
`REQ_KAN_UPDATE` AC-4, which already specified this exact shape *before* this
CR (confirmed via `git log -p` on `req_kan.rst`) — the code was previously out
of step with its own already-correct spec; this CR brings it back in line,
it did not change the spec's contract. Grepped for other consumers of the
tool's return shape (webview, panel, other extension code) — none found;
the shape is only consumed by the invoking LM agent, so the change is safe.

**Specs — verified sound and precisely traced.** `US_KAN_BOARD` AC-6,
`REQ_KAN_SCHEMA` AC-9, `REQ_KAN_UPDATE` AC-6/AC-7, and `SPEC_KAN_UPDATE`'s
restated algorithm + new "Round-trip fidelity" section all read in full —
wording is precise, the WHY→WHAT→HOW chain is genuinely connected (US_KAN_BOARD
AC-6 motivates REQ_KAN_SCHEMA AC-9, which REQ_KAN_UPDATE AC-6 makes concrete,
which SPEC_KAN_UPDATE's steps 2/4/5/6 implement exactly as code does it). The
CD's framing decision — placing the normative property on `REQ_KAN_SCHEMA`
(the file) rather than solely on `REQ_KAN_UPDATE` (the tool) so it binds the
GH #47 write-back path in advance — is sound and well-reasoned; explicitly
scoping out `REQ_KAN_CREATE` avoids over-generalizing to a case with no prior
content to preserve.

**Tests — a real improvement over the last two CRs' methodology.**
`kanban-comment-preservation.test.ts` read in full. TC-1 is the same
source-text pattern matching noted as a recurring concern in CR #52/#54, but
TC-2 and TC-3 are genuine functional tests: they exercise the actual `yaml`
library's `parseDocument`/`item.set`/`doc.toString()` round trip against
realistic board YAML (comments, inline comments, flow-style-adjacent
structures) and assert on real output — comments present, key order
preserved, diff confined to exactly one line. Combined with TC-1 confirming
the production code calls the same APIs the same way, this is meaningfully
stronger evidence than pure text-matching alone. No methodology finding this
round.

**Non-blocking — recurring: no UAT scenario for this fix (3rd CR in a row).**
`spec_uat_kanban.rst` has no scenario referencing comment/formatting
preservation, GH #53, or round-trip fidelity. This is the third consecutive
CR (#52, #54, now #53) shipping a real, user-visible bug fix with zero manual-
verification coverage, in each case despite an existing, actively-maintained
UAT file for the same feature area. Flagging for a decision as before (same
non-blocking handling as CR #44/#52/#54), but now explicitly noting the
pattern — three in a row is no longer a one-off, and may be worth a standing
policy decision (e.g. "bug-fix CRs require at least one UAT scenario for the
regression's specific trigger condition") rather than a per-CR judgment call.

**Build/tests:** Full `compile all` (all packages) — clean. Independently
re-ran `npx vitest run` — 298/298 passed, 29/29 files (matches CM's claim).

**Overall**: CLEAR. Code and spec changes are correct, complete, mutually
consistent, and the implementation demonstrably avoided the specific failure
mode the CD warned about. Git log fully disclosed including an out-of-scope
memory commit. One non-blocking, now-recurring item flagged for PM: no UAT
coverage for the fixed behavior, three CRs running. Sent to PM only.

