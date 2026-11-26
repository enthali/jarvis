# Change Contract: pre-release-channel

**Status:** accepted<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-26<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-26 | 01:58 CET | Project Manager | Architect | User approved Contract release (autonomous, K80, chained directly after `marketplace-oidc-publishing` and followed by live verification release `v0.35.1-pre`). Scope adds the `pre-release` channel via `-pre` Git tags on the same `release.yml`, adds `Channel` to `release.md`, prevents `releaseNotes.ts` from 404ing on `vX.Y.Z-pre` tags, and documents Marketplace Pre-Release opt-in. |
| 2026-11-26 | 02:09 CET | Architect | Admin | Specification complete: channel in tag plus `--pre-release` on package and publish (`REQ/SPEC_REL_CHANNEL`), two stories added, `US_REL_RELEASE` AC-3 amended. `REQ_REL_NOTESTARGET` now looks the tag up (reverses its no-network rule, reasons in my section). Target values for `release.yml` and `release.md` are in my section. |
| 2026-11-26 | 02:12 CET | Admin | Developer | `release.yml` and `release.md` done as specified, checks in my section. Needs stay `approved`; setting them to `implemented` is yours. The workflow is untested on GitHub until `v0.35.1-pre`. |
| 2026-11-26 | 02:20 CET | Developer | Technical Writer | `releaseNotes.ts` resolves `v{version}`, then `v{version}-pre`, then the releases list; seven Needs `implemented`. Existing release-notes tests now stub `fetch`; Tester still owns AC-19 and the static `release.yml` tests. |
| 2026-11-26 | 02:40 CET | Technical Writer | Tester | Getting Started now explains how to switch Core and each add-on to pre-release and back, what the release notes and GitHub path do; the stale phrase 'Before the next release' fixed. Button names come from REQ_REL_CHANNEL AC-8 and were not tried by me; live behaviour is first observable in v0.35.1-pre. Strict docs build passes. Test design row is yours (AC-8 guide trace). |
| 2026-11-26 | 02:55 CET | Tester | Quality | Test design complete: `src/tests/release-channel.test.ts` (15) and three lookup tests added to `release-notes.test.ts`, 14 mutations caught. Live pre-release behaviour is not repository-testable and stays with `v0.35.1-pre`. |
| 2026-11-26 | 03:10 CET | Quality | Project Manager | Quality review is `proceed`, Open Findings `None`. Name `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN` and `US_REL_RELEASE` in User Validation. The GitHub run and the Marketplace channel are first observable with `v0.35.1-pre`. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-26 01:56 CET (approved K80 scope and chaining into `v0.35.1-pre` pre-release verification).

### Goal

Every Jarvis version can be shipped either on the regular **release** channel (`vX.Y.Z`, delivered to all users) or on the **pre-release** channel (`vX.Y.Z-pre`, delivered only to users who opt into Pre-Release versions in VS Code) through the same `.github/workflows/release.yml` and full Release Contract, without breaking in-product Release Notes links or disturbing stable users.

### Value

Shipping frequent incremental or infrastructure-only updates (such as `0.35.1`) to all 20+ stable users creates unnecessary update churn, while maintaining separate release branches or feature flags adds heavy overhead. Encoding the channel in the Git tag (`vX.Y.Z-pre` vs `vX.Y.Z`) while keeping strictly increasing `X.Y.Z` manifest versions uses VS Code Marketplace's native `--pre-release` mechanism on our single OIDC-authorized `release.yml` workflow.

### Scope

