# Change Document: validate-session-destination

**Status:** completed
**Mode:** autonomous
**Branch:** `feature/validate-session-destination` (merged + deleted)
**Source:** PM Change Request (2026-05-21)
**Change Manager:** Jarvis CM session
**Base commit (develop):** `aff58bc`
**Merge approval:** PM 2026-05-21 — review-only (no UAT executed; MECE PASS + QM PASS deemed sufficient)

---

## CR Intent (from PM)

When the `jarvis_sendToSession` LM/MCP tool is invoked with an unknown
destination session name, the call must fail with a clear error that includes
the list of currently valid session names. The message must **not** be written
to a queue in that case. Valid destinations behave as before.

### User-visible Acceptance Criteria

1. Calling `jarvis_sendToSession` with a non-existent `session` value: tool
   call ends in error (not success, not silent).
2. Error text contains:
   - notice that the destination session does not exist (with the supplied name)
   - list of currently valid destination names (readable order)
3. With a valid `session` value: existing behavior unchanged (message lands in
   queue, auto-delivery works as before).
4. Definition of "valid" is at designer's discretion — system should behave the
   way a human would expect: sessions that one can sensibly send to today are
   valid.
5. No regression in existing workflows (sequential CR, auto-delivery, heartbeat
   queue steps).

### Out of Scope

- "Did-you-mean" fuzzy matching
- Changes to `jarvis_readMessage` or auto-delivery polling
- Changes to session yaml / session folder layout
- Changes to other LM/MCP tools

---

## Intent Gate

CR is intent-only — no implementation prescriptions. AC#4 explicitly defers
the definition of "valid destination" to the System Designer. Mode is
autonomous; no clarification needed. Proceed.

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/validate-session-destination` from `develop@aff58bc` |
| 1a. Change Document | done | CM | this file |
| 2. Impact + Design | done | syspilot.design | commit `11aed3f`; US_MSG_SAFE_SEND, REQ_MSG_SENDTOSESSION, REQ_MSG_DEST_ERROR, SPEC_MSG_SENDTOSESSION; valid set = `jarvis_listSessions` set (state.vscdb named chat tabs); sphinx -W clean |
| 3. UAT artifacts | done | syspilot.uat | commit `e8fd3a0`; `tst-validate-session-destination.md` with 6 cases (T-1..T-6); reported spec gaps are false-positives (SPEC_MSG_SENDTOSESSION is a full spec directive with pseudocode at spec_msg.rst line 1922) |
| 4. Implementation | done | syspilot.implement | commit `cd03e06`; src/extension.ts (+32 lines, both LM and MCP handler); `npm run compile` clean; no new lint violations; no unit-test infra (UAT covers branches); zero deviations from spec |
| 5. MECE final | done | syspilot.mece | verdict PASS-WITH-ADVISORIES (1 blocker, 4 advisories); F-2 (T-5 wrong expectation) fixed by CM directly per scope; F-1/F-3/F-4/F-5 to be addressed by Documentation Engineer; sphinx -W clean (CM verified) |
| 6. Documentation | done | syspilot.docu | commit `a59ad9a`; F-1 (DUALREGISTRATION example → forward-ref), F-3 (AC-7 split LM/MCP), F-4 (log line aligned), F-5 (4 items → :status: implemented); sphinx -W clean; copilot-instructions/README no change needed |
| 7. Notify | done | CM | PM + QM notified with Change Document path (2026-05-21) |
| 8. Merge approval | done | PM | **accepted** — review-only approval; UAT skipped (no new concepts, known code path); T-1..T-6 marked SKIPPED in test protocol |
| 9. Squash-merge | done | CM | see post-merge entry below |
| 10. Post-merge | done | CM | see post-merge entry below |

---

## Decisions

- **Valid destination set** = same as `jarvis_listSessions` returns (named VS Code
  chat tabs read from `state.vscdb` via `getAllSessions()` filtered by
  `filterNamedSessions()`). Rationale: `jarvis_sendToSession` targets live chat
  tabs by display title; `state.vscdb` is the authoritative source. Using
  `.jarvis/sessions/` folders would conflate workspace entities with live tabs.
- **Error format** (template):
  ```
  Destination session "${session}" does not exist.
  Valid destinations: ${names}
  ```
  where `${names}` = alphabetically sorted titles joined by `", "`, or `"(none)"`
  if empty.

---

## Engineer Reports

(filled in as engineers return)

### MECE Final (syspilot.mece — 2026-05-21)

**Verdict: PASS-WITH-ADVISORIES**

| # | Severity | Element(s) | Description |
|---|----------|-----------|-------------|
| F-1 | Advisory | ``SPEC_MSG_DUALREGISTRATION`` | Stale pre-validation ``jarvis_sendToSession`` example still present. ``SPEC_MSG_SENDTOSESSION`` supersedes it but the old block remains. Documentation step: replace example with a forward-reference to ``SPEC_MSG_SENDTOSESSION``. |
| F-2 | **Blocker (resolved by CM)** | ``tst-validate-session-destination.md`` T-5 invalid path | ``executeQueueStep`` in ``heartbeat.ts`` calls ``appendMessage`` directly — no destination validation. T-5 "invalid path" expected result said "job fails"; actual behavior: message silently written to queue. Expectation was unsupported by any REQ/SPEC. **CM fix:** T-5 rewritten to assert current behavior (silent queue write for invalid heartbeat destination, no validation in heartbeat scope). |
| F-3 | Advisory | ``REQ_MSG_SENDTOSESSION`` AC-7 | AC-7 only describes LM fallback (``activeTab?.label → ''unknown''``). MCP handler uses ``''mcp-client''`` — correct, covered in SPEC pseudocode, not in REQ. Documentation step: add AC-7b for MCP path. |
| F-4 | Advisory | ``SPEC_MSG_SENDTOSESSION`` pseudocode | Log message text differs from implementation (non-functional). Update SPEC or accept divergence. |
| F-5 | Advisory | US/REQ×2/SPEC new items | All carry ``:status: draft``. Documentation step: update to ``:status: implemented``. |

**Sphinx build:** ``build succeeded.`` (CM ran ``python -m sphinx -b html docs docs/_build/html -W --keep-going -E`` after F-2 fix).

**Spec/impl consistency:** error format, validation logic, MCP/LM handler structure, traceability chain US→REQ→SPEC all verified ✓.
