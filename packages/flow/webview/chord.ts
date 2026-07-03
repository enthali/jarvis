// Implementation: SPEC_FLOW_CHORDRENDER, SPEC_FLOW_TIMELENS, SPEC_FLOW_LOADMORE
// Requirements: REQ_FLOW_CHORDVIEW, REQ_FLOW_TIMELENS, REQ_FLOW_LOADMORE
// Bundled (esbuild, IIFE, D3 vendored via bundling — see ../webview-build.js)
// into out/webview/chord.js and loaded by extension.ts's renderHtml().

import * as d3 from 'd3';
import type { FlowData, FlowEdge, FlowMessageEntry } from '../src/types';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscodeApi = acquireVsCodeApi();

// SPEC_FLOW_TIMELENS: Message identity for anchoring
interface MessageIdentity { timestamp: string; sender: string; destination: string; }

type LensHandle =
    | { mode: 'live' }                       // start handle only, rank 1
    | { mode: 'anchored'; id: MessageIdentity };

interface LensState {
    start: LensHandle;
    end: LensHandle; // end is always 'anchored' — never 'live'
}

const FADE_FLOOR = 0.05; // SPEC_FLOW_CHORDRENDER AC-4, was 0.15
const root = document.getElementById('flow-root')!;
root.innerHTML = `
  <div id="flow-empty" style="display:none;padding:16px;">
    No message flow data yet. Enable <code>jarvis.messages.logging</code> and
    send a few messages to see the diagram.
  </div>
  <div id="flow-controls" style="padding:8px 16px;display:none;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <label style="font-size:12px;">Time Lens (message rank):</label>
      <span id="lens-range" style="font-size:11px;color:var(--vscode-descriptionForeground,#888);"></span>
      <button id="load-more-btn" style="margin-left:auto;padding:4px 10px;font-size:11px;">+500</button>
    </div>
    <div style="position:relative;height:30px;">
      <div id="lens-track" style="position:absolute;top:12px;left:0;right:0;height:6px;
           background:var(--vscode-input-background,#3c3c3c);border-radius:3px;"></div>
      <input id="lens-start" type="range" min="1" value="1" 
             style="position:absolute;top:0;left:0;width:100%;pointer-events:none;
                    background:transparent;-webkit-appearance:none;appearance:none;" />
      <input id="lens-end" type="range" min="1" value="500" 
             style="position:absolute;top:0;left:0;width:100%;pointer-events:none;
                    background:transparent;-webkit-appearance:none;appearance:none;" />
    </div>
  </div>
  <svg id="flow-svg" width="100%" height="88%"></svg>
  <div id="flow-tooltip" style="position:absolute;display:none;pointer-events:none;
       background:var(--vscode-editorHoverWidget-background,#252526);
       color:var(--vscode-editorHoverWidget-foreground,#ccc);
       border:1px solid var(--vscode-editorHoverWidget-border,#454545);
       padding:6px 10px;border-radius:4px;font-size:12px;max-width:280px;z-index:1000;"></div>
  <div id="drag-tooltip" style="position:absolute;display:none;pointer-events:none;
       background:var(--vscode-editorHoverWidget-background,#252526);
       color:var(--vscode-editorHoverWidget-foreground,#ccc);
       border:1px solid var(--vscode-editorHoverWidget-border,#454545);
       padding:4px 8px;border-radius:3px;font-size:11px;z-index:1001;"></div>
  <style>
    input[type="range"] {
      margin: 0;
      cursor: pointer;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      pointer-events: all;
      width: 14px;
      height: 14px;
      background: var(--vscode-button-background, #0e639c);
      border-radius: 50%;
      cursor: grab;
    }
    input[type="range"]::-webkit-slider-thumb:active {
      cursor: grabbing;
    }
    input[type="range"]::-moz-range-thumb {
      pointer-events: all;
      width: 14px;
      height: 14px;
      background: var(--vscode-button-background, #0e639c);
      border: none;
      border-radius: 50%;
      cursor: grab;
    }
    input[type="range"]::-moz-range-thumb:active {
      cursor: grabbing;
    }
  </style>
`;

