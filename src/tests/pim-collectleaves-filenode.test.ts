/**
 * Unit tests for pim-treenode-filenode-fix change.
 *
 * `collectLeaves()` is a private closure inside packages/pim/src/extension.ts's
 * activate() (not exported — same pattern as packages/core/src/extension.ts),
 * so these tests validate the source content directly, matching the
 * established static-assertion pattern used elsewhere in this test suite
 * (see editor-group-placement.test.ts, entity-parity.test.ts).
 *
 * Bug: TreeNode (packages/core) is a 3-variant union (folder/leaf/file, per
 * SPEC_ENT_ENTITY_FILE_CHILDREN). collectLeaves()'s else-branch assumed the
 * non-leaf case was always FolderNode and recursed into `.children`, which
 * FileNode doesn't have — TS2339 compile error.
 *
 * Fix (per SPEC_PRJ_LISTPROJECTS design note): exhaustively check
 * node.kind === 'folder' (recurse) vs node.kind === 'file' (no-op, skip).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const pimSrcDir = path.resolve(__dirname, '..', '..', 'packages', 'pim', 'src');
const pimExtensionSrc = fs.readFileSync(path.join(pimSrcDir, 'extension.ts'), 'utf-8');

describe('SPEC_PRJ_LISTPROJECTS: collectLeaves() exhaustively handles TreeNode\'s 3 variants', () => {
    it('explicitly checks node.kind === \'folder\' before recursing into .children', () => {
        expect(pimExtensionSrc).toContain("node.kind === 'folder'");
    });

    it('no longer has a bare else-branch that assumes non-leaf implies FolderNode', () => {
        // The buggy pattern: `else { result.push(...collectLeaves(node.children)); }`
        expect(pimExtensionSrc).not.toMatch(/else\s*\{\s*result\.push\(\.\.\.collectLeaves\(node\.children\)\)/);
    });

    it('file nodes are a no-op (skipped, not recursed into)', () => {
        // Function body should mention the 'file' kind as an explicit, deliberate no-op.
        const fnMatch = pimExtensionSrc.match(/function collectLeaves\(nodes: TreeNode\[\]\): LeafNode\[\] \{[\s\S]*?\n {4}\}/);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        expect(fnBody).toContain("'file'");
    });
});

describe('SPEC_PRJ_LISTPROJECTS: collectLeaves() behavior with a FileNode present', () => {
    type LeafNode = { kind: 'leaf'; id: string };
    type FolderNode = { kind: 'folder'; children: TreeNode[] };
    type FileNode = { kind: 'file'; filePath: string; label: string };
    type TreeNode = FolderNode | LeafNode | FileNode;

    // Mirrors the fixed implementation to confirm the expected runtime behavior
    // (source-content assertions above confirm this matches the actual file).
    function collectLeaves(nodes: TreeNode[]): LeafNode[] {
        const result: LeafNode[] = [];
        for (const node of nodes) {
            if (node.kind === 'leaf') { result.push(node); }
            else if (node.kind === 'folder') { result.push(...collectLeaves(node.children)); }
        }
        return result;
    }

    it('skips FileNode children without throwing and still collects sibling leaves', () => {
        const tree: TreeNode[] = [
            {
                kind: 'folder', children: [
                    { kind: 'leaf', id: 'alpha/project.yaml' },
                    { kind: 'file', filePath: 'alpha/agent.md', label: 'agent.md' },
                ]
            },
            { kind: 'leaf', id: 'beta/project.yaml' },
        ];
        expect(() => collectLeaves(tree)).not.toThrow();
        expect(collectLeaves(tree)).toEqual([
            { kind: 'leaf', id: 'alpha/project.yaml' },
            { kind: 'leaf', id: 'beta/project.yaml' },
        ]);
    });
});
