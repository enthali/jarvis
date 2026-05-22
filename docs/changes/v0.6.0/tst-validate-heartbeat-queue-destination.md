# Test Protocol: validate-heartbeat-queue-destination

**Change Document:** [validate-heartbeat-queue-destination.md](validate-heartbeat-queue-destination.md)
**Branch:** `feature/validate-heartbeat-queue-destination`
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from
   `feature/validate-heartbeat-queue-destination`.
3. Open workspace: `testdata/test.code-workspace`.
4. Create at least two named VS Code chat sessions:
   - Open a new chat tab (`Ctrl+Alt+I`) and `/rename` it to **"Project Manager"**
   - Open a second chat tab and `/rename` it to **"Research"**
   - Confirm both appear in `#listSessions` tool output.
5. Place the `heartbeat.yaml` file being tested in the heartbeat config path
   (`.jarvis/heartbeat/heartbeat.yaml` inside the workspace storage folder, or
   whichever path `resolveConfigPath()` resolves to in the test workspace).
   Use the YAML snippets specified per test case — back up the original file
   before each test that replaces it.
6. Confirm the Jarvis Output channel ("Jarvis") is visible in the Output panel
   (`View → Output → Jarvis`). Log entries are observed here.
7. Have a chat tab open for issuing `jarvis_registerJob` tool calls (T-7, T-8).
8. `messages.json` (message queue file) should be empty or absent before each
   fire-time test (T-5); delete if needed.

> **Per-test overrides** are noted in each test case's Preconditions row.

---

## Test Cases

### T-1 — Load-time: all valid `queue` destinations

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1, AC-3; `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-1 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION`; `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE` |

**Preconditions:**
- Both "Project Manager" and "Research" sessions are open and renamed (setup step 4).
- `heartbeat.yaml` contains one job with valid `queue` destinations only:

```yaml
jobs:
  - name: valid-queue-job
    schedule: manual
    steps:
      - type: queue
        destination: Project Manager
        text: Hello T-1a
      - type: queue
        destination: Research
        text: Hello T-1b
```

**Steps:**
1. With the Extension Development Host running, trigger a heartbeat reload
   (`jarvis.rescan` or restart the EDH with the above `heartbeat.yaml` in place).
2. Watch the VS Code notification area (top-right) for 10 seconds.
3. Open Output panel → "Jarvis" channel; scroll to the reload timestamp.

**Expected result:**
- No `showWarningMessage` notification appears mentioning `valid-queue-job` or any destination.
- The "Jarvis" Output channel shows NO `[Heartbeat] Invalid queue destination:` log line for `valid-queue-job`.
- Both jobs load and appear in the Heartbeat tree view.

**Pass criteria:** No warning, no invalid-destination log line, jobs visible in tree.
**Initial Status:** PENDING

---

### T-2 — Load-time: single invalid `queue` destination

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1, AC-2, AC-3 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` |

**Preconditions:**
- "Project Manager" and "Research" sessions are open (setup step 4).
- `heartbeat.yaml` contains one job with one invalid `queue` destination:

```yaml
jobs:
  - name: my-queue-job
    schedule: manual
    steps:
      - type: queue
        destination: NonExistentSession
        text: Should be warned
```

**Steps:**
1. Trigger heartbeat reload (restart EDH with the above `heartbeat.yaml`).
2. Observe the VS Code notification area immediately after load.
3. Open Output panel → "Jarvis" channel; locate the warn entry.
4. Confirm the job appears in the Heartbeat tree view despite the warning.

**Expected result:**
- A VS Code warning notification appears with the exact text:

  ```
  Jarvis: [Heartbeat] Invalid queue destination: job="my-queue-job" step=0 destination="NonExistentSession"
  ```

- The "Jarvis" Output channel contains a `warn`-level line with the same message:

  ```
  [Heartbeat] Invalid queue destination: job="my-queue-job" step=0 destination="NonExistentSession"
  ```

- `my-queue-job` still appears in the Heartbeat tree (job NOT removed or paused).

> **Manual UI check required:** Notification visibility requires the user to
> observe the VS Code notification area in real time (notifications auto-dismiss).

**Pass criteria:** Notification text matches exactly; log entry present; job remains in tree.
**Initial Status:** PENDING

---

### T-3 — Load-time: multiple invalid destinations in the same job

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1, AC-2, AC-3 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` |

**Preconditions:**
- "Project Manager" session is open; no session named "BadDest1" or "BadDest2" exists.
- `heartbeat.yaml`:

```yaml
jobs:
  - name: multi-invalid-job
    schedule: manual
    steps:
      - type: queue
        destination: BadDest1
        text: Step 0
      - type: queue
        destination: Project Manager
        text: Step 1 (valid)
      - type: queue
        destination: BadDest2
        text: Step 2
```

