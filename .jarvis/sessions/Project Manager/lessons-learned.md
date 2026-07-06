# PM Lessons Learned

### Release agent change-doc archival can leave duplicates (v0.14.0)
Verify after release that archived change docs land only under `docs/changes/v{x.y.z}/`, not also duplicated at the `docs/changes/` root. Happened once (v0.14.0), cleaned up manually — check this every release until the release agent guards against it itself.

### Release agent only bumps root package.json — spec gap (2026-06-24)
SPEC_REL_RELEASEACTION does not require bumping ALL workspace package.json files — only the root. In an npm monorepo, each sub-package (core, pim, recorder, mcp, core-gh) has its own version field. The release agent missed them all, CI built v0.11.2 VSIXs under the v0.12.0 tag. Fix: add an AC to SPEC_REL_RELEASEACTION requiring the version bump to cover every `packages/*/package.json` in the workspace.

### Moving a git tag: always specify the commit explicitly (2026-06-24)
When moving a tag (delete + recreate), always use `git tag <tag> <sha>` with the explicit commit hash — never rely on a chain like `git tag -d <tag>; git tag <tag>` where a mid-chain failure leaves the local tag deleted but the new one uncreated, causing the subsequent push to go to the wrong commit. The safe pattern: `git tag -d v0.x.y; git push origin :refs/tags/v0.x.y; git tag v0.x.y <sha>; git push origin v0.x.y`.

### Meta-architecture first when introducing new concepts (2026-06-24)
When a CR introduces a new structural pattern (e.g. marketplace packaging, multi-package CI), ask: "does the spec have a contract/template for this pattern?" If not, create the meta spec first (US→REQ→SPEC for the pattern), then implement against it. Patching missing files after the fact is a symptom — a missing spec contract is the root cause. The extension-pkg-contract CR demonstrated this: defining SPEC_REL_PKGCONTRACT first caused the implementation to naturally produce all required files.

### Never interrupt a running CM process with corrective messages (2026-06-24)
If a note is for PM only (e.g. a mode correction), do NOT relay it to CM mid-process. Interrupting a running change breaks the CM's sequential workflow. Corrections to the change document take effect when CM reads it next.

### CR default mode is user-guided (2026-06-24)
Always set Operation Mode: user-guided in the change document unless the user explicitly agrees to autonomous. User-guided means the user sits in while specs are written, not just reviews a fait accompli afterward.

### Verify-Agent must not fabricate UAT results (2026-04-15)
UAT results must never be filled in by an agent — only real manual executions count. CM must leave UAT lines as PENDING until the human fills them in.

### Release quality: QM clear ≠ release-ready (2026-04-15)
If REQ/SPEC doesn't match the actual implementation, don't release — even if UAT technically passed. Spec/implementation mismatch is a release blocker. Fix docs first, then release.

### CM is not a chore servant (2026-05-20)
CM handles product changes and feature branches only. Repo housekeeping, session state refresh, .jarvis/ cleanup are PM's own responsibility or delegated to the relevant session directly.

### .jarvis/ is per-installation private (2026-05-20)
.jarvis/ belongs in .gitignore. Default configs go in resources/ + init logic on first start.

### Race condition in PM message threads (2026-05-22)
Messages are queued; recipient works strictly serially. SUPERSEDES markers don't help (recipient reads the old one first and acts on it). Only defense: think carefully before sending. With parallel CM threads: read both fully, then send ONE consolidated reply.

### user-guided does not mean Designer asks PM (2026-05-29)
Subagents (Designer, MECE) cannot write to other sessions. Designer's askQuestions goes to the user in the active chat, not to PM. PM gets checkpoints via CM messages.

### 'graceful default' can mean silently broken (2026-05-29)
When a field is optional with a "graceful default", always ask: what happens when the field is empty? If the answer is "it uses whatever was last active", that's not graceful — it's silently broken.

### Mirror first, then analyse (2026-05-29)
On every user bug report: first summarize the observed symptom in own words (strictly descriptive, no cause hypothesis) and confirm with the user BEFORE starting code audit, hypotheses, or CM escalation. For compound reports: list each symptom separately.

### Defensive verbosity overrides specialist workflow (2026-06-04)
PM prompts contain WHAT/WHY/INPUT/OUTPUT — not HOW. If something is already in copilot-instructions.md or the agent file: do NOT repeat it. Repeating process steps overrides the specialist's workflow and causes exactly the failures it tries to prevent.
