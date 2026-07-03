// Implementation: SPEC_FLOW_CHORDRENDER
// Requirements: REQ_FLOW_CHORDVIEW
// Bundled (esbuild, IIFE, D3 vendored via bundling — see ../webview-build.js)
// into out/webview/chord.js and loaded by extension.ts's renderHtml().

import * as d3 from 'd3';
import type { FlowData, FlowEdge } from '../src/types';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

const vscodeApi = acquireVsCodeApi();

const root = document.getElementById('flow-root')!;
root.innerHTML = `
  <div id="flow-empty" style="display:none;padding:16px;">
    No message flow data yet. Enable <code>jarvis.messages.logging</code> and
    send a few messages to see the diagram.
  </div>
  <div id="flow-controls" style="padding:8px 16px;display:none;align-items:center;gap:8px;">
    <label for="fade-days">Fog of Time (days):</label>
    <input id="fade-days" type="range" min="1" max="90" value="14" />
    <span id="fade-days-value">14</span>
  </div>
  <svg id="flow-svg" width="100%" height="90%"></svg>
  <div id="flow-tooltip" style="position:absolute;display:none;pointer-events:none;
       background:var(--vscode-editorHoverWidget-background,#252526);
       color:var(--vscode-editorHoverWidget-foreground,#ccc);
       border:1px solid var(--vscode-editorHoverWidget-border,#454545);
       padding:6px 10px;border-radius:4px;font-size:12px;max-width:280px;"></div>
`;

const emptyEl = document.getElementById('flow-empty') as HTMLDivElement;
const controlsEl = document.getElementById('flow-controls') as HTMLDivElement;
const svgEl = document.getElementById('flow-svg') as unknown as SVGSVGElement;
const tooltipEl = document.getElementById('flow-tooltip') as HTMLDivElement;
const fadeSlider = document.getElementById('fade-days') as HTMLInputElement;
const fadeValueEl = document.getElementById('fade-days-value') as HTMLSpanElement;

let currentData: FlowData = { nodes: [], edges: [] };

/** Fog of Time — age-based opacity fade (SPEC_FLOW_CHORDRENDER). */
function opacityFor(edge: FlowEdge, now: number, fadeDays: number): number {
    const ageMs = now - new Date(edge.lastTimestamp).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    return Math.max(0.15, 1 - ageDays / fadeDays); // floor: oldest edges stay visible, never fully invisible
}

/** Theming: read --vscode-charts-* custom properties, fall back to a fixed D3 palette. */
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

function render(): void {
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (currentData.nodes.length === 0 || currentData.edges.length === 0) {
        emptyEl.style.display = 'block';
        controlsEl.style.display = 'none';
        svgEl.style.display = 'none';
        return;
    }
    emptyEl.style.display = 'none';
    controlsEl.style.display = 'flex';
    svgEl.style.display = 'block';

    const nodes = currentData.nodes;
    const index = new Map(nodes.map((n, i) => [n, i]));
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const edge of currentData.edges) {
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
    const now = Date.now();
    const fadeDays = Number(fadeSlider.value);

    const edgeByPair = new Map<string, FlowEdge>();
    for (const edge of currentData.edges) {
        edgeByPair.set(`${index.get(edge.source)}-${index.get(edge.target)}`, edge);
    }

    const ribbons = g.append('g')
        .attr('fill-opacity', 0.75)
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', ribbonGen as never)
        .attr('fill', d => colors[d.target.index])
        .attr('opacity', d => {
            const edge = edgeByPair.get(`${d.source.index}-${d.target.index}`);
            return edge ? opacityFor(edge, now, fadeDays) : 1;
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
            `${edge.firstTimestamp} \u2013 ${edge.lastTimestamp}<br/>` +
            `${truncate(edge.sample, 120)}`;
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

fadeSlider.addEventListener('input', () => {
    fadeValueEl.textContent = fadeSlider.value;
    render(); // client-side only — never triggers a re-fetch (AC-2)
});

window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data;
    if (msg?.type === 'data') {
        currentData = msg.payload as FlowData;
        render();
    }
});
