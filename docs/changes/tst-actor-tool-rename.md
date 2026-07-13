# Test Protocol: actor-tool-rename

**Change Document:** docs/changes/actor-tool-rename.md  
**Branch:** feature/actor-tool-rename  
**Design commit:** 2493e93  
**Status:** ready for execution  
**Scope:** Hard rename of Actor LM/MCP tools

---

## Preconditions and Test Data

1. Launch the Jarvis extension in an Extension Development Host with F5.
2. Open a disposable workspace with `jarvis.sessions.enabled=true`.
3. Prepare at least one valid old-convention Actor under
   `.jarvis/sessions/legacy-alpha/session.yaml` and one valid new-convention
   Actor under `.jarvis/actors/current-alpha/actor.yaml`.
4. Keep an agent chat available for LM tool calls and an MCP client configured
   for the Jarvis MCP endpoint.
5. Reload the Extension Development Host after changing the session feature
   setting or tool registration.
6. Record tool-catalog results and tool-call responses. The response key
   `sessions` is intentionally unchanged by this rename; only tool identifiers
   and related tool-reference names change.

## Test Cases

### Group A: LM Tool Registration and Invocation

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | `jarvis_createActor` is registered | With the session feature enabled, open the agent chat tool picker and search for `createActor`. Inspect the registered tool metadata if available. | `jarvis_createActor` appears in the LM tool catalog with tool reference name `createActor`. No deprecated or compatibility alias is required. | **PASS** if the new create tool is discoverable under the new name; otherwise **FAIL**. |
| A-2 | `jarvis_createActor` creates an Actor end-to-end | Invoke `jarvis_createActor` with `name: "uat-tool-actor"` and a summary. Confirm the call. | The call succeeds. `.jarvis/actors/uat-tool-actor/actor.yaml` and `context.md` are created. The response reports creation using the existing response shape. | **PASS** if the new tool performs the Actor creation flow successfully under the new convention; otherwise **FAIL**. |
| A-3 | `jarvis_listActors` is registered and callable | Open the agent chat tool picker and search for `listActors`. Invoke it with the valid Actor fixtures present. | `jarvis_listActors` appears with tool reference name `listActors` and returns a JSON object with `sessions` containing the known Actor entities. Entries include `name`, `summary`, `agent`, and `folder`. | **PASS** if the new list tool is discoverable and returns both convention sources using the specified response shape; otherwise **FAIL**. |
| A-4 | New Actor appears in the unified tree | After A-2, wait for the scanner rescan or reload the view. Open Jarvis Entities and locate `uat-tool-actor`. | The created Actor appears in the unified tree under the Actors category when multiple kinds are present, or directly under Jarvis Entities when Actors are the only present kind. | **PASS** if the create-tool result becomes visible without manual file manipulation; otherwise **FAIL**. |

### Group B: Hard Cutover and Name Boundaries

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | Old create tool is removed | With tools loaded, attempt to invoke `jarvis_createSession` by its old reference name or direct tool identifier. Search the LM tool picker for the old name. | The old tool is absent. A direct invocation fails with a tool-not-found or equivalent unknown-tool error. No Actor folder or message is created. | **PASS** if no old create registration or working alias remains; otherwise **FAIL**. |
| B-2 | Old list tool is removed | Search the LM tool picker for `jarvis_listSessions` and attempt a direct invocation. | The old tool is absent and invocation fails with a tool-not-found or equivalent unknown-tool error. | **PASS** if no old list registration or working alias remains; otherwise **FAIL**. |
| B-3 | Distinct chat-session tool remains distinct | Search for and invoke `jarvis_listChatSessions`. | `jarvis_listChatSessions` remains available for the genuine VS Code chat-tab concept and returns chat-session data. It is not confused with `jarvis_listActors`. | **PASS** if the unrelated chat-session tool remains independently available; otherwise **FAIL**. |
| B-4 | Old names absent from active agent frontmatter | Search every active `.github/agents/*.agent.md` `allowed_tools` array for `jarvis_createSession` and `jarvis_listSessions`. Verify the corresponding new names. | No active agent `allowed_tools` list contains either old name. Agent files that require these tools reference `jarvis_createActor` and/or `jarvis_listActors`. Historical prose outside `allowed_tools` does not count as an active registration. | **PASS** if all active frontmatter uses only current names; otherwise **FAIL**. |
| B-5 | Old names absent from active orchestration skill references | Inspect `.github/skills/syspilot.orchestration-jarvis/SKILL.md` and active tool registration/configuration files. | Active instructions and registrations use the new tool names. No old name remains in an executable allowed-tools or tool-registration surface. | **PASS** if active workflow configuration has no old identifiers; otherwise **FAIL**. |

