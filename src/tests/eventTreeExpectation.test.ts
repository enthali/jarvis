/**
 * Standalone expectation test: verifies that GenericTreeDataProvider with the
 * event EntityKindConfig + TaskBadgeDecorator produces correct TreeItems
 * for a seeded scanner + TaskService input.
 *
 * Replaces the old eventTreeEquivalence.test.ts (which compared against the
 * now-deleted EventTreeProvider). Asserts against known expected literals.
 *
 * Fields asserted on entity leaves:
 *   label, collapsibleState, contextValue, command, description, iconPath
 */
import { describe, it, expect } from 'vitest';
import type { TreeNode, EntityEntry } from '../../packages/core/src/engine/sessions/yamlScanner';
import type { KindDrivenScanner } from '../../packages/core/src/engine/sessions/yamlScanner';
import { GenericTreeFactory, type ProviderNode } from '../../packages/core/src/engine/core/treeFactory';
import { buildEventKindConfig } from '../../packages/pim/src/eventKind';
import { TaskBadgeDecorator } from '../../packages/pim/src/taskBadgeDecorator';
import { TaskService } from '../../packages/pim/src/TaskService';
import { DomainCache } from '../../packages/pim/src/DomainCache';
import type { Task } from '../../packages/pim/src/ITaskProvider';
import { TreeItemCollapsibleState, ThemeIcon, ThemeColor } from './__mocks__/vscode';

// --- Test data -----------------------------------------------------------------

const eventLeaf1: TreeNode = { kind: 'leaf', id: '/events/sprint-1/event.yaml' };
const eventLeaf2: TreeNode = { kind: 'leaf', id: '/events/retro/event.yaml' };
const eventLeafNoEntity: TreeNode = { kind: 'leaf', id: '/events/unknown/event.yaml' };
const folderNode: TreeNode = {
    kind: 'folder',
    name: '2026',
    children: [eventLeaf1, eventLeaf2],
};
const eventTree: TreeNode[] = [folderNode, eventLeafNoEntity];

const entities = new Map<string, EntityEntry>([
    ['/events/sprint-1/event.yaml', { name: 'Sprint Planning', summary: 'Plan sprint', datesStart: '2026-03-01' }],
    ['/events/retro/event.yaml', { name: 'Retrospective', summary: 'Team retro' }],
]);

const testTasks: Task[] = [
    { id: 'evt-task-1', subject: 'Prepare agenda', dueDate: '2026-02-28', status: 'inProgress', priority: 'high', isComplete: false, categories: ['Sprint Planning'], source: 'outlook' },
    { id: 'evt-task-2', subject: 'Book room', dueDate: undefined, status: 'completed', priority: 'normal', isComplete: true, completedDate: '2026-02-20', categories: ['Sprint Planning'], source: 'outlook' },
    { id: 'evt-task-3', subject: 'Retro notes', dueDate: '2026-03-10', status: 'notStarted', priority: 'normal', isComplete: false, categories: ['Retrospective'], source: 'outlook' },
];

// --- Stub scanner ---------------------------------------------------------------

const stubScanner = {
    getEntity: (id: string) => entities.get(id),
    getProjectTree: () => [],
    getEventTree: () => eventTree,
    getSessionTree: () => [],
    getTreeForKind: (kind: string) => kind === 'event' ? eventTree : [],
    addKind: () => {},
    removeKind: () => {},
    rescan: async () => {},
    registeredKinds: ['event'],
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
factory.addKind(buildEventKindConfig(taskService));
const taskBadgeDecorator = new TaskBadgeDecorator(taskService, stubScanner as any);
factory.registerDecorator('event', taskBadgeDecorator);
const provider = factory.getProvider('event')!;

// --- Expectation tests ----------------------------------------------------------

describe('Event kind config + TaskBadgeDecorator (standalone expectations)', () => {
    describe('entity leaf rendering', () => {
        it('event with datesStart renders label with date prefix', () => {
            const item = provider.getTreeItem(eventLeaf1);
            expect(item.label).toBe('2026-03-01 — Sprint Planning');
        });

        it('event without datesStart renders plain name', () => {
            const item = provider.getTreeItem(eventLeaf2);
            expect(item.label).toBe('Retrospective');
        });

        it('contextValue = jarvisEvent', () => {
            const item = provider.getTreeItem(eventLeaf1);
            expect(item.contextValue).toBe('jarvisEvent');
        });

        it('command = jarvis.openAgentSession', () => {
            const item = provider.getTreeItem(eventLeaf1);
            expect(item.command?.command).toBe('jarvis.openAgentSession');
        });

        it('event with 1 open task: description = "1"', () => {
            const item = provider.getTreeItem(eventLeaf1);
            expect(item.description).toBe('1');
        });

        it('event with overdue task: iconPath = warning', () => {
            // evt-task-1 dueDate 2026-02-28 — overdue
            const item = provider.getTreeItem(eventLeaf1);
            expect(item.iconPath).toEqual(
                new ThemeIcon('warning', new ThemeColor('list.warningForeground'))
            );
        });

        it('event without entity (basename fallback) uses folder name', () => {
            const item = provider.getTreeItem(eventLeafNoEntity);
            expect(item.label).toBe('unknown');
        });

        it('folder node renders correctly', () => {
            const item = provider.getTreeItem(folderNode);
            expect(item.label).toBe('2026');
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
            expect(item.contextValue).toBe('jarvisFolder');
        });
    });

    describe('task subtree (getChildren for entity leaf)', () => {
        it('event with tasks produces file children + groups: open + completed', async () => {
            const children = await provider.getChildren(eventLeaf1) as ProviderNode[];
            expect(children).toHaveLength(4);
            expect(children[0].kind).toBe('file');
            expect(children[1].kind).toBe('file');
            expect(children[2].kind).toBe('child');
            expect(children[3].kind).toBe('child');
        });

        it('open group label includes count', async () => {
            const children = await provider.getChildren(eventLeaf1) as ProviderNode[];
            const openGroup = provider.getTreeItem(children[2]);
            expect(openGroup.label).toBe('Open Tasks (1)');
        });

        it('completed group label includes count', async () => {
            const children = await provider.getChildren(eventLeaf1) as ProviderNode[];
            const completedGroup = provider.getTreeItem(children[3]);
            expect(completedGroup.label).toBe('Completed Tasks (1)');
        });
    });

    describe('no TaskService — flat leaves', () => {
        const factoryNoTasks = new GenericTreeFactory(stubScanner);
        factoryNoTasks.addKind(buildEventKindConfig(undefined));
        const providerNoTasks = factoryNoTasks.getProvider('event')!;

        it('entity renders as Collapsed (file children present even without TaskService)', () => {
            const item = providerNoTasks.getTreeItem(eventLeaf1);
            expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
        });
    });
});