- **Tag-driven Pre-Release support in `.github/workflows/release.yml` (`K80`):**
  - Keep the workflow filename `.github/workflows/release.yml` unchanged so the single Marketplace Trusted Publishing policy (`Release workflow`) authorizes both channels.
  - Detect the channel from the pushed tag name (`vX.Y.Z-pre` → pre-release; `vX.Y.Z` → release). Manifest `version` in `package.json` and `packages/*/package.json` remains plain `X.Y.Z` (strictly increasing across all releases, no SemVer pre-release suffix in manifests, no odd/even minor rule).
  - When the tag ends in `-pre`:
    1. Pass `--pre-release` to **both** `vsce package` and `vsce publish` for all six Marketplace extensions (`core`, `pim`, `recorder`, `mcp`, `flow`, `kanban`; `core-gh` remains GitHub-Release-only without `--pre-release`).
    2. Set `prerelease: true` on `softprops/action-gh-release` so GitHub marks the release as Pre-release (and `/repos/enthali/jarvis/releases/latest` in `updateCheck.ts` continues to return only stable releases).
  - When the tag does not end in `-pre`, package and publish as a regular release (`prerelease: false`, no `--pre-release` flag).
- **Release Contract & Release Notes conventions (`docs/Jarvis Contracts/release.md`):**
  - Add `**Channel:** release | pre-release<br>` to the Canonical Release Contract Template header, and update `Version`, `Release Notes`, and `Publication` steps so:
    - `docs/releasenotes.md` marks pre-release headings with `(Pre-Release)` (e.g. `## v0.35.1 (Pre-Release) - ...`) while `docs.yml` continues to build normally on `main`;
    - Publication tags `v{version}` for `release` or `v{version}-pre` for `pre-release`, and verifies the Marketplace Pre-Release state accordingly.
- **In-editor Release Notes URL resolution (`packages/core/src/engine/core/releaseNotes.ts`, `SPEC_REL_RELEASENOTES`):**
  - Today `notesUri(version)` hardcodes `https://github.com/enthali/jarvis/releases/tag/v${version}` from `packageJSON.version` (`0.35.1`), which returns HTTP 404 when `0.35.1` was tagged `v0.35.1-pre`. Update `releaseNotes.ts` (and its spec/unit tests) so opening Release Notes works cleanly for both `v${version}` and `v${version}-pre` releases, and confirm `updateCheck.ts` stays unaffected.
- **Specifications & User Documentation (`US_REL_MARKETPLACE` / `REQ_REL_*` / `SPEC_REL_*`, guides):**
  - Update release specifications to cover the `release` vs `pre-release` (`-pre` tag) channel behavior.
  - Document in user-facing guides (`docs/user guides/getting-started.md` and/or `core.md`) how users opt into Pre-Release versions in VS Code (*Switch to Pre-Release Version* on `Jarvis Core` and installed Jarvis add-ons, noting `extensionDependencies` on `enthali.jarvis-core`).

### Observable Outcome