const emptyEl = document.getElementById('flow-empty') as HTMLDivElement;
const controlsEl = document.getElementById('flow-controls') as HTMLDivElement;
const svgEl = document.getElementById('flow-svg') as unknown as SVGSVGElement;
const tooltipEl = document.getElementById('flow-tooltip') as HTMLDivElement;
const dragTooltipEl = document.getElementById('drag-tooltip') as HTMLDivElement;
const lensRangeEl = document.getElementById('lens-range') as HTMLSpanElement;
const lensStartSlider = document.getElementById('lens-start') as HTMLInputElement;
const lensEndSlider = document.getElementById('lens-end') as HTMLInputElement;
const loadMoreBtn = document.getElementById('load-more-btn') as HTMLButtonElement;

let currentData: FlowData = { nodes: [], edges: [], entries: [] };
let lensState: LensState = { start: { mode: 'live' }, end: { mode: 'anchored', id: { timestamp: '', sender: '', destination: '' } } };

// SPEC_FLOW_TIMELENS: Rank 1 = last element of entries (most recent); rank grows toward index 0
function rankOf(entries: FlowMessageEntry[], index: number): number {
    return entries.length - index;
}

function indexForIdentity(entries: FlowMessageEntry[], id: MessageIdentity): number {
    return entries.findIndex(e =>
        e.timestamp === id.timestamp && e.sender === id.sender && e.destination === id.destination
    );
}

function currentWindow(entries: FlowMessageEntry[], lens: LensState): { startIdx: number; endIdx: number; startRank: number; endRank: number } {
    const total = entries.length;
    if (total === 0) { return { startIdx: 0, endIdx: 0, startRank: 0, endRank: 0 }; }

    let startIdx: number, endIdx: number;
    if (lens.start.mode === 'live') {
        startIdx = total - 1; // rank 1 = last element
    } else {
        startIdx = indexForIdentity(entries, lens.start.id);
        if (startIdx === -1) { startIdx = total - 1; } // fallback (SPEC_FLOW_TIMELENS AC-4)
    }

    endIdx = indexForIdentity(entries, lens.end.id);
    if (endIdx === -1) { endIdx = 0; } // fallback to far edge (SPEC_FLOW_TIMELENS AC-4)

    return {
        startIdx,
        endIdx,
        startRank: rankOf(entries, startIdx),
        endRank: rankOf(entries, endIdx)
    };
}

// SPEC_FLOW_TIMELENS: Client-side re-aggregation of windowed subset
function aggregateWindow(entries: FlowMessageEntry[], startIdx: number, endIdx: number): { nodes: string[]; edges: FlowEdge[] } {
    const nodeSet = new Set<string>();
    const groups = new Map<string, FlowEdge & { lastTime: number }>();

    // entries are in chronological ascending order, so endIdx < startIdx (endIdx is older)
    const windowSlice = entries.slice(endIdx, startIdx + 1);
    for (const entry of windowSlice) {
        nodeSet.add(entry.sender);
        nodeSet.add(entry.destination);

        const key = `${entry.sender}\u0000${entry.destination}`;
        const entryTime = Date.parse(entry.timestamp);
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, {
                source: entry.sender,
                target: entry.destination,
                count: 1,
                firstTimestamp: entry.timestamp,
                lastTimestamp: entry.timestamp,
                sample: '', // no text in FlowMessageEntry
                lastTime: entryTime,
            });
            continue;
        }
        existing.count += 1;
        if (Date.parse(entry.timestamp) < Date.parse(existing.firstTimestamp)) {
            existing.firstTimestamp = entry.timestamp;
        }
        if (entryTime >= existing.lastTime) {
            existing.lastTimestamp = entry.timestamp;
            existing.lastTime = entryTime;
        }
    }

    const edges: FlowEdge[] = Array.from(groups.values()).map(({ lastTime, ...edge }) => edge);
    return { nodes: Array.from(nodeSet), edges };
}

