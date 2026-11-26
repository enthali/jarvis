# Change Contract: marketplace-oidc-publishing

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-26<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-26 | 01:43 CET | Project Manager | Architect | User approved Contract release (autonomous). Scope migrates `.github/workflows/release.yml` (`REQ_REL_MKTPUBLISH`, `SPEC_REL_MKTPUBLISH`) from `VSCE_PAT` to VS Code Marketplace OIDC Trusted Publishing (`@vscode/vsce` >=4.1.1 `--oidc`, `id-token: write`, plus Node-24 action versions) ahead of Azure DevOps global PAT retirement on 2026-12-01 (`K79`). User and PM are configuring the Marketplace Trusted Publishing policy in parallel; end-to-end live verification will follow immediately in patch release `0.35.1`. |
| 2026-11-26 | 01:47 CET | Architect | Admin | Specification complete: OIDC per-step token model verified in `@vscode/vsce` 4.1.1 source; `REQ_REL_MKTPUBLISH` and `SPEC_REL_MKTPUBLISH` rewritten and `approved`, no story changed. Target values for `package.json` and `release.yml` are in my section. |
| 2026-11-26 | 01:50 CET | Admin | Developer | `@vscode/vsce` 4.1.1, `release.yml` with `id-token: write`, six `--oidc` publish steps and node24 actions committed; all seven VSIX package with v4. Needs are still `approved`, so `check_contract_needs.py` fails until you set them `implemented`. Live token exchange depends on the Marketplace policy and is first tried in `0.35.1`. |
| 2026-11-26 | 01:55 CET | Developer | Technical Writer | `REQ_REL_MKTPUBLISH` and `SPEC_REL_MKTPUBLISH` set to `implemented`; no `packages/` change. Documentation row is next; the Tester's `release.yml` test follows. |
| 2026-11-26 | 02:10 CET | Technical Writer | Tester | No user document describes the publishing credential; the stale core ID in packages/mcp/README.md is fixed here because this Contract bars only packages/*/src/, so the README is in scope and Quality's VSIX build covers it. Strict docs build passes. Test design row is yours. |
| 2026-11-26 | 02:25 CET | Tester | Quality | Test design complete: `src/tests/release-oidc-publishing.test.ts`, 14 tests, mutation-checked. Live token exchange is not repository-testable and stays with User validation (`0.35.1`). |
| 2026-11-26 | 02:40 CET | Quality | Project Manager | Quality review is `proceed`, Open Findings `None`. The Marketplace policy and the live token exchange are not testable here; first run is the 0.35.1 publication. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-26 01:41 CET (autonomous execution approved, followed by a `0.35.1` patch release to verify OIDC publishing live).

### Goal

The release workflow (`.github/workflows/release.yml`) publishes all six Marketplace extensions via OpenID Connect (OIDC) Trusted Publishing (`vsce publish --oidc` with `@vscode/vsce` >= 4.1.1 and `id-token: write`) instead of a stored `VSCE_PAT` secret, and `REQ_REL_MKTPUBLISH` / `SPEC_REL_MKTPUBLISH` reflect OIDC Trusted Publishing.

### Value

Global Personal Access Tokens (PATs) in Azure DevOps are retired on `2026-12-01`. Migrating `release.yml` from `VSCE_PAT` to federated OIDC Trusted Publishing keeps automated Marketplace releases working past the deadline, eliminates long-lived publishing credentials from GitHub repository secrets, and prepares `release.yml` for the upcoming `0.35.1` verification release and subsequent pre-release channel (`K80`).

### Scope

- **Upgrade `@vscode/vsce` to v4 (`>= 4.1.1`) (`package.json`, `package-lock.json`):**
  - Update root `devDependencies["@vscode/vsce"]` from `^3.0.0` (locked at `3.7.1`, which lacks `--oidc`) to `^4.1.1` (or current v4 release), regenerate `package-lock.json`, and verify `npx vsce package --no-dependencies` continues to build all shipped VSIXs cleanly (note `@vscode/vsce` v4 requires Node >= 22, which `release.yml` already configures).
- **Switch `.github/workflows/release.yml` from `VSCE_PAT` to OIDC Trusted Publishing (`K79`):**
  - Grant `id-token: write` permission in `.github/workflows/release.yml` alongside `contents: write`.
  - Replace `env: VSCE_PAT: ${{ secrets.VSCE_PAT }}` on all six Marketplace publish steps (`core`, `pim`, `recorder`, `mcp`, `flow`, `kanban`; `core-gh` remains GitHub-Release-only) with `npx vsce publish --oidc --packagePath ... --no-dependencies` (Admin/Architect verify in `@vscode/vsce` v4 how multiple sequential `vsce publish --oidc` steps in one job acquire/exchange OIDC tokens, since each GitHub OIDC JWT is single-use while each `ACTIONS_ID_TOKEN_REQUEST_URL` call mints a fresh JWT — or whether a single multi-path call / per-step call is standard).
  - Refresh GitHub Action versions in `release.yml` (`actions/checkout`, `actions/setup-node`) to current Node-24-compatible major tags (matching `docs.yml`'s recent refresh) if clean and compatible with `softprops/action-gh-release@v2`.
- **Update Release specifications (`REQ_REL_MKTPUBLISH`, `SPEC_REL_MKTPUBLISH`, and `SPEC_REL_RELEASEACTION` / `US_REL_MARKETPLACE` if affected):**
  - Replace `VSCE_PAT` requirements/steps with OIDC Trusted Publishing (`id-token: write`, `vsce publish --oidc`, Marketplace Trusted Publishing policy bound to `enthali/jarvis` and `release.yml`, no stored PAT secret).
- **External Marketplace policy (configured interactively by User + PM outside git):**
  - Publisher `enthali` → Trusted Publishing policy (`Repository owner: enthali`, `Repository: jarvis`, `Workflow: release.yml`, `Environment: <empty>`). Live token exchange will be exercised in the immediately following `0.35.1` patch release.
- **Zero runtime extension code changes:** No files under `packages/*/src/` are modified.

### Observable Outcome

- Root `package.json` and `package-lock.json` resolve `@vscode/vsce` `>= 4.1.1`, and `npx vsce --help` / `npx vsce publish --help` exposes `--oidc`.
- `.github/workflows/release.yml` declares `id-token: write`, contains zero references to `VSCE_PAT`, and publishes all six Marketplace VSIXs with `--oidc`.
- `REQ_REL_MKTPUBLISH` and `SPEC_REL_MKTPUBLISH` match the OIDC workflow, with zero `draft`, `open`, or `deprecated` Needs.
- A static test in `src/tests/` verifies `release.yml` OIDC permissions, `--oidc` flags on all six publish steps, absence of `VSCE_PAT`, `@vscode/vsce` `>= 4.1.1`, and Node-24 action versions.
- Strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `npm run lint`, the full Vitest suite, and clean-tree VSIX packaging with `@vscode/vsce` v4 pass.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-26 01:41 CET) |
| Version control | yes | Project Manager | Local branch `feature/marketplace-oidc-publishing`; squash-integrated into `development` at closure; the branch is retained | merged (`2793cf8a`) |
| Product specification | yes | Architect | `REQ_REL_MKTPUBLISH`, `SPEC_REL_MKTPUBLISH` (and `SPEC_REL_RELEASEACTION` / `US_REL_MARKETPLACE` if affected) updated for OIDC Trusted Publishing and checked | complete |
| Infrastructure impact | yes | Admin | `@vscode/vsce` upgraded to `>= 4.1.1` in `package.json` + `package-lock.json`; `.github/workflows/release.yml` updated to `--oidc` + `id-token: write` | complete |
| Documentation impact | yes | Technical Writer | User-facing documents reviewed (plus check whether `packages/mcp/README.md` stale `enthali.jarvis` ID belongs here or stays out if `packages/` untouched), or none is affected | complete |
| Implementation and unit verification | yes | Developer | Touched Need statuses set to `implemented` and suite verified (zero `packages/*/src/` changes) | complete |
| Test design | yes | Tester | Static verification test in `src/tests/` covering `release.yml` OIDC publishing and `@vscode/vsce` version passes | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` (incl. clean-tree VSIX packaging with `@vscode/vsce` v4) | complete (see Quality Review) |
| User validation | yes | User | Marketplace Trusted Publishing policy configured (`Release workflow`, `Active` for `enthali/jarvis` + `release.yml`) and automated repository verification accepted (live publish runs in `v0.35.1-pre`) | accepted (2026-11-26 01:56 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_REL_MKTPUBLISH` | modify; `approved` | Description and AC-3 replace the stored `VSCE_PAT` secret with OIDC Trusted Publishing. New AC-5 (`id-token: write`), AC-6 (`@vscode/vsce` >= 4.1.1) and AC-7 (Node-24 action majors). AC-1, AC-2, AC-4 unchanged. |
| `SPEC_REL_MKTPUBLISH` | modify; `approved` | Authentication paragraph with the token model, YAML shape without `env`/secret, `permissions` block, vsce and action versions, Marketplace policy parameters. AC-3 rewritten; new AC-5 to AC-7 mirror the requirement. |
| `SPEC_REL_RELEASEACTION` | unchanged | Its snippet is the original GitHub-Release-only workflow and says so; it points to `SPEC_REL_MKTPUBLISH` for the current workflow. |
| `US_REL_MARKETPLACE` | unchanged | States the outcome (CI publishes without manual intervention); that holds under either credential. No story changes, so none is named for User validation by me. |
| `REQ_MOD_READINESS`, `SPEC_MOD_READINESS`, `REQ_REL_VSCEPKG` | unchanged | Linked to the changed Needs; none mentions a credential or a vsce version. |

| Decision or check | Evidence |
|---|---|
| Token model (the Contract's open question): per-step `vsce publish --oidc` is the standard; no multi-path call is needed | `@vscode/vsce` v4.1.1 `src/oidc.ts`: each invocation calls `ACTIONS_ID_TOKEN_REQUEST_URL` for audience `marketplace.visualstudio.com`, then `POST /_apis/gallery/token` with `FederatedToken <JWT>` and `publisherName`; returns a session token valid up to 15 min. State is per process, so six sequential steps share nothing. README "Trusted publishing" shows the same single-command shape. No PAT fallback on failure. |
| `--oidc` needs `@vscode/vsce` >= 4.1.1 | `--oidc` present in tag `v4.1.1` (`src/main.ts`, `src/publish.ts`); the installed lock entry is 3.7.1, which lacks it. Latest tags are `4.1.2-x` prereleases; `^4.1.1` resolves to the latest stable 4.x. `package.json` engines of 4.1.1: node `>= 22`, which the workflow's `node-version: '22'` meets. |
| Node-24 action majors | `action.yml` `using:` checked: `actions/checkout@v7` (v7.0.1), `actions/setup-node@v7` (v7.1.0) and `softprops/action-gh-release@v3` (v3.0.4) are `node24`; `softprops/action-gh-release@v2` is `node20`. The v3.0.0 notes list only the runtime change; inputs `files` and `generate_release_notes` still exist in v3 `action.yml`. |
| `id-token: write` scope | `vsce` fails with "Add `permissions: id-token: write` to the workflow or job" when `ACTIONS_ID_TOKEN_REQUEST_URL` is absent. The Contract keeps the workflow-level `permissions` block, so the permission applies to the single `release` job. |
| Impact analysis | `get_need_links.py` on both Needs: `REQ_REL_MKTPUBLISH` has incoming `REQ_MOD_READINESS`, `SPEC_REL_MKTPUBLISH`; `SPEC_REL_MKTPUBLISH` has incoming `SPEC_MOD_READINESS`. No link changed. |
| Specification build | `python -m sphinx -W --keep-going -E -b html .` clean; `npx vitest run src/tests/acceptance-criteria-format.test.ts` 5/5; no `draft`/`open`/`deprecated` Needs in `docs/*.rst`; `VSCE_PAT` remains in `docs/` only in the two ACs that forbid it. |
| For Admin | `package.json` `@vscode/vsce` to `^4.1.1` and `package-lock.json` re-resolved; `release.yml`: `permissions` gains `id-token: write`, six publish steps become `npx vsce publish --oidc --packagePath ... --no-dependencies` without `env`, `checkout@v7`, `setup-node@v7` (keep `node-version: '22'`), `softprops/action-gh-release@v3`. `core-gh` stays out of Marketplace publishing. |
| For Tester | Assert against `REQ_REL_MKTPUBLISH` AC-3, AC-5, AC-6, AC-7 and `SPEC_REL_MKTPUBLISH` AC-3, AC-5 to AC-7: `id-token: write` and `contents: write` in `permissions`; `--oidc` on all six publish steps and no `VSCE_PAT`/`secrets.` in them; `@vscode/vsce` range minimum >= 4.1.1 in `package.json` and resolved >= 4.1.1 in the lockfile; the three action majors and no Node-20 action. |
| Open, residual | The live exchange cannot be proven by repository tests: it needs the Marketplace policy (publisher `enthali`, repository `enthali/jarvis`, workflow `release.yml`, no environment), which the User and PM configure outside git. It is first exercised in release `0.35.1`. USER REVIEW: none required of me beyond the Contract's User validation row. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `package.json`, `package-lock.json` | `@vscode/vsce` `^3.0.0` (locked 3.7.1) lacks `--oidc` | Root devDependency set to `^4.1.1`, lock resolves `4.1.1` (engines node `>= 22`). `npx vsce publish --help` lists `--oidc`. `npm ci --dry-run` clean. The lockfile shrinks by about 2,300 lines because v4 drops transitive dependencies; no workspace entry changed. |
| `.github/workflows/release.yml` | Publishing needs OIDC instead of `VSCE_PAT` | `permissions` gains `id-token: write` next to `contents: write`. The six publish steps (core, pim, recorder, mcp, flow, kanban) run `npx vsce publish --oidc --packagePath ... --no-dependencies` without `env`; `core-gh` stays GitHub-Release-only. `VSCE_PAT` no longer appears in the file. Actions: `checkout@v7`, `setup-node@v7` (`node-version: '22'` kept), `softprops/action-gh-release@v3`; latest tags checked with `gh api`, `setup-node` and `action-gh-release` declare `node24` (`checkout@v7` verified by the Architect). YAML parses; six `--oidc` steps, no `env` step. |
| Clean packaging with vsce v4 | All seven VSIX must still build | After `npm run compile` and `node packages/core/build.js --minify`, `npx vsce package --no-dependencies` succeeded for core, core-gh, pim, recorder, mcp, flow and kanban, all 0.35.0. Output went to `%TEMP%` and was removed. Quality repeats it from a clean tree. |
| Repository checks | Baseline | `npx vitest run` 846 passed; `npm run lint` 0 errors; strict Sphinx build clean; `python -m unittest discover scripts` 24 OK. `check_contract_needs.py` exits 1 as designed until the Developer sets the two Needs to `implemented`. |
| Marketplace Trusted Publishing policy | The live exchange needs a policy for publisher `enthali`, repository `enthali/jarvis`, workflow `release.yml`, no environment | Not testable in the repository; User and PM configure it outside git. First live proof is release `0.35.1`. If the policy is missing or wrongly spelled, `vsce` fails with no PAT fallback, so the publish steps fail after the GitHub Release exists. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Which Needs to set | `REQ_REL_MKTPUBLISH` and `SPEC_REL_MKTPUBLISH` set to `implemented` | none | They are the only two `approved` Needs the Needs check lists. `release.yml` in the tree declares `id-token: write`, has six `npx vsce publish --oidc` steps and no `VSCE_PAT`, as the SPEC states. The live token exchange needs the Marketplace policy and is first exercised in `0.35.1`; it is not proven here. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `docs/requirements/req_rel.rst`, `docs/design/spec_rel.rst` | 2 Needs `approved` to `implemented` (2 insertions, 2 deletions) | `npx vitest run` @ working tree: 75 files, 846 tests pass |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Six publish steps, one per extension, none for core-gh; each `vsce publish --oidc --packagePath`; no `env`, token flag or `secrets.`; no `VSCE_PAT` in the file | system | `REQ_REL_MKTPUBLISH` AC-1, AC-2, AC-3 | `src/tests/release-oidc-publishing.test.ts` |
| GitHub Release step precedes all publish steps and uploads all seven VSIX globs | system | `REQ_REL_MKTPUBLISH` AC-4 | same file |
| Workflow `permissions` is exactly `contents: write` + `id-token: write`; no job override | system | `REQ_REL_MKTPUBLISH` AC-5 | same file |
| `@vscode/vsce` >= 4.1.1 in root `package.json` range, in `package-lock.json`, and in any workspace pin | system | `REQ_REL_MKTPUBLISH` AC-6 | same file |
| Actions are exactly `checkout@v7`, `setup-node@v7`, `action-gh-release@v3`; Node >= 22; `SPEC_REL_MKTPUBLISH` names the same | system | `REQ_REL_MKTPUBLISH` AC-7 | same file |
| `packages/mcp/README.md` does not name core as `enthali.jarvis` | system | Documentation row | same file |
| Live OIDC token exchange with the Marketplace policy | validation | `REQ_REL_MKTPUBLISH` AC-3 | not testable in the repository; release `0.35.1` (User validation row) |

Method: static parse of `release.yml` with js-yaml plus JSON reads; 14 tests. Seven mutations (id-token read, one step without `--oidc`, setup-node v4, action-gh-release v2, `VSCE_PAT` in a comment, Node 20, vsce `^3.7.1`) each failed the suite. Full suite 76 files, 860 tests pass; lint 0 errors.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| Root `README.md`, `docs/user guides/*.md`, `packages/*/README.md` | none for the Change: no user document names `VSCE_PAT`, vsce, tokens or the publishing procedure; the Marketplace appears only as an install source, which does not change | case-insensitive search for `VSCE_PAT`, PAT, vsce, oidc, trusted publishing, publish, marketplace |
| `packages/mcp/README.md` | The open item from `streamline-user-story-personas-and-acs`: it named `enthali.jarvis` (the retired shim) as the Jarvis core extension in two places; core is `enthali.jarvis-core` (`extensionDependencies` of `packages/mcp/package.json`). Fixed here, because this Contract excludes only `packages/*/src/` (the other Contract excluded all of `packages/`). The README ships in the MCP VSIX, so Quality's clean-tree packaging covers it | this commit; search over README, guides and package READMEs finds the old ID only in `core-gh.md` and `core-gh/README.md`, where it correctly names the shim |
| `docs/releasenotes.md` | none: no user-visible behaviour change. Release may note the switch of the publishing credential in `0.35.1`; that is Release's decision | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `9dd9b3fb`. `release.yml` uses `vsce publish --oidc` in all six steps with `id-token: write` and no `VSCE_PAT`; vsce 4.1.1 is declared and locked; all seven VSIXs build with it. Open Findings is `None`; the live token exchange is User validation in 0.35.1.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Scope diff | `git diff development...HEAD --name-only` | `release.yml`, `spec_rel.rst`, `req_rel.rst`, `package.json`, `package-lock.json`, `packages/mcp/README.md`, the Contract and the test; no `packages/*/src` | no finding | none |
| Workflow vs REQ AC-3 to AC-7 | `release.yml` diff; PyYAML parse | six `--oidc` publish steps, no `VSCE_PAT`, `id-token: write` plus `contents: write`, GitHub Release step before publish steps | no finding | none |
| Dependency | `package.json`, lockfile, `npm ls @vscode/vsce` | declared `^4.1.1`, locked 4.1.1, installed 4.1.1 | no finding | the large lockfile diff is the vsce 3 to 4 upgrade; reviewed by the clean install and the packaging run, not line by line |
| Action versions | `gh api` `action.yml` at `checkout@v7`, `setup-node@v7`, `action-gh-release@v3` | all `node24` | no finding | none |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 9dd9b3fb | pass: 76 files, 860 tests |
| Build, lint, strict docs, script tests | `npm run compile:packages`; `npm run lint`; `python -m sphinx -W --keep-going -b html docs docs/_build/html -E`; `python -m unittest discover scripts` @ 9dd9b3fb | pass: 0 lint errors (204 warnings); docs build; `OK` |
| Needs check | `python scripts/check_contract_needs.py` @ 9dd9b3fb | exit 0 |
| Mutation check | `--oidc` removed from the PIM publish step | pass: 1 of 14 tests fails; file restored |
| VSIX packaging, clean tree | detached worktree at 9dd9b3fb: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce` 4.1.1 `package --no-dependencies` for core, core-gh, pim, recorder, mcp, flow, kanban | pass: seven VSIXs at 0.35.0, engine `^1.144.0`, no `.wasm`; the MCP VSIX README names `enthali.jarvis-core` |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Marketplace Trusted Publishing policy setup + automated repository verification (no `US_*` or `AC_*` Need changed) | User and PM created and verified the `Active` Trusted Publishing policy `Release workflow` on `https://marketplace.visualstudio.com/manage/publishers/enthali/trustedpublishing` (`enthali` `#5298312`, `jarvis` `#1197570209`, `release.yml`), and User accepted the repository verification (860 tests pass, `@vscode/vsce` 4.1.1 builds all 7 VSIXs cleanly, 0 lint errors, Needs check exit 0); live OIDC token exchange runs in the upcoming `v0.35.1-pre` release. | 2026-11-26 |

**Decision:** accepted (2026-11-26 01:56 CET)

## Closure

**Owner:** Project Manager<br>
**Status:** closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [x] The feature branch is squash-integrated into `development`.
- [x] Current blocker is `none`.
- [x] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [x] Header Status is `closed`.

**Final outcome:** Accepted by the User on 2026-11-26 after configuring the `Active` Marketplace Trusted Publishing policy `Release workflow` (`enthali` `#5298312`, `jarvis` `#1197570209`, `release.yml`) and verifying repository readiness (860 tests pass, `@vscode/vsce` 4.1.1 builds all 7 VSIXs cleanly). Upgrades `@vscode/vsce` to `^4.1.1`, switches `.github/workflows/release.yml` (`REQ_REL_MKTPUBLISH`, `SPEC_REL_MKTPUBLISH`) from `VSCE_PAT` to `vsce publish --oidc` with `id-token: write` and Node-24 actions, and updates the stale Core extension ID in `packages/mcp/README.md` (K79). Squash-integrated into `development` as `2793cf8a`; feature branch `feature/marketplace-oidc-publishing` retained; statistics recorded in `.syspilot/stats/marketplace-oidc-publishing-stat.md`. Live OIDC token exchange runs in the upcoming `v0.35.1-pre` release.