**Steps:**
1. Trigger heartbeat reload with the above `heartbeat.yaml`.
2. Observe notification area and "Jarvis" Output channel.

**Expected result:**
- Two separate warning notifications appear (one per invalid step):
  1. `Jarvis: [Heartbeat] Invalid queue destination: job="multi-invalid-job" step=0 destination="BadDest1"`
  2. `Jarvis: [Heartbeat] Invalid queue destination: job="multi-invalid-job" step=2 destination="BadDest2"`
- Two corresponding `warn` entries appear in the "Jarvis" Output channel.
- NO warning for step index 1 (`Project Manager`).
- Job still loaded in the Heartbeat tree.

> **Note:** Step index is 0-based per `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` pseudocode
> (`job.steps.forEach((step, idx) => ...)`).

> **Observability limitation:** If notifications appear in rapid succession,
> both may be visible simultaneously or one may dismiss before it is read;
> the Output channel log is the reliable verification source.

**Pass criteria:** Exactly 2 warn log entries (indices 0 and 2), none for index 1, job in tree.
**Initial Status:** PENDING

---

### T-4 — Load-time: invalid destinations across multiple jobs

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1, AC-2, AC-3 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` |

**Preconditions:**
- No session named "GhostSessionA" or "GhostSessionB" exists.
- `heartbeat.yaml`:

```yaml
jobs:
  - name: job-alpha
    schedule: manual
    steps:
      - type: queue
        destination: GhostSessionA
        text: From alpha
  - name: job-beta
    schedule: manual
    steps:
      - type: queue
        destination: GhostSessionB
        text: From beta
```

**Steps:**
1. Trigger heartbeat reload with the above `heartbeat.yaml`.
2. Check notification area and "Jarvis" Output channel.

**Expected result:**
- Two warning notifications, each naming a different job:
  1. `Jarvis: [Heartbeat] Invalid queue destination: job="job-alpha" step=0 destination="GhostSessionA"`
  2. `Jarvis: [Heartbeat] Invalid queue destination: job="job-beta" step=0 destination="GhostSessionB"`
- Both corresponding `warn` entries in "Jarvis" Output channel.
- Both jobs still appear in the Heartbeat tree.

**Pass criteria:** Each warn entry includes the correct job name; both jobs loaded.
**Initial Status:** PENDING

---

### T-5 — Fire-time: invalid `queue` step skipped; other steps continue

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` AC-1, AC-2, AC-3 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` |

**Preconditions:**
- "Project Manager" session is open; no session named "DeletedSession" exists.
- `messages.json` is empty or absent.
- `heartbeat.yaml` contains a multi-step job:

```yaml
jobs:
  - name: mixed-steps-job
    schedule: manual
    steps:
      - type: queue
        destination: DeletedSession
        text: Should be skipped
      - type: queue
        destination: Project Manager
        text: Should still land
```

**Steps:**
1. Trigger heartbeat reload; note the load-time warning for `DeletedSession` (expected per T-2
   behavior — not the focus here).
2. Execute the job manually via `jarvis.executeHeartbeatJob` (or the "Run" action on
   `mixed-steps-job` in the Heartbeat tree).
3. Open `messages.json` (workspace storage → `.jarvis/heartbeat/../messages/messages.json`)
   and inspect its contents.
4. Open Output panel → "Jarvis" channel; inspect log entries near the job execution time.

**Expected result:**
- `messages.json` contains **one** new entry: `destination="Project Manager"`, `text="Should still land"`.
- `messages.json` does **not** contain any entry with `destination="DeletedSession"`.
- The "Jarvis" Output channel contains a `warn` entry with the text:

  ```
  [Heartbeat] queue step skipped — invalid destination: "DeletedSession"
  ```

- The channel also contains an `info` entry confirming the valid step was written:

  ```
  [Heartbeat] queue: destination="Project Manager" sender="heartbeat" text="Should still land"
  ```

- The job execution result does NOT show a failure (job status shows success or neutral).

> **Observability limitation:** The internal `ExecResult.success` field is not
> directly visible in the UI; the absence of a failure notification and the
> presence of the valid-step message in `messages.json` serve as indirect evidence.

**Pass criteria:** Skip log entry present; valid step message in `messages.json`; no failure notification.
**Initial Status:** PENDING

---

### T-6 — Resolver reuse: `/rename`d session valid as `queue` destination

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-1, AC-2, AC-3; `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`; `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` |

**Preconditions:**
- A VS Code chat session has been opened and `/rename`d to **"Weekly Review"**
  (this creates a state.vscdb entry; it is a "manual" named session in Jarvis terminology).
- No session named "Weekly Review" was open before the rename.
- `heartbeat.yaml`:

```yaml
jobs:
  - name: manual-session-job
    schedule: manual
    steps:
      - type: queue
        destination: Weekly Review
        text: Targeting manual session
