/**
 * Standalone expectation test: verifies that GenericTreeDataProvider with the
 * project EntityKindConfig + TaskBadgeDecorator produces correct TreeItems
 * for a seeded scanner + TaskService input.
 *
 * Replaces the old projectTreeEquivalence.test.ts (which compared against the
 * now-deleted ProjectTreeProvider). Asserts against known expected literals
 * instead of cross-comparing two provider implementations.
 *
 * Fields asserted on entity leaves:
 *   label, collapsibleState, contextValue, command, description, iconPath
 */
import { describe, it, expect } from 'vitest';
import type { TreeNode, EntityEntry } from '../../packages/core/src/engine/yamlScanner';
import type { KindDrivenScanner } from '../../packages/core/src/engine/yamlScanner';
import { GenericTreeFactory, type ProviderNode } from '../../packages/core/src/engine/treeFactory';
import { buildProjectKindConfig } from '../../packages/pim/src/projectKind';
import { TaskBadgeDecorator } from '../../packages/pim/src/taskBadgeDecorator';
import { TaskService } from '../../packages/pim/src/TaskService';
import { DomainCache } from '../../packages/pim/src/DomainCache';
import type { Task } from '../../packages/pim/src/ITaskProvider';
import { TreeItemCollapsibleState, ThemeIcon, ThemeColor } from './__mocks__/vscode';

// --- Test data -----------------------------------------------------------------

const projectLeaf1: TreeNode = { kind: 'leaf', id: '/projects/alpha/project.yaml' };
const projectLeaf2: TreeNode = { kind: 'leaf', id: '/projects/beta/project.yaml' };
const projectLeafNoTasks: TreeNode = { kind: 'leaf', id: '/projects/gamma/project.yaml' };
const folderNode: TreeNode = {
    kind: 'folder',
    name: 'active',
    children: [projectLeaf1, projectLeaf2],
};
const projectTree: TreeNode[] = [folderNode, projectLeafNoTasks];

const entities = new Map<string, EntityEntry>([
    ['/projects/alpha/project.yaml', { name: 'Alpha Project', summary: 'Alpha summary' }],
    ['/projects/beta/project.yaml', { name: 'Beta Project', summary: 'Beta summary' }],
    ['/projects/gamma/project.yaml', { name: 'Gamma Project', summary: 'Gamma summary' }],
]);

const testTasks: Task[] = [
    { id: 'task-1', subject: 'Fix bug', dueDate: '2026-03-15', status: 'inProgress', priority: 'high', isComplete: false, categories: ['Alpha Project'], source: 'outlook' },
    { id: 'task-2', subject: 'Write docs', dueDate: undefined, status: 'notStarted', priority: 'normal', isComplete: false, categories: ['Alpha Project'], source: 'outlook' },
    { id: 'task-3', subject: 'Old task', dueDate: '2026-01-01', status: 'completed', priority: 'low', isComplete: true, completedDate: '2026-01-05', categories: ['Alpha Project'], source: 'outlook' },
    { id: 'task-4', subject: 'Beta task', dueDate: '2026-04-01', status: 'inProgress', priority: 'normal', isComplete: false, categories: ['Beta Project'], source: 'outlook' },
];

// --- Stub scanner ---------------------------------------------------------------

const stubScanner = {
    getEntity: (id: string) => entities.get(id),
    getProjectTree: () => projectTree,
    getEventTree: () => [],
    getSessionTree: () => [],
    getTreeForKind: (kind: string) => kind === 'project' ? projectTree : [],
    addKind: () => {},
    removeKind: () => {},
    rescan: async () => {},
    registeredKinds: ['project'],
    entities: [],
} as unknown as KindDrivenScanner;

// --- Shared TaskService with pre-seeded cache ----------------------------------

function createSeededTaskService(tasks: Task[]): TaskService {
    const ts = new TaskService();
    ts.addProvider({
        source: 'test',
        getTasks: async () => tasks,
        setTask: async (t: Partial<Task>) => t as Task,
        modifyTask: async () => {},
        deleteTask: async () => {},
    });
    (ts as any)._cache = new DomainCache<Task[]>(async () => tasks);
    (ts as any)._cache._data = tasks;
    return ts;
}

