# Change Document: mcp-server

**Status**: approved
**Branch**: feature/mcp-server
**Created**: 2026-04-10
**Author**: Change Agent

---

## Summary

Embed an MCP (Model Context Protocol) server in the Jarvis extension so that all existing LM Tools (jarvis_sendToSession, jarvis_listSessions, jarvis_readMessage) are also exposed as MCP Tools via HTTP/SSE on localhost. A dual-registration wrapper registers each tool with both `vscode.lm.registerTool()` and the MCP server simultaneously. External clients (heartbeat scripts, other VS Code instances, Claude Desktop) can access the same tool surface over the network.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_CHATQUEUE | Chat Message Queue | none | Existing — tools are extended to MCP but queue semantics unchanged |
| US_MSG_LISTSESSIONS | List Available Chat Sessions (LM Tool) | none | Tool now also accessible via MCP |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_MSG_MCPSERVER | MCP Server for External Tool Access | mandatory |

### Decisions

- D-0.1: Single new user story US_MSG_MCPSERVER covers the external access capability. Existing US_MSG_CHATQUEUE and US_MSG_LISTSESSIONS are unchanged — the MCP server is an additional access channel, not a modification.
- D-0.2: Theme is MSG (Message Queue / Chat Sessions) since MCP exposes the messaging tools.
- D-0.3: Priority is mandatory — this is the core deliverable of the change.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_MSG_MCPSERVER adds external access, US_MSG_CHATQUEUE covers internal queue
- [x] No gaps — the single US covers the "external clients need tool access" need

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| (none) | — | — | Existing REQs are not modified; MCP is an additional transport |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_MSG_MCPSERVER | Embedded MCP Server | US_MSG_MCPSERVER | mandatory |
| REQ_CFG_MCPPORT | MCP Server Port Setting | US_MSG_MCPSERVER; REQ_MSG_MCPSERVER | mandatory |

### Decisions

- D-1.1: REQ_MSG_MCPSERVER covers the server lifecycle, tool exposure, localhost binding, and enable/disable behavior.
- D-1.2: REQ_CFG_MCPPORT covers both the port setting and the enable/disable setting as a single configuration requirement.
- D-1.3: No modification to existing REQ_MSG_QUEUE, REQ_MSG_READ, REQ_MSG_LISTSESSIONS — MCP handlers call the same underlying functions.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_MSG_MCPSERVER is the server, REQ_CFG_MCPPORT is the config
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| (none) | — | — | Existing specs unchanged; new specs cover new code |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_MCPSERVER | MCP Server Module | REQ_MSG_MCPSERVER |
| SPEC_MSG_DUALREGISTRATION | Dual-Registration Wrapper | REQ_MSG_MCPSERVER; REQ_CFG_MCPPORT |

### Decisions

- D-2.1: SPEC_MSG_MCPSERVER covers `src/mcpServer.ts` — HTTP/SSE server using `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`.
- D-2.2: SPEC_MSG_DUALREGISTRATION covers the `registerDualTool()` wrapper in `extension.ts` and the refactoring of existing tool registrations.
- D-2.3: Status bar item showing `Jarvis MCP: <port>` is part of SPEC_MSG_DUALREGISTRATION (lifecycle in extension.ts).

### Horizontal Check (MECE)

- [x] No contradictions with existing Design Specs
- [x] No redundancies — MCPSERVER is the transport, DUALREGISTRATION is the glue
- [x] All new SPECs link to Requirements
- [x] Traceability: US_MSG_MCPSERVER → REQ_MSG_MCPSERVER + REQ_CFG_MCPPORT → SPEC_MSG_MCPSERVER + SPEC_MSG_DUALREGISTRATION

---

## Final Consistency Check

- [x] Every REQ links to a US
- [x] Every SPEC links to a REQ
- [x] No orphaned elements
- [x] US intent → REQ behavior → SPEC implementation consistent
- [x] All sections filled, no DEPRECATED markers
- [x] All decisions documented

---

## UAT Artifacts

| Level | ID | File |
|-------|----|------|
| US | US_UAT_MCPSERVER | docs/userstories/us_uat_mcpserver.rst |
| REQ | REQ_UAT_MCPSERVER_TESTDATA | docs/requirements/req_uat_mcpserver.rst |
| SPEC | SPEC_UAT_MCPSERVER_FILES | docs/design/spec_uat_mcpserver.rst |

Test Scenarios: 7 total (T-1 through T-7)
Test Data: Reuses existing testdata/msg/ and chat sessions — no new files needed.
Testability Concerns: None — all ACs are observable via status bar, output channel, curl, and tree view.