```

**Steps:**
1. Trigger heartbeat reload.
2. Observe notification area and "Jarvis" Output channel for 10 seconds.
3. Verify the job appears in the Heartbeat tree.

**Expected result:**
- No warning notification for `manual-session-job` / `Weekly Review`.
- No `[Heartbeat] Invalid queue destination:` log entry for `manual-session-job`.
- Job appears in the Heartbeat tree (loaded normally).

**Rationale:** `getAllSessions()` + `filterNamedSessions()` includes any chat session
with a non-empty, non-"New Chat" title registered in `state.vscdb` — including sessions
created via `/rename`. This is the same resolver used by `jarvis_sendToSession`
(`SPEC_AUT_HEARTBEAT_RESOLVER_REUSE`).

**Pass criteria:** No warning, no warn log, job loaded.
**Initial Status:** PENDING

---

### T-7 — `jarvis_registerJob` with invalid `queue` destination

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_REGISTERJOB_VALIDATION` AC-1, AC-2 |
| **Linked SPEC** | `SPEC_AUT_REGISTERJOB_VALIDATION` |

**Preconditions:**
- "Project Manager" session is open; no session named "Phantom" exists.
- Note the current contents of `heartbeat.yaml` (baseline job count).

**Steps:**
1. In a chat tab, call the `jarvis_registerJob` tool with a job definition
   containing a `queue` step with destination `"Phantom"`:

   ```json
   {
     "name": "phantom-job",
     "schedule": "manual",
     "steps": [
       { "type": "queue", "destination": "Phantom", "text": "Should not register" }
     ]
   }
   ```

2. Observe the tool call response.
3. Open `heartbeat.yaml` and verify its contents.

**Expected result:**
- The tool call **returns an error** (not success). The error message matches the
  `REQ_MSG_DEST_ERROR` template exactly:

  ```
  Destination session "Phantom" does not exist.
  Valid destinations: Project Manager, Research
  ```

  (Valid destinations are alphabetically sorted; comma-separated. Replace with
  the actual sorted list of currently open named sessions.)

- `heartbeat.yaml` does **not** contain a job named `phantom-job`.
- The job count in `heartbeat.yaml` is unchanged from the baseline.

> **Error format note:** `SPEC_AUT_REGISTERJOB_VALIDATION` stops at the first
> invalid destination encountered — subsequent steps are not checked.

**Pass criteria:** Error returned with correct format; `heartbeat.yaml` unchanged.
**Initial Status:** PENDING

---

### T-8 — `jarvis_registerJob` with all valid `queue` destinations (no regression)

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_REGISTERJOB_VALIDATION` AC-3; `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-2 |
| **Linked SPEC** | `SPEC_AUT_REGISTERJOB_VALIDATION` |

**Preconditions:**
- "Project Manager" and "Research" sessions are open (setup step 4).
- Note the current job count in `heartbeat.yaml`.

**Steps:**
1. Call `jarvis_registerJob` with all valid destinations:

   ```json
   {
     "name": "valid-register-job",
     "schedule": "manual",
     "steps": [
       { "type": "queue", "destination": "Project Manager", "text": "T-8 message" }
     ]
   }
   ```

2. Observe the tool call response.
3. Open `heartbeat.yaml` and verify the new job is present.
4. Confirm the job appears in the Heartbeat tree after a reload.

**Expected result:**
- Tool call returns success (no error).
- `heartbeat.yaml` now contains the job `valid-register-job` with the exact steps supplied.
- Job count in `heartbeat.yaml` is baseline + 1.
- No warning notification or log entry relating to destination validation for this job.

**Pass criteria:** Tool succeeds; job persisted in `heartbeat.yaml`; no spurious warnings.
**Initial Status:** PENDING

---

### T-9 — Regression: existing valid `heartbeat.yaml` behavior unchanged

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-1, AC-3 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION`; `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` |

**Preconditions:**
- Use the reference `testdata/heartbeat/heartbeat.yaml` as the active
  `heartbeat.yaml` (copy it to the config path). This file contains a mix of
  `powershell`, `command`, `python`, and `agent` steps, plus one `queue` step
  (`t8-queue-message`) targeting `"Test Session"`.
- Open a chat session and `/rename` it to **"Test Session"** so the existing
  `t8-queue-message` job has a valid destination.

**Steps:**
1. Trigger heartbeat reload.
2. Check notification area and "Jarvis" Output channel — observe for 15 seconds.
3. Manually execute `t8-queue-message` via the Heartbeat tree "Run" action.
4. Verify `messages.json` receives the message.
5. Manually execute `t1-cron-sentinel` (powershell step) — observe success.

**Expected result:**
- No destination-validation warning for any existing job in `testdata/heartbeat/heartbeat.yaml`
  (assuming "Test Session" exists per setup).
- `t8-queue-message` execution writes one entry to `messages.json` with
  `destination="Test Session"` and `text="Hello from heartbeat queue step"` — same
  behavior as before this CR.
- `t1-cron-sentinel` (powershell step) executes normally — no additional delay or
  observable change from the added import in `heartbeat.ts`.
- All non-queue steps are unaffected.

> **Observability limitation:** `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-3
> (no additional round-trip delays for non-queue steps) cannot be verified by
> stopwatch under manual testing conditions; absence of visible failures is
> the accepted verification method.

