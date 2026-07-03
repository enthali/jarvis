# Change Document: message-api-rename

**Status**: draft
**Branch**: feature/message-api-rename (not yet created)
**Created**: 2026-07-03
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Combines two previously-separate efforts into one CR, per PM/user decision 2026-07-03 ("better now and hard than later and soft" — one adoption pass instead of two):

1. **GH Issue #12** ("API rename Phase 1"): introduce canonical `jarvis_sendMessage` and `jarvis_receiveMessage` tools, replacing `jarvis_sendToSession` and `jarvis_readMessage`. Old names stay registered but deprecated (return a deprecation warning in the response).
2. **senderSession fix** (originally scoped as a standalone CR `sendtosession-required-sender`, now superseded by this one): the **new** `jarvis_sendMessage` tool requires `senderSession` and validates it against `getValidDestinations()` — no silent fallback.

**Root cause of the senderSession fix:** `jarvis_sendToSession` currently falls back to `activeTab?.label` when `senderSession` is omitted, producing incorrect sender attribution whenever the active tab isn't the sending agent's own file (e.g. after Focus-Snapshot/Restore in `editor-group-placement`). Observed live in `.jarvis/message-log.json` with `sender: "message-log.json"`, `sender: "syspilot.mece.agent.md"`, `sender: "Keyboard Shortcuts"`, etc.

**Key design decision:** the OLD tools (`jarvis_sendToSession`, `jarvis_readMessage`) are **not** fixed — they keep their current (buggy) behavior unchanged, since they're already scheduled for removal in GH Issue #13 (Phase 2, earliest 2026-09-30). All correctness work goes into the NEW tools instead. This avoids fixing code that's about to be deleted.

**Changes:**

1. **New tool `jarvis_sendMessage`** (LM + MCP): same behavior as `jarvis_sendToSession`'s `destination`/`text` handling, but `senderSession` is a **required** field (not optional), validated against `getValidDestinations(scanner)` — same function already used for `destination`.
   - Error on missing/empty: `senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.`
   - Error on invalid: `Sender session "${senderSession}" does not exist. Valid senders: ${sorted comma-separated list | "(none)"}`
