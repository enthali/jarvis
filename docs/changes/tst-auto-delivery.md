# Test Protocol: auto-delivery

**Change**: auto-delivery  
**Date**: 2026-05-01  
**Tester**: User (manual, Extension Development Host)  
**Verdict**: PASS (with spec divergence noted)

## Test Results

| ID  | Description                                              | Result | Notes |
|-----|----------------------------------------------------------|--------|-------|
| T-1 | "Auto Delivery" group node always visible                | PASS   |       |
| T-2 | Enable Direct Delivery trigger visible on session node   | PASS   | Implemented as ⚡ inline button next to Play, not context menu — see divergence below |
| T-3 | Enable moves session into Auto Delivery group            | PASS   |       |
| T-4 | autodelivery.json created/updated on enable              | PASS   |       |
| T-5 | Disable Direct Delivery trigger on Auto Delivery node    | PASS   | Also inline button, not context menu |
| T-6 | Disable moves session back to manual root                | PASS   |       |
| T-7 | Poll loop auto-delivers without manual Play              | PASS   |       |
| T-8 | Auto-delivered message not re-delivered on next tick     | PASS   |       |
| T-9 | Manual Play button works for Auto Delivery sessions      | PASS   |       |

## Spec Divergence (non-blocking)

**REQ_MSG_AUTODELIVER_CMDS** and **SPEC_MSG_AUTODELIVER_CMDS** specify `enableAutoDelivery`/`disableAutoDelivery` as context menu entries (`view/item/context`). The actual implementation uses inline ⚡ buttons in the tree title bar / node inline actions — functionally equivalent and arguably better UX.

**Action required**: QM spec-fix CR to align REQ/SPEC to the implemented button-based approach.
