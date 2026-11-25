# Change Contract: fix-github-pages-docs-workflow

**Status:** active<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-25<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-25 | 14:09 CET | Project Manager | Architect | User approved Contract release (autonomous). Scope splits `.github/workflows/docs.yml` (`SPEC_REL_DOCSWORKFLOW`) into `build` and `deploy` (`needs: build`) jobs with current action versions (`upload-pages-artifact@v5`, `deploy-pages@v5`, Node-24-compatible `checkout`/`setup-python`) to eliminate the 485ms artifact-indexing race observed during v0.35.0, and adds `docs.yml` verification to `docs/Jarvis Contracts/release.md`. |
| 2026-11-25 | 14:14 CET | Architect | Admin | `SPEC_REL_DOCSWORKFLOW` and `REQ_REL_DOCSWORKFLOW` set to the two-job design (new AC-5 to AC-9, status `approved`). Action majors verified node24: `checkout@v7`, `setup-python@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`. `docs.yml` and `release.md` are yours; AC-9 says what `release.md` must require. |
| 2026-11-25 | 14:15 CET | Admin | Developer | `docs.yml` is the two-job file of the SPEC and `release.md` Publication watches `docs.yml`; both committed. Both Needs stay `approved` for you to set `implemented`. `release.yml` left as is, see the row. |
| 2026-11-25 | 14:20 CET | Developer | Technical Writer | `REQ_REL_DOCSWORKFLOW` and `SPEC_REL_DOCSWORKFLOW` set to `implemented`; no `packages/` change. Documentation row is next; the Tester's workflow test follows. |
| 2026-11-25 | 14:40 CET | Technical Writer | Tester | No user-facing document is affected: none names docs.yml, the Pages actions or the workflow; the published URL in the README is unchanged. Test design row is yours. |
| 2026-11-25 | 14:25 CET | Tester | Quality | Test design complete: 12 static tests in `docs-workflow.test.ts` over `docs.yml` and `release.md`, mutation-checked; suite 846 pass, lint 0 errors. Node 24 runtime of the actions and the live Pages run are not tested. |
| 2026-11-25 | 14:35 CET | Quality | Project Manager | Quality review is `proceed`, Open Findings `None`. The live Pages run happens on the next push to `main` and is not tested here; it is the first release check by Release. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-25 14:07 CET (approved both rerunning 45509708853 — which succeeded — and fixing `docs.yml` + `release.md` in an autonomous Change).

### Goal

The GitHub Pages documentation workflow (`.github/workflows/docs.yml`) separates artifact build/upload from Pages deployment into two distinct jobs (`build` and `deploy` with `needs: build`) using current action versions, and the Release Contract procedure (`docs/Jarvis Contracts/release.md`) explicitly verifies that `docs.yml` succeeds alongside `release.yml` on every release.

### Value

During the `v0.35.0` release, all three `main` pushes failed in `docs.yml` (e.g. run `45509708853`) because `actions/deploy-pages@v4` ran 485 ms after `actions/upload-pages-artifact@v3` in the same job before GitHub's artifact metadata index became consistent (`Found 0 artifact(s)`), and `docs.yml` also emitted Node 20 deprecation warnings on `actions/*@v3/@v4/@v5`. Splitting `build` and `deploy` into separate jobs matches GitHub's canonical Pages architecture (allowing independent deploy retries without rebuilding Sphinx and eliminating same-job indexing races), upgrading to current major versions (`upload-pages-artifact@v5`, `deploy-pages@v5`, plus current `checkout`/`setup-python` major versions; Admin verifies exact Node-24 compatibility) clears runner warnings, and adding `docs.yml` to `release.md` ensures Release never overlooks a failed Pages deployment again.

### Scope

