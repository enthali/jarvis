// Implementation: SPEC_ENG_REGISTER_KIND (project kind config for engine factory)
// Requirements: REQ_ENG_TREEFACTORY

import * as vscode from 'vscode';
import type { EntityKindConfig, SubtreeNode } from 'jarvis-core';
import type { TaskService } from './TaskService';
import type { Task } from './ITaskProvider';

/**
 * Build the project EntityKindConfig that drives the generic tree factory.
 * Accepts the TaskService so getChildren can produce task subtree nodes.
 *
 * NOTE: Recording highlight is intentionally NOT included here (dropped per
 * Change Document "Known Cross-App Seams" — re-added in S6 as a decorator).
 */
export function buildProjectKindConfig(taskService?: TaskService): EntityKindConfig {
    return {
        kind: 'project',
        viewId: 'jarvisProjects',
        folderSettingKey: 'jarvis.projects.folder',
        label: (name: string) => name,
        getChildren: taskService ? (entity) => buildProjectChildren(entity, taskService) : undefined,
    };
}

function buildProjectChildren(
    entity: { name: string; filePath: string; data: Record<string, unknown> },
    taskService: TaskService
): SubtreeNode[] | undefined {
    if (!taskService.hasProviders()) {
        return undefined;
    }

    const cachedTasks = getCachedTasks(taskService);
    if (!cachedTasks) {
        return undefined;
    }

    const projectCategory = entity.name;
    const projectTasks = cachedTasks.filter(
        t => t.categories.includes(projectCategory)
    );
    const openTasks = projectTasks.filter(t => !t.isComplete);
    const completedTasks = projectTasks.filter(t => t.isComplete);
    const groups: SubtreeNode[] = [];

    if (openTasks.length > 0) {
        groups.push({
            id: `project:${entity.name}:open`,
            label: `Open Tasks (${openTasks.length})`,
            collapsibleState: 'expanded',
            children: openTasks.map(t => taskToSubtreeNode(t)),
        });
    }
    if (completedTasks.length > 0) {
        groups.push({
            id: `project:${entity.name}:completed`,
            label: `Completed Tasks (${completedTasks.length})`,
            collapsibleState: 'collapsed',
            children: completedTasks.map(t => taskToSubtreeNode(t)),
        });
    }

    return groups.length > 0 ? groups : undefined;
}

function taskToSubtreeNode(task: Task): SubtreeNode {
    const label = task.dueDate
        ? `${task.dueDate.slice(2)}  ${task.subject}`
        : task.subject;
    const taskUri = vscode.Uri.from({
        scheme: 'task',
        path: '/task.jarvis-task',
        query: `id=${encodeURIComponent(task.id)}`
    });
    return {
        id: `task:${task.id}`,
        label,
        contextValue: 'jarvisTask',
        iconPath: task.isComplete
            ? new vscode.ThemeIcon('check')
            : new vscode.ThemeIcon('circle-outline'),
        command: {
            command: 'vscode.openWith',
            title: 'Open Task',
            arguments: [taskUri, 'jarvis.taskEditor']
        },
    };
}

function getCachedTasks(taskService: TaskService): Task[] | undefined {
    return (taskService as any)._cache?.get() as Task[] | undefined;
}
