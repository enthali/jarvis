# Change Process

Use this process for every modification to versioned source code or documentation of the Jarvis repository. Each such modification needs a durable, checkable agreement about intent, owned artifacts, evidence, and closure. The Project Manager owns this process and runs it.

The canonical Change Contract template lives here. A concrete change starts as a tailored copy at `docs/changes/<change>.md`.

## Process Definition

- **Applicability:** Every modification to versioned source code or documentation.
- **Canonical template:** The `Canonical Change Contract Template` section in this document.
- **Concrete instances:** `docs/changes/<change>.md`.
- **Initial responsibility:** Project Manager, who creates the Change Contract, completes its intent and required fields, and prepares it for the User-owned `Contract release` gate.
- **First handoff:** Architect, who determines the required specification work before further artifact owners proceed.
- **Closure responsibility:** Project Manager.
- **Closure conditions:** The checklist in the template's `Closure` section.

Only one contract is active at a time.

Artifact work starts once the User sets the `Contract release` gate to `approved`. Responsibility is held by exactly one actor at a time. Before handing on, the responsible actor commits its artifacts and the current Contract state together, names the next owner in the Contract, and then notifies that owner. From then on it changes only its own memory.

A change runs until its tests pass: Quality executes the tests, every failing test becomes a row in `Open Findings`, responsibility goes to the owner of the affected artifact, and Quality executes the affected tests again once the owner hands back. When Quality can proceed, it communicates its judgment directly to the Project Manager, and responsibility transfers to the User for validation. The User communicates the validation decision directly to the Project Manager, who then closes the change.

## Ontology Binding

The Contract names artifacts by role; the project ontology defines how each role is realized. This section is the one place where the two meet, and it changes together with the ontology.

| Contract artifact | Realized in Jarvis today | Owner |
|---|---|---|
| Product specification | `story`, `req`, `spec` Needs in `docs/userstories/`, `docs/requirements/`, `docs/design/`, connected by `:links:` | Architect |
| Requirement-level test (system test) | Vitest test files in `src/tests/`; the test title names the REQ or SPEC ID it verifies | Tester |
| Validation test | Test procedure for a User Story, executed by the User | Tester |
| User-facing documentation | Documents listed in the Technical Writer's document map | Technical Writer |

Quality's review methods read the Needs graph. With untyped `:links:`, Quality records the resulting analysis limits in its `Applied Review Methods` table.

The Jarvis ontology lives in `docs/jarvis-ontology.toml`. The syspilot skill scripts (impact, MECE, trace) take it through `--ontology docs/jarvis-ontology.toml`.

## Change Contract Initialization

The Project Manager initializes a change as one consistent version-controlled state:

1. Choose a lowercase, hyphenated change name.
2. Create the local feature branch `feature/<change>` from `development`. Feature branches stay local; `development` and `main` are the shared branches.
3. Copy the canonical template from `# Change Contract: {NAME}` through the end of this file to `docs/changes/<change>.md`.
4. Select the agreed Operation Mode, remove the template note and the two non-applicable mode rules, replace the remaining placeholders, tailor the artifact set, and complete the header and `Intent And Outcome` section.
5. Record evidence that the intent and outcome text is settled, and set its status to `approved`.
6. Ask the User to set the User-owned `Contract release` gate to `approved`; only the User sets this gate.
7. Commit the branch and initialized Change Contract.
8. Transfer current responsibility to the Architect as the first artifact owner.

## Canonical Change Contract Template

# Change Contract: {NAME}

