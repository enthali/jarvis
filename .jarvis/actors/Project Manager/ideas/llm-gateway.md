# Idea: Local LLM access for scripts via the Copilot models in VS Code

**Status:** Idea, discussed with the user 2026-10-07 (second round the same day:
inbox triage inside Jarvis PIM). Nothing decided, no backlog item, no CD.

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

## Second direction, 2026-10-07: inbox triage inside Jarvis PIM (the user's idea)

The user's triage today runs in Pantheon as a raw local LLM call. Idea: offer the
triage in Jarvis PIM, calling `vscode.lm` from inside the extension, so the model
comes from the VS Code picker (Copilot models, or BYOK models, which include a
local Ollama). How the triage itself works is clarified later in Pantheon; this
round only discusses doing it in PIM.

Why this is smaller than the gateway above (PM's view): no local endpoint, no
token, no door for other local processes to spend the user's quota, no script
triggering a call outside the extension. `heartbeat.ts` already calls
`vscode.lm`, and the VS Code guide names a command or task of an extension as a
normal use. The gateway would only still be needed for scripts outside Jarvis.

Answers from the user:
- Ollama runs locally with its own vendor ID; he tried it at home. Bosch has BYOK
  active and hosts its own models through exactly this channel. A Copilot
  Business/Enterprise administrator can switch the BYOK policy off (VS Code docs);
  at Bosch it is on.
- Consent: already given today through the heartbeat step.
- No system prompt wanted. The current triage is a raw call whose only constraint
  is a JSON output format.
- Quota: one mail is not many tokens, and the user would probably use BYOK models
  anyway, at home certainly. Model choice UI idea: the setting lists the currently
  available vendors, then that vendor's models, as a picker; when a call fails the
  user picks another model in the settings.
- Mail content reaching the model is not the topic (official Outlook MCP servers
  exist).
- Volume and fair use: one call per mail, say 200 mails a day, and an agent runs
  them in a few minutes. To be clarified; it could be a problem for Copilot-hosted
  models.

Facts checked 2026-10-07:
- `selectChatModels` filters by `vendor`, `id`, `family`, `version`. The provider
  guide shows extensions registering models under their own `vendor` ID. That
  `selectChatModels` also returns such BYOK/Ollama models is likely but not stated
  in the docs; a short test listing all models would settle it.
- JSON output: the API has no portable JSON mode. `LanguageModelChatRequestOptions`
  carries `justification`, `modelOptions` (free-form, specific to the model, to be
  looked up per provider), `tools` and `toolMode`. So a JSON format request is
  either part of the prompt with the reply parsed and validated (what the current
  triage does, simplest), or a private tool with a schema called with
  `toolMode: Required` (only for models with tool calling; some accept only one
  tool in that mode), or a provider-specific `modelOptions` entry (not portable,
  support unknown for Ollama).
- No system role in the API: fold the instruction into the first user message.
- The guide advises no hard Copilot dependency in the manifest when the extension
  has other functions, and a clear handling when no model matches.
- Publishing to the Marketplace means adhering to the "GitHub Copilot extensibility
  acceptable development and use policy"; I have NOT read that policy, and it would
  apply to a published PIM using this.

## Open

- Whether to proceed at all (licence answer first), and OpenAI-style endpoint vs MCP tool.
- Whether the inbox triage runs on Jarvis' own PIM tools or stays an external script:
  the user leans towards PIM with `vscode.lm`; if so the gateway is not needed for
  this case. Not decided.
- Read the Copilot extensibility policy and clarify fair use for Copilot-hosted
  models (volume), or say that triage runs on BYOK models.
- Test whether BYOK/Ollama models appear in `selectChatModels`, and how to request
  JSON from them.
- Model picker in the PIM settings (vendor list, then model list) and the error
  workflow: the user's UI idea, to be designed.
