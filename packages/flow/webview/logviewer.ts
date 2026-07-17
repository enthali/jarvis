// Implementation: SPEC_FLOW_LOGVIEWER, SPEC_FLOW_REQUEUE
// Requirements: REQ_FLOW_LOGVIEWER, REQ_FLOW_REQUEUE
// Bundled (esbuild, IIFE) into out/webview/logviewer.js and loaded by
// extension.ts's renderLogViewerHtml().

// Plain data shape only, duplicated from dataService.ts's LoggedMessage
// rather than imported — dataService.ts imports 'fs' (node), which the
// webview's browser-only tsconfig cannot resolve (same rationale as
// types.ts's FlowData staying node-free for cross-bundle reuse).
interface LoggedMessage {
    destination: string;
    sender: string;
    text: string;
    timestamp: string;
}

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscodeApi = acquireVsCodeApi();

const root = document.getElementById('log-root')!;
root.innerHTML = `
  <button id="jump-to-top-btn" style="display:none;position:sticky;top:8px;left:8px;z-index:10;
      padding:4px 10px;font-size:11px;background:var(--vscode-button-background);
      color:var(--vscode-button-foreground);border:none;border-radius:3px;cursor:pointer;">
    &uarr; Jump to Top
  </button>
  <div id="log-empty" style="display:none;padding:16px;">No messages logged yet.</div>
  <div id="log-list" style="padding:8px 16px;"></div>
`;

const listEl = document.getElementById('log-list')!;
const emptyEl = document.getElementById('log-empty')!;
const jumpBtn = document.getElementById('jump-to-top-btn')!;

let entries: LoggedMessage[] = [];
let atTop = true; // REQ_FLOW_LOGVIEWER AC-7: scroll-position-driven auto-refresh state

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleString();
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function render(): void {
    if (entries.length === 0) {
        emptyEl.style.display = 'block';
        listEl.innerHTML = '';
        return;
    }
    emptyEl.style.display = 'none';
    listEl.innerHTML = entries.map((e, i) => `
      <div class="log-card" data-index="${i}" style="margin-bottom:10px;padding:10px 12px;
          background:var(--vscode-editorWidget-background);border-radius:4px;">
        <div style="display:flex;align-items:baseline;gap:8px;font-size:12px;
            color:var(--vscode-descriptionForeground);margin-bottom:6px;">
          <span><strong>${escapeHtml(e.sender)}</strong> &rarr; <strong>${escapeHtml(e.destination)}</strong></span>
          <span style="margin-left:auto;">${escapeHtml(formatTimestamp(e.timestamp))}</span>
        </div>
        <div style="white-space:pre-wrap;word-wrap:break-word;font-size:13px;">${escapeHtml(e.text)}</div>
        <div style="margin-top:8px;text-align:right;">
          <button class="requeue-btn" data-index="${i}" style="padding:4px 10px;font-size:11px;
              background:var(--vscode-button-background);color:var(--vscode-button-foreground);
              border:none;border-radius:3px;cursor:pointer;">Requeue</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll<HTMLButtonElement>('.requeue-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.index);
            const entry = entries[idx];
            if (!entry) { return; }
            btn.disabled = true;
            btn.textContent = 'Requeuing…';
            vscodeApi.postMessage({ type: 'requeue', entry });
        });
    });
}

function checkScroll(): void {
    const wasAtTop = atTop;
    atTop = root.scrollTop === 0;
    jumpBtn.style.display = atTop ? 'none' : 'block';
    if (atTop && !wasAtTop) {
        vscodeApi.postMessage({ type: 'atTop' });
    } else if (!atTop && wasAtTop) {
        vscodeApi.postMessage({ type: 'scrolledDown' });
    }
}

root.addEventListener('scroll', checkScroll);
jumpBtn.addEventListener('click', () => {
    root.scrollTop = 0;
    checkScroll();
});

window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data;
    if (msg?.type === 'logData') {
        entries = msg.payload as LoggedMessage[];
        render();
    } else if (msg?.type === 'requeueResult') {
        // Re-render restores button state (next logData poll also does this,
        // but this gives immediate feedback without waiting for the next tick).
        render();
    }
});

// Initial state: at top, auto-refresh active (host starts polling on panel open).
checkScroll();