**Status:** proposed | approved | active | blocked | review | accepted | closed<br>
**Process owner:** Project Manager<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none | {decision or action currently needed}<br>
**Created:** {DATE}<br>
**Related GitHub Issue(s):** {#n, …} — delete this line if not applicable<br>
- **Operation Mode**: user-guided (default) | autonomous | unattended; select one with the User before Contract release

*(Template note - delete this line and the two non-applicable mode bullets once the mode is picked.)*

- **user-guided** - every actor involves the user in its decision-making before proceeding.
- **autonomous** - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.
- **unattended** - the user is away. When unsure, the actor flags `USER REVIEW REQUIRED` in this document, takes the simplest KISS path that is cheapest to reverse or amend, and keeps the change moving. The PM reviews flagged points once reachable again; decision ownership remains with the actor that made the decision.

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** draft | approved<br>
**Approval evidence:** pending | {evidence that the intent and outcome text is settled}

### Goal

{What should become true?}

### Value

{Who benefits, and why does this matter?}

### Scope

{Which product behavior and artifacts may change?}

### Observable Outcome

{What evidence will demonstrate that the goal was achieved?}

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | draft / approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | pending / approved |
| Version control | yes / not applicable: {reason} | Project Manager | Local branch `feature/<change>`; squash-integrated into `development` at closure; the branch is retained | active / merged / not applicable |
| Product specification | yes / not applicable: {reason; delete the corresponding section} | Architect | Changed specification artifacts are linked and checked | pending / complete / not applicable |
| Infrastructure impact | yes / not applicable: {reason; delete the corresponding section} | Admin | Affected infrastructure artifacts are updated, or none is affected | pending / complete / not applicable |
| Documentation impact | yes / not applicable: {reason; delete the corresponding section} | Technical Writer | Affected user-facing documents are updated | pending / complete / not applicable |
| Implementation and unit verification | yes / not applicable: {reason; delete the corresponding section} | Developer | Changed code and passing unit tests are recorded | pending / complete / not applicable |
| Test design | yes / not applicable: {reason; delete the corresponding section} | Tester | Requirement-level tests and validation procedures trace to the changed specification | pending / complete / not applicable |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | pending |
| User validation | yes / not applicable: {explicit User delegation recorded in this row} | User | Observable outcome is accepted or changes are requested | pending / accepted / changes requested / not applicable |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** pending | in progress | complete | not applicable

| Artifact | Change | Rationale |
|---|---|---|
| {specification ID or path} | {add / modify / remove} | {why} |

| Decision or check | Evidence |
|---|---|
| {architecture decision, consistency check, or impact analysis} | {link or result} |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** pending | complete | not applicable

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| {build, test tooling, CI, workflow, configuration} | {what the change requires} | {action and evidence} |

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** pending | complete | not applicable

| Document | Required update | Evidence |
|---|---|---|
| {path} | {what the change makes true or false in it} | {commit or review result} |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** pending | in progress | complete | not applicable

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| {implementation question} | {selected approach} | {alternatives considered} | {why this choice fits} |

| Artifact | Change | Unit test evidence |
|---|---|---|
| {path} | {what changed} | {command @ commit: result} |

## Test Design

**Owner:** Tester<br>
**Status:** pending | in progress | complete | not applicable

| Test | Kind | Traces to | Location |
|---|---|---|---|
| {test ID or title} | system / validation | {REQ or US ID} | {test file or procedure} |

## Quality Review

**Owner:** Quality<br>
**Status:** pending | in progress | proceed | blocked

**Current judgment:** {holistic assessment of the currently valid artifacts and evidence}

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| {review method} | {objects, peer scope, traversal depth} | {inputs and reproducible result} | {observed issues or no finding} | {data, semantic, or analysis limits} |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit.

| Test or run | Command and commit | Result |
|---|---|---|
| {test ID or suite} | {command @ sha} | pass / fail: {failing test} |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| {artifact} | {observable finding} | {positive condition needed for proceed} |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** pending | accepted | changes requested | not applicable

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| {procedure or US ID} | {what the User observed} | {date} |

**Decision:** {accepted | changes requested | explicit User delegation from the artifact row}

## Closure

**Owner:** Project Manager<br>
**Status:** pending | closed

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.

**Final outcome:** {accepted result and integration commit}