**Pass criteria:** No spurious warnings; `t8-queue-message` produces expected `messages.json` entry; non-queue steps unaffected.
**Initial Status:** PENDING

---

### T-10 — Edge case: `queue` step with empty or missing `destination`

| Field | Value |
|-------|-------|
| **Linked REQ** | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1; `REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` AC-1 |
| **Linked SPEC** | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION`; `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` |

**Preconditions:**
- `heartbeat.yaml` contains a job with a `queue` step that has no `destination` field (or an
  explicit empty string):

```yaml
jobs:
  - name: empty-dest-job
    schedule: manual
    steps:
      - type: queue
        destination: ""
        text: Missing destination
```

**Steps:**
1. Trigger heartbeat reload.
2. Observe notification area and "Jarvis" Output channel.
3. Execute `empty-dest-job` manually.
4. Observe execution log and `messages.json`.

**Expected result (per SPEC pseudocode):**
- **Load time:** No warning notification and no warn log entry for `empty-dest-job`.
  The SPEC guard `if (step.type === 'queue' && step.destination)` is falsy for an
  empty string — the empty-destination step bypasses load-time validation silently.
- **Fire time:** Similarly, `if (step.destination && !validNames.includes(...))` is
  falsy for empty string — the step is NOT skipped by the new guard; it falls
  through to `appendMessage(queuePath, step.destination!, ...)` with an empty string.
  Behavior depends on how `appendMessage` handles an empty destination:
  - If it writes a message with `destination=""` to `messages.json`, this is the current
    preservation behavior.
  - If it throws, the catch block returns `{ success: false }` for the step.

> **Advisory:** The empty-destination case is a current-state preservation test.
> The SPEC explicitly uses truthy guards (`step.destination`) to skip falsy values —
> meaning empty/missing destinations are intentionally left to downstream behavior
> rather than caught by the new validation.  If the PM wants empty destinations to be
> treated as invalid and warned, a follow-up CR is required.

> **Observability limitation:** The behavior may differ based on how `appendMessage`
> handles an empty string. Tester should inspect `messages.json` for a record with
> empty `destination` and report what was observed.

**Pass criteria:** No load-time warning for empty destination (matching SPEC truthy guard);
fire-time behavior documented/observed and reported even if undefined.
**Initial Status:** PENDING

---

## Warning Text Format Verification

For any test case that triggers a load-time warning (T-2, T-3, T-4), confirm the
notification and log text match the template from `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION`:

**Notification:**
```
Jarvis: [Heartbeat] Invalid queue destination: job="${job.name}" step=${idx} destination="${step.destination}"
```

**Log (warn level):**
```
[Heartbeat] Invalid queue destination: job="${job.name}" step=${idx} destination="${step.destination}"
```

For fire-time skip (T-5), confirm the log entry matches `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR`:

```
[Heartbeat] queue step skipped — invalid destination: "${step.destination}"
```

For `jarvis_registerJob` rejection (T-7), confirm the error text matches `REQ_MSG_DEST_ERROR`
(same template as `SPEC_MSG_SENDTOSESSION`):

```
Destination session "${destination}" does not exist.
Valid destinations: ${sorted, comma-separated or "(none)"}
```

---

## Result Summary

| ID | Scenario | Result | Notes |
|----|----------|--------|-------|
| T-1 | Load-time all valid destinations | PENDING | |
| T-2 | Load-time single invalid destination | PENDING | |
| T-3 | Load-time multiple invalid in same job | PENDING | |
| T-4 | Load-time invalid across multiple jobs | PENDING | |
| T-5 | Fire-time skip; valid step continues | PENDING | |
| T-6 | Resolver reuse — /renamed session valid | PENDING | |
| T-7 | registerJob invalid destination rejected | PENDING | |
| T-8 | registerJob valid destination — success | PENDING | |
| T-9 | Regression — existing valid jobs unchanged | PENDING | |
| T-10 | Edge case — empty/missing destination | PENDING | |

**Overall:** PENDING

---

## Build State at Execution

- `npm run compile`:
- `python -m sphinx -b html docs docs/_build/html -W --keep-going`:

## Recommendation

(fill in after execution)
