// Implementation: SPEC_KAN_RENDERER (webview side)
// Requirements: REQ_KAN_RENDERER
// Bundled (esbuild, IIFE) into out/webview/kanban.js and loaded by
// kanbanPanel.ts's renderHtml().

interface FieldOption {
    name: string;
    color?: string;
}

interface FieldDef {
    name: string;
    type: string;
    options?: FieldOption[];
}

interface BoardItem {
    id?: number;
    name: string;
    status: string;
    labels?: string[];
    notes?: string;
    [key: string]: unknown;
}

interface BoardData {
    title: string;
    fields: FieldDef[];
    items: BoardItem[];
}

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscodeApi = acquireVsCodeApi();

const root = document.getElementById('kanban-root')!;

// Default color palette for columns without explicit colors
const defaultColors = [
    'var(--vscode-charts-blue)',
    'var(--vscode-charts-green)',
    'var(--vscode-charts-yellow)',
    'var(--vscode-charts-orange)',
    'var(--vscode-charts-red)',
    'var(--vscode-charts-purple)',
];

let currentBoard: BoardData | undefined;
let filterText = '';

// Lane state (SPEC_KAN_LANES): kept by the open page only, never sent anywhere.
type LaneBy = { kind: 'none' } | { kind: 'field'; field: string } | { kind: 'labels' };
let laneBy: LaneBy = { kind: 'none' };
let collapsed = new Set<string>();

interface Lane { id: string; name: string; cards: BoardItem[] }

function stringLabels(item: BoardItem): string[] {
    return Array.isArray(item.labels) ? [...new Set(item.labels.filter((l): l is string => typeof l === 'string'))] : [];
}

function compareCodePoints(a: string, b: string): number {
    const x = Array.from(a);
    const y = Array.from(b);
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!;
        if (d !== 0) { return d; }
    }
    return x.length - y.length;
}

/** SPEC_KAN_LANES step 3: option lanes are always drawn; label, Uncategorized and Unlabelled lanes only while they hold a card. */
function buildLanes(board: BoardData, shown: BoardItem[]): Lane[] {
    if (laneBy.kind === 'field') {
        const by = laneBy.field;
        const field = board.fields.find(f => f.name === by)!;
        const options = (field.options ?? []).map(o => o.name);
        const lanes: Lane[] = options.map(name => ({
            id: 'option:' + name,
            name,
            cards: shown.filter(i => i[field.name] === name),
        }));
        const rest = shown.filter(i => typeof i[field.name] !== 'string' || !options.includes(i[field.name] as string));
        if (rest.length > 0) { lanes.push({ id: 'uncategorized', name: 'Uncategorized', cards: rest }); }
        return lanes;
    }
    const names = [...new Set(shown.flatMap(stringLabels))].sort(compareCodePoints);
    const lanes: Lane[] = names.map(name => ({ id: 'label:' + name, name, cards: shown.filter(i => stringLabels(i).includes(name)) }));
    const rest = shown.filter(i => stringLabels(i).length === 0);
    if (rest.length > 0) { lanes.push({ id: 'unlabelled', name: 'Unlabelled', cards: rest }); }
    return lanes;
}

function matchesFilter(item: BoardItem, _board: BoardData): boolean {
    const q = filterText.trim().toLowerCase();
    if (!q) { return true; }
    const parts: string[] = [];
    if (item.id != null) { parts.push('#' + item.id, String(item.id)); }
    parts.push(item.name, item.status);
    if (item.labels) { parts.push(item.labels.join(' ')); }
    if (item.notes) { parts.push(item.notes); }
    // Include all other field values
    for (const [key, val] of Object.entries(item)) {
        if (key === 'id' || key === 'name' || key === 'status' || key === 'labels' || key === 'notes') { continue; }
        if (typeof val === 'string') { parts.push(val); }
    }
    const haystack = parts.join(' ').toLowerCase();
    return haystack.includes(q);
}