2. **New tool `jarvis_receiveMessage`**: identical behavior to today's `jarvis_readMessage` (renamed only, no functional change).
3. **Deprecate `jarvis_sendToSession` / `jarvis_readMessage`**: keep registered and fully functional (unchanged behavior, including the active-tab fallback bug), but add a deprecation warning (via `modelDescription` + a warning field in the tool's response) pointing callers to the new names.
4. **Notification template default** (`jarvis.messages.notificationTemplate` in `.vscode/settings.json`): update to reference `jarvis_receiveMessage`.
5. **All `.github/agents/*.agent.md` files**: adoption pass — update every `jarvis_sendToSession`/`jarvis_readMessage` reference to `jarvis_sendMessage`/`jarvis_receiveMessage`, always passing explicit `senderSession`.
6. **All session `context.md` files** referencing the old tool names: update to new names.
7. **`syspilot.orchestration-jarvis/SKILL.md`** (SEND/RECEIVE sections): rewrite to document the new canonical names, `senderSession` required, and the deprecation of the old names.

**Not in scope:**
- GH Issue #13 (Phase 2 — full removal of `jarvis_sendToSession`/`jarvis_readMessage`) — separate future CR, unchanged timeline (earliest 2026-09-30).
- Changes to destination validation logic (already exists, reused as-is for sender validation).
- Changes to the poll loop or Reminder delivery (those use `appendMessage` directly, not `jarvis_sendToSession`/`jarvis_sendMessage`).

**Positive side-effect:** after this CR, the Message Flow Diagram (`jarvis-flow`) will show correct, trustworthy sender attribution in `.jarvis/message-log.json` for all agents using the new API.

**Supersedes:** the standalone draft `docs/changes/sendtosession-required-sender.md` (commit `4c8d422`) — do not dispatch that one, it's obsolete. Its error-message wording and validation approach are carried forward into this CD.

**Related GH Issues:** [#12](https://github.com/enthali/jarvis/issues/12) (this CR implements Phase 1, with the senderSession fix folded in), [#13](https://github.com/enthali/jarvis/issues/13) (Phase 2, separate future CR).

---

## Level 0: User Stories

**Status**: ✅ complete

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_SAFE_SEND | Safe Send-to-Session (Destination Validation) | modified | reworded to be tool-name-neutral (`jarvis_sendToSession` / `jarvis_sendMessage`) since destination validation now applies to both the deprecated and canonical tool; ACs unchanged in substance |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_SENDER_REQUIRED | Trustworthy Sender Attribution (Sender Validation) | mandatory |

### Decisions

- No new Level 0 story needed for the canonical rename itself (`jarvis_sendMessage`/`jarvis_receiveMessage` naming) — it is an implementation-level consequence of `US_MSG_SENDER_REQUIRED` (send side) and the pre-existing `US_MSG_CHATQUEUE` (receive side, unchanged user need — "pull-based inbox consumption", just via a renamed tool). Introducing a separate US purely for a name change would be a MECE violation (no distinct user need).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — `US_MSG_SENDER_REQUIRED` fills the gap that `US_MSG_SAFE_SEND` only ever covered the *destination* side, never the *sender* side

---

## Level 1: Requirements

**Status**: ✅ complete

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_SENDTOSESSION | US_MSG_SAFE_SEND | modified | `:status: deprecated`; new AC-8 (deprecation warning in response + modelDescription); AC-1..AC-7b unchanged (frozen, including the active-tab fallback bug) |
| REQ_MSG_READ | US_MSG_CHATQUEUE | modified | `:status: deprecated`; new AC-7 (deprecation warning); AC-1..AC-6 unchanged |
| REQ_MSG_SEND | US_MSG_CHATQUEUE | modified | AC-3 updated to reference `jarvis_receiveMessage` instead of `jarvis_readMessage` in the notification-stub wording |
| REQ_MSG_NOTIFICATION_TEMPLATE | US_MSG_NOTIFICATION_TEMPLATE | modified | new AC-7: built-in default text now references `jarvis_receiveMessage`; user-customized templates unaffected |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_SENDMESSAGE | Send Message LM / MCP Tool (Canonical) | US_MSG_SAFE_SEND; US_MSG_SENDER_REQUIRED; REQ_MSG_QUEUE; REQ_MSG_SESSIONLOOKUP; REQ_MSG_SESSIONFILTER | mandatory |
| REQ_MSG_RECEIVEMESSAGE | Receive Message LM / MCP Tool (Canonical) | US_MSG_CHATQUEUE; REQ_MSG_QUEUE | mandatory |
| REQ_MSG_SENDER_ERROR | Sender Validation Error Contract | US_MSG_SENDER_REQUIRED; REQ_MSG_SENDMESSAGE; REQ_MSG_SESSIONFILTER | mandatory |

### Conflicts Detected

- None. `REQ_MSG_SENDMESSAGE` deliberately reuses `REQ_MSG_DEST_ERROR` (destination-side error contract, unchanged) rather than duplicating it — only the sender side needed a new contract (`REQ_MSG_SENDER_ERROR`).

### Decisions

- `REQ_MSG_DEST_ERROR` itself is **not modified** — its contract (error format for invalid destinations) is unchanged and reused as-is by `REQ_MSG_SENDMESSAGE`, exactly as the CD Appendix anticipated ("Changes to destination validation logic ... reused as-is for sender validation").
- Validation order for `jarvis_sendMessage` (destination checked before sender) is specified explicitly in `REQ_MSG_SENDMESSAGE` AC-8 to remove ambiguity for a request that fails both checks simultaneously.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — `REQ_MSG_SENDER_ERROR` mirrors but does not duplicate `REQ_MSG_DEST_ERROR` (distinct field, distinct message templates)
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ complete

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDTOSESSION | REQ_MSG_SENDTOSESSION | modified | `:status: deprecated`; new Design-notes bullet describing the `modelDescription` prefix + response `warning` field; existing handler code samples left untouched (frozen behaviour) |
| SPEC_MSG_READMESSAGE | REQ_MSG_READ | modified | `:status: deprecated`; matching Design-notes bullet for the `modelDescription` prefix + response `warning` field |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_SENDMESSAGE | Send Message LM / MCP Tool (Canonical) | REQ_MSG_SENDMESSAGE; REQ_MSG_DEST_ERROR; REQ_MSG_SENDER_ERROR; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_QUEUESTORE |
| SPEC_MSG_RECEIVEMESSAGE | Receive Message LM / MCP Tool (Canonical) | REQ_MSG_RECEIVEMESSAGE; SPEC_MSG_QUEUESTORE; SPEC_MSG_SESSIONLOOKUP |

### Conflicts Detected

- **Architecture correction vs. CD Appendix:** the Appendix assumed a `registerDualTool()` pattern (separate LM + MCP handlers, static Zod schema) per the *existing* `SPEC_MSG_SENDTOSESSION`/`SPEC_MSG_DUALREGISTRATION` text. Verified against the actual current implementation (`packages/core/src/extension.ts`, `packages/mcp/src/extension.ts`): tools are registered once via `engine.registerTool()` (LM-only call site) and MCP exposure is derived **automatically and dynamically** at runtime by `packages/mcp`'s `buildToolDescriptors()`, which reads the tool's `package.json` `inputSchema` and forwards calls through `JarvisCoreApi.invokeTool()`. There is no static Zod schema per tool and no separate MCP handler to author. `SPEC_MSG_SENDMESSAGE`/`SPEC_MSG_RECEIVEMESSAGE` are written to match this real architecture, not the outdated `registerDualTool` pattern. `SPEC_MSG_SENDTOSESSION`/`SPEC_MSG_READMESSAGE`/`SPEC_MSG_DUALREGISTRATION` themselves still describe the outdated pattern — this is **pre-existing drift outside this CR's scope** (flagged below under Issues Found, not fixed here).

### Decisions

- No change needed in `packages/mcp` (no static schema file to add) — the CD Appendix's "MCP schema (Zod) in packages/mcp" impact hint does not apply under the current architecture; noted directly in `SPEC_MSG_SENDMESSAGE`'s Design notes so Dev Engineer doesn't go looking for a non-existent integration point.
- Both new tools are declared in `package.json` `contributes.languageModelTools` (code samples embedded in the specs); that satisfies the CD's package.json adoption-pass item at the design level — Dev Engineer applies it.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ complete

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_SENDER_REQUIRED | REQ_MSG_SENDMESSAGE; REQ_MSG_SENDER_ERROR | SPEC_MSG_SENDMESSAGE | ✅ |
| US_MSG_SAFE_SEND (amended) | REQ_MSG_SENDTOSESSION (deprecated); REQ_MSG_SENDMESSAGE | SPEC_MSG_SENDTOSESSION (deprecated); SPEC_MSG_SENDMESSAGE | ✅ |
| US_MSG_CHATQUEUE (existing, unchanged) | REQ_MSG_READ (deprecated); REQ_MSG_RECEIVEMESSAGE | SPEC_MSG_READMESSAGE (deprecated); SPEC_MSG_RECEIVEMESSAGE | ✅ |

All four new elements (`US_MSG_SENDER_REQUIRED`, `REQ_MSG_SENDMESSAGE`, `REQ_MSG_RECEIVEMESSAGE`, `REQ_MSG_SENDER_ERROR`, `SPEC_MSG_SENDMESSAGE`, `SPEC_MSG_RECEIVEMESSAGE`) spot-checked via `get_need_links.py --direction both` — no dangling links in either direction.

### Artefakt-Removal-Check

_Not applicable — old tools stay registered (deprecated), nothing removed in this CR. Removal is GH Issue #13, a separate future CR._

### Issues Found

- `SPEC_MSG_SENDTOSESSION`, `SPEC_MSG_READMESSAGE`, and `SPEC_MSG_DUALREGISTRATION` describe a `registerDualTool()` two-handler-plus-Zod-schema pattern that **no longer matches** the actual `packages/core`/`packages/mcp` implementation (single `engine.registerTool()` handler + dynamic MCP schema derivation). This is pre-existing drift, unrelated to this CR's own correctness (the new specs were written against the real code), but it should be cleaned up in a future CR for accuracy. Not blocking — flagging for QM/PM awareness.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## UAT Generation (Test Designer, 2026-07-03)

Extended the existing `US_UAT_MSG` chain (`us_uat_msgqueue.rst` /
`req_uat_msgqueue.rst` / `spec_uat_msgqueue.rst`) rather than creating a new
UAT chain — this chain already covered `jarvis_readMessage`/
`jarvis_sendToSession` acceptance testing (T-1..T-6), making it the natural
home for the canonical-rename and sender-validation coverage.

**New/changed elements:**
- `US_UAT_MSG`: new AC-4..AC-8; new link to `US_MSG_SENDER_REQUIRED`; new
  test scenarios T-7..T-13
- `REQ_UAT_MSG_TESTDATA`: new AC-3; new links to `REQ_MSG_SENDMESSAGE`,
  `REQ_MSG_RECEIVEMESSAGE`, `REQ_MSG_SENDER_ERROR`
- `SPEC_UAT_MSG_FILES`: expected-outcomes table extended with T-7..T-13 rows

**Coverage added:**
- T-7: `jarvis_sendMessage` success path — correct `sender` attribution in
  `message-log.json`
- T-8/T-9: `jarvis_sendMessage` sender validation errors (missing/invalid),
  exact error text asserted per `REQ_MSG_SENDER_ERROR`
- T-10: `jarvis_receiveMessage` behavioral parity with `jarvis_readMessage`
- T-11/T-12: deprecated `jarvis_sendToSession`/`jarvis_readMessage` remain
  functional and return a deprecation warning
- T-13: `jarvis_sendToSession`'s active-tab sender-fallback bug is
  deliberately unchanged (regression guard against accidentally "fixing"
  the frozen deprecated tool)

No new test-data files were needed — all scenarios reuse existing
YAML/session-name test fixtures already established by `US_UAT_MSG`/
`US_UAT_SAFE_SEND_UNION`.

**Verification:** `sphinx-build -b html docs docs/_build/html -W --keep-going -E`
— 0 warnings. `get_need_links.py --direction both` spot-checked on
`US_UAT_MSG`, `REQ_UAT_MSG_TESTDATA`, `SPEC_UAT_MSG_FILES` — no dangling
links.

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-03

#### Verification Summary

**CLEAR** — Zero findings. All six verification dimensions passed:

1. **Traceability** (9 elements verified bidirectional via `get_need_links.py --direction both`):
   - US_MSG_SENDER_REQUIRED, REQ_MSG_SENDMESSAGE, REQ_MSG_RECEIVEMESSAGE, REQ_MSG_SENDER_ERROR, SPEC_MSG_SENDMESSAGE, SPEC_MSG_RECEIVEMESSAGE (new primary elements)
   - US_UAT_MSG, REQ_UAT_MSG_TESTDATA, SPEC_UAT_MSG_FILES (UAT chain extensions)
   - Result: 0 dangling references across all elements

2. **Code-vs-Spec** (implementation verified against all REQ/SPEC acceptance criteria):
   - New tools: `jarvis_sendMessage` (packages/core/src/extension.ts:789) correctly implements senderSession required parameter with validation against `getValidDestinations()`, exact error messages per REQ_MSG_SENDER_ERROR AC-1/AC-2
   - New tools: `jarvis_receiveMessage` (packages/core/src/extension.ts:847) correctly implements identical behavior to deprecated `jarvis_readMessage` (rename only, no deprecation warning in response)
   - Deprecated tools: `jarvis_sendToSession` (line 764) and `jarvis_readMessage` (line 830) both include deprecation warnings in response JSON and modelDescription per REQ_MSG_SENDTOSESSION AC-8 / REQ_MSG_READ AC-7
   - package.json contributions: All four tools registered in `languageModelTools` array with correct modelDescription deprecation markers and inputSchema (senderSession required for jarvis_sendMessage)
   - Default notification template: Updated to reference `jarvis_receiveMessage` (packages/core/src/extension.ts:1190)
   - Adoption pass verified: .github/agents/*.agent.md files (syspilot.design, syspilot.installer, syspilot.qm, syspilot.setup) all include both new canonical tools (sendMessage, receiveMessage) and deprecated aliases (sendToSession, readMessage) in allowed_tools arrays for backward compatibility
   - Adoption pass verified: .github/skills/syspilot.orchestration-jarvis/SKILL.md updated with SEND/RECEIVE/RESPOND examples using new tools, senderSession emphasized as required, deprecation notes for old tools
   - Adoption pass verified: Session context.md files (.jarvis/sessions/{Dev Engineer, Change Manager, Project Manager}/context.md) updated to reference new canonical tool names
   - Documentation: README.md updated to reference `#sendMessage`/`#receiveMessage` with deprecation note for old aliases

3. **Build** (full 5-package TypeScript suite):
   - `npx tsc -p packages/core && npx tsc -p packages/pim && npx tsc -p packages/recorder && npx tsc -p packages/mcp && npx tsc -p packages/flow`
   - Result: 0 errors (silent output = clean build)

4. **Tests** (vitest):
   - `npx vitest run`
   - Result: 222/222 tests passed (23 test files), 0 failures

5. **Sphinx**:
   - `python -m sphinx -b html docs docs/_build/html -W --keep-going`
   - Result: "build succeeded" with 0 warnings

6. **UAT Coverage** (US_UAT_MSG extended with T-7..T-13 per CD UAT Generation section):
   - T-7: jarvis_sendMessage success path with valid senderSession → sender field verification in message-log.json
   - T-8: jarvis_sendMessage missing senderSession → exact error text per REQ_MSG_SENDER_ERROR AC-1
   - T-9: jarvis_sendMessage invalid senderSession → exact error text per REQ_MSG_SENDER_ERROR AC-2
   - T-10: jarvis_receiveMessage behavioral parity with jarvis_readMessage (no deprecation warning)
   - T-11: jarvis_sendToSession deprecation warning present in response
   - T-12: jarvis_readMessage deprecation warning present in response  
   - T-13: jarvis_sendToSession active-tab fallback bug preserved (regression guard)
   - All test scenarios present in docs/userstories/us_uat_msgqueue.rst with correct acceptance criteria linkage to US_MSG_SENDER_REQUIRED

**Known pre-existing issues acknowledged (non-blocking, flagged in CD):**
- SPEC_MSG_SENDTOSESSION/SPEC_MSG_READMESSAGE/SPEC_MSG_DUALREGISTRATION describe outdated `registerDualTool()` pattern; actual implementation uses single `engine.registerTool()` + dynamic MCP schema derivation (pre-existing drift, unrelated to this CR's correctness)

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix

**Impact scope (for System Designer's impact analysis):**
- `SPEC_MSG_SENDTOSESSION` (existing — mark deprecated) / new `SPEC_MSG_SENDMESSAGE`, `SPEC_MSG_RECEIVEMESSAGE`
- Whatever existing REQ/SPEC currently documents `jarvis_readMessage` (find via impact analysis — mark deprecated)
- `REQ_MSG_DEST_ERROR` — likely a new companion `REQ_MSG_SENDER_ERROR` for the sender validation error format
- All `.github/agents/*.agent.md` files (adoption pass)
- All session `context.md` files referencing old tool names (adoption pass)
- `syspilot.orchestration-jarvis/SKILL.md` (SEND/RECEIVE sections — full rewrite to new names)
- `jarvis.messages.notificationTemplate` in `.vscode/settings.json` (update default to `jarvis_receiveMessage`)
- `package.json` `languageModelTools` contributions (both old-deprecated and new entries per GH #12's acceptance criteria)
- MCP schema (Zod) in `packages/mcp` — new `sendMessage`/`receiveMessage` tools, deprecation markers on old ones

**Error message spec (for System Designer) — for the NEW jarvis_sendMessage only:**
- Missing/empty: `senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.`
- Invalid: `Sender session "${senderSession}" does not exist. Valid senders: ${sorted comma-separated list | "(none)"}`

**Deprecation warning spec (for System Designer) — for the OLD jarvis_sendToSession/jarvis_readMessage:**
- `modelDescription` updated to state deprecation + point to new tool name
- Response includes a deprecation warning (exact field/format is System Designer's call, follow GH #12's acceptance criteria: "Old tools still work but return deprecation warning in response")

---

*Pre-staged by PM (2026-07-03). Combines GH Issue #12 (API rename Phase 1) with the senderSession-required fix (originally a standalone CR, folded in per user decision — "better now and hard than later and soft"). Dispatch: autonomous mode, run full pipeline without PM checkpoints. Phase 2 (GH Issue #13) remains separate, earliest 2026-09-30.*