// SPEC_FLOW_CHORDRENDER: rank-based opacity, floor 0.05
function opacityFor(rank: number, startRank: number, endRank: number): number {
    if (endRank === startRank) { return 1; }
    const t = (rank - startRank) / (endRank - startRank); // 0 at near edge, 1 at far edge
    return Math.max(FADE_FLOOR, 1 - t);
}

function themeColors(count: number): string[] {
    const style = getComputedStyle(document.documentElement);
    const names = ['--vscode-charts-blue', '--vscode-charts-green', '--vscode-charts-yellow',
        '--vscode-charts-orange', '--vscode-charts-red', '--vscode-charts-purple', '--vscode-charts-foreground'];
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        const custom = style.getPropertyValue(names[i % names.length]).trim();
        colors.push(custom || d3.schemeCategory10[i % d3.schemeCategory10.length]);
    }
    return colors;
}

function truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + '\u2026' : text;
}

function updateLensUI(): void {
    const { startRank, endRank } = currentWindow(currentData.entries, lensState);
    const total = currentData.entries.length;
    lensStartSlider.max = String(total || 1);
    lensEndSlider.max = String(total || 1);
    lensStartSlider.value = String(startRank || 1);
    lensEndSlider.value = String(endRank || 1);
    lensRangeEl.textContent = `start: ${startRank || 0} (${lensState.start.mode === 'live' ? 'live' : 'anchored'}), end: ${endRank || 0}`;
}