- **Two-job GitHub Pages workflow & action version refresh (`.github/workflows/docs.yml`, `REQ_REL_DOCSWORKFLOW`, `SPEC_REL_DOCSWORKFLOW`):**
  - Split `.github/workflows/docs.yml` into a `build` job (`contents: read` — checkout, setup-python, `pip install -r docs/requirements.txt`, strict Sphinx build `-W --keep-going`, `actions/upload-pages-artifact@v5`) and a `deploy` job (`needs: build`, `permissions: pages: write, id-token: write`, `environment: github-pages`, `actions/deploy-pages@v5`), with top-level `concurrency` (`group: pages`, `cancel-in-progress: false` or per GitHub Pages recommendation so rapid `main` pushes during a release do not clobber each other).
  - Upgrade `actions/checkout` and `actions/setup-python` in `docs.yml` (and check `release.yml` only if `SPEC_REL_*` ties them, or leave `release.yml` untouched if out of scope — Admin decides) to current Node-24-native major releases verified via GitHub releases (`actions/checkout`, `actions/setup-python`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`).
  - Align `SPEC_REL_DOCSWORKFLOW` (and `REQ_REL_DOCSWORKFLOW` / `US_REL_DOCS` if affected) with the two-job structure and action versions.
- **Release process gate (`docs/Jarvis Contracts/release.md`):**
  - Update `Publication` step 4 and the `Publication` evidence table in `docs/Jarvis Contracts/release.md` (and `Artifacts, Ownership And Process Gates` Publication completion evidence if appropriate) so Release watches both `release.yml` (on the tag) and `docs.yml` (on `main`) to completion and records the `docs.yml` run in Publication evidence.
- **Zero runtime extension code changes:** No files under `packages/` are modified.

### Observable Outcome

- `.github/workflows/docs.yml` defines separate `build` and `deploy` (`needs: build`) jobs using `upload-pages-artifact@v5` and `deploy-pages@v5` (plus current Node-24-compatible `checkout`/`setup-python` versions), matching `SPEC_REL_DOCSWORKFLOW`.
- `docs/Jarvis Contracts/release.md` requires Release to verify and record `docs.yml` success on `main` during Publication.
- A static test in `src/tests/` verifies the two-job `build` → `deploy` (`needs: build`) structure, least-privilege permissions, action versions, and `release.md` `docs.yml` publication evidence check.
- Zero `draft`, `open`, or `deprecated` Needs exist; strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `npm run lint`, and the full Vitest suite pass with zero errors.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-25 14:07 CET) |
| Version control | yes | Project Manager | Local branch `feature/fix-github-pages-docs-workflow`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | `SPEC_REL_DOCSWORKFLOW` (and `REQ_REL_DOCSWORKFLOW` if affected) updated for two-job Pages deployment and checked | complete |
| Infrastructure impact | yes | Admin | `.github/workflows/docs.yml` and `docs/Jarvis Contracts/release.md` updated and validated | complete |
| Documentation impact | not applicable: no user-facing document describes the Pages workflow; checked and none is affected | Technical Writer | User-facing documents reviewed, or none is affected | not applicable |
| Implementation and unit verification | yes | Developer | Touched Need statuses set to `implemented` and suite verified (zero `packages/` changes) | complete |
| Test design | yes | Tester | Static workflow & `release.md` verification test in `src/tests/` passes | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete (see Quality Review) |
| User validation | not applicable: explicit User delegation (2026-11-25 14:07 CET) to execute the workflow and contract fix autonomously; live GitHub Actions execution occurs on next push to `main` | User | Observable outcome is accepted or changes are requested | accepted (explicit User delegation, 2026-11-25 14:07 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `SPEC_REL_DOCSWORKFLOW` | modify, `implemented` -> `approved` | Two-job design (`build`, `deploy` with `needs: build`), top-level `contents: read`, job-level `pages: write` + `id-token: write` on `deploy` only, `concurrency` group `pages` with `cancel-in-progress: false`, actions `checkout@v7`, `setup-python@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`. The old text was already stale: it installed inline packages, although `REQ_REL_SPHINXCOMPAT` AC-6 and the real file use `docs/requirements.txt`. Now links `REQ_REL_SPHINXCOMPAT` and carries the reason for the split. |
| `REQ_REL_DOCSWORKFLOW` | modify, `implemented` -> `approved` | New AC-5 (two jobs, no deploy when build fails), AC-6 (permissions split), AC-7 (concurrency), AC-8 (current Node-24 action majors), AC-9 (Release Contract watches and records `docs.yml`). AC-1 to AC-4 unchanged. |
| `US_REL_DOCS` | none | AC-1 (every push to `main` builds and deploys) and AC-3 (build errors fail visibly) stay true; the split is mechanism and belongs in REQ/SPEC. Not touched, so the PM need not name it in User Validation. |

| Decision or check | Evidence |
|---|---|
| Action versions verified | `gh api repos/<action>/releases/latest` on 2026-11-25: `checkout` v7.0.1, `setup-python` v7.1.0, `upload-pages-artifact` v5.0.0, `deploy-pages` v5.0.1. `action.yml` at those majors: `checkout` node24, `setup-python` node24, `deploy-pages` node24, `upload-pages-artifact` composite over `upload-artifact@v7.0.0` (node24). The Contract named `v5` for the two Pages actions; both are the current majors. |
| Major tags, not SHA pins | The current file uses major tags and the Contract asks for majors; pinning to SHAs is a separate security decision and not taken here. Open for Admin only if they want it. |
| Why the split fixes the failure | Reason is in `SPEC_REL_DOCSWORKFLOW` design notes. Residual stated there: the split removes the same-job timing but does not prove the artifact index is never late; the benefit that holds regardless is the independent `deploy` re-run. Live proof only comes with the next push to `main` (User Validation row already delegates this). |
| `release.md` | No Need governs the Release Contract text, so `REQ_REL_DOCSWORKFLOW` AC-9 is the trace for the Tester; the file itself is Admin's artifact and I did not edit it. Needed there: Publication step 4 watches `release.yml` and `docs.yml`; Publication evidence gets a `docs.yml` run row. |
| `release.yml` | Not tied by any `SPEC_REL_*` to the actions touched here; whether to refresh its action versions is Admin's decision, as the Contract says. |
| For the Tester | Check in `docs.yml`: jobs `build` and `deploy`; `deploy.needs` is `build`; top-level `permissions` is only `contents: read`; `pages: write` and `id-token: write` appear only under `deploy`; `concurrency.group` is `pages` and `cancel-in-progress` is `false`; every `uses:` is at the version of the SPEC; `pip install -r docs/requirements.txt`. In `release.md`: Publication names `docs.yml` in the step and in the evidence table. |
| Impact analysis | `get_need_links.py` for `SPEC_REL_DOCSWORKFLOW` and `REQ_REL_DOCSWORKFLOW` (both directions): chain `US_REL_DOCS` <- `REQ_REL_DOCSWORKFLOW` <- `SPEC_REL_DOCSWORKFLOW`, no other consumers. |
| Build | Strict Sphinx build `-W --keep-going -E` exits 0; zero `packages/` changes. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/docs.yml` | Two jobs per `SPEC_REL_DOCSWORKFLOW`: changed | Rewritten to the SPEC text verbatim: `build` (checkout@v7, setup-python@v7, `pip install -r docs/requirements.txt`, strict Sphinx build, upload-pages-artifact@v5) and `deploy` (`needs: build`, `pages: write` and `id-token: write` on the job only, `environment: github-pages`, deploy-pages@v5); top-level `permissions: contents: read` and `concurrency` group `pages`, `cancel-in-progress: false`. YAML parses; jobs, `needs`, both permission blocks and the four `uses:` are as specified. Action versions re-checked by Admin with `gh api` on 2026-11-25: latest releases `checkout` v7.0.1, `setup-python` v7.1.0, `upload-pages-artifact` v5.0.0, `deploy-pages` v5.0.1; `action.yml` of `checkout@v7`, `setup-python@v7`, `deploy-pages@v5` says `using: node24`, `upload-pages-artifact@v5` is composite over `upload-artifact` v7.0.0. The Sphinx command of the workflow runs locally with exit 0. The live run happens on the next push to `main`; User Validation row delegates that. |
| `docs/Jarvis Contracts/release.md` | Publication gate: changed | Gate row, Publication step 4 and the evidence table now name `docs.yml` on `main` next to `release.yml`, add a `Docs workflow run` evidence row, and say a failed `deploy` job is re-run on its own while a failed `build` job is a finding (`REQ_REL_DOCSWORKFLOW` AC-9). |
| `.github/workflows/release.yml` | none | Left untouched by decision: no `SPEC_REL_*` pins its actions, it cannot be tested without publishing, and a failed run publishes partially. It still uses `checkout@v4`, `setup-node@v4` and `softprops/action-gh-release@v2`; current majors are `v7.0.1`, `v7.1.0` and `v3.0.4`. Open for the Project Manager: a separate Change, if the Node 20 warning on release runs matters. |
| Needs check | none | `check_contract_needs.py` exits 1 as designed: only `REQ_REL_DOCSWORKFLOW` and `SPEC_REL_DOCSWORKFLOW` are `approved` until the Developer sets `implemented`; no story changed. Strict Sphinx build exits 0; no file under `packages/` changed. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Which Needs to set | `REQ_REL_DOCSWORKFLOW` and `SPEC_REL_DOCSWORKFLOW` set to `implemented` | none | They are the only two `approved` Needs the Admin's Needs check lists; `docs.yml` and `release.md` are committed as the SPEC states. The live Pages run happens on the next push to `main` (User Validation delegation). |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `docs/requirements/req_rel.rst`, `docs/design/spec_rel.rst` | 2 Needs `approved` to `implemented` (2 insertions, 2 deletions) | `npx vitest run` @ working tree: 74 files, 834 tests pass |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Workflow runs on push to `main` only | validation | `REQ_REL_DOCSWORKFLOW` AC-1/AC-2 | `src/tests/docs-workflow.test.ts` |
| Jobs are exactly `build` and `deploy`; `deploy.needs` is `build`; build installs `docs/requirements.txt`, runs strict Sphinx (`-W`) and uploads the artifact; only `deploy` deploys, in `github-pages` | validation | `REQ_REL_DOCSWORKFLOW` AC-3/AC-5, `SPEC_REL_DOCSWORKFLOW` | `src/tests/docs-workflow.test.ts` |
| Top-level permissions are `contents: read`; only `deploy` holds `pages: write` and `id-token: write` | validation | `REQ_REL_DOCSWORKFLOW` AC-6 | `src/tests/docs-workflow.test.ts` |
| Concurrency group `pages`, `cancel-in-progress: false` | validation | `REQ_REL_DOCSWORKFLOW` AC-7 | `src/tests/docs-workflow.test.ts` |
| The four actions are exactly `checkout@v7`, `setup-python@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`, and the SPEC names the same | validation | `REQ_REL_DOCSWORKFLOW` AC-8 | `src/tests/docs-workflow.test.ts` |
| `release.md` Publication gate, step 4 and evidence table name `docs.yml` on `main`; failed `deploy` is re-run alone, failed `build` is a finding | validation | `REQ_REL_DOCSWORKFLOW` AC-9 | `src/tests/docs-workflow.test.ts` |

Method: static checks that parse `docs.yml` with js-yaml. Seven mutations (`needs` removed, cancel enabled, old action, top-level `pages: write`, `-W` removed, `id-token` removed, `release.md` step 4 without `docs.yml`) each fail the suite; the last one first slipped through a loose assertion, which I tightened. Not covered: the action versions' Node 24 runtime and the live Pages run (the 485 ms index race); both depend on the next push to `main`, as the User Validation delegation states. Full suite 75 files, 846 tests pass; lint 0 errors.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** not applicable

| Document | Required update | Evidence |
|---|---|---|
| Root `README.md`, `docs/user guides/*.md`, `packages/*/README.md` | none | search (case-insensitive) for `docs.yml`, 'GitHub Pages', `github.io`, 'workflow', `upload-pages`, `deploy-pages`, `actions/`: only the unchanged published URL `https://enthali.github.io/jarvis` in the README; the workflow is a maintainer artifact, specified in `REQ_REL_DOCSWORKFLOW` and `SPEC_REL_DOCSWORKFLOW` and used through `docs/Jarvis Contracts/release.md` (Admin's) |
| `docs/releasenotes.md` | none: no user-visible behaviour changes | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `a61cb4e5`. `docs.yml` is the two-job design of the SPEC, `release.md` watches and records `docs.yml`, and the tests pin both. Open Findings is `None`.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Scope diff | `git diff development...HEAD --stat` | six files: `docs.yml`, `release.md`, `spec_rel.rst`, `req_rel.rst`, the Contract and `src/tests/docs-workflow.test.ts`; zero `packages/` files | no finding | none |
| Workflow vs SPEC/REQ AC-5 to AC-8 | `docs.yml` diff read against the ACs; parsed with PyYAML | jobs `build`, `deploy` with `needs: build`; top-level `contents: read`; `pages: write` and `id-token: write` on `deploy` only; `concurrency` group `pages`, no cancel; deploy job has no checkout, as intended | no finding | none |
| Action versions | `gh api` for tags `checkout@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5` and their `action.yml`; `setup-python@v7` | all four tags exist; `checkout`, `deploy-pages` and `setup-python` use `node24`; `upload-pages-artifact` is composite over `upload-artifact` v7.0.0 | no finding | Node 24 of the composite action rests on that pinned `upload-artifact` release; the live run is not executed |
| release.md vs AC-9 | `git diff development...HEAD -- "docs/Jarvis Contracts/release.md"` | Publication row, step 4 and evidence table name `docs.yml` on `main`; a failed `deploy` is re-run, a failed `build` is a finding | no finding | none |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ a61cb4e5 | pass: 75 files, 846 tests |
| Lint, strict docs, script tests | `npm run lint`; `python -m sphinx -W --keep-going -b html docs docs/_build/html -E`; `python -m unittest discover scripts` @ a61cb4e5 | pass: 0 errors (204 warnings); docs build; `OK` |
| Needs check | `python scripts/check_contract_needs.py` @ a61cb4e5 | exit 0 |
| Mutation check | `needs: build` changed to `needs: [ ]` in `docs.yml` | pass: 1 of 12 workflow tests fails; file restored |
| VSIX build | not run: no `packages/`, manifest, README or build file changed | not applicable |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** not applicable: explicit User delegation on automated evidence

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Automated verification of `.github/workflows/docs.yml` (`build` + `deploy` with `needs: build`, `checkout@v7`, `setup-python@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`) and `docs/Jarvis Contracts/release.md` (no `US_*` or `AC_*` Need changed) | Explicit User delegation (2026-11-25 14:07 CET): 75 test files / 846 tests pass (including 12 mutation-checked workflow and `release.md` tests), all four GitHub Action tags verified against `node24` via `gh api`, lint 0 errors, strict Sphinx build clean, and Needs check exit 0; live `docs.yml` execution runs on the next push to `main`. | 2026-11-25 |

**Decision:** explicit User delegation on automated evidence (2026-11-25 14:07 CET)

## Closure

**Owner:** Project Manager<br>
**Status:** pending

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.
- [ ] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [ ] Header Status is `closed`.

**Final outcome:** {accepted result and integration commit}
