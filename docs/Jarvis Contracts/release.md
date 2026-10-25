# Release Process

Use this process for every publication of the Jarvis extensions. A release takes a state of `development` that already exists, every change in it already tested, and makes it public. Publication is irreversible: pushing a `v*` tag runs `.github/workflows/release.yml`, which creates the GitHub Release and publishes every extension to the VS Code Marketplace. Everything this contract checks must therefore be true before the tag is pushed.

The Release actor owns this process and runs it. The canonical Release Contract template lives here. A concrete release starts as a tailored copy at `docs/releases/v{version}.md`.

## Process Definition

- **Applicability:** Every publication of a Jarvis version.
- **Canonical template:** The `Canonical Release Contract Template` section in this document.
- **Concrete instances:** `docs/releases/v{version}.md`, excluded from the documentation build in `docs/conf.py`.
- **Initial responsibility:** Project Manager, who creates the Release Contract, completes objective and scope, and prepares it for the User-owned `Release start` gate.
- **First handoff:** Release.
- **Closure responsibility:** Release.
- **Closure conditions:** The checklist in the template's `Closure` section.

Only one contract is active at a time.

Release work starts once the User sets the `Release start` gate to `approved`. The preflight is the final check before publication: when it passes and Quality has recorded `proceed`, Release publishes. When the preflight fails, Release records the failure as an open finding and transfers responsibility to the Project Manager, who starts a problem analysis; the release continues once it is resolved.

## Release Contract Initialization

The Project Manager initializes a release as one consistent version-controlled state on `development`:

1. Copy the canonical template from `# Release Contract: {VERSION}` through the end of this file to `docs/releases/v{version}.md`, using the intended version.
2. Select the agreed Operation Mode and keep its definition with the specifics agreed with the User, remove the template note and the non-applicable mode rule, and complete the header, `Objective And Scope`, and the list of included changes.
3. Ask the User to set the User-owned `Release start` gate to `approved`; only the User sets this gate.
4. Commit the initialized Release Contract.
5. Transfer current responsibility to Release.

## Canonical Release Contract Template

# Release Contract: {VERSION}

