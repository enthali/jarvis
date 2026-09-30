# Test Protocol: one-kind-consolidation (Phase 1)

**Change Request**: [one-kind-consolidation](one-kind-consolidation.md)
**Branch**: `feature/one-kind-consolidation`
**Date prepared**: 2026-09-23
**User UAT result**: NOT RUN (User validation pending)
**Scope**: User validation of the four Phase-1 product stories only; no Phase-2 removal or auto-migration. The never-approved 23-row test plan has been removed; the reported schema observation is retained below as historical evidence, not a User UAT verdict.

## User Validation

Engineering prepares a disposable workspace, working extension, test Actors,
and heartbeat/reminder triggers; it performs unit, integration, schema, and
implementation checks autonomously. The User and PM execute and judge the
User actions together, recording PASS/FAIL/BLOCKED, observations, and date.
No result is inferred from an engineering check. Restore the workspace after
validation. All six checks are pending; no User/PM verdict has been reported.

| # | User test artifact | Product user story | Result | User / date / evidence |
|---|--------------------|--------------------|--------|------------------------|
| U-1 | [Actor memory](../design/spec_uat_actor_memory.rst) | [US_ACTOR_ACTORS](../userstories/us_actor.rst) AC-2/AC-4 | NOT RUN | Pending User validation |
| U-2 | [Actor message receipt](../design/spec_uat_actor_activation.rst) | [US_ACTOR_ACTORS](../userstories/us_actor.rst) AC-3 | NOT RUN | Pending User validation |
| U-3 | [ACTORS tree](../design/spec_uat_actor_tree.rst) | [US_ACTOR_TREE](../userstories/us_actor.rst) AC-1/AC-2/AC-5/AC-6 | NOT RUN | Pending User validation |
| U-4 | [Create Actor](../design/spec_uat_actor_create.rst) | [US_ACTOR_CREATE](../userstories/us_actor.rst) AC-1/AC-3..AC-7 | NOT RUN | Pending User validation |
| U-5 | [Name validation](../design/spec_uat_actor_names.rst) | [US_ACTOR_CREATE](../userstories/us_actor.rst) AC-1/AC-2 | NOT RUN | Pending User validation |
| U-6 | [Identity recovery](../design/spec_uat_actor_identity.rst) | [US_ACTOR_WHOAMI](../userstories/us_actor.rst) AC-1/AC-3 | NOT RUN | Pending User validation |

The User/PM verdict concerns experienced story behavior only. Precise file
paths, schema constraints, ambiguous-name resolution, scanner keys, tool IDs,
and unchanged legacy response shapes are engineering verification, not User
UAT. If a prepared scenario cannot be performed, record BLOCKED rather than
assuming PASS. On 2026-09-25 Change Manager confirmed that EDH preparation
and User/PM execution of U-1 through U-6 remain on hold until independent
QM OK and an execution release. No jobs are scheduled and no UAT has started.

## Historical Observation: Automatic Schema Association

The earlier 23-scenario technical plan was never approved as User UAT. Only
the former ACTORS T-1 yielded a reported partial observation; the other 22
were NOT RUN. Its provisional FAIL does not apply to U-1 through U-6.

User observations relayed in the PM session on 2026-09-23: a valid
`actor.yaml` appeared in the new tree and remained valid without `summary`.
With `name: ""`, no schema diagnostic appeared until the User added the
temporary `# yaml-language-server: $schema=file:///C:/workspace/jarvis/packages/core/schemas/actor.schema.json`
directive; then a red squiggle appeared. A malformed `name: "` also produced
a squiggle, but syntax diagnostics do not demonstrate schema association.
The supplied screenshot shows "Disable" on the Red Hat YAML extension's
detail page (enabled), not a schema diagnostic. No screenshot or log of the
missing or restored schema diagnostic was supplied. The explicit directive
isolates schema behavior but does not satisfy automatic association under
`REQ_ACTOR_SCHEMA` AC-5. PM confirmed the provisional **FAIL** verdict for
the tested EDH; the cause is open. The `kind: project` negative step was
not run; full valid/invalid schema coverage and manifest/draft-07 inspection
remain unverified. No execution time was confirmed.

Further technical verification belongs to Engineering and is not part of
User UAT. No retest result is claimed here.
