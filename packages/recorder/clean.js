// Removes the output folder so that output of removed sources never ships (SPEC_MOD_REC_PKG AC-6).
const fs = require('fs');
const path = require('path');

fs.rmSync(path.join(__dirname, 'out'), { recursive: true, force: true });