**Status:** proposed | approved | active | blocked | published | closed<br>
**Process owner:** Release<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none | {decision or action currently needed}<br>
**Created:** {DATE}<br>
**Related GitHub Issue(s):** {#n, …} — delete this line if not applicable<br>
- **Operation Mode**: {select one of the following modes and agree its specifics for this release with the User before Release start; autonomous is the default}

*(Template note - delete this line and the non-applicable mode bullet once the mode is picked. A release ends in an irreversible publication, so it always runs with the User reachable.)*

- **autonomous** - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.
- **user-guided** - every actor involves the user in its decision-making before proceeding.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|

## Objective And Scope

**Owner:** Project Manager<br>
**Status:** draft | approved

### Objective

{Why this release exists and what it makes available to users.}

### Included Changes

{The closed Change Contracts this release ships, in integration order.}

### Known Limitations

{Constraints that remain true in this release. State only what this release delivers.}

## Artifacts, Ownership And Process Gates

| Artifact or gate | Owner | Completion evidence | Status |
|---|---|---|---|
| Objective and scope | Project Manager | Objective, included changes, and known limitations are explicit | draft / approved |
| Release start | User | User authorization to start the release; set by the User only | pending / approved |
| Change inventory | Release | Every included Change Contract is closed | pending / complete |
| Version | Release | Version decided; every version marker updated | pending / complete |
| Preflight | Release | Build, lint, requirement-level tests, and strict documentation build pass | pending / passed / failed |
| Release notes | Release | `docs/releasenotes.md` covers every included change | pending / complete |
| User-facing documentation | Technical Writer | User-facing documentation describes what this release ships, including its version | pending / complete / not applicable |
| Infrastructure impact | Admin | `release.yml` builds and publishes every package this release ships, including new ones | pending / complete / not applicable |
| Release verification | Quality | Current judgment is `proceed` and Open Findings is `None` | pending |
| Publication | Release | Tag pushed, workflow succeeded, GitHub Release and Marketplace versions match | pending / published |
| Closure | Release | Closure checklist complete | pending |

## Change Inventory

**Owner:** Release<br>
**Status:** pending | complete

A change is release-ready when its Change Contract is closed. Including a change whose contract is still open requires a User decision recorded here.

| Change | Integrated commit | Contract closed | Archived to |
|---|---|---|---|
| {change} | {sha} | yes / no | `docs/changes/v{version}/{change}.md` |

## Version

**Owner:** Release<br>
**Status:** pending | complete

Semantic versioning, pre-1.0 (`0.y.z`); MAJOR stays 0. MINOR when the release contains at least one feature or breaking change; PATCH when it contains only fixes or infrastructure.

Update every version marker to the same version: root `package.json`, every `packages/*/package.json`, and the root and workspace entries in `package-lock.json`. Verify the lock file against the package files.

**Version:** {version} — {reason}

## Preflight

**Owner:** Release<br>
**Status:** pending | passed | failed

Run in order and stop at the first failure, before any file is moved:

1. `npm run compile:packages`, plus every package build step that `release.yml` depends on
2. `npm run lint`
3. Requirement-level tests, all of them; unit tests already ran in every change. Until the test model separates the two, run the full `npm test` suite.
4. Strict documentation build: `python -m sphinx -b html docs docs/_build/html -W --keep-going -E`

Release runs checks 1, 2 and 4. For check 3, Release may hand responsibility to Quality, who runs the tests, records the result in the table below and hands back.

| Check | Command and commit | Result |
|---|---|---|
| {check} | {command} @ {sha} | pass / fail: {failing item} |

A failure becomes a row in Open Findings and responsibility goes to the Project Manager.

## Release Notes

**Owner:** Release<br>
**Status:** pending | complete

Release is the only writer of `docs/releasenotes.md`. Add one entry per included change, in integration order, stating what changed and why it matters to a user.

## User-Facing Documentation

**Owner:** Technical Writer<br>
**Status:** pending | complete | not applicable

| Document | Review trigger hit by this release | Required update | Evidence |
|---|---|---|---|
| {path} | {trigger} | {update or none} | {commit or review result} |

User-facing documentation, including `README.md`, describes what this release ships, including its version number. The release continues once it does.

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** pending | complete | not applicable

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/release.yml` | {new or removed package, secret, build step} | {action and evidence} |

## Release Verification

**Owner:** Quality<br>
**Status:** pending | in progress | proceed | blocked

**Current judgment:** {holistic assessment}

Quality verifies independently that every included change is closed and represented in the release notes, that release-facing documentation describes the release honestly, and that the preflight evidence is complete and current. Quality may re-run any check. Quality communicates its judgment directly to Release.

## Open Findings

Keep this table synchronized with currently open findings. For each finding, transfer current responsibility to the owner of the affected artifact; a preflight failure goes to the Project Manager. Remove a row when its required outcome is confirmed. At publication this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| {artifact} | {observable finding} | {positive condition needed} |

## Publication

**Owner:** Release<br>
**Status:** pending | published

Publish only when Release Verification is `proceed` and Open Findings is `None`.

1. Archive the included Change Contracts with `git mv` to `docs/changes/v{version}/` and commit the release preparation on `development`.
2. Bring local `main` up to `origin/main`, squash-merge `development` into `main`, and commit.
3. Tag `v{version}` and push `main` and the tag.
4. Watch `release.yml` to completion. Verify the GitHub Release lists every extension and the Marketplace shows the new version.
5. Close every GitHub issue in `Related GitHub Issue(s)` with `Shipped in v{version}.`
6. Merge `main` back into `development` and push `development`.

| Evidence | Value |
|---|---|
| Release commit on `main` | {sha} |
| Tag | v{version} |
| Workflow run | {link or id} |
| GitHub Release | {link} |
| Marketplace version | {version} |

## Closure

**Owner:** Release<br>
**Status:** pending | closed

- [ ] Every artifact or gate has terminal status and evidence.
- [ ] Preflight passed on the released commit.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] Publication evidence is recorded.
- [ ] `development` contains the back-merge of `main`.
- [ ] Current blocker is `none`.
