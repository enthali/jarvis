# Test Protocol: icon-alignment

**Change Document:** [icon-alignment.md](icon-alignment.md)
**Verification Report:** [val-icon-alignment.md](val-icon-alignment.md)
**Branch:** `feature/icon-alignment`
**UAT Specs:** `SPEC_REL_ICONALIGN`, `SPEC_REL_PKGCONTRACT` (AC-8), `SPEC_REL_MKTMETA`
**Tester:** Manual
**Date:** 2026-06-25

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Run `npm run generate-icons` — must complete without errors.

---

## Group A — SVG Alignment

### TC-1 — Single source SVG exists and is monochromatic

*UAT ref: SPEC_REL_ICONALIGN*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open `resources/jarvis.svg`. | File exists, `viewBox="0 0 24 24"`. | |
| 2 | Verify all colour attributes use `currentColor`. | No hardcoded colours (`#xxx`, `rgb(...)`, etc.). | |
| 3 | Verify it contains a right-pointing play triangle and a J letter. | Both `<path>` elements present. | |

---

### TC-2 — Package SVGs are copies of source

*UAT ref: SPEC_REL_ICONALIGN, SPEC_REL_PKGCONTRACT AC-8*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Compare `packages/core/resources/jarvis.svg` with `resources/jarvis.svg`. | Byte-identical. | |
| 2 | Compare `packages/core-gh/resources/jarvis.svg` with `resources/jarvis.svg`. | Byte-identical. | |

---

## Group B — PNG Generation

### TC-3 — All package PNGs are 128×128

*UAT ref: SPEC_REL_PKGCONTRACT AC-8, SPEC_REL_MKTMETA*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Check `packages/core/resources/jarvis-128.png` dimensions. | 128×128 PNG. | |
| 2 | Check `packages/core-gh/resources/jarvis-128.png` dimensions. | 128×128 PNG. | |
| 3 | Check `packages/mcp/resources/jarvis-128.png` dimensions. | 128×128 PNG. | |
| 4 | Check `packages/pim/resources/jarvis-128.png` dimensions. | 128×128 PNG. | |
| 5 | Check `packages/recorder/resources/jarvis-128.png` dimensions. | 128×128 PNG. | |

---

### TC-4 — PNG visual consistency with brand

*UAT ref: SPEC_REL_ICONALIGN, SPEC_REL_MKTMETA*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open any generated PNG. | Shows a blue play triangle with white J on dark background (#1e1e2e). | |
| 2 | Verify all 5 PNGs are byte-identical. | Same buffer across all packages. | |

---

## Group C — Package Configuration

### TC-5 — All package.json files reference the icon

*UAT ref: SPEC_REL_PKGCONTRACT AC-8*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Check `packages/core/package.json` for `"icon": "resources/jarvis-128.png"`. | Field present. | |
| 2 | Check `packages/core-gh/package.json` for `"icon": "resources/jarvis-128.png"`. | Field present. | |
| 3 | Check `packages/mcp/package.json` for `"icon": "resources/jarvis-128.png"`. | Field present. | |
| 4 | Check `packages/pim/package.json` for `"icon": "resources/jarvis-128.png"`. | Field present. | |
| 5 | Check `packages/recorder/package.json` for `"icon": "resources/jarvis-128.png"`. | Field present. | |

---

## Group D — Generation Script

### TC-6 — `npm run generate-icons` produces all outputs

*UAT ref: SPEC_REL_ICONALIGN*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Delete all generated PNGs and package SVGs. | Files removed. | |
| 2 | Run `npm run generate-icons`. | Exits 0. | |
| 3 | Verify all 2 SVG copies recreated. | Files exist and are byte-identical to source. | |
| 4 | Verify all 5 PNG files recreated. | Files exist and are 128×128 PNG. | |

---

## Group E — Activity Bar Visual

### TC-7 — Icon renders in VS Code activity bar

*UAT ref: SPEC_REL_ICONALIGN*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Launch Extension Development Host (F5). | Extension loads. | |
| 2 | Observe Jarvis icon in activity bar. | Shows play triangle + J shape. | |
| 3 | Switch between light and dark themes. | Icon adapts colour to theme (inherits `currentColor`). | |
