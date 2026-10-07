# Idea: Local LLM access for scripts via the Copilot models in VS Code

**Status:** Idea, discussed with the user 2026-10-07. Nothing decided, no backlog item, no CD.

## Intent

Scripts outside chat (first case: the user's inbox triage) should reach an LLM
without building their own route. Jarvis already calls `vscode.lm` for the
heartbeat agent step (`packages/core/src/apps/session/heartbeat.ts`), but only as
one dedicated heartbeat step, which does not suit scripting. At home the user could
also choose a different model through the VS Code model picker.

## Direction under discussion (the user's call, not a design)

- Jarvis publishes the `vscode.lm` access to local scripts.
- PM's lean (opinion): an OpenAI-compatible local endpoint (models list + chat
  completion) with a bearer token rather than an MCP tool. Reasons: standard
  clients work unchanged, the models list tells a script which provider/model
  names exist, a local Ollama speaks the same protocol so the script is portable,
  a token is natural there, and no extra entry shows up in the agent tool picker.
  The user wants KISS; where it lives (package) is the System Designer's decision.

## Constraints known so far

- No API to read the model currently selected in the picker (PM's understanding, not
  verified): the caller names provider and model; the models list makes that findable.
- VS Code asks the user for consent on first model use and says
  `selectChatModels` belongs in a user-initiated action. A script-triggered call
  leaves that frame (consent already exists today for the heartbeat step).
- Each call counts against the user's Copilot quota; VS Code shows per-extension
  request counts to the user. No testing against real models (rate limits).
- No system role in the API: a system prompt would have to be folded into a user message.
- The existing MCP server (`packages/mcp/src/mcpServer.ts`) listens on `127.0.0.1`
  and has no authentication; an unauthenticated LLM door would let any local process
  spend the user's quota. A token only helps against other accounts and browser pages,
  not against another process of the same Windows user (it can read the token file);
  origin/host checks are needed against browser access.
- Per the user: mail content reaching Copilot models is acceptable at Bosch (actors
  already read mail; an official Outlook MCP server exists). Not re-opened.

## GitHub licence concerns (open, not cleared)

- Read 2026-10-07: VS Code Language Model API guide, GitHub Terms of Service,
  Acceptable Use Policies, Terms for Additional Products. Found no explicit
  prohibition of scripted use, and no explicit permission either.
- Acceptable Use Policies, section 6: no reproducing/reselling/"exploiting ... access
  to the Service" without written permission. A localhost endpoint for one person's
  own scripts is not resale, but access by other people or machines would be
  critical: keep it bound to `127.0.0.1`, one user.
- Acceptable Use Policies, section 4: excessive automated bulk activity is forbidden.
  Normal triage volume is probably fine (PM's assessment, not a ruling).
- NOT read: the actual Copilot Business/Enterprise contract (GitHub Customer Agreement
  general terms, or Microsoft Product Terms if bought via Microsoft) and the "GitHub
  Copilot extensibility acceptable development and use policy". Whether Bosch's
  agreement treats this differently needs Bosch IT/Legal; the user decides whether
  to ask. Without that answer, do not ship it as a product feature.

## Open

- Whether to proceed at all (licence answer first), and OpenAI-style endpoint vs MCP tool.
- Whether the inbox triage runs on Jarvis' own PIM tools or stays an external script.