function renderBoard(board: BoardData): void {
    currentBoard = board;

    const statusField = board.fields.find(f => f.name === 'status');
    if (!statusField || !statusField.options) {
        root.innerHTML = '<p style="padding:16px;color:var(--vscode-errorForeground);">No "status" field defined.</p>';
        return;
    }

    const otherFields = board.fields.filter(f => f.name !== 'status');

    // A selected field the board no longer declares falls back to None (SPEC_KAN_LANES step 1).
    const laneFields = board.fields.filter(f => f.type === 'single_select' && f.name !== 'status');
    if (laneBy.kind === 'field' && !laneFields.some(f => f.name === (laneBy as { field: string }).field)) {
        laneBy = { kind: 'none' };
    }
    const laneValue = laneBy.kind === 'field' ? 'field:' + laneBy.field : laneBy.kind;
    const laneChoices = [
        ['none', 'None'],
        ...laneFields.map(f => ['field:' + f.name, f.name]),
        ['labels', 'Labels'],
    ];

    // Filter bar
    let html = `
    <div style="padding:8px 16px;border-bottom:1px solid var(--vscode-panel-border);display:flex;align-items:center;gap:8px;">
        <span style="font-weight:bold;font-size:14px;">${escapeHtml(board.title)}</span>
        <input id="kanban-filter" type="text" placeholder="Filter items..."
            value="${escapeHtml(filterText)}"
            style="flex:1;max-width:400px;padding:3px 8px;font-size:12px;
            background:var(--vscode-input-background);color:var(--vscode-input-foreground);
            border:1px solid var(--vscode-input-border);border-radius:3px;outline:none;">
        <label style="font-size:12px;display:flex;align-items:center;gap:4px;">Lanes
            <select id="kanban-lanes" style="font-size:12px;background:var(--vscode-dropdown-background);
                color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border);">
                ${laneChoices.map(([v, label]) => `<option value="${escapeHtml(v)}"${v === laneValue ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
        </label>
    </div>
    `;

    if (laneBy.kind !== 'none') {
        html += renderLanes(board, statusField.options, otherFields);
    } else {
    // Columns container
    html += '<div style="display:flex;gap:12px;padding:12px 16px;overflow-x:auto;height:calc(100% - 50px);">';

    for (let i = 0; i < statusField.options.length; i++) {
        const option = statusField.options[i];
        const color = option.color || defaultColors[i % defaultColors.length];
        const columnItems = board.items.filter(item =>
            item.status === option.name && matchesFilter(item, board)
        );

        html += `
        <div style="min-width:250px;max-width:320px;flex:1;display:flex;flex-direction:column;
            background:var(--vscode-sideBar-background);border-radius:6px;overflow:hidden;">
            <div style="padding:8px 12px;font-weight:bold;font-size:13px;display:flex;justify-content:space-between;
                border-bottom:3px solid ${escapeHtml(color)};">
                <span>${escapeHtml(option.name)}</span>
                <span style="opacity:0.7;font-size:11px;">${columnItems.length}</span>
            </div>
            <div style="flex:1;overflow-y:auto;padding:6px;">`;

        if (columnItems.length === 0) {
            html += '<div style="padding:12px;text-align:center;opacity:0.5;font-size:12px;">No items</div>';
        } else {
            for (const item of columnItems) {
                html += renderCard(item, otherFields);
            }
        }

        html += '</div></div>';
    }

    html += '</div>';
    }
    root.innerHTML = html;

    const laneSelect = document.getElementById('kanban-lanes') as HTMLSelectElement;
    laneSelect.addEventListener('change', () => {
        const v = laneSelect.value;
        laneBy = v === 'none' ? { kind: 'none' } : v === 'labels' ? { kind: 'labels' } : { kind: 'field', field: v.slice('field:'.length) };
        collapsed = new Set();
        if (currentBoard) { renderBoard(currentBoard); }
    });
    root.querySelectorAll<HTMLElement>('[data-lane]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.lane!;
            if (collapsed.has(id)) { collapsed.delete(id); } else { collapsed.add(id); }
            if (currentBoard) { renderBoard(currentBoard); }
        });
    });

    // Attach filter listener
    const filterInput = document.getElementById('kanban-filter') as HTMLInputElement;
    if (filterInput) {
        filterInput.addEventListener('input', () => {
            filterText = filterInput.value;
            if (currentBoard) { renderBoard(currentBoard); }
        });
        // Restore focus and cursor position after re-render
        filterInput.focus();
        filterInput.setSelectionRange(filterInput.value.length, filterInput.value.length);
    }
}

/** SPEC_KAN_LANES step 4: one header row of columns, then every lane with one cell per column. */
function renderLanes(board: BoardData, options: FieldOption[], otherFields: FieldDef[]): string {
    const shown = board.items.filter(item => options.some(o => o.name === item.status) && matchesFilter(item, board));
    const lanes = buildLanes(board, shown);
    const grid = `display:grid;grid-template-columns:repeat(${options.length},minmax(250px,1fr));gap:12px;`;

    let html = '<div style="padding:12px 16px;overflow:auto;height:calc(100% - 50px);">';
    html += `<div style="${grid}margin-bottom:8px;">`;
    options.forEach((option, i) => {
        const color = option.color || defaultColors[i % defaultColors.length];
        const total = shown.filter(item => item.status === option.name).length;
        html += `
        <div style="padding:8px 12px;font-weight:bold;font-size:13px;display:flex;justify-content:space-between;
            background:var(--vscode-sideBar-background);border-radius:6px 6px 0 0;border-bottom:3px solid ${escapeHtml(color)};">
            <span>${escapeHtml(option.name)}</span>
            <span style="opacity:0.7;font-size:11px;">${total}</span>
        </div>`;
    });
    html += '</div>';

    for (const lane of lanes) {
        const isCollapsed = collapsed.has(lane.id);
        html += `
        <div style="margin-bottom:12px;">
            <div data-lane="${escapeHtml(lane.id)}" style="cursor:pointer;font-weight:bold;font-size:13px;padding:4px 0;
                border-bottom:1px solid var(--vscode-panel-border);">
                ${isCollapsed ? '▸' : '▾'} ${escapeHtml(lane.name)} <span style="opacity:0.7;font-size:11px;font-weight:normal;">(${lane.cards.length})</span>
            </div>`;
        if (!isCollapsed) {
            html += `<div style="${grid}padding-top:6px;">`;
            for (const option of options) {
                const cell = lane.cards.filter(item => item.status === option.name);
                html += '<div style="background:var(--vscode-sideBar-background);border-radius:6px;padding:6px;">';
                if (cell.length === 0) {
                    html += '<div style="padding:12px;text-align:center;opacity:0.5;font-size:12px;">No items</div>';
                } else {
                    for (const item of cell) { html += renderCard(item, otherFields); }
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
    }
    return html + '</div>';
}

function renderCard(item: BoardItem, otherFields: FieldDef[]): string {
    let html = `
    <div style="background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);
        border-radius:4px;padding:8px 10px;margin-bottom:6px;">
        <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">${item.id != null ? `<span style="opacity:0.6;font-weight:normal;">#${item.id}</span> · ` : ''}${escapeHtml(item.name)}</div>`;

    // Labels
    if (item.labels && item.labels.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">';
        for (const label of item.labels) {
            html += `<span style="font-size:10px;padding:1px 6px;border-radius:8px;
                background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">
                ${escapeHtml(label)}</span>`;
        }
        html += '</div>';
    }

    // Other field values
    for (const field of otherFields) {
        const val = item[field.name];
        if (typeof val === 'string' && val) {
            html += `<div style="font-size:11px;opacity:0.8;">${escapeHtml(field.name)}: ${escapeHtml(val)}</div>`;
        }
    }

    // Notes — truncated to 30 chars with full text as hover tooltip
    if (item.notes) {
        const truncated = item.notes.length > 30 ? item.notes.slice(0, 30) + '…' : item.notes;
        html += `<div style="font-size:11px;margin-top:4px;opacity:0.7;white-space:pre-wrap;" title="${escapeHtml(item.notes)}">${escapeHtml(truncated)}</div>`;
    }

    html += '</div>';
    return html;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Listen for messages from the extension host
window.addEventListener('message', event => {
    const msg = event.data;
    if (msg?.type === 'board') {
        renderBoard(msg.payload as BoardData);
    } else if (msg?.type === 'error') {
        root.innerHTML = `<p style="padding:16px;color:var(--vscode-errorForeground);">${escapeHtml(msg.message)}</p>`;
    }
});
