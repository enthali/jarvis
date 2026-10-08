# Test Protocol: actor-identity-via-agent-file

**Change Request**: [actor-identity-via-agent-file](actor-identity-via-agent-file.md)
**Branch**: `feature/actor-identity-via-agent-file`
**User UAT result**: NOT RUN (no User/PM verdict)

## User Validation

The [Actor identity User-test design](../design/spec_uat_actor_identity.rst)
defines the manual scenarios for six affected product stories. The change to
US_KAN_TOOLS has no User scenario in this protocol: the explicit-owner board
creation was already observed by the User in the EDH, while missing-owner
refusal is covered by Engineering verification. The changed Kanban skill
wording is already covered by T-11 in the existing
[Kanban skill User-test design](../design/spec_uat_kanban_skill.rst); it is not
duplicated here. No scenario has been run or judged. Execute with the User
and PM in an Extension Development Host launched with `Ctrl+F5` (not `F5`)
after implementation is ready and UAT is released. Record each result, date,
participants, and observed evidence after execution; a blocked scenario is
not a PASS.

| Scenario | Product story / acceptance criterion | Result | User / date / evidence |
|----------|--------------------------------------|--------|------------------------|
| T-1 | US_ACTOR_WHOAMI AC-1/AC-4 | NOT RUN | Pending User validation |
| T-2 | US_ACTOR_WHOAMI AC-2 | NOT RUN | Pending User validation |
| T-3 | US_ACTOR_WHOAMI AC-3; US_ACTOR_ACTORS AC-6 | NOT RUN | Pending User validation |
| T-4 | US_ACTOR_CREATE AC-3/AC-4/AC-6; US_ACTOR_ACTORS AC-6 | NOT RUN | Pending User validation |
| T-5 | US_ACTOR_CREATE AC-4/AC-6 | NOT RUN | Pending User validation |
| T-6 | US_ACTOR_CREATETOOL AC-2/AC-3 | NOT RUN | Pending User validation |
| T-7 | US_ACTOR_LISTTOOL AC-2 | NOT RUN | Pending User validation |
| T-8 | US_ACTOR_FILES_TREE AC-1a | NOT RUN | Pending User validation |
| T-10 | US_ACTOR_WHOAMI AC-1; REQ_ACTOR_WHOAMI AC-10 | NOT RUN | Pending User validation |
| Kanban skill T-11 | US_KAN_SKILL AC-4; US_UAT_KAN_SKILL AC-11 | NOT RUN in this change | Pending User validation |

**OPEN assumption:** The 3 s wait for VS Code to register a newly created
agent's mode command must be checked in the Extension Development Host. It
is not a verified result. If the mode does not become available, record the affected User
scenario as BLOCKED or FAIL according to its observable outcome and raise the
registration timing issue for Engineering verification.

Builds, package checks, unit/integration tests, and inspection of internal
agent-file reconciliation are Engineering verification, not User UAT.