function render(): void {
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (currentData.entries.length === 0) {
        emptyEl.style.display = 'block';
        controlsEl.style.display = 'none';
        svgEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    controlsEl.style.display = 'block';
    svgEl.style.display = 'block';

    updateLensUI();

    const { startIdx, endIdx, startRank, endRank } = currentWindow(currentData.entries, lensState);
    const windowed = aggregateWindow(currentData.entries, startIdx, endIdx);
    if (windowed.nodes.length === 0) {
        return; // empty window, nothing to render
    }

    const nodes = windowed.nodes;
    const index = new Map(nodes.map((n, i) => [n, i]));
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const edge of windowed.edges) {
        matrix[index.get(edge.source)!][index.get(edge.target)!] += edge.count;
    }

    const width = (svgEl.clientWidth || 600);
    const height = (svgEl.clientHeight || 500);
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 20;

    const g = svg
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(matrix);
    const arcGen = d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbonGen = d3.ribbon<unknown, d3.Chord>().radius(innerRadius);
    const colors = themeColors(n);

    // Map windowed edges by (source, target) index pair for opacity/tooltip lookup
    const edgeByPair = new Map<string, FlowEdge>();
    for (const edge of windowed.edges) {
        edgeByPair.set(`${index.get(edge.source)}-${index.get(edge.target)}`, edge);
    }

    // Rank of edge's last message (for opacity)
    const rankByPair = new Map<string, number>();
    const windowSlice = currentData.entries.slice(endIdx, startIdx + 1);
    for (let i = windowSlice.length - 1; i >= 0; i--) {
        const entry = windowSlice[i];
        const key = `${index.get(entry.sender)}-${index.get(entry.destination)}`;
        if (!rankByPair.has(key)) {
            const entryGlobalIdx = endIdx + i;
            rankByPair.set(key, rankOf(currentData.entries, entryGlobalIdx));
        }
    }

    const ribbons = g.append('g')
        .attr('fill-opacity', 0.75)
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', ribbonGen as never)
        .attr('fill', d => colors[d.target.index])
        .attr('opacity', d => {
            const pairKey = `${d.source.index}-${d.target.index}`;
            const rank = rankByPair.get(pairKey);
            return rank !== undefined ? opacityFor(rank, startRank, endRank) : 1;
        })
        .style('cursor', 'default');

    ribbons.on('mousemove', (event: MouseEvent, d) => {
        const edge = edgeByPair.get(`${d.source.index}-${d.target.index}`);
        if (!edge) { return; }
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${event.pageX + 12}px`;
        tooltipEl.style.top = `${event.pageY + 12}px`;
        tooltipEl.innerHTML =
            `<strong>${edge.source} \u2192 ${edge.target}</strong><br/>` +
            `count: ${edge.count}<br/>` +
            `${edge.firstTimestamp} \u2013 ${edge.lastTimestamp}`;
    }).on('mouseleave', () => { tooltipEl.style.display = 'none'; });

    const group = g.append('g')
        .selectAll('g')
        .data(chord.groups)
        .join('g');

    group.append('path')
        .attr('d', arcGen as never)
        .attr('fill', d => colors[d.index])
        .style('cursor', 'pointer')
        .on('click', (_event: MouseEvent, d) => {
            vscodeApi.postMessage({ type: 'actorClick', name: nodes[d.index] });
        });

    group.append('text')
        .each((d: d3.ChordGroup) => { (d as unknown as { angle: number }).angle = (d.startAngle + d.endAngle) / 2; })
        .attr('dy', '.35em')
        .attr('transform', (d: d3.ChordGroup) => {
            const angle = (d.startAngle + d.endAngle) / 2;
            const flip = angle > Math.PI;
            return `rotate(${(angle * 180 / Math.PI) - 90}) translate(${outerRadius + 8}) ${flip ? 'rotate(180)' : ''}`;
        })
        .attr('text-anchor', (d: d3.ChordGroup) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
        .text(d => nodes[d.index])
        .attr('fill', 'var(--vscode-editor-foreground, #ccc)')
        .style('font-size', '11px');
}

// Lens handle drag interactions (SPEC_FLOW_TIMELENS)
function setupLensDrag(slider: HTMLInputElement, isStartHandle: boolean): void {
    let isDragging = false;

    const onInput = () => {
        if (!isDragging) { return; }
        const rank = Number(slider.value);
        const idx = currentData.entries.length - rank;
        if (idx < 0 || idx >= currentData.entries.length) { return; }

        dragTooltipEl.style.display = 'block';
        const rect = slider.getBoundingClientRect();
        const percent = (rank - 1) / (Number(slider.max) - 1);
        dragTooltipEl.style.left = `${rect.left + rect.width * percent}px`;
        dragTooltipEl.style.top = `${rect.top - 24}px`;
        dragTooltipEl.textContent = currentData.entries[idx].timestamp;
    };

    const onEnd = () => {
        if (!isDragging) { return; }
        isDragging = false;
        dragTooltipEl.style.display = 'none';

        const rank = Number(slider.value);
        const idx = currentData.entries.length - rank;
        if (idx < 0 || idx >= currentData.entries.length) { return; }

        const entry = currentData.entries[idx];
        const id: MessageIdentity = { timestamp: entry.timestamp, sender: entry.sender, destination: entry.destination };

        if (isStartHandle) {
            lensState.start = rank === 1 ? { mode: 'live' } : { mode: 'anchored', id };
        } else {
            lensState.end = { mode: 'anchored', id };
        }
        render();
    };

    slider.addEventListener('mousedown', () => { isDragging = true; });
    slider.addEventListener('input', onInput);
    slider.addEventListener('mouseup', onEnd);
    slider.addEventListener('mouseleave', () => { if (isDragging) { onEnd(); } });
}

setupLensDrag(lensStartSlider, true);
setupLensDrag(lensEndSlider, false);

// SPEC_FLOW_LOADMORE: "+500" button
loadMoreBtn.addEventListener('click', () => {
    vscodeApi.postMessage({ type: 'increaseCap' });
});

window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data;
    if (msg?.type === 'data') {
        currentData = msg.payload as FlowData;
        // SPEC_FLOW_TIMELENS AC-5: Default lens state on first data (or re-initialize if entries were empty before)
        if (currentData.entries.length > 0 && lensState.end.id.timestamp === '') {
            const defaultEndIdx = Math.max(0, currentData.entries.length - 500);
            const endEntry = currentData.entries[defaultEndIdx];
            lensState = {
                start: { mode: 'live' },
                end: { mode: 'anchored', id: { timestamp: endEntry.timestamp, sender: endEntry.sender, destination: endEntry.destination } }
            };
        }
        render();
    }
});