### Group C: MCP Surface

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | `jarvis_createActor` is available via MCP | Connect an MCP client while `jarvis.sessions.enabled=true`. Inspect the tool manifest and call `jarvis_createActor` with a unique Actor name. | The MCP manifest contains `jarvis_createActor`. The call succeeds and creates the new-convention Actor files. | **PASS** if the new create tool is registered and callable through MCP; otherwise **FAIL**. |
| C-2 | `jarvis_listActors` is available via MCP | With old- and new-convention Actors present, inspect the MCP manifest and call `jarvis_listActors`. | The manifest contains `jarvis_listActors`. The response includes Actors from both `.jarvis/sessions/` and `.jarvis/actors/`, using the existing `sessions` response key. | **PASS** if the new list tool is registered and returns both conventions through MCP; otherwise **FAIL**. |
| C-3 | Old MCP names are absent | Inspect the MCP manifest for `jarvis_createSession` and `jarvis_listSessions`, then attempt each direct MCP call. | Neither old identifier appears in the manifest. Direct calls fail with an unknown-tool/tool-not-found error. | **PASS** if MCP exposes only the new names; otherwise **FAIL**. |
| C-4 | MCP and LM surfaces agree | Compare the tool names and results from A-2/A-3 with C-1/C-2. | LM and MCP expose the same new tool names and compatible behavior. The rename does not create a name available on only one surface. | **PASS** if both surfaces agree on registration and behavior; otherwise **FAIL**. |

### Group D: Feature Gating and Regression Boundaries

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | Disabled feature removes both new tools | Set `jarvis.sessions.enabled=false`, reload the Extension Development Host, and inspect both LM and MCP catalogs. | `jarvis_createActor` and `jarvis_listActors` are absent from both catalogs. Calls fail as unavailable. Re-enable the setting and reload; both return. | **PASS** if activation-time gating applies to both renamed tools on both surfaces; otherwise **FAIL**. |
| D-2 | Existing Actor conventions remain listable | Re-enable the feature and place valid Actors under both `.jarvis/sessions/` and `.jarvis/actors/`. Call `jarvis_listActors`. | The result includes both old- and new-convention entities. The hard tool rename does not alter dual-path scanner behavior. | **PASS** if both storage conventions remain represented; otherwise **FAIL**. |
| D-3 | New creation remains new-convention-only | Invoke `jarvis_createActor` with a unique name in a mixed workspace. Inspect both storage roots and the unified tree. | Only `.jarvis/actors/<name>/actor.yaml` and `context.md` are created. No `.jarvis/sessions/<name>/session.yaml` is created, and the Actor appears in the unified tree. | **PASS** if creation remains compatible with Phase 2 and Phase 3 behavior; otherwise **FAIL**. |

## Acceptance Criteria Mapping

| Requirement / Design Element | Acceptance Criteria | Test Cases |
|------------------------------|---------------------|------------|
| REQ_ACT_CREATETOOL / SPEC_ACT_CREATETOOL | New tool registration, creation, tool reference, and new-convention behavior | A-1, A-2, A-4, D-3 |
| REQ_ACT_LISTTOOL / SPEC_ACT_TOOLS | New list tool registration, response, tool reference, and dual-path results | A-3, C-2, D-2 |
| REQ_ACT_LISTTOOL / REQ_ACT_CREATETOOL | Hard removal of old names; no deprecated stubs | B-1, B-2, C-3 |
| REQ_ACT_LISTTOOL AC-3 | Distinction from `jarvis_listChatSessions` | B-3 |
| REQ_ACT_LISTTOOL AC-2 / REQ_ACT_CREATETOOL AC-1 | Activation-time feature gating | D-1 |
| Agent frontmatter and orchestration adoption pass | No old names in active `allowed_tools` or workflow registrations | B-4, B-5 |
| MCP dual registration | New names available and callable through MCP | C-1, C-2, C-4 |
| US_ACT_ACTORS / US_ACT_CREATETOOL | User-facing hard rename and unchanged Actor capability | A-1..A-4, B-1..B-3, C-1..C-4, D-2..D-3 |

## Execution Notes

1. All cases are manual UAT cases requiring an Extension Development Host,
   an agent chat, and an MCP client for Group C.
2. Use fresh unique Actor names for creation cases and clean them up after
   verification.
3. Verify old-name failures explicitly; absence from autocomplete alone is not
   sufficient evidence for the hard-cutover requirement.
4. Run the automated regression suite and affected TypeScript compilation after
   the manual cases.
5. Historical Change Documents and historical `renamed from` prose are not
   active tool registrations and should not be treated as failures.
6. Any failed case blocks acceptance until fixed or explicitly waived.

## Sign-off

- [ ] All UAT cases pass (A-1 through D-3)
- [ ] Automated regression tests pass
- [ ] Affected packages compile successfully
- [ ] Old LM/MCP tool identifiers are absent from active surfaces
- [ ] Ready for verification phase
