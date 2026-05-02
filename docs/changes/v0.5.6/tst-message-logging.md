# Test Protocol: message-logging

**Change**: message-logging  
**Date**: 2026-05-02  
**Tester**: User (manual, Extension Development Host)  
**Verdict**: PASS

## Test Results

| ID  | Description                                              | Result |
|-----|----------------------------------------------------------|--------|
| T-1 | `jarvis.messages.logging` setting visible, default false | PASS   |
| T-2 | logging=false → no message-log.json created              | PASS   |
| T-3 | logging=true → message-log.json created on first message | PASS   |
| T-4 | message-log.json format matches QueuedMessage schema     | PASS   |
| T-5 | Read/delete operations do not modify message-log.json    | PASS   |
| T-6 | Second message appends to existing log (not overwritten) | PASS   |
