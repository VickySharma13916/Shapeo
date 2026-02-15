import { describe, expect, it } from 'vitest';

import type { Page, Shape } from '../engine/types';
import {
  deleteGroupBranch, ensureLayerTree, getVisibleLayerShapeIds, moveLayerNode, moveLayerNodeToRootEnd, renameLayerGroup, toNodeKey, 
  ungroupByGroupIds,
} from './layerTree';

const rect = (id: string, groupId?: string): Shape => ({
  id,
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 1,
  rotation: 0,
  groupId,
});

describe('layerTree', () => {
  it('renames group', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a')],
      groups: [{ id: 'g1', name: 'Group 1' }],
    };
    const renamed = renameLayerGroup(page, 'g1', 'Hero');
    expect(renamed.groups?.[0].name).toBe('Hero');
  });

  it('moves shape inside group using drag-drop operation', () => {
    const page: Page = ensureLayerTree({
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a'), rect('b', 'g1')],
      groups: [{ id: 'g1', name: 'Group 1' }],
    });

    const moved = moveLayerNode(
      page,
      toNodeKey('shape', 'a'),
      toNodeKey('group', 'g1'),
      'inside'
    );

    const shapeA = moved.page.shapes.find((shape) => shape.id === 'a');
    expect(shapeA?.groupId).toBe('g1');
    const group = moved.page.groups?.find((entry) => entry.id === 'g1');
    expect(group?.childIds).toContain(toNodeKey('shape', 'a'));
  });

  it('ungroups nested group and promotes children', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a', 'g2')],
      rootLayerIds: [toNodeKey('group', 'g1')],
      groups: [
        { id: 'g1', name: 'Outer', childIds: [toNodeKey('group', 'g2')] },
        { id: 'g2', name: 'Inner', parentGroupId: 'g1', childIds: [toNodeKey('shape', 'a')] },
      ],
    };

    const result = ungroupByGroupIds(page, ['g2']);
    expect(result.changed).toBe(true);
    expect(result.page.groups?.some((group) => group.id === 'g2')).toBe(false);
    const outer = result.page.groups?.find((group) => group.id === 'g1');
    expect(outer?.childIds).toContain(toNodeKey('shape', 'a'));
  });

  it('deletes group branch with nested shapes', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a', 'g1'), rect('b', 'g2')],
      rootLayerIds: [toNodeKey('group', 'g1')],
      groups: [
        {
          id: 'g1',
          name: 'Outer',
          childIds: [toNodeKey('shape', 'a'), toNodeKey('group', 'g2')],
        },
        {
          id: 'g2',
          name: 'Inner',
          parentGroupId: 'g1',
          childIds: [toNodeKey('shape', 'b')],
        },
      ],
    };

    const result = deleteGroupBranch(page, 'g1');
    expect(result.changed).toBe(true);
    expect(result.deletedShapeIds.sort()).toEqual(['a', 'b']);
    expect(result.page.shapes.length).toBe(0);
    expect(result.page.groups?.length ?? 0).toBe(0);
    expect(result.page.rootLayerIds ?? []).toEqual([]);
  });

  it('moves a shape from group to root end', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a', 'g1'), rect('b')],
      rootLayerIds: [toNodeKey('group', 'g1'), toNodeKey('shape', 'b')],
      groups: [
        { id: 'g1', name: 'Group 1', childIds: [toNodeKey('shape', 'a')] },
      ],
    };

    const result = moveLayerNodeToRootEnd(page, toNodeKey('shape', 'a'));
    expect(result.changed).toBe(true);
    expect(result.page.rootLayerIds?.at(-1)).toBe(toNodeKey('shape', 'a'));
    expect(result.page.shapes.find((shape) => shape.id === 'a')?.groupId).toBeUndefined();
  });

  it('returns visible layer shape order as shown in sidebar', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: [rect('a'), rect('b', 'g1'), rect('c', 'g1')],
      rootLayerIds: [toNodeKey('shape', 'a'), toNodeKey('group', 'g1')],
      groups: [
        {
          id: 'g1',
          name: 'Group 1',
          collapsed: false,
          childIds: [toNodeKey('shape', 'b'), toNodeKey('shape', 'c')],
        },
      ],
    };

    expect(getVisibleLayerShapeIds(page)).toEqual(['c', 'b', 'a']);
  });
});