const taskService = createSeededTaskService(testTasks);

// --- Build provider with kind config + decorator --------------------------------

const factory = new GenericTreeFactory(stubScanner);
factory.addKind(buildProjectKindConfig(taskService));
const taskBadgeDecorator = new TaskBadgeDecorator(taskService, stubScanner as any);
factory.registerDecorator('project', taskBadgeDecorator);
const provider = factory.getProvider('project')!;

// --- Expectation tests ----------------------------------------------------------

describe('Project kind config + TaskBadgeDecorator (standalone expectations)', () => {
    describe('entity leaf rendering', () => {
        it('entity with tasks: label = entity name', () => {
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.label).toBe('Alpha Project');
        });

        it('entity with tasks: collapsibleState = Collapsed', () => {
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
        });

        it('entity with tasks: contextValue = jarvisProject', () => {
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.contextValue).toBe('jarvisProject');
        });

        it('entity with tasks: command = jarvis.openAgentSession', () => {
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.command?.command).toBe('jarvis.openAgentSession');
            expect(item.command?.arguments).toEqual([projectLeaf1]);
        });

        it('entity with 2 open tasks: description = "2" (task badge count)', () => {
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.description).toBe('2');
        });

        it('entity with overdue task: iconPath = warning icon', () => {
            // task-1 dueDate 2026-03-15 — overdue relative to test (2026-06-19)
            const item = provider.getTreeItem(projectLeaf1);
            expect(item.iconPath).toEqual(
                new ThemeIcon('warning', new ThemeColor('list.warningForeground'))
            );
        });

        it('entity without matching tasks: description and iconPath absent', () => {
            const item = provider.getTreeItem(projectLeafNoTasks);
            expect(item.description).toBeUndefined();
            expect(item.iconPath).toBeUndefined();
        });

        it('entity without matching tasks: collapsibleState = None (no children)', () => {
            const item = provider.getTreeItem(projectLeafNoTasks);
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
        });

        it('folder node renders correctly', () => {
            const item = provider.getTreeItem(folderNode);
            expect(item.label).toBe('active');
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
            expect(item.contextValue).toBe('jarvisFolder');
        });
    });

    describe('task subtree (getChildren for entity leaf)', () => {
        it('entity with tasks produces 2 groups: open + completed', () => {
            const children = provider.getChildren(projectLeaf1) as ProviderNode[];
            expect(children).toHaveLength(2);
            expect(children[0].kind).toBe('child');
            expect(children[1].kind).toBe('child');
        });

        it('open group label includes count', () => {
            const children = provider.getChildren(projectLeaf1) as ProviderNode[];
            const openGroup = provider.getTreeItem(children[0]);
            expect(openGroup.label).toBe('Open Tasks (2)');
        });

        it('completed group label includes count', () => {
            const children = provider.getChildren(projectLeaf1) as ProviderNode[];
            const completedGroup = provider.getTreeItem(children[1]);
            expect(completedGroup.label).toBe('Completed Tasks (1)');
        });

        it('task leaf renders with correct label and command', () => {
            const children = provider.getChildren(projectLeaf1) as ProviderNode[];
            const openChildren = provider.getChildren(children[0]) as ProviderNode[];
            expect(openChildren.length).toBeGreaterThan(0);
            const taskItem = provider.getTreeItem(openChildren[0]);
            expect(taskItem.command?.command).toBe('vscode.openWith');
            expect(taskItem.contextValue).toBe('jarvisTask');
        });

        it('entity without tasks returns empty children', () => {
            const children = provider.getChildren(projectLeafNoTasks);
            expect(children).toEqual([]);
        });
    });

    describe('no TaskService — flat leaves', () => {
        const factoryNoTasks = new GenericTreeFactory(stubScanner);
        factoryNoTasks.addKind(buildProjectKindConfig(undefined));
        const providerNoTasks = factoryNoTasks.getProvider('project')!;

        it('entity renders as None (flat leaf)', () => {
            const item = providerNoTasks.getTreeItem(projectLeaf1);
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
        });

        it('no description or iconPath', () => {
            const item = providerNoTasks.getTreeItem(projectLeaf1);
            expect(item.description).toBeUndefined();
            expect(item.iconPath).toBeUndefined();
        });
    });
});
