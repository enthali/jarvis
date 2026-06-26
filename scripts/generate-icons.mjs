#!/usr/bin/env node
/**
 * Icon Generation Script
 *
 * Single source of truth: resources/jarvis.svg (monochromatic, activity bar)
 *
 * Generates:
 *   - packages/core/resources/jarvis.svg (copy)
 *   - packages/core-gh/resources/jarvis.svg (copy)
 *   - packages/{core,core-gh,mcp,pim,recorder}/resources/jarvis-128.png (marketplace: blue triangle + white J)
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SOURCE_SVG = resolve(root, 'resources/jarvis.svg');

// SVG copies — only packages that reference the activity bar icon
const TARGETS_SVG = [
  resolve(root, 'packages/core/resources/jarvis.svg'),
  resolve(root, 'packages/core-gh/resources/jarvis.svg'),
];

// PNG copies — all packages that declare an icon in package.json
const TARGETS_PNG = [
  resolve(root, 'packages/core/resources/jarvis-128.png'),
  resolve(root, 'packages/core-gh/resources/jarvis-128.png'),
  resolve(root, 'packages/mcp/resources/jarvis-128.png'),
  resolve(root, 'packages/pim/resources/jarvis-128.png'),
  resolve(root, 'packages/recorder/resources/jarvis-128.png'),
];

// Marketplace icon colors (matching brand)
const BG_COLOR = '#1e1e2e';
const TRIANGLE_COLOR = '#6cc2e0';
const J_COLOR = '#ffffff';

function buildMarketplaceSvg() {
  // Recreate the same geometry from the source SVG but with marketplace colors
  // Background rect + filled triangle + filled J stroke
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <!-- Dark background -->
  <rect width="24" height="24" rx="3" fill="${BG_COLOR}"/>
  <!-- Blue filled triangle -->
  <path d="M4 2.5L21.5 12 4 21.5z" fill="${TRIANGLE_COLOR}" stroke="none"/>
  <!-- White J -->
  <path d="M7.5 8h2M9.5 8v6.5c0 1.5-.7 2.5-2 2.5" fill="none" stroke="${J_COLOR}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function main() {
  console.log('Icon generation — source:', SOURCE_SVG);

  // 1. Copy monochromatic SVG to packages
  for (const target of TARGETS_SVG) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(SOURCE_SVG, target);
    console.log('  SVG copied →', target);
  }

  // 2. Generate marketplace PNG (128×128)
  const marketplaceSvg = buildMarketplaceSvg();
  const pngBuffer = await sharp(Buffer.from(marketplaceSvg))
    .resize(128, 128)
    .png()
    .toBuffer();

  for (const target of TARGETS_PNG) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, pngBuffer);
    console.log('  PNG generated →', target);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
