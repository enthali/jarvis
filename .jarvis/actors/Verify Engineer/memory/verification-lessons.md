# Verification Lessons

Durable lessons from verification rounds. Linked from `context.md`.

- A `:status: implemented` sweep asserts every AC of the element, not only the ACs a change touched; read the full AC list before agreeing to a status.
- A requirement that mandates a manifest contribution is verified against the parsed `package.json`, never against the module that consumes it; a consumer check passed while both contributions had been deleted.
- A test that builds its own argument proves the function, not the wiring; when a key or identity format changes, check every consumer against its real caller.
- Blast radius: enumerate a regression's full deletion set from git across all files, not only the subset the change document names; "nothing lost" means a branch-tip diff against the last good commit with no deletion hunks.
- Validation reports verify the change document's declared scope against shipped code, not its narrative; check ACs against the change document's own later findings, since a summary can promise what the analysis later forbids.
- A "do not make this fix" outcome is verified by showing the target file untouched.
- Presence is not registration: `src/tests/manifest-invariant.test.ts` matches quoted IDs anywhere in `packages/**/*.ts`, comments included, and does not check `registerCommand()`; check a registration claim directly.
- A fallback that never fires hides a mapping gap; check every mapping key against the authoritative list (the self-update map lacked two add-ons until fixed).
- Mutation runs: confirm the test mocks the side effect (`execFile` in `actor-mail.test.ts`) before the run so no real process starts; restore the file from git afterwards.
- A test that installs fake timers after construction misses timers the constructor already started.
- A state-path test does not cover a listener in `extension.ts`; state that residual risk in the verdict.
