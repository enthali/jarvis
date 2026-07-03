// Implementation: SPEC_FLOW_DATASERVICE
// Shared FlowData/FlowEdge shape between the extension host (dataService.ts)
// and the webview renderer (webview/chord.ts). Plain data types only — no
// vscode or DOM dependency — so this file can be imported unmodified by
// both esbuild bundles (node/cjs extension host, browser/iife webview).

export interface FlowEdge {
    source: string;
    target: string;
    count: number;
    firstTimestamp: string; // ISO 8601, earliest in this group
    lastTimestamp: string;  // ISO 8601, latest in this group
    sample: string;         // text of the most recent entry in this group
}

export interface FlowData {
    nodes: string[]; // distinct union of sender/destination
    edges: FlowEdge[];
}
