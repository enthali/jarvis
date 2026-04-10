// Implementation: SPEC_AUT_HEARTBEATPROVIDER
// Requirements: REQ_AUT_HEARTBEATVIEW

import * as vscode from 'vscode';
import { CronExpressionParser } from 'cron-parser';
import { HeartbeatJob, HeartbeatStep } from './heartbeat';

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export interface JobNode {
    kind: 'job';
    job: HeartbeatJob;
}

export interface StepNode {
    kind: 'step';
    step: HeartbeatStep;
}

export type HeartbeatTreeNode = JobNode | StepNode;

// ---------------------------------------------------------------------------
// Next-run formatter (cron-parser v5)
// ---------------------------------------------------------------------------

function formatNextRun(schedule: string): string {
    if (schedule === 'manual') { return 'manuell'; }
    try {
        const expr = CronExpressionParser.parse(schedule);
        const next = expr.next();
        const now = new Date();
        const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        const hh = String(next.getHours()).padStart(2, '0');
        const mm = String(next.getMinutes()).padStart(2, '0');
        const hhmm = `${hh}:${mm}`;
        const diffDays = Math.floor((next.getTime() - now.getTime()) / 86400000);
        if (diffDays < 7) {
            return `${days[next.getDay()]} ${hhmm}`;
        }
        const dd = String(next.getDate()).padStart(2, '0');
        const mo = String(next.getMonth() + 1).padStart(2, '0');
        return `${dd}.${mo}. ${hhmm}`;
    } catch {
        return '?';
    }
}

// ---------------------------------------------------------------------------
// Tree provider
// ---------------------------------------------------------------------------

export class HeartbeatTreeProvider implements vscode.TreeDataProvider<HeartbeatTreeNode> {

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private _jobs: HeartbeatJob[] = [];

    setJobs(jobs: HeartbeatJob[]): void {
        this._jobs = jobs;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HeartbeatTreeNode): vscode.TreeItem {
        if (element.kind === 'job') {
            const item = new vscode.TreeItem(
                element.job.name,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.description = formatNextRun(element.job.schedule);
            item.contextValue = 'heartbeatJob';
            return item;
        }
        // StepNode
        const step = element.step;
        let label: string;
        if (step.type === 'agent') {
            label = `agent → ${step.prompt}`;
        } else if (step.type === 'queue') {
            label = `queue → ${step.destination}`;
        } else {
            label = `${step.type}: ${step.run}`;
        }
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        return item;
    }

    getChildren(element?: HeartbeatTreeNode): HeartbeatTreeNode[] {
        if (!element) {
            return this._jobs.map(job => ({ kind: 'job', job }));
        }
        if (element.kind === 'job') {
            return element.job.steps.map(step => ({ kind: 'step', step }));
        }
        return [];
    }
}