- `.github/workflows/release.yml` derives pre-release mode from `v*-pre` tags, passes `--pre-release` to `vsce package` and `vsce publish` for all six Marketplace packages when `-pre`, and sets `prerelease` on the GitHub Release.
- `docs/Jarvis Contracts/release.md` includes the `Channel` field, `v{version}-pre` tagging rule, and `(Pre-Release)` heading rule for `docs/releasenotes.md`.
- `releaseNotes.ts` resolves release notes without 404ing on `v{version}-pre` releases, covered by unit/system tests.
- User documentation explains how to opt in to Pre-Release versions across `Jarvis Core` and add-ons.
- Zero `draft`, `open`, or `deprecated` Needs exist; strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `npm run lint`, the full Vitest suite, and clean-tree VSIX packaging pass.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-26 01:56 CET) |
| Version control | yes | Project Manager | Local branch `feature/pre-release-channel`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Release & release-notes Needs updated for `vX.Y.Z-pre` pre-release channel and checked | complete |
| Infrastructure impact | yes | Admin | `.github/workflows/release.yml` and `docs/Jarvis Contracts/release.md` updated for `release` / `pre-release` channels | complete |
| Documentation impact | yes | Technical Writer | Pre-release opt-in documented in user guides | complete |
| Implementation and unit verification | yes | Developer | `releaseNotes.ts` updated for `-pre` tags, Need statuses set to `implemented`, unit tests pass | complete |
| Test design | yes | Tester | System/workflow tests for `release.yml` `-pre` handling, `release.md` Channel field, and `releaseNotes.ts` URL resolution pass | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` (incl. clean-tree VSIX build, testing `--pre-release` packaging too) | complete (see Quality Review) |
| User validation | not applicable: explicit User delegation (2026-11-26 01:56 CET) to chain K80 directly into live pre-release `v0.35.1-pre` once Quality records `proceed` | User | Observable outcome is accepted on automated + clean-tree VSIX evidence (`254a874d`); live pre-release channel run chained immediately via `v0.35.1-pre` | not applicable |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `US_REL_PRERELEASE` | add; `approved` | Jarvis Developer ships a version on a channel only opted-in users receive. AC-1 tag-to-channel, AC-2 no pre-release to non-opted-in users on either path, AC-3 channel recorded in the Release Contract. |
| `US_REL_PRERELEASEOPTIN` | add; `approved` | Jarvis User opts in. AC-1 guide explains switching, AC-2 release notes of an installed pre-release open the right page. |
| `US_REL_RELEASE` | modify AC-3; `approved` | "Version in `package.json` matches the git tag" is false for `v0.35.1-pre`; now "apart from the `-pre` suffix". |
| `REQ_REL_CHANNEL` | add; `approved` | AC-1..8: one workflow, plain `X.Y.Z` manifests, `--pre-release` on package and publish for six packages, shim never, GitHub `prerelease` iff `-pre`, `release.md` trace (AC-7), guide trace (AC-8). |
| `SPEC_REL_CHANNEL` | add; `approved` | `CHANNEL_FLAG` job env from `endsWith(github.ref_name, '-pre')`, used in package, publish, and `prerelease:`; AC-1..7 testable. |
| `REQ_REL_NOTESTARGET` | modify; `approved` | Premise "version known locally so URL is constructed" no longer holds. Description rewritten, AC-1, AC-4, AC-5 changed, AC-7 added. AC-2, AC-3, AC-6 unchanged. |
| `SPEC_REL_RELEASENOTES` | modify; `approved` | `notesUri` becomes an async lookup (code and design notes); AC-6, AC-14 amended, AC-16..20 added. |
| `SPEC_REL_MKTPUBLISH` | note added | One bullet pointing to `SPEC_REL_CHANNEL`; status stays `approved` from the previous Contract. |
| `REQ_REL_UPDATECHECK`, `SPEC_REL_UPDATECHECK`, `REQ_REL_RELEASEACTION`, `REQ_REL_NOTESONCE`, `REQ_REL_NOTESCOMMAND`, `US_REL_WHATSNEW`, `US_REL_MARKETPLACE` | unchanged | See decisions below; none states anything the channel falsifies. |

| Decision or check | Evidence |
|---|---|
| Channel lives in the tag and the `--pre-release` flag, never in the manifest | `@vscode/vsce` 4.1.1 `src/publish.ts` line 378 rejects a SemVer pre-release manifest version. `v*` trigger already matches `v0.35.1-pre`, so the workflow file name (bound by the Marketplace policy) is unchanged. |
| `--pre-release` goes to `package` and to `publish` | `src/package.ts` writes the `Microsoft.VisualStudio.Code.PreRelease` property into the VSIX; `src/publish.ts` 137..150 makes `publish --pre-release --packagePath` fail on a VSIX not packaged that way. One shared expression makes a mismatch a failed step, not a wrong-channel publish. `engines.vscode` `^1.144.0` exceeds the `>=1.63` pre-release minimum. |
| GitHub `prerelease:` input exists in `softprops/action-gh-release@v3` | `action.yml` `prerelease` ("Identify the release as a prerelease. Defaults to false"). |
| `updateCheck.ts` stays unaffected (Contract asked to confirm) | It reads `/repos/enthali/jarvis/releases/latest`, which GitHub defines to exclude pre-releases; with `prerelease: true` a `-pre` release never reaches `isNewer`. Residual: a user on the GitHub path running a pre-release is not told of a newer pre-release by that path; the Marketplace serves opted-in users. No edit to its Needs. |
| **Reversal of an earlier decision (USER REVIEW if the User disagrees):** `REQ_REL_NOTESTARGET` used to forbid any network request ("constructed, not resolved"; AC-4, AC-5) | The constructed URL names `v{version}`; a pre-release is tagged `v{version}-pre`, so every pre-release user would meet a 404, the normal case of the new channel. The manifest cannot carry the channel. Chosen: ask `GET /releases/tags/{tag}` for `v{version}`, then `v{version}-pre`, only inside `open()`; any non-answer or no release leads to `https://github.com/enthali/jarvis/releases`. Marker-equal activation still makes no request (`REQ_REL_NOTESONCE` AC-4). |
| Alternatives rejected for the notes URL | (a) Stamp the channel into manifests in CI: rewrites checked-in files per channel, second source of truth, clean-tree packaging does not exercise it, fails silently as a 404. (b) Read VS Code's internal pre-release flag from `packageJSON`: undocumented, could not be verified against the `@types/vscode` here (1.110 installed, engine `^1.144.0`). (c) Always open the release list: loses the specific page for every release user. |
| Version rule | `REQ_REL_CHANNEL` states versions strictly increase across both channels (Contract intent), so a version is on exactly one channel and promoting a pre-release means a later version. That rule is the Contract's; the Marketplace's own handling of equal versions across channels was not looked up. |
| Impact analysis | `get_need_links.py` on `US_REL_RELEASE` (in: `REQ_REL_RELEASEACTION`, `REQ_REL_VSCEPKG`, `US_REL_SELFUPDATE`, `US_REL_WHATSNEW`), `REQ_REL_NOTESTARGET` (in: `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESONCE`, `SPEC_REL_RELEASENOTES`), `SPEC_REL_RELEASENOTES`. No link removed; `REQ_REL_CHANNEL` links `REQ_REL_RELEASEACTION` and `REQ_REL_MKTPUBLISH`. |
| Specification build | `python -m sphinx -W --keep-going -E -b html .` clean; `npx vitest run src/tests/acceptance-criteria-format.test.ts` 5/5; no `draft`/`open`/`deprecated` Needs in `docs/*.rst`. |
| For Admin | `release.yml`: job `env: CHANNEL_FLAG`; `$CHANNEL_FLAG` on six package and six publish steps (not the shim); `prerelease: ${{ endsWith(github.ref_name, '-pre') }}`. `release.md`: `Channel` header field, `v{version}` / `v{version}-pre`, `(Pre-Release)` heading in `docs/releasenotes.md` (trace `REQ_REL_CHANNEL` AC-7). |
| For Developer | `releaseNotes.ts` per `SPEC_REL_RELEASENOTES` AC-6, AC-14, AC-16..20; the snippet shows shape, behaviour is in the ACs (`fetch` or `https`, either is fine). Statuses to `implemented`: `REQ_REL_NOTESTARGET`, `SPEC_REL_RELEASENOTES`, and with Admin `REQ_REL_CHANNEL`, `SPEC_REL_CHANNEL`, stories per their rule. |
| For Tester | `SPEC_REL_CHANNEL` AC-1..7 (static: `release.yml`, `package.json` versions, `release.md`, guide) and `SPEC_REL_RELEASENOTES` AC-16..19 (mocked requests: 200 / 404 then 200 / 404 both / failure with no second request). |
| For Technical Writer | `REQ_REL_CHANNEL` AC-8 and `US_REL_PRERELEASEOPTIN` AC-1: Core and each installed add-on are switched individually; the dependency of add-ons on `enthali.jarvis-core` is why Core must be switched too, but VS Code's behaviour on dependencies was not verified by me and the guide should state only what is observed. |
| Open, residual | Live behaviour (pre-release upload through OIDC, stable users not receiving `0.35.1`) is first observed in `v0.35.1-pre`. User validation is delegated; the changed stories `US_REL_RELEASE`, `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN` are not named there by me. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/release.yml` | Channel from the tag: job `env: CHANNEL_FLAG` from `endsWith(github.ref_name, '-pre')`; `$CHANNEL_FLAG` on the six `vsce package` and six `vsce publish --oidc` steps, none on the legacy shim; `prerelease:` on the GitHub Release step. Trigger `v*`, file name and `id-token: write` unchanged. | Parsed with PyYAML: 6 of 6 package steps and 6 of 6 publish steps carry the flag, the shim does not, `prerelease` is set, `on.push.tags` is `['v*']`. Local `vsce package` of Kanban with `--pre-release` writes `Microsoft.VisualStudio.Code.PreRelease` into the VSIX manifest, without the flag it does not. Not run on GitHub: the first live run is `v0.35.1-pre`. |
| `docs/Jarvis Contracts/release.md` | Template carries the `Channel` header field, the tag rules `v{version}` / `v{version}-pre`, the `(Pre-Release)` heading rule for `docs/releasenotes.md`, the strictly-increasing version rule across channels, and the channel in the Publication gate, steps and evidence table (`REQ_REL_CHANNEL` AC-7). | Static strings present; strict Sphinx build `-W --keep-going -E` clean; file keeps CRLF only. |
| Test and build baseline | No change to build, lint or test tooling. | `npx vitest run` 860 passed; `python -m unittest discover scripts` 24 OK. `check_contract_needs.py` fails by design on the approved Needs until the Developer sets them to `implemented` (`REQ_REL_CHANNEL`, `SPEC_REL_CHANNEL`, stories per their rule). |
| Marketplace Trusted Publishing policy | Unchanged, bound to `release.yml`; the pre-release goes through the same OIDC identity. | Outside git, set by the User and PM; first observed in `v0.35.1`. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Lookup transport and shape | `notesUri` is async and uses global `fetch` with `AbortSignal.timeout(5000)`, `User-Agent` and no `Authorization`, exactly as the SPEC snippet | `https` module | The extension host runs Node 18+ with `fetch`; the SPEC allows either. `open()` awaits `notesUri`, so the manual and automatic paths share AC-6/16/17/18/20. `announceIfNewVersion` still does not await the browser view in `activate()` (AC-14). |
| Existing tests | `release-notes.test.ts` stubs global `fetch` (200) in `beforeEach` | leave unstubbed | Without a stub the old tests made real GitHub requests and failed for versions with no release. Four cases added for AC-16, AC-17, AC-18 (404 then 200, 404 both, status 500, rejected fetch). The Tester owns AC-19 and the remaining lookup tests. |
| Needs | `REQ_REL_CHANNEL`, `SPEC_REL_CHANNEL`, `REQ_REL_NOTESTARGET`, `SPEC_REL_RELEASENOTES`, `US_REL_RELEASE`, `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN` set to `implemented` | none | These are the `approved` Needs the Needs check lists. `release.yml` and `release.md` were done by Admin. AC-4 hits for the three stories are the Project Manager's User-validation row, which this Contract marks not applicable; I did not edit it. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/core/releaseNotes.ts` | Async `notesUri` with `v{version}`, then `v{version}-pre`, then releases-list fallback | `npx tsc -p packages/core --noEmit` clean; `npx vitest run` 76 files, 864 tests pass |
| `src/tests/release-notes.test.ts` | `fetch` stub plus lookup cases | as above |
| `docs/requirements/req_rel.rst`, `docs/design/spec_rel.rst`, `docs/userstories/us_rel.rst` | 7 Needs `approved` to `implemented` | as above |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| `release.yml` triggers on `v*` tags only; no other workflow runs `vsce publish` | system | `REQ_REL_CHANNEL` AC-1, `SPEC_REL_CHANNEL` AC-1 | `src/tests/release-channel.test.ts` |
| `CHANNEL_FLAG` derives from `endsWith(github.ref_name, '-pre')` as `--pre-release` or empty | system | `SPEC_REL_CHANNEL` AC-2 | same file |
| Six package and six publish steps end in `$CHANNEL_FLAG`; shim package step has none and is not published; no step hard-codes `--pre-release` | system | `REQ_REL_CHANNEL` AC-3, AC-4, AC-5; `SPEC_REL_CHANNEL` AC-3 | same file |
| GitHub Release `prerelease` set from the `-pre` suffix; `updateCheck.ts` still reads only `releases/latest` | system | `REQ_REL_CHANNEL` AC-6, `SPEC_REL_CHANNEL` AC-4 | same file |
| Every `package.json` version matches `^\d+\.\d+\.\d+$` | system | `REQ_REL_CHANNEL` AC-2, `SPEC_REL_CHANNEL` AC-5 | same file |
| `release.md`: Channel field, tag rules, `(Pre-Release)` heading rule, Publication gate and step 4 | system | `REQ_REL_CHANNEL` AC-7, `SPEC_REL_CHANNEL` AC-6 | same file |
| Guide names both switch buttons and the individual switching of Core and add-ons | system | `REQ_REL_CHANNEL` AC-8, `SPEC_REL_CHANNEL` AC-7, `US_REL_PRERELEASEOPTIN` AC-1 | same file |
| Lookup order, URL, `User-Agent`, no `Authorization`, abort signal; timeout gives releases list after one request; activation does not await the announce | system | `SPEC_REL_RELEASENOTES` AC-14, AC-16, AC-18, AC-19 | `src/tests/release-notes.test.ts` (added to the Developer's AC-16..18, AC-20 cases) |
| Live pre-release upload through OIDC, stable users not receiving it, button names and dependency behaviour in VS Code | validation | `REQ_REL_CHANNEL` AC-3, AC-6, AC-8; `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN` | not testable in the repository; first observed in `v0.35.1-pre` (User validation delegated) |

Method: js-yaml parse of `release.yml`, text anchors on `release.md` and the guide, mocked `fetch` for the lookup. 15 new static tests, 3 added lookup tests (19 in `release-notes.test.ts`). Fourteen mutations (flag removed from a package and a publish step, flag on the shim, `prerelease: false`, extra trigger, manifest `-pre` suffix, Channel field, heading rule, button name, `releases/latest` changed, `Authorization` header, no signal, extra tag candidate, awaited announce) each failed the suite. Full suite 77 files, 882 tests pass; lint 0 errors.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/getting-started.md` | New section 'Try pre-release versions (optional)' (`REQ_REL_CHANNEL` AC-8, `US_REL_PRERELEASEOPTIN` AC-1, AC-2): what a pre-release is, release notes heading `(Pre-Release)` (`release.md` template), switching Core and each installed add-on on their own with *Switch to Pre-Release Version* and back with *Switch to Release Version*, *Jarvis: Show Release Notes* opens the installed version's notes and falls back to the GitHub release list (`releaseNotes.ts`: `v{version}`, `v{version}-pre`, list), GitHub update check offers no pre-releases (`releases/latest`, `REQ_REL_CHANNEL` AC-6) | this commit; `docs/build.ps1 -Clean` succeeded; the fallback checked in `releaseNotes.ts` |
| `docs/user guides/getting-started.md` Agent Host section | 'Before the next release, update ...' was a relative phrase from 0.32.0 and false by now; reworded to 'If your project-owned prompts ... still use the former messaging calls, update them' | this commit |
| `docs/user guides/core.md`, root `README.md` | none: the release-notes setting and command are already described; the README links to the release notes and carries no channel text | checked |
| `docs/releasenotes.md` | Release adds the `(Pre-Release)` heading when it ships `0.35.1`; not mine | not edited |

**Not verified by me:** the dependency behaviour of VS Code (whether switching Core affects add-ons) is not claimed, as the Architect asked; the button names are taken from the Needs, and whether stable users really do not receive the pre-release is first observed in `v0.35.1-pre`. After that run, the guide wording should be rechecked against what was seen.
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `8b0184ab`. `release.yml` drives package, publish and GitHub Release from one `-pre` tag expression, `releaseNotes.ts` resolves `v{version}`, `v{version}-pre`, then the releases list, and the tests pin both. Open Findings is `None`; live pre-release behaviour is first observable in `v0.35.1-pre`.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Scope diff | `git diff development...HEAD --name-only` | `release.yml`, `release.md`, REQ/SPEC/US `rel`, `getting-started.md`, `releaseNotes.ts`, two test files, the Contract; no manifest or lockfile change | no finding | none |
| Workflow | `release.yml` diff; PyYAML parse | one `CHANNEL_FLAG` env expression (`endsWith(ref_name, '-pre')`) appended to all six package and six publish steps; `prerelease:` on the GitHub Release uses the same condition; core-gh stays unflagged; empty flag expands to nothing in bash | no finding | none |
| vsce behaviour | `node_modules/@vscode/vsce/out/publish.js` lines 86 to 94 | `publish --packagePath ... --pre-release` checks that the VSIX carries the pre-release property, so a mismatched package fails instead of publishing on the wrong channel | no finding | read from source, not run against the Marketplace |
| releaseNotes.ts | diff read | tries `v{version}`, then `v{version}-pre`, 5 s timeout, any network error falls back to the releases list; HTTP 200/404 distinguished | no finding | unauthenticated GitHub API is rate limited; the fallback covers it |
| Docs | `release.md`, `getting-started.md` diff | `Channel` header, tag spelling, `(Pre-Release)` heading rule and the opt-in steps agree with `REQ_REL_CHANNEL` | no finding | button names are the Technical Writer's, from the REQ; not tried in VS Code |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 8b0184ab | pass: 77 files, 882 tests |
| Build, lint, strict docs, script tests | `npm run compile:packages`; `npm run lint`; `python -m sphinx -W --keep-going -b html docs docs/_build/html -E`; `python -m unittest discover scripts` @ 8b0184ab | pass: 0 lint errors (204 warnings); docs build; `OK` |
| Needs check | `python scripts/check_contract_needs.py` @ 8b0184ab | exit 1 with only AC-4 hits for `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN`, `US_REL_RELEASE` (to be named in User Validation by the PM) |
| Mutation checks | `-pre` lookup spelling broken in `releaseNotes.ts`; `prerelease:` set to `false` in `release.yml` | pass: 2 of 19 release-notes tests and 1 of 15 channel tests fail; files restored |
| VSIX packaging, clean tree | detached worktree at 8b0184ab: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, core-gh, pim, recorder, mcp, flow, kanban, and again with `--pre-release` for the six Marketplace packages | pass: seven VSIXs at 0.35.0, engine `^1.144.0`, no `.wasm`; the PreRelease manifest property is absent from the regular VSIXs and present in all six `--pre-release` VSIXs |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** not applicable: explicit User delegation (2026-11-26 01:56 CET)

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| `US_REL_PRERELEASE`, `US_REL_PRERELEASEOPTIN`, `US_REL_RELEASE` — automated workflow/lookup verification (`882` tests, `0` lint errors, strict Sphinx build) and clean-tree VSIX packaging with and without `--pre-release` (`PreRelease` property present only on the six `--pre-release` VSIXs) at `8b0184ab` / `254a874d` | Accepted via explicit User delegation (2026-11-26 01:56 CET); live GitHub/Marketplace OIDC pre-release publication is verified immediately in chained release `v0.35.1-pre`. | 2026-11-26 |

**Decision:** explicit User delegation from the artifact row (2026-11-26 01:56 CET)

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
