// Implementation: SPEC_HOOK_ACTIVITY
// Requirements: REQ_HOOK_ACTIVITY

import * as vscode from 'vscode';
import * as path from 'path';
import type { TreeItemDecorator } from '../core/types';
import type { TreeNode } from '../sessions/yamlScanner';
import type { ActivityTracker } from './activityTracker';

/**
 * Sets item.iconPath to a green filled-circle ThemeIcon when the entity is
 * hook-driven active (SPEC_HOOK_ACTIVITY). Inactive entities are left
 * untouched — iconPath is not set/cleared, so whatever icon another
 * decorator (e.g. TaskBadgeDecorator) or the base TreeItem already assigned
 * remains visible. This naturally avoids the TaskBadgeDecorator collision:
 * the activity indicator only asserts iconPath while active.
 *
 * (F5 finding: the originally-designed item.label codicon prefix
 * ($(circle-filled)/$(circle-outline)) renders as literal text in
 * VS Code's TreeView — that syntax only works in QuickPick/StatusBar, not
 * tree item labels. Replaced with iconPath per PM decision.)
 */
export class ActivityDecorator implements TreeItemDecorator {
    private readonly _tracker: ActivityTracker;
    private readonly _scanner: { getEntity(id: string): { name: string } | undefined };

    constructor(
        tracker: ActivityTracker,
        scanner: { getEntity(id: string): { name: string } | undefined }
    ) {
        this._tracker = tracker;
        this._scanner = scanner;
    }

    decorate(item: vscode.TreeItem, node: TreeNode, _kind: string): void {
        if (node.kind !== 'leaf') { return; }
        const entity = this._scanner.getEntity(node.id);
        const name = entity ? entity.name : path.basename(path.dirname(node.id));
        if (!this._tracker.isActive(name)) { return; } // inactive: leave iconPath untouched
        item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
    }
}